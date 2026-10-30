import {useEffect,useState} from 'react';
import {usePortfolio} from '../lib/usePortfolio';
import {applyAnalyticsChoice,saveAnalyticsChoice,storedAnalyticsChoice} from '../lib/analytics-consent';

/** Lightweight opt-in manager. No Analytics SDK or Google Analytics request before acceptance. */
export default function AnalyticsConsent(){
 const {lang}=usePortfolio();
 const [choice,setChoice]=useState<'accepted'|'rejected'|null>(storedAnalyticsChoice);
 const [visible,setVisible]=useState(()=>storedAnalyticsChoice()===null);
 const enabled=Boolean(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID);
 useEffect(()=>{
  if(!enabled)return;
  if(choice)void applyAnalyticsChoice(choice);
 },[]); // Restore the user's prior choice once on mount.
 useEffect(()=>{
  const show=()=>setVisible(true);
  window.addEventListener('moussa:analytics-preferences',show);
  return ()=>window.removeEventListener('moussa:analytics-preferences',show);
 },[]);
 if(!enabled||!visible)return null;
 const fr=lang==='fr';
 function select(next:'accepted'|'rejected'){
  saveAnalyticsChoice(next);
  setChoice(next);
  setVisible(false);
 }
 return <section role="region" aria-label={fr?'Préférences de mesure d’audience':'Analytics preferences'} className="analytics-consent">
  <div className="analytics-consent-copy">
   <strong>{fr?'Votre confidentialité':'Your privacy'}</strong>
   <p>{fr?'Nous utilisons Google Analytics uniquement avec votre accord pour comprendre la fréquentation du portfolio. Vous pouvez modifier votre choix à tout moment depuis le pied de page.':'We use Google Analytics only with your permission to understand portfolio traffic. You can change your choice any time from the footer.'}</p>
  </div>
  <div className="analytics-consent-actions">
   <button type="button" onClick={()=>select('rejected')}>{fr?'Refuser':'Reject'}</button>
   <button type="button" className="analytics-accept" onClick={()=>select('accepted')}>{fr?'Accepter':'Accept'}</button>
  </div>
 </section>;
}
