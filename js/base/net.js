// Roads and walls share one network of nodes and straight segments, drawn freely like a city builder.
// Segments are turned into tiles for walking, driving and building: roads mark their tiles with a surface, walls block
// theirs, and where a road crosses a wall the tile becomes a gate. Whatever the walls fully enclose is the base.
//
// A segment: { id, a, b, k: 'dirt' | 'paved' | 'path' | 'bridge' | 'wall' | 'wire' | 'bags' | 'trench', w } where a and b are node ids and w is its width in tiles.
// Coordinates are in tiles, so the centre of tile (i, j) is (i + 0.5, j + 0.5).

export const KINDS = {
  dirt:  { name: 'Dirt Road', w: 1, surf: 1 },
  paved: { name: 'Paved Road', w: 2, surf: 2 },
  bridge: { name: 'Bridge', w: 2, surf: 2 },
  path: { name: 'Footpath', w: 1, surf: 3 },   // a paved walk, one cell: people move as on a paved road, vehicles ignore it   // a paved deck on piers: spans water, ravines and rough ground
  wall:  { name: 'Barrier Wall', w: 1, surf: 0 },
  fence: { name: 'Timber Barricade', w: 1, surf: 0 },     // (GC 0.89) more than one kind of wall (Ramzies)
  cwall: { name: 'Concrete Wall', w: 1, surf: 0 },
  rampart: { name: 'Fortified Wall', w: 1, surf: 0 },
  wire:  { name: 'Barbed Wire', w: 1, surf: 0 },   // (GC 0.64) field works, the ground fight's own: no road, no wall, nobody walks through them
  bags:  { name: 'Sandbags', w: 1, surf: 0 },
  trench: { name: 'Trench', w: 1, surf: 0 },
};
export const FIELD = new Set(['wire', 'bags', 'trench']);
// (GC 0.89) the walls: each closes the base the same way; str is what it is worth against a raid, h how high it stands,
// cost a tile. A Fortified Wall goes only on a foundation, and stands as tall again on a raised one
export const WALLS = {
// file: the ground fight's own model for it (shared, as the field works are), len/h/d its size there
  fence:   { str: 0.45, h: 0.9, cost: 1.5, file: 'prop_cover1', len: 2, mh: 1.53, md: 1.15, d: 0.75 },     // a timber barricade
  wall:    { str: 1, h: 1.1, cost: 4 },     // filled barrier baskets, drawn here
  cwall:   { str: 1.5, h: 1.45, cost: 8, equip: 'batch', file: 'prop_cover2', len: 2, mh: 1.5, md: 1.06, d: 0.85 },     // concrete barriers
  rampart: { str: 2.2, h: 1.9, cost: 14, equip: 'batch', slab: true, file: 'prop_fortwall', len: 2, mh: 1.03, md: 0.74, d: 0.85, tint: '#8e8f88' },     // the enemy capital's curtain wall, in our concrete
};
export const isWall = k => !!WALLS[k];
export const isLine = k => isWall(k) || FIELD.has(k);   // drawn along a line and not a road
const RANK = [0, 2, 3, 1];   // where two cross, the better surface shows: paved, then dirt, then a footpath
const REACH = 0.22;   // tiles within half the width plus this of the centreline belong to a segment (keeps diagonals 4-connected)

export function emptyNet() { return { nodes: [], segs: [], nid: 1 }; }
export const node = (net, id) => net.nodes.find(n => n.id === id);
export function segLen(net, s) { const a = node(net, s.a), b = node(net, s.b); return Math.hypot(b.x - a.x, b.z - a.z); }

function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  return { d: Math.hypot(px - ax - t * dx, pz - az - t * dz), t };
}

// the tiles a line of a given width covers
export function lineTiles(N, ax, az, bx, bz, w) {
  const r = w / 2 + REACH, out = [];
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r)), x1 = Math.min(N - 1, Math.floor(Math.max(ax, bx) + r));
  const z0 = Math.max(0, Math.floor(Math.min(az, bz) - r)), z1 = Math.min(N - 1, Math.floor(Math.max(az, bz) + r));
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (distSeg(x + 0.5, z + 0.5, ax, az, bx, bz).d <= r) out.push([x, z]);
  return out;
}

