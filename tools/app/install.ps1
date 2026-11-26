# INSTALL GALACTIC COMMAND ON WINDOWS (GC 0.91): copies the game to your user folder (%LOCALAPPDATA%\GalacticCommand\game; no
# admin needed) and puts "Galactic Command" on your desktop and in the Start menu. Run through INSTALL.bat. Run it again over a
# newer download to update (your saves are kept: they live in the game's own Edge profile, not in the game's folder).
#   -Remove  takes the game and its shortcuts away again (your saves too)
param([switch]$Remove)
$ErrorActionPreference = 'Stop'
$Src = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$GcHome = Join-Path $env:LOCALAPPDATA 'GalacticCommand'; $Dst = Join-Path $GcHome 'game'
$Links = @((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Galactic Command.lnk'), (Join-Path ([Environment]::GetFolderPath('Programs')) 'Galactic Command.lnk'))
if ($Remove) {
  foreach ($l in $Links) { if (Test-Path $l) { Remove-Item $l -Force } }
  if (Test-Path $GcHome) { Remove-Item $GcHome -Recurse -Force }
  Write-Host 'Galactic Command has been removed.'; exit
}
Write-Host "Installing Galactic Command to $Dst ..."
New-Item -ItemType Directory -Force -Path $Dst | Out-Null
$skip = @('.git', 'test', 'node_modules')
robocopy $Src $Dst /MIR /XD ($skip | ForEach-Object { Join-Path $Src $_ }) /NFL /NDL /NJH /NJS /NP | Out-Null
$sh = New-Object -ComObject WScript.Shell
foreach ($l in $Links) {
  $s = $sh.CreateShortcut($l)
  $s.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $s.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Dst\tools\app\serve.ps1`""
  $s.WorkingDirectory = $Dst; $s.IconLocation = "$Dst\assets\app\icon.ico"; $s.Description = 'Orbital Fury: Galactic Command'; $s.WindowStyle = 7
  $s.Save()
}
Write-Host 'Done. Start it from "Galactic Command" on your desktop or in the Start menu.'
$go = Read-Host 'Play now? (Y/n)'; if ($go -ne 'n') { Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Dst\tools\app\serve.ps1`"" -WindowStyle Hidden }
