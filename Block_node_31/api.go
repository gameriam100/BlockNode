package main

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

var projectNamePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9 _-]{0,49}$`)

// dataDir returns the data/ folder next to the executable.
func dataDir() string {
	exePath, err := os.Executable()
	if err != nil {
		return filepath.Join(".", "data")
	}
	exeDir, err := filepath.Abs(filepath.Dir(exePath))
	if err != nil {
		return filepath.Join(".", "data")
	}
	return filepath.Join(exeDir, "data")
}

// registerAPI wires the local project-management API onto the server.
func registerAPI(mux *http.ServeMux) {
	mux.HandleFunc("/api/projects", handleProjects)
	mux.HandleFunc("/api/project-files", handleProjectFiles)
	mux.HandleFunc("/api/assets", handleAssets)
	mux.HandleFunc("/api/settings", handleSettings)
	mux.HandleFunc("/api/export", handleProjectExport)
}

// handleProjectExport creates a portable ZIP containing a project's JSON data and assets.
// The archive deliberately excludes autosave snapshots and application-wide settings.
func handleProjectExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	name, ok := validateProjectName(r.URL.Query().Get("name"))
	if !ok {
		jsonError(w, "missing or invalid project name", http.StatusBadRequest)
		return
	}
	projectDir, err := safeProjectDirectory(name)
	if err != nil {
		jsonError(w, err.Error(), http.StatusNotFound)
		return
	}

	tmp, err := os.CreateTemp("", "blockode-export-*.zip")
	if err != nil {
		jsonError(w, "cannot create export archive", http.StatusInternalServerError)
		return
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)
	zw := zip.NewWriter(tmp)
	totalBytes := int64(0)
	fileCount := 0
	addFile := func(sourcePath, archivePath string, maxBytes int64) error {
		info, err := os.Lstat(sourcePath)
		if err != nil {
			return err
		}
		if info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() {
			return fmt.Errorf("unsafe file in project")
		}
		if info.Size() < 0 || info.Size() > maxBytes {
			return fmt.Errorf("project file exceeds export size limit")
		}
		totalBytes += info.Size()
		fileCount++
		if totalBytes > 500*1024*1024 || fileCount > 10002 {
			return fmt.Errorf("project exceeds export limits")
		}
		f, err := os.Open(sourcePath)
		if err != nil {
			return err
		}
		defer f.Close()
		openedInfo, err := f.Stat()
		if err != nil || !openedInfo.Mode().IsRegular() || !os.SameFile(info, openedInfo) {
			return fmt.Errorf("project file changed during export")
		}
		h := &zip.FileHeader{Name: archivePath, Method: zip.Deflate}
		h.SetModTime(info.ModTime())
		entry, err := zw.CreateHeader(h)
		if err != nil {
			return err
		}
		written, err := io.Copy(entry, io.LimitReader(f, maxBytes+1))
		if err != nil {
			return err
		}
		if written != info.Size() {
			return fmt.Errorf("project file changed during export")
		}
		return nil
	}

	for _, filename := range []string{"project.blockode.json", "manifest.json"} {
		if err := addFile(filepath.Join(projectDir, filename), filename, 32*1024*1024); err != nil {
			_ = zw.Close()
			_ = tmp.Close()
			jsonError(w, "project is missing required files or contains invalid data", http.StatusConflict)
			return
		}
	}
	assetsDir := filepath.Join(projectDir, "assets")
	assetInfo, err := os.Lstat(assetsDir)
	if err != nil || !assetInfo.IsDir() || assetInfo.Mode()&os.ModeSymlink != 0 {
		_ = zw.Close()
		_ = tmp.Close()
		jsonError(w, "project assets directory is unavailable", http.StatusConflict)
		return
	}
	entries, err := os.ReadDir(assetsDir)
	if err != nil {
		_ = zw.Close()
		_ = tmp.Close()
		jsonError(w, "cannot read project assets", http.StatusInternalServerError)
		return
	}
	for _, entry := range entries {
		if !validAssetName(entry.Name()) {
			continue
		}
		if err := addFile(filepath.Join(assetsDir, entry.Name()), filepath.ToSlash(filepath.Join("assets", entry.Name())), maxAssetBytes); err != nil {
			_ = zw.Close()
			_ = tmp.Close()
			jsonError(w, "cannot safely export project assets", http.StatusConflict)
			return
		}
	}
	if err := zw.Close(); err != nil {
		_ = tmp.Close()
		jsonError(w, "cannot finish export archive", http.StatusInternalServerError)
		return
	}
	if err := tmp.Sync(); err != nil {
		_ = tmp.Close()
		jsonError(w, "cannot finalize export archive", http.StatusInternalServerError)
		return
	}
	if err := tmp.Close(); err != nil {
		jsonError(w, "cannot finalize export archive", http.StatusInternalServerError)
		return
	}

	archive, err := os.Open(tmpPath)
	if err != nil {
		jsonError(w, "cannot read export archive", http.StatusInternalServerError)
		return
	}
	defer archive.Close()
	stat, err := archive.Stat()
	if err != nil {
		jsonError(w, "cannot inspect export archive", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", name))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, name+".zip", stat.ModTime(), archive)
}

// handleSettings stores application-wide preferences separately from projects.
// The settings file lives at data/settings.json and is not part of any project.
func handleSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	path := filepath.Join(dataDir(), "settings.json")
	switch r.Method {
	case http.MethodGet:
		b, err := os.ReadFile(path)
		if errors.Is(err, os.ErrNotExist) {
			writeJSON(w, http.StatusOK, map[string]interface{}{"exists": false, "settings": map[string]interface{}{}, "keys": map[string]interface{}{}})
			return
		}
		if err != nil {
			jsonError(w, "cannot read application settings", http.StatusInternalServerError)
			return
		}
		var payload map[string]interface{}
		if err := json.Unmarshal(b, &payload); err != nil {
			jsonError(w, "saved application settings are invalid", http.StatusInternalServerError)
			return
		}
		payload["exists"] = true
		writeJSON(w, http.StatusOK, payload)
	case http.MethodPut:
		r.Body = http.MaxBytesReader(w, r.Body, 256*1024)
		defer r.Body.Close()
		var payload struct {
			Settings json.RawMessage `json:"settings"`
			Keys     json.RawMessage `json:"keys"`
		}
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()
		if err := dec.Decode(&payload); err != nil || len(payload.Settings) == 0 || len(payload.Keys) == 0 || !json.Valid(payload.Settings) || !json.Valid(payload.Keys) {
			jsonError(w, "settings payload must contain valid settings and keys objects", http.StatusBadRequest)
			return
		}
		var settingsObj, keysObj map[string]json.RawMessage
		if json.Unmarshal(payload.Settings, &settingsObj) != nil || settingsObj == nil || json.Unmarshal(payload.Keys, &keysObj) != nil || keysObj == nil {
			jsonError(w, "settings and keys must be JSON objects", http.StatusBadRequest)
			return
		}
		if err := os.MkdirAll(dataDir(), 0755); err != nil {
			jsonError(w, "cannot create data directory", http.StatusInternalServerError)
			return
		}
		data, err := json.MarshalIndent(map[string]json.RawMessage{"settings": payload.Settings, "keys": payload.Keys}, "", "  ")
		if err != nil {
			jsonError(w, "cannot encode application settings", http.StatusInternalServerError)
			return
		}
		tmp := path + ".tmp"
		if err := os.WriteFile(tmp, data, 0600); err != nil {
			jsonError(w, "cannot write application settings", http.StatusInternalServerError)
			return
		}
		if err := os.Rename(tmp, path); err != nil {
			_ = os.Remove(tmp)
			jsonError(w, "cannot commit application settings", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"saved": true})
	default:
		w.Header().Set("Allow", "GET, PUT")
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleProjects dispatches GET, POST, and DELETE requests.
func handleProjects(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")

	switch r.Method {
	case http.MethodGet:
		listProjects(w)
	case http.MethodPost:
		createProject(w, r)
	case http.MethodDelete:
		deleteProject(w, r)
	default:
		w.Header().Set("Allow", "GET, POST, DELETE")
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// listProjects returns the names of project directories inside data/.
func listProjects(w http.ResponseWriter) {
	dir := dataDir()
	if err := os.MkdirAll(dir, 0755); err != nil {
		jsonError(w, "cannot create data directory", http.StatusInternalServerError)
		return
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		jsonError(w, "cannot read data directory", http.StatusInternalServerError)
		return
	}

	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() || !projectNamePattern.MatchString(entry.Name()) {
			continue
		}
		// Repair older projects created before the per-project assets folder
		// was guaranteed. Reject symlinked/unsafe project directories.
		projectDir := filepath.Join(dir, entry.Name())
		info, statErr := os.Lstat(projectDir)
		if statErr != nil || !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
			continue
		}
		if err := ensureSafeAssetsDirectory(filepath.Join(projectDir, "assets")); err != nil {
			continue
		}
		names = append(names, entry.Name())
	}
	sort.Strings(names)
	writeJSON(w, http.StatusOK, map[string]interface{}{"projects": names})
}

// createProject creates a project directory and its assets/ folder.
func createProject(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
	defer r.Body.Close()

	var body struct {
		Name string `json:"name"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		jsonError(w, "request must contain one JSON object", http.StatusBadRequest)
		return
	}

	name, ok := validateProjectName(body.Name)
	if !ok {
		jsonError(w, "project name must be 1-50 characters and use only letters, numbers, spaces, _ or -", http.StatusBadRequest)
		return
	}

	projectDir := filepath.Join(dataDir(), name)
	if err := os.Mkdir(projectDir, 0755); err != nil {
		if errors.Is(err, os.ErrExist) {
			jsonError(w, "a project with that name already exists", http.StatusConflict)
			return
		}
		jsonError(w, "cannot create project", http.StatusInternalServerError)
		return
	}

	if err := os.Mkdir(filepath.Join(projectDir, "assets"), 0755); err != nil {
		_ = os.RemoveAll(projectDir)
		jsonError(w, "cannot create project assets directory", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"name": name})
}

