// ── DROP FILES ──
['dragover','drop'].forEach(ev=>window.addEventListener(ev,e=>{if(!e.dataTransfer?.types.includes('Files'))return;e.preventDefault();if(ev==='drop'){const toProps=!!e.target.closest('#right-slot,#inspector-body,.inspector-drop-hint');loadFiles(e.dataTransfer.files,toProps||!!selectedNode());}}));

function resetLayout(){
  settings.layout={...DEF_LAYOUT};
  applySettings();
  if (typeof setRightSlotSplit === 'function') setRightSlotSplit(45);
  saveSettings();
}

