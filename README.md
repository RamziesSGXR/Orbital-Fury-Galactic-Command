# Orbital Fury: Galactic Command

**Prototype 0.66.0.** One war, run from four posts, in one game.

You found a command (a name, a livery: emblem and colours) and hold the centre of the galaxy against three enemies. Everything in
the war is yours to run, and each part changes the others:

| Post | What you do there | What it does for the war |
|---|---|---|
| **The war room** | The galaxy map. One decision on each front a round: attack, defend or hold. | Where the war is won or lost. |
| **The ground** | When fleets meet, take the fight down to the planet and cover the landing from orbit with the ship's guns. | Win and the system is yours; lives left decide how much of the fleet survives. |
| **The station** | Found a station over a system you hold and lay it out; its people do the rest. | +2 hit points to the system for each tier, and ships cost 1 less fuel there. |
| **The base** | Found a base on the system's key world: roads, zones, and buildings that grow along them. | +35% output from the system for each charter. |

A system that falls takes its station and its base with it.

## What's new in 0.66: the livery, one look over every game

- **A LIVERY tab on the main menu**, and one livery worn by every game: the war room, the ground fight, the station and
  FOB Commander all take your command's name, motto, emblem, colours and troopers' dress from it as they open
  (js/core/livery.js; the editor is js/core/livery-ui.js).
- **Five ready-made styles** in place of the random crests: Helix Dynamics, Crimson Meridian, Aurora Media Group, Sable &
  Lantern and Nova Prime Expeditionary, each with its own emblem, colours, hull finish and uniform. Or design your own;
  trying a style keeps your own design aside to come back to.
- **An emblem editor in layers**, as in a shooter's: up to 16 layers from 54 shapes (frames, marks, the old crest
  symbols, stripes and fields, letters), each with its colour, size, turn, place, opacity, mirror, outline only and
  "keep inside the layers below" (a stripe across a shield and not past its edge). Drag a layer on the big emblem, wheel
  to size it, Shift and wheel to turn it, the arrow keys to nudge it; Ctrl+Z undoes.
- **Colours**: hulls and roofs, trim, accent and lights; the hull's finish (panelled, armour, smooth, weathered, hazard);
  the troopers' uniform, helmet and armband; and a button that paints the emblem in the livery's colours. The station
  now wears the accent, the finish and the lights too.
- **Founding a command** starts from the five styles (or the livery you wear) with a name, capital and motto; a command
  founded before keeps its crest, which becomes its livery. With a livery made, FOB Commander and Orbital Commander start
  without founding first.
- The ground fight's oil pump is FOB Commander's **Biofuel Extractor**, in your colours.
- **Nothing floats at the base or the station.** test/floating_built.py checks FOB Commander's buildings whole, as the game
  builds them (the structure file and the parts made in code together), and what it found is held up now: the fuel
  tanks' domes, the batching plant's and the factory's conveyors, the diner signs and awnings, the benches and tables,
  the parade stand's canopy, the masts' tops and antennas, the lab's and HQ's dishes, the statue's torch, the vehicle
  bay's extinguisher (HOLD in js/base/models.js). On the station the pylon's beacon ring has struts and the dry dock's
  trim is pinned to its frames. test/bldsheet.html and test/partsheet.html show buildings and station parts whole.

## What's new in 0.65: FOB Commander's buildings on the ground, field works at the base

- **The ground fight stands FOB Commander's buildings** wherever it has the same thing, whole and in your command's
  colours: the work site's warehouse and hangar (a Fuel Depot or Supply Depot and a Vehicle Bay, a Science Lab for a lab
  site), the radio mast (the Comms Tower), and every lot of the capital's outskirts (hab blocks, the BRAND-MART, the
  casino, the war room, factories and more, each fitted to its lot and kept low so the streets stay in view).
- **Field works in FOB Commander**: Sandbags and Trench join Barbed Wire on the ROADS tab, each the ground fight's own
  model. Sandbags 3 supplies a tile, the most raid strength; trench 2, the least; wire 2. Together they add up to 20
  (C.WORKS, C.WORKS_MAX). Fixed: in 0.64 the wire was drawn as a road and its model stood in the air on high ground.
- **Nothing floats.** In FOB Commander the field works lie on the ground like everything else (the height shader seats
  every corner). In the ground fight every model stands at the low point of its footprint. And the loose pieces the
  check found are fixed: the Talon jammer's hides and shards, the broadcast tower's screen and horns, the Foundry
  jammer's lights, the Molt jammer's sacs, the wreck's door, the Talon camp's crystal and rack, the sandbags, the work
  site's sign. test/floating.py now finds none in the ground fight's models.
- docs/DIRECTION.md keeps **the list** of what is left to do.

## What's new in 0.64: one kit for both games, wire and warheads at the base

