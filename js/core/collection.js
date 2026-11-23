// The collection: everything a career can meet, in the order the COLLECTION tab shows it. Each entry is
//   [id, name, what it is (one line), about (a few sentences), model to draw ({ model, part, frame })]
// and is open to read once the career (core/career.js) has met it. Buildings and station parts are read from their games'
// own tables, so a new building turns up here without a line written for it.
import { B } from '../base/config.js';
import { C as OC } from '../orbit/config.js';

const FOE = {
  bugs: { name: 'The Molt', file: 'molt', what: 'Swarm', about: 'Fast, many, and spread wide. The Molt close the distance and fight up close; its armour is on the front.' },
  bots: { name: 'The Foundry', file: 'foundry', what: 'Machine army', about: 'Slow, tight ranks that see far and shoot from range. Armoured, with weak points that crack.' },
  lizards: { name: 'The Talon', file: 'talon', what: 'Raiders', about: 'A war host in between: rifles at middle range, beasts that shrug off fire, shields that come back.' },
};
const FOES = {
  bugs: [
    ['L', 'Skitter', 'Light', 'Small and quick, and never alone. It bites at arm\'s length, so a skitter that reaches the squad is already too close.', 'molt_L'],
    ['M', 'Mauler', 'Medium', 'Spits from middle range while the skitters run in. Kill it before it sets the pace of the swarm.', 'molt_M'],
    ['H', 'Rammer', 'Heavy', 'Charges the nearest trooper, head down. Its front plate turns most hits: strike it from the side or from behind.', 'molt_H'],
    ['guard', 'Shellback', 'Special', 'An armoured blocker that leads the swarm straight in, its shell to the front. Pays three times a medium.', 'molt_shellback'],
    ['leap', 'Leaper', 'Variant', 'A light that jumps the last stretch onto its prey. Nothing can hurt it while it is in the air.', 'molt_leaper'],
    ['boss', 'Elder Husk', 'Super heavy', 'A giant of the swarm. While one is alive on the map the dropship will not land.', 'molt_elder'],
  ],
  bots: [
    ['L', 'Drudge', 'Light', 'A rifle at long range and poor aim. Dangerous in numbers, and they always come in numbers.', 'foundry_L'],
    ['M', 'Enforcer', 'Medium', 'A steadier, heavier rifle that reaches as far as the squad can see.', 'foundry_M'],
    ['H', 'Crusher', 'Heavy', 'A walking cannon: slow, half again as tough, and its shells splash. Its weak points crack more often.', 'foundry_H'],
    ['cmd', 'Foreman', 'Special', 'Hangs back behind the line and jams in bursts. Inside its ring no call-in, orbital or ship gun can be called.', 'foundry_foreman'],
    ['rkt', 'Rocketeer', 'Variant', 'Stands and fires six light rockets at the thickest bunch of troopers, then reloads. Spread out.', 'foundry_rocketeer'],
    ['boss', 'Siege Walker', 'Super heavy', 'The Foundry\'s giant. It must come down before the dropship will land.', 'foundry_siege'],
  ],
  lizards: [
    ['L', 'Skirmisher', 'Light', 'A light rifle at middle range. It keeps its distance and keeps shooting.', 'talon_L'],
    ['M', 'Raptor Rider', 'Medium', 'Quick shots from the saddle. Each one is weak; there are a lot of them.', 'talon_M'],
    ['H', 'War Beast', 'Heavy', 'Charges a beam with the longest reach of any enemy. Its shield bubble covers the Talon round it and comes back when left alone.', 'talon_H'],
    ['soak', 'Herd Beast', 'Special', 'A slow mass that soaks up most of every hit. Strike it with everything, or go round it.', 'talon_herd'],
    ['mort', 'Slinger', 'Variant', 'Lobs a mortar shell with a big blast into the thickest bunch of troopers near its target.', 'talon_bombardier'],
    ['boss', 'Thunder Lizard', 'Super heavy', 'The biggest thing the Talon bring. No dropship lands while it lives.', 'talon_thunder'],
  ],
};
const WORLDS = [
  ['ice', 'Frozen glaciers', 'Everything moves slower on the ice, friend and foe.', 'prop_tree_pine'],
  ['grass', 'Tall-grass highlands', 'The grass hides what is in it: everyone sees less far.', 'prop_tree_leaf'],
  ['desert', 'Desert', 'Open ground. Everyone sees further, and is seen further.', 'prop_tree_cactus'],
  ['jungle', 'Jungle', 'Thick cover. Sight is shortest here; the enemy is close before it shows.', 'prop_tree_jungle'],
  ['moon', 'Rocky moon', 'Low gravity: everyone moves faster, and blasts spread wider.', 'prop_rock_spire'],
  ['mars', 'Mars', 'Rust, dust and old craters. Only the last stand is fought here.', 'prop_rock'],
  ['city', 'Capital outskirts', 'City blocks on the edge of the capital, where the defence gun stands.', 'prop_pillar'],
];
const OBJS = [
  ['nuke', 'Launch the nuke', 'Hold the launch site until the missile is armed, then fire it anywhere. It flattens a huge area, allies too.', 'site_silo'],
  ['vip', 'Rescue the VIP', 'Find the VIP and carry them to the landing point. Whoever carries them moves slower: clear the road ahead.', 'site_crash'],
  ['fortress', 'Destroy the citadel', 'A cluster of bases round a keep, guarded by a super heavy. Bases close together help each other: take them one at a time.', 'prop_fab'],
  ['evac', 'Evacuate civilians', 'Civilians walk from the shelter to the hangar in the open. Keep the strikes off them and the enemy away.', 'veh_shuttle'],
  ['oil', 'Pump the oil', 'The Molt\'s operation. Keep the enemy off the pump, or the tank barely fills. Build in front of it while it is quiet.', 'site_derrick'],
  ['cannon', 'Destroy the defence cannon', 'The Foundry\'s operation. While it stands the ship dodges and strikes go wide; aimed shots take it down fastest.', 'prop_cannon'],
  ['dome', 'Bring down the shield dome', 'The Talon\'s operation. The dome stops strikes: break its nodes, and fire in the moment it flickers.', 'prop_shieldgen'],
  ['gun', 'Defend the defence gun', 'The capital\'s last gun charges on its own, slower with the enemy on it. Keep them off it more than anything.', 'side_howitzer'],
];

