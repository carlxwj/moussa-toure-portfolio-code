import {ArrowUpRight} from 'lucide-react';
import {usePortfolio} from '../lib/usePortfolio';
import {safeUrl,t} from '../lib/content';
import {MediaImage} from '../lib/media';
import type {CustomSection as CustomSectionType} from '../types/models';
export default function CustomSection({item}:{item:CustomSectionType}){
 const {lang}=usePortfolio();
 return <section className="section-shell cms-custom-section" id={`custom-${item.id}`}>
  <div className="section-heading"><span className="eyebrow">{t(item.eyebrow,lang)}</span><h2>{t(item.title,lang)}</h2></div>
  <div className="cms-custom-grid"><div className="cms-custom-copy">{t(item.body,lang).split(/\n\s*\n/).map((p,i)=><p key={i}>{p}</p>)}{item.link&&safeUrl(item.link)&&<a className="underlined-link" href={safeUrl(item.link)} target="_blank" rel="noopener noreferrer">{t(item.linkLabel,lang)||item.link}<ArrowUpRight size={18}/></a>}</div>{item.image&&safeUrl(item.image)&&<MediaImage src={item.image} alt={t(item.title,lang)} loading="lazy"/>}</div>
 </section>
}
