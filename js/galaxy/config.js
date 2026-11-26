// Every number and every name in the game lives here, so the prototype can be retuned or renamed in one place.
export const VERSION = '0.91.1';

export const C = {
  names: {
    game: 'GALACTIC COMMAND',
    fed: 'The Fleet',
    capital: 'Aurelia',     // the default; the player names their own headquarters when founding the command
    capitals: ['Aurelia', 'Highmark', 'Port Meridian', 'Castellan', 'Ardent', 'Kestrel Station', 'Longwatch', 'Solace'],
    army: 'TROOPS', fuel: 'FUEL', ammo: 'AMMO', tech: 'TECH',
    factions: { molt: 'The Molt', foundry: 'The Foundry', talon: 'The Talon' },
    homes: { molt: 'Nest Prime', foundry: 'Anvil', talon: 'Sunstone Roost' },
    planets: ['Tarsen', 'Okoro', 'Vell', 'Duskar', 'Imrie', 'Pallas', 'Korvan', 'Sable', 'Ythe', 'Marrow', 'Calder', 'Nimbus', 'Orrin', 'Brakk', 'Solen',
      'Vantage', 'Kessrin', 'Halcyon', 'Dray', 'Umber', 'Lyss', 'Penumbra', 'Garnet', 'Ostra', 'Javel', 'Quill', 'Rookfall', 'Stenn', 'Wend', 'Zorya',
      'Thane', 'Corvale', 'Isk', 'Meru', 'Aldous', 'Brine', 'Cassel', 'Dunmore', 'Eris Gap', 'Fenwick', 'Galt', 'Hollin', 'Ixion', 'Jorvik', 'Kael',
      'Lorne', 'Mirel', 'Noss', 'Orlan', 'Pryce', 'Quenby', 'Rhys', 'Sorrel', 'Tamsin', 'Ulric', 'Varda', 'Wythe', 'Xanthe', 'Yarrow', 'Zephyr',
      'Ashby', 'Bexley', 'Corin', 'Dace', 'Elsin'],
  },
  // The offices, as in FOB Super Commander. Each is a button; `does` is the one line shown under its name.
  offices: {
    int: { short: 'INTEL',    name: 'INTELLIGENCE', does: 'Reports, warnings and suggested actions.' },
    def: { short: 'OPS',      name: 'OPERATIONS',     does: 'Your fleets, and the battle deck they fight with.' },
    pro: { short: 'FINANCE',  name: 'FINANCE',      does: 'Manages what you have: stock, income, exchange.' },
    exp: { short: 'GROWTH',   name: 'GROWTH',       does: 'Grows what you have: develops systems and builds special sites.' },
    tru: { short: 'PUBLICITY', name: 'PUBLICITY',   does: 'Publicity cards. They come from what happens in the war, not from you.' },
    hum: { short: 'PERSONNEL', name: 'PERSONNEL',   does: 'Who the colonies send: volunteers or conscripts.' },
    emp: { short: 'LOGISTICS', name: 'LOGISTICS',    does: 'Decides which war front the work and supply flow to.' },
    uni: { short: 'RATINGS',  name: 'RATINGS',      does: 'The standing of the war, and of your brand.' },
  },
  // The three war fronts, in the order they are played each round. On each front the enemy acts first, then you.
  // `deg` is where the front lies on the map (screen degrees: 0 is east, 90 is south).
  // `loot` is the front's own resource: you win some with every victory there, and spend it on special sites.
  fronts: [
    { f: 'molt',   name: 'EASTERN FRONT',  short: 'EAST',  deg: 330, loot: 'FUEL', lootShort: 'FUEL', dep: 'BIOMASS' },
    { f: 'foundry', name: 'WESTERN FRONT',  short: 'WEST',  deg: 210, loot: 'AMMO', lootShort: 'AMMO', dep: 'METALS' },
    { f: 'talon',    name: 'SOUTHERN FRONT', short: 'SOUTH', deg: 90,  loot: 'TECH', lootShort: 'TECH', dep: 'BIO-TECH' },
  ],
  color: { fed: '#7fe9e0', molt: '#ff9a3d', foundry: '#ff6a4d', talon: '#b58cff', amber: '#f5d547' },

  // The map: rings of systems round the capital, more on each ring going out. `ring[i]` is systems per front on ring i+1.
  // Lanes are left out on purpose, so there are dead ends; where two fronts meet most rings are joined.
  // 253 systems: eleven rings, 84 a front. Each front is cut into sectors: bands of rings (`band`: the last ring of each
  // band), each split round the front into `slice` sectors. The systems round the capital are the Core.
  map: { ring: [2, 3, 4, 5, 6, 7, 8, 9, 11, 14, 15], radius: [0.1, 0.178, 0.256, 0.334, 0.412, 0.49, 0.568, 0.646, 0.724, 0.802, 0.88], second: 0.12, around: 0.32, across: 0.6,
    cross: [1, 3, 6, 9], band: [2, 4, 6, 8, 9, 10, 11], slice: [1, 2, 2, 3, 2, 3, 3] },
  // Holding every system of a sector, all linked to the capital: its systems pay more and each has more hit points.
  // An enemy that holds a whole sector gets the hit points too.
  sector: { yield: 0.25, fort: 1 },
  // A fleet travels this many lanes a round through systems its side holds. An enemy arrives already holding the outer
  // rings of its front (`arriveRing` and beyond), and its home is harder for every `homePer` systems it holds.
  fleetRange: 4, arriveRing: 9, homePer: 4,

  start: { res: { fuel: 9, ammo: 6, tech: 0, army: 9 }, fleets: [3, 2, 2, 2] },   // ships: at the capital, then one fleet on each front
  resMax: 30,

  // The worlds inside each star system. A world pays its resource each round while its system is linked to the
  // capital, and every few worlds of a kind put a card of that kind in your battle deck.
  worlds: {
    capital:  { name: 'CAPITAL WORLD',  col: '#7fe9e0', text: 'Your headquarters.' },
    refinery: { name: 'GAS REFINERY',   col: '#d9a45b', res: 'fuel', y: 0.065, card: 'burn',    yard: 'Ships built here cost no fuel.' },
    forge:    { name: 'FORGE WORLD',    col: '#c8643c', res: 'ammo', y: 0.05, card: 'armour',  yard: 'Ships built here cost no ammunition.' },
    colony:   { name: 'COLONY',         col: '#5fa8d8', res: 'army', y: 0.045, card: 'drop',    yard: 'Ships built here cost no troops.' },
    fortress: { name: 'FORTRESS WORLD', col: '#9aa7a0', fort: 2,     card: 'bulwark', yard: 'Adds 2 to the system\'s defence.' },
    barren:   { name: 'BARREN WORLD',   col: '#6f6a62' },
  },
  capitalYield: { fuel: 1.5, ammo: 1.0, tech: 0.15, army: 1.2 },
  fort: { capital: 16, sys: 3 },      // hit points a system of yours has by itself, with no fleet there
  garr: { sys: 2, home: 9, fortress: 2 },   // the same for an enemy system

  // ---------- fleets ----------
  // One ship is 3 hit points and 1 point of fire each round of a battle. A fleet may travel any distance through
  // systems you hold that are joined by lanes, once a round.
  ship: { hp: 3, cost: { fuel: 3, ammo: 2, army: 2 } },
  cut: 0.5,                 // a system cut off from the capital defends at half and pays nothing

  // Arrival: round, plus or minus `vary`. The warning comes `warn` rounds before.
  arrive: { molt: { round: 2, vary: 0 }, foundry: { round: 4, vary: 1 }, talon: { round: 7, vary: 1 } },
  warn: 2,
  // Enemy behaviour. Ships gather at its home by themselves: build + per × systems held + ramp × round each turn.
  // Its one action a turn is to attack with a fleet, or to bring a fleet up to the line. `aggr` is how much more
  // than the defence it wants before it attacks; after `patience` turns of waiting it attacks anyway.
  enemy: {
    molt:   { init: [3, 2], build: 0.7, per: 0.014, ramp: 0.005, send: 2, aggr: 0.9,  text: 'Attacks often, with small fleets.' },
    foundry: { init: [5],    build: 0.7, per: 0.014, ramp: 0.005, send: 4, aggr: 1.3,  text: 'Gathers a heavy fleet before it strikes.' },
    talon:    { init: [3, 2], build: 0.7, per: 0.014, ramp: 0.005, send: 3, aggr: 1.05, text: 'Its cards slip past your defences.' },
  },
  patience: 2,
  loot: { attack: 2, defend: 1, home: 4 },   // front resource won with each victory

  // ---------- battles: the card game ----------
  // When fleets meet, each side draws `hand` cards at random from its battle deck. Each round both sides play one
  // card, then every ship fires. Hit points fall until one side has none. When the cards run out, the guns decide.
  // atk: damage added to your ships' fire. block: damage stopped this round. heal: hit points restored.
  // pierce: ignores the other side's block. sap: the other side's ships fire this much less for the rest of the battle.
  // Publicity cards are propaganda: used up when played. If both sides play propaganda in the same round, the stronger
  // (`power`) takes the other's card for its own deck and cancels it.
  // `engage`: rounds in one engagement. If neither side is out of hit points by then, the fight for the system goes on next
  // round: the fleets stay where they are and the damage stays done. `press`: pay fuel to fight on for more rounds now.
  // `repair`: hit points a system's own defences win back each round.
  // ---------------------------------------------------------------- THE ENEMY RUNS ON THE SAME THINGS YOU DO (0.11)
  // Each enemy has stations and bases of its own, on its own systems, and they are what it grows by. Its yards (its home,
  // and `yard` ships a round for every station linked to it) can build only what its supplies allow (a little from every
  // system, `perBase` from every base). New ships come out at its yards in turn, so a station near the line feeds the
  // line. It raises a new post every foundEvery rounds, up to one for every perSystems systems it holds: stations near
  // the fighting, bases deep behind it. Its stations add stationFort to their system. A post changes hands with its
  // system, at its lowest level and not in profit. `level` is the campaign's difficulty: it scales what they build.
  foe: { home: 0.72, yard: 0.27, supply: { base: 0.65, per: 0.015, perBase: 0.27 }, foundEvery: 5, firstAfter: 3, perSystems: 5, stationFort: 2,
         level: { easy: 0.75, normal: 1, hard: 1.25, brutal: 1.5 } },
  // ---------------------------------------------------------------- YOUR POSTS IN THE FIGHT (0.12)
  // A post helps a fight at its own system and at the systems one link away. In a card battle: a base adds baseFort
  // hit points per charter to its own system, and each station next door adds coverFort (coverMax at most). On the
  // ground: the nearest base puts a garrison on site (garrisonPer more troops per charter), the nearest station sends
  // stationLives more reinforcements per tier, and ratings add or take ratLives (high or low).
  // A POST UNDER ATTACK: when the enemy comes for a system with your base or your station, the ground fight there is
  // the defence and evacuation of that post. Win it and `evac` troops for every level of the posts are brought out
  // to fight on, and the rescue is worth `evacRatings` if it was aired.
  support: { baseFort: 1, coverFort: 1, coverMax: 2, garrisonPer: 2, stationLives: 2, ratLives: 3, evac: 2, evacRatings: 1 },
  // ---------------------------------------------------------------- WHAT EACH POST IS FOR (0.10)
  // The base trains the troops: every base charter on a linked system adds `train` troops each round, every station tier makes stationAmmo ammunition, and
  // worlds by themselves give only `worldTroops` of what they used to. The station builds the ships: a ship can only be
  // laid down at the capital or over a station. The ground pays in the enemy's own material: a win there brings
  // groundLoot x the share of your squad still standing, on top of what any victory brings.
  post: { train: { army: 0.9 }, stationAmmo: 0.35, worldTroops: 0.7, yardNeedsStation: true, groundLoot: 3 },
  // ---------------------------------------------------------------- FLEETS: MAKEUP, WEAR AND UPKEEP (0.9)
  // A fleet is still a number of ships, and that number still decides its fights. On top of it, kept simple:
  // MAKEUP: every ship is one of three roles, and a fleet's makeup is its shares of them. The shares give modest buffs:
  //   gunships  attack fire x (1 + gun x their share)       escorts  hit points when defending x (1 + esc x their share)
  //   tenders   wear taken x (1 - ten x their share), and tenMend x their share mended every round wherever the fleet is
  // New ships come out as the yard's standing order (the Fleet Office sets it): balanced, or all of one role.
  // WEAR: 0 to 100. Moving, attacking and defending add to it; fire falls by `fire` of itself at full wear. It is mended
  // at the capital, over a station (per tier) or a base (per charter), each round the fleet ends there.
  // UPKEEP: every ship over `free` costs `per` fuel a round. Fuel that cannot be paid is taken as wear on every fleet.
  // START: the campaign's opening. `fleets` scales the opening fleets; `posts` is how many stations and bases are
  // already running beside the capital.
  fleet: {
    roles: [{ id: 'gun', name: 'GUNSHIPS', text: 'Hit harder when you attack.' }, { id: 'esc', name: 'ESCORTS', text: 'Stand longer when you defend.' }, { id: 'ten', name: 'TENDERS', text: 'Wear less, and mend on the move.' }],
    buff: { gun: 0.3, esc: 0.3, ten: 0.6, tenMend: 6 },
    wear: { move: 6, attack: 14, defend: 8, fire: 0.3, unpaid: 5 },
    repair: { capital: 25, station: 15, base: 6 },
    upkeep: { free: 10, per: 0.06 },
    start: { fleets: { lean: 0.5, standard: 1, strong: 2 }, posts: { none: 0, some: 1, many: 3 } },
  },
  // ---------------------------------------------------------------- RATINGS (0.8): the brand's standing, and the fleet's morale
  // 0 to 100. Hard to raise, easy to lose. What is seen raises it: systems taken and held, and above all fights won on the
  // ground, where the cameras are (a card battle is a press release). Parades at bases and galas at stations in profit
  // raise it for a price, each post once every show.every rounds. Only ONE ground fight a round is the broadcast: the
  // first you fight; the rest are not aired. Losses lower it, and above `settle` it slips back by `drift` of the
  // distance every round as the audience moves on. Effects: at `high` and above, output and the posts' pay rise; under `low` they fall;
  // under `sack` they fall hard, and sackRounds rounds in a row down there and the board replaces you.
  // THE ENEMY'S PLANS (0.17). Every `every` rounds each enemy settles on a plan, and the plan changes what it does:
  //   raid   strikes often at whatever is weakest (aggr lower, a bonus for weak targets)
  //   siege  masses before it strikes, and goes for systems with your stations and bases
  //   push   drives for your capital: the nearer a target is to it, the better
  //   dig    holds its ground and raises posts twice as fast
  // A plan is never announced. It can be worked out from what the enemy does on the map. It is SHOWN only while you
  // have intelligence on that enemy: for `leakRounds` rounds after you buy a leak (`leak` tech), after a flawless aired
  // ground win against it, and all the time your ratings are high. `w` is how each enemy leans.
  plans: {
    every: 8, leak: 3, leakRounds: 4,
    raid:  { name: 'RAID',  text: 'Many small strikes at your weakest systems.', aggr: 0.82, weak: 0.5 },
    siege: { name: 'SIEGE', text: 'Masses its fleets, then goes for your stations and bases.', aggr: 1.25, post: 0.3 },
    push:  { name: 'PUSH',  text: 'Drives straight for your headquarters.', aggr: 1.0, depth: 0.05 },
    dig:   { name: 'DIG IN', text: 'Holds its ground and builds.', aggr: 1.5, found: 0.5 },
    w: { molt: { raid: 3, push: 2, siege: 1, dig: 1 }, foundry: { siege: 3, dig: 2, push: 1, raid: 1 }, talon: { raid: 2, push: 2, siege: 2, dig: 1 } },
  },
  // CAMPAIGNS (0.15): an operation over several rounds, with a goal, a stake and a prize. One runs at a time. Three are
  // on offer; launching one pays its stake. Reach the goal inside its rounds and the prize is yours; run out of rounds
  // (or, for a holding campaign, lose a system) and it fails and costs ratings. New offers are dealt when one ends.
  // goal: take n systems | hold (lose no system) | post (take an enemy station or base) | aired (win n aired ground fights)
  campaigns: [
    { id: 'spear', name: 'OPERATION SPEARHEAD', art: 'volley',   text: 'Take 4 systems.',                    rounds: 6, stake: { fuel: 4, ammo: 4 }, goal: { type: 'take', n: 4 },  prize: { rat: 5, ships: 3 },  fail: 4 },
    { id: 'wall',  name: 'NOT ONE WORLD',       art: 'bulwark',  text: 'Lose no system for 6 rounds.',       rounds: 6, stake: { army: 4 },          goal: { type: 'hold' },        prize: { rat: 6, cr: 400 },   fail: 4 },
    { id: 'head',  name: 'CUT OFF THE HEAD',    art: 'siege',    text: 'Take an enemy station or base.',     rounds: 8, stake: { fuel: 3, ammo: 5 }, goal: { type: 'post', n: 1 },  prize: { rat: 4, tech: 6 },   fail: 3 },
    { id: 'prime', name: 'PRIME TIME',          art: 'newsreel', text: 'Win 3 fights on camera.',            rounds: 6, stake: { ammo: 4 },          goal: { type: 'aired', n: 3 }, prize: { rat: 8, cr: 600 },   fail: 4 },
    { id: 'sweep', name: 'THE BIG PUSH',        art: 'burn',     text: 'Take 8 systems.',                    rounds: 10, stake: { fuel: 8, ammo: 6, army: 4 }, goal: { type: 'take', n: 8 }, prize: { rat: 8, ships: 5, cr: 500 }, fail: 6 },
  ],
  // SPONSOR STUNTS: the one aired ground fight of a round comes with a stunt from the sponsors. Win AND pull it off for
  // `stunt` more ratings. Each is judged from the mission's own result.
  stunts: [
    { id: 'speed',  name: 'SPEED RUN',        text: 'Win in under 8 minutes.',            test: (r) => r.minutes < 8 },
    { id: 'count',  name: 'BODY COUNT',       text: 'Win with 120 kills or more.',        test: (r) => r.kills >= 120 },
    { id: 'sweep',  name: 'CLEAN SWEEP',      text: 'Win and destroy every enemy base.',  test: (r) => r.baseTotal > 0 && r.bases >= r.baseTotal },
    { id: 'clean',  name: 'NOT A SCRATCH',    text: 'Win and lose no more than 2 lives.', test: (r) => r.livesMax - r.livesLeft <= 2 },
    { id: 'star',   name: 'STAR OF THE SHOW', text: 'Win with your ship doing half the damage.', test: (r) => r.share && r.share.player >= 0.5 },
  ],
  // ---------------------------------------------------------------- THE NETWORK (0.44): RATINGS AS A SYSTEM
  // The war is a show and the show has backers. A SPONSOR signs for a run of rounds, pays credits every round (more when ratings
  // are high), and wants one thing on air in that time. Do it and they renew, and ratings rise; miss it, or let ratings sit under
  // their floor, and they walk and say why in public. You have one slot, a second with two posts in profit (the affiliates), a
  // third while ratings are high. Every post in profit also sends footage: a little ratings each round. A fight on air draws more
  // or fewer viewers by what happens in it. Every point gained or lost is written in the ratings ledger, so you can see why.
  sponsors: [
    { id: 'cola',   name: 'VICTORY COLA',       line: 'Tastes like winning. Mostly.',          pay: 60,  floor: 30, want: { type: 'aired', n: 2 }, text: 'Win 2 fights on camera.',         rounds: 6, miss: 3 },
    { id: 'burger', name: 'BIG VICTORY BURGER', line: 'Two patties. One front.',               pay: 50,  floor: 25, want: { type: 'show', n: 1 },  text: 'Put on a parade or a gala.',      rounds: 8, miss: 2 },
    { id: 'arms',   name: 'HALBERD ARMAMENTS',  line: 'We make the bang. You make the news.',  pay: 90,  floor: 45, want: { type: 'stunt', n: 1 }, text: 'Pull off a sponsor stunt, live.', rounds: 6, miss: 4 },
    { id: 'ins',    name: 'EVERSURE MUTUAL',    line: 'Covered against everything but this.',  pay: 70,  floor: 40, want: { type: 'hold' },        text: 'Lose no system.',                 rounds: 5, miss: 4 },
    { id: 'realty', name: 'NEW HORIZON HOMES',  line: 'Lovely worlds. Recently available.',    pay: 80,  floor: 35, want: { type: 'take', n: 3 },  text: 'Take 3 systems.',                 rounds: 6, miss: 3 },
    { id: 'nine',   name: 'CHANNEL NINE ORBIT', line: 'All war, all the time.',                pay: 110, floor: 60, want: { type: 'aired', n: 4 }, text: 'Win 4 fights on camera.',         rounds: 8, miss: 5 },
  ],
  network: { offers: 3, redeal: 6, renew: 2, walkRounds: 2, post: 0.3, air: 0.1, postMax: 3, aud: { base: 0.6, span: 0.8 } },
  ratings: { start: 50, stunt: 3, settle: 40, drift: 0.12, take: 1, takeHome: 15, hold: 1, repelled: -1, fall: -1, postLost: -3, found: 1,
             ground: { win: 3, flawless: 3, flawlessAt: 0.8, loss: -2 },
             show: { gain: 4, every: 8, cost: { base: { army: 3 }, station: { fuel: 3 } } },
             high: 75, low: 25, sack: 10, sackRounds: 5, yield: { high: 1.1, low: 0.8, sack: 0.6 }, pay: { min: 0.5, max: 1.5 } },
  // ---------------------------------------------------------------- THE WAR CHEST, DEPOSITS AND THE ARMOURY (0.5)
  // One currency for the whole war: credits (CR), kept in the war chest. The ground pays into it; so does every station
  // and base that is running in profit, every round; so does every sector held whole. It buys everything in the armoury.
  chest: { post: 12, sector: 2 },             // CR a round: for each tier or charter of a post in profit; for each whole sector
  // Deposits: about `share` of the systems on a front hold that front's material (biomass on the east, metals on the west,
  // bio-tech in the south; every enemy home has one). A base on a deposit lifts `per` a round, `profit` more
  // when it is running in profit.
  deposit: { share: 0.3, per: 1, profit: 1 },
  // Armoury rank: one for every tier of a station and every charter of a base that is linked AND running in profit.
  rankMax: 9,
  // The shelves that are not the ground's (the ground's is Orbital Fury's own list). Each level: credits, a material,
  // and the rank that opens it. `mat` is the front whose material it takes.
  shelf: {
    station: [
      { id: 's_grant', name: 'FOUNDING GRANT',  text: 'Every new station opens with more credits.',        mat: 'foundry', lv: [[400, 3, 0], [900, 6, 2], [1800, 12, 4]], per: 600 },
      { id: 's_trade', name: 'TRADE CHARTER',   text: 'A station in profit pays more into the war chest.', mat: 'foundry', lv: [[600, 4, 1], [1400, 8, 3], [2800, 14, 6]], per: 10 },
      { id: 's_guns',  name: 'DEFENCE GRID',    text: 'Each station tier adds one more hit point.',        mat: 'foundry', lv: [[1200, 8, 2], [3200, 16, 5]], per: 1 },
    ],
    base: [
      { id: 'b_grant', name: 'FOUNDING STORES', text: 'Every new base lands with more supplies.',          mat: 'molt', lv: [[400, 3, 0], [900, 6, 2], [1800, 12, 4]], per: 150 },
      { id: 'b_rigs',  name: 'DEEP RIGS',       text: 'A base on a deposit lifts one more a round.',       mat: 'molt', lv: [[700, 4, 1], [1600, 8, 3], [3000, 14, 6]], per: 1 },
      { id: 'b_yard',  name: 'WORKS',           text: 'Each base charter adds more to its system\'s output.', mat: 'molt', lv: [[1200, 8, 2], [3200, 16, 5]], per: 0.1 },
    ],
    fleet: [
      { id: 'f_hold',  name: 'DEPOTS',          text: 'Hold more fuel, armies and drops.',                 mat: 'talon', lv: [[500, 3, 0], [1200, 6, 2], [2400, 12, 4]], per: 5 },
      { id: 'f_range', name: 'LONG DRIVES',     text: 'Fleets reach one system further.',                  mat: 'talon', lv: [[1500, 8, 3], [4000, 16, 6]], per: 1 },
      { id: 'f_hand',  name: 'BATTLE STAFF',    text: 'One more card in hand in every battle.',            mat: 'talon', lv: [[5000, 20, 7]], per: 1 },
    ],
  },
  battle: { hand: 3, maxRounds: 12, engage: 3, press: { fuel: 3, rounds: 2 }, repair: 1 },
  // A battle fought on the ground is one hard engagement, not the whole war for the system: winning it does the damage of a
  // full engagement and half again, and spares your own side by how many lives were left.
  groundWin: { deal: 0.7, take: 0.9 }, groundLoss: { deal: 0.3, take: 1.2 },
  // The kinds of ground mission: what you are sent to do when you attack a system, and when you defend one.
  groundObj: { atk: ['fortress', 'nuke'], def: ['evac', 'vip'] },
  bcards: {
    // every fleet carries these
    volley:  { name: 'FULL VOLLEY',     kind: 'fleet', atk: 2, text: '', when: 'Hit harder this round.' },
    brace:   { name: 'BRACE',           kind: 'fleet', block: 3, text: '', when: 'Play it when a big hit is coming.' },
    // from the worlds you hold
    burn:    { name: 'AFTERBURN RUN',   kind: 'world', atk: 4, text: 'Refineries', when: 'Your biggest plain hit.' },
    armour:  { name: 'ARMOURED PUSH',   kind: 'world', atk: 2, block: 2, text: 'Forge worlds', when: 'Hit and block at once.' },
    drop:    { name: 'VANGUARD DROP',   kind: 'world', atk: 1, heal: 3, text: 'Colonies', when: 'Play it when you are hurt.' },
    bulwark: { name: 'BULWARK',         kind: 'world', block: 5, text: 'Fortress worlds', when: 'Stops almost any hit.' },
    // from special sites
    railgun: { name: 'PROTOTYPE RAILGUN', kind: 'site', atk: 6, pierce: true, text: 'Cannot be blocked', when: 'Goes straight through a block.' },
    acid:    { name: 'ACID WARHEADS',  kind: 'site', atk: 3, sap: 1, text: 'Enemy fire −1', when: 'Their guns hit softer for the rest of the fight.' },
    mirror:  { name: 'LIVING MIRROR',    kind: 'site', block: 99, reflect: 3, text: 'Turns 3 back', when: 'Blocks everything and hits back.' },
    // Publicity Office
    newsreel:{ name: 'VICTORY NEWSREEL', kind: 'truth', power: 2, heal: 4, atk: 1, text: 'System taken', when: 'A big repair. You earn it by taking a system.' },
    heroes:  { name: 'HEROES OF THE LINE', kind: 'truth', power: 3, block: 3, atk: 2, text: 'System held', when: 'Hit and block. You earn it by holding a system.' },
    lastStand: { name: 'NOT ONE STEP BACK', kind: 'truth', power: 4, block: 4, heal: 3, text: 'System lost', when: 'Block and repair. You get it when a system falls.' },
    // the enemies
    rush:    { name: 'MOLT RUSH',      kind: 'foe', atk: 3, text: '', when: 'A fast hit.' },
    frenzy:  { name: 'FEEDING FRENZY',  kind: 'foe', atk: 2, heal: 2, text: '', when: 'Hits you and mends itself.' },
    siege:   { name: 'SIEGE GUNS',      kind: 'foe', atk: 5, text: '', when: 'A very big hit. Block it.' },
    plating: { name: 'IRON PLATING',    kind: 'foe', block: 4, text: '', when: 'Blocks your hit.' },
    phase:   { name: 'PHASE STRIKE',    kind: 'foe', atk: 3, pierce: true, text: 'Cannot be blocked', when: 'Goes straight through your block.' },
    fog:     { name: 'MIND FOG',        kind: 'foe', block: 2, sap: 1, text: 'Your fire −1', when: 'Your guns hit softer for the rest of the fight.' },
    dread:   { name: 'DREAD BROADCAST', kind: 'truth', power: 3, atk: 2, sap: 1, text: 'Your fire −1', when: 'Hits you and weakens your guns.' },
    triumph: { name: 'HIVE TRIUMPHANT', kind: 'truth', power: 2, heal: 4, text: '', when: 'A big repair for the enemy.' },
  },
  // What every side's deck starts from, before worlds, sites and propaganda are added.
  baseDeck: { fed: ['volley', 'volley', 'volley', 'brace', 'brace'], molt: ['volley', 'volley', 'rush', 'rush', 'frenzy'],
    foundry: ['volley', 'volley', 'siege', 'plating', 'plating'], talon: ['volley', 'volley', 'phase', 'phase', 'fog'] },
  // An enemy adds one of its own card for every `per` systems it holds, up to `max`.
  foeGrow: { molt: 'rush', foundry: 'siege', talon: 'phase', per: 3, max: 4 },
  worldCard: { per: 8, max: 3 },      // you add one world card for every `per` worlds of that kind you hold, up to `max`
  siteMax: 2,                         // sites of one kind you can have
  truthMax: 4,                        // propaganda cards a side can hold

  // Special sites: built on a system of yours with a front's own resource. Each puts two copies of a card nobody
  // else has into your battle deck. A site is lost with its system.
  sites: {
    testing: { name: 'TESTING CENTRE', loot: 'foundry', cost: 6, card: 'railgun', text: 'Two PROTOTYPE RAILGUN cards.' },
    biolab:  { name: 'WARHEAD LAB',      loot: 'molt',   cost: 6, card: 'acid',    text: 'Two ACID WARHEADS cards.' },
    array:   { name: 'GROWTH VAT',    loot: 'talon',    cost: 6, card: 'mirror',  text: 'Two LIVING MIRROR cards.' },
  },

  // ---------- what the offices can do (none of these use up your decision) ----------
  trade: { give: 3, get: 2 },                         // (the old straight swap; the market below replaced it on the screen)
  // THE THREE PRODUCTS, AND THE MARKET (0.14). The war runs on fuel, ammunition and tech. Each comes mostly from one
  // front: fuel from the biomass of the east, ammunition from the metals of the west, tech from the bio-tech of the
  // south. A deposit, a win or a special site on a front deals in that front's product. Troops are one number, trained
  // by bases. Credits buy and sell the three products at the market: `base` is the price of one; you buy at the price
  // plus `spread` and sell at it less `spread`; each purchase raises that price by `step` of itself and each sale lowers
  // it; every round a price drifts back `settle` of the way to its base. It stays between `min` and `max` times base.
  market: { base: { fuel: 30, ammo: 40, tech: 70 }, spread: 0.25, step: 0.05, settle: 0.1, min: 0.5, max: 3 },
  product: { molt: 'fuel', foundry: 'ammo', talon: 'tech' },
  // Taking a fight down to the ground costs ammunition: the ship's guns have to be fed.
  groundAmmo: 2,
  develop: { max: 2, fuel: 3, army: 2, mult: 0.5 },   // Expansion: cost × (level + 1); each level adds 50% to the system's output
  policy: {                                           // Humanity: who the colonies send
    volunteer: { name: 'VOLUNTEERS', text: 'Fewer troops. More hands in the works: more ammunition.', troops: 0.8, forge: 1.25 },
    balanced:  { name: 'BALANCED',   text: 'No change.', troops: 1, forge: 1 },
    conscript: { name: 'CONSCRIPTION', text: 'More troops. The works go short of hands: less ammunition.', troops: 1.3, forge: 0.75 },
  },
  priority: { fort: 2, yield: 1.25, fuel: 1 },
  // ---------- GALACTIC COMMAND: how the theatres feed each other ----------
  // A station over a system adds hit points to it for each tier and makes ships cheaper to build there. A base on its key
  // world raises what the system pays for each rank. Both are lost with the system.
  link: { stationFort: 2, stationFuel: 1, baseYield: 0.35, stationMax: 4, baseMax: 4,
    // what they cost to found, and what else they are worth as they grow
    found: { station: { fuel: 8, ammo: 4 }, base: { army: 8, fuel: 2 } },
    creditShare: 0.25,    // the share of what a ground battle earns that reaches the armoury (a level 3 mission earns 3,000 to 5,000)
    capPer: 1, capMax: 60,            // every station tier and base charter raises how much of each resource you can hold
    sectorFortAt: 2,      // a station of this tier or more adds a hit point to every system of yours in its sector
    threatAt: [2, 4],     // a station of these tiers in the sector takes one, then two, off the ground threat there
    shipAt: 3, shipEvery: 6,   // a base of this charter or more sends a ship to its system every so many rounds
    // the ground gets harder the deeper into an enemy's rings you fight, and the more systems that enemy holds
    depthPer: 3, holdPer: 30,
    // a battle fought on the ground: which enemy and ground it is, and how hard, from the odds on the map
    foe: { molt: 'bugs', foundry: 'bots', talon: 'lizards' },
    biome: { refinery: 'desert', forge: 'moon', colony: 'grass', fortress: 'ice', barren: 'moon', capital: 'grass' },
    level: { min: 1, max: 8 } },        // Employment: the priority front defends better, pays more, and builds ships for 1 less fuel
};
// The three enemies, in the order their fronts are played.
C.factions = C.fronts.map(fr => fr.f);
