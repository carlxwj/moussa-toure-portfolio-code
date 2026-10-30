// Run: firebase emulators:start --only firestore --project demo-moussa
// Then set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 and run npm run test:rules
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
import {doc,getDoc,setDoc,updateDoc,collection,getDocs,query,where} from 'firebase/firestore';
let env:RulesTestEnvironment;
beforeAll(async()=>{
 if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Run the Firestore emulator first');
 env=await initializeTestEnvironment({projectId:'demo-moussa',firestore:{rules:readFileSync('firestore.rules','utf8')}});
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await setDoc(doc(db,'projects','published'),{status:'published',order:1,title:{en:'Real project',fr:'Projet'}});
  await setDoc(doc(db,'projects','draft'),{status:'draft',order:2,title:{en:'Private draft',fr:'Brouillon'}});
  await setDoc(doc(db,'experiences','published'),{status:'published',order:1,title:{en:'Published credit',fr:'Crédit publié'},role:{en:'Actor',fr:'Acteur'}});
  await setDoc(doc(db,'experiences','draft'),{status:'draft',order:2,title:{en:'Draft credit',fr:'Brouillon'}});
  await setDoc(doc(db,'contactMessages','legacy'),{email:'private@example.invalid'});
  await setDoc(doc(db,'mediaAssets','photo'),{mime:'image/webp',base64:'UklGRg==',bytes:4,status:'published'});
  await setDoc(doc(db,'mediaIndex','photo'),{id:'photo',mime:'image/webp',name:'photo.webp',kind:'image',bytes:4,status:'published'});
 });
});
afterAll(async()=>{await env?.cleanup()});
describe('Spark Firestore permissions',()=>{
 it('public can only get published content, not private collections',async()=>{
  const db=env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db,'projects','published')));
  await assertFails(getDoc(doc(db,'projects','draft')));
  await assertSucceeds(getDoc(doc(db,'experiences','published')));
  await assertFails(getDoc(doc(db,'experiences','draft')));
  await assertFails(getDoc(doc(db,'contactMessages','legacy')));
  await assertFails(getDocs(collection(db,'contactMessages')));
  await assertSucceeds(getDoc(doc(db,'mediaAssets','photo')));
  await assertFails(getDocs(collection(db,'mediaAssets')));
  await assertFails(getDoc(doc(db,'mediaIndex','photo')));
  await assertFails(setDoc(doc(db,'mediaAssets','attack'),{mime:'image/svg+xml',base64:'AAA',bytes:3,status:'published'}));
  await assertFails(setDoc(doc(db,'projects','attack'),{status:'published',order:1}));
  await assertSucceeds(getDocs(query(collection(db,'projects'),where('status','==','published'))));
  await assertSucceeds(getDocs(query(collection(db,'experiences'),where('status','==','published'))));
 });
 it('signed-in non-admin still cannot write',async()=>{
  const db=env.authenticatedContext('regular').firestore();
  await assertFails(updateDoc(doc(db,'projects','published'),{status:'draft'}));
  await assertFails(setDoc(doc(db,'experiences','unauthorized'),{status:'published',order:1,title:{en:'Unsafe'}}));
 });
 it('custom claim permits admin only',async()=>{
  const db=env.authenticatedContext('admin',{admin:true,email_verified:true}).firestore();
  await assertSucceeds(setDoc(doc(db,'projects','new'),{status:'published',order:3,title:{en:'New'}}));
  await assertSucceeds(setDoc(doc(db,'experiences','new'),{status:'published',order:3,title:{en:'Actor',fr:'Acteur'},role:{en:'Lead',fr:'Principal'}}));
  await assertSucceeds(setDoc(doc(db,'mediaAssets','new'),{mime:'image/webp',base64:'UklGRg==',bytes:4,status:'published'}));
  await assertFails(getDoc(doc(db,'contactMessages','legacy')));
 });
});
