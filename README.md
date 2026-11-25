# Orbital Fury: Galactic Command

**Prototype 0.84.0.** One war, run from four posts, in one game.

You found a command (a name, a livery: emblem and colours) and hold the centre of the galaxy against three enemies. Everything in
the war is yours to run, and each part changes the others:

| Post | What you do there | What it does for the war |
|---|---|---|
| **The war room** | The galaxy map. One decision on each front a round: attack, defend or hold. | Where the war is won or lost. |
| **The ground** | When fleets meet, take the fight down to the planet and cover the landing from orbit with the ship's guns. | Win and the system is yours; lives left decide how much of the fleet survives. |
| **The station** | Found a station over a system you hold and lay it out; its people do the rest. | +2 hit points to the system for each tier, and ships cost 1 less fuel there. |
| **The base** | Found a base on the system's key world: roads, zones, and buildings that grow along them. | +35% output from the system for each charter. |

A system that falls takes its station and its base with it.

## What's new in 0.84: milestones instead of research, and beauty

Ramzies: science shouldn't really play a part; milestones and where things can and can't be placed should; and beauty
and active defences to build, with defensive waves to come. This is the first half (the waves are next, as agreed: see
item 16 in `docs/DIRECTION.md`):

- **No research.** The Science Lab, the research tree and the SCIENCE page are gone. Every upgrade it gave comes with a
  milestone instead: a head count on the base (the most it has had) or a charter. Recruit Drill at 10 on the base,
  Fortification Doctrine (turrets, floodlights) at 15, Reinforced Shelving at 20; Long-Range Radio, Scout Rovers and the
  Hab Block with the FOB charter; better solar, a third truck and cheap asphalt at 45; Heavy-Lift Dropships, the
  Broadcast Mast, BRAND-MART, the archives and State Industry with the Fort; Unified Command and armour with the Fort and
  80; the War Room with the Major Base (which now wants a Command Tower where it wanted a lab). Each is announced when it
  comes; a locked card says which milestone it waits for; POPULATION shows the ladder on its track and what unlocks next.
  An old save keeps whatever it researched.
- **BEAUTY**, a new build tab: Planted Tree, Flower Planters, Garden, Fountain (needs a Water Well) and Park (from the FOB
  charter). How good the base looks lifts morale where people can see it: in full within ten tiles of the bunks, half
  further off, and none of it goes in an Industry zone. Gardens, fountains and parks are on air, for the war's ratings.
  Their models were made in Blender with the base's kit (`tools/blender/README.md`). HAPPINESS shows the beauty score.
- **Where it can't go, and why**: while placing a building or drawing a road, the reason it can't go where the pointer
  is shows beside the pointer.

## What's new in 0.83: the Offices, round the base's goals

0.82 brought back every page the standalone game had, and it was a lot of reading. Ramzies: is it all useful, and does
it fit? The goals of a base are now the window, each measured with bars rather than tables: "bars that measure,
population milestones, budget & trade, efficiency, citizen happiness". Six pages instead of eight
(`js/modes/base-offices.js`), each with a thin measure under its button on the dock:

- **POPULATION**: the milestones, as one track: the charters at 30, 60 and 110 on the base. The next one's other terms
  as bars (Growth standing, the fee, the works, storage) and its buildings; who is here (trained, recruits, out, wounded,
  engineers); bunks and mess seats; the Growth Office's daily audit; and, in a campaign, what the charter gives the war.
- **BUDGET & TRADE**: what the base makes and what it loses, a watch, in supplies and in credits, every source and cost
  as a bar; the allocation by rank, the three standings that set it, and the commitment that buys each (− and +).
  TRADE & LOANS: the market, offers from the other bases, debt, borrowing.
- **EFFICIENCY**: how fast people and goods get in, round and out: the daily efficiency review's six checks, the walks
  from the bunks against the 80 m mark, paved road, goods waiting on the pad, trucks out, troopers ready for the
  transport, engineer crews, crewing, power, water, sewage, troops to a latrine.
