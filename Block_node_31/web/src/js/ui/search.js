// ── SEARCH ──
function clearSearch(id){const i=$(id);if(i && i.value){i.value='';i.dispatchEvent(new Event('input'));}}
[['tree-search',v=>{treeQuery=v;renderSceneTree();}],['block-search',v=>{blockQuery=v;renderBlockLibrary();}],['scenes-search',v=>{scenesQuery=v;if(typeof renderScenesList==='function')renderScenesList();}]].forEach(([id,fn])=>{
  const i=$(id);if(!i)return;
  i.addEventListener('input',()=>{i.parentElement.classList.toggle('has-value',!!i.value);fn(i.value);});
  i.addEventListener('keydown',e=>{if(e.key==='Escape'){clearSearch(id);i.blur();}});
});
document.querySelectorAll('[data-clear]').forEach(b=>b.onclick=()=>{clearSearch(b.dataset.clear);$(b.dataset.clear)?.focus();});
const treeSearchEl = $('tree-search');
if (treeSearchEl) treeSearchEl.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();e.target.blur();}
  if(e.key!=='Enter')return;
  const q=treeQuery.trim().toLowerCase();if(!q)return;
  const sc = activeScene();
  if (sc) {
    const n = sc.nodes.find(x => matchNode(x, q));
    if (n) { selectNode(n.id, sc.id); return; }
  }
});
const assetSearchEl = $('asset-search');
if (assetSearchEl) assetSearchEl.addEventListener('input',e=>{e.target.parentElement.classList.toggle('has-value',!!e.target.value);assetQuery=e.target.value;renderAssets();});
