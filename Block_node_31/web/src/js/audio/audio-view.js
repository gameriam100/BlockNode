// AUDIO VIEW — builds the Audio tab controls, links seed text to controls, saves/restores state.
(A=>{
const X=i=>'au-'+i,FM={},EXTRA=['svol','sq','mvol','q'];
function refresh(id){
  const i=A.el(id);if(!i)return;
  if(FM[id])A.el(id+'o').textContent=FM[id](+i.value);
  const sg=document.querySelector(`.au-seg[data-for="${X(id)}"]`);
  if(sg)[...sg.children].forEach(b=>b.classList.toggle('on',b.dataset.v==i.value));
}
const field=d=>d.g
  ?`<div class="au-f au-w"><div class="au-lb"><span>${d.l}</span></div><div class="au-seg" data-for="${X(d.id)}">${d.g.map((o,i)=>`<button type="button" data-v="${i}">${o}</button>`).join('')}</div><input type="hidden" id="${X(d.id)}" value="${d.v||0}"></div>`
  :d.o
  ?`<div class="au-f"><div class="au-lb"><span>${d.l}</span></div><select id="${X(d.id)}">${d.o.map((o,i)=>`<option value="${i}">${o}</option>`).join('')}</select></div>`
  :`<div class="au-f"><div class="au-lb"><span>${d.l}</span><output id="${X(d.id)}o"></output></div><input type="range" id="${X(d.id)}" min="${d.a}" max="${d.b}" step="${d.s||1}" value="${d.v}"></div>`;
function build(el,defs){
  el.innerHTML=defs.map(field).join('');
  defs.forEach(d=>{if(d.f)FM[d.id]=d.f;refresh(d.id);});
  el.addEventListener('input',e=>{if(e.target.id.startsWith('au-'))refresh(e.target.id.slice(3));});
  el.addEventListener('click',e=>{
    const b=e.target.closest('.au-seg button');if(!b)return;
    const i=document.getElementById(b.parentNode.dataset.for);i.value=b.dataset.v;refresh(i.id.slice(3));
    ['input','change'].forEach(t=>i.dispatchEvent(new Event(t,{bubbles:true})));
  });
}
// Seed text format: "name~setting.setting.setting"
function link(seedId,ids,defs,run,live){
  const el=A.el(seedId),ctl=el.closest('.au-card').querySelector('.au-ctl'),own=id=>ids.map(X).includes(id);
  const enc=()=>ids.map(i=>A.el(i).value.replace('.','_')).join('.');
  const write=()=>{el.value=A.baseOf(seedId)+'~'+enc();};
  const decode=()=>{
    if(!el.value.includes('~'))return write();
    const p=el.value.split('~')[1].split('.').map(x=>x.replace('_','.'));
    ids.forEach((id,i)=>{const x=A.el(id);x.value=p[i]??defs[i];if(x.value==='')x.value=defs[i];refresh(id);});
    write();
  };
  ctl.addEventListener('input',e=>{if(own(e.target.id)){write();if(live)run();}});
  ctl.addEventListener('change',e=>{if(!live&&own(e.target.id))run();});
  el.addEventListener('change',()=>{decode();run(true);});
  write();
  return{decode,dice:()=>{el.value=A.rand()+'~'+enc();run(true);}};
}
A.collect=()=>({s:A.el('sseed').value,m:A.el('mseed').value,...Object.fromEntries(EXTRA.map(id=>[id,A.el(id).value]))});
A.serialize=()=>A.ready?A.collect():A.pending;
A.loadData=d=>{A.pending=d&&typeof d==='object'?d:null;if(A.ready)A.apply();};
A.apply=()=>{
  const d=A.pending||{};A.pending=null;
  if(d.s)A.el('sseed').value=String(d.s);
  if(d.m)A.el('mseed').value=String(d.m);
  EXTRA.forEach(id=>{if(d[id]!=null){A.el(id).value=d[id];refresh(id);}});
  A.sLink.decode();A.mLink.decode();
  A.sfxRender();A.musGo(false);
};
A.keepMusicOnClose=()=>{const el=A.el('mkeep');return !!(el&&el.checked);};
A.stopAll=(opts)=>{
  opts=opts||{};
  try{A.sfx.src&&A.sfx.src.s.stop();}catch(e){}
  // Keep music looping when leaving the Audio tab if the toggle is on
  if(opts.leavingTab&&A.keepMusicOnClose()&&A.mus&&A.mus.src)return;
  A.musStop();
};
A.init=()=>{
  if(A.ready)return;
  A.ready=true;
  build(A.el('sctl'),A.sfxDefs);
  build(A.el('mctl'),A.musDefs);
  A.sLink=link('sseed',A.sfxSeedIds,A.sfxSeedDefs,A.sfxGo,true);
  A.mLink=link('mseed',A.musSeedIds,A.musSeedDefs,A.musGo,false);
  A.el('sctl').addEventListener('input',e=>{if(e.target.id==X('svol'))A.sfxGo();});
  A.el('sctl').addEventListener('change',e=>{if(e.target.id==X('sq'))A.sfxSize();});
  A.el('mctl').addEventListener('input',e=>{if(e.target.id==X('mvol')&&A.mus.src)A.mus.src.g.gain.value=A.v('mvol');});
  A.el('mctl').addEventListener('change',e=>{if(e.target.id==X('q'))A.musSize();});
  A.el('sdice').onclick=A.sLink.dice;
  A.el('splay').onclick=()=>A.sfxGo();
  A.el('ssave').onclick=A.sfxSave;
  A.el('sadd').onclick=()=>{ try{ if(typeof addCustomAudioToAssets==='function') addCustomAudioToAssets('sfx'); else setStatus('Assets module not ready'); }catch(err){ console.error(err); setStatus('Add SFX failed'); } };
  A.el('mdice').onclick=A.mLink.dice;
  A.el('mplay').onclick=()=>A.mus.src?A.musStop():A.musStart();
  A.el('msave').onclick=A.musSave;
  A.el('madd').onclick=()=>{ try{ if(typeof addCustomAudioToAssets==='function') addCustomAudioToAssets('music'); else setStatus('Assets module not ready'); }catch(err){ console.error(err); setStatus('Add music failed'); } };
  window.addEventListener('keydown',e=>{
    if(view==='audio'&&(e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())&&e.target.closest('#audio-pane'))e.stopImmediatePropagation();
  },true);
  A.apply();
};
})(AUDIO);
function initAudio(){AUDIO.init();}
