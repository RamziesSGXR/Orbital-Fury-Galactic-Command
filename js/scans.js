// SCANNED ASSETS (GC 0.91, Ramzies: "we're shooting for GTA V"). Photoscanned trees, rocks, shrubs and ground materials from
// Poly Haven (CC0), cut down in Blender (tools/blender/scans.py) and kept in assets/scans: models/<name>.glb and
// ground/<biome>_<a|b>_<diff|nor|rough>.jpg, listed with their sizes in assets/scans/scans.json.
//   scanModel(name)  -> Promise of { geo, mats, size } : one geometry (a group per material, for one instanced mesh), its
//                       materials (leaves cut out by their alpha, both sides drawn), its size in metres [x, height, z]
//   groundSet(biome) -> { a, b, an, bn, ta, tb, ma, mb, hue } : the biome's two ground materials, their tile sizes in metres,
//                       their mean colours (sRGB) and how far their own colour is taken, or null where the biome has none
// The game draws the old models until these have come, and goes on without them if they never do.
import * as THREE from './vendor/three.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from './vendor/addons/utils/BufferGeometryUtils.js';

const BASE = new URL('../assets/scans/', import.meta.url).href;
const OFF = (() => { try { return /[?&]scans=0/.test(location.search + (parent !== self ? parent.location.search : '')); } catch { return false; } })();     // (?scans=0: the old models, to compare)
let INDEX = null;
export function scanIndex() { if (!INDEX) INDEX = OFF ? Promise.resolve(null) : fetch(BASE + 'scans.json').then((r) => (r.ok ? r.json() : null)).catch(() => null); return INDEX; }

const MODELS = new Map(), LOADER = new GLTFLoader();
// a leaf card lit the same from either side (three.js turns a card's normal round for its back, which leaves half a crown black)
function leafLit(m) {
  m.userData.leaf = true; const prev = m.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) { if (prev) prev.call(this, sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n#ifndef FLAT_SHADED\n  normal = normalize( vNormal );\n#endif'); };
  m.customProgramCacheKey = () => 'gc-leaf'; return m;
}
export function scanModel(name) {
  let p = MODELS.get(name); if (p) return p;
  if (/^tree_pine(_far)?$/.test(name)) { p = OFF ? Promise.resolve(null) : Promise.resolve(pine()); MODELS.set(name, p); return p; }
  p = OFF ? Promise.resolve(null) : LOADER.loadAsync(BASE + `models/${name}.glb`).then((gl) => {
    const geos = [], mats = []; gl.scene.updateMatrixWorld(true);
    gl.scene.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      const m = o.material; m.userData.scan = true;
      m.vertexColors = false;     // (GC 0.93.1) the colours a scan carries in its corners are dropped above: a material still asking for them read black (rock_a, every biome's second rock)
      if (m.transparent || m.alphaTest > 0 || /leaf|leaves|branch|twig|needle|fern|shrub|grass/i.test(m.name)) { m.transparent = false; m.alphaTest = Math.max(0.45, m.alphaTest || 0); m.side = THREE.DoubleSide; leafLit(m); }
      if (m.map) m.map.anisotropy = 4;
      geos.push(g); mats.push(m);
    });
    if (!geos.length) return null;
    const idx = geos.every((g) => g.index), geo = mergeGeometries(idx ? geos : geos.map((g) => (g.index ? g.toNonIndexed() : g)), true);
    geo.computeBoundingBox(); const b = geo.boundingBox, size = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z];
    return { geo, mats, size };
  }).catch((err) => { console.warn('scan unavailable', name, err); return null; });
  MODELS.set(name, p); return p;
}

// the ground fight's and the base's biomes: two scanned ground materials each (the first the main one)
const GROUND = { grass: ['grass_a', 'grass_b'], jungle: ['jungle_a', 'jungle_b'], desert: ['desert_a', 'desert_b'], ice: ['ice_a', 'ice_b'], moon: ['moon_a', 'moon_b'],
  mars: ['mars_a', 'mars_b'], city: ['city_a', 'city_b'], steppe: ['steppe_a', 'grass_b'], ash: ['ash_a', 'mars_b'] };
