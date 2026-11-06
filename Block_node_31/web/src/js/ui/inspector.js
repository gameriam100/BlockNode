// ── INSPECTOR ──
function renderInspector(){
  const node=selectedNode(),body=$('inspector-body'),title=$('inspector-title');
  if(!node){title.textContent='Properties';body.innerHTML='<div style="padding:14px 10px;color:var(--text-muted);font-size:12px;text-align:center">Select a node</div>';return;}
  title.textContent='Properties · '+node.name;
  const p=node.props||{};
  if(!p.modulate)p.modulate={r:255,g:255,b:255,a:255};
  const mc=p.modulate;
  const modHex=rgbToHex(mc.r||255,mc.g||255,mc.b||255);
  const alpha01=((mc.a!=null?mc.a:255)/255);
  body.innerHTML=`
    <div class="inspector-search-fixed"><span>⌕</span><input id="inspector-search" type="text" placeholder="Search properties…" autocomplete="off" oninput="filterInspectorProps(this.value)"/></div>
    <div class="inspector-scroll" id="inspector-scroll">
    <div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Transform</div>
      <div class="inspector-section-content">
        ${irow('X',`<input class="inspector-val scrub-num" type="number" value="${p.x}" onchange="setNodeProp('x',this.value)"/>`,'x')}
        ${irow('Y',`<input class="inspector-val scrub-num" type="number" value="${p.y}" onchange="setNodeProp('y',this.value)"/>`,'y')}
        ${irow('Rot°',`<input class="inspector-val scrub-num" type="number" value="${p.rotation}" onchange="setNodeProp('rotation',this.value)"/>`,'rotation')}
        ${irow('Scale X',`<input class="inspector-val scrub-num" type="number" step="0.1" value="${p.scale_x}" onchange="setNodeProp('scale_x',this.value)"/>`,'scale_x')}
        ${irow('Scale Y',`<input class="inspector-val scrub-num" type="number" step="0.1" value="${p.scale_y}" onchange="setNodeProp('scale_y',this.value)"/>`,'scale_y')}
      </div>
    </div>
    <div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Visibility</div>
      <div class="inspector-section-content">
        ${irow('Color',`<input type="color" class="inspector-color" value="${modHex}" oninput="liveModulateFromHex(this)" onchange="commitModulateFromHex(this.value)" title="Drag to pick color"/><input class="inspector-val inspector-hex" type="text" value="${modHex}" onchange="commitModulateFromHex(this.value)"/>`,'modulate')}
        ${irow('Alpha',`<input class="inspector-val scrub-num" type="number" min="0" max="1" step="0.01" value="${alpha01.toFixed(2)}" onchange="setNodeAlpha01(this.value)"/>`,'alpha')}
      </div>
    </div>
    ${node.type==='Sprite2D'?`<div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Sprite2D</div>
      <div class="inspector-section-content">
        ${irow('Texture',texUI(node))}
        ${irow('Centered','<input class="inspector-val" type="text" value="true" style="width:60px" readonly/>')}
      </div>
    </div>`:''}
    ${node.type==='Camera2D'?`<div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Camera2D</div>
      <div class="inspector-section-content">
        ${irow('Zoom X',`<input class="inspector-val scrub-num" type="number" step="0.1" min="0.01" value="${p.zoom_x??1}" onchange="setNodeProp('zoom_x',this.value)"/>`)}
        ${irow('Zoom Y',`<input class="inspector-val scrub-num" type="number" step="0.1" min="0.01" value="${p.zoom_y??1}" onchange="setNodeProp('zoom_y',this.value)"/>`)}
        ${irow('Offset X',`<input class="inspector-val scrub-num" type="number" value="${p.offset_x??0}" onchange="setNodeProp('offset_x',this.value)"/>`)}
        ${irow('Offset Y',`<input class="inspector-val scrub-num" type="number" value="${p.offset_y??0}" onchange="setNodeProp('offset_y',this.value)"/>`)}
        ${irow('Current',`<button type="button" class="bool-toggle ${p.current?'on':''}" onclick="toggleNodeBool('current')">${p.current?'On':'Off'}</button>`)}
        ${irow('Drag H',`<button type="button" class="bool-toggle ${p.drag_horizontal_enabled?'on':''}" onclick="toggleNodeBool('drag_horizontal_enabled')">${p.drag_horizontal_enabled?'On':'Off'}</button>`)}
        ${irow('Drag V',`<button type="button" class="bool-toggle ${p.drag_vertical_enabled?'on':''}" onclick="toggleNodeBool('drag_vertical_enabled')">${p.drag_vertical_enabled?'On':'Off'}</button>`)}
      </div>
    </div>
    <div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Limits</div>
      <div class="inspector-section-content">
        ${irow('Left',`<input class="inspector-val scrub-num" type="number" value="${p.limit_left??-10000000}" onchange="setNodeProp('limit_left',this.value)"/>`)}
        ${irow('Top',`<input class="inspector-val scrub-num" type="number" value="${p.limit_top??-10000000}" onchange="setNodeProp('limit_top',this.value)"/>`)}
        ${irow('Right',`<input class="inspector-val scrub-num" type="number" value="${p.limit_right??10000000}" onchange="setNodeProp('limit_right',this.value)"/>`)}
        ${irow('Bottom',`<input class="inspector-val scrub-num" type="number" value="${p.limit_bottom??10000000}" onchange="setNodeProp('limit_bottom',this.value)"/>`)}
      </div>
    </div>`:''}
    ${node.type==='CollisionShape2D'?`<div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> CollisionShape2D</div>
      <div class="inspector-section-content">
        ${irow('Shape',`<select class="inspector-val" style="width:100px" onchange="setNodePropStr('shape',this.value)">
          ${['rectangle','circle','capsule'].map(s=>`<option value="${s}"${(p.shape||'rectangle')===s?' selected':''}>${s}</option>`).join('')}
        </select>`)}
        ${irow('Width',`<input class="inspector-val scrub-num" type="number" min="1" value="${p.width??32}" onchange="setNodeProp('width',this.value)"/>`)}
        ${irow('Height',`<input class="inspector-val scrub-num" type="number" min="1" value="${p.height??32}" onchange="setNodeProp('height',this.value)"/>`)}
        ${irow('Radius',`<input class="inspector-val scrub-num" type="number" min="1" value="${p.radius??16}" onchange="setNodeProp('radius',this.value)"/>`)}
        ${irow('Disabled',`<button type="button" class="bool-toggle ${p.disabled?'on':''}" onclick="toggleNodeBool('disabled')">${p.disabled?'On':'Off'}</button>`)}
        ${irow('One-way',`<button type="button" class="bool-toggle ${p.one_way_collision?'on':''}" onclick="toggleNodeBool('one_way_collision')">${p.one_way_collision?'On':'Off'}</button>`)}
      </div>
    </div>`:''}
    ${node.type==='TileMapLayer'?`<div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> TileMapLayer</div>
      <div class="inspector-section-content">
        ${irow('Tile Size',`<input class="inspector-val scrub-num" type="number" min="1" value="${p.tile_size??16}" onchange="setNodeProp('tile_size',this.value)"/>`)}
        ${irow('Map W',`<input class="inspector-val scrub-num" type="number" min="1" value="${p.map_width??32}" onchange="setNodeProp('map_width',this.value)"/>`)}
        ${irow('Map H',`<input class="inspector-val scrub-num" type="number" min="1" value="${p.map_height??18}" onchange="setNodeProp('map_height',this.value)"/>`)}
        ${irow('Layer',`<input class="inspector-val scrub-num" type="number" value="${p.layer??0}" onchange="setNodeProp('layer',this.value)"/>`)}
        ${irow('Z Index',`<input class="inspector-val scrub-num" type="number" value="${p.z_index??0}" onchange="setNodeProp('z_index',this.value)"/>`)}
        ${irow('Collision',`<button type="button" class="bool-toggle ${p.collision_enabled!==false?'on':''}" onclick="toggleNodeBool('collision_enabled')">${p.collision_enabled!==false?'On':'Off'}</button>`)}
        ${irow('Tileset',`<span style="font:11px var(--font-mono);color:var(--text-muted)">${p.tileset||'— none'}</span>`)}
      </div>
    </div>`:''}
    ${['Area2D','StaticBody2D','CharacterBody2D','RigidBody2D'].includes(node.type)?`<div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> ${node.type}</div>
      <div class="inspector-section-content">
        ${irow('Layer',`<input class="inspector-val scrub-num" type="number" min="0" value="${p.collision_layer??1}" onchange="setNodeProp('collision_layer',this.value)"/>`)}
        ${irow('Mask',`<input class="inspector-val scrub-num" type="number" min="0" value="${p.collision_mask??1}" onchange="setNodeProp('collision_mask',this.value)"/>`)}
        ${node.type==='CharacterBody2D'?irow('Vel X',`<input class="inspector-val scrub-num" type="number" value="${p.velocity_x??0}" onchange="setNodeProp('velocity_x',this.value)"/>`)+irow('Vel Y',`<input class="inspector-val scrub-num" type="number" value="${p.velocity_y??0}" onchange="setNodeProp('velocity_y',this.value)"/>`):''}
        ${node.type==='Area2D'?irow('Monitoring',`<input type="checkbox" ${p.monitoring!==false?'checked':''} onchange="setNodePropBool('monitoring',this.checked)"/>`)+irow('Monitorable',`<input type="checkbox" ${p.monitorable!==false?'checked':''} onchange="setNodePropBool('monitorable',this.checked)"/>`):''}
        ${node.type==='RigidBody2D'?irow('Mass',`<input class="inspector-val scrub-num" type="number" step="0.1" min="0.01" value="${p.mass??1}" onchange="setNodeProp('mass',this.value)"/>`)+irow('Gravity',`<input class="inspector-val scrub-num" type="number" step="0.1" value="${p.gravity_scale??1}" onchange="setNodeProp('gravity_scale',this.value)"/>`):''}
      </div>
    </div>`:''}
    ${node.type==='Button'?`<div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Button</div>
      <div class="inspector-section-content">
        ${irow('Text',`<input class="inspector-val" type="text" value="${esc(p.text||'Button')}" onchange="setNodePropStr('text',this.value)"/>`)}
        ${irow('Disabled',`<button type="button" class="bool-toggle ${p.disabled?'on':''}" onclick="toggleNodeBool('disabled')">${p.disabled?'On':'Off'}</button>`)}
        ${irow('Toggle',`<button type="button" class="bool-toggle ${p.toggle_mode?'on':''}" onclick="toggleNodeBool('toggle_mode')">${p.toggle_mode?'On':'Off'}</button>`)}
      </div>
    </div>`:''}
    ${node.type==='Label'?`<div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Label</div>
      <div class="inspector-section-content">
        ${irow('Text',`<input class="inspector-val" type="text" value="${esc(p.text||'Label')}" onchange="setNodePropStr('text',this.value)"/>`)}
        ${irow('Font Size',`<input class="inspector-val scrub-num" type="number" min="8" value="${p.font_size??14}" onchange="setNodeProp('font_size',this.value)"/>`)}
        ${irow('Align',`<select class="inspector-val" style="width:80px" onchange="setNodePropStr('align',this.value)">
          ${['left','center','right'].map(a=>`<option value="${a}"${(p.align||'left')===a?' selected':''}>${a}</option>`).join('')}
        </select>`)}
      </div>
    </div>`:''}
    ${node.type==='Timer'?`<div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Timer</div>
      <div class="inspector-section-content">
        ${irow('Wait (s)',`<input class="inspector-val scrub-num" type="number" step="0.1" min="0.01" value="${p.wait_time??1}" onchange="setNodeProp('wait_time',this.value)"/>`)}
        ${irow('One Shot',`<button type="button" class="bool-toggle ${p.one_shot?'on':''}" onclick="toggleNodeBool('one_shot')">${p.one_shot?'On':'Off'}</button>`)}
        ${irow('Autostart',`<button type="button" class="bool-toggle ${p.autostart?'on':''}" onclick="toggleNodeBool('autostart')">${p.autostart?'On':'Off'}</button>`)}
        ${irow('Paused',`<button type="button" class="bool-toggle ${p.paused?'on':''}" onclick="toggleNodeBool('paused')">${p.paused?'On':'Off'}</button>`)}
      </div>
    </div>`:''}
    ${['AnimatedSprite2D','CollisionPolygon2D','Path2D','NavigationRegion2D','ProgressBar','PointLight2D','CPUParticles2D','ParallaxBackground','TextureRect','Panel'].includes(node.type)?`<div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> ${node.type}</div>
      <div class="inspector-section-content">
        <div style="padding:8px 10px;color:var(--text-muted);font-size:11px;line-height:1.4">Properties for this node type are not fully implemented yet. Marked blank in app — transform &amp; script still work.</div>
      </div>
    </div>`:''}
    ${node.type==='Audio'?(()=>{
      const stream=assets.find(a=>a.id===p.stream);
      const isCustom=stream&&stream.kind==='custom';
      return`<div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Audio Stream</div>
      <div class="inspector-section-content">
        ${irow('Stream',streamUI(node))}
        ${isCustom?`<div class="inspector-row"><button class="btn btn-ghost sm" style="flex:1;margin:2px 10px" onclick="openCustomAudio('${p.stream}')">Open in Audio Tab ✎</button></div>`:''}
        ${irow('Kind',`<span style="font:11px var(--font-mono);color:var(--accent-teal)">${stream?(stream.kind==='custom'?'Custom ★':'Imported file'):'—'}</span>`)}
      </div>
    </div>
    <div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Playback</div>
      <div class="inspector-section-content">
        ${irow('Volume (dB)',`<input class="inspector-val scrub-num" type="number" step="0.1" value="${p.volume_db??0}" onchange="setNodeProp('volume_db',this.value)"/>`)}
        ${irow('Pitch Scale',`<input class="inspector-val scrub-num" type="number" step="0.01" min="0.01" max="4" value="${p.pitch_scale??1}" onchange="setNodeProp('pitch_scale',this.value)"/>`)}
        ${irow('Autoplay',`<button type="button" class="bool-toggle ${p.autoplay?'on':''}" onclick="toggleNodeBool('autoplay')">${p.autoplay?'On':'Off'}</button>`)}
        ${irow('Loop',`<button type="button" class="bool-toggle ${p.loop?'on':''}" onclick="toggleNodeBool('loop')">${p.loop?'On':'Off'}</button>`)}
        ${irow('Playing',`<button type="button" class="bool-toggle ${p.playing?'on':''}" onclick="toggleNodeBool('playing')">${p.playing?'On':'Off'}</button>`)}
        ${irow('Paused',`<button type="button" class="bool-toggle ${p.stream_paused?'on':''}" onclick="toggleNodeBool('stream_paused')">${p.stream_paused?'On':'Off'}</button>`)}
      </div>
    </div>
    <div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Mix / Bus</div>
      <div class="inspector-section-content">
        ${irow('Bus',`<select class="inspector-val" style="width:88px" onchange="setNodePropStr('bus',this.value)">
          ${['Master','SFX','Music','Voice','Ambient'].map(b=>`<option value="${b}"${(p.bus||'Master')===b?' selected':''}>${b}</option>`).join('')}
        </select>`)}
        ${irow('Mix Target',`<select class="inspector-val" style="width:88px" onchange="setNodeProp('mix_target',this.value)">
          <option value="0"${(p.mix_target??0)==0?' selected':''}>Stereo</option>
          <option value="1"${p.mix_target==1?' selected':''}>Surround</option>
          <option value="2"${p.mix_target==2?' selected':''}>Center</option>
        </select>`)}
      </div>
    </div>
    <div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> 3D / Attenuation</div>
      <div class="inspector-section-content">
        ${irow('Max Distance',`<input class="inspector-val scrub-num" type="number" step="10" min="0" value="${p.max_distance??2000}" onchange="setNodeProp('max_distance',this.value)"/>`)}
        ${irow('Attenuation',`<input class="inspector-val scrub-num" type="number" step="0.1" min="0" max="10" value="${p.attenuation??1}" onchange="setNodeProp('attenuation',this.value)"/>`)}
        ${irow('Area Mask',`<input class="inspector-val scrub-num" type="number" min="0" value="${p.area_mask??1}" onchange="setNodeProp('area_mask',this.value)"/>`)}
      </div>
    </div>`;
    })():''}
    <div class="inspector-section">
      <div class="inspector-section-header open"><span class="arrow">▶</span> Script</div>
      <div class="inspector-section-content">
        ${irow('Lines',`<span style="font:11px var(--font-mono);color:var(--accent-teal)">${(typeof linesOf==='function'?linesOf(node):[]).length}</span>`)}
        ${irow('Blocks',`<span style="font:11px var(--font-mono);color:var(--accent-teal)">${(typeof linesOf==='function'?linesOf(node):[]).reduce((a,l)=>a+(l.blocks?l.blocks.length:0),0)}</span>`)}
        <div class="inspector-row"><button class="btn btn-ghost sm" style="flex:1;margin:2px 10px" onclick="setView(view==='scene'?'split':'script')">Open Script</button></div>
      </div>
    </div>
    </div>`;
}

