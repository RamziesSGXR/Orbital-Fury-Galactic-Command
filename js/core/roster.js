// (GC 0.69) The Vanguard roster and the STORE's command credits.
//
// Four Vanguards, one for each group on the ground (A to D). Each has a ROLE (what they carry and how they fight) and a
// PERSONALITY (the act they put on for the cameras: it moves the viewers, and sometimes the fight). The Rifleman and "no act"
// are free; the rest are bought once in the STORE and can then be given to any of the four.
//
// Command credits are earned in every game: they are worked out from the career (core/career.js), so what was played before
// the store opened counts too. What has been spent is kept here.
//
//   ofgc.roster  { v: 1, slots: [{ role, persona } x 4], own: { role: [ids], persona: [ids] }, up: { upgrade id: level }, spent }
//
// fx, read by the ground fight (ground/sim/mission.js addAlly, enemies.js, vanguard.js, main.js's viewers):
//   gun { dmg, every, range, acc }  the rifle: damage a shot, seconds between shots, reach and accuracy, as multipliers
//   hp, armor, speed, sight         health, damage taken, speed and sight, as multipliers
//   stims, gren                     more stims and grenades carried (and restocked)
//   grenDmg, bld                    grenade damage; damage to buildings
//   heal, healR                     a medic: health a second given to the most hurt ally within healR metres
//   cheer, cheerR                   Infantry within cheerR metres fight this much harder
//   nerve                           pulls back at this share of the usual health (lower: stays in longer)
//   aud                             the viewers: added to the share of the audience the fight is pulling while they are alive
//   pay, sign                       the insurance: what the policy pays out on a death, and what the replacement's contract costs
import { career } from './career.js';

const KEY = 'ofgc.roster';
export const SLOTS = ['A', 'B', 'C', 'D'];

export const ROLES = {
  rifle:    { name: 'Rifleman', tag: 'RFL', cost: 0, icon: 'rifle', line: 'The service rifle and the standard kit: four stims, six grenades and the Hand Cannon.', fx: {} },
  marksman: { name: 'Marksman', tag: 'MRK', cost: 500, icon: 'scope', line: 'A long rifle. Slower, but each shot lands harder and farther off, and they see further.',
    fx: { gun: { dmg: 2.3, every: 2, range: 1.4, acc: 1.08 }, sight: 1.15 } },
  gunner:   { name: 'Machine gunner', tag: 'MG', cost: 550, icon: 'mg', line: 'A belt-fed gun and heavier plate. Lighter rounds, far more of them; a step slower.',
    fx: { gun: { dmg: 0.5, every: 0.42, range: 0.9, acc: 0.9 }, hp: 1.25, speed: 0.92 } },
  medic:    { name: 'Combat medic', tag: 'MED', cost: 700, icon: 'medic', line: 'Patches up whoever is worst hurt close by, Vanguard or Infantry, and carries two more stims.',
    fx: { gun: { dmg: 0.9 }, stims: 2, heal: 16, healR: 24 } },
  sapper:   { name: 'Sapper', tag: 'SAP', cost: 600, icon: 'charge', line: 'Two more grenades and heavier ones, and a knack for bringing buildings down.',
    fx: { gren: 2, grenDmg: 1.3, bld: 1.5 } },
  scout:    { name: 'Scout', tag: 'SCT', cost: 400, icon: 'eye', line: 'Light kit and quick feet: faster, and sees much further, but takes less punishment.',
    fx: { speed: 1.2, sight: 1.3, hp: 0.85 } },
};
export const PERSONAS = {
  none:       { name: 'No act', tag: '', cost: 0, icon: 'none', line: 'Just a soldier. Nobody tunes in for them; nobody minds.', fx: {} },
  showboat:   { name: 'The Showboat', tag: 'SHOW', cost: 300, icon: 'star', line: 'Plays to the camera. Stays in the fight longer than is wise, and hits a little harder doing it.',
    fx: { aud: 0.05, gun: { dmg: 1.05 }, nerve: 0.6 } },
  stoic:      { name: 'The Stoic', tag: 'STOIC', cost: 400, icon: 'shield', line: 'Says nothing, shrugs off what would floor anyone else. Not much to watch.',
    fx: { armor: 0.88, aud: -0.02 } },
  heartthrob: { name: 'The Heartthrob', tag: 'IDOL', cost: 600, icon: 'heart', line: 'Millions tune in for that face. The policy pays well on a death; signing the next face costs more.',
    fx: { aud: 0.1, pay: 1.6, sign: 1.35 } },
  prepper:    { name: 'The Prepper', tag: 'PREP', cost: 350, icon: 'crate', line: 'Packs for the end of the world: a stim and a grenade more than anyone else.',
    fx: { stims: 1, gren: 1 } },
  comedian:   { name: 'The Comedian', tag: 'JOKE', cost: 450, icon: 'mic', line: 'Keeps the troopers laughing: Infantry close by fight harder. The jokes play well at home too.',
    fx: { cheer: 1.12, cheerR: 30, aud: 0.03 } },
  believer:   { name: 'The True Believer', tag: 'TRUE', cost: 500, icon: 'flag', line: 'Believes every word of the brochure. Takes the enemy\'s buildings personally.',
    fx: { bld: 1.35, aud: 0.02 } },
};
export const KIND = { role: ROLES, persona: PERSONAS };

