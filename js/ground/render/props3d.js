// WHAT STANDS ON THE LAND, IN 3D (GC 0.23, stage four of the move to 3D). Trees, rocks, the enemy's buildings and guns,
// your own guns and towers, banners and pillars: each a small model standing on the ground, not a block risen out of
// the map's drawing. One instanced mesh for each kind, so a forest is one draw.
//
// Every model is built round the origin, standing on y = 0, a footprint radius of one and as tall as it is drawn here;
// an instance gives its place, its footprint (s), its height (h, if not the same), its turn and a tint.
import * as THREE from '../../vendor/three.js';
import { bake, staticGeo } from './units3d.js';
import { VIEW } from './view.js';

const CAP = 900;
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), S = new THREE.Vector3(), COL = new THREE.Color();
const Q2 = new THREE.Quaternion(), FWD = new THREE.Vector3(0, 0, 1);
const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 7), CONE = new THREE.ConeGeometry(0.5, 1, 7), BLOB = new THREE.IcosahedronGeometry(0.5, 0), DOME = new THREE.SphereGeometry(0.5, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), TOR = new THREE.TorusGeometry(0.5, 0.14, 5, 10);
const part = (g, geo, m, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz); g.add(o); return o; };
// a lump of stone: the blob, each corner pushed in or out a little, always the same way for the same number
function stone(seed, tall) {
  const g = BLOB.clone().toNonIndexed(), p = g.attributes.position, seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`; let f = seen.get(k);
    if (f === undefined) { const h = Math.sin((seen.size + 1) * 12.9898 + seed * 78.233) * 43758.5453; f = 0.78 + 0.44 * (h - Math.floor(h)); seen.set(k, f); }
    p.setXYZ(i, p.getX(i) * f * 2, tall ? (p.getY(i) + 0.5) * (0.6 + 0.4 * f) : Math.max(0, (p.getY(i) + 0.32) * f * 1.25), p.getZ(i) * f * 2);
  }
  if (tall) for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 - 0.72 * y; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }     // a spire narrows as it climbs
  g.computeVertexNormals(); return g;
}

const MODELS = {
  // ---- trees: a crown radius of one
  'tree:leaf': () => { const g = new THREE.Group(), bark = mat('#4a3424'), a = mat('#2f6a2c'), b = mat('#4e8a3a'), c = mat('#255227');
    part(g, CYL, bark, 0, 0.7, 0, 0.24, 1.4, 0.24); part(g, BLOB, a, 0, 1.65, 0, 1.9, 1.3, 1.9); part(g, BLOB, b, -0.35, 2.0, -0.2, 1.2, 0.9, 1.2, 0, 0.8); part(g, BLOB, c, 0.45, 1.5, 0.35, 1.2, 0.9, 1.2, 0, 2.1); return g; },
  'tree:pine': () => { const g = new THREE.Group(), bark = mat('#3e2c1e'), a = mat('#1f3f2d'), b = mat('#2a5238');
    part(g, CYL, bark, 0, 0.4, 0, 0.2, 0.8, 0.2); part(g, CONE, a, 0, 1.1, 0, 2.0, 1.2, 2.0); part(g, CONE, b, 0, 1.7, 0, 1.5, 1.1, 1.5, 0, 0.5); part(g, CONE, a, 0, 2.25, 0, 0.95, 0.9, 0.95, 0, 1.0); return g; },
  'tree:jungle': () => { const g = new THREE.Group(), bark = mat('#4a3a22'), a = mat('#2f5222'), b = mat('#3f6a2c');
    part(g, CYL, bark, 0, 0.8, 0, 0.2, 1.6, 0.2); part(g, BLOB, a, 0, 1.75, 0, 2.0, 0.7, 2.0); for (let i = 0; i < 5; i++) { const t = i / 5 * 6.283; part(g, BLOB, b, Math.cos(t) * 0.6, 1.6, Math.sin(t) * 0.6, 1.0, 0.35, 0.5, 0, -t, 0.25); } return g; },
  'tree:cactus': () => { const g = new THREE.Group(), a = mat('#3d6b33'), b = mat('#4f8442');
    part(g, CYL, a, 0, 1.15, 0, 0.42, 2.3, 0.42); part(g, DOME, a, 0, 2.3, 0, 0.42, 0.3, 0.42); part(g, CYL, b, 0.42, 1.3, 0, 0.22, 0.22, 0.6, 0, 0, Math.PI / 2); part(g, CYL, b, 0.62, 1.6, 0, 0.22, 0.7, 0.22); part(g, CYL, b, -0.4, 0.95, 0, 0.2, 0.2, 0.5, 0, 0, Math.PI / 2); part(g, CYL, b, -0.56, 1.2, 0, 0.2, 0.6, 0.2); return g; },
  'tree:dead': () => { const g = new THREE.Group(), a = mat('#5a4a3c'), b = mat('#463a30');
    part(g, CYL, a, 0, 1.0, 0, 0.2, 2.0, 0.2); part(g, CYL, b, 0.3, 1.7, 0, 0.09, 0.9, 0.09, 0, 0, -0.8); part(g, CYL, b, -0.28, 1.45, 0.1, 0.08, 0.8, 0.08, 0.2, 0, 0.9); part(g, CYL, b, 0.05, 2.1, -0.2, 0.07, 0.7, 0.07, -0.6, 0, 0.2); return g; },
  // ---- stone
  rock: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(stone(3, false), mat('#ffffff'))); return g; },
  'rock:b': () => { const g = new THREE.Group(); g.add(new THREE.Mesh(stone(11, false), mat('#ffffff'))); return g; },
  'rock:spire': () => { const g = new THREE.Group(); g.add(new THREE.Mesh(stone(7, true), mat('#ffffff'))); return g; },
  pillar: () => { const g = new THREE.Group(), a = mat('#8a8a82'); part(g, CYL, a, 0, 0.5, 0, 1.6, 1, 1.6); part(g, BOX, a, 0, 0.04, 0, 2.2, 0.08, 2.2); return g; },
  // ---- the enemy's: a footprint radius of one
  hive: () => { const g = new THREE.Group(), mound = mat('#7a4a22'), dark = mat('#2a1608'), hot = mat('#ff9a3a');     // the Molt: a mound, its holes, spikes round it, glowing sacs
    part(g, DOME, mound, 0, 0, 0, 2.0, 1.5, 2.0); part(g, DOME, mat('#8f5a2a'), 0.25, 0.3, -0.2, 1.2, 1.5, 1.2);
    for (let i = 0; i < 6; i++) { const t = i / 6 * 6.283 + 0.3; part(g, CONE, dark, Math.cos(t) * 0.92, 0.3, Math.sin(t) * 0.92, 0.2, 0.9, 0.2, Math.sin(t) * 0.5, 0, -Math.cos(t) * 0.5); }
    for (let i = 0; i < 4; i++) { const t = i / 4 * 6.283 + 1; part(g, BLOB, i % 2 ? hot : dark, Math.cos(t) * 0.55, 0.5, Math.sin(t) * 0.55, 0.32, 0.32, 0.32); } part(g, BLOB, dark, 0.25, 1.02, -0.2, 0.4, 0.2, 0.4); return g; },
  fab: () => { const g = new THREE.Group(), iron = mat('#5a2a24'), dark = mat('#231210'), hot = mat('#ff5a3a'), steel = mat('#6a6a6e');     // the Foundry: a works, its stacks, a lit door
    part(g, BOX, iron, 0, 0.45, 0, 1.5, 0.9, 1.2); part(g, BOX, dark, 0, 0.98, 0, 1.6, 0.16, 1.3); part(g, BOX, hot, 0, 0.3, 0.61, 0.5, 0.5, 0.04);
    part(g, CYL, steel, -0.5, 1.1, -0.3, 0.26, 1.5, 0.26); part(g, CYL, steel, -0.1, 0.95, -0.35, 0.2, 1.2, 0.2); part(g, CYL, hot, -0.5, 1.87, -0.3, 0.2, 0.05, 0.2);
    part(g, BOX, dark, 0.75, 0.3, 0.2, 0.5, 0.6, 0.7); part(g, BOX, steel, 0.4, 1.3, 0.3, 0.06, 0.6, 0.06); part(g, BOX, steel, 0.4, 1.6, 0, 0.06, 0.06, 0.7); return g; },
  camp: () => { const g = new THREE.Group(), hide = mat('#6a3ea8'), dark = mat('#2c1848'), bone = mat('#efe6cf'), lit = mat('#c8ff6a');     // the Talon: a hide tent on bone poles, a living crystal at its top
    part(g, CONE, hide, 0, 0.8, 0, 1.8, 1.6, 1.8); part(g, CONE, dark, 0, 0.42, 0.5, 0.7, 0.85, 0.5);
    for (let i = 0; i < 3; i++) { const t = i / 3 * 6.283; part(g, CYL, bone, Math.cos(t) * 0.12, 1.75, Math.sin(t) * 0.12, 0.05, 0.7, 0.05, Math.sin(t) * 0.35, 0, -Math.cos(t) * 0.35); }
    part(g, BLOB, lit, 0, 2.1, 0, 0.26, 0.4, 0.26); for (let i = 0; i < 5; i++) { const t = i / 5 * 6.283 + 0.6; part(g, CYL, bone, Math.cos(t) * 0.95, 0.45, Math.sin(t) * 0.95, 0.04, 0.9, 0.04); } return g; },
  // the enemy's side sites: something of its own kind, not a spawning building
  spire: () => { const g = new THREE.Group(), mound = mat('#7a4a22'), dark = mat('#2a1608'), hot = mat('#ff9a3a');     // the Molt: a cluster of spore towers
    part(g, DOME, mound, 0, 0, 0, 1.9, 0.6, 1.9); part(g, CONE, mound, 0, 1.3, 0, 0.8, 2.6, 0.8); part(g, CONE, mat('#8f5a2a'), 0.5, 0.8, 0.3, 0.55, 1.6, 0.55, 0, 0, -0.2); part(g, CONE, mound, -0.45, 0.65, -0.35, 0.5, 1.3, 0.5, 0, 0, 0.25);
    part(g, BLOB, hot, 0, 2.55, 0, 0.3, 0.3, 0.3); part(g, BLOB, hot, 0.62, 1.55, 0.3, 0.22, 0.22, 0.22); part(g, BLOB, dark, -0.55, 1.25, -0.35, 0.2, 0.2, 0.2); return g; },
  totem: () => { const g = new THREE.Group(), bone = mat('#efe6cf'), hide = mat('#6a3ea8'), lit = mat('#c8ff6a'), dark = mat('#2c1848');     // the Talon: a standing bone, a hide wrapped round it, a living crystal
    part(g, CYL, dark, 0, 0.12, 0, 1.8, 0.24, 1.8); part(g, CYL, bone, 0, 1.4, 0, 0.22, 2.6, 0.22); part(g, BOX, bone, 0, 2.3, 0, 1.5, 0.12, 0.12, 0, 0, 0.12); part(g, CONE, hide, 0, 0.9, 0, 0.8, 1.2, 0.8); part(g, BLOB, lit, 0, 2.9, 0, 0.3, 0.45, 0.3);
    for (let i = 0; i < 4; i++) { const t = i / 4 * 6.283 + 0.4; part(g, CYL, bone, Math.cos(t) * 0.8, 0.5, Math.sin(t) * 0.8, 0.05, 1.0, 0.05, Math.sin(t) * 0.25, 0, -Math.cos(t) * 0.25); } return g; },
  turret: () => { const g = new THREE.Group(), a = mat('#4a4a4e'), b = mat('#26262a');     // a gun on a mount, facing +z
    part(g, CYL, b, 0, 0.25, 0, 1.5, 0.5, 1.5); part(g, BOX, a, 0, 0.8, 0, 0.9, 0.6, 1.0); part(g, CYL, b, 0.2, 0.85, 0.9, 0.14, 1.2, 0.14, Math.PI / 2); part(g, CYL, b, -0.2, 0.85, 0.9, 0.14, 1.2, 0.14, Math.PI / 2); return g; },
  cannon: () => { const g = new THREE.Group(), a = mat('#4a4a4e'), b = mat('#26262a'), hot = mat('#ff5a3a');     // the great gun: a pit, a cradle, a barrel at the sky
    part(g, CYL, b, 0, 0.2, 0, 1.9, 0.4, 1.9); part(g, BOX, a, 0, 0.7, -0.1, 0.9, 0.8, 1.1); part(g, CYL, a, 0, 1.5, 0.5, 0.34, 2.4, 0.34, 0.75); part(g, CYL, hot, 0, 2.38, 1.32, 0.3, 0.08, 0.3, 0.75); return g; },
  node: () => { const g = new THREE.Group(), a = mat('#4a4a4e'), b = mat('#26262a'), hot = mat('#ff5a3a');     // a mast and its dish
    part(g, BOX, b, 0, 0.25, 0, 1.2, 0.5, 1.2); part(g, CYL, a, 0, 1.4, 0, 0.12, 2.0, 0.12); part(g, DOME, a, 0, 2.2, 0.2, 1.0, 0.4, 1.0, -1.2); part(g, BLOB, hot, 0, 2.5, 0, 0.2, 0.2, 0.2); return g; },
  banner: () => { const g = new THREE.Group(), pole = mat('#3a3a3a'), cloth = mat('#ffffff'); part(g, CYL, pole, 0, 3.5, 0, 0.16, 7, 0.16); part(g, BOX, cloth, 0.75, 5.4, 0, 1.4, 2.8, 0.06); return g; },
  flag: () => { const g = new THREE.Group(), pole = mat('#3a3a3a'), cloth = mat('#ffffff'); part(g, CYL, pole, 0, 2.5, 0, 0.12, 5, 0.12); part(g, BOX, cloth, 0.7, 4.4, 0, 1.3, 0.9, 0.05); return g; },
  crate: () => { const g = new THREE.Group(), a = mat('#8a7a4a'), b = mat('#3a3426'), lid = mat('#e8d27a');     // something worth picking up: a crate, banded, its lid marked
    part(g, BOX, a, 0, 0.45, 0, 1.5, 0.9, 1.1); part(g, BOX, b, -0.45, 0.45, 0, 0.12, 0.94, 1.14); part(g, BOX, b, 0.45, 0.45, 0, 0.12, 0.94, 1.14); part(g, BOX, lid, 0, 0.92, 0, 0.5, 0.04, 0.5); return g; },
  // ---- yours: built or dropped
  'post:mg': () => { const g = new THREE.Group(), bag = mat('#8a7a56'), gun = mat('#2c302c');     // sandbags and a gun
    part(g, TOR, bag, 0, 0.18, 0, 1.7, 1.7, 1.6, Math.PI / 2); part(g, TOR, bag, 0, 0.42, 0, 1.6, 1.6, 1.4, Math.PI / 2); part(g, BOX, gun, 0, 0.7, 0.1, 0.16, 0.16, 0.5); part(g, CYL, gun, 0, 0.72, 0.75, 0.07, 0.9, 0.07, Math.PI / 2); part(g, CYL, gun, 0, 0.35, 0.1, 0.06, 0.7, 0.06); return g; },
  'post:sam': () => { const g = new THREE.Group(), a = mat('#5a6248'), b = mat('#2c302c'), tip = mat('#d9d9d9');     // a launcher on a turntable
    part(g, CYL, b, 0, 0.2, 0, 1.5, 0.4, 1.5); part(g, BOX, a, 0, 0.7, 0, 0.5, 0.7, 0.6); for (const sd of [-1, 1]) { part(g, BOX, a, sd * 0.45, 1.0, 0.15, 0.36, 0.36, 1.5, -0.7); part(g, CONE, tip, sd * 0.45, 1.52, 0.78, 0.2, 0.3, 0.2, 0.87); } return g; },
  'post:arty': () => { const g = new THREE.Group(), a = mat('#5a6248'), b = mat('#2c302c');     // a field gun: trails, a shield, a long barrel
    part(g, BOX, b, 0, 0.3, -0.1, 1.2, 0.3, 0.9); part(g, BOX, a, 0, 0.75, 0.2, 1.1, 0.7, 0.08); part(g, CYL, b, 0, 1.0, 0.95, 0.16, 2.2, 0.16, 1.15); for (const sd of [-1, 1]) { part(g, CYL, b, sd * 0.6, 0.3, 0, 0.6, 0.14, 0.6, 0, 0, Math.PI / 2); part(g, BOX, b, sd * 0.35, 0.15, -0.9, 0.1, 0.1, 1.2, 0, sd * 0.25); } return g; },
  'post:tower': () => { const g = new THREE.Group(), wood = mat('#6a5a40'), roof = mat('#3a4034');     // a watch tower: four legs, a deck, a roof
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, BOX, wood, sx * 0.5, 1.2, sz * 0.5, 0.1, 2.4, 0.1); part(g, BOX, wood, 0, 2.4, 0, 1.3, 0.1, 1.3); part(g, BOX, wood, 0, 2.7, 0.62, 1.3, 0.5, 0.06); part(g, BOX, wood, 0, 2.7, -0.62, 1.3, 0.5, 0.06); part(g, BOX, wood, 0.62, 2.7, 0, 0.06, 0.5, 1.3); part(g, BOX, wood, -0.62, 2.7, 0, 0.06, 0.5, 1.3); part(g, CONE, roof, 0, 3.55, 0, 2.1, 0.6, 2.1, 0, Math.PI / 4); return g; },
  aturret: () => { const g = new THREE.Group(), a = mat('#5a6248'), b = mat('#2c302c');     // a dropped auto turret: three legs, a head, a gun
    for (let i = 0; i < 3; i++) { const t = i / 3 * 6.283; part(g, BOX, b, Math.cos(t) * 0.45, 0.3, Math.sin(t) * 0.45, 0.1, 0.75, 0.1, Math.sin(t) * 0.6, 0, -Math.cos(t) * 0.6); }
    part(g, BOX, a, 0, 0.8, 0, 0.6, 0.45, 0.7); part(g, CYL, b, 0, 0.82, 0.8, 0.1, 1.1, 0.1, Math.PI / 2); part(g, BOX, mat('#ffffff'), 0, 1.06, 0, 0.5, 0.06, 0.5); return g; },
};

// (GC 0.40) the file a thing's model is kept in: 'tree:leaf' is prop_tree_leaf, 'post:mg' is prop_post_mg
const FILE = (k) => 'prop_' + String(k).replace(/:/g, '_');
// (GC 0.64) FOB COMMANDER'S BUILDINGS IN THE GROUND FIGHT. A thing on the ground that is one of the base's buildings ('bld:eob',
// the Emergency Operations Bunker) is drawn whole, live parts and all, by the base's own maker (js/base/models.js), in your
// command's colours. The base's code is fetched the first time one is asked for; until its models have come, nothing is drawn
// (VIEW.m3 has 'bld' once they have, so the flat drawing can stand down). One stands for each key, at u.s metres a tile.
// (GC 0.64) NOTHING HOVERS OFF A SLOPE. A thing is seated at the lowest point of the ground under its footprint (its middle and
// eight points round it), so on a hillside its uphill edge sinks in rather than its downhill edge standing in the air. A tree
// stands on its trunk; things laid along a line already follow the slope; things in the air are left alone. Kept a while per spot.
const RING = Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);
const SEAT = new Map(); let seatN = 0;
function seat(ground, x, z, r) {
  if (!(r > 0.3)) return ground(x, z);
  const key = `${Math.round(x * 4)},${Math.round(z * 4)},${Math.round(r * 4)}`; let y = SEAT.get(key);
  if (y === undefined) { y = ground(x, z); for (const [c, s] of RING) y = Math.min(y, ground(x + c * r, z + s * r)); SEAT.set(key, y); }
  return y;
}
const footOf = (u) => (u.l || u.up ? 0 : (u.k.startsWith('tree') ? 0.12 : u.k.startsWith('rock') ? 0.55 : 0.8) * u.s);
const FLEET = { primary: '#3b4249', secondary: '#7fe9e0', logo: { shape: 'shield', symbol: 'star', pattern: 'none', bg: '#1d3f8a', fg: '#ffe600', rim: '#f4f4f4' } };
class Blds {
  constructor(scene) { this.scene = scene; this.live = new Map(); this.M = null; this.m = null; this.ready = false; this.asked = false; }
  ask() {
    if (this.asked) return; this.asked = true;
    import('../../base/models.js').then((M) => {
      let f = null; try { f = window.parent && window.parent.gc && window.parent.gc.app && window.parent.gc.app.faction; } catch { f = null; }
      this.M = M; this.m = M.makeMats(f && f.logo && f.primary ? f : FLEET);
      M.loadBuildings(() => { this.ready = true; VIEW.m3.add('bld'); });
    }).catch((err) => console.warn('FOB buildings unavailable', err));
  }
  frame(list, ground) {
    if (!list.length && !this.live.size) return;
    if (!this.ready) { if (list.length) this.ask(); return; }
    const seen = new Set();
    for (const u of list) {
      const key = u.key || `${u.k}|${Math.round(u.x)},${Math.round(u.y)}`; seen.add(key);
      let g = this.live.get(key);
      if (!g) { try { g = this.M.buildModel(u.k.slice(4), this.m, true); } catch { g = null; } if (!g) continue; g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); this.scene.add(g); this.live.set(key, g); }
      if (g.userData.r == null) { const b = new THREE.Box3().setFromObject(g); g.userData.r = Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2 / (g.scale.x || 1); }
      g.position.set(u.x, seat(ground, u.x, u.y, g.userData.r * u.s * 0.9) - (u.sink || 0), u.y); g.rotation.y = u.rot || 0; g.scale.set(u.s, u.hy || u.s, u.s);
    }
    for (const [k, g] of this.live) if (!seen.has(k)) { this.scene.remove(g); this.live.delete(k); }
  }
}
export class Props3D {
  constructor(scene) {
    this.scene = scene; this.kinds = new Map(); this.used = new Map(); this.blds = new Blds(scene);
    this.mat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, flatShading: true });
    this.smooth = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });     // (the Blender models bring their own normals: rounded where they curve)
    // (GC 0.38) the objectives and side sites are models made in Blender (tools/blender/sites.py), listed in the index and
    // fetched as the game starts. Until one has come, the old flat drawing of it is used (VIEW.m3 says which have come).
    this.files = new Map(); this.accent = '#ff5a3a';
    fetch('assets/models/index.json').then((r) => (r.ok ? r.json() : null)).then((ix) => {
      for (const name of (ix && ix.props) || []) fetch(`assets/models/${name}.json`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.frames && d.frames.stand) { this.files.set(name, d); for (const k of [...this.kinds.keys()]) if (k === name || FILE(k) === name) this._drop(k); VIEW.m3.add(name); } }).catch(() => {});
    }).catch(() => {});
  }
  has(k) { return !!MODELS[k] || this.files.has(k) || this.files.has(FILE(k)); }
  _drop(k) { const m = this.kinds.get(k); if (m) { this.scene.remove(m); m.geometry.dispose(); } this.kinds.delete(k); }
  // the enemy's own colour, for the parts of a model that wear it (its screen, its lamps, its door)
  setAccent(hex) { if (!hex || hex === this.accent) return; this.accent = hex; for (const k of this.files.keys()) this._drop(k); }
  _kind(k) {
    let m = this.kinds.get(k); if (m !== undefined) return m;
    const file = this.files.get(k) || this.files.get(FILE(k)), make = MODELS[k]; if (!file && !make) { this.kinds.set(k, null); return null; }     // (GC 0.40) a model from Blender if it has come, else the one built here
    const geo = file ? staticGeo(file, { accent: this.accent, accent_lit: this.accent }) : bake(make(), null, true);
    m = new THREE.InstancedMesh(geo, file ? this.smooth : this.mat, file && !this.files.has(FILE(k)) ? 96 : CAP); m.count = 0; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(m); this.kinds.set(k, m); return m;
  }
  // list: [{ k, x, y (the map's), s (footprint, metres), h (height scale, if not s), rot (radians), tint, dim }]; lit: how much light the hour leaves (0 to 1)
  frame(list, ground, lit = 1) {
    this.mat.color.setScalar(lit); this.smooth.color.setScalar(lit); this.used.clear();
    const blds = []; if (++seatN > 240 || SEAT.size > 6000) { SEAT.clear(); seatN = 0; }     // (the seats are worked out again now and then: craters change the ground)
    for (const u of list) {
      if (u.k.startsWith('bld:')) { blds.push(u); continue; }
      const m = this._kind(u.k); if (!m) continue; const n = this.used.get(m) || 0; if (n >= m.instanceMatrix.count) continue;
      Q.setFromAxisAngle(UP, u.rot || 0); P.set(u.x, seat(ground, u.x, u.y, footOf(u)) - (u.sink || 0) + (u.up || 0), u.y); S.set(u.l || u.s, u.h || u.s, u.s);     // (GC 0.41) l: a thing laid along a line is stretched to its length
      if (u.l) {     // (GC 0.44) and it runs with the slope: each end on the ground where it is, not level through a hillside
        const c = Math.cos(u.rot || 0) * u.l, sn = Math.sin(u.rot || 0) * u.l, h1 = ground(u.x + c, u.y - sn), h0 = ground(u.x - c, u.y + sn), a = Math.atan2(h1 - h0, 2 * u.l);
        Q.multiply(Q2.setFromAxisAngle(FWD, a)); P.y = (h0 + h1) / 2 - (u.sink || 0) + (u.up || 0); S.x = u.l / Math.max(0.5, Math.cos(a));
      }
      m.setMatrixAt(n, M4.compose(P, Q, S)); COL.set(u.tint || '#ffffff'); if (u.dim != null && u.dim < 1) COL.multiplyScalar(u.dim); if (u.flash) COL.multiplyScalar(2.4); m.setColorAt(n, COL);
      this.used.set(m, n + 1);
    }
    this.blds.frame(blds, ground);
    let total = 0;
    for (const m of this.kinds.values()) { if (!m) continue; m.count = this.used.get(m) || 0; total += m.count; if (m.count) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }
    this.n = total;
  }
}