- **The fleet's field kit** (tools/blender/fleet.py): your side's military pieces remade in one look (dark armour plate,
  hazard stripes, cyan light strips) with nothing left from an old war: no towed guns on wheels, no timber towers, no
  tripod machine guns in sandbags. The Artillery Cannon is a mass driver on an armoured plinth; the Heavy Turret Nest is a
  twin autocannon behind a ring of blast barriers; the SAM Site a six-cell box launcher with a flat radar; the Lookout and
  the Propaganda Tower steel masts (the Propaganda Tower with a lit screen and loudspeakers); the landing pad and the
  barbed wire new too.
- **Shared, not doubled.** The ground fight's abandoned field gun is the Artillery Cannon's own model (side_howitzer is
  gone). FOB Commander draws its Defence Turret, Lookout Tower and Landing Pad with the ground fight's models (SHARED in
  js/base/models.js), so each thing looks the same in both games. And the other way: the ground fight can stand FOB
  Commander's own buildings, whole and in your command's colours ('bld:<type>' in js/ground/render/props3d.js, drawn by the
  base's maker). The evacuation's shelter is now the base's Emergency Operations Bunker, and its hangar the Vehicle Bay.
- **Barbed Wire in FOB Commander**: a line tool (ROADS), laid with the ground fight's wire model. Two supplies a tile;
  every tile adds to the base's strength against a raid (up to 14). Nobody walks through it; a road through it leaves a
  gap. It does not close the base: that is still the wall's job.
- **The Missile Silo in FOB Commander**: the ground fight's launch site, as a building (Fortification Doctrine and an
  Engineer Yard). Crewed, powered and fuelled, it assembles a mini-nuke over three days and holds two. A warhead is fired
  at the next raid before it reaches the wire (and doubles its salvage), or ship one to the front from the silo's bar for
  450 credits and Defence standing.
- **test/floating.py** finds pieces of a model that touch nothing; **test/sheet.html** shows models side by side through
  the game's loader.

## What's new in 0.62: a career, a collection, and stars who cost money

- **A career** (js/core/career.js): one record on this browser, kept apart from the saves, that every game writes to. The
  ground fight writes at its debrief (fights, kills, objectives, Vanguards and Infantry lost, insurance, contracts, skill
  bonuses, credits, time); the base as buildings go up and days close; the station as parts are built, weeks pass and tiers
  are granted. Tutorials count for what was met, not for the totals; the bot's test runs do not count.
- **COLLECTION** shows everything the career has met, by kind: 18 enemies (each faction's light, medium, heavy, special,
  variant and super heavy), 7 worlds, 8 objectives, every base building and every station part (read from their games' own
  tables, js/core/collection.js). An entry opens with its model turning beside it as line art (js/core/lineart.js, loaded
  when first needed), what it is, how it fights or what it does, when it was first met and how many.
- **CAREER** shows the totals in boxes, the saves of every game, and how much of the collection is filled.
- **Vanguards are stars.** The squad's lives now depend on the difficulty: 30 at level 1, two fewer a level to 12 at level
  10, then one fewer a level to no fewer than 6 (C.stars, difficulty.js livesAt); a station's or the ratings' reinforcements
  add to that. Each Vanguard lost is an insurance claim (+120 credits) and a new star's contract to sign (180 credits, as far
  as the wallet goes), both on the debrief.
- **A demolition charge has a set order** for each kind of objective, the same every time (C.democharge.orders), so it can
  be learnt. Tapped with no mistakes it pays a skill bonus (60 credits), and more if it is quick (160 inside 3.5 seconds).
- **The base's efficiency review** at each day's close (from day 2): enough clean latrines (no more than ten users each), a
  mess seat and a bunk for everyone, every crewed building fully crewed, and enough power. 12 supplies for each in order,
  30 more for all five; the report says what was marked down (C.TIDY, Sim.review).
- The **how it fits** card, the credits and the ground tutorial's first card say who the Vanguards are: elite soldiers and
  stars of the broadcast, insured like film stars.

## What's new in 0.61: pictures, and the same menu inside the games

- **PLAY** shows a picture card for each game: its own models drawn as glowing line art (tools/lineart.html draws them;
  test/lineart.py writes assets/menu/art-*.png). A game with nothing saved starts at once; one with a save asks which save.
- **HOME**'s tiles and panels have pictures behind them and solid backing, so they read over the moving war room. The
  campaign panel shows the map table, rendered in Blender (assets/menu/table.jpg).
- **The menu inside a game** is the main menu's own: the bar with its tabs (GAME, OPTIONS, CONTROLS) over a panel. The
  ground game's pause box wears the same bar (GAME, SETTINGS, HELP).

## What's new in 0.60: one menu for the whole game