- **HAPPINESS**: morale and where it is heading, and everything that moves it in three: defence (the wall, the perimeter
  review, raids), housing (bunks, comfort, hunger, noise, water) and looks (propaganda, condition, what is on air, the
  inspection).
- **OPERATIONS** (orders, training, special operations and SEND, squads out, the last results) and **SCIENCE** stay.
- Gone: the Bureau's ledger, the production table, medals and the fallen, full after-action reports (hover a result),
  supply lines and vehicles, the market's indices. The calls and requests were already on the task board; the roster
  review's files to grade are there now too, one at a time.

## What's new in 0.82: the Offices' windows

Part two of bringing back the standalone game's interface (part one was 0.81, below). Everything the base's
simulation keeps track of now has a page: one window over the base, opened from the dock along the bottom (one button an
Office, with how it is doing underneath), from the big numbers at the top, or with O (Esc closes it). Unlike the
standalone game's, it is laid out in columns, so every page fits a 1280 x 720 screen without scrolling
(`js/modes/base-offices.js`):

- **ECONOMY**: the budget (every source of supplies and credits and every cost, a watch, as two stacked bars and the
  accounts beside them); the planet market (the three Office indices with their last 14 days, every good's buy and sell
  price, BUY and SELL in lots of 10 to 250, offers from the other outfits' bases); commitments (what the base gives each
  Office a watch, NONE to ALL OUT, what it costs and the standing it buys); loans (the Founding Charter, REPAY, BORROW a
  development loan or emergency credit); production (what every kind of building earns or costs a watch, and the goods).
- **DESK**: the Offices' calls, the base's requests, and the roster review: read a trooper's file and give the grade.
- **DEFENCE**: deployment orders, training, the base's defences, standing patrols, after-action reports (READ),
  special operations with their odds (take the rover or the tank along, SEND), squads in the field, medals and the fallen.
- **EXPANSION**: the charter and every term of the next one, supply lines, the dropship's last bill, vehicles, food, the
  Growth Office's last audit and how far troops walk.
- **PUBLICITY**: the inspection: morale piece by piece, propaganda, condition and the likely score.
- **SCIENCE**: the research tree in three tiers, and the labs. **INTELLIGENCE**: what to do next, what is going wrong,
  what is owed and what is coming, and the threat of a raid. **STANDING**: the outfits ranked, each one's share of the
  allocation, and the Bureau's ledger.
- SUPPLIES and CREDITS open the budget, OWED the loans, the day STANDING; TROOPS and the goods open EXPANSION, MORALE
  PUBLICITY and READY DEFENCE. The base report that STANDING, CHARTER and DEFENCE used to open is spread over these pages.
- Next: the minimap and the map views, the comms log, and the road bar's land, clearing and bridge tools.

## What's new in 0.81: FOB Commander gets the standalone game's interface back

Ramzies: the Galactic Command FOB Commander "UI just isn't as good as the Helldivers themed one". Its simulation and 3D
came over from FOB Super Commander whole; its interface (about 2,000 lines) had been replaced by a thin wrapper, so a
player could build and answer the desk but could not see what the base earned, what it was short of or what the Offices
wanted. The first part of that interface is back, in this game's look and words (`js/modes/base-hud.js`):

- **The top bar**: SUPPLIES, CREDITS and OWED in big numbers with their change a watch; troops (home, in all, bunks),
  morale and where it is heading, power, rations, fuel, ammo and READY; BUY SUPPLIES; the day, with the allocation bar,
  the inspection mark and your rank. Hover any of them for where it comes from.
- **The task board** (ORDERS & DESK, top left): the next three of 21 orders that teach the base, then everything
  waiting: the Offices' calls (set aside what they ask for, or decline), requests, offers from the other bases, and what
  needs fixing (short of power, water, bunks or a good; a raid coming). The calls and offers were never shown before.