// Snapping. grid: ends on tile centres (or tile edges for even widths, so a 2-wide road covers exactly two tiles);
// 45: the same for the start, and from there the direction is held to multiples of 45 degrees and the length to whole
// tiles; free: no snapping. Existing nodes and segments pull the end onto them, so roads join up: drawn free, from a
// little way off; on the grid, only the node under the pointer, and a road is met where the line being drawn runs into
// it (not at the nearest point of it), so the line stays straight on its tiles.
export function snap(net, p, mode, w, from) {
  const free = mode === 'free', pull = (q, r) => net.nodes.map(n => [n, Math.hypot(n.x - q.x, n.z - q.z)]).filter(([, d]) => d < r).sort((a, b) => a[1] - b[1])[0];
  if (free) { const near = pull(p, 1.3); if (near) return { x: near[0].x, z: near[0].z, node: near[0].id }; }
  let x = p.x, z = p.z, ray = null;
  const g = v => w % 2 ? Math.floor(v) + 0.5 : Math.round(v);
  if (mode === '45' && from) {
    const dx = x - from.x, dz = z - from.z, ang = Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) * (Math.PI / 4);
    const diag = Math.abs(Math.round(Math.cos(ang))) && Math.abs(Math.round(Math.sin(ang)));
    const step = diag ? Math.SQRT2 : 1, len = Math.max(1, Math.round(Math.hypot(dx, dz) / step)) * step;
    x = from.x + Math.cos(ang) * len; z = from.z + Math.sin(ang) * len;
    x = Math.round(x * 2) / 2; z = Math.round(z * 2) / 2;
    ray = { ux: Math.cos(ang), uz: Math.sin(ang) };
  } else if (!free) { x = g(x); z = g(z); }
  if (!free) { const near = pull({ x, z }, 0.75); if (near && near[0].id !== from?.node) return { x: near[0].x, z: near[0].z, node: near[0].id }; }
  // onto an existing segment: a T-junction
  let best = null;
  for (const s of net.segs) {
    const a = node(net, s.a), b = node(net, s.b), r = distSeg(x, z, a.x, a.z, b.x, b.z);
    // a line ending beside a road (close enough to touch it) joins its centreline, so the two become one junction
    if (!(r.d < (isLine(s.k) ? 0.6 : s.w / 2 + w / 2 + 0.35) && r.t > 0.02 && r.t < 0.98) || (best && r.d >= best.d)) continue;
    let hx = a.x + (b.x - a.x) * r.t, hz = a.z + (b.z - a.z) * r.t;
    if (ray) {   // where the line itself crosses this one, if it does so short of running off its end
      const ex = b.x - a.x, ez = b.z - a.z, den = ray.ux * ez - ray.uz * ex;
      if (Math.abs(den) > 1e-6) {
        const u = ((a.x - from.x) * ez - (a.z - from.z) * ex) / den, t = ((a.x - from.x) * ray.uz - (a.z - from.z) * ray.ux) / den;
        if (u < 0.9 || t <= 0.02 || t >= 0.98) continue;
        hx = from.x + ray.ux * u; hz = from.z + ray.uz * u;
      }
    }
    best = { d: r.d, seg: s.id, x: hx, z: hz };
  }
  if (best) return { x: best.x, z: best.z, seg: best.seg };
  return { x, z };
}

function addNode(net, x, z) {
  const n = net.nodes.find(n => Math.hypot(n.x - x, n.z - z) < 0.05); if (n) return n.id;
  const id = net.nid++; net.nodes.push({ id, x, z }); return id;
}
function split(net, segId, x, z) {
  // the segment may have been split a moment ago (both ends of a new line on one road): take whichever piece lies here now
  const s = net.segs.find(s => s.id === segId) || net.segs.find(s => { const a = node(net, s.a), b = node(net, s.b), r = distSeg(x, z, a.x, a.z, b.x, b.z); return r.d < 0.05 && r.t > 0.001 && r.t < 0.999; });
  if (!s) return addNode(net, x, z);
  const m = addNode(net, x, z);
  net.segs = net.segs.filter(o => o !== s);
  net.segs.push({ ...s, id: net.nid++, b: m }, { ...s, id: net.nid++, a: m });
  return m;
}
function endpoint(net, p) { return p.node ?? (p.seg ? split(net, p.seg, p.x, p.z) : addNode(net, p.x, p.z)); }

