// Tesla Delivery Checklist: SPA vanilla. Todo queda en localStorage; sin red salvo cargar la app.
const LANGS={es:'Español',pt:'Português',en:'English'};
const KEY='tc:state:v1',LK='tc:lang',TK='tc:theme';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blank=()=>({plate:'',vin:'',custom:[],marks:{},notes:{},open:{prep:true},noteOpen:{}});
let S,L,T,CL,lang;

const load=()=>{try{return {...blank(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return blank()}};
let saveT,dirty=false,persisted=false,status='saved',quietSave=false;
const flush=()=>{clearTimeout(saveT);if(!dirty)return;
  try{localStorage.setItem(KEY,JSON.stringify(S));dirty=false;setStatus('saved',quietSave);quietSave=false;askPersist()}catch{setStatus('error')}};
const save=(q)=>{quietSave=q===true&&!dirty?true:(q===true?quietSave:false);dirty=true;if(status!=='error')setStatus('saving',quietSave);clearTimeout(saveT);saveT=setTimeout(flush,200)};
function askPersist(){if(persisted)return;persisted=true;try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist().catch(()=>{})}catch{}}
let hideT;
function setStatus(s,quiet){status=s;const e=document.getElementById('savestate'),b=document.getElementById('saveerr');if(!e||!T)return;
  if(!quiet){clearTimeout(hideT);e.classList.remove('off');if(s==='saved')hideT=setTimeout(()=>e.classList.add('off'),5000)}
  e.dataset.s=s;e.textContent=s==='saving'?t('saving'):s==='error'?'⚠ '+t('saveShort'):'✓ '+t('saved');
  b.hidden=s!=='error';b.textContent=s==='error'?t('saveFail'):''}
const probe=()=>{try{localStorage.setItem('tc:probe','1');localStorage.removeItem('tc:probe');return true}catch{return false}};
const pick=()=>{try{const l=localStorage.getItem(LK);if(l in LANGS)return l}catch{}
  const n=(navigator.languages||[navigator.language||'es']).map(x=>x.slice(0,2).toLowerCase()).find(x=>x in LANGS);return n||'en'};
const t=(k,v={})=>(T.ui[k]??k).replace(/\{(\w+)\}/g,(_,n)=>v[n]);
const items=sec=>sec.groups.flatMap(g=>g.items);
const allItems=()=>CL.sections.flatMap(items);
const count=list=>{const c={ok:0,bad:0,na:0,pend:0};list.forEach(i=>{const m=S.marks[i.id];m?c[m]++:c.pend++});return c};

let stT=0;
function stuck(){stT=0;const s=document.getElementById('navsent'),n=document.querySelector('nav.chips');if(s&&n)n.classList.toggle('stuck',s.getBoundingClientRect().top<-1)}
addEventListener('scroll',()=>{if(!stT)stT=requestAnimationFrame(stuck)},{passive:true});
async function init(){
  S=load();lang=pick();
  CL=await (await fetch('checklist.json')).json();
  await setLang(lang,true);
  askPersist();if(!probe())setStatus('error');
  addEventListener('pagehide',flush);addEventListener('beforeunload',flush);addEventListener('blur',flush);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
  document.addEventListener('focusout',flush,true);
  matchMedia('(prefers-color-scheme:dark)').addEventListener&&matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(curTheme()==='auto')theme('auto')});
  if('serviceWorker' in navigator&&location.protocol!=='file:')swInit();
  addEventListener('beforeprint',buildPrint);
}
function swInit(){
  const had=!!navigator.serviceWorker.controller;let rl=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!had||rl)return;rl=true;flush();location.reload()});
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{
    r.update().catch(()=>{});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')r.update().catch(()=>{})});
  }).catch(()=>{});
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
  syncPills();
  if(m)m.content=(v==='light'||(v==='auto'&&!matchMedia('(prefers-color-scheme:dark)').matches))?'#f3f4f6':'#14161a';
}
const ICO={
 auto:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
 light:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 dark:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'};
const syncPills=()=>{const c=curTheme();document.querySelectorAll('[data-theme-set]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.themeSet===c));
  document.querySelectorAll('[data-lang-set]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.langSet===lang))};
const curTheme=()=>{try{return localStorage.getItem(TK)||'auto'}catch{return 'auto'}};

function itemHTML(it,n){
  const m=S.marks[it.id],c=T.it[it.id],note=S.notes[it.id]||'',open=S.noteOpen[it.id]||m==='bad'||note;
  const btn=(k,l)=>`<button type="button" class="k-${k}" data-act="mark" data-id="${it.id}" data-v="${k}" aria-pressed="${m===k}">${esc(t(l))}</button>`;
  return `<article class="item ${m?'s-'+m:''}" id="it-${it.id}">
<p class="ititle"><span class="code">${it.id}</span>${esc(c.t)}${it.added?`<span class="tag" title="${esc(t('addedHint'))}">${esc(t('added'))}</span>${it.src?`<span class="src"><a href="${esc(it.src)}" target="_blank" rel="noopener noreferrer">${esc(t('source'))} ↗</a></span>`:''}`:''}</p>
<p class="itext">${esc(c.x)}</p>${c.tip?`<p class="tip">💡 ${esc(c.tip)}</p>`:''}
<div class="seg" role="group" aria-label="${esc(c.t)}">${btn('ok','ok')}${btn('bad','bad')}${btn('na','na')}
<button type="button" class="nb ${note?'has':''}" data-act="note" data-id="${it.id}" aria-expanded="${!!open}" aria-label="${esc(t('noteToggle'))}">📝</button></div>
<div class="notebox" ${open?'':'hidden'}><label class="sr" for="n-${it.id}">${esc(t('note'))}</label><textarea id="n-${it.id}" data-note="${it.id}" placeholder="${esc(t('notePh'))}">${esc(note)}</textarea></div></article>`;
}
function secHTML(sec,idx){
  const s=T.sec[sec.id],list=items(sec),c=count(list),done=list.length-c.pend;
  return `<details class="sec" id="sec-${sec.id}" data-sec="${sec.id}" ${S.open[sec.id]?'open':''}>
<summary><h2>${idx+1}. ${esc(s.t)}</h2><span class="cnt" data-cnt="${sec.id}">${done}/${list.length}</span><div class="sbar thin" data-bar="${sec.id}" aria-hidden="true">${segsHTML(c,list.length,false)}</div></summary>
<div class="sec-body"><p class="sec-intro">${esc(s.i)}</p>
<div class="sec-actions"><button type="button" class="btn small" data-act="all" data-sec="${sec.id}">✔ ${esc(t('markAll'))}</button><button type="button" class="btn small" data-act="clear" data-sec="${sec.id}">↺ ${esc(t('clearAll'))}</button></div>
${sec.groups.map(g=>`<h3 class="grp">${esc(T.grp[g.id])}</h3>${g.items.map(itemHTML.bind(null)).join('')}`).join('')}</div></details>`;
}
function tipsHTML(id,title,arr,open){
  return `<details class="sec" id="sec-${id}" data-sec="${id}" ${S.open[id]?'open':''}><summary><h2>${esc(title)}</h2><span class="cnt">${arr.length}</span></summary><div class="sec-body tip-list">${arr.map(p=>`<p><b>${esc(p.t)}.</b> ${esc(p.x)}</p>`).join('')}</div></details>`;
}
const SEG=['ok','bad','na','pend'];
const segLabel=k=>t(k==='pend'?'pendingOne':k);
const pc=(n,tot)=>tot?n/tot*100:0;
const progText=(c,tot)=>`${Math.round(pc(tot-c.pend,tot))}% ${t('completed')}: `+SEG.map(k=>`${segLabel(k)} ${c[k]} (${Math.round(pc(c[k],tot))}%)`).join(', ');
const segsHTML=(c,tot,lab)=>SEG.map(k=>{const w=pc(c[k],tot);return `<span class="sg sg-${k}" data-seg="${k}" style="width:${w}%" title="${esc(segLabel(k))}: ${c[k]} (${Math.round(w)}%)">${lab&&w>=9?Math.round(w)+'%':''}</span>`}).join('');
const legendHTML=(c,tot)=>SEG.map(k=>`<li><i class="sw sg-${k}" aria-hidden="true"></i>${esc(segLabel(k))} <b>${c[k]}</b> <span>(${Math.round(pc(c[k],tot))}%)</span></li>`).join('');
function render(){
  const y=scrollY,fo=document.activeElement&&document.activeElement.id;
  const tot=allItems(),c=count(tot),done=tot.length-c.pend;
  $('#app').innerHTML=`
<header class="top"><img src="favicon.svg" alt="" width="36" height="36"><h1>${esc(t('title'))}<small>${esc(t('subtitle'))}</small></h1>
<div class="ctl"><div class="pills" role="group" aria-label="${esc(t('language'))}">${Object.entries(LANGS).map(([k,v])=>`<button type="button" lang="${k}" data-lang-set="${k}" aria-pressed="${k===lang}" aria-label="${v}" title="${v}">${k.toUpperCase()}</button>`).join('')}</div>
<div class="pills theme" role="group" aria-label="${esc(t('theme'))}">${['auto','light','dark'].map(k=>{const n=t('theme'+k[0].toUpperCase()+k.slice(1));return `<button type="button" data-theme-set="${k}" aria-pressed="${k===curTheme()}" aria-label="${esc(n)}" title="${esc(n)}">${ICO[k]}</button>`}).join('')}</div></div></header>
<section class="card prog" aria-labelledby="h-prog"><div class="ph"><h2 id="h-prog">${esc(t('progress'))}</h2><b class="ppct" data-g="pct">${Math.round(done/tot.length*100)}%</b><span class="muted">${esc(t('completed'))} · <span data-g="done">${done}</span> ${esc(t('of'))} ${tot.length}</span></div>
<div class="sbar" id="gbar" role="progressbar" aria-labelledby="h-prog" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(done/tot.length*100)}" aria-valuetext="${esc(progText(c,tot.length))}">${segsHTML(c,tot.length,true)}</div>
<ul class="legend" data-g="legend">${legendHTML(c,tot.length)}</ul></section>
<i id="navsent" aria-hidden="true"></i><nav class="chips" aria-label="${esc(t('nav'))}"><div class="mini"><b data-g="pct2">${Math.round(done/tot.length*100)}%</b><div class="sbar" id="gbar2" aria-hidden="true">${segsHTML(c,tot.length,true)}</div></div><div class="row">${CL.sections.map((s,i)=>`<a href="#sec-${s.id}" data-nav="${s.id}">${i+1} ${esc(T.sec[s.id].t)} <b data-chip="${s.id}">${chip(s)}</b></a>`).join('')}<a href="#summary">📋 ${esc(t('summary'))}</a></div></nav>
<aside class="privacy" role="note"><p><span aria-hidden="true">🔒</span> ${esc(t('privacy'))}</p><p><span aria-hidden="true">ℹ️</span> ${esc(t('disclaimer'))}</p></aside>
<section class="card" aria-labelledby="h-veh"><h2 id="h-veh">${esc(t('vehicle'))}</h2>
<div class="grid"><label class="f">${esc(t('plate'))}<input type="text" id="plate" value="${esc(S.plate)}" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
<label class="f">${esc(t('vin'))}<input type="text" id="vin" value="${esc(S.vin)}" maxlength="17" autocomplete="off" autocapitalize="characters" spellcheck="false"></label></div>
<h3 style="margin:.9rem 0 0;font-size:.95rem">${esc(t('custom'))}</h3>
<div id="cfs">${S.custom.length?S.custom.map(f=>`<div class="cf"><label class="f">${esc(t('fieldName'))}<input type="text" data-cf="${f.id}" data-k="name" value="${esc(f.name)}"></label><label class="f">${esc(t('fieldValue'))}<input type="text" data-cf="${f.id}" data-k="value" value="${esc(f.value)}"></label><button type="button" class="btn danger" data-act="rmcf" data-id="${f.id}" aria-label="${esc(t('removeField'))}">✕</button></div>`).join(''):`<p class="muted">${esc(t('customEmpty'))}</p>`}</div>
<p style="margin:.6rem 0 0"><button type="button" class="btn" data-act="addcf">＋ ${esc(t('addField'))}</button></p></section>
${tipsHTML('prep','💡 '+t('before'),T.prep)}
${CL.sections.map(secHTML).join('')}
${tipsHTML('after','🔧 '+t('after'),T.after)}
<section class="card" id="summary" aria-labelledby="h-sum"><h2 id="h-sum">${esc(t('summary'))}</h2><div class="stats" data-g="stats2">${statsHTML(c)}</div><h3 style="margin:.9rem 0 0;font-size:.95rem">${esc(t('issuesTitle'))}</h3><div data-g="issues">${issuesHTML()}</div></section>
<div class="actions"><button type="button" class="btn primary" data-act="pdf">🖨 ${esc(t('pdf'))}</button><button type="button" class="btn danger" data-act="reset">↺ ${esc(t('reset'))}</button></div>
<p class="muted" style="text-align:center">${esc(t('pdfHint'))}</p>
<footer><p>🔒 ${esc(t('privacy'))}</p><p>ℹ️ ${esc(t('disclaimer'))}</p><p>${esc(t('credit'))} <a href="https://pedidostesla.pages.dev/checklist" target="_blank" rel="noopener noreferrer">pedidostesla.pages.dev/checklist ↗</a></p><p>✔ ${esc(t('offline'))} · ${esc(t('editing'))}</p></footer>`;
  setStatus(status,true);syncPills();
  scrollTo(0,y);stuck();if(fo){const e=document.getElementById(fo);e&&e.focus&&e.focus()}
}
const chip=s=>{const l=items(s);return `${l.length-count(l).pend}/${l.length}`};
const statsHTML=c=>`<span class="pill ok">✔ ${esc(t('ok'))} ${c.ok}</span><span class="pill bad">⚠ ${esc(t('bad'))} ${c.bad}</span><span class="pill">– ${esc(t('na'))} ${c.na}</span><span class="pill">☐ ${esc(t('pending'))} ${c.pend}</span>`;
function issuesHTML(){
  const bad=allItems().filter(i=>S.marks[i.id]==='bad');
  if(!bad.length)return `<p class="empty">✅ ${esc(t('noIssues'))}</p>`;
  return `<ul class="issues">${bad.map(i=>`<li><a href="#it-${i.id}" data-goto="${i.id}">${i.id} · ${esc(T.it[i.id].t)}</a>${S.notes[i.id]?`<p>${esc(S.notes[i.id])}</p>`:''}</li>`).join('')}</ul>`;
}
function refresh(){ // actualiza barras/contadores sin re-render completo
  const tot=allItems(),n=tot.length,c=count(tot),done=n-c.pend,pct=Math.round(done/n*100);
  $('[data-g=pct]').textContent=pct+'%';$('[data-g=done]').textContent=done;
  const gb=$('#gbar');gb.setAttribute('aria-valuenow',pct);gb.setAttribute('aria-valuetext',progText(c,n));
  $('[data-g=pct2]').textContent=pct+'%';
  SEG.forEach(k=>{[gb,$('#gbar2')].forEach(g=>{const e=g.querySelector(`[data-seg=${k}]`),w=pc(c[k],n);e.style.width=w+'%';e.textContent=w>=9?Math.round(w)+'%':'';e.title=`${segLabel(k)}: ${c[k]} (${Math.round(w)}%)`})});
  false&&SEG.forEach(k=>{const e=gb.querySelector(`[data-seg=${k}]`),w=pc(c[k],n);e.style.width=w+'%';e.textContent=w>=9?Math.round(w)+'%':'';e.title=`${segLabel(k)}: ${c[k]} (${Math.round(w)}%)`});
  $('[data-g=legend]').innerHTML=legendHTML(c,n);
  $('[data-g=stats2]').innerHTML=statsHTML(c);$('[data-g=issues]').innerHTML=issuesHTML();
  CL.sections.forEach(s=>{const l=items(s),cc=count(l),d=l.length-cc.pend;
    $(`[data-cnt=${s.id}]`).textContent=`${d}/${l.length}`;$(`[data-bar=${s.id}]`).innerHTML=segsHTML(cc,l.length,false);
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
  const lp=e.target.closest('[data-lang-set]');if(lp){if(lp.dataset.langSet!==lang)setLang(lp.dataset.langSet);return}
  const tp=e.target.closest('[data-theme-set]');if(tp){theme(tp.dataset.themeSet);return}
  const b=e.target.closest('[data-act]');
  if(!b){const g=e.target.closest('[data-goto]');if(g){e.preventDefault();$('#it-'+g.dataset.goto).scrollIntoView({block:'center'})}
    const n=e.target.closest('[data-nav]');if(n){const d=$('#sec-'+n.dataset.nav);d.open=true;S.open[n.dataset.nav]=true;save(true)}return}
  const a=b.dataset.act,id=b.dataset.id;
  if(a==='mark')setMark(id,b.dataset.v);
  else if(a==='note'){const nb=$('.notebox',b.closest('.item'));nb.hidden=!nb.hidden;b.setAttribute('aria-expanded',!nb.hidden);if(!nb.hidden)$('textarea',nb).focus()}
  else if(a==='all'){const sec=CL.sections.find(s=>s.id===b.dataset.sec);items(sec).forEach(i=>{if(!S.marks[i.id])S.marks[i.id]='ok'});save();render()}
  else if(a==='clear'){const sec=CL.sections.find(s=>s.id===b.dataset.sec);if(confirm(t('clearAll')+'?')){items(sec).forEach(i=>delete S.marks[i.id]);save();render()}}
  else if(a==='addcf'){S.custom.push({id:Date.now().toString(36),name:'',value:''});save();render();const l=document.querySelectorAll('[data-cf][data-k=name]');l[l.length-1].focus()}
  else if(a==='rmcf'){S.custom=S.custom.filter(f=>f.id!==id);save();render()}
  else if(a==='pdf'){buildPrint();print()}
  else if(a==='reset'){if(confirm(t('resetConfirm'))){document.activeElement&&document.activeElement.blur();clearTimeout(saveT);dirty=false;S=blank();try{localStorage.removeItem(KEY)}catch{}render();scrollTo(0,0);toast(t('resetDone'))}}
});
const onField=e=>{
  const x=e.target;if(!x.isConnected)return; // change disparado al re-renderizar: ignorar
  if(x.id==='plate'){S.plate=x.value;save()}
  else if(x.id==='vin'){const p=x.selectionStart;x.value=x.value.toUpperCase();try{x.setSelectionRange(p,p)}catch{}S.vin=x.value;save()}
  else if(x.dataset.cf){const f=S.custom.find(f=>f.id===x.dataset.cf);if(f){f[x.dataset.k]=x.value;save()}}
  else if(x.dataset.note){const id=x.dataset.note;x.value?S.notes[id]=x.value:delete S.notes[id];$('[data-act=note]',x.closest('.item')).classList.toggle('has',!!x.value);save();$('[data-g=issues]').innerHTML=issuesHTML()}
};
document.addEventListener('input',onField);
document.addEventListener('change',onField);
document.addEventListener('toggle',e=>{const d=e.target;if(d.dataset&&d.dataset.sec){S.open[d.dataset.sec]=d.open;save(true)}},true);

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
<p class="foot">${esc(t('generated'))}: ${esc(d)} · ${esc(t('privacy'))}</p><p class="foot">${esc(t('disclaimer'))}</p>`;
}
init();
