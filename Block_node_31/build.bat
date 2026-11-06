@echo off
cd /d "%~dp0"
where go >nul 2>&1 || (echo Go 1.21+ required: https://go.dev/dl/ & pause & exit /b 1)
set GOOS=windows
set GOARCH=amd64
go build -trimpath -ldflags "-s -w" -o blockode.exe .
if errorlevel 1 (pause & exit /b 1)
echo Built blockode.exe
