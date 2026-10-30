import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Desktop navigation respects saved order rather than a hardcoded array',()=>{
 const chrome=read('src/components/Chrome.tsx');
 assert.match(chrome,/completeSectionOrder\(data.settings.sectionOrder,available\)/);
 assert.match(chrome,/desktopLinks=links.filter\(item=>primary.has\(item.key\)\)/);
 assert.match(chrome,/extraLinks=links.filter\(item=>!primary.has\(item.key\)\)/);
 assert.match(chrome,/href:\`\/#\$\{sectionAnchor\(key\)\}\`/);
 assert.match(chrome,/data.settings.sections\?\.\[key\]!==false/);
});
test('Mobile navigation uses the same live ordered links and bilingual labels',()=>{
 const chrome=read('src/components/Chrome.tsx');
 assert.match(chrome,/\{links.map\(\(item,i\)=>/);
 assert.match(chrome,/training:words.training/);
 assert.match(read('src/components/TrainingSection.tsx'),/id="training"/);
 const labels=read('src/lib/translations.ts');
 assert.match(labels,/showreel:'Showreel'/);
 assert.match(labels,/showreel:'Bande démo'/);
});