// deleteProject removes an existing project directory and its contents.
func deleteProject(w http.ResponseWriter, r *http.Request) {
	name, ok := validateProjectName(r.URL.Query().Get("name"))
	if !ok {
		jsonError(w, "missing or invalid project name", http.StatusBadRequest)
		return
	}

	root, err := filepath.Abs(dataDir())
	if err != nil {
		jsonError(w, "cannot resolve data directory", http.StatusInternalServerError)
		return
	}
	projectDir := filepath.Join(root, name)
	rel, err := filepath.Rel(root, projectDir)
	if err != nil || rel == "." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) || filepath.IsAbs(rel) {
		jsonError(w, "invalid project path", http.StatusBadRequest)
		return
	}

	info, err := os.Lstat(projectDir)
	if errors.Is(err, os.ErrNotExist) {
		jsonError(w, "project not found", http.StatusNotFound)
		return
	}
	if err != nil {
		jsonError(w, "cannot access project", http.StatusInternalServerError)
		return
	}
	if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		jsonError(w, "project path is not a directory", http.StatusBadRequest)
		return
	}
	if err := os.RemoveAll(projectDir); err != nil {
		jsonError(w, "cannot delete project", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"deleted": name})
}

func validateProjectName(raw string) (string, bool) {
	name := strings.TrimSpace(raw)
	if !projectNamePattern.MatchString(name) {
		return "", false
	}
	return name, true
}

