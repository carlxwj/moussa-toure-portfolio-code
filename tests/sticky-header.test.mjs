import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const chrome=readFileSync(new URL('../src/components/Chrome.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/main.css',import.meta.url),'utf8');
test('header reacts to scroll with a passive and cleaned-up listener',()=>{
 assert.match(chrome,/window\.scrollY>48/);
 assert.match(chrome,/addEventListener\('scroll',update,\{passive:true\}\)/);
 assert.match(chrome,/removeEventListener\('scroll',update\)/);
 assert.match(chrome,/site-header.*is-scrolled/);
});
test('header stays transparent initially, fixed when scrolling, compact and reduced-motion safe',()=>{
 assert.match(css,/\.site-header\{[\s\S]*?position:fixed;/);
 assert.match(css,/\.site-header\.is-scrolled\{[\s\S]*?height:72px/);
 assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.site-header\.is-scrolled\{height:66px\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
