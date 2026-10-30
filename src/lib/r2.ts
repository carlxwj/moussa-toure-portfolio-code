import {auth,db} from './firebase';
import {doc,serverTimestamp,setDoc} from 'firebase/firestore';
import {gatewayUrl} from './cloudinary';
import type {MediaIndex} from '../types/models';

// Keep R2 disabled until the bucket, Worker binding, and Firestore rules are deployed.
// Cloudinary continues working in the meantime.
export const r2Ready=import.meta.env.VITE_R2_ENABLED==='true' && /^https:\/\/[^\s]+$/.test(gatewayUrl);
export const MAX_R2_BYTES=500_000_000; // Product safety cap; R2 itself has storage and request quotas.
const CHUNK_BYTES=6_000_000; // R2 multipart parts: 5 MiB minimum except the last.
const validMime=['image/jpeg','image/png','image/webp','image/avif','application/pdf'];
const keyPattern=/^moussa_toure\/portfolio\/[a-f0-9]{32}\.(jpg|png|webp|avif|pdf)$/;

async function adminHeaders(){
 const user=auth?.currentUser;
 if(!user?.emailVerified)throw new Error('Connecte-toi avec un compte administrateur dont l’adresse e-mail est vérifiée.');
 return {Authorization:`Bearer ${await user.getIdToken()}`};
}
async function call(path:string,body:unknown){
 if(!r2Ready)throw new Error('R2 n’est pas encore activé. Consulte CONFIGURER_R2.md.');
 const response=await fetch(gatewayUrl+path,{method:'POST',headers:{'content-type':'application/json',...await adminHeaders()},body:JSON.stringify(body)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(typeof result.error==='string'?result.error:`Erreur du stockage R2 (${response.status}).`);
 return result;
}
async function uploadPart(file:File,partNumber:number,uploadId:string,key:string,start:number,end:number){
 const bytes=await file.slice(start,end).arrayBuffer();
 const headers={...await adminHeaders(),'content-type':'application/octet-stream','x-r2-key':key,'x-r2-upload-id':uploadId,'x-r2-part-number':String(partNumber)};
 const response=await fetch(gatewayUrl+'/r2/part',{method:'POST',headers,body:bytes});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(typeof result.error==='string'?result.error:`Échec du morceau ${partNumber} (${response.status}).`);
 if(result.partNumber!==partNumber||typeof result.etag!=='string'||!/^([a-f0-9]{32})$/i.test(result.etag))throw new Error('Confirmation de transfert invalide.');
 return {partNumber,etag:result.etag};
}
async function checkType(file:File){
 if(!validMime.includes(file.type))throw new Error('Formats acceptés : JPG, PNG, WebP, AVIF et PDF.');
 if(!file.size||file.size>MAX_R2_BYTES)throw new Error('Le fichier doit être inférieur à 500 Mo.');
 const b=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const txt=(from:number,to:number)=>String.fromCharCode(...b.slice(from,to));
 const ok=file.type==='application/pdf'?txt(0,5)==='%PDF-':file.type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:file.type==='image/png'?[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x):file.type==='image/webp'?txt(0,4)==='RIFF'&&txt(8,12)==='WEBP':txt(4,8)==='ftyp'&&['avif','avis'].includes(txt(8,12));
 if(!ok)throw new Error('Ce fichier ne correspond pas à son format annoncé.');
}
export async function uploadR2(file:File,onProgress?:(fraction:number)=>void):Promise<{url:string;key:string;indexId:string}>{
 if(!db)throw new Error('Firestore indisponible.');
 await checkType(file);
 if(!r2Ready)throw new Error('R2 n’est pas encore activé.');
 const kind=file.type==='application/pdf'?'pdf':'image';
 const ticket=await call('/r2/create',{mime:file.type,kind,bytes:file.size});
 if(typeof ticket.key!=='string'||!keyPattern.test(ticket.key)||typeof ticket.uploadId!=='string'||!ticket.uploadId||ticket.chunkSize!==CHUNK_BYTES)throw new Error('Réponse de préparation R2 invalide.');
 const parts:{partNumber:number;etag:string}[]=[];
 let completed=false;
 try{
  for(let start=0,i=1;start<file.size;start+=CHUNK_BYTES,i++){
   const end=Math.min(file.size,start+CHUNK_BYTES);
   let part: {partNumber:number;etag:string}|undefined;
   for(let attempt=0;attempt<3;attempt++){
    try{part=await uploadPart(file,i,ticket.uploadId,ticket.key,start,end);break}
    catch(e){if(attempt===2)throw e}
   }
   if(!part)throw new Error('Le morceau du fichier n’a pas pu être envoyé.');
   parts.push(part);onProgress?.(end/file.size);
  }
  const uploaded=await call('/r2/finish',{key:ticket.key,uploadId:ticket.uploadId,bytes:file.size,parts});
  if(uploaded.key!==ticket.key||uploaded.bytes!==file.size||uploaded.mime!==file.type||typeof uploaded.url!=='string'||
    uploaded.url!==gatewayUrl+'/r2/media/'+ticket.key)throw new Error('Confirmation R2 inattendue : conserve la référence '+ticket.key);
  completed=true;
  const id=`r2-${crypto.randomUUID().replace(/-/g,'')}`;
  const metadata:MediaIndex={id,name:file.name.slice(0,100),mime:file.type,bytes:file.size,kind,provider:'r2',r2Key:ticket.key,url:uploaded.url,width:0,height:0,status:'published'};
  try{await setDoc(doc(db,'mediaIndex',id),{...metadata,createdAt:serverTimestamp()})}
  catch(e){throw new Error(`Fichier bien envoyé sur R2 mais Firestore n'a pas enregistré sa référence. Ne réimporte pas : conserve ${ticket.key} pour récupération. ${String(e)}`)}
  return {url:uploaded.url,key:ticket.key,indexId:id};
 }catch(e){
  if(!completed)await call('/r2/abort',{key:ticket.key,uploadId:ticket.uploadId}).catch(()=>{});
  throw e;
 }
}
export async function lookupR2Asset(key:string):Promise<{url:string;key:string;bytes:number;mime:string}>{
 const value=key.trim();
 if(!keyPattern.test(value))throw new Error('Identifiant R2 invalide.');
 const found=await call('/r2/info',{key:value});
 if(found.key!==value||!validMime.includes(found.mime)||!Number.isInteger(found.bytes)||found.bytes<=0||found.bytes>MAX_R2_BYTES||found.url!==gatewayUrl+'/r2/media/'+value)throw new Error('Réponse de récupération R2 invalide.');
 return {key:value,url:found.url,bytes:found.bytes,mime:found.mime};
}
export async function removeR2(key:string){if(!keyPattern.test(key))throw new Error('Identifiant de fichier R2 invalide.');await call('/r2/delete',{key});}

export async function lookupR2Pdf(key:string){const result=await lookupR2Asset(key);if(result.mime!=='application/pdf')throw new Error('Ce fichier R2 n’est pas un PDF.');return result;}