// adds a line between two snapped points; returns the new segment
export function addLine(net, p, q, k, w = KINDS[k].w) {
  const a = endpoint(net, p), b = endpoint(net, q);
  if (a === b) return null;
  const s = { id: net.nid++, a, b, k, w }; net.segs.push(s); return s;
}
const isRoad = s => !isLine(s.k) && s.k !== 'bridge';
// where the stretch from a to b properly crosses road s (inside both, not at their ends): how far along a-b, and where
function crossAt(net, a, b, s) {
  const c = node(net, s.a), d = node(net, s.b), rx = b.x - a.x, rz = b.z - a.z, ex = d.x - c.x, ez = d.z - c.z, den = rx * ez - rz * ex;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * ez - (c.z - a.z) * ex) / den, u = ((c.x - a.x) * rz - (c.z - a.z) * rx) / den, L = Math.hypot(rx, rz), M = Math.hypot(ex, ez);
  if (t * L < 0.06 || (1 - t) * L < 0.06 || u * M < 0.06 || (1 - u) * M < 0.06) return null;
  return { t, x: a.x + rx * t, z: a.z + rz * t };
}
// a road laid across other roads: wherever it crosses one, or runs over the end of one, both get a node there, so the
// crossing is a junction (drawn as one piece of ground) and not two roads lying on top of each other. Returns the
// stretches of the new road, in order
export function addRoad(net, p, q, k, w = KINDS[k].w) {
  const ia = endpoint(net, p), ib = endpoint(net, q); if (ia === ib) return [];
  const a = node(net, ia), b = node(net, ib), L = Math.hypot(b.x - a.x, b.z - a.z), stops = [];
  for (const s of [...net.segs]) { if (!isRoad(s)) continue; const c = crossAt(net, a, b, s); if (c) stops.push({ t: c.t, id: split(net, s.id, c.x, c.z) }); }
  for (const n of net.nodes) { if (n === a || n === b || stops.some(o => o.id === n.id)) continue; const r = distSeg(n.x, n.z, a.x, a.z, b.x, b.z); if (r.d < 0.05 && r.t * L > 0.06 && (1 - r.t) * L > 0.06 && net.segs.some(s => isRoad(s) && (s.a === n.id || s.b === n.id))) stops.push({ t: r.t, id: n.id }); }
  stops.sort((m, n) => m.t - n.t);
  const ids = [ia, ...stops.map(o => o.id), ib], out = [];
  for (let i = 1; i < ids.length; i++) if (ids[i] !== ids[i - 1]) { const s = { id: net.nid++, a: ids[i - 1], b: ids[i], k, w }; net.segs.push(s); out.push(s); }
  return out;
}
// the same for a network drawn before crossings were joined (0.52 and earlier): every pair of roads that cross gets its node
export function heal(net) {
  let n = 0;
  for (let again = true, guard = 0; again && guard < 500; guard++) {
    again = false;
    search: for (const s of net.segs) { if (!isRoad(s)) continue;
      for (const o of net.segs) { if (o === s || !isRoad(o)) continue;
        const c = crossAt(net, node(net, s.a), node(net, s.b), o); if (!c) continue;
        const m = split(net, s.id, c.x, c.z); split(net, o.id, c.x, c.z); void m; n++; again = true; break search; } }
  }
  return n;
}
// a new road laid along old ones takes their place. (GC 0.63) Not only a road whose two ends both lie on the new one: any
// road running along inside the new one's width, wholly or in part, and a tile off its line or not (a dirt road keeps to
// tile centres, a paved one to tile edges). The part under the new road goes; what sticks out past either end stays,
// joined to that end; a road that met the old one under the new road is brought onto the new one, a junction there.
// Before, those were left lying one on top of the other: kerbs and paint across the new road, and lights lost under it
export function absorb(net, s) {
  if (!isRoad(s)) return 0;
  const a = node(net, s.a), b = node(net, s.b), L = Math.hypot(b.x - a.x, b.z - a.z); if (L < 0.3) return 0;
  const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L, reach = s.w / 2 + 0.05;
  const along = p => (p.x - a.x) * ux + (p.z - a.z) * uz, off = p => Math.abs((p.z - a.z) * ux - (p.x - a.x) * uz);
  const gone = [], meet = [];
  for (const o of [...net.segs]) {
    if (o === s || !isRoad(o)) continue;
    const p = node(net, o.a), q = node(net, o.b); if (!p || !q || off(p) > reach || off(q) > reach) continue;
    const tp = along(p), tq = along(q), over = Math.min(Math.max(tp, tq), L) - Math.max(Math.min(tp, tq), 0);
    if (over < 0.3) continue;   // only touching an end: a road carrying on, not one underneath
    net.segs = net.segs.filter(x => x !== o); gone.push(o.id);
    for (const [n, t] of [[p, tp], [q, tq]]) {
      if (n.id === s.a || n.id === s.b) continue;
      if (t < -0.3) net.segs.push({ ...o, id: net.nid++, a: n.id, b: s.a });
      else if (t > L + 0.3) net.segs.push({ ...o, id: net.nid++, a: s.b, b: n.id });
      else meet.push([n, t]);
    }
  }
  // a road that reached the old one under the new: its node goes onto the new road's line, and the new road is cut there
  for (const [n, t] of meet) {
    if (!net.segs.some(x => x.a === n.id || x.b === n.id)) continue;
    const tc = Math.max(0, Math.min(L, t));
    if (tc < 0.06) { relink(net, n.id, s.a); continue; }
    if (tc > L - 0.06) { relink(net, n.id, s.b); continue; }
    n.x = a.x + ux * tc; n.z = a.z + uz * tc;
    const piece = net.segs.find(x => x.k === s.k && x.w === s.w && [x.a, x.b].every(id => { const m = node(net, id); return m && off(m) < 0.01; }) && Math.min(along(node(net, x.a)), along(node(net, x.b))) < tc - 0.01 && Math.max(along(node(net, x.a)), along(node(net, x.b))) > tc + 0.01);
    if (piece) { net.segs = net.segs.filter(x => x !== piece); net.segs.push({ ...piece, id: net.nid++, b: n.id }, { ...piece, id: net.nid++, a: n.id }); }
  }
  if (gone.length) { const used = new Set(net.segs.flatMap(o => [o.a, o.b])); net.nodes = net.nodes.filter(n => used.has(n.id)); }
  return gone.length;
}
// every segment at node `from` moves to node `to` (and any that would join a node to itself goes)
function relink(net, from, to) {
  for (const x of net.segs) { if (x.a === from) x.a = to; if (x.b === from) x.b = to; }
  net.segs = net.segs.filter(x => x.a !== x.b);
}
export function nearestSeg(net, x, z, max = 0.9) {
  let best = null;
  for (const s of net.segs) { const a = node(net, s.a), b = node(net, s.b), r = distSeg(x, z, a.x, a.z, b.x, b.z); if (r.d < Math.max(max, s.w / 2 + 0.3) && (!best || r.d < best.d)) best = { d: r.d, s }; }
  return best?.s || null;
}
export function removeSeg(net, id) {
  net.segs = net.segs.filter(s => s.id !== id);
  const used = new Set(net.segs.flatMap(s => [s.a, s.b])); net.nodes = net.nodes.filter(n => used.has(n.id));
}

