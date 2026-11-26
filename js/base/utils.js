// Utilities (0.15): power, water, sewage and fuel.
// (GC 0.88, Ramzies: "power the foundation"; dirt roads carry nothing) They run through NETWORKS: the tiles of finished
// foundations and of paved roads and bridges, joined edge to edge. A building is on a network when it stands on one of its
// tiles or one runs right beside it. A source (a generator, solar array, well, purifier, lagoon, treatment plant, fuel
// farm) serves every building on its network; a Substation joins the networks within its reach for power, a Water Tower
// for water. The command post's own plant still covers the tents round it (its circle, below), so a new base has power
// and water before it has a network. Below, the 0.15 notes on circles hold for the command post only.
//   - Every utility building covers a circle round it (B[type].cover, and UTIL.powCover for power sources). A building is
//     covered when its footprint comes within the circle.
//   - Power: a building that draws power and is outside every power circle goes dark: it draws nothing and does nothing.
//   - Water: wells and purification units make water, towers carry it further. Bunks, messes, wards and the hydro dome need
//     it. Sewage: lagoons and treatment plants take the waste of the same buildings. The HQ covers the first tents.
//   - Fuel: a fuel farm pipes fuel to every generator, motor pool, vehicle bay and factory in reach, every hour.
//   - Health: bunks without water or sewage, or on a well next to a lagoon, raise a daily outbreak risk. Outbreaks put
//     troopers in the Medical Bay (or their bunks) for a day or two. Nobody dies of it.
// Mixed into Sim (see the end of sim.js), so `this` is the simulation.
import { B, UTIL } from './config.js';
import { GROUND } from './site.js';

const mid = b => [b.x + b.w / 2, b.z + b.d / 2];
// does a circle of radius r round source s reach building b's footprint?
const reaches = (s, b, r) => {
  const [cx, cz] = mid(s), dx = Math.max(b.x - cx, 0, cx - (b.x + b.w)), dz = Math.max(b.z - cz, 0, cz - (b.z + b.d));
  return dx * dx + dz * dz <= r * r;
};
const FUELED = new Set(['gen', 'motorpool', 'vbay', 'factory']);
const SICK = { water: ['dysentery', 'a stomach bug from the water'], sewer: ['camp fever', 'a stomach bug from the latrines'], bad: ['something in the well water'] };