- **The build bar**: tabs by purpose with icons and their zone's colour; a card for everything, with a picture, what it
  is for, its cost, upkeep and power; BUILD AS a standard; the zones with the base's demand, the franchise and GROW AS;
  the engineer crews at work; SNAP for road ends (G). Click a tab again to fold the bar away.
- **The building card** (right): how it is doing in a line, its upkeep and what it earns a watch, standard, services,
  condition, crew, power, stocks and needs as bars, who is on duty; REPAIR, CREW FIRST, SWITCH OFF, UPGRADE to the next
  standard, DEMOLISH with the refund. The command post's card keeps the dropship's orders; the silo's, its warheads.
- **The status bar**: the clock (slower, pause, faster; [ and ]), the day, the time and what the base is doing at that
  hour, the next charter's term, and STANDING, CHARTER and DEFENCE.
- Outside the tutorial, the task board's orders replace the five-card guide. Next: the Offices' windows (the economy
  with the market and loans, the ledger, research, intelligence), then the minimap and the map views.

## What's new in 0.80.1: the F3 readout tells where a frame's time goes

Ramzies' screenshots of 24 November held the first readout from a real graphics card (an RTX 4070 SUPER): 60 frames a
second throughout, the game's own working-out 0.2 to 0.3 ms a frame, the drawing 5.4 to 6.3 ms, of which the 3D part 4.3 to
4.7 ms, nearly the same with 32 enemies as with 86. The readout could not say more than that, so it now does:

- **The 3D part in its parts**: build (the land, the blocks, the models), send (the pictures handed to the graphics card,
  the sheet every frame), draw (the scene, its shadow and the sight), copy (the finished picture onto the screen's canvas).
- **The card's own time** where the browser offers a timer (`EXT_disjoint_timer_query_webgl2`); "card time n/a" where not.
  Everything else in the readout is the processor's time.
- **The real draw calls and triangles** over the whole frame. three.js counts each render on its own, so the readout only
  ever saw the last one, the copy to the screen: "calls 1".
- **The frame-rate cap beside the fps**: under the cap, the screen's refresh rate is what holds it.

## What's new in 0.80: the ground fight's look, from a play of it

- **Shadows**: the ground's picture no longer has terraces painted on it in 3D (they drew stripes of shade across every
  slope) and its painted slope light is softer, since the land is lit in 3D. The land takes the shadows of what stands on it
  but throws none of its own (its facets striped the slopes).
- **Craters** are dug into the land itself, on the slope where they are, with a lip of thrown-up earth; everything stands in
  them. A blast in an old crater deepens it instead of putting a new one on top. (They were ring models, level, half buried.)
- **The supply canister**: the supply pod has our own name. LOAD CANISTER answers a supply request.
- **Strategic intel** in place of the VIP: pull the data core out of a courier's wreck, carry it to the **uplink tower**
  (`site_uplink`, a new model) and hold it while the intel goes up. The objective's id is still `vip`.
- **The dropship** is made over so every part is fixed to another: the wing runs into the lift fans, the boom and fins, the
  skids on struts, the ramp hanging from the sill, the chin gun in its ball.
- **Infantry parachute in**: an Infantry drop holds about 50 m up and its troopers jump and come down under canopies (a
  new `hang` pose); they are on the ground and in the fight when they land.
- **The war beast** lumbers in on what it fights between beams (to 16 m) and gores whoever gets close; its beam, its aim
  line and its crystal are drawn in 3D; its model's frill sits off its shoulders so its legs no longer pass through it.
- **Down from the ship, in 3D**: the ship gun's rounds, the lance and the precision strike, the targeting laser, the ship's
  beam, the airburst, the smoke columns, the nuke's flight, flares and the extraction beacon come out of the sky. They were
  drawn on the ground's own picture and lay flat along it.