- **One main menu**, with a bar of tabs along the top: HOME, PLAY, COLLECTION, CAREER, STORE and OPTIONS (Q and E step
  along them). js/main.js draws each tab's page (TABS, PAGES).
- **HOME**: the campaign, NEWS (this update), JUMP IN (the last game and save played) and LEARN MORE (the credits). The daily
  challenges are a placeholder.
- **PLAY**: the campaign and the three mini-games, each with **three saves** and its tutorial. One save of the three is in
  hand and lives where the game has always kept it; choosing another sets it aside whole (`ofgc.slot.<game>.<n>`) and brings
  the chosen one out, so nothing else in the game knows about slots.
- **Orbital Fury has no menu of its own** when opened from here: it starts on the operation saved or on a new one's setup,
  and leaving comes back to this menu.
- **OPTIONS**: the common settings, then each game's controls. **COLLECTION** and **STORE** are placeholders; **CAREER**
  shows what the saves hold.
- **The game's icon** (assets/icon.svg): an officer's bust on a pennant. It stands for the game in the menu bar and the
  browser tab; the player's crest is for their command.
- docs/DIRECTION.md records where the game is going: the Vanguards as famous elites, insurance, skill bonuses, and the rest.

## What's new in 0.56: one campaign, and endless play

- **The main menu** puts the Galactic Campaign first. Below it are the three posts as **endless play**: Orbital Fury (the
  ground), FOB Commander (the base) and Orbital Commander (the station), each one row. Behind the whole menu is one moving picture of the
  war room, rendered in Blender with the game's own people (assets/menu/warroom.mp4, a 20 s loop): the galaxy turning on the
  map table, the staff round it, the fleet crossing the window. The scene is warroom_menu.blend in the assets folder.
- **One campaign.** The ground game's own campaign and its story tutorial are off its title screen (`ground.html?campaign`
  still shows them); its Quick Play is now Endless Play.
- **Tutorials with no story.** Each post has a TUTORIAL on the menu: a practice post that is not saved, with a short run of
  cards that are done by doing them, and it ends back at the menu. The base and the station use js/modes/guide.js (the same
  cards show once, by themselves, the first time a post is played). The ground game's is its training ground: the practice
  base and its fifteen lessons (js/ground/tutorial.js, TRAIN; the texts are trn.* in the language table), with no film, no
  radio cast and no evacuation.
- **The menu is for a desktop** and fits one without scrolling (from 1280x720 and 1366x650 up).
- Comments in the code use the game's own names for the weapons and the enemy.

## What's new in 0.54.2: Publicity and colonists

Two words change across the whole game. What was Truth is Publicity (the Publicity Studio, +1 Publicity a day, the PUBLICITY
tab), and the people of the fleet are colonists, not citizens (the Colonists' Casino, the Orientation Hall). Saves are unaffected.

## What's new in 0.54.1: the station's raiders are the war's enemies

Raids on a station now come from the enemy of that system's front (the Molt in the east, the Foundry in the west, the Talon in
the south), named in the warning and flying that enemy's colour. An enemy the war has destroyed raids no more.

## What's new in 0.54: the base after its first playtest

- **Roads keep to the tiles.** A road starts on a tile and runs straight or diagonal in whole tiles; it meets another road
  where it runs into it. Hold Shift to draw free. Two roads drawn across each other make a junction (bases already saved are
  repaired when they load), so their surfaces no longer lie on top of each other.
- **Dragging the ground** up and down is no longer inverted: the ground stays under the pointer.
- **Requests on the desk** fold down to their title after 20 seconds, say how long is left to answer, and open when tapped.
- **The sewage lagoon is used.** Whoever scrubs a latrine carries the waste to the nearest lagoon or treatment plant.
- **A building's card** shows its crew, whether it has power, water and sewage, contamination, and what it holds. A utility
  says how many buildings it serves. Every tool says what it is, when the mouse rests on it and when it is picked.
- **A guide on a first base**: five steps (a road, a zone, utilities, a building's card, the controls), done by doing them.
- **Wording.** The last names borrowed from elsewhere are replaced with the game's own.

## What's new in 0.53: building the station

- **Build mode.** Choose a part and every free port is marked at once: a green ring where the part fits, a small red dot where
  it does not. Point at a ring (or tap it) and the part is drawn there before anything is built. A card above the tool bar says
  whether it fits and, if not, why; TURN (or R) tries the next way round that fits, BUILD (or a click, or a second tap) builds.
- **The pointer lands where it points.** Ports used to be picked about a header's height below where they were drawn (75 px on
  a desk, 170 px on a phone). They are now picked where they are, from further away, and near-side ports before far-side ones.
- **What goes where** (`joins` in `js/orbit/config.js`). Rings, drums and discs only go round the spine. A dome needs a port
  that faces up; a spire, up or down. Bays and docks only go on side ports. Only fittings hang on Cargo Racks and Fuel Tanks.
  The mounts on top of guns, bays and shops take fittings, a dome or a spire, not whole modules.