function filterInspectorProps(q){
  q=(q||'').trim().toLowerCase();
  const scroll=$('inspector-scroll');
  if(!scroll)return;
  scroll.querySelectorAll('.inspector-row').forEach(row=>{
    const key=(row.querySelector('.inspector-key')&&row.querySelector('.inspector-key').textContent)||'';
    row.style.display=(!q||key.toLowerCase().includes(q))?'':'none';
  });
}

function setNodePropBool(key,val){const n=selectedNode();if(!n)return;n.props[key]=!!val;renderInspector();}
function toggleNodeBool(key){const n=selectedNode();if(!n)return;n.props[key]=!n.props[key];renderInspector();}
function setNodePropStr(key,val){const n=selectedNode();if(!n)return;n.props[key]=val;renderInspector();}

function irow(k,v,resetKey){
  const resetBtn = resetKey
    ? `<button type="button" class="prop-reset" data-reset="${esc(resetKey)}" title="Reset to default" aria-label="Reset">↺</button>`
    : '';
  return `<div class="inspector-row"><span class="inspector-key">${k}</span><div class="inspector-controls">${v}${resetBtn}</div></div>`;
}
function toggleSection(header){
  if(!header)return;
  header.classList.toggle('open');
  const c=header.nextElementSibling;
  if(c)c.style.display=header.classList.contains('open')?'':'none';
}
document.addEventListener('click',e=>{
  const resetBtn=e.target.closest('.prop-reset');
  if(resetBtn){
    e.preventDefault();
    e.stopPropagation();
    const key=resetBtn.getAttribute('data-reset');
    if(key)resetNodeProp(key);
    return;
  }
  const h=e.target.closest('.inspector-section-header');
  if(h&&!e.target.closest('input,button,select')){
    toggleSection(h);
  }
});
function resetNodeProp(key){
  const n=selectedNode();
  if(!n)return;
  const defs=defaultProps(n.type||'Node2D');
  if(key==='modulate'||key==='color'){
    n.props.modulate={r:255,g:255,b:255,a:255};
  }else if(key==='alpha'){
    if(!n.props.modulate)n.props.modulate={r:255,g:255,b:255,a:255};
    n.props.modulate.a=255;
  }else if(Object.prototype.hasOwnProperty.call(defs,key)){
    n.props[key]=typeof defs[key]==='object'&&defs[key]!==null?JSON.parse(JSON.stringify(defs[key])):defs[key];
  }else{
    delete n.props[key];
  }
  renderInspector();
  if(typeof renderSceneTree==='function')renderSceneTree();
}
function setNodeProp(key,val){const n=selectedNode();if(!n)return;const num=parseFloat(val);n.props[key]=Number.isFinite(num)?num:0;}
function setNodeModulate(key,val){const n=selectedNode();if(!n||!n.props.modulate)return;n.props.modulate[key]=parseInt(val,10)||0;renderInspector();}
function setNodeAlpha01(val){const n=selectedNode();if(!n||!n.props.modulate)return;let a=parseFloat(val);if(!Number.isFinite(a))a=1;a=Math.min(1,Math.max(0,a));n.props.modulate.a=Math.round(a*255);renderInspector();}
// Live color update WITHOUT re-rendering inspector (keeps native color picker open while dragging)
function liveModulateFromHex(el){
  const n=selectedNode();if(!n||!n.props.modulate)return;
  const hex=el.value;const rgb=hexToRgb(hex);if(!rgb)return;
  n.props.modulate.r=rgb.r;n.props.modulate.g=rgb.g;n.props.modulate.b=rgb.b;
  const hexInput=el.parentElement&&el.parentElement.querySelector('.inspector-hex');
  if(hexInput)hexInput.value=hex;
}
function commitModulateFromHex(hex){
  const n=selectedNode();if(!n||!n.props.modulate)return;
  const rgb=hexToRgb(hex);if(!rgb)return;
  n.props.modulate.r=rgb.r;n.props.modulate.g=rgb.g;n.props.modulate.b=rgb.b;
  renderInspector();
}
function setModulateFromHex(hex){commitModulateFromHex(hex);}

