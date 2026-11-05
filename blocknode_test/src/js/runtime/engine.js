// RUNTIME ENGINE — evaluates and executes project scripts.
// ── RUN ENGINE ──
let view='split',running=false,runT0=0,loop=true,statusMsg='',drawn=[];
let fps2=60,lastF2=performance.now(),lastS2=0,curT2=null;
const hasInf=()=>!!activeScene()?.nodes.some(n=>linesOf(n).some(l=>{
  if(l.off||!l.blocks.length)return false;
  if(l.rep===0)return true;
  // Tracks with If + Velocity/Forward are treated as continuous player controls — don't auto-stop
  const types=l.blocks.map(b=>b.type);
  return types.includes('if_gate') && (types.includes('velocity')||types.includes('forward'));
}));
const hasBlocks=()=>!!activeScene()?.nodes.some(n=>linesOf(n).some(l=>!l.off&&l.blocks.length));
function totalTime(){const sc=activeScene();return sc?Math.max(0,...sc.nodes.flatMap(n=>linesOf(n).filter(l=>!l.off).map(l=>lineDur(l)*(l.rep===0?1:(l.rep??1))))):0;}
function fire(key,kind,msg){if(!RUN.on||RUN.fired.has(key))return;RUN.fired.add(key);dbgLog(kind,msg);}
function evalLine(n,l,t,base,fx){
  const s={...base,modulate:{...base.modulate}},touched=new Set(),D=lineDur(l),rep=l.rep??1;
  // Use continuous time for forever (rep=0) and multi-rep so relative motion accumulates instead of snapping back
  const totalT = (rep === 0) ? t : Math.min(t, D * Math.max(1, rep));
  const completed = (D > 0) ? Math.floor(totalT / D) : 0;
  const tt = (D > 0) ? (totalT % D) : 0;
  const done = D > 0 ? (rep !== 0 && t >= D * rep) : true;
  if(!done) ACTIVE++;
  const iter = completed;
  const elapsed = typeof curT === 'number' ? curT : (t || 0);
  const keyName = k => {
    if (k == null || k === '') return '';
    const s = String(k).trim();
    const map = {space:' ',' ':' ',arrowleft:'ArrowLeft',arrowright:'ArrowRight',arrowup:'ArrowUp',arrowdown:'ArrowDown',enter:'Enter',shift:'Shift'};
    const low = s.toLowerCase();
    if (map[low] !== undefined) return map[low];
    if (s.length === 1) return s.toLowerCase();
    return s;
  };
  const keyHeld = key => {
    const raw = String(key || 'Space');
    const k = keyName(raw);
    return INPUT.keys.has(k) || INPUT.keys.has(raw) || INPUT.keys.has(raw.toLowerCase()) ||
      (raw === 'Space' && (INPUT.keys.has(' ') || INPUT.keys.has('Space'))) ||
      (k === ' ' && INPUT.keys.has('Space'));
  };
  const keyPressed = key => {
    const raw = String(key || 'Space');
    const k = keyName(raw);
    return INPUT.keysPressed.has(k) || INPUT.keysPressed.has(raw) || INPUT.keysPressed.has(raw.toLowerCase()) ||
      (raw === 'Space' && (INPUT.keysPressed.has(' ') || INPUT.keysPressed.has('Space')));
  };
  const cmpNum = (a, op, b) => {
    a = +a; b = +b;
    if (op === '>=') return a >= b; if (op === '<=') return a <= b; if (op === '>') return a > b; if (op === '<') return a < b; return a === b;
  };
  const evalCond = c => {
    if (!c) return true;
    const op = c.op || 'always';
    if (op === 'always') return true;
    if (op === 'never') return false;
    if (op === 'time') return cmpNum(elapsed, c.cmp || '>', c.val ?? 0);
    if (op === 'key') {
      if ((c.mode || 'held') === 'pressed') return keyPressed(c.key || 'Space');
      return keyHeld(c.key || 'Space');
    }
    if (op === 'eq') return cmpNum(c.a ?? 0, '=', c.b ?? 0);
    if (op === 'not') return !evalCond(c.child || {op:'always'});
    if (op === 'and') return evalCond(c.left) && evalCond(c.right);
    if (op === 'or') return evalCond(c.left) || evalCond(c.right);
    if (op === 'tap') return !!INPUT.tapped;
    return true;
  };
  // Relative motion types that should accumulate over completed cycles (no snap-back)
  // velocity / forward / rotateby are handled by continuous player-control pass (getContinuousVelocity)
  // so they are NOT applied as one-shot timeline tweens here — that was causing resets & no "hold to move"
  const RELATIVE = new Set(['moveby','scaleby']);
  const CONTINUOUS = new Set(['velocity','forward','rotateby']);
  const applyMotion = (type, v, e, P, tk, target) => {
    if (CONTINUOUS.has(type)) return; // continuous system handles these
    const dest = target || s;
    if (type === 'position') { dest.x = P(dest.x, v.x); dest.y = P(dest.y, v.y); if (!target) touched.add('pos'); }
    else if (type === 'moveby') { dest.x += (v.x || 0) * e; dest.y += (v.y || 0) * e; if (!target) touched.add('pos'); }
    else if (type === 'rotation') { dest.rotation = P(dest.rotation, v.deg); if (!target) touched.add('rot'); }
    else if (type === 'scale') { dest.scale_x = P(dest.scale_x, v.x); dest.scale_y = P(dest.scale_y, v.y); if (!target) touched.add('scale'); }
    else if (type === 'scaleby') {
      dest.scale_x *= 1 + ((v.x || 1) - 1) * e; dest.scale_y *= 1 + ((v.y || 1) - 1) * e;
      if (!target) touched.add('scale');
    }
    else if (type === 'color') {
      const q = hexToRgb(v.hex);
      if (q) { const m = dest.modulate; m.r = P(m.r, q.r); m.g = P(m.g, q.g); m.b = P(m.b, q.b); }
      if (!target) touched.add('color');
    }
    else if (type === 'opacity') {
      dest.modulate.a = P(dest.modulate.a, Math.min(100, Math.max(0, v.a || 0)) * 2.55);
      if (!target) touched.add('opacity');
    }
    else if (type === 'shake') { if (tk < 1) { const a = (v.amt || 0) * (1 - tk); fx.dx += Math.sin(t * 55) * a; fx.dy += Math.cos(t * 47) * a; } }
    else if (type === 'pulse') { if (tk < 1) { const m = 1 + ((v.f || 1) - 1) * Math.sin(Math.PI * tk); fx.mx *= m; fx.my *= m; } }
    else if (type === 'bounce') { if (tk < 1) fx.dy -= (v.h || 0) * Math.abs(Math.sin(Math.PI * tk)); }
    else if (type === 'log' && !target) { fire(n.id + l.id + iter + type, 'log', `[${n.name}] ${v.msg ?? ''}`); }
  };

  // Helper: walk blocks up to a given progress time (0..D), applying motions. If onlyRelative, skip absolute types.
  const walk = (progress, onlyRelative = false, targetS = null) => {
    let at = 0, skipDepth = 0;
    const dest = targetS || s;
    for (const b of l.blocks) {
      const v = {...(b.values || {})}, d = bdur(b);
      const k = d > 0 ? Math.min(1, Math.max(0, (progress - at) / d)) : 1;
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const P = (a, z) => a + (z - a) * e;

      if (b.type === 'if_end') {
        if (skipDepth > 0) skipDepth--;
        at += d; continue;
      }
      if (b.type === 'if_gate') {
        if (skipDepth > 0) { skipDepth++; at += d; continue; }
        const list = Array.isArray(v.conds) && v.conds.length ? v.conds : [{op:'always'}];
        let ok = true;
        list.forEach((c, i) => {
          const r = evalCond(c);
          if (i === 0) ok = r;
          else if ((c.join || 'and') === 'or') ok = ok || r;
          else ok = ok && r;
        });
        if (!ok) skipDepth++;
        at += d; continue;
      }
      if (skipDepth > 0) { at += d; continue; }
      if (b.type === 'key_held' || b.type === 'key_pressed' || b.type === 'tap') { at += d; continue; }

      const doApply = !onlyRelative || RELATIVE.has(b.type) || isCustomType(b.type);
      if (doApply) {
        if (isCustomType(b.type)) {
          const cb = getCustomDef(b.type);
          const tblocks = cb ? resolveCustomBlocks(cb, v) : [];
          let cat = 0;
          const total = tblocks.reduce((sum, tb) => sum + Math.max(0, +(tb.values?.t ?? tb.values?.s ?? DUR) || 0), 0) || d || DUR;
          const local = k * total;
          for (const tb of tblocks) {
            const tv = {...(tb.values || {})}, td = Math.max(0, +(tv.t ?? tv.s ?? DUR) || 0);
            const tk = td > 0 ? Math.min(1, Math.max(0, (local - cat) / td)) : 1;
            const te = tk < .5 ? 2 * tk * tk : 1 - Math.pow(-2 * tk + 2, 2) / 2;
            const TP = (a, z) => a + (z - a) * te;
            if (!onlyRelative || RELATIVE.has(tb.type)) applyMotion(tb.type, tv, te, TP, tk, targetS);
            if (tk < 1) break; cat += td;
          }
        } else {
          applyMotion(b.type, v, e, P, k, targetS);
        }
      }
      if (k < 1) break;
      at += d;
    }
  };

  // 1) Apply full relative displacement for every completed cycle (accumulates position over loops)
  if (completed > 0 && D > 0) {
    const fullS = {...base, modulate:{...base.modulate}};
    walk(D, true, fullS); // only relative motions, full progress
    const dx = fullS.x - base.x, dy = fullS.y - base.y;
    const drot = fullS.rotation - base.rotation;
    s.x += dx * completed;
    s.y += dy * completed;
    s.rotation += drot * completed;
    // scaleby is multiplicative; approximate by repeating the factor
    if (fullS.scale_x !== base.scale_x || fullS.scale_y !== base.scale_y) {
      const fx = fullS.scale_x / (base.scale_x || 1), fy = fullS.scale_y / (base.scale_y || 1);
      s.scale_x *= Math.pow(fx, completed);
      s.scale_y *= Math.pow(fy, completed);
    }
    if (dx || dy) touched.add('pos');
    if (drot) touched.add('rot');
  }

  // 2) Apply the partial cycle (absolute + relative) on top of the accumulated state
  walk(tt, false, null);

  if (done && l.blocks.length) fire(n.id + l.id + 'done', 'info', `${n.name} · ${l.name} finished`);
  return {s, touched};
}
function safeNum(v,fallback){const n=Number(v);return Number.isFinite(n)?n:fallback;}
// Continuous player-control motion (Velocity / Forward inside Ifs).
// Applied every frame while conditions are true — independent of timeline duration.
const runtimeMotion = {}; // nodeId -> {x,y,rot}
function clearRuntimeMotion(){ for(const k of Object.keys(runtimeMotion)) delete runtimeMotion[k]; }

