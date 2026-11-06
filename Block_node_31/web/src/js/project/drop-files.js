// ── DROP FILES (OS files only — never re-imports existing assets) ──
// Single global handler so assets are not imported twice (canvas-panel + window).
let _dropBusy = false;
const _recentImportKeys = new Set();

function fileImportKey(f) {
  return (f.name || '') + '|' + (f.size || 0) + '|' + (f.lastModified || 0);
}

function importOsFiles(files, assign) {
  if (!files || !files.length) return;
  const list = [...files];
  const fresh = list.filter(f => {
    const k = fileImportKey(f);
    if (_recentImportKeys.has(k)) return false;
    // Also skip if an asset with same name+approx size already exists (data URLs vary)
    const exists = (typeof assets !== 'undefined') && assets.some(a => a.name === f.name && a.kind === 'imported');
    if (exists) return false;
    _recentImportKeys.add(k);
    setTimeout(() => _recentImportKeys.delete(k), 4000);
    return true;
  });
  if (!fresh.length) {
    if (typeof setStatus === 'function') setStatus('Already imported (skipped duplicate)');
    return;
  }
  if (typeof loadFiles === 'function') loadFiles(fresh, assign);
  if (typeof loadAudioFiles === 'function') loadAudioFiles(fresh, assign);
}

['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => {
  if (!e.dataTransfer || !e.dataTransfer.types) return;
  // Ignore internal asset drags (handled by assets.js)
  const types = [...e.dataTransfer.types];
  if (types.includes('application/x-blockode-asset')) return;
  if (types.includes('application/x-blockode-folder')) return;
  if (!types.includes('Files')) return;
  e.preventDefault();
  if (ev !== 'drop') return;
  if (_dropBusy) return;
  _dropBusy = true;
  try {
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    const toProps = !!(e.target.closest && e.target.closest('#right-slot,#inspector-body,.inspector-drop-hint'));
    const assign = toProps || !!(typeof selectedNode === 'function' && selectedNode());
    importOsFiles(files, assign);
  } finally {
    setTimeout(() => { _dropBusy = false; }, 300);
  }
}, true));

function resetLayout() {
  settings.layout = { ...DEF_LAYOUT };
  applySettings();
  if (typeof setRightSlotSplit === 'function') setRightSlotSplit(45);
  saveSettings();
}