// metres each picture spans (the scans' own, a little larger where they are very fine, so they read from above)
const TILE = { grass_a: 15, grass_b: 2.6, jungle_a: 4, jungle_b: 2.6, desert_a: 15, desert_b: 4, ice_a: 3, ice_b: 3, moon_a: 2.4, moon_b: 4, mars_a: 4, mars_b: 3, city_a: 4, city_b: 3, ash_a: 2.5, steppe_a: 4 };
const TEX = new Map(), TL = new THREE.TextureLoader();
function tex(name, lin = false) {     // (the ground fight's land works in the picture's own sRGB values; the base's in linear light)
  let t = TEX.get(name + lin); if (t) return t;
  t = TL.load(BASE + `ground/${name}.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = lin && /_diff$/.test(name) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  TEX.set(name + lin, t); return t;
}
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
// (GC 0.92) a scanned model's geometry fitted to a built shape it stands in for: 'ball' (centred, a radius of one across), or
// 'cone' (a height of one, centred, a radius of one across)
export function fitScan(sc, mode = 'ball') {
  const g = sc.geo.clone(); g.computeBoundingBox(); const b = g.boundingBox, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, h = b.max.y - b.min.y, r = Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2;
  g.translate(-cx, -(b.min.y + h / 2), -cz);
  if (mode === 'cone') g.scale(1 / r, 1 / h, 1 / r); else g.scale(1 / r, 1 / r, 1 / r);
  return g;
}
// how far the scan's own colour replaces the map's (0: the map's colours, the scan's detail; 1: the scan's colours)
const HUE = { grass: 0.35, jungle: 0.45, desert: 0.7, ice: 0.6, moon: 0.8, mars: 0.55, city: 0.7, steppe: 0.5, ash: 0.6 };
export async function groundSet(biome, lin = false) {
  const ix = await scanIndex(), pair = GROUND[biome]; if (!ix || !pair) return null;
  const [a, b] = pair, mean = (k) => (ix.ground[k] && ix.ground[k].mean) || [0.5, 0.5, 0.5];
  const mm = (k) => (lin ? mean(k).map(toLin) : mean(k));
  return { a: tex(`${a}_diff`, lin), an: tex(`${a}_nor`, lin), b: tex(`${b}_diff`, lin), bn: tex(`${b}_nor`, lin), ta: TILE[a] || 4, tb: TILE[b] || 3, ma: mm(a), mb: mm(b), hue: HUE[biome] ?? 0.5 };
}

// (GC 0.92.6, Ramzies: "the textures constantly repeat") HEX TILING (after Mikkelsen, "Practical Real-Time Hex-Tiling", 2022).
// A scanned picture laid edge to edge shows its repeat as a lattice from any height. Here it is laid as a field of hexagons,
// each with the picture turned and shifted at random, and the three nearest blended (the brighter one wins where they meet, so
// the grain keeps its contrast): no two neighbours alike and no lattice to see, at one fixed size on the land (it does not
// change as the camera comes in or pulls back). For the land shaders: gcHexLay(colour, normal, st, dFdx(st), dFdy(st), out n)
// gives the colour and the normal (tangent space, on st's own axes); the derivatives are taken by the caller, in the open.
// Each hexagon's patch of the picture is evened out first to the picture's own mean (mean: its mean colour, as the picture's
// values are) over a quarter of the picture and more, so no hexagon is lighter or darker than its neighbours as a whole:
// without it the hexagons showed as a honeycomb of slightly different greys close in.
export const HEX = `
uvec2 gcPcg(uvec2 v) { v = v * 1664525u + 1013904223u; v.x += v.y * 1664525u; v.y += v.x * 1664525u; v ^= (v >> 16u); v.x += v.y * 1664525u; v.y += v.x * 1664525u; v ^= (v >> 16u); return v; }
vec3 gcHexR(ivec2 p) { uvec2 h = gcPcg(uvec2(p + 32768)); uvec2 g = gcPcg(h ^ uvec2(0x9e3779b9u, 0x85ebca6bu)); return vec3(vec2(h >> 8u), float(g.x >> 8u)) / 16777216.0; }
vec3 gcHexLay(sampler2D tc, sampler2D tn, vec2 st, vec2 dx, vec2 dy, vec3 mean, out vec3 nrm) {
  float lm = log2(float(textureSize(tc, 0).x)) - 2.0;
  vec2 sk = vec2(st.x - 0.57735027 * st.y, 1.15470054 * st.y) * 3.4641016;
  ivec2 b = ivec2(floor(sk)); vec2 f = fract(sk); float tz = 1.0 - f.x - f.y, s = step(0.0, -tz), s2 = 2.0 * s - 1.0; int si = int(s);
  vec3 w = vec3(-tz * s2, s - f.y * s2, s - f.x * s2);
  ivec2 V[3]; V[0] = b + ivec2(si, si); V[1] = b + ivec2(si, 1 - si); V[2] = b + ivec2(1 - si, si);
  vec3 C[3]; vec2 P[3]; mat2 R[3]; vec3 lum;
  for (int i = 0; i < 3; i++) {
    vec3 h = gcHexR(V[i]); float a = h.z * 6.2831853, ca = cos(a), sa = sin(a); R[i] = mat2(ca, sa, -sa, ca);
    vec2 cen = vec2(float(V[i].x) + 0.5 * float(V[i].y), 0.8660254 * float(V[i].y)) / 3.4641016;
    P[i] = R[i] * (st - cen) + cen + h.xy;
    C[i] = textureGrad(tc, P[i], R[i] * dx, R[i] * dy).rgb * clamp(mean / max(textureLod(tc, P[i], lm).rgb, vec3(0.02)), vec3(0.5), vec3(2.0));
    lum[i] = dot(C[i], vec3(0.299, 0.587, 0.114));
  }
  vec3 W = mix(vec3(1.0), lum, 0.6) * pow(max(w, vec3(0.0)), vec3(7.0)); W /= max(W.x + W.y + W.z, 1e-6);
  vec3 n = vec3(0.0); vec2 nb = textureLod(tn, vec2(0.5), 16.0).xy * 2.0 - 1.0;     // (the normals' own lean, over the whole picture: the snow's leans 12 degrees one way, and turned a different way in each hexagon it lit each differently)
  for (int i = 0; i < 3; i++) { vec3 t = textureGrad(tn, P[i], R[i] * dx, R[i] * dy).rgb * 2.0 - 1.0; t.xy -= nb; n += W[i] * vec3(transpose(R[i]) * t.xy, t.z); }
  nrm = normalize(n);
  return W.x * C[0] + W.y * C[1] + W.z * C[2];
}
`;

// THE PINE (GC 0.91). Poly Haven's firs are millions of polygons (every needle), far past what a forest in a browser can carry
// at 30 to 144 frames a second; this one is built here from cards: a trunk in a scanned fir's bark, and tiers of fronds (a
// picture of a fir's twig, tools/textures/frond.py) round it, longest at the bottom and drooping, each frond two cards
// crossed so it is full from above and from the side. About 300 triangles, the same near and far.
function pine() {
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const H = 9, R = 2.3, pos = [], nrm = [], uv = [], up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), w = new THREE.Vector3();
  const card = (o, dir, side, len, wid) => {     // a quad from o along dir, wid across side; normals leaned up (foliage lit softly)
    const p0 = o.clone().addScaledVector(side, -wid / 2), p1 = o.clone().addScaledVector(side, wid / 2), p2 = p1.clone().addScaledVector(dir, len), p3 = p0.clone().addScaledVector(dir, len);
    const n = new THREE.Vector3().crossVectors(side, dir).normalize(); if (n.y < 0) n.negate(); n.lerp(up, 0.75).normalize();
    for (const [p, t] of [[p0, [0, 0]], [p1, [0, 1]], [p2, [1, 1]], [p0, [0, 0]], [p2, [1, 1]], [p3, [1, 0]]]) { pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z); uv.push(t[0], t[1]); }
  };
  const tiers = 12;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1), y = 1.3 + t * (H - 2.0), len = R * Math.pow(1 - t, 0.85) + 0.45, n = 7 - Math.round(t * 3), droop = 0.45 - 0.3 * t;
    for (let j = 0; j < n; j++) {
      const az = (j / n) * Math.PI * 2 + i * 0.9 + (rnd() - 0.5) * 0.5, dl = droop + (rnd() - 0.5) * 0.15;
      a.set(Math.cos(az), 0, Math.sin(az)); const dir = a.clone().multiplyScalar(Math.cos(dl)).add(v.set(0, -Math.sin(dl), 0)).normalize();
      const side = b.crossVectors(up, a).normalize().clone(), roll = (rnd() - 0.5) * 0.5, s1 = side.clone().applyAxisAngle(dir, roll), s2 = side.clone().applyAxisAngle(dir, roll + 1.35);
      const o = w.set(0, y + (rnd() - 0.5) * 0.25, 0).addScaledVector(a, 0.08).clone(), L = len * (0.85 + 0.3 * rnd());
      card(o, dir, s1, L, L * 0.5); card(o, dir, s2, L * 0.92, L * 0.42);
    }
  }
  for (let j = 0; j < 4; j++) { const az = j * Math.PI / 2 + 0.4; a.set(Math.cos(az), 0, Math.sin(az)); const dir = a.clone().multiplyScalar(0.35).add(up).normalize(); card(new THREE.Vector3(0, H - 0.9, 0), dir, b.crossVectors(up, a).normalize().clone(), 1.1, 0.55); }
  const fr = new THREE.BufferGeometry(); fr.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fr.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); fr.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const tr = new THREE.CylinderGeometry(0.035, 0.24, H, 10, 1, true).toNonIndexed(); tr.translate(0, H / 2, 0); { const u = tr.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 2, u.getY(i) * 6); }
  const geo = mergeGeometries([tr, fr], true); geo.computeBoundingBox();
  const T = (f, srgb) => { const t = new THREE.TextureLoader().load(BASE + `models/${f}`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const bark = new THREE.MeshStandardMaterial({ map: T('pine_bark_diff.jpg', true), normalMap: T('pine_bark_nor.jpg'), roughness: 0.95 }); bark.userData.scan = true;
  const ndl = new THREE.MeshStandardMaterial({ map: T('pine_frond.png', true), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85, color: 0x9fac98 }); ndl.userData.scan = true; leafLit(ndl);
  ndl.map.wrapS = ndl.map.wrapT = THREE.ClampToEdgeWrapping;
  const bb = geo.boundingBox; return { geo, mats: [bark, ndl], size: [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z] };
}
