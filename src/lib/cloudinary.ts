import {auth,db} from './firebase';
import {doc,serverTimestamp,setDoc} from 'firebase/firestore';
import type {MediaIndex} from '../types/models';

/** Server-only signing: no Cloudinary API secret or unsigned preset in the browser. */
export const gatewayUrl = (import.meta.env.VITE_CLOUDINARY_GATEWAY_URL || '').trim().replace(/\/+$/, '');
export const cloudinaryReady = /^https:\/\/[^\s]+$/.test(gatewayUrl) || (import.meta.env.DEV && /^http:\/\/localhost:\d+/.test(gatewayUrl));
export const MAX_CLOUD_IMAGE_BYTES = 25_000_000;
// PDF delivery on Cloudinary Free must be explicitly enabled in console Settings > Security.
export const MAX_CLOUD_PDF_BYTES = 10_000_000;

async function gateway(path:string,body:unknown) {
 const user=auth?.currentUser;
 if(!user||!user.emailVerified) throw new Error('Reconnecte-toi avec ton compte administrateur vérifié.');
 if(!cloudinaryReady)throw new Error('Cloudinary n’est pas encore configuré. Consulte CONFIGURER_CLOUDINARY.md.');
 const token=await user.getIdToken();
 const response=await fetch(gatewayUrl+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(typeof payload.error==='string'?payload.error:`Passerelle Cloudinary : erreur ${response.status}`);
 return payload;
}
export async function uploadCloudImage(file:File):Promise<{url:string;publicId:string;indexId:string}>{
 if(!db)throw new Error('Firestore indisponible');
 if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw new Error('Formats acceptés : JPG, PNG, WebP et AVIF.');
 if(file.size===0||file.size>MAX_CLOUD_IMAGE_BYTES)throw new Error('Chaque photographie doit faire au maximum 25 Mo.');
 const ticket=await gateway('/sign',{});
 if(typeof ticket.cloud_name!=='string'||typeof ticket.api_key!=='string'||typeof ticket.signature!=='string'||typeof ticket.timestamp!=='number'||typeof ticket.public_id!=='string')throw new Error('Signature Cloudinary invalide.');
 const data=new FormData();
 data.set('file',file);data.set('api_key',ticket.api_key);data.set('timestamp',String(ticket.timestamp));data.set('public_id',ticket.public_id);data.set('signature',ticket.signature);
 const resp=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(ticket.cloud_name)}/image/upload`,{method:'POST',body:data});
 const json=await resp.json().catch(()=>({}));
 if(!resp.ok||!json.secure_url||!json.public_id)throw new Error(json.error?.message||'Cloudinary a refusé le téléchargement.');
 const expected=`https://res.cloudinary.com/${ticket.cloud_name}/`;
 if(typeof json.secure_url!=='string'||!json.secure_url.startsWith(expected)||typeof json.public_id!=='string'||json.public_id!==ticket.public_id)throw new Error('Réponse Cloudinary inattendue.');
 const id=`cloud-${crypto.randomUUID()}`;
 const record:MediaIndex={id,name:file.name.slice(0,100),mime:file.type,bytes:file.size,kind:'image',provider:'cloudinary',cloudinaryPublicId:json.public_id,url:json.secure_url,width:Number(json.width||0),height:Number(json.height||0),status:'published'};
 try{await setDoc(doc(db,'mediaIndex',id),{...record,createdAt:serverTimestamp()})}
 catch(err){throw new Error(`Photo envoyée chez Cloudinary mais référence Firestore non enregistrée (${json.public_id}). Conserve ce nom pour récupération : ${String(err)}`)}
 return {url:json.secure_url,publicId:json.public_id,indexId:id};
}

/** Upload the actor's public CV as a PDF image asset using the same admin-only signed gateway.
 * Only its HTTPS address is saved in Firestore, never the actual PDF bytes.
 */
export async function uploadCloudPdf(file:File):Promise<{url:string;publicId:string;indexId:string}>{
 if(!db)throw new Error('Firestore indisponible');
 if(file.type!=='application/pdf'||!file.name.toLowerCase().endsWith('.pdf'))throw new Error('Choisis un vrai fichier CV au format PDF.');
 if(file.size===0||file.size>MAX_CLOUD_PDF_BYTES)throw new Error('Le PDF doit peser au maximum 10 Mo.');
 const header=new Uint8Array(await file.slice(0,5).arrayBuffer());
 if(String.fromCharCode(...header)!=='%PDF-')throw new Error('Le fichier sélectionné n’est pas un PDF valide.');
 const ticket=await gateway('/sign',{});
 if(typeof ticket.cloud_name!=='string'||typeof ticket.api_key!=='string'||typeof ticket.signature!=='string'||typeof ticket.timestamp!=='number'||typeof ticket.public_id!=='string')throw new Error('Signature Cloudinary invalide.');
 const data=new FormData();
 data.set('file',file);data.set('api_key',ticket.api_key);data.set('timestamp',String(ticket.timestamp));data.set('public_id',ticket.public_id);data.set('signature',ticket.signature);
 // Cloudinary serves PDFs from /image/upload; no changes to the existing Worker are required.
 const resp=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(ticket.cloud_name)}/image/upload`,{method:'POST',body:data});
 const json=await resp.json().catch(()=>({}));
 if(!resp.ok||!json.secure_url||!json.public_id)throw new Error(json.error?.message||'Cloudinary a refusé le PDF.');
 const expected=`https://res.cloudinary.com/${ticket.cloud_name}/image/upload/`;
 if(typeof json.secure_url!=='string'||!json.secure_url.startsWith(expected)||!json.secure_url.toLowerCase().endsWith('.pdf')||typeof json.public_id!=='string'||json.public_id!==ticket.public_id)throw new Error('Réponse PDF Cloudinary inattendue.');
 const id=`cloud-${crypto.randomUUID()}`;
 const record:MediaIndex={id,name:file.name.slice(0,100),mime:'application/pdf',bytes:file.size,kind:'pdf',provider:'cloudinary',cloudinaryPublicId:json.public_id,url:json.secure_url,width:Number(json.width||0),height:Number(json.height||0),status:'published'};
 try{await setDoc(doc(db,'mediaIndex',id),{...record,createdAt:serverTimestamp()})}
 catch(err){throw new Error(`PDF envoyé chez Cloudinary mais référence Firestore non enregistrée (${json.public_id}). Note cette référence pour récupération : ${String(err)}`)}
 return {url:json.secure_url,publicId:json.public_id,indexId:id};
}
/** Look up an already-uploaded PDF with an admin-only request. This avoids another upload
 * after a Firestore permission error; no Cloudinary credential reaches the client.
 */
export async function lookupCloudPdf(publicId:string):Promise<{url:string;publicId:string;bytes:number;width:number;height:number}> {
 const id=publicId.trim();
 if(!/^moussa_toure\/portfolio\/[a-f0-9]{32}$/.test(id))throw new Error('Identifiant de récupération invalide. Copie celui affiché après l’échec.');
 const result=await gateway('/lookup',{public_id:id});
 if(result.public_id!==id||result.format!=='pdf'||typeof result.secure_url!=='string'||!/^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\/.+\.pdf$/.test(result.secure_url)||!Number.isInteger(result.bytes)||result.bytes<=0||result.bytes>MAX_CLOUD_PDF_BYTES)throw new Error('Les informations du PDF Cloudinary sont invalides.');
 return {url:result.secure_url,publicId:id,bytes:result.bytes,width:Number(result.width||0),height:Number(result.height||0)};
}
export async function removeCloudImage(publicId:string){return gateway('/delete',{public_id:publicId})}
