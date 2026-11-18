// THE UNITS IN 3D (GC 0.20, stage three of the move to 3D). Everyone on the field stands up on the land as a small model:
// your squad and your infantry are the base game's own soldier (so they wear your colours), your vehicles its vehicles,
// and each enemy a simple figure of its own kind until the real models are made: the Molt low and many-legged, the
// Foundry upright and boxy, the Talon tailed, their riders on a mount, their heavies as beasts and machines.
//
// One instanced mesh for each kind: any number of them is one draw. A model is baked to a single shape with its colours
// in its corners, standing on the ground at the origin, facing +z, sized so its widest or tallest measure is two units.
import * as THREE from '../../vendor/three.js';
import { makeMats, makePerson, poseKit, makeLRV, makeTank, makeDropship, makeCrate } from '../../base/models.js';

const TMP = new THREE.Color(), Q2 = new THREE.Quaternion(), FWD = new THREE.Vector3(0, 0, 1), SIDE = new THREE.Vector3(1, 0, 0);
const CAP = 700;     // of one kind on screen at once
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), S = new THREE.Vector3(), COL = new THREE.Color();

// one shape, coloured at its corners, from a group of plain meshes; `tint` overrides every colour (a faction's own)
export function bake(group, tint = null, raw = false) {
  group.updateMatrixWorld(true); const pos = [], nor = [], col = [];
  group.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || !o.geometry.attributes.normal) return;
    if (o.material.map && !tint) return;     // (a crest on an arm: too small to see from up here)
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld), c = tint ? COL.set(tint).multiplyScalar(0.55 + 0.45 * ((pos.length * 7919) % 5) / 5) : o.material.color;
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); col.push(c.r, c.g, c.b); }
    g.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  // stand it on the ground at the origin and size it to a footprint radius of one
  out.computeBoundingBox(); const b = out.boundingBox, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, r = Math.max(b.max.x - b.min.x, b.max.z - b.min.z, b.max.y - b.min.y) / 2 || 1;     // (its widest or its tallest, whichever is more)
  if (raw) return out;     // (a prop is built to its own measure already)
  out.translate(-cx, -b.min.y, -cz); out.scale(1 / r, 1 / r, 1 / r); return out;
}
const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
const part = (g, geo, m, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, 0, rz); g.add(o); return o; };
const BOX = new THREE.BoxGeometry(1, 1, 1), BALL = new THREE.SphereGeometry(0.5, 10, 7), CONE = new THREE.ConeGeometry(0.5, 1, 8);