## What's new in 0.79: fixes from a play test

- **FOB Commander, the zone card.** Click open ground in a zone: how many tiles are painted, what is going up, or why nothing
  is (no room for the building it wants, waiting for supplies, or what that building still needs), and what the base is
  short of. js/base/zones.js `growNote` now gives the reason the player can act on first.
- **FOB Commander, the desk.** Answering the only request on the desk clears its card (the empty desk's signature matched
  the reset one). The welcome back line gives the day the top bar shows.
- **A post played on its own keeps its world's name** when a new war gives the command a new capital (`ofgc.solo.meta`
  keeps `home`).
- **War.** A defence on the ground is briefed as a defence (`sit.1def`, `sit.1atk`; the war sends `side` and `place`). A
  fight's material stops at the stores' cap like other income (`_addLoot`). A hint that rings a system brings it into
  view. "Expected next round" instead of "1 round(s)".
- **Orbital Commander.** The NEXT line keeps clear of the comms panel; the commander channel's list is sticky.
- "a challenge coin", not "an".

## What's new in 0.78: FOB Commander, from players' feedback

- **Walls and field works**: barbed wire drawn along a wall now runs along its top. Sandbags and trenches go in front of a
  wall, not inside it, and a wall can't be drawn through them; ones laid inside a wall before are no longer drawn.
- **The numbers at the top right** stay after going to the main menu and back. They were drawn only when they changed, so
  a base reopened just as it was left showed none (js/main.js `frameUi.reset`).
- **A black screen after switching tabs**: when the graphics driver drops the 3D view (most often while the tab is in the
  background), the base says so and asks for it back; if the browser doesn't give it back in three seconds, the view is
  built again on a fresh canvas, where it was looking. Coming back to the tab, the view is sized and checked again.
- **Crews**: the Water Purification Unit, the Treatment Plant, the Concrete Batch Plant and the Missile Silo were never
  crewed (missing from the crew order), so they made no water, treated no sewage and built no warheads. They are now,
  and anything crewed that the order leaves out is crewed last. A building short of hands takes them from the least
  needed when nobody is free.
- **Your say in who works where**, a first step: on a building's card, **CREW FIRST** staffs it before the rest, and
  **SWITCH OFF** stops it so its crew and power go elsewhere. The card says when every trooper is busy.
- **Condition, explained**: every building's card shows its condition and what it costs (below 70% it works at 85%,
  below 40% at half and it lowers morale), with how it wears and mends on hover, and **REPAIR** puts it back to 100% for
  supplies. The base report has a CONDITION section.

## What's new in 0.77: our own names, everywhere

- **The enemies' own names** on the ground: the Molt, the Foundry and the Talon (they were BUGS, BOTS and LIZARDS there).
  Molt breaches dig out of burrows, Foundry dropships bring fresh troops; the jammers are a howler nest, a call-in jammer
  and a cognitive disruptor, and the Molt's side objective is an acid nest.
- **The ship** is called the ship everywhere. Call-ins renamed: Scout Rover, Sprint Boosters, Scatter
  Mines, Fire Mines, Tank Traps; the support weapons and orbitals have new ids in the code (`lmg`, `oneshot`, `guided`,
  `atl`, `coil`, `drone`, `orb_main`, `orb_seeker`, `orb_beam`, `striker_heavy`, `shield_proj`). js/ground/data/kit.js
  `fixKit` maps the old ids, so a save keeps what it owned.
- **The old story campaign is gone** from the ground game (its chapters, cast, screen and cinematic). The Galactic
  Campaign is the one campaign; a run of the old one carries on as an ordinary operation (session.js `dropStory`).
- **In the code**: the Vanguards are `vg` (they were `hd`), the station's Head Office channel is `office`, FOB Commander's
  patrols are Burrow closures and Foundry outpost raids, and its Vehicle Bay keeps a rover. Old saves are mapped.

