import {app} from './firebase';
import type {Analytics} from 'firebase/analytics';

type Choice='accepted'|'rejected';
const KEY='moussa-toure-analytics-consent-v1';
const CONSENT_MAX_AGE=180*24*60*60*1000;
let activeAnalytics:Analytics|null=null;
let requestedChoice:Choice|null=null;

// Keep Analytics entirely unloaded while the visitor has not opted in.
export function storedAnalyticsChoice():Choice|null{
 try{
  const raw=localStorage.getItem(KEY);
  if(!raw)return null;
  const item=JSON.parse(raw) as {choice?:unknown;at?:unknown};
  if(typeof item.at!=='number'||Date.now()-item.at>CONSENT_MAX_AGE)return null;
  return item.choice==='accepted'||item.choice==='rejected'?item.choice:null;
 }catch{return null}
}

export async function applyAnalyticsChoice(choice:Choice):Promise<void>{
 requestedChoice=choice;
 if(choice==='rejected'){
  if(activeAnalytics){
   const {setConsent,setAnalyticsCollectionEnabled}=await import('firebase/analytics');
   setConsent({analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   setAnalyticsCollectionEnabled(activeAnalytics,false);
  }
  return;
 }
 if(!app||!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID)return;
 try{
  const sdk=await import('firebase/analytics');
  if(!(await sdk.isSupported())||requestedChoice!=='accepted')return;
  // SDK initialization only occurs after explicit consent.
  const instance=sdk.getAnalytics(app);
  if(requestedChoice!=='accepted'){
   sdk.setAnalyticsCollectionEnabled(instance,false);
   return;
  }
  sdk.setConsent({analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  sdk.setAnalyticsCollectionEnabled(instance,true);
  activeAnalytics=instance;
 }catch(error){console.warn('Analytics is unavailable in this browser.',error)}
}

export function saveAnalyticsChoice(choice:Choice):void{
 try{localStorage.setItem(KEY,JSON.stringify({choice,at:Date.now()}))}catch{/* Storage can be blocked. */}
 void applyAnalyticsChoice(choice);
}
