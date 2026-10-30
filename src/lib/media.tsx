import {doc,getDoc} from 'firebase/firestore';
import {useEffect,useState,type ImgHTMLAttributes,type ReactNode} from 'react';
import {db} from './firebase';
import {safeUrl} from './content';

// Spark does not offer Firebase Storage: public media are deliberately small,
// optimized files stored as separate Firestore documents, never in project docs.
export const MEDIA_PREFIX='asset:';
export const isMediaReference=(url:string|undefined)=>Boolean(url?.startsWith(MEDIA_PREFIX));
export const MEDIA_FILE_LIMIT=600_000;
const cache=new Map<string,Promise<string|undefined>>();
function decode64(base64:string,mime:string){
 const binary=atob(base64), buffer=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++) buffer[i]=binary.charCodeAt(i);
 return URL.createObjectURL(new Blob([buffer],{type:mime}));
}
export async function resolveMedia(url:string|undefined):Promise<string|undefined>{
 if(!url)return undefined;
 if(!isMediaReference(url))return safeUrl(url);
 const id=url!.slice(MEDIA_PREFIX.length);
 if(!/^[a-z0-9_-]{4,100}$/i.test(id)||!db)return undefined;
 if(!cache.has(id))cache.set(id,getDoc(doc(db,'mediaAssets',id)).then(s=>{
  if(!s.exists())return undefined;
  const value=s.data();
  if(typeof value.base64!=='string'||typeof value.mime!=='string')return undefined;
  if(!['image/webp','application/pdf'].includes(value.mime))return undefined;
  return decode64(value.base64,value.mime);
 }).catch(()=>{cache.delete(id);return undefined}));
 return cache.get(id)!;
}
export function invalidateMedia(id:string){cache.delete(id)}
export function useMediaUrl(url:string|undefined){
 const [resolved,setResolved]=useState<string|undefined>(()=>isMediaReference(url)?undefined:safeUrl(url));
 useEffect(()=>{let active=true;setResolved(isMediaReference(url)?undefined:safeUrl(url));
  if(isMediaReference(url))void resolveMedia(url).then(v=>{if(active)setResolved(v)});
  return ()=>{active=false};
 },[url]);
 return resolved;
}
export function imageDeliveryUrl(url:string|undefined,thumbnail=false):string|undefined{
 if(!url)return url;
 // Cloudinary keeps the original asset. Visitors receive an optimized derivative.
 // Only transform exact Cloudinary upload URLs (never third-party URLs).
 return url.replace(/^(https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/image\/upload\/)(?=v\d+\/|moussa_toure\/)/i,`$1f_auto,q_auto,c_limit,w_${thumbnail?500:1800}/`);
}
export function MediaImage({src,alt='',...rest}:{src?:string;alt?:string}&Omit<ImgHTMLAttributes<HTMLImageElement>,'src'|'alt'>){
 const resolved=useMediaUrl(src);
 return resolved?<img src={imageDeliveryUrl(resolved)} alt={alt} {...rest}/>:<span className={`media-placeholder ${rest.className||''}`} aria-label={alt||'Image en cours de chargement'}/>;
}
export function MediaLink({src,children,className,download}:{src:string;children:ReactNode;className?:string;download?:boolean}){
 const resolved=useMediaUrl(src);
 return <a href={resolved||undefined} target="_blank" rel="noopener noreferrer" className={className} aria-disabled={!resolved} download={download||undefined}>{children}</a>;
}
// SVG/EXIF is never uploaded. Images are converted in-browser to bounded WebP.
async function canvasBlob(canvas:HTMLCanvasElement,quality:number){return new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality))}
export async function prepareUpload(file:File):Promise<{mime:string;base64:string;bytes:number;name:string;kind:'image'|'pdf'}>{
 const permitted=['image/jpeg','image/png','image/webp','image/avif','application/pdf'];
 if(!permitted.includes(file.type))throw new Error('Format accepté : JPG, PNG, WebP, AVIF ou PDF uniquement.');
 if(file.size>15_000_000)throw new Error('Le fichier source dépasse 15 Mo.');
 let blob:Blob=file;
 if(file.type!=='application/pdf'){
  const original=await createImageBitmap(file);
  try{
   let bound=Math.min(1,2000/Math.max(original.width,original.height));
   for(let attempt=0;attempt<7;attempt++){
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(original.width*bound));canvas.height=Math.max(1,Math.round(original.height*bound));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Compression image indisponible.');
    ctx.drawImage(original,0,0,canvas.width,canvas.height);
    const output=await canvasBlob(canvas,Math.max(0.63,0.86-attempt*0.045));
    if(!output)throw new Error('Compression image impossible.');
    blob=output;
    if(blob.size<=MEDIA_FILE_LIMIT)break;
    bound*=0.80;
   }
  }finally{original.close()}
 }
 if(blob.size>MEDIA_FILE_LIMIT)throw new Error('Le fichier dépasse 600 Ko après optimisation. Pour les PDF, réduisez leur taille ou utilisez un lien HTTPS externe.');
 const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Lecture du fichier impossible.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.readAsDataURL(blob)});
 return {mime:file.type==='application/pdf'?'application/pdf':'image/webp',base64,bytes:blob.size,name:file.name.slice(0,100),kind:file.type==='application/pdf'?'pdf':'image'};
}
