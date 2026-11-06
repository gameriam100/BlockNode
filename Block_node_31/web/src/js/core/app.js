/**
 * Blockode – Application namespace (Option A lightweight modularization)
 * ------------------------------------------------------------------
 * Goal: Shrink the global surface area. Each feature should expose only
 * a small public API on Blockode.* instead of free-for-all globals.
 *
 * During the transition, classic top-level variables (scenes, ART, …)
 * still exist for compatibility. New code should prefer Blockode.* APIs.
 *
 * Public surface (intentionally small):
 *   Blockode.State   – scene/node/selection data
 *   Blockode.Blocks  – block definitions + custom blocks
 *   Blockode.UI      – view / panel / settings helpers
 *   Blockode.Art     – pixel-art editor (ART object)
 *   Blockode.Audio   – sound engine (AUDIO object)
 *   Blockode.Runtime – run / stop / step
 *   Blockode.Project – save / load / undo
 *   Blockode.Input   – keyboard / pointer state
 */
(function (global) {
  'use strict';

  const Blockode = global.Blockode || {};

  // ── State facade (read-only snapshots preferred; mutations go through APIs) ──
  Blockode.State = {
    get scenes()        { return scenes; },
    get activeSceneId() { return activeSceneId; },
    get selectedNodeId(){ return selectedNodeId; },
    get selectedBlockId(){ return selectedBlockId; },
    get activeLineId()  { return activeLineId; },
    get collapsed()     { return collapsed; },
    get NODE_TYPES()    { return NODE_TYPES; },
    get NODE_INFO()     { return NODE_INFO; },
    // helpers that already exist in utils / scenes
    activeScene:  () => (typeof activeScene === 'function' ? activeScene() : null),
    selectedNode: () => (typeof selectedNode === 'function' ? selectedNode() : null),
  };

  // ── Blocks ──
  Blockode.Blocks = {
    get defs()          { return BLOCKS; },
    get custom()        { return customBlocks; },
    get folders()       { return customFolders; },
    get cats()          { return CATS; },
    getDef:             (type) => (typeof getBlockDef === 'function' ? getBlockDef(type) : null),
    isCustom:           (type) => (typeof isCustomType === 'function' ? isCustomType(type) : false),
  };

  // ── UI helpers (wired after other scripts load) ──
  Blockode.UI = {
    setView:          null,   // assigned in init
    toggleTreePanel:  null,
    togglePropsPanel: null,
    toggleDebug:      null,
    toggleSlot:       null,
    openModal:        null,
    closeModal:       null,
    toast:            null,
  };

  // ── Art / Audio (already self-contained objects) ──
  Blockode.Art   = null;  // → ART after art-state.js
  Blockode.Audio = null;  // → AUDIO after audio-core.js

  // ── Runtime ──
  Blockode.Runtime = {
    get running() { return RUN && RUN.on; },
    toggle: null,   // → toggleRun
    stop:   null,
  };

  // ── Project ──
  Blockode.Project = {
    save: null,
    load: null,
    undo: null,
    redo: null,
  };

  // ── Input ──
  Blockode.Input = null;  // → INPUT

  // ── Event bus (tiny pub/sub for future decoupling) ──
  const _listeners = Object.create(null);
  Blockode.on = function (evt, fn) {
    (_listeners[evt] || (_listeners[evt] = [])).push(fn);
  };
  Blockode.off = function (evt, fn) {
    const list = _listeners[evt];
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  };
  Blockode.emit = function (evt, payload) {
    const list = _listeners[evt];
    if (!list) return;
    for (const fn of list.slice()) {
      try { fn(payload); } catch (e) { console.error('[Blockode.emit]', evt, e); }
    }
  };

  global.Blockode = Blockode;
})(typeof window !== 'undefined' ? window : this);
