// BLOCK LIBRARY — searchable coding-block palette.
// ── BLOCK LIBRARY ──
function renderBlockLibrary(){
  const list=$('block-list');if(!list)return;
  list.innerHTML='';
  const q=blockQuery.trim().toLowerCase();
  const searching=!!q;
  const groups={};
  Object.entries(BLOCKS).forEach(([t,d])=>{
    if(q&&!(d.name+' '+d.kw+' '+d.cat).toLowerCase().includes(q))return;
    (groups[d.cat]||=[]).push([t,d]);
  });
  customBlocks.forEach(cb=>{
    const d=getBlockDef(cb.typeKey);
    if(!d)return;
    if(q&&!(d.name+' '+d.kw+' '+d.cat).toLowerCase().includes(q))return;
    const catName=d.cat||'Custom';
    (groups[catName]||=[]).push([cb.typeKey,d]);
  });
  if(!Object.keys(groups).length){
    list.innerHTML='<div class="bl-empty">No blocks match</div>';return;
  }
  // Persist which categories user opened this session
  window._blOpen = window._blOpen || new Set();
  const catOrder=['Player Controls','Motion','Looks','Effects','Control','Input','Debug','Custom',...customFolders.map(f=>'Custom/'+f.name)];
  const seen=new Set();
  [...catOrder,...Object.keys(groups)].filter(c=>groups[c]&&!seen.has(c)&&seen.add(c)).forEach(cat=>{
    // While searching, auto-expand matching categories; otherwise default closed
    const forceOpen=searching || window._blOpen.has(cat);
    const sec=document.createElement('div');sec.className='bl-cat';
    sec.innerHTML=`<div class="bl-cat-head"><span class="arrow${forceOpen?' open':''}">▶</span>${cat}<span class="cat-count">${groups[cat].length}</span></div><div class="bl-cat-body${forceOpen?'':' collapsed'}"></div>`;
    const body=sec.querySelector('.bl-cat-body'),head=sec.querySelector('.bl-cat-head');
    head.onclick=()=>{
      const a=head.querySelector('.arrow');
      const o=a.classList.toggle('open');
      body.classList.toggle('collapsed',!o);
      if(o)window._blOpen.add(cat);else window._blOpen.delete(cat);
    };
    groups[cat].forEach(([t,d])=>{
      const el=document.createElement('div');el.className='bl-item';el.style.setProperty('--c',d.color);el.draggable=true;
      el.title=d.name+' · '+d.cat+(isCustomType(t)?' (right-click to delete)':'');
      el.innerHTML=`<span class="bi-icon">${d.icon}</span><span class="bi-name">${d.name}</span>`;
      el.onclick=()=>addBlock(t);
      el.ondragstart=e=>{dragNew=t;dragBlk=null;e.dataTransfer.setData('text/plain',t);e.dataTransfer.effectAllowed='copy';};
      el.ondragend=()=>{dragNew=null;};
      if(isCustomType(t)){
        el.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();showMenu(e.clientX,e.clientY,[
          {label:'Edit custom block…',fn:()=>openCustomBlockEditor(t)},
          {label:'Delete custom block',danger:true,fn:()=>deleteCustomBlock(t)}
        ]);};
      }
      body.appendChild(el);
    });
    list.appendChild(sec);
  });
  // folder management strip
  const foot=document.createElement('div');
  foot.style.cssText='padding:8px;border-top:1px solid var(--border);display:flex;gap:6px;flex-wrap:wrap';
  foot.innerHTML=`<button type="button" class="btn btn-ghost sm" onclick="addCustomFolder()">+ Folder</button>`;
  if(customFolders.length){
    customFolders.forEach(f=>{
      const b=document.createElement('button');
      b.className='btn btn-ghost sm';
      b.textContent='✕ '+f.name;
      b.title='Delete folder';
      b.onclick=()=>{
        if(!confirm('Delete folder "'+f.name+'"? Blocks move to Custom.'))return;
        customBlocks.forEach(cb=>{if(cb.folderId===f.id)cb.folderId=null;});
        customFolders=customFolders.filter(x=>x.id!==f.id);
        renderBlockLibrary();
      };
      foot.appendChild(b);
    });
  }
  list.appendChild(foot);
}

