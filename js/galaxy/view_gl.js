// THE GALAXY IN 3D: the map as a tilted disc of worlds seen from above and behind your lines, in the manner of the old
// conquest maps. This draws the things that have depth: the stars, the galaxy's glow, the worlds as lit spheres, the
// lanes, the fronts and the fleets as small ships. The flat canvas over it (view_map.js) draws what is read: rings,
// names, numbers. Both use the one camera here, so they always agree. If WebGL is not there, the map stays flat.
import * as THREE from '../vendor/three.js';
import { C } from './config.js';

export const W = 100;                         // the map's unit disc, in world units
const EL = 48 * Math.PI / 180, FOV = 38;      // how far above the disc the camera sits, and its lens
const RAD = { capital: 2.6, home: 2.2, sys: 1.15 };
const MAXSHIPS = 2400;
const rnd = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// The galaxy's own light: a soft core and two loose arms, painted once.
function glowTexture() {
  const n = 512, cv = document.createElement('canvas'); cv.width = cv.height = n; const c = cv.getContext('2d'), R = rnd(7);
  const g = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, 'rgba(190,225,230,0.55)'); g.addColorStop(0.12, 'rgba(110,170,190,0.26)'); g.addColorStop(0.5, 'rgba(50,90,120,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, n, n);
  c.globalCompositeOperation = 'lighter';
  for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 900; i++) {
    const t = R(), a = arm * 2.094 + t * 4.2 + (R() - 0.5) * 0.5, r = (0.05 + t * 0.44) * n + (R() - 0.5) * 26, s = 2 + R() * 9;
    const x = n / 2 + Math.cos(a) * r, y = n / 2 + Math.sin(a) * r, q = c.createRadialGradient(x, y, 0, x, y, s);
    q.addColorStop(0, `rgba(${120 + R() * 60 | 0},${170 + R() * 50 | 0},${200 + R() * 40 | 0},${0.05 + R() * 0.07})`); q.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = q; c.fillRect(x - s, y - s, s * 2, s * 2);
  }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function dotTexture() {
  const n = 64, cv = document.createElement('canvas'); cv.width = cv.height = n; const c = cv.getContext('2d'), g = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, n, n);
  return new THREE.CanvasTexture(cv);
}
// One ship: a flat wedge with a raised spine, nose along +x. Every side's ships are this hull in its own colour until
// the shared models arrive.
function shipGeometry() {
  const v = [1.5, 0, 0, -0.9, 0, 0.75, -0.9, 0, -0.75, -0.6, 0.42, 0, -1.1, 0.1, 0];
  const f = [0, 3, 1, 0, 2, 3, 1, 3, 4, 3, 2, 4, 0, 1, 2, 1, 4, 2];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(f); const n = g.toNonIndexed(); n.computeVertexNormals(); return n;
}

