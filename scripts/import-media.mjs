/* Import rights-cleared local pictures to static Hosting assets.
 Manifest: [{"file":"/absolute/path/photo.webp","approved":true,"folder":"portraits"}].
 Preview by default; --write copies. Never reads remote URLs or uses Firebase Storage.
*/
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {extname,resolve,join,isAbsolute} from 'node:path';
const manifest=process.argv[2],apply=process.argv.includes('--write');
if(!manifest)throw Error('Usage: node scripts/import-media.mjs /absolute/path/approved-media.json [--write]');
const entries=JSON.parse(await readFile(manifest,'utf8'));
if(!Array.isArray(entries))throw Error('Manifest must be an array');
const mimeExt=new Set(['.jpg','.jpeg','.png','.webp','.avif']);
const allowedFolder=new Set(['portraits','gallery','projects','thumbnails','site']);
const unique=new Set();let total=0;
for(const item of entries){
 if(item.approved!==true)throw Error('Explicit reuse authorization is required for every photograph');
 if(typeof item.file!=='string'||!isAbsolute(item.file))throw Error('Use absolute local source paths');
 const ext=extname(item.file).toLowerCase();if(!mimeExt.has(ext))throw Error('Unsupported image format: '+item.file);
 const folder=item.folder||'gallery';if(!allowedFolder.has(folder))throw Error('Invalid category: '+folder);
 const size=(await stat(item.file)).size;
 if(size<=0||size>5*1024*1024)throw Error('Please optimize image to 5 MB or less: '+item.file);
 const bytes=await readFile(item.file);
 const isPng=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const isJpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const isWebp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 const isAvif=bytes.toString('ascii',4,12).includes('ftypavif')||bytes.toString('ascii',4,13).includes('ftypavis');
 if(!({'.png':isPng,'.jpg':isJpg,'.jpeg':isJpg,'.webp':isWebp,'.avif':isAvif}[ext]))throw Error('File signature does not match extension: '+item.file);
 const hash=createHash('sha256').update(bytes).digest('hex');if(unique.has(hash))continue;unique.add(hash);
 const filename=`${hash.slice(0,24)}${ext}`;
 const output=resolve('public','media',folder,filename);
 console.log(`${apply?'WRITE':'PREVIEW'} ${item.file} -> /media/${folder}/${filename}`);total++;
 if(apply){await mkdir(join('public','media',folder),{recursive:true});await writeFile(output,bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e})}
}
console.log(`${total} distinct approved files processed. ${apply?'Redeploy Hosting to publish.':'No files copied.'}`);
