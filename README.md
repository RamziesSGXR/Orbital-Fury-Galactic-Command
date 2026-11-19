# Orbital Fury: Galactic Command

**Prototype 0.46.1.** One war, run from four posts, in one game.

You found a command (a name, a crest, colours) and hold the centre of the galaxy against three enemies. Everything in
the war is yours to run, and each part changes the others:

| Post | What you do there | What it does for the war |
|---|---|---|
| **The war room** | The galaxy map. One decision on each front a round: attack, defend or hold. | Where the war is won or lost. |
| **The ground** | When fleets meet, take the fight down to the planet and cover the landing from orbit with the ship's guns. | Win and the system is yours; lives left decide how much of the fleet survives. |
| **The station** | Found a station over a system you hold and lay it out; its people do the rest. | +2 hit points to the system for each tier, and ships cost 1 less fuel there. |
| **The base** | Found a base on the system's key world: roads, zones, and buildings that grow along them. | +35% output from the system for each charter. |

A system that falls takes its station and its base with it.

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

- `python3 test/orbit.py` checks the ground battle's circling view: that it turns, and that the pointer still lands where the ground is drawn.
- `python3 test/tutorial.py` plays the guided opening from start to finish (about three minutes).
- `python3 test/map.py` checks the map's desk controls.
- `python3 test/fleets.py` checks the opening choices and the Fleet Office.
- `python3 test/armoury.py` checks the armoury, the chest and that they survive a reload (needs `npm start`).

## Not in this version

- 3D units on the ground: the land, rocks, trees and buildings are 3D, but the squad, the infantry and the enemy are still flat pictures lying on it.
- One look across the posts: the ground battle still wears Orbital Fury's own style.
- Fleet mechanics beyond the three fleet upgrades; supply lines that change what a system pays.
- Most of the station's and the base's deeper panels (rooms inside parts, the ledger, research, patrols, landscaping).
- The tutorial for the theatres, music, French and Spanish.
- The setting's look: the wording is now the game's own (a private fleet that is its own brand, against the Molt, the Foundry and the Talon), but the lizard riders are still drawn and fought as the old third enemy.

## Credits

Design and direction: Ramzies. Built with Claude (Anthropic) as a coding assistant. 3D is drawn with three.js (MIT,
`js/vendor/THREE-LICENSE`). Thanks to the SESF community for testing, ideas and feedback. An original setting, not affiliated with or endorsed by any game studio or publisher.
