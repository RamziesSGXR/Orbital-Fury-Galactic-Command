// The whole game as rules. No DOM, so it runs the same in the browser and in `npm run sim`.
//
// One round goes round the three war fronts in order. On each front that is at war:
//   1. THE ENEMY ACTS: one action. It attacks one of your systems with a fleet, or brings a fleet up to the line.
//   2. YOU DECIDE: one action. Attack an enemy system on that front, move a fleet there to defend, or hold.
//      Building ships and special sites on that front is extra: it does not use up the decision.
// An attack by either side is a BATTLE: a card game with hit points (see `_startBattle` and `battlePlay`).
// After the last front: income, and the next round.
import { C } from './config.js';
import { makeMap } from './map.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const N = C.names, HP = C.ship.hp;

export class Game {
  constructor(seed = 1, saved = null, opt = null) {
    this.seed = seed;
    this.rs = (seed * 7919 + 13) | 0;
    this.map = makeMap(seed);
    this.P = this.map.planets;       // star systems
    this.round = 1; this.phase = 'plan'; this.fi = -1; this.over = null;
    this.res = { ...C.start.res };
    this.loot = { molt: 0, foundry: 0, talon: 0 };   // each front's own resource
    this.truth = { fed: [], molt: [], foundry: [], talon: [] };   // propaganda cards each side holds
    this.F = {};
    C.fronts.forEach((fr, fi) => {
      const a = C.arrive[fr.f];
      this.F[fr.f] = { id: fr.f, front: fi, state: 'wait', at: a.round + Math.round((this.rnd() * 2 - 1) * a.vary), pool: 0, wait: 0, home: this.map.home[fi] };
    });
    // fleets: the pieces. One per side per system. { id, owner, at, ships, moved }
    this.fleets = []; this.fid = 0;
    this.opt = { fleets: 'standard', posts: 'none', level: 'normal', ...(opt || {}) }; this.yard = 'bal';
    const fk = C.fleet.start.fleets[this.opt.fleets] ?? 1, sh = (n) => Math.max(1, Math.round(n * fk));
    this._put('fed', 0, sh(C.start.fleets[0]));
    C.fronts.forEach((fr, fi) => { const p = this.P.filter(q => q.front === fi && q.ring === 2).sort((a, b) => a.id - b.id)[1]; this._put('fed', p.id, sh(C.start.fleets[fi + 1])); });
    this.policy = 'balanced';        // Personnel Office
    this.priority = null;            // Casting Office: the priority front, 0 to 2
    this.capHit = [];                // enemies that have struck the capital this round
    this.battle = null;              // the battle being fought, if any
    this.moves = [];                 // fleet moves just made, for the screen to animate: { owner, from, to, ships }
    this.last = null;                // what the enemy just did on this front, for the screen to announce
    this.log = [];
    this.stats = { taken: 0, fallen: 0, held: 0, repelled: 0 };
    for (const p of this.P) { p.station = 0; p.base = 0; p.dmg = 0; p.sp = 0; p.bp = 0; }
    this.up = {}; this.due = 0; this.rat = C.ratings.start; this.sack = 0;
    { const n = C.fleet.start.posts[this.opt.posts] || 0, near = this.P.filter(q => q.id && q.ring <= 2).sort((a, b) => a.ring - b.ring || a.id - b.id); for (let i = 0; i < n; i++) { const a = near[i * 2], b = near[i * 2 + 1]; if (a) { a.station = 1; a.sp = 1; } if (b) { b.base = 1; b.bp = 1; } } }      // armoury upgrades bought; credits owed to the war chest
    if (saved) return this._restore(saved);
    this.say('info', `Every world on the map carries the ${N.fed} brand. Long may it sell.`);
    this._arrivals(); this._startRound();
  }

