import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {ArrowLeft,ChevronLeft,ChevronRight,X} from 'lucide-react';
import {usePortfolio} from '../lib/usePortfolio';
import {safeUrl,t} from '../lib/content';
import {MediaImage} from '../lib/media';
export default function PhotoStoryDetail({kind}:{kind:'shootings'|'experiences'}){
 const {id}=useParams();const {data,lang}=usePortfolio();
 const item=kind==='shootings'?data.shootings.find(v=>v.id===id&&v.status==='published'):data.experiences.find(v=>v.id===id&&v.status==='published');
 const [active,setActive]=useState<number|null>(null);
 useEffect(()=>{setActive(null);window.scrollTo(0,0)},[id]);
 const photos=item?[item.image,...(item.gallery||[])].filter((s):s is string=>Boolean(s&&safeUrl(s))):[];
 useEffect(()=>{if(active===null)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setActive(null);if(e.key==='ArrowRight')setActive(v=>v===null?null:(v+1)%photos.length);if(e.key==='ArrowLeft')setActive(v=>v===null?null:(v+photos.length-1)%photos.length)};document.addEventListener('keydown',key);const old=document.body.style.overflow;document.body.style.overflow='hidden';return ()=>{document.removeEventListener('keydown',key);document.body.style.overflow=old}},[active,photos.length]);
 if(!item)return <main className="detail-404 section-shell"><h1>Not found</h1><Link to="/">← Home</Link></main>;
 const name=t(item.title,lang);const linked=kind==='experiences'&&'projectId' in item?data.projects.find(p=>p.id===item.projectId):null;
 return <main className="photo-story-detail project-detail"><div className="detail-heading section-shell"><Link className="underlined-link" to={kind==='shootings'?'/?#shootings':'/?#credits'}><ArrowLeft size={18}/>{lang==='fr'?'Retour':'Back'}</Link><span className="eyebrow">{kind==='shootings'?(lang==='fr'?'SHOOTING':'PHOTO SHOOT'):(lang==='fr'?'EXPÉRIENCE':'EXPERIENCE')}{item.year?` / ${item.year}`:''}</span><h1>{name}</h1></div>
 {photos.length>0&&<div className="project-cover section-shell"><button className="project-cover-button" type="button" onClick={()=>setActive(0)}><MediaImage src={photos[0]} alt={`${name} — cover`}/></button></div>}
 <div className="detail-content section-shell"><div className="detail-fields">{'role' in item&&<div><small>Role</small><span>{t(item.role,lang)}</span></div>}{'photographer' in item&&item.photographer&&<div><small>Photography</small><span>{item.photographer}</span></div>}</div>{item.description&&<p>{t(item.description,lang)}</p>}{linked&&<Link className="underlined-link" to={`/projects/${encodeURIComponent(linked.slug)}`}>{lang==='fr'?'Voir le projet associé':'See related project'} ↗</Link>}</div>
 {photos.length>1&&<section className="project-stills section-shell"><div className="project-stills-heading"><span className="eyebrow">{lang==='fr'?'GALERIE':'GALLERY'}</span><span>{photos.length} {lang==='fr'?'PHOTOS':'PHOTOS'}</span></div><div className="project-stills-grid">{photos.slice(1).map((src,i)=><button type="button" className="project-still" key={`${src}-${i}`} onClick={()=>setActive(i+1)}><MediaImage src={src} alt={`${name} — ${i+2}`} loading="lazy"/></button>)}</div></section>}
 {active!==null&&photos.length>0&&<div className="project-lightbox" role="dialog" aria-modal="true" aria-label="Photo gallery" onClick={e=>{if(e.target===e.currentTarget)setActive(null)}}><button className="project-lightbox-close" onClick={()=>setActive(null)} aria-label="Close"><X/></button><button className="project-lightbox-prev" onClick={()=>setActive((active+photos.length-1)%photos.length)} aria-label="Previous"><ChevronLeft/></button><figure><MediaImage src={photos[active]} alt={`${name} — ${active+1}`}/><figcaption>{active+1} / {photos.length}</figcaption></figure><button className="project-lightbox-next" onClick={()=>setActive((active+1)%photos.length)} aria-label="Next"><ChevronRight/></button></div>}
 </main>
}
