// ── TOP MENUS ──
function topMenu(btn,kind){
  const n=selectedNode(),sc=activeScene(),k=a=>'  '+(KEYS[a]||'');
  const ck=(on,l)=>(on?'✓ ':'   ')+l;
  const M={
    file:[{label:'New Scene…'+k('newScene'),fn:openNewSceneModal},{label:'Open Project…'+k('open'),fn:()=>openProject()},{label:'Save Project'+k('save'),fn:()=>saveProject()},'-',{label:'Import PNG…',fn:()=>importPNG(n?.type==='Sprite2D')},'-',{label:'Rename Scene',fn:()=>{const el=document.querySelector('.scene-head.active .scene-name');if(sc&&el)startRename(el,sc.name,v=>{sc.name=v;renderTabs();renderSceneTree();});}},{label:'Close Scene',danger:true,fn:()=>sc&&closeScene(sc.id)}],
    edit:[{label:'Undo'+k('undo'),fn:()=>undo()},{label:'Redo'+k('redo'),fn:()=>redo()},'-',{label:'Duplicate Node   Ctrl+D',fn:()=>duplicateNode()},{label:'Rename Node   F2',fn:renameSelected},{label:'Delete Node   Del',danger:true,fn:()=>deleteNode()},'-',{label:'Clear Blocks on Node',fn:()=>{if(n){linesOf(n).forEach(l=>l.blocks=[]);renderCanvas();}}},'-',{label:'Add Node…',fn:()=>showAddMenu(null)}],
    view:[...VIEWS.map(([v,,l])=>({label:ck(view===v,l+' view'),fn:()=>setView(v)})),'-',{label:ck(settings.lightMode,'Light Mode'),fn:()=>{settings.lightMode=!settings.lightMode;applySettings();saveSettings();}},'-',{label:'Settings…'+k('settings'),fn:openSettings},{label:'Reset Layout',fn:resetLayout}],
    debug:[{label:(running?'Stop':'Run')+k('run'),fn:toggleRun},{label:ck(loop,'Loop playback'),fn:()=>{loop=!loop;renderViewTabs();}},'-',{label:ck(settings.labels,'Node labels'),fn:()=>{settings.labels=!settings.labels;saveSettings();}},{label:ck(settings.grid,'Preview grid'),fn:()=>{settings.grid=!settings.grid;saveSettings();}},'-',{label:'Toggle Debug'+k('toggleDebug'),fn:toggleDebug},{label:'Clear Debug Log',fn:()=>{DBG.length=0;renderDebug();}}]
  };
  const r=btn.getBoundingClientRect();showMenu(r.left,r.bottom+2,M[kind]||[]);
}
// Top menus replaced by ribbon + overflow (⋯)

