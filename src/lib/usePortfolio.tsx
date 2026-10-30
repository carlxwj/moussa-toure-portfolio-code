import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {subscribePortfolio,seed} from './content';
import type {PortfolioData,Language} from '../types/models';
import {labels} from './translations';
import {resolveLanguage} from './detectLanguage.mjs';

const LANGUAGE_KEY='moussa-lang';
const PortfolioContext=createContext<{data:PortfolioData;lang:Language;setLang:(v:Language)=>void;words:typeof labels.en;error:string|null}|null>(null);

function readLanguage():Language {
 let saved:string|null=null;
 try{if(typeof localStorage!=='undefined')saved=localStorage.getItem(LANGUAGE_KEY)}catch{/* Private browsing/storage restricted */}
 // New visitors always start in English. Keep manually selected FR/EN on return visits.
 return resolveLanguage(saved);
}

export function PortfolioProvider({children}:{children:ReactNode}){
 const [data,setData]=useState<PortfolioData>(seed);
 const [error,setError]=useState<string|null>(null);
 const [lang,setLangState]=useState<Language>(readLanguage);
 const setLang=(v:Language)=>{
  setLangState(v);
  try{localStorage.setItem(LANGUAGE_KEY,v)}catch{/* storage unavailable */}
 };
 useEffect(()=>subscribePortfolio(setData,setError),[]);
 useEffect(()=>{document.documentElement.lang=lang},[lang]);
 const words={...labels[lang],...Object.fromEntries(Object.entries(data.settings.copy||{}).map(([key,v])=>[key,v?.[lang]?.trim()||v?.en||'']))} as typeof labels.en;
 return <PortfolioContext.Provider value={{data,lang,setLang,words,error}}>{children}</PortfolioContext.Provider>;
}
export function usePortfolio(){const context=useContext(PortfolioContext);if(!context)throw new Error('Missing PortfolioProvider');return context}
