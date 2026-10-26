// Tesla Delivery Checklist: SPA vanilla. Todo queda en localStorage; sin red salvo cargar la app.
const LANGS={es:'Español',pt:'Português',en:'English'};
const KEY='tc:state:v1',LK='tc:lang',TK='tc:theme';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blank=()=>({plate:'',vin:'',custom:[],marks:{},notes:{},open:{prep:true},noteOpen:{}});
let S,L,T,CL,lang;

const load=()=>{try{return {...blank(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return blank()}};
let saveT;const save=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}},150)};
const pick=()=>{try{const l=localStorage.getItem(LK);if(l in LANGS)return l}catch{}
  const n=(navigator.languages||[navigator.language||'es']).map(x=>x.slice(0,2).toLowerCase()).find(x=>x in LANGS);return n||'en'};
const t=(k,v={})=>(T.ui[k]??k).replace(/\{(\w+)\}/g,(_,n)=>v[n]);
const items=sec=>sec.groups.flatMap(g=>g.items);
const allItems=()=>CL.sections.flatMap(items);
const count=list=>{const c={ok:0,bad:0,na:0,pend:0};list.forEach(i=>{const m=S.marks[i.id];m?c[m]++:c.pend++});return c};

async function init(){
  S=load();lang=pick();
  CL=await (await fetch('checklist.json')).json();
  await setLang(lang,true);
  if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
  addEventListener('beforeprint',buildPrint);
}
async function setLang(l,first){
  lang=l;T=await (await fetch(`i18n/${l}.json`)).json();
  try{localStorage.setItem(LK,l)}catch{}
  document.documentElement.lang=l;
  render();
}
function theme(v){
  try{v==='auto'?localStorage.removeItem(TK):localStorage.setItem(TK,v)}catch{}
  v==='auto'?delete document.documentElement.dataset.theme:document.documentElement.dataset.theme=v;
  const m=document.querySelector('meta[name=theme-color]');
  if(m)m.content=(v==='light'||(v==='auto'&&!matchMedia('(prefers-color-scheme:dark)').matches))?'#f3f4f6':'#14161a';
}
const curTheme=()=>{try{return localStorage.getItem(TK)||'auto'}catch{return 'auto'}};

