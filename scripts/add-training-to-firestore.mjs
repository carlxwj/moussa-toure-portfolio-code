import admin from 'firebase-admin';
import {readFileSync} from 'node:fs';
const project=process.env.FIREBASE_PROJECT_ID;
const confirmed=process.argv.includes('--write');
if(project!=='moussatoure-actor')throw new Error('FIREBASE_PROJECT_ID must equal moussatoure-actor');
if(confirmed&&process.env.CONFIRM_TRAINING_PROJECT!=='moussatoure-actor')throw new Error('Set CONFIRM_TRAINING_PROJECT=moussatoure-actor to write');
admin.initializeApp({credential:admin.credential.applicationDefault(),projectId:project});
const db=admin.firestore();
const training=JSON.parse(readFileSync(new URL('../src/content/training-data.json',import.meta.url),'utf8'));
const buttonPhotos=['/media/training/button-scene.webp','/media/training/button-glasses.webp'];
const projectRef=db.collection('projects').doc('first-camera-role');
const prior=await projectRef.get();
console.log('Target:',project,'mode:',confirmed?'WRITE':'PREVIEW');
const batch=db.batch();let count=0;
for(const row of training){const ref=db.collection('training').doc(row.id),snap=await ref.get();
 if(snap.exists){console.log('SKIP existing training:',row.id);continue}
 const {id,...payload}=row;console.log('CREATE training:',id);if(confirmed)batch.create(ref,payload);count++;
}
if(prior.exists){const existing=Array.isArray(prior.data()?.gallery)?prior.data().gallery:[];
 const fresh=buttonPhotos.filter(url=>!existing.includes(url));console.log('Button new photos:',fresh.length);
 if(fresh.length&&confirmed)batch.update(projectRef,{gallery:[...existing,...fresh]});count+=fresh.length?1:0;
}else console.log('Button project document missing: no update (site seed still has photographs)');
if(confirmed&&count){await batch.commit();console.log('Applied safely without replacing existing content.')}else console.log('No changes written.');
