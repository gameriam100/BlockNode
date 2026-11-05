// LIVE PREVIEW — canvas rendering, camera, and preview tools.
// ── PREVIEW ──
const cv=$('preview'),cx=cv.getContext('2d');
function drawPreview(){
  requestAnimationFrame(drawPreview);
  if(!cv.offsetParent){curT=null;return;}
  const r=cv.parentElement.getBoundingClientRect(),d=devicePixelRatio||1,W=Math.max(1,r.width|0),H=Math.max(1,r.height|0);
  if(cv.width!==(W*d|0)||cv.height!==(H*d|0)){cv.width=W*d;cv.height=H*d;}
  cx.setTransform(d,0,0,d,0,0);cx.globalAlpha=1;
  cx.fillStyle=settings.previewBg;cx.fillRect(0,0,W,H);
  const zoom=previewCam.zoom||1;
  const ox=W/2+previewCam.x,oy=H/2+previewCam.y;
  cx.save();
  cx.translate(ox,oy);
  cx.scale(zoom,zoom);
  cx.strokeStyle=settings.grid?'#23263a':'transparent';cx.lineWidth=1/zoom;cx.beginPath();
  const span=Math.max(W,H)/zoom+64;
  for(let x=-span;x<span;x+=32){cx.moveTo(x,-span);cx.lineTo(x,span);}
  for(let y=-span;y<span;y+=32){cx.moveTo(-span,y);cx.lineTo(span,y);}
  cx.stroke();cx.strokeStyle='#3a3e52';cx.beginPath();cx.moveTo(0,-span);cx.lineTo(0,span);cx.moveTo(-span,0);cx.lineTo(span,0);cx.stroke();
  const sc=activeScene(),T=totalTime();let t=null,el=0;
  if(running&&!sc)stopRun(true);
  if(running){el=(performance.now()-runT0)/1000;const inf=hasInf(),cyc=loop&&!inf?Math.floor(el/(T+.5)):0;if(cyc!==RUN.cyc){RUN.cyc=cyc;RUN.fired.clear();}if(!loop&&!inf&&el>T+.2){dbgLog('info','✓ Finished');stopRun(true);}else t=inf?el:loop?el%(T+.5):Math.min(el,T);}
  curT=t;ACTIVE=0;if(running){/* edges cleared at end of frame */} 
  // Continuous player controls: integrate Velocity / Forward while If conditions are true
  if(running && sc){
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0, (now - lastMotionT) / 1000)); // clamp big hitches
    lastMotionT = now;
    sc.nodes.forEach(n=>{
      const {vx,vy,vrot} = getContinuousVelocity(n);
      if(vx || vy || vrot){
        if(!runtimeMotion[n.id]) runtimeMotion[n.id] = {x:0,y:0,rot:0};
        runtimeMotion[n.id].x += vx * dt;
        runtimeMotion[n.id].y += vy * dt;
        runtimeMotion[n.id].rot += vrot * dt;
        ACTIVE++;
      }
    });
  } else {
    lastMotionT = performance.now();
  }
  $('hud').textContent=running?`▶ ${(t??T).toFixed(1)}s / ${T.toFixed(1)}s${loop?' · loop':''}`:(statusMsg||(sc?sc.name+' · Run (F5)':'No scene'));
  drawn=[];if(!sc){cx.restore();return;}
  // nodes drawn in same camera space (origin already at ox,oy * zoom)
  const drawNode=n=>{
    const s=nodeState(n,t);
    const m=s.modulate||{r:255,g:255,b:255,a:255};
    const sx=Math.max(0.01,safeNum(s.scale_x,1));
    const sy=Math.max(0.01,safeNum(s.scale_y,1));
    const alpha=Math.min(1,Math.max(0,safeNum(m.a,255)/255));
    cx.save();
    cx.globalAlpha=alpha;
    cx.translate(safeNum(s.x,0),safeNum(s.y,0));
    cx.rotate((safeNum(s.rotation,0))*Math.PI/180);
    cx.scale(sx,sy);
    n._m=cx.getTransform();
    drawn.push(n);
    const im=n.type==='Sprite2D'&&n.props.texture?imgCache[n.props.texture]:null;
    const ok=im&&im.complete&&im.naturalWidth;
    const w=ok?im.naturalWidth:64,h=ok?im.naturalHeight:64;
    n._sz=[w,h];
    if(ok){
      if(m.r===255&&m.g===255&&m.b===255)cx.drawImage(im,-w/2,-h/2);
      else{
        tintCv.width=w;tintCv.height=h;const o=tintCv.getContext('2d');
        o.drawImage(im,0,0);o.globalCompositeOperation='multiply';
        o.fillStyle=`rgb(${m.r|0},${m.g|0},${m.b|0})`;o.fillRect(0,0,w,h);
        o.globalCompositeOperation='destination-in';o.drawImage(im,0,0);
        o.globalCompositeOperation='source-over';cx.drawImage(tintCv,-w/2,-h/2);
      }
    }else if(n.type==='Sprite2D'){
      cx.fillStyle=`rgba(${m.r|0},${m.g|0},${m.b|0},0.55)`;
      cx.fillRect(-32,-32,64,64);
      cx.strokeStyle='#3ec68a';cx.lineWidth=1;cx.strokeRect(-32,-32,64,64);
      cx.fillStyle='#fff';cx.font='11px sans-serif';cx.textAlign='center';cx.fillText('no PNG',0,4);
    }else if(n.type==='Node2D'){
      cx.strokeStyle='#8ab8f5';cx.lineWidth=1.5;cx.beginPath();
      cx.moveTo(-10,0);cx.lineTo(10,0);cx.moveTo(0,-10);cx.lineTo(0,10);cx.stroke();
    }else{
      cx.strokeStyle='#c89be8';cx.setLineDash([4,3]);cx.strokeRect(-32,-32,64,64);cx.setLineDash([]);
    }
    if(!running&&n.id===selectedNodeId){
      cx.globalAlpha=1;cx.strokeStyle='#5b8dee';
      cx.lineWidth=1.5/Math.max(0.1,Math.abs(sx));
      cx.strokeRect(-w/2,-h/2,w,h);
    }
    cx.restore();
  };
  // World-space draw (absolute props) so parent transform does not hide children
  sc.nodes.forEach(drawNode);
  cx.restore();
  lastActive=ACTIVE;
  if(running)clearInputEdges();
  if(settings.labels){cx.setTransform(1,0,0,1,0,0);cx.globalAlpha=1;cx.fillStyle='#e8c547';cx.font=11*d+'px sans-serif';cx.textAlign='center';drawn.forEach(n=>{const q=n._m.transformPoint(new DOMPoint(0,0));cx.fillText(n.name,q.x,q.y-(n._sz[1]/2+6)*d);});}
}
// Preview camera + tools
let previewCam={x:0,y:0,zoom:1}, previewTool='pan', previewDrag=null;
function setPreviewTool(t){
  previewTool=t;
  ['pan','move','scale'].forEach(k=>{const b=$('pt-'+k);if(b)b.classList.toggle('on',k===t);});
}
function resetPreviewCam(){previewCam={x:0,y:0,zoom:1};}
function screenToWorld(clientX,clientY){
  const r=cv.getBoundingClientRect(),zoom=previewCam.zoom||1;
  return{
    x:(clientX-r.left-(r.width/2+previewCam.x))/zoom,
    y:(clientY-r.top-(r.height/2+previewCam.y))/zoom
  };
}
function hitNodeAt(clientX,clientY){
  const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;
  const x=(clientX-r.left)*d,y=(clientY-r.top)*d;
  for(let i=drawn.length-1;i>=0;i--){
    const n=drawn[i];
    if(!n._m)continue;
    try{
      const p=n._m.inverse().transformPoint(new DOMPoint(x,y));
      if(Math.abs(p.x)<=n._sz[0]/2&&Math.abs(p.y)<=n._sz[1]/2)return n;
    }catch(err){}
  }
  return null;
}
cv.addEventListener('mousedown',e=>{
  const isMiddle=e.button===1;
  const isPan=isMiddle||(e.button===0&&previewTool==='pan'&&!e.shiftKey);
  if(isMiddle)e.preventDefault();
  if(isPan){
    previewDrag={mode:'pan',x:e.clientX,y:e.clientY,cx:previewCam.x,cy:previewCam.y};
    return;
  }
  if(running)return;
  const hit=hitNodeAt(e.clientX,e.clientY);
  if(hit)selectNode(hit.id);
  const n=selectedNode();
  if(!n||n.id===(activeScene()?.rootNode))return;
  if(previewTool==='move'&&e.button===0){
    previewDrag={mode:'move',x:e.clientX,y:e.clientY,nx:n.props.x,ny:n.props.y,id:n.id};
  }else if(previewTool==='scale'&&e.button===0){
    previewDrag={mode:'scale',x:e.clientY,sx:n.props.scale_x,sy:n.props.scale_y,id:n.id};
  }
});
window.addEventListener('mousemove',e=>{
  const pos=$('preview-pos');
  if(pos&&cv.offsetParent){
    const w=screenToWorld(e.clientX,e.clientY);
    pos.textContent=`x${w.x.toFixed(0)} y${w.y.toFixed(0)}`;
  }
  if(!previewDrag)return;
  if(previewDrag.mode==='pan'){
    previewCam.x=previewDrag.cx+(e.clientX-previewDrag.x);
    previewCam.y=previewDrag.cy+(e.clientY-previewDrag.y);
  }else if(previewDrag.mode==='move'){
    const n=activeScene()?.nodes.find(x=>x.id===previewDrag.id);if(!n)return;
    const zoom=previewCam.zoom||1;
    n.props.x=previewDrag.nx+(e.clientX-previewDrag.x)/zoom;
    n.props.y=previewDrag.ny+(e.clientY-previewDrag.y)/zoom;
    renderInspector();
  }else if(previewDrag.mode==='scale'){
    const n=activeScene()?.nodes.find(x=>x.id===previewDrag.id);if(!n)return;
    const dy=(previewDrag.x-e.clientY)*0.01;
    n.props.scale_x=Math.max(0.05,previewDrag.sx+dy);
    n.props.scale_y=Math.max(0.05,previewDrag.sy+dy);
    renderInspector();
  }
});
window.addEventListener('mouseup',()=>{previewDrag=null;});
cv.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
cv.addEventListener('contextmenu',e=>{if(previewTool==='pan')e.preventDefault();});
cv.addEventListener('wheel',e=>{
  if(!cv.offsetParent)return;
  e.preventDefault();
  const factor=e.deltaY>0?0.9:1.1;
  previewCam.zoom=Math.min(64,Math.max(0.05,(previewCam.zoom||1)*factor));
},{passive:false});


