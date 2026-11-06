// ── BLOCKODE API CLIENT ──
// Thin fetch wrapper for the Go backend API.
// All calls return a Promise that resolves to parsed JSON or rejects on error.
//
// Usage:
//   BlockodeAPI.listProjects().then(({projects}) => console.log(projects));
//   BlockodeAPI.createProject('MyGame').then(({name}) => ...);
//   BlockodeAPI.deleteProject('MyGame').then(() => ...);
//   BlockodeAPI.saveProjectFile('MyGame', 'project.blockode.json', data);
//   BlockodeAPI.loadProjectFile('MyGame', 'manifest.json');

const BlockodeAPI = (() => {
  const BASE = '';  // same origin as the Go server

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'API error ' + res.status);
    return json;
  }

  function assetPath(name, file) {
    return '/api/assets?name=' + encodeURIComponent(name) + '&file=' + encodeURIComponent(file);
  }

  async function assetRequest(method, name, file, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.body = body;
      if (body.type) opts.headers['Content-Type'] = body.type;
    }
    const res = await fetch(BASE + assetPath(name, file), opts);
    if (!res.ok) {
      let message = 'Asset API error ' + res.status;
      try { const json = await res.json(); message = json.error || message; } catch (_) {}
      throw new Error(message);
    }
    return res;
  }

  return {
    /** Download a complete project package as a ZIP Blob. */
    async exportProject(name) {
      const res = await fetch(BASE + '/api/export?name=' + encodeURIComponent(name));
      if (!res.ok) {
        let message = 'Project export failed (' + res.status + ')';
        try { const json = await res.json(); message = json.error || message; } catch (_) {}
        throw new Error(message);
      }
      return res.blob();
    },

    /** Load global application preferences from data/settings.json. */
    loadSettings() {
      return request('GET', '/api/settings');
    },

    /** Save global application preferences independently of projects. */
    saveSettings(settings, keys) {
      return request('PUT', '/api/settings', { settings, keys });
    },

    /** Returns { projects: string[] } */
    listProjects() {
      return request('GET', '/api/projects');
    },

    /** Returns { name: string } */
    createProject(name) {
      return request('POST', '/api/projects', { name });
    },

    /** Returns { deleted: string } */
    deleteProject(name) {
      return request('DELETE', '/api/projects?name=' + encodeURIComponent(name));
    },

    /** Save project data, manifest, or autosave snapshot to a project. */
    saveProjectFile(name, file, data) {
      return request('PUT', '/api/project-files?name=' + encodeURIComponent(name) + '&file=' + encodeURIComponent(file), data);
    },

    /** Load project data, manifest, or autosave snapshot from a project. */
    loadProjectFile(name, file) {
      return request('GET', '/api/project-files?name=' + encodeURIComponent(name) + '&file=' + encodeURIComponent(file));
    },

    /** Upload a File or Blob into the project's assets/ folder (maximum 50 MB). */
    async uploadAsset(name, file) {
      if (!file || !file.name) throw new Error('A named File is required');
      const res = await assetRequest('PUT', name, file.name, file);
      return res.json();
    },

    /** Read an asset as a Blob; use URL.createObjectURL(blob) to preview it. */
    async readAsset(name, filename) {
      const res = await assetRequest('GET', name, filename);
      return res.blob();
    },

    /** Delete one asset from the project's assets/ folder. */
    async deleteAsset(name, filename) {
      const res = await assetRequest('DELETE', name, filename);
      return res.json();
    },
  };
})();
