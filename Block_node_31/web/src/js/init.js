/**
 * Blockode – Startup & wiring
 * -------------------------
 * Phase 0 of the modularization plan:
 *  - All HTML event handlers removed; binding lives here.
 *  - Blockode.* public APIs are filled in after other scripts load.
 *  - Session restore + first paint.
 */
(function () {
  'use strict';

  // ── Wire Blockode public APIs (now that all scripts have run) ──
  if (typeof Blockode !== 'undefined') {
    Blockode.Art   = typeof ART   !== 'undefined' ? ART   : null;
    Blockode.Audio = typeof AUDIO !== 'undefined' ? AUDIO : null;
    Blockode.Input = typeof INPUT !== 'undefined' ? INPUT : null;

    Blockode.UI.setView          = typeof setView          === 'function' ? setView          : null;
    Blockode.UI.toggleTreePanel  = typeof toggleTreePanel  === 'function' ? toggleTreePanel  : null;
    Blockode.UI.togglePropsPanel = typeof togglePropsPanel === 'function' ? togglePropsPanel : null;
    Blockode.UI.toggleDebug      = typeof toggleDebug      === 'function' ? toggleDebug      : null;
    Blockode.UI.toggleSlot       = typeof toggleSlot       === 'function' ? toggleSlot       : null;
    Blockode.UI.closeModal       = typeof closeModal       === 'function' ? closeModal       : null;
    Blockode.UI.toast            = typeof toast            === 'function' ? toast            : null;

    Blockode.Runtime.toggle = typeof toggleRun === 'function' ? toggleRun : null;
    Blockode.Runtime.stop   = function () {
      if (RUN && RUN.on && typeof toggleRun === 'function') toggleRun();
    };

    if (typeof saveProject === 'function') Blockode.Project.save = saveProject;
    if (typeof loadProject === 'function') Blockode.Project.load = loadProject;
    if (typeof undo === 'function')        Blockode.Project.undo = undo;
    if (typeof redo === 'function')        Blockode.Project.redo = redo;
  }

  // ── Phase 0: central event binding (no more inline onclick) ──
  function bind(id, evt, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(evt, fn);
  }
  function bindAll(selector, evt, fn) {
    document.querySelectorAll(selector).forEach(el => el.addEventListener(evt, fn));
  }

  function bindUIEvents() {
    // Ribbon view buttons
    bindAll('.rib[data-view]', 'click', function (e) {
      const view = e.currentTarget.getAttribute('data-view');
      if (view && typeof setView === 'function') setView(view);
    });

    bind('rib-tree',  'click', () => typeof toggleTreePanel  === 'function' && toggleTreePanel());
    bind('rib-props', 'click', () => typeof togglePropsPanel === 'function' && togglePropsPanel());
    bind('rib-debug', 'click', () => typeof toggleDebug      === 'function' && toggleDebug());

    bind('run-btn',      'click', () => typeof toggleRun     === 'function' && toggleRun());
    bind('overflow-btn', 'click', (e) => typeof openOverflow === 'function' && openOverflow(e));

    // Scene tree / Scenes toolbar
    // + / ⧉ button: create scene (Scenes tab) or add scene instance (Tree tab)
    bind('btn-new-scene', 'click', (e) => {
      e.stopPropagation();
      if (typeof onNewSceneButtonClick === 'function') onNewSceneButtonClick(e);
      else if (typeof openNewSceneModal === 'function') openNewSceneModal();
    });
    bind('btn-create-scene', 'click', (e) => { e.stopPropagation(); typeof openNewSceneModal === 'function' && openNewSceneModal(); });
    bind('btn-delete-scene', 'click', (e) => {
      e.stopPropagation();
      const sc = typeof activeScene === 'function' ? activeScene() : null;
      if (sc && confirm('Delete scene "' + sc.name + '"?')) {
        if (typeof closeScene === 'function') closeScene(sc.id);
      }
    });
    bind('btn-add-scene-instance', 'click', (e) => { e.stopPropagation(); typeof addSceneInstance === 'function' && addSceneInstance(); });
    bind('btn-add-node',     'click', (e) => { e.stopPropagation(); typeof showAddMenu === 'function' && showAddMenu(e); });
    bind('btn-collapse-all', 'click', (e) => { e.stopPropagation(); typeof toggleAll === 'function' && toggleAll(); });
    bind('btn-delete-node',  'click', (e) => { e.stopPropagation(); typeof deleteNode === 'function' && deleteNode(); });
    bind('sp-scene-tog',     'click', (e) => { e.stopPropagation(); typeof toggleSlot === 'function' && toggleSlot('sp-scene'); });

    // Left section tabs — second click on active tab returns to Scenes (default)
    bind('tab-scenes', 'click', () => typeof setLeftSection === 'function' && setLeftSection('scenes'));
    bind('tab-tree',   'click', () => typeof setLeftSection === 'function' && setLeftSection('tree'));

    // Scenes search
    const scenesSearch = $('scenes-search');
    if (scenesSearch) {
      scenesSearch.addEventListener('input', () => {
        if (typeof scenesQuery !== 'undefined') scenesQuery = scenesSearch.value || '';
        if (typeof renderScenesList === 'function') renderScenesList();
      });
    }

    // Block library collapse
    bind('bl-collapse-btn', 'click', () => typeof toggleBlockLibrary === 'function' && toggleBlockLibrary());

    // Preview tools
    bind('pt-pan',   'click', () => typeof setPreviewTool === 'function' && setPreviewTool('pan'));
    bind('pt-move',  'click', () => typeof setPreviewTool === 'function' && setPreviewTool('move'));
    bind('pt-scale', 'click', () => typeof setPreviewTool === 'function' && setPreviewTool('scale'));
    bind('pt-reset', 'click', () => typeof resetPreviewCam === 'function' && resetPreviewCam());

    // Assets import
    bind('btn-import-png',   'click', () => typeof importPNG   === 'function' && importPNG(false));
    bind('btn-import-audio', 'click', () => typeof importAudio === 'function' && importAudio(false));
    // Backup bindings for Add to Assets (Audio tab)
    bind('au-sadd', 'click', () => typeof addCustomAudioToAssets === 'function' && addCustomAudioToAssets('sfx'));
    bind('au-madd', 'click', () => typeof addCustomAudioToAssets === 'function' && addCustomAudioToAssets('music'));

    // Right panels collapse
    bind('sp-props-tog',        'click', (e) => { e.stopPropagation(); typeof toggleSlot === 'function' && toggleSlot('sp-props'); });
    bind('sp-scriptprops-tog',  'click', (e) => { e.stopPropagation(); typeof toggleSlot === 'function' && toggleSlot('sp-scriptprops'); });

    // Mobile
    bind('overlay-scrim', 'click', () => typeof closeMobilePanels === 'function' && closeMobilePanels());
    bind('mob-left',   'click', () => typeof toggleMobilePanel === 'function' && toggleMobilePanel('left'));
    bind('mob-right',  'click', () => typeof toggleMobilePanel === 'function' && toggleMobilePanel('right'));
    bind('mob-script', 'click', () => typeof setView === 'function' && setView('script'));
    bind('mob-scene',  'click', () => typeof setView === 'function' && setView('scene'));
    bind('mob-assets', 'click', () => typeof setView === 'function' && setView('assets'));

    // Debug panel
    bind('dbg-toggle', 'click', () => typeof toggleDebug === 'function' && toggleDebug());
    bind('dbg-clear',  'click', () => {
      if (typeof DBG !== 'undefined') DBG.length = 0;
      if (typeof renderDebug === 'function') renderDebug();
    });
    bind('dbg-logs-only', 'change', () => typeof renderDebug === 'function' && renderDebug());

    // New-scene modal
    bind('modal-cancel', 'click', () => typeof closeModal === 'function' && closeModal());
    bind('modal-create', 'click', () => typeof confirmNewScene === 'function' && confirmNewScene());

    // Data-clear search buttons (already use data-clear; keep existing search.js handlers if any)
  }

  // ── Boot sequence ──
  function boot() {
    bindUIEvents();

    if (typeof applySettings === 'function') applySettings();
    if (typeof setView === 'function') setView('split');
    if (typeof updateMemoryMeter === 'function') updateMemoryMeter();
    if (typeof drawPreview === 'function') drawPreview();
    if (typeof requestAnimationFrame === 'function' && typeof dbgTick === 'function') {
      requestAnimationFrame(dbgTick);
    }

    // Restore the last selected project from disk. No project graph is stored in localStorage.
    (async function restoreProject() {
      try {
        if (typeof loadSettingsFromDisk === 'function') await loadSettingsFromDisk();
        const restored = typeof restoreProjectFromDisk === 'function'
          ? await restoreProjectFromDisk() : false;
        if (!restored) {
          if (typeof renderTabs === 'function') renderTabs();
          if (typeof refresh === 'function') refresh();
        }
      } catch (error) {
        console.error('Project restore failed:', error);
        if (typeof renderTabs === 'function') renderTabs();
        if (typeof refresh === 'function') refresh();
      }
    })();

    // Keep debug gutter visibility in sync
    if (typeof toggleDebug === 'function') {
      const origToggle = toggleDebug;
      window.toggleDebug = function () {
        origToggle();
        if (typeof GUT !== 'undefined' && GUT.dh) {
          GUT.dh.classList.toggle('hide', !$('debug-panel').classList.contains('open'));
        }
      };
      if (Blockode && Blockode.UI) Blockode.UI.toggleDebug = window.toggleDebug;
    }

    // Left panel defaults to Scenes section
    if (typeof setLeftSection === 'function') setLeftSection('scenes', true);
    else if (typeof updateNewSceneButton === 'function') updateNewSceneButton();

    // Announce ready for any late listeners
    if (typeof Blockode !== 'undefined' && Blockode.emit) {
      Blockode.emit('ready');
    }
  }

  // Run after DOM is ready (scripts are at end of body, so this is usually immediate)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
