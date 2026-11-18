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
const ONLY = process.argv[5] || '';     // 'sites' or 'ground': only that half of 'full', to see what each is worth
const FOUND = 3, LEVEL = 12, GROUND_P = [1, 1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5];
const rng = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function sites(g, age) {
  for (const [k, a] of age) { const [pid, kind] = k.split(':'), p = g.P[+pid]; if (!p[kind]) { age.delete(k); continue; } a.n++; if (a.n % LEVEL === 0 && p[kind] < 4) { p[kind]++; g._sec = null; } }
  if (g.round % FOUND) return;
  const fl = g.fedLinked();
  const free = g.P.filter(p => p.owner === 'fed' && p.id && fl.has(p.id) && !g.threat(p.id) && (!p.station || !p.base)).sort((a, b) => a.ring - b.ring || a.id - b.id)[0];
  if (!free) return;
  const kind = !free.station ? 'station' : 'base'; if (g.found(free.id, kind)) age.set(`${free.id}:${kind}`, { n: 0 });
}
export function play(seed, mode, rounds = maxR) {
  const g = new Game(seed), full = mode === 'full', R = rng(seed * 977 + 5), age = new Map();
  g.x = { ground: 0, groundWon: 0 };
  let guard = 0, last = 0;
  while (!g.over && g.round <= rounds && guard++ < 400000) {
    if (full && ONLY !== 'ground' && g.round !== last) { last = g.round; sites(g, age); }
    if (g.battle) {
      const b = g.battle;
      if (b.done) { if (mode !== 'idle' && b.pending && b.foe.hp <= b.you.fire * 2 + 2) g.press(); else g.battleClose(); }
      else if (full && ONLY !== 'sites' && b.round === 0 && GROUND_P[g.groundLevel()] >= 0.6) { const win = R() < GROUND_P[g.groundLevel()]; g.x.ground++; if (win) g.x.groundWon++; g.battleResolve(win, win ? 0.6 : 0); }
      else g.battlePlay(mode !== 'idle' ? botCard(g) : null);
    }
    else if (mode !== 'idle') botDecide(g); else g.hold();
  }
  return g;
}

if ((process.argv[1] || '').endsWith('sim.mjs')) for (const mode of (process.argv[4] ? process.argv[4].split(',') : ['bot', 'full', 'idle'])) {
  let xs = 0, xb = 0, xg = 0, xw = 0;
  let won = 0, lost = 0, rounds = 0, dead = [0, 0, 0], st = { taken: 0, fallen: 0, held: 0, repelled: 0 }, why = {}, ships = 0, sites = 0;
  for (let s = 1; s <= games; s++) {
    const g = play(s, mode);
    if (g.over?.result === 'won') won++; else if (g.over) { lost++; const k = g.over.why.slice(0, 24); why[k] = (why[k] || 0) + 1; }
    rounds += g.over ? g.over.round : g.round;
    C.factions.forEach((f, i) => { if (g.F[f].state === 'dead') dead[i]++; });
    for (const k in st) st[k] += g.stats[k];
    for (const p of g.P) if (p.owner === 'fed') { xs += p.station || 0; xb += p.base || 0; } xg += g.x.ground; xw += g.x.groundWon;
    ships += g.fleets.filter(f => f.owner === 'fed').reduce((a, f) => a + f.ships, 0); sites += g.P.filter(p => p.site).length;
  }
  const avg = k => (st[k] / games).toFixed(1);
  console.log(`${mode.padEnd(5)} won ${won}/${games}  lost ${lost}  undecided ${games - won - lost}  avg rounds ${(rounds / games).toFixed(1)}`);
  if (mode === 'full') console.log(`      per game: station tiers held at the end ${(xs / games).toFixed(1)}, base charters ${(xb / games).toFixed(1)}, ground battles ${(xg / games).toFixed(1)} (won ${(xw / Math.max(1, xg) * 100).toFixed(0)}%)`);
  console.log(`      enemies destroyed: ${C.factions.map((f, i) => f + ' ' + dead[i]).join(' ')} | per game: systems taken ${avg('taken')}, attacks beaten off ${avg('repelled')}, defences held ${avg('held')}, systems fallen ${avg('fallen')}, ships at the end ${(ships / games).toFixed(1)}, sites ${(sites / games).toFixed(1)}`);
  if (lost) console.log('      losses:', JSON.stringify(why));
}
