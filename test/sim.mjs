// Plays whole wars with no screen. `npm run sim [games] [maxRounds]`
// Two players: the test bot, and nobody at all (who holds on every front and plays no cards).
import { Game } from '../js/galaxy/sim.js';
import { C } from '../js/galaxy/config.js';
import { botDecide, botCard } from '../js/galaxy/bot.js';

const games = +process.argv[2] || 40, maxR = +process.argv[3] || 120;

// 'full' is the whole game as far as it can be played with no screen:
// - STATIONS AND BASES: the bot cannot play them, so it founds one every FOUND rounds on a safe system it holds (inner
//   rings first) and each one gains a level every LEVEL rounds, up to 4. A system that falls loses them, as in the game.
// - GROUND BATTLES: when the odds are good enough it takes the fight to the ground. Whether it wins comes from Orbital
//   Fury's own bot results by threat level (the project's balance notes: the sharp bot won 5, 5, 4, 3 of 5 at levels
//   1, 3, 5 and 7), with 60% of its lives left on a win.
// - EVERY bot but the idle one founds stations and bases (ships can only be built over a station; bases train the
//   troops). Only the full bot runs them: levels, profit, shows.
// - THE WAR CHEST: a post is in profit PROFIT rounds after it is founded; a ground win pays GROUND_CR; every round the
//   bot buys the cheapest armoury upgrade it can (it buys nothing from the ground's shelf).
const ONLY = process.argv[5] || '';     // 'sites' or 'ground': only that half of 'full', to see what each is worth
const FOUND = 3, LEVEL = 12, PROFIT = 4, GROUND_CR = 500, GROUND_P = [1, 1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5];
const rng = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function sites(g, age, run = true) {
  if (run) for (const [k, a] of age) { const [pid, kind] = k.split(':'), p = g.P[+pid]; if (!p[kind]) { age.delete(k); continue; } a.n++; if (a.n >= PROFIT) p[kind === 'station' ? 'sp' : 'bp'] = 1; if (a.n % LEVEL === 0 && p[kind] < 4) { p[kind]++; g._sec = null; } }
  if (run && g.rat < 70) for (const p of g.P) { if (g.rat >= 70) break; for (const k of ['base', 'station']) if (p[k] && g.canShow(p.id, k)) g.show(p.id, k); }
  if (!g.ready() || g.round - (g.x.foundAt ?? -9) < FOUND) return;
  const fl = g.fedLinked();
  // a base goes on the innermost free system; a station goes up near the fighting (two jumps behind the line), since
  // ships are only built over stations and have to reach the front
  const ok = (p) => p.owner === 'fed' && p.id && fl.has(p.id) && !g.threat(p.id);
  const stations = g.P.filter(p => p.owner === 'fed' && p.station).length, bases = g.P.filter(p => p.owner === 'fed' && p.base).length;
  const kind = stations <= bases ? 'station' : 'base';
  let pick;
  if (kind === 'base') pick = g.P.filter(p => ok(p) && !p.base).sort((a, b) => a.ring - b.ring || a.id - b.id)[0];
  else {
    const near = (p) => { let d = 9; for (const n of p.adj) { if (g.P[n].owner !== 'fed') d = Math.min(d, 1); else for (const m of g.P[n].adj) if (g.P[m].owner !== 'fed') d = Math.min(d, 2); } return d; };
    pick = g.P.filter(p => ok(p) && !p.station).map(p => ({ p, d: near(p) })).sort((a, b) => (a.d === 2 ? 0 : a.d === 9 ? 1 : 2) - (b.d === 2 ? 0 : b.d === 9 ? 1 : 2) || Math.abs(a.p.ring - 6) - Math.abs(b.p.ring - 6) || a.p.id - b.p.id)[0]?.p;
  }
  if (pick && g.found(pick.id, kind)) { g.x.foundAt = g.round; age.set(`${pick.id}:${kind}`, { n: 0 }); }
}
export function play(seed, mode, rounds = maxR) {
  const g = new Game(seed), full = mode === 'full', R = rng(seed * 977 + 5), age = new Map();
  g.x = { ground: 0, groundWon: 0, wal: { bal: 1200 }, maxRank: 0, ratMin: 100, ratSum: 0, ratN: 0 };
  let guard = 0, last = 0;
  while (!g.over && g.round <= rounds && guard++ < 400000) {
    if (g.round !== last) { g.x.ratMin = Math.min(g.x.ratMin, g.rat); g.x.ratSum += g.rat; g.x.ratN++; }
    if (full && g.round !== last) { g.x.wal.bal += g.takeDue(); g.x.maxRank = Math.max(g.x.maxRank, g.rank()); const opts = Object.values(C.shelf).flat().filter(it => g.canBuy(it.id, g.x.wal.bal)).sort((a, b) => g.nextLevel(a.id).cr - g.nextLevel(b.id).cr); if (opts[0]) g.buy(opts[0].id, g.x.wal); }
    if (mode !== 'idle' && ONLY !== 'ground' && !g.battle) sites(g, age, full && g.round !== last);
    last = g.round;
    if (g.battle) {
      const b = g.battle;
      if (b.done) { if (mode !== 'idle' && b.pending && b.foe.hp <= b.you.fire * 2 + 2) g.press(); else g.battleClose(); }
      else if (full && ONLY !== 'sites' && b.round === 0 && GROUND_P[g.groundLevel()] >= 0.6) { const win = R() < GROUND_P[g.groundLevel()]; g.x.ground++; if (win) { g.x.groundWon++; g.x.wal.bal += GROUND_CR; } g.battleResolve(win, win ? 0.6 : 0); }
      else g.battlePlay(mode !== 'idle' ? botCard(g) : null);
    }
    else if (mode !== 'idle') botDecide(g); else g.hold();
  }
  return g;
}

