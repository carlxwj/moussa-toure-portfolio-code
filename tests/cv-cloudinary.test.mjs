import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('large CV uploads are secured by the existing admin-only Cloudinary gateway',()=>{
 const client=read('src/lib/cloudinary.ts');
 const worker=read('cloudinary-worker/index.js');
 assert.match(client,/MAX_CLOUD_PDF_BYTES = 10_000_000/);
 assert.match(client,/export async function uploadCloudPdf/);
 assert.match(client,/file\.slice\(0,5\)/);
 assert.match(client,/await gateway\('\/sign',\{\}\)/);
 assert.match(client,/\/image\/upload/);
 assert.match(client,/kind:'pdf',provider:'cloudinary'/);
 assert.doesNotMatch(client,/CLOUDINARY_API_SECRET/);
 assert.match(worker,/payload\.admin!==true/);
 assert.match(worker,/payload\.email_verified!==true/);
});
test('admin CV replacement uses one-click upload and waits until Firestore confirms saving',()=>{
 const admin=read('src/pages/Admin.tsx');
 assert.match(admin,/Choisir mon nouveau CV \(PDF\)/);
 assert.match(admin,/await uploadCloudPdf\(file\)/);
 assert.match(admin,/await setDoc\(doc\(db,'siteSettings','main'\),\{cvUrl:uploaded\.url,updatedAt:serverTimestamp\(\)\},\{merge:true\}\)/);
 assert.match(admin,/setCvMessage\('Nouveau CV publié/);
 assert.match(admin,/if\(cloudinaryReady\)\{setProgress/);
 assert.match(admin,/v\.startsWith\('https:\/\/res\.cloudinary\.com\/'\)/);
});
test('rules keep legacy PDF documents capped at 600 KB and allow only valid Cloudinary PDF metadata',()=>{
 const rules=read('firestore.rules');
 assert.match(rules,/request\.resource\.data\.bytes <= 600000/);
 assert.match(rules,/request\.resource\.data\.kind == 'pdf'/);
 assert.match(rules,/request\.resource\.data\.mime == 'application\/pdf'/);
 assert.match(rules,/request\.resource\.data\.bytes <= 10000000/);
 assert.match(rules,/request\.resource\.data\.url\.matches\('https:\/\/res\[\.\]cloudinary\[\.\]com/);
 assert.match(rules,/request\.resource\.data\.cloudinaryPublicId\.matches\('moussa_toure\/portfolio/);
});
