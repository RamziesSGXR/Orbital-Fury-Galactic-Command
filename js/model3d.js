// THE MODELS MADE IN BLENDER, READ FOR THE GAME (GC 0.42: moved out of the ground's own code so the base and the station read the
// same files). A model file (assets/models/<name>.json, written by tools/blender/gc_kit.py) holds its triangles and colours once
// and every vertex's place for each pose (a frame). Crowd3D draws any number of people from those frames.
import * as THREE from './vendor/three.js';
import { kindOf } from './surface.js';

const b64 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
// (GC 0.38) SMOOTH WHERE IT CURVES, SHARP WHERE IT FOLDS. A model's corners are lit by the faces round them: a corner takes
// the lie of every face that shares its vertex and is turned less than `deg` from its own. So a limb, a shell or a bevelled
// edge is rounded and the edge of a plate stays hard. (Before, every triangle was lit flat: the faceted look.)
// tris: the model's triangles (vertex numbers); pos: the corners' places, in triangle order. Returns the corners' normals.
export function crease(tris, pos, nv, deg = 44) {
  const nt = tris.length / 3, fn = new Float32Array(nt * 3), fu = new Float32Array(nt * 3), out = new Float32Array(nt * 9), cosA = Math.cos(deg * Math.PI / 180);
  for (let t = 0; t < nt; t++) {
    const o = t * 9, ax = pos[o + 3] - pos[o], ay = pos[o + 4] - pos[o + 1], az = pos[o + 5] - pos[o + 2], bx = pos[o + 6] - pos[o], by = pos[o + 7] - pos[o + 1], bz = pos[o + 8] - pos[o + 2];
    const x = ay * bz - az * by, y = az * bx - ax * bz, z = ax * by - ay * bx, l = Math.hypot(x, y, z) || 1; fn[t * 3] = x; fn[t * 3 + 1] = y; fn[t * 3 + 2] = z; fu[t * 3] = x / l; fu[t * 3 + 1] = y / l; fu[t * 3 + 2] = z / l;
  }
  // which faces meet at each vertex (the same for every frame of a model, so it is kept on the triangle list)
  let adj = tris._adj;
  if (!adj) { const start = new Uint32Array(nv + 1); for (let i = 0; i < tris.length; i++) start[tris[i] + 1]++; for (let v = 0; v < nv; v++) start[v + 1] += start[v];
    const fill = start.slice(0, nv), list = new Uint32Array(tris.length); for (let i = 0; i < tris.length; i++) list[fill[tris[i]]++] = (i / 3) | 0; adj = tris._adj = { start, list }; }
  for (let i = 0; i < tris.length; i++) {
    const t = (i / 3) | 0, v = tris[i], ux = fu[t * 3], uy = fu[t * 3 + 1], uz = fu[t * 3 + 2]; let x = 0, y = 0, z = 0;
    for (let k = adj.start[v]; k < adj.start[v + 1]; k++) { const f = adj.list[k]; if (f === t || ux * fu[f * 3] + uy * fu[f * 3 + 1] + uz * fu[f * 3 + 2] >= cosA) { x += fn[f * 3]; y += fn[f * 3 + 1]; z += fn[f * 3 + 2]; } }
    const l = Math.hypot(x, y, z) || 1; out[i * 3] = x / l; out[i * 3 + 1] = y / l; out[i * 3 + 2] = z / l;
  }
  return out;
}
// (GC 0.70) What each triangle is made of, for the surface detail (surface.js): 32 + 16 if the corners also carry their place at
// rest (aRest) + the kind its material's name gives. One value per corner, in triangle order.
function surfAttr(d, nt, mi, rest) {
  const memo = new Map(), out = new Float32Array(nt * 3), base = 32 + (rest ? 16 : 0);
  for (let t = 0; t < nt; t++) { const nm = mi && d.pal ? d.pal[mi[t]] : ''; let k = memo.get(nm); if (k === undefined) { k = kindOf(nm); memo.set(nm, k); } out[t * 3] = out[t * 3 + 1] = out[t * 3 + 2] = base + k; }
  return new THREE.BufferAttribute(out, 1);
}
// One set of frames from a model file (or from its lighter copy, d.lod). remap: { a material's name: a colour } to dress it in the fleet's own.
function frameSet(d, fit, remap, only) {
  const tris = new Uint16Array(b64(d.tris).buffer.slice(0)), cols = b64(d.cols), mi = d.mi ? b64(d.mi) : null, nt = d.nt, out = {}, c = new THREE.Color();
  const col = new Float32Array(nt * 9);
  for (let t = 0; t < nt; t++) {
    const nm = mi && d.pal ? d.pal[mi[t]] : null, rc = nm && remap ? remap[nm] : null;
    if (rc) c.set(rc); else c.setRGB(cols[t * 3] / 255, cols[t * 3 + 1] / 255, cols[t * 3 + 2] / 255, THREE.SRGBColorSpace);
    for (let k = 0; k < 3; k++) { col[t * 9 + k * 3] = c.r; col[t * 9 + k * 3 + 1] = c.g; col[t * 9 + k * 3 + 2] = c.b; }
  }
  const names = Object.keys(d.frames).sort((a, b) => (a === 'stand' ? -1 : b === 'stand' ? 1 : 0));     // (the standing frame sets the size for all of them)
  for (const name of names) {
    if (only && name !== 'stand' && !only.test(name)) continue;
    const q = new Uint16Array(b64(d.frames[name]).buffer.slice(0)), pos = new Float32Array(nt * 9);
    for (let i = 0; i < nt * 3; i++) { const v = tris[i] * 3; for (let k = 0; k < 3; k++) pos[i * 3 + k] = d.min[k] + q[v + k] / 65535 * d.size[k]; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.BufferAttribute(crease(tris, pos, d.nv), 3));
    if (!fit.k) { g.computeBoundingBox(); const b = g.boundingBox; fit.x = -(b.min.x + b.max.x) / 2; fit.y = -b.min.y; fit.z = -(b.min.z + b.max.z) / 2; fit.k = 2 / (fit.ask || Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) || 1); }
    g.translate(fit.x, fit.y, fit.z); g.scale(fit.k, fit.k, fit.k); out[name] = g;
  }
  // (GC 0.70) every frame carries where its corners stand at rest, and what each is made of, so the surface detail sits on the body
  const st = out.stand;
  if (st) { const rest = st.getAttribute('position'), sa = surfAttr(d, nt, mi, true); for (const name in out) { out[name].setAttribute('aRest', rest); out[name].setAttribute('aSurf', sa); } }
  // (0.72, Ramzies: "animations aren't smooth") A CYCLE (a walk, a run) AS ONE GEOMETRY: its first frame, and every frame of it laid
  // on as a morph target, so a figure can be shown part of the way from one frame to the next (each copy its own blend, with
  // setMorphAt): a step that flows, not eight poses one after another. Named '~' and the frames' letter ('~w' for w0..w7).
  const cyc = {};
  for (const name in out) { const mm = /^([a-z])(\d)$/.exec(name); if (mm) (cyc[mm[1]] ||= []).push([+mm[2], name]); }
  for (const p in cyc) {
    const L = cyc[p].sort((a, b) => a[0] - b[0]); if (L.length < 3) continue;
    const g0 = out[L[0][1]], g = new THREE.BufferGeometry();
    for (const a of ['position', 'normal', 'color', 'aRest', 'aSurf']) if (g0.getAttribute(a)) g.setAttribute(a, g0.getAttribute(a));
    g.morphAttributes.position = L.map(([, n]) => out[n].getAttribute('position')); g.morphAttributes.normal = L.map(([, n]) => out[n].getAttribute('normal')); g.morphTargetsRelative = false;
    g.userData.cycle = L.length; out['~' + p] = g;
  }
  return out;
}
// d.fit: the model's own say on its size, so a long spear or tail does not shrink its carrier. d.lod: the same creature in far fewer
// triangles, for when it is small on the screen or the field is crowded.
// (GC 0.38) A thing that stands still (an objective, a side site), from a model file: its one frame at the size it was made
// (a footprint radius of about one, standing on the ground). remap as above.
// to: another frame of the model (GC 0.67: 'dead', a building's ruin) laid on as a morph target, so one geometry can go from
// the standing frame to it (an instanced mesh sets how far along each copy is with setMorphAt)
export function staticGeo(d, remap = null, to = null) {
  const tris = new Uint16Array(b64(d.tris).buffer.slice(0)), cols = b64(d.cols), mi = d.mi ? b64(d.mi) : null, nt = d.nt, c = new THREE.Color();
  const at = (f) => { const q = new Uint16Array(b64(d.frames[f]).buffer.slice(0)), pos = new Float32Array(nt * 9);
    for (let i = 0; i < nt * 3; i++) { const v = tris[i] * 3, o = i * 3; pos[o] = d.min[0] + q[v] / 65535 * d.size[0]; pos[o + 1] = d.min[1] + q[v + 1] / 65535 * d.size[1]; pos[o + 2] = d.min[2] + q[v + 2] / 65535 * d.size[2]; }
    return pos; };
  const pos = at('stand'), col = new Float32Array(nt * 9);
  for (let t = 0; t < nt; t++) {
    const nm = mi && d.pal ? d.pal[mi[t]] : null, rc = nm && remap ? remap[nm] : null;
    if (rc) c.set(rc); else c.setRGB(cols[t * 3] / 255, cols[t * 3 + 1] / 255, cols[t * 3 + 2] / 255, THREE.SRGBColorSpace);
    for (let k = 0; k < 3; k++) { const o = t * 9 + k * 3; col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b; }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('aSurf', surfAttr(d, nt, mi, false)); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.BufferAttribute(crease(tris, pos, d.nv, 40), 3));
  if (to && d.frames[to]) { const p2 = at(to); g.morphAttributes.position = [new THREE.BufferAttribute(p2, 3)]; g.morphAttributes.normal = [new THREE.BufferAttribute(crease(tris, p2, d.nv, 40), 3)]; g.morphTargetsRelative = false; }
  return g;
}
// only: a pattern for the frames wanted (the standing frame always comes), so nobody builds poses they never show
export function modelFrames(d, remap = null, only = null) {
  const fit = { ask: d.fit || 0, k: 0 }, out = { frames: frameSet(d, fit, remap, only) };
  if (d.lod) out.lod = { frames: frameSet(d.lod, fit, remap, only) };
  out.unit = fit.k;     // how many of the mesh's units one of the model's own (a metre, for a person) came to
  return out;
}