func writeJSON(w http.ResponseWriter, status int, value interface{}) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func jsonError(w http.ResponseWriter, message string, status int) {
	writeJSON(w, status, map[string]string{"error": message})
}

// handleProjectFiles reads or writes the two core project JSON files.
// Example: /api/project-files?name=MyGame&file=project.blockode.json
func handleProjectFiles(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")

	name, ok := validateProjectName(r.URL.Query().Get("name"))
	if !ok {
		jsonError(w, "missing or invalid project name", http.StatusBadRequest)
		return
	}
	file := r.URL.Query().Get("file")
	limit, ok := projectFileLimit(file)
	if !ok {
		jsonError(w, "file must be project.blockode.json, manifest.json, or autosave.blockode.json", http.StatusBadRequest)
		return
	}
	projectDir, err := safeProjectDirectory(name)
	if err != nil {
		jsonError(w, err.Error(), http.StatusNotFound)
		return
	}
	path := filepath.Join(projectDir, file)

	switch r.Method {
	case http.MethodGet:
		data, err := os.ReadFile(path)
		if errors.Is(err, os.ErrNotExist) {
			jsonError(w, "project file not found", http.StatusNotFound)
			return
		}
		if err != nil {
			jsonError(w, "cannot read project file", http.StatusInternalServerError)
			return
		}
		if int64(len(data)) > limit {
			jsonError(w, "project file exceeds size limit", http.StatusRequestEntityTooLarge)
			return
		}
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
	case http.MethodPut:
		r.Body = http.MaxBytesReader(w, r.Body, limit)
		defer r.Body.Close()
		data, err := io.ReadAll(r.Body)
		if err != nil {
			var maxErr *http.MaxBytesError
			if errors.As(err, &maxErr) {
				jsonError(w, "project file exceeds size limit", http.StatusRequestEntityTooLarge)
			} else {
				jsonError(w, "cannot read request body", http.StatusBadRequest)
			}
			return
		}
		if err := validateProjectJSON(file, data); err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := writeFileAtomic(path, data); err != nil {
			jsonError(w, "cannot save project file", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"saved": file, "bytes": len(data)})
	default:
		w.Header().Set("Allow", "GET, PUT")
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func projectFileLimit(file string) (int64, bool) {
	switch file {
	case "project.blockode.json":
		return 32 * 1024 * 1024, true
	case "manifest.json":
		return 4 * 1024 * 1024, true
	case "autosave.blockode.json":
		return 32 * 1024 * 1024, true
	default:
		return 0, false
	}
}

func safeProjectDirectory(name string) (string, error) {
	root, err := filepath.Abs(dataDir())
	if err != nil {
		return "", fmt.Errorf("cannot resolve data directory")
	}
	path := filepath.Join(root, name)
	rel, err := filepath.Rel(root, path)
	if err != nil || rel == "." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) || filepath.IsAbs(rel) {
		return "", fmt.Errorf("invalid project path")
	}
	info, err := os.Lstat(path)
	if errors.Is(err, os.ErrNotExist) {
		return "", fmt.Errorf("project not found")
	}
	if err != nil || !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return "", fmt.Errorf("project not found")
	}
	return path, nil
}

