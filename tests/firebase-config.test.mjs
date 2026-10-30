import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,base),'utf8');
const template=Object.fromEntries(read('.env.example').split(/\r?\n/)
 .filter(line=>line&&!line.startsWith('#')&&line.includes('='))
 .map(line=>line.split(/=(.*)/s).slice(0,2)));
test('Firebase client template documents all required configuration keys, without committing live credentials',()=>{
 for(const key of ['VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_APP_ID','VITE_FIREBASE_MEASUREMENT_ID','VITE_FIREBASE_APPCHECK_SITE_KEY','VITE_FORMSPREE_FORM_ID']){
  assert.ok(Object.hasOwn(template,key),key);
  assert.equal(template[key],'',`Expected empty template value: ${key}`);
 }
 assert.equal(read('.firebaserc.example').includes('REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID'),true);
 const firebase=read('src/lib/firebase.ts');
 for(const key of ['VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_MEASUREMENT_ID'])assert.ok(firebase.includes(key),key);
});
test('Analytics script loads only after opt-in and lets visitors decline',()=>{
 const consent=read('src/lib/analytics-consent.ts');const banner=read('src/components/AnalyticsConsent.tsx');
 assert.match(consent,/if\(choice==='rejected'\)/);
 assert.match(consent,/if\(!app\|\|!import\.meta\.env\.VITE_FIREBASE_MEASUREMENT_ID\)return/);
 assert.match(consent,/if\(!\(await sdk\.isSupported\(\)\)\|\|requestedChoice!=='accepted'\)return/);
 assert.match(consent,/import\('firebase\/analytics'\)/);
 assert.match(banner,/saveAnalyticsChoice\(next\)/);
 assert.match(banner,/select\('rejected'\)/);
 assert.match(banner,/select\('accepted'\)/);
 assert.match(read('src/pages/Legal.tsx'),/Google Analytics est facultatif/);
});
test('App Check Enterprise and local-only debug switch are present',()=>{
 const firebase=read('src/lib/firebase.ts');
 assert.ok(Object.hasOwn(template,'VITE_FIREBASE_APPCHECK_SITE_KEY'));
 assert.match(firebase,/ReCaptchaEnterpriseProvider/);
 assert.match(firebase,/isTokenAutoRefreshEnabled: true/);
 assert.match(firebase,/import\.meta\.env\.DEV && import\.meta\.env\.VITE_FIREBASE_APPCHECK_DEBUG === 'true'/);
 assert.match(firebase,/FIREBASE_APPCHECK_DEBUG_TOKEN: true/);
 assert.equal(template.VITE_FIREBASE_APPCHECK_DEBUG,'false');
});
test('Contact form uses opt-in public Formspree form identifier',()=>{
 const contact=read('src/components/Contact.tsx');
 assert.ok(Object.hasOwn(template,'VITE_FORMSPREE_FORM_ID'));
 assert.match(contact,/fetch\(`https:\/\/formspree\.io\/f\/\$\{formId\}`/);
 assert.match(contact,/headers:\{Accept:'application\/json'\}/);
 assert.match(contact,/if\(!response\.ok\)/);
 assert.match(contact,/setResult\('success'\);form\.reset\(\)/);
});