- **Nothing is built through anything else.** The check now counts thin pieces (wings, dishes, masts), treats the inside of a
  bay as solid, and allows much less overlap at the join. A part that rests on a roof sits on it by its own lowest point, so a
  tube no longer floats and a bubble no longer sinks in. Stations already built are left as they are.

## Play

Open `index.html` through any web server (`npm start`, then http://localhost:8080). There is nothing to build.
On GitHub Pages, serve the repository root from `main`. It runs on a computer or a phone. Add `?seed=7` for the same war
every time.

## How it is put together

This is one application with one save, one faction and one interface, not four games behind a menu.

- `js/main.js` is the spine: the title, founding a command, the campaign save, the menu, and the passage between places.
- `js/galaxy/` is the war room (from Super Galactic Strategy). `screen.js` is its interface; `sim.js` holds the rules,
  including what a station and a base are worth and how a ground battle settles a fleet battle (`battleResolve`).
- `js/modes/` holds the three theatres. Each one fills the same frame (`#s-theatre`: the command bar, the world, the tool
  bar, the desk) and reports back to the map:
  - `ground.js` hosts Orbital Fury whole (`ground.html`, `js/ground/`, `css/fury.css`): its armoury, briefing, mission and debrief.
    A small adapter at the top of `js/ground/main.js` (`GCX`) starts the one mission the war room chose, with the campaign's
    armoury and credits, and hands the result back. Its title, saved operations and Discord feed are not part of this game.
  - `orbit.js` runs Super Orbital Simulator's station (`js/orbit/`). It reports the station's tier.
  - `base.js` runs FOB Super Commander's base (`js/base/`). It reports the base's charter.
- `js/core/logo.js` is the crest maker shared by every post. `css/gc.css` is the one stylesheet.
- The theatres are loaded the first time they are entered, so the game opens quickly.

## What the war runs on

- **Three products:** fuel (from the biomass of the east), ammunition (from the metals of the west) and tech (from the bio-tech of the south). Deposits, wins and special sites on a front deal in that front's product.
- **Troops:** one number, trained by bases. **Ships:** built at the headquarters and over stations.
- **Credits:** the war chest. Ground battles and posts in profit pay into it. It buys from the armoury and from the market.
- **The market:** buy and sell the three products for credits. Buying pushes a price up, selling pushes it down, and prices drift back.
- **Ratings:** the brand's standing and the fleet's morale.
- **Armoury rank:** one for every station tier and base charter that is linked to the capital and in profit.

## Saving

The campaign is kept in the browser (`ofgc.campaign`). Each station and base keeps its own state under
`ofgc.site.<orbit|base>.<system>`, so one large base cannot crowd out the rest.

## Checks

With `npm start` running: `python3 test/shell.py` plays from the title through a ground battle and back at phone and
desktop size; `python3 test/sites.py orbit` and `python3 test/sites.py base` found a station and a base, leave, and
come back to them.

- `python3 test/joins.py` checks the station's build mode: what joins to what, that nothing is built through anything else, and that a click or a tap builds on the port it is over.
- `python3 test/orbit.py` checks the ground battle's circling view: that it turns, and that the pointer still lands where the ground is drawn.
- `python3 test/tutorial.py` plays the guided opening from start to finish (about three minutes).
- `python3 test/map.py` checks the map's desk controls.
- `python3 test/fleets.py` checks the opening choices and the Fleet Office.
- `python3 test/armoury.py` checks the armoury, the chest and that they survive a reload (needs `npm start`).
- `python3 test/base_ui.py` checks the base's controls: dragging the ground, roads keeping to the tiles and joining where they cross, a building's status card, requests folding away, and the guide.

## Not in this version

- 3D units on the ground: the land, rocks, trees and buildings are 3D, but the squad, the infantry and the enemy are still flat pictures lying on it.
- One look across the posts: the ground battle still wears Orbital Fury's own style.
- Fleet mechanics beyond the three fleet upgrades; supply lines that change what a system pays.
- Most of the station's and the base's deeper panels (rooms inside parts, the ledger, research, patrols, landscaping).
- The tutorial for the station and the ground (the base has a short guide on a first base), music, French and Spanish.
- The setting's look: the wording is now the game's own (a private fleet that is its own brand, against the Molt, the Foundry and the Talon), but the lizard riders are still drawn and fought as the old third enemy.

## Credits

Design and direction: Ramzies. Built with Claude (Anthropic) as a coding assistant. 3D is drawn with three.js (MIT,
`js/vendor/THREE-LICENSE`). Thanks to the SESF community for testing, ideas and feedback. An original setting, not affiliated with or endorsed by any game studio or publisher.
