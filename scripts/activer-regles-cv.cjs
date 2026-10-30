/* Safely enable PDF metadata writes in an existing Cloudinary-aware firestore.rules.
 * Does not alter Firebase remotely, does not edit any other block, backs up first.
 */
const fs=require('node:fs');
const path=require('node:path');
const filename=path.join(process.cwd(),'firestore.rules');
if(!fs.existsSync(filename))throw new Error('Exécute cette commande depuis le dossier principal du portfolio (firestore.rules introuvable).');
const source=fs.readFileSync(filename,'utf8');
if(!source.includes('match /mediaIndex/{mediaId}')||!source.includes('function isAdmin()')||!source.includes("request.resource.data.provider == 'cloudinary'"))throw new Error('Règles non reconnues : aucune modification faite. Fais vérifier le fichier firestore.rules avant le déploiement.');
const pdfCheck=["request.resource.data.kind == 'pdf'","request.resource.data.mime == 'application/pdf'","request.resource.data.bytes <= 10000000","/image/upload/.*[.]pdf"].every(t=>source.includes(t));
if(pdfCheck){console.log('✅ Les autorisations PDF Cloudinary sont déjà présentes dans le fichier local. Tu peux vérifier et déployer les règles.');process.exit(0);}
const old=`request.resource.data.provider == 'cloudinary'
       && request.resource.data.kind == 'image'
       && request.resource.data.mime in ['image/jpeg','image/png','image/webp','image/avif']
       && request.resource.data.bytes <= 25000000`;
const replacement=`request.resource.data.provider == 'cloudinary'
       && ((request.resource.data.kind == 'image'
         && request.resource.data.mime in ['image/jpeg','image/png','image/webp','image/avif']
         && request.resource.data.bytes <= 25000000)
         || (request.resource.data.kind == 'pdf'
         && request.resource.data.mime == 'application/pdf'
         && request.resource.data.bytes <= 10000000
         && request.resource.data.url is string
         && request.resource.data.url.matches('https://res[.]cloudinary[.]com/[a-zA-Z0-9_-]+/image/upload/.*[.]pdf'))) `;
const times=source.split(old).length-1;
if(times!==1)throw new Error('Bloc Cloudinary inattendu ou déjà partiellement modifié. Aucune modification faite. Compare manuellement les règles locales et publiées.');
const backup=filename+'.avant-cv-'+new Date().toISOString().replace(/[:.]/g,'-')+'.bak';
fs.copyFileSync(filename,backup,fs.constants.COPYFILE_EXCL);
fs.writeFileSync(filename,source.replace(old,replacement.trimEnd()),'utf8');
console.log('✅ Autorisations PDF 10 Mo ajoutées uniquement au bloc mediaIndex.');
console.log('✅ Sauvegarde locale créée : '+path.basename(backup));
console.log('⚠️ Ce script ne publie rien. Vérifie les règles Firebase en ligne avant de déployer.');
