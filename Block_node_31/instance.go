package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// acquireInstanceLock prevents a second Blockode process from starting. A stale
// lock left by a crash is removed after checking whether its PID still exists.
func acquireInstanceLock(executable string) (string, error) {
	abs, err := filepath.Abs(executable)
	if err != nil {
		return "", err
	}
	lockPath := filepath.Join(os.TempDir(), "blockode-"+stablePathID(abs)+".lock")
	for attempt := 0; attempt < 2; attempt++ {
		f, createErr := os.OpenFile(lockPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
		if createErr == nil {
			_, writeErr := fmt.Fprintln(f, os.Getpid())
			closeErr := f.Close()
			if writeErr != nil {
				_ = os.Remove(lockPath)
				return "", writeErr
			}
			if closeErr != nil {
				_ = os.Remove(lockPath)
				return "", closeErr
			}
			return lockPath, nil
		}
		if !os.IsExist(createErr) {
			return "", createErr
		}
		contents, readErr := os.ReadFile(lockPath)
		pid, parseErr := strconv.Atoi(strings.TrimSpace(string(contents)))
		if readErr == nil && parseErr == nil && processIsAlive(pid) {
			return "", fmt.Errorf("Blockode is already running")
		}
		if err := os.Remove(lockPath); err != nil && !os.IsNotExist(err) {
			return "", fmt.Errorf("cannot clear stale instance lock: %w", err)
		}
	}
	return "", fmt.Errorf("could not acquire Blockode instance lock")
}

func releaseInstanceLock(path string) {
	if path != "" {
		_ = os.Remove(path)
	}
}

func stablePathID(path string) string {
	// A short deterministic filename-safe identifier without external packages.
	var hash uint64 = 14695981039346656037
	for _, b := range strings.ToLower(filepath.Clean(path)) {
		hash ^= uint64(b)
		hash *= 1099511628211
	}
	return fmt.Sprintf("%016x", hash)
}
