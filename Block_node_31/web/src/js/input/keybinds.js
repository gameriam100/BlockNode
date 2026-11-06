// ── KEYBINDS ──
const ACT={
  run:['Run/Stop',toggleRun],undo:['Undo',()=>undo()],redo:['Redo',()=>redo()],save:['Save',()=>saveProject()],open:['Open',()=>openProject()],
  newScene:['New Scene',openNewSceneModal],addSprite:['Add Sprite',()=>addNode('Sprite2D')],findNodes:['Find Nodes',()=>$('tree-search').focus()],
  viewScript:['Script View',()=>setView('script')],viewScene:['Scene View',()=>setView('scene')],viewSplit:['Split View',()=>setView('split')],viewAssets:['Assets View',()=>setView('assets')],
  toggleTree:['Toggle Tree',()=>$('sp-scene-body').style.display=$('sp-scene-body').style.display==='none'?'':'none'],
  toggleDebug:['Toggle Debug',toggleDebug],settings:['Settings',openSettings]
};
function combo(e){if(['Control','Shift','Alt','Meta'].includes(e.key))return'';const k=/^(Digit|Key)/.test(e.code)?e.code.slice(-1):e.key.length===1?e.key.toUpperCase():e.key;return[(e.ctrlKey||e.metaKey)&&'Ctrl',e.altKey&&'Alt',e.shiftKey&&'Shift',k].filter(Boolean).join('+');}

