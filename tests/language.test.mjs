import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveLanguage} from '../src/lib/detectLanguage.mjs';

test('English is the first-visit language, regardless of device language',()=>{
 assert.equal(resolveLanguage(null),'en');
 assert.equal(resolveLanguage(undefined),'en');
 assert.equal(resolveLanguage('es'),'en');
 assert.equal(resolveLanguage('pt-BR'),'en');
});
test('Previously selected manual FR/EN language stays in effect',()=>{
 assert.equal(resolveLanguage('fr'),'fr');
 assert.equal(resolveLanguage('en'),'en');
});
test('The site no longer reads browser language, keeps user choice and updates document lang',()=>{
 const context=readFileSync(new URL('../src/lib/usePortfolio.tsx',import.meta.url),'utf8');
 const header=readFileSync(new URL('../src/components/Chrome.tsx',import.meta.url),'utf8');
 const admin=readFileSync(new URL('../src/pages/Admin.tsx',import.meta.url),'utf8');
 assert.match(context,/return resolveLanguage\(saved\)/);
 assert.doesNotMatch(context,/navigator\.languages|navigator\.language/);
 assert.match(context,/localStorage\.setItem\(LANGUAGE_KEY,v\)/);
 assert.match(context,/document\.documentElement\.lang=lang/);
 assert.match(header,/setLang\('en'\)/);
 assert.match(header,/setLang\('fr'\)/);
 assert.match(admin,/defaultLanguage:'en'/);
 assert.doesNotMatch(admin,/Langue de repli \(si aucune langue FR\/EN détectée\)/);
});
