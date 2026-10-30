/** Cloudinary signed-upload gateway for Cloudflare Workers.
 * All credentials remain in Worker secrets, NEVER in Firebase Hosting.
 * Firebase ID tokens must have a verified email and the custom admin claim.
 * No Firebase Admin SDK required; RS256 signature is verified using Google's JWKS.
 */
const JWKS='https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const PREFIX='moussa_toure/portfolio/';
let jwksCache=null;
let expires=0;
function json(value,status=200,origin=''){
 return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store', 'vary':'Origin', ...(origin?{'access-control-allow-origin':origin}:{}),
 }});
}
function decodePart(x){const base=x.replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(base.padEnd(Math.ceil(base.length/4)*4,'=')))}
async function verifyFirebase(token,project){
 const split=token.split('.');if(split.length!==3)throw Error('Invalid token');
 const header=decodePart(split[0]);const payload=decodePart(split[1]);
 if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error('Unsupported token');
 const now=Math.floor(Date.now()/1000);
 if(payload.aud!==project||payload.iss!==`https://securetoken.google.com/${project}`||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128||typeof payload.exp!=='number'||typeof payload.iat!=='number'||typeof payload.auth_time!=='number'||payload.exp<=now||payload.iat>now+60||payload.auth_time>now+60||payload.admin!==true||payload.email_verified!==true)throw Error('Not authorized');
 if(!jwksCache||Date.now()>expires){const r=await fetch(JWKS);if(!r.ok)throw Error('Verification keys unavailable');jwksCache=await r.json();expires=Date.now()+55*60*1000}
 const jwk=jwksCache.keys.find(k=>k.kid===header.kid);if(!jwk)throw Error('Unknown key');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(atob(split[2].replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(split[2].length/4)*4,'=')),c=>c.charCodeAt(0));
 const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes,new TextEncoder().encode(`${split[0]}.${split[1]}`));
 if(!valid)throw Error('Invalid token signature');
 return payload;
}
async function signature(params,secret){
 const pairs=Object.entries(params).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('&');
 const bytes=new TextEncoder().encode(pairs+secret);
 const digest=await crypto.subtle.digest('SHA-1',bytes);
 return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
// R2 is opt-in. It shares the existing Firebase-admin authentication and origin policy.
// Upload parts are deliberately small: no giant request ever passes through the Worker.
const R2_PREFIX='moussa_toure/portfolio/';
const R2_MAX_BYTES=500_000_000;
const R2_PART_BYTES=6_000_000;
const R2_MAX_PARTS=Math.ceil(R2_MAX_BYTES/R2_PART_BYTES);
const R2_TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','application/pdf':'pdf'};
const R2_KEY=/^moussa_toure\/portfolio\/[a-f0-9]{32}\.(jpg|png|webp|avif|pdf)$/;
const R2_ETAG=/^[a-f0-9]{32}$/i;
function validR2Key(key){return typeof key==='string'&&R2_KEY.test(key)}
function r2MimeForKey(key){const ext=key.split('.').pop();return Object.entries(R2_TYPES).find(([,x])=>x===ext)?.[0]||''}
function validMagic(bytes,mime){
 if(mime==='application/pdf')return bytes.length>=5&&String.fromCharCode(...bytes.slice(0,5))==='%PDF-';
 if(mime==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==='image/png')return bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 if(mime==='image/webp')return bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(mime==='image/avif')return bytes.length>=12&&String.fromCharCode(...bytes.slice(4,8))==='ftyp'&&['avif','avis'].includes(String.fromCharCode(...bytes.slice(8,12)));
 return false;
}
function r2Url(request,key){return new URL(request.url).origin+'/r2/media/'+key}
function r2Public(request,env){
 const path=new URL(request.url).pathname;
 const key=path.startsWith('/r2/media/')?decodeURIComponent(path.slice('/r2/media/'.length)):'';
 if(!validR2Key(key))return new Response('Not found',{status:404});
 if(!env.R2_MEDIA)return new Response('Media unavailable',{status:503});
 return env.R2_MEDIA.get(key).then(object=>{
  if(!object)return new Response('Not found',{status:404});
  const type=r2MimeForKey(key);
  const headers=new Headers({'content-type':type,'cache-control':'public, max-age=3600',
   'x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"});
  if(type==='application/pdf')headers.set('content-disposition','attachment; filename="Moussa-Toure-CV.pdf"');
  if(request.method==='HEAD')return new Response(null,{status:200,headers});
  return new Response(object.body,{status:200,headers});
 });
}
async function r2Admin(request,env,path,origin){
 if(!env.R2_MEDIA)return json({error:'R2 non activé : crée le bucket et ajoute le binding R2_MEDIA avant de déployer.'},503,origin);
 if(path==='/r2/create'){
  const body=await request.json();
  const mime=body?.mime,bytes=body?.bytes;
  if(!Object.hasOwn(R2_TYPES,mime)||!Number.isInteger(bytes)||bytes<=0||bytes>R2_MAX_BYTES)return json({error:'Type ou taille de fichier non autorisé (maximum 500 Mo).'},422,origin);
  if(body.kind!==(mime==='application/pdf'?'pdf':'image'))return json({error:'Type de média incohérent.'},422,origin);
  const key=R2_PREFIX+crypto.randomUUID().replace(/-/g,'')+'.'+R2_TYPES[mime];
  const upload=await env.R2_MEDIA.createMultipartUpload(key,{httpMetadata:{contentType:mime,cacheControl:'public, max-age=3600'}});
  return json({key,uploadId:upload.uploadId,url:r2Url(request,key),chunkSize:R2_PART_BYTES},200,origin);
 }
 const key=request.headers.get('x-r2-key')||'';
 if(path==='/r2/part'){
  const uploadId=request.headers.get('x-r2-upload-id');
  const number=Number(request.headers.get('x-r2-part-number'));
  if(!validR2Key(key)||!uploadId||uploadId.length>256||!Number.isInteger(number)||number<1||number>R2_MAX_PARTS)return json({error:'Transfert invalide.'},400,origin);
  const sizeHeader=Number(request.headers.get('content-length')||0);
  if(sizeHeader>R2_PART_BYTES)return json({error:'Morceau trop volumineux.'},413,origin);
  const buffer=new Uint8Array(await request.arrayBuffer());
  if(!buffer.length||buffer.length>R2_PART_BYTES)return json({error:'Morceau invalide.'},413,origin);
  if(number===1&&!validMagic(buffer.slice(0,16),r2MimeForKey(key)))return json({error:'Le format réel du fichier ne correspond pas au type choisi.'},422,origin);
  const part=await env.R2_MEDIA.resumeMultipartUpload(key,uploadId).uploadPart(number,buffer);
  return json({partNumber:part.partNumber,etag:part.etag},200,origin);
 }
 const body=await request.json();
 if(!validR2Key(body?.key))return json({error:'Référence R2 invalide.'},400,origin);
 if(path==='/r2/info'){
  const object=await env.R2_MEDIA.head(body.key);
  if(!object||object.size<=0||object.size>R2_MAX_BYTES||object.httpMetadata?.contentType!==r2MimeForKey(body.key))return json({error:'Le fichier R2 est introuvable ou non autorisé.'},404,origin);
  return json({key:body.key,url:r2Url(request,body.key),bytes:object.size,mime:r2MimeForKey(body.key)},200,origin);
 }
 if(path==='/r2/delete'){
  await env.R2_MEDIA.delete(body.key);return json({deleted:true},200,origin);
 }
 if(typeof body.uploadId!=='string'||!body.uploadId||body.uploadId.length>256)return json({error:'Transfert R2 invalide.'},400,origin);
 const upload=env.R2_MEDIA.resumeMultipartUpload(body.key,body.uploadId);
 if(path==='/r2/abort'){
  await upload.abort();return json({aborted:true},200,origin);
 }
 if(path==='/r2/finish'){
  const parts=body.parts;
  if(!Array.isArray(parts)||!parts.length||parts.length>R2_MAX_PARTS||
    !parts.every((x,i)=>x&&x.partNumber===i+1&&typeof x.etag==='string'&&R2_ETAG.test(x.etag))||
    !Number.isInteger(body.bytes)||body.bytes<=0||body.bytes>R2_MAX_BYTES)return json({error:'Liste des morceaux invalide.'},422,origin);
  const result=await upload.complete(parts);
  if(result.size!==body.bytes||result.size>R2_MAX_BYTES){await env.R2_MEDIA.delete(body.key);return json({error:'La taille finale ne correspond pas au fichier annoncé.'},422,origin)}
  return json({key:body.key,url:r2Url(request,body.key),bytes:result.size,mime:r2MimeForKey(body.key)},200,origin);
 }
 return json({error:'Route inconnue'},404,origin);
}
export default {
 async fetch(request,env){
  if(['GET','HEAD'].includes(request.method)&&new URL(request.url).pathname.startsWith('/r2/media/'))return r2Public(request,env);
  const origin=request.headers.get('Origin')||'';
  const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  if(!allowed.includes(origin))return json({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization, content-type, x-r2-key, x-r2-upload-id, x-r2-part-number','access-control-max-age':'600','vary':'Origin'}});
  if(request.method!=='POST')return json({error:'Method not allowed'},405,origin);
  const path=new URL(request.url).pathname;
  if(!['/sign','/delete','/lookup','/r2/create','/r2/part','/r2/finish','/r2/abort','/r2/delete','/r2/info'].includes(path))return json({error:'Not found'},404,origin);
  try{
   if(!env.FIREBASE_PROJECT_ID)throw Error('Firebase project configuration incomplete');
   const auth=request.headers.get('Authorization')||'';
   if(!auth.startsWith('Bearer '))return json({error:'Authentication required'},401,origin);
   await verifyFirebase(auth.slice(7),env.FIREBASE_PROJECT_ID);
   if(path.startsWith('/r2/'))return await r2Admin(request,env,path,origin);
   if(!env.CLOUDINARY_CLOUD_NAME||!env.CLOUDINARY_API_KEY||!env.CLOUDINARY_API_SECRET)throw Error('Cloudinary configuration incomplete');
   const timestamp=Math.floor(Date.now()/1000);
   if(path==='/sign'){
    const public_id=PREFIX+crypto.randomUUID().replace(/-/g,'');
    const signed={public_id,timestamp};
    const sig=await signature(signed,env.CLOUDINARY_API_SECRET);
    return json({cloud_name:env.CLOUDINARY_CLOUD_NAME,api_key:env.CLOUDINARY_API_KEY,public_id,timestamp,signature:sig},200,origin);
   }
   const body=await request.json();
   const public_id=body?.public_id;
   if(typeof public_id!=='string'||!public_id.startsWith(PREFIX)||!/^moussa_toure\/portfolio\/[a-f0-9]{32}$/.test(public_id))return json({error:'Invalid public ID'},400,origin);
   if(path==='/lookup'){
    // Read-only Cloudinary Admin API, only after verification of Firebase admin JWT.
    // Recovery is limited to our own generated asset IDs, never arbitrary Cloudinary files.
    const url=`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/resources/image/upload/${encodeURIComponent(public_id)}`;
    const authHeader='Basic '+btoa(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`);
    const r=await fetch(url,{headers:{Authorization:authHeader}});
    if(!r.ok)return json({error:r.status===404?'Ce PDF est introuvable sur Cloudinary.':'Impossible de retrouver le PDF sur Cloudinary.'},r.status===404?404:502,origin);
    const asset=await r.json();
    const expected=`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`;
    if(asset.public_id!==public_id||asset.resource_type!=='image'||asset.format!=='pdf'||typeof asset.secure_url!=='string'||!asset.secure_url.startsWith(expected)||!asset.secure_url.toLowerCase().endsWith('.pdf')||!Number.isInteger(asset.bytes)||asset.bytes<=0||asset.bytes>10000000)return json({error:'Le fichier retrouvé ne correspond pas à un CV PDF autorisé.'},422,origin);
    return json({public_id,format:'pdf',secure_url:asset.secure_url,bytes:asset.bytes,width:Number(asset.width||0),height:Number(asset.height||0)},200,origin);
   }
   const params={public_id,timestamp};const sig=await signature(params,env.CLOUDINARY_API_SECRET);
   const data=new URLSearchParams({...params,timestamp:String(timestamp),api_key:env.CLOUDINARY_API_KEY,signature:sig});
   const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/destroy`,{method:'POST',body:data});
   const outcome=await response.json();
   if(!response.ok||outcome.result!=='ok')return json({error:outcome.error?.message||`Cloudinary returned ${outcome.result||response.status}`},502,origin);
   return json({deleted:true},200,origin);
  }catch(e){const message=e instanceof Error?e.message:String(e);
   const unauthorized=/token|Not authorized|Unknown key|Authentication|Unsupported/i.test(message);
   return json({error:unauthorized?'Access denied':message},unauthorized?403:500,origin);
  }
 }
};
