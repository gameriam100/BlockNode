// ── CONTEXT MENU ──
let _menuShownAt = 0;
function showMenu(x,y,items){
  hideTip();
  const m=$('ctx-menu');
  if(!m) return;
  m.innerHTML='';
  (items||[]).forEach(it=>{
    if(it==='-'){m.insertAdjacentHTML('beforeend','<div class="ctx-sep"></div>');return;}
    if(it.swatches){
      const row=document.createElement('div');
      row.style.cssText='display:flex;gap:5px;padding:6px 14px;flex-wrap:wrap';
      it.swatches.forEach(sw=>{
        const b=document.createElement('span');
        b.title=sw.label;
        b.style.cssText='width:14px;height:14px;border-radius:50%;cursor:pointer;box-sizing:border-box;background:'+(sw.hex||'transparent')+';border:2px solid '+(sw.on?'#fff':(sw.hex?'transparent':'var(--border-light)'));
        b.onmousedown=ev=>{ev.preventDefault();ev.stopPropagation();};
        b.onclick=()=>{hideMenu();it.onPick(sw.hex);};
        row.appendChild(b);
      });
      m.appendChild(row);
      return;
    }
    const d=document.createElement('div');
    d.className='ctx-item'+(it.danger?' danger':'');
    d.textContent=it.label;
    d.onmousedown=ev=>{ev.preventDefault();ev.stopPropagation();};
    d.onclick=()=>{hideMenu();if(typeof it.fn==='function')it.fn();};
    m.appendChild(d);
  });
  m.style.display='block';
  m.style.left=x+'px';
  m.style.top=y+'px';
  _menuShownAt = Date.now();
  requestAnimationFrame(()=>{
    const r=m.getBoundingClientRect();
    if(r.right>innerWidth)m.style.left=Math.max(0,x-r.width)+'px';
    if(r.bottom>innerHeight)m.style.top=Math.max(0,y-r.height)+'px';
  });
}
function hideMenu(){
  // Ignore hide right after open (avoids right-click mousedown/up races)
  if(Date.now() - _menuShownAt < 180) return;
  const m=$('ctx-menu');if(m)m.style.display='none';
}

// ── GLOBAL TOOLTIP (fixed, always on top, not clipped by overflow) ──
let _tipTimer = null;
function hideTip(){
  clearTimeout(_tipTimer);
  const t = $('global-tip');
  if(t){ t.classList.remove('show'); t.style.display = 'none'; }
}
function showTipFor(el){
  if(!el || settings.showTips === false) return;
  const text = el.getAttribute('data-tip');
  if(!text) return;
  const tip = $('global-tip');
  if(!tip) return;
  tip.textContent = text;
  tip.style.display = 'block';
  tip.classList.add('show');
  const r = el.getBoundingClientRect();
  const tr = tip.getBoundingClientRect();
  let left = r.left + r.width / 2 - tr.width / 2;
  let top = r.top - tr.height - 8;
  // Prefer above; if clipped, show below
  if(top < 4) top = r.bottom + 8;
  if(left < 4) left = 4;
  if(left + tr.width > innerWidth - 4) left = innerWidth - tr.width - 4;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}
(function initGlobalTip(){
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if(!el){ hideTip(); return; }
    clearTimeout(_tipTimer);
    _tipTimer = setTimeout(() => showTipFor(el), 280);
  }, true);
  document.addEventListener('mouseout', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if(el && (!e.relatedTarget || !el.contains(e.relatedTarget))) hideTip();
  }, true);
  document.addEventListener('scroll', hideTip, true);
  document.addEventListener('mousedown', hideTip, true);
})();

// ── ADD NODE PICKER (pop-out with search + visual cards) ──
let _addNodeParentId = null;
let _addNodeQuery = '';

function showAddMenu(e, parentId){
  e && e.stopPropagation();
  hideMenu();
  _addNodeParentId = parentId || null;
  _addNodeQuery = '';
  openAddNodePicker(e);
}

