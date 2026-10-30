import {MediaLink} from '../lib/media';
import {useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ArrowUpRight,Menu,X} from 'lucide-react';
import {usePortfolio} from '../lib/usePortfolio';
import {safeUrl,t} from '../lib/content';
import {completeSectionOrder,defaultSectionOrder,sectionAnchor} from '../lib/sectionOrder';
/** The admin's sectionOrder is the single source of truth for PC and mobile. */
export function Header(){
 const {data,lang,setLang,words}=usePortfolio();
 const [open,setOpen]=useState(false);
 const [moreOpen,setMoreOpen]=useState(false);
 const [scrolled,setScrolled]=useState(false);
 // Keep navigation accessible at every scroll position, without changing the hero layout.
 useEffect(()=>{
  const update=()=>setScrolled(window.scrollY>48);
  update();
  window.addEventListener('scroll',update,{passive:true});
  return ()=>window.removeEventListener('scroll',update);
 },[]);
 const panel=useRef<HTMLElement>(null);
 const button=useRef<HTMLButtonElement>(null);
 const {pathname,hash}=useLocation();
 useEffect(()=>{setOpen(false);setMoreOpen(false)},[pathname,hash]);
 useEffect(()=>{
  if(!open)return;
  const old=document.body.style.overflow;document.body.style.overflow='hidden';
  const first=panel.current?.querySelector<HTMLAnchorElement>('a');first?.focus();
  const trap=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){setOpen(false);return;}
   if(e.key!=='Tab'||!panel.current)return;
   const els=Array.from(panel.current.querySelectorAll<HTMLElement>('a,button')).filter(el=>!el.hasAttribute('disabled'));
   const firstEl=els[0],lastEl=els[els.length-1];
   if(e.shiftKey&&document.activeElement===firstEl){e.preventDefault();lastEl?.focus()}
   if(!e.shiftKey&&document.activeElement===lastEl){e.preventDefault();firstEl?.focus()}
  };
  document.addEventListener('keydown',trap);
  return ()=>{document.body.style.overflow=old;document.removeEventListener('keydown',trap);button.current?.focus()};
 },[open]);
 const available=[...defaultSectionOrder,...data.customSections.filter(s=>s.status==='published').map(s=>'custom:'+s.id)];
 const order=completeSectionOrder(data.settings.sectionOrder,available);
 const labels:Record<string,string>={about:words.about,showreel:words.showreel,projects:words.work,videos:words.videos,training:words.training,shootings:lang==='fr'?'Shootings / Photos':'Photo Shoots',gallery:words.gallery,credits:words.credits,beyond:words.beyond,stories:words.journey,testimonials:words.testimonials,professional:lang==='fr'?'Profils & CV':'Profiles & CV',contact:words.contact};
 const links=order.filter(key=>data.settings.sections?.[key]!==false)
  .filter(key=>(key!=='showreel'||data.videos.some(v=>v.id==='showreel'))&&(key!=='shootings'||data.shootings.some(v=>v.status==='published')))
  .map(key=>({key,label:key.startsWith('custom:')?t(data.customSections.find(s=>'custom:'+s.id===key)?.title,lang):labels[key]||key,href:`/#${sectionAnchor(key)}`}));
 // Keep the editorial desktop navigation compact. Extra sections follow the same
 // Firestore order under More; the mobile index includes every published section.
 const primary=new Set(['about','showreel','projects','videos','training','contact']);
 const desktopLinks=links.filter(item=>primary.has(item.key));
 const extraLinks=links.filter(item=>!primary.has(item.key));
 return <>
  <header className={`site-header${scrolled?' is-scrolled':''}`} id="top"><Link className="wordmark" to="/" aria-label={`${data.profile.name} — Home`}>{data.profile.name.toUpperCase()}<span className="logo-period">.</span></Link>
   <nav className="desktop-nav" aria-label="Main navigation">{desktopLinks.map(item=><Link key={item.key} to={item.href}>{item.label}</Link>)}
    {extraLinks.length>0&&<div className="nav-more"><button type="button" className="nav-more-button" aria-expanded={moreOpen} aria-controls="desktop-more" onClick={()=>setMoreOpen(v=>!v)}>{lang==='fr'?'Plus':'More'}</button>{moreOpen&&<div className="nav-more-panel" id="desktop-more">{extraLinks.map(item=><Link key={item.key} to={item.href} onClick={()=>setMoreOpen(false)}>{item.label}</Link>)}</div>}</div>}
    <div className="language-picker" aria-label="Language"><button className={lang==='en'?'active':''} onClick={()=>setLang('en')} aria-pressed={lang==='en'}>EN</button><span>/</span><button className={lang==='fr'?'active':''} onClick={()=>setLang('fr')} aria-pressed={lang==='fr'}>FR</button></div>
   </nav>
   <button ref={button} className="menu-toggle" onClick={()=>setOpen(o=>!o)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open?'Close menu':'Open menu'}>{open?<X size={24}/>:<Menu size={24}/>}</button>
  </header>
  <div className={`menu-backdrop ${open?'is-open':''}`} onClick={()=>setOpen(false)} aria-hidden="true" />
  <aside ref={panel} role="dialog" aria-modal="true" aria-label={words.menu} aria-hidden={!open} id="mobile-menu" className={`mobile-panel ${open?'is-open':''}`} inert={!open}>
    <button className="panel-close" onClick={()=>setOpen(false)} aria-label="Close navigation"><X size={24}/></button>
    <span className="eyebrow">{words.menu}</span>
    <nav><Link to="/" onClick={()=>setOpen(false)}>{words.home}<ArrowUpRight size={17}/></Link>{links.map((item,i)=><Link style={{transitionDelay:open?`${(i+1)*30}ms`:'0ms'}} key={item.key} onClick={()=>setOpen(false)} to={item.href}>{item.label}<ArrowUpRight size={17}/></Link>)}</nav>
    <span className="eyebrow panel-find">{words.social}</span>
    <div className="panel-social">{data.socialLinks.map(s=>safeUrl(s.url)&&<a key={s.id} target="_blank" rel="noopener noreferrer" href={safeUrl(s.url)}>{s.label}</a>)}</div>
    {data.settings.cvUrl&&<MediaLink className="panel-cv" src={data.settings.cvUrl}>{lang==='fr'?'CV ARTISTIQUE (PDF)':'ACTING CV (PDF)'} <ArrowUpRight size={16}/></MediaLink>}<div className="panel-langs"><button aria-pressed={lang==='en'} onClick={()=>setLang('en')}>EN</button><span>—</span><button aria-pressed={lang==='fr'} onClick={()=>setLang('fr')}>FR</button></div>
  </aside>
 </>;
}
export function Footer(){const {data,words,lang}=usePortfolio();return <footer className="site-footer"><div className="footer-top"><span>{words.resume}</span><Link to="/#home" className="inline-icon">{words.top}<ArrowUpRight size={18}/></Link></div><div className="footer-name" aria-label={data.profile.name}>{data.profile.name.toUpperCase()}</div><div className="footer-bottom"><div>© {new Date().getFullYear()} {data.profile.name}. {words.rights}.</div><div className="footer-links"><Link to="/#professional">{lang==='fr'?'Profils professionnels':'Professional profiles'}</Link>{data.settings.cvUrl&&<MediaLink src={data.settings.cvUrl}>CV (PDF)</MediaLink>}<Link to="/legal">{words.legal}</Link><Link to="/privacy">{words.privacy}</Link>{import.meta.env.VITE_FIREBASE_MEASUREMENT_ID&&<button type="button" className="footer-privacy-button" onClick={()=>window.dispatchEvent(new Event('moussa:analytics-preferences'))}>{lang==='fr'?'Cookies / audience':'Privacy settings'}</button>}<span>{lang.toUpperCase()}</span></div></div><div className="footer-developer"><span>{words.developerCredit}</span><a href="https://www.instagram.com/carlxwj/" target="_blank" rel="noopener noreferrer" aria-label="Carlos da Costa — Instagram">Carlos da Costa <span className="footer-developer-handle">· @carlxwj</span><ArrowUpRight size={13} aria-hidden="true" /></a></div></footer>}