// tiles from the network: roads (surface 1 dirt, 2 paved), walls (1 wall, 2 gate) and the enclosed base
// win: [x0, z0, x1, z1), the part of the map that matters (your land and a margin); outside it nothing is inside
export function raster(net, N, block = null, win = null) {
  const roads = new Uint8Array(N * N), walls = new Uint8Array(N * N), inside = new Uint8Array(N * N), strs = new Map();     // (GC 0.89) what each wall tile is worth
  const [X0, Z0, X1, Z1] = win || [0, 0, N, N], each = f => { for (let z = Z0; z < Z1; z++) for (let x = X0; x < X1; x++) f(z * N + x, x, z); };
  for (const s of net.segs) {
    const a = node(net, s.a), b = node(net, s.b);
    for (const [x, z] of lineTiles(N, a.x, a.z, b.x, b.z, s.w)) {
      const i = z * N + x;
      if (WALLS[s.k]) { walls[i] = 1; strs.set(i, Math.max(strs.get(i) || 0, WALLS[s.k].str)); } else if (FIELD.has(s.k)) { if (!walls[i]) walls[i] = 3; } else if (RANK[KINDS[s.k].surf] > RANK[roads[i]]) roads[i] = KINDS[s.k].surf;     // (3: field works)
    }
  }
  each(i => { if (walls[i] && roads[i]) walls[i] = walls[i] === 3 ? 0 : 2; });   // a road through a wall is a gate (and through wire, a gap in it)
  // flood in from the map edge; what it can't reach, walls and gates aside, is inside
  const out = new Uint8Array(N * N), stack = [];
  const shut = i => (walls[i] && walls[i] !== 3) || (block && block[i] && !roads[i]);   // water and rock shut the base in like a wall, unless a road bridges them
  const seed = i => { if (!out[i] && !shut(i)) { out[i] = 1; stack.push(i); } };
  for (let x = X0; x < X1; x++) { seed(Z0 * N + x); seed((Z1 - 1) * N + x); }
  for (let z = Z0; z < Z1; z++) { seed(z * N + X0); seed(z * N + X1 - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % N, z = (i / N) | 0;
    if (x > X0) seed(i - 1); if (x < X1 - 1) seed(i + 1); if (z > Z0) seed(i - N); if (z < Z1 - 1) seed(i + N);
  }
  // what the flood can't reach is inside, but only a pocket a wall helps close: ground ringed by nothing but water and
  // rock is just a pocket of land, not a base
  let n = 0; const met = new Uint8Array(N * N);
  for (let z0 = Z0; z0 < Z1; z0++) for (let x0 = X0; x0 < X1; x0++) {
    const i0 = z0 * N + x0;
    if (out[i0] || shut(i0) || met[i0]) continue;
    const comp = [i0]; met[i0] = 1; let walled = false;
    for (let h = 0; h < comp.length; h++) {
      const i = comp[h], x = i % N, z = (i / N) | 0;
      for (const j of [x > X0 ? i - 1 : -1, x < X1 - 1 ? i + 1 : -1, z > Z0 ? i - N : -1, z < Z1 - 1 ? i + N : -1]) {
        if (j < 0) continue;
        if (walls[j] && walls[j] !== 3) walled = true;
        if (!out[j] && !shut(j) && !met[j]) { met[j] = 1; comp.push(j); }
      }
    }
    if (walled) for (const i of comp) { inside[i] = 1; n++; }
  }
  // gates: clusters of gate tiles
  const gates = [], seen = new Uint8Array(N * N);
  each(i => { if (walls[i] !== 2 || seen[i]) return;
    const q = [i], tiles = []; seen[i] = 1;
    while (q.length) { const j = q.pop(); tiles.push(j); for (const d of [1, -1, N, -N]) { const k = j + d; if (k >= 0 && k < N * N && walls[k] === 2 && !seen[k]) { seen[k] = 1; q.push(k); } } }
    const x = tiles.reduce((a, j) => a + j % N, 0) / tiles.length + 0.5, z = tiles.reduce((a, j) => a + ((j / N) | 0), 0) / tiles.length + 0.5;
    gates.push({ x, z, tiles });
  });
  return { wallStr: strs,  roads, walls, inside, gates, area: n };
}
