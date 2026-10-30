import {usePortfolio} from '../lib/usePortfolio';
import {safeUrl,t} from '../lib/content';
import {MediaImage} from '../lib/media';
import {ArrowUpRight} from 'lucide-react';
export default function TrainingSection(){
 const {data,lang}=usePortfolio();
 const entries=data.training.filter(x=>x.status==='published').sort((a,b)=>a.order-b.order);
 if(!entries.length)return null;
 return <section id="training" className="training-section section-shell" aria-label="Training"><div className="section-heading"><span className="eyebrow">{lang==='fr'?'FORMATION':'PROFESSIONAL DEVELOPMENT'}</span><h2>TRAINING.</h2></div><div className="training-list">{entries.map(entry=><article key={entry.id} className="training-entry"><div className="training-copy"><span className="eyebrow">{t(entry.period,lang)}</span><h3>{t(entry.title,lang)}</h3><p>{t(entry.description,lang)}</p>{t(entry.qualification,lang)&&<p className="training-qualification">{t(entry.qualification,lang)}</p>}{safeUrl(entry.externalUrl)&&<a href={safeUrl(entry.externalUrl)} target="_blank" rel="noopener noreferrer" className="underlined-link">{lang==='fr'?'Voir la référence':'View reference'} <ArrowUpRight size={16}/></a>}</div>{(entry.image||entry.images?.length>0)&&<div className="training-images">{[entry.image||entry.images?.[0],...(entry.image?entry.images:entry.images?.slice(1)||[])].filter((v):v is string=>Boolean(v)).map((src,i)=>safeUrl(src)?<a key={i} href={safeUrl(src)} target="_blank" rel="noopener noreferrer" aria-label={`${t(entry.title,lang)} — photo ${i+1}`}><MediaImage src={safeUrl(src)} loading="lazy" alt={`${t(entry.title,lang)} — ${lang==='fr'?'photographie':'photograph'} ${i+1}`}/></a>:null)}</div>}</article>)}</div></section>;
}
