// ── DEBUG ──
function dbgLog(kind,msg){DBG.push({kind,msg,t:running?((performance.now()-runT0)/1000).toFixed(2)+'s':new Date().toLocaleTimeString()});if(DBG.length>300)DBG.shift();renderDebug();}
function renderDebug(){const b=$('dbg-body'),only=$('dbg-logs-only').checked;b.innerHTML=DBG.filter(e=>!only||e.kind==='log').map(e=>`<div class="dbg ${e.kind}"><span>${e.t}</span>${esc(e.msg)}</div>`).join('')||'<div class="dbg info">Nothing logged — press Run or add a Log block.</div>';b.scrollTop=b.scrollHeight;}
function toggleDebug(){const o=$('debug-panel').classList.toggle('open');$('dbg-toggle').textContent=o?'▼':'▲';if(o)renderDebug();}
function dbgTick(now){
  requestAnimationFrame(dbgTick);fps+=(1000/Math.max(1,now-lastF)-fps)*.1;lastF=now;
  if(now-lastS<200)return;lastS=now;
  const sc=activeScene(),n=selectedNode();
  $('dbg-stats').innerHTML=`<span style="color:${running?'var(--accent-green)':'var(--text-muted)'}">● ${running?'running '+(curT!=null?curT.toFixed(2)+'s':''):'idle'}</span> · active ${running?lastActive:0} · nodes ${sc?sc.nodes.length:0} · ${fps.toFixed(0)}fps`;
  if(n){const q=nodeState(n,running?curT:null);$('dbg-live').textContent=`${n.name}: x${q.x.toFixed(1)} y${q.y.toFixed(1)} rot${q.rotation.toFixed(0)}° sx${q.scale_x.toFixed(2)} α${Math.round(q.modulate.a)}`;}else $('dbg-live').textContent='';
}
window.addEventListener('error',e=>dbgLog('err',e.message));