function getContinuousVelocity(n){
  // Walk every track evaluating ONLY If conditions with live input.
  // Any Velocity / Forward that is not skipped contributes to the current rate.
  let vx=0, vy=0, vrot=0;
  const elapsed = typeof curT==='number' ? curT : 0;
  const keyName = k => {
    if(k==null||k==='')return '';
    const s=String(k).trim();
    const map={space:' ',' ':' ',arrowleft:'ArrowLeft',arrowright:'ArrowRight',arrowup:'ArrowUp',arrowdown:'ArrowDown',enter:'Enter',shift:'Shift'};
    const low=s.toLowerCase();
    if(map[low]!==undefined)return map[low];
    if(s.length===1)return s.toLowerCase();
    return s;
  };
  const keyHeld = key => {
    const raw=String(key||'Space'); const k=keyName(raw);
    return INPUT.keys.has(k)||INPUT.keys.has(raw)||INPUT.keys.has(raw.toLowerCase())||
      (raw==='Space'&&(INPUT.keys.has(' ')||INPUT.keys.has('Space')))||
      (k===' '&&INPUT.keys.has('Space'));
  };
  const keyPressed = key => {
    const raw=String(key||'Space'); const k=keyName(raw);
    return INPUT.keysPressed.has(k)||INPUT.keysPressed.has(raw)||INPUT.keysPressed.has(raw.toLowerCase())||
      (raw==='Space'&&(INPUT.keysPressed.has(' ')||INPUT.keysPressed.has('Space')));
  };
  const cmpNum=(a,op,b)=>{a=+a;b=+b;if(op==='>=')return a>=b;if(op==='<=')return a<=b;if(op==='>')return a>b;if(op==='<')return a<b;return a===b;};
  const evalCond = c => {
    if(!c)return true;
    const op=c.op||'always';
    if(op==='always')return true;
    if(op==='never')return false;
    if(op==='time')return cmpNum(elapsed,c.cmp||'>',c.val??0);
    if(op==='key'){
      if((c.mode||'held')==='pressed')return keyPressed(c.key||'Space');
      return keyHeld(c.key||'Space');
    }
    if(op==='eq')return cmpNum(c.a??0,'=',c.b??0);
    if(op==='tap')return !!INPUT.tapped;
    return true;
  };

  for(const l of linesOf(n)){
    if(l.off||!l.blocks.length)continue;
    let skipDepth=0;
    for(const b of l.blocks){
      if(b.type==='if_end'){ if(skipDepth>0)skipDepth--; continue; }
      if(b.type==='if_gate'){
        if(skipDepth>0){ skipDepth++; continue; }
        const list=Array.isArray(b.values?.conds)&&b.values.conds.length?b.values.conds:[{op:'always'}];
        let ok=true;
        list.forEach((c,i)=>{
          const r=evalCond(c);
          if(i===0)ok=r;
          else if((c.join||'and')==='or')ok=ok||r;
          else ok=ok&&r;
        });
        if(!ok)skipDepth++;
        continue;
      }
      if(skipDepth>0)continue;
      // Active (not skipped) continuous motion blocks
      if(b.type==='velocity'){
        vx += +(b.values?.vx||0);
        vy += +(b.values?.vy||0);
      } else if(b.type==='forward'){
        const speed = +(b.values?.dist||0);
        const rad = ((n._liveRot!=null?n._liveRot:(n.props?.rotation||0))) * Math.PI/180;
        vx += Math.cos(rad)*speed;
        vy += Math.sin(rad)*speed;
      } else if(b.type==='rotateby'){
        vrot += +(b.values?.deg||0);
      } else if(b.type==='platformer'){
        const spd=+(b.values?.speed||180), jmp=+(b.values?.jump||320), g=+(b.values?.grav||900);
        if(keyHeld('ArrowLeft')||keyHeld('a')||keyHeld('A')) vx -= spd;
        if(keyHeld('ArrowRight')||keyHeld('d')||keyHeld('D')) vx += spd;
        // jump on press; gravity always pulls
        if(!runtimeMotion[n.id]) runtimeMotion[n.id]={x:0,y:0,rot:0,vy:0};
        const rt=runtimeMotion[n.id];
        if(rt.vy===undefined) rt.vy=0;
        if(keyPressed('ArrowUp')||keyPressed('w')||keyPressed('W')||keyPressed('Space')) rt.vy = -jmp;
        rt.vy += g * 0.016; // approx frame; refined in integrator
        vy += rt.vy;
      } else if(b.type==='grid_move'){
        const size=+(b.values?.size||32), spd=+(b.values?.speed||8);
        if(!n._grid) n._grid={tx:Math.round((n.props.x||0)/size),ty:Math.round((n.props.y||0)/size),moving:false};
        // step one tile when key pressed and idle
        if(!n._grid.moving){
          if(keyPressed('ArrowLeft')||keyPressed('a')) {n._grid.tx--; n._grid.moving=true;}
          else if(keyPressed('ArrowRight')||keyPressed('d')) {n._grid.tx++; n._grid.moving=true;}
          else if(keyPressed('ArrowUp')||keyPressed('w')) {n._grid.ty--; n._grid.moving=true;}
          else if(keyPressed('ArrowDown')||keyPressed('s')) {n._grid.ty++; n._grid.moving=true;}
        }
        const targetX=n._grid.tx*size, targetY=n._grid.ty*size;
        const dx=targetX-(n.props.x+(runtimeMotion[n.id]?.x||0));
        const dy=targetY-(n.props.y+(runtimeMotion[n.id]?.y||0));
        const dist=Math.hypot(dx,dy);
        if(dist<1){ n._grid.moving=false; }
        else { const s=Math.min(spd*10, dist); vx+=dx/dist*s; vy+=dy/dist*s; }
      } else if(b.type==='shooter'||b.type==='tank'){
        const spd=+(b.values?.speed||140), turn=+(b.values?.turn||200);
        if(keyHeld('ArrowLeft')||keyHeld('a')) vrot -= turn;
        if(keyHeld('ArrowRight')||keyHeld('d')) vrot += turn;
        const drive = (keyHeld('ArrowUp')||keyHeld('w')) ? 1 : ((keyHeld('ArrowDown')||keyHeld('s')) ? -1 : 0);
        if(drive){
          const rad=((n._liveRot!=null?n._liveRot:(n.props?.rotation||0)))*Math.PI/180;
          vx += Math.cos(rad)*spd*drive;
          vy += Math.sin(rad)*spd*drive;
        }
      } else if(b.type==='point_click'){
        const spd=+(b.values?.speed||140);
        if(INPUT.tapped){ n._goto={x:INPUT.tapX- (cv?.parentElement?.getBoundingClientRect().width||0)/2, y:INPUT.tapY}; }
        // simple seek toward last click in world-ish space
        if(n._goto){
          const cx0=(n.props.x+(runtimeMotion[n.id]?.x||0));
          const cy0=(n.props.y+(runtimeMotion[n.id]?.y||0));
          // map screen-ish; keep simple: use tap as relative nudge
          const dx=n._goto.x - cx0, dy=n._goto.y - cy0;
          const dist=Math.hypot(dx,dy);
          if(dist>4){ vx+=dx/dist*spd; vy+=dy/dist*spd; }
        }
      } else if(b.type==='physics'){
        const acc=+(b.values?.accel||600), fric=+(b.values?.fric||4), mx=+(b.values?.max||220);
        if(!runtimeMotion[n.id]) runtimeMotion[n.id]={x:0,y:0,rot:0,vx:0,vy:0};
        const rt=runtimeMotion[n.id];
        if(rt.vx===undefined){rt.vx=0;rt.vy=0;}
        let ax=0,ay=0;
        if(keyHeld('ArrowLeft')||keyHeld('a')) ax-=acc;
        if(keyHeld('ArrowRight')||keyHeld('d')) ax+=acc;
        if(keyHeld('ArrowUp')||keyHeld('w')) ay-=acc;
        if(keyHeld('ArrowDown')||keyHeld('s')) ay+=acc;
        rt.vx += ax*0.016; rt.vy += ay*0.016;
        rt.vx *= Math.max(0,1-fric*0.016); rt.vy *= Math.max(0,1-fric*0.016);
        const sp=Math.hypot(rt.vx,rt.vy);
        if(sp>mx){rt.vx*=mx/sp;rt.vy*=mx/sp;}
        vx+=rt.vx; vy+=rt.vy;
      }
    }
  }
  return {vx,vy,vrot};
}