// (GC 0.45) A model whose materials are named for jobs (the station's roles): one geometry for each name, places and normals only,
// smooth where it curves and sharp where it folds. The station lays its own skins and its own materials on them.
export function roleGeos(d, deg = 38) {
  const tris = new Uint16Array(b64(d.tris).buffer.slice(0)), mi = b64(d.mi), q = new Uint16Array(b64(d.frames.stand).buffer.slice(0)), nt = d.nt, pos = new Float32Array(nt * 9), n = {}, at = {}, out = {};
  for (let i = 0; i < nt * 3; i++) { const v = tris[i] * 3; for (let k = 0; k < 3; k++) pos[i * 3 + k] = d.min[k] + q[v + k] / 65535 * d.size[k]; }
  const nor = crease(tris, pos, d.nv, deg);
  for (let t = 0; t < nt; t++) n[mi[t]] = (n[mi[t]] || 0) + 1;
  for (const k in n) { out[k] = { p: new Float32Array(n[k] * 9), n: new Float32Array(n[k] * 9) }; at[k] = 0; }
  for (let t = 0; t < nt; t++) { const k = mi[t], o = out[k]; o.p.set(pos.subarray(t * 9, t * 9 + 9), at[k]); o.n.set(nor.subarray(t * 9, t * 9 + 9), at[k]); at[k] += 9; }
  const G = {}; for (const k in out) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(out[k].p, 3)); g.setAttribute('normal', new THREE.BufferAttribute(out[k].n, 3)); g.setAttribute('aSurf', new THREE.BufferAttribute(new Float32Array(out[k].p.length / 3).fill(32 + kindOf(d.pal[k])), 1)); G[d.pal[k]] = g; }
  return G;
}

