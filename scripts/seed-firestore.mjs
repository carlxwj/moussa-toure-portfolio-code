import {readFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('../src/content/initial-data.json',import.meta.url),'utf8'));
const write=process.argv.includes('--write');
const projectId=process.env.GOOGLE_CLOUD_PROJECT||process.env.GCLOUD_PROJECT||process.env.FIREBASE_PROJECT_ID;
if(!write){console.log('DRY RUN: preview of initial documents to create. Nothing is uploaded.');for(const [collection,items] of Object.entries(data))console.log(`${collection}: ${Array.isArray(items)?items.length:1} items`);console.log('Use FIREBASE_PROJECT_ID=<your-id> npm run seed:write to create missing documents (never overwrites).');process.exit(0)}
if(!projectId)throw Error('Set FIREBASE_PROJECT_ID to the target project before using --write');
if(process.env.CONFIRM_SEED_PROJECT!==projectId)throw Error('Set CONFIRM_SEED_PROJECT to the exact FIREBASE_PROJECT_ID to confirm the target.');
const {initializeApp,applicationDefault}=await import('firebase-admin/app');
const {getFirestore}=await import('firebase-admin/firestore');
initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore();let created=0,skipped=0;
for(const [collection,records] of Object.entries(data)){
 const docs=Array.isArray(records)?records:[records];
 for(const record of docs){const ref=db.collection(collection==='profile'?'actorProfile':collection==='settings'?'siteSettings':collection).doc(record.id);
  const existing=await ref.get();if(existing.exists){skipped++;continue}
  const {id,...payload}=record;await ref.create(payload);created++;
 }
}
console.log(`Completed safely: ${created} created, ${skipped} existing preserved.`);
