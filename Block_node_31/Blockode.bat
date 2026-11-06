@echo off
title Blockode

:: If exe already exists, just run it
if exist "%~dp0blockode.exe" (
    start "" "%~dp0blockode.exe"
    exit /b 0
)

:: First run - build the exe
echo Blockode is setting up for the first time...
echo Checking for Go...
echo.

where go >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Go is not installed on this machine.
    echo.
    echo Please download and install Go from:
    echo https://go.dev/dl/
    echo.
    echo Then double-click Blockode.bat again.
    pause
    exit /b 1
)

echo Go found. Building Blockode (this only happens once)...
echo.

cd /d "%~dp0"
go build -ldflags "-s -w" -o blockode.exe .

if %ERRORLEVEL% neq 0 (
    echo.
    echo Build failed. Please check the error above.
    pause
    exit /b 1
)

echo.
echo Done! Launching Blockode...
start "" "%~dp0blockode.exe"
