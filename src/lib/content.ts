import {collection,doc,onSnapshot,query,where} from 'firebase/firestore';
import type {PortfolioData,CollectionName,Language,Localized} from '../types/models';
import initial from '../content/initial-data.json';
import trainingInitial from '../content/training-data.json';
import {db} from './firebase';
export const seed={...initial,shootings:[],customSections:initial.customSections??[],training:trainingInitial} as PortfolioData;
export function subscribePortfolio(onData:(v:PortfolioData)=>void,onError:(error:string)=>void){
 let state:PortfolioData=structuredClone(seed);
 const emit=()=>onData({...state});
 emit();
 if(!db || (import.meta.env.DEV && import.meta.env.VITE_CONTENT_PREVIEW === 'local')) return ()=>{};
 const stops:(()=>void)[]=[];
 const one=(name:'actorProfile'|'siteSettings',key:'profile'|'settings')=>{
  stops.push(onSnapshot(doc(db!,name,'main'), snap=>{
   if(snap.exists()){state={...state,[key]:{id:'main',...snap.data()}};emit()}
  },()=>onError(`Could not load ${name}`)));
 };
 one('actorProfile','profile');one('siteSettings','settings');
 (['projects','experiences','shootings','gallery','stories','videos','testimonials','socialLinks','customSections','training'] as CollectionName[]).forEach(name=>{
  stops.push(onSnapshot(query(collection(db!,name),where('status','==','published')),snapshot=>{
    const items=snapshot.docs.map(d=>({...d.data(),id:d.id,order:Number(d.data().order??0)})).sort((a,b)=>a.order-b.order);
    state={...state,[name]:name==='training'&&items.length===0?trainingInitial:items};emit();
  },()=>onError(`Could not load ${name}`)));
 });
 return ()=>stops.forEach(stop=>stop());
}
export function safeUrl(value:string|undefined):string|undefined{
 if(!value) return undefined;
 if(/^asset:[a-z0-9_-]{4,100}$/i.test(value))return value;
 try{const url=new URL(value,window.location.href);return (url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))?url.href:undefined}catch{return undefined}
}
export function safeYoutubeId(value:string){
 const raw=value.trim();if(/^[\w-]{11}$/.test(raw))return raw;
 try{const u=new URL(raw);if(!['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com','youtu.be'].includes(u.hostname))return null;
 const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')??u.pathname.split('/').filter(Boolean).pop();
 return id&&/^[\w-]{11}$/.test(id)?id:null;}catch{return null}
}
export function t(v:Localized|undefined,lang:Language){return v?.[lang]||v?.en||v?.fr||''}