export const Utilities = {
  needsWater(b) { const d = B[b.type]; return !!(d.beds || d.eat || d.ward || b.type === 'dome') && b.type !== 'hq'; },
  needsSewer(b) { const d = B[b.type]; return !!(d.beds || d.eat || d.ward) && b.type !== 'hq'; },
  // how far a building's services reach: { pw, wa, se, fu }, for a source that is up and switched on
  coverOf(b) {
    const d = B[b.type], c = { ...(d.cover || {}) };
    if (UTIL.powCover[b.type]) c.pw = UTIL.powCover[b.type];
    if (b.type === 'hq') { c.wa = UTIL.hq.wa; c.se = UTIL.hq.se; }
    return c;
  },
  // ---------------------------------------------------------------- (GC 0.88) the networks
  // which network each tile is on (netMap, 0 for none) and the tiles of each; worked out again when roads or foundations change
  utilNets() {
    const key = `${this.slabV}:${this.roadsV}`; if (this._netK === key && this._nets) return this._nets; this._netK = key;
    const N = this.N, W = this.win(); if (!this.netMap || this.netMap.length !== N * N) this.netMap = new Int32Array(N * N); else this.netMap.fill(0);
    const m = this.netMap, done = new Set(this.b.filter(b => b.type === 'slab' && b.done).map(b => b.id));
    const on = i => this.roads[i] === 2 || (this.slabMap?.[i] && done.has(this.slabMap[i]));
    const tiles = [null]; let n = 0;
    for (let z = W[1]; z < W[3]; z++) for (let x = W[0], i = z * N + x; x < W[2]; x++, i++) {
      if (m[i] || !on(i)) continue;
      n++; const st = [i], list = []; m[i] = n;
      while (st.length) { const k = st.pop(); list.push(k); const kx = k % N; for (const d of [1, -1, N, -N]) { if ((d === 1 && kx === N - 1) || (d === -1 && kx === 0)) continue; const j = k + d; if (j >= 0 && j < N * N && !m[j] && on(j)) { m[j] = n; st.push(j); } } }
      tiles.push(list);
    }
    this._nets = { n, tiles }; this._netU = null; return this._nets;
  },
  // the networks a footprint is on: under it, or right beside it
  netsAt(x, z, w, d) {
    const N = this.N, m = this.netMap, out = new Set(); if (!m) return out;
    for (let j = -1; j <= d; j++) for (let i = -1; i <= w; i++) {
      if ((i < 0 || i >= w) && (j < 0 || j >= d)) continue;     // not the corners
      const tx = x + i, tz = z + j; if (tx < 0 || tz < 0 || tx >= N || tz >= N) continue; const v = m[tz * N + tx]; if (v) out.add(v);
    }
    return out;
  },
  // networks joined: by a building that stands on two, by a Substation (power) or a Water Tower (water) in reach. One
  // find() a service: the network a building draws that service from
  netJoin() {
    const nets = this.utilNets(), key = `${this._netK}:${this.b.length}:${this.b.reduce((a, b) => a + (b.done ? 1 : 0) + (b.off ? 2 : 0), 0)}`;
    if (this._netU && this._netUK === key) return this._netU; this._netUK = key;
    const mk = () => { const p = Int32Array.from({ length: nets.n + 1 }, (_, i) => i); const f = (a) => { while (p[a] !== a) { p[a] = p[p[a]]; a = p[a]; } return a; }; return { f, u: (a, b) => { a = f(a); b = f(b); if (a !== b) p[b] = a; } }; };
    const U = { pw: mk(), wa: mk(), se: mk(), fu: mk() }, on = new Map(), N = this.N;
    for (const b of this.b) {
      if (b.type === 'slab') continue;
      const ns = [...this.netsAt(b.x, b.z, b.w, b.d)]; on.set(b.id, ns);
      for (let i = 1; i < ns.length; i++) for (const k in U) U[k].u(ns[0], ns[i]);
    }
    for (const b of this.b) {
      const link = b.type === 'substation' ? 'pw' : B[b.type].relay === 'wa' ? 'wa' : null; if (!link || !b.done || b.off) continue;
      const r = this.coverOf(b)[link], [cx, cz] = mid(b), seen = new Set();
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (x < 0 || z < 0 || x >= N || z >= N || Math.hypot(x + 0.5 - cx, z + 0.5 - cz) > r) continue; const v = this.netMap[z * N + x]; if (v) seen.add(v);
      }
      const all = [...seen, ...(on.get(b.id) || [])]; for (let i = 1; i < all.length; i++) U[link].u(all[0], all[i]);
      b.joins = new Set(all.map(v => U[link].f(v))).size;
    }
    this._netU = { U, on }; return this._netU;
  },
  // the network a building draws a service from (0: none)
  netOf(b, k) { const J = this.netJoin(), ns = J.on.get(b.id) || [...this.netsAt(b.x, b.z, b.w, b.d)]; return ns.length ? J.U[k].f(ns[0]) : 0; },
  // the tiles of every network joined into one for a service, for the view
  netTiles(root, k) { const nets = this.utilNets(), J = this.netJoin(), out = []; for (let v = 1; v <= nets.n; v++) if (J.U[k].f(v) === root) out.push(...nets.tiles[v]); return out; },
  // what a building puts into a network: pw, wa, se or fu (or nothing)
  serves(b) {
    const d = B[b.type], out = [];
    if (d.pw > 0) out.push('pw'); if (d.water || b.type === 'hq') out.push('wa'); if (d.sewer || b.type === 'hq') out.push('se'); if (d.cover?.fu) out.push('fu');
    return out;
  },
  needs(b, k) { return k === 'se' ? this.needsSewer(b) : k === 'wa' ? this.needsWater(b) : k === 'pw' ? B[b.type].pw < 0 : FUELED.has(b.type); },
  // how many standing buildings a source serves with one of its services (pw, wa, se, fu), for its status card
  servedBy(s, k) {
    return this.servedList(s, k).length;
  },
  servedList(s, k) {     // (GC 0.86) and which: the beams off them when the source is selected. (GC 0.88) Everything on its network,
    // and for the command post, the tents in its circle too. s may be one being placed (id -1)
    this.utilNets(); const J = this.netJoin(), ns = s.id > 0 && J.on.get(s.id) || [...this.netsAt(s.x, s.z, s.w, s.d)], roots = new Set(ns.map(v => J.U[k].f(v)));
    const r = s.type === 'hq' ? this.coverOf(s)[k] : 0;
    return this.b.filter(b => b.done && b !== s && b.type !== 'slab' && this.needs(b, k) && ((roots.size && roots.has(this.netOf(b, k))) || (r && reaches(s, b, r))));
  },
  graceOn() { return (this.utilGrace || 0) > 0; },
  // worked out when the base changes: who is covered, how much water and sewage there is, what smells
  utilities() {
    const key = `${this.troops.length}:${this.roadsV}:${this.b.length}:${this.b.reduce((a, b) => a + (b.done ? 1 : 0) + (b.off ? 2 : 0), 0)}:${this.b.reduce((a, b) => a + (b.crew || 0), 0)}`;
    if (this.utilKey === key && this.util) return this.util;
    this.utilKey = key;
    const done = this.b.filter(b => b.done && b.type !== 'slab'), lag = done.filter(b => B[b.type].smell);
    // (GC 0.88) the networks each service has a source on, and the command post's circle for the tents round it
    this.utilNets(); const live = { pw: new Set(), wa: new Set(), se: new Set(), fu: new Set() }, hq = done.find(b => b.type === 'hq' && !b.off), hc = hq ? this.coverOf(hq) : {};
    for (const b of done) if (!b.off) for (const k of this.serves(b)) { const v = this.netOf(b, k); if (v) live[k].add(v); }
    const has = (b, k) => live[k].has(this.netOf(b, k)) || (hq && hc[k] && reaches(hq, b, hc[k]));
    this.utilLive = live;     // for the EFFICIENCY lens: which networks carry what
    const grace = this.graceOn();
    for (const b of done) {
      const d = B[b.type];
      b.pwNet = d.pw < 0 ? (live.pw.has(this.netOf(b, 'pw')) ? this.netOf(b, 'pw') : hq && reaches(hq, b, hc.pw || 0) ? (this.netOf(hq, 'pw') || -1) : 0) : 0;     // -1: the command post's own, off any network
      b.dark = d.pw < 0 && !grace && !b.pwNet;
      b.dry = this.needsWater(b) && !has(b, 'wa');
      b.foul = this.needsSewer(b) && !has(b, 'se');
      b.piped = FUELED.has(b.type) && live.fu.has(this.netOf(b, 'fu'));
      b.smelly = !!d.beds && b.type !== 'hq' && lag.some(l => reaches(l, b, B[l.type].smell));
      b.bad = !!d.water && lag.some(l => reaches(l, b, UTIL.badWell));   // a well by a lagoon: contaminated
    }
    // water and sewage, a day
    const use = done.reduce((a, b) => a + (B[b.type].eat && b.type !== 'hq' ? UTIL.use.eat : 0) + (B[b.type].ward ? UTIL.use.ward : 0) + (b.type === 'dome' ? UTIL.use.dome : 0), 0) + this.troops.length * UTIL.use.vote;
    const runs = b => (B[b.type].crew ? Math.min(1, b.crew / B[b.type].crew) : 1) * (b.dark ? 0 : 1) * (B[b.type].pw < 0 ? Math.max(0.3, this.power?.ratio ?? 1) : 1) * this.condF(b);
    let made = done.some(b => b.type === 'hq') ? UTIL.hq.water : 0, bad = 0, cap = done.some(b => b.type === 'hq') ? UTIL.hq.sewer : 0;
    for (const b of done) if (!b.off) {
      const d = B[b.type];
      if (d.water) { const w = d.water * runs(b); made += w; if (b.bad) bad += w; }
      if (d.sewer) cap += d.sewer * runs(b);
    }
    const homes = done.filter(b => B[b.type].beds && b.type !== 'hq'), beds = homes.reduce((a, b) => a + this.cap(b, 'beds'), 0) || 1;
    const share = f => homes.reduce((a, b) => a + (f(b) ? this.cap(b, 'beds') : 0), 0) / beds;
    this.util = {
      water: { made: Math.round(made), use: Math.round(use), ratio: use ? Math.min(1, made / use) : 1, bad: made ? bad / made : 0 },
      sewer: { cap: Math.round(cap), use: Math.round(use), ratio: use ? Math.min(1, cap / use) : 1 },
      wet: homes.length ? share(b => !b.dry) : 1, drained: homes.length ? share(b => !b.foul) : 1,
      smelly: homes.filter(b => b.smelly).length, dark: done.filter(b => b.dark).length, homes: homes.length,
    };
    return this.util;
  },
  // how well the bunks are served, 0..1
  waterEff() { const u = this.util; return u ? u.wet * u.water.ratio : 1; },
  sewerEff() { const u = this.util; return u ? u.drained * u.sewer.ratio : 1; },
  utilMorale() {
    if (this.graceOn() || !this.util) return { water: 0, sewer: 0, smell: 0, sick: 0 };
    const sick = this.troops.filter(t => t.sick && t.hurt > 0).length;
    return { water: -Math.round(UTIL.mor.water * (1 - this.waterEff())), sewer: -Math.round(UTIL.mor.sewer * (1 - this.sewerEff())),
      smell: -Math.min(UTIL.mor.smell, this.util.smelly), sick: -Math.min(8, sick * UTIL.mor.sick) };
  },
  // every hour: the fuel farm tops up everything it reaches
  pipeFuel() {
    const farms = this.b.filter(b => b.done && !b.off && B[b.type].cover?.fu && (b.stock.fuel || 0) > 1);
    if (!farms.length) return;
    for (const b of this.b) {
      if (!b.done || !b.piped) continue;
      const want = Math.max(this.needCap(b, 'fuel'), b.type === 'gen' ? B.gen.need.fuel : 0) - (b.stock.fuel || 0); if (want <= 0.5) continue;
      for (const f of farms) { if (this.netOf(f, 'fu') !== this.netOf(b, 'fu')) continue;     // (GC 0.88) on its network
        const n = Math.min(want, f.stock.fuel); f.stock.fuel -= n; b.stock.fuel = (b.stock.fuel || 0) + n; this.stats.piped = (this.stats.piped || 0) + n; break; }
    }
  },
  // every day: the inspectorate's grace runs down, and the dice are rolled for an outbreak
  utilDay() {
    if (this.graceOn()) { this.utilGrace--; if (!this.utilGrace) this.say('pro', 'The utilities inspectorate has arrived. From today, bunks without water or sewage cost morale and risk sickness, and buildings no power reaches go dark.'); return; }
    const o = UTIL.outbreak, home = this.troops.filter(t => t.state !== 'patrol' && !(t.hurt > 0));
    if (home.length < o.min) return;
    const wa = 1 - this.waterEff(), se = 1 - this.sewerEff(), bad = this.util?.water.bad || 0;
    let p = o.base + o.water * wa + o.sewer * se + o.bad * bad;
    if (this.b.some(b => b.done && B[b.type].ward && b.crew > 0)) p *= o.medbay;   // preventive medicine
    this.risk = p;
    if (this.rng.next() >= p) return;
    const cause = bad > 0.2 && bad * o.bad >= Math.max(wa * o.water, se * o.sewer) ? 'bad' : wa * o.water >= se * o.sewer ? 'water' : 'sewer';
    const n = Math.min(Math.ceil(home.length / 4), o.sick[0] + Math.floor(this.rng.next() * (o.sick[1] - o.sick[0] + 1)));
    const ill = this.rng.shuffle(home.slice()).slice(0, n);
    for (const t of ill) { t.hurt = o.hurt; t.sick = true; t.state = 'hurt'; t.job = null; t.at = null; t.gate = null; }
    this.stats.sick = (this.stats.sick || 0) + n;
    const what = SICK[cause][Math.floor(this.rng.next() * SICK[cause].length)];
    const fix = cause === 'bad' ? 'Move the well away from the lagoon.' : cause === 'water' ? 'More water: wells, a purification unit, towers to carry it.' : 'Sewage: a lagoon or a treatment plant in reach of the bunks.';
    this.say('base', `Outbreak: ${n} recruits are down with ${what}. ${this.b.some(b => b.done && B[b.type].ward) ? 'The medics have them.' : 'Without a Medical Bay they will mend slowly in their bunks.'} ${fix}`);
    this.events.push({ t: 'outbreak', n, cause });
  },
  nearWater(x, z, w, d, r) {
    for (let j = -r; j < d + r; j++) for (let i = -r; i < w + r; i++) { const tx = x + i, tz = z + j; if (tx >= 0 && tz >= 0 && tx < this.N && tz < this.N && this.terr?.[tz * this.N + tx] === GROUND.WATER) return true; }
    return false;
  },
};