function openAddNodePicker(e){
  let overlay = $('add-node-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'add-node-overlay';
    overlay.className = 'add-node-overlay';
    overlay.innerHTML = `
      <div class="add-node-panel" role="dialog" aria-label="Add Node">
        <div class="add-node-header">
          <div class="add-node-title">Add Node</div>
          <button type="button" class="add-node-close" title="Close" aria-label="Close">✕</button>
        </div>
        <div class="add-node-search">
          <span class="add-node-search-icon">⌕</span>
          <input type="text" id="add-node-search-input" placeholder="Search nodes…" autocomplete="off" spellcheck="false"/>
          <button type="button" class="add-node-search-clear" title="Clear" style="display:none">✕</button>
        </div>
        <div class="add-node-grid" id="add-node-grid"></div>
        <div class="add-node-hint">Click a node to add it as a child of the selected node</div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', ev => { if(ev.target === overlay) closeAddNodePicker(); });
    overlay.querySelector('.add-node-close').onclick = closeAddNodePicker;
    const inp = overlay.querySelector('#add-node-search-input');
    const clearBtn = overlay.querySelector('.add-node-search-clear');
    inp.addEventListener('input', () => {
      _addNodeQuery = inp.value;
      clearBtn.style.display = inp.value ? 'block' : 'none';
      renderAddNodeGrid();
    });
    inp.addEventListener('keydown', ev => {
      if(ev.key === 'Escape'){ closeAddNodePicker(); return; }
      if(ev.key === 'Enter'){
        const first = overlay.querySelector('.add-node-card');
        if(first) first.click();
      }
    });
    clearBtn.onclick = () => {
      inp.value = '';
      _addNodeQuery = '';
      clearBtn.style.display = 'none';
      renderAddNodeGrid();
      inp.focus();
    };
  }
  renderAddNodeGrid();
  overlay.classList.add('show');
  requestAnimationFrame(() => {
    const inp = $('add-node-search-input');
    if(inp){ inp.value = ''; inp.focus(); }
  });
}

function closeAddNodePicker(){
  const overlay = $('add-node-overlay');
  if(overlay) overlay.classList.remove('show');
  _addNodeParentId = null;
  _addNodeQuery = '';
}

function renderAddNodeGrid(){
  const grid = $('add-node-grid');
  if(!grid) return;
  grid.innerHTML = '';
  const q = _addNodeQuery.trim().toLowerCase();
  const types = Object.keys(NODE_TYPES).filter(t => {
    if(t === 'SceneInstance') return false; // use Add Scene Instance picker
    if(!q) return true;
    const info = NODE_INFO[t] || {};
    return (t + ' ' + (info.desc || '')).toLowerCase().includes(q);
  });
  if(!types.length){
    grid.innerHTML = '<div class="add-node-empty">No nodes match “' + esc(_addNodeQuery) + '”</div>';
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
      addNode(t, _addNodeParentId || undefined);
      closeAddNodePicker();
    };
    grid.appendChild(card);
  });
}

// Canvas context menu stays for blocks
$('canvas-area').addEventListener('contextmenu', e => {
  e.preventDefault();
  if(!selectedNode()) return;
  const items = [...Object.entries(BLOCKS).map(([t,d]) => ({label: d.icon + '  Add ' + d.name, fn: () => addBlock(t)}))];
  if(customBlocks.length){
    items.push('-');
    customBlocks.forEach(cb => {
      const d = getBlockDef(cb.typeKey);
      items.push({label: (d?.icon || '◆') + '  ' + cb.name, fn: () => addBlock(cb.typeKey)});
    });
  }
  if(groupClipboard){ items.push('-', {label: 'Paste Group', fn: pasteGroup}); }
  showMenu(e.clientX, e.clientY, items);
});

document.addEventListener('mousedown', e => { if(e.button===0 && !e.target.closest('#ctx-menu')) hideMenu(); }, true);
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){
    closeAddNodePicker();
    if(typeof closeChangeTypePicker === 'function') closeChangeTypePicker();
    if(typeof closeSceneInstancePicker === 'function') closeSceneInstancePicker();
    hideMenu();
  }
});
document.addEventListener('click', e => {
  if(e.target.id === 'modal-overlay') closeModal();
});

// Prevent native browser menu on tree/scenes panels so our menus work
document.addEventListener('contextmenu', e => {
  if (e.target.closest && (
    e.target.closest('#scene-tree') || e.target.closest('#scenes-list') || e.target.closest('#left-slot') ||
    e.target.closest('#asset-grid') || e.target.closest('#assets-pane') || e.target.closest('.asset-browser')
  )) {
    e.preventDefault();
  }
}, true);
