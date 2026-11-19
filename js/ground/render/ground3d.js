// THE GROUND IN 3D (GC 0.18, stage two of the move to 3D). The battle is still drawn from straight above onto its own
// sheet, exactly as before: ground, scenery, units, fire, fog, light. Here that sheet is laid over the real shape of the
// land (the terrain's own heights) and looked at through a tilted lens from a point that circles the fight, as from a
// gunship. So hills stand up, craters sink, and far ground is smaller than near ground. The units are still flat
// pictures lying on the land; they stand up in stage three.
//
// One camera decides everything: where the land is drawn, where a label goes, and what the pointer is over.
import * as THREE from '../../vendor/three.js';
import { Units3D, Fx3D } from './units3d.js';
import { Props3D } from './props3d.js';

export const V3 = { tilt: 56, fov: 30, amp: 22, grid: 112, blocks: 420, sides: 8 };     // degrees above the horizon; the lens; metres of relief either way of the middle height; cells across the sheet
const RAD = Math.PI / 180;

export class Ground3D {
  constructor(livery) {
    this.cv = document.createElement('canvas');
    this.r = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.r.setClearColor(0x000000, 1);
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(V3.fov, 1, 5, 6000);
    // (0.37) less light from everywhere and more from the sun, which stands lower: a slope turned to it is bright and one
    // turned away is dark, so the shape of the land can be read
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    this.sun = new THREE.DirectionalLight(0xffffff, 3.1); this.scene.add(this.sun); this.scene.add(this.sun.target);
    const n = V3.grid, vn = (n + 1) * (n + 1);
    this.pos = new Float32Array(vn * 3); this.uv = new Float32Array(vn * 2);
    const idx = new Uint32Array(n * n * 6); let k = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d; }
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    // (0.37) THE LAND'S TWO PICTURES. The ground itself (the map's own image) is a picture that is sent to the graphics card
    // once and stays there; what is drawn on the ground this frame (zones, tracks, the dark where nobody is looking) is a
    // second, see-through picture laid over it. Before, the two were one picture, drawn and sent whole every frame.
    this.uGround = { value: null }; this.uOver = { value: null }; this.uInv = { value: 1 / 1600 }; this.uTopo = { value: 0 }; this.uAmp = { value: V3.amp };
    const two = (mat) => { mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { tGround: this.uGround, tOver: this.uOver, uInv: this.uInv, uTopo: this.uTopo, uAmp: this.uAmp });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uInv; varying vec2 vG; varying vec2 vO; varying float vHt;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvG = vec2(position.x * uInv, 1.0 - position.z * uInv); vO = uv; vHt = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform sampler2D tGround; uniform sampler2D tOver; uniform float uTopo; uniform float uAmp; varying vec2 vG; varying vec2 vO; varying float vHt;
        vec3 gcLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }`)
        .replace('#include <map_fragment>', `
        vec3 gr = (vG.x < 0.0 || vG.x > 1.0 || vG.y < 0.0 || vG.y > 1.0) ? vec3(0.0) : texture2D(tGround, vG).rgb;
        float hk = clamp(vHt / uAmp * 0.5 + 0.5, 0.0, 1.0);
        gr *= 0.84 + 0.3 * hk;                                   // high ground a little lighter, hollows a little darker
        if (uTopo > 0.5) {                                       // the height view: colour by height, and a line every four metres
          vec3 tint = hk < 0.35 ? mix(vec3(0.25, 0.42, 0.75), vec3(0.3, 0.62, 0.42), hk / 0.35) : hk < 0.7 ? mix(vec3(0.3, 0.62, 0.42), vec3(0.85, 0.78, 0.45), (hk - 0.35) / 0.35) : mix(vec3(0.85, 0.78, 0.45), vec3(0.95, 0.5, 0.25), (hk - 0.7) / 0.3);
          gr = mix(vec3(dot(gr, vec3(0.3, 0.6, 0.1))) * 0.8, tint * 0.85, 0.62);
          float q = vHt / 4.0, w = fwidth(q), ln = 1.0 - smoothstep(0.0, 1.4 * w, abs(fract(q + 0.5) - 0.5));
          float q5 = vHt / 20.0, w5 = fwidth(q5), l5 = 1.0 - smoothstep(0.0, 2.4 * w5, abs(fract(q5 + 0.5) - 0.5));
          gr = mix(gr, vec3(0.03), max(ln * 0.55, l5 * 0.85));
        }
        vec4 ov = texture2D(tOver, vO);
        diffuseColor.rgb *= gcLin(clamp(gr * (1.0 - ov.a) + ov.rgb, 0.0, 1.0));`);
    }; return mat; };
    this.mat = two(new THREE.MeshLambertMaterial({ color: 0xffffff }));
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.scene.add(this.mesh);
    // THE THINGS THAT STAND UP (GC 0.19): rocks, trees, buildings, guns. Each is a block risen out of the sheet: its roof is the
    // very patch of the sheet it stands on (so it wears its own top-down drawing, lit and fogged like everything else) and
    // its walls take the colours at its edge, darker. Built afresh each frame from what is in view.
    { const nv = V3.blocks * V3.sides * 9; this.bp = new Float32Array(nv * 3); this.bu = new Float32Array(nv * 2); this.bn = new Float32Array(nv * 3); this.bc = new Float32Array(nv * 3);
      const bg = this.bgeo = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(this.bp, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(this.bu, 2)); bg.setAttribute('normal', new THREE.BufferAttribute(this.bn, 3)); bg.setAttribute('color', new THREE.BufferAttribute(this.bc, 3));
      this.bmat = two(new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }));
      this.bmesh = new THREE.Mesh(bg, this.bmat); this.bmesh.frustumCulled = false; this.scene.add(this.bmesh); }
    this.v = new THREE.Vector3(); this.pv = new THREE.Matrix4(); this.inv = new THREE.Matrix4();
    this.h = () => 0.5; this.W = this.H = 1; this.ok = true; this.amp = V3.amp;
    try { this.units = new Units3D(this.scene, livery); this.fx = new Fx3D(this.scene); } catch (err) { console.warn('3D units unavailable', err); this.units = null; this.fx = null; }
    this.gun = new THREE.Vector3();
    try { this.props = new Props3D(this.scene); } catch (err) { console.warn('3D props unavailable', err); this.props = null; }
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
    if (!this.tex || this.tex.image !== sheet) { if (this.tex) this.tex.dispose(); this.tex = new THREE.CanvasTexture(sheet); this.tex.premultiplyAlpha = true; this.tex.generateMipmaps = false; this.tex.minFilter = THREE.LinearFilter; this.tex.magFilter = THREE.LinearFilter; this.uOver.value = this.tex; }
    this.tex.needsUpdate = true;
    // the ground's own picture: sent again only when it has changed (the hour's light, a new scorch mark), and then no more than four times a second
    if (o.ground) {
      if (!this.gtex || this.gtex.image !== o.ground) { if (this.gtex) this.gtex.dispose(); this.gtex = new THREE.CanvasTexture(o.ground); this.gtex.anisotropy = Math.min(8, this.r.capabilities.getMaxAnisotropy()); this.uGround.value = this.gtex; this.gRev = -1; this.gAt = -1e9; }
      const nowMs = performance.now(); if (this.gRev !== o.groundRev && nowMs - this.gAt > 250) { this.gRev = o.groundRev; this.gAt = nowMs; this.gtex.needsUpdate = true; }
    }
    this.uInv.value = 1 / (o.size || 1600); this.uTopo.value = o.topo ? 1 : 0;
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
    if (this.props) this.props.frame(o.props || [], (x, z) => this.y(x, z), o.lit ?? 1);
    // the lens: as far off as makes a metre at the camera's point the same size on screen as it is on the sheet
    const E = Math.max(30, Math.min(86, o.tilt || V3.tilt)) * RAD, d = H / 2 / Math.tan(V3.fov * RAD / 2) / scale, fx = -Math.sin(yaw), fz = -Math.cos(yaw), ly = this.y(camX, camY), C = this.cam;
    C.aspect = W / H; C.setViewOffset(W, H, 0, (0.5 - fy) * H, W, H);
    C.position.set(camX - fx * d * Math.cos(E), ly + d * Math.sin(E), camY - fz * d * Math.cos(E)); C.lookAt(camX, ly, camY); C.updateMatrixWorld(); C.updateProjectionMatrix();
    C.matrixWorldInverse.copy(C.matrixWorld).invert(); this.pv.multiplyMatrices(C.projectionMatrix, C.matrixWorldInverse); this.inv.copy(this.pv).invert();
    // the light falls the way the map's own shading says it does (from the north-west when the hour has no sun)
    const lx = sun ? sun.lx : -0.6, lz = sun ? sun.ly : -0.6; this.sun.position.set(camX + lx * 200, 150, camY + lz * 200); this.sun.target.position.set(camX, 0, camY); this.sun.target.updateMatrixWorld();
    // the ship's gun hangs under the gunship, off to the right of the sight: its shells come in from the edge of the picture
    if (this.fx) { const e = C.matrixWorld.elements; this.gun.set(C.position.x + e[0] * d * 0.5 - e[4] * d * 0.22, C.position.y + e[1] * d * 0.5 - e[5] * d * 0.22, C.position.z + e[2] * d * 0.5 - e[6] * d * 0.22); this.fx.frame({ drops: o.drops, shells: o.shells, strobes: o.strobes, blasts: o.blasts, bolts: o.bolts, orbs: o.orbs, domes: o.domes, puffs: o.puffs, eye: this.cam.quaternion, gun: this.gun }, (x, z) => this.y(x, z)); }
    // (0.37) the picture is taken onto a target, and the sight (infrared white-hot, black-hot, or plain colour) is put on as it
    // is copied to the screen: one cheap step on the graphics card, where it used to be a filter on the finished canvas
    const po = o.post === false ? null : this._post(W, H); this.sighted = !!po;
    if (po) { po.mat.uniforms.uMode.value = o.sight === 'whot' ? 1 : o.sight === 'bhot' ? 2 : 0; this.r.setRenderTarget(po.rt); this.r.render(this.scene, C); this.r.setRenderTarget(null); this.r.render(po.scene, po.cam); }
    else this.r.render(this.scene, C);
    this.at = { camX, camY };
  }
  _post(W, H) {
    if (this.post === null || window.__nopost) return null;
    if (!this.post) {
      try {
        const half = this.r.extensions.has('EXT_color_buffer_float') || this.r.extensions.has('EXT_color_buffer_half_float');
        const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true });
        const mat = new THREE.ShaderMaterial({ uniforms: { t: { value: rt.texture }, uMode: { value: 0 } }, depthTest: false, depthWrite: false,
          vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
          fragmentShader: `uniform sampler2D t; uniform int uMode; varying vec2 vUv;
            vec3 enc(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
            void main() { vec3 c = enc(clamp(texture2D(t, vUv).rgb, 0.0, 1.0));
              if (uMode > 0) { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); if (uMode == 2) l = 1.0 - l; l = (l - 0.5) * (uMode == 1 ? 1.25 : 1.2) + 0.5; l *= uMode == 1 ? 0.82 : 0.9; c = vec3(clamp(l, 0.0, 1.0)); }
              gl_FragColor = vec4(c, 1.0); }` });
        const scene = new THREE.Scene(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
        this.post = { rt, mat, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), W, H };
      } catch (err) { console.warn('no post pass', err); this.post = null; return null; }
    }
    const P = this.post; if (P.W !== W || P.H !== H) { P.rt.setSize(W, H); P.W = W; P.H = H; }
    return P;
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
