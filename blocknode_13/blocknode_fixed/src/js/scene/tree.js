// ── SCENE TREE ──
function renderSceneTree(){
  const tree=$('scene-tree'); tree.innerHTML=''; visibleOrder=[];
  if(!scenes.length){tree.innerHTML='<div class="tree-none">No scenes yet.<br><br><span onclick="openNewSceneModal()" style="color:var(--accent-teal);cursor:pointer">+ Create a scene</span></div>';return;}
  const q=treeQuery.trim().toLowerCase(); let shown=0;
  scenes.forEach(sc=>{
    const sceneHit=q&&sc.name.toLowerCase().includes(q); let vis=null;
    if(q&&!sceneHit){vis=new Set();sc.nodes.forEach(n=>{if(matchNode(n,q))for(let c=n;c;c=sc.nodes.find(x=>x.id===c.parentId))vis.add(c.id);});if(!vis.size)return;}
    shown++;
    const open=q||!collapsed.has(sc.id);
    const head=document.createElement('div'); head.className='scene-head'+(sc.id===activeSceneId?' active':'');
    head.innerHTML=`<span class="expand-arrow${open?' open':''}">▶</span><span class="scene-name">${hl(sc.name,q)}.bscn</span><button class="icon-btn scene-x-btn" data-tip="Close scene">✕</button>`;
    head.onclick=()=>{if(sc.id!==activeSceneId)setActiveScene(sc.id);else{collapsed.has(sc.id)?collapsed.delete(sc.id):collapsed.add(sc.id);renderSceneTree();}};
    head.querySelector('.scene-x-btn').onclick=e=>{e.stopPropagation();closeScene(sc.id);};
    head.oncontextmenu=e=>{e.preventDefault();showMenu(e.clientX,e.clientY,[{label:'Rename Scene',fn:()=>startRename(head.querySelector('.scene-name'),sc.name,v=>{sc.name=v;renderTabs();renderSceneTree();})},'-',{label:'Close Scene',danger:true,fn:()=>closeScene(sc.id)}]);};
    tree.appendChild(head);
    if(open)walk(sc,sc.rootNode,0,vis,q,tree);
  });
  if(!shown)tree.innerHTML='<div class="tree-none">No matches for "'+esc(treeQuery)+'"</div>';
}
function walk(sc,id,depth,vis,q,tree){
  const n=sc.nodes.find(x=>x.id===id); if(!n||(vis&&!vis.has(id)))return;
  const kids=childrenOf(sc,id), isOpen=q||!collapsed.has(id); visibleOrder.push(id);
  const row=document.createElement('div'); row.className='scene-item'+(n.id===selectedNodeId?' selected':''); row.dataset.node=id; row.setAttribute('data-tip', n.type+' · '+n.name); row.title=n.type+' — '+n.name;
  const scale = (typeof settings!=='undefined' && settings.scale) ? settings.scale : 1;
  const indent = ((typeof settings!=='undefined' && settings.indentSize) ? settings.indentSize : 14) * scale;
  row.style.paddingLeft=(Math.round(10*scale)+depth*indent)+'px';
  const total=descendants(sc,id).length;
  const typeHint = (typeof settings!=='undefined' && settings.showNodeTypeInTree) ? `<span class="scene-type">${esc(n.type)}</span>` : '';
  row.innerHTML=`<span class="expand-arrow${kids.length&&isOpen?' open':''}">${kids.length?'▶':''}</span><div class="node-icon ${n.type.toLowerCase()}">${NODE_TYPES[n.type]||'◈'}</div><span class="scene-name">${hl(n.name,q)}${typeHint}</span>${kids.length&&!isOpen?`<span class="scene-badge">${total}</span>`:''}`;
  row.querySelector('.expand-arrow').onclick=e=>{e.stopPropagation();if(kids.length){collapsed.has(id)?collapsed.delete(id):collapsed.add(id);renderSceneTree();}};
  row.onclick=()=>selectNode(id,sc.id);
  row.ondblclick=()=>renameNode(sc,n,row.querySelector('.scene-name'));
  row.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();selectNode(id,sc.id);const isRoot=id===sc.rootNode;showMenu(e.clientX,e.clientY,[
    {label:'Add Child Node…',fn:()=>showAddMenu(null,id)},
    '-',
    {label:'Rename Node   F2',fn:renameSelected},
    {label:'Change Node Type…',fn:()=>changeNodeType(id)},
    ...(isRoot?[]:[
      {label:'Duplicate   Ctrl+D',fn:()=>duplicateNode(id)},
      '-',
      {label:'Delete Node   Del',danger:true,fn:()=>deleteNode(id)}
    ])
  ]);};
  if(id!==sc.rootNode){row.draggable=true;row.ondragstart=e=>{dragNode={sc:sc.id,id};e.dataTransfer.setData('text/plain',id);row.classList.add('dragging');};row.ondragend=()=>{dragNode=null;document.querySelectorAll('.drop-target,.dragging').forEach(el=>el.classList.remove('drop-target','dragging'));};};
  const canDrop=()=>dragNode&&dragNode.sc===sc.id&&dragNode.id!==id&&!descendants(sc,dragNode.id).includes(id);
  row.ondragover=e=>{if(canDrop()){e.preventDefault();row.classList.add('drop-target');}};
  row.ondragleave=()=>row.classList.remove('drop-target');
  row.ondrop=e=>{e.preventDefault();if(canDrop())reparent(sc,dragNode.id,id);};
  tree.appendChild(row);
  if(isOpen)kids.forEach(k=>walk(sc,k.id,depth+1,vis,q,tree));
}

