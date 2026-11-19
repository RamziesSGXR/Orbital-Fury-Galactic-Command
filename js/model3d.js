// THE MODELS MADE IN BLENDER, READ FOR THE GAME (GC 0.42: moved out of the ground's own code so the base and the station read the
// same files). A model file (assets/models/<name>.json, written by tools/blender/gc_kit.py) holds its triangles and colours once
// and every vertex's place for each pose (a frame). Crowd3D draws any number of people from those frames.
import * as THREE from './vendor/three.js';

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
  return out;
}
// d.fit: the model's own say on its size, so a long spear or tail does not shrink its carrier. d.lod: the same creature in far fewer
// triangles, for when it is small on the screen or the field is crowded.
// (GC 0.38) A thing that stands still (an objective, a side site), from a model file: its one frame at the size it was made
// (a footprint radius of about one, standing on the ground). remap as above.
export function staticGeo(d, remap = null) {
  const tris = new Uint16Array(b64(d.tris).buffer.slice(0)), cols = b64(d.cols), mi = d.mi ? b64(d.mi) : null, nt = d.nt, c = new THREE.Color();
  const q = new Uint16Array(b64(d.frames.stand).buffer.slice(0)), pos = new Float32Array(nt * 9), col = new Float32Array(nt * 9);
  for (let t = 0; t < nt; t++) {
    const nm = mi && d.pal ? d.pal[mi[t]] : null, rc = nm && remap ? remap[nm] : null;
    if (rc) c.set(rc); else c.setRGB(cols[t * 3] / 255, cols[t * 3 + 1] / 255, cols[t * 3 + 2] / 255, THREE.SRGBColorSpace);
    for (let k = 0; k < 3; k++) { const v = tris[t * 3 + k] * 3, o = t * 9 + k * 3; pos[o] = d.min[0] + q[v] / 65535 * d.size[0]; pos[o + 1] = d.min[1] + q[v + 1] / 65535 * d.size[1]; pos[o + 2] = d.min[2] + q[v + 2] / 65535 * d.size[2]; col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b; }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.BufferAttribute(crease(tris, pos, d.nv, 40), 3)); return g;
}
// only: a pattern for the frames wanted (the standing frame always comes), so nobody builds poses they never show
export function modelFrames(d, remap = null, only = null) {
  const fit = { ask: d.fit || 0, k: 0 }, out = { frames: frameSet(d, fit, remap, only) };
  if (d.lod) out.lod = { frames: frameSet(d.lod, fit, remap, only) };
  out.unit = fit.k;     // how many of the mesh's units one of the model's own (a metre, for a person) came to
  return out;
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
