// GROUND COVER (GC 0.92, Ramzies: "we're shooting for GTA V"; "we still want 30-144 frames per second"). When the camera is
// close in, the ground round it is set with scanned grass tufts, ferns, bushes and shrubs (Poly Haven CC0, cut down in Blender:
// tools/blender/scans.py, each a few hundred triangles, a lighter form unless very close), the biome's own mix, laid by a hash
// of where each patch of ground is (so the same tuft is always in the same place) and only on firm or soft dry land. Never
// on the low setting, and none at all when the view is pulled back (it could not be seen).
import * as THREE from '../../vendor/three.js';
import { scanModel } from '../../scans.js';

// per biome: [model, chance a cell has it, smallest and largest scale of its real size]
const MIX = {
  grass: [['cover_grass', 0.5, 1.4, 2.4], ['cover_fern', 0.1, 0.9, 1.4], ['cover_bush', 0.05, 1.2, 2.0], ['cover_shrub', 0.08, 1.6, 2.6]],
  jungle: [['cover_fern', 0.38, 1.2, 2.0], ['cover_grass', 0.25, 1.6, 2.6], ['cover_bush', 0.1, 1.4, 2.4], ['cover_shrub', 0.1, 2.0, 3.2]],
  desert: [['cover_bush', 0.05, 0.9, 1.5], ['cover_shrub', 0.04, 1.2, 2.0]],
  mars: [['cover_shrub', 0.03, 1.0, 1.8]],
  city: [['cover_grass', 0.12, 1.2, 2.0], ['cover_shrub', 0.05, 1.2, 2.0]],
};
const CELL = 2.4, R = 48, CAP = 2400, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const hash = (x, y, k) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(k, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export class Cover3D {
  constructor(scene) { this.scene = scene; this.meshes = new Map(); this.models = new Map(); this.key = ''; this.cx = 1e9; this.cy = 1e9; this.mats = new Set(); }
  _model(name) {     // the near form and the far one (which borrows the near one's pictures); null until both have come
    let m = this.models.get(name); if (m !== undefined) return m;
    this.models.set(name, null);
    scanModel(name).then((near) => near && scanModel(name + '_far').then((far) => { if (far) { far.mats = near.mats; this.models.set(name, { near, far }); for (const q of near.mats) this.mats.add(q); this.cx = 1e9; } }));
    return null;
  }
  _mesh(name, far, geo, mats) {
    const id = name + (far ? '~' : ''); let im = this.meshes.get(id);
    if (!im) { im = new THREE.InstancedMesh(geo, mats, CAP); im.frustumCulled = false; im.receiveShadow = true; im.castShadow = false; im.count = 0; im.userData.scan = true; this.scene.add(im); this.meshes.set(id, im); }
    return im;
  }
  hide() { for (const im of this.meshes.values()) im.count = 0; this.key = ''; }
  frame(o) {
    const mix = MIX[o.biome]; if (!mix || !o.on || !o.near || !o.ter) { this.hide(); return; }
    for (const q of this.mats) q.color.setScalar(o.lit ?? 1);
    const far = !(o.scale > 22), key = o.biome + far, ready = mix.map(([n]) => this._model(n));
    if (ready.some((m) => !m)) return;
    if (key === this.key && Math.hypot(o.camX - this.cx, o.camY - this.cy) < 6) return;     // (laid again only when the camera has moved on)
    this.key = key; this.cx = o.camX; this.cy = o.camY;
    for (const im of this.meshes.values()) im.count = 0;
    const ims = mix.map(([n], i) => { const m = ready[i], g = far ? m.far : m.near; return this._mesh(n, far, g.geo, m.near.mats); }), ter = o.ter;
    const x0 = Math.floor((o.camX - R) / CELL), x1 = Math.floor((o.camX + R) / CELL), y0 = Math.floor((o.camY - R) / CELL), y1 = Math.floor((o.camY + R) / CELL);
    for (let iy = y0; iy <= y1; iy++) for (let ix = x0; ix <= x1; ix++) {
      let r = hash(ix, iy, 1), pick = -1;
      for (let k = 0; k < mix.length; k++) { if (r < mix[k][1]) { pick = k; break; } r -= mix[k][1]; }
      if (pick < 0) continue;
      const x = (ix + 0.15 + hash(ix, iy, 2) * 0.7) * CELL, y = (iy + 0.15 + hash(ix, iy, 3) * 0.7) * CELL;
      if ((x - o.camX) ** 2 + (y - o.camY) ** 2 > R * R) continue;
      try { if (!ter.isLand(x, y) || ter.blocked(x, y)) continue; const gn = ter.groundName(x, y); if (gn !== 'firm' && gn !== 'soft') continue; } catch { continue; }
      const im = ims[pick]; if (im.count >= CAP) continue;
      const [, , s0, s1] = mix[pick], s = s0 + (s1 - s0) * hash(ix, iy, 4);
      Q.setFromAxisAngle(UP, hash(ix, iy, 5) * Math.PI * 2); P.set(x, o.y(x, y) - 0.03 * s, y); S.set(s, s * (0.85 + 0.3 * hash(ix, iy, 6)), s);
      M4.compose(P, Q, S); im.setMatrixAt(im.count++, M4);
    }
    for (const im of ims) im.instanceMatrix.needsUpdate = true;
  }
}