func validateProjectJSON(file string, data []byte) error {
	var value map[string]json.RawMessage
	if err := json.Unmarshal(data, &value); err != nil || value == nil {
		return fmt.Errorf("request must contain a valid JSON object")
	}
	switch file {
	case "project.blockode.json", "autosave.blockode.json":
		var scenes []json.RawMessage
		if raw, exists := value["scenes"]; !exists || json.Unmarshal(raw, &scenes) != nil || scenes == nil {
			return fmt.Errorf("project file must contain a scenes array")
		}
	case "manifest.json":
		var assets []json.RawMessage
		if raw, exists := value["assets"]; !exists || json.Unmarshal(raw, &assets) != nil || assets == nil {
			return fmt.Errorf("manifest file must contain an assets array")
		}
	}
	return nil
}

func writeFileAtomic(path string, data []byte) error {
	tmp, err := os.CreateTemp(filepath.Dir(path), ".blockode-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err = tmp.Write(data); err != nil {
		_ = tmp.Close()
		return err
	}
	if err = tmp.Sync(); err != nil {
		_ = tmp.Close()
		return err
	}
	if err = tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}

const maxAssetBytes = 50 * 1024 * 1024

var assetNamePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9 _.-]{0,99}$`)

var allowedAssetExtensions = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".gif": true,
	".webp": true, ".bmp": true, ".mp3": true, ".wav": true,
	".ogg": true, ".m4a": true, ".aac": true, ".flac": true,
}

// handleAssets stores binary image/audio assets under data/<project>/assets.
// PUT uploads raw file bytes; GET returns the original bytes; DELETE removes it.
func handleAssets(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	name, ok := validateProjectName(r.URL.Query().Get("name"))
	if !ok {
		jsonError(w, "missing or invalid project name", http.StatusBadRequest)
		return
	}
	file := r.URL.Query().Get("file")
	if !validAssetName(file) {
		jsonError(w, "invalid asset filename or unsupported file type", http.StatusBadRequest)
		return
	}
	projectDir, err := safeProjectDirectory(name)
	if err != nil {
		jsonError(w, err.Error(), http.StatusNotFound)
		return
	}
	assetsDir := filepath.Join(projectDir, "assets")
	if err := ensureSafeAssetsDirectory(assetsDir); err != nil {
		jsonError(w, "cannot access project assets directory", http.StatusInternalServerError)
		return
	}
	path := filepath.Join(assetsDir, file)

	switch r.Method {
	case http.MethodPut:
		r.Body = http.MaxBytesReader(w, r.Body, maxAssetBytes)
		defer r.Body.Close()
		data, err := io.ReadAll(r.Body)
		if err != nil {
			var maxErr *http.MaxBytesError
			if errors.As(err, &maxErr) {
				jsonError(w, "asset exceeds 50 MB size limit", http.StatusRequestEntityTooLarge)
			} else {
				jsonError(w, "cannot read uploaded asset", http.StatusBadRequest)
			}
			return
		}
		if len(data) == 0 {
			jsonError(w, "uploaded asset is empty", http.StatusBadRequest)
			return
		}
		if info, err := os.Lstat(path); err == nil && (info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular()) {
			jsonError(w, "asset path is not a regular file", http.StatusBadRequest)
			return
		} else if err != nil && !errors.Is(err, os.ErrNotExist) {
			jsonError(w, "cannot access asset", http.StatusInternalServerError)
			return
		}
		if err := writeFileAtomic(path, data); err != nil {
			jsonError(w, "cannot save asset", http.StatusInternalServerError)
			return
		}
		contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(file)))
		if contentType == "" {
			contentType = http.DetectContentType(data)
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"saved": file, "bytes": len(data), "contentType": contentType})
	case http.MethodGet:
		info, err := os.Lstat(path)
		if errors.Is(err, os.ErrNotExist) {
			jsonError(w, "asset not found", http.StatusNotFound)
			return
		}
		if err != nil || info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() {
			jsonError(w, "cannot access asset", http.StatusNotFound)
			return
		}
		if info.Size() > maxAssetBytes {
			jsonError(w, "asset exceeds 50 MB size limit", http.StatusRequestEntityTooLarge)
			return
		}
		data, err := os.ReadFile(path)
		if err != nil {
			jsonError(w, "cannot read asset", http.StatusInternalServerError)
			return
		}
		contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(file)))
		if contentType == "" {
			contentType = http.DetectContentType(data)
		}
		w.Header().Set("Content-Type", contentType)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
	case http.MethodDelete:
		info, err := os.Lstat(path)
		if errors.Is(err, os.ErrNotExist) {
			jsonError(w, "asset not found", http.StatusNotFound)
			return
		}
		if err != nil || info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() {
			jsonError(w, "asset path is not a regular file", http.StatusBadRequest)
			return
		}
		if err := os.Remove(path); err != nil {
			jsonError(w, "cannot delete asset", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"deleted": file})
	default:
		w.Header().Set("Allow", "GET, PUT, DELETE")
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func validAssetName(name string) bool {
	if !assetNamePattern.MatchString(name) || name == "." || name == ".." || filepath.Base(name) != name {
		return false
	}
	return allowedAssetExtensions[strings.ToLower(filepath.Ext(name))]
}

func ensureSafeAssetsDirectory(path string) error {
	info, err := os.Lstat(path)
	if errors.Is(err, os.ErrNotExist) {
		return os.Mkdir(path, 0755)
	}
	if err != nil || !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return fmt.Errorf("unsafe assets directory")
	}
	return nil
}