## What's new in 0.75: your crest opens your livery, and OPTIONS in four parts

- **Your crest opens your livery**, from anywhere: at the right of the main menu's bar, in the war room's bar, in a post's
  bar and on the menu inside a game. The main menu has no LIVERY tab now. Before a livery is made the crest is an empty
  shield to fill in. A post's bar has a MENU button beside the pause for the menu itself.
- **OPTIONS** is GAMEPLAY, DISPLAY, AUDIO and CONTROLS, each a page of its own. DISPLAY: full screen, graphics, frame rate,
  screen shake, flashing, colour-safe colours, the ground's lighting. AUDIO: master, effects, ambience, voices, interface
  (music when the score is ready), and quiet in the background. CONTROLS: every game's keys. The ground game takes these
  from the main menu, and a change on its own SETTINGS comes back (window.gcOptions).
- **PLAY** shows a 16:9 picture from inside each game (assets/menu/play-*.jpg).
- **People hold what they hold**: the far models keep their hands and feet, so a rifle or a slate no longer floats, and
  shoes and boots are shaped (toe, heel and sole) in place of blocks.

## What's new in 0.69: the STORE, and a roster of Vanguards

- **Command credits**, earned in every game and spent in the STORE: 100 a fight won on the ground (30 for one lost), 15 an
  objective, 1 for every twenty kills, 15 a day at the base (50 for one ranked first), 25 a week on the station, 4 a
  building or a station part, and 500 to start with. They are worked out from the career, so everything played before
  counts (js/core/roster.js).
- **The roster**: the four Vanguards who lead your groups on the ground (A to D), each given a name, a **role** and a
  **personality** on the STORE's ROSTER tab. A replacement takes over the same ones. The names are the ground fight's own:
  change one in either place.
- **Six roles**, bought once and given to any of the four: the Rifleman (the standard kit), the Marksman (a long rifle:
  slower, harder hitting, farther, and sees further), the Machine gunner (a belt-fed gun and heavier plate, a step slower),
  the Combat medic (patches up whoever is worst hurt close by, Vanguard or Infantry, and carries two more stims), the Sapper
  (more and heavier grenades, and buildings come down faster) and the Scout (faster and far-sighted, but less tough).
- **Seven personalities**, the act each puts on for the cameras: none, the Showboat (stays in longer, hits a little
  harder, draws viewers), the Stoic (shrugs off damage, dull to watch), the Heartthrob (millions tune in; the policy pays
  more on a death, but the next face costs more to sign), the Prepper (a stim and a grenade more), the Comedian (Infantry
  close by fight harder) and the True Believer (takes the enemy's buildings personally). The viewers follow the acts, and
  the ratings the war is given follow the viewers.
- **Upgrades**, a level at a time, each carrying into one game: a war chest for a new campaign, reserve contracts (a
  Vanguard life more in every fight), a better insurance policy, a network deal (more viewers from the first minute),
  seed money for a new base and a docking grant for a new station.
- On the ground, each Vanguard's row shows their role (MRK, MG, MED, SAP, SCT), and a medic's healing shows as it lands.

## What's new in 0.67: the enemy builds its own way, and what you destroy falls down

- **Each enemy its own buildings** (made in Blender, tools/blender/enemy.py), from the look of its own creatures:
  - **The Molt** grow theirs: a banded chitin nest with a toothed maw between two tusks and chimneys breathing spores; a
    spitter on three claws; a scent relay on a feelered stalk; a larder of silk cocoons under bone ribs; a glowing brood
    heart in a cradle of bones; a chorus of resonating horns.
  - **The Foundry** cast and bolt theirs: a riveted works under a lit sawtooth roof, with stacks and a furnace door; an iron
    turret with a muzzle brake; a lattice transmitter; a stockpile under a lean-to; a bank of brass-wound capacitors; a
    loudspeaker trestle; and a new great gun in an iron pit.
  - **The Talon** raise theirs: a hide pavilion on great curved ribs with a living crystal crown; a crystal lance cradled in
    bone; a drum tower; a hoard of baskets and crystals; a geode in a ring of standing stones; a war-horn tower; and the
    shield node, a pale crystal held up by bone tines.
- **Each enemy has its own turret** now, where all three shared one grey gun. The places worth taking out (relay, cache,
  battery, broadcast) are each enemy's own too.
- **FOB Commander's buildings out of an old war, brought up to date:** the barracks (a modular block with an upper
  module and a lit entrance, where it was a timber hut under a gable), the armoury (an armoured vault with a blast door),
  the mess hall (a glazed canteen under a canopy, where it was a Quonset hut), the shelter (a concrete berm capped in
  armour, where it was a mound of sand), the PA mast (line-array cabinets, where it was an air-raid siren), the patrol
  post and the HQ. Concrete barriers instead of sandbags everywhere, the early tent and prefab forms too. All 266 rebuilt
  in Blender from their plans (tools/blender/base.py now packs assets/models/buildings.json itself).
