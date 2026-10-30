import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
// Run only from your local, trusted computer with GOOGLE_APPLICATION_CREDENTIALS
// pointing OUTSIDE this project to a private Firebase service-account JSON.
// No service-account secrets belong in src/, public/, .env or this repository.
const [uid,confirmation]=process.argv.slice(2);
const projectId=process.env.FIREBASE_PROJECT_ID;
if(!uid||!projectId)throw Error('Usage: FIREBASE_PROJECT_ID=<project-id> node scripts/grant-admin.mjs <existing-auth-uid> [CONFIRM:<project-id>]');
initializeApp({credential:applicationDefault(),projectId});
const auth=getAuth();
const user=await auth.getUser(uid);
console.log(`Target: ${projectId} | UID: ${user.uid} | Email: ${user.email??'(missing)'} | Verified: ${user.emailVerified}`);
if(!confirmation){console.log(`DRY RUN ONLY. Verify the UID/email, then repeat with CONFIRM:${projectId}. Nothing was changed.`);process.exit(0)}
if(confirmation!==`CONFIRM:${projectId}`)throw Error(`Confirmation must be exactly CONFIRM:${projectId}`);
if(!user.emailVerified)throw Error('Verify the existing administrator email first.');
await auth.setCustomUserClaims(uid,{...(user.customClaims||{}),admin:true});
console.log(`Admin permission granted for the confirmed account on ${projectId}. Sign out and sign back in to refresh the token.`);
