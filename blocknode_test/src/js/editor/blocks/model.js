// BLOCK MODEL — coding block data, editing actions, groups, and custom blocks.
// ── BLOCKS ──
function defaultBlockValues(type,node){
  const p=node.props;
  if(isCustomType(type)){
    const cb=getCustomDef(type);
    const vals={};
    (cb?.params||[]).forEach(pr=>{vals[pr.key]=pr.def??0;});
    const td=(cb?.template?.blocks||[]).reduce((s,b)=>s+Math.max(0,+(b.values?.t??b.values?.s??DUR)||0),0);
    vals.t=td||DUR;
    return vals;
  }
  const v={
    position:{x:(p.x||0)+100,y:p.y||0},moveby:{x:100,y:0},forward:{dist:120},velocity:{vx:120,vy:0},
    rotation:{deg:(p.rotation||0)+90},rotateby:{deg:90},scale:{x:1.5,y:1.5},scaleby:{x:1.5,y:1.5},
    color:{hex:'#ff5555'},opacity:{a:50},shake:{amt:10},pulse:{f:1.3},bounce:{h:40},
    wait:{},log:{msg:'Hello'},watch:{},visible:{},repeat:{n:3},
    if_gate:{conds:[{op:'always'}]},if_end:{},
    key_held:{key:'ArrowRight'},key_pressed:{key:'Space'},tap:{},
    platformer:{speed:180,jump:320,grav:900},grid_move:{size:32,speed:8},
    shooter:{speed:160,turn:240},tank:{speed:120,turn:180},
    point_click:{speed:140},physics:{accel:600,fric:4,max:220}
  }[type];
  // velocity / forward / rotateby are continuous (player controls) — no duration needed
  const instant=new Set(['log','watch','visible','if_gate','if_end','key_held','key_pressed','tap','velocity','forward','rotateby','platformer','grid_move','shooter','tank','point_click','physics']);
  return{...(v||{}),t:type==='wait'?1:(instant.has(type)?0:DUR)};
}

function ensureGroups(n){
  if(!n.scriptGroups||!n.scriptGroups.length){
    n.scriptGroups=[{id:uid('g'),name:'Main',collapsed:false,color:'#3a3e52'}];
  }
  const valid=new Set(n.scriptGroups.map(g=>g.id));
  const def=n.scriptGroups[0].id;
  linesOf(n).forEach(l=>{if(!l.groupId||!valid.has(l.groupId))l.groupId=def;});
  return n.scriptGroups;
}

