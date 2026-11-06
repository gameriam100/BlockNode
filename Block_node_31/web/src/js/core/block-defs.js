// ── BLOCK DEFINITIONS ──
const CATS = {
  Motion:'#4a8cee', Looks:'#9b72cf', Effects:'#e8c547', Control:'#e88a5b',
  Input:'#5bc0eb', 'Player Controls':'#ff7b54', Debug:'#3ec68a', Custom:'#c77dff'
};
const B = (cat,name,icon,kw,fields,step)=>({cat,name,icon,kw:kw+' '+cat.toLowerCase(),fields:fields||[],step:step||1,color:CATS[cat]||'#8890b0'});
const BLOCKS = {
  // Motion — absolute & relative
  position:  B('Motion','Move To',   '↔','position translate go x y absolute', [['x','x'],['y','y']]),
  moveby:    B('Motion','Move By',   '⇢','offset relative slide dx dy continue', [['x','Δx'],['y','Δy']]),
  forward:   B('Motion','Move Forward','⬆','forward facing direction speed continuous player', [['dist','px/s']]),
  velocity:  B('Motion','Velocity',  '➠','speed continuous pixels per second player control', [['vx','vx'],['vy','vy']]),
  rotation:  B('Motion','Rotate To', '⟳','angle degrees set absolute', [['deg','°']]),
  rotateby:  B('Motion','Spin By',   '↻','rotate relative turn continue', [['deg','Δ°']]),
  scale:     B('Motion','Scale To',  '⤢','size grow shrink set', [['x','x'],['y','y']],.1),
  scaleby:   B('Motion','Scale By',  '⤡','multiply factor', [['x','×x'],['y','×y']],.1),
  // Looks
  color:     B('Looks','Tint',       '●','color colour modulate rgb hex'),
  opacity:   B('Looks','Opacity',    '◐','alpha transparency fade', [['a','%']]),
  visible:   B('Looks','Visible',    '👁','show hide toggle visibility', []),
  // Effects
  shake:     B('Effects','Shake',    '≋','jitter rumble vibrate', [['amt','px']]),
  pulse:     B('Effects','Pulse',    '◉','throb beat grow', [['f','×']],.1),
  bounce:    B('Effects','Bounce',   '⌃','jump hop arc', [['h','px']]),
  // Control
  wait:      B('Control','Wait',     '⏱','pause delay sleep seconds', []),
  repeat:    B('Control','Repeat',   '↺','loop iterate times', [['n','×']]),
  if_gate:   B('Control','If',       '◇','if condition branch then body', []),
  if_end:    B('Control','End If',   '▣','end if close branch chain', []),
  // Input
  key_held:  B('Input','Key Held',   '⌨','keyboard key held down detect', [['key','key']]),
  key_pressed:B('Input','Key Pressed','⇧','keyboard key just pressed edge', [['key','key']]),
  tap:       B('Input','Screen Tap', '☝','touch tap click mobile input', []),
  // Player Controls — continuous when conditions hold
  platformer: B('Player Controls','Platformer','🏃','platformer jump gravity left right wasd continuous', [['speed','spd'],['jump','jmp'],['grav','g']]),
  grid_move:  B('Player Controls','Grid Move','▦','grid tile step based movement continuous', [['size','tile'],['speed','spd']]),
  shooter:    B('Player Controls','Shooter','🔫','top down shooter aim fire continuous', [['speed','spd'],['turn','°/s']]),
  tank:       B('Player Controls','Tank','🚜','tank rotate then drive continuous', [['speed','spd'],['turn','°/s']]),
  point_click:B('Player Controls','Point Click','🖱','click to move continuous path', [['speed','spd']]),
  physics:    B('Player Controls','Physics','⚛','momentum friction continuous', [['accel','acc'],['fric','fric'],['max','max']]),
  // Debug
  log:       B('Debug','Log',        '▤','print console message text', []),
  watch:     B('Debug','Watch',      '◎','monitor track value inspect', []),
};
const KEY_OPTIONS=['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Shift','a','b','c','d','e','f','w','s'];
const CMP_OPTIONS=['>','>=','<','<=','='];

/** User-defined blocks + folders */
let customBlocks = [];
let customFolders = []; // {id,name}
let groupClipboard = null;
const INPUT={keys:new Set(),keysPressed:new Set(),keysReleased:new Set(),tapped:false,tapX:0,tapY:0};
function clearInputEdges(){INPUT.keysPressed.clear();INPUT.keysReleased.clear();INPUT.tapped=false;}

function isCustomType(type){return typeof type==='string'&&type.startsWith('custom_');}
function getCustomDef(type){return customBlocks.find(c=>c.typeKey===type)||null;}
function getBlockDef(type){
  if(BLOCKS[type])return BLOCKS[type];
  const cb=getCustomDef(type);
  if(!cb)return null;
  const folder=customFolders.find(f=>f.id===cb.folderId);
  return{
    cat:folder?('Custom/'+folder.name):'Custom',name:cb.name,icon:cb.icon||'◆',color:cb.color||CATS.Custom,
    fields:(cb.params||[]).map(p=>[p.key,p.label||p.key]),
    kw:'custom '+cb.name+' '+(folder?folder.name:''),step:1,isCustom:true,customId:cb.id,folderId:cb.folderId||null
  };
}
const GROUP = {position:'pos',moveby:'pos',forward:'pos',velocity:'pos',rotation:'rot',rotateby:'rot',scale:'scale',scaleby:'scale',color:'color',opacity:'opacity'};
const RUN={on:false,fired:new Set(),cyc:0}, DBG=[], curLine={};
let dragBlk=null, dragNew=null, showCode=false, fps=60, lastF=performance.now(), lastS=0, curT=null, ACTIVE=0, lastActive=0;
const DUR=0.6;
const bdur=b=>Math.max(0,+(b.values.t??b.values.s??DUR)||0);
const lineDur=l=>l.blocks.reduce((a,b)=>a+bdur(b),0);

