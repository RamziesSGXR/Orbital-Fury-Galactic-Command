@echo off
rem Install Galactic Command for this Windows user: copies it to your user folder and adds desktop and Start menu shortcuts.
rem To remove it: INSTALL.bat -Remove
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\app\install.ps1" %*
pause
