import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {onAuthStateChanged,signInWithEmailAndPassword,sendPasswordResetEmail,sendEmailVerification,signOut,type User} from 'firebase/auth';
import {collection,deleteDoc,doc,onSnapshot,setDoc,serverTimestamp,writeBatch} from 'firebase/firestore';
import {ArrowLeft,ArrowUp,ArrowDown,ArrowUpRight,Download,ImagePlus,LogOut,Plus,Save,Trash2,Upload,X,Clapperboard,Camera,GraduationCap,Video,Images,UserRound,LayoutGrid,Star} from 'lucide-react';
import {auth,db,configured} from '../lib/firebase';
import {seed,safeYoutubeId} from '../lib/content';
import {cloudinaryReady,uploadCloudImage,uploadCloudPdf,lookupCloudPdf,removeCloudImage,MAX_CLOUD_PDF_BYTES} from '../lib/cloudinary';
import {MEDIA_FILE_LIMIT,MEDIA_PREFIX,MediaImage,isMediaReference,prepareUpload,invalidateMedia} from '../lib/media';
import {r2Ready,uploadR2,lookupR2Pdf,lookupR2Asset,removeR2,MAX_R2_BYTES} from '../lib/r2';
import {labels} from '../lib/translations';
import {defaultSectionOrder,completeSectionOrder} from '../lib/sectionOrder';
import type {ActorProfile,CollectionName,PublishStatus,SiteSettings,Project,GalleryPhoto,EditorialStory,PortfolioVideo,Testimonial,SocialLink,CustomSection,Experience,Training,MediaIndex,Localized} from '../types/models';
const collectionNames=['projects','experiences','shootings','gallery','stories','videos','testimonials','socialLinks','customSections','training'] as const;
type AdminSection='dashboard'|'media'|'cv'|'texts'|'layout'|CollectionName|'actorProfile'|'siteSettings';
type RecordData=Project|Experience|Training|GalleryPhoto|EditorialStory|PortfolioVideo|Testimonial|SocialLink|CustomSection;
const sections:{id:AdminSection;title:string}[]=[{id:'dashboard',title:'Accueil'},{id:'actorProfile',title:'Profil / Accueil'},{id:'texts',title:'Tous les textes'},{id:'layout',title:'Pages et ordre'},{id:'projects',title:'Projets'},{id:'experiences',title:'Expériences & rôles'},{id:'shootings',title:'Shootings / Séances photo'},{id:'training',title:'Training / Formations'},{id:'gallery',title:'Galerie'},{id:'stories',title:'Parcours et articles'},{id:'videos',title:'Vidéos YouTube'},{id:'socialLinks',title:'Réseaux / profils'},{id:'testimonials',title:'Témoignages'},{id:'customSections',title:'Sections libres'},{id:'media',title:'Mes photos'},{id:'cv',title:'Mon CV'},{id:'siteSettings',title:'Réglages et légal'}];
// Navigation grouped by task rather than by technical collection.
const adminGroups:{label:string;ids:AdminSection[]}[]=[
 {label:'Essentiel',ids:['dashboard','projects','experiences','shootings','training','videos','gallery']},
 {label:'Présentation',ids:['actorProfile','stories','testimonials','socialLinks','media','cv']},
 {label:'Personnalisation',ids:['layout','texts','customSections']},
 {label:'Options avancées',ids:['siteSettings']}
];
const friendlyNames:Partial<Record<AdminSection,string>>={dashboard:'Accueil',projects:'Mes projets',experiences:'Mes expériences & rôles',shootings:'Mes shootings',training:'Mes formations',videos:'Mes vidéos',gallery:'Galerie photo',actorProfile:'Ma présentation',stories:'Parcours et articles',testimonials:'Avis et témoignages',socialLinks:'Mes réseaux sociaux',media:'Mes photos',cv:'Mon CV',layout:'Organiser les pages',texts:'Textes du site',customSections:'Autres sections',siteSettings:'Réglages avancés'};
const addNames:Partial<Record<CollectionName,string>>={projects:'un projet',experiences:'une expérience',shootings:'un shooting',training:'une formation',videos:'une vidéo',gallery:'une photo',stories:'un article',testimonials:'un témoignage',socialLinks:'un réseau social',customSections:'une section'};
const helpBySection:Partial<Record<CollectionName,string>>={projects:'Ajoute un film ou une pièce, puis choisis la photo de couverture et les images du projet.',experiences:'Présente tes rôles, avec ou sans fiche projet associée.',shootings:'Crée une séance photo et choisis les images à montrer.',training:'Présente tes formations et tes rencontres professionnelles.',videos:'Colle un lien YouTube : le site affichera automatiquement le lecteur.',gallery:'Organise les portraits et photographies du portfolio.',socialLinks:'Ajoute les liens de tes profils professionnels.',testimonials:'Ajoute les témoignages que tu es autorisé à publier.'};
const friendlyFieldNames:Record<string,string>={slug:'Adresse de la page',category:'Type de projet',kind:'Rubrique',projectId:'Projet lié',videoId:'Vidéo YouTube',externalUrl:'Lien externe',creator:'Auteur ou réalisateur',posterUrl:'Couverture de la vidéo',year:'Année'};
const typeLabels:Record<string,string>={film:'Film',theatre:'Théâtre',television:'Télévision',commercial:'Publicité',campaign:'Campagne',documentary:'Documentaire',training:'Formation',other:'Autre',journey:'Parcours',creative:'Création',personal:'Personnel',portrait:'Portrait',landscape:'Paysage',draft:'Brouillon (invisible)',published:'Publié (visible par tous)',hidden:'Masqué (invisible)'};
const technicalFieldKeys=new Set(['slug','projectId','externalUrl','videoId','link','posterUrl']);
const cleanSlug=(input:string)=>input.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
const defaults:Record<CollectionName,Record<string,unknown>>={
 projects:{slug:'',title:{en:'',fr:''},description:{en:'',fr:''},role:{en:'',fr:''},category:'film',image:'',gallery:[],year:'',creator:''},
 shootings:{title:{en:'',fr:''},description:{en:'',fr:''},year:'',photographer:'',image:'',gallery:[],externalUrl:''},
 training:{title:{en:'',fr:''},period:{en:'',fr:''},description:{en:'',fr:''},qualification:{en:'',fr:''},image:'',images:[],externalUrl:''},
 experiences:{title:{en:'',fr:''},role:{en:'',fr:''},description:{en:'',fr:''},image:'',gallery:[],category:'film',year:'',company:'',projectId:'',externalUrl:''},
 gallery:{url:'',alt:{en:'',fr:''},category:'portrait',aspect:'portrait'},
 stories:{kind:'creative',title:{en:'',fr:''},eyebrow:{en:'',fr:''},description:{en:'',fr:''},images:[]},
 videos:{youtubeId:'',title:{en:'',fr:''},description:{en:'',fr:''},featured:false,posterUrl:''},
 testimonials:{author:'',context:{en:'',fr:''},quote:{en:'',fr:''},photo:''},
 socialLinks:{label:'',url:''},
 customSections:{title:{en:'',fr:''},eyebrow:{en:'',fr:''},body:{en:'',fr:''},image:'',link:'',linkLabel:{en:'',fr:''}}
};
type FieldSpec={key:string;label:string;localized?:boolean;large?:boolean;options?:string[];media?:boolean;multiple?:boolean;projectPicker?:boolean};
const fields:Record<CollectionName,FieldSpec[]>={
 projects:[{key:'slug',label:'Adresse URL du projet (ex. mon-film)'},{key:'title',label:'Titre',localized:true},{key:'description',label:'Description',localized:true,large:true},{key:'role',label:'Rôle',localized:true},{key:'category',label:'Catégorie',options:['theatre','film','television','commercial','campaign','documentary','other']},{key:'image',label:'Photo principale',media:true},{key:'gallery',label:'Photos du projet (ordre)',media:true,multiple:true},{key:'year',label:'Année vérifiée'},{key:'creator',label:'Auteur / réalisateur vérifié'},{key:'videoId',label:'Vidéo YouTube associée'},{key:'externalUrl',label:'Lien officiel'}],
 shootings:[{key:'title',label:'Nom du shooting',localized:true},{key:'description',label:'Description',localized:true,large:true},{key:'year',label:'Année'},{key:'photographer',label:'Photographe / crédit'},{key:'externalUrl',label:'Lien officiel'}],
 training:[{key:'title',label:'Formation',localized:true},{key:'period',label:'Période',localized:true},{key:'description',label:'Description',localized:true,large:true},{key:'qualification',label:'Diplôme / certificat (facultatif)',localized:true},{key:'externalUrl',label:'Lien de référence (facultatif)'}],
 experiences:[{key:'title',label:'Nom de l’expérience / production',localized:true},{key:'role',label:'Rôle interprété',localized:true},{key:'description',label:'Description de l’expérience',localized:true,large:true},{key:'category',label:'Domaine',options:['film','theatre','television','commercial','campaign','documentary','training','other']},{key:'year',label:'Année'},{key:'company',label:'Production / compagnie / réalisateur (facultatif)'},{key:'projectId',label:'Fiche projet associée (facultatif)',projectPicker:true},{key:'externalUrl',label:'Lien externe HTTPS (facultatif)'}],
 stories:[{key:'title',label:'Titre',localized:true},{key:'eyebrow',label:'Sous-titre',localized:true},{key:'description',label:'Description',localized:true,large:true},{key:'kind',label:'Rubrique',options:['journey','creative','personal']},{key:'images',label:'Photos de la rubrique',media:true,multiple:true}],
 gallery:[{key:'url',label:'Photo',media:true},{key:'alt',label:'Description de la photo',localized:true},{key:'category',label:'Catégorie'},{key:'aspect',label:'Orientation',options:['portrait','landscape']},{key:'projectId',label:'Identifiant du projet associé (facultatif)'}],
 videos:[{key:'youtubeId',label:'Lien ou ID YouTube'},{key:'title',label:'Titre',localized:true},{key:'description',label:'Description',localized:true,large:true},{key:'posterUrl',label:'Image de couverture (facultatif)',media:true},{key:'projectId',label:'Projet associé (facultatif)'}],
 testimonials:[{key:'author',label:'Auteur confirmé'},{key:'context',label:'Contexte',localized:true},{key:'quote',label:'Citation autorisée',localized:true,large:true},{key:'photo',label:'Portrait de l’auteur (optionnel, avec son accord)',media:true}],
 socialLinks:[{key:'label',label:'Nom de la plateforme'},{key:'url',label:'Lien HTTPS du profil'}],
 customSections:[{key:'title',label:'Titre de section',localized:true},{key:'eyebrow',label:'Petit titre',localized:true},{key:'body',label:'Texte (paragraphes)',localized:true,large:true},{key:'image',label:'Photographie',media:true},{key:'linkLabel',label:'Texte du lien',localized:true},{key:'link',label:'Lien HTTPS (facultatif)'}]
};
const defaultOrder=[...defaultSectionOrder];
const defaultLabels:Record<string,string>={shootings:'Shootings / Photos',about:'À propos',showreel:'Showreel / Bande démo',projects:'Projets',videos:'Vidéos',training:'Training / Formations',gallery:'Galerie',credits:'Filmographie',beyond:'Au-delà du jeu',stories:'Parcours',testimonials:'Témoignages',professional:'Profils & CV',contact:'Contact'};
const validId=/^[a-z0-9][a-z0-9_-]{1,70}$/;
const plainUrl=(value:string)=>{if(!value)return true;if(isMediaReference(value))return /^asset:[a-z0-9_-]{4,100}$/i.test(value);try{const u=new URL(value,window.location.origin);return u.protocol==='https:'||(value.startsWith('/')&&u.origin===window.location.origin)}catch{return false}};
function Input({label,value,onChange,large=false,options,type='text'}:{label:string;value:string;onChange:(v:string)=>void;large?:boolean;options?:string[];type?:string}){return <label className="admin-field">{label}{options?<select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option value={o} key={o}>{typeLabels[o]||o}</option>)}</select>:large?<textarea rows={5} value={value} onChange={e=>onChange(e.target.value)}/>:<input type={type} value={value} onChange={e=>onChange(e.target.value)}/>}</label>}
function ErrorMessage({message}:{message:string}){return message?<p role="alert" className="admin-error">{message}</p>:null}
// Firestore writes can remain pending indefinitely when the browser cannot reach the server.
// This warning is informational: the SDK may still send a queued write later.
function SaveWaitNotice({busy}:{busy:boolean}){
 const [slow,setSlow]=useState(false);
 useEffect(()=>{
  if(!busy){setSlow(false);return}
  const timer=window.setTimeout(()=>setSlow(true),12000);
  return ()=>window.clearTimeout(timer);
 },[busy]);
 return slow?<p role="status" className="admin-error">La sauvegarde prend plus de temps que prévu. Vérifie ta connexion et attends avant de réessayer : la modification pourrait encore être enregistrée.</p>:null;
}
function explainFirestoreError(err:unknown):string{
 const code=typeof err==='object'&&err!==null&&'code' in err?String(err.code):'';
 if(code==='permission-denied')return 'Impossible d’enregistrer pour le moment : ton compte n’a pas l’autorisation nécessaire. Demande au gestionnaire du site de vérifier les accès.';
 if(code==='unauthenticated')return 'Ta session a expiré. Déconnecte-toi puis reconnecte-toi.';
 if(code==='resource-exhausted')return 'Le fichier est trop volumineux ou la limite du service est atteinte. Essaie une image plus légère.';
 return err instanceof Error?err.message:String(err);
}
function assetSource(asset:MediaIndex){return (asset.provider==='cloudinary'||asset.provider==='r2')&&asset.url?asset.url:MEDIA_PREFIX+asset.id}
function ImagePreview({value}:{value:string}){return value?<div className="cms-photo-preview"><MediaImage src={value} alt="Aperçu" loading="lazy"/></div>:null}
function MediaField({label,value,onChange,assets,multiple=false,mediaKind='image'}:{label:string;value:string|string[];onChange:(v:string|string[])=>void;assets:MediaIndex[];multiple?:boolean;mediaKind?:'image'|'pdf'}){
 const [chooser,setChooser]=useState(false);
 const current=multiple?Array.isArray(value)?value:[]:String(value||'');
 const pick=(ref:string)=>{if(multiple)onChange([...(current as string[]),ref]);else{onChange(ref);setChooser(false)}};
 return <div className="admin-media-field"><div className="admin-media-label">{label}</div>
 {multiple?<div className="cms-selected-images">{(current as string[]).map((url,i)=><div key={`${url}-${i}`} className="cms-selected-image"><ImagePreview value={url}/><div><button type="button" disabled={i===0} onClick={()=>{const copy=[...(current as string[])];[copy[i-1],copy[i]]=[copy[i],copy[i-1]];onChange(copy)}}><ArrowUp size={15}/></button><button type="button" disabled={i===(current as string[]).length-1} onClick={()=>{const copy=[...(current as string[])];[copy[i+1],copy[i]]=[copy[i],copy[i+1]];onChange(copy)}}><ArrowDown size={15}/></button><button type="button" aria-label="Retirer" onClick={()=>onChange((current as string[]).filter((_,j)=>j!==i))}><X size={15}/></button></div></div>)}</div>:mediaKind==='pdf'?<p>Fichier sélectionné ✓ <span className="admin-hint">Tu peux le remplacer en choisissant un autre PDF.</span></p>:<ImagePreview value={current as string}/>}
 <div className="admin-actions"><button type="button" onClick={()=>setChooser(!chooser)}><ImagePlus size={15}/> {multiple?'Ajouter une photo':mediaKind==='pdf'?'Choisir un PDF':'Choisir une photo'}</button>{!multiple&&Boolean(current)&&<button type="button" onClick={()=>onChange('')}>Retirer</button>}</div>
 <details className="admin-advanced"><summary>{mediaKind==='pdf'?'Utiliser un lien de PDF (facultatif)':'Utiliser un lien d’image existant (facultatif)'}</summary><Input label={multiple?'Liens des photos (un par ligne)':'Lien de la photo ou du fichier'} large={multiple} value={multiple?(current as string[]).join('\n'):current as string} onChange={v=>onChange(multiple?v.split('\n').map(s=>s.trim()).filter(Boolean):v)}/></details>
 {chooser&&<div className="cms-media-chooser"><p>{mediaKind==='pdf'?'Choisis un CV PDF déjà importé, ou utilise le bouton « Choisir mon nouveau CV » ci-dessus.':'Choisis une photo déjà importée. Pour en ajouter une nouvelle, ouvre d’abord « Mes photos ». '}</p><div className="cms-media-tiles">{assets.filter(a=>a.kind===mediaKind).map(asset=><button type="button" key={asset.id} onClick={()=>pick(assetSource(asset))}>{asset.kind==='image'?<MediaImage src={assetSource(asset)} alt={asset.name} loading="lazy"/>:<span>PDF</span>}<span>{asset.name}</span></button>)}</div>{assets.length===0&&<p>Aucun fichier correspondant dans la médiathèque.</p>}</div>}
 </div>
}
/** Covers and galleries are separate from Firestore media documents: only URLs are saved to project/experience/shooting documents. */
function CoverGalleryEditor({cover,gallery,assets,onChange}:{cover:string;gallery:string[];assets:MediaIndex[];onChange:(cover:string,gallery:string[])=>void}){
 const [chooser,setChooser]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const photos=[cover,...gallery].filter(Boolean);
 const setPhotos=(all:string[])=>onChange(all[0]||'',all.slice(1));
 const add=(src:string)=>{if(!src||photos.includes(src))return;setPhotos([...photos,src])};
 const upload=async(files:FileList|null)=>{
  if(!files?.length)return;
  if(!r2Ready&&!cloudinaryReady){setError('Le stockage photo n’est pas encore activé. Tu peux sélectionner les photos existantes.');return}
  setBusy(true);setError('');const next=[...photos];
  try{for(const [i,f] of Array.from(files).entries()){
   setMessage(`Import ${i+1}/${files.length} : ${f.name}`);
   const uploaded=r2Ready?await uploadR2(f,fraction=>setMessage(`Photo ${i+1}/${files.length} : ${Math.round(fraction*100)} %`)):await uploadCloudImage(f);if(!next.includes(uploaded.url))next.push(uploaded.url);
   setPhotos([...next]);
  }setMessage(`${files.length} image(s) transférée(s). Clique sur « Enregistrer » pour publier la fiche.`)}
  catch(e){setError(e instanceof Error?e.message:String(e));setPhotos([...next])}
  finally{setBusy(false)}
 };
 return <div className="cms-cover-gallery"><h4>1. Choisir les photos</h4><p className="admin-info">La première image sera la grande photo de présentation. Les autres apparaîtront dans la galerie. Tu peux changer la couverture, déplacer ou retirer une photo sans la supprimer de la médiathèque.</p>
 <div className="cms-selected-images">{photos.map((src,i)=><div className={`cms-selected-image ${i===0?'is-cover':''}`} key={`${src}-${i}`}><ImagePreview value={src}/><strong>{i===0?'COUVERTURE':`Photo ${i+1}`}</strong><div className="admin-actions"><button type="button" aria-label="Définir comme couverture" disabled={i===0} onClick={()=>setPhotos([src,...photos.filter((_,j)=>j!==i)])}>Choisir comme couverture</button><button type="button" aria-label="Monter" disabled={i===0} onClick={()=>{const copy=[...photos];[copy[i-1],copy[i]]=[copy[i],copy[i-1]];setPhotos(copy)}}><ArrowUp size={15}/></button><button type="button" aria-label="Descendre" disabled={i===photos.length-1} onClick={()=>{const copy=[...photos];[copy[i+1],copy[i]]=[copy[i],copy[i+1]];setPhotos(copy)}}><ArrowDown size={15}/></button><button type="button" aria-label="Retirer" onClick={()=>setPhotos(photos.filter((_,j)=>j!==i))}><X size={15}/></button></div></div>)}</div>
 <div className="admin-actions"><button type="button" onClick={()=>setChooser(v=>!v)}><ImagePlus size={16}/> Ajouter depuis la médiathèque</button><label className={`cms-direct-import ${!(r2Ready||cloudinaryReady)?'is-unavailable':''}`}><Upload size={16}/>{busy?'Import en cours…':'Importer des photos de mon appareil'}<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy||!(r2Ready||cloudinaryReady)} onChange={e=>{void upload(e.target.files);e.target.value=''}}/></label></div>
 {chooser&&<div className="cms-media-chooser"><div className="cms-media-tiles">{assets.filter(a=>a.kind==='image').map(a=><button type="button" key={a.id} onClick={()=>add(assetSource(a))}><MediaImage src={assetSource(a)} alt={a.name}/><span>{a.name}</span></button>)}</div>{assets.length===0&&<p>Aucune image en médiathèque.</p>}</div>}
 <details className="admin-advanced"><summary>J’ai déjà un lien vers une photo</summary><label className="admin-field">Adresse de l’image<input type="url" placeholder="https://..." onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const v=e.currentTarget.value.trim();if(plainUrl(v)&&v){add(v);e.currentTarget.value=''}else setError('Adresse d’image invalide.')}}}/><small>Colle le lien puis appuie sur Entrée.</small></label></details>
 {message&&<p role="status">{message}</p>}<ErrorMessage message={error}/>{!(r2Ready||cloudinaryReady)&&<p className="admin-info">L’import de grandes photos sera disponible dès que le stockage photo sera activé. Tu peux déjà sélectionner les photos existantes.</p>}
 </div>;
}
function ContentEditor({section,item,assets,projects,onDone,onCancel,onDirtyChange}:{section:CollectionName;item:RecordData;assets:MediaIndex[];projects:Project[];onDone:()=>void;onCancel:()=>void;onDirtyChange:(dirty:boolean)=>void}){
 const [form,setForm]=useState<Record<string,unknown>>(structuredClone(item) as unknown as Record<string,unknown>);
 const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const originalId=item.id;
 const dirty=JSON.stringify(form)!==JSON.stringify(item);
 useEffect(()=>{onDirtyChange(dirty)},[dirty,onDirtyChange]);
 useEffect(()=>{if(!dirty)return;const block=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',block);return ()=>window.removeEventListener('beforeunload',block)},[dirty]);
 const coverEnabled=['projects','experiences','shootings','training'].includes(section);
 const imagesForGallery=section==='training'?(Array.isArray(form.images)?form.images as string[]:[]):(Array.isArray(form.gallery)?form.gallery as string[]:[]);
 const coverValue=String(form.image|| (section==='training'?imagesForGallery[0]||'':''));
 const additional=section==='training'&&!form.image?imagesForGallery.slice(1):imagesForGallery;
 const galleryChange=(cover:string,gallery:string[])=>setForm(v=>({...v,image:cover,[section==='training'?'images':'gallery']:gallery}));
 const update=(key:string,value:unknown,lang?:'fr'|'en')=>setForm(v=>{
  const next={...v,[key]:lang?{...(v[key] as Localized||{en:'',fr:''}),[lang]:value}:value};
  if(section==='projects'&&key==='title'&&lang==='en'&&item.id.startsWith('new-')&&(!v.slug||v.slug===cleanSlug(String((v.title as Localized)?.en||''))))next.slug=cleanSlug(String(value));
  return next;
 });
 const cancel=()=>{if(dirty&&!window.confirm('Quitter sans enregistrer tes changements ?'))return;onCancel()};
 const coreFields=fields[section].filter(f=>!technicalFieldKeys.has(f.key)&&(!coverEnabled||!['image','gallery','images'].includes(f.key)));
 const advancedFields=fields[section].filter(f=>technicalFieldKeys.has(f.key));
 const showField=(f:FieldSpec,lang?:'en'|'fr')=>f.projectPicker?<label className="admin-field" key={f.key}>{f.label}<select value={String(form[f.key]??'')} onChange={e=>update(f.key,e.target.value)}><option value="">Aucun — expérience indépendante</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title.fr||p.title.en}</option>)}</select></label>:f.localized?<Input key={`${f.key}-${lang}`} label={`${f.label} ${lang==='en'?'(anglais)':'(français)'}`} value={String((form[f.key] as Localized)?.[lang||'en']??'')} large={f.large} onChange={v=>update(f.key,v,lang)}/>:f.media?<MediaField key={f.key} label={f.label} value={f.multiple?(form[f.key] as string[]||[]):String(form[f.key]||'')} multiple={f.multiple} assets={assets} onChange={v=>update(f.key,v)}/>:<Input key={f.key} label={friendlyFieldNames[f.key]||f.label} value={String(form[f.key]??'')} options={f.options} large={f.large} onChange={v=>update(f.key,v)}/>;

 const save=async(e:FormEvent)=>{e.preventDefault();if(!db)return;setBusy(true);setError('');try{
  if(!validId.test(String(form.id)))throw new Error('Identifiant : au moins 2 lettres/chiffres minuscules.');
  if(!originalId.startsWith('new-')&&String(form.id)!==originalId)throw new Error('Pour modifier l’identifiant d’un élément publié, crée un nouvel élément puis supprime l’ancien.');
  if(section==='projects'&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(form.slug)))throw new Error('Adresse projet : mots minuscules séparés par des tirets.');
  if(form.status==='published'&&['projects','experiences','shootings','training','videos','customSections'].includes(section)&&!(form.title as Localized)?.en?.trim())throw new Error('Titre anglais requis pour publier.');
  if(section==='videos'){const id=safeYoutubeId(String(form.youtubeId));if(!id)throw new Error('Lien YouTube invalide.');form.youtubeId=id}
  if(section==='testimonials'&&form.status==='published'&&(!(form.quote as Localized)?.en?.trim()||!form.author))throw new Error('Auteur et citation obligatoires.');
  for(const field of fields[section].filter(f=>f.media||f.key==='url'||f.key==='externalUrl'||f.key==='link')){
   const val=form[field.key];const arr=Array.isArray(val)?val:[val];if(arr.some(v=>v&&!plainUrl(String(v))))throw new Error(`URL invalide dans ${field.label}.`);
  }
  if(coverEnabled&&[String(form.image||''),...(Array.isArray(form[section==='training'?'images':'gallery'])?form[section==='training'?'images':'gallery'] as string[]:[])].some(v=>v&&!plainUrl(v)))throw new Error('URL image invalide.');
  form.order=Number(form.order);if(!Number.isFinite(form.order))throw new Error('Ordre numérique requis.');
  const {id: _id, ...fieldsForWrite}=form;
  const payload={...fieldsForWrite,updatedAt:serverTimestamp()};
  await setDoc(doc(db,section,String(form.id)),payload);onDone();
 }catch(e){setError(explainFirestoreError(e))}finally{setBusy(false)}};
 return <form className="admin-editor admin-easy-editor" onSubmit={save}>
  <div className="admin-editor-heading"><div><p className="admin-step">ÉDITEUR SIMPLE</p><h3>{item.id.startsWith('new-')?`Créer ${addNames[section]||'un élément'}`:`Modifier ${friendlyNames[section]||'cette fiche'}`}</h3><p>Renseigne les informations, ajoute tes photos, puis clique sur Enregistrer.</p></div><button type="button" className="admin-close" aria-label="Fermer sans enregistrer" onClick={cancel}><X size={19}/></button></div>
  <div className="admin-edit-group"><h4>1. Informations principales</h4>
  {coreFields.map(f=>f.localized?showField(f,'en'):showField(f))}
  </div>
  {coverEnabled&&<div className="admin-edit-group"><CoverGalleryEditor cover={coverValue} gallery={additional} assets={assets} onChange={galleryChange}/></div>}
  {section==='videos'&&<label className="admin-check"><input type="checkbox" checked={Boolean(form.featured)} onChange={e=>update('featured',e.target.checked)}/> Cette vidéo est ma bande démo (Showreel)</label>}
  <details className="admin-advanced"><summary>Traduction française (facultatif)</summary><p className="admin-hint">Le site s’affiche d’abord en anglais. Tu peux ajouter le français quand tu le souhaites.</p>{fields[section].filter(f=>f.localized).map(f=>showField(f,'fr'))}</details>
  <div className="admin-edit-group"><h4>2. Publication</h4><label className="admin-field">Qui peut voir cette fiche ?<select value={String(form.status||'draft')} onChange={e=>update('status',e.target.value)}>{['draft','published','hidden'].map(v=><option value={v} key={v}>{typeLabels[v]}</option>)}</select><small>Choisis « Publié » pour l’afficher sur le site. « Brouillon » permet de préparer la fiche sans la montrer.</small></label></div>
  <details className="admin-advanced"><summary>Options avancées (rarement nécessaires)</summary><p className="admin-hint">Laisse ces champs tels quels si tu n’en as pas besoin.</p><Input label="Identifiant interne — ne pas modifier" value={String(form.id??'')} onChange={v=>update('id',v)}/>{advancedFields.map(f=>f.localized?showField(f,'en'):showField(f))}<Input label="Ordre d’affichage (nombre)" value={String(form.order??0)} onChange={s=>update('order',Number(s))}/></details>
  <ErrorMessage message={error}/><SaveWaitNotice busy={busy}/>
  <div className="admin-save-bar"><p>Les modifications sont visibles sur le site uniquement après enregistrement.</p><div className="admin-actions"><button className="admin-primary" type="submit" disabled={busy}><Save size={17}/>{busy?'Enregistrement…':form.status==='published'?'Enregistrer et publier':'Enregistrer la fiche'}</button><button type="button" onClick={cancel}>Annuler</button></div></div>
 </form>;
}

