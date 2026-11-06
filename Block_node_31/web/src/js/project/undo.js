// ── UNDO / REDO ──
const snap = () => JSON.stringify(scenes, (k, v) => k[0] === '_' ? undefined : v);
let undoS = [], redoS = [], lastSnap = null;
function track() {
  const t = snap();
  if (lastSnap === null) lastSnap = t;
  else if (t !== lastSnap) {
    undoS.push(lastSnap);
    if (undoS.length > 80) undoS.shift();
    redoS = [];
    lastSnap = t;
  }
}
setInterval(track, 250);

// Disk autosave — the Go API writes a recovery snapshot inside the active project.
setInterval(() => {
  if (typeof autosaveLightweight === 'function') autosaveLightweight();
}, 2500);

function restore(t) {
  scenes = JSON.parse(t);
  lastSnap = t;
  if (!activeScene()) activeSceneId = scenes[0]?.id || null;
  const sc = activeScene();
  if (!sc?.nodes.some(n => n.id === selectedNodeId)) selectedNodeId = sc?.rootNode || null;
  renderTabs();
  refresh();
}
function undo() {
  track();
  if (!undoS.length) return setStatus('Nothing to undo');
  redoS.push(lastSnap);
  restore(undoS.pop());
  setStatus('Undo');
}
function redo() {
  track();
  if (!redoS.length) return setStatus('Nothing to redo');
  undoS.push(lastSnap);
  restore(redoS.pop());
  setStatus('Redo');
}
