import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import worker from '../cloudinary-worker/index.js';

const origin='https://moussatoure-actor.web.app';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'r2-test-kid',alg:'RS256',use:'sig'};
const to64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function jwt(admin=true){const now=Math.floor(Date.now()/1000);const a=to64({alg:'RS256',kid:'r2-test-kid'}),b=to64({iss:'https://securetoken.google.com/moussatoure-actor',aud:'moussatoure-actor',sub:'moussa123',iat:now,auth_time:now-30,exp:now+300,admin,email_verified:true});return `${a}.${b}.${sign('RSA-SHA256',Buffer.from(`${a}.${b}`),privateKey).toString('base64url')}`}
const assets=new Map();const pending=new Map();
const bucket={
 async createMultipartUpload(key,opts){const uploadId='r2-test-upload-'+pending.size;pending.set(uploadId,{key,opts,parts:new Map()});return {uploadId}},
 resumeMultipartUpload(key,uploadId){
  const get=()=>{const p=pending.get(uploadId);if(!p||p.key!==key)throw Error('Unknown multipart');return p};
  return {async uploadPart(partNumber,b){const p=get();const bytes=Buffer.from(b);p.parts.set(partNumber,bytes);return {partNumber,etag:createHash('md5').update(bytes).digest('hex')}} ,
   async complete(parts){const p=get();assert.deepEqual(parts.map(x=>x.partNumber),[...Array(parts.length)].map((_,i)=>i+1));const payload=Buffer.concat(parts.map(x=>p.parts.get(x.partNumber)));assets.set(key,{body:payload,size:payload.length,httpMetadata:p.opts.httpMetadata});pending.delete(uploadId);return {size:payload.length}},
   async abort(){pending.delete(uploadId)}
  }
 },
 async get(key){const x=assets.get(key);return x?{body:new ReadableStream({start(c){c.enqueue(x.body);c.close()}}),...x}:null},
 async head(key){const x=assets.get(key);return x?{size:x.size,httpMetadata:x.httpMetadata}:null},
 async delete(key){assets.delete(key)}
};
const env={ALLOWED_ORIGINS:origin,FIREBASE_PROJECT_ID:'moussatoure-actor',R2_MEDIA:bucket};
const oldFetch=globalThis.fetch;
const request=(path,token,body,headers={})=>new Request('https://media.example'+path,{method:'POST',headers:{Origin:origin,Authorization:`Bearer ${token}`,...(typeof body==='string'?{'content-type':'application/json'}:{}),...headers},body});
test.after(()=>{globalThis.fetch=oldFetch});

