@echo off
rem Play Galactic Command: serves the game on this computer and opens it full screen (Esc for the menu). See tools\app\serve.ps1
start "Galactic Command" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "%~dp0tools\app\serve.ps1" %*
