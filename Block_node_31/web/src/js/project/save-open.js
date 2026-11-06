// ── PROJECT SAVE / OPEN ──
// Project data is managed by the local Go API. JSON download remains available
// only as an explicit backup action elsewhere in the application.

async function saveProject() {
  try {
    let name = ProjectFS.activeProjectName;
    if (!name) {
      name = (prompt('Create a project to save this work:', activeScene()?.name || 'My Project') || '').trim();
      if (!name) return;
      // Reuse an existing project folder instead of failing with "already exists".
      const { projects = [] } = await listDiskProjects();
      const existing = projects.find(p => p.toLowerCase() === name.toLowerCase());
      if (existing) {
        if (!confirm('Project "' + existing + '" already exists. Overwrite it with the current workspace?')) return;
        name = existing;
        setActiveProject(name);
      } else {
        await createDiskProject(name);
      }
    }
    try {
      await saveProjectToDisk(name);
    } catch (err) {
      // Active project folder was deleted or renamed outside the app: recreate it and retry once.
      if (!/project not found/i.test(err.message || '')) throw err;
      await createDiskProject(name);
      await saveProjectToDisk(name);
    }
  } catch (err) {
    console.error(err);
    setStatus('Save failed: ' + (err.message || 'Unknown error'));
  }
}

async function createProject() {
  const name = (prompt('New project name:') || '').trim();
  if (!name) return;
  try {
    await createDiskProject(name);
    await saveProjectToDisk(name);
    setStatus('Created project: ' + name);
  } catch (err) {
    setStatus('Could not create project: ' + (err.message || 'Unknown error'));
  }
}

async function openProject() {
  try {
    const { projects = [] } = await listDiskProjects();
    if (!projects.length) {
      setStatus('No saved projects. Use File → New Project to create one.');
      return;
    }
    const current = ProjectFS.activeProjectName;
    const choices = projects.map((name, i) => `${i + 1}. ${name}`).join('\n');
    const answer = prompt('Enter the project number or exact name to open:\n\n' + choices, current || '1');
    if (!answer) return;
    const value = answer.trim();
    const index = Number(value) - 1;
    const name = Number.isInteger(index) && index >= 0 && index < projects.length
      ? projects[index] : projects.find(p => p.toLowerCase() === value.toLowerCase());
    if (!name) {
      setStatus('Project not found');
      return;
    }
    if (name !== current && !confirm('Opening "' + name + '" will replace the current workspace. Continue?')) return;
    await loadProjectFromDisk(name);
  } catch (err) {
    console.error(err);
    setStatus('Open failed: ' + (err.message || 'Unknown error'));
  }
}

async function deleteProject() {
  try {
    const { projects = [] } = await listDiskProjects();
    if (!projects.length) {
      setStatus('No saved projects to delete');
      return;
    }
    const choices = projects.map((name, i) => `${i + 1}. ${name}`).join('\n');
    const answer = prompt('Enter the project number or exact name to delete:\n\n' + choices);
    if (!answer) return;
    const value = answer.trim();
    const index = Number(value) - 1;
    const name = Number.isInteger(index) && index >= 0 && index < projects.length
      ? projects[index] : projects.find(p => p.toLowerCase() === value.toLowerCase());
    if (!name) {
      setStatus('Project not found');
      return;
    }
    if (!confirm('Permanently delete "' + name + '" and all of its assets?')) return;
    await deleteDiskProject(name);
    setStatus('Deleted project: ' + name);
  } catch (err) {
    setStatus('Delete failed: ' + (err.message || 'Unknown error'));
  }
}

if (typeof window !== 'undefined') {
  window.saveProject = saveProject;
  window.openProject = openProject;
  window.createProject = createProject;
  window.deleteProject = deleteProject;
}
