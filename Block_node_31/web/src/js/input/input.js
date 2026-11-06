// ── INPUT (keyboard + tap) ──
window.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  let k=e.key;
  if(k===' ')k='Space';
  if(!INPUT.keys.has(k))INPUT.keysPressed.add(k);
  INPUT.keys.add(k);
  if(e.key===' ')INPUT.keys.add(' ');
  if(k.length===1)INPUT.keys.add(k.toLowerCase());
});
window.addEventListener('keyup',e=>{
  let k=e.key;if(k===' ')k='Space';
  INPUT.keys.delete(k);INPUT.keys.delete(e.key);INPUT.keys.delete(e.key.toLowerCase());
  if(e.key===' ')INPUT.keys.delete(' ');
  INPUT.keysReleased.add(k);
});
function bindPreviewTap(){
  const cv=$('preview');if(!cv||cv._tapBound)return;cv._tapBound=true;
  const mark=e=>{
    INPUT.tapped=true;
    const r=cv.getBoundingClientRect();
    const pt=e.touches?e.touches[0]:e;
    INPUT.tapX=pt.clientX-r.left;INPUT.tapY=pt.clientY-r.top;
  };
  cv.addEventListener('pointerdown',mark);
  cv.addEventListener('touchstart',mark,{passive:true});
}
bindPreviewTap();

document.addEventListener('keydown',e=>{
  const c=combo(e);
  if(capture){e.preventDefault();e.stopPropagation();if(e.key==='Escape')capture=null;else if(c){Object.keys(KEYS).forEach(k=>{if(KEYS[k]===c)KEYS[k]='';});KEYS[capture]=c;capture=null;saveSettings();}return renderSettings();}
  if(e.key==='Escape'){closeSettings();hideMenu();closeModal();return;}
  const typing=['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable;
  // Enter / arrows stay inside inputs — never collapse panels or navigate tree
  if(typing){
    if(e.key==='Enter'||e.key==='ArrowUp'||e.key==='ArrowDown'||e.key==='ArrowLeft'||e.key==='ArrowRight'){e.stopPropagation();return;}
    if(!/Ctrl|Alt|^F\d/.test(c)||['Ctrl+Z','Ctrl+Y'].includes(c))return;
  }
  if(!c)return;
  const a=c==='Ctrl+Enter'?'run':Object.keys(KEYS).find(k=>KEYS[k]===c);
  if(a&&ACT[a]){e.preventDefault();ACT[a][1]();}
  if(!typing){const sc=activeScene();if(!sc)return;const i=visibleOrder.indexOf(selectedNodeId),n=selectedNode();if(e.key==='Delete')deleteNode();else if(e.key==='F2'){e.preventDefault();renameSelected();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicateNode();}else if(e.key==='ArrowDown'&&i<visibleOrder.length-1){e.preventDefault();selectNode(visibleOrder[i+1]);}else if(e.key==='ArrowUp'&&i>0){e.preventDefault();selectNode(visibleOrder[i-1]);}}
},true);

