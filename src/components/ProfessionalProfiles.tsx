import {MediaLink} from '../lib/media';
import {ArrowDownToLine, ArrowUpRight} from 'lucide-react';
import {usePortfolio} from '../lib/usePortfolio';
import {safeUrl} from '../lib/content';


export default function ProfessionalProfiles(){
 const {data,lang,words}=usePortfolio();
 const fr=lang==='fr';
 const links=data.socialLinks.filter(link=>safeUrl(link.url));
 return <section className="professional-section section-shell" id="professional" aria-label={fr?'Profils professionnels et CV':'Professional profiles and acting CV'}>
  <div className="professional-layout">
   <div className="professional-intro">
    <span className="eyebrow">{words.professionalLabel}</span>
    <h2>{words.professionalHeading}</h2>
    <p>{words.professionalIntro}</p>
    {data.settings.cvUrl&&<MediaLink className="professional-cv-link" src={data.settings.cvUrl} >
      <span>{words.professionalDownload}</span><ArrowDownToLine size={21}/>
    </MediaLink>}
   </div>
   <div className="professional-links">
    <span className="eyebrow">{words.professionalLinksLabel}</span>
    {links.length?links.map((link,i)=><a className="professional-link" href={safeUrl(link.url)} key={link.id} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} — ${fr?'ouvrir le profil dans un nouvel onglet':'open profile in new tab'}`}>
      <span className="professional-link-index">{String(i+1).padStart(2,'0')}</span><span>{link.label}</span><ArrowUpRight size={20} aria-hidden="true"/>
    </a>):<p className="professional-empty">{fr?'Les liens professionnels seront publiés après vérification.':'Professional links will appear after verification.'}</p>}
   </div>
  </div>
 </section>;
}