// THE MOLT: a low body, a head, six legs out to the sides
function molt(size) {
  const g = new THREE.Group(), shell = mat('#b4652a'), dark = mat('#5a3214'), hot = mat('#ffb060');
  part(g, BALL, shell, 0, 0.42, -0.15, 1.1, 0.6, 1.5); part(g, BALL, dark, 0, 0.4, 0.75, 0.7, 0.5, 0.7); part(g, BALL, hot, 0, 0.5, -0.35, 0.5, 0.3, 0.7);
  for (const sd of [-1, 1]) for (const z of [-0.55, 0, 0.5]) part(g, BOX, dark, sd * 0.75, 0.3, z, 0.7, 0.09, 0.1, 0, sd * -0.5);
  if (size > 1) { for (const sd of [-1, 1]) part(g, CONE, dark, sd * 0.3, 0.45, 1.2, 0.18, 0.7, 0.18, Math.PI / 2); }     // jaws on the bigger ones
  if (size > 2) part(g, BALL, shell, 0, 0.75, -0.3, 1.3, 0.7, 1.4);     // a hump of armour on the heavy
  return g;
}
// THE FOUNDRY: the soldier's own frame in iron, or a tracked machine for the heavy
function foundry(size, mats) {
  if (size > 2) return makeTank(mats);
  const g = new THREE.Group(), iron = mat('#6a2a24'), dark = mat('#2a1512'), eye = mat('#ff5a3a');
  part(g, BOX, iron, 0, 1.25, 0, 0.75, 0.9, 0.45); part(g, BOX, dark, 0, 1.95, 0, 0.42, 0.4, 0.42); part(g, BOX, eye, 0, 1.98, 0.22, 0.3, 0.08, 0.04);
  for (const sd of [-1, 1]) { part(g, BOX, dark, sd * 0.2, 0.4, 0, 0.22, 0.8, 0.24); part(g, BOX, iron, sd * 0.5, 1.3, 0.1, 0.18, 0.7, 0.2); }
  part(g, BOX, dark, 0.5, 1.15, 0.5, 0.1, 0.1, 0.9);     // its gun, levelled
  if (size > 1) { part(g, BOX, iron, 0, 1.75, -0.1, 1.1, 0.25, 0.5); }     // the medium's shoulders
  return g;
}
// THE TALON: tailed and crested on foot; a rider on a raptor; a horned beast
function talon(size) {
  const g = new THREE.Group(), hide = mat('#8a52c8'), dark = mat('#3a2060'), lit = mat('#c8ff6a'), bone = mat('#efe6cf');
  if (size === 1) {
    part(g, BALL, hide, 0, 0.9, 0, 0.55, 1.0, 0.5); part(g, BALL, hide, 0, 1.5, 0.2, 0.36, 0.34, 0.55); part(g, CONE, dark, 0, 0.6, -0.6, 0.25, 1.1, 0.25, -Math.PI / 2 - 0.2);
    for (const sd of [-1, 1]) part(g, BOX, dark, sd * 0.16, 0.3, 0, 0.14, 0.6, 0.16);
    part(g, BOX, dark, 0.4, 1.2, 0.3, 0.05, 0.05, 2.0); part(g, CONE, lit, 0.4, 1.2, 1.35, 0.12, 0.3, 0.12, Math.PI / 2);     // the spear
  } else if (size === 2) {
    part(g, BALL, hide, 0, 0.95, 0, 0.6, 0.6, 1.6); part(g, BALL, hide, 0, 1.35, 1.0, 0.35, 0.35, 0.8); part(g, CONE, dark, 0, 0.95, -1.4, 0.3, 1.5, 0.3, -Math.PI / 2);
    for (const sd of [-1, 1]) part(g, BOX, dark, sd * 0.28, 0.4, 0.1, 0.16, 0.8, 0.2);
    part(g, BALL, dark, 0, 1.55, -0.1, 0.35, 0.6, 0.35); part(g, BALL, hide, 0, 1.95, 0, 0.26, 0.26, 0.3);     // the rider
    part(g, BOX, dark, 0.35, 1.9, 0.5, 0.05, 0.05, 2.4); part(g, CONE, lit, 0.35, 1.9, 1.85, 0.14, 0.35, 0.14, Math.PI / 2);
  } else {
    part(g, BALL, hide, 0, 1.1, -0.1, 1.2, 1.1, 1.9); part(g, BALL, hide, 0, 1.0, 1.15, 0.6, 0.55, 0.8); part(g, BALL, bone, 0, 1.35, 0.8, 1.3, 1.0, 0.25);     // body, head, frill
    for (const sd of [-1, 1]) { part(g, CONE, bone, sd * 0.25, 1.15, 1.75, 0.12, 0.7, 0.12, Math.PI / 2); for (const z of [-0.7, 0.55]) part(g, BOX, dark, sd * 0.45, 0.4, z, 0.3, 0.8, 0.3); }
    part(g, CONE, dark, 0, 0.9, -1.5, 0.35, 1.3, 0.35, -Math.PI / 2); part(g, BOX, dark, 0, 1.85, -0.2, 0.7, 0.4, 0.8); part(g, BALL, lit, 0, 1.9, 0.25, 0.25, 0.25, 0.25);     // tail, howdah, the living cannon
  }
  return g;
}
// a mech suit: two legs, a cab, two arms of guns
function mech(mats) {
  const g = new THREE.Group(), body = mats.olive || mat('#5a6248'), dark = mats.oliveDark || mat('#2c302c');
  for (const sd of [-1, 1]) { part(g, BOX, dark, sd * 0.3, 0.5, 0, 0.25, 1.0, 0.35); part(g, BOX, dark, sd * 0.75, 1.4, 0.25, 0.22, 0.3, 0.9); }
  part(g, BOX, body, 0, 1.4, 0, 0.9, 0.8, 0.7); part(g, BOX, mats.glass || dark, 0, 1.55, 0.36, 0.5, 0.3, 0.05);
  return g;
}