export class Galaxy3D {
  constructor(over) {
    this.cv = document.createElement('canvas'); this.cv.id = 'map3d'; this.cv.style.cssText = 'position:absolute;left:0;top:0;display:block;pointer-events:none';
    over.parentElement.insertBefore(this.cv, over);
    this.r = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, alpha: false, powerPreference: 'low-power' });
    this.r.setClearColor(0x05070a, 1);
    this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(FOV, 1, 1, 4000);
    this.tx = 0; this.tz = 0; this.az = -Math.PI / 2; this.zoom = 1; this.d0 = 300; this.w = this.h = 1;
    this.v = new THREE.Vector3(); this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.col = new THREE.Color();
    const S = this.scene, R = rnd(11);
    S.add(new THREE.HemisphereLight(0xbfd8e6, 0x101418, 0.9));
    const sun = new THREE.DirectionalLight(0xfff2dc, 2.1); sun.position.set(-0.5, 0.9, 0.35); S.add(sun);
    // the far stars
    { const n = 1800, pos = new Float32Array(n * 3), cl = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = R() * 6.283, y = (R() - 0.35) * 1.6, r = 1500 + R() * 900, k = Math.sqrt(Math.max(0.05, 1 - Math.min(1, y * y))); pos.set([Math.cos(a) * r * k, y * r * 0.6 - 500, Math.sin(a) * r * k], i * 3); const b = 0.45 + R() * 0.55, w = R(); cl.set([b * (0.8 + 0.2 * w), b * 0.9, b * (1 - 0.2 * w)], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
      S.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, map: dotTexture(), transparent: true, depthWrite: false }))); }
    // the galaxy's glow under the board
    { const m = new THREE.Mesh(new THREE.PlaneGeometry(W * 3.1, W * 3.1), new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
      m.rotation.x = -Math.PI / 2; m.position.y = -3; S.add(m); this.glow = m; }
    // the rings the systems sit on
    for (const r of C.map.radius) { const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * 6.283; pts.push(new THREE.Vector3(Math.cos(a) * r * W, -0.4, Math.sin(a) * r * W)); }
      S.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x7fe9e0, transparent: true, opacity: 0.08 }))); }
    // the three fronts: a wedge each, lit when it is the one in play
    this.fronts = C.fronts.map((fr) => {
      const a0 = (fr.deg - 60) * Math.PI / 180, sh = new THREE.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, W * 0.99, a0, a0 + 2.094, false); sh.lineTo(0, 0);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 40), new THREE.MeshBasicMaterial({ color: C.color[fr.f], transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = Math.PI / 2; m.position.y = -1.2; S.add(m);
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(Math.cos(a0) * W, -0.5, Math.sin(a0) * W)]), new THREE.LineDashedMaterial({ color: 0xe6eadc, transparent: true, opacity: 0.22, dashSize: 1.2, gapSize: 2.4 }));
      ln.computeLineDistances(); S.add(ln); return m;
    });
    this.ok = true;
  }
  // The worlds and lanes of this war's map (built once for a map, coloured every frame).
  setMap(g) {
    if (this.mapOf === g.map) return; this.mapOf = g.map; const S = this.scene;
    for (const o of [this.worlds, this.lanes, this.halo, this.ships]) if (o) { S.remove(o); o.geometry.dispose(); }
    const n = g.P.length, geo = new THREE.SphereGeometry(1, 20, 14);
    this.worlds = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 }), n);
    for (const p of g.P) { const r = RAD[p.kind]; this.m.compose(this.v.set(p.x * W, 0, p.y * W), this.q.identity(), new THREE.Vector3(r, r, r)); this.worlds.setMatrixAt(p.id, this.m); }
    S.add(this.worlds);
    // a soft halo in the holder's colour under every world
    { const pos = new Float32Array(n * 3); for (const p of g.P) pos.set([p.x * W, -0.2, p.y * W], p.id * 3);
      const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); hg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      this.halo = new THREE.Points(hg, new THREE.PointsMaterial({ size: 9, sizeAttenuation: true, vertexColors: true, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); S.add(this.halo); }
    this.pairs = []; for (const p of g.P) for (const q of p.adj) if (q > p.id) this.pairs.push([p.id, q]);
    { const pos = new Float32Array(this.pairs.length * 6); this.pairs.forEach(([a, b], i) => { const p = g.P[a], q = g.P[b]; pos.set([p.x * W, -0.1, p.y * W, q.x * W, -0.1, q.y * W], i * 6); });
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); lg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.pairs.length * 6), 3));
      this.lanes = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })); S.add(this.lanes); }
    this.ships = new THREE.InstancedMesh(shipGeometry(), new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.35, flatShading: true, side: THREE.DoubleSide }), MAXSHIPS);
    this.ships.count = 0; this.ships.frustumCulled = false; S.add(this.ships);
    this.sig = '';
  }
  resize(w, h, d) {
    this.w = w; this.h = h; this.r.setPixelRatio(d); this.r.setSize(w, h, false); this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    // far enough that the whole disc is on screen at zoom 1, across and from front to back
    const tv = Math.tan(FOV * Math.PI / 360), th = tv * this.cam.aspect;
    this.d0 = Math.max(W * 1.06 / th, W * 1.25 * Math.sin(EL) / tv);
    this.place();
  }
  get dist() { return this.d0 / this.zoom; }
  // pixels to one world unit, at the point the camera is looking at
  get ppu() { return this.h / 2 / Math.tan(FOV * Math.PI / 360) / this.dist; }
  place() {
    const lim = W * 0.8, l = Math.hypot(this.tx, this.tz); if (l > lim) { this.tx *= lim / l; this.tz *= lim / l; }
    const fx = Math.cos(this.az), fz = Math.sin(this.az), d = this.dist, c = this.cam;
    c.position.set(this.tx - fx * d * Math.cos(EL), d * Math.sin(EL), this.tz - fz * d * Math.cos(EL)); c.lookAt(this.tx, 0, this.tz); c.updateMatrixWorld(); c.matrixWorldInverse.copy(c.matrixWorld).invert();
    this.pv = (this.pv || new THREE.Matrix4()).multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
  }
  // Screen x, y of a world point, and how many pixels a world unit is there.
  proj(x, y, z) {
    const v = this.v.set(x, y, z), e = this.pv.elements, w = e[3] * v.x + e[7] * v.y + e[11] * v.z + e[15];
    v.applyMatrix4(this.pv);
    return [(v.x + 1) / 2 * this.w, (1 - v.y) / 2 * this.h, this.h / 2 / Math.tan(FOV * Math.PI / 360) / Math.max(1, w)];
  }
  // The point of the board under a screen point, or null if the ray misses it.
  ground(x, y) {
    const v = this.v.set(x / this.w * 2 - 1, 1 - y / this.h * 2, 0.5).unproject(this.cam), c = this.cam.position, dy = v.y - c.y;
    if (Math.abs(dy) < 1e-6) return null; const t = -c.y / dy; if (t <= 0) return null;
    return [c.x + (v.x - c.x) * t, c.z + (v.z - c.z) * t];
  }
  // Slide the map under the finger.
  pan(dx, dy) { const fx = Math.cos(this.az), fz = Math.sin(this.az), k = 1 / this.ppu; this.tx += (fz * dx + fx * dy / Math.sin(EL)) * k; this.tz += (-fx * dx + fz * dy / Math.sin(EL)) * k; this.place(); }
  // Colours follow the war: who holds what, which front is in play.
  paint(g, fl) {
    const sig = g.round + ':' + g.fi + ':' + g.P.reduce((a, p) => (a * 31 + p.owner.length * 7 + p.owner.charCodeAt(0) + (fl.has(p.id) ? 1 : 0)) | 0, 7);
    if (sig === this.sig) return; this.sig = sig;
    const hc = this.halo.geometry.attributes.color, lc = this.lanes.geometry.attributes.color, c = this.col;
    for (const p of g.P) {
      c.set(C.worlds[g.keyWorld(p).type].col); if (p.owner !== 'fed') c.lerp(new THREE.Color(C.color[p.owner]), 0.45); this.worlds.setColorAt(p.id, c);
      c.set(C.color[p.owner] || C.color.fed); const k = p.owner === 'fed' ? (fl.has(p.id) ? 0.55 : 0.2) : 1; hc.setXYZ(p.id, c.r * k, c.g * k, c.b * k);
    }
    this.pairs.forEach(([a, b], i) => { const p = g.P[a], q = g.P[b], same = p.owner === q.owner; c.set(same ? (C.color[p.owner] || C.color.fed) : '#e6eadc'); const k = same ? 0.6 : 0.3; lc.setXYZ(i * 2, c.r * k, c.g * k, c.b * k); lc.setXYZ(i * 2 + 1, c.r * k, c.g * k, c.b * k); });
    this.worlds.instanceColor.needsUpdate = true; hc.needsUpdate = true; lc.needsUpdate = true;
    this.fronts.forEach((m, fi) => { m.material.opacity = g.fi === fi ? 0.13 : g.atWar(fi) ? 0.04 : 0; });
  }
  // The ships on the board this frame: [{ x, z, ang, color, dim }].
  setShips(list) {
    const n = Math.min(MAXSHIPS, list.length), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(1.7, 1.7, 1.7);
    for (let i = 0; i < n; i++) { const o = list[i]; this.q.setFromAxisAngle(up, -o.ang); this.m.compose(this.v.set(o.x, 1.6, o.z), this.q, s); this.ships.setMatrixAt(i, this.m); this.col.set(o.color); if (o.dim) this.col.multiplyScalar(0.5); this.ships.setColorAt(i, this.col); }
    this.ships.count = n; this.ships.instanceMatrix.needsUpdate = true; if (this.ships.instanceColor) this.ships.instanceColor.needsUpdate = true;
  }
  render(t) { if (this.glow) this.glow.rotation.z = t * 0.004; this.r.render(this.scene, this.cam); }
}
export const worldRadius = (p) => RAD[p.kind];
