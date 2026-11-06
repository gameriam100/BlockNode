// ── SCENES ──
function openNewSceneModal(){$('modal-overlay').classList.add('show');const i=$('scene-name-input');i.focus();i.select();}
function closeModal(){$('modal-overlay').classList.remove('show');}
function confirmNewScene(){try{const name=($("scene-name-input")&&$("scene-name-input").value.trim())||"Scene";const rootType=($("scene-root-select")&&$("scene-root-select").value)||"Node2D";createScene(name,rootType);}catch(err){console.error(err);if(typeof setStatus==="function")setStatus("Failed to create scene");}finally{closeModal();}}
function createScene(name,rootType){
  const root={id:uid('n'),name:rootType,type:rootType,parentId:null,props:defaultProps(rootType),lines:[]};
  root.lines=[{id:uid('l'),name:'Line 1',rep:1,blocks:[]}];
  const sc={id:uid('s'),name,rootNode:root.id,nodes:[root]};
  scenes.push(sc); setActiveScene(sc.id); if(typeof setLeftSection==="function") setLeftSection("tree", true);
}
function setActiveScene(id){activeSceneId=id;selectedNodeId=activeScene()?.rootNode||null;renderTabs();refresh();}
function closeScene(id){scenes=scenes.filter(s=>s.id!==id);if(activeSceneId===id){activeSceneId=scenes.length?scenes[scenes.length-1].id:null;selectedNodeId=activeScene()?.rootNode||null;}renderTabs();refresh();}
function refresh(){if(typeof renderScenesList==="function")renderScenesList();renderSceneTree();renderCanvas();renderInspector();if(typeof renderScriptProps==="function")renderScriptProps();renderViewTabs();renderAssets();}
function selectNode(id,sceneId){if(sceneId&&sceneId!==activeSceneId){activeSceneId=sceneId;renderTabs();}selectedNodeId=id;selectedBlockId=null;activeLineId=null;refresh();document.querySelector('.scene-item.selected')?.scrollIntoView({block:'nearest'});}

