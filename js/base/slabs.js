// Foundations (GC 0.87, Ramzies: "once you build the foundation you can then place those things"). Zones are gone.
//   - A foundation is a concrete slab: a rectangle of one kind (Living, Logistics, Civic, Training, Operations, Industry,
//     Utilities) at one height (ground, raised, high). It levels the ground under it, and the engineers build it like a
//     building. Lay more beside it to grow the foundation.
//   - Anything permanent stands on a slab of its kind. Tents, the command post, the landing pad, field works, flags, trees,
//     lookouts and turrets can go on bare ground (and on any slab). Gardens and monuments go on a slab of any kind.
//   - Slabs side by side at one height make one foundation. People and vehicles cross a slab as they would a paved road.
//   - A raised slab is reached up ramps: where a road or footpath meets its edge it climbs onto it. Elsewhere its edge is a
//     drop nobody walks off, and nothing stands on the ground right against it (the rim).
//   - On a slab, a building's door opens onto the slab or a road, and the foundation has to touch a road: roads join the
//     base up.
// Mixed into Sim (see the end of sim.js), so `this` is the simulation. Slabs are kept in this.b as type 'slab', so the
// engineers, saving, selecting and demolishing treat them like any building, but they never mark this.occ.
import { B, GROUPS, SLABS, SKEYS, SLAB_LV, SLAB_MAX, STANDARDS, ZONES, ZKEYS } from './config.js';
import { GROUND } from './site.js';
import { dims, LOOSE } from './sim.js';

