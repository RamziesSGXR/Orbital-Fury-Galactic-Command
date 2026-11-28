# Direction

Where the game is going, as set by Ramzies on 22 November 2026. This is the record of intent; the README says what is built.
Items marked **(built)** exist; everything else is to come.

## One game, one menu

- One main menu for the whole game, with a tab bar: **HOME, PLAY, COLLECTION, CAREER, STORE, OPTIONS**. The bar stays
  at the top of every tab. **(built, 0.60)**
- The mini-games are reached from PLAY, not from menus of their own. The ground game no longer shows its own title. **(built)**
- Each game keeps three saves of its own, and has its tutorial beside them. **(built)**
- HOME: the campaign, NEWS (the latest update), JUMP IN (the last game played), LEARN MORE (the credits), and daily
  challenges (a placeholder for now). **(built; the challenges are a placeholder)**
- COLLECTION: everything the player has met in their career (enemies, objectives, buildings, parts, people), each to be
  opened and read about. **(built, 0.62: enemies, worlds, objectives, buildings and station parts; people to come)**
- CAREER: progress across the campaign and every mini-game in one place. **(built, 0.62: totals from every game, the saves, the
  collection; milestones to come)**
- STORE: command credits, earned in every game, spent on upgrades that carry into the mini-games and the campaign, and on
  the Vanguard roster. **(built, 0.69: the roster, six roles, seven personalities and six upgrades)**
- OPTIONS: common settings first, then each game's own (controls above all). **(built; controls are listed, not yet rebindable)**
- Desktop only for now. Controller support may come; upright phones will not.

## The game's icon

An officer's bust on a pennant, black and gold. It stands for the game wherever the player's own crest does not belong:
the browser tab, the menu bar, the credits. The player's crest is for their command. **(built)**

## The Vanguards

The twist on the usual war game: **publicity matters**. The Vanguards are not super soldiers. They are soldiers who got
famous in the war and play up to it, live, for money and fame: influencers who also fight. That is the satire, and it is
also why they are so capable and so well equipped: a great deal has been spent on them.

- They are the elite in **every** mini-game, not only on the ground.
- A **roster** the player builds: specialist roles (a sniper, say) and public personalities (traits and stereotypes),
  unlocked in the STORE. **(built on the ground, 0.69: four Vanguards, one for each group; the other games to come with
  item 7)**
- **Their lives matter.** Losing them is how a fight is lost, and difficulty is partly how many lives you are given.
  **(built on the ground, 0.62: 30 lives at level 1 down to 12 at level 10)**
- **Insurance.** A Vanguard who dies pays out. It costs a lot to train one and more to make one a star; the payout,
  the cost of a replacement and the publicity of a death are all game mechanics to build. **(the payout and the replacement's
  contract built on the ground, 0.62; the publicity of a death to come)**

## Skill should pay

- Combos, speed and good play earn bonuses.
- In FOB Commander that means good design: enough latrines, a layout the ground crews can work fast in, day-to-day efficiency.
  **(built, 0.62: the daily efficiency review; 0.68: the layout's walking distances, bunks to work, mess and latrine, in the review and the base report)**
- Quick-time events get depth: the order matters, and it is **not random**, so players can learn it and get faster.
  The same events are to be used in the other mini-games. **(built for the demolition charge, 0.62: a set order for each
  objective, a bonus for a clean and a fast one; the other games to come)**

## Look and feel

- Buildings, on the ground and in space, reworked with a cyberpunk science-fiction flair; floating parts fixed.
  **(0.64: your side's field kit remade in one look (artillery, heavy turret, SAM site, lookout, propaganda tower, landing
  pad, wire); not every building is to be redone, only what looks like an old war. test/floating.py finds loose pieces.
  To come: the enemy's posts, the base's own buildings where they look dated, the station)**
