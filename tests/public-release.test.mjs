import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(readFileSync(path.join(root,'src/content/initial-data.json'),'utf8'));
test('public sample removes personal media, CV and live contact integration',()=>{
  assert.equal(existsSync(path.join(root,'public/media')),false);
  assert.equal(existsSync(path.join(root,'public/docs')),false);
  assert.equal(data.settings.cvUrl,'');
  assert.equal(data.settings.formspreeFormId,'');
  assert.deepEqual(data.testimonials,[]);
  assert.deepEqual(data.socialLinks,[]);
  assert.equal(data.profile.heroImage,'');
});
test('demo credits are marked and no production photo galleries are shipped',()=>{
  assert.ok(data.projects.every(p=>/demo|example|fictif|fictitious/i.test(JSON.stringify(p))));
  assert.deepEqual(data.gallery,[]);
});
test('public Gitignore excludes private configuration and supplied media',()=>{
  const ignore=readFileSync(path.join(root,'.gitignore'),'utf8');
  assert.match(ignore,/\.env/);
  assert.match(ignore,/public\/media\//);
  assert.match(ignore,/public\/docs\//);
});
