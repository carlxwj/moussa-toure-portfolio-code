import {MediaImage} from '../lib/media';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Expand,X} from 'lucide-react';
import {usePortfolio} from '../lib/usePortfolio';
import {safeUrl,t} from '../lib/content';

export default function EditorialStories(){
 const {data,lang}=usePortfolio();
 const stories=data.stories??[];
 const [preview,setPreview]=useState<{storyId:string;index:number}|null>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 const triggerRef=useRef<HTMLElement|null>(null);
 const active=preview?stories.find(v=>v.id===preview.storyId):undefined;
 const urls=active?.images.filter(url=>!!safeUrl(url))??[];
 const selected=preview&&urls.length?Math.min(preview.index,urls.length-1):0;
 useEffect(()=>{
  if(!preview)return;
  const prior=document.body.style.overflow;document.body.style.overflow='hidden';closeRef.current?.focus();
  const handle=(e:KeyboardEvent)=>{
   if(e.key==='Escape')setPreview(null);
   if(e.key==='ArrowRight')setPreview(v=>v?{...v,index:(v.index+1)%urls.length}:v);
   if(e.key==='ArrowLeft')setPreview(v=>v?{...v,index:(v.index+urls.length-1)%urls.length}:v);
   if(e.key==='Tab'){
    const controls=Array.from(document.querySelectorAll<HTMLButtonElement>('.story-lightbox button'));
    const first=controls[0],last=controls[controls.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}
    if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
   }
  };
  document.addEventListener('keydown',handle);
  return ()=>{document.body.style.overflow=prior;document.removeEventListener('keydown',handle);triggerRef.current?.focus()};
 },[Boolean(preview),urls.length]);
 if(!stories.length)return null;
 return <section id="stories" className="section-shell stories-section" aria-label={lang==='fr'?'Parcours et création':'Journey and creative work'}>
  <header className="section-heading"><span className="eyebrow">07 / {lang==='fr'?'PARCOURS':'JOURNEY'}</span><h2 data-reveal>{lang==='fr'?'AU-DELÀ DES RÔLES.':'BEYOND THE ROLES.'}</h2></header>
  {stories.map((story,i)=><article className={`editorial-story story-${story.kind}`} key={story.id}>
   <div className="story-copy"><span className="eyebrow">{String(i+1).padStart(2,'0')} / {t(story.eyebrow,lang)}</span><h3>{t(story.title,lang)}</h3><p>{t(story.description,lang)}</p></div>
   {story.images.length>0?<div className="story-photos" aria-label={lang==='fr'?'Photos de la formation':'Course photographs'}>
    {story.images.map((url,index)=>safeUrl(url)&&<button className="story-photo" key={url} onClick={e=>{triggerRef.current=e.currentTarget;setPreview({storyId:story.id,index})}} aria-label={`${t(story.title,lang)} — ${lang==='fr'?'agrandir l’image':'view image'} ${index+1}`}>
      <MediaImage src={safeUrl(url)} alt={`${t(story.eyebrow,lang)} — ${lang==='fr'?'photographie':'photograph'} ${index+1}`} loading="lazy" decoding="async"/><span aria-hidden="true"><Expand size={16}/></span>
    </button>)}</div>:<div className="story-type-decoration" aria-hidden="true"><span>{story.kind==='journey'?'CYTO':story.kind==='personal'?'07':'MT'}</span></div>}
  </article>)}
  {preview&&active&&urls.length>0&&<div className="story-lightbox" role="dialog" aria-modal="true" aria-label={t(active.title,lang)} onClick={e=>{if(e.target===e.currentTarget)setPreview(null)}}>
   <button ref={closeRef} className="story-close" aria-label={lang==='fr'?'Fermer':'Close'} onClick={()=>setPreview(null)}><X size={24}/></button>
   <button className="story-previous" aria-label={lang==='fr'?'Précédente':'Previous'} onClick={()=>setPreview(v=>v?{...v,index:(v.index+urls.length-1)%urls.length}:v)}><ChevronLeft size={27}/></button>
   <figure><MediaImage src={safeUrl(urls[selected])} alt={`${t(active.title,lang)} — ${selected+1}`}/><figcaption>{t(active.title,lang)} <span>{selected+1} / {urls.length}</span></figcaption></figure>
   <button className="story-next" aria-label={lang==='fr'?'Suivante':'Next'} onClick={()=>setPreview(v=>v?{...v,index:(v.index+1)%urls.length}:v)}><ChevronRight size={27}/></button>
  </div>}
 </section>
}