function addBlock(type,lineId,idx){
  const node=selectedNode();if(!node)return setStatus('Select a node first');
  ensureGroups(node);
  const L=linesOf(node);
  let line=L.find(l=>l.id===(lineId||activeLineId));
  if(!line)line=L[0];
  if(!line){addLine();line=linesOf(node)[0];}
  const b={id:uid('b'),type,values:defaultBlockValues(type,node)};
  if(type==='if_gate'&&!b.values.conds)b.values.conds=[{op:'always'}];
  idx==null?line.blocks.push(b):line.blocks.splice(idx,0,b);
  activeLineId=line.id;selectedBlockId=b.id;
  renderCanvas();renderScriptProps();
}
function removeBlock(id){
  const n=selectedNode();if(!n)return;
  linesOf(n).forEach(l=>l.blocks=l.blocks.filter(b=>b.id!==id));
  if(selectedBlockId===id)selectedBlockId=null;
  renderCanvas();renderScriptProps();
}
function setBlockVal(id,key,val){
  const n=selectedNode(),b=n&&linesOf(n).flatMap(l=>l.blocks).find(x=>x.id===id);if(!b)return;
  b.values[key]=key==='hex'||key==='msg'?val:key==='t'?Math.max(0,parseFloat(val)||0):(parseFloat(val)||0);
  updateCode();renderScriptProps();
}
function addLine(groupId){
  const n=selectedNode();if(!n)return;
  const G=ensureGroups(n);
  const gid=groupId||(activeLineId&&linesOf(n).find(l=>l.id===activeLineId)?.groupId)||G[0].id;
  const g=G.find(x=>x.id===gid)||G[0];
  g.collapsed=false;
  const L=linesOf(n);
  const l={id:uid('l'),name:'Track '+(L.filter(x=>x.groupId===g.id).length+1),rep:1,blocks:[],groupId:g.id};
  L.push(l);activeLineId=l.id;renderCanvas();
}
function removeLine(id){
  const n=selectedNode();if(!n)return;
  const L=linesOf(n);
  if(L.length===1){L[0].blocks=[];}else n.lines=L.filter(l=>l.id!==id);
  if(activeLineId===id)activeLineId=null;
  renderCanvas();
}
function setLine(id,k,v){
  const n=selectedNode(),l=n&&linesOf(n).find(x=>x.id===id);if(!l)return;
  l[k]=v;if(k!=='name')renderCanvas();else updateCode();
}
function addGroup(){
  const n=selectedNode();if(!n)return;
  const G=ensureGroups(n);
  const g={id:uid('g'),name:'Group '+(G.length+1),collapsed:false,color:'#5b8dee'};
  G.push(g);
  addLine(g.id);
}
function removeGroup(gid){
  const n=selectedNode();if(!n)return;
  const G=ensureGroups(n);
  if(G.length<=1)return setStatus('Need at least one group');
  const def=G.find(g=>g.id!==gid).id;
  linesOf(n).forEach(l=>{if(l.groupId===gid)l.groupId=def;});
  n.scriptGroups=G.filter(g=>g.id!==gid);
  renderCanvas();
}
function renameGroup(gid,name){
  const n=selectedNode();if(!n)return;
  const g=ensureGroups(n).find(x=>x.id===gid);if(g)g.name=name.trim()||g.name;
}
function toggleGroup(gid){
  const n=selectedNode();if(!n)return;
  const g=ensureGroups(n).find(x=>x.id===gid);if(g){g.collapsed=!g.collapsed;renderCanvas();}
}
function setGroupColor(gid,color){
  const n=selectedNode();if(!n)return;
  const g=ensureGroups(n).find(x=>x.id===gid);if(g){g.color=color;renderCanvas();}
}
function snapshotGroup(n,g){
  const tracks=linesOf(n).filter(l=>l.groupId===g.id);
  return{
    name:g.name,
    color:g.color||'#3a3e52',
    tracks:tracks.map(t=>({
      name:t.name,rep:t.rep,off:!!t.off,
      blocks:t.blocks.map(b=>({type:b.type,values:{...b.values}}))
    })),
    // flat blocks for custom block macro (first track preferred, else merge)
    blocks:tracks.flatMap(t=>t.blocks.map(b=>({type:b.type,values:{...b.values}})))
  };
}
function copyGroup(gid){
  const n=selectedNode();if(!n)return;
  const g=ensureGroups(n).find(x=>x.id===gid);if(!g)return;
  groupClipboard=snapshotGroup(n,g);
  setStatus('Group copied: '+g.name);
}
function pasteGroup(){
  const n=selectedNode();if(!n)return setStatus('Select a node first');
  if(!groupClipboard)return setStatus('Nothing to paste');
  const G=ensureGroups(n);
  const g={id:uid('g'),name:(groupClipboard.name||'Group')+' copy',collapsed:false,color:groupClipboard.color||'#3a3e52'};
  G.push(g);
  (groupClipboard.tracks||[]).forEach((t,i)=>{
    linesOf(n).push({
      id:uid('l'),name:t.name||('Track '+(i+1)),rep:t.rep??1,off:!!t.off,groupId:g.id,
      blocks:(t.blocks||[]).map(b=>({id:uid('b'),type:b.type,values:{...b.values}}))
    });
  });
  if(!(groupClipboard.tracks||[]).length){
    linesOf(n).push({id:uid('l'),name:'Track 1',rep:1,blocks:[],groupId:g.id});
  }
  renderCanvas();
  setStatus('Group pasted');
}
function groupToCustomBlock(gid){
  const n=selectedNode();if(!n)return;
  const g=ensureGroups(n).find(x=>x.id===gid);if(!g)return;
  const snap=snapshotGroup(n,g);
  if(!snap.blocks.length)return setStatus('Group has no blocks');
  const name=prompt('Custom block name:', g.name||'My Block');
  if(!name||!name.trim())return;
  const color=g.color&&g.color!=='#3a3e52'?g.color:'#c77dff';
  const id=uid('cb');
  const typeKey='custom_'+id;
  const cb={
    id,typeKey,name:name.trim(),icon:'◆',color,params:[],
    template:{name:name.trim(),blocks:snap.blocks.map(b=>({type:b.type,values:{...b.values}})),tracks:snap.tracks}
  };
  customBlocks.push(cb);
  renderBlockLibrary();
  setStatus('Custom block created — open editor to bind parameters');
  openCustomBlockEditor(typeKey);
}
function deleteCustomBlock(typeKey){
  const cb=getCustomDef(typeKey);
  if(!cb)return;
  if(!confirm('Delete custom block "'+cb.name+'"? Placed instances will remain but may not resolve.'))return;
  customBlocks=customBlocks.filter(c=>c.typeKey!==typeKey);
  if(editingCustomKey===typeKey)closeCustomBlockEditor();
  renderBlockLibrary();
  setStatus('Custom block deleted');
}

