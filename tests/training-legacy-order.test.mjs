import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('Training, Showreel and the existing sections are configurable in the admin',()=>{
 const admin=read('src/pages/Admin.tsx');
 assert.match(admin,/training:'Training \/ Formations'/);
 assert.match(admin,/showreel:'Showreel \/ Bande démo'/);
 assert.match(admin,/completeSectionOrder\(order,all\)/);
 assert.match(admin,/defaultOrder=\[\.\.\.defaultSectionOrder\]/);
});
test('legacy Firestore order receives Training after Videos and Showreel after About',()=>{
 const helper=read('src/lib/sectionOrder.ts');
 assert.match(helper,/key === 'training' && result.includes\('videos'\)/);
 assert.match(helper,/key === 'showreel' && result.includes\('about'\)/);
 assert.match(read('src/pages/Home.tsx'),/completeSectionOrder\(data.settings.sectionOrder,available\)/);
});