// a Striker: a nose, swept wings, twin tails, a hot exhaust; flying toward +z
function jet() {
  const g = new THREE.Group(), skin = mat('#c9d2d8'), dark = mat('#39444c'), glass = mat('#46586a'), hot = mat('#ffaa3c');
  part(g, BOX, skin, 0, 0, 0, 0.5, 0.32, 3.4); part(g, CONE, skin, 0, 0, 2.2, 0.5, 1.0, 0.32, Math.PI / 2); part(g, BOX, glass, 0, 0.2, 1.0, 0.3, 0.16, 0.8);
  for (const sd of [-1, 1]) { const w = part(g, BOX, skin, sd * 1.0, 0, -0.5, 1.8, 0.06, 1.1); w.rotation.y = sd * 0.5; const f = part(g, BOX, dark, sd * 0.3, 0.35, -1.5, 0.05, 0.6, 0.6); f.rotation.z = sd * -0.3; part(g, BOX, skin, sd * 0.55, 0, -1.6, 0.7, 0.05, 0.5); }
  part(g, BOX, hot, 0, 0, -1.75, 0.3, 0.2, 0.1); return g;
}

// A PERSON'S FRAMES (GC 0.27). The game's one figure (base/models.js makePerson), posed and baked once for each moment it can be
// seen in: standing with the rifle ready, aiming, and eight steps of a walk both ways. A unit shows the frame its moment calls
// for, so legs stride, knees bend and the rifle comes up to fire. A citizen has no rifle: they stand, and walk with arms swinging.
export const STEPS = 8;
function personFrames(make, armed) {
  const out = {}; let fit = null;
  const shot = (name, pose) => {
    const g = make(); pose(g); const geo = bake(g, null, true);
    if (!fit) { geo.computeBoundingBox(); const b = geo.boundingBox; fit = { x: -(b.min.x + b.max.x) / 2, y: -b.min.y, z: 0, k: 2 / ((b.max.y - b.min.y) || 1) }; }     // every frame sized and stood the same way: two units tall, feet on the ground
    geo.translate(fit.x, fit.y, fit.z); geo.scale(fit.k, fit.k, fit.k); out[name] = geo;
  };
  const legs = (g, ph) => { const p = g.userData.parts; p.legL.rotation.x = Math.sin(ph) * 0.62; p.legR.rotation.x = -Math.sin(ph) * 0.62; };
  const arms = (g, ph) => { const p = g.userData.parts; p.armL.rotation.x = -Math.sin(ph) * 0.5; p.armR.rotation.x = Math.sin(ph) * 0.5; p.armL.userData.elbow.rotation.x = p.armR.userData.elbow.rotation.x = -0.35; };
  shot('stand', (g) => poseKit(g, armed ? 'ready' : 'stand'));
  if (armed) shot('aim', (g) => poseKit(g, 'aim'));
  for (let i = 0; i < STEPS; i++) { const ph = i / STEPS * Math.PI * 2;
    shot('w' + i, (g) => { legs(g, ph); if (!armed) arms(g, ph); poseKit(g, armed ? 'ready' : 'walk', ph, 'walk'); });
    if (armed) shot('a' + i, (g) => { legs(g, ph); poseKit(g, 'aim', ph, 'walk'); }); }
  return { frames: out };
}

