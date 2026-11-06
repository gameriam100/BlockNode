//go:build windows

package main

import (
	"os/exec"
	"strconv"
	"strings"
)

func processIsAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	out, err := exec.Command("tasklist", "/FI", "PID eq "+strconv.Itoa(pid), "/FO", "CSV", "/NH").Output()
	if err != nil {
		return false
	}
	for _, line := range strings.Split(string(out), "\n") {
		fields := strings.Split(strings.TrimSpace(line), ",")
		if len(fields) >= 2 && strings.Trim(fields[1], "\\\" \r") == strconv.Itoa(pid) {
			return true
		}
	}
	return false
}
