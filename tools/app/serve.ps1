# GALACTIC COMMAND ON WINDOWS (GC 0.91): serves the game from this folder to this computer only (http://localhost:8765, nothing
# leaves it) and opens it in its own window, full screen, in Microsoft Edge (a separate profile, so your saves stay put and your
# own browser is left alone). Closing the game's window stops it. Touch screens work (Surface and the like). No admin needed.
# Run through PLAY.bat (or the shortcut INSTALL.bat makes). Options: -Port 8765 (keep it the same, or your saves won't show),
# -Browser to use your default browser instead of an Edge window.
param([int]$Port = 8765, [switch]$Browser)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Types = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8';
  '.json' = 'application/json'; '.webmanifest' = 'application/manifest+json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg';
  '.webp' = 'image/webp'; '.ico' = 'image/x-icon'; '.glb' = 'model/gltf-binary'; '.gltf' = 'model/gltf+json'; '.bin' = 'application/octet-stream'; '.hdr' = 'application/octet-stream';
  '.woff' = 'font/woff'; '.woff2' = 'font/woff2'; '.ttf' = 'font/ttf'; '.otf' = 'font/otf'; '.mp3' = 'audio/mpeg'; '.ogg' = 'audio/ogg'; '.wav' = 'audio/wav'; '.mp4' = 'video/mp4'; '.webm' = 'video/webm'; '.txt' = 'text/plain; charset=utf-8' }
$L = New-Object System.Net.HttpListener
$L.Prefixes.Add("http://localhost:$Port/")
try { $L.Start() } catch { Write-Host "Port $Port is busy (is the game already open?). Opening it anyway."; Start-Process "http://localhost:$Port/index.html"; exit }
$url = "http://localhost:$Port/index.html"
$edge = $null
if (-not $Browser) {
  $paths = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe", "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe")
  $exe = $paths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if ($exe) {
    $prof = Join-Path $env:LOCALAPPDATA 'GalacticCommand\edge'
    New-Item -ItemType Directory -Force -Path $prof | Out-Null
    $edge = Start-Process -FilePath $exe -PassThru -ArgumentList @("--app=$url", "--user-data-dir=`"$prof`"", '--start-fullscreen', '--no-first-run', '--disable-features=msEdgeSidebarV2,TranslateUI', '--autoplay-policy=no-user-gesture-required')
  }
}
if (-not $edge) { Start-Process $url }
Write-Host "Galactic Command is running at $url  (close the game's window, or this one, to stop it)"
$pending = $L.GetContextAsync()
while ($true) {
  if ($pending.Wait(500)) {
    $ctx = $pending.Result; $pending = $L.GetContextAsync()
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
      if ($rel -eq '') { $rel = 'index.html' }
      $file = [IO.Path]::GetFullPath((Join-Path $Root $rel))
      if (-not $file.StartsWith($Root) -or -not (Test-Path $file -PathType Leaf)) { $ctx.Response.StatusCode = 404 }
      else {
        $ext = [IO.Path]::GetExtension($file).ToLower(); $ctx.Response.ContentType = $(if ($Types.ContainsKey($ext)) { $Types[$ext] } else { 'application/octet-stream' })
        $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
        $bytes = [IO.File]::ReadAllBytes($file); $ctx.Response.ContentLength64 = $bytes.Length; $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    } catch { try { $ctx.Response.StatusCode = 500 } catch {} }
    try { $ctx.Response.Close() } catch {}
  }
  elseif ($edge -and $edge.HasExited) {     # (Edge's own window closed: wait a moment, as Edge can hand over to a second process, then stop)
    Start-Sleep -Seconds 2
    $more = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*GalacticCommand\edge*" }
    if (-not $more) { break } else { $edge = $null }
  }
}
$L.Stop()
