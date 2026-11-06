package main

import (
	"context"
	"net"
	"net/http"
	"sync/atomic"
	"time"
)

const heartbeatTimeout = 18 * time.Second

func startServer(ui http.FileSystem) (string, <-chan struct{}, func(), error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", nil, nil, err
	}
	var lastHeartbeat atomic.Int64
	lastHeartbeat.Store(time.Now().UnixNano())
	shutdownSignal := make(chan struct{})
	mux := http.NewServeMux()
	registerAPI(mux)
	mux.HandleFunc("/api/heartbeat", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		lastHeartbeat.Store(time.Now().UnixNano())
		w.WriteHeader(http.StatusNoContent)
	})
	mux.Handle("/", noCache(http.FileServer(ui)))
	server := &http.Server{Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		_ = server.Serve(ln)
	}()
	go func() {
		ticker := time.NewTicker(3 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			last := time.Unix(0, lastHeartbeat.Load())
			if time.Since(last) >= heartbeatTimeout {
				close(shutdownSignal)
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				_ = server.Shutdown(ctx)
				cancel()
				return
			}
		}
	}()
	stop := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(ctx)
	}
	return "http://" + ln.Addr().String() + "/dev.html", shutdownSignal, stop, nil
}

func noCache(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}