if ((process.argv[1] || '').endsWith('sim.mjs')) for (const mode of (process.argv[4] ? process.argv[4].split(',') : ['bot', 'full', 'idle'])) {
  let xs = 0, xb = 0, xg = 0, xw = 0, xc = 0, xu = 0, xr = 0, xm = [0, 0, 0];
  let ra = 0, rm = 0;
  let won = 0, lost = 0, rounds = 0, dead = [0, 0, 0], st = { taken: 0, fallen: 0, held: 0, repelled: 0 }, why = {}, ships = 0, sites = 0;
  for (let s = 1; s <= games; s++) {
    const g = play(s, mode);
    if (g.over?.result === 'won') won++; else if (g.over) { lost++; const k = g.over.why.slice(0, 24); why[k] = (why[k] || 0) + 1; }
    rounds += g.over ? g.over.round : g.round; ra += g.x.ratSum / Math.max(1, g.x.ratN); rm += g.x.ratMin;
    C.factions.forEach((f, i) => { if (g.F[f].state === 'dead') dead[i]++; });
    for (const k in st) st[k] += g.stats[k];
    for (const p of g.P) if (p.owner === 'fed') { xs += p.station || 0; xb += p.base || 0; } xg += g.x.ground; xw += g.x.groundWon; xc += g.x.wal.bal; xu += Object.values(g.up).reduce((a, b) => a + b, 0); xr += g.x.maxRank; C.factions.forEach((f, i) => { xm[i] += g.loot[f]; });
    ships += g.fleets.filter(f => f.owner === 'fed').reduce((a, f) => a + f.ships, 0); sites += g.P.filter(p => p.site).length;
  }
  const avg = k => (st[k] / games).toFixed(1);
  console.log(`${mode.padEnd(5)} won ${won}/${games}  lost ${lost}  undecided ${games - won - lost}  avg rounds ${(rounds / games).toFixed(1)}`);
  if (mode === 'full') console.log(`      per game: station tiers held at the end ${(xs / games).toFixed(1)}, base charters ${(xb / games).toFixed(1)}, ground battles ${(xg / games).toFixed(1)} (won ${(xw / Math.max(1, xg) * 100).toFixed(0)}%)`);
  if (mode === 'full') console.log(`      war chest at the end ${(xc / games).toFixed(0)} CR, upgrades bought ${(xu / games).toFixed(1)} of ${Object.values(C.shelf).flat().reduce((a, it) => a + it.lv.length, 0)}, best rank ${(xr / games).toFixed(1)}, materials left ${xm.map(x => (x / games).toFixed(0)).join(' / ')}`);
  console.log(`      enemies destroyed: ${C.factions.map((f, i) => f + ' ' + dead[i]).join(' ')} | per game: systems taken ${avg('taken')}, attacks beaten off ${avg('repelled')}, defences held ${avg('held')}, systems fallen ${avg('fallen')}, ships at the end ${(ships / games).toFixed(1)}, sites ${(sites / games).toFixed(1)}`);
  console.log(`      ratings: average ${(ra / games).toFixed(0)}%, lowest in a war ${(rm / games).toFixed(0)}% (mean of each war's low)`);
  if (lost) console.log('      losses:', JSON.stringify(why));
}
