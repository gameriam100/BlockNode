// ── INIT ──
applySettings();
setView('split');
drawPreview();
requestAnimationFrame(dbgTick);
(function restoreProject(){
  try{
    const raw=localStorage.getItem('blockode.project');
    if(!raw){createScene('MainScene','Node2D');addNode('Sprite2D');selectNode(activeScene().rootNode);return;}
    const d=JSON.parse(raw);
    if(!Array.isArray(d.scenes)||!d.scenes.length){createScene('MainScene','Node2D');addNode('Sprite2D');selectNode(activeScene().rootNode);return;}
    scenes=d.scenes;assets=d.assets||[];ART.loadData(d.art);AUDIO.loadData(d.audio);customBlocks=Array.isArray(d.customBlocks)?d.customBlocks:[];customFolders=Array.isArray(d.customFolders)?d.customFolders:[];
    assets.forEach(a=>{if(a.url&&(a.type==='image'||!a.type)){const im=new Image();im.src=a.url;imgCache[a.id]=im;}});
    idCounter=Math.max(idCounter||0,...[...raw.matchAll(/"[nbsa](\d+)"/g)].map(m=>+m[1]),1);
    activeSceneId=scenes.some(x=>x.id===d.activeSceneId)?d.activeSceneId:scenes[0]?.id||null;
    selectedNodeId=activeScene()?.nodes?.find(n=>n.id===d.selectedNodeId)?.id||activeScene()?.rootNode||null;
    renderTabs();refresh();setStatus('Restored session');
  }catch(e){createScene('MainScene','Node2D');addNode('Sprite2D');selectNode(activeScene().rootNode);}
})();
// toggle debug gutter visibility
{const origToggle=toggleDebug;window.toggleDebug=()=>{origToggle();GUT.dh.classList.toggle('hide',!$('debug-panel').classList.contains('open'));};}
