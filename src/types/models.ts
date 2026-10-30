export type Language='en'|'fr';
export type Localized={en:string;fr:string};
export type PublishStatus='published'|'draft'|'hidden';
export interface EntityBase {id:string; status:PublishStatus; order:number}
export interface Project extends EntityBase {slug:string;title:Localized;category:'theatre'|'film'|'television'|'commercial'|'campaign'|'documentary'|'other';role:Localized;year?:string;creator?:string;description:Localized;image?:string;gallery?:string[];videoId?:string;externalUrl?:string}
export interface Experience extends EntityBase {title:Localized;role:Localized;category:string;year?:string;company?:string;projectId?:string;externalUrl?:string;image?:string;gallery?:string[];description?:Localized}
export interface Shooting extends EntityBase {title:Localized;description:Localized;year?:string;photographer?:string;image?:string;gallery?:string[];externalUrl?:string}
export interface Training extends EntityBase {title:Localized;period:Localized;description:Localized;qualification:Localized;image?:string;images:string[];externalUrl?:string}
export interface EditorialStory extends EntityBase {kind:'journey'|'creative'|'personal';title:Localized;eyebrow:Localized;description:Localized;images:string[]}
export interface GalleryPhoto extends EntityBase {url:string;thumbUrl?:string;alt:Localized;category:string;aspect?:'portrait'|'landscape';projectId?:string}
export interface PortfolioVideo extends EntityBase {youtubeId:string;title:Localized;description:Localized;featured:boolean;projectId?:string;posterUrl?:string}
export interface Testimonial extends EntityBase {author:string;context?:Localized;quote:Localized;photo?:string}
export interface SocialLink extends EntityBase {label:string;url:string}
export interface CustomSection extends EntityBase {title:Localized;eyebrow:Localized;body:Localized;image?:string;link?:string;linkLabel?:Localized}
export interface MediaIndex {id:string;name:string;mime:string;kind:'image'|'pdf';bytes:number;status:'published';createdAt?:unknown;provider?:'cloudinary'|'r2';cloudinaryPublicId?:string;r2Key?:string;url?:string;width?:number;height?:number}
export interface ActorProfile {id:'main';name:string;location:Localized;role:Localized;shortBio:Localized;biography:Localized;longBio:Localized;languages:Localized;heroImage?:string;heroCutout?:string;aboutImage?:string;contactEmail?:string;skills:Localized;updatedAt?:unknown}
export interface SiteSettings {copy?:Record<string,Localized>; sectionOrder?:string[]; cvUrl?:string; formspreeFormId?:string; contactKinds?:string[]; legalPrivacy?:Localized; legalNotice?:Localized; id:'main'; defaultLanguage:Language;sections:Record<string,boolean>; legalPublisher?:string; legalContact?:string; legalAddress?:string; experiencesInitialized?:boolean; retentionDays?:number; seoDescription:Localized; domain?:string; updatedAt?:unknown}
export interface PortfolioData {profile:ActorProfile;settings:SiteSettings;projects:Project[];experiences:Experience[];shootings:Shooting[];training:Training[];gallery:GalleryPhoto[];stories:EditorialStory[];videos:PortfolioVideo[];testimonials:Testimonial[];socialLinks:SocialLink[];customSections:CustomSection[]}
export type CollectionName='projects'|'experiences'|'shootings'|'gallery'|'stories'|'videos'|'testimonials'|'socialLinks'|'customSections'|'training';
export function localized(t:Localized|undefined,lang:Language){return t?.[lang]?.trim()||t?.en||t?.fr||''}
