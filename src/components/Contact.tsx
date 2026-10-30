import {useState,type FormEvent} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {usePortfolio} from '../lib/usePortfolio';

const defaultKinds=['Casting','Film / television','Theatre','Commercial','Photography','Collaboration','Other'];
export default function Contact(){
 const {words,lang,data}=usePortfolio();
 const formId=(data.settings.formspreeFormId||import.meta.env.VITE_FORMSPREE_FORM_ID||'').trim();
 const formReady=/^[a-zA-Z0-9]{6,32}$/.test(formId);
 const kinds=(data.settings.contactKinds?.length?data.settings.contactKinds:defaultKinds).filter(Boolean);
 const [pending,setPending]=useState(false);
 const [result,setResult]=useState<'success'|'error'|null>(null);
 const [errorText,setErrorText]=useState('');
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(pending||!formReady)return;
  const form=e.currentTarget;const data=new FormData(form);
  // Honeypot: silently ignore spam without claiming a successful delivery.
  if(String(data.get('website')||'').trim()){setResult('error');setErrorText('Invalid submission.');return}
  setPending(true);setResult(null);setErrorText('');
  try{
   const response=await fetch(`https://formspree.io/f/${formId}`,{
    method:'POST',body:data,headers:{Accept:'application/json'}
   });
   if(!response.ok){
    const json=await response.json().catch(()=>null) as {errors?:{message?:string}[]}|null;
    throw new Error(json?.errors?.map(err=>err.message).filter(Boolean).join('; ')||`Form service error (${response.status}).`);
   }
   // Accepted by the service, NOT proof that the destination read the message.
   setResult('success');form.reset();
  }catch(err){setResult('error');setErrorText(err instanceof Error?err.message:words.failed)}finally{setPending(false)}
 };
 return <section id="contact" className="contact-section section-shell"><div className="contact-heading"><span className="eyebrow">08 / CONTACT</span><h2>{words.together}</h2><p>{words.connect}</p></div>
 {!formReady?<p className="admin-info" role="status">{lang==='fr'?'Le formulaire de contact professionnel sera bientôt disponible.':'The professional enquiry form is being prepared.'}</p>:
 <form className="contact-form" onSubmit={submit}>
  <div className="form-row"><label>{words.contactName}<input name="name" autoComplete="name" required minLength={2} maxLength={120}/></label><label>{words.contactEmail}<input type="email" name="email" autoComplete="email" required maxLength={254}/></label></div>
  <div className="form-row"><label>{words.company}<input name="company" autoComplete="organization" maxLength={150}/></label><label>{words.type}<select name="kind" defaultValue="" required><option value="" disabled>{words.chooseType}</option>{kinds.map(v=><option key={v} value={v}>{v}</option>)}</select></label></div>
  <label>{words.message}<textarea name="message" rows={4} required minLength={15} maxLength={5000}/></label>
  <label className="consent-check"><input name="consent" value="yes" type="checkbox" required/><span>{words.consent} <a href="/privacy">{words.privacy}</a>.</span></label>
  <input type="hidden" name="_subject" value={`New enquiry — ${data.profile.name} portfolio`}/>
  <div className="honey" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
  <div className="form-submit"><button type="submit" disabled={pending} className="submit-button">{pending?words.sending:words.submit}<ArrowUpRight size={20}/></button>
   <div aria-live="polite" role="status" className={`submit-status ${result||''}`}>{result==='success'?words.success:result==='error'?`${words.failed} ${errorText}`:''}</div></div>
 </form>}
 </section>
}
