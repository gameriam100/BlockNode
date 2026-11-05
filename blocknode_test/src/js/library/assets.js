// ASSET LIBRARY — image/audio import, texture/stream assignment, and asset panel.
// ── ASSETS ──
let assets=[], assetQuery='';
const imgCache={}, tintCv=document.createElement('canvas');
function importPNG(assign=true){const f=$('png-file');f.onchange=()=>{loadFiles(f.files,assign);f.value='';};f.click();}
function importAudio(assign=true){const f=$('audio-file');f.onchange=()=>{loadAudioFiles(f.files,assign);f.value='';};f.click();}
function loadFiles(files,assign=true){
  [...files].filter(f=>/^image\//.test(f.type)).forEach(f=>{
    const r=new FileReader();
    r.onload=()=>{const a={id:uid('a'),name:f.name,type:'image',kind:'imported',url:r.result};assets.push(a);const im=new Image();im.src=a.url;imgCache[a.id]=im;const n=selectedNode();if(assign&&n&&n.type==='Sprite2D')n.props.texture=a.id;renderAssets();renderInspector();};
    r.readAsDataURL(f);
  });
}
function loadAudioFiles(files,assign=true){
  [...files].filter(f=>/^audio\//.test(f.type)||/\.(wav|mp3|ogg|m4a|flac|webm)$/i.test(f.name)).forEach(f=>{
    const r=new FileReader();
    r.onload=()=>{
      const a={id:uid('a'),name:f.name,type:'audio',kind:'imported',url:r.result,mime:f.type||'audio/wav'};
      assets.push(a);
      const n=selectedNode();
      if(assign&&n&&n.type==='Audio')n.props.stream=a.id;
      renderAssets();renderInspector();
      setStatus('Imported audio: '+f.name);
    };
    r.readAsDataURL(f);
  });
}
function setTexture(id){const n=selectedNode();if(!n||n.type!=='Sprite2D')return setStatus('Select a Sprite2D node');n.props.texture=id||null;renderInspector();renderAssets();}
function setStream(id){const n=selectedNode();if(!n||n.type!=='Audio')return setStatus('Select an Audio node');n.props.stream=id||null;renderInspector();renderAssets();}
function delAsset(id){
  assets=assets.filter(a=>a.id!==id);
  scenes.forEach(sc=>sc.nodes.forEach(n=>{
    if(n.props.texture===id)n.props.texture=null;
    if(n.props.stream===id)n.props.stream=null;
  }));
  renderAssets();renderInspector();
}
function texUI(n){
  const imgs=assets.filter(a=>a.type==='image'||!a.type);
  return`<select class="inspector-val" style="width:88px" onchange="setTexture(this.value)"><option value="">none</option>${imgs.map(a=>`<option value="${a.id}"${n.props.texture===a.id?' selected':''}>${esc(a.name)}</option>`).join('')}</select><button class="icon-btn" data-tip="Import PNG" onclick="importPNG()">⤒</button>`;
}
function streamUI(n){
  const auds=assets.filter(a=>a.type==='audio');
  return`<select class="inspector-val" style="width:88px" onchange="setStream(this.value)"><option value="">none</option>${auds.map(a=>`<option value="${a.id}"${n.props.stream===a.id?' selected':''}>${esc(a.name)}${a.kind==='custom'?' ★':''}</option>`).join('')}</select><button class="icon-btn" data-tip="Import audio" onclick="importAudio()">⤒</button>`;
}
function openCustomAudio(id){
  const a=assets.find(x=>x.id===id);
  if(!a||a.kind!=='custom')return;
  setView('audio');
  // Give AUDIO a tick to init if needed
  setTimeout(()=>{
    const AU=window.AUDIO;
    if(!AU||!AU.ready)return;
    if(a.customType==='sfx'){
      if(a.seed)AU.el('sseed').value=a.seed;
      if(a.settings)Object.keys(a.settings).forEach(k=>{const el=AU.el(k);if(el)el.value=a.settings[k];});
      AU.sLink?.decode();AU.sfxGo(false);
    }else if(a.customType==='music'){
      if(a.seed)AU.el('mseed').value=a.seed;
      if(a.settings)Object.keys(a.settings).forEach(k=>{const el=AU.el(k);if(el)el.value=a.settings[k];});
      AU.mLink?.decode();AU.musGo(false);
    }
    setStatus('Opened custom '+a.customType+' in Audio tab');
  },50);
}
function addCustomAudioToAssets(kind){
  // kind: 'sfx' | 'music'
  const A=window.AUDIO;
  if(!A||!A.ready)return setStatus('Audio tab not ready');
  const isSfx=kind==='sfx';
  const seedEl=A.el(isSfx?'sseed':'mseed');
  const seed=seedEl?seedEl.value:'';
  const base=A.baseOf(isSfx?'sseed':'mseed');
  const name=base+(isSfx?'-sfx':'-loop')+'.wav';
  // Collect current control values for reopen
  const ids=isSfx?A.sfxSeedIds.concat(['svol','sq']):A.musSeedIds.concat(['mvol','q']);
  const settings={};
  ids.forEach(id=>{const el=A.el(id);if(el)settings[id]=el.value;});
  // Avoid duplicates by seed+kind
  const existing=assets.find(a=>a.type==='audio'&&a.kind==='custom'&&a.customType===kind&&a.seed===seed);
  if(existing){
    existing.settings=settings;
    existing.name=name;
    renderAssets();
    setStatus('Updated custom audio in assets: '+name);
    return existing.id;
  }
  const a={
    id:uid('a'),
    name,
    type:'audio',
    kind:'custom',
    customType:kind,
    seed,
    settings,
    // No url – regenerates from seed when needed
  };
  assets.push(a);
  const n=selectedNode();
  if(n&&n.type==='Audio'&&!n.props.stream)n.props.stream=a.id;
  renderAssets();renderInspector();
  setStatus('Added custom audio to assets: '+name);
  return a.id;
}
function renderAssets(){
  const q=assetQuery.trim().toLowerCase(),n=selectedNode();
  const hits=assets.filter(a=>!q||a.name.toLowerCase().includes(q)||(a.kind||'').includes(q)||(a.type||'').includes(q));
  const html=hits.map(a=>{
    const isImg=a.type==='image'||!a.type;
    const isAud=a.type==='audio';
    const isCustom=a.kind==='custom';
    const selected=(isImg&&n?.type==='Sprite2D'&&n.props.texture===a.id)||(isAud&&n?.type==='Audio'&&n.props.stream===a.id);
    const tip=isImg?(n?.type==='Sprite2D'?'Assign to '+esc(n.name):'Select a Sprite2D')
      :isAud?(n?.type==='Audio'?'Assign to '+esc(n.name):'Select an Audio node')
      :'';
    const icon=isImg?`<img src="${a.url}">`:isCustom?`<div class="asset-audio-icon custom">★</div>`:`<div class="asset-audio-icon">♪</div>`;
    const badge=isCustom?`<span class="asset-badge custom">custom</span>`:isAud?`<span class="asset-badge">file</span>`:'';
    const openBtn=isCustom?`<button class="icon-btn" data-tip="Open in Audio tab" onclick="event.stopPropagation();openCustomAudio('${a.id}')">✎</button>`:'';
    return`<div class="asset${selected?' on':''}${isAud?' audio':''}${isCustom?' custom':''}" onclick="${isImg?`setTexture('${a.id}')`:isAud?`setStream('${a.id}')`:'void 0'}" data-tip="${tip}">
      ${icon}
      <span>${hl(a.name,q)}</span>
      ${badge}
      ${openBtn}
      <button class="icon-btn" onclick="event.stopPropagation();delAsset('${a.id}')">✕</button>
    </div>`;
  }).join('')||`<div class="tree-none" style="grid-column:1/-1">${assets.length?'No matches':'No assets — import PNG/audio or create in Art/Audio tabs'}</div>`;
  $('asset-grid').innerHTML=html;
}
['dragover','drop'].forEach(ev=>$('canvas-panel').addEventListener(ev,e=>{
  if(!e.dataTransfer.types.includes('Files'))return;
  e.preventDefault();
  if(ev==='drop'){
    const files=[...e.dataTransfer.files];
    loadFiles(files);
    loadAudioFiles(files);
  }
}));
