// (GC 0.86) The base's effects: a bloom pass so lit windows and lamps glow at night, blueprints for what is planned or
// going up (GC 0.87: drafting lines, not holograms), welding sparks, and the reach shown on selection.
import * as THREE from './vendor/three.js';

// one clock for the moving parts of these effects
export const HOLO = { t: { value: 0 } };

// (GC 0.87) a blueprint, not a hologram (Ramzies: a fine line between sci-fi and realism): pale drafting lines over a faint
// see-through wash, drawn normally (no glow, no scan lines)
export const BP = { ok: '#dcebf5', bad: '#ff7766', work: '#e3a85a' };
export function holoFill(color = BP.ok, opacity = 0.1) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
}
export function holoEdge(color = BP.ok, opacity = 0.85) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
}
export function tintHolo(fill, edge, color) { fill.color.set(color); edge.color.set(color); }

// the outline of a mesh, worked out once per shape
const EDGES = new WeakMap();
export function edgesOf(geo) { let e = EDGES.get(geo); if (!e) { e = new THREE.EdgesGeometry(geo, 28); EDGES.set(geo, e); } return e; }

// a model drawn as a hologram: every mesh gets a see-through twin and an outline. Returns what it added, to take off again
export function holoize(model, fill, edge) {
  const added = [];
  model.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.holo) return;
    const xs = [new THREE.LineSegments(edgesOf(o.geometry), edge)]; if (fill) xs.push(new THREE.Mesh(o.geometry, fill));
    for (const x of xs) { x.userData.holo = true; x.raycast = () => {}; x.castShadow = false; x.renderOrder = 2; }
    added.push([o, xs]);
  });
  for (const [o, xs] of added) o.add(...xs);
  return added;
}
export function unholoize(added) { for (const [o, xs] of added || []) o.remove(...xs); }

// a soft round dot, for sparks
let DOT = null;
function dot() {
  if (DOT) return DOT;
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return (DOT = new THREE.CanvasTexture(c));
}

// sparks: a pool of glowing points that fly, fall and cool from white through orange to nothing
export class Sparks {
  constructor(parent, max = 600) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.col = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.pos); geo.setAttribute('color', this.col); geo.setDrawRange(0, 0);
    this.mat = new THREE.PointsMaterial({ size: 0.12, map: dot(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    this.pts = new THREE.Points(geo, this.mat); this.pts.frustumCulled = false; this.pts.raycast = () => {}; this.pts.renderOrder = 3;
    parent.add(this.pts);
  }
  emit(x, y, z, vx, vy, vz, life) {
    if (this.n >= this.max) return;
    const i = this.n++, k = i * 3;
    this.p[k] = x; this.p[k + 1] = y; this.p[k + 2] = z; this.v[k] = vx; this.v[k + 1] = vy; this.v[k + 2] = vz; this.life[i] = life; this.age[i] = 0;
  }
  update(dt) {
    const P = this.p, V = this.v, pa = this.pos.array, ca = this.col.array;
    for (let i = 0; i < this.n; i++) {
      const k = i * 3;
      if ((this.age[i] += dt) >= this.life[i] || P[k + 1] < -0.2) {   // spent: the last one takes its place
        const j = --this.n, q = j * 3;
        for (let c = 0; c < 3; c++) { P[k + c] = P[q + c]; V[k + c] = V[q + c]; }
        this.life[i] = this.life[j]; this.age[i] = this.age[j]; i--; continue;
      }
      V[k + 1] -= 7 * dt; V[k] *= 1 - dt * 1.5; V[k + 2] *= 1 - dt * 1.5;
      P[k] += V[k] * dt; P[k + 1] += V[k + 1] * dt; P[k + 2] += V[k + 2] * dt;
      if (P[k + 1] < 0) { P[k + 1] = 0; V[k + 1] *= -0.3; }
    }
    for (let i = 0; i < this.n; i++) {
      const k = i * 3, f = 1 - this.age[i] / this.life[i];   // white hot, then orange, then red, then out
      pa[k] = P[k]; pa[k + 1] = P[k + 1]; pa[k + 2] = P[k + 2];
      ca[k] = 1.6 * f; ca[k + 1] = (0.35 + 0.9 * f * f) * f; ca[k + 2] = 0.45 * f * f * f;
    }
    this.pos.needsUpdate = this.col.needsUpdate = true; this.pts.geometry.setDrawRange(0, this.n);
  }
}

// a range dome: nearly clear, a bright rim where you look across it, rings drifting up it and a glow at its foot
export function domeMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color('#5fe8ff') }, uT: HOLO.t, uK: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vY = position.y;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uT; uniform float uK; varying vec3 vN; varying vec3 vV; varying float vY;
      void main() { float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float rim = pow(f, 3.0);
        float ring = smoothstep(0.93, 1.0, fract(vY * 5.0 - uT * 0.35)) * (1.0 - vY);
        float foot = smoothstep(0.12, 0.0, vY);
        float a = (0.04 + rim * 0.32 + ring * 0.16 + foot * 0.12) * uK;
        gl_FragColor = vec4(uCol * a * 1.3, a); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
}
export function domeGeo() { return new THREE.SphereGeometry(1, 56, 14, 0, Math.PI * 2, 0, Math.PI / 2); }

