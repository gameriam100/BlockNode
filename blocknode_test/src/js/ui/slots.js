// ── SLOT PANELS (collapsible) ──
function toggleSlot(id){
  const sp=$(id), tog=$(id+'-tog'), body=$(id+'-body');
  const isCollapsed=slotCollapsed.has(id);
  if(isCollapsed){slotCollapsed.delete(id);if(body)body.style.display='';if(tog)tog.textContent='▲';}
  else{slotCollapsed.add(id);if(body)body.style.display='none';if(tog)tog.textContent='▼';}
}