// MODELS MADE IN BLENDER (GC 0.31). tools/blender builds a creature from joints and parts, poses it for each frame and writes
// assets/models/<name>.json: its triangles and their colours once, and the place of every vertex for each frame (stand, w0..w7, atk).
// Here that becomes one flat-shaded geometry for each frame, stood on the ground and sized like every other unit.
// Every kind the ground rules have: three sizes for each faction, a second kind of light or medium (the Leaper, the Rocketeer, the
// Bombardier), a special (the Shellback, the Foreman, the Herd Beast) and a boss (the Elder Husk, the Siege Walker, the Thunder Lizard).
const MODELS = {
  'bugs:L': 'molt_L', 'bugs:M': 'molt_M', 'bugs:H': 'molt_H', 'bugs:leap': 'molt_leaper', 'bugs:guard': 'molt_shellback', 'bugs:boss': 'molt_elder',
  'bots:L': 'foundry_L', 'bots:M': 'foundry_M', 'bots:H': 'foundry_H', 'bots:rkt': 'foundry_rocketeer', 'bots:cmd': 'foundry_foreman', 'bots:boss': 'foundry_siege',
  'lizards:L': 'talon_L', 'lizards:M': 'talon_M', 'lizards:H': 'talon_H', 'lizards:mort': 'talon_bombardier', 'lizards:soak': 'talon_herd', 'lizards:boss': 'talon_thunder',
  van: 'vanguard', inf: 'soldier', civ0: 'citizen_a', civ1: 'citizen_b', civ2: 'citizen_c',
};
const b64 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
// One set of frames from a model file (or from its lighter copy, d.lod). remap: { a material's name: a colour } to dress it in the fleet's own.
function frameSet(d, fit, remap) {
  const tris = new Uint16Array(b64(d.tris).buffer.slice(0)), cols = b64(d.cols), mi = d.mi ? b64(d.mi) : null, nt = d.nt, out = {}, c = new THREE.Color();
  const col = new Float32Array(nt * 9);
  for (let t = 0; t < nt; t++) {
    const nm = mi && d.pal ? d.pal[mi[t]] : null, rc = nm && remap ? remap[nm] : null;
    if (rc) c.set(rc); else c.setRGB(cols[t * 3] / 255, cols[t * 3 + 1] / 255, cols[t * 3 + 2] / 255, THREE.SRGBColorSpace);
    for (let k = 0; k < 3; k++) { col[t * 9 + k * 3] = c.r; col[t * 9 + k * 3 + 1] = c.g; col[t * 9 + k * 3 + 2] = c.b; }
  }
  const names = Object.keys(d.frames).sort((a, b) => (a === 'stand' ? -1 : b === 'stand' ? 1 : 0));     // (the standing frame sets the size for all of them)
  for (const name of names) {
    const q = new Uint16Array(b64(d.frames[name]).buffer.slice(0)), pos = new Float32Array(nt * 9);
    for (let i = 0; i < nt * 3; i++) { const v = tris[i] * 3; for (let k = 0; k < 3; k++) pos[i * 3 + k] = d.min[k] + q[v + k] / 65535 * d.size[k]; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    if (!fit.k) { g.computeBoundingBox(); const b = g.boundingBox; fit.x = -(b.min.x + b.max.x) / 2; fit.y = -b.min.y; fit.z = -(b.min.z + b.max.z) / 2; fit.k = 2 / (fit.ask || Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) || 1); }
    g.translate(fit.x, fit.y, fit.z); g.scale(fit.k, fit.k, fit.k); out[name] = g;
  }
  return out;
}
// d.fit: the model's own say on its size, so a long spear or tail does not shrink its carrier. d.lod: the same creature in far fewer
// triangles, for when it is small on the screen or the field is crowded.
export function modelFrames(d, remap = null) {
  const fit = { ask: d.fit || 0, k: 0 }, out = { frames: frameSet(d, fit, remap) };
  if (d.lod) out.lod = { frames: frameSet(d.lod, fit, remap) };
  return out;
}