function itemHTML(it,n){
  const m=S.marks[it.id],c=T.it[it.id],note=S.notes[it.id]||'',open=S.noteOpen[it.id]||m==='bad'||note;
  const btn=(k,l)=>`<button type="button" class="k-${k}" data-act="mark" data-id="${it.id}" data-v="${k}" aria-pressed="${m===k}">${esc(t(l))}</button>`;
  return `<article class="item ${m?'s-'+m:''}" id="it-${it.id}">
<p class="ititle"><span class="code">${it.id}</span>${esc(c.t)}${it.added?`<span class="tag" title="${esc(t('addedHint'))}">${esc(t('added'))}</span><span class="src"><a href="${esc(it.src)}" target="_blank" rel="noopener noreferrer">${esc(t('source'))} ↗</a></span>`:''}</p>
<p class="itext">${esc(c.x)}</p>${c.tip?`<p class="tip">💡 ${esc(c.tip)}</p>`:''}
<div class="seg" role="group" aria-label="${esc(c.t)}">${btn('ok','ok')}${btn('bad','bad')}${btn('na','na')}
<button type="button" class="nb ${note?'has':''}" data-act="note" data-id="${it.id}" aria-expanded="${!!open}" aria-label="${esc(t('noteToggle'))}">📝</button></div>
<div class="notebox" ${open?'':'hidden'}><label class="sr" for="n-${it.id}">${esc(t('note'))}</label><textarea id="n-${it.id}" data-note="${it.id}" placeholder="${esc(t('notePh'))}">${esc(note)}</textarea></div></article>`;
}
function secHTML(sec,idx){
  const s=T.sec[sec.id],list=items(sec),c=count(list),done=list.length-c.pend;
  return `<details class="sec" id="sec-${sec.id}" data-sec="${sec.id}" ${S.open[sec.id]?'open':''}>
<summary><h2>${idx+1}. ${esc(s.t)}</h2><span class="cnt" data-cnt="${sec.id}">${done}/${list.length}</span><div class="bar ${c.bad?'bad':''}" data-bar="${sec.id}"><i style="width:${Math.round(done/list.length*100)}%"></i></div></summary>
<div class="sec-body"><p class="sec-intro">${esc(s.i)}</p>
<div class="sec-actions"><button type="button" class="btn small" data-act="all" data-sec="${sec.id}">✔ ${esc(t('markAll'))}</button><button type="button" class="btn small" data-act="clear" data-sec="${sec.id}">↺ ${esc(t('clearAll'))}</button></div>
${sec.groups.map(g=>`<h3 class="grp">${esc(T.grp[g.id])}</h3>${g.items.map(itemHTML.bind(null)).join('')}`).join('')}</div></details>`;
}
function tipsHTML(id,title,arr,open){
  return `<details class="sec" id="sec-${id}" data-sec="${id}" ${S.open[id]?'open':''}><summary><h2>${esc(title)}</h2><span class="cnt">${arr.length}</span></summary><div class="sec-body tip-list">${arr.map(p=>`<p><b>${esc(p.t)}.</b> ${esc(p.x)}</p>`).join('')}</div></details>`;
}
function render(){
  const y=scrollY,fo=document.activeElement&&document.activeElement.id;
  const tot=allItems(),c=count(tot),done=tot.length-c.pend;
  $('#app').innerHTML=`
<header class="top"><img src="favicon.svg" alt="" width="32" height="32"><h1>${esc(t('title'))}<small>${esc(t('subtitle'))}</small></h1>
<label class="sel">${esc(t('language'))}<select id="lang">${Object.entries(LANGS).map(([k,v])=>`<option value="${k}" ${k===lang?'selected':''}>${v}</option>`).join('')}</select></label>
<label class="sel">${esc(t('theme'))}<select id="theme">${['auto','light','dark'].map(k=>`<option value="${k}" ${k===curTheme()?'selected':''}>${esc(t('theme'+k[0].toUpperCase()+k.slice(1)))}</option>`).join('')}</select></label></header>
<p class="privacy" role="note"><span aria-hidden="true">🔒</span><span>${esc(t('privacy'))}</span></p>
<section class="card" aria-labelledby="h-veh"><h2 id="h-veh">${esc(t('vehicle'))}</h2>
<div class="grid"><label class="f">${esc(t('plate'))}<input type="text" id="plate" value="${esc(S.plate)}" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
<label class="f">${esc(t('vin'))}<input type="text" id="vin" value="${esc(S.vin)}" maxlength="17" autocomplete="off" autocapitalize="characters" spellcheck="false"></label></div>
<h3 style="margin:.9rem 0 0;font-size:.95rem">${esc(t('custom'))}</h3>
<div id="cfs">${S.custom.length?S.custom.map(f=>`<div class="cf"><label class="f">${esc(t('fieldName'))}<input type="text" data-cf="${f.id}" data-k="name" value="${esc(f.name)}"></label><label class="f">${esc(t('fieldValue'))}<input type="text" data-cf="${f.id}" data-k="value" value="${esc(f.value)}"></label><button type="button" class="btn danger" data-act="rmcf" data-id="${f.id}" aria-label="${esc(t('removeField'))}">✕</button></div>`).join(''):`<p class="muted">${esc(t('customEmpty'))}</p>`}</div>
<p style="margin:.6rem 0 0"><button type="button" class="btn" data-act="addcf">＋ ${esc(t('addField'))}</button></p></section>
<section class="card" aria-labelledby="h-prog"><h2 id="h-prog">${esc(t('progress'))}: <span data-g="pct">${Math.round(done/tot.length*100)}%</span> <span class="muted">(<span data-g="done">${done}</span> ${esc(t('of'))} ${tot.length})</span></h2>
<div class="bar" id="gbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(done/tot.length*100)}"><i style="width:${Math.round(done/tot.length*100)}%"></i></div>
<div class="stats" data-g="stats">${statsHTML(c)}</div></section>
<nav class="chips" aria-label="${esc(t('nav'))}">${CL.sections.map((s,i)=>`<a href="#sec-${s.id}" data-nav="${s.id}">${i+1} ${esc(T.sec[s.id].t)} <b data-chip="${s.id}">${chip(s)}</b></a>`).join('')}<a href="#summary">📋 ${esc(t('summary'))}</a></nav>
${tipsHTML('prep','💡 '+t('before'),T.prep)}
${CL.sections.map(secHTML).join('')}
${tipsHTML('after','🔧 '+t('after'),T.after)}
<section class="card" id="summary" aria-labelledby="h-sum"><h2 id="h-sum">${esc(t('summary'))}</h2><div data-g="stats2">${statsHTML(c)}</div><h3 style="margin:.9rem 0 0;font-size:.95rem">${esc(t('issuesTitle'))}</h3><div data-g="issues">${issuesHTML()}</div></section>
<div class="actions"><button type="button" class="btn primary" data-act="pdf">🖨 ${esc(t('pdf'))}</button><button type="button" class="btn danger" data-act="reset">↺ ${esc(t('reset'))}</button></div>
<p class="muted" style="text-align:center">${esc(t('pdfHint'))}</p>
<footer><p>🔒 ${esc(t('privacy'))}</p><p>${esc(t('credit'))} <a href="https://pedidostesla.pages.dev/checklist" target="_blank" rel="noopener noreferrer">pedidostesla.pages.dev/checklist ↗</a></p><p>✔ ${esc(t('offline'))} · ${esc(t('editing'))}</p></footer>`;
  scrollTo(0,y);if(fo){const e=document.getElementById(fo);e&&e.focus&&e.focus()}
}
const chip=s=>{const l=items(s);return `${l.length-count(l).pend}/${l.length}`};
const statsHTML=c=>`<span class="pill ok">✔ ${esc(t('ok'))} ${c.ok}</span><span class="pill bad">⚠ ${esc(t('bad'))} ${c.bad}</span><span class="pill">– ${esc(t('na'))} ${c.na}</span><span class="pill">☐ ${esc(t('pending'))} ${c.pend}</span>`;
function issuesHTML(){
  const bad=allItems().filter(i=>S.marks[i.id]==='bad');
  if(!bad.length)return `<p class="empty">✅ ${esc(t('noIssues'))}</p>`;
  return `<ul class="issues">${bad.map(i=>`<li><a href="#it-${i.id}" data-goto="${i.id}">${i.id} · ${esc(T.it[i.id].t)}</a>${S.notes[i.id]?`<p>${esc(S.notes[i.id])}</p>`:''}</li>`).join('')}</ul>`;
}
function refresh(){ // actualiza barras/contadores sin re-render completo
  const tot=allItems(),c=count(tot),done=tot.length-c.pend,pct=Math.round(done/tot.length*100);
  $('[data-g=pct]').textContent=pct+'%';$('[data-g=done]').textContent=done;
  const gb=$('#gbar');gb.setAttribute('aria-valuenow',pct);gb.firstElementChild.style.width=pct+'%';
  $('[data-g=stats]').innerHTML=statsHTML(c);$('[data-g=stats2]').innerHTML=statsHTML(c);$('[data-g=issues]').innerHTML=issuesHTML();
  CL.sections.forEach(s=>{const l=items(s),cc=count(l),d=l.length-cc.pend;
    $(`[data-cnt=${s.id}]`).textContent=`${d}/${l.length}`;const b=$(`[data-bar=${s.id}]`);b.firstElementChild.style.width=Math.round(d/l.length*100)+'%';b.classList.toggle('bad',cc.bad>0);
    const ch=$(`[data-chip=${s.id}]`);ch.textContent=chip(s);ch.parentElement.classList.toggle('done',cc.pend===0)});
}
function setMark(id,v){
  if(S.marks[id]===v)delete S.marks[id];else S.marks[id]=v;
  const el=$('#it-'+id),m=S.marks[id];el.className='item '+(m?'s-'+m:'');
  el.querySelectorAll('.seg [data-act=mark]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===m));
  if(m==='bad'){const nb=$('.notebox',el);nb.hidden=false;$('[data-act=note]',el).setAttribute('aria-expanded','true')}
  save();refresh();
}
function toast(m){const e=$('#toast');e.textContent=m;clearTimeout(toast.t);toast.t=setTimeout(()=>e.textContent='',2500)}

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');
  if(!b){const g=e.target.closest('[data-goto]');if(g){e.preventDefault();$('#it-'+g.dataset.goto).scrollIntoView({block:'center'})}
    const n=e.target.closest('[data-nav]');if(n){const d=$('#sec-'+n.dataset.nav);d.open=true;S.open[n.dataset.nav]=true;save()}return}
  const a=b.dataset.act,id=b.dataset.id;
  if(a==='mark')setMark(id,b.dataset.v);
  else if(a==='note'){const nb=$('.notebox',b.closest('.item'));nb.hidden=!nb.hidden;b.setAttribute('aria-expanded',!nb.hidden);if(!nb.hidden)$('textarea',nb).focus()}
  else if(a==='all'){const sec=CL.sections.find(s=>s.id===b.dataset.sec);items(sec).forEach(i=>{if(!S.marks[i.id])S.marks[i.id]='ok'});save();render()}
  else if(a==='clear'){const sec=CL.sections.find(s=>s.id===b.dataset.sec);if(confirm(t('clearAll')+'?')){items(sec).forEach(i=>delete S.marks[i.id]);save();render()}}
  else if(a==='addcf'){S.custom.push({id:Date.now().toString(36),name:'',value:''});save();render();const l=document.querySelectorAll('[data-cf][data-k=name]');l[l.length-1].focus()}
  else if(a==='rmcf'){S.custom=S.custom.filter(f=>f.id!==id);save();render()}
  else if(a==='pdf'){buildPrint();print()}
  else if(a==='reset'){if(confirm(t('resetConfirm'))){S=blank();try{localStorage.removeItem(KEY)}catch{}render();scrollTo(0,0);toast(t('resetDone'))}}
});
document.addEventListener('input',e=>{
  const x=e.target;
  if(x.id==='plate'){S.plate=x.value;save()}
  else if(x.id==='vin'){x.value=x.value.toUpperCase();S.vin=x.value;save()}
  else if(x.dataset.cf){const f=S.custom.find(f=>f.id===x.dataset.cf);if(f){f[x.dataset.k]=x.value;save()}}
  else if(x.dataset.note){const id=x.dataset.note;x.value?S.notes[id]=x.value:delete S.notes[id];$('[data-act=note]',x.closest('.item')).classList.toggle('has',!!x.value);save();$('[data-g=issues]').innerHTML=issuesHTML()}
});
document.addEventListener('change',e=>{
  if(e.target.id==='lang')setLang(e.target.value);
  else if(e.target.id==='theme'){theme(e.target.value)}
});
document.addEventListener('toggle',e=>{const d=e.target;if(d.dataset&&d.dataset.sec){S.open[d.dataset.sec]=d.open;save()}},true);