function nodeState(n,t){
  const p=n.props||{};
  const mod=p.modulate||{r:255,g:255,b:255,a:255};
  const base={
    x:safeNum(p.x,0),y:safeNum(p.y,0),rotation:safeNum(p.rotation,0),
    scale_x:safeNum(p.scale_x,1)||1,scale_y:safeNum(p.scale_y,1)||1,
    modulate:{r:safeNum(mod.r,255),g:safeNum(mod.g,255),b:safeNum(mod.b,255),a:safeNum(mod.a,255)}
  };
  // Apply accumulated continuous motion from player controls
  const rt = runtimeMotion[n.id] || {x:0,y:0,rot:0};
  base.x += rt.x; base.y += rt.y; base.rotation += rt.rot;
  n._liveRot = base.rotation;

  if(t==null||t===undefined)return base;
  const out={x:base.x,y:base.y,rotation:base.rotation,scale_x:base.scale_x,scale_y:base.scale_y,modulate:{...base.modulate}};
  const fx={dx:0,dy:0,mx:1,my:1};
  try{
    // Timeline evaluation for absolute + non-continuous relative blocks
    let runningBase = {...base, modulate:{...base.modulate}};
    for(const l of linesOf(n)){
      if(l.off||!l.blocks.length)continue;
      const{s,touched}=evalLine(n,l,t,runningBase,fx);
      if(touched.has('pos')){out.x=safeNum(s.x,out.x);out.y=safeNum(s.y,out.y); runningBase.x=out.x; runningBase.y=out.y;}
      if(touched.has('rot')){out.rotation=safeNum(s.rotation,out.rotation); runningBase.rotation=out.rotation;}
      if(touched.has('scale')){out.scale_x=safeNum(s.scale_x,out.scale_x)||1; out.scale_y=safeNum(s.scale_y,out.scale_y)||1; runningBase.scale_x=out.scale_x; runningBase.scale_y=out.scale_y;}
      if(touched.has('color')&&s.modulate){out.modulate.r=safeNum(s.modulate.r,255);out.modulate.g=safeNum(s.modulate.g,255);out.modulate.b=safeNum(s.modulate.b,255); runningBase.modulate={...out.modulate};}
      if(touched.has('opacity')&&s.modulate){out.modulate.a=safeNum(s.modulate.a,255); runningBase.modulate.a=out.modulate.a;}
    }
  }catch(err){console.warn('nodeState',err);}
  out.x=safeNum(out.x+fx.dx,base.x);
  out.y=safeNum(out.y+fx.dy,base.y);
  out.scale_x=Math.max(0.01,safeNum(out.scale_x*fx.mx,1));
  out.scale_y=Math.max(0.01,safeNum(out.scale_y*fx.my,1));
  out.modulate.a=Math.min(255,Math.max(0,safeNum(out.modulate.a,255)));
  n._liveRot = out.rotation;
  return out;
}
function toggleRun(){running?stopRun():startRun();}
function startRun(){
  const sc=activeScene();if(!sc)return setStatus('Nothing to run — create a scene first');
  if(view==='script'||view==='assets'||view==='art')setView('split');
  if(!hasBlocks())return setStatus('No blocks to run — add blocks to a node');
  RUN.on=true;RUN.fired=new Set();RUN.cyc=0;running=true;runT0=performance.now();clearInputEdges();clearRuntimeMotion();setRunUI();
  lastMotionT = performance.now();
  dbgLog('info',`▶ Run "${sc.name}" · ${sc.nodes.reduce((a,n)=>a+linesOf(n).filter(l=>!l.off&&l.blocks.length).length,0)} line(s)`);
  sc.nodes.forEach(n=>{const L=linesOf(n);L.forEach(l=>{if(l.off)dbgLog('warn',`${n.name}: "${l.name}" disabled`);else if(!l.blocks.length&&L.length>1)dbgLog('warn',`${n.name}: "${l.name}" empty`);});if(n.type==='Sprite2D'&&!n.props.texture&&L.some(l=>l.blocks.length))dbgLog('warn',`${n.name}: no PNG assigned`);});
}
function stopRun(quiet){
  if(running){
    const sc=activeScene();
    if(sc&&curT!=null&&Number.isFinite(curT)){
      sc.nodes.forEach(n=>{
        const final=nodeState(n,curT);
        if(!Number.isFinite(final.x)||!Number.isFinite(final.y))return;
        n.props.x=final.x;n.props.y=final.y;n.props.rotation=final.rotation;
        n.props.scale_x=Math.max(0.01,final.scale_x);n.props.scale_y=Math.max(0.01,final.scale_y);
        n.props.modulate={
          r:safeNum(final.modulate.r,255),g:safeNum(final.modulate.g,255),
          b:safeNum(final.modulate.b,255),a:Math.min(255,Math.max(0,safeNum(final.modulate.a,255)))
        };
      });
      renderInspector();
    }
    if(!quiet)dbgLog('info','■ Stopped');
  }
  running=false;RUN.on=false;clearRuntimeMotion();setRunUI();
}
let lastMotionT = performance.now();
function setRunUI(){const b=$('run-btn');b.classList.toggle('stop',running);b.innerHTML=running?'<svg viewBox="0 0 10 10"><rect x="2" y="2" width="6" height="6"/></svg> Stop':'<svg viewBox="0 0 10 10"><polygon points="2,1 9,5 2,9"/></svg> Run';}
function setStatus(m){statusMsg=m;const t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(setStatus.t);setStatus.t=setTimeout(()=>{statusMsg='';t.style.display='none';},2500);}

