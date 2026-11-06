package main

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// The offline audit keeps the shipped editor free of remote dependencies and
// catches broken relative CSS/JavaScript references before packaging.
func TestOfflineWebBundle(t *testing.T) {
	root := filepath.Join("web")
	htmlPath := filepath.Join(root, "dev.html")
	htmlBytes, err := os.ReadFile(htmlPath)
	if err != nil {
		t.Fatal(err)
	}
	html := string(htmlBytes)
	if !strings.Contains(html, "Content-Security-Policy") {
		t.Fatal("dev.html is missing the offline Content Security Policy")
	}
	if !strings.Contains(html, "script-src 'self' 'unsafe-inline'") {
		t.Fatal("CSP must allow the existing inline settings/menu event handlers")
	}

	refRE := regexp.MustCompile(`(?i)(?:src|href)=["']([^"']+)["']`)
	for _, match := range refRE.FindAllStringSubmatch(html, -1) {
		ref := match[1]
		if strings.Contains(ref, ":") || strings.HasPrefix(ref, "//") || strings.HasPrefix(ref, "#") {
			continue
		}
		if _, err := os.Stat(filepath.Join(root, filepath.FromSlash(ref))); err != nil {
			t.Errorf("missing local HTML dependency %q: %v", ref, err)
		}
	}

	remoteRE := regexp.MustCompile(`(?i)https?://[a-z0-9.-]+`)
	cssImportRE := regexp.MustCompile(`(?i)@import\s+(?:url\()?\s*["']?([^"')\s;]+)`)
	cssURLRE := regexp.MustCompile(`(?i)url\(\s*["']?([^"')]+)`)
	err = filepath.Walk(root, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if info.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		if ext != ".html" && ext != ".css" && ext != ".js" {
			return nil
		}
		b, readErr := os.ReadFile(path)
		if readErr != nil {
			return readErr
		}
		content := string(b)
		contentForURLScan := strings.ReplaceAll(content, "http://www.w3.org/2000/svg", "")
		if matches := remoteRE.FindAllString(contentForURLScan, -1); len(matches) > 0 {
			for _, remote := range matches {
				t.Errorf("remote URL in %s: %s", path, remote)
			}
		}
		if ext == ".css" {
			for _, pattern := range []*regexp.Regexp{cssImportRE, cssURLRE} {
				for _, m := range pattern.FindAllStringSubmatch(content, -1) {
					ref := strings.TrimSpace(m[1])
					if strings.HasPrefix(ref, "data:") || strings.HasPrefix(ref, "#") {
						continue
					}
					if strings.Contains(ref, ":") || strings.HasPrefix(ref, "//") {
						t.Errorf("non-local CSS dependency in %s: %s", path, ref)
					}
				}
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

// Existing projects must always have a dedicated folder for imported assets.
func TestEnsureProjectAssetsDirectoryCreatesSubfolder(t *testing.T) {
	projectDir := t.TempDir()
	assetsDir := filepath.Join(projectDir, "assets")
	if err := ensureSafeAssetsDirectory(assetsDir); err != nil {
		t.Fatal(err)
	}
	info, err := os.Lstat(assetsDir)
	if err != nil {
		t.Fatalf("assets directory was not created: %v", err)
	}
	if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		t.Fatal("assets path is not a safe directory")
	}
}
