// ── SETTINGS ──
const DEF_LAYOUT = { lw: 220, rw: 200, dh: 140, splitPrev: 40, propsPct: 45 };
const DEF_KEYS = {
  run: 'F5', undo: 'Ctrl+Z', redo: 'Ctrl+Y', save: 'Ctrl+S', open: 'Ctrl+O',
  newScene: 'Alt+N', addSprite: 'Alt+A', findNodes: '/', viewScript: 'Alt+1',
  viewScene: 'Alt+2', viewSplit: 'Alt+3', viewAssets: 'Alt+4',
  toggleTree: 'Ctrl+B', toggleDebug: 'Ctrl+J', settings: 'Ctrl+,'
};
let settings = {
  scale: 1, previewBg: '#14151b', scriptBg: '#1a1b22', grid: true,
  labels: false, lightMode: false, fontFamily: 'default', fontSize: 13,
  layout: { ...DEF_LAYOUT }, accentTeal: '#3ec6b0', accentBlue: '#5b8dee',
  panelOpacity: 1, compactMode: false, showPanelTitles: true,
  showLeft: true, showRight: true, showDebug: true, showBlockLibrary: true,
  showScriptProps: true, showTips: true, showHints: true,
  blockH: 34, trackH: 44, libCollapsed: false,
  treeIconSize: 22, treeRowPad: 4, showNodeTypeInTree: false, indentSize: 14,
  modalScale: true
};
let KEYS = { ...DEF_KEYS };
let capture = null;

try {
  const d = JSON.parse(localStorage.getItem('blockode.v6') || '{}');
  Object.assign(settings, d.settings || {});
  settings.layout = { ...DEF_LAYOUT, ...(d.settings?.layout || {}) };
  Object.assign(KEYS, d.KEYS || {});
} catch(e) {}

const saveSettings = () => {
  try { localStorage.setItem('blockode.v6', JSON.stringify({ settings, KEYS })); } catch(e) {}
};

