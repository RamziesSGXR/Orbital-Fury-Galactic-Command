// Every number and every name in the game lives here, so the prototype can be retuned or renamed in one place.
export const VERSION = '0.5.0';

export const C = {
  names: {
    game: 'GALACTIC COMMAND',
    fed: 'Federation',
    capital: 'Aurelia',
    drop: 'VANGUARD', army: 'ARMY', fuel: 'FUEL',
    factions: { swarm: 'The Swarm', foundry: 'The Foundry', veil: 'The Veil' },
    homes: { swarm: 'Nest Prime', foundry: 'Anvil', veil: 'Lumen Null' },
    planets: ['Tarsen', 'Okoro', 'Vell', 'Duskar', 'Imrie', 'Pallas', 'Korvan', 'Sable', 'Ythe', 'Marrow', 'Calder', 'Nimbus', 'Orrin', 'Brakk', 'Solen',
      'Vantage', 'Kessrin', 'Halcyon', 'Dray', 'Umber', 'Lyss', 'Penumbra', 'Garnet', 'Ostra', 'Javel', 'Quill', 'Rookfall', 'Stenn', 'Wend', 'Zorya',
      'Thane', 'Corvale', 'Isk', 'Meru', 'Aldous', 'Brine', 'Cassel', 'Dunmore', 'Eris Gap', 'Fenwick', 'Galt', 'Hollin', 'Ixion', 'Jorvik', 'Kael',
      'Lorne', 'Mirel', 'Noss', 'Orlan', 'Pryce', 'Quenby', 'Rhys', 'Sorrel', 'Tamsin', 'Ulric', 'Varda', 'Wythe', 'Xanthe', 'Yarrow', 'Zephyr',
      'Ashby', 'Bexley', 'Corin', 'Dace', 'Elsin'],
  },
  // The ministries, as in FOB Super Commander. Each is a button; `does` is the one line shown under its name.
  ministries: {
    int: { short: 'INTEL',    name: 'INTELLIGENCE', does: 'Reports, warnings and suggested actions.' },
    def: { short: 'DEFENCE',  name: 'DEFENCE',      does: 'Your fleets, and the battle deck they fight with.' },
    pro: { short: 'PROSPER',  name: 'PROSPERITY',   does: 'Manages what you have: stock, income, exchange.' },
    exp: { short: 'EXPAND',   name: 'EXPANSION',    does: 'Grows what you have: develops systems and builds special sites.' },
    tru: { short: 'TRUTH',    name: 'TRUTH',        does: 'Propaganda cards. They come from what happens in the war, not from you.' },
    hum: { short: 'HUMANITY', name: 'HUMANITY',     does: 'Regulates the population: volunteers or conscripts.' },
    emp: { short: 'EMPLOY',   name: 'EMPLOYMENT',   does: 'Decides which war front the work and supply flow to.' },
    uni: { short: 'UNITY',    name: 'UNITY',        does: 'The standing of the war.' },
  },
  // The three war fronts, in the order they are played each round. On each front the enemy acts first, then you.
  // `deg` is where the front lies on the map (screen degrees: 0 is east, 90 is south).
  // `loot` is the front's own resource: you win some with every victory there, and spend it on special sites.
  fronts: [
    { f: 'swarm',   name: 'EASTERN FRONT',  short: 'EAST',  deg: 330, loot: 'OIL', lootShort: 'OIL' },
    { f: 'foundry', name: 'WESTERN FRONT',  short: 'WEST',  deg: 210, loot: 'METALS', lootShort: 'METAL' },
    { f: 'veil',    name: 'SOUTHERN FRONT', short: 'SOUTH', deg: 90,  loot: 'TECHNOLOGY PARTS', lootShort: 'TECH' },
  ],
  color: { fed: '#7fe9e0', swarm: '#ff9a3d', foundry: '#ff6a4d', veil: '#b58cff', amber: '#f5d547' },

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

  start: { res: { fuel: 9, drop: 6, army: 9 }, fleets: [3, 2, 2, 2] },   // ships: at the capital, then one fleet on each front
  resMax: 30,

  // The worlds inside each star system. A world pays its resource each round while its system is linked to the
  // capital, and every few worlds of a kind put a card of that kind in your battle deck.
  worlds: {
    capital:  { name: 'CAPITAL WORLD',  col: '#7fe9e0', text: 'The seat of the Federation.' },
    refinery: { name: 'GAS REFINERY',   col: '#d9a45b', res: 'fuel', y: 0.13, card: 'burn',    yard: 'Ships built here cost no fuel.' },
    forge:    { name: 'FORGE WORLD',    col: '#c8643c', res: 'army', y: 0.09, card: 'armour',  yard: 'Ships built here cost no Army.' },
    colony:   { name: 'COLONY',         col: '#5fa8d8', res: 'drop', y: 0.05, card: 'drop',    yard: 'Ships built here cost no Vanguard.' },
    fortress: { name: 'FORTRESS WORLD', col: '#9aa7a0', fort: 2,     card: 'bulwark', yard: 'Adds 2 to the system\'s defence.' },
    barren:   { name: 'BARREN WORLD',   col: '#6f6a62' },
  },
  capitalYield: { fuel: 1.5, army: 1.2, drop: 0.5 },
  fort: { capital: 16, sys: 3 },      // hit points a system of yours has by itself, with no fleet there
  garr: { sys: 2, home: 9, fortress: 2 },   // the same for an enemy system

  // ---------- fleets ----------
  // One ship is 3 hit points and 1 point of fire each round of a battle. A fleet may travel any distance through
  // systems you hold that are joined by lanes, once a round.
  ship: { hp: 3, cost: { fuel: 3, army: 3, drop: 2 } },
  cut: 0.5,                 // a system cut off from the capital defends at half and pays nothing

  // Arrival: round, plus or minus `vary`. The warning comes `warn` rounds before.
  arrive: { swarm: { round: 2, vary: 0 }, foundry: { round: 4, vary: 1 }, veil: { round: 7, vary: 1 } },
  warn: 2,
  // Enemy behaviour. Ships gather at its home by themselves: build + per × systems held + ramp × round each turn.
  // Its one action a turn is to attack with a fleet, or to bring a fleet up to the line. `aggr` is how much more
  // than the defence it wants before it attacks; after `patience` turns of waiting it attacks anyway.
  enemy: {
    swarm:   { init: [3, 2], build: 0.7, per: 0.014, ramp: 0.005, send: 2, aggr: 0.9,  text: 'Attacks often, with small fleets.' },
    foundry: { init: [5],    build: 0.7, per: 0.014, ramp: 0.005, send: 4, aggr: 1.3,  text: 'Gathers a heavy fleet before it strikes.' },
    veil:    { init: [3, 2], build: 0.7, per: 0.014, ramp: 0.005, send: 3, aggr: 1.05, text: 'Its cards slip past your defences.' },
  },
  patience: 2,
  loot: { attack: 2, defend: 1, home: 4 },   // front resource won with each victory

  // ---------- battles: the card game ----------
  // When fleets meet, each side draws `hand` cards at random from its battle deck. Each round both sides play one
  // card, then every ship fires. Hit points fall until one side has none. When the cards run out, the guns decide.
  // atk: damage added to your ships' fire. block: damage stopped this round. heal: hit points restored.
  // pierce: ignores the other side's block. sap: the other side's ships fire this much less for the rest of the battle.
  // Truth cards are propaganda: used up when played. If both sides play propaganda in the same round, the stronger
  // (`power`) takes the other's card for its own deck and cancels it.
  // `engage`: rounds in one engagement. If neither side is out of hit points by then, the fight for the system goes on next
  // round: the fleets stay where they are and the damage stays done. `press`: pay fuel to fight on for more rounds now.
  // `repair`: hit points a system's own defences win back each round.
  // ---------------------------------------------------------------- THE WAR CHEST, DEPOSITS AND THE ARMOURY (0.5)
  // One currency for the whole war: credits (CR), kept in the war chest. The ground pays into it; so does every station
  // and base that is running in profit, every round; so does every sector held whole. It buys everything in the armoury.
  chest: { post: 30, sector: 2 },             // CR a round: for each tier or charter of a post in profit; for each whole sector
  // Deposits: about `share` of the systems on a front hold that front's material (oil on the east, metals on the west,
  // technology parts in the south; every enemy home has one). A base on a deposit lifts `per` a round, `profit` more
  // when it is running in profit.
  deposit: { share: 0.3, per: 1, profit: 1 },
  // Armoury rank: one for every tier of a station and every charter of a base that is linked AND running in profit.
  rankMax: 9,
  // The shelves that are not the ground's (the ground's is Orbital Fury's own list). Each level: credits, a material,
  // and the rank that opens it. `mat` is the front whose material it takes.
  shelf: {
    station: [
      { id: 's_grant', name: 'FOUNDING GRANT',  text: 'Every new station opens with more credits.',        mat: 'foundry', lv: [[400, 4, 0], [900, 10, 2], [1800, 20, 4]], per: 600 },
      { id: 's_trade', name: 'TRADE CHARTER',   text: 'A station in profit pays more into the war chest.', mat: 'foundry', lv: [[600, 6, 1], [1400, 14, 3], [2800, 28, 6]], per: 10 },
      { id: 's_guns',  name: 'DEFENCE GRID',    text: 'Each station tier adds one more hit point.',        mat: 'foundry', lv: [[1200, 12, 2], [3200, 30, 5]], per: 1 },
    ],
    base: [
      { id: 'b_grant', name: 'FOUNDING STORES', text: 'Every new base lands with more supplies.',          mat: 'swarm', lv: [[400, 4, 0], [900, 10, 2], [1800, 20, 4]], per: 150 },
      { id: 'b_rigs',  name: 'DEEP RIGS',       text: 'A base on a deposit lifts one more a round.',       mat: 'swarm', lv: [[700, 6, 1], [1600, 14, 3], [3000, 28, 6]], per: 1 },
      { id: 'b_yard',  name: 'WORKS',           text: 'Each base charter adds more to its system\'s output.', mat: 'swarm', lv: [[1200, 12, 2], [3200, 30, 5]], per: 0.1 },
    ],
    fleet: [
      { id: 'f_hold',  name: 'DEPOTS',          text: 'Hold more fuel, armies and drops.',                 mat: 'veil', lv: [[500, 4, 0], [1200, 10, 2], [2400, 20, 4]], per: 5 },
      { id: 'f_range', name: 'LONG DRIVES',     text: 'Fleets reach one system further.',                  mat: 'veil', lv: [[1500, 12, 3], [4000, 30, 6]], per: 1 },
      { id: 'f_hand',  name: 'BATTLE STAFF',    text: 'One more card in hand in every battle.',            mat: 'veil', lv: [[5000, 40, 7]], per: 1 },
    ],
  },
  battle: { hand: 3, maxRounds: 12, engage: 3, press: { fuel: 3, rounds: 2 }, repair: 1 },
  // A battle fought on the ground is one hard engagement, not the whole war for the system: winning it does the damage of a
  // full engagement and half again, and spares your own side by how many lives were left.
  groundWin: { deal: 1.0, take: 0.8 }, groundLoss: { deal: 0.3, take: 1.2 },
  // The kinds of ground mission: what you are sent to do when you attack a system, and when you defend one.
  groundObj: { atk: ['fortress', 'nuke'], def: ['evac', 'vip'] },
  bcards: {
    // every fleet carries these
    volley:  { name: 'FULL VOLLEY',     kind: 'fleet', atk: 2, text: '' },
    brace:   { name: 'BRACE',           kind: 'fleet', block: 3, text: '' },
    // from the worlds you hold
    burn:    { name: 'AFTERBURN RUN',   kind: 'world', atk: 4, text: 'Refineries' },
    armour:  { name: 'ARMOURED PUSH',   kind: 'world', atk: 2, block: 2, text: 'Forge worlds' },
    drop:    { name: 'VANGUARD DROP',   kind: 'world', atk: 1, heal: 3, text: 'Colonies' },
    bulwark: { name: 'BULWARK',         kind: 'world', block: 5, text: 'Fortress worlds' },
    // from special sites
    railgun: { name: 'PROTOTYPE RAILGUN', kind: 'site', atk: 6, pierce: true, text: 'Cannot be blocked' },
    acid:    { name: 'ICHOR WARHEADS',  kind: 'site', atk: 3, sap: 1, text: 'Enemy fire −1' },
    mirror:  { name: 'PEARL MIRROR',    kind: 'site', block: 99, reflect: 3, text: 'Turns 3 back' },
    // Ministry of Truth
    newsreel:{ name: 'VICTORY NEWSREEL', kind: 'truth', power: 2, heal: 4, atk: 1, text: 'System taken' },
    heroes:  { name: 'HEROES OF THE LINE', kind: 'truth', power: 3, block: 3, atk: 2, text: 'System held' },
    lastStand: { name: 'NOT ONE STEP BACK', kind: 'truth', power: 4, block: 4, heal: 3, text: 'System lost' },
    // the enemies
    rush:    { name: 'SWARM RUSH',      kind: 'foe', atk: 3, text: '' },
    frenzy:  { name: 'FEEDING FRENZY',  kind: 'foe', atk: 2, heal: 2, text: '' },
    siege:   { name: 'SIEGE GUNS',      kind: 'foe', atk: 5, text: '' },
    plating: { name: 'IRON PLATING',    kind: 'foe', block: 4, text: '' },
    phase:   { name: 'PHASE STRIKE',    kind: 'foe', atk: 3, pierce: true, text: 'Cannot be blocked' },
    fog:     { name: 'MIND FOG',        kind: 'foe', block: 2, sap: 1, text: 'Your fire −1' },
    dread:   { name: 'DREAD BROADCAST', kind: 'truth', power: 3, atk: 2, sap: 1, text: 'Your fire −1' },
    triumph: { name: 'HIVE TRIUMPHANT', kind: 'truth', power: 2, heal: 4, text: '' },
  },
  // What every side's deck starts from, before worlds, sites and propaganda are added.
  baseDeck: { fed: ['volley', 'volley', 'volley', 'brace', 'brace'], swarm: ['volley', 'volley', 'rush', 'rush', 'frenzy'],
    foundry: ['volley', 'volley', 'siege', 'plating', 'plating'], veil: ['volley', 'volley', 'phase', 'phase', 'fog'] },
  // An enemy adds one of its own card for every `per` systems it holds, up to `max`.
  foeGrow: { swarm: 'rush', foundry: 'siege', veil: 'phase', per: 3, max: 4 },
  worldCard: { per: 8, max: 3 },      // you add one world card for every `per` worlds of that kind you hold, up to `max`
  siteMax: 2,                         // sites of one kind you can have
  truthMax: 4,                        // propaganda cards a side can hold

  // Special sites: built on a system of yours with a front's own resource. Each puts two copies of a card nobody
  // else has into your battle deck. A site is lost with its system.
  sites: {
    testing: { name: 'TESTING CENTRE', loot: 'foundry', cost: 6, card: 'railgun', text: 'Two PROTOTYPE RAILGUN cards.' },
    biolab:  { name: 'WARHEAD LAB',      loot: 'swarm',   cost: 6, card: 'acid',    text: 'Two ICHOR WARHEADS cards.' },
    array:   { name: 'OPTICS ARRAY',    loot: 'veil',    cost: 6, card: 'mirror',  text: 'Two PEARL MIRROR cards.' },
  },

  // ---------- what the ministries can do (none of these use up your decision) ----------
  trade: { give: 3, get: 2 },                         // Prosperity: exchange one resource for another
  develop: { max: 2, fuel: 3, army: 2, mult: 0.5 },   // Expansion: cost × (level + 1); each level adds 50% to the system's output
  policy: {                                           // Humanity: who the colonies send
    volunteer: { name: 'VOLUNTEERS', text: 'Colonies send more Vanguard. Forge output falls a little.', drop: 1.4, forge: 0.85, army: 0 },
    balanced:  { name: 'BALANCED',   text: 'No change.', drop: 1, forge: 1, army: 0 },
    conscript: { name: 'CONSCRIPTION', text: 'Each colony also raises Army, and sends fewer volunteers.', drop: 0.5, forge: 1, army: 0.1 },
  },
  priority: { fort: 2, yield: 1.25, fuel: 1 },
  // ---------- GALACTIC COMMAND: how the theatres feed each other ----------
  // A station over a system adds hit points to it for each tier and makes ships cheaper to build there. A base on its key
  // world raises what the system pays for each rank. Both are lost with the system.
  link: { stationFort: 2, stationFuel: 1, baseYield: 0.35, stationMax: 4, baseMax: 4,
    // what they cost to found, and what else they are worth as they grow
    found: { station: { fuel: 8, army: 6 }, base: { army: 6, drop: 6 } },
    creditShare: 0.25,    // the share of what a ground battle earns that reaches the armoury (a level 3 mission earns 3,000 to 5,000)
    capPer: 2,            // every station tier and base charter raises how much of each resource you can hold
    sectorFortAt: 2,      // a station of this tier or more adds a hit point to every system of yours in its sector
    threatAt: [2, 4],     // a station of these tiers in the sector takes one, then two, off the ground threat there
    shipAt: 3, shipEvery: 6,   // a base of this charter or more sends a ship to its system every so many rounds
    // the ground gets harder the deeper into an enemy's rings you fight, and the more systems that enemy holds
    depthPer: 3, holdPer: 30,
    // a battle fought on the ground: which enemy and ground it is, and how hard, from the odds on the map
    foe: { swarm: 'bugs', foundry: 'bots', veil: 'squids' },
    biome: { refinery: 'desert', forge: 'moon', colony: 'grass', fortress: 'ice', barren: 'moon', capital: 'grass' },
    level: { min: 1, max: 8 } },        // Employment: the priority front defends better, pays more, and builds ships for 1 less fuel
};
// The three enemies, in the order their fronts are played.
C.factions = C.fronts.map(fr => fr.f);
