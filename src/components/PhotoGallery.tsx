import {MediaImage} from '../lib/media';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,X,Expand} from 'lucide-react';
import {usePortfolio} from '../lib/usePortfolio';
import {safeUrl,t} from '../lib/content';
export default function PhotoGallery(){
 const {data,lang,words}=usePortfolio();
 const photos=data.gallery.filter(p=>p.url&&safeUrl(p.url));
 const groups=[{id:'portrait',label:'PORTRAITS'},{id:'screen',label:lang==='fr'?'À L’ÉCRAN':'ON SCREEN'},{id:'stage',label:lang==='fr'?'SUR SCÈNE':'ON STAGE'},{id:'campaign',label:lang==='fr'?'CAMPAGNE':'CAMPAIGN'}];
 const [selected,setSelected]=useState<number|null>(null);
 const closer=useRef<HTMLButtonElement>(null);
 const previousFocus=useRef<HTMLElement|null>(null);
 const touch=useRef<number|null>(null);
 const n=photos.length;
 useEffect(()=>{if(selected===null)return;
  const old=document.body.style.overflow;document.body.style.overflow='hidden';closer.current?.focus();
  const handle=(e:KeyboardEvent)=>{if(e.key==='Escape')setSelected(null);if(e.key==='ArrowRight')setSelected(v=>v===null?v:(v+1)%n);if(e.key==='ArrowLeft')setSelected(v=>v===null?v:(v+n-1)%n);
   if(e.key==='Tab'){const items=document.querySelectorAll<HTMLElement>('.lightbox button');const a=items[0],b=items[items.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();b?.focus()}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a?.focus()}}};
  document.addEventListener('keydown',handle);
  return ()=>{document.body.style.overflow=old;document.removeEventListener('keydown',handle);previousFocus.current?.focus()};
 },[selected===null,n]);
 const categories=new Set(groups.map(g=>g.id));
 const collections=[...groups,{id:'other',label:lang==='fr'?'AUTRES IMAGES':'MORE FRAMES'}];
 return <section id="gallery" className="section-shell gallery-section"><div className="section-heading"><span className="eyebrow">04 / {words.gallery}</span><h2>{words.frames}</h2></div>
 {photos.length===0?<div className="gallery-empty"><div className="gallery-empty-visual"><span>PORTRAITS / FRAMES</span><span>01 — ∞</span></div><p>{words.photoPending}</p></div>:
 collections.map(g=>{
  const entries=photos.map((photo,index)=>({photo,index})).filter(({photo})=>g.id==='other'?!categories.has(photo.category):photo.category===g.id);
  if(!entries.length)return null;
  return <div className="gallery-collection" key={g.id}>
   <div className="gallery-collection-label"><span className="eyebrow">{g.label}</span><span className="micro-label">{String(entries.length).padStart(2,'0')} / {String(photos.length).padStart(2,'0')}</span></div>
   <div className={`gallery-curated-grid ${g.id==='portrait'?'gallery-portraits':'gallery-film-stills'}`}>{entries.map(({photo:p,index:i})=>{
    const project=p.projectId?data.projects.find(v=>v.id===p.projectId):undefined;
    return <button className="gallery-curated-tile" key={p.id} onClick={e=>{previousFocus.current=e.currentTarget;setSelected(i)}} aria-label={`${words.gallery}: ${t(p.alt,lang)} — enlarge`}>
     <span className="gallery-curated-image"><MediaImage loading="lazy" decoding="async" src={safeUrl(p.thumbUrl||p.url)} alt={t(p.alt,lang)}/></span>
     <span className="gallery-curated-caption"><span>{project?t(project.title,lang):t(p.alt,lang)}</span><Expand size={15}/></span>
    </button>
   })}</div>
  </div>
 })}
 {selected!==null&&n>0&&<div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}} onTouchStart={e=>touch.current=e.touches[0]?.clientX??null} onTouchEnd={e=>{const end=e.changedTouches[0]?.clientX;if(touch.current!==null&&end!==undefined&&Math.abs(touch.current-end)>60)setSelected(v=>v===null?v:(v+(touch.current!>end?1:n-1))%n);touch.current=null}}>
  <button className="lightbox-close" ref={closer} onClick={()=>setSelected(null)} aria-label="Close"><X size={26}/></button><button className="lightbox-prev" onClick={()=>setSelected((selected+n-1)%n)} aria-label="Previous photo"><ChevronLeft size={30}/></button>
  <figure><MediaImage src={safeUrl(photos[selected].url)} alt={t(photos[selected].alt,lang)}/><figcaption>{t(photos[selected].alt,lang)} <span>{selected+1} / {n}</span></figcaption></figure>
  <button className="lightbox-next" onClick={()=>setSelected((selected+1)%n)} aria-label="Next photo"><ChevronRight size={30}/></button>
 </div>}
 </section>
}
