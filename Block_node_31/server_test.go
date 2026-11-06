package main

import (
	"net/http"
	"testing"
	"time"
)

func TestHeartbeatEndpoint(t *testing.T) {
	url, _, stop, err := startServer(http.Dir("web"))
	if err != nil {
		t.Fatal(err)
	}
	defer stop()
	client := &http.Client{Timeout: 3 * time.Second}
	req, err := http.NewRequest(http.MethodPost, url[:len(url)-len("dev.html")]+"api/heartbeat", nil)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("heartbeat request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected %d, got %d", http.StatusNoContent, resp.StatusCode)
	}
}
