import {initializeApp, getApps, type FirebaseApp} from 'firebase/app';
import {getAuth, type Auth} from 'firebase/auth';
import {getFirestore, type Firestore} from 'firebase/firestore';
import {initializeAppCheck, ReCaptchaEnterpriseProvider} from 'firebase/app-check';

const config={
 apiKey:import.meta.env.VITE_FIREBASE_API_KEY,
 authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
 projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,
 messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
 appId:import.meta.env.VITE_FIREBASE_APP_ID,
 measurementId:import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined
};
export const configured=Boolean(config.apiKey&&config.projectId&&config.appId);
export const app:FirebaseApp|null=configured?(getApps()[0]??initializeApp(config)):null;
if(app && import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY && typeof window !== 'undefined'){
 // Only use a Firebase-issued debug token for local development; never share it.
 if(import.meta.env.DEV && import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG === 'true'){
  Object.assign(self,{FIREBASE_APPCHECK_DEBUG_TOKEN: true});
 }
 initializeAppCheck(app,{
  provider:new ReCaptchaEnterpriseProvider(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY),
  isTokenAutoRefreshEnabled: true
 });
}
export const auth:Auth|null=app?getAuth(app):null;
export const db:Firestore|null=app?getFirestore(app):null;
