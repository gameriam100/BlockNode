// ── INSPECTOR ──
function renderInspector(){
  const node=selectedNode(),body=$('inspector-body'),title=$('inspector-title');
  if(!node){title.textContent='Properties';body.innerHTML='<div style="padding:14px 10px;color:var(--text-muted);font-size:12px;text-align:center">Select a node</div>';return;}
  title.textContent='Properties · '+node.name;
  const p=node.props,mc=p.modulate,modHex=rgbToHex(mc.r,mc.g,mc.b),modBg=`rgba(${mc.r},${mc.g},${mc.b},${mc.a/255})`;
  body.innerHTML=`
    <div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Transform</div>
      <div class="inspector-section-content">
        ${irow('X',`<input class="inspector-val" type="number" value="${p.x}" onchange="setNodeProp('x',this.value)"/>`)}
        ${irow('Y',`<input class="inspector-val" type="number" value="${p.y}" onchange="setNodeProp('y',this.value)"/>`)}
        ${irow('Rot°',`<input class="inspector-val" type="number" value="${p.rotation}" onchange="setNodeProp('rotation',this.value)"/>`)}
        ${irow('Scale X',`<input class="inspector-val" type="number" step="0.1" value="${p.scale_x}" onchange="setNodeProp('scale_x',this.value)"/>`)}
        ${irow('Scale Y',`<input class="inspector-val" type="number" step="0.1" value="${p.scale_y}" onchange="setNodeProp('scale_y',this.value)"/>`)}
      </div>
    </div>
    <div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Visibility</div>
      <div class="inspector-section-content">
        ${irow('Color',`<input type="color" value="${modHex}" style="width:36px;height:22px;border:1px solid var(--border);border-radius:3px;cursor:pointer;background:none;padding:0" oninput="setModulateFromHex(this.value)" title="Modulation color"/><input class="inspector-val" type="text" value="${modHex}" style="width:68px" onchange="setModulateFromHex(this.value)"/>`)}
        ${irow('Alpha',`<input class="inspector-val" type="number" min="0" max="255" value="${mc.a}" onchange="setNodeModulate('a',this.value)"/>`)}
      </div>
    </div>
    ${node.type==='Sprite2D'?`<div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Sprite2D</div>
      <div class="inspector-section-content">
        ${irow('Texture',texUI(node))}
        ${irow('Centered','<input class="inspector-val" type="text" value="true" style="width:60px" readonly/>')}
      </div>
    </div>`:''}
    ${node.type==='Camera2D'?`<div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Camera2D</div>
      <div class="inspector-section-content">
        ${irow('Zoom X',`<input class="inspector-val" type="number" step="0.1" min="0.01" value="${p.zoom_x??1}" onchange="setNodeProp('zoom_x',this.value)"/>`)}
        ${irow('Zoom Y',`<input class="inspector-val" type="number" step="0.1" min="0.01" value="${p.zoom_y??1}" onchange="setNodeProp('zoom_y',this.value)"/>`)}
        ${irow('Offset X',`<input class="inspector-val" type="number" value="${p.offset_x??0}" onchange="setNodeProp('offset_x',this.value)"/>`)}
        ${irow('Offset Y',`<input class="inspector-val" type="number" value="${p.offset_y??0}" onchange="setNodeProp('offset_y',this.value)"/>`)}
        ${irow('Current',`<input type="checkbox" ${p.current?'checked':''} onchange="setNodePropBool('current',this.checked)"/>`)}
        ${irow('Drag H',`<input type="checkbox" ${p.drag_horizontal_enabled?'checked':''} onchange="setNodePropBool('drag_horizontal_enabled',this.checked)"/>`)}
        ${irow('Drag V',`<input type="checkbox" ${p.drag_vertical_enabled?'checked':''} onchange="setNodePropBool('drag_vertical_enabled',this.checked)"/>`)}
      </div>
    </div>
    <div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Limits</div>
      <div class="inspector-section-content">
        ${irow('Left',`<input class="inspector-val" type="number" value="${p.limit_left??-10000000}" onchange="setNodeProp('limit_left',this.value)"/>`)}
        ${irow('Top',`<input class="inspector-val" type="number" value="${p.limit_top??-10000000}" onchange="setNodeProp('limit_top',this.value)"/>`)}
        ${irow('Right',`<input class="inspector-val" type="number" value="${p.limit_right??10000000}" onchange="setNodeProp('limit_right',this.value)"/>`)}
        ${irow('Bottom',`<input class="inspector-val" type="number" value="${p.limit_bottom??10000000}" onchange="setNodeProp('limit_bottom',this.value)"/>`)}
      </div>
    </div>`:''}
    ${node.type==='CollisionShape2D'?`<div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> CollisionShape2D</div>
      <div class="inspector-section-content">
        ${irow('Shape',`<select class="inspector-val" style="width:100px" onchange="setNodePropStr('shape',this.value)">
          ${['rectangle','circle','capsule'].map(s=>`<option value="${s}"${(p.shape||'rectangle')===s?' selected':''}>${s}</option>`).join('')}
        </select>`)}
        ${irow('Width',`<input class="inspector-val" type="number" min="1" value="${p.width??32}" onchange="setNodeProp('width',this.value)"/>`)}
        ${irow('Height',`<input class="inspector-val" type="number" min="1" value="${p.height??32}" onchange="setNodeProp('height',this.value)"/>`)}
        ${irow('Radius',`<input class="inspector-val" type="number" min="1" value="${p.radius??16}" onchange="setNodeProp('radius',this.value)"/>`)}
        ${irow('Disabled',`<input type="checkbox" ${p.disabled?'checked':''} onchange="setNodePropBool('disabled',this.checked)"/>`)}
        ${irow('One-way',`<input type="checkbox" ${p.one_way_collision?'checked':''} onchange="setNodePropBool('one_way_collision',this.checked)"/>`)}
      </div>
    </div>`:''}
    ${node.type==='TileMapLayer'?`<div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> TileMapLayer</div>
      <div class="inspector-section-content">
        ${irow('Tile Size',`<input class="inspector-val" type="number" min="1" value="${p.tile_size??16}" onchange="setNodeProp('tile_size',this.value)"/>`)}
        ${irow('Map W',`<input class="inspector-val" type="number" min="1" value="${p.map_width??32}" onchange="setNodeProp('map_width',this.value)"/>`)}
        ${irow('Map H',`<input class="inspector-val" type="number" min="1" value="${p.map_height??18}" onchange="setNodeProp('map_height',this.value)"/>`)}
        ${irow('Layer',`<input class="inspector-val" type="number" value="${p.layer??0}" onchange="setNodeProp('layer',this.value)"/>`)}
        ${irow('Z Index',`<input class="inspector-val" type="number" value="${p.z_index??0}" onchange="setNodeProp('z_index',this.value)"/>`)}
        ${irow('Collision',`<input type="checkbox" ${p.collision_enabled!==false?'checked':''} onchange="setNodePropBool('collision_enabled',this.checked)"/>`)}
        ${irow('Tileset',`<span style="font:11px var(--font-mono);color:var(--text-muted)">${p.tileset||'— none'}</span>`)}
      </div>
    </div>`:''}
    ${['Area2D','StaticBody2D','CharacterBody2D','RigidBody2D'].includes(node.type)?`<div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> ${node.type}</div>
      <div class="inspector-section-content">
        ${irow('Layer',`<input class="inspector-val" type="number" min="0" value="${p.collision_layer??1}" onchange="setNodeProp('collision_layer',this.value)"/>`)}
        ${irow('Mask',`<input class="inspector-val" type="number" min="0" value="${p.collision_mask??1}" onchange="setNodeProp('collision_mask',this.value)"/>`)}
        ${node.type==='CharacterBody2D'?irow('Vel X',`<input class="inspector-val" type="number" value="${p.velocity_x??0}" onchange="setNodeProp('velocity_x',this.value)"/>`)+irow('Vel Y',`<input class="inspector-val" type="number" value="${p.velocity_y??0}" onchange="setNodeProp('velocity_y',this.value)"/>`):''}
        ${node.type==='Area2D'?irow('Monitoring',`<input type="checkbox" ${p.monitoring!==false?'checked':''} onchange="setNodePropBool('monitoring',this.checked)"/>`)+irow('Monitorable',`<input type="checkbox" ${p.monitorable!==false?'checked':''} onchange="setNodePropBool('monitorable',this.checked)"/>`):''}
        ${node.type==='RigidBody2D'?irow('Mass',`<input class="inspector-val" type="number" step="0.1" min="0.01" value="${p.mass??1}" onchange="setNodeProp('mass',this.value)"/>`)+irow('Gravity',`<input class="inspector-val" type="number" step="0.1" value="${p.gravity_scale??1}" onchange="setNodeProp('gravity_scale',this.value)"/>`):''}
      </div>
    </div>`:''}
    ${node.type==='Button'?`<div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Button</div>
      <div class="inspector-section-content">
        ${irow('Text',`<input class="inspector-val" type="text" value="${esc(p.text||'Button')}" onchange="setNodePropStr('text',this.value)"/>`)}
        ${irow('Disabled',`<input type="checkbox" ${p.disabled?'checked':''} onchange="setNodePropBool('disabled',this.checked)"/>`)}
        ${irow('Toggle',`<input type="checkbox" ${p.toggle_mode?'checked':''} onchange="setNodePropBool('toggle_mode',this.checked)"/>`)}
      </div>
    </div>`:''}
    ${node.type==='Label'?`<div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Label</div>
      <div class="inspector-section-content">
        ${irow('Text',`<input class="inspector-val" type="text" value="${esc(p.text||'Label')}" onchange="setNodePropStr('text',this.value)"/>`)}
        ${irow('Font Size',`<input class="inspector-val" type="number" min="8" value="${p.font_size??14}" onchange="setNodeProp('font_size',this.value)"/>`)}
        ${irow('Align',`<select class="inspector-val" style="width:80px" onchange="setNodePropStr('align',this.value)">
          ${['left','center','right'].map(a=>`<option value="${a}"${(p.align||'left')===a?' selected':''}>${a}</option>`).join('')}
        </select>`)}
      </div>
    </div>`:''}
    ${node.type==='Timer'?`<div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Timer</div>
      <div class="inspector-section-content">
        ${irow('Wait (s)',`<input class="inspector-val" type="number" step="0.1" min="0.01" value="${p.wait_time??1}" onchange="setNodeProp('wait_time',this.value)"/>`)}
        ${irow('One Shot',`<input type="checkbox" ${p.one_shot?'checked':''} onchange="setNodePropBool('one_shot',this.checked)"/>`)}
        ${irow('Autostart',`<input type="checkbox" ${p.autostart?'checked':''} onchange="setNodePropBool('autostart',this.checked)"/>`)}
        ${irow('Paused',`<input type="checkbox" ${p.paused?'checked':''} onchange="setNodePropBool('paused',this.checked)"/>`)}
      </div>
    </div>`:''}
    ${['AnimatedSprite2D','CollisionPolygon2D','Path2D','NavigationRegion2D','ProgressBar','PointLight2D','CPUParticles2D','ParallaxBackground','TextureRect','Panel'].includes(node.type)?`<div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> ${node.type}</div>
      <div class="inspector-section-content">
        <div style="padding:8px 10px;color:var(--text-muted);font-size:11px;line-height:1.4">Properties for this node type are not fully implemented yet. Marked blank in app — transform &amp; script still work.</div>
      </div>
    </div>`:''}
    ${node.type==='Audio'?(()=>{
      const stream=assets.find(a=>a.id===p.stream);
      const isCustom=stream&&stream.kind==='custom';
      return`<div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Audio Stream</div>
      <div class="inspector-section-content">
        ${irow('Stream',streamUI(node))}
        ${isCustom?`<div class="inspector-row"><button class="btn btn-ghost sm" style="flex:1;margin:2px 10px" onclick="openCustomAudio('${p.stream}')">Open in Audio Tab ✎</button></div>`:''}
        ${irow('Kind',`<span style="font:11px var(--font-mono);color:var(--accent-teal)">${stream?(stream.kind==='custom'?'Custom ★':'Imported file'):'—'}</span>`)}
      </div>
    </div>
    <div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Playback</div>
      <div class="inspector-section-content">
        ${irow('Volume (dB)',`<input class="inspector-val" type="number" step="0.1" value="${p.volume_db??0}" onchange="setNodeProp('volume_db',this.value)"/>`)}
        ${irow('Pitch Scale',`<input class="inspector-val" type="number" step="0.01" min="0.01" max="4" value="${p.pitch_scale??1}" onchange="setNodeProp('pitch_scale',this.value)"/>`)}
        ${irow('Autoplay',`<input type="checkbox" ${p.autoplay?'checked':''} onchange="setNodePropBool('autoplay',this.checked)"/>`)}
        ${irow('Loop',`<input type="checkbox" ${p.loop?'checked':''} onchange="setNodePropBool('loop',this.checked)"/>`)}
        ${irow('Playing',`<input type="checkbox" ${p.playing?'checked':''} onchange="setNodePropBool('playing',this.checked)"/>`)}
        ${irow('Paused',`<input type="checkbox" ${p.stream_paused?'checked':''} onchange="setNodePropBool('stream_paused',this.checked)"/>`)}
      </div>
    </div>
    <div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Mix / Bus</div>
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
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> 3D / Attenuation</div>
      <div class="inspector-section-content">
        ${irow('Max Distance',`<input class="inspector-val" type="number" step="10" min="0" value="${p.max_distance??2000}" onchange="setNodeProp('max_distance',this.value)"/>`)}
        ${irow('Attenuation',`<input class="inspector-val" type="number" step="0.1" min="0" max="10" value="${p.attenuation??1}" onchange="setNodeProp('attenuation',this.value)"/>`)}
        ${irow('Area Mask',`<input class="inspector-val" type="number" min="0" value="${p.area_mask??1}" onchange="setNodeProp('area_mask',this.value)"/>`)}
      </div>
    </div>`;
    })():''}
    <div class="inspector-section">
      <div class="inspector-section-header open" onclick="toggleSection(this)"><span class="arrow">▶</span> Script</div>
      <div class="inspector-section-content">
        ${irow('Lines',`<span style="font:11px var(--font-mono);color:var(--accent-teal)">${linesOf(node).length}</span>`)}
        ${irow('Blocks',`<span style="font:11px var(--font-mono);color:var(--accent-teal)">${linesOf(node).reduce((a,l)=>a+l.blocks.length,0)}</span>`)}
        <div class="inspector-row"><button class="btn btn-ghost sm" style="flex:1;margin:2px 10px" onclick="setView(view==='scene'?'split':'script')">Open Script</button></div>
      </div>
    </div>`;
}
function setNodePropBool(key,val){const n=selectedNode();if(!n)return;n.props[key]=!!val;renderInspector();}
function setNodePropStr(key,val){const n=selectedNode();if(!n)return;n.props[key]=val;renderInspector();}

function irow(k,v){return`<div class="inspector-row"><span class="inspector-key">${k}</span>${v}</div>`;}
function toggleSection(header){header.classList.toggle('open');const c=header.nextElementSibling;c.style.display=c.style.display==='none'?'':'';}
// fix toggle
document.addEventListener('click',e=>{const h=e.target.closest('.inspector-section-header');if(h){h.classList.toggle('open');const c=h.nextElementSibling;if(c)c.style.display=h.classList.contains('open')?'':'none';}});
function setNodeProp(key,val){const n=selectedNode();if(!n)return;n.props[key]=parseFloat(val)||0;}
function setNodeModulate(key,val){const n=selectedNode();if(!n)return;n.props.modulate[key]=parseInt(val)||0;renderInspector();}
function setModulateFromHex(hex){const n=selectedNode();if(!n)return;const rgb=hexToRgb(hex);if(!rgb)return;n.props.modulate.r=rgb.r;n.props.modulate.g=rgb.g;n.props.modulate.b=rgb.b;renderInspector();}