// Premiere-style horizontal scrub on number fields
(function initNumberScrub(){
  let scrub=null;
  document.addEventListener('mousedown',e=>{
    const inp=e.target.closest&&e.target.closest('input.scrub-num,input.inspector-val[type=number]');
    if(!inp||e.button!==0)return;
    // Only scrub when not focusing for typing — use Alt or middle of field empty click near edge
    // Always allow drag-scrub from the input (user can still double-click to type)
    if(e.detail>1)return; // let double-click select text
    scrub={
      el:inp,
      x0:e.clientX,
      v0:parseFloat(inp.value)||0,
      step:parseFloat(inp.step)||1,
      min:inp.min!==''?parseFloat(inp.min):null,
      max:inp.max!==''?parseFloat(inp.max):null,
      moved:false
    };
  },true);
  document.addEventListener('mousemove',e=>{
    if(!scrub)return;
    const dx=e.clientX-scrub.x0;
    if(!scrub.moved&&Math.abs(dx)<3)return;
    scrub.moved=true;
    e.preventDefault();
    // pixels → value: 1px ≈ step, shift = finer (0.1x), ctrl = coarser (10x)
    let mult=scrub.step;
    if(e.shiftKey)mult*=0.1;
    if(e.ctrlKey||e.metaKey)mult*=10;
    let v=scrub.v0+dx*mult;
    if(scrub.min!=null&&!isNaN(scrub.min))v=Math.max(scrub.min,v);
    if(scrub.max!=null&&!isNaN(scrub.max))v=Math.min(scrub.max,v);
    // round sensibly
    const decimals=String(scrub.step).includes('.')?String(scrub.step).split('.')[1].length:0;
    v=Number(v.toFixed(Math.max(decimals,2)));
    scrub.el.value=v;
    scrub.el.dispatchEvent(new Event('input',{bubbles:true}));
  },true);
  document.addEventListener('mouseup',e=>{
    if(!scrub)return;
    if(scrub.moved){
      scrub.el.dispatchEvent(new Event('change',{bubbles:true}));
      e.preventDefault();
    }
    scrub=null;
  },true);
})();

function renderScriptProps(){
  const body=$('scriptprops-body');
  if(!body)return;
  const n=typeof selectedNode==='function'?selectedNode():null;
  if(!n){
    body.innerHTML='<div style="padding:16px 10px;color:var(--text-muted);font-size:12px;text-align:center">Select a node</div>';
    return;
  }
  try{
    const lines=typeof linesOf==='function'?linesOf(n):[];
    const blocks=lines.reduce((a,l)=>a+(l.blocks?l.blocks.length:0),0);
    body.innerHTML='<div style="padding:12px 10px;color:var(--text-muted);font-size:12px;text-align:center">'
      +(blocks?'Script on <b>'+esc(n.name)+'</b> · '+blocks+' block(s)':'No script blocks on <b>'+esc(n.name)+'</b><br><span style="opacity:.7">Add blocks in the Script view</span>')
      +'</div>';
  }catch(err){
    body.innerHTML='<div style="padding:16px 10px;color:var(--text-muted);font-size:12px;text-align:center">No script</div>';
  }
}

