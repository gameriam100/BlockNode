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

