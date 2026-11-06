package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
)

func main() {
	executable, err := os.Executable()
	if err != nil {
		log.Fatal(err)
	}
	lockPath, err := acquireInstanceLock(executable)
	if err != nil {
		log.Print(err)
		return
	}
	defer releaseInstanceLock(lockPath)

	// Serve the editable web/ reference folder next to the executable.
	exeDir, err := filepath.Abs(filepath.Dir(executable))
	if err != nil {
		log.Fatal(err)
	}
	webDir := filepath.Join(exeDir, "web")

	url, shutdown, stopServer, err := startServer(http.Dir(webDir))
	if err != nil {
		log.Fatal(err)
	}
	defer stopServer()

	openAppWindow(url)

	// The browser sends periodic heartbeats. When its app window closes,
	// heartbeats stop and the local server exits after the timeout.
	<-shutdown
}
