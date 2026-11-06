// ── SCENE TREE (current active scene only) + SCENES LIST ──
let scenesQuery = '';
let leftSection = 'scenes'; // 'scenes' | 'tree'

function setLeftSection(sec, force) {
  // Clicking the already-active tab returns to Scenes (default) or stays
  if (!force && sec === leftSection) {
    if (leftSection === 'tree') sec = 'scenes';
    else return; // already on scenes default
  }
  leftSection = sec === 'tree' ? 'tree' : 'scenes';
  const tabScenes = $('tab-scenes');
  const tabTree = $('tab-tree');
  if (tabScenes) tabScenes.classList.toggle('on', leftSection === 'scenes');
  if (tabTree) tabTree.classList.toggle('on', leftSection === 'tree');
  const secS = $('scenes-section');
  const secT = $('tree-section');
  if (secS) secS.classList.toggle('hidden', leftSection !== 'scenes');
  if (secT) secT.classList.toggle('hidden', leftSection !== 'tree');
  updateNewSceneButton();
  if (leftSection === 'scenes') renderScenesList();
  else renderSceneTree();
}

function updateNewSceneButton() {
  const btn = $('btn-new-scene');
  if (!btn) return;
  if (leftSection === 'tree') {
    btn.setAttribute('data-tip', 'Add Scene Instance into current scene');
    btn.title = 'Add Scene Instance';
    btn.textContent = '⧉';
  } else {
    btn.setAttribute('data-tip', 'New Scene');
    btn.title = 'New Scene';
    btn.textContent = '+';
  }
}

function onNewSceneButtonClick(e) {
  if (e) e.stopPropagation();
  if (leftSection === 'tree') {
    if (typeof addSceneInstance === 'function') addSceneInstance();
  } else {
    if (typeof openNewSceneModal === 'function') openNewSceneModal();
  }
}

function renderScenesList() {
  const list = $('scenes-list');
  if (!list) return;
  list.innerHTML = '';
  const q = (scenesQuery || '').trim().toLowerCase();
  const filtered = scenes.filter(sc => !q || sc.name.toLowerCase().includes(q));
  if (!scenes.length) {
    list.innerHTML = '<div class="tree-none">No scenes yet.<br><br><span style="color:var(--accent-teal);cursor:pointer" id="scenes-empty-create">+ Create a scene</span></div>';
    const el = $('scenes-empty-create');
    if (el) el.onclick = () => openNewSceneModal();
    return;
  }
  if (!filtered.length) {
    list.innerHTML = '<div class="tree-none">No matches for "' + esc(scenesQuery) + '"</div>';
    return;
  }
  filtered.forEach(sc => {
    const row = document.createElement('div');
    row.className = 'scenes-item' + (sc.id === activeSceneId ? ' active' : '');
    const nodeCount = sc.nodes ? sc.nodes.length : 0;
    row.innerHTML = `<div class="node-icon node2d">◈</div><span class="s-name">${hl(sc.name, q)}</span><span class="s-badge">${nodeCount}</span>`;
    row.onclick = () => {
      setActiveScene(sc.id);
      setLeftSection('tree', true);
    };
    row.ondblclick = () => {
      startRename(row.querySelector('.s-name'), sc.name, v => {
        sc.name = v;
        renderTabs();
        renderScenesList();
      });
    };
    row.oncontextmenu = e => {
      e.preventDefault();
      e.stopPropagation();
      showMenu(e.clientX, e.clientY, [
        { label: 'Open Scene', fn: () => { setActiveScene(sc.id); setLeftSection('tree', true); } },
        { label: 'Rename Scene', fn: () => startRename(row.querySelector('.s-name'), sc.name, v => { sc.name = v; renderTabs(); renderScenesList(); }) },
        '-',
        { label: 'Delete Scene', danger: true, fn: () => { if (confirm('Delete scene "' + sc.name + '"?')) closeScene(sc.id); } }
      ]);
    };
    list.appendChild(row);
  });
}

function renderSceneTree() {
  const tree = $('scene-tree');
  if (!tree) return;
  tree.innerHTML = '';
  visibleOrder = [];
  const sc = activeScene();
  if (!sc) {
    tree.innerHTML = '<div class="tree-none">No scene selected.<br><br>Switch to the <b>Scenes</b> tab and open or create one.</div>';
    return;
  }
  const q = treeQuery.trim().toLowerCase();
  let vis = null;
  if (q) {
    vis = new Set();
    sc.nodes.forEach(n => {
      if (matchNode(n, q)) for (let c = n; c; c = sc.nodes.find(x => x.id === c.parentId)) vis.add(c.id);
    });
    if (!vis.size) {
      tree.innerHTML = '<div class="tree-none">No matches for "' + esc(treeQuery) + '"</div>';
      return;
    }
  }
  walk(sc, sc.rootNode, 0, vis, q, tree);
}

