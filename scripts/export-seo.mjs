// Export only currently published Firestore records into a local build-time snapshot.
// Requires authorized application default credentials; never exposes drafts.
import {writeFile,mkdir} from 'node:fs/promises';
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
const projectId=process.env.FIREBASE_PROJECT_ID;
if(!projectId||process.env.CONFIRM_SEED_PROJECT!==projectId)throw Error('Set FIREBASE_PROJECT_ID and matching CONFIRM_SEED_PROJECT to explicitly select the project');
initializeApp({credential:applicationDefault(),projectId});
const db=getFirestore();
const profile=await db.doc('actorProfile/main').get();
const projects=await db.collection('projects').where('status','==','published').get();
const data={profile:profile.exists?profile.data():null,projects:projects.docs.map(v=>({id:v.id,...v.data()})).sort((a,b)=>(a.order??0)-(b.order??0))};
await mkdir('.cache',{recursive:true});await writeFile('.cache/seo-public.json',JSON.stringify(data,null,2));
console.log(`Saved approved public SEO data: ${data.projects.length} projects. Rebuild and redeploy to publish updated HTML.`);
