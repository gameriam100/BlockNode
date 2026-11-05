// ── UTILS ──
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const uid=p=>p+(++idCounter);
const $=id=>document.getElementById(id);
const activeScene=()=>scenes.find(s=>s.id===activeSceneId)||null;
const selectedNode=()=>{const sc=activeScene();return sc?sc.nodes.find(n=>n.id===selectedNodeId)||null:null;};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function hl(t,q){const i=q?t.toLowerCase().indexOf(q):-1;return i<0?esc(t):esc(t.slice(0,i))+'<mark>'+esc(t.slice(i,i+q.length))+'</mark>'+esc(t.slice(i+q.length));}
function defaultProps(type){
  const base={x:0,y:0,rotation:0,scale_x:1,scale_y:1,modulate:{r:255,g:255,b:255,a:255}};
  if(type==='Audio')return{...base,stream:null,volume_db:0,pitch_scale:1,autoplay:false,loop:false,playing:false,bus:'Master',max_distance:2000,attenuation:1,area_mask:1,mix_target:0,stream_paused:false};
  if(type==='Camera2D')return{...base,zoom_x:1,zoom_y:1,offset_x:0,offset_y:0,limit_left:-10000000,limit_top:-10000000,limit_right:10000000,limit_bottom:10000000,current:true,drag_horizontal_enabled:false,drag_vertical_enabled:false};
  if(type==='CollisionShape2D')return{...base,shape:'rectangle',width:32,height:32,radius:16,disabled:false,one_way_collision:false};
  if(type==='CollisionPolygon2D')return{...base,polygon:[],disabled:false,one_way_collision:false};
  if(type==='Area2D')return{...base,monitoring:true,monitorable:true,collision_layer:1,collision_mask:1,gravity:0};
  if(type==='StaticBody2D')return{...base,collision_layer:1,collision_mask:1,constant_linear_velocity_x:0,constant_linear_velocity_y:0};
  if(type==='CharacterBody2D')return{...base,collision_layer:1,collision_mask:1,velocity_x:0,velocity_y:0,motion_mode:'grounded',up_direction_x:0,up_direction_y:-1,floor_max_angle:45};
  if(type==='RigidBody2D')return{...base,collision_layer:1,collision_mask:1,mass:1,gravity_scale:1,linear_damp:0,angular_damp:0,freeze:false};
  if(type==='TileMapLayer')return{...base,tile_size:16,layer:0,z_index:0,collision_enabled:true,tileset:null,map_width:32,map_height:18,data:[]};
  if(type==='AnimatedSprite2D')return{...base,texture:null,animation:'default',frame:0,speed_scale:1,playing:false,centered:true};
  if(type==='Button')return{...base,text:'Button',disabled:false,toggle_mode:false,pressed:false};
  if(type==='Label')return{...base,text:'Label',align:'left',valign:'top',autowrap:false,font_size:14};
  if(type==='Panel')return{...base,size_x:100,size_y:40};
  if(type==='TextureRect')return{...base,texture:null,expand_mode:'keep_size',stretch_mode:'scale'};
  if(type==='ProgressBar')return{...base,value:50,min_value:0,max_value:100,show_percentage:true};
  if(type==='Timer')return{...base,wait_time:1,one_shot:false,autostart:false,paused:false};
  if(type==='PointLight2D')return{...base,energy:1,color:{r:255,g:255,b:255,a:255},texture_scale:1,height:0};
  if(type==='CPUParticles2D')return{...base,emitting:true,amount:8,lifetime:1,one_shot:false,explosiveness:0,texture:null};
  if(type==='Path2D')return{...base,curve:[]};
  if(type==='NavigationRegion2D')return{...base,enabled:true,navigation_layers:1};
  if(type==='ParallaxBackground')return{...base,scroll_offset_x:0,scroll_offset_y:0,scroll_base_scale_x:1,scroll_base_scale_y:1};
  if(type==='Sprite2D')return{...base,texture:null,centered:true};
  // Node2D, Control, and any unknown → base transform only
  return base;
}
function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}
function hexToRgb(hex){const m=hex.replace('#','').match(/.{2}/g);if(!m||m.length<3)return null;const o={r:parseInt(m[0],16),g:parseInt(m[1],16),b:parseInt(m[2],16)};return isNaN(o.r+o.g+o.b)?null:o;}
function childrenOf(sc,id){return sc.nodes.filter(n=>n.parentId===id);}
function descendants(sc,id){return childrenOf(sc,id).flatMap(c=>[c.id,...descendants(sc,c.id)]);}
function uniqueName(sc,parentId,base,skipId){const used=new Set(sc.nodes.filter(n=>n.parentId===parentId&&n.id!==skipId).map(n=>n.name));if(!used.has(base))return base;let i=2;while(used.has(base+i))i++;return base+i;}
function matchNode(n,q){return(n.name+' '+n.type+' '+linesOf(n).flatMap(l=>l.blocks).map(b=>getBlockDef(b.type)?.name).join(' ')).toLowerCase().includes(q);}
function linesOf(n){if(!n.lines){n.lines=[{id:uid('l'),name:'Line 1',rep:1,blocks:n.blocks||[]}];delete n.blocks;}return n.lines;}
