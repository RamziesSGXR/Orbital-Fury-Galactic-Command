// THE UNITS IN 3D (GC 0.20, stage three of the move to 3D). Everyone on the field stands up on the land as a small model:
// your squad and your infantry are the base game's own soldier (so they wear your colours), your vehicles its vehicles,
// and each enemy a simple figure of its own kind until the real models are made: the Molt low and many-legged, the
// Foundry upright and boxy, the Talon tailed, their riders on a mount, their heavies as beasts and machines.
//
// One instanced mesh for each kind: any number of them is one draw. A model is baked to a single shape with its colours
// in its corners, standing on the ground at the origin, facing +z, sized so its widest or tallest measure is two units.
import * as THREE from '../../vendor/three.js';
import { makeMats, makePerson, makeLRV, makeTank } from '../../base/models.js';

const CAP = 700;     // of one kind on screen at once
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), S = new THREE.Vector3(), COL = new THREE.Color();

// one shape, coloured at its corners, from a group of plain meshes; `tint` overrides every colour (a faction's own)
function bake(group, tint = null) {
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

export class Units3D {
  constructor(scene, livery) {
    this.scene = scene; this.kinds = new Map(); this.used = new Map();
    let mats = null; try { mats = makeMats(livery || { primary: '#e0b21c', secondary: '#17181a', logo: { shape: 'shield', bg: '#e0b21c', sym: 'star', fg: '#17181a' } }); } catch (err) { console.warn('livery for the 3D troops unavailable', err); }
    this.mats = mats || {};
    const person = (k) => (mats ? makePerson(mats, k) : (() => { const g = new THREE.Group(); part(g, BOX, mat('#8fb0cc'), 0, 0.9, 0, 0.5, 1.2, 0.3); part(g, BALL, mat('#2c5a94'), 0, 1.7, 0, 0.4, 0.4, 0.4); return g; })());
    // how tall each stands for a footprint radius of one is whatever its model is; `k` scales the footprint asked for
    this.def = {
      van: () => bake(person('troop')), inf: () => bake(person('troop')), lrv: () => bake(mats ? makeLRV(mats) : mech({})), mech: () => bake(mech(this.mats)),
      'bugs:L': () => bake(molt(1)), 'bugs:M': () => bake(molt(2)), 'bugs:H': () => bake(molt(3)),
      'bots:L': () => bake(foundry(1, mats)), 'bots:M': () => bake(foundry(2, mats)), 'bots:H': () => (mats ? bake(foundry(3, mats), '#7a3028') : bake(foundry(2, mats))),
      'lizards:L': () => bake(talon(1)), 'lizards:M': () => bake(talon(2)), 'lizards:H': () => bake(talon(3)),
    };
    this.mat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
    this.hot = new THREE.Color(0, 0, 0);
  }
  _kind(k) {
    let m = this.kinds.get(k); if (m !== undefined) return m;
    const make = this.def[k]; if (!make) { this.kinds.set(k, null); return null; }
    m = new THREE.InstancedMesh(make(), this.mat, CAP); m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(m); this.kinds.set(k, m); return m;
  }
  // list: [{ k (kind), x, y (the map's), r (footprint, metres), face (radians on the map), tint (a colour or null), dim (0 to 1) }]; ground(x, y): metres up
  // hot: through an infrared sight a body is warm and shows bright whatever it wears
  frame(list, ground, hot = false) {
    this.mat.emissive.setScalar(hot ? 0.62 : 0);
    this.used.clear();
    for (const u of list) {
      const m = this._kind(u.k); if (!m) continue; const n = this.used.get(m) || 0; if (n >= CAP) continue;
      Q.setFromAxisAngle(UP, Math.PI / 2 - (u.face || 0)); P.set(u.x, ground(u.x, u.y) + (u.up || 0), u.y); S.setScalar(u.r);
      m.setMatrixAt(n, M4.compose(P, Q, S)); COL.set(u.tint || '#ffffff'); if (u.dim != null && u.dim < 1) COL.multiplyScalar(u.dim); m.setColorAt(n, COL);
      this.used.set(m, n + 1);
    }
    let total = 0;
    for (const m of this.kinds.values()) { if (!m) continue; m.count = this.used.get(m) || 0; total += m.count; if (m.count) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }
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
    this.n = { drops: n, shells: k, strobes: j };
  }
}
