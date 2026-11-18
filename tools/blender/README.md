# Models made in Blender

The enemy models are built by script in Blender and written out for the game.

- `gc_kit.py`: the kit. A creature is a tree of joints with low-polygon parts hung on them (`loft`, `blob`, `box`, `spike`, `cyl`, `leg`, `bleg`, `tail`). A pose turns the joints. `export()` writes `export/<name>.json`.
- `molt.py`, `foundry.py`, `talon.py`: one faction each, three creatures in each (light, medium, heavy). Each builds, poses, exports and takes a picture.

To run one: open Blender, then in its Python console

    ROOT = r'C:\path\to\GalacticCommandAssets'      # holds gc_kit.py, scripts/, export/, renders/
    exec(open(ROOT + r'\gc_kit.py').read()); exec(open(ROOT + r'\scripts\molt.py').read())

(the kit's `ROOT` is `~/Documents/GalacticCommandAssets`; change it at the top of `gc_kit.py` if yours is elsewhere), then copy `export/*.json` into `assets/models/` and list the names in `assets/models/index.json`.

## The file

`assets/models/<name>.json`: `nv` vertices, `nt` triangles, `tris` (uint16, base64), `cols` (one sRGB colour for each triangle, uint8), `min` and `size` (the box the vertices are packed into), `frames` (for each frame name, every vertex's place as uint16), and optionally `fit` (the measure that is sized to the unit in the game; without it, the largest dimension).

Frames: `stand`, `w0` to `w7` (one walk cycle), `atk` (a strike).

In Blender Z is up and the creature faces -Y. In the game Y is up and it faces +Z. The export turns it.

## In the game

`js/ground/render/units3d.js` (`modelFrames`, `MODELS`) loads what `index.json` lists and draws each enemy in the frame its moment calls for. A kind with no model keeps its simple built-in shape. `test/models.html` shows every model through the game's loader, walking; `test/enemies.py [biome] [bugs|bots|lizards]` photographs them in a fight.