const GROUP = { core: 'Core', power: 'Power', industry: 'Industry', military: 'Military', living: 'Living', propaganda: 'Publicity' };
export const KINDS = [
  ['foe', 'ENEMIES', 'Met on the ground: each one once seen in a fight. The count is how many you have killed.'],
  ['world', 'WORLDS', 'The ground fought over. The count is the fights there.'],
  ['obj', 'OBJECTIVES', 'What a ground fight asks of you. The count is the fights it was set in.'],
  ['building', 'BUILDINGS', 'What the base can build. The count is how many you have put up.'],
  ['part', 'STATION PARTS', 'What a station is made of. The count is how many you have built.'],
];
let list = null;
// every entry, by kind: { foe: [{ id, name, what, about, art }], ... }
export function catalogue() {
  if (list) return list;
  list = { foe: [], world: [], obj: [], building: [], part: [] };
  for (const f of ['bugs', 'bots', 'lizards']) for (const [k, name, what, about, model] of FOES[f]) list.foe.push({ id: `${f}.${k}`, name, what: `${FOE[f].name} · ${what}`, tag: what, about, art: { model }, side: f });
  for (const [id, name, about, model] of WORLDS) list.world.push({ id, name, what: 'World', about, art: { model } });
  for (const [id, name, about, model] of OBJS) list.obj.push({ id, name, what: 'Objective', about, art: { model } });
  for (const [id, b] of Object.entries(B)) if (b.name && b.desc && !b.hidden && id !== 'starter') list.building.push({ id, name: b.name, what: `Base · ${GROUP[b.group] || b.group}`, about: b.desc, art: { model: 'buildings', part: id } });
  for (const [id, p] of Object.entries(OC.parts)) if (p.name && p.about) list.part.push({ id, name: p.name, what: `Station · ${(OC.groups.find((g) => g.id === p.group) || {}).name || p.group}`, about: p.about, art: { model: 'station', part: id } });
  return list;
}
export const FACTION_ABOUT = FOE;
