import {MediaImage,MediaLink} from '../lib/media';
import {useEffect,type ReactNode} from 'react';
import {ArrowDown,ArrowUpRight} from 'lucide-react';
import {Link,useLocation} from 'react-router-dom';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {usePortfolio} from '../lib/usePortfolio';
import {safeUrl,t} from '../lib/content';
import VideoCard from '../components/VideoCard';
import PhotoGallery from '../components/PhotoGallery';
import Contact from '../components/Contact';
import EditorialStories from '../components/EditorialStories';
import ProfessionalProfiles from '../components/ProfessionalProfiles';
import CustomSection from '../components/CustomSection';
import TrainingSection from '../components/TrainingSection';
import ShootingsSection from '../components/ShootingsSection';
import {completeSectionOrder,defaultSectionOrder} from '../lib/sectionOrder';
gsap.registerPlugin(ScrollTrigger);
function Hero(){const {data,lang,words}=usePortfolio();const back=safeUrl(data.profile.heroImage),cutout=safeUrl(data.profile.heroCutout);
 return <section className="hero" id="home" aria-label={`${data.profile.name} — Actor`}>
  {back?<MediaImage className="hero-background hero-portrait-photo" src={back} alt="" fetchPriority="high"/>:<div className="hero-background hero-background-fallback" aria-hidden="true"><div className="hero-ambient"/><div className="hero-outline">M<br/>T</div></div>}
  <div className="hero-shade"/>
  <div className="marquee-window" aria-hidden="true"><div className="marquee-track"><span>{data.profile.name.toUpperCase().replace(/\s+/g,' — ')}&nbsp;&nbsp;{data.profile.name.toUpperCase().replace(/\s+/g,' — ')}&nbsp;&nbsp;</span><span>{data.profile.name.toUpperCase().replace(/\s+/g,' — ')}&nbsp;&nbsp;{data.profile.name.toUpperCase().replace(/\s+/g,' — ')}&nbsp;&nbsp;</span></div></div>
  {cutout?<MediaImage className="hero-cutout" src={cutout} alt="" fetchPriority="high"/>:!back?<div className="portrait-placeholder" aria-label={words.mediaPending}><span className="portrait-roman">MT.</span><span>{words.mediaPending}</span></div>:null}
  <div className="hero-bottom"><div className="hero-rule"/><div className="hero-meta"><div><span className="micro-label">{words.actor.toUpperCase()}</span><span>{words.heroFields}</span></div><div className="hero-meta-right"><span>{data.profile.name.toUpperCase()}</span><span>{t(data.profile.location,lang).toUpperCase()}</span></div></div></div>
  <a href="#about" className="hero-scroll" aria-label="Scroll to about"><ArrowDown size={18}/></a>
 </section>}
function About(){const {data,lang,words}=usePortfolio();const image=safeUrl(data.profile.aboutImage||data.profile.heroImage);
 return <section id="about" className="about-section section-shell"><div className="section-heading about-head"><span className="eyebrow">{words.about.toUpperCase()}</span><h2 data-reveal>{words.intro}</h2></div>
  <div className="about-grid"><div className="about-picture" data-reveal>{image?<MediaImage loading="lazy" src={image} alt={`Portrait — ${data.profile.name}`}/>:<div className="photo-absence"><span>{data.profile.name}</span><small>{words.mediaPending}</small></div>}<span className="photo-credit">01 / PORTRAIT</span></div>
  <div className="about-copy" data-reveal><span className="eyebrow">{t(data.profile.location,lang).toUpperCase()} / {t(data.profile.role,lang).toUpperCase()}</span><p className="about-lead">{t(data.profile.shortBio,lang)}</p><p>{t(data.profile.biography,lang)}</p><div className="about-stats"><div><small>{words.aboutLanguagesLabel}</small><strong>{t(data.profile.languages,lang)}</strong></div><div><small>{words.aboutExpressionLabel}</small><strong>{words.aboutExpression}</strong></div></div>{data.settings.cvUrl&&<MediaLink className="underlined-link" src={data.settings.cvUrl}>{words.aboutCvLabel}<ArrowUpRight size={18}/></MediaLink>}</div></div>
 </section>}
