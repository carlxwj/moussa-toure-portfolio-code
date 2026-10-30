import {Link} from 'react-router-dom';
import {ArrowUpRight} from 'lucide-react';
import {usePortfolio} from '../lib/usePortfolio';
import {MediaImage} from '../lib/media';
import {safeUrl,t} from '../lib/content';
export default function ShootingsSection(){
 const {data,lang}=usePortfolio();
 const shoots=data.shootings.filter(s=>s.status==='published').sort((a,b)=>a.order-b.order);
 if(!shoots.length)return null;
 return <section id="shootings" className="shootings-section section-shell"><div className="section-heading"><span className="eyebrow">{lang==='fr'?'PORTRAITS & SÉANCES':'PORTRAITS & SESSIONS'}</span><h2>{lang==='fr'?'SHOOTINGS.':'PHOTO SHOOTS.'}</h2></div><div className="shootings-grid">{shoots.map(s=><Link key={s.id} to={`/shootings/${encodeURIComponent(s.id)}`} className="shooting-card"><div className="shooting-picture">{safeUrl(s.image)?<MediaImage src={s.image} alt={t(s.title,lang)} loading="lazy"/>:<span>{t(s.title,lang)}</span>}</div><div className="shooting-description"><h3>{t(s.title,lang)}</h3><span>{s.year||''} <ArrowUpRight size={18}/></span></div></Link>)}</div></section>
}