// ── NODES ──
function addNode(type='Sprite2D',parentId){const sc=activeScene();if(!sc){openNewSceneModal();return;}parentId=parentId||selectedNodeId||sc.rootNode;const node={id:uid('n'),name:uniqueName(sc,parentId,type),type,parentId,props:defaultProps(type),lines:[{id:uid('l'),name:'Line 1',rep:1,blocks:[]}]};sc.nodes.push(node);collapsed.delete(parentId);clearSearch('tree-search');selectNode(node.id);}
function deleteNode(id=selectedNodeId){const sc=activeScene(),n=sc?.nodes.find(x=>x.id===id);if(!n||n.id===sc.rootNode)return;const gone=new Set([id,...descendants(sc,id)]);sc.nodes=sc.nodes.filter(x=>!gone.has(x.id));selectNode(n.parentId);}
function cloneInto(sc,node,parentId){const c=JSON.parse(JSON.stringify({...node,lines:linesOf(node)},(k,v)=>k[0]==='_'?undefined:v));Object.assign(c,{id:uid('n'),parentId,name:uniqueName(sc,parentId,node.name.replace(/\d+$/,'')||node.name)});c.lines.forEach(l=>{l.id=uid('l');l.blocks.forEach(b=>b.id=uid('b'));});const kids=childrenOf(sc,node.id);sc.nodes.push(c);kids.forEach(k=>cloneInto(sc,k,c.id));return c;}
function duplicateNode(id=selectedNodeId){const sc=activeScene(),n=sc?.nodes.find(x=>x.id===id);if(!n||n.id===sc.rootNode)return;selectNode(cloneInto(sc,n,n.parentId).id);}
function reparent(sc,id,newParentId){const n=sc.nodes.find(x=>x.id===id);if(!n||id===newParentId||n.parentId===newParentId||descendants(sc,id).includes(newParentId))return;n.parentId=newParentId;n.name=uniqueName(sc,newParentId,n.name,n.id);collapsed.delete(newParentId);selectNode(id);}
function toggleAll(){const sc=activeScene();if(!sc)return;const parents=sc.nodes.filter(n=>childrenOf(sc,n.id).length&&n.id!==sc.rootNode);const anyOpen=parents.some(n=>!collapsed.has(n.id));parents.forEach(n=>anyOpen?collapsed.add(n.id):collapsed.delete(n.id));renderSceneTree();}
function startRename(el,cur,commit){const inp=document.createElement('input');inp.className='rename-input';inp.value=cur;el.replaceWith(inp);inp.focus();inp.select();let done=false;const fin=ok=>{if(done)return;done=true;if(ok&&inp.value.trim())commit(inp.value.trim());else renderSceneTree();};inp.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')fin(true);if(e.key==='Escape')fin(false);};inp.onblur=()=>fin(true);inp.onclick=inp.ondblclick=e=>e.stopPropagation();}
function renameNode(sc,n,span){startRename(span,n.name,v=>{n.name=uniqueName(sc,n.parentId,v,n.id);refresh();});}
function renameSelected(){const n=selectedNode(),span=document.querySelector('.scene-item.selected .scene-name');if(n&&span)renameNode(activeScene(),n,span);}

function changeNodeType(id){
  const sc=activeScene(), n=sc?.nodes.find(x=>x.id===(id||selectedNodeId));
  if(!n) return;
  // Reuse the add-node picker UI, but in "change type" mode
  _changeTypeNodeId = n.id;
  _addNodeParentId = null;
  _addNodeQuery = '';
  openChangeTypePicker();
}

let _changeTypeNodeId = null;

function openChangeTypePicker(){
  let overlay = $('change-type-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'change-type-overlay';
    overlay.className = 'add-node-overlay';
    overlay.innerHTML = `
      <div class="add-node-panel" role="dialog" aria-label="Change Node Type">
        <div class="add-node-header">
          <div class="add-node-title">Change Node Type</div>
          <button type="button" class="add-node-close" title="Close" aria-label="Close">✕</button>
        </div>
        <div class="add-node-search">
          <span class="add-node-search-icon">⌕</span>
          <input type="text" id="change-type-search-input" placeholder="Search types…" autocomplete="off" spellcheck="false"/>
          <button type="button" class="add-node-search-clear" title="Clear" style="display:none">✕</button>
        </div>
        <div class="add-node-grid" id="change-type-grid"></div>
        <div class="add-node-hint">Pick a new type. Name and children are kept; properties are reset to defaults for the new type.</div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', ev => { if(ev.target === overlay) closeChangeTypePicker(); });
    overlay.querySelector('.add-node-close').onclick = closeChangeTypePicker;
    const inp = overlay.querySelector('#change-type-search-input');
    const clearBtn = overlay.querySelector('.add-node-search-clear');
    inp.addEventListener('input', () => {
      _addNodeQuery = inp.value;
      clearBtn.style.display = inp.value ? 'block' : 'none';
      renderChangeTypeGrid();
    });
    inp.addEventListener('keydown', ev => {
      if(ev.key === 'Escape'){ closeChangeTypePicker(); return; }
      if(ev.key === 'Enter'){
        const first = overlay.querySelector('.add-node-card');
        if(first) first.click();
      }
    });
    clearBtn.onclick = () => {
      inp.value = '';
      _addNodeQuery = '';
      clearBtn.style.display = 'none';
      renderChangeTypeGrid();
      inp.focus();
    };
  }
  renderChangeTypeGrid();
  overlay.classList.add('show');
  requestAnimationFrame(() => {
    const inp = $('change-type-search-input');
    if(inp){ inp.value = ''; inp.focus(); }
  });
}

function closeChangeTypePicker(){
  const overlay = $('change-type-overlay');
  if(overlay) overlay.classList.remove('show');
  _changeTypeNodeId = null;
  _addNodeQuery = '';
}

function renderChangeTypeGrid(){
  const grid = $('change-type-grid');
  if(!grid) return;
  grid.innerHTML = '';
  const sc = activeScene();
  const n = sc?.nodes.find(x => x.id === _changeTypeNodeId);
  const q = (_addNodeQuery || '').trim().toLowerCase();
  const types = Object.keys(NODE_TYPES).filter(t => {
    if(n && t === n.type) return false;
    if(!q) return true;
    const info = NODE_INFO[t] || {};
    return (t + ' ' + (info.desc || '')).toLowerCase().includes(q);
  });
  if(!types.length){
    grid.innerHTML = '<div class="add-node-empty">No types match “' + esc(_addNodeQuery) + '”</div>';
    return;
  }
  types.forEach(t => {
    const info = NODE_INFO[t] || { icon: NODE_TYPES[t] || '◈', color: '#8ab8f5', desc: '' };
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'add-node-card';
    card.style.setProperty('--nc', info.color);
    card.innerHTML = `
      <div class="add-node-card-icon">${info.icon}</div>
      <div class="add-node-card-body">
        <div class="add-node-card-name">${esc(t)}</div>
        <div class="add-node-card-desc">${esc(info.desc || '')}</div>
      </div>`;
    card.onclick = () => {
      applyNodeTypeChange(_changeTypeNodeId, t);
      closeChangeTypePicker();
    };
    grid.appendChild(card);
  });
}

function applyNodeTypeChange(id, newType){
  const sc = activeScene();
  const n = sc?.nodes.find(x => x.id === id);
  if(!n || !NODE_TYPES[newType] || n.type === newType) return;
  // Keep identity, parent, children, name, and script lines; reset props to new type defaults
  const oldName = n.name;
  n.type = newType;
  n.props = defaultProps(newType);
  // Preserve position/scale/rotation if present on both
  // (defaultProps already includes common transform fields)
  n.name = uniqueName(sc, n.parentId, oldName.replace(/\d+$/,'') || newType, n.id);
  // Force unique if we kept a number suffix that collides
  if(sc.nodes.some(x => x.id !== n.id && x.parentId === n.parentId && x.name === n.name)){
    n.name = uniqueName(sc, n.parentId, newType, n.id);
  }
  selectNode(n.id);
  setStatus('Changed type to ' + newType);
}

