package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestInstanceLockPreventsDuplicateAndReleases(t *testing.T) {
	executable := filepath.Join(t.TempDir(), "blockode.exe")
	if err := os.WriteFile(executable, []byte("test"), 0600); err != nil {
		t.Fatal(err)
	}
	lock, err := acquireInstanceLock(executable)
	if err != nil {
		t.Fatalf("first lock: %v", err)
	}
	if _, err := acquireInstanceLock(executable); err == nil {
		t.Fatal("second instance unexpectedly acquired the lock")
	}
	releaseInstanceLock(lock)
	second, err := acquireInstanceLock(executable)
	if err != nil {
		t.Fatalf("lock after release: %v", err)
	}
	releaseInstanceLock(second)
}

func TestStablePathID(t *testing.T) {
	if stablePathID("/tmp/blockode") != stablePathID("/tmp/blockode") {
		t.Fatal("same path should produce same identifier")
	}
	if stablePathID("/tmp/blockode") == stablePathID("/tmp/other") {
		t.Fatal("different paths should produce different identifiers")
	}
}
