// Verifica: claves i18n idénticas en es/pt/en, cobertura de checklist.json, precache del SW y sintaxis. Uso: node tools/check.mjs
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('..',import.meta.url).pathname;
const J=f=>JSON.parse(readFileSync(join(root,f),'utf8'));
const langs=['es','pt','en'],D=Object.fromEntries(langs.map(l=>[l,J(`i18n/${l}.json`)]));
const keys=(o,p='')=>Object.entries(o).flatMap(([k,v])=>Array.isArray(v)?[`${p}${k}[${v.length}]`,...v.flatMap((x,i)=>typeof x==='object'?keys(x,`${p}${k}[${i}].`):[])]:typeof v==='object'?keys(v,`${p}${k}.`):[p+k]);
let bad=0;const err=m=>{console.error('✗',m);bad++};
const base=new Set(keys(D.es));
for(const l of langs){const s=new Set(keys(D[l]));
  for(const k of base)if(!s.has(k))err(`${l}: falta ${k}`);
  for(const k of s)if(!base.has(k))err(`${l}: sobra ${k}`);
  const walk=(o,p)=>Object.entries(o).forEach(([k,v])=>typeof v==='string'?(v.trim()||err(`${l}: vacío ${p}${k}`)):v&&typeof v==='object'&&walk(v,`${p}${k}.`));walk(D[l],'');}
const CL=J('checklist.json');let n=0,add=0;const ids=new Set();
for(const s of CL.sections){for(const g of s.groups){for(const i of g.items){n++;i.added&&add++;
  if(ids.has(i.id))err('id duplicado '+i.id);ids.add(i.id);
  if(i.added&&!i.src)err('sin fuente '+i.id);
  for(const l of langs)if(!D[l].it[i.id])err(`${l}: falta ítem ${i.id}`);}
  for(const l of langs)if(!D[l].grp[g.id])err(`${l}: falta grupo ${g.id}`);}
  for(const l of langs)if(!D[l].sec[s.id])err(`${l}: falta sección ${s.id}`);}
for(const l of langs)for(const id of Object.keys(D[l].it))if(!ids.has(id))err(`${l}: ítem huérfano ${id}`);
// SW precache
const sw=readFileSync(join(root,'sw.js'),'utf8');const list=[...sw.match(/ASSETS=\[(.*?)\]/s)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
const files=[];const walkd=(d)=>readdirSync(join(root,d)).forEach(f=>{const p=join(d,f);if(['.git','tools','node_modules'].includes(f)||f.startsWith('.'))return;statSync(join(root,p)).isDirectory()?walkd(p):files.push(p)});walkd('.');
const skip=new Set(['sw.js','README.md','LICENSE','_headers']);
for(const f of files)if(!skip.has(f)&&!list.includes(f))err('no precacheado: '+f);
for(const a of list)if(a!=='./'&&!files.includes(a))err('precache apunta a archivo inexistente: '+a);
console.log(`ítems: ${n} (originales ${n-add}, añadidos ${add}); claves i18n por idioma: ${base.size}; precache: ${list.length}`);
process.exit(bad?1:0);
