// ── STATE ──
let scenes = [], activeSceneId = null, selectedNodeId = null, idCounter = 0;
let treeQuery = '', blockQuery = '', dragNode = null, visibleOrder = [];
let selectedBlockId = null, activeLineId = null;
const collapsed = new Set(), slotCollapsed = new Set();

// Node type icons (single-char / short glyph for tree)
const NODE_TYPES = {
  // Core / transform
  Node2D: '◈',
  Sprite2D: 'S',
  AnimatedSprite2D: 'A',
  // Camera & visibility
  Camera2D: '◉',
  // Physics / collision
  CollisionShape2D: '◇',
  CollisionPolygon2D: '⬠',
  Area2D: '◎',
  StaticBody2D: '■',
  CharacterBody2D: '▲',
  RigidBody2D: '●',
  // Tile / map
  TileMapLayer: '▦',
  // Path / navigation (blank for now)
  Path2D: '∿',
  NavigationRegion2D: '⬡',
  // GUI
  Control: '□',
  Button: '▣',
  Label: 'T',
  Panel: '▭',
  TextureRect: '▤',
  ProgressBar: '▬',
  // Audio
  Audio: '♪',
  // Light / particles (blank)
  PointLight2D: '✦',
  CPUParticles2D: '✧',
  // Misc
  Timer: '⏱',
  ParallaxBackground: '≋',
  // Nested scene (opaque reference; hierarchy not shown in tree)
  SceneInstance: '⧉'
};

const NODE_INFO = {
  Node2D:              { icon:'◈', color:'#8ab8f5', desc:'Base 2D node for hierarchy, transforms, and grouping children.' },
  Sprite2D:            { icon:'S', color:'#3ec68a', desc:'Displays a 2D texture or image with position, scale, and modulate.' },
  AnimatedSprite2D:    { icon:'A', color:'#5ad4a0', desc:'Plays frame animations from a sprite sheet or animation frames. (blank)' },
  Camera2D:            { icon:'◉', color:'#f5c06a', desc:'2D camera that defines the view offset, zoom, and limits for the viewport.' },
  CollisionShape2D:    { icon:'◇', color:'#e88a6a', desc:'Defines a collision shape (rect, circle, capsule) used by physics bodies and areas.' },
  CollisionPolygon2D:  { icon:'⬠', color:'#e07a5a', desc:'Collision shape defined by a custom polygon. (blank)' },
  Area2D:              { icon:'◎', color:'#e8b06a', desc:'Detects overlapping bodies and areas; used for triggers and sensors.' },
  StaticBody2D:        { icon:'■', color:'#a09080', desc:'Immovable physics body for walls, floors, and static geometry.' },
  CharacterBody2D:     { icon:'▲', color:'#6ab8e8', desc:'Kinematic body for player/NPC movement with move_and_slide style control.' },
  RigidBody2D:         { icon:'●', color:'#c89b6a', desc:'Dynamic rigid body simulated by the physics engine. (blank)' },
  TileMapLayer:        { icon:'▦', color:'#7ac86a', desc:'Godot-style tile map layer: grid of tiles from a tileset for levels and backgrounds.' },
  Path2D:              { icon:'∿', color:'#8a9bc8', desc:'Curve path for path-following and path-based movement. (blank)' },
  NavigationRegion2D:  { icon:'⬡', color:'#6a9bc8', desc:'Navigation mesh / region for pathfinding agents. (blank)' },
  Control:             { icon:'□', color:'#c89be8', desc:'UI container for layout, buttons, labels, and interactive controls.' },
  Button:              { icon:'▣', color:'#b88ad8', desc:'Clickable UI button with text and optional icon.' },
  Label:               { icon:'T', color:'#d8c08a', desc:'Displays a single line or multi-line text string.' },
  Panel:               { icon:'▭', color:'#9a8ab8', desc:'Simple rectangular panel / background for UI groups.' },
  TextureRect:         { icon:'▤', color:'#8ac8a0', desc:'UI control that draws a texture or image.' },
  ProgressBar:         { icon:'▬', color:'#6ac8a0', desc:'Horizontal or vertical progress / health bar. (blank)' },
  Audio:               { icon:'♪', color:'#3ec6b0', desc:'Plays sound effects or music with volume, pitch, and spatial audio.' },
  PointLight2D:        { icon:'✦', color:'#f5e06a', desc:'2D point light with energy, color, and texture. (blank)' },
  CPUParticles2D:      { icon:'✧', color:'#e8a0d0', desc:'CPU-based 2D particle emitter. (blank)' },
  Timer:               { icon:'⏱', color:'#a0a8c0', desc:'One-shot or repeating timer that emits timeout events.' },
  ParallaxBackground:  { icon:'≋', color:'#6a98b8', desc:'Parallax scrolling background container. (blank)' },
  SceneInstance:       { icon:'⧉', color:'#3ec6b0', desc:'Instance of another scene. Hierarchy is hidden; use Enter to open the target scene.' }
};