/** Apply parameter bindings onto a copy of template blocks */
function resolveCustomBlocks(cb, instanceValues){
  const vals=instanceValues||{};
  return (cb.template?.blocks||[]).map((tb,idx)=>{
    const values={...(tb.values||{})};
    (cb.params||[]).forEach(p=>{
      const v=vals[p.key]!==undefined?vals[p.key]:p.def;
      (p.bindings||[]).forEach(b=>{
        if((b.blockIdx??0)!==idx)return;
        const field=b.field||'t';
        values[field]=typeof v==='number'?v:(parseFloat(v)||0);
      });
    });
    return{type:tb.type,values};
  });
}

let editingCustomKey=null;
function openCustomBlockEditor(typeKey){
  const cb=getCustomDef(typeKey);if(!cb)return;
  editingCustomKey=typeKey;
  showCustomEditorModal(cb);
}
function closeCustomBlockEditor(){
  editingCustomKey=null;
  const m=$('custom-editor-overlay');
  if(m)m.classList.remove('show');
}
function showCustomEditorModal(cb){
  let overlay=$('custom-editor-overlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='custom-editor-overlay';
    overlay.className='modal-overlay';
    overlay.innerHTML=`<div class="modal" style="width:min(640px,96vw);max-height:90vh;overflow:auto">
      <div class="modal-title">Edit Custom Block</div>
      <div id="custom-editor-body"></div>
      <div class="modal-actions" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="closeCustomBlockEditor()">Close</button>
        <button class="btn" style="background:var(--accent-teal);color:#111" onclick="saveCustomEditor()">Save</button>
      </div>
    </div>`;
    /* do not close on outside click — only Close/Save */
    document.body.appendChild(overlay);
  }
  const body=$('custom-editor-body');
  const blocks=cb.template?.blocks||[];
  window._ceBlocks=blocks;
  window._ceParams=JSON.parse(JSON.stringify(cb.params||[]));
  window._ceFieldMap={}; // "blockIdx.field" -> paramKey or ""
  (cb.params||[]).forEach(p=>{
    (p.bindings||[]).forEach(b=>{
      window._ceFieldMap[`${b.blockIdx}.${b.field}`]=p.key;
    });
  });
  let html=`<div class="srow"><label>Name</label><input id="ce-name" value="${esc(cb.name)}" style="flex:1;padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:var(--bg-deepest);color:var(--text-primary)"/></div>`;
  html+=`<div class="srow"><label>Color</label><input id="ce-color" type="color" value="${cb.color||'#c77dff'}"/></div>`;
  html+=`<div class="srow"><label>Folder</label><select id="ce-folder" style="flex:1;padding:6px;border-radius:6px;border:1px solid var(--border);background:var(--bg-deepest);color:var(--text-primary)"><option value="">(none)</option>${customFolders.map(f=>`<option value="${f.id}" ${cb.folderId===f.id?'selected':''}>${esc(f.name)}</option>`).join('')}</select></div>`;
  html+=`<div style="margin:12px 0 6px;font-size:12px;font-weight:600;color:var(--text-secondary)">Parameters</div>`;
  html+=`<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Create parameters, then bind any property of any inner block to a parameter.</div>`;
  html+=`<div id="ce-params"></div>`;
  html+=`<button class="btn btn-ghost sm" type="button" onclick="ceAddParam()" style="margin:6px 0">+ Add parameter</button>`;
  html+=`<div style="margin:14px 0 6px;font-size:12px;font-weight:600;color:var(--text-secondary)">Bind block properties → parameters</div>`;
  html+=`<div id="ce-matrix" style="display:flex;flex-direction:column;gap:8px"></div>`;
  body.innerHTML=html;
  renderCeParams();
  renderCeMatrix();
  overlay.classList.add('show');
}
function fieldsForBlock(b){
  const d=getBlockDef(b.type);
  const fields=[{key:'t',label:'time (s)'}];
  if(d&&d.fields)d.fields.forEach(([k,lab])=>fields.push({key:k,label:lab}));
  // also include any keys already on values
  Object.keys(b.values||{}).forEach(k=>{if(!fields.some(f=>f.key===k)&&k!=='s')fields.push({key:k,label:k});});
  return fields;
}
function renderCeParams(){
  const wrap=$('ce-params');if(!wrap)return;
  wrap.innerHTML='';
  (window._ceParams||[]).forEach((p,pi)=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:6px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-panel)';
    row.innerHTML=`
      <input data-k="label" value="${esc(p.label||p.key)}" placeholder="Name" style="flex:1;padding:5px 6px;border-radius:4px;border:1px solid var(--border);background:var(--bg-deepest);color:var(--text-primary);font-size:12px"/>
      <label style="font-size:11px;color:var(--text-muted)">default</label>
      <input data-k="def" type="number" step="any" value="${p.def??0}" style="width:72px;padding:5px 6px;border-radius:4px;border:1px solid var(--border);background:var(--bg-deepest);color:var(--text-primary);font-size:12px"/>
      <button type="button" class="btn btn-ghost sm" style="color:var(--accent-red)">✕</button>`;
    row.querySelector('button').onclick=()=>{
      const key=p.key;
      window._ceParams.splice(pi,1);
      Object.keys(window._ceFieldMap||{}).forEach(k=>{if(window._ceFieldMap[k]===key)delete window._ceFieldMap[k];});
      renderCeParams();renderCeMatrix();
    };
    row.querySelectorAll('[data-k]').forEach(inp=>{
      inp.oninput=()=>{
        if(inp.dataset.k==='label'){
          const old=p.key;
          p.label=inp.value;
          p.key=(inp.value||'p').replace(/\W/g,'_').slice(0,16)||'p';
          Object.keys(window._ceFieldMap||{}).forEach(k=>{if(window._ceFieldMap[k]===old)window._ceFieldMap[k]=p.key;});
        } else p.def=parseFloat(inp.value)||0;
        renderCeMatrix();
      };
    });
    wrap.appendChild(row);
  });
}
function renderCeMatrix(){
  const wrap=$('ce-matrix');if(!wrap)return;
  const blocks=window._ceBlocks||[];
  const params=window._ceParams||[];
  wrap.innerHTML='';
  if(!blocks.length){wrap.innerHTML='<div style="color:var(--text-muted);font-size:12px">No inner blocks</div>';return;}
  blocks.forEach((b,bi)=>{
    const d=getBlockDef(b.type);
    const card=document.createElement('div');
    card.style.cssText='border:1px solid var(--border);border-radius:8px;padding:8px 10px;background:var(--bg-panel)';
    card.innerHTML=`<div style="font-size:12px;font-weight:600;color:${d?.color||'var(--text-primary)'};margin-bottom:6px">[${bi}] ${d?.icon||''} ${d?.name||b.type}</div>`;
    const fields=fieldsForBlock(b);
    fields.forEach(f=>{
      const row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:8px;margin:3px 0;font-size:11px';
      const mapKey=bi+'.'+f.key;
      const cur=window._ceFieldMap[mapKey]||'';
      const opts=params.map(p=>`<option value="${p.key}" ${cur===p.key?'selected':''}>${esc(p.label||p.key)}</option>`).join('');
      const fixedVal=b.values&&b.values[f.key]!==undefined?b.values[f.key]:'';
      row.innerHTML=`<span style="width:72px;color:var(--text-muted)">${esc(f.label)}</span>
        <select data-map="${mapKey}" style="flex:1;padding:4px;border-radius:4px;border:1px solid var(--border);background:var(--bg-deepest);color:var(--text-primary)">
          <option value="">Fixed (${fixedVal})</option>${opts}
        </select>`;
      row.querySelector('select').onchange=ev=>{
        const val=ev.target.value;
        if(!val)delete window._ceFieldMap[mapKey];
        else window._ceFieldMap[mapKey]=val;
      };
      card.appendChild(row);
    });
    wrap.appendChild(card);
  });
}
function ceAddParam(){
  window._ceParams=window._ceParams||[];
  const n=window._ceParams.length+1;
  window._ceParams.push({key:'param'+n,label:'param'+n,def:1,bindings:[]});
  renderCeParams();renderCeMatrix();
}
function saveCustomEditor(){
  const cb=getCustomDef(editingCustomKey);if(!cb)return closeCustomBlockEditor();
  cb.name=($('ce-name')?.value||cb.name).trim()||cb.name;
  cb.color=$('ce-color')?.value||cb.color;
  cb.folderId=$('ce-folder')?.value||null;
  // rebuild params with bindings from matrix
  const params=(window._ceParams||[]).map(p=>({key:p.key,label:p.label||p.key,def:p.def??0,bindings:[]}));
  const byKey=Object.fromEntries(params.map(p=>[p.key,p]));
  Object.entries(window._ceFieldMap||{}).forEach(([mapKey,paramKey])=>{
    const p=byKey[paramKey];if(!p)return;
    const [bi,field]=mapKey.split('.');
    p.bindings.push({blockIdx:+bi,field});
  });
  cb.params=params;
  closeCustomBlockEditor();
  renderBlockLibrary();
  setStatus('Custom block saved: '+cb.name);
}
function addCustomFolder(){
  const name=prompt('Folder name:','My Blocks');
  if(!name||!name.trim())return;
  customFolders.push({id:uid('cf'),name:name.trim()});
  renderBlockLibrary();
  setStatus('Folder created');
}

