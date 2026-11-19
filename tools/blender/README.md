# Models made in Blender

The enemy models are built by script in Blender and written out for the game.

- `gc_kit.py`: the kit. A creature is a tree of joints with low-polygon parts hung on them (`loft`, `blob`, `box`, `spike`, `cyl`, `leg`, `bleg`, `tail`). A pose turns the joints. `export()` writes `export/<name>.json`.
- `molt.py`, `foundry.py`, `talon.py`: one faction each, three creatures in each (light, medium, heavy). Each builds, poses, exports and takes a picture.
- `people.py`: the fleet's own people: the soldier, the Vanguard, and three citizens in a sci-fi cut (a technician with a headset, a dock hand in a harness and rebreather, a company officer in a long coat with a lit hem). Hands are put on the rifle by the kit's `reach` (a two-bone solve). Materials named `uniform`, `uniform_dark`, `kit`, `helmet`, `armband` and `trim` are dressed in the player's fleet colours by the game.
- `sites.py`: the objectives and side objectives, sixteen models that stand still (one frame, `stand`): the launch silo, the crashed shuttle, the landing pad, the oil derrick, the burnt-out carrier, the demolition charge; the radio mast, the Infantry's redoubt, the field gun, a jammer for each enemy; the broadcast tower, the relay, the supply dump and the spore towers. Each has a footprint radius of about one. Materials named `accent` and `accent_lit` are given the enemy's colour by the game. They are listed under `props` in `assets/models/index.json` and loaded by `js/ground/render/props3d.js`.
- `world.py`: everything else that stands on the ground, and the fleets' ships: five trees, three rocks and a pillar, the enemy's buildings and guns (`prop_hive`, `prop_fab`, `prop_camp`, `prop_spire`, `prop_totem`, `prop_turret`, `prop_cannon`, `prop_node`), a banner, a flag and a crate, your posts (`prop_post_mg`, `prop_post_sam`, `prop_post_arty`, `prop_post_tower`, `prop_aturret`), and four ships for the galaxy map (`ship_fed`, `ship_molt`, `ship_foundry`, `ship_talon`, nose to +X). The game's name for a thing finds its file: `tree:leaf` is `prop_tree_leaf.json`. A material named `white` is left white so the game's own tint colours it. Props are listed under `props` and ships under `ships` in `assets/models/index.json`.
- `molt_more.py`, `foundry_more.py`, `talon_more.py`: the rest of each faction (a second light or medium kind, the special, the boss). Run each straight after its faction's first script, in the same session: it uses that script's colours and helpers.

To run one: open Blender, then in its Python console

    ROOT = r'C:\path\to\GalacticCommandAssets'      # holds gc_kit.py, scripts/, export/, renders/
    exec(open(ROOT + r'\gc_kit.py').read()); exec(open(ROOT + r'\scripts\molt.py').read())

(the kit's `ROOT` is `~/Documents/GalacticCommandAssets`; change it at the top of `gc_kit.py` if yours is elsewhere), then copy `export/*.json` into `assets/models/` and list the names in `assets/models/index.json`.

## The file

`assets/models/<name>.json` (version 2): `nv` vertices, `nt` triangles, `tris` (uint16, base64), `cols` (one sRGB colour for each triangle, uint8), `min` and `size` (the box the vertices are packed into), `frames` (for each frame name, every vertex's place as uint16), `pal` and `mi` (the names of the model's materials and which one each triangle wears, so the game can dress a named part in other colours), `lod` (the same model again in about a third of the triangles: small parts left out, the rest cut down), and optionally `fit` (the measure that is sized to the unit in the game; without it, the largest dimension).

Frames: `stand`, `w0` to `w7` (one walk cycle), `atk` (a strike), `dead` (fallen: over on its side, limbs slack; the kit's `dead()` makes it for any creature), and for the Leaper `jump`. People: `stand`, `w0` to `w7`, `down` (lying), and for the armed `aim`, `a0` to `a7` (walking with the rifle up), `kneel`, `hit`.

In Blender Z is up and the creature faces -Y. In the game Y is up and it faces +Z. The export turns it.

## In the game

`js/ground/render/units3d.js` (`modelFrames`, `MODELS`) loads what `index.json` lists and draws each enemy in the frame its moment calls for. A kind with no model keeps its simple built-in shape. `test/models.html` shows every model through the game's loader, walking; `test/enemies.py [biome] [bugs|bots|lizards]` photographs them in a fight.
