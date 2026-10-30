import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const admin=read('src/pages/Admin.tsx'),css=read('src/styles/main.css');
test('Dashboard offers simple tasks instead of overwhelming statistics',()=>{
  assert.match(admin,/Que souhaites-tu faire aujourd’hui/);
  assert.match(admin,/Modifier ma présentation/);
  assert.match(admin,/Ajouter des photos/);
  assert.match(admin,/admin-shortcut-grid/);
  assert.match(admin,/admin-stats-details/);
});
test('Mobile navigation groups every editor section without hidden features',()=>{
  for(const section of ['dashboard','projects','experiences','shootings','training','videos','gallery','actorProfile','stories','testimonials','socialLinks','media','cv','layout','texts','customSections','siteSettings']) assert.match(admin,new RegExp("'"+section+"'"));
  assert.match(admin,/admin-mobile-section/);
  assert.match(admin,/optgroup label=\{g.label\}/);
  assert.match(css,/\.admin-mobile-toolbar\{display:flex/);
});
test('Simple editor keeps French, references and advanced fields optional',()=>{
  assert.match(admin,/Traduction française \(facultatif\)/);
  assert.match(admin,/Options avancées \(rarement nécessaires\)/);
  assert.match(admin,/Identifiant interne — ne pas modifier/);
  assert.match(admin,/cleanSlug/);
  assert.match(admin,/Enregistrer et publier/);
  assert.match(admin,/Brouillon \(invisible\)/);
});
test('Unsaved changes are guarded on closing, navigation and browser reload',()=>{
 assert.match(admin,/Quitter sans enregistrer tes changements/);
 assert.match(admin,/Tu n’as pas enregistré tes changements/);
 assert.match(admin,/beforeunload/);
});
test('Original security and content model remain intact',()=>{
 assert.match(admin,/token.claims.admin===true&&current.emailVerified/);
 assert.match(admin,/await setDoc\(doc\(db,section,String\(form.id\)\),payload\)/);
 assert.match(admin,/uploadCloudImage\(f\)/);
 assert.match(admin,/MEDIA_PREFIX/);
});
