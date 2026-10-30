import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const admin=readFileSync(new URL('../src/pages/Admin.tsx',import.meta.url),'utf8');
const media=admin.slice(admin.indexOf('function MediaLibrary('),admin.indexOf('async function initializeSite('));
const cv=admin.slice(admin.indexOf('function CvEditor('),admin.indexOf('function SettingsEditor('));
const advanced=admin.slice(admin.indexOf('function SettingsEditor('),admin.indexOf('function MediaLibrary('));

test('Desktop and mobile menus put Photos then CV directly after social links',()=>{
 assert.match(admin,/ids:\['actorProfile','stories','testimonials','socialLinks','media','cv'\]/);
 assert.match(admin,/media:'Mes photos',cv:'Mon CV'/);
 assert.match(admin,/section==='cv'\?<CvEditor/);
 assert.match(admin,/admin-mobile-section/);
});
test('Photos library is image-only and hides existing PDFs without deleting them',()=>{
 assert.match(media,/accept="image\/jpeg,image\/png,image\/webp,image\/avif"/);
 assert.doesNotMatch(media,/accept="[^"]*application\/pdf/);
 assert.match(media,/if\(!\['image\/jpeg','image\/png','image\/webp','image\/avif'\].includes\(file.type\)\)throw new Error/);
 assert.match(media,/await uploadCloudImage\(file\)/);
 assert.doesNotMatch(media,/uploadCloudPdf\(file\)/);
 assert.match(media,/assets.filter\(a=>a.kind==='image'\).map/);
 assert.doesNotMatch(media,/batch\.delete\(doc\(db,'mediaIndex',.*kind==='pdf'/);
});
test('CV section preserves signed uploading, one-field publication, recovery and earlier PDF selection',()=>{
 assert.match(cv,/accept="\.pdf,application\/pdf"/);
 assert.match(cv,/await uploadCloudPdf\(file\)/);
 assert.match(cv,/cvUrl:uploaded\.url,updatedAt:serverTimestamp\(\)/);
 assert.match(cv,/\{merge:true\}/);
 assert.match(cv,/await lookupCloudPdf\(recoverId\)/);
 assert.match(cv,/batch\.update\(doc\(db,'siteSettings','main'\)/);
 assert.match(cv,/assets.filter\(a=>a.kind==='pdf'\)/);
 assert.match(cv,/referenced.has\(MEDIA_PREFIX\+asset.id\)/);
 assert.match(cv,/Enregistrer ce CV/);
});
test('Technical settings no longer contain upload CV controls or PDF recovery',()=>{
 assert.doesNotMatch(advanced,/uploadCloudPdf|lookupCloudPdf|Choisir mon nouveau CV|CV à télécharger \(PDF\)/);
 assert.match(advanced,/Réglages et pages légales/);
});
