// ── PROJECT STORAGE ──
// Step 6: project files and assets are stored by the local Go API.
// This module intentionally does not use the browser File System Access API.

const ProjectFS = {
  manifestName: 'manifest.json',
  projectName: 'project.blockode.json',
  assetsDirName: 'assets',
  autosaveInFlight: false,
  lastAutosave: '',
  lastAutosaveBytes: 0,
  activeProjectName: localStorage.getItem('blockode.activeProject') || '',
  get dirHandle() { return null; },
  get connected() { return !!this.activeProjectName; }
};

function projectSnapshot(includeAssetUrls) {
  return {
    v: 3,
    scenes,
    assets: (assets || []).map(a => {
      const o = {
        id: a.id, name: a.name, type: a.type || 'image', kind: a.kind || 'imported',
        folderId: a.folderId || null, mime: a.mime || null,
        customType: a.customType || null, seed: a.seed || null, settings: a.settings || null
      };
      if (a.filePath) o.filePath = a.filePath;
      if (includeAssetUrls && a.url) o.url = a.url;
      if (!o.filePath && a.kind === 'custom' && a.url) o.url = a.url;
      return o;
    }),
    assetFolders: typeof assetFolders !== 'undefined' ? assetFolders : [],
    customBlocks: typeof customBlocks !== 'undefined' ? customBlocks : [],
    customFolders: typeof customFolders !== 'undefined' ? customFolders : [],
    activeSceneId, selectedNodeId,
    art: typeof ART !== 'undefined' && ART.serialize ? ART.serialize() : null,
    audio: typeof AUDIO !== 'undefined' && AUDIO.serialize ? AUDIO.serialize() : null
  };
}

function estimateLocalBytes() {
  let n = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i), v = localStorage.getItem(k) || '';
      n += (k.length + v.length) * 2;
    }
  } catch (_) {}
  try { (assets || []).forEach(a => { if (a.url && a.url.startsWith('data:')) n += a.url.length; }); } catch (_) {}
  return n;
}

function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

function updateMemoryMeter() {
  const el = document.getElementById('mem-meter');
  if (el) {
    const used = ProjectFS.lastAutosaveBytes, pct = Math.min(100, Math.round(used / (32 * 1024 * 1024) * 100));
    el.title = 'Latest disk autosave: ' + formatBytes(used) + ' / 32 MB';
    el.innerHTML = `<span class="mem-label">Save</span><span class="mem-bar"><i style="width:${pct}%"></i></span><span class="mem-val">${formatBytes(used)}</span>`;
    el.classList.toggle('warn', pct >= 70);
    el.classList.toggle('crit', pct >= 90);
  }
  const pathEl = document.getElementById('project-path');
  if (pathEl) {
    pathEl.textContent = ProjectFS.activeProjectName ? '💾 ' + ProjectFS.activeProjectName : '💾 no project selected';
    pathEl.title = ProjectFS.activeProjectName ? 'Stored locally by Blockode' : 'Create or open a project to save to disk';
  }
}

function setActiveProject(name) {
  const nextName = name || '';
  if (nextName !== ProjectFS.activeProjectName) {
    ProjectFS.lastAutosave = '';
    ProjectFS.lastAutosaveBytes = 0;
  }
  ProjectFS.activeProjectName = nextName;
  if (name) localStorage.setItem('blockode.activeProject', name);
  else localStorage.removeItem('blockode.activeProject');
  updateMemoryMeter();
}

function assetFileName(a, index) {
  const raw = (a.name || a.id || 'asset').trim();
  const extMatch = raw.match(/\.(png|jpe?g|gif|webp|bmp|wav|mp3|ogg|m4a|aac|flac)$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : (a.type === 'audio' ? '.wav' : '.png');
  const stem = raw.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9 _.-]+/g, '_').replace(/^[^A-Za-z0-9]+/, '').slice(0, 55) || 'asset';
  const id = String(a.id || index + 1).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 20) || String(index + 1);
  return (id + '_' + stem).slice(0, 95) + ext;
}


// Step 8: persist newly imported binary assets immediately when a project is active.
async function persistImportedAsset(asset, file) {
  const projectName = ProjectFS.activeProjectName;
  if (!projectName || !asset || !file) return null;
  const index = Math.max(0, assets.indexOf(asset));
  const filename = assetFileName(asset, index);
  const storedFile = new File([file], filename, { type: file.type || asset.mime || 'application/octet-stream' });
  await BlockodeAPI.uploadAsset(projectName, storedFile);
  asset.filePath = ProjectFS.assetsDirName + '/' + filename;
  asset.fileProject = projectName;
  asset.mime = file.type || asset.mime || null;
  return asset.filePath;
}

