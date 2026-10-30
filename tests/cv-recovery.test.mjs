import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import worker from '../cloudinary-worker/index.js';

const root=new URL('../',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');
const origin='https://moussatoure-actor.web.app';
const cloudName='l4ynrtbb';
const fileId='moussa_toure/portfolio/971daea2d9f341108c1b38382af7dbd6';
const env={FIREBASE_PROJECT_ID:'moussatoure-actor',ALLOWED_ORIGINS:origin,CLOUDINARY_CLOUD_NAME:cloudName,CLOUDINARY_API_KEY:'1234567890',CLOUDINARY_API_SECRET:'FAKE_TEST_ONLY'};
const makeRequest=(body,auth='',orig=origin)=>new Request('https://mock-worker.workers.dev/lookup',{method:'POST',headers:{'Origin':orig,'Content-Type':'application/json', ...(auth?{'Authorization':`Bearer ${auth}`}:{})},body:JSON.stringify(body)});

test('CV recovery cannot bypass allowed origins or Firebase authentication',async()=>{
 const deniedOrigin=await worker.fetch(makeRequest({public_id:fileId},'', 'https://evil.example'),env);
 assert.equal(deniedOrigin.status,403);
 const deniedNoAuth=await worker.fetch(makeRequest({public_id:fileId}),env);
 assert.equal(deniedNoAuth.status,401);
});

test('authenticated admin can recover a verified Cloudinary PDF and not an arbitrary ID',async()=>{
 const keys=await webcrypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await webcrypto.subtle.exportKey('jwk',keys.publicKey);jwk.kid='for-test';
 const b64=v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url');
 const now=Math.floor(Date.now()/1000);
 const payload={aud:env.FIREBASE_PROJECT_ID,iss:`https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,sub:'test-user',exp:now+3600,iat:now-10,auth_time:now-100,admin:true,email_verified:true};
 const input=`${b64({alg:'RS256',kid:'for-test'})}.${b64(payload)}`;
 const sig=Buffer.from(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(input))).toString('base64url');
 const token=`${input}.${sig}`;
 const oldFetch=globalThis.fetch;
 let resourceRequests=0;
 globalThis.fetch=async url=>{
  const u=String(url);
  if(u.includes('googleapis.com/service_accounts'))return Response.json({keys:[jwk]});
  if(u.includes('/resources/image/upload/')){
   resourceRequests++;
   assert.ok(u.includes(encodeURIComponent(fileId)));
   return Response.json({public_id:fileId,resource_type:'image',format:'pdf',bytes:2345678,width:0,height:0,secure_url:`https://res.cloudinary.com/${cloudName}/image/upload/v123/moussa_toure/portfolio/971daea2d9f341108c1b38382af7dbd6.pdf`});
  }
  throw Error('Unexpected fetch: '+u);
 };
 try{
  const result=await worker.fetch(makeRequest({public_id:fileId},token),env);
  assert.equal(result.status,200,await result.clone().text());
  const payload=await result.json();
  assert.equal(payload.public_id,fileId);assert.equal(payload.bytes,2345678);
  assert.equal(resourceRequests,1);
  const before=resourceRequests;
  const rejected=await worker.fetch(makeRequest({public_id:'someone_else/file'},token),env);
  assert.equal(rejected.status,400);
  assert.equal(resourceRequests,before);
 } finally {globalThis.fetch=oldFetch;}
});

test('PDF metadata write and publication are atomic; no second PDF upload needed',()=>{
 const admin=read('src/pages/Admin.tsx');
 const client=read('src/lib/cloudinary.ts');
 const rules=read('firestore.rules');
 assert.match(admin,/await lookupCloudPdf\(recoverId\)/);
 assert.match(admin,/batch\.set\(doc\(db,'mediaIndex',indexId\)/);
 assert.match(admin,/batch\.update\(doc\(db,'siteSettings','main'\)/);
 assert.match(admin,/await batch\.commit\(\)/);
 assert.match(client,/gateway\('\/lookup',\{public_id:id\}\)/);
 assert.match(rules,/request\.resource\.data\.kind == 'pdf'/);
 assert.match(rules,/request\.resource\.data\.bytes <= 10000000/);
 assert.match(rules,/request\.resource\.data\.bytes <= 600000/);
});
