import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
let data=JSON.parse(await readFile(new URL('../src/content/initial-data.json',import.meta.url),'utf8'));
try{const snapshot=JSON.parse(await readFile('.cache/seo-public.json','utf8'));if(snapshot.profile&&Array.isArray(snapshot.projects))data={...data,...snapshot}}catch{}
let html=await readFile('dist/index.html','utf8');
const domain=(process.env.VITE_PUBLIC_SITE_URL||'').replace(/\/$/,'');
const escape=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inject=(url,title,description,body)=>html.replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(title)}</title>`).replace(/<meta name="description" content="[^"]*"\s*\/>/,`<meta name="description" content="${escape(description)}" />`).replace('</head>',`${domain?`<link rel="canonical" href="${escape(domain+url)}" />`:''}<meta property="og:title" content="${escape(title)}"/><meta property="og:description" content="${escape(description)}"/></head>`).replace('<div id="root"></div>',`<div id="root">${body}</div>`);
const paths=[{url:'/',title:'Moussa Toure — Actor',description:data.profile.shortBio.en,body:`<main><h1>Moussa Toure — Actor</h1><p>${escape(data.profile.biography.en)}</p><h2>Selected work</h2>${data.projects.map(p=>`<a href="/projects/${escape(p.slug)}">${escape(p.title.en)}</a>`).join(' ')}</main>`}];
for(const p of data.projects){if(p.status!=='published')continue;paths.push({url:`/projects/${p.slug}`,title:`${p.title.en} | Moussa Toure`,description:p.description.en,body:`<main><h1>${escape(p.title.en)}</h1><p>${escape(p.description.en)}</p><p>${escape(p.role.en)}</p></main>`})}
for(const p of paths){const target=path.join('dist',p.url,'index.html');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,inject(p.url,p.title,p.description,p.body))}
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${domain?paths.map(p=>`<url><loc>${escape(domain+p.url)}</loc></url>`).join(''):''}</urlset>`);
console.log(`Pre-rendered ${paths.length} pages using seed data. Firestore edits require a re-export and redeploy to update static SEO.`);
