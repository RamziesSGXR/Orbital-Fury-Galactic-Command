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
      if (m.transparent || m.alphaTest > 0 || /leaf|leaves|branch|twig|needle|fern|shrub|grass/i.test(m.name)) { m.transparent = false; m.alphaTest = Math.max(0.45, m.alphaTest || 0); m.side = THREE.DoubleSide; m.userData.leaf = true; }
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
function tex(name) {
  let t = TEX.get(name); if (t) return t;
  t = TL.load(BASE + `ground/${name}.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace;     // (the land's shader works in the picture's own sRGB values)
  TEX.set(name, t); return t;
}
// how far the scan's own colour replaces the map's (0: the map's colours, the scan's detail; 1: the scan's colours)
const HUE = { grass: 0.35, jungle: 0.45, desert: 0.7, ice: 0.6, moon: 0.8, mars: 0.55, city: 0.7, steppe: 0.5, ash: 0.6 };
export async function groundSet(biome) {
  const ix = await scanIndex(), pair = GROUND[biome]; if (!ix || !pair) return null;
  const [a, b] = pair, mean = (k) => (ix.ground[k] && ix.ground[k].mean) || [0.5, 0.5, 0.5];
  return { a: tex(`${a}_diff`), an: tex(`${a}_nor`), b: tex(`${b}_diff`), bn: tex(`${b}_nor`), ta: TILE[a] || 4, tb: TILE[b] || 3, ma: mean(a), mb: mean(b), hue: HUE[biome] ?? 0.5 };
}

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
  const ndl = new THREE.MeshStandardMaterial({ map: T('pine_frond.png', true), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85, color: 0xf2f6ee }); ndl.userData.scan = true; ndl.userData.leaf = true;
  ndl.map.wrapS = ndl.map.wrapT = THREE.ClampToEdgeWrapping;
  const bb = geo.boundingBox; return { geo, mats: [bark, ndl], size: [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z] };
}
