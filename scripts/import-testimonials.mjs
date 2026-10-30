import {readFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('../src/content/initial-data.json',import.meta.url),'utf8'));
const testimonials=data.testimonials??[];
const write=process.argv.includes('--write');
const projectId=process.env.FIREBASE_PROJECT_ID;
if(!write){
 console.log('PREVIEW — no connection to Firebase and no writes.');
 for(const q of testimonials)console.log(`- ${q.id}: ${q.author} (${q.status})`);
 console.log('To import missing testimonials, use FIREBASE_PROJECT_ID and CONFIRM_TESTIMONIAL_PROJECT with npm run testimonials:import.');
 process.exit(0);
}
if(!projectId||process.env.CONFIRM_TESTIMONIAL_PROJECT!==projectId){throw Error('Set FIREBASE_PROJECT_ID and matching CONFIRM_TESTIMONIAL_PROJECT before importing.');}
const {initializeApp,applicationDefault}=await import('firebase-admin/app');
const {getFirestore}=await import('firebase-admin/firestore');
initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore();
let created=0,skipped=0;
for(const {id,...item} of testimonials){
 const docRef=db.collection('testimonials').doc(id);
 try { await docRef.create(item); created++; console.log(`Added ${id}`); }
 catch(error){
  // Firestore ALREADY_EXISTS (6) means an administrator has already edited it;
  // do not overwrite any existing testimony or hide the conflict.
  if(error?.code===6||error?.code==='already-exists'){skipped++;console.log(`Preserved existing ${id}`);continue;}
  throw error;
 }
}
console.log(`Complete: ${created} new, ${skipped} previously existing testimonials preserved.`);
