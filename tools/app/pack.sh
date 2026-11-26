#!/bin/bash
# (GC 0.91) The download for Windows: everything the game needs to run, PLAY.bat and INSTALL.bat at its top, in one zip:
#   bash tools/app/pack.sh  ->  dist/GalacticCommand-<version>.zip
cd "$(dirname "$0")/../.."
V=$(grep -o "VERSION = '[0-9.]*'" js/galaxy/config.js | grep -o "[0-9.]*[0-9]"); N="GalacticCommand-$V"; rm -rf "dist/$N" "dist/$N.zip"; mkdir -p "dist/$N"
cp -r index.html ground.html manifest.webmanifest sw.js PLAY.bat INSTALL.bat README.md css js assets "dist/$N/"
mkdir -p "dist/$N/tools" && cp -r tools/app "dist/$N/tools/"
cd dist && zip -qr -9 "$N.zip" "$N" && rm -rf "$N" && ls -la "$N.zip"