function selectBlock(id){
  selectedBlockId=id;
  // re-render tracks so expanded inline fields appear (Scratch-style)
  renderCanvas();
  renderScriptProps();
}
function toggleBlockLibrary(){
  settings.libCollapsed=!settings.libCollapsed;
  applySettings();saveSettings();
}
function syncLibCollapseClass(){
  const area=$('canvas-area'), lib=$('block-library');
  if(area)area.classList.toggle('lib-collapsed', !!settings.libCollapsed);
  if(lib){
    lib.classList.toggle('collapsed', !!settings.libCollapsed);
    const btn=$('bl-collapse-btn');
    if(btn)btn.textContent=settings.libCollapsed?'▼':'▲';
  }
}
function toggleTreePanel(){
  settings.showLeft=settings.showLeft===false?true:false;
  applySettings();saveSettings();
  const btn=$('rib-tree');if(btn)btn.classList.toggle('on',settings.showLeft!==false);
  if(typeof isMobile==='function'&&isMobile()&&settings.showLeft!==false)toggleMobilePanel('left');
  if(typeof isMobile==='function'&&isMobile()&&settings.showLeft===false)closeMobilePanels();
}
function togglePropsPanel(){
  settings.showRight=settings.showRight===false?true:false;
  applySettings();saveSettings();
  const btn=$('rib-props');if(btn)btn.classList.toggle('on',settings.showRight!==false);
  if(typeof isMobile==='function'&&isMobile()&&settings.showRight!==false)toggleMobilePanel('right');
  if(typeof isMobile==='function'&&isMobile()&&settings.showRight===false)closeMobilePanels();
}
function openTreePanel(){settings.showLeft=true;applySettings();saveSettings();if(typeof isMobile==='function'&&isMobile())toggleMobilePanel('left');}
function openPropsPanel(){settings.showRight=true;applySettings();saveSettings();if(typeof isMobile==='function'&&isMobile())toggleMobilePanel('right');}



