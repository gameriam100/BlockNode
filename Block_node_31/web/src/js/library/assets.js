// ASSET LIBRARY — nested folders, move (not copy), context menus, custom audio
let assets = [], assetQuery = '', assetFolders = [];
let _editingCustomId = null;
/** null = all, '__none__' = unfiled, or folder id */
let assetFolderFilter = null;
const imgCache = {}, tintCv = document.createElement('canvas');

const FOLDER_COLORS = [
  { id: 'default', label: 'Default', hex: '' },
  { id: 'teal', label: 'Teal', hex: '#3ec6b0' },
  { id: 'blue', label: 'Blue', hex: '#5b8dee' },
  { id: 'purple', label: 'Purple', hex: '#9b72cf' },
  { id: 'yellow', label: 'Yellow', hex: '#e8c547' },
  { id: 'red', label: 'Red', hex: '#e85b5b' },
  { id: 'green', label: 'Green', hex: '#5be87a' },
  { id: 'orange', label: 'Orange', hex: '#e8a06a' }
];

function ensureAssetMeta(a) {
  if (!a.type) a.type = (a.url && String(a.url).indexOf('audio/') >= 0) ? 'audio' : 'image';
  if (a.folderId === undefined) a.folderId = null;
  return a;
}
function ensureFolderMeta(f) {
  if (f.parentId === undefined) f.parentId = null;
  if (f.color === undefined) f.color = '';
  return f;
}

function importPNG(assign) {
  if (assign === undefined) assign = true;
  const f = $('png-file');
  if (!f) return setStatus('PNG input missing');
  f.onchange = () => { loadFiles(f.files, assign); f.value = ''; };
  f.click();
}
function importAudio(assign) {
  if (assign === undefined) assign = true;
  const f = $('audio-file');
  if (!f) return setStatus('Audio input missing');
  f.onchange = () => {
    if (!f.files || !f.files.length) return;
    loadAudioFiles(f.files, assign);
    f.value = '';
  };
  f.click();
}

function currentFolderIdForImport() {
  if (assetFolderFilter && assetFolderFilter !== '__none__') return assetFolderFilter;
  return null;
}

function loadFiles(files, assign) {
  if (assign === undefined) assign = true;
  if (!files || !files.length) return;
  [...files].filter(f => /^image\//.test(f.type) || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(f.name)).forEach(async f => {
    const a = {
      id: uid('a'), name: f.name, type: 'image', kind: 'imported', url: URL.createObjectURL(f),
      mime: f.type || 'image/png', folderId: currentFolderIdForImport()
    };
    assets.push(a);
    const im = new Image(); im.src = a.url; imgCache[a.id] = im;
    const n = selectedNode();
    if (assign && n && n.type === 'Sprite2D') n.props.texture = a.id;
    renderAssets(); renderInspector();
    try {
      if (typeof persistImportedAsset === 'function') await persistImportedAsset(a, f);
      setStatus('Imported image: ' + f.name);
    } catch (err) {
      setStatus('Imported image locally, but disk save failed: ' + (err.message || f.name));
    }
  });
}