test('R2 is restricted to verified Firebase admins and allowed origins, and files are served with safe MIME',async()=>{
 globalThis.fetch=async url=>{if(String(url).includes('googleapis.com'))return Response.json({keys:[jwk]});throw Error('Unexpected fetch '+url)};
 const admin=jwt();
 const denied=await worker.fetch(request('/r2/create',jwt(false),JSON.stringify({mime:'image/jpeg',bytes:13_500_000,kind:'image'})),env);
 assert.equal(denied.status,403);
 const wrongOrigin=new Request('https://media.example/r2/create',{method:'POST',headers:{Origin:'https://evil.example',Authorization:`Bearer ${admin}`},body:'{}'});
 assert.equal((await worker.fetch(wrongOrigin,env)).status,403);
 assert.equal((await worker.fetch(request('/r2/create',admin,JSON.stringify({mime:'image/svg+xml',bytes:120,kind:'image'})),env)).status,422);
 const creation=await worker.fetch(request('/r2/create',admin,JSON.stringify({mime:'image/jpeg',bytes:13_500_000,kind:'image'})),env);
 assert.equal(creation.status,200,await creation.clone().text());const created=await creation.json();
 assert.match(created.key,/^moussa_toure\/portfolio\/[a-f0-9]{32}\.jpg$/);
 assert.ok(!JSON.stringify(created).includes('SECRET'));
 const input=Buffer.alloc(13_500_000);input[0]=255;input[1]=216;input[2]=255;
 const parts=[];
 for(let i=0;i<3;i++){
  const slice=input.subarray(i*6_000_000,(i+1)*6_000_000);
  const resp=await worker.fetch(request('/r2/part',admin,new Uint8Array(slice),{'x-r2-key':created.key,'x-r2-upload-id':created.uploadId,'x-r2-part-number':String(i+1),'content-type':'application/octet-stream'}),env);
  assert.equal(resp.status,200,await resp.clone().text());parts.push(await resp.json());
 }
 const finish=await worker.fetch(request('/r2/finish',admin,JSON.stringify({key:created.key,uploadId:created.uploadId,parts,bytes:input.length})),env);
 assert.equal(finish.status,200,await finish.clone().text());
 assert.equal((await finish.json()).bytes,input.length);
 const publicResponse=await worker.fetch(new Request('https://media.example/r2/media/'+created.key),env);
 assert.equal(publicResponse.status,200);assert.equal(publicResponse.headers.get('content-type'),'image/jpeg');assert.equal(publicResponse.headers.get('x-content-type-options'),'nosniff');
 assert.equal((await publicResponse.arrayBuffer()).byteLength,input.length);
 assert.equal((await worker.fetch(new Request('https://media.example/r2/media/not-a-key'),env)).status,404);
 const info=await worker.fetch(request('/r2/info',admin,JSON.stringify({key:created.key})),env);
 assert.equal((await info.json()).bytes,input.length);
 const deletion=await worker.fetch(request('/r2/delete',admin,JSON.stringify({key:created.key})),env);
 assert.equal(deletion.status,200);assert.equal(assets.size,0);
});

test('R2 Firestore permissions stay admin-only, original Cloudinary rules and features are preserved',()=>{
 const root=new URL('../',import.meta.url);const read=x=>readFileSync(new URL(x,root),'utf8');
 const rules=read('firestore.rules'),admin=read('src/pages/Admin.tsx'),client=read('src/lib/r2.ts');
 assert.match(rules,/provider == 'r2'/);
 assert.match(rules,/request.resource.data.r2Key.matches/);
 assert.match(rules,/isAdmin\(\)/);
 assert.match(rules,/cloudinaryPublicId/);
 assert.match(admin,/r2Ready\?await uploadR2/);
 assert.match(admin,/if\(r2Ready\)/);
 assert.match(client,/VITE_R2_ENABLED==='true'/);
 assert.match(client,/CHUNK_BYTES=6_000_000/);
 assert.doesNotMatch(client,/CLOUDINARY_API_SECRET|R2_ACCESS_KEY_SECRET/);
});

test('R2 rejects missing bucket, unauthenticated requests, spoofed formats and oversized files',async()=>{
 globalThis.fetch=async url=>{if(String(url).includes('googleapis.com'))return Response.json({keys:[jwk]});throw Error('Unexpected fetch '+url)};
 const admin=jwt();
 assert.equal((await worker.fetch(request('/r2/create',admin,JSON.stringify({mime:'image/jpeg',kind:'image',bytes:20})),{...env,R2_MEDIA:null})).status,503);
 assert.equal((await worker.fetch(new Request('https://media.example/r2/create',{method:'POST',headers:{Origin:origin},body:'{}'}),env)).status,401);
 assert.equal((await worker.fetch(request('/r2/create',admin,JSON.stringify({mime:'image/jpeg',kind:'image',bytes:500_000_001})),env)).status,422);
 const created=await (await worker.fetch(request('/r2/create',admin,JSON.stringify({mime:'application/pdf',kind:'pdf',bytes:7_000_000})),env)).json();
 const invalid=await worker.fetch(request('/r2/part',admin,new Uint8Array([1,2,3,4,5]),{'x-r2-key':created.key,'x-r2-upload-id':created.uploadId,'x-r2-part-number':'1'}),env);
 assert.equal(invalid.status,422);
 const abort=await worker.fetch(request('/r2/abort',admin,JSON.stringify({key:created.key,uploadId:created.uploadId})),env);
 assert.equal(abort.status,200);
});
