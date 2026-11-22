# Orbital Fury: Galactic Command

**Prototype 0.58.0.** One war, run from four posts, in one game.

You found a command (a name, a crest, colours) and hold the centre of the galaxy against three enemies. Everything in
the war is yours to run, and each part changes the others:

| Post | What you do there | What it does for the war |
|---|---|---|
| **The war room** | The galaxy map. One decision on each front a round: attack, defend or hold. | Where the war is won or lost. |
| **The ground** | When fleets meet, take the fight down to the planet and cover the landing from orbit with the ship's guns. | Win and the system is yours; lives left decide how much of the fleet survives. |
| **The station** | Found a station over a system you hold and lay it out; its people do the rest. | +2 hit points to the system for each tier, and ships cost 1 less fuel there. |
| **The base** | Found a base on the system's key world: roads, zones, and buildings that grow along them. | +35% output from the system for each charter. |

A system that falls takes its station and its base with it.

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
