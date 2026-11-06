// Keep the local Go process alive while the editor window is active.
// A missed heartbeat window lets the server shut itself down after the app closes.
(() => {
  const heartbeat = () => {
    fetch('/api/heartbeat', { method: 'POST', cache: 'no-store' }).catch(() => {});
  };
  heartbeat();
  window.setInterval(heartbeat, 4000);
})();

// Reliable autosave and workspace restoration. Install after the app modules
// have loaded so the project, settings, and UI APIs are available.
(() => {
  function installSaveImprovements() {
    if (window.__blockodeSaveImprovementsInstalled) return;
    if (!window.ProjectFS || typeof window.projectSnapshot !== 'function') return;
    window.__blockodeSaveImprovementsInstalled = true;

    const fs = window.ProjectFS;
    const validViews = new Set(['script', 'scene', 'split', 'assets', 'art', 'audio']);
    const slotIds = ['sp-scene', 'sp-props', 'sp-scriptprops'];

    function setSaveState(state, error) {
      fs.saveState = state;
      const path = document.getElementById('project-path');
      if (!path) return;
      path.dataset.saveState = state;
      const project = fs.activeProjectName || 'No project selected';
      const detail = error ? ': ' + (error.message || String(error)) : '';
      path.title = project + ' · ' + state + detail;
      path.setAttribute('aria-label', path.title);
    }

    function restoreWorkspace() {
      if (typeof settings === 'undefined') return;
      const ids = Array.isArray(settings.collapsedSlots) ? settings.collapsedSlots : [];
      if (typeof slotCollapsed !== 'undefined') {
        slotCollapsed.clear();
        ids.forEach(id => { if (slotIds.includes(id)) slotCollapsed.add(id); });
        slotIds.forEach(id => {
          const body = document.getElementById(id + '-body');
          const toggle = document.getElementById(id + '-tog');
          const collapsed = slotCollapsed.has(id);
          if (body) body.style.display = collapsed ? 'none' : '';
          if (toggle) toggle.textContent = collapsed ? '▼' : '▲';
        });
      }
      if (validViews.has(settings.view) && typeof window.setView === 'function') {
        window.setView(settings.view);
      }
      if (['scenes', 'tree'].includes(settings.leftSection) && typeof window.setLeftSection === 'function') {
        window.setLeftSection(settings.leftSection, true);
      }
    }

    function persistWorkspace() {
      if (typeof settings === 'undefined') return;
      // Avoid writing defaults before asynchronous disk preferences are loaded.
      if (typeof settingsLoadedFromDisk !== 'undefined' && !settingsLoadedFromDisk) return;
      if (typeof saveSettings === 'function') saveSettings();
    }

    if (typeof window.applySettings === 'function') {
      const applySettings = window.applySettings;
      window.applySettings = function (...args) {
        const result = applySettings.apply(this, args);
        if (typeof settingsLoadedFromDisk === 'undefined' || settingsLoadedFromDisk) restoreWorkspace();
        return result;
      };
    }

    if (typeof window.setView === 'function') {
      const setView = window.setView;
      window.setView = function (view, ...args) {
        const result = setView.call(this, view, ...args);
        if (typeof settings !== 'undefined' && validViews.has(view)) {
          settings.view = view;
          persistWorkspace();
        }
        return result;
      };
    }

    if (typeof window.toggleSlot === 'function') {
      const toggleSlot = window.toggleSlot;
      window.toggleSlot = function (id, ...args) {
        const result = toggleSlot.call(this, id, ...args);
        if (slotIds.includes(id) && typeof slotCollapsed !== 'undefined') {
          settings.collapsedSlots = slotIds.filter(slotId => slotCollapsed.has(slotId));
          persistWorkspace();
        }
        return result;
      };
    }

    if (typeof window.setLeftSection === 'function') {
      const setLeftSection = window.setLeftSection;
      window.setLeftSection = function (section, ...args) {
        const result = setLeftSection.call(this, section, ...args);
        if (typeof settings !== 'undefined' && ['scenes', 'tree'].includes(section)) {
          settings.leftSection = section;
          persistWorkspace();
        }
        return result;
      };
    }

    // Single-flight autosave queue: changes made during a write trigger another
    // snapshot instead of being dropped while the first request is in flight.
    window.autosaveLightweight = function autosaveLightweight() {
      if (!fs.activeProjectName) return Promise.resolve(false);
      fs.autosaveRequested = true;
      if (fs.autosavePromise) return fs.autosavePromise;

      const saveLoop = async () => {
        while (fs.autosaveRequested) {
          fs.autosaveRequested = false;
          const name = fs.activeProjectName;
          if (!name) return false;
          const snapshot = window.projectSnapshot(false);
          const serialized = JSON.stringify(snapshot);
          if (serialized === fs.lastAutosave) continue;

          setSaveState('saving');
          try {
            await BlockodeAPI.saveProjectFile(name, 'autosave.blockode.json', snapshot);
          } catch (error) {
            fs.autosaveRequested = false;
            console.warn('Disk autosave failed:', error);
            setSaveState('error', error);
            return false;
          }

          fs.lastAutosave = serialized;
          fs.lastAutosaveBytes = new Blob([serialized]).size;
          if (fs.activeProjectName !== name || JSON.stringify(window.projectSnapshot(false)) !== serialized) {
            fs.autosaveRequested = true;
          }
          if (typeof window.updateMemoryMeter === 'function') window.updateMemoryMeter();
          setSaveState(fs.autosaveRequested ? 'saving' : 'saved');
        }
        return true;
      };

      fs.autosaveInFlight = true;
      const promise = saveLoop();
      fs.autosavePromise = promise;
      return promise.finally(() => {
        if (fs.autosavePromise === promise) fs.autosavePromise = null;
        fs.autosaveInFlight = false;
        if (fs.autosaveRequested && fs.activeProjectName) {
          window.setTimeout(() => window.autosaveLightweight(), 0);
        }
      });
    };

    // A manual save writes project files and then flushes the latest autosave.
    if (typeof window.saveProjectToDisk === 'function') {
      const saveProjectToDisk = window.saveProjectToDisk;
      window.saveProjectToDisk = async function (...args) {
        if (fs.autosavePromise) await fs.autosavePromise;
        const result = await saveProjectToDisk.apply(this, args);
        await window.autosaveLightweight();
        return result;
      };
    }

    // Frequent autosaves are primary protection against losing work; close-time
    // requests are best effort since browsers may stop async work during shutdown.
    window.setInterval(() => {
      if (document.visibilityState !== 'hidden') window.autosaveLightweight();
    }, 2000);

    let lastFlushAt = 0;
    function flushOnHide() {
      const now = Date.now();
      if (now - lastFlushAt < 1000) return;
      lastFlushAt = now;

      if (fs.activeProjectName && !fs.autosavePromise) {
        const name = fs.activeProjectName;
        try {
          const serialized = JSON.stringify(window.projectSnapshot(false));
          // keepalive requests have a small browser-enforced body limit.
          if (new Blob([serialized]).size <= 60 * 1024) {
            fetch('/api/project-files?name=' + encodeURIComponent(name) + '&file=autosave.blockode.json', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: serialized,
              keepalive: true,
              cache: 'no-store'
            }).then(response => {
              if (response.ok) {
                fs.lastAutosave = serialized;
                fs.lastAutosaveBytes = new Blob([serialized]).size;
                setSaveState('saved');
                if (JSON.stringify(window.projectSnapshot(false)) !== serialized) window.autosaveLightweight();
              } else {
                setSaveState('error', new Error('Close-time autosave request failed'));
              }
            }).catch(error => setSaveState('error', error));
          } else {
            window.autosaveLightweight();
          }
        } catch (error) {
          setSaveState('error', error);
        }
      }

      // Flush small app preferences independently from the project snapshot.
      if (typeof settings !== 'undefined' && typeof KEYS !== 'undefined') {
        try {
          const body = JSON.stringify({ settings, keys: KEYS });
          if (new Blob([body]).size <= 60 * 1024) {
            fetch('/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body,
              keepalive: true,
              cache: 'no-store'
            }).catch(error => console.warn('Could not flush settings on close:', error));
          }
        } catch (error) {
          console.warn('Could not prepare settings for close-time save:', error);
        }
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushOnHide();
    });
    window.addEventListener('pagehide', flushOnHide);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installSaveImprovements, { once: true });
  } else {
    installSaveImprovements();
  }
})();