// ---- vista de impresión (PDF vía window.print) ----
function buildPrint(){
  if(!T)return;
  const sym={ok:'☑',bad:'⚠',na:'–'},c=count(allItems()),bad=allItems().filter(i=>S.marks[i.id]==='bad');
  const d=new Date().toLocaleString(lang==='pt'?'pt-PT':lang==='en'?'en-GB':'es-ES',{dateStyle:'long',timeStyle:'short'});
  const meta=[[t('date'),d],[t('plate'),S.plate||'—'],[t('vin'),S.vin||'—'],...S.custom.filter(f=>f.name||f.value).map(f=>[f.name||'—',f.value||'—'])];
  $('#print').innerHTML=`<h1>${esc(t('title'))}</h1><div>${esc(t('subtitle'))}</div>
<table class="meta">${meta.map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
<div>${esc(t('counts',{ok:c.ok,bad:c.bad,na:c.na,pend:c.pend}))}</div>
<h2>${esc(t('pdfIssues'))}</h2>
<div class="sum">${bad.length?`<ul style="margin:0;padding-left:5mm">${bad.map(i=>`<li><b>${i.id} · ${esc(T.it[i.id].t)}</b>${S.notes[i.id]?': '+esc(S.notes[i.id]):''}</li>`).join('')}</ul>`:esc(t('pdfNone'))}</div>
<div style="font-size:8.5pt">${esc(t('legend'))}</div>
${CL.sections.map((s,n)=>`<h2>${n+1}. ${esc(T.sec[s.id].t)}</h2>${s.groups.map(g=>`<h3>${esc(T.grp[g.id])}</h3>${g.items.map(i=>{const m=S.marks[i.id];return `<div class="row ${m==='bad'?'bad':''}"><span class="st">${m?sym[m]:'☐'}</span><span class="cd">${i.id}</span><span>${esc(T.it[i.id].t)}</span>${S.notes[i.id]?`<div class="nt">${esc(S.notes[i.id])}</div>`:''}</div>`}).join('')}`).join('')}`).join('')}
<div class="sign"><div>${esc(t('signatureName'))}</div><div>${esc(t('signatureDate'))}</div></div>
<p class="foot">${esc(t('generated'))}: ${esc(d)} · ${esc(t('privacy'))}</p>`;
}
init();