export class Units3D {
  constructor(scene, livery) {
    this.scene = scene; this.kinds = new Map(); this.used = new Map(); this.all = [];
    let mats = null; try { mats = makeMats(livery || { primary: '#2f8f9c', secondary: '#f2efe4', logo: { shape: 'shield', bg: '#2f8f9c', sym: 'star', fg: '#f2efe4' } }); } catch (err) { console.warn('livery for the 3D troops unavailable', err); }
    this.mats = mats || {};
    const vanMats = mats ? { ...mats, prim: new THREE.MeshLambertMaterial({ color: 0xffffff }) } : null;     // (a Vanguard's trim is left white in the model: each one's team colour is laid on it)
    const person = (k) => (mats ? makePerson(mats, k) : (() => { const g = new THREE.Group(); part(g, BOX, mat('#8fb0cc'), 0, 0.9, 0, 0.5, 1.2, 0.3); part(g, BALL, mat('#2c5a94'), 0, 1.7, 0, 0.4, 0.4, 0.4); return g; })());
    // how tall each stands for a footprint radius of one is whatever its model is; `k` scales the footprint asked for
    this.def = {
      dship: () => bake(mats ? makeDropship(mats) : jet()), jet: () => bake(jet()), crate: () => bake(mats ? makeCrate(mats) : (() => { const g = new THREE.Group(); part(g, BOX, mat('#ffd678'), 0, 0.5, 0, 1, 1, 1); return g; })()),
      van: () => (mats ? personFrames(() => makePerson(vanMats, 'hd'), true) : bake(person('troop'))), inf: () => (mats ? personFrames(() => makePerson(mats, 'troop'), true) : bake(person('troop'))),
      civ0: () => (mats ? personFrames(() => makePerson(mats, 'civ0'), false) : bake(person('troop'))), civ1: () => (mats ? personFrames(() => makePerson(mats, 'civ1'), false) : bake(person('troop'))), civ2: () => (mats ? personFrames(() => makePerson(mats, 'civ2'), false) : bake(person('troop'))), lrv: () => bake(mats ? makeLRV(mats) : mech({})), mech: () => bake(mech(this.mats)),
      'bugs:L': () => bake(molt(1)), 'bugs:M': () => bake(molt(2)), 'bugs:H': () => bake(molt(3)),
      'bots:L': () => bake(foundry(1, mats)), 'bots:M': () => bake(foundry(2, mats)), 'bots:H': () => (mats ? bake(foundry(3, mats), '#7a3028') : bake(foundry(2, mats))),
      'lizards:L': () => bake(talon(1)), 'lizards:M': () => bake(talon(2)), 'lizards:H': () => bake(talon(3)),
    };
    this.mat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
    this.hot = new THREE.Color(0, 0, 0);
    // the Blender models come in a moment after the fight opens; until one has, its kind is drawn as the simple shape above
    this.loaded = {};
    if (typeof fetch === 'function') fetch('assets/models/index.json').then((r) => (r.ok ? r.json() : null)).then((ix) => {     // (the list says which are made, so nothing missing is asked for)
      for (const [k, file] of Object.entries(MODELS)) if (ix && ix.models && ix.models.includes(file))
        fetch(`assets/models/${file}.json`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!d || !d.frames) return; const made = modelFrames(d, this.dress(k)); this.def[k] = () => made; this._drop(k); this.loaded[k] = d.nt; }).catch(() => {});
    }).catch(() => {});
  }
  // The fleet's own colours for the parts of a character model that are named for them (the enemy wears its own).
  dress(k) {
    const m = this.mats; if (!m || !m.uniform || k.includes(':')) return null;
    const dark = (c, f) => c.clone().multiplyScalar(f);
    const o = { uniform: m.uniform.color, uniform_dark: dark(m.uniform.color, 0.78), kit: dark(m.uniform.color, 0.62), helmet: m.helmet.color, armband: m.armband.color };
    if (k === 'van') o.trim = new THREE.Color(1, 1, 1);     // (left white: each Vanguard's team colour is laid on it)
    else o.trim = m.prim.color;
    return o;
  }
  // a kind's meshes taken off the scene, so it is built again from what it is made of now
  _drop(k) {
    const m = this.kinds.get(k); if (m === undefined) return; this.kinds.delete(k); if (!m) return;
    for (const im of m.frames ? [...Object.values(m.frames), ...(m.lod ? Object.values(m.lod.frames) : [])] : [m]) { this.scene.remove(im); const i = this.all.indexOf(im); if (i >= 0) this.all.splice(i, 1); im.dispose(); }
  }
  _kind(k) {
    let m = this.kinds.get(k); if (m !== undefined) return m;
    const make = this.def[k]; if (!make) { this.kinds.set(k, null); return null; }
    const inst = (geo, cap) => { const im = new THREE.InstancedMesh(geo, this.mat, cap); im.count = 0; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(im); this.all.push(im); return im; };
    const made = make();
    if (made.frames) { m = { frames: {} }; for (const f in made.frames) m.frames[f] = inst(made.frames[f], k.includes(':') ? 320 : 160); if (made.lod) { m.lod = { frames: {} }; for (const f in made.lod.frames) m.lod.frames[f] = inst(made.lod.frames[f], 600); } }     // (one mesh for each frame of a person)
    else m = inst(made, CAP);
    this.kinds.set(k, m); return m;
  }
  // list: [{ k (kind), x, y (the map's), r (footprint, metres), face (radians on the map), tint (a colour or null), dim (0 to 1), walk (the step's phase in radians while it moves, else null) }]; ground(x, y): metres up
  // hot: through an infrared sight a body is warm and shows bright whatever it wears
  frame(list, ground, hot = false) {
    this.mat.emissive.setScalar(hot ? 0.62 : 0);
    this.used.clear();
    for (const u of list) {
      const K = this._kind(u.k) || (u.alt ? this._kind(u.alt) : null); if (!K) continue; let m = K, posed = false;
      if (K.frames) {
        const F = u.lod && K.lod ? K.lod.frames : K.frames, st = u.walk != null ? Math.floor((((u.walk % 6.2832) + 6.2832) % 6.2832) / 6.2832 * STEPS) % STEPS : -1;
        posed = !!(u.pose && F[u.pose]);
        m = (u.pose && F[u.pose]) || (u.jump && F.jump) || (u.atk && F.atk) || (u.aim && (st < 0 ? F.aim : F['a' + st])) || (st < 0 ? F.stand : F['w' + st] || F['w' + (st & 6)]) || F.stand;
      }
      const n = this.used.get(m) || 0; if (n >= m.instanceMatrix.count) continue;
      Q.setFromAxisAngle(UP, Math.PI / 2 - (u.face || 0)); P.set(u.x, ground(u.x, u.y) + (u.up || 0), u.y); S.setScalar(u.r);
      if (posed) P.y -= (u.sink || 0) * 0.3 * u.r;     // (it lies as its own model has it lie: only the sinking away is left to do)
      else if (u.tumble != null) { Q.multiply(Q2.setFromAxisAngle(SIDE, -u.tumble)); P.y += Math.abs(Math.sin(u.tumble)) * 0.16 * u.r - (u.sink || 0) * 0.6 * u.r; }     // (GC 0.29) a body: turned over backwards about its feet, lying on the ground, sinking away as it fades
      else if (u.walk != null && K.frames) P.y += Math.abs(Math.sin(u.walk)) * 0.04 * u.r;     // (a person's legs do the walking: only the rise of each step)
      else if (u.walk != null) { const s = Math.sin(u.walk); P.y += Math.abs(s) * 0.1 * u.r; Q.multiply(Q2.setFromAxisAngle(FWD, s * 0.11)); }     // (GC 0.26) on the move: a step's rise and a sway from foot to foot, until the models are given legs that walk
      m.setMatrixAt(n, M4.compose(P, Q, S)); COL.set(u.tint || '#ffffff'); if (u.dim != null && u.dim < 1) COL.multiplyScalar(u.dim); m.setColorAt(n, COL);
      this.used.set(m, n + 1);
    }
    let total = 0;
    for (const m of this.all) { m.count = this.used.get(m) || 0; total += m.count; if (m.count) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }
    this.n = total;
  }
}