function loadAudioFiles(files, assign) {
  if (assign === undefined) assign = true;
  if (!files || !files.length) return;
  const list = [...files].filter(f => /^audio\//.test(f.type) || /\.(wav|mp3|ogg|m4a|flac|webm)$/i.test(f.name));
  if (!list.length) { setStatus('No audio files selected'); return; }
  list.forEach(async f => {
    const a = {
      id: uid('a'), name: f.name, type: 'audio', kind: 'imported', url: URL.createObjectURL(f),
      mime: f.type || 'audio/wav', folderId: currentFolderIdForImport()
    };
    assets.push(a);
    const n = selectedNode();
    if (assign && n && n.type === 'Audio') n.props.stream = a.id;
    renderAssets(); renderInspector();
    try {
      if (typeof persistImportedAsset === 'function') await persistImportedAsset(a, f);
      setStatus('Imported audio: ' + f.name);
    } catch (err) {
      setStatus('Imported audio locally, but disk save failed: ' + (err.message || f.name));
    }
  });
}

function setTexture(id) {
  const n = selectedNode();
  if (!n || n.type !== 'Sprite2D') return setStatus('Select a Sprite2D node');
  n.props.texture = id || null;
  renderInspector(); renderAssets();
}
function setStream(id) {
  const n = selectedNode();
  if (!n || n.type !== 'Audio') return setStatus('Select an Audio node');
  n.props.stream = id || null;
  renderInspector(); renderAssets();
}

async function delAsset(id) {
  const asset = assets.find(a => a.id === id);
  if (!asset) return;
  if (asset.filePath && typeof deleteStoredAsset === 'function') {
    try { await deleteStoredAsset(asset.filePath, asset.fileProject); }
    catch (err) { setStatus('Could not delete stored asset: ' + (err.message || asset.name)); return; }
  }
  if (asset.url && asset.url.startsWith('blob:')) URL.revokeObjectURL(asset.url);
  delete imgCache[id];
  assets = assets.filter(a => a.id !== id);
  scenes.forEach(sc => sc.nodes.forEach(n => {
    if (n.props && n.props.texture === id) n.props.texture = null;
    if (n.props && n.props.stream === id) n.props.stream = null;
  }));
  renderAssets(); renderInspector();
  setStatus('Deleted asset: ' + asset.name);
}
function renameAsset(id) {
  const a = assets.find(x => x.id === id);
  if (!a) return;
  const v = prompt('Rename asset', a.name);
  if (v == null) return;
  const name = v.trim();
  if (!name) return;
  a.name = name;
  renderAssets(); renderInspector();
}

/** MOVE only — never clone */
function moveAssetToFolder(assetId, folderId) {
  const a = assets.find(x => x.id === assetId);
  if (!a) return;
  const next = folderId || null;
  if (a.folderId === next) return;
  a.folderId = next;
  renderAssets();
  setStatus('Moved "' + a.name + '"');
}

function createAssetFolder(parentId) {
  if (parentId === undefined) {
    parentId = (assetFolderFilter && assetFolderFilter !== '__none__') ? assetFolderFilter : null;
  }
  const v = prompt('Folder name', 'Folder');
  if (v == null) return;
  const name = v.trim() || 'Folder';
  const folder = { id: uid('f'), name, parentId: parentId || null, color: '' };
  assetFolders.push(folder);
  renderAssets();
  setStatus('Created folder: ' + name);
  return folder.id;
}
function deleteAssetFolder(fid) {
  const f = assetFolders.find(x => x.id === fid);
  if (!f) return;
  if (!confirm('Delete folder "' + f.name + '"? Contents move up one level.')) return;
  // Children folders move to parent
  assetFolders.forEach(x => { if (x.parentId === fid) x.parentId = f.parentId || null; });
  assets.forEach(a => { if (a.folderId === fid) a.folderId = f.parentId || null; });
  assetFolders = assetFolders.filter(x => x.id !== fid);
  if (assetFolderFilter === fid) assetFolderFilter = f.parentId || null;
  renderAssets();
}
function renameAssetFolder(fid) {
  const f = assetFolders.find(x => x.id === fid);
  if (!f) return;
  const v = prompt('Rename folder', f.name);
  if (v == null) return;
  f.name = v.trim() || f.name;
  renderAssets();
}
function setFolderColor(fid, hex) {
  const f = assetFolders.find(x => x.id === fid);
  if (!f) return;
  f.color = hex || '';
  renderAssets();
}
const FOLDER_MIME = 'application/x-blockode-folder';
let _dragFolderId = null;

function isFolderInside(fid, ancestorId) {
  let cur = fid, guard = 0;
  while (cur && guard++ < 50) {
    if (cur === ancestorId) return true;
    const f = assetFolders.find(x => x.id === cur);
    cur = f ? f.parentId : null;
  }
  return false;
}
function moveFolder(dragId, targetId, zone) {
  const f = assetFolders.find(x => x.id === dragId);
  const t = assetFolders.find(x => x.id === targetId);
  if (!f || !t || f === t || isFolderInside(targetId, dragId)) return;
  assetFolders = assetFolders.filter(x => x !== f);
  if (zone === 'into') {
    f.parentId = t.id;
    assetFolders.push(f);
  } else {
    f.parentId = t.parentId || null;
    const i = assetFolders.indexOf(t);
    assetFolders.splice(zone === 'after' ? i + 1 : i, 0, f);
  }
  renderAssets();
  setStatus('Moved folder "' + f.name + '"');
}
function moveFolderToRoot(dragId) {
  const f = assetFolders.find(x => x.id === dragId);
  if (!f || !f.parentId) return;
  assetFolders = assetFolders.filter(x => x !== f);
  f.parentId = null;
  assetFolders.push(f);
  renderAssets();
}
function folderDropZone(e, el, horizontal) {
  const r = el.getBoundingClientRect();
  const t = horizontal ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
  return t < 0.25 ? 'before' : t > 0.75 ? 'after' : 'into';
}
function folderDropShadow(zone, horizontal) {
  if (zone === 'into') return 'inset 0 0 0 2px var(--accent-teal)';
  const side = zone === 'before' ? '' : '-';
  return horizontal ? 'inset ' + side + '3px 0 0 var(--accent-teal)' : 'inset 0 ' + side + '3px 0 var(--accent-teal)';
}
function bindFolderDrag(el, fid) {
  el.draggable = true;
  el.addEventListener('dragstart', e => {
    e.stopPropagation();
    _dragFolderId = fid;
    e.dataTransfer.setData(FOLDER_MIME, fid);
    e.dataTransfer.effectAllowed = 'move';
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', () => { _dragFolderId = null; el.classList.remove('dragging'); });
}
function childFolders(parentId) {
  const pid = parentId || null;
  return assetFolders.filter(f => (f.parentId || null) === pid);
}
function folderDepth(fid, guard) {
  guard = guard || 0;
  if (!fid || guard > 20) return 0;
  const f = assetFolders.find(x => x.id === fid);
  if (!f || !f.parentId) return 0;
  return 1 + folderDepth(f.parentId, guard + 1);
}
function countInFolder(fid) {
  // assets directly in folder + recursive optional: direct only for badge
  return assets.filter(a => a.folderId === fid).length + childFolders(fid).length;
}

// ── Texture / stream UI ──
function texUI(n) {
  const texId = n.props && n.props.texture;
  const a = texId ? assets.find(x => x.id === texId) : null;
  const label = a ? esc(a.name) : 'None — click to import';
  const thumb = a && a.url
    ? `<img class="tex-thumb" src="${a.url}" alt=""/>`
    : `<span class="tex-thumb empty">▦</span>`;
  return `<button type="button" class="tex-pick-btn" onclick="onTexturePickClick()">
    ${thumb}<span class="tex-pick-label">${label}</span>
  </button>
  <button type="button" class="icon-btn" onclick="setTexture(null)" ${a ? '' : 'disabled'}>✕</button>`;
}
function onTexturePickClick() {
  const n = selectedNode();
  if (!n || n.type !== 'Sprite2D') return setStatus('Select a Sprite2D node');
  const imgs = assets.filter(x => (x.type === 'image' || !x.type) && x.url);
  if (!imgs.length) { importPNG(true); return; }
  openTexturePicker(imgs);
}
function openTexturePicker(imgs) {
  let overlay = $('tex-pick-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tex-pick-overlay';
    overlay.className = 'add-node-overlay';
    overlay.innerHTML = `
      <div class="add-node-panel" role="dialog">
        <div class="add-node-header"><div class="add-node-title">Texture</div>
          <button type="button" class="add-node-close">✕</button></div>
        <div class="add-node-grid" id="tex-pick-grid"></div>
        <div style="padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:8px">
          <button type="button" class="scenes-act-btn" id="tex-pick-import">⤒ Import Image…</button>
          <button type="button" class="scenes-act-btn" id="tex-pick-none">Clear</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', ev => { if (ev.target === overlay) overlay.classList.remove('show'); });
    overlay.querySelector('.add-node-close').onclick = () => overlay.classList.remove('show');
    overlay.querySelector('#tex-pick-import').onclick = () => { overlay.classList.remove('show'); importPNG(true); };
    overlay.querySelector('#tex-pick-none').onclick = () => { setTexture(null); overlay.classList.remove('show'); };
  }
  const grid = overlay.querySelector('#tex-pick-grid');
  grid.innerHTML = '';
  (imgs || []).forEach(a => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'add-node-card';
    card.style.setProperty('--nc', '#3ec68a');
    card.innerHTML = `<div class="add-node-card-icon" style="padding:0;overflow:hidden">
        <img src="${a.url}" style="width:36px;height:36px;object-fit:contain;display:block" alt=""/>
      </div>
      <div class="add-node-card-body">
        <div class="add-node-card-name">${esc(a.name)}</div>
        <div class="add-node-card-desc">Assign texture</div>
      </div>`;
    card.onclick = () => { setTexture(a.id); overlay.classList.remove('show'); };
    grid.appendChild(card);
  });
  overlay.classList.add('show');
}

function streamUI(n) {
  const sid = n.props && n.props.stream;
  const a = sid ? assets.find(x => x.id === sid) : null;
  const label = a ? esc(a.name) + (a.kind === 'custom' ? ' ★' : '') : 'None — click to import';
  return `<button type="button" class="tex-pick-btn" onclick="onStreamPickClick()">
    <span class="tex-thumb empty">♪</span><span class="tex-pick-label">${label}</span>
  </button>
  <button type="button" class="icon-btn" onclick="setStream(null)" ${a ? '' : 'disabled'}>✕</button>`;
}
function onStreamPickClick() {
  const n = selectedNode();
  if (!n || n.type !== 'Audio') return setStatus('Select an Audio node');
  const auds = assets.filter(x => x.type === 'audio');
  if (!auds.length) { importAudio(true); return; }
  openStreamPicker(auds);
}
function openStreamPicker(auds) {
  let overlay = $('stream-pick-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'stream-pick-overlay';
    overlay.className = 'add-node-overlay';
    overlay.innerHTML = `
      <div class="add-node-panel" role="dialog">
        <div class="add-node-header"><div class="add-node-title">Audio Stream</div>
          <button type="button" class="add-node-close">✕</button></div>
        <div class="add-node-grid" id="stream-pick-grid"></div>
        <div style="padding:10px 14px;border-top:1px solid var(--border)">
          <button type="button" class="scenes-act-btn" id="stream-pick-import">⤒ Import Audio…</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', ev => { if (ev.target === overlay) overlay.classList.remove('show'); });
    overlay.querySelector('.add-node-close').onclick = () => overlay.classList.remove('show');
    overlay.querySelector('#stream-pick-import').onclick = () => { overlay.classList.remove('show'); importAudio(true); };
  }
  const grid = overlay.querySelector('#stream-pick-grid');
  grid.innerHTML = '';
  (auds || []).forEach(a => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'add-node-card';
    card.style.setProperty('--nc', '#3ec6b0');
    card.innerHTML = `<div class="add-node-card-icon">${a.kind === 'custom' ? '★' : '♪'}</div>
      <div class="add-node-card-body">
        <div class="add-node-card-name">${esc(a.name)}</div>
        <div class="add-node-card-desc">${a.kind === 'custom' ? 'Custom' : 'Imported file'}</div>
      </div>`;
    card.onclick = () => { setStream(a.id); overlay.classList.remove('show'); };
    grid.appendChild(card);
  });
  overlay.classList.add('show');
}

function openCustomAudio(id) {
  const a = assets.find(x => x.id === id);
  if (!a || a.kind !== 'custom') return;
  _editingCustomId = id;
  setView('audio');
  setTimeout(() => {
    const AU = typeof AUDIO !== 'undefined' ? AUDIO : null;
    if (!AU || !AU.ready) return;
    try {
      if (a.customType === 'sfx') {
        if (a.seed && AU.el('sseed')) AU.el('sseed').value = a.seed;
        if (a.settings) Object.keys(a.settings).forEach(k => { const el = AU.el(k); if (el) el.value = a.settings[k]; });
        if (AU.sLink && AU.sLink.decode) AU.sLink.decode();
        if (AU.sfxGo) AU.sfxGo(false);
      } else if (a.customType === 'music') {
        if (a.seed && AU.el('mseed')) AU.el('mseed').value = a.seed;
        if (a.settings) Object.keys(a.settings).forEach(k => { const el = AU.el(k); if (el) el.value = a.settings[k]; });
        if (AU.mLink && AU.mLink.decode) AU.mLink.decode();
        if (AU.musGo) AU.musGo(false);
      }
      setStatus('Editing custom ' + a.customType + ' — changes update the asset live');
    } catch (err) { console.warn(err); }
  }, 50);
}

/** Push current Audio-tab buffer into the custom asset being edited */
async function syncEditingCustomAudio(kind) {
  if (!_editingCustomId) return;
  const a = assets.find(x => x.id === _editingCustomId);
  if (!a || a.kind !== 'custom') return;
  if (kind && a.customType && a.customType !== kind) return;
  try {
    const AU = typeof AUDIO !== 'undefined' ? AUDIO : null;
    if (!AU) return;
    const url = await audioBufferToDataUrl(a.customType);
    if (!url) return;
    a.url = url;
    try {
      const seedEl = AU.el(a.customType === 'sfx' ? 'sseed' : 'mseed');
      if (seedEl) a.seed = String(seedEl.value || a.seed || '');
      if (AU.collect) a.settings = AU.collect();
    } catch (e) {}
    // Refresh assets UI if visible
    if (typeof view !== 'undefined' && view === 'assets' && typeof renderAssets === 'function') renderAssets();
  } catch (err) { console.warn('syncEditingCustomAudio', err); }
}

function playAssetAudio(id, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const a = assets.find(x => x.id === id);
  if (!a || a.type !== 'audio' || !a.url) return;
  try {
    if (window._assetPreviewAudio) {
      try { window._assetPreviewAudio.pause(); } catch (e) {}
    }
    const audio = new Audio(a.url);
    window._assetPreviewAudio = audio;
    audio.play().catch(() => {});
    setStatus('Playing: ' + a.name);
  } catch (err) { console.warn(err); }
}

/** Export current synth buffer to a data-URL so it shows up as a real audio asset */
function audioBufferToDataUrl(kind) {
  try {
    const A = typeof AUDIO !== 'undefined' ? AUDIO : null;
    if (!A) return null;
    const isSfx = kind === 'sfx';
    const buf = isSfx ? (A.sfx && A.sfx.data) : (A.mus && A.mus.data);
    if (!buf || !buf.length || !A.wav) return null;
    const srIn = isSfx ? A.SR : A.MS;
    let bits = 8, srOut = srIn;
    try {
      if (isSfx && A.SQ && A.el) {
        const sq = A.el('sq');
        const idx = sq ? +sq.value : 0;
        srOut = (A.SQ[idx] && A.SQ[idx][0]) || srIn;
      } else if (!isSfx && A.QUAL && A.el) {
        const q = A.el('q');
        const idx = q ? +q.value : 0;
        const pair = A.QUAL[idx];
        if (pair) { srOut = pair[0]; bits = pair[1]; }
      }
    } catch (e) {}
    const samples = A.resample ? A.resample(buf, srIn, srOut) : buf;
    const blob = A.wav(samples, srOut, bits);
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('audioBufferToDataUrl', err);
    return Promise.resolve(null);
  }
}

let _addingAudio = false;

function renderAudioBuffer(A, isSfx) {
  if (isSfx) { A.sfxGo(false); return Promise.resolve(); }
  const prev = A.mus.data;
  A.musGo(false);
  return new Promise(resolve => {
    const t0 = Date.now();
    const tick = () => {
      if (A.mus.data && A.mus.data !== prev) return resolve();
      if (Date.now() - t0 > 4000) return resolve();
      setTimeout(tick, 30);
    };
    tick();
  });
}

async function addCustomAudioToAssets(kind) {
  if (_addingAudio) return;
  _addingAudio = true;
  try {
    if (typeof AUDIO === 'undefined') return setStatus('Audio engine missing');
    const A = AUDIO;
    if (!A.ready && typeof initAudio === 'function') initAudio();
    if (!A.ready) return setStatus('Open the Audio tab once, then try again');

    const isSfx = kind === 'sfx';
    await renderAudioBuffer(A, isSfx);

    const seedEl = A.el(isSfx ? 'sseed' : 'mseed');
    const seed = seedEl ? String(seedEl.value || '') : ('seed' + Date.now());
    let base = isSfx ? 'sfx' : 'loop';
    try { base = A.baseOf(isSfx ? 'sseed' : 'mseed') || base; } catch (e) {}
    const name = base + (isSfx ? '-sfx' : '-loop') + '.wav';

    const ids = isSfx
      ? (A.sfxSeedIds || []).concat(['svol', 'sq'])
      : (A.musSeedIds || []).concat(['mvol', 'q']);
    const settings = {};
    ids.forEach(id => { const el = A.el(id); if (el) settings[id] = el.value; });

    const url = await audioBufferToDataUrl(kind);
    if (!url) return setStatus('Failed to render ' + kind + ' audio');

    const a = {
      id: uid('a'), name, type: 'audio', kind: 'custom', customType: kind,
      seed, settings, url, folderId: currentFolderIdForImport()
    };
    assets.push(a);
    _editingCustomId = a.id;
    const n = selectedNode();
    if (n && n.type === 'Audio' && !n.props.stream) n.props.stream = a.id;
    renderAssets();
    renderInspector();
    setStatus('Added to Assets: ' + name + ' (live editing linked)');
    return a.id;
  } catch (err) {
    console.error('addCustomAudioToAssets', err);
    setStatus('Failed to add audio: ' + (err && err.message ? err.message : 'error'));
  } finally {
    _addingAudio = false;
  }
}

// ── Context menus ──
function showAssetsContextMenu(e, assetId, folderId) {
  e.preventDefault();
  e.stopPropagation();
  if (typeof showMenu !== 'function') return;

  if (folderId) return showFolderColorMenu(e, folderId);

  if (assetId) {
    const a = assets.find(x => x.id === assetId);
    if (!a) return;
    const type = a.type === 'audio' ? 'audio' : 'image';
    const items = [
      { label: 'Rename', fn: () => renameAsset(assetId) },
      { label: type === 'image' ? 'Assign as Texture' : 'Assign as Stream', fn: () => type === 'image' ? setTexture(assetId) : setStream(assetId) },
      '-',
      { label: 'New Folder…', fn: () => createAssetFolder() },
      '-',
      { label: 'Delete Asset', danger: true, fn: () => delAsset(assetId) }
    ];
    showMenu(e.clientX, e.clientY, items);
    return;
  }

  // Dead space
  const parentForNew = (assetFolderFilter && assetFolderFilter !== '__none__') ? assetFolderFilter : null;
  showMenu(e.clientX, e.clientY, [
    { label: 'Import PNG…', fn: () => importPNG(false) },
    { label: 'Import Audio…', fn: () => importAudio(false) },
    '-',
    { label: 'New Folder…', fn: () => createAssetFolder(parentForNew) },
    { label: 'Show All Assets', fn: () => { assetFolderFilter = null; renderAssets(); } }
  ]);
}

function showFolderColorMenu(e, folderId) {
  e.preventDefault();
  e.stopPropagation();
  const f = assetFolders.find(x => x.id === folderId);
  const cur = f ? (f.color || '') : '';
  showMenu(e.clientX, e.clientY, [
    {
      swatches: FOLDER_COLORS.map(c => ({ hex: c.hex, label: c.label, on: c.hex === cur })),
      onPick: hex => setFolderColor(folderId, hex)
    },
    '-',
    { label: 'Open Folder', fn: () => { assetFolderFilter = folderId; renderAssets(); } },
    { label: 'New Subfolder…', fn: () => createAssetFolder(folderId) },
    { label: 'Rename Folder', fn: () => renameAssetFolder(folderId) },
    '-',
    { label: 'Delete Folder', danger: true, fn: () => deleteAssetFolder(folderId) }
  ]);
}

// ── Render ──
function renderAssets() {
  const root = $('asset-grid');
  if (!root) return;
  assets.forEach(ensureAssetMeta);
  assetFolders.forEach(ensureFolderMeta);
  const q = (assetQuery || '').trim().toLowerCase();
  const n = selectedNode();

  root.className = 'asset-browser';
  root.innerHTML = `
    <aside class="asset-sidebar" id="asset-sidebar">
      <div class="asset-sidebar-head">Folders</div>
      <div class="asset-sidebar-list" id="asset-sidebar-list"></div>
      <button type="button" class="asset-sidebar-add" id="asset-folder-add">＋ New Folder</button>
    </aside>
    <div class="asset-main">
      <div class="asset-main-head" id="asset-main-head"></div>
      <div class="asset-main-scroll" id="asset-main-scroll"></div>
    </div>`;

  const sideList = $('asset-sidebar-list');
  const mainHead = $('asset-main-head');
  const mainScroll = $('asset-main-scroll');

  function bindFolderDrop(el, targetFolderId, horizontal) {
    const real = !!targetFolderId && targetFolderId !== '__none__';
    const clear = () => { el.classList.remove('drag-over'); el.style.boxShadow = ''; };
    el.addEventListener('dragover', e => {
      const types = [...e.dataTransfer.types];
      if (types.includes('application/x-blockode-asset')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        el.classList.add('drag-over');
      } else if (types.includes(FOLDER_MIME) && _dragFolderId) {
        if (targetFolderId === '__none__' || _dragFolderId === targetFolderId) return;
        if (real && isFolderInside(targetFolderId, _dragFolderId)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (real) el.style.boxShadow = folderDropShadow(folderDropZone(e, el, horizontal), horizontal);
        else el.classList.add('drag-over');
      }
    });
    el.addEventListener('dragleave', clear);
    el.addEventListener('drop', e => {
      const types = [...e.dataTransfer.types];
      const zone = real ? folderDropZone(e, el, horizontal) : null;
      clear();
      if (types.includes(FOLDER_MIME) && _dragFolderId) {
        e.preventDefault();
        e.stopPropagation();
        const dragId = _dragFolderId;
        _dragFolderId = null;
        if (real) moveFolder(dragId, targetFolderId, zone);
        else if (targetFolderId === null) moveFolderToRoot(dragId);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const id = e.dataTransfer.getData('application/x-blockode-asset');
      if (id) moveAssetToFolder(id, targetFolderId === '__none__' ? null : targetFolderId);
    });
  }

  function addSideItem(label, fid, count, icon, depth, color) {
    depth = depth || 0;
    const row = document.createElement('div');
    const on = (fid === null && assetFolderFilter === null) || assetFolderFilter === fid;
    row.className = 'asset-side-item' + (on ? ' on' : '');
    row.style.paddingLeft = (10 + depth * 12) + 'px';
    if (color) row.style.borderLeft = '3px solid ' + color;
    row.innerHTML = `<span class="asset-side-icon">${icon}</span><span class="asset-side-name">${esc(label)}</span><span class="asset-side-count">${count}</span>`;
    row.onclick = () => { assetFolderFilter = fid; renderAssets(); };
    bindFolderDrop(row, fid);
    if (fid && fid !== '__none__') {
      row.oncontextmenu = e => showFolderColorMenu(e, fid);
      bindFolderDrag(row, fid);
    }
    sideList.appendChild(row);
  }

  function walkSide(parentId, depth) {
    childFolders(parentId).forEach(f => {
      if (q && !f.name.toLowerCase().includes(q)) {
        // Still walk children in case a nested folder matches
        walkSide(f.id, depth + 1);
        return;
      }
      addSideItem(f.name, f.id, countInFolder(f.id), '📁', depth, f.color);
      walkSide(f.id, depth + 1);
    });
  }

  const unfiledCount = assets.filter(a => !a.folderId).length;
  if (!q) {
    addSideItem('All Assets', null, assets.length, '▦', 0);
    addSideItem('Unfiled', '__none__', unfiledCount, '∅', 0);
  }
  walkSide(null, 0);

  const addBtn = $('asset-folder-add');
  if (addBtn) {
    addBtn.onclick = e => {
      e.stopPropagation();
      const parent = (assetFolderFilter && assetFolderFilter !== '__none__') ? assetFolderFilter : null;
      createAssetFolder(parent);
    };
  }

  // Breadcrumb / title
  let title = 'All Assets';
  if (assetFolderFilter === '__none__') title = 'Unfiled';
  else if (assetFolderFilter) {
    const parts = [];
    let cur = assetFolders.find(x => x.id === assetFolderFilter);
    while (cur) {
      parts.unshift(cur.name);
      cur = cur.parentId ? assetFolders.find(x => x.id === cur.parentId) : null;
    }
    title = parts.join(' / ') || 'Folder';
  }
  mainHead.textContent = title;

  // Subfolders shown in the main grid (alongside assets). Searching also matches folders.
  let html = '';
  const showSubfolders = assetFolderFilter !== '__none__';
  const parentForChildren = assetFolderFilter && assetFolderFilter !== '__none__' ? assetFolderFilter : null;
  // When viewing "All", still show root folders as cards; when searching, match any folder by name
  let subfolders = [];
  if (showSubfolders) {
    if (q) {
      // Search: match folders by name anywhere under current filter (or all when All)
      const scopeParent = assetFolderFilter && assetFolderFilter !== '__none__' ? assetFolderFilter : null;
      const matchFolders = (parentId) => {
        childFolders(parentId).forEach(f => {
          if (f.name.toLowerCase().includes(q)) subfolders.push(f);
          matchFolders(f.id);
        });
      };
      if (scopeParent) matchFolders(scopeParent);
      else {
        // All Assets: search every folder
        assetFolders.forEach(f => {
          if (f.name.toLowerCase().includes(q)) subfolders.push(f);
        });
      }
    } else {
      subfolders = assetFolderFilter === null ? childFolders(null) : childFolders(assetFolderFilter);
    }
  }

  subfolders.forEach(f => {
    const col = f.color ? `style="--folder-c:${f.color}"` : '';
    html += `<div class="asset asset-folder-card" data-folder-id="${f.id}" ${col} draggable="false">
      <div class="asset-folder-icon">📁</div>
      <span class="asset-name">${q ? hl(f.name, q) : esc(f.name)}</span>
      <span class="asset-badge">${countInFolder(f.id)}</span>
    </div>`;
  });

  let hits = assets.filter(a => {
    if (assetFolderFilter === '__none__' && a.folderId) return false;
    if (assetFolderFilter && assetFolderFilter !== '__none__' && a.folderId !== assetFolderFilter) return false;
    // In "All Assets", show everything
    if (!q) return true;
    return a.name.toLowerCase().includes(q) || (a.kind || '').includes(q) || (a.type || '').includes(q);
  });

  // When viewing All and searching, keep as is; when viewing All without search, still show all assets
  if (assetFolderFilter === null && !q) {
    // show all assets (including those in folders) — user can also open folders
    hits = assets.slice();
  }

  hits.forEach(a => {
    const isImg = a.type === 'image' || !a.type;
    const isAud = a.type === 'audio';
    const isCustom = a.kind === 'custom';
    const selected = (isImg && n && n.type === 'Sprite2D' && n.props.texture === a.id) ||
      (isAud && n && n.type === 'Audio' && n.props.stream === a.id);
    const icon = isImg && a.url
      ? `<img src="${a.url}" alt="" draggable="false">`
      : isCustom ? `<div class="asset-audio-icon custom">★</div>`
      : `<div class="asset-audio-icon sound-icon">🔊</div>`;
    const badge = isCustom ? `<span class="asset-badge custom">custom</span>`
      : isAud ? `<span class="asset-badge">audio</span>` : '';
    const openBtn = isCustom ? `<button type="button" class="icon-btn" data-open-custom="${a.id}" title="Open in Audio">✎</button>` : '';
    const playBtn = isAud ? `<button type="button" class="icon-btn asset-play-btn" data-play-asset="${a.id}" title="Play">▶</button>` : '';
    html += `<div class="asset${selected ? ' on' : ''}${isAud ? ' audio' : ''}${isCustom ? ' custom' : ''}"
      draggable="true" data-asset-id="${a.id}" data-asset-type="${isImg ? 'image' : 'audio'}">
      ${icon}
      <span class="asset-name">${hl(a.name, q)}</span>
      ${badge}${playBtn}${openBtn}
    </div>`;
  });

  if (!html) {
    html = `<div class="tree-none">${assets.length ? 'No matches in this folder' : 'No assets yet — import files or use Art / Audio "Add to Assets"'}</div>`;
  }
  mainScroll.innerHTML = html;

  // Folder cards in main grid
  mainScroll.querySelectorAll('.asset-folder-card[data-folder-id]').forEach(el => {
    const fid = el.getAttribute('data-folder-id');
    el.onclick = () => { assetFolderFilter = fid; renderAssets(); };
    el.oncontextmenu = e => showFolderColorMenu(e, fid);
    bindFolderDrop(el, fid, true);
    bindFolderDrag(el, fid);
  });

  // Asset cards
  mainScroll.querySelectorAll('.asset[data-asset-id]').forEach(el => {
    const id = el.getAttribute('data-asset-id');
    const type = el.getAttribute('data-asset-type');
    // Prevent browser treating img as file drag (causes duplicate imports + renamed files)
    el.querySelectorAll('img').forEach(img => { img.draggable = false; });

    el.onclick = e => {
      if (e.target.closest('[data-play-asset]')) {
        playAssetAudio(e.target.closest('[data-play-asset]').getAttribute('data-play-asset'), e);
        return;
      }
      if (e.target.closest('[data-open-custom]')) {
        openCustomAudio(e.target.closest('[data-open-custom]').getAttribute('data-open-custom'));
        return;
      }
      if (type === 'image') setTexture(id);
      else setStream(id);
    };
    el.oncontextmenu = e => showAssetsContextMenu(e, id, null);

    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('application/x-blockode-asset', id);
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      // Avoid browser adding image file payload when possible
      try { e.dataTransfer.clearData('text/uri-list'); } catch (err) {}
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
  });

  // Dead-space context menu
  const dead = e => {
    if (e.target.closest('.asset') || e.target.closest('.asset-side-item') || e.target.closest('.asset-folder-card')) return;
    showAssetsContextMenu(e, null, null);
  };
  mainScroll.oncontextmenu = dead;
  sideList.oncontextmenu = dead;
  root.oncontextmenu = dead;
}

// Internal asset drag detection (OS file drops handled once in drop-files.js)
function isInternalAssetDrag(dt) {
  if (!dt || !dt.types) return false;
  return [...dt.types].includes('application/x-blockode-asset') ||
    [...dt.types].includes('application/x-blockode-folder');
}

(function setupAssetDropOnProps() {
  const bind = () => {
    [$('right-slot'), $('inspector-body'), $('sp-props-body')].filter(Boolean).forEach(t => {
      if (t._assetDropBound) return;
      t._assetDropBound = true;
      t.addEventListener('dragover', e => {
        if (isInternalAssetDrag(e.dataTransfer)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          t.classList.add('asset-drop-target');
        }
      });
      t.addEventListener('dragleave', e => {
        if (!t.contains(e.relatedTarget)) t.classList.remove('asset-drop-target');
      });
      t.addEventListener('drop', e => {
        t.classList.remove('asset-drop-target');
        if (!isInternalAssetDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        const id = e.dataTransfer.getData('application/x-blockode-asset');
        if (!id) return;
        const a = assets.find(x => x.id === id);
        if (!a) return;
        const n = selectedNode();
        if (!n) return setStatus('Select a node first');
        if ((a.type === 'image' || !a.type) && n.type === 'Sprite2D') {
          setTexture(a.id); setStatus('Assigned texture: ' + a.name);
        } else if (a.type === 'audio' && n.type === 'Audio') {
          setStream(a.id); setStatus('Assigned stream: ' + a.name);
        } else setStatus('Drop on a matching node (Sprite2D / Audio)');
      });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else setTimeout(bind, 0);
})();