function walk(sc, id, depth, vis, q, tree) {
  const n = sc.nodes.find(x => x.id === id);
  if (!n || (vis && !vis.has(id))) return;

  const isInstance = n.type === 'SceneInstance';
  const kids = isInstance ? [] : childrenOf(sc, id);
  const isOpen = q || !collapsed.has(id);
  visibleOrder.push(id);

  const row = document.createElement('div');
  row.className = 'scene-item' + (n.id === selectedNodeId ? ' selected' : '');
  row.dataset.node = id;
  row.setAttribute('data-tip', n.type + ' · ' + n.name);
  row.title = n.type + ' — ' + n.name;

  const scale = (typeof settings !== 'undefined' && settings.scale) ? settings.scale : 1;
  const indent = ((typeof settings !== 'undefined' && settings.indentSize) ? settings.indentSize : 14) * scale;
  row.style.paddingLeft = (Math.round(8 * scale) + depth * indent) + 'px';

  const total = isInstance ? 0 : descendants(sc, id).length;
  const typeHint = (typeof settings !== 'undefined' && settings.showNodeTypeInTree) ? `<span class="scene-type">${esc(n.type)}</span>` : '';

  let extra = '';
  if (isInstance) {
    const targetName = (scenes.find(s => s.id === (n.props && n.props.sceneId)) || {}).name || 'Scene';
    extra = `<button type="button" class="scene-instance-enter" data-enter="${n.props && n.props.sceneId || ''}" title="Enter scene">Enter ${esc(targetName)}</button>`;
  } else if (kids.length && !isOpen) {
    extra = `<span class="scene-badge">${total}</span>`;
  }

  row.innerHTML = `<span class="expand-arrow${kids.length && isOpen ? ' open' : ''}">${kids.length ? '▶' : ''}</span><div class="node-icon ${String(n.type).toLowerCase()}">${NODE_TYPES[n.type] || '◈'}</div><span class="scene-name">${hl(n.name, q)}${typeHint}</span>${extra}`;

  const arrow = row.querySelector('.expand-arrow');
  if (arrow) arrow.onclick = e => {
    e.stopPropagation();
    if (kids.length) {
      collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);
      renderSceneTree();
    }
  };

  const enterBtn = row.querySelector('.scene-instance-enter');
  if (enterBtn) {
    enterBtn.onclick = e => {
      e.stopPropagation();
      const sid = enterBtn.getAttribute('data-enter');
      if (sid && scenes.some(s => s.id === sid)) {
        setActiveScene(sid);
        setLeftSection('tree', true);
      }
    };
  }

  row.onclick = e => {
    // Root node: open Add Node picker (same visual menu as creating nodes)
    if (id === sc.rootNode && e.detail === 1) {
      selectNode(id, sc.id);
      // slight delay so selection paints, then open picker
      setTimeout(() => { if (typeof showAddMenu === 'function') showAddMenu(null, id); }, 0);
      return;
    }
    selectNode(id, sc.id);
  };
  row.ondblclick = e => {
    e.stopPropagation();
    if (!isInstance) renameNode(sc, n, row.querySelector('.scene-name'));
  };

  row.oncontextmenu = e => {
    e.preventDefault();
    e.stopPropagation();
    selectNode(id, sc.id);
    const isRoot = id === sc.rootNode;
    const items = [
      { label: 'Add Child Node…', fn: () => showAddMenu(null, id) },
      { label: 'Add Scene Instance…', fn: () => addSceneInstance(id) },
      '-',
      { label: 'Rename Node   F2', fn: renameSelected },
      { label: 'Change Node…', fn: () => changeNodeType(id) },
    ];
    if (isInstance) {
      items.push({ label: 'Enter Scene', fn: () => {
        const sid = n.props && n.props.sceneId;
        if (sid) { setActiveScene(sid); setLeftSection('tree', true); }
      }});
    }
    if (!isRoot) {
      items.push('-', { label: 'Duplicate   Ctrl+D', fn: () => duplicateNode(id) });
      items.push({ label: 'Delete Node   Del', danger: true, fn: () => deleteNode(id) });
    }
    showMenu(e.clientX, e.clientY, items);
  };

  if (id !== sc.rootNode && !isInstance) {
    row.draggable = true;
    row.ondragstart = e => {
      dragNode = { sc: sc.id, id };
      e.dataTransfer.setData('text/plain', id);
      row.classList.add('dragging');
    };
    row.ondragend = () => {
      dragNode = null;
      document.querySelectorAll('.drop-target,.dragging').forEach(el => el.classList.remove('drop-target', 'dragging'));
    };
  }
  const canDrop = () => dragNode && dragNode.sc === sc.id && dragNode.id !== id && !descendants(sc, dragNode.id).includes(id) && !isInstance;
  row.ondragover = e => { if (canDrop()) { e.preventDefault(); row.classList.add('drop-target'); } };
  row.ondragleave = () => row.classList.remove('drop-target');
  row.ondrop = e => { e.preventDefault(); if (canDrop()) reparent(sc, dragNode.id, id); };

  tree.appendChild(row);
  if (isOpen && kids.length) kids.forEach(k => walk(sc, k.id, depth + 1, vis, q, tree));
}