// WHAT COMES DOWN, IN 3D (GC 0.22): the things that fall into the fight, drawn in the air they fall through.
//   drops    whatever is landing (the squad, infantry, supplies) under a parachute, sinking to its mark
//   tracers  the ship's own shells, from the gun slung under the gunship down to where they will hit
//   strobes  the infrared strobe each of yours wears: a point of light that blinks, the way friends are told from foes
export class Fx3D {
  constructor(scene) {
    const lit = (c) => new THREE.MeshLambertMaterial({ color: c }), glow = (c) => new THREE.MeshBasicMaterial({ color: c });
    const inst = (geo, m, n) => { const o = new THREE.InstancedMesh(geo, m, n); o.count = 0; o.frustumCulled = false; o.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(o); return o; };
    const dome = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);     // a canopy: the top half of a ball
    this.canopy = inst(dome, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 64);
    this.load = inst(new THREE.BoxGeometry(1, 1, 1), lit('#4a4f44'), 64);
    this.cord = inst(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), lit('#1a1c18'), 256);
    this.shell = inst(new THREE.BoxGeometry(1, 1, 1), glow('#fff2d0'), 128);
    this.strobe = inst(new THREE.SphereGeometry(1, 8, 6), glow('#ffffff'), 256);
    // a blast: a ball of fire that swells and climbs, white at first, then orange, then gone (it adds its light to the picture, so as it darkens it fades)
    // the troops' own fire: a streak of light from tail to head at gun height; a glowing ball for what is lobbed or spat; a shield as a dome of light
    const add = () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.bolt = inst(new THREE.BoxGeometry(1, 1, 1), add(), 600); this.orb = inst(new THREE.IcosahedronGeometry(1, 1), add(), 160);
    this.dome = inst(new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 48);
    this.bolt.renderOrder = this.orb.renderOrder = 4; this.dome.renderOrder = 6;
    // smoke: soft grey puffs that face the eye, swell and climb. Four meshes, each fainter than the last: a puff moves down them as it thins.
    { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c2 = cv.getContext('2d'), gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(cv), quad = new THREE.PlaneGeometry(2, 2);
      this.smoke = [0.36, 0.25, 0.15, 0.07].map((op) => { const im = inst(quad, new THREE.MeshBasicMaterial({ color: 0xffffff, map: tex, transparent: true, opacity: op, depthWrite: false }), 90); im.renderOrder = 3; return im; }); }
    this.blast = inst(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 96); this.blast.renderOrder = 5;
    this.dir = new THREE.Vector3(); this.a = new THREE.Vector3(); this.b = new THREE.Vector3(); this.z = new THREE.Vector3(0, 0, 1); this.yv = new THREE.Vector3(0, 1, 0);
  }
  // drops: [{ x, y, f (1 high up, 0 landed), tint, big }]   shells: [{ x, y, q (0 fired, 1 hit), big }]   strobes: [{ x, y, h }]
  // gun: where the ship's gun is (a point in the world); ground(x, y): metres up
  frame(o, ground) {
    let n = 0, c = 0;
    for (const d of o.drops || []) {
      if (n >= 64) break; const gy = ground(d.x, d.y), h = d.f * d.f * 150 + (d.f > 0 ? 2 : 0), sway = Math.sin(d.x * 0.7 + d.f * 9) * 3 * d.f, x = d.x + sway + d.f * 18, z = d.y + d.f * 10, R = d.big ? 5.5 : 4, top = gy + h + 9;
      Q.identity(); P.set(x, top, z); S.set(R, R * 0.6, R); this.canopy.setMatrixAt(n, M4.compose(P, Q, S)); COL.set(d.tint || '#d8d2c0'); this.canopy.setColorAt(n, COL);
      const L = d.big ? 2.6 : 1.8; P.set(x, gy + h + L / 2, z); S.set(L, L, L); this.load.setMatrixAt(n, M4.compose(P, Q, S));
      for (let i = 0; i < 4 && c < 256; i++) {     // four cords from the rim of the canopy to the load
        const a = i * 1.5708 + 0.785; this.a.set(x + Math.cos(a) * R * 0.95, top, z + Math.sin(a) * R * 0.95); this.b.set(x, gy + h + L, z);
        this.dir.subVectors(this.b, this.a); const len = this.dir.length(); Q.setFromUnitVectors(this.yv, this.dir.normalize()); P.addVectors(this.a, this.b).multiplyScalar(0.5); S.set(1, len, 1); this.cord.setMatrixAt(c++, M4.compose(P, Q, S));
      }
      n++;
    }
    this.canopy.count = this.load.count = n; this.cord.count = c;
    if (n) { this.canopy.instanceMatrix.needsUpdate = this.load.instanceMatrix.needsUpdate = this.cord.instanceMatrix.needsUpdate = true; if (this.canopy.instanceColor) this.canopy.instanceColor.needsUpdate = true; }
    let k = 0;
    if (o.gun) for (const s of o.shells || []) {
      if (k >= 128) break; this.b.set(s.x, ground(s.x, s.y), s.y); this.dir.subVectors(this.b, o.gun); const len = this.dir.length(); this.dir.normalize();
      const head = s.q * len, tail = Math.max(0, head - (s.big ? 70 : 45)), w = s.big ? 1.3 : 0.8;
      Q.setFromUnitVectors(this.z, this.dir); P.copy(o.gun).addScaledVector(this.dir, (head + tail) / 2); S.set(w, w, Math.max(1, head - tail)); this.shell.setMatrixAt(k++, M4.compose(P, Q, S));
    }
    this.shell.count = k; if (k) this.shell.instanceMatrix.needsUpdate = true;
    let j = 0;
    for (const s of o.strobes || []) { if (j >= 256) break; Q.identity(); P.set(s.x, ground(s.x, s.y) + s.h, s.y); S.setScalar(s.r || 0.7); this.strobe.setMatrixAt(j++, M4.compose(P, Q, S)); }
    this.strobe.count = j; if (j) this.strobe.instanceMatrix.needsUpdate = true;
    let w = 0;
    for (const s of o.blasts || []) {
      if (w >= 95) break; const p = s.p, g0 = 1 - (1 - Math.min(1, p * 2.4)) ** 2, R = s.r * (0.4 + 0.7 * g0), fade = p < 0.4 ? 1 : Math.max(0, (1 - p) / 0.6);
      const gy = ground(s.x, s.y) + R * 0.5 + s.r * 0.9 * p;
      // the fire: a wide dull ball, and a small white-hot heart that goes out first
      Q.identity(); P.set(s.x, gy, s.y); S.set(R, R * (1 + 0.35 * p), R); this.blast.setMatrixAt(w, M4.compose(P, Q, S));
      COL.setRGB(0.75 * fade, (0.36 - 0.22 * p) * fade, 0.05 * fade); if (s.col) COL.lerp(TMP.set(s.col).multiplyScalar(0.6 * fade), 0.5); this.blast.setColorAt(w++, COL);
      const hf = Math.max(0, 1 - p * 2.2); if (hf > 0 && w < 96) { S.setScalar(R * (0.35 + 0.3 * hf)); P.y = gy - R * 0.1; this.blast.setMatrixAt(w, M4.compose(P, Q, S)); COL.setRGB(hf, 0.9 * hf, 0.6 * hf); this.blast.setColorAt(w++, COL); }
    }
    this.blast.count = w; if (w) { this.blast.instanceMatrix.needsUpdate = true; if (this.blast.instanceColor) this.blast.instanceColor.needsUpdate = true; }
    // bolts: [{ x, y, x2, y2 (tail to head, on the map), w (metres), col, up, up2 }]   orbs: [{ x, y, up, r, col }]   domes: [{ x, y, r, k (0 to 1, how bright) }]
    let bn = 0;
    for (const s of o.bolts || []) {
      if (bn >= 600) break; this.a.set(s.x, ground(s.x, s.y) + (s.up ?? 3.6), s.y); this.b.set(s.x2, ground(s.x2, s.y2) + (s.up2 ?? s.up ?? 3.6), s.y2);     // (figures are drawn large to be seen from the air: their guns are about this high)
      this.dir.subVectors(this.b, this.a); const len = this.dir.length(); if (len < 0.05) continue; Q.setFromUnitVectors(this.z, this.dir.normalize());
      P.addVectors(this.a, this.b).multiplyScalar(0.5); S.set(s.w, s.w, len); this.bolt.setMatrixAt(bn, M4.compose(P, Q, S)); COL.set(s.col || '#ffe9b0'); this.bolt.setColorAt(bn++, COL);
    }
    this.bolt.count = bn; if (bn) { this.bolt.instanceMatrix.needsUpdate = true; if (this.bolt.instanceColor) this.bolt.instanceColor.needsUpdate = true; }
    let on = 0;
    for (const s of o.orbs || []) { if (on >= 160) break; Q.identity(); P.set(s.x, ground(s.x, s.y) + (s.up ?? 3.6), s.y); S.setScalar(s.r); this.orb.setMatrixAt(on, M4.compose(P, Q, S)); COL.set(s.col || '#ffffff'); this.orb.setColorAt(on++, COL); }
    this.orb.count = on; if (on) { this.orb.instanceMatrix.needsUpdate = true; if (this.orb.instanceColor) this.orb.instanceColor.needsUpdate = true; }
    let dn = 0;
    for (const s of o.domes || []) { if (dn >= 48) break; Q.identity(); P.set(s.x, ground(s.x, s.y) - 0.5, s.y); S.setScalar(s.r); this.dome.setMatrixAt(dn, M4.compose(P, Q, S)); COL.setRGB(0.3 * s.k, 0.42 * s.k, 0.55 * s.k); this.dome.setColorAt(dn++, COL); }
    this.dome.count = dn; if (dn) { this.dome.instanceMatrix.needsUpdate = true; if (this.dome.instanceColor) this.dome.instanceColor.needsUpdate = true; }
    // puffs: [{ x, y, r, up, p (0 new to 1 gone), col }]; o.eye: the camera's turn, so each puff faces it
    const sn = [0, 0, 0, 0]; let st = 0;
    if (o.eye) for (const s of o.puffs || []) {
      const bi = Math.min(3, Math.floor(s.p * 4)), im = this.smoke[bi]; if (sn[bi] >= 90) continue;
      P.set(s.x, ground(s.x, s.y) + (s.up || 0) + s.r * 0.45, s.y); S.set(s.r, s.r * 0.85, s.r); im.setMatrixAt(sn[bi], M4.compose(P, o.eye, S)); COL.set(s.col || '#4a4e4a'); im.setColorAt(sn[bi]++, COL); st++;
    }
    for (let i = 0; i < 4; i++) { const im = this.smoke[i]; im.count = sn[i]; if (sn[i]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } }
    this.n = { drops: n, shells: k, strobes: j, blasts: w, bolts: bn, orbs: on, domes: dn, puffs: st };
  }
}