// A CROWD OF PEOPLE FROM THE MODELS: one instanced mesh for each (kind, frame) in use, made when first asked for.
//   kinds: { key: { file, remap (material name -> colour), only (pattern of frames) } }
//   each frame of the game: begin(); put(key, frame, matrix[, colour, far]); ...; end();
// The meshes are in the model's fitted units: `unit(key)` of them make a metre, so scale a matrix by (metres wanted) / unit.
export class Crowd3D {
  constructor(scene, { mat = null, cap = 64, shadow = true, path = 'assets/models/' } = {}) {
    this.scene = scene; this.cap = cap; this.shadow = shadow; this.path = path; this.kinds = {}; this.made = {}; this.ims = new Map(); this.used = new Map(); this.visible = true;
    this.mat = mat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.03 });
  }
  load(kinds) {
    this.kinds = { ...this.kinds, ...kinds };
    const files = {}; for (const [k, o] of Object.entries(kinds)) (files[o.file] ||= []).push(k);
    return Promise.all(Object.entries(files).map(([file, keys]) => fetch(`${this.path}${file}.json`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d || !d.frames) return; for (const k of keys) { this.kinds[k].data = d; this._make(k); }
    }).catch(() => {})));
  }
  _make(k) { const o = this.kinds[k]; if (!o || !o.data) return; this._drop(k); this.made[k] = modelFrames(o.data, o.remap || null, o.only || null); }
  _drop(k) { for (const [id, im] of this.ims) if (id.startsWith(k + '|')) { this.scene.remove(im); im.geometry.dispose(); im.dispose(); this.ims.delete(id); } }
  // the same people in other colours (a new livery)
  redress(k, remap) { const o = this.kinds[k]; if (!o) return; o.remap = remap; this._make(k); }
  ready(k) { return !!this.made[k]; }
  has(k, frame) { const m = this.made[k]; return !!(m && m.frames[frame]); }
  unit(k) { const m = this.made[k]; return m ? m.unit : 1; }
  begin() { this.used.clear(); }
  put(k, frame, matrix, colour = null, far = false) {
    const m = this.made[k]; if (!m) return false;
    const F = far && m.lod ? m.lod.frames : m.frames, geo = F[frame] || F.stand; if (!geo) return false;
    const id = `${k}|${far && m.lod ? 1 : 0}|${F[frame] ? frame : 'stand'}`; let im = this.ims.get(id); const n = this.used.get(id) || 0;
    if (!im || n >= im.instanceMatrix.count) {     // made at first use; twice the room when it fills
      const cap = im ? im.instanceMatrix.count * 2 : this.cap, nu = new THREE.InstancedMesh(geo, this.mat, cap);
      nu.frustumCulled = false; nu.castShadow = this.shadow; nu.receiveShadow = false; nu.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (im) { for (let i = 0; i < n; i++) { im.getMatrixAt(i, M4T); nu.setMatrixAt(i, M4T); if (im.instanceColor) { im.getColorAt(i, COLT); nu.setColorAt(i, COLT); } } this.scene.remove(im); im.dispose(); }
      this.scene.add(nu); this.ims.set(id, (im = nu));
    }
    im.setMatrixAt(n, matrix); if (colour || im.instanceColor) im.setColorAt(n, colour || WHITE); this.used.set(id, n + 1); return true;
  }
  end() {
    let total = 0;
    for (const [id, im] of this.ims) { im.count = this.visible ? this.used.get(id) || 0 : 0; im.visible = im.count > 0; total += im.count; if (im.count) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } }
    this.n = total;
  }
  clear() { this.used.clear(); this.end(); }
  dispose() { for (const im of this.ims.values()) { this.scene.remove(im); im.geometry.dispose(); im.dispose(); } this.ims.clear(); this.made = {}; }
}
const M4T = new THREE.Matrix4(), COLT = new THREE.Color(), WHITE = new THREE.Color(1, 1, 1);
