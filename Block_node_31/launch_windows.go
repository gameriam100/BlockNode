//go:build windows

package main

import (
	"os"
	"os/exec"
)

func openAppWindow(url string) {
	args := []string{"--new-window", "--app=" + url, "--window-size=1280,800"}
	candidates := []string{
		`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`,
		`C:\Program Files\Microsoft\Edge\Application\msedge.exe`,
		`C:\Program Files\Google\Chrome\Application\chrome.exe`,
		`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`,
	}
	for _, path := range candidates {
		if _, err := os.Stat(path); err == nil {
			if exec.Command(path, args...).Start() == nil {
				return
			}
		}
	}
	for _, name := range []string{"msedge", "chrome"} {
		if path, err := exec.LookPath(name); err == nil {
			if exec.Command(path, args...).Start() == nil {
				return
			}
		}
	}
	_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}
