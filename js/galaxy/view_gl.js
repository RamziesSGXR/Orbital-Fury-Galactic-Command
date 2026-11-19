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
// (0.36) THE LAYERS' OWN COLOURS. A sector is shaded in its holder's colour; the lanes and the names are never a side's
// colour, so the three can be told apart at a glance (and each can be switched off).
export const LAYER = { supply: '#ffdf9e', lane: '#8b95a3', name: '#ffffff' };

// ---- the fleets' ships (0.36). Each side flies its own hull, built here from a few plain solids with the colours baked
// in: yours a long grey wedge with a bridge and liveried wings, the Molt a living thing with sacs on its back, the
// Foundry a block of iron with a spinal gun, the Talon a pale blade between two horns. Nose along +x, about 3 long.
const M4 = (x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
function part(geo, m, colour) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m);
  const n = g.attributes.position.count, c = new Float32Array(n * 3), k = new THREE.Color(colour); for (let i = 0; i < n; i++) c.set([k.r, k.g, k.b], i * 3);
  return { pos: g.attributes.position.array, col: c };
}
function join(parts) {
  let n = 0; for (const q of parts) n += q.pos.length; const pos = new Float32Array(n), col = new Float32Array(n); let o = 0;
  for (const q of parts) { pos.set(q.pos, o); col.set(q.col, o); o += q.pos.length; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
const box = () => new THREE.BoxGeometry(1, 1, 1), ball = (a = 10, b = 7) => new THREE.SphereGeometry(0.5, a, b);
const rod = (n = 8) => new THREE.CylinderGeometry(0.5, 0.5, 1, n).rotateZ(-Math.PI / 2);                 // along x
const spike = (n = 6) => new THREE.ConeGeometry(0.5, 1, n).rotateZ(-Math.PI / 2);                        // point to +x
const taper = (front, back, n = 4) => new THREE.CylinderGeometry(front, back, 1, n).rotateY(Math.PI / n).rotateZ(-Math.PI / 2);
function shipOf(side) {
  const P = [], add = (g, m, c) => P.push(part(g, m, c)), tint = C.color[side] || C.color.fed;
  if (side === 'molt') {
    const hide = '#a8713f', dark = '#6e4526', bone = '#f0e4c0';
    add(ball(12, 8), M4(-0.15, 0, 0, 2.5, 0.85, 1.15), hide); add(ball(10, 7), M4(1.0, 0.03, 0, 1.0, 0.6, 0.85), dark);
    for (const z of [-1, 1]) { add(spike(5), M4(1.72, -0.06, z * 0.3, 0.9, 0.16, 0.16, 0, -z * 0.22, 0), bone);
      add(spike(4), M4(-0.35, -0.05, z * 0.72, 1.3, 0.1, 0.34, 0, Math.PI + z * 0.5, 0), dark); add(spike(4), M4(-1.0, -0.05, z * 0.55, 1.1, 0.1, 0.3, 0, Math.PI + z * 0.35, 0), dark); }
    for (const [x, r] of [[0.25, 0.34], [-0.3, 0.42], [-0.9, 0.36]]) add(ball(8, 6), M4(x, 0.36, 0, r * 2, r * 1.5, r * 2), tint);
    add(spike(5), M4(-1.75, 0.05, 0, 0.9, 0.3, 0.5, 0, Math.PI, 0), hide);
  } else if (side === 'foundry') {
    const iron = '#8d9298', dark = '#55595e', soot = '#33363a';
    add(box(), M4(-0.1, 0, 0, 2.2, 0.6, 0.9), iron); add(box(), M4(1.15, 0, 0, 0.62, 0.82, 1.12), dark); add(box(), M4(-0.45, 0.44, 0, 0.9, 0.34, 0.5), dark);
    add(rod(8), M4(0.85, 0.5, 0, 1.7, 0.17, 0.17), soot); add(box(), M4(1.72, 0.5, 0, 0.16, 0.26, 0.26), soot);
    for (const z of [-1, 1]) { add(new THREE.CylinderGeometry(0.5, 0.5, 1, 7), M4(-1.0, 0.68, z * 0.2, 0.2, 0.5, 0.2), soot); add(box(), M4(-0.1, 0.02, z * 0.46, 1.5, 0.2, 0.04), tint); add(box(), M4(-0.2, -0.2, z * 0.6, 1.2, 0.2, 0.3), dark); }
    add(box(), M4(-0.1, 0.31, 0, 1.2, 0.03, 0.2), tint); add(box(), M4(-1.38, 0, 0, 0.36, 0.52, 0.82), dark); add(box(), M4(-1.57, 0, 0, 0.03, 0.3, 0.6), tint);
  } else if (side === 'talon') {
    const ivory = '#e6dcc4', hide = '#6a5a7a';
    add(spike(6), M4(0, 0, 0, 3.0, 0.3, 0.86), ivory); add(spike(6), M4(-0.2, 0.12, 0, 2.0, 0.22, 0.4), hide);
    for (const z of [-1, 1]) { add(spike(5), M4(0.35, 0, z * 0.78, 2.0, 0.2, 0.26, 0, z * 0.2, 0), hide); add(box(), M4(-0.55, 0, z * 0.48, 0.5, 0.07, 0.6), hide);
      add(spike(4), M4(-1.45, 0.14, z * 0.26, 0.8, 0.34, 0.12, 0, Math.PI, z * -0.0), ivory); }
    add(new THREE.OctahedronGeometry(0.5), M4(-0.45, 0.3, 0, 0.75, 0.5, 0.5), tint); add(new THREE.OctahedronGeometry(0.5), M4(-1.4, 0, 0, 0.5, 0.36, 0.5), tint);
  } else {
    const hull = '#b9c2c8', deck = '#7f8a91', dark = '#3a4146';
    add(taper(0.1, 0.52, 4), M4(0, 0, 0, 3.0, 0.5, 0.8), hull); add(box(), M4(-0.35, 0.2, 0, 1.6, 0.12, 0.3), deck);
    add(box(), M4(-0.8, 0.38, 0, 0.42, 0.28, 0.3), hull); add(box(), M4(-0.58, 0.42, 0, 0.03, 0.1, 0.24), tint); add(box(), M4(-0.86, 0.6, 0, 0.1, 0.18, 0.06), deck);
    for (const z of [-1, 1]) { add(box(), M4(-0.85, -0.02, z * 0.56, 0.95, 0.06, 0.62, 0, z * 0.32, 0), tint); add(rod(8), M4(-1.42, 0, z * 0.26, 0.5, 0.3, 0.3), dark); add(rod(8), M4(-1.69, 0, z * 0.26, 0.04, 0.22, 0.22), tint);
      add(box(), M4(0.35, 0.13, z * 0.2, 0.9, 0.04, 0.05), tint); }
  }
  return join(P);
}
const SIDES = ['fed', 'molt', 'foundry', 'talon'];
// (0.40) A ship made in Blender (tools/blender/world.py), read from its file: flat-lit triangles in their own colours, the parts
// named accent in the side's colour, laid nose to +x and made 3.3 long whatever it was drawn at.
function shipFile(d, side) {
  const b64 = (t) => { const b = atob(t), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const tris = new Uint16Array(b64(d.tris).buffer.slice(0)), cols = b64(d.cols), mi = d.mi ? b64(d.mi) : null, q = new Uint16Array(b64(d.frames.stand).buffer.slice(0)), nt = d.nt;
  const pos = new Float32Array(nt * 9), col = new Float32Array(nt * 9), c = new THREE.Color(), k = 3.3 / d.size[0], cx = d.min[0] + d.size[0] / 2, cy = d.min[1] + d.size[1] / 2, cz = d.min[2] + d.size[2] / 2;
  for (let t = 0; t < nt; t++) {
    const nm = mi && d.pal ? d.pal[mi[t]] : '';
    if (nm === 'accent' || nm === 'accent_lit') { c.set(C.color[side] || C.color.fed); if (nm === 'accent_lit') c.lerp(new THREE.Color('#ffffff'), 0.35); } else c.setRGB(cols[t * 3] / 255, cols[t * 3 + 1] / 255, cols[t * 3 + 2] / 255, THREE.SRGBColorSpace);
    for (let j = 0; j < 3; j++) { const v = tris[t * 3 + j] * 3, o = t * 9 + j * 3; pos[o] = (d.min[0] + q[v] / 65535 * d.size[0] - cx) * k; pos[o + 1] = (d.min[1] + q[v + 1] / 65535 * d.size[1] - cy) * k; pos[o + 2] = (d.min[2] + q[v + 2] / 65535 * d.size[2] - cz) * k; col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b; }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}

// ---- the sectors as territory (0.36). A sector is a band of rings cut into slices round its front, so on the board it
// is a piece of a ring: an arc on the inside, an arc on the outside and a straight edge either end. The pieces fit edge to
// edge: where one sector ends the next begins. Each is shaded in the colour of whoever holds its systems, has a thin line
// just inside its own edge, and where it meets another side's sector (the front line) the line is bright and glows inward.
function wedges(g) {
  const M = C.map, rad = M.radius, nR = rad.length, P = g.P, out = [], at = new Map();
  const bandOf = ring => Math.max(0, M.band.findIndex(r1 => ring <= r1));
  const span = bi => [bi === 0 ? rad[0] / 2 : (rad[M.band[bi - 1] - 1] + rad[M.band[bi - 1]]) / 2, M.band[bi] >= nR ? rad[nR - 1] + 0.07 : (rad[M.band[bi] - 1] + rad[M.band[bi]]) / 2];
  const turn = (deg, fi) => (((deg - (C.fronts[fi].deg - 60)) % 360) + 360) % 360;
  for (const sc of g.map.sectors) {
    if (!sc.sys.length) continue;
    if (sc.front < 0) { out.push({ id: sc.id, ra: 0, rb: rad[0] / 2, a0: 0, a1: Math.PI * 2, full: true, sys: sc.sys }); continue; }
    const p = P[sc.sys[0]], bi = bandOf(p.ring), n = M.slice[bi]; let d = turn(p.deg, sc.front); if (d > 240) d = 0;
    const j = Math.max(0, Math.min(n - 1, Math.floor(d / 120 * n))), a = (C.fronts[sc.front].deg - 60 + j * 120 / n) * Math.PI / 180, [ra, rb] = span(bi);
    out.push({ id: sc.id, ra, rb, a0: a, a1: a + 120 / n * Math.PI / 180, sys: sc.sys }); at.set(sc.front + ':' + bi + ':' + j, sc.id);
  }
  // which sector lies at a point of the board (radius in map units, angle in radians), or -1 past the rim
  const find = (r, th) => {
    if (r < rad[0] / 2) return 0; if (r > rad[nR - 1] + 0.07) return -1;
    const deg = th * 180 / Math.PI; let fi = 0; for (let k = 0; k < C.fronts.length; k++) if (turn(deg, k) < 120) fi = k;
    let bi = 0; while (bi < M.band.length - 1 && r > span(bi)[1]) bi++;
    const n = M.slice[bi], id = at.get(fi + ':' + bi + ':' + Math.max(0, Math.min(n - 1, Math.floor(turn(deg, fi) / 120 * n)))); return id == null ? -1 : id;
  };
  return { list: out, find };
}
// The mesh of it. A vertex remembers its sector, what it is (0 shading, 1 line, 2 the glow's bright edge, 3 its faded edge)
// and, for an edge, the sector across it; paint() colours it from who holds what.
function territory(g) {
  const { list, find } = wedges(g), P = g.P, pos = [], sec = [], kind = [], nb = [], idx = [], wOff = [], wId = [], wVal = [], Y = -0.35;
  const put = (x, z, s, k, n = -2) => { pos.push(x, Y, z); sec.push(s); kind.push(k); nb.push(n); wOff.push(-1); return sec.length - 1; };
  const O0 = 0.14, O1 = 0.42, O2 = 2.7;
  for (const w of list) {
    const Ra = w.ra * W, Rb = w.rb * W, nr = Math.max(1, Math.round((Rb - Ra) / 3.5)), na = Math.max(3, Math.round((w.a1 - w.a0) * Rb / 2.2));
    // the shading: a grid over the piece. Each point takes its colour from the systems near it, so a sector that is being
    // fought over shows who holds which part of it
    const base = sec.length;
    for (let ir = 0; ir <= nr; ir++) for (let ia = 0; ia <= na; ia++) {
      const r = Ra + (Rb - Ra) * ir / nr, th = w.a0 + (w.a1 - w.a0) * ia / na, x = Math.cos(th) * r, z = Math.sin(th) * r, i = put(x, z, w.id, 0);
      wOff[i] = wId.length; for (const id of w.sys) { const d2 = (P[id].x * W - x) ** 2 + (P[id].y * W - z) ** 2; wId.push(id); wVal.push(1 / (d2 + 6) ** 2); }
    }
    for (let ir = 0; ir < nr; ir++) for (let ia = 0; ia < na; ia++) { const a = base + ir * (na + 1) + ia, b = a + 1, c = a + na + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    // the edge: three loops just inside the piece's own outline, joined into the line and the glow
    const loop = (o) => { const L = [], ro = Rb - o, ri = Ra + o;
      for (let k = 0; k <= na; k++) { const th = w.full ? w.a0 + (w.a1 - w.a0) * k / na : w.a0 + o / ro + (w.a1 - w.a0 - 2 * o / ro) * k / na; L.push([Math.cos(th) * ro, Math.sin(th) * ro]); }
      if (!w.full) for (let k = na; k >= 0; k--) { const th = w.a0 + o / ri + (w.a1 - w.a0 - 2 * o / ri) * k / na; L.push([Math.cos(th) * ri, Math.sin(th) * ri]); }
      return L; };
    const L0 = loop(O0), L1 = loop(O1), L2 = loop(Math.min(O2, (Rb - Ra) * 0.45)), n = L0.length, mid = (w.ra + w.rb) / 2, da = (w.a1 - w.a0) / na;
    for (let k = 0; k < (w.full ? n - 1 : n); k++) {
      const k1 = (k + 1) % n;
      const over = w.full ? find(w.rb + 0.01, w.a0 + (k + 0.5) * da) : k < na ? find(w.rb + 0.01, w.a0 + (k + 0.5) * da) : k === na ? find(mid, w.a1 + 0.01) : k < n - 1 ? find(w.ra - 0.01, w.a1 - (k - na - 0.5) * da) : find(mid, w.a0 - 0.01);
      const quad = (A, B, ka, kb) => { const a = put(A[k][0], A[k][1], w.id, ka, over), b = put(A[k1][0], A[k1][1], w.id, ka, over), c = put(B[k1][0], B[k1][1], w.id, kb, over), d = put(B[k][0], B[k][1], w.id, kb, over); idx.push(a, b, c, a, c, d); };
      quad(L0, L1, 1, 1); quad(L1, L2, 2, 3);
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sec.length * 4), 4)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 1; m.frustumCulled = false;
  m.userData = { sec: Int16Array.from(sec), kind: Uint8Array.from(kind), nb: Int16Array.from(nb), wOff: Int32Array.from(wOff), wId: Uint16Array.from(wId), wVal: Float32Array.from(wVal), sys: new Map(list.map(w => [w.id, w.sys])) }; return m;
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
    // (0.40) the fleets' own hulls, made in Blender: fetched once, and put on the fleets as they come
    this.hulls = {};
    if (typeof fetch === 'function') fetch('assets/models/index.json').then((r) => (r.ok ? r.json() : null)).then((ix) => {
      for (const f of SIDES) if (ix && (ix.ships || []).includes('ship_' + f)) fetch(`assets/models/ship_${f}.json`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (!d || !d.frames || !d.frames.stand) return; this.hulls[f] = shipFile(d, f); if (this.fleet && this.fleet[f]) this.fleet[f].geometry = this.hulls[f]; }).catch(() => {});
    }).catch(() => {});
    this.ok = true;
  }
  // The worlds and lanes of this war's map (built once for a map, coloured every frame).
  setMap(g) {
    if (this.mapOf === g.map) return; this.mapOf = g.map; const S = this.scene;
    for (const o of [this.worlds, this.lanes, this.halo, this.terr, this.glows, ...(this.fleet ? Object.values(this.fleet) : [])]) if (o) { S.remove(o); o.geometry.dispose(); }
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
    // (0.36) THE SECTORS: territory, edge to edge, shaded in its holder's colour (it was a loop round each sector's systems)
    this.terr = territory(g); S.add(this.terr);
    // the fleets: one hull a side, and a light at each ship's engines
    this.fleet = {}; for (const f of SIDES) { const m = new THREE.InstancedMesh(this.hulls[f] || shipOf(f), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.25, flatShading: true, vertexColors: true }), MAXSHIPS / 4); m.count = 0; m.frustumCulled = false; S.add(m); this.fleet[f] = m; }
    { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXSHIPS * 3), 3)); gg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAXSHIPS * 3), 3)); gg.setDrawRange(0, 0);
      this.glows = new THREE.Points(gg, new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: true, vertexColors: true, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); this.glows.frustumCulled = false; this.glows.renderOrder = 4; S.add(this.glows); }
    this.lanes.renderOrder = 2; this.halo.renderOrder = 3;
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
  paint(g, fl, selSec = -1, show = {}) {
    const sig = g.round + ':' + g.fi + ':' + selSec + ':' + (show.sec === false ? 0 : 1) + (show.lane === false ? 0 : 1) + ':' + g.P.reduce((a, p) => (a * 31 + p.owner.length * 7 + p.owner.charCodeAt(0) + (fl.has(p.id) ? 1 : 0)) | 0, 7);
    if (sig === this.sig) return; this.sig = sig;
    const hc = this.halo.geometry.attributes.color, lc = this.lanes.geometry.attributes.color, c = this.col;
    for (const p of g.P) {
      c.set(C.worlds[g.keyWorld(p).type].col); if (p.owner !== 'fed') c.lerp(new THREE.Color(C.color[p.owner]), 0.45); this.worlds.setColorAt(p.id, c);
      c.set(C.color[p.owner] || C.color.fed); const k = p.owner === 'fed' ? (fl.has(p.id) ? 0.55 : 0.2) : 1; hc.setXYZ(p.id, c.r * k, c.g * k, c.b * k);
    }
    // the lanes are never a side's colour: your supply lines (lanes between systems joined to the capital) in one, the rest in another
    this.pairs.forEach(([a, b], i) => { const sup = fl.has(a) && fl.has(b); c.set(sup ? LAYER.supply : LAYER.lane); const k = sup ? 0.8 : 0.34; lc.setXYZ(i * 2, c.r * k, c.g * k, c.b * k); lc.setXYZ(i * 2 + 1, c.r * k, c.g * k, c.b * k); });
    this.worlds.instanceColor.needsUpdate = true; hc.needsUpdate = true; lc.needsUpdate = true;
    this.lanes.visible = show.lane !== false; this.terr.visible = show.sec !== false;
    // the sectors: shaded in their holders' colours, stronger when a sector is held whole; the front in play is lit, the others dimmed
    { const own = g.sectorOwners(), U = this.terr.userData, tc = this.terr.geometry.attributes.color, white = new THREE.Color('#ffffff'), n = U.sec.length, info = new Map(), sysCol = new Map();
      for (const p of g.P) { const k = new THREE.Color(C.color[p.owner] || C.color.fed); if (p.owner === 'fed' && !fl.has(p.id)) k.multiplyScalar(0.5); sysCol.set(p.id, k); }
      for (const [id, sys] of U.sys) { const cnt = {}; let top = 'fed', p0 = g.P[sys[0]]; for (const q of sys) { const o = g.P[q].owner; cnt[o] = (cnt[o] || 0) + 1; if (cnt[o] > (cnt[top] || 0)) top = o; }
        const whole = own.get(id); info.set(id, { who: whole || top, whole: !!whole, col: new THREE.Color(C.color[whole || top] || C.color.fed), sel: id === selSec, dim: g.fi >= 0 && id !== 0 && p0.front !== g.fi ? 0.5 : 1 }); }
      for (let i = 0; i < n; i++) {
        const I = info.get(U.sec[i]), k = U.kind[i]; let al = 0;
        if (k === 0) { let r = 0, gg = 0, b = 0, t = 0; for (let o = U.wOff[i], e = o + U.sys.get(U.sec[i]).length; o < e; o++) { const q = sysCol.get(U.wId[o]), w = U.wVal[o]; r += q.r * w; gg += q.g * w; b += q.b * w; t += w; }
          c.setRGB(r / t, gg / t, b / t); al = ((I.whole ? 0.15 : 0.085) + (I.sel ? 0.08 : 0)) * I.dim; }
        else { const N = U.nb[i] < 0 ? null : info.get(U.nb[i]), edge = !N ? 1 : N.who !== I.who ? 2 : 0;       // 0 one of the same side's, 1 the rim, 2 the front line
          c.copy(I.col); if (k === 1) { c.lerp(white, I.sel ? 0.6 : edge === 2 ? 0.25 : 0.1); al = (edge === 2 ? 1 : edge === 1 ? 0.5 : 0.34) * (I.sel ? 1 : I.dim < 1 ? 0.75 : 1); if (I.sel) al = Math.max(al, 0.9); }
          else if (k === 2) al = ((edge === 2 ? 0.34 : edge === 1 ? 0.1 : 0.05) + (I.sel ? 0.16 : 0)) * I.dim; }
        tc.setXYZW(i, c.r, c.g, c.b, al);
      }
      tc.needsUpdate = true; }
    this.fronts.forEach((m) => { m.material.opacity = 0; });
  }
  // The ships on the board this frame: [{ x, z, ang, owner, dim, s }] (s: how big; a fleet's lead ship is the big one).
  setShips(list) {
    const up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), n = {}, gp = this.glows.geometry.attributes.position, gc = this.glows.geometry.attributes.color; let ng = 0;
    for (const f of SIDES) n[f] = 0;
    for (const o of list) {
      const f = this.fleet[o.owner] ? o.owner : 'fed', m = this.fleet[f], i = n[f]; if (i >= MAXSHIPS / 4) continue; n[f]++;
      const s = o.s || 1; this.q.setFromAxisAngle(up, -o.ang); this.m.compose(this.v.set(o.x, 1.5 + s * 0.3, o.z), this.q, sc.set(s, s, s)); m.setMatrixAt(i, this.m);
      this.col.setScalar(o.dim ? 0.5 : 1); m.setColorAt(i, this.col);
      if (ng < MAXSHIPS) { const b = (f === 'foundry' ? 1.6 : 1.75) * s; gp.setXYZ(ng, o.x - Math.cos(o.ang) * b, 1.5 + s * 0.3, o.z - Math.sin(o.ang) * b); this.col.set(C.color[f] || C.color.fed).multiplyScalar(o.dim ? 0.35 : 0.85); gc.setXYZ(ng, this.col.r, this.col.g, this.col.b); ng++; }
    }
    for (const f of SIDES) { const m = this.fleet[f]; m.count = n[f]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    this.glows.geometry.setDrawRange(0, ng); gp.needsUpdate = true; gc.needsUpdate = true;
  }
  render(t) { if (this.glow) this.glow.rotation.z = t * 0.004; this.r.render(this.scene, this.cam); }
}
export const worldRadius = (p) => RAD[p.kind];