function applySettings() {
  const L = settings.layout;
  const scale = Math.min(2.5, Math.max(0.7, Math.round((+(settings.scale || 1)) * 20) / 20));
  settings.scale = scale;
  const fs = Math.min(50, Math.max(10, +(settings.fontSize || 13)));
  settings.fontSize = fs;

  const root = document.documentElement;
  root.style.setProperty('--gui-scale', String(scale));
  root.style.setProperty('--fs', fs + 'px');
  root.style.setProperty('--fs-sm', Math.max(9, Math.round(fs * 0.85)) + 'px');
  root.style.setProperty('--fs-xs', Math.max(8, Math.round(fs * 0.72)) + 'px');
  document.body.style.fontSize = fs + 'px';

  // Dimensional controls scaled by GUI scale
  const iconBase   = +(settings.treeIconSize || 22);
  const rowPadBase = +(settings.treeRowPad || 4);
  const indentBase = +(settings.indentSize || 14);
  const blockH     = +(settings.blockH || 34);
  const trackH     = +(settings.trackH || 44);

  root.style.setProperty('--tree-icon',       Math.round(iconBase * scale) + 'px');
  root.style.setProperty('--tree-icon-fs',    Math.max(10, Math.round(iconBase * scale * 0.55)) + 'px');
  root.style.setProperty('--tree-indent',     Math.round(indentBase * scale) + 'px');
  root.style.setProperty('--tree-row-pad',    Math.round(rowPadBase * scale) + 'px');
  root.style.setProperty('--icon-btn-size',   Math.round(22 * scale) + 'px');
  root.style.setProperty('--icon-btn-fs',     Math.round(13 * scale) + 'px');
  root.style.setProperty('--overflow-btn-size', Math.round(36 * scale) + 'px');
  root.style.setProperty('--overflow-btn-fs',   Math.round(22 * scale) + 'px');
  root.style.setProperty('--ctx-min-w',       Math.round(180 * scale) + 'px');
  root.style.setProperty('--ctx-pad-y',       Math.round(6 * scale) + 'px');
  root.style.setProperty('--ctx-pad-x',       Math.round(14 * scale) + 'px');
  root.style.setProperty('--block-h',         Math.round(blockH * scale) + 'px');
  root.style.setProperty('--track-min-h',     Math.round(trackH * scale) + 'px');
  root.style.setProperty('--topbar-h',        Math.round(46 * scale) + 'px');
  root.style.setProperty('--rib-pad-y',       Math.round(8 * scale) + 'px');
  root.style.setProperty('--rib-pad-x',       Math.round(14 * scale) + 'px');
  root.style.setProperty('--run-btn-fs',      Math.round(12 * scale) + 'px');
  root.style.setProperty('--run-btn-pad-x',   Math.round(14 * scale) + 'px');
  root.style.setProperty('--run-btn-pad-y',   Math.round(5 * scale) + 'px');

  const fonts = {
    default:   "'Segoe UI',system-ui,sans-serif",
    system:    'system-ui,sans-serif',
    mono:      "'Cascadia Code','Consolas',monospace",
    inter:     "'Inter',system-ui,sans-serif",
    jetbrains: "'JetBrains Mono','Cascadia Code',monospace"
  };
  root.style.setProperty('--font', fonts[settings.fontFamily] || fonts.default);
  if (settings.accentTeal) root.style.setProperty('--accent-teal', settings.accentTeal);
  if (settings.accentBlue) root.style.setProperty('--accent-blue', settings.accentBlue);

  // Layout widths
  const lw = settings.layout.lw || 220, rw = settings.layout.rw || 200;
  root.style.setProperty('--left-w', lw + 'px');
  root.style.setProperty('--right-w', rw + 'px');
  const ls = $('left-slot'), rs = $('right-slot');
  if (ls) { ls.style.width = lw + 'px'; ls.style.flexBasis = lw + 'px'; }
  if (rs) { rs.style.width = rw + 'px'; rs.style.flexBasis = rw + 'px'; }

  // Debug panel height
  const dh = L.dh || 140;
  root.style.setProperty('--dh', dh + 'px');
  const dbg = $('debug-panel');
  if (dbg) dbg.style.setProperty('--dh', dh + 'px');

  if ($('canvas-area')) $('canvas-area').style.background = settings.scriptBg;

  document.body.classList.toggle('light',          !!settings.lightMode);
  document.body.classList.toggle('compact',        !!settings.compactMode);
  document.body.classList.toggle('hide-left',      settings.showLeft === false);
  document.body.classList.toggle('hide-right',     settings.showRight === false);
  document.body.classList.toggle('hide-debug',     settings.showDebug === false);
  document.body.classList.toggle('hide-library',   settings.showBlockLibrary === false);
  document.body.classList.toggle('hide-scriptprops', settings.showScriptProps === false);
  document.body.classList.toggle('no-tips',        settings.showTips === false);
  document.body.classList.toggle('no-hints',       settings.showHints === false);
  document.body.classList.toggle('show-node-type', !!settings.showNodeTypeInTree);

  root.style.setProperty('--panel-op', settings.panelOpacity ?? 1);
  document.querySelectorAll('.sp-title').forEach(el => {
    el.style.display = settings.showPanelTitles !== false ? '' : 'none';
  });

  if (typeof syncLibCollapseClass === 'function') syncLibCollapseClass();
  const rt = $('rib-tree'), rp = $('rib-props');
  if (rt) rt.classList.toggle('on', settings.showLeft !== false);
  if (rp) rp.classList.toggle('on', settings.showRight !== false);

  const sph = settings.layout.splitPrev || 40;
  $('canvas-panel')?.style.setProperty('--split-prev', Math.min(50, Math.max(15, sph)) + '%');

  const modalScale = settings.modalScale !== false ? scale : 1;
  root.style.setProperty('--modal-scale', String(modalScale));

  if (typeof renderSceneTree === 'function') try { renderSceneTree(); } catch(e) {}
}

function setScale(v) {
  settings.scale = Math.min(2.5, Math.max(0.7, Math.round(v * 20) / 20));
  applySettings();
  saveSettings();
  setStatus('Scale ' + Math.round(settings.scale * 100) + '%');
}

// ── SETTINGS DIALOG ──
function openSettings() {
  $('settings-overlay').classList.add('show');
  renderSettings();
}
function closeSettings() {
  $('settings-overlay').classList.remove('show');
  capture = null;
}

$('settings-overlay').addEventListener('click', e => {
  if (e.target.id === 'settings-overlay') closeSettings();
});

// Live keybind capture at document level
document.addEventListener('keydown', e => {
  if (!capture) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.key === 'Escape') { capture = null; renderSettings(); return; }
  const parts = [];
  if (e.ctrlKey)  parts.push('Ctrl');
  if (e.altKey)   parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  const k = e.key;
  if (!['Control','Alt','Shift','Meta'].includes(k)) parts.push(k.length === 1 ? k.toUpperCase() : k);
  KEYS[capture] = parts.join('+');
  capture = null;
  saveSettings();
  renderSettings();
}, true);

function sectionHtml(label, content, open = true) {
  return `<div class="settings-section-head${open ? ' open' : ''}" onclick="this.classList.toggle('open');this.nextElementSibling.style.display=this.classList.contains('open')?'':'none'"><span class="arrow">▶</span>${label}</div><div style="${open ? '' : 'display:none'}">${content}</div>`;
}

