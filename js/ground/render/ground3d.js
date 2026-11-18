// THE GROUND IN 3D (GC 0.18, stage two of the move to 3D). The battle is still drawn from straight above onto its own
// sheet, exactly as before: ground, scenery, units, fire, fog, light. Here that sheet is laid over the real shape of the
// land (the terrain's own heights) and looked at through a tilted lens from a point that circles the fight, as from a
// gunship. So hills stand up, craters sink, and far ground is smaller than near ground. The units are still flat
// pictures lying on the land; they stand up in stage three.
//
// One camera decides everything: where the land is drawn, where a label goes, and what the pointer is over.
import * as THREE from '../../vendor/three.js';
import { Units3D, Fx3D } from './units3d.js';

export const V3 = { tilt: 56, fov: 30, amp: 22, grid: 112, blocks: 420, sides: 8 };     // degrees above the horizon; the lens; metres of relief either way of the middle height; cells across the sheet
const RAD = Math.PI / 180;

export class Ground3D {
  constructor(livery) {
    this.cv = document.createElement('canvas');
    this.r = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.r.setClearColor(0x000000, 1);
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(V3.fov, 1, 5, 6000);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.7));
    this.sun = new THREE.DirectionalLight(0xffffff, 2.0); this.scene.add(this.sun); this.scene.add(this.sun.target);
    const n = V3.grid, vn = (n + 1) * (n + 1);
    this.pos = new Float32Array(vn * 3); this.uv = new Float32Array(vn * 2);
    const idx = new Uint32Array(n * n * 6); let k = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d; }
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.scene.add(this.mesh);
    // THE THINGS THAT STAND UP (GC 0.19): rocks, trees, buildings, guns. Each is a block risen out of the sheet: its roof is the
    // very patch of the sheet it stands on (so it wears its own top-down drawing, lit and fogged like everything else) and
    // its walls take the colours at its edge, darker. Built afresh each frame from what is in view.
    { const nv = V3.blocks * V3.sides * 9; this.bp = new Float32Array(nv * 3); this.bu = new Float32Array(nv * 2); this.bn = new Float32Array(nv * 3); this.bc = new Float32Array(nv * 3);
      const bg = this.bgeo = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(this.bp, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(this.bu, 2)); bg.setAttribute('normal', new THREE.BufferAttribute(this.bn, 3)); bg.setAttribute('color', new THREE.BufferAttribute(this.bc, 3));
      this.bmat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
      this.bmesh = new THREE.Mesh(bg, this.bmat); this.bmesh.frustumCulled = false; this.scene.add(this.bmesh); }
    this.v = new THREE.Vector3(); this.pv = new THREE.Matrix4(); this.inv = new THREE.Matrix4();
    this.h = () => 0.5; this.W = this.H = 1; this.ok = true; this.amp = V3.amp;
    try { this.units = new Units3D(this.scene, livery); this.fx = new Fx3D(this.scene); } catch (err) { console.warn('3D units unavailable', err); this.units = null; this.fx = null; }
    this.gun = new THREE.Vector3();
  }
  // metres above the middle height at a point of the map
  y(x, z) { return (this.h(x, z) - 0.5) * 2 * this.amp; }
  // Lay this frame's sheet on the land and take the picture.
  //   sheet: the canvas the battle was drawn on, S pixels square, the camera's point at its middle, `scale` pixels to a metre
  //   W, H: the screen, in the same pixels; fy: how far down the screen the camera's point sits (0 to 1); yaw: how far round
  //   the gunship has flown; sun: { lx, ly } the way the light falls on the map, if the hour has a sun
  frame(o) {
    const { sheet, S, scale, camX, camY, yaw, W, H, fy, sun } = o; this.h = o.height;
    if (this.W !== W || this.H !== H) { this.W = W; this.H = H; this.r.setSize(W, H, false); }
    if (!this.tex || this.tex.image !== sheet) { if (this.tex) this.tex.dispose(); this.tex = new THREE.CanvasTexture(sheet); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.generateMipmaps = false; this.tex.minFilter = THREE.LinearFilter; this.tex.magFilter = THREE.LinearFilter; this.mat.map = this.tex; this.mat.needsUpdate = true; }
    this.tex.needsUpdate = true; if (this.bmat.map !== this.tex) { this.bmat.map = this.tex; this.bmat.needsUpdate = true; }
    // the land under the sheet: a grid whose corners stay at fixed places on the map (so the hills do not shimmer as the
    // camera slides), covering the sheet and a cell more
    const n = V3.grid, L = S / scale, c = L / (n - 1), x0 = Math.floor((camX - L / 2) / c) * c, z0 = Math.floor((camY - L / 2) / c) * c, P = this.pos, U = this.uv;
    let p = 0, q = 0;
    for (let j = 0; j <= n; j++) { const z = z0 + j * c; for (let i = 0; i <= n; i++) { const x = x0 + i * c; P[p++] = x; P[p++] = this.y(x, z); P[p++] = z; U[q++] = (x - (camX - L / 2)) / L; U[q++] = 1 - (z - (camY - L / 2)) / L; } }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true; this.geo.computeVertexNormals();
    // the blocks: [{ x, y, r, h, n }] in metres (n: how many sides, 4 for a building, more for a rock or a tree)
    { const B = o.blocks || [], P2 = this.bp, U2 = this.bu, N2 = this.bn, C2 = this.bc, ux0 = camX - L / 2, uz0 = camY - L / 2, max = V3.blocks * V3.sides * 9; let k = 0;
      const put = (x, y, z, nx, ny, nz, sh) => { const a = k * 3, b = k * 2; P2[a] = x; P2[a + 1] = y; P2[a + 2] = z; U2[b] = (x - ux0) / L; U2[b + 1] = 1 - (z - uz0) / L; N2[a] = nx; N2[a + 1] = ny; N2[a + 2] = nz; C2[a] = C2[a + 1] = C2[a + 2] = sh; k++; };
      for (const q of B) {
        const n = Math.max(3, Math.min(V3.sides, q.n || V3.sides)); if (k + n * 9 > max) break;
        const top = this.y(q.x, q.y) + q.h, rot = q.n === 4 ? Math.PI / 4 : 0;
        for (let i = 0; i < n; i++) {
          const a0 = rot + i / n * 6.2832, a1 = rot + (i + 1) / n * 6.2832, x0b = q.x + Math.cos(a0) * q.r, z0b = q.y + Math.sin(a0) * q.r, x1b = q.x + Math.cos(a1) * q.r, z1b = q.y + Math.sin(a1) * q.r;
          put(q.x, top, q.y, 0, 1, 0, 1); put(x1b, top, z1b, 0, 1, 0, 1); put(x0b, top, z0b, 0, 1, 0, 1);     // the roof
          const am = (a0 + a1) / 2, nx = Math.cos(am), nz = Math.sin(am), g0 = Math.min(top, this.y(x0b, z0b)) - 0.5, g1 = Math.min(top, this.y(x1b, z1b)) - 0.5;     // the wall, down to the land
          put(x0b, top, z0b, nx, 0, nz, 0.55); put(x1b, top, z1b, nx, 0, nz, 0.55); put(x0b, g0, z0b, nx, 0, nz, 0.4);
          put(x1b, top, z1b, nx, 0, nz, 0.55); put(x1b, g1, z1b, nx, 0, nz, 0.4); put(x0b, g0, z0b, nx, 0, nz, 0.4);
        }
      }
      this.bgeo.setDrawRange(0, k); for (const a of ['position', 'uv', 'normal', 'color']) this.bgeo.attributes[a].needsUpdate = true; this.nBlocks = B.length; }
    if (this.units) this.units.frame(o.units || [], (x, z) => this.y(x, z), !!o.hot);
    // the lens: as far off as makes a metre at the camera's point the same size on screen as it is on the sheet
    const E = Math.max(30, Math.min(86, o.tilt || V3.tilt)) * RAD, d = H / 2 / Math.tan(V3.fov * RAD / 2) / scale, fx = -Math.sin(yaw), fz = -Math.cos(yaw), ly = this.y(camX, camY), C = this.cam;
    C.aspect = W / H; C.setViewOffset(W, H, 0, (0.5 - fy) * H, W, H);
    C.position.set(camX - fx * d * Math.cos(E), ly + d * Math.sin(E), camY - fz * d * Math.cos(E)); C.lookAt(camX, ly, camY); C.updateMatrixWorld(); C.updateProjectionMatrix();
    C.matrixWorldInverse.copy(C.matrixWorld).invert(); this.pv.multiplyMatrices(C.projectionMatrix, C.matrixWorldInverse); this.inv.copy(this.pv).invert();
    // the light falls the way the map's own shading says it does (from the north-west when the hour has no sun)
    const lx = sun ? sun.lx : -0.6, lz = sun ? sun.ly : -0.6; this.sun.position.set(camX + lx * 200, 260, camY + lz * 200); this.sun.target.position.set(camX, 0, camY); this.sun.target.updateMatrixWorld();
    // the ship's gun hangs under the gunship, off to the right of the sight: its shells come in from the edge of the picture
    if (this.fx) { const e = C.matrixWorld.elements; this.gun.set(C.position.x + e[0] * d * 0.5 - e[4] * d * 0.22, C.position.y + e[1] * d * 0.5 - e[5] * d * 0.22, C.position.z + e[2] * d * 0.5 - e[6] * d * 0.22); this.fx.frame({ drops: o.drops, shells: o.shells, strobes: o.strobes, gun: this.gun }, (x, z) => this.y(x, z)); }
    this.r.render(this.scene, C);
    this.at = { camX, camY };
  }
  // a point of the map, on the screen (pixels of the screen's own canvas)
  toScreen(x, z) { const v = this.v.set(x, this.y(x, z), z).applyMatrix4(this.pv); return [(v.x + 1) / 2 * this.W, (1 - v.y) / 2 * this.H]; }
  // the point of the map under a point of the screen: down the ray to the land, a few steps for the hills
  toWorld(sx, sy) {
    const nx = sx / this.W * 2 - 1, ny = 1 - sy / this.H * 2, a = this.v.set(nx, ny, -1).applyMatrix4(this.inv), ax = a.x, ay = a.y, az = a.z, b = this.v.set(nx, ny, 1).applyMatrix4(this.inv);
    const dx = b.x - ax, dy = b.y - ay, dz = b.z - az; if (Math.abs(dy) < 1e-9) return null;
    let h = this.at ? this.y(this.at.camX, this.at.camY) : 0, x = 0, z = 0;
    for (let i = 0; i < 4; i++) { const t = (h - ay) / dy; x = ax + dx * t; z = az + dz * t; h = this.y(x, z); }
    return { x, y: z };
  }
}