- One model for one thing across the mini-games, and no doubles: what the ground fight and FOB Commander both have looks
  the same in both. **(0.64: the field gun is the artillery; FOB's Defence Turret, Lookout and Landing Pad are the ground
  fight's)** FOB Commander builds what the ground fight has: **(0.64: barbed wire; the Missile Silo, which makes nukes)**
  To come: sandbags and trenches, the comms mast and the radio mast as one. The ground fight uses FOB Commander's buildings
  too: **(0.64: the evacuation's shelter and hangar are the base's bunker and vehicle bay)** To come: the work site's
  warehouse and hangar, the oil pump (the base's extractor), the capital's city blocks (hab blocks), the radio mast.
- Weapons that look and fire with more character; explosions that look and behave better; more detail in textures.
- Ground fog that reacts; maps that change as you play (flooding, weather); buildings and objects that can be destroyed
  and change the land.

## Still open

- The galactic campaign's style of play (a different one may be tried).
- Story reasons for the war.
- The credits still name SESF and the old prototypes; the tutorial planet is still `mars` inside the code.

## Priority: the order to work in (set 28 November 2026, after 0.93; tick each off here as it ships)

Ramzies' realism order (the ground fight, FOB Commander, the station, the galactic campaign) first, the base's agreed gameplay
(walls, then the waves) woven in once the ground fight's look is finished. Each item is one version.
1. ~~**The black rocks** (0.93.1): every biome's second scanned rock drew black (its material asked for colours the loader drops).~~ **(0.93.1)**
2. **Water in the ground fight** (0.94): rivers and lakes as real water, not the map picture's dark blue: the sky's light
   reflected, banks that wet the ground, ripples; ice in the snow (a frozen river not a dark band); swamp in the jungle.
3. **A lusher jungle tree** (0.94.x): the last of the ground fight's scans (item 25).
4. **FOB Commander's light** (0.95): 0.93's contact shadows in the base view, its buildings' roughness and metalness by
   material (js/surface.js pbr), so the base is lit as the ground fight now is.
5. **Walls, finished** (0.96, item 21): taller and stronger on a foundation, a walkway, turrets, lamps, banners and searchlights on them.
6. **Defensive waves** (0.97+, item 16): the enemy comes at the base in 3D; prepare in the warning, pause, build, repair
   and call strikes mid-wave; ruins, wounds and stolen supplies when it goes badly; in the campaign when the system is attacked.
7. **FOB Commander's buildings remade** in Blender with scanned materials, their own texture layouts and far forms; the
   foundations and walls in scanned concrete (items 22 and 25).
8. **The station, then the war room**, in the same realism pass.
9. Then the rest of the list below, in its order: Vanguards in FOB and the station (7), quick-time events there (8), daily
   challenges (9), weapon fire, explosions, fog and weather (10), FOB's buildings destructible (12), our own names (23).

## The list: what is left to do (kept up to date as things are built)

Models and sharing (the 0.64 rework, continued):
1. ~~The ground fight uses FOB Commander's buildings: the work site, the radio mast, the capital's city blocks.~~ **(0.65)**
   ~~The oil pump as the base's Biofuel Extractor.~~ **(0.66)**
2. ~~Sandbags and trenches buildable in FOB Commander.~~ **(0.65)**
3. ~~Loose pieces in the ground fight's models.~~ **(0.65: none left)** ~~FOB buildings and station parts, looked at in
   place.~~ **(0.66: test/floating_built.py finds none in the buildings as built; the station's frames are held by their
   lines, the pylon's ring by struts)**
4. ~~The enemy's posts and buildings in the same spirit (each enemy its own look), and FOB buildings that look dated.~~
   **(0.67: tools/blender/enemy.py, with ruins; the barracks, armoury, mess hall, patrol post, HQ, shelter and PA mast
   redone, barriers for sandbags everywhere)**
5. ~~fleet.py copied into the Blender scripts folder.~~ **(0.65: with sites.py, world.py and vehicles.py; the old ones kept
   as *.before-0.64)**

The livery:
11. ~~One livery above every game, edited on the main menu: five ready-made styles, an emblem editor in layers, colours,
    finish and uniform.~~ **(0.66)**

Next, in this order (agreed after 0.65):
6. ~~The Store: spending campaign credits on upgrades; the Vanguard roster (roles and personality traits to unlock).~~
   **(0.69: command credits from the career; the roster, roles and personalities on the ground; six upgrades)**
7. Vanguards in FOB Commander (and the station), with lives and insurance there too; troopers and recruits managed one by
   one at the base. **(a first step, 0.78: CREW FIRST and SWITCH OFF on a building's card, from players' feedback)**
8. Quick-time events like the demolition charge in FOB Commander and the station: set orders that can be learned, with
   skill bonuses.
9. Daily challenges (a placeholder on HOME today).
10. Weapon fire and explosions with more character; ground fog that reacts; weather and flooding.
12. Destructible buildings: ~~the enemy's, on the ground~~ **(0.67: each falls into its ruin)**; FOB Commander's next.
13. Later: controller support (desktop first); another style for the campaign; story reasons for the war.

FOB Commander's goals (agreed at 0.83 and 0.84, from Ramzies):
14. ~~The Offices round the base's goals, measured with bars: population milestones, budget and trade, efficiency (how fast
    people get in and out, roads and layout), happiness (defence, housing, how good the base looks).~~ **(0.83)**
15. ~~No research: upgrades come with milestones (head counts and charters); placement rules are the rest. Beauty to
    build: trees, planters, gardens, fountains, parks.~~ **(0.84)**
17. ~~Show, don't tell: the Offices as lenses on the base itself, marks over buildings, money rising off where it is made,
    a short task board; paragraphs into tips.~~ **(0.85)**
18. More like Ramzies' clip (a night-time citadel builder): ~~blueprint holograms for the ghost and for what is going up,
    construction sparks, a label at the pointer, domes over reach and beams off what is served, glow~~ **(0.86)**; still
    to do: raised foundations, ramps and terraces with sizes shown; banners, wall turrets and lamps along the walls; a
    leaner bottom bar (category words that open into small cards); people about at night.
    (0.87, Ramzies: not holograms but blueprints that get built: done.)
19. ~~Foundations instead of zones: typed slabs, raised in steps, ramps where roads meet them, roads joining them up;
    anything permanent on one; no growth by itself.~~ **(0.87)**
20. ~~Utilities through the foundations and the paved roads between them, up to what the sources put out: no circles.~~ **(0.88)**
21. (0.89: four kinds of wall, the fortified one only on a foundation.) Still to do on walls: taller and stronger than on bare ground, with a walkway, and turrets, lamps, banners and
    searchlights mounted on them. Then the defensive waves (16) come at them.
25. (0.92.6: the scanned ground hex-tiled in the ground fight and FOB Commander, at one size, no repeat; the ground fight's land
    one mesh past the map picture, its fog worked out on the land. Next there: water in the ground fight, whose rivers and lakes
    are only the map picture's dark blue: in the snow a frozen river reads as a dark band.)
    (0.92.2: every model in every mode wears real scanned cloth, paint, concrete, wood, rock and bark as its detail; ground
    cover in the ground fight. Next in Blender: the base's buildings remade with their own texture layouts, scanned
    materials and a far form each (0.92.3: light from a real sky done); then the station and the war room.)
    Realism (Ramzies, 0.91: "we're shooting for GTA V, not PlayStation 2"; CC0 photoscans welcome), in this order: the ground
    fight, FOB Commander, the station, the galactic campaign. (0.91: the ground fight's land, trees and rocks from scans.)
    (0.91 too: a far form of each, the pine built from cards, all off on the low setting; Ramzies: 30 to 144 frames a
    second, always.) Still to do there: a lusher jungle tree (0.92.1: ground cover near the camera done), light from a real sky (HDRI),
    ~~contact shadows~~ (0.93: in the ground fight, with its units and props on the real sky's light, PBR by material); FOB Commander (0.92: its land and rocks scanned; still: the buildings remade with scanned materials, the
    foundations and walls in scanned concrete), the station, the war room.
22. A grittier, less cartoonish look for the buildings, in Blender. (0.90: detail textures on every model in every mode
    and on the land; Blender pieces for the foundations, their ramps, and the barrier-basket wall.) Still to do: the
    buildings themselves, remodelled grittier.
23. Our own names everywhere (Ramzies, 0.87): no Helldivers references left in any mode, the campaign, the code or the
    files: the base's Office codes (DEF, PRO, TRU on the feed; Defence and Expansion standing) go first, with 0.88;
    the rest in a sweep of its own later.
24. Roads (Ramzies, 0.87): dirt roads carry nothing; paved roads are laid on a foundation of their own and carry power,
    water and sewage between foundations. More than one kind of wall.
16. Active defences and DEFENSIVE WAVES. Watch and act: the enemy comes in from a side in 3D; turrets, artillery, wire and
    troopers fight; you prepare during the warning and, mid-wave, can pause, build, repair or call a strike. Losing costs
    damage and wounds (wrecked buildings left as repairable ruins, troopers wounded, supplies stolen); the base survives.
    In the campaign a wave comes when the base's system is attacked, offered like the ground fight (play it, or it
    resolves by itself); in a quick game, raids at random and invasions.
(Dropped: recolouring the enemies; each already has its own colours.)