// the kind of foundation each building needs, from the build bar's sections
export const KIND = {};
for (const [k, s] of Object.entries(SLABS)) {
  for (const g of s.groups) for (const t of (GROUPS.find(G => G[0] === g) || [])[3] || []) KIND[t] = k;
  for (const t of s.also || []) KIND[t] = k;
}
// bare ground will do for these (and so will any slab)
export const BARE = new Set(['hq', 'pad', 'seflag', 'starter', 'flag', 'banner', 'hdbanner', 'speaker', 'billboard', 'tree', 'lookout', 'flood', 'turret', 'shelter']);
// these need a slab, of any kind: gardens and the bigger monuments
export const ANY = new Set(['planter', 'garden', 'fountain', 'park', 'pool', 'plaque', 'statue', 'memorial', 'halls', 'partyhq', 'palace', 'monument']);
// an old save's zones, as the foundation kind laid under what stands in them
const FROM_ZONE = { life: 'life', logi: 'logi', comm: 'civic', train: 'train', ops: 'ops', ind: 'ind' };
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const Slabs = {
  isSlab(b) { return !!b && b.type === 'slab'; },
  slabs() { return this.b.filter(b => b.type === 'slab'); },
  slabAt(x, z) { if (!this.slabMap || x < 0 || z < 0 || x >= this.N || z >= this.N) return null; const id = this.slabMap[z * this.N + x]; return id ? this.byId(id) : null; },
  // the foundation a building needs: null for bare ground (any slab will do too), 'any', or a kind
  slabNeed(type, spec = null) {
    if (BARE.has(type) || B[type]?.slab) return null;
    if (STANDARDS.has(type) && this.stdFor(type, spec) === 0) return null;   // a tent: bare ground by a road
    if (ANY.has(type)) return 'any';
    return KIND[type] || 'any';
  },
  // the top of a slab in world units, over the levelled ground under it
  slabTop(sl) { return (sl.h0 ?? 0) + SLAB_LV[sl.lv || 0].h; },

  // ---------------------------------------------------------------- the maps: which slab is where, the rims of the raised ones,
  // the foundations (joined slabs at one height) and whether each touches a road, and the surface people move on
  slabSync() {
    const N = this.N, all = this.b ? this.slabs() : [];
    if (!this.slabMap || this.slabMap.length !== N * N) { this.slabMap = new Int32Array(N * N); this.rim = new Uint8Array(N * N); this.slabGrp = new Int32Array(N * N); this.surf = new Uint8Array(N * N); this._slabT = []; }
    const map = this.slabMap, rim = this.rim, grp = this.slabGrp, T = [];
    for (const k of this._slabT) { map[k] = 0; rim[k] = 0; grp[k] = 0; }   // only what the last pass set (the map is big)
    for (const sl of all) for (let j = 0; j < sl.d; j++) for (let i = 0; i < sl.w; i++) { const k = (sl.z + j) * N + sl.x + i; map[k] = sl.id; T.push(k); }
    // the rim: open ground round a raised slab (bit 1: any raised slab; bit 2: a finished one)
    for (const sl of all) {
      if (!sl.lv) continue;
      for (let j = -1; j <= sl.d; j++) for (let i = -1; i <= sl.w; i++) {
        const x = sl.x + i, z = sl.z + j; if (x < 0 || z < 0 || x >= N || z >= N) continue;
        const k = z * N + x; if (map[k]) continue; rim[k] |= 1 | (sl.done ? 2 : 0); T.push(k);
      }
    }
    // foundations: slabs that share an edge at one height
    const info = [null]; let g = 0;
    for (const sl of all) {
      const k0 = sl.z * N + sl.x; if (grp[k0]) continue;
      g++; const st = [k0], f = { id: g, lv: sl.lv || 0, slabs: new Set(), tiles: 0, road: false, done: true }; grp[k0] = g;
      while (st.length) {
        const k = st.pop(), x = k % N, z = (k - x) / N, sb = this.byId(map[k]); f.tiles++; f.slabs.add(sb.id); if (!sb.done) f.done = false;
        if (this.roads?.[k]) f.road = true;
        for (const [dx, dz] of N4) {
          const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
          const n = nz * N + nx;
          if (map[n]) { if (!grp[n] && (this.byId(map[n]).lv || 0) === f.lv) { grp[n] = g; st.push(n); } }
          else if (this.roads?.[n]) f.road = true;   // a road up to its edge (up a ramp, for a raised one)
        }
      }
      info.push(f);
    }
    // the surface people and vehicles move on: the roads, and a finished slab counts as a paved one
    if (this.roads) this.surf.set(this.roads); else this.surf.fill(0);
    for (const sl of all) if (sl.done) for (let j = 0; j < sl.d; j++) for (let i = 0; i < sl.w; i++) { const k = (sl.z + j) * N + sl.x + i; if (!this.surf[k]) this.surf[k] = 2; }
    this._slabT = T; this.fnds = info;
    this.slabV = (this.slabV || 0) + 1;
  },
  // a slab laid, finished or taken up: the maps, the decks (what stands on a slab is lifted onto it) and the routes
  slabsChanged() { this.slabSync(); this.buildDecks(); this.roadsV = (this.roadsV || 0) + 1; this.events?.push({ t: 'roads' }); },
  foundOf(sl) { return sl && this.fnds?.[this.slabGrp?.[sl.z * this.N + sl.x]] || null; },
  // every corner of a finished slab is lifted to its top (buildDecks): the shader stands whatever is drawn there on it
  slabDecks(deck) {
    const M = this.N + 1;
    for (const sl of this.slabs()) {
      if (!sl.done) continue;
      const top = this.slabTop(sl);
      for (let j = sl.z; j <= sl.z + sl.d; j++) for (let i = sl.x; i <= sl.x + sl.w; i++) { const k = j * M + i; deck.set(k, Math.max(deck.get(k) ?? -1e9, top)); }
    }
  },

  // ---------------------------------------------------------------- laying one
  slabRect(x0, z0, x1, z1) { const x = Math.min(x0, x1), z = Math.min(z0, z1); return { x, z, w: Math.abs(x1 - x0) + 1, d: Math.abs(z1 - z0) + 1 }; },
  slabCost(w, d, lv) { return Math.ceil(w * d * SLAB_LV[lv].cost); },
  layCheck(x0, z0, x1, z1, k, lv = 0) {
    const { x, z, w, d } = this.slabRect(x0, z0, x1, z1), L = SLAB_LV[lv], N = this.N, cost = this.slabCost(w, d, lv), out = { x, z, w, d, cost, ok: false };
    if (!SLABS[k] || !L) return { ...out, why: 'Pick a kind of foundation' };
    if (w > SLAB_MAX || d > SLAB_MAX) return { ...out, why: `${SLAB_MAX} tiles a side at most: lay another beside it to grow the foundation` };
    if (L.stage && (this.stage || 0) < L.stage) return { ...out, why: `A ${L.name.toLowerCase()} foundation needs a Forward Operating Base charter` };
    if (this.supplies < cost) return { ...out, why: `Not enough supplies (${cost})` };
    const pf = this.b.find(b => b.type === 'seflag');
    for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
      const tx = x + i, tz = z + j, t = tz * N + tx;
      if (!this.inside(tx, tz)) return { ...out, why: !this.ownedTile(tx, tz) ? 'Outside your land: buy the parcel first (LAND)' : this.walls[t] ? 'A wall is in the way' : 'Off the map' };
      if (this.slabMap?.[t]) return { ...out, why: 'There is a foundation here already: lay the new one beside it' };
      if (this.occ[t]) return { ...out, why: `The ${B[this.byId(this.occ[t])?.type]?.name || 'building'} is in the way` };
      if (pf && tx >= pf.x - 2 && tx < pf.x + 4 && tz >= pf.z - 2 && tz < pf.z + 4) return { ...out, why: 'Kept clear: this is the flag plaza' };
      if (this.sweeping(tx, tz)) return { ...out, why: 'This parcel is still being swept' };
      const tr = this.terr?.[t]; if (tr === GROUND.WATER) return { ...out, why: 'That is water' }; if (tr === GROUND.ROCK) return { ...out, why: 'Solid rock' };
    }
    // a neighbour at another height would leave a step nobody can use: match it, or leave a tile between
    for (let j = -1; j <= d; j++) for (let i = -1; i <= w; i++) {
      if (i >= 0 && i < w && j >= 0 && j < d) continue;
      const s = this.slabAt(x + i, z + j);
      if (s && (s.lv || 0) !== lv && (i >= 0 && i < w || j >= 0 && j < d)) return { ...out, why: `Beside a ${SLAB_LV[s.lv || 0].name.toLowerCase()} foundation: match its height or leave a tile between` };
      if (s && lv && (s.lv || 0) !== lv) return { ...out, why: `Corner to corner with a ${SLAB_LV[s.lv || 0].name.toLowerCase()} foundation: match its height or leave a tile` };
      // raised: nothing on the bare ground right against it
      const o = lv && this.occ[(z + j) * N + x + i]; if (o && !this.slabAt(x + i, z + j)) { const ob = this.byId(o); if (ob && !B[ob.type].slab) return { ...out, why: `Too close to the ${B[ob.type].name}: a raised foundation needs a tile clear round it` }; }
    }
    if (this.hgt && this.gradeOf(x, z, w, d) > 0.9) return { ...out, why: `Too steep (${Math.round(this.gradeOf(x, z, w, d) * 8)} m of rise): level it a little first (LANDSCAPE)` };
    return { ...out, ok: true, why: '' };
  },
  lay(x0, z0, x1, z1, k, lv = 0, free = false) {
    const c = this.layCheck(x0, z0, x1, z1, k, lv); if (!c.ok && !free) return null;
    if (!free) this.spend('build', c.cost);
    const L = SLAB_LV[lv], sl = { id: this.nid++, type: 'slab', k, lv, x: c.x, z: c.z, rot: 0, w: c.w, d: c.d, cond: 100, prog: free ? 1 : 0, done: free, off: false, crew: 0, time: 2 + c.w * c.d * L.time, cost: c.cost, stock: {} };
    if (!free) { sl.clr = this.scrubUnder(c.x, c.z, c.w, c.d); if (!sl.clr.length) delete sl.clr; }
    this.levelFoot(c.x, c.z, c.w, c.d); sl.h0 = this.hv(c.x, c.z);
    this.b.push(sl); this.slabsChanged();
    if (!free) this.events.push({ t: 'placed', id: sl.id });
    return sl;
  },
  // what stands on a slab (a building or part of one)
  onSlab(sl) { const N = this.N, out = new Set(); for (let j = 0; j < sl.d; j++) for (let i = 0; i < sl.w; i++) { const o = this.occ[(sl.z + j) * N + sl.x + i]; if (o) out.add(o); } return [...out].map(id => this.byId(id)).filter(Boolean); },

  // ---------------------------------------------------------------- standing a building on one
  // { ok, why, lv }: lv is -1 on bare ground
  slabFit(type, x, z, rot, dz = 0, spec = null) {
    const [w, d] = dims(type, rot, dz), N = this.N, need = this.slabNeed(type, spec), want = KIND[type], name = B[type].name;
    let lv = null, on = 0, sl = null;
    for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
      const tx = x + i, tz = z + j, s = this.slabAt(tx, tz);
      if (s) {
        on++; sl ||= s;
        if (lv == null) lv = s.lv || 0; else if ((s.lv || 0) !== lv) return { ok: false, why: 'Half on one level and half on another' };
        if (want && s.k !== want) return { ok: false, why: `That is a ${SLABS[s.k].name} foundation: a ${name} goes on a ${SLABS[want].name} one` };
        if (B[type].look && s.k === 'ind') return { ok: false, why: 'Nobody would see it on an Industry foundation: put beauty where people live and walk' };
      } else if (this.rim?.[tz * N + tx]) return { ok: false, why: 'Right against a raised foundation: build on it, or leave a tile clear' };
    }
    if (!on) return need ? { ok: false, why: `Needs ${need === 'any' ? 'a foundation' : `a ${SLABS[need].name} foundation`} under it: lay one first (FOUNDATIONS)${STANDARDS.has(type) ? ', or put it up as a tent' : ''}` } : { ok: true, lv: -1 };
    if (on < w * d) return { ok: false, why: 'Half on a foundation and half off it' };
    if (!LOOSE.has(type)) {
      // the door opens onto the slab, a road or (off a ground-level slab) open ground
      const [tx, tz] = this.door({ x, z, w, d, rot }), t = tz * N + tx, ds = this.slabAt(tx, tz);
      const free = tx >= 0 && tz >= 0 && tx < N && tz < N && !this.occ[t];
      const okDoor = free && (ds ? (ds.lv || 0) === lv : this.road(tx, tz) || (lv === 0 && this.inside(tx, tz) && !this.rim[t]));
      if (!okDoor) return { ok: false, why: 'Its door would open onto a wall, a drop or another building: turn it (R) or move it in' };
      const f = this.foundOf(sl); if (f && !f.road) return { ok: false, why: 'Its foundation needs a road to it: run one up to the edge' };
    }
    return { ok: true, lv };
  },
  // where a building would go on a slab under the pointer: centred on it, turned as asked, else the first way its door works
  slabPlot(type, px, pz, rot, dz = 0, spec = null) {
    if (!this.slabAt(Math.floor(px), Math.floor(pz))) return null;
    let first = null;
    for (let r = 0; r < 4; r++) {
      const ro = (rot + r) % 4, [w, d] = dims(type, ro, dz), x = Math.round(px - w / 2), z = Math.round(pz - d / 2);
      const p = { tx: x, tz: z, rot: ro }; first ||= p;
      if (this.slabFit(type, x, z, ro, dz, spec).ok && this.fits(type, x, z, ro, dz).ok) return p;
    }
    return first;
  },

  // ---------------------------------------------------------------- an old save: what stood in a zone (or anywhere, if it needs one)
  // gets a ground-level slab of its kind under it, finished and paid for; the zones go
  slabsFromZones() {
    if (this.slabMap && this.slabs().length) return 0;
    let n = 0; this.slabSync();
    for (const b of [...this.b]) {
      if (b.type === 'slab' || !b.done && !b.prog) continue;
      const need = this.slabNeed(b.type, { std: b.std ?? 2 }); if (!need) continue;
      const zk = ZKEYS[(this.zone?.[(b.z) * this.N + b.x] || 0) - 1], k = need !== 'any' ? need : FROM_ZONE[zk] || 'civic';
      let clash = false; for (let j = 0; j < b.d && !clash; j++) for (let i = 0; i < b.w; i++) if (this.slabMap[(b.z + j) * this.N + b.x + i]) { clash = true; break; }
      if (clash) continue;
      const sl = { id: this.nid++, type: 'slab', k, lv: 0, x: b.x, z: b.z, rot: 0, w: b.w, d: b.d, cond: 100, prog: 1, done: true, off: false, crew: 0, time: 1, cost: this.slabCost(b.w, b.d, 0), stock: {}, h0: this.hv(b.x, b.z) };
      this.b.unshift(sl); for (let j = 0; j < b.d; j++) for (let i = 0; i < b.w; i++) this.slabMap[(b.z + j) * this.N + b.x + i] = sl.id; this._slabT.push(...Array.from({ length: b.w * b.d }, (_, q) => (b.z + Math.floor(q / b.w)) * this.N + b.x + q % b.w)); n++;
    }
    if (this.zone) this.zone.fill(0);
    if (n) this.slabsChanged();
    return n;
  },
};
export { SKEYS, ZONES };
