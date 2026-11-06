// ── TABS ──
function renderTabs(){
  const t=$('canvas-tabs');
  t.innerHTML=scenes.map(sc=>`<div class="canvas-tab${sc.id===activeSceneId?' active':''}" onclick="setActiveScene('${sc.id}')"><span class="sdot"></span>${esc(sc.name)}.bscn<button class="icon-btn scene-x" onclick="event.stopPropagation();closeScene('${sc.id}')">✕</button></div>`).join('')+'<button class="icon-btn" data-tip="New scene" onclick="openNewSceneModal()">+</button>';
  if(!scenes.length)t.insertAdjacentHTML('afterbegin','<span class="muted">No scenes open</span>');
}
const VIEWS=[['script','⌗','Script'],['scene','▣','Scene'],['split','◫','Split'],['assets','▨','Assets'],['art','✎','Art'],['audio','♪','Audio']];
function setView(v){
  view=v;$('canvas-panel').dataset.view=v;
  document.querySelectorAll('.rib').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  const n=selectedNode(),sc=activeScene();
  const lab=$('ribbon-label');
  if(lab)lab.textContent=sc?(n?`${sc.name} · ${n.name}`:sc.name):'';
  renderViewTabs();
  if(v==='assets')renderAssets();
  if(v==='art')initArt();
  if(v==='audio')initAudio();else if(AUDIO.ready)AUDIO.stopAll({leavingTab:true});
  document.querySelector('.rib.on')?.scrollIntoView?.({inline:'nearest',block:'nearest'});
}
function renderViewTabs(){
  const n=selectedNode();
  const vt=$('view-tabs');
  if(vt)vt.innerHTML=VIEWS.map(([k,i,l])=>`<div class="canvas-tab${view===k?' active':''}" onclick="setView('${k}')"><span>${i}</span>${k==='script'&&n?'Script · '+esc(n.name):l}</div>`).join('');
  document.querySelectorAll('.rib').forEach(b=>b.classList.toggle('on',b.dataset.view===view));
}
function openOverflow(e){
  e.stopPropagation();
  const n=selectedNode(),sc=activeScene();
  const items=[
    {label:'Scene Tree',fn:()=>{settings.showLeft=true;applySettings();saveSettings();if(isMobile())toggleMobilePanel('left');}},
    {label:'Properties Panel',fn:()=>{settings.showRight=true;applySettings();saveSettings();if(isMobile())toggleMobilePanel('right');}},
    '-',
    {label:view==='art'?'✓ Art tab':'Art tab',fn:()=>setView('art')},
    {label:view==='audio'?'✓ Audio tab':'Audio tab',fn:()=>setView('audio')},
    {label:'New Project…',fn:()=>createProject()},
    {label:'Open Project…',fn:()=>openProject()},
    {label:'Save Project',fn:()=>saveProject()},
    {label:'Export Project ZIP…',fn:()=>exportProjectZip()},
    {label:'Delete Project…',danger:true,fn:()=>deleteProject()},
    '-',
    {label:'New Scene…',fn:openNewSceneModal},
    {label:'Import PNG…',fn:()=>importPNG(false)},
    '-',
    {label:loop?'✓ Loop playback':'Loop playback',fn:()=>{loop=!loop;setStatus(loop?'Loop on':'Loop off');}},
    {label:(document.getElementById('debug-panel')?.classList.contains('open')?'Hide':'Show')+' Debug',fn:toggleDebug},
    '-',
    {label:'Settings…',fn:openSettings},
  ];
  const btn=$('overflow-btn');
  const r=btn.getBoundingClientRect();
  const scale = (typeof settings!=='undefined' && settings.scale) ? settings.scale : 1;
  const menuW = Math.round(200 * scale);
  showMenu(Math.max(4, r.right - menuW), r.bottom + 4, items);
}