// Upgrades: bought a level at a time, each dearer than the last, and kept for good. Each carries into one of the games, and
// only into what is started after it was bought (a new campaign, a new base or station; every fight on the ground).
export const UPGRADES = {
  chest:   { name: 'War chest', where: 'WAR ROOM', icon: 'coin', costs: [300, 600, 1000], line: 'A new campaign opens with more in the armoury\'s purse.', per: 150, say: (n) => `+${n * 150} credits to start a campaign` },
  reserve: { name: 'Reserve contracts', where: 'GROUND', icon: 'pod', costs: [400, 800, 1300], line: 'Stars kept on retainer: more Vanguard lives in every fight.', per: 1, say: (n) => `+${n} Vanguard li${n > 1 ? 'ves' : 'fe'} a fight` },
  policy:  { name: 'Better policy', where: 'GROUND', icon: 'doc', costs: [250, 500, 900], line: 'A better insurer: more paid out on every Vanguard who falls.', per: 0.15, say: (n) => `+${Math.round(n * 15)}% insurance payout` },
  network: { name: 'Network deal', where: 'GROUND', icon: 'tower', costs: [300, 600, 1000], line: 'A slot in the evening schedule: more viewers from the first minute, and better ratings for the war.', per: 0.025, say: (n) => `+${Math.round(n * 0.025 * 12 * 10) / 10}M viewers` },
  seed:    { name: 'Seed money', where: 'FOB COMMANDER', icon: 'crate', costs: [300, 600, 1000], line: 'A new base starts with more credits and supplies.', per: 1, say: (n) => `+${n * 200} credits, +${n * 600} supplies` },
  grant:   { name: 'Docking grant', where: 'STATION', icon: 'dock', costs: [300, 600, 1000], line: 'A new station starts with more credits in its account.', per: 600, say: (n) => `+${n * 600} credits` },
};
export const upLevel = (id, r = roster()) => Math.max(0, Math.min(UPGRADES[id] ? UPGRADES[id].costs.length : 0, (r.up && r.up[id]) | 0));
// what an upgrade adds now: its level times its step
export const upgrade = (id) => upLevel(id) * (UPGRADES[id] ? UPGRADES[id].per : 0);
export function buyUp(id) {
  const u = UPGRADES[id], r = roster(), n = upLevel(id, r); if (!u || n >= u.costs.length) return false;
  const cost = u.costs[n]; if (credits().bal < cost) return false;
  r.up = { ...(r.up || {}), [id]: n + 1 }; r.spent += cost; keep(r); return true;
}

// How credits are earned: per total in the career, and a grant to start with.
export const START = 500;
export const EARN = [
  ['won', 100, 'a fight won'], ['lost', 30, 'a fight lost'], ['objectives', 15, 'an objective'], ['kills', 0.05, 'per twenty kills'],
  ['baseDays', 15, 'a base day'], ['baseFirst', 50, 'a day ranked first'], ['built', 4, 'a building'],
  ['stationWeeks', 25, 'a station week'], ['parts', 4, 'a station part'],
];
export function earned(n = career().n) {
  const v = { ...n, lost: Math.max(0, (n.missions || 0) - (n.won || 0)) };
  return Math.floor(START + EARN.reduce((s, [k, per]) => s + (+v[k] || 0) * per, 0));
}

const blank = () => ({ v: 1, slots: SLOTS.map(() => ({ role: 'rifle', persona: 'none' })), own: { role: ['rifle'], persona: ['none'] }, up: {}, spent: 0 });
export function roster() {
  let r = null;
  try { r = JSON.parse(localStorage.getItem(KEY)); } catch { r = null; }
  if (!r || r.v !== 1) return blank();
  const b = blank();
  r.own = { role: [...new Set(['rifle', ...((r.own && r.own.role) || [])])].filter((k) => ROLES[k]), persona: [...new Set(['none', ...((r.own && r.own.persona) || [])])].filter((k) => PERSONAS[k]) };
  r.slots = SLOTS.map((_, i) => { const s = (r.slots && r.slots[i]) || {}; return { role: r.own.role.includes(s.role) ? s.role : 'rifle', persona: r.own.persona.includes(s.persona) ? s.persona : 'none' }; });
  r.spent = Math.max(0, +r.spent || 0); r.up = r.up && typeof r.up === 'object' ? r.up : {};
  return { ...b, ...r };
}
const keep = (r) => { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* no storage: nothing is kept */ } return r; };