function Work(){const {data,lang,words}=usePortfolio();return <section id="work" className="work-section section-shell"><div className="section-heading"><span className="eyebrow">{words.work.toUpperCase()}</span><h2 data-reveal>{words.selected}</h2></div>
 <div className="work-grid">{data.projects.map((p,i)=><Link className={`work-item work-item-${i%3}`} key={p.id} data-reveal to={`/projects/${encodeURIComponent(p.slug)}`}><div className="work-picture">{safeUrl(p.image)?<MediaImage loading="lazy" src={safeUrl(p.image)} alt=""/>:<div className="work-art"><span>{p.category.toUpperCase()}</span><strong>{String(i+1).padStart(2,'0')}</strong></div>}<span className="work-view">{words.more} <ArrowUpRight size={17}/></span></div><div className="work-row"><span className="micro-label">{String(i+1).padStart(2,'0')} / {p.category.toUpperCase()}</span><ArrowUpRight size={20}/></div><h3 className={t(p.title,lang).length>33?'work-long-heading':undefined}>{t(p.title,lang)}</h3><p>{t(p.role,lang)}</p></Link>)}</div>
 </section>}
/** Showreel has its own page section but keeps the existing editable YouTube record. */
function Showreel(){
 const {data,words}=usePortfolio();
 const video=data.videos.find(v=>v.id==='showreel');
 if(!video)return null;
 return <section id="showreel" className="showreel-section section-shell"><div className="section-heading"><span className="eyebrow">{words.showreel.toUpperCase()}</span><h2 data-reveal>{words.showreelHeading}</h2></div><div className="showreel-player"><VideoCard key={video.id} item={video} number={1} featured/></div></section>;
}
function Videos(){
 const {data,words}=usePortfolio();
 const videos=data.videos.filter(v=>v.id!=='showreel');
 const feature=videos.find(v=>v.featured)||videos[0];
 const rest=videos.filter(v=>v.id!==feature?.id);
 if(!feature)return null;
 return <section id="videos" className="videos-section section-shell"><div className="section-heading"><span className="eyebrow">{words.videos.toUpperCase()}</span><h2 data-reveal>{words.screen}</h2></div><div className="videos-primary"><VideoCard key={feature.id} item={feature} number={1} featured/></div><div className="secondary-videos">{rest.map((v,i)=><VideoCard key={v.id} item={v} number={i+2}/>)}</div></section>;
}
function Credits(){
 const {data,lang,words}=usePortfolio();
 // Existing installations continue using their live projects until the administrator
 // imports the current credits as independent, editable Firestore documents.
 const experiences=data.settings.experiencesInitialized?data.experiences:data.projects.map((p,i)=>({id:p.id,status:p.status,order:i+1,title:p.title,role:p.role,category:p.category,year:p.year,company:p.creator,projectId:p.id,externalUrl:'',image:p.image,gallery:p.gallery,description:p.description}));
 const rows=[...experiences].filter(e=>e.status==='published').sort((a,b)=>a.order-b.order);
 return <section id="credits" className="credits-section section-shell"><div className="section-heading"><span className="eyebrow">{words.credits.toUpperCase()}</span><h2 data-reveal>{words.experience}</h2></div>
 <div className="credit-list">{rows.map((e,i)=>{
  const linked=data.projects.find(p=>p.id===e.projectId&&p.status==='published');
  const target=(e.image||(e.gallery&&e.gallery.length)||e.description)?`/experiences/${encodeURIComponent(e.id)}`:(linked?`/projects/${encodeURIComponent(linked.slug)}`:safeUrl(e.externalUrl));
  const details=<><span className="credit-number">{String(i+1).padStart(2,'0')}</span><strong>{t(e.title,lang)}</strong><span>{e.category.toUpperCase()}</span><span>{t(e.role,lang)}</span><span>{e.year||'—'}</span>{target?<ArrowUpRight size={19}/>:<span aria-hidden="true">—</span>}</>;
  return target?(linked?<Link to={target} className="credit-row" key={e.id}>{details}</Link>:<a href={target} target="_blank" rel="noopener noreferrer" className="credit-row" key={e.id}>{details}</a>):<div className="credit-row" key={e.id}>{details}</div>;
 })}</div></section>;
}
function Beyond(){const {data,lang,words}=usePortfolio();return <section id="beyond" className="beyond-section section-shell"><div className="section-heading"><span className="eyebrow">{words.beyond.toUpperCase()}</span><h2 data-reveal>{words.beyondTitle}</h2></div><div className="beyond-grid"><div className="beyond-huge" aria-hidden="true">{(words.beyondHuge||'CREATE / EXPLORE / REPEAT').split('/').map((part,i)=><span key={i}>{part.trim()}<br/></span>)}<span>↗</span></div><div className="beyond-copy"><span className="eyebrow">{words.beyondSmall||'EVERY STORY BEGINS SOMEWHERE'}</span><p>{t(data.profile.skills,lang)}</p><div className="beyond-rule"/><p className="beyond-small">{t(data.profile.shortBio,lang)}</p></div></div></section>}
function Testimonials(){const {data,lang,words}=usePortfolio();return <section className="section-shell testimonials-section" id="testimonials"><div className="section-heading"><span className="eyebrow">{words.testimonials.toUpperCase()}</span><h2 data-reveal>{words.words}</h2></div>{data.testimonials.length?<div className="testimonial-grid">{data.testimonials.map(q=><blockquote className="testimonial-card" key={q.id}><div className="testimonial-top"><span className="testimonial-avatar">{safeUrl(q.photo)?<MediaImage src={safeUrl(q.photo)} alt="" loading="lazy"/>:q.author.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}</span><span className="testimonial-mark" aria-hidden="true">“</span></div><p>{t(q.quote,lang)}</p><footer><cite>{q.author}</cite>{q.context&&<span>{t(q.context,lang)}</span>}</footer></blockquote>)}</div>:<p className="testimonials-pending">{words.noTestimonials}</p>}</section>}
export default function Home(){const {data}=usePortfolio();const {hash}=useLocation();useEffect(()=>{if(!hash)return;const id=decodeURIComponent(hash.slice(1));requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'}))},[hash]);
 useEffect(()=>{
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce)return;
  const context=gsap.context(()=>{
   gsap.fromTo('.hero-background-fallback',{opacity:0},{opacity:1,duration:1.2});
   gsap.fromTo('.portrait-placeholder,.hero-cutout,.hero-portrait-photo',{opacity:0,y:35,scale:1.03},{opacity:1,y:0,scale:1,duration:1.4,delay:0.3,ease:'power3.out'});
   gsap.fromTo('.hero-rule',{scaleX:0,transformOrigin:'left center'},{scaleX:1,duration:1.1,delay:1.2,ease:'power2.inOut'});
   gsap.fromTo('.hero-meta',{opacity:0,y:28},{opacity:1,y:0,duration:0.9,delay:1.4});
   gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(el=>{gsap.fromTo(el,{opacity:0,y:36},{opacity:1,y:0,duration:0.95,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 93%',once:true}})});
  });return ()=>{context.revert();ScrollTrigger.refresh()};
 },[data.projects.length,data.gallery.length,data.stories?.length,data.testimonials.length]);
 const enabled=(id:string)=>data.settings.sections[id]!==false;
 const builtins:Record<string,ReactNode>={about:<About/>,showreel:<Showreel/>,projects:<Work/>,videos:<Videos/>,gallery:<PhotoGallery/>,credits:<Credits/>,training:<TrainingSection/>,shootings:<ShootingsSection/>,beyond:<Beyond/>,stories:<EditorialStories/>,testimonials:<Testimonials/>,professional:<ProfessionalProfiles/>,contact:<Contact/>};
 const available=[...defaultSectionOrder,...data.customSections.filter(v=>v.status==='published').map(v=>'custom:'+v.id)];
 const allKeys=completeSectionOrder(data.settings.sectionOrder,available);
 return <main><Hero/>{allKeys.filter((k,i)=>allKeys.indexOf(k)===i).map(k=>{
 const content=k.startsWith('custom:')?data.customSections.find(v=>v.id===k.slice(7)):null;
 if(k.startsWith('custom:'))return content&&enabled(k)?<CustomSection key={k} item={content}/>:null;
 return enabled(k)&&builtins[k]?<div className="cms-section-host" key={k}>{builtins[k]}</div>:null;
 })}</main>
}
