// BLOCK CANVAS — renders the coding workspace.
// ── RENDER CANVAS ──
function renderCanvas(){
  const lib=$('block-library'),ws=$('script-workspace'),empty=$('canvas-empty'),bar=$('canvas-target');
  const sc=activeScene(),node=selectedNode();
  // clear tracks
  if(ws)ws.querySelectorAll('.sgroup,.add-group-btn').forEach(e=>e.remove());
  if(node){
    const G=ensureGroups(node);
    const L=linesOf(node);
    bar.innerHTML=`<span>Script on <b>${esc(node.name)}</b> · ${node.type} · ${L.length} track(s)</span><span style="flex:1"></span><button class="btn btn-ghost sm" onclick="addGroup()">+ Group</button><button class="btn btn-ghost sm${showCode?' on':''}" onclick="showCode=!showCode;renderCanvas()">&lt;/&gt;</button>`;
    if(lib)lib.classList.remove('hidden');
    renderBlockLibrary();
  } else {
    bar.innerHTML='No node selected';
    if(lib)lib.classList.add('hidden');
  }
  $('code-view').style.display=node&&showCode?'block':'none';
  const msg=(t,h)=>{if(empty){empty.style.display='flex';empty.querySelector('.canvas-empty-text').textContent=t;empty.querySelector('.canvas-empty-hint').textContent=h;}};
  if(!sc){if(lib)lib.classList.add('hidden');return msg('No scene open','Create a scene with the + button');}
  if(!node){if(lib)lib.classList.add('hidden');return msg('No node selected','Pick a node in the scene tree');}
  if(empty)empty.style.display='none';

  const G=ensureGroups(node);
  G.forEach(g=>{
    const tracks=linesOf(node).filter(l=>l.groupId===g.id);
    const gEl=document.createElement('div');
    gEl.className='sgroup'+(g.collapsed?' collapsed':'');
    const gCol=g.color||'#3a3e52';
    gEl.style.borderColor=gCol;
    gEl.style.boxShadow=`inset 3px 0 0 ${gCol}`;
    gEl.innerHTML=`
      <div class="sgroup-head" style="border-left:3px solid ${gCol}">
        <span class="sgroup-arr ${g.collapsed?'':'open'}">▶</span>
        <input class="sgroup-name" value="${esc(g.name)}" onclick="event.stopPropagation()" onchange="renameGroup('${g.id}',this.value)">
        <span class="sgroup-meta">${tracks.length} track${tracks.length!==1?'s':''} · ${tracks.reduce((s,t)=>s+t.blocks.length,0)} blk</span>
        <input type="color" title="Group color" value="${gCol.startsWith('#')&&gCol.length===7?gCol:'#5b8dee'}" style="width:22px;height:22px;padding:0;border:1px solid var(--border);border-radius:4px;background:none;cursor:pointer;flex-shrink:0" onclick="event.stopPropagation()" oninput="setGroupColor('${g.id}',this.value)">
        <div class="sgroup-actions">
          <button title="Add track" onclick="event.stopPropagation();addLine('${g.id}')">+</button>
          <button title="Copy group" onclick="event.stopPropagation();copyGroup('${g.id}')">⧉</button>
          <button title="Make custom block" onclick="event.stopPropagation();groupToCustomBlock('${g.id}')">◆</button>
          <button class="danger" title="Delete group" onclick="event.stopPropagation();removeGroup('${g.id}')">✕</button>
        </div>
      </div>
      <div class="sgroup-body"></div>`;
    gEl.querySelector('.sgroup-head').onclick=e=>{
      if(e.target.closest('input,button'))return;
      toggleGroup(g.id);
    };
    const body=gEl.querySelector('.sgroup-body');
    if(!g.collapsed){
      tracks.forEach(l=>body.appendChild(buildTrack(node,l)));
      const addRow=document.createElement('div');addRow.className='add-track-row';
      addRow.innerHTML=`<button class="add-track-btn" onclick="addLine('${g.id}')">+ Add Track</button>`;
      body.appendChild(addRow);
    }
    ws.appendChild(gEl);
  });
  const addG=document.createElement('div');addG.className='add-group-btn';addG.textContent='+ Add Group';addG.onclick=addGroup;
  ws.appendChild(addG);
  if(groupClipboard){
    const paste=document.createElement('div');paste.className='add-group-btn';paste.style.marginTop='4px';paste.textContent='Clipboard: Paste Group';paste.onclick=pasteGroup;
    ws.appendChild(paste);
  }
  updateCode();
  renderScriptProps();
}