export function credits() { const r = roster(), e = earned(); return { earned: e, spent: r.spent, bal: Math.max(0, e - r.spent) }; }
export const owns = (kind, id, r = roster()) => !!(r.own[kind] && r.own[kind].includes(id));

// buy a role or a personality; false if it is owned already or there is not enough to pay for it
export function buy(kind, id) {
  const d = KIND[kind] && KIND[kind][id], r = roster();
  if (!d || owns(kind, id, r) || credits().bal < d.cost) return false;
  r.own[kind].push(id); r.spent += d.cost; keep(r); return true;
}
// give a Vanguard a role or a personality that is owned
export function assign(slot, kind, id) {
  const r = roster(); if (!r.slots[slot] || !owns(kind, id, r)) return false;
  r.slots[slot][kind] = id; keep(r); return true;
}

// The four Vanguards as the ground fight wants them: role and personality ids, and their effects merged.
// (A role's and a personality's gun multipliers multiply; the rest add for counts and multiply for factors.)
const ADD = new Set(['stims', 'gren', 'aud', 'heal', 'healR', 'cheerR']);
export function merge(...fxs) {
  const o = {};
  for (const fx of fxs) for (const k in fx || {}) {
    if (k === 'gun') { o.gun ||= {}; for (const g in fx.gun) o.gun[g] = (o.gun[g] ?? 1) * fx.gun[g]; }
    else if (ADD.has(k)) o[k] = (o[k] || 0) + fx[k];
    else o[k] = (o[k] ?? 1) * fx[k];
  }
  return o;
}
export function squad(r = roster()) {
  return r.slots.map((s) => {
    const R = ROLES[s.role] || ROLES.rifle, P = PERSONAS[s.persona] || PERSONAS.none;
    return { role: s.role, persona: s.persona, tag: R.tag, ptag: P.tag, fx: merge(R.fx, P.fx) };
  });
}

// what an effect list does, in a few words each (the STORE's cards)
const pc = (v) => `${v > 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`;
export function fxLines(fx) {
  const L = [], g = fx.gun || {};
  if (g.dmg && g.every) { const dps = g.dmg / g.every; L.push([`${pc(dps)} rifle damage`, dps >= 1]); L.push([g.every > 1 ? `${pc(g.dmg)} a shot, ${g.every}× slower` : `${Math.round(1 / g.every * 10) / 10}× the rate of fire`, true]); }
  else if (g.dmg) L.push([`${pc(g.dmg)} rifle damage`, g.dmg > 1]);
  if (g.range) L.push([`${pc(g.range)} range`, g.range > 1]);
  if (g.acc) L.push([`${pc(g.acc)} accuracy`, g.acc > 1]);
  if (fx.hp) L.push([`${pc(fx.hp)} health`, fx.hp > 1]);
  if (fx.armor) L.push([`${pc(2 - fx.armor)} toughness`, fx.armor < 1]);
  if (fx.speed) L.push([`${pc(fx.speed)} speed`, fx.speed > 1]);
  if (fx.sight) L.push([`${pc(fx.sight)} sight`, fx.sight > 1]);
  if (fx.stims) L.push([`+${fx.stims} stim${fx.stims > 1 ? 's' : ''}`, true]);
  if (fx.gren) L.push([`+${fx.gren} grenade${fx.gren > 1 ? 's' : ''}`, true]);
  if (fx.grenDmg) L.push([`${pc(fx.grenDmg)} grenade damage`, true]);
  if (fx.bld) L.push([`${pc(fx.bld)} against buildings`, true]);
  if (fx.heal) L.push([`heals ${fx.heal} a second within ${fx.healR} m`, true]);
  if (fx.cheer) L.push([`${pc(fx.cheer)} Infantry damage within ${fx.cheerR} m`, true]);
  if (fx.nerve) L.push(['pulls back later', fx.nerve < 1]);
  if (fx.aud) L.push([`${fx.aud > 0 ? '+' : '−'}${Math.round(Math.abs(fx.aud) * 12 * 10) / 10}M viewers`, fx.aud > 0]);
  if (fx.pay) L.push([`${pc(fx.pay)} insurance payout`, true]);
  if (fx.sign) L.push([`${pc(fx.sign)} to sign a replacement`, false]);
  return L;
}
