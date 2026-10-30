// Add new photos without overwriting text or other Firestore content.
// Usage: npm run photos:preview  (read-only)
// Then npm run photos:publish after Hosting has been deployed and verified.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const scriptDir=dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(await readFile(resolve(scriptDir,'new-photos-manifest.json'),'utf8'));
const target='moussatoure-actor';
const writing=process.argv.includes('--write');
const projectId=process.env.FIREBASE_PROJECT_ID;
if(!projectId || projectId!==target){
 console.error(`Configure FIREBASE_PROJECT_ID=${target} to inspect this project's actual database.`);
 process.exit(1);
}
if(writing && process.env.CONFIRM_PHOTOS_PROJECT!==target){
 console.error(`Confirmation required: set CONFIRM_PHOTOS_PROJECT=${target}`);
 process.exit(1);
}
if(!process.env.GOOGLE_APPLICATION_CREDENTIALS){
 console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a private Firebase service-account file, stored OUTSIDE the web project.');
 process.exit(1);
}
const {initializeApp,applicationDefault}=await import('firebase-admin/app');
const {getFirestore}=await import('firebase-admin/firestore');
initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore();
const planned=[];
const refs=manifest.gallery.map(p=>db.collection('gallery').doc(p.id));
const gallerySnapshot=await db.collection('gallery').get();
const existingIds=new Set(gallerySnapshot.docs.map(d=>d.id));
let maxOrder=gallerySnapshot.docs.reduce((mx,d)=>Math.max(mx, Number(d.get('order')||0)),0);
for(const item of manifest.gallery){
 if(existingIds.has(item.id)){console.log('Already exists, keep untouched:',item.id);continue;}
 planned.push({...item,order:++maxOrder});
}
const projects=[];
for(const [key,newPaths] of Object.entries(manifest.projectGalleries)){
 const ref=db.collection('projects').doc(key),snap=await ref.get();
 if(!snap.exists){console.warn('Project missing, cannot attach new project gallery yet:',key);continue;}
 const cur=Array.isArray(snap.get('gallery'))?snap.get('gallery'):[];
 const missing=newPaths.filter(path=>!cur.includes(path));
 projects.push({id:key,ref,currentGallery:cur,append:missing});
}
console.log(`Target: ${target} | gallery docs to CREATE: ${planned.length} | project gallery additions: ${projects.map(p=>p.id+':'+p.append.length).join(', ')}`);
console.log('No project descriptions, titles, images, ordering, or other existing data will be overwritten.');
if(!writing){console.log('DRY RUN ONLY. No changes made. Deploy Hosting files first, then use photos:publish if the preview is correct.');process.exit(0)}
// Before ANY database change, write a local snapshot of the affected existing documents.
const backupDir=resolve(scriptDir,'../.backups');await mkdir(backupDir,{recursive:true});
const backup=resolve(backupDir,`before-new-photos-${new Date().toISOString().replaceAll(':','-')}.json`);
await writeFile(backup,JSON.stringify({projectId:target,projects:projects.map(p=>({id:p.id,gallery:p.currentGallery})),existingGalleryIds:[...existingIds]},null,2));
console.log('Local backup written:',backup);
let created=0;
for(const item of planned){
 const {id,...payload}=item;
 try{await db.collection('gallery').doc(id).create(payload);created++;}
 catch(e){if(e.code===6 || e.code==='already-exists'){console.log('Existing doc detected concurrently, not changed:',id);continue;}throw e;}
}
let updated=0;
for(const p of projects){
 await db.runTransaction(async t=>{
  const snap=await t.get(p.ref);
  if(!snap.exists)return;
  const cur=Array.isArray(snap.get('gallery'))?snap.get('gallery'):[];
  const merged=[...cur,...(manifest.projectGalleries[p.id]||[]).filter(path=>!cur.includes(path))];
  if(merged.length!==cur.length){t.update(p.ref,{gallery:merged});updated++;}
 });
}
console.log(`Completed: ${created} NEW gallery photos, ${updated} project galleries updated. Reopen /admin and the public site to confirm.`);