async function deleteStoredAsset(path, projectName) {
  projectName = projectName || ProjectFS.activeProjectName;
  if (!projectName || !path) return;
  const filename = String(path).split('/').pop();
  await BlockodeAPI.deleteAsset(projectName, filename);
}

async function assetUrlToBlob(url) {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Could not read asset data');
    return response.blob();
  }
  return null;
}

async function saveProjectToDisk(name) {
  name = name || ProjectFS.activeProjectName;
  if (!name) throw new Error('Select or create a project first');
  const manifest = { v: 1, assets: [] };
  for (let i = 0; i < (assets || []).length; i++) {
    const a = assets[i];
    const filename = assetFileName(a, i);
    const path = ProjectFS.assetsDirName + '/' + filename;
    const blob = await assetUrlToBlob(a.url);
    if (blob && blob.size && (a.fileProject !== name || a.filePath !== path)) {
      const file = new File([blob], filename, { type: blob.type || a.mime || 'application/octet-stream' });
      await BlockodeAPI.uploadAsset(name, file);
      a.filePath = path;
      a.fileProject = name;
    }
    if (a.filePath) {
      manifest.assets.push({
        id: a.id, name: a.name, type: a.type, kind: a.kind,
        path: a.filePath, folderId: a.folderId || null, mime: a.mime || null,
        customType: a.customType || null, seed: a.seed || null
      });
    }
  }
  await BlockodeAPI.saveProjectFile(name, ProjectFS.manifestName, manifest);
  await BlockodeAPI.saveProjectFile(name, ProjectFS.projectName, projectSnapshot(false));
  setActiveProject(name);
  try { await BlockodeAPI.saveProjectFile(name, 'autosave.blockode.json', projectSnapshot(false)); } catch (_) {}
  setStatus('Saved project: ' + name);
  updateMemoryMeter();
  return { name };
}

async function loadProjectFromDisk(name) {
  name = name || ProjectFS.activeProjectName;
  if (!name) throw new Error('Select a project to open');
  let data;
  try { data = await BlockodeAPI.loadProjectFile(name, 'autosave.blockode.json'); }
  catch (_) { data = await BlockodeAPI.loadProjectFile(name, ProjectFS.projectName); }
  if (!data || !Array.isArray(data.scenes)) throw new Error('Project file is invalid');
  let manifest = { assets: [] };
  try { manifest = await BlockodeAPI.loadProjectFile(name, ProjectFS.manifestName); } catch (_) {}
  await applyProjectData(data);
  const entries = [...(manifest.assets || [])];
  for (const asset of (data.assets || [])) {
    if (asset.filePath && !entries.some(entry => entry.id === asset.id || entry.name === asset.name)) {
      entries.push({ id: asset.id, name: asset.name, path: asset.filePath, mime: asset.mime });
    }
  }
  for (const entry of entries) {
    const asset = assets.find(x => x.id === entry.id) || assets.find(x => x.name === entry.name);
    if (!asset || !entry.path) continue;
    const filename = entry.path.split('/').pop();
    const blob = await BlockodeAPI.readAsset(name, filename);
    if (asset.url && asset.url.startsWith('blob:')) URL.revokeObjectURL(asset.url);
    asset.url = URL.createObjectURL(blob);
    asset.filePath = entry.path;
    asset.fileProject = name;
    asset.mime = asset.mime || blob.type || null;
    if ((asset.type === 'image' || !asset.type) && typeof imgCache !== 'undefined') {
      const im = new Image(); im.src = asset.url; imgCache[asset.id] = im;
    }
  }
  setActiveProject(name);
  renderTabs();
  if (typeof refresh === 'function') refresh();
  else {
    if (typeof renderAssets === 'function') renderAssets();
    if (typeof renderSceneTree === 'function') renderSceneTree();
    if (typeof renderInspector === 'function') renderInspector();
  }
  updateMemoryMeter();
  setStatus('Opened project: ' + name);
  return { name };
}

async function createDiskProject(name) {
  const result = await BlockodeAPI.createProject(name);
  setActiveProject(result.name);
  return result;
}

async function listDiskProjects() { return BlockodeAPI.listProjects(); }
async function deleteDiskProject(name) {
  const result = await BlockodeAPI.deleteProject(name);
  if (ProjectFS.activeProjectName === name) setActiveProject('');
  return result;
}