// Helper: build a slider row
function sliderRow(label, key, min, max, step, unit, extra) {
  const val = settings[key] ?? 0;
  const handler = extra || `settings['${key}']=+this.value;applySettings();saveSettings()`;
  return `<div class="srow"><label>${label} <b id="sv-${key}">${val}${unit}</b></label><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" oninput="${handler};document.getElementById('sv-${key}').textContent=this.value+'${unit}'"/></div>`;
}
// Helper: checkbox row
function checkRow(label, key, extra) {
  const checked = settings[key] !== false && !!settings[key];
  const handler = extra || `settings['${key}']=this.checked;applySettings();saveSettings()`;
  return `<div class="srow"><label>${label}</label><input type="checkbox" ${checked ? 'checked' : ''} onchange="${handler}"/></div>`;
}

function renderSettings() {
  const frag = `
  <div class="settings-modal">
    <div class="settings-header">
      <div class="settings-title">⚙ Settings</div>
      <div class="settings-search-wrap">
        <span class="settings-search-icon">⌕</span>
        <input class="settings-search-input" id="settings-search" placeholder="Search settings…" autocomplete="off" oninput="filterSettings(this.value)"/>
        <button class="settings-search-clear" id="settings-search-clear" onclick="document.getElementById('settings-search').value='';filterSettings('')" style="display:none">✕</button>
      </div>
      <div class="settings-header-btns">
        <button class="btn btn-ghost" onclick="KEYS={...DEF_KEYS};saveSettings();renderSettings()">Reset Keybinds</button>
        <button class="btn btn-ghost" onclick="resetLayout()">Reset Layout</button>
        <button class="btn btn-primary" onclick="closeSettings()">Done</button>
      </div>
    </div>
    <div class="settings-body" id="settings-body">
      ${sectionHtml('Interface', `
        ${sliderRow('GUI Scale', 'scale', 70, 250, 5, '%',
          `setScale(this.value/100)`)}
        ${sliderRow('Font Size', 'fontSize', 10, 50, 1, 'px',
          `settings.fontSize=+this.value;applySettings();saveSettings()`)}
        <div class="srow"><label>Font Family</label><select onchange="settings.fontFamily=this.value;applySettings();saveSettings()">
          <option value="default" ${settings.fontFamily==='default'?'selected':''}>Default (Segoe UI)</option>
          <option value="system"  ${settings.fontFamily==='system'?'selected':''}>System UI</option>
          <option value="inter"   ${settings.fontFamily==='inter'?'selected':''}>Inter</option>
          <option value="jetbrains" ${settings.fontFamily==='jetbrains'?'selected':''}>JetBrains Mono</option>
          <option value="mono"    ${settings.fontFamily==='mono'?'selected':''}>Cascadia Code</option>
        </select></div>
        ${checkRow('Scale modals & pickers', 'modalScale')}
        ${checkRow('🌙 Dark / ☀️ Light Mode', 'lightMode')}
        ${checkRow('Compact Mode', 'compactMode')}
        ${checkRow('Show Panel Titles', 'showPanelTitles')}
      `)}
      ${sectionHtml('Scene Tree', `
        ${sliderRow('Node icon size', 'treeIconSize', 14, 36, 2, 'px')}
        ${sliderRow('Row padding', 'treeRowPad', 1, 12, 1, 'px')}
        ${sliderRow('Indent size', 'indentSize', 8, 28, 2, 'px')}
        ${checkRow('Show type under name', 'showNodeTypeInTree',
          `settings.showNodeTypeInTree=this.checked;applySettings();saveSettings();if(typeof renderSceneTree==='function')renderSceneTree()`)}
      `)}
      ${sectionHtml('Panels', `
        ${checkRow('Scene Tree (left)', 'showLeft')}
        ${checkRow('Properties (right)', 'showRight')}
        ${checkRow('Script Properties', 'showScriptProps')}
        ${checkRow('Block Library', 'showBlockLibrary')}
        ${checkRow('Debug Panel', 'showDebug')}
        ${checkRow('Show tooltips', 'showTips')}
        ${checkRow('Show helper hints', 'showHints')}
        ${checkRow('Collapse block library', 'libCollapsed')}
      `)}
      ${sectionHtml('Layout', `
        <div class="srow"><label>Left panel width <b id="sv-lw">${settings.layout.lw||220}px</b></label><input type="range" min="140" max="400" step="10" value="${settings.layout.lw||220}" oninput="settings.layout.lw=+this.value;applySettings();saveSettings();document.getElementById('sv-lw').textContent=this.value+'px'"/></div>
        <div class="srow"><label>Right panel width <b id="sv-rw">${settings.layout.rw||200}px</b></label><input type="range" min="140" max="400" step="10" value="${settings.layout.rw||200}" oninput="settings.layout.rw=+this.value;applySettings();saveSettings();document.getElementById('sv-rw').textContent=this.value+'px'"/></div>
        <div class="srow"><label>Debug panel height <b id="sv-dh">${settings.layout.dh||140}px</b></label><input type="range" min="60" max="400" step="10" value="${settings.layout.dh||140}" oninput="settings.layout.dh=+this.value;applySettings();saveSettings();document.getElementById('sv-dh').textContent=this.value+'px'"/></div>
        ${sliderRow('Code block height', 'blockH', 28, 56, 2, 'px')}
        ${sliderRow('Track height', 'trackH', 36, 72, 2, 'px')}
      `)}
      ${sectionHtml('Colors & Theme', `
        <div class="srow"><label>Accent Teal</label><input type="color" value="${settings.accentTeal||'#3ec6b0'}" oninput="settings.accentTeal=this.value;applySettings();saveSettings()"/></div>
        <div class="srow"><label>Accent Blue</label><input type="color" value="${settings.accentBlue||'#5b8dee'}" oninput="settings.accentBlue=this.value;applySettings();saveSettings()"/></div>
        <div class="srow"><label>Script canvas background</label><input type="color" value="${settings.scriptBg}" oninput="settings.scriptBg=this.value;applySettings();saveSettings()"/></div>
        <div class="srow"><label>Preview background</label><input type="color" value="${settings.previewBg}" oninput="settings.previewBg=this.value;applySettings();saveSettings()"/></div>
      `)}
      ${sectionHtml('Preview', `
        ${checkRow('Show grid', 'grid', `settings.grid=this.checked;saveSettings()`)}
        ${checkRow('Show node labels', 'labels', `settings.labels=this.checked;saveSettings()`)}
      `)}
      ${sectionHtml('Keybinds', `
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Click a key to rebind it. Press keys, then Esc to cancel.</div>
        ${Object.keys(DEF_KEYS).map(k => {
          const names = {run:'Run / Stop',undo:'Undo',redo:'Redo',save:'Save',open:'Open',newScene:'New Scene',addSprite:'Add Sprite',findNodes:'Find Nodes',viewScript:'Script View',viewScene:'Scene View',viewSplit:'Split View',viewAssets:'Assets View',toggleTree:'Toggle Scene Tree',toggleDebug:'Toggle Debug',settings:'Open Settings'};
          return `<div class="srow"><label>${names[k]||k}</label><button class="keybtn${capture===k?' cap':''}" onclick="capture='${k}';renderSettings()">${capture===k?'Press keys…':KEYS[k]||'—'}</button></div>`;
        }).join('')}
        <div style="font-size:10px;color:var(--text-muted);margin-top:6px">Fixed: Del delete · F2 rename · Ctrl+D duplicate · Arrows navigate tree</div>
      `, false)}
    </div>
  </div>`;

  $('settings-overlay').innerHTML = frag;

  // Wire section arrows
  document.querySelectorAll('#settings-overlay .settings-section-head').forEach(h => {
    const arr = h.querySelector('.arrow');
    if (arr) arr.style.transform = h.classList.contains('open') ? 'rotate(90deg)' : '';
  });

  // Auto-focus search
  const srch = $('settings-search');
  if (srch) {
    srch.addEventListener('input', () => {
      const clear = $('settings-search-clear');
      if (clear) clear.style.display = srch.value ? 'block' : 'none';
    });
  }
}

function filterSettings(query) {
  const q = (query || '').trim().toLowerCase();
  const clear = $('settings-search-clear');
  if (clear) clear.style.display = q ? 'block' : 'none';

  const body = $('settings-body');
  if (!body) return;

  if (!q) {
    // Show all sections + rows
    body.querySelectorAll('.settings-section-head').forEach(h => {
      h.style.display = '';
      const content = h.nextElementSibling;
      if (content) {
        content.style.display = h.classList.contains('open') ? '' : 'none';
      }
    });
    body.querySelectorAll('.srow').forEach(r => r.style.display = '');
    return;
  }

  // Filter: show only matching rows, expand sections that have matches
  body.querySelectorAll('.settings-section-head').forEach(h => {
    const content = h.nextElementSibling;
    if (!content) return;
    const rows = content.querySelectorAll('.srow');
    let anyMatch = false;
    rows.forEach(r => {
      const text = r.textContent.toLowerCase();
      const match = text.includes(q);
      r.style.display = match ? '' : 'none';
      if (match) anyMatch = true;
    });
    h.style.display = anyMatch ? '' : 'none';
    if (content) content.style.display = anyMatch ? '' : 'none';
  });
}
