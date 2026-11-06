// ── CODE VIEW ──
function genCode(n){
  const F={position:v=>`move_to(${v.x}, ${v.y}`,moveby:v=>`move_by(${v.x}, ${v.y}`,rotation:v=>`rotate_to(${v.deg}`,rotateby:v=>`spin_by(${v.deg}`,scale:v=>`scale_to(${v.x}, ${v.y}`,scaleby:v=>`scale_by(${v.x}, ${v.y}`,color:v=>`tint("${v.hex}"`,opacity:v=>`fade_to(${v.a}`,shake:v=>`shake(${v.amt}`,pulse:v=>`pulse(${v.f}`,bounce:v=>`bounce(${v.h}`,wait:()=>'wait(',log:v=>`log("${v.msg??''}"`,watch:v=>`watch("${v.msg??''}"`,visible:()=>'set_visible(',repeat:v=>`repeat(${v.n}`,ifblock:()=>'if ('};
  return`# ${n.name} (${n.type}) — lines run in parallel\n`+linesOf(n).map(l=>`\n${l.off?'# (disabled)\n':''}line "${l.name}" ${l.rep===0?'forever':'×'+(l.rep??1)}:\n`+(l.blocks.map(b=>{const d=getBlockDef(b.type);const f=F[b.type]?.(b.values)||(isCustomType(b.type)?`call_custom("${d?.name||b.type}"`:(b.type+'('));return`    ${f}${bdur(b)?`, time=${bdur(b)}`:''})`;}).join('\n')||'    pass')).join('\n');
}
function updateCode(){const n=selectedNode();$('code-view').textContent=n?genCode(n):'';}

