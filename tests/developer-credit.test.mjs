import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const chrome=readFileSync(new URL('../src/components/Chrome.tsx',import.meta.url),'utf8');
const translations=readFileSync(new URL('../src/lib/translations.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/main.css',import.meta.url),'utf8');
test('Developer credit is present in global public footer only',()=>{
  assert.match(chrome,/export function Footer\(/);
  assert.match(chrome,/className="footer-developer"/);
  assert.match(chrome,/Carlos da Costa/);
  assert.match(chrome,/https:\/\/www\.instagram\.com\/carlxwj\//);
  assert.match(chrome,/words\.developerCredit/);
  assert.match(translations,/developerCredit:'Développé par'/);
  assert.match(translations,/developerCredit:'Developed by'/);
  assert.match(chrome,/rel="noopener noreferrer"/);
  assert.match(css,/\.footer-developer\{/);
});