- **What you destroy falls down.** A nest, turret, gun or site that is destroyed collapses over a second and a half and
  stays as a scorched ruin: towers topple, shells and halls sag, lights go out, rubble lies about. Every ruin is made with
  the model, so nothing hangs in the air (test/floating.py checks the standing frame; each ruin's pieces rest on what is
  under them).

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
  ground), FOB Commander (the base) and Orbital Commander (the station), each one row. Behind the whole menu is the
  war room, drawn live by the game with its own people in the player's colours (js/core/warroom.js, 0.72): the galaxy turning
  on the holo-table in the enemies' colours, officers, a Vanguard and crew round it, consoles with live screens, a fleet ship
  crossing the window. It draws only while the menu shows. (It was a film rendered in Blender, 0.56 to 0.71.)
- **One campaign.** The ground game's own story campaign is gone (0.77); its Quick Play is now Endless Play.
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
  - `orbit.js` runs Super Orbital Simulator's station (`js/orbit/`). It reports the station's tier. Its panels, brought over
    from the standalone game in 0.76, are in `orbit-panels.js`: COMMS (C), the Commander's channel with the accounts, the tax and
    each division's orders (O), the upgrade path (U), the top bar's readouts (hover: where it comes from; click: the accounts),
    speech bubbles. `orbit.js` has the card for a part, a person or the station, fitting out rooms (I), the views and the keys.
  - `base.js` runs FOB Super Commander's base (`js/base/`). It reports the base's charter.
- `js/core/logo.js` is the crest maker shared by every post. `css/gc.css` is the one stylesheet.
- `js/core/roster.js` keeps the STORE's command credits, the Vanguard roster and the upgrades; `js/core/store-ui.js` is the
  STORE tab. The ground fight reads the roster as each mission starts (`squad()`, then `applyRoster` in `js/ground/sim/vanguard.js`).
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
- `python3 test/base_fixes.py` checks FOB Commander's feedback fixes: wire on walls, the numbers after the main menu, a dropped 3D view coming back, crews, and a building's card.
- `python3 test/base_offices.py` checks FOB Commander's Offices: every page from the dock with its measure, every page fitting 1280 x 720 without scrolling, the big numbers, Esc and O, and the market, a commitment, a loan, sending an operation and grading a file from the task board; milestones in place of research; beauty by the bunks and not in an Industry zone; the reason at the pointer.
- `python3 test/roster.py` checks the STORE: credits from the career, buying roles, personalities and an upgrade, giving them to the Vanguards, and a fight on the ground where they carry them.
- `python3 test/base_ui.py` checks the base's controls: dragging the ground, roads keeping to the tiles and joining where they cross, the task board's orders, the build bar's cards, the readouts' breakdowns, the building card and the command post's orders, a request answered from the task board, and the clock.

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
