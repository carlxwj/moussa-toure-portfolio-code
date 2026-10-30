import {MediaImage} from '../lib/media';
import {useEffect,useRef,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {ArrowLeft,ArrowUpRight,ChevronLeft,ChevronRight,Expand,X} from 'lucide-react';
import {usePortfolio} from '../lib/usePortfolio';
import {safeUrl,t} from '../lib/content';
import VideoCard from '../components/VideoCard';

export default function ProjectDetail(){
 const {slug}=useParams();
 const {data,lang,words}=usePortfolio();
 const p=data.projects.find(v=>v.slug===slug);
 const [active,setActive]=useState<number|null>(null);
 const lastFocus=useRef<HTMLElement|null>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const photos=p?[p.image,...(p.gallery??[])].filter((v):v is string=>Boolean(v&&safeUrl(v))):[];
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});setActive(null)},[slug]);
 useEffect(()=>{
  if(active===null)return;
  const prev=document.body.style.overflow;document.body.style.overflow='hidden';
  closeButton.current?.focus();
  const handle=(e:KeyboardEvent)=>{
   if(e.key==='Escape')setActive(null);
   if(e.key==='ArrowRight')setActive(i=>i===null?null:(i+1)%photos.length);
   if(e.key==='ArrowLeft')setActive(i=>i===null?null:(i+photos.length-1)%photos.length);
   if(e.key==='Tab'){
    const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('.project-lightbox button'));
    const first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
   }
  };
  document.addEventListener('keydown',handle);
  return ()=>{document.body.style.overflow=prev;document.removeEventListener('keydown',handle);lastFocus.current?.focus()};
 },[active!==null,photos.length]);
 if(!p)return <main className="detail-404 section-shell"><h1>{words.notFound}</h1><Link to="/#work">{words.back}</Link></main>;
 const vid=data.videos.find(v=>v.youtubeId===p.videoId);
 const open=(index:number,element:HTMLElement)=>{lastFocus.current=element;setActive(index)};
 const title=t(p.title,lang);
 return <main className="project-detail">
  <div className="detail-heading section-shell">
   <Link className="underlined-link" to="/#work"><ArrowLeft size={18}/>{words.back}</Link>
   <span className="eyebrow">{p.category.toUpperCase()}{p.year?` / ${p.year}`:''}</span>
   <h1>{title}</h1>
  </div>
  {safeUrl(p.image)?<div className="project-cover section-shell"><button type="button" className="project-cover-button" onClick={e=>open(0,e.currentTarget)} aria-label={`${title} — ${lang==='fr'?'agrandir la photo principale':'view main photograph'}`}><MediaImage src={safeUrl(p.image)} alt={`${title} — ${lang==='fr'?'photo principale':'main still'}`} decoding="async" fetchPriority="high"/><span className="project-enlarge"><Expand size={16}/>{lang==='fr'?'AGRANDIR':'VIEW IMAGE'}</span></button></div>:<div className="project-no-image section-shell"><span>{lang==='fr'?'Photographies de cette production à confirmer':'Production photographs awaiting confirmation'}</span></div>}
  <div className="detail-content section-shell">
   <div className="detail-fields"><div><small>{words.role}</small><span>{t(p.role,lang)}</span></div>
   {p.creator&&<div><small>{words.production}</small><span>{p.creator}</span></div>}
   {p.year&&<div><small>{words.year}</small><span>{p.year}</span></div>}</div>
   <p>{t(p.description,lang)}</p>
  </div>
  {p.gallery?.some(v=>Boolean(safeUrl(v)))&&<section className="project-stills section-shell" aria-label={`${title} — ${lang==='fr'?'photographies':'photographs'}`}>
   <div className="project-stills-heading"><span className="eyebrow">{lang==='fr'?'IMAGES DU PROJET':'STILLS & MOMENTS'}</span><span className="micro-label">{String(photos.length).padStart(2,'0')} {lang==='fr'?'IMAGES':'FRAMES'}</span></div>
   <div className="project-stills-grid">{p.gallery?.map((url,i)=>safeUrl(url)?<button key={`${url}-${i}`} type="button" className="project-still" onClick={e=>open(i+1,e.currentTarget)} aria-label={`${title} — ${lang==='fr'?'ouvrir la photo':'view photograph'} ${i+2}`}>
    <MediaImage loading="lazy" decoding="async" src={safeUrl(url)} alt={`${title} — ${lang==='fr'?'photo':'still'} ${i+2}`} />
    <span className="project-still-number">{String(i+2).padStart(2,'0')} <Expand size={15}/></span>
   </button>:null)}</div>
  </section>}
  {vid&&<section className="section-shell project-video"><VideoCard item={vid} number={1} featured/></section>}
  {p.externalUrl&&safeUrl(p.externalUrl)&&<div className="section-shell project-external"><a href={safeUrl(p.externalUrl)} target="_blank" rel="noopener noreferrer" className="underlined-link">Official project <ArrowUpRight size={18}/></a></div>}
  {active!==null&&photos.length>0&&<div className="project-lightbox" role="dialog" aria-modal="true" aria-label={`${title} — image viewer`} onClick={e=>{if(e.target===e.currentTarget)setActive(null)}}>
   <button ref={closeButton} className="project-lightbox-close" onClick={()=>setActive(null)} aria-label={lang==='fr'?'Fermer':'Close'}><X size={24}/></button>
   <button className="project-lightbox-prev" onClick={()=>setActive((active+photos.length-1)%photos.length)} aria-label={lang==='fr'?'Précédente':'Previous'}><ChevronLeft size={26}/></button>
   <figure><MediaImage src={safeUrl(photos[active])} alt={`${title} — ${active+1}`} /><figcaption><span>{title}</span><span>{active+1} / {photos.length}</span></figcaption></figure>
   <button className="project-lightbox-next" onClick={()=>setActive((active+1)%photos.length)} aria-label={lang==='fr'?'Suivante':'Next'}><ChevronRight size={26}/></button>
  </div>}
 </main>
}
