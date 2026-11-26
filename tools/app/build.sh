#!/bin/bash
# (GC 0.91) The Windows installer: bash tools/app/build.sh  ->  dist/GalacticCommand-Setup-<version>.exe (the game inside it).
# Needs Go (it cross-compiles for Windows from here). The zip of the game alone (for PLAY.bat / INSTALL.bat) is made on the way.
set -e
cd "$(dirname "$0")/../.."
bash tools/app/pack.sh >/dev/null
V=$(grep -o "VERSION = '[0-9.]*'" js/galaxy/config.js | grep -o "[0-9.]*[0-9]")
cp "dist/GalacticCommand-$V.zip" tools/app/setup/game.zip
(cd tools/app/setup && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H=windowsgui -s -w" -o "../../../dist/GalacticCommand-Setup-$V.exe" .)
rm -f tools/app/setup/game.zip
ls -la "dist/GalacticCommand-Setup-$V.exe" "dist/GalacticCommand-$V.zip"