async function exportProjectZip() {
  const name = ProjectFS.activeProjectName;
  if (!name) {
    setStatus('Open or create a project before exporting');
    return;
  }
  try {
    // Save the latest in-memory changes before packaging the project.
    await saveProjectToDisk(name);
    const blob = await BlockodeAPI.exportProject(name);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name.replace(/[^A-Za-z0-9 _-]/g, '_') + '.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    setStatus('Exported project ZIP: ' + name);
  } catch (error) {
    console.error('Project export failed:', error);
    setStatus('Export failed: ' + (error.message || 'Unknown error'));
  }
}

function saveProjectDownload(includeUrls) {
  const data = projectSnapshot(includeUrls !== false), link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  link.download = (typeof activeScene === 'function' && activeScene()?.name || 'project') + '.blockode.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  setStatus('Project downloaded');
}

async function applyProjectData(d) {
  if (!d || !Array.isArray(d.scenes)) throw new Error('Invalid project data');
  scenes = d.scenes;
  assets = d.assets || [];
  assetFolders = Array.isArray(d.assetFolders) ? d.assetFolders : [];
  if (typeof ART !== 'undefined' && ART.loadData) ART.loadData(d.art);
  if (typeof AUDIO !== 'undefined' && AUDIO.loadData) AUDIO.loadData(d.audio);
  customBlocks = Array.isArray(d.customBlocks) ? d.customBlocks : [];
  customFolders = Array.isArray(d.customFolders) ? d.customFolders : [];
  // Application preferences are global and are intentionally not loaded from projects.
  if (typeof applySettings === 'function') applySettings();
  assets.forEach(a => {
    if (a.url && (a.type === 'image' || !a.type) && typeof imgCache !== 'undefined') {
      const im = new Image(); im.src = a.url; imgCache[a.id] = im;
    }
  });
  activeSceneId = scenes.some(x => x.id === d.activeSceneId) ? d.activeSceneId : (scenes[0] && scenes[0].id) || null;
  selectedNodeId = (typeof activeScene === 'function' && activeScene()?.rootNode) || null;
}

// Step 9: autosave the active project directly to disk through the local Go API.
// The snapshot contains metadata only; binary assets remain in assets/.
async function autosaveLightweight() {
  const name = ProjectFS.activeProjectName;
  if (!name || ProjectFS.autosaveInFlight) return;
  try {
    const snapshot = projectSnapshot(false);
    const serialized = JSON.stringify(snapshot);
    if (serialized === ProjectFS.lastAutosave) return;
    ProjectFS.autosaveInFlight = true;
    await BlockodeAPI.saveProjectFile(name, 'autosave.blockode.json', snapshot);
    ProjectFS.lastAutosave = serialized;
    ProjectFS.lastAutosaveBytes = new Blob([serialized]).size;
    updateMemoryMeter();
  } catch (error) {
    console.warn('Disk autosave failed:', error);
    const pathEl = document.getElementById('project-path');
    if (pathEl) pathEl.title = 'Autosave failed: ' + (error.message || 'API unavailable');
  } finally {
    ProjectFS.autosaveInFlight = false;
  }
}

async function restoreProjectFromDisk() {
  // The app port can change between launches, which clears localStorage.
  // If no project is remembered but exactly one exists on disk, reopen it.
  if (!ProjectFS.activeProjectName) {
    try {
      const { projects = [] } = await BlockodeAPI.listProjects();
      if (projects.length === 1) setActiveProject(projects[0]);
    } catch (_) {}
  }
  const name = ProjectFS.activeProjectName;
  if (!name) return false;
  try {
    await loadProjectFromDisk(name);
    const snapshot = projectSnapshot(false);
    ProjectFS.lastAutosave = JSON.stringify(snapshot);
    ProjectFS.lastAutosaveBytes = new Blob([ProjectFS.lastAutosave]).size;
    updateMemoryMeter();
    return true;
  } catch (error) {
    console.warn('Could not restore last project:', error);
    setStatus('Could not restore ' + name + ': ' + (error.message || 'project unavailable'));
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.ProjectFS = ProjectFS;
  window.autosaveLightweight = autosaveLightweight;
  window.restoreProjectFromDisk = restoreProjectFromDisk;
  window.updateMemoryMeter = updateMemoryMeter;
  window.projectSnapshot = projectSnapshot;
  window.saveProjectDownload = saveProjectDownload;
  window.exportProjectZip = exportProjectZip;
  window.saveProjectToDisk = saveProjectToDisk;
  window.persistImportedAsset = persistImportedAsset;
  window.deleteStoredAsset = deleteStoredAsset;
  window.loadProjectFromDisk = loadProjectFromDisk;
  window.createDiskProject = createDiskProject;
  window.listDiskProjects = listDiskProjects;
  window.deleteDiskProject = deleteDiskProject;
  window.setActiveProject = setActiveProject;
}

updateMemoryMeter();