// Visual picker: pick an existing scene to instance into the current scene
function addSceneInstance(parentId) {
  const sc = activeScene();
  if (!sc) { openNewSceneModal(); return; }
  const others = scenes.filter(s => s.id !== sc.id);
  if (!others.length) {
    setStatus('Create another scene first to instance it');
    openNewSceneModal();
    return;
  }
  openSceneInstancePicker(parentId || selectedNodeId || sc.rootNode, others);
}

function openSceneInstancePicker(parentId, sceneList) {
  let overlay = $('scene-instance-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'scene-instance-overlay';
    overlay.className = 'add-node-overlay';
    overlay.innerHTML = `
      <div class="add-node-panel" role="dialog" aria-label="Add Scene Instance">
        <div class="add-node-header">
          <div class="add-node-title">Add Scene Instance</div>
          <button type="button" class="add-node-close" title="Close" aria-label="Close">✕</button>
        </div>
        <div class="add-node-hint" style="padding:8px 14px 0;color:var(--text-muted);font-size:12px">
          Choose an existing scene to place into the current scene. Hierarchy stays hidden — use Enter to open it.
        </div>
        <div class="add-node-search">
          <span class="add-node-search-icon">⌕</span>
          <input type="text" id="scene-instance-search" placeholder="Search scenes…" autocomplete="off" spellcheck="false"/>
        </div>
        <div class="add-node-grid" id="scene-instance-grid"></div>
        <div class="add-node-hint" style="border-top:1px solid var(--border);margin-top:8px;padding-top:10px">
          Need a new scene instead? <button type="button" id="scene-instance-create-new" class="scenes-act-btn" style="display:inline-block;width:auto;padding:4px 10px;margin-left:6px">＋ Create New Scene</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', ev => { if (ev.target === overlay) closeSceneInstancePicker(); });
    overlay.querySelector('.add-node-close').onclick = closeSceneInstancePicker;
    const inp = overlay.querySelector('#scene-instance-search');
    inp.addEventListener('input', () => renderSceneInstanceGrid(inp.value));
    inp.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') closeSceneInstancePicker();
    });
    overlay.querySelector('#scene-instance-create-new').onclick = () => {
      closeSceneInstancePicker();
      openNewSceneModal();
    };
  }
  overlay._parentId = parentId;
  overlay._scenes = sceneList || scenes.filter(s => s.id !== (activeScene() && activeScene().id));
  renderSceneInstanceGrid('');
  overlay.classList.add('show');
  requestAnimationFrame(() => {
    const inp = $('scene-instance-search');
    if (inp) { inp.value = ''; inp.focus(); }
  });
}

function closeSceneInstancePicker() {
  const overlay = $('scene-instance-overlay');
  if (overlay) overlay.classList.remove('show');
}

function renderSceneInstanceGrid(query) {
  const grid = $('scene-instance-grid');
  const overlay = $('scene-instance-overlay');
  if (!grid || !overlay) return;
  grid.innerHTML = '';
  const q = (query || '').trim().toLowerCase();
  const list = (overlay._scenes || []).filter(s => !q || s.name.toLowerCase().includes(q));
  if (!list.length) {
    grid.innerHTML = '<div class="add-node-empty">No scenes match</div>';
    return;
  }
  list.forEach(target => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'add-node-card';
    card.style.setProperty('--nc', '#3ec6b0');
    const nodeCount = target.nodes ? target.nodes.length : 0;
    card.innerHTML = `
      <div class="add-node-card-icon">⧉</div>
      <div class="add-node-card-body">
        <div class="add-node-card-name">${esc(target.name)}</div>
        <div class="add-node-card-desc">${nodeCount} node(s) · instance into current scene</div>
      </div>`;
    card.onclick = () => {
      placeSceneInstance(overlay._parentId, target);
      closeSceneInstancePicker();
    };
    grid.appendChild(card);
  });
}

function placeSceneInstance(parentId, target) {
  const sc = activeScene();
  if (!sc || !target) return;
  parentId = parentId || selectedNodeId || sc.rootNode;
  const node = {
    id: uid('n'),
    name: uniqueName(sc, parentId, target.name),
    type: 'SceneInstance',
    parentId,
    props: Object.assign(defaultProps('SceneInstance'), { sceneId: target.id }),
    lines: [{ id: uid('l'), name: 'Line 1', rep: 1, blocks: [] }]
  };
  sc.nodes.push(node);
  collapsed.delete(parentId);
  if (typeof clearSearch === 'function') clearSearch('tree-search');
  selectNode(node.id);
  setStatus('Added scene instance of "' + target.name + '"');
}