function CollectionAdmin({section,items,assets,projects,onDirtyChange}:{section:CollectionName;items:RecordData[];assets:MediaIndex[];projects:Project[];onDirtyChange:(dirty:boolean)=>void}){
 const [editing,setEditing]=useState<RecordData|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [dirty,setDirty]=useState(false);
 const create=()=>{if(dirty&&!window.confirm('Quitter sans enregistrer la fiche en cours ?'))return;setDirty(false);onDirtyChange(false);setEditing({id:`new-${crypto.randomUUID().slice(0,12)}`,status:'draft' as PublishStatus,order:items.length+1,...structuredClone(defaults[section])} as unknown as RecordData);};
 const remove=async(item:RecordData)=>{const title=String((item as Project).title?.en||(item as SocialLink).label||(item as Testimonial).author||item.id);if(!db||!window.confirm(`Supprimer définitivement « ${title} » ? Cette action ne peut pas être annulée.`))return;try{await deleteDoc(doc(db,section,item.id))}catch(e){setError(String(e))}};
 const move=async(item:RecordData,direction:number)=>{const firestore=db;if(!firestore)return;setBusy(true);setError('');try{const sorted=[...items].sort((a,b)=>a.order-b.order);const index=sorted.findIndex(x=>x.id===item.id);const other=sorted[index+direction];if(!other)return;[sorted[index],sorted[index+direction]]=[sorted[index+direction],sorted[index]];const batch=writeBatch(firestore);sorted.forEach((row,i)=>batch.update(doc(firestore,section,row.id),{order:i+1}));await batch.commit()}catch(e){setError(String(e))}finally{setBusy(false)}};
 return <div className="admin-panel"><div className="admin-title-row"><div><p className="admin-step">MON PORTFOLIO</p><h2>{friendlyNames[section]||sections.find(s=>s.id===section)?.title}</h2></div><button className="admin-primary" type="button" onClick={create}><Plus size={18}/> Ajouter {addNames[section]||"un élément"}</button></div>
 <p className="admin-intro">{helpBySection[section]||"Retrouve tes contenus ici : tu peux en créer, les modifier ou les masquer."} N’oublie pas d’enregistrer après chaque modification.</p>
 {editing&&<ContentEditor key={`${section}-${editing.id}`} section={section} item={editing} assets={assets} projects={projects} onDirtyChange={v=>{setDirty(v);onDirtyChange(v)}} onDone={()=>{setDirty(false);onDirtyChange(false);setEditing(null)}} onCancel={()=>{setDirty(false);onDirtyChange(false);setEditing(null)}}/>}
 <ErrorMessage message={error}/>{!items.length&&!editing&&<div className="admin-empty"><ImagePlus size={25}/><strong>Aucune fiche pour le moment</strong><p>Commence en appuyant sur « Ajouter » ci-dessus.</p></div>}<div className="cms-items">{items.map((item,i)=>{const name=(item as Project).title||(item as GalleryPhoto).alt||(item as Testimonial).quote;const thumbnail=String((item as Project).image||(item as GalleryPhoto).url||(item as PortfolioVideo).posterUrl||'');return <div className="cms-item" key={item.id}><div className="admin-item-summary">{thumbnail&&<div className="admin-item-thumb"><MediaImage src={thumbnail} alt="" loading="lazy"/></div>}<div><strong>{typeof name==='object'?name.en:(item as Testimonial).author||(item as SocialLink).label||item.id}</strong><small className={`admin-status admin-status-${item.status}`}>{item.status==='published'?'● En ligne':item.status==='draft'?'○ Brouillon':'◌ Masqué'}</small></div></div><div className="admin-actions"><button disabled={busy||i===0} aria-label="Monter" onClick={()=>void move(item,-1)}><ArrowUp size={16}/></button><button disabled={busy||i===items.length-1} aria-label="Descendre" onClick={()=>void move(item,1)}><ArrowDown size={16}/></button><button type="button" onClick={()=>{if(dirty&&!window.confirm('Quitter sans enregistrer la fiche en cours ?'))return;setDirty(false);onDirtyChange(false);setEditing(item);window.scrollTo({top:0,behavior:'smooth'})}}>Modifier</button><button type="button" className="admin-delete" aria-label={`Supprimer ${item.id}`} onClick={()=>void remove(item)}><Trash2 size={16}/></button></div></div>})}</div>
 </div>
}
function ExperiencesAdmin({items,projects,assets,initialized,onImported,onDirtyChange}:{items:Experience[];projects:Project[];assets:MediaIndex[];initialized:boolean;onImported:()=>void;onDirtyChange:(dirty:boolean)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const importExisting=async()=>{
  const firestore=db;
  if(!firestore||busy||initialized)return;
  if(!window.confirm('Importer les expériences et rôles actuellement affichés ? Cette étape les rend indépendants des fiches projets et conserve les textes déjà présents.'))return;
  setBusy(true);setError('');
  try{
   if(items.length)throw new Error('Des expériences existent déjà dans Firestore : import annulé pour éviter un écrasement.');
   if(!projects.length)throw new Error('Aucun projet chargé. Attends la synchronisation Firestore et réessaie.');
   const batch=writeBatch(firestore);
   projects.forEach((p,i)=>batch.set(doc(firestore,'experiences',p.id),{status:p.status,order:i+1,title:p.title,role:p.role,category:p.category,year:p.year||'',company:p.creator||'',projectId:p.id,externalUrl:'',updatedAt:serverTimestamp()}));
   batch.set(doc(firestore,'siteSettings','main'),{experiencesInitialized:true,updatedAt:serverTimestamp()},{merge:true});
   await batch.commit();onImported();
  }catch(e){setError(explainFirestoreError(e))}finally{setBusy(false)}
 };
 if(!initialized)return <div className="admin-panel"><h2>Expériences & rôles</h2><p className="admin-info">Pour conserver les {projects.length} lignes actuelles, importe-les une seule fois. Tu pourras ensuite ajouter librement des expériences, modifier chaque rôle, masquer et supprimer des lignes sans modifier les projets.</p><button type="button" className="admin-primary" disabled={busy||!projects.length} onClick={()=>void importExisting()}><Upload size={17}/>{busy?'Import en cours…':'Activer et importer les expériences actuelles'}</button><SaveWaitNotice busy={busy}/><ErrorMessage message={error}/><div className="cms-items">{projects.map(p=><div className="cms-item" key={p.id}><div><strong>{p.title.fr||p.title.en}</strong><small>{p.role.fr||p.role.en} · {p.year||'—'}</small></div></div>)}</div></div>;
 return <CollectionAdmin section="experiences" items={items} assets={assets} projects={projects} onDirtyChange={onDirtyChange}/>;
}
function ProfileEditor({profile,assets}:{profile:ActorProfile;assets:MediaIndex[]}){
 const [form,setForm]=useState<ActorProfile>(profile),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>setForm(profile),[profile]);
 const locKeys=['location','role','shortBio','biography','longBio','languages','skills'] as const;const readable:{[key:string]:string}={location:'Ville / région',role:'Métier',shortBio:'Présentation courte',biography:'Biographie',longBio:'Biographie complète',languages:'Langues parlées',skills:'Compétences'};
 const edit=(key:typeof locKeys[number],lang:'en'|'fr',value:string)=>setForm(v=>({...v,[key]:{...v[key],[lang]:value}}));
 const save=async(e:FormEvent)=>{e.preventDefault();if(!db)return;setSaved(false);setError('');try{await setDoc(doc(db,'actorProfile','main'),{...form,id:'main',updatedAt:serverTimestamp()});setSaved(true)}catch(e){setError(String(e))}};
 return <form onSubmit={save} className="admin-panel admin-settings"><h2>Ma présentation</h2><p className="admin-intro">Change ton nom affiché, ta biographie et les portraits qui apparaissent sur le site.</p><Input label="Nom affiché partout" value={form.name} onChange={v=>setForm(o=>({...o,name:v}))}/>
 {locKeys.map(key=><Input key={key} label={`${readable[key]} — anglais`} value={form[key]?.en||''} large={['shortBio','biography','longBio','skills'].includes(key)} onChange={v=>edit(key,'en',v)}/>)}<details className="admin-advanced"><summary>Traductions françaises (facultatif)</summary>{locKeys.map(key=><Input key={key} label={`${readable[key]} — français`} value={form[key]?.fr||''} large={['shortBio','biography','longBio','skills'].includes(key)} onChange={v=>edit(key,'fr',v)}/>)}</details>
 {(['heroImage','heroCutout','aboutImage'] as const).map(key=><MediaField key={key} label={key==='heroImage'?'Grande photo de la page d’accueil':key==='heroCutout'?'Portrait détouré (optionnel)':'Photo de la page À propos'} value={form[key]||''} assets={assets} onChange={v=>setForm(o=>({...o,[key]:v as string}))}/>)}
 <Input label="E-mail professionnel" value={form.contactEmail||''} onChange={v=>setForm(o=>({...o,contactEmail:v}))}/>
 <ErrorMessage message={error}/>{saved&&<p role="status">Modifications enregistrées.</p>}<button className="admin-primary" type="submit"><Save size={17}/> Enregistrer le profil</button></form>
}
function TextsEditor({settings}:{settings:SiteSettings}){
 const [values,setValues]=useState<Record<string,Localized>>(settings.copy||{}),[search,setSearch]=useState(''),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>setValues(settings.copy||{}),[settings.copy]);
 const keys=Object.keys(labels.en).filter(k=>k.toLowerCase().includes(search.toLowerCase())||labels.en[k as keyof typeof labels.en].toLowerCase().includes(search.toLowerCase()));
 const save=async()=>{if(!db)return;setSaved(false);setError('');try{await setDoc(doc(db,'siteSettings','main'),{...seed.settings,...settings,copy:values,updatedAt:serverTimestamp()},{merge:true});setSaved(true)}catch(e){setError(String(e))}};
 return <div className="admin-panel"><h2>Textes du site</h2><p className="admin-info">Modifie les titres, menus, appels à l’action, libellés et messages, en français et anglais. Les champs laissés vides utilisent le texte d'origine. Les contenus des projets et les biographies se modifient dans leurs rubriques.</p>
 <Input label="Rechercher un texte / une section" value={search} onChange={setSearch}/>
 <div className="cms-text-list">{keys.map(key=><div className="cms-text-row" key={key}><h3>{String(labels.en[key as keyof typeof labels.en]).slice(0,80)}</h3><div className="admin-dual">{(['en','fr'] as const).map(lang=><Input key={lang} label={`${lang.toUpperCase()} · Texte actuel : ${labels[lang][key as keyof typeof labels.en].slice(0,52)}`} value={values[key]?.[lang]||''} large={String(labels.en[key as keyof typeof labels.en]).length>100} onChange={v=>setValues(o=>({...o,[key]:{en:o[key]?.en||'',fr:o[key]?.fr||'',[lang]:v}}))}/>)}</div></div>)}</div>
 <ErrorMessage message={error}/>{saved&&<p role="status">Textes enregistrés.</p>}<button type="button" className="admin-primary" onClick={()=>void save()}><Save size={17}/> Enregistrer tous les textes</button></div>
}
function LayoutEditor({settings,custom}:{settings:SiteSettings;custom:CustomSection[]}){
 const all=[...defaultOrder,...custom.map(x=>'custom:'+x.id)];
 const [order,setOrder]=useState<string[]>(settings.sectionOrder||defaultOrder),[enabled,setEnabled]=useState(settings.sections||{}),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{setOrder(settings.sectionOrder||defaultOrder);setEnabled(settings.sections||{})},[settings]);
 const effective=completeSectionOrder(order,all);
 const move=(key:string,amount:number)=>{const copy=[...effective];const i=copy.indexOf(key),j=i+amount;if(j<0||j>=copy.length)return;[copy[i],copy[j]]=[copy[j],copy[i]];setOrder(copy)};
 const save=async()=>{if(!db)return;setError('');setSaved(false);try{await setDoc(doc(db,'siteSettings','main'),{...seed.settings,...settings,sectionOrder:effective,sections:enabled,updatedAt:serverTimestamp()},{merge:true});setSaved(true)}catch(e){setError(String(e))}};
 return <div className="admin-panel"><h2>Organiser mes pages</h2><p className="admin-info">Utilise les flèches pour changer l’ordre. Décoche une rubrique pour la masquer, puis enregistre.</p>
 <div className="cms-items">{effective.map((key,i)=><div className="cms-item" key={key}><label className="admin-check"><input type="checkbox" checked={enabled[key]!==false} onChange={e=>setEnabled(v=>({...v,[key]:e.target.checked}))}/><strong>{key.startsWith('custom:')?(custom.find(x=>x.id===key.slice(7))?.title.en||key):defaultLabels[key]||key}</strong></label><div className="admin-actions"><button aria-label="Monter" disabled={i===0} onClick={()=>move(key,-1)}><ArrowUp size={16}/></button><button aria-label="Descendre" disabled={i===effective.length-1} onClick={()=>move(key,1)}><ArrowDown size={16}/></button></div></div>)}</div>
 <ErrorMessage message={error}/>{saved&&<p role="status">Mise en page enregistrée.</p>}<button className="admin-primary" onClick={()=>void save()}><Save size={17}/> Enregistrer l’ordre et la visibilité</button></div>
}
function CvEditor({settings,assets,referenced,onDirtyChange}:{settings:SiteSettings;assets:MediaIndex[];referenced:Set<string>;onDirtyChange:(dirty:boolean)=>void}){
 const [cvUrl,setCvUrl]=useState(settings.cvUrl||'');
 const [error,setError]=useState(''),[cvMessage,setCvMessage]=useState(''),[cvUploading,setCvUploading]=useState(false);
 const [recoverId,setRecoverId]=useState(''),[recovering,setRecovering]=useState(false),[saving,setSaving]=useState(false);
 useEffect(()=>setCvUrl(settings.cvUrl||''),[settings.cvUrl]);
 const chooseCv=(value:string)=>{setCvUrl(value);setCvMessage('');onDirtyChange(true)};
 const publishCv=async()=>{
  if(!db||saving)return;
  if(!cvUrl.trim()||!plainUrl(cvUrl)){setError('Indique un lien HTTPS valide ou choisis un PDF déjà importé.');return}
  setSaving(true);setError('');setCvMessage('');
  try{await setDoc(doc(db,'siteSettings','main'),{cvUrl,updatedAt:serverTimestamp()},{merge:true});onDirtyChange(false);setCvMessage('CV enregistré ! Vérifie le téléchargement sur le site public.')}
  catch(e){setError(explainFirestoreError(e))}finally{setSaving(false)}
 };
 const replaceCv=async(file:File|undefined)=>{
  if(!file||!db||cvUploading)return;
  setCvUploading(true);setCvMessage('');setError('');
  try{
   const uploaded=r2Ready?await uploadR2(file,fraction=>setCvMessage(`Envoi du CV : ${Math.round(fraction*100)} %`)):await uploadCloudPdf(file);
   // Update only the CV field; never overwrite settings edited elsewhere.
   await setDoc(doc(db,'siteSettings','main'),{cvUrl:uploaded.url,updatedAt:serverTimestamp()},{merge:true});
   setCvUrl(uploaded.url);onDirtyChange(false);
   setCvMessage('Nouveau CV publié ! Ouvre le lien ci-dessous pour vérifier qu’il se lit correctement.');
  }catch(e){setError(explainFirestoreError(e))}finally{setCvUploading(false)}
 };
 // Recover a previously uploaded PDF without sending the binary to Cloudinary again.
 const recoverCv=async()=>{
  if(!db||recovering)return;
  setRecovering(true);setCvMessage('');setError('');
  try{
   const isR2=/^moussa_toure\/portfolio\/[a-f0-9]{32}\.pdf$/.test(recoverId.trim());
   const asset=isR2?await lookupR2Pdf(recoverId):await lookupCloudPdf(recoverId);
   const indexId='key' in asset?'r2-recovery-'+asset.key.split('/').pop()?.split('.')[0]:'cloud-recovery-'+asset.publicId.split('/').pop();
   const batch=writeBatch(db);
   batch.set(doc(db,'mediaIndex',indexId),{id:indexId,name:'CV Moussa Toure.pdf',mime:'application/pdf',bytes:asset.bytes,kind:'pdf',provider:isR2?'r2':'cloudinary',...('key' in asset?{r2Key:asset.key}:{cloudinaryPublicId:asset.publicId}),url:asset.url,width:'width' in asset?asset.width:0,height:'height' in asset?asset.height:0,status:'published',createdAt:serverTimestamp()});
   batch.update(doc(db,'siteSettings','main'),{cvUrl:asset.url,updatedAt:serverTimestamp()});
   await batch.commit();
   setCvUrl(asset.url);onDirtyChange(false);
   setCvMessage('CV récupéré et publié ! Vérifie son lien ci-dessous.');setRecoverId('');
  }catch(e){setError(explainFirestoreError(e))}finally{setRecovering(false)}
 };
 const removePdf=async(asset:MediaIndex)=>{
  if(!db)return;
  if(referenced.has(MEDIA_PREFIX+asset.id)||(asset.url&&referenced.has(asset.url))){setError('Ce CV est utilisé sur le site. Publie d’abord un autre CV avant de le supprimer.');return}
  if(!window.confirm(`Supprimer définitivement « ${asset.name} » ?`))return;
  setError('');
  try{
   if(asset.provider==='r2'){if(!asset.r2Key)throw new Error('Identifiant R2 manquant.');await removeR2(asset.r2Key)}
   if(asset.provider==='cloudinary'){
    if(!asset.cloudinaryPublicId)throw new Error('Identifiant Cloudinary manquant.');
    await removeCloudImage(asset.cloudinaryPublicId);
   }
   const batch=writeBatch(db);batch.delete(doc(db,'mediaIndex',asset.id));
   if(!asset.provider)batch.delete(doc(db,'mediaAssets',asset.id));
   await batch.commit();invalidateMedia(asset.id);
  }catch(e){setError(explainFirestoreError(e))}
 };
 const pdfs=assets.filter(a=>a.kind==='pdf');
 return <div className="admin-panel admin-settings"><h2>Mon CV</h2><p className="admin-info">Remplace ton CV ici, sans aller dans les réglages avancés. Le site utilisera le nouveau document dès que son enregistrement sera terminé.</p>
 <h3>Changer mon CV</h3>
 {(r2Ready||cloudinaryReady)?<label className="cms-upload"><Upload size={22}/><strong>{cvUploading?'Import du nouveau CV…':'Choisir mon nouveau CV (PDF)'}</strong><small>PDF uniquement · {r2Ready?MAX_R2_BYTES/1_000_000:MAX_CLOUD_PDF_BYTES/1_000_000} Mo maximum</small><input type="file" accept=".pdf,application/pdf" disabled={cvUploading||recovering} onChange={e=>{void replaceCv(e.target.files?.[0]);e.target.value=''}}/></label>:<p className="admin-info">L’import direct des grands PDF nécessite d’activer R2 ou Cloudinary. Utilise ci-dessous un lien HTTPS ou un PDF déjà présent.</p>}
 {cvUploading&&<p role="status">Envoi en cours, ne ferme pas cette page…</p>}
 <ErrorMessage message={error}/>{cvMessage&&<p role="status">{cvMessage}</p>}
 {(cvUrl.startsWith('https://')||cvUrl.startsWith('/'))&&<p className="admin-info"><a href={cvUrl} target="_blank" rel="noopener noreferrer">Ouvrir le CV sélectionné pour le vérifier <Download size={15}/></a></p>}
 <details className="admin-advanced"><summary>Choisir un ancien CV ou utiliser un lien</summary>
 <MediaField label="CV à télécharger (PDF)" value={cvUrl} onChange={v=>chooseCv(String(v))} assets={pdfs} mediaKind="pdf"/>
 <p className="admin-info">Pour un ancien CV, sélectionne-le puis clique sur « Enregistrer ce CV ».</p>
 <div className="cms-pdf-asset-list">{pdfs.map(a=><button key={a.id} type="button" onClick={()=>chooseCv(assetSource(a))}><Download size={15}/>{a.name}</button>)}</div>
 <button type="button" className="admin-primary" disabled={saving||cvUploading} onClick={()=>void publishCv()}><Save size={17}/>{saving?'Enregistrement…':'Enregistrer ce CV'}</button>
 </details>
 {(r2Ready||cloudinaryReady)&&<details className="admin-advanced"><summary>Récupérer un CV déjà envoyé (R2 ou Cloudinary)</summary>
 <p className="admin-info">Si un import précédent a échoué après l’envoi, indique ici l’identifiant R2 ou Cloudinary affiché dans l’erreur. Aucun nouvel envoi n’aura lieu.</p>
 <label className="admin-field">Identifiant du CV à récupérer<input type="text" autoComplete="off" placeholder="moussa_toure/portfolio/…" value={recoverId} onChange={e=>setRecoverId(e.target.value)}/></label>
 <button type="button" className="admin-primary" disabled={recovering||cvUploading||!/^moussa_toure\/portfolio\/[a-f0-9]{32}(\.pdf)?$/.test(recoverId.trim())} onClick={()=>void recoverCv()}>{recovering?'Récupération en cours…':'Récupérer et publier ce CV'}</button>
 </details>}
 {pdfs.length>0&&<details className="admin-advanced"><summary>Gérer les PDF déjà importés ({pdfs.length})</summary><div className="cms-media-grid">{pdfs.map(a=><div className="cms-media-card" key={a.id}><div className="cms-document-icon">PDF</div><strong>{a.name}</strong><small>{Math.round(a.bytes/1000)} Ko · {a.provider==='r2'?'R2':a.provider==='cloudinary'?'Cloudinary':'Firestore'}</small><button type="button" className="cms-delete" onClick={()=>void removePdf(a)}><Trash2 size={15}/> Supprimer</button></div>)}</div></details>}
 </div>;
}
function SettingsEditor({settings}:{settings:SiteSettings}){
 const [form,setForm]=useState(settings),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>setForm(settings),[settings]);
 const set=(key:string,value:unknown)=>setForm(f=>({...f,[key]:value}));
 const edit=(key:'seoDescription'|'legalPrivacy'|'legalNotice',lang:'en'|'fr',value:string)=>set(key,{...(form[key]||{en:'',fr:''}),[lang]:value});
 const save=async(e:FormEvent)=>{e.preventDefault();if(!db)return;setSaved(false);setError('');try{await setDoc(doc(db,'siteSettings','main'),{...form,defaultLanguage:'en',updatedAt:serverTimestamp()});setSaved(true)}catch(e){setError(String(e))}};
 return <form className="admin-panel admin-settings" onSubmit={save}><h2>Réglages et pages légales</h2><p className="admin-info">Le CV se modifie désormais dans « Mon CV », juste sous « Mes photos ». Cette page regroupe uniquement les réglages avancés du site.</p>
 {(['en','fr'] as const).map(lang=><Input key={lang} label={`Description SEO ${lang.toUpperCase()}`} large value={form.seoDescription?.[lang]||''} onChange={v=>edit('seoDescription',lang,v)}/>)}
 {(['legalPublisher','legalContact','legalAddress','domain'] as const).map(key=><Input key={key} label={key} value={String(form[key]||'')} onChange={v=>set(key,v)}/>)}
 <h3>Contact professionnel (Formspree)</h3>
 <Input label="ID Formspree (par ex. xwlvyjab)" value={form.formspreeFormId||''} onChange={v=>set('formspreeFormId',v.replace(/[^a-zA-Z0-9]/g,''))}/>
 <Input label="Catégories de demande — une par ligne" large value={(form.contactKinds||[]).join('\n')} onChange={v=>set('contactKinds',v.split('\n').map(t=>t.trim()).filter(Boolean))}/>
 <h3>Texte des pages légales</h3><p className="admin-info">Les champs ci-dessous remplacent les textes par défaut des pages publiques. Ne publie les mentions légales et informations RGPD qu'après vérification.</p>
 {(['legalPrivacy','legalNotice'] as const).map(key=><div key={key} className="admin-dual">{(['en','fr'] as const).map(lang=><Input key={lang} label={`${key} ${lang}`} large value={form[key]?.[lang]||''} onChange={v=>edit(key,lang,v)}/>)}</div>)}
 <ErrorMessage message={error}/>{saved&&<p role="status">Réglages enregistrés.</p>}<button className="admin-primary" type="submit"><Save size={17}/> Enregistrer les réglages</button></form>
}
function MediaLibrary({assets,referenced}:{assets:MediaIndex[];referenced:Set<string>}){
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState('');
 const [recoverKey,setRecoverKey]=useState(''),[recoverBusy,setRecoverBusy]=useState(false);
 const recoverPhoto=async()=>{if(!db||recoverBusy)return;setError('');setRecoverBusy(true);try{const result=await lookupR2Asset(recoverKey);if(result.mime==='application/pdf')throw new Error('Pour récupérer un PDF, ouvre Mon CV.');const id='r2-recovery-'+result.key.split('/').pop()?.split('.')[0];await setDoc(doc(db,'mediaIndex',id),{id,name:'Photo récupérée',mime:result.mime,bytes:result.bytes,kind:'image',provider:'r2',r2Key:result.key,url:result.url,width:0,height:0,status:'published',createdAt:serverTimestamp()});setProgress('Photo récupérée ! Elle apparaît maintenant dans Mes photos.');setRecoverKey('')}catch(e){setError(explainFirestoreError(e))}finally{setRecoverBusy(false)}};
 const upload=async(files:FileList|null)=>{if(!db||!files?.length)return;setBusy(true);setError('');try{for(const [i,file] of Array.from(files).entries()){
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw new Error('Cette rubrique accepte uniquement des photos JPG, PNG, WebP ou AVIF. Pour le CV, utilise « Mon CV ».');
  if(r2Ready){setProgress(`R2 ${i+1}/${files.length} : ${file.name}`);await uploadR2(file,fraction=>setProgress(`Photo ${i+1}/${files.length} : ${Math.round(fraction*100)} %`));continue;}
  if(cloudinaryReady){setProgress(`Cloudinary ${i+1}/${files.length}: ${file.name}`);await uploadCloudImage(file);continue;}
  setProgress(`Optimisation et import ${i+1}/${files.length} : ${file.name}`);
  const prepared=await prepareUpload(file);if(prepared.kind!=='image')throw new Error('Seules les photos sont acceptées ici.');const id=`media-${crypto.randomUUID()}`.toLowerCase(),batch=writeBatch(db);
  const metadata:MediaIndex={id,name:prepared.name,mime:prepared.mime,kind:prepared.kind,bytes:prepared.bytes,status:'published'};
  batch.set(doc(db,'mediaIndex',id),{...metadata,createdAt:serverTimestamp()});
  batch.set(doc(db,'mediaAssets',id),{mime:prepared.mime,base64:prepared.base64,bytes:prepared.bytes,status:'published'});
  await batch.commit();
 }setProgress('Import terminé ! Retourne à une fiche et choisis tes photos dans la médiathèque, puis enregistre.')}catch(e){setError(e instanceof Error?e.message:'Import impossible')}finally{setBusy(false)}};
 const remove=async(asset:MediaIndex)=>{if(!db)return;if(referenced.has(MEDIA_PREFIX+asset.id)||(asset.url&&referenced.has(asset.url))){setError('Cette ressource est utilisée dans le site : retire-la d’abord des projets, profils ou du CV.');return}
  if(!window.confirm(`Supprimer définitivement « ${asset.name} » ?`))return;
  try{if(asset.provider==='r2'){if(!asset.r2Key)throw new Error('Identifiant R2 manquant.');await removeR2(asset.r2Key)}if(asset.provider==='cloudinary'){if(!asset.cloudinaryPublicId)throw new Error('Identifiant Cloudinary manquant.');await removeCloudImage(asset.cloudinaryPublicId)}const batch=writeBatch(db);batch.delete(doc(db,'mediaIndex',asset.id));if(!asset.provider)batch.delete(doc(db,'mediaAssets',asset.id));await batch.commit();invalidateMedia(asset.id)}catch(e){setError(explainFirestoreError(e))}};
 return <div className="admin-panel"><h2>Mes photos</h2><p className="admin-info">{(r2Ready||cloudinaryReady)?'Importe tes photographies ici pour les utiliser dans tes projets, shootings et galeries. Pour changer ton CV, ouvre « Mon CV » juste en dessous dans le menu.':'Ajoute tes photographies (maximum '+Math.round(MEDIA_FILE_LIMIT/1000)+' Ko par image avant activation du stockage R2 ou Cloudinary). Pour un CV, utilise « Mon CV ». Les fichiers déjà enregistrés sont conservés.'}</p>
 <label className="cms-upload"><Upload size={25}/><strong>{busy?'Import en cours…':'Importer des photos'}</strong><small>Formats acceptés : JPG, PNG, WebP ou AVIF</small><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={e=>{void upload(e.target.files);e.target.value=''}}/></label>
 {progress&&<p role="status">{progress}</p>}<ErrorMessage message={error}/>{r2Ready&&<details className="admin-advanced"><summary>Récupérer une photo déjà envoyée sur R2</summary><p className="admin-info">Si Firestore a refusé l’enregistrement après l’envoi, colle ici l’identifiant R2 affiché dans l’erreur. Inutile de renvoyer la photo.</p><label className="admin-field">Identifiant R2<input type="text" value={recoverKey} onChange={e=>setRecoverKey(e.target.value)} placeholder="moussa_toure/portfolio/…jpg"/></label><button type="button" disabled={recoverBusy||!/^moussa_toure\/portfolio\/[a-f0-9]{32}\.(jpg|png|webp|avif)$/.test(recoverKey.trim())} onClick={()=>void recoverPhoto()}>{recoverBusy?'Récupération…':'Récupérer cette photo'}</button></details>}<div className="cms-media-grid">{assets.filter(a=>a.kind==='image').map(a=><div className="cms-media-card" key={a.id}><MediaImage src={assetSource(a)} alt={a.name} loading="lazy"/><strong>{a.name}</strong><small>{Math.round(a.bytes/1000)} Ko · {a.provider==='r2'?'R2':a.provider==='cloudinary'?'Cloudinary':'Firestore'}</small><details className="admin-advanced"><summary>Options du fichier</summary><button type="button" onClick={()=>{void navigator.clipboard?.writeText(assetSource(a))}}>Copier le lien interne</button></details><button type="button" className="cms-delete" onClick={()=>void remove(a)}><Trash2 size={15}/> Supprimer</button></div>)}</div>{!assets.some(a=>a.kind==='image')&&<p>Aucune photo importée. Les images historiques intégrées au ZIP restent disponibles via leurs chemins /media/.</p>}</div>
}
async function initializeSite(){if(!db)throw new Error('Firebase Firestore non configuré');const batch=writeBatch(db);batch.set(doc(db,'actorProfile','main'),seed.profile);batch.set(doc(db,'siteSettings','main'),seed.settings);for(const section of collectionNames){for(const item of seed[section]){const {id,...fields}=item;batch.set(doc(db,section,id),fields)}}await batch.commit()}
function Dashboard({items,profile,assets,onNavigate,canInitialize}:{items:Record<CollectionName,RecordData[]>;profile:ActorProfile;assets:MediaIndex[];onNavigate:(v:AdminSection)=>void;canInitialize:boolean}){
 const [state,setState]=useState(''),[error,setError]=useState('');const total=collectionNames.reduce((acc,k)=>acc+items[k].length,0);
 const start=async()=>{if(total>0){setError('La base contient déjà des contenus ; import initial annulé pour ne pas écraser tes modifications.');return}if(!window.confirm('Initialiser le site avec les contenus du ZIP ? À faire une seule fois lorsque Firestore est vide.'))return;setError('');try{await initializeSite();setState('Contenus initiaux transférés dans Firestore.')}catch(e){setError(String(e))}};
 return <div className="admin-panel admin-dashboard"><p className="admin-step">MON ESPACE PERSONNEL</p><h1>Bonjour, {profile.name.split(' ')[0]||'Moussa'} !</h1><p className="admin-intro">Que souhaites-tu faire aujourd’hui ? Choisis une action. Pas besoin de toucher au code.</p>
 <div className="admin-shortcut-grid">
 {([['projects','film','Ajouter ou modifier un projet','Films, pièces et autres réalisations'],['shootings','camera','Gérer mes shootings','Couvertures et albums photos'],['experiences','star','Mettre à jour mes rôles','Expériences et crédits'],['training','school','Mes formations','Écoles, stages et certifications'],['videos','play','Changer mes vidéos','Showreel et vidéos YouTube'],['media','image','Ajouter des photos','Ma médiathèque photo'],['cv','file','Changer mon CV','Importer ou remplacer mon PDF'],['actorProfile','user','Modifier ma présentation','Biographie et portraits'],['layout','layout','Organiser mon site','Afficher, masquer ou déplacer les sections']] as [AdminSection,string,string,string][]).map(([id,symbol,title,desc])=><button type="button" key={id} className="admin-shortcut" onClick={()=>onNavigate(id)}><span className="admin-shortcut-icon" aria-hidden="true">{symbol==='film'?<Clapperboard size={21}/>:symbol==='camera'?<Camera size={21}/>:symbol==='star'?<Star size={21}/>:symbol==='school'?<GraduationCap size={21}/>:symbol==='play'?<Video size={21}/>:symbol==='image'?<Images size={21}/>:symbol==='user'?<UserRound size={21}/>:symbol==='file'?<Download size={21}/>:<LayoutGrid size={21}/>}</span><span><strong>{title}</strong><small>{desc}</small></span><ArrowUpRight size={18}/></button>)}
 </div>
 <div className="admin-getting-started"><h2>Comment ça marche ?</h2><ol><li><strong>Choisis</strong> la rubrique que tu veux modifier.</li><li><strong>Ajoute ou change</strong> les textes et les photos.</li><li><strong>Enregistre</strong> pour garder ton travail, puis ouvre le site pour vérifier.</li></ol><Link to="/" target="_blank" rel="noopener noreferrer" className="admin-primary">Voir mon site <ArrowUpRight size={16}/></Link></div>
 <details className="admin-advanced admin-stats-details"><summary>Voir le nombre de mes contenus</summary><div className="stat-grid">{collectionNames.map(k=><button type="button" key={k} onClick={()=>onNavigate(k)}><span>{friendlyNames[k]||sections.find(s=>s.id===k)?.title}</span><strong>{items[k].length}</strong><small>{items[k].filter(x=>x.status==='published').length} en ligne</small></button>)}<button type="button" onClick={()=>onNavigate('media')}><span>Mes photos</span><strong>{assets.filter(a=>a.kind==='image').length}</strong></button></div></details>
 {canInitialize&&total===0&&<div className="cms-start"><h3>Première installation — gestionnaire du site</h3><p>Cette opération est réservée à la toute première installation. Ne l’utilise pas sur un site déjà configuré.</p><button className="admin-primary" onClick={()=>void start()}><Upload size={17}/> Importer les premiers contenus</button></div>}
 <ErrorMessage message={error}/>{state&&<p role="status">{state}</p>}</div>;

}
function Workspace({user}:{user:User}){
 const [section,setSection]=useState<AdminSection>('dashboard');const [unsaved,setUnsaved]=useState(false);
 const [items,setItems]=useState<Record<CollectionName,RecordData[]>>({projects:[],experiences:[],shootings:[],gallery:[],stories:[],training:[],videos:[],testimonials:[],socialLinks:[],customSections:[]});
 const [profile,setProfile]=useState<ActorProfile>(seed.profile),[settings,setSettings]=useState<SiteSettings>({...seed.settings,experiencesInitialized:false}),[assets,setAssets]=useState<MediaIndex[]>([]),[error,setError]=useState('');
 const [connection,setConnection]=useState<'waiting'|'connected'|'slow'|'error'>('waiting');const [loadedSections,setLoadedSections]=useState<Set<CollectionName>>(new Set());
 useEffect(()=>{
  if(!db)return;
  const timeout=window.setTimeout(()=>setConnection(c=>c==='waiting'?'slow':c),12000);
  const stops=collectionNames.map(name=>onSnapshot(collection(db!,name),snap=>{
    setItems(prev=>({...prev,[name]:snap.docs.map(d=>({...d.data(),id:d.id} as RecordData)).sort((a,b)=>a.order-b.order)}));
    setLoadedSections(previous=>new Set(previous).add(name));
  },err=>setError(explainFirestoreError(err))));
 stops.push(onSnapshot(collection(db,'mediaIndex'),snap=>setAssets(snap.docs.map(d=>({...d.data(),id:d.id} as MediaIndex))),err=>setError(err.message)));
 stops.push(onSnapshot(doc(db,'actorProfile','main'),snap=>{if(snap.exists())setProfile({id:'main',...snap.data()} as ActorProfile)},err=>setError(err.message)));
 stops.push(onSnapshot(doc(db,'siteSettings','main'),{includeMetadataChanges:true},snap=>{
  if(snap.exists())setSettings({id:'main',...snap.data()} as SiteSettings);
  if(!snap.metadata.fromCache){setConnection('connected');window.clearTimeout(timeout)}
 },err=>{setError(explainFirestoreError(err));setConnection('error');window.clearTimeout(timeout)}));
 return ()=>{window.clearTimeout(timeout);stops.forEach(stop=>stop())}},[]);
 const referenced=useMemo(()=>{const set=new Set<string>();const scan=(v:unknown)=>{if(typeof v==='string'&&(isMediaReference(v)||v.startsWith('https://res.cloudinary.com/')||v.includes('/r2/media/moussa_toure/portfolio/')))set.add(v);else if(Array.isArray(v))v.forEach(scan);else if(v&&typeof v==='object')Object.values(v).forEach(scan)};scan(profile);scan(settings);Object.values(items).forEach(scan);return set},[profile,settings,items]);
 const navigate=(id:AdminSection)=>{if(id===section)return;if(unsaved&&!window.confirm('Tu n’as pas enregistré tes changements. Veux-tu vraiment changer de rubrique ?'))return;setUnsaved(false);setSection(id);window.scrollTo({top:0,behavior:'smooth'})};
 return <div className="admin-shell"><aside className="admin-sidebar"><Link to="/" className="admin-brand">M<span>—</span>T.</Link><div className="admin-subtitle">MON ESPACE / ADMINISTRATION</div><nav aria-label="Navigation de l’administration">{adminGroups.map(group=><div className="admin-nav-group" key={group.label}><p>{group.label}</p>{group.ids.map(id=><button type="button" key={id} className={section===id?'selected':''} aria-current={section===id?'page':undefined} onClick={()=>navigate(id)}>{friendlyNames[id]||sections.find(s=>s.id===id)?.title}</button>)}</div>)}</nav><div className="admin-account"><small>{user.email}</small><button type="button" onClick={()=>auth&&signOut(auth)}><LogOut size={17}/> Déconnexion</button><Link to="/"><ArrowLeft size={16}/> Voir le site</Link></div></aside>
 <main className="admin-main"><div className="admin-mobile-toolbar"><label htmlFor="admin-mobile-section">Que veux-tu modifier ?</label><select id="admin-mobile-section" value={section} onChange={e=>navigate(e.target.value as AdminSection)}>{adminGroups.map(g=><optgroup label={g.label} key={g.label}>{g.ids.map(id=><option value={id} key={id}>{friendlyNames[id]||id}</option>)}</optgroup>)}</select><div className="admin-mobile-links"><Link to="/" target="_blank" rel="noopener noreferrer">Voir mon site <ArrowUpRight size={14}/></Link><button type="button" onClick={()=>auth&&signOut(auth)}>Déconnexion</button></div></div>{section!=='dashboard'&&<button type="button" className="admin-back" onClick={()=>navigate('dashboard')}><ArrowLeft size={16}/> Accueil de mon espace</button>}{connection==='connected'?<p role="status" className="admin-info">● Site connecté — tes modifications peuvent être enregistrées.</p>:connection==='slow'?<p role="status" className="admin-error">Connexion lente avec le site. Attends quelques instants avant d’enregistrer et vérifie ta connexion Internet.</p>:null}<ErrorMessage message={error}/>{section==='dashboard'?<Dashboard items={items} profile={profile} assets={assets} onNavigate={navigate} canInitialize={connection==='connected'&&loadedSections.size===collectionNames.length}/>:section==='actorProfile'?<ProfileEditor profile={profile} assets={assets}/>:section==='texts'?<TextsEditor settings={settings}/>:section==='layout'?<LayoutEditor settings={settings} custom={items.customSections as CustomSection[]}/>:section==='siteSettings'?<SettingsEditor settings={settings}/>:section==='cv'?<CvEditor settings={settings} assets={assets} referenced={referenced} onDirtyChange={setUnsaved}/>:section==='media'?<MediaLibrary assets={assets} referenced={referenced}/>:section==='experiences'?<ExperiencesAdmin items={items.experiences as Experience[]} projects={items.projects as Project[]} assets={assets} initialized={settings.experiencesInitialized===true} onImported={()=>setSettings(s=>({...s,experiencesInitialized:true}))} onDirtyChange={setUnsaved}/>:<CollectionAdmin section={section} items={items[section]} assets={assets} projects={items.projects as Project[]} onDirtyChange={setUnsaved}/>}</main></div>
}
export default function Admin(){const [user,setUser]=useState<User|null>(null),[isAdmin,setIsAdmin]=useState<boolean|null>(null),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[sent,setSent]=useState(false),[verificationSent,setVerificationSent]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!auth){setIsAdmin(false);return}return onAuthStateChanged(auth,async current=>{setUser(current);if(!current){setIsAdmin(false);return}try{const token=await current.getIdTokenResult(true);setIsAdmin(token.claims.admin===true&&current.emailVerified)}catch(e){setError(String(e));setIsAdmin(false)}})},[]);
 const login=async(e:FormEvent)=>{e.preventDefault();if(!auth)return;setBusy(true);setError('');try{await signInWithEmailAndPassword(auth,email,password)}catch(e){setError(e instanceof Error?e.message:'Connexion refusée')}finally{setBusy(false)}};
 const reset=async()=>{if(!auth||!email){setError('Indique ton adresse e-mail.');return}setError('');try{await sendPasswordResetEmail(auth,email);setSent(true)}catch{setError('Impossible de demander la réinitialisation.')}};
 const verification=async()=>{if(!user)return;try{await sendEmailVerification(user);setVerificationSent(true)}catch{setError('Impossible d’envoyer le message de vérification.')}};
 const refresh=async()=>{if(!user)return;setError('');try{await user.reload();const token=await user.getIdTokenResult(true);setIsAdmin(token.claims.admin===true&&Boolean(auth?.currentUser?.emailVerified));setUser(auth?.currentUser??null)}catch{setError('Impossible de vérifier les autorisations.')}};
 if(!configured)return <main className="admin-auth"><h1>Configuration Firebase requise</h1><p>La configuration de l’administration est incomplète. Contacte la personne qui gère le site.</p><Link to="/">Retour au site</Link></main>;
 if(isAdmin===null)return <main className="admin-loading">Vérification de l’accès administrateur…</main>;
 if(user&&!isAdmin)return <main className="admin-auth"><h1>Accès réservé.</h1><p>{!user.emailVerified?'Vérifie ton adresse e-mail pour continuer.':'Ton compte ne dispose pas encore des autorisations nécessaires. Contacte la personne qui gère le site.'}</p>{!user.emailVerified&&<button className="admin-primary" onClick={()=>void verification()}>Envoyer un e-mail de vérification</button>}{verificationSent&&<p role="status">E-mail demandé ; regarde aussi dans les courriers indésirables.</p>}<button onClick={()=>void refresh()}>Actualiser mon accès</button><ErrorMessage message={error}/><button onClick={()=>auth&&signOut(auth)}>Déconnexion</button></main>;
 if(user&&isAdmin)return <Workspace user={user}/>;
 return <main className="admin-auth"><span className="eyebrow">STUDIO PRIVÉ / MOUSSA TOURE</span><h1>Administration.</h1><form onSubmit={login}><label>Adresse e-mail<input type="email" value={email} autoComplete="username" onChange={e=>setEmail(e.target.value)} required/></label><label>Mot de passe<input type="password" value={password} autoComplete="current-password" onChange={e=>setPassword(e.target.value)} required/></label><button className="admin-primary" disabled={busy}>{busy?'Connexion…':'Se connecter'}</button></form><button onClick={()=>void reset()} className="admin-forgot">Mot de passe oublié ?</button>{sent&&<p role="status">Si le compte existe, un e-mail de réinitialisation a été demandé.</p>}<ErrorMessage message={error}/><p>Aucune inscription publique. Seuls les comptes autorisés disposent de cet accès.</p><Link to="/">Retour au portfolio</Link></main>
}