  rnd() {
    const a = this.rs = (this.rs + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  say(kind, text) { this.log.push({ r: this.round, kind, text }); }

  // ---------- saving (only while you are deciding) ----------
  save() {
    const k = ['seed', 'rs', 'round', 'fi', 'res', 'loot', 'truth', 'F', 'fleets', 'fid', 'policy', 'priority', 'capHit', 'stats', 'over', 'last', 'up', 'due', 'rat', 'sack', 'aired', 'opt', 'yard'];
    const d = { v: 11, log: this.log.slice(-80), P: this.P.map(p => [p.owner, p.dev, p.site, p.built ? 1 : 0, p.station || 0, p.base || 0, p.dmg || 0, p.sp || 0, p.bp || 0]) };
    for (const x of k) d[x] = this[x];
    return d;
  }
  _restore(d) {
    for (const k in d) if (k !== 'v' && k !== 'P') this[k] = d[k];
    d.P.forEach(([o, dv, st, bu, sn, bs, dm, sp, bp], i) => Object.assign(this.P[i], { owner: o, dev: dv, site: st, built: !!bu, station: sn || 0, base: bs || 0, dmg: dm || 0, sp: sp || 0, bp: bp || 0 }));
    this.up ||= {}; this.due ||= 0; this.rat ??= C.ratings.start; this.sack ||= 0; this.opt ||= { fleets: 'standard', posts: 'none' }; this.yard ||= 'bal';
    this.phase = this.over ? 'over' : 'plan'; this._sec = null;
    return this;
  }
  static load(d) { return d && d.v === 11 ? new Game(d.seed, d) : null; }

  // ---------- the board ----------
  linked(owner, root) {
    const seen = new Set();
    if (this.P[root].owner !== owner) return seen;
    seen.add(root); const q = [root];
    while (q.length) for (const n of this.P[q.pop()].adj) if (!seen.has(n) && this.P[n].owner === owner) { seen.add(n); q.push(n); }
    return seen;
  }
  fedLinked() { return this.linked('fed', 0); }
  // Who holds each sector whole (every system of it; for you, all linked to the capital too). Worked out once and kept
  // until a system changes hands.
  sectorOwners() {
    if (this._sec) return this._sec;
    const fl = this.fedLinked(), out = new Map();
    for (const sc of this.map.sectors) { const o = this.P[sc.sys[0]].owner; if (sc.sys.every(id => this.P[id].owner === o && (o !== 'fed' || fl.has(id)))) out.set(sc.id, o); }
    this._cnt = {}; this._stn = {}; for (const p of this.P) { this._cnt[p.owner] = (this._cnt[p.owner] || 0) + 1; if (p.owner === 'fed' && p.station) this._stn[p.sector] = Math.max(this._stn[p.sector] || 0, p.station); }
    return (this._sec = out);
  }
  sectorStation(p) { this.sectorOwners(); return this._stn[p.sector] || 0; }
  // How much of each resource you can hold: more with every station tier and base charter.
  resMax() { let n = 0; for (const p of this.P) if (p.owner === 'fed') n += (p.station || 0) + (p.base || 0); return C.resMax + n * C.link.capPer + this.lv('f_hold') * 5; }
  sectorOf(p) { return this.map.sectors.find(sc => sc.id === p.sector); }
  sectorHeld(p) { return this.sectorOwners().get(p.sector) === p.owner; }
  keyWorld(p) { return p.worlds[p.key]; }
  facOf(p) { return p.front < 0 ? null : C.fronts[p.front].f; }
  atWar(fi) { return fi >= 0 && this.F[C.fronts[fi].f].state === 'active'; }
  // Is this system part of the front being played? The capital belongs to every front; in peace, everything does.
  onFront(pid) { const p = this.P[pid]; return this.fi < 0 || p.id === 0 || p.front === this.fi; }
  fleetAt(pid, owner) { return this.fleets.find(f => f.at === pid && f.owner === owner); }
  shipsAt(pid, owner) { const f = this.fleetAt(pid, owner); return f ? f.ships : 0; }
  // Put ships in a system: they join the fleet already there, or form a new one.
  _put(owner, at, ships, moved = false, src = null) {
    const f = this.fleetAt(at, owner);
    if (f) { if (owner === 'fed') this._blend(f, ships, src); f.ships += ships; f.moved = f.moved || moved; return f; }
    const g = { id: ++this.fid, owner, at, ships, moved }; if (owner === 'fed') { g.mix = src && src.mix ? [...src.mix] : this._yardMix(); g.wear = src ? src.wear || 0 : 0; } this.fleets.push(g); return g;
  }
  // ---------- fleets: makeup, wear, upkeep ----------
  _yardMix() { const i = C.fleet.roles.findIndex(r => r.id === this.yard); return i < 0 ? [1 / 3, 1 / 3, 1 / 3] : [0, 1, 2].map(k => (k === i ? 1 : 0)); }
  // `n` ships join fleet f: its makeup and wear become the weighted mean of the two
  _blend(f, n, src) { const m = src && src.mix ? src.mix : this._yardMix(), w = src ? src.wear || 0 : 0, t = f.ships + n; if (t <= 0) return; f.mix = (f.mix || [1 / 3, 1 / 3, 1 / 3]).map((x, i) => (x * f.ships + m[i] * n) / t); f.wear = ((f.wear || 0) * f.ships + w * n) / t; }
  share(f, role) { const i = C.fleet.roles.findIndex(r => r.id === role); return f && f.mix ? f.mix[i] : 1 / 3; }
  _wear(f, n) { if (f && f.owner === 'fed') f.wear = clamp((f.wear || 0) + n * (1 - C.fleet.buff.ten * this.share(f, 'ten')), 0, 100); }
  // a fleet's fire in a fight: its ships, worn down, and sharpened by its gunships when it is the one attacking
  fleetFire(f, attacking) { if (!f || f.owner !== 'fed') return f ? f.ships : 0; return Math.max(1, Math.round(f.ships * (1 - C.fleet.wear.fire * (f.wear || 0) / 100) * (attacking ? 1 + C.fleet.buff.gun * this.share(f, 'gun') : 1))); }
  // the extra hit points its escorts give a fleet that is defending
  escortHp(f) { return f && f.owner === 'fed' ? Math.round(f.ships * HP * C.fleet.buff.esc * this.share(f, 'esc')) : 0; }
  repairAt(f) { const p = this.P[f.at], R = C.fleet.repair; let n = C.fleet.buff.tenMend * this.share(f, 'ten'); if (p.owner === 'fed') n += p.id === 0 ? R.capital : (p.station || 0) * R.station + (p.base || 0) * R.base; return n; }
  fleetBill() { const n = this.fleets.reduce((a, f) => a + (f.owner === 'fed' ? f.ships : 0), 0); return Math.max(0, n - C.fleet.upkeep.free) * C.fleet.upkeep.per; }
  setYard(k) { if (k === 'bal' || C.fleet.roles.some(r => r.id === k)) { this.yard = k; return true; } return false; }
  _fleetRound() {
    const bill = this.fleetBill(), short = Math.max(0, bill - this.res.fuel); this.res.fuel = Math.max(0, this.res.fuel - bill);
    for (const f of this.fleets) { if (f.owner !== 'fed') continue; if (short > 0.01) this._wear(f, C.fleet.wear.unpaid); f.wear = Math.max(0, (f.wear || 0) - this.repairAt(f)); }
    if (short > 0.01) this.say('warn', 'Logistics Office: not enough fuel for the fleets. Every fleet is worn by it.');
  }
  _drop(f) { const i = this.fleets.indexOf(f); if (i >= 0) this.fleets.splice(i, 1); }
  // Hit points a system has by itself, with no fleet there.
  fort(p) {
    if (p.owner !== 'fed') return Math.max(0, (p.kind === 'home' ? C.garr.home + Math.floor(((this.sectorOwners(), this._cnt)[p.owner] || 0) / C.homePer) : C.garr.sys) + (p.station || 0) * C.foe.stationFort + p.worlds.filter(w => w.type === 'fortress').length * C.garr.fortress + (this.sectorHeld(p) ? C.sector.fort : 0) - (p.dmg || 0));
    let v = (p.id === 0 ? C.fort.capital : C.fort.sys) + (this.priority != null && p.front === this.priority ? C.priority.fort : 0);
    for (const w of p.worlds) v += C.worlds[w.type].fort || 0;
    v += (p.base || 0) * C.support.baseFort + Math.min(C.support.coverMax, p.adj.filter(i => this.P[i].owner === 'fed' && this.P[i].station).length) * C.support.coverFort;
    v += (p.station || 0) * (C.link.stationFort + this.lv('s_guns')) + (this.sectorHeld(p) ? C.sector.fort : 0) + (this.sectorStation(p) >= C.link.sectorFortAt ? 1 : 0);
    return Math.max(0, Math.round(v * (this.fedLinked().has(p.id) ? 1 : C.cut)) - (p.dmg || 0));
  }
  // Total hit points a system would fight with: its own, plus its owner's fleet there.
  strength(pid) { const p = this.P[pid]; return this.fort(p) + this.shipsAt(pid, p.owner) * HP; }
  // Every system a fleet can travel to this round: any system of its own side joined to where it stands by lanes.
  reach(f) {
    const seen = new Set([f.at]); if (f.moved) return seen;
    let edge = [f.at];
    for (let d = 0; d < C.fleetRange + this.lv('f_range') && edge.length; d++) { const next = []; for (const a of edge) for (const n of this.P[a].adj) if (!seen.has(n) && this.P[n].owner === f.owner) { seen.add(n); next.push(n); } edge = next; }
    return seen;
  }
  // The enemy fleets beside one of your systems that could strike it, strongest first.
  threat(pid) {
    const p = this.P[pid]; if (p.owner !== 'fed') return null;
    let best = null;
    for (const n of p.adj) for (const x of this.fleets) if (x.at === n && x.owner !== 'fed' && (p.id === 0 || p.front === this.F[x.owner].front) && (!best || x.ships > best.ships)) best = { f: x.owner, ships: x.ships, hp: x.ships * HP, from: n };
    return best;
  }

  // ---------- battle decks ----------
  // A side's deck is made of what it holds: the cards every fleet carries, a card for every few worlds of a kind
  // (you) or every few systems (the enemy), two for each special site, and whatever propaganda it has been handed.
  deck(owner) {
    const d = [...C.baseDeck[owner]];
    if (owner === 'fed') {
      const fl = this.fedLinked(), n = {};
      for (const p of this.P) if (p.owner === 'fed' && fl.has(p.id)) { for (const w of p.worlds) n[w.type] = (n[w.type] || 0) + 1; if (p.site) d.push(C.sites[p.site].card, C.sites[p.site].card); }
      for (const t in n) { const c = C.worlds[t].card; if (c) for (let i = 0; i < Math.min(C.worldCard.max, Math.floor(n[t] / C.worldCard.per)); i++) d.push(c); }
    } else {
      const sys = this.P.filter(p => p.owner === owner).length;
      for (let i = 0; i < Math.min(C.foeGrow.max, Math.floor(sys / C.foeGrow.per)); i++) d.push(C.foeGrow[owner]);
    }
    return d.concat(this.truth[owner]);
  }
  _hand(owner) {
    const d = this.deck(owner), h = [];
    for (let i = 0; i < C.battle.hand + (owner === 'fed' ? this.lv('f_hand') : 0) && d.length; i++) h.push(d.splice(Math.floor(this.rnd() * d.length), 1)[0]);
    return h;
  }
  _truth(owner, id, why) {
    if (this.truth[owner].length >= C.truthMax) return;
    this.truth[owner].push(id);
    this.say(owner === 'fed' ? 'good' : 'warn', `Publicity Office: ${owner === 'fed' ? 'you gain' : N.factions[owner] + ' gains'} ${C.bcards[id].name} (${why}).`);
  }

  // ---------- your decision on a front ----------
  canPay(c = {}) { for (const k in c) if (c[k] > this.res[k] + 1e-9) return false; return true; }
  _pay(c = {}) { for (const k in c) this.res[k] -= c[k]; }
  ready() { return this.phase === 'plan' && !this.over; }
  // Enemy systems on this front a fleet could attack: beside any system it can reach.
  targets(f) {
    if (!this.ready() || f.owner !== 'fed' || f.moved) return [];
    const r = this.reach(f), out = new Set();
    for (const id of r) for (const n of this.P[id].adj) if (this.P[n].owner !== 'fed' && this.onFront(n)) out.add(n);
    return [...out];
  }
  // Systems of yours on this front a fleet could move to.
  posts(f) { if (!this.ready() || f.owner !== 'fed' || f.moved) return []; return [...this.reach(f)].filter(id => id !== f.at && this.onFront(id)); }
  // ATTACK: send a fleet (or `n` of its ships) against an enemy system on this front. This starts a battle.
  attack(fid, pid, n) {
    const f = this.fleets.find(x => x.id === fid); if (!f || !this.targets(f).includes(pid)) return false;
    const r = this.reach(f), stage = this.P[pid].adj.filter(a => r.has(a)).sort((a, b) => (a === f.at ? -1 : 0) - (b === f.at ? -1 : 0))[0];
    const g = this._detach(f, n); if (stage !== g.at) { this.moves.push({ owner: 'fed', from: g.at, to: stage, ships: g.ships }); g.at = stage; }
    g.moved = true;
    this._startBattle('atk', this.P[pid].owner, pid, stage, g);
    return true;
  }
  // DEFEND: move a fleet (or `n` of its ships) to a system of yours on this front.
  moveTo(fid, pid, n) {
    const f = this.fleets.find(x => x.id === fid); if (!f || !this.posts(f).includes(pid)) return false;
    const g = this._detach(f, n); this.moves.push({ owner: 'fed', from: g.at, to: pid, ships: g.ships });
    this._wear(g, C.fleet.wear.move); this._drop(g); this._put('fed', pid, g.ships, true, g);
    this.say('info', `Your fleet of ${g.ships} moves to ${this.P[pid].name}.`);
    this._afterYou(); return true;
  }
  // Take `n` ships off a fleet as a fleet of their own (the whole fleet if n is not given).
  _detach(f, n) {
    if (!n || n >= f.ships) return f;
    f.ships -= n; const g = { id: ++this.fid, owner: f.owner, at: f.at, ships: n, moved: false }; if (f.mix) { g.mix = [...f.mix]; g.wear = f.wear || 0; } this.fleets.push(g); return g;
  }
  // What one ship costs at this system. The key world's kind and the priority front make it cheaper.
  shipCost(p) {
    const c = { ...C.ship.cost }, t = this.keyWorld(p).type;
    if (t === 'refinery') c.fuel = 0; if (t === 'forge') c.army = 0; if (t === 'colony') c.drop = 0;
    if (this.priority != null && p.front === this.priority) c.fuel = Math.max(0, c.fuel - C.priority.fuel);
    if (p.station) c.fuel = Math.max(0, c.fuel - C.link.stationFuel);
    return c;
  }
  hasYard(p) { return !C.post.yardNeedsStation || p.id === 0 || !!p.station; }
  canBuild(pid) { const p = this.P[pid]; return this.ready() && !!p && p.owner === 'fed' && !p.built && this.hasYard(p) && this.onFront(pid) && this.fedLinked().has(pid) && this.canPay(this.shipCost(p)); }
  // BUILD: one ship at a system of yours on this front, one per system each round. It can move from next round.
  // Building does not use up your decision.
  build(pid) {
    if (!this.canBuild(pid)) return false;
    const p = this.P[pid]; this._pay(this.shipCost(p)); p.built = true;
    const f = this.fleetAt(pid, 'fed'); if (f) { this._blend(f, 1, null); f.ships++; } else this._put('fed', pid, 1, true);   // joining a fleet does not stop that fleet moving
    this.say('info', `A ship is built at ${p.name}.`);
    return true;
  }
  canSite(pid, key) { const p = this.P[pid], s = C.sites[key]; return this.ready() && !!p && !!s && p.owner === 'fed' && p.id !== 0 && !p.site && this.onFront(pid) && this.fedLinked().has(pid) && this.loot[s.loot] >= s.cost && this.P.filter(q => q.site === key).length < C.siteMax; }
  // BUILD A SPECIAL SITE: paid for with a front's own resource. It puts two unique cards in your battle deck.
  // Like building a ship, it does not use up your decision.
  site(pid, key) {
    if (!this.canSite(pid, key)) return false;
    const s = C.sites[key]; this.loot[s.loot] -= s.cost; this.P[pid].site = key;
    this.say('good', `${s.name} built at ${this.P[pid].name}: ${s.text}`);
    return true;
  }
  // HOLD: do nothing on this front this round.
  hold() { if (!this.ready()) return false; this._afterYou(); return true; }

  // ---------- the offices (free: they do not use up your decision) ----------
  trade(from, to) {
    if (!this.ready() || from === to || !this.canPay({ [from]: C.trade.give })) return false;
    this.res[from] -= C.trade.give; this.res[to] = Math.min(this.resMax(), this.res[to] + C.trade.get); return true;
  }
  income() {
    const fl = this.fedLinked(), pol = C.policy[this.policy], r = { ...C.capitalYield };
    for (const p of this.P) {
      if (p.owner !== 'fed' || p.id === 0 || !fl.has(p.id)) continue;
      const m = (1 + C.develop.mult * p.dev + (C.link.baseYield + 0.1 * this.lv('b_yard')) * (p.base || 0) + (this.sectorHeld(p) ? C.sector.yield : 0)) * (this.priority != null && p.front === this.priority ? C.priority.yield : 1);
      if (p.base) { r.army += C.post.train.army * p.base * pol.forge; r.drop += C.post.train.drop * p.base * pol.drop; }
      for (const w of p.worlds) {
        const t = C.worlds[w.type]; if (!t.res) continue;
        r[t.res] += t.y * m * (t.res === 'drop' ? pol.drop : t.res === 'army' ? pol.forge : 1) * (t.res === 'fuel' ? 1 : C.post.worldTroops);
        if (w.type === 'colony') r.army += pol.army * m * C.post.worldTroops;
      }
    }
    const ym = this.ratYield(); if (ym !== 1) for (const k in r) r[k] *= ym;
    return r;
  }
  developCost(p) { return { fuel: C.develop.fuel * (p.dev + 1), army: C.develop.army * (p.dev + 1) }; }
  develop(pid) {
    const p = this.P[pid];
    if (!this.ready() || !p || p.owner !== 'fed' || p.dev >= C.develop.max || !this.fedLinked().has(pid) || !p.worlds.some(w => C.worlds[w.type].res)) return false;
    const c = this.developCost(p); if (!this.canPay(c)) return false;
    this._pay(c); p.dev++; return true;
  }
  setPolicy(k) { if (!this.ready() || !C.policy[k]) return false; this.policy = k; return true; }
  setPriority(k) { if (!this.ready()) return false; this.priority = this.priority === k ? null : k; return true; }
  // Intelligence: what to do on the front in play, most pressing first.
  advice() {
    const out = [], say = (kind, text, pid, fid) => out.push({ kind, text, pid, fid });
    if (!this.ready()) return out;
    const fr = this.fi >= 0 ? C.fronts[this.fi] : null, mine = this.fleets.filter(f => f.owner === 'fed' && !f.moved);
    const hot = this.P.filter(p => p.owner === 'fed' && this.onFront(p.id)).map(p => ({ p, t: this.threat(p.id) })).filter(h => h.t).sort((a, b) => a.p.ring - b.p.ring);
    for (const h of hot.slice(0, 3)) {
      const mineHp = this.strength(h.p.id), bad = mineHp < h.t.hp * 1.1;
      if (h.p.id === 0) say('bad', `${N.factions[h.t.f]} has ${h.t.ships} ships beside ${N.capital} (${h.t.hp} hit points against your ${mineHp}).${this.capHit.length ? ' A second enemy striking it this round is defeat.' : ''} Bring a fleet home.`, 0);
      else if (bad) say('warn', `${h.p.name} is likely to fall: ${h.t.ships} enemy ships beside it (${h.t.hp} hit points) against your ${mineHp}. Move a fleet there, or build a ship there.`, h.p.id);
    }
    let best = null;
    for (const f of mine) for (const t of this.targets(f)) { const r = f.ships * HP / this.strength(t); if (!best || r > best.r) best = { f, t, r }; }
    if (best && best.r >= 1.15) say('good', `Your fleet of ${best.f.ships} at ${this.P[best.f.at].name} can take ${this.P[best.t].name}: ${best.f.ships * HP} hit points against ${this.strength(best.t)}${this.P[best.t].kind === 'home' ? '. It is the enemy home' : ''}.`, best.t, best.f.id);
    else if (best) say('info', `No attack on this front is safe yet. The softest target is ${this.P[best.t].name} (${this.strength(best.t)} hit points); your strongest fleet in reach has ${best.f.ships * HP}.`, best.t);
    if (this.P.some(p => this.canBuild(p.id))) say('info', 'You can afford a ship. Pick your headquarters or a system with a station to build one.');
    for (const k in C.sites) if (this.P.some(p => this.canSite(p.id, k))) say('good', `You have enough ${C.fronts[C.factions.indexOf(C.sites[k].loot)].loot.toLowerCase()} for a ${C.sites[k].name}: ${C.sites[k].text} Pick a system of yours to build it.`);
    if (!out.length) say('info', fr ? 'Nothing presses on this front. Build, bring a fleet across, or hold.' : 'No front is at war. Place a fleet or build a ship, then end the round.');
    return out.slice(0, 6);
  }

  // ---------- the turn ----------
  _startRound() {
    this.fi = C.fronts.findIndex((_, i) => this.atWar(i));
    if (this.fi < 0) { this.phase = 'plan'; this.last = null; return; }
    this._enemyAct();
  }
  // After your decision: on to the next front at war, or the end of the round.
  _afterYou() {
    if (this.over) return;
    if (this.fi >= 0) { let i = this.fi + 1; while (i < 3 && !this.atWar(i)) i++; if (i < 3) { this.fi = i; return this._enemyAct(); } }
    this._endRound();
  }
  _endRound() {
    const r = this.res, inc = this.income();
    const cap = this.resMax(); for (const k in inc) r[k] = clamp(r[k] + inc[k], 0, cap);
    if (this.round % C.link.shipEvery === 0) { const fl = this.fedLinked(); for (const p of this.P) if (p.owner === 'fed' && (p.base || 0) >= C.link.shipAt && fl.has(p.id)) this._put('fed', p.id, 1); }
    this._posts(); this._ratRound(); this._fleetRound();
    for (const f of this.fleets) f.moved = false;
    for (const p of this.P) { p.built = false; if (p.dmg) p.dmg = Math.max(0, p.dmg - C.battle.repair); }
    this.capHit = [];
    this.round++;
    this._arrivals();
    this._startRound();
  }

  _arrivals() {
    for (const f of C.factions) {
      const F = this.F[f], c = C.enemy[f], fr = C.fronts[F.front];
      if (F.state === 'wait' && this.round >= F.at - C.warn) { F.state = 'warn'; this.say('warn', `Intelligence Office: hostile signals near ${N.homes[f]}, on the ${fr.name.toLowerCase()}. Expected in ${Math.max(1, F.at - this.round)} round(s).`); }
      if (F.state === 'warn' && this.round >= F.at) {
        F.state = 'active'; F.arrived = this.round;
        // They burst in: the home and the systems beside it on its front fall at once.
        const take = [F.home, ...this.P.filter(q => q.front === F.front && q.ring >= C.arriveRing && q.id !== F.home).sort((a, b) => a.ring - b.ring || a.id - b.id).map(q => q.id)];
        for (const id of take) { const p = this.P[id], mine = this.fleetAt(id, 'fed'); this._capture(p, f); if (mine) this._retreat(mine, id); }
        c.init.forEach((n, i) => this._put(f, take[1 + ((i * 5) % (take.length - 1))], n));     // its first fleets stand on the inner edge of what it took
        this.say('bad', `${N.factions[f]} has taken ${N.homes[f]} and the ${take.length - 1} systems of the outer rings. The ${fr.name.toLowerCase()} is open.`);
      }
    }
  }
  _capture(p, owner) { this._sec = null; const was0 = p.owner; p.owner = owner; p.dev = 0; p.dmg = 0; p.sp = 0; p.bp = 0; if (p.station || p.base) { const was = was0; if (was === 'fed') { this.say('bad', `${p.station ? 'The station over' : 'The base on'} ${p.name} is lost.`); this.lostSites = (this.lostSites || []).concat(p.id); } else if (owner === 'fed') this.say('good', `${p.station && p.base ? 'The station and the base at' : p.station ? 'The station over' : 'The base on'} ${p.name} ${p.station && p.base ? 'are' : 'is'} under new management: yours.`); p.station = p.station ? 1 : 0; p.base = p.base ? 1 : 0; } if (p.site) { if (owner !== 'fed') this.say('bad', `The ${C.sites[p.site].name} at ${p.name} is lost.`); p.site = null; } }
  // A beaten fleet falls back to a neighbouring system of its own side, or is lost if there is none.
  _retreat(f, pid) {
    const fl = f.owner === 'fed' ? this.fedLinked() : null;
    const out = this.P[pid].adj.filter(n => this.P[n].owner === f.owner).sort((a, b) => (f.owner === 'fed' ? (fl.has(b) - fl.has(a)) || this.P[a].dist - this.P[b].dist : this.P[b].dist - this.P[a].dist))[0];
    this._drop(f);
    if (out == null || f.ships <= 0) return;
    this.moves.push({ owner: f.owner, from: pid, to: out, ships: f.ships }); this._put(f.owner, out, f.ships, true, f);
  }

  // The enemy's one action on its front: attack with a fleet if the odds are good enough, otherwise bring a fleet up.
  _enemyAct() {
    const fr = C.fronts[this.fi], f = fr.f, F = this.F[f], c = C.enemy[f];
    this.phase = 'plan'; this.last = { f, text: 'holds its ground.' };
    // ships gather at its home by themselves
    {
      const E = C.foe, sys = this.P.filter(p => p.owner === f), link = this.linked(f, F.home), st = sys.filter(p => p.station && link.has(p.id)), bs = sys.filter(p => p.base && link.has(p.id));
      const yard = E.home + st.length * E.yard, sup = E.supply.base + sys.length * E.supply.per + bs.length * E.supply.perBase;
      F.pool += Math.min(yard, sup) * (E.level[this.opt.level] ?? 1);
      const yards = [F.home, ...st.map(p => p.id)].filter(id => this.P[id].owner === f);
      let n = Math.floor(F.pool); if (n > 0 && yards.length) { F.pool -= n; while (n-- > 0) { F.yardI = ((F.yardI || 0) + 1) % yards.length; this._put(f, yards[F.yardI], 1); } }
      // a new post, when it is due: a station just behind the line, a base as far from it as it has
      const posts = sys.filter(p => p.station).length + sys.filter(p => p.base).length;
      if (F.arrived != null && this.round - F.arrived >= E.firstAfter && this.round - (F.foundAt ?? F.arrived) >= E.foundEvery && posts < Math.floor(sys.length / E.perSystems)) {
        const kind = sys.filter(p => p.station).length <= sys.filter(p => p.base).length ? 'station' : 'base';
        const line = id => this.P[id].adj.some(t => this.P[t].owner === 'fed');
        const c2 = sys.filter(p => p.id !== F.home && link.has(p.id) && !p[kind] && !line(p.id)).sort((a, b) => kind === 'station' ? a.dist - b.dist || a.id - b.id : b.dist - a.dist || a.id - b.id)[0];
        if (c2) { c2[kind] = 1; F.foundAt = this.round; this._sec = null; }
      }
    }
    if (F.arrived === this.round) { this.last = { f, text: 'has arrived.', arrived: true }; return; }   // the round it arrives, it only shows itself
    const ok = id => id === 0 || this.P[id].front === F.front;
    const mine = this.fleets.filter(x => x.owner === f);
    // 1. attack: the fleet with the best odds against a system of yours beside it
    let best = null;
    for (const x of mine) for (const t of this.P[x.at].adj) {
      if (!ok(t) || this.P[t].owner !== 'fed') continue;
      const r = x.ships * HP / this.strength(t) + (t === 0 ? 0.1 : 0) - this.P[t].dist * 0.01;
      if (!best || r > best.r) best = { x, t, r };
    }
    if (best && (best.r >= c.aggr || F.wait >= C.patience)) {
      F.wait = 0;
      if (best.t === 0) {
        if (this.capHit.length && !this.capHit.includes(f)) return this._end('lost', `Two enemies struck ${N.capital} in the same round.`);
        this.capHit.push(f);
      }
      this.last = { f, text: `attacks ${this.P[best.t].name} with ${best.x.ships} ship${best.x.ships > 1 ? 's' : ''}.`, pid: best.t };
      return this._startBattle('def', f, best.t, best.x.at, best.x);
    }
    // 2. bring a fleet up: the biggest fleet behind the line goes to the system of its own beside your weakest
    const link = this.linked(f, F.home), lineOf = id => this.P[id].adj.some(t => ok(t) && this.P[t].owner === 'fed');
    const back = mine.filter(x => link.has(x.at) && !lineOf(x.at) && (x.at !== F.home || x.ships >= c.send)).sort((a, b) => b.ships - a.ships)[0];
    const line = [...link].filter(lineOf).sort((a, b) => Math.min(...this.P[a].adj.filter(t => ok(t) && this.P[t].owner === 'fed').map(t => this.strength(t))) - Math.min(...this.P[b].adj.filter(t => ok(t) && this.P[t].owner === 'fed').map(t => this.strength(t))) || this.P[a].dist - this.P[b].dist);
    if (back && line.length) {
      const to = (f === 'foundry' && line.find(id => this.fleetAt(id, f))) || line[0];   // the Foundry masses its fleets in one place
      this.moves.push({ owner: f, from: back.at, to, ships: back.ships }); this._drop(back); this._put(f, to, back.ships);
      this.last = { f, text: `brings ${back.ships} ship${back.ships > 1 ? 's' : ''} up to ${this.P[to].name}.`, pid: to };
      F.wait = 0; return;
    }
    if (best) { F.wait++; this.last = { f, text: 'holds, and gathers strength.', pid: best.x.at }; }
  }

  // ---------- battles ----------
  // kind 'atk': you attack an enemy system. kind 'def': the enemy attacks a system of yours.
  // Each side: hit points, ships (each fires 1 a round), and a hand drawn at random from its deck.
  _startBattle(kind, f, pid, from, fleet) {
    const p = this.P[pid], here = this.fleetAt(pid, p.owner), side = (hp, ships, owner) => ({ hp, max: hp, ships, fire: Math.max(1, ships), hand: this._hand(owner), owner });
    const att = side(fleet.ships * HP, fleet.ships, fleet.owner), def = side(this.strength(pid) + this.escortHp(here), here ? here.ships : 0, p.owner);
    if (fleet.owner === 'fed') { att.fire = this.fleetFire(fleet, true); this._wear(fleet, C.fleet.wear.attack); }
    if (here && here.owner === 'fed') { def.fire = this.fleetFire(here, false); this._wear(here, C.fleet.wear.defend); }
    this.battle = { kind, f, pid, from, fid: fleet.id, fort: this.fort(p), limit: C.battle.engage, you: kind === 'atk' ? att : def, foe: kind === 'atk' ? def : att, round: 0, done: false, win: null, ev: null, lines: [] };
    this.phase = 'battle';
  }
  // The enemy's choice of card: block when it would otherwise die or is far behind, else its hardest hit.
  _foePick(b) {
    const h = b.foe.hand; if (!h.length) return null;
    const val = id => { const c = C.bcards[id]; return (c.atk || 0) * 1.2 + (c.heal || 0) * (b.foe.hp < b.foe.max ? 1 : 0.2) + (c.block || 0) * (b.foe.hp <= b.you.fire + 4 ? 2 : 0.6) + (c.sap || 0) * 2 + this.rnd(); };
    let bi = 0; for (let i = 1; i < h.length; i++) if (val(h[i]) > val(h[bi])) bi = i;
    return h.splice(bi, 1)[0];
  }
  // Play one round. `i` is the card in your hand to play, or null to play none.
  battlePlay(i) {
    const b = this.battle; if (!b || b.done) return null;
    const you = b.you, foe = b.foe, lines = [];
    let yc = i != null && you.hand[i] ? you.hand.splice(i, 1)[0] : null, fc = this._foePick(b);
    // propaganda against propaganda: the stronger takes the other's card and cancels it
    const Y = yc && C.bcards[yc], Fc = fc && C.bcards[fc];
    if (Y && Fc && Y.kind === 'truth' && Fc.kind === 'truth') {
      if (Y.power > Fc.power) { lines.push(`Your ${Y.name} drowns out ${Fc.name}. You take the card.`); this.truth.fed.push(fc); fc = null; }
      else if (Fc.power > Y.power) { lines.push(`${Fc.name} drowns out your ${Y.name}. ${N.factions[b.f]} takes the card.`); this.truth[b.f].push(yc); yc = null; }
      else { lines.push(`${Y.name} and ${Fc.name} cancel each other out.`); yc = fc = null; }
    }
    for (const [id, owner] of [[yc, 'fed'], [fc, b.f]]) { if (id && C.bcards[id].kind === 'truth') { const t = this.truth[owner], k = t.indexOf(id); if (k >= 0) t.splice(k, 1); } }   // propaganda is used up
    const a = yc ? C.bcards[yc] : {}, e = fc ? C.bcards[fc] : {};
    if (a.heal) you.hp = Math.min(you.max, you.hp + a.heal);
    if (e.heal) foe.hp = Math.min(foe.max, foe.hp + e.heal);
    const hitFoe = Math.max(0, you.fire + (a.atk || 0) - (a.pierce ? 0 : e.block || 0)) + (a.reflect && (foe.fire + (e.atk || 0)) > 0 ? a.reflect : 0);
    const hitYou = Math.max(0, foe.fire + (e.atk || 0) - (e.pierce ? 0 : a.block || 0)) + (e.reflect ? e.reflect : 0);
    foe.hp -= hitFoe; you.hp -= hitYou;
    if (a.sap) foe.fire = Math.max(0, foe.fire - a.sap);
    if (e.sap) you.fire = Math.max(0, you.fire - e.sap);
    b.round++;
    lines.push(yc ? `You play ${a.name}: your fleet hits for ${hitFoe}.` : `Your guns hit for ${hitFoe}.`);
    lines.push(fc ? `${N.factions[b.f]} plays ${e.name}: it hits you for ${hitYou}.` : `${N.factions[b.f]} hits you for ${hitYou}.`);
    // the end: whoever is out of hit points loses; if both are, the defender holds; a very long fight goes to the defender
    const youDown = you.hp <= 0, foeDown = foe.hp <= 0;
    if (youDown || foeDown || b.round >= b.limit || b.round >= C.battle.maxRounds) {
      b.done = true;
      // nobody out of hit points when the engagement ends: the fight for the system goes on next round (win is null)
      b.win = youDown && foeDown ? b.kind === 'def' : foeDown ? true : youDown ? false : null;
      you.hp = Math.max(0, you.hp); foe.hp = Math.max(0, foe.hp);
    }
    b.ev = { round: b.round, yc, fc, hitFoe, hitYou, healYou: a.heal || 0, healFoe: e.heal || 0, blockYou: a.block || 0, blockFoe: e.block || 0 };
    b.lines = lines;
    if (b.done && !(b.win === null && this.canPress())) this._settle(b); else if (b.done) b.pending = true;
    return b.ev;
  }
  // PRESS THE ATTACK: when your attack ends undecided you may pay fuel to fight on for more rounds, now.
  canPress() { const b = this.battle; return !!b && b.kind === 'atk' && b.win === null && !b.pressed && this.canPay({ fuel: C.battle.press.fuel }); }
  press() {
    const b = this.battle; if (!b || !b.pending || !this.canPress()) return false;
    this._pay({ fuel: C.battle.press.fuel }); b.pressed = true; b.pending = false; b.done = false; b.limit += C.battle.press.rounds; b.lines = ['The fleet presses the attack.'];
    return true;
  }
  // Break off instead: the engagement is settled as it stands.
  breakOff() { const b = this.battle; if (!b || !b.pending) return false; b.pending = false; this._settle(b); return true; }
  // How hard the ground is, from what each side has put into this fight: the enemy's hit points here against yours.
  groundLevel() {
    const b = this.battle; if (!b) return 1; const p = this.P[b.pid], L = C.link, st = this.sectorStation(p);
    let raw = 1.5 + 1.5 * Math.log2(Math.max(1, b.foe.hp) / Math.max(1, b.you.hp)) + (p.kind === 'home' ? 2 : 0);
    if (b.kind === 'atk') raw += Math.floor((p.ring - 1) / L.depthPer);                       // deeper into its rings
    raw += Math.floor(((this.sectorOwners(), this._cnt)[b.f] || 0) / L.holdPer);               // the more it holds, the more it brings
    raw -= st >= L.threatAt[1] ? 2 : st >= L.threatAt[0] ? 1 : 0;                              // a station overhead
    return clamp(Math.round(raw), L.level.min, L.level.max);
  }
  // What your posts and your ratings bring to a fight on the ground at this system: from the system itself and from
  // yours one link away.
  groundSupport(pid) {
    const p = this.P[pid], fl = this.fedLinked(), S = C.support, R = C.ratings; let base = 0, station = 0;
    for (const q of [p, ...p.adj.map(i => this.P[i])]) if (q.owner === 'fed' && fl.has(q.id)) { base = Math.max(base, q.base || 0); station = Math.max(station, q.station || 0); }
    const ratings = this.rat >= R.high ? S.ratLives : this.rat < R.low ? -S.ratLives : 0;
    return { base, station, ratings, garrison: base * S.garrisonPer, lives: station * S.stationLives + ratings };
  }
  // ---------- ratings ----------
  rate(n) { this.rat = clamp(this.rat + n, 0, 100); }
  ratBand() { const R = C.ratings; return this.rat >= R.high ? 'high' : this.rat < R.sack ? 'sack' : this.rat < R.low ? 'low' : 'mid'; }
  ratYield() { const b = this.ratBand(); return b === 'mid' ? 1 : C.ratings.yield[b]; }
  // what the sponsors pay follows the ratings: half at nothing, half again at a hundred
  ratPay() { const P = C.ratings.pay; return P.min + (P.max - P.min) * this.rat / 100; }
  _ratRound() {
    const R = C.ratings;
    if (this.rat > R.settle) this.rate(-Math.max(0.5, (this.rat - R.settle) * R.drift));
    if (this.rat < R.sack) { this.sack++; if (this.sack >= R.sackRounds) return this._end('lost', `Ratings under ${R.sack}% for ${R.sackRounds} rounds. The board has replaced you.`); this.say('bad', `Ratings Office: under ${R.sack}%. The board meets in ${R.sackRounds - this.sack} round${R.sackRounds - this.sack === 1 ? '' : 's'}.`); }
    else this.sack = 0;
  }
  // A SHOW: a parade at a base, a gala at a station. The post must be linked and in profit, and not have put one on lately.
  showCost(kind) { return C.ratings.show.cost[kind]; }
  canShow(pid, kind) { const p = this.P[pid]; return this.ready() && !!p && p.owner === 'fed' && !!p[kind] && !! p[kind === 'station' ? 'sp' : 'bp'] && this.fedLinked().has(pid) && this.round - (p['show' + kind] ?? -99) >= C.ratings.show.every && this.canPay(this.showCost(kind)); }
  show(pid, kind) {
    if (!this.canShow(pid, kind)) return false; const p = this.P[pid]; this._pay(this.showCost(kind)); p['show' + kind] = this.round; this.rate(C.ratings.show.gain);
    const L = kind === 'base' ? [`A parade at ${p.name}. Nine bands, one tune.`, `${p.name} marches past the cameras. Twice, for the second angle.`, `A parade at ${p.name}. The flypast was only slightly late.`]
                              : [`A gala over ${p.name}. The canapés were in formation.`, `${p.name} station opens its doors to the press. Most of them.`, `A gala over ${p.name}. The sponsors' speeches ran long.`];
    this.say('good', 'Publicity Office: ' + L[(this.round + pid) % L.length]); return true;
  }
  // ---------- the war chest, deposits and the armoury ----------
  lv(id) { return (this.up && this.up[id]) || 0; }
  // Which front's material lies under a system, if any: fixed by the map, about three systems in ten, and every enemy home.
  deposit(p) { if (p.front < 0 || p.id === 0) return null; return p.kind === 'home' || (Math.imul(p.id + 7, 2654435761) >>> 0) % 100 < C.deposit.share * 100 ? C.fronts[p.front].f : null; }
  // Armoury rank: every station tier and base charter that is linked and running in profit.
  rank() { const fl = this.fedLinked(); let n = 0; for (const p of this.P) if (p.owner === 'fed' && fl.has(p.id)) n += (p.sp ? p.station || 0 : 0) + (p.bp ? p.base || 0 : 0); return Math.min(C.rankMax, n); }
  // What the posts and sectors pay this round: credits owed to the chest, and material lifted by bases on deposits.
  postsPay() {
    const fl = this.fedLinked(), out = { cr: 0, mat: { molt: 0, foundry: 0, talon: 0 } };
    for (const p of this.P) {
      if (p.owner !== 'fed' || !fl.has(p.id)) continue;
      if (p.station && p.sp) out.cr += p.station * (C.chest.post + 10 * this.lv('s_trade'));
      if (p.base && p.bp) out.cr += p.base * C.chest.post;
      const d = p.base ? this.deposit(p) : null; if (d) out.mat[d] += C.deposit.per + (p.bp ? C.deposit.profit : 0) + this.lv('b_rigs');
    }
    for (const [id, o] of this.sectorOwners()) if (o === 'fed' && id !== 0) out.cr += C.chest.sector;
    out.cr = Math.round(out.cr * this.ratPay());
    return out;
  }
  _posts() { const o = this.postsPay(); this.due += o.cr; for (const k in o.mat) this.loot[k] += o.mat[k]; }
  // The shell empties this into the war chest whenever it looks.
  takeDue() { const n = this.due || 0; this.due = 0; return n; }
  shelfItem(id) { for (const k in C.shelf) for (const it of C.shelf[k]) if (it.id === id) return it; return null; }
  // The next level of an upgrade: { cr, mat, n, rank }, or null when it is at its top.
  nextLevel(id) { const it = this.shelfItem(id), l = it && it.lv[this.lv(id)]; return l ? { cr: l[0], mat: it.mat, n: l[1], rank: l[2] } : null; }
  canBuy(id, bal) { const n = this.nextLevel(id); return !!n && bal >= n.cr && this.loot[n.mat] >= n.n && this.rank() >= n.rank; }
  buy(id, wallet) { if (!this.canBuy(id, wallet.bal)) return false; const n = this.nextLevel(id); wallet.bal -= n.cr; wallet.spent = (wallet.spent || 0) + n.cr; this.loot[n.mat] -= n.n; this.up[id] = this.lv(id) + 1; return true; }
  // FOUND a station over, or a base on, a system of yours: paid for from the war's resources.
  canFound(pid, kind) { const p = this.P[pid]; return this.ready() && !!p && p.owner === 'fed' && p.id !== 0 && !p[kind] && this.fedLinked().has(pid) && this.canPay(C.link.found[kind]); }
  found(pid, kind) { if (!this.canFound(pid, kind)) return false; this._pay(C.link.found[kind]); this.P[pid][kind] = 1; this._sec = null; this.rate(C.ratings.found); this.say('good', `A ${kind} is founded at ${this.P[pid].name}.`); return true; }
  // A battle fought on the ground instead of with cards. `win` is whether you won it; `left` (0 to 1) is how much of
  // the winner's strength is still standing. The map is settled exactly as after a card battle.
  // The sponsors' stunt for the fight in front of you, if it is the one that will be aired this round.
  stunt() { const b = this.battle; if (!b || this.aired === this.round) return null; return C.stunts[(this.seed + this.round * 7 + b.pid * 3) % C.stunts.length]; }
  battleResolve(win, left = 0.5, res = null) {
    const b = this.battle; if (!b || b.done) return false;
    left = clamp(left, 0, 1);
    if (win) this.loot[b.f] += Math.round(left * C.post.groundLoot);
    const st = this.stunt(); if (st && win && res) { let ok = false; try { ok = !!st.test(res); } catch { ok = false; } if (ok) { this.rate(C.ratings.stunt); this.say('good', `Publicity Office: ${st.name}, live. The sponsors are delighted.`); } }
    if (this.aired !== this.round) { this.aired = this.round; const G = C.ratings.ground; this.rate(win ? G.win + (left >= G.flawlessAt ? G.flawless : 0) : G.loss); if (win && left >= G.flawlessAt) this.say('good', 'Publicity Office: a flawless action, live. The footage is everywhere.'); }
    // one hard engagement: each side's fire over a full engagement, scaled by how the ground went
    const K = win ? C.groundWin : C.groundLoss, n = C.battle.engage;
    const deal = Math.ceil((b.you.fire * n + 3) * K.deal), take = Math.ceil((b.foe.fire * n + 2) * K.take * (win ? 1 - 0.7 * left : 1));
    b.foe.hp = Math.max(0, b.foe.hp - deal); b.you.hp = Math.max(win ? 1 : 0, b.you.hp - take);     // a ground you won always leaves something standing
    b.done = true; b.ground = true; b.round = Math.max(1, b.round);
    b.win = b.foe.hp <= 0 ? true : b.you.hp <= 0 ? false : null;
    if (win && b.win === false) { b.win = null; b.you.hp = 1; }      // a ground you won is never the round you are thrown off it
    b.lines = [win ? `The ground action is won: ${deal} damage done, ${take} taken.` : `The ground action is lost: ${take} damage taken, ${deal} done.`];
    this._settle(b);
    return true;
  }
  // What a battle leaves on the map. The result is shown until `battleClose()`.
  _settle(b) {
    const p = this.P[b.pid], f = b.f, fn = N.factions[f], fr = C.fronts[this.F[f].front];
    const left = (side, own) => Math.min(side.ships, Math.ceil(Math.max(0, side.hp - own) / HP));   // ships still flying: the system's own defences soak up damage first
    const gain = n => { this.loot[f] += n; b.lines.push(`+${n} ${fr.loot.toLowerCase()}.`); };
    const mine = this.fleets.find(x => x.id === b.fid && x.owner === 'fed') || this.fleetAt(b.pid, 'fed'), theirs = this.fleets.find(x => x.id === b.fid && x.owner === f) || this.fleetAt(b.pid, f);
    if (b.win === null) {
      // The fight goes on. Each side keeps the ships its hit points still pay for, and the system keeps the damage to its own
      // defences until it is repaired, a point a round.
      const att = b.kind === 'atk' ? b.you : b.foe, def = b.kind === 'atk' ? b.foe : b.you;
      const attF = b.kind === 'atk' ? mine : theirs, defF = this.fleetAt(b.pid, p.owner);
      const lost = def.max - def.hp, toFort = Math.min(b.fort, lost);
      p.dmg = (p.dmg || 0) + toFort;
      if (defF) { defF.ships = left(def, b.fort - toFort); if (defF.ships <= 0) this._drop(defF); }
      if (attF) { attF.ships = left(att, 0); if (attF.ships <= 0) this._drop(attF); }
      b.result = `The fight for ${p.name} goes on.`; this.stats.sieges = (this.stats.sieges || 0) + 1;
      this.say('warn', `${p.name}: neither side gives way. ${b.kind === 'atk' ? 'Your attack' : fn + "'s attack"} continues next round if it is pressed.`);
      return;
    }
    if (b.kind === 'atk') {
      if (b.win) {
        if (theirs) { theirs.ships = Math.floor(theirs.ships / 2); this._retreat(theirs, b.pid); }
        this._capture(p, 'fed'); this.stats.taken++; this.rate(p.kind === 'home' ? C.ratings.takeHome : C.ratings.take);
        mine.ships = Math.max(1, left(b.you, 0)); this.moves.push({ owner: 'fed', from: mine.at, to: b.pid, ships: mine.ships }); this._drop(mine); this._put('fed', b.pid, mine.ships, true, mine);
        b.result = `${p.name} is yours.`; this.say('good', `${p.name} taken from ${fn}.`);
        gain(p.kind === 'home' ? C.loot.home : C.loot.attack); this._truth('fed', 'newsreel', `${p.name} taken`);
        if (p.kind === 'home') this._kill(f);
      } else {
        mine.ships = Math.floor(mine.ships / 2); if (mine.ships <= 0) this._drop(mine);
        if (theirs) theirs.ships = Math.max(1, left(b.foe, b.fort));
        this.stats.repelled++; this.rate(C.ratings.repelled);
        b.result = `The attack on ${p.name} is beaten off. Half the fleet is lost.`; this.say('bad', `The attack on ${p.name} failed.`);
        this._truth(f, 'triumph', 'it repelled you');
      }
    } else if (b.win) {
      if (theirs) { theirs.ships = Math.floor(theirs.ships / 2); if (theirs.ships <= 0) this._drop(theirs); }
      if (mine) { mine.ships = left(b.you, b.fort); if (mine.ships <= 0) this._drop(mine); }
      this.stats.held++; this.rate(C.ratings.hold);
      b.result = `${p.name} holds.`; this.say('good', `${p.name} held against ${fn}.`);
      gain(C.loot.defend); this._truth('fed', 'heroes', `${p.name} held`);
    } else {
      if (b.pid === 0) { b.result = `${N.capital} has fallen.`; return this._end('lost', `${N.capital} fell to ${fn}.`); }
      this.rate(C.ratings.fall + (p.station || p.base ? C.ratings.postLost : 0)); this._capture(p, f); this.stats.fallen++;
      if (mine) { mine.ships = Math.floor(mine.ships / 2); this._retreat(mine, b.pid); }
      theirs.ships = Math.max(1, left(b.foe, 0)); this.moves.push({ owner: f, from: theirs.at, to: b.pid, ships: theirs.ships }); this._drop(theirs); this._put(f, b.pid, theirs.ships);
      b.result = `${p.name} has fallen.`; this.say('bad', `${p.name} fell to ${fn}.`);
      this._truth(f, 'dread', `it took ${p.name}`); this._truth('fed', 'lastStand', `${p.name} fell`);
    }
  }
  // Leave the battle screen. After the enemy's attack it is your decision; after yours, the next front.
  battleClose() {
    const b = this.battle; if (!b || !b.done) return false;
    if (b.pending) this.breakOff();
    this.battle = null; this._tidy(); if (this.over) return true;
    this.phase = 'plan';
    if (b.kind === 'atk') this._afterYou();
    return true;
  }

  // Fleets of one side that end up in the same system become one fleet.
  _tidy() {
    const at = new Map();
    for (const x of [...this.fleets]) { const k = x.owner + ':' + x.at, a = at.get(k); if (a) { a.ships += x.ships; a.moved = a.moved || x.moved; this._drop(x); } else at.set(k, x); }
  }

  _kill(f) {
    const F = this.F[f]; F.state = 'dead';
    for (const p of this.P) if (p.owner === f) this._capture(p, 'fed');
    this.fleets = this.fleets.filter(x => x.owner !== f);
    this.truth[f] = [];
    this.say('good', `${N.homes[f]} is taken. ${N.factions[f]} is wiped from the map.`);
    if (C.factions.every(k => this.F[k].state === 'dead')) this._end('won', 'All three enemies are gone from the map.');
  }
  _end(result, why) {
    this.over = { result, why, round: this.round }; this.phase = 'over';
    this.say(result === 'won' ? 'good' : 'bad', why);
  }
}