// a supply beam: a thin column of light rising off a building, bright at the bottom and fading out at the top
export function beamGeo() {
  const g = new THREE.CylinderGeometry(0.03, 0.03, 1, 6, 6, true); g.translate(0, 0.5, 0);
  const p = g.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const f = Math.pow(1 - p.getY(i), 1.6); c[i * 3] = f; c[i * 3 + 1] = f; c[i * 3 + 2] = f; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
export function beamMat(color) {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  m.color.set(color).multiplyScalar(2.2); return m;
}

// ---------------------------------------------------------------- bloom: the scene drawn off screen at full range, its brightest
// parts blurred at four sizes and laid back over it, then tone mapped to the screen
const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BRIGHT = `uniform sampler2D tIn; uniform vec2 uTx; uniform float uThr; varying vec2 vUv;
  void main() {
    vec3 c = 0.25 * (texture2D(tIn, vUv + uTx * vec2(-0.5, -0.5)).rgb + texture2D(tIn, vUv + uTx * vec2(0.5, -0.5)).rgb + texture2D(tIn, vUv + uTx * vec2(-0.5, 0.5)).rgb + texture2D(tIn, vUv + uTx * vec2(0.5, 0.5)).rgb);
    float l = max(c.r, max(c.g, c.b)), k = 0.35, s = clamp(l - uThr + k, 0.0, 2.0 * k); s = s * s / (4.0 * k + 1e-4);
    gl_FragColor = vec4(c * max(s, l - uThr) / max(l, 1e-4), 1.0); }`;
const BLUR = `uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tIn, vUv).rgb * 0.2270270270;
    c += (texture2D(tIn, vUv + uDir * 1.3846153846).rgb + texture2D(tIn, vUv - uDir * 1.3846153846).rgb) * 0.3162162162;
    c += (texture2D(tIn, vUv + uDir * 3.2307692308).rgb + texture2D(tIn, vUv - uDir * 3.2307692308).rgb) * 0.0702702703;
    gl_FragColor = vec4(c, 1.0); }`;
const MIX = `uniform sampler2D tS; uniform sampler2D t0; uniform sampler2D t1; uniform sampler2D t2; uniform sampler2D t3; uniform float uStr; varying vec2 vUv;
  void main() {
    vec3 b = texture2D(t0, vUv).rgb * 0.55 + texture2D(t1, vUv).rgb * 0.75 + texture2D(t2, vUv).rgb * 0.9 + texture2D(t3, vUv).rgb * 1.0;
    gl_FragColor = vec4(texture2D(tS, vUv).rgb + b * uStr, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export class Bloom {
  constructor(r) {
    this.r = r; this.on = true; this.strength = 0.5; this.threshold = 1.0; this.samples = -1;
    const pass = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false, defines: { NO_HGT: '' } });
    this.mBright = pass(BRIGHT, { tIn: { value: null }, uTx: { value: new THREE.Vector2() }, uThr: { value: 1 } }); this.mBright.toneMapped = false;
    this.mBlur = pass(BLUR, { tIn: { value: null }, uDir: { value: new THREE.Vector2() } }); this.mBlur.toneMapped = false;
    this.mMix = pass(MIX, { tS: { value: null }, t0: { value: null }, t1: { value: null }, t2: { value: null }, t3: { value: null }, uStr: { value: 0.5 } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mBright); this.quad.frustumCulled = false;
    this.qs = new THREE.Scene(); this.qs.add(this.quad); this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.size = new THREE.Vector2(); this.w = 0; this.h = 0;
  }
  targets(w, h, samples) {
    if (w === this.w && h === this.h && samples === this.samples) return;
    for (const t of [this.rtS, ...(this.A || []), ...(this.Bt || [])]) t?.dispose();
    this.w = w; this.h = h; this.samples = samples;
    const o = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.rtS = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples, depthBuffer: true });
    this.A = []; this.Bt = [];
    for (let i = 0; i < 4; i++) { const lw = Math.max(1, w >> (i + 1)), lh = Math.max(1, h >> (i + 1)); this.A.push(new THREE.WebGLRenderTarget(lw, lh, o)); this.Bt.push(new THREE.WebGLRenderTarget(lw, lh, o)); }
    this.T = new THREE.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), o);
  }
  pass(mat, to) { this.quad.material = mat; this.r.setRenderTarget(to); this.r.render(this.qs, this.qc); }
  render(scene, cam, samples = 4) {
    const r = this.r; r.getDrawingBufferSize(this.size);
    this.targets(this.size.x, this.size.y, samples);
    r.setRenderTarget(this.rtS); r.render(scene, cam);
    // the bright parts, at half size
    this.mBright.uniforms.tIn.value = this.rtS.texture; this.mBright.uniforms.uTx.value.set(1 / this.w, 1 / this.h); this.mBright.uniforms.uThr.value = this.threshold;
    this.pass(this.mBright, this.T);
    // blurred at four sizes, each from the one before
    let src = this.T;
    for (let i = 0; i < 4; i++) {
      const a = this.A[i], b = this.Bt[i], u = this.mBlur.uniforms;
      u.tIn.value = src.texture; u.uDir.value.set(1 / a.width, 0); this.pass(this.mBlur, a);
      u.tIn.value = a.texture; u.uDir.value.set(0, 1 / a.height); this.pass(this.mBlur, b);
      src = b;
    }
    const u = this.mMix.uniforms; u.tS.value = this.rtS.texture; u.t0.value = this.Bt[0].texture; u.t1.value = this.Bt[1].texture; u.t2.value = this.Bt[2].texture; u.t3.value = this.Bt[3].texture; u.uStr.value = this.strength;
    this.pass(this.mMix, null);
  }
  dispose() { for (const t of [this.rtS, this.T, ...(this.A || []), ...(this.Bt || [])]) t?.dispose(); this.w = this.h = 0; }
}
