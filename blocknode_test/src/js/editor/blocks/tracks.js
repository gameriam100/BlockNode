// TRACKS — track UI and track drag/drop behavior.
// ── BUILD TRACK ──
function clearDrop(){document.querySelectorAll('.strack.drop').forEach(l=>l.classList.remove('drop'));}

function buildTrack(node,l){
  const isCur=activeLineId===l.id;
  const row=document.createElement('div');
  row.className='strack'+(isCur?' cur':'')+(l.off?' off':'');
  row.dataset.lineId=l.id;
  const repVal = l.rep ?? 1;
  const repLabel = l.off ? 'off' : (repVal === 0 ? '∞' : '×'+repVal);
  row.innerHTML=`
    <div class="strack-label">
      <input class="strack-name" value="${esc(l.name)}" onchange="setLine('${l.id}','name',this.value)">
      <div class="strack-meta" title="Click to change repeat: 1 → 2 → 3 → ∞ → off">
        <span class="rep-btn" style="cursor:pointer;padding:1px 4px;border-radius:3px;background:var(--bg-hover)">${l.blocks.length} blk · ${repLabel}</span>
      </div>
    </div>
    <div class="strack-lane"></div>`;
  const lane=row.querySelector('.strack-lane');
  // Cycle repeat: 1 → 2 → 3 → 0(forever) → off → 1
  const repBtn = row.querySelector('.rep-btn');
  if (repBtn) {
    repBtn.onclick = e => {
      e.stopPropagation();
      if (l.off) { l.off = false; l.rep = 1; }
      else if (repVal === 1) l.rep = 2;
      else if (repVal === 2) l.rep = 3;
      else if (repVal === 3) l.rep = 0;
      else if (repVal === 0) { l.off = true; l.rep = 1; }
      else l.rep = 1;
      renderCanvas();
    };
  }
  if(!l.blocks.length){
    const empty=document.createElement('div');empty.className='strack-empty';empty.textContent='Drop blocks here';lane.appendChild(empty);
  }
  l.blocks.forEach(b=>{
    const d=getBlockDef(b.type);if(!d)return;
    const sel=selectedBlockId===b.id;
    const bar=document.createElement('div');
    bar.className='tblock'+(sel?' selected expanded':'');
    bar.style.setProperty('--c',d.color);
    bar.dataset.bid=b.id;
    bar.draggable=true;
    const v=b.values||{};
    let fields='';
    if(b.type==='color'){
      fields=`<label class="fld"><i>col</i><input type="color" value="${v.hex||'#ff5555'}" oninput="setBlockVal('${b.id}','hex',this.value)"/></label>`;
    } else if(b.type==='log'||b.type==='watch'){
      const lab='msg';
      fields=`<label class="fld wide"><i>${lab}</i><input type="text" value="${esc(v.msg??'')}" onchange="setBlockVal('${b.id}','msg',this.value)" onclick="event.stopPropagation()"/></label>`;
    } else if(d.fields&&d.fields.length){
      fields=d.fields.map(([k,lab])=>`<label class="fld"><i>${lab}</i><input type="number" step="${d.step||1}" value="${v[k]??0}" onchange="setBlockVal('${b.id}','${k}',this.value)" onclick="event.stopPropagation()"/></label>`).join('');
    }
    const noDurInline=new Set(['visible','velocity','forward','rotateby','log','watch','platformer','grid_move','shooter','tank','point_click','physics']);
    const hasDur=b.type!=='visible'&&!String(b.type).startsWith('if_')&&!noDurInline.has(b.type);
    if(hasDur){
      fields+=`<label class="fld tm"><i>⏱</i><input type="number" min="0" step="0.1" value="${bdur(b)}" onchange="setBlockVal('${b.id}','t',this.value)" onclick="event.stopPropagation()"/></label>`;
    }
    bar.innerHTML=`<div class="tb-head"><span class="tb-ico">${d.icon}</span><span class="tb-name">${d.name}</span><button class="tb-x" onclick="event.stopPropagation();removeBlock('${b.id}')">✕</button></div><div class="tb-fields">${fields}</div>`;
    bar.onclick=e=>{
      if(e.target.closest('input,button,label'))return;
      e.stopPropagation();
      activeLineId=l.id;
      selectBlock(sel?null:b.id);
    };
    bar.ondragstart=e=>{
      if(sel){e.preventDefault();return;}
      dragBlk=b.id;dragNew=null;e.dataTransfer.setData('text/plain','block');requestAnimationFrame(()=>bar.classList.add('dragging'));
    };
    bar.ondragend=()=>{dragBlk=null;bar.classList.remove('dragging');clearDrop();};
    lane.appendChild(bar);
  });
  // drop
  lane.ondragover=e=>{
    if(!dragBlk&&!dragNew)return;
    e.preventDefault();e.dataTransfer.dropEffect=dragNew?'copy':'move';
    row.classList.add('drop');
    // highlight insert gap
    const kids=[...lane.querySelectorAll('.tblock')];
    kids.forEach(k=>k.classList.remove('drop-before'));
    const mx=e.clientX;
    let target=null;
    for(const k of kids){
      const r=k.getBoundingClientRect();
      if(mx < r.left + r.width/2){ target=k; break; }
    }
    if(target) target.classList.add('drop-before');
  };
  lane.ondragleave=e=>{if(!lane.contains(e.relatedTarget)){row.classList.remove('drop');lane.querySelectorAll('.drop-before').forEach(el=>el.classList.remove('drop-before'));}};
  lane.ondrop=e=>{
    e.preventDefault();row.classList.remove('drop');
    const kids=[...lane.querySelectorAll('.tblock')];
    let insertAt=l.blocks.length;
    for(let i=0;i<kids.length;i++){
      if(kids[i].classList.contains('drop-before')){insertAt=i;break;}
    }
    lane.querySelectorAll('.drop-before').forEach(el=>el.classList.remove('drop-before'));
    if(dragNew){const ty=dragNew;dragNew=null;addBlock(ty,l.id,insertAt);return;}
    if(dragBlk){
      let mv, fromLine=null;
      linesOf(node).forEach(x=>{const f=x.blocks.find(b=>b.id===dragBlk);if(f){mv=f;fromLine=x;x.blocks=x.blocks.filter(b=>b!==f);}});
      if(mv){
        // adjust index if same line and removed before insert point
        if(fromLine===l){
          const oldIdx=kids.findIndex(k=>k.dataset.bid===dragBlk);
          if(oldIdx>=0 && oldIdx<insertAt) insertAt--;
        }
        l.blocks.splice(Math.max(0,insertAt),0,mv);
        activeLineId=l.id;selectedBlockId=mv.id;
      }
      dragBlk=null;renderCanvas();renderScriptProps();
    }
  };
  row.onclick=e=>{
    if(e.target.closest('.tblock,input,button'))return;
    activeLineId=l.id;selectBlock(null);
    document.querySelectorAll('.strack').forEach(c=>c.classList.toggle('cur',c===row));
  };
  return row;
}

