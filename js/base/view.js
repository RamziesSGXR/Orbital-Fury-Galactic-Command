// The 3D view: a near-isometric camera you can rotate, the ground, the wire, every building and everyone walking about.
import * as THREE from './vendor/three.js';
import { C, B, ZONES, ZKEYS, UTIL, LAND, SLAB_LV } from './config.js';
import { dims, wingOf, PLAZA } from './sim.js';
import { BIOMES } from './site.js';
import { SCRUB_COL, loadBuildings, sharedGeo, makeMats, mergeStatic, buildModel, slabModel, makePerson, poseKit, makeForklift, makeTruck, makeLRV, makeTank, makeCrate, makeDropship, wrap } from './models.js';
const VMAKE = { lift: makeForklift, truck: makeTruck, lrv: makeLRV, tank: makeTank };
import { Noise } from './noise.js';
import { isLine, WALLS } from './net.js';
import { Crowd3D } from '../model3d.js';
import { surfScale, surf, water, KIND, LAND as SOIL } from '../surface.js';
import { groundSet, scanModel, fitScan } from '../scans.js';
import { WL } from './site.js';
import { HOLO, BP, holoFill, holoEdge, tintHolo, holoize, unholoize, Sparks, domeMat, domeGeo, beamGeo, beamMat, Bloom } from './fx.js';

// ---------------------------------------------------------------- terrain height, in every shader (0.17)
// Rather than lift every mesh by hand, the vertex stage adds the ground's height under each vertex (in world space) to
// everything drawn: buildings, roads, people, overlays and their shadows all sit on the ground and follow it. Meshes
// that carry their own height (the ground itself, the water, the sky) are built with the NO_HGT define. The heights live
// in a half-float texture, one texel per tile corner.
export const HG = { tex: new THREE.DataTexture(new Uint16Array(1), 1, 1, THREE.RedFormat, THREE.HalfFloatType), p: new THREE.Vector4(0, 0, 1, 0) };   // p: N, on, N + 1
HG.tex.magFilter = HG.tex.minFilter = THREE.LinearFilter; HG.tex.needsUpdate = true;
// copy a simulation's heights into the texture (a new size means a new texture underneath the same object)
HG.load = function (sim, box = null) {
  const M = sim.N + 1, h = sim.hgt; if (!h) { HG.p.y = 0; return; }
  if (HG.tex.image.width !== M) { HG.tex.dispose(); HG.tex.image = { data: new Uint16Array(M * M), width: M, height: M }; box = null; }
  const d = HG.tex.image.data, [x0, z0, x1, z1] = box ? [Math.max(0, box[0] - 1), Math.max(0, box[1] - 1), Math.min(M, box[2] + 2), Math.min(M, box[3] + 2)] : [0, 0, M, M];
  // the surface things stand on: the ground, or a bridge deck where one runs
  const dk = sim.deck; for (let z = z0; z < z1; z++) for (let x = x0, k = z * M + x0; x < x1; x++, k++) d[k] = THREE.DataUtils.toHalfFloat(dk?.size ? dk.get(k) ?? h[k] : h[k]);
  HG.tex.needsUpdate = true; HG.p.set(sim.N, 1, M, 0);
};
THREE.ShaderChunk.common += `
#ifndef NO_HGT
uniform sampler2D uHgt; uniform vec4 uHgtP;
float terrainH(vec2 w) { if (uHgtP.y < 0.5) return 0.0; vec2 uv = (w + uHgtP.x * 0.5 + 0.5) / uHgtP.z; return texture2D(uHgt, uv).r; }
#endif
`;
THREE.ShaderChunk.project_vertex = THREE.ShaderChunk.project_vertex.replace('mvPosition = modelViewMatrix * mvPosition;',
  '#ifndef NO_HGT\n\tvec4 hW = modelMatrix * mvPosition; hW.y += terrainH(hW.xz); mvPosition = viewMatrix * hW;\n#else\n\tmvPosition = modelViewMatrix * mvPosition;\n#endif');
THREE.ShaderChunk.worldpos_vertex = THREE.ShaderChunk.worldpos_vertex.replace('worldPosition = modelMatrix * worldPosition;',
  'worldPosition = modelMatrix * worldPosition;\n\t#ifndef NO_HGT\n\tworldPosition.y += terrainH(worldPosition.xz);\n\t#endif');
THREE.Material.prototype.onBeforeCompile = function (sh) { if (HG.tex) { sh.uniforms.uHgt = { value: HG.tex }; sh.uniforms.uHgtP = { value: HG.p }; } };

const TAU = Math.PI * 2;
const COVER_COL = { pw: '#ffd23a', wa: '#4fb4ff', se: '#c9a070', fu: '#c98bff' };     // (GC 0.86) power, water, sewage, fuel

export class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // a graphics driver can drop the 3D context (a black view under a working HUD): ask for it back and say so
    this.lost = false;
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; this.onLost?.(true); });
    canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.onLost?.(false); });
    this.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFShadowMap; this.q = 0; this.qMode = 'auto'; this.qT = 0; this.qN = 0;
    this.r.toneMapping = THREE.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.05;
    this.r.localClippingEnabled = true; this.bloom = new Bloom(this.r);     // (GC 0.86) buildings rise out of their holograms; lit things glow
    this.scene = new THREE.Scene();
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
    this.persp = new THREE.PerspectiveCamera(50, 1, 0.05, 700);   // photo mode: a free camera you can tilt down to ground level
    this.gcam = new THREE.PerspectiveCamera(30, 1, 0.5, 9000);   // the game's own camera
    this.cam = this.gcam; this.photo = false; this.dist = 18; this.distT = 18; this.tilt = 0.6; this.tiltT = 0.6;
    this.yaw = Math.PI / 4; this.yawT = this.yaw; this.pitch = 0.82; this.zoom = 9; this.zoomT = 9;
    this.target = new THREE.Vector3(0, 0, 2); this.ray = new THREE.Raycaster(); this.t = 0;
    const hemi = this.hemi = new THREE.HemisphereLight('#dfe9ff', '#6b5638', 1.1); this.scene.add(hemi);
    const sun = this.sun = new THREE.DirectionalLight('#fff1d6', 2.4);
    sun.position.set(-18, 30, 12); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    this.scene.add(sun); this.scene.add(sun.target);
    this.world = new THREE.Group(); this.scene.add(this.world);
    window.addEventListener('resize', () => this.resize()); this.resize();
  }
  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.r.setSize(w, h, false); this.aspect = w / h; this.w = w; this.h = h;
  }

  // ---------------------------------------------------------------- a base to show
  attach(sim, life) {
    this.sim = sim; this.life = life; this.N = sim.N;
    this.world.clear();
    this.chunks = new Map(); this.bm = new Map(); this.pm = new Map(); this.fm = new Map(); this.cm = []; this.vm = new Map(); this.smoke = []; this.roadsV = -1;
    this.ghostKey = ''; this.scrubKey = null; this.scrubM = null; this.zoneKey = null; this.zoneM = null; this.parcelKey = ''; this.parcelG = null;
    this.slabG = null; this.rampM = null; this.rampKey = null; this.netM_sel = null; this.netM_lens = null;     // (GC 0.87, 0.88) gone with the old world
    this.buildGround();
    this.setFaction(sim.faction);
  }
  setFaction(f) {
    if (this.m) { for (const t of this.m.tex) t.dispose(); if (this.m._bld) for (const g of this.m._bld.values()) g.dispose(); }
    this.m = makeMats(f);
    loadBuildings(() => { if (this.sim && this.faction) this.setFaction(this.faction); });     // (when the models have come, everything is built again from them)
    for (const g of this.bm.values()) this.world.remove(g); this.bm.clear();
    for (const c of this.chunks?.values() || []) { this.world.remove(c.group); for (const m of c.group.children) m.geometry.dispose(); } this.chunks = new Map();
    this.pm.clear(); if (this.crowd) for (const c of Object.values(this.crowd)) for (const im of c.ims) { this.world.remove(im); im.dispose(); } this.crowd = {};
    this.dressFolk();
    for (const g of this.vm.values()) this.world.remove(g); this.vm.clear();
    this.ghostKey = '';
    this.faction = f; this.roadsV = -1;   // the gate sign carries the base's name
    this.thumbs = new Map(); if (this.infoMesh) { this.world.remove(this.infoMesh); this.infoMesh = null; }
    this.resG = null; this.routeG = null; this.packets = null;
  }

  // ---------------------------------------------------------------- pictures of buildings for the build menu: each type is
  // drawn once, from the game's own angle, into an image
  thumb(type, std = 2) {
    const tk = type + ':' + std; this.thumbs ||= new Map(); if (this.thumbs.has(tk)) return this.thumbs.get(tk);
    if (!this.m || this.lost) return null;
    const W = 160, H = 112;
    if (!this.th) {
      const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#dfe9ff', '#6b5638', 1.3));
      const sun = new THREE.DirectionalLight('#fff1d6', 2.2); sun.position.set(-6, 10, 5); sc.add(sun);
      const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
      this.th = { sc, rt, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100), px: new Uint8Array(W * H * 4), cv: Object.assign(document.createElement('canvas'), { width: W, height: H }) };
    }
    const { sc, rt, cam, px, cv } = this.th;
    const g = buildModel(type, this.m, false, std < 2 ? { std, w: B[type].w, d: B[type].d } : null); sc.add(g);
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2 || 1;
    const dir = new THREE.Vector3(Math.sin(Math.PI / 4), 0.82, Math.cos(Math.PI / 4)).normalize();
    cam.position.copy(c).addScaledVector(dir, 30); cam.lookAt(c);
    const a = W / H, k = r * 1.02; Object.assign(cam, { left: -k * a, right: k * a, top: k, bottom: -k }); cam.updateProjectionMatrix();
    const cc = new THREE.Color(); this.r.getClearColor(cc); const ca = this.r.getClearAlpha(), sh = this.r.shadowMap.enabled;
    const hOn = HG.p.y; HG.p.y = 0;   // thumbnails stand on flat ground
    this.r.shadowMap.enabled = false; this.r.setRenderTarget(rt); this.r.setClearColor(0x000000, 0); this.r.clear(); this.r.render(sc, cam); HG.p.y = hOn;
    this.r.readRenderTargetPixels(rt, 0, 0, W, H, px); this.r.setRenderTarget(null); this.r.setClearColor(cc, ca); this.r.shadowMap.enabled = sh;
    sc.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    const x = cv.getContext('2d'), im = x.createImageData(W, H);
    for (let y = 0; y < H; y++) im.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);   // the GPU's rows run bottom-up
    x.putImageData(im, 0, 0); const url = cv.toDataURL(); this.thumbs.set(tk, url); return url;
  }

  // ---------------------------------------------------------------- info views: every building tinted, one colour per
  // building, like a city builder's data overlay. cols: Map of building id -> colour, or null to go back to the base itself
  setInfo(cols, ghost = false) {
    this.info = cols || null;
    if (!this.info) { if (this.infoMesh) this.infoMesh.visible = false; return; }
    const n = cols.size;
    if (!this.infoMesh || this.infoMesh.userData.cap < n) {
      if (this.infoMesh) { this.world.remove(this.infoMesh); this.infoMesh.dispose(); }
      const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
      this.infoMesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }), Math.max(64, n * 2)); this.infoMesh.renderOrder = 3;
      this.infoMesh.userData.cap = Math.max(64, n * 2); this.infoMesh.castShadow = false; this.infoMesh.frustumCulled = false;
      this.world.add(this.infoMesh);
    }
    const im = this.infoMesh, o = new THREE.Object3D(), col = new THREE.Color(); let i = 0;
    for (const [id, c] of cols) {
      const b = this.sim.byId(id), g = this.bm.get(id); if (!b) continue;
      o.position.set(this.wx(b.x + b.w / 2), 0, this.wx(b.z + b.d / 2)); o.scale.set(Math.max(0.3, b.w - 0.04), Math.max(0.25, (g?.userData.top || 0.8) * (b.done ? 1 : b.prog)) + 0.04, Math.max(0.3, b.d - 0.04)); o.updateMatrix();
      im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.set(c)); i++;
    }
    im.count = i; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.visible = true;
    im.material.opacity = ghost ? 0.2 : 0.5;   // a tint over the real building, not a block in its place
  }
  setElev(on) { (this.uElev ||= { value: 0 }).value = on ? 1 : 0; }
  // the RESOURCES view: Biofuel seeps (violet), ore (rust), water and rock marked on the ground, crystals showing
  showResources(on) {
    if (on && !this.resG) {
      const N = this.N, T = this.sim.terr, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N);
      for (let i = 0; i < N * N; i++) { const t = T ? T[i] : 0, col = t === 3 ? [170, 80, 255, 200] : t === 4 ? [230, 120, 60, 200] : t === 1 ? [70, 150, 255, 90] : t === 2 ? [40, 40, 44, 120] : [0, 0, 0, 0]; im.data.set(col, i * 4); }
      g.putImageData(im, 0, 0);
      const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
      this.resG = new THREE.Mesh(new THREE.PlaneGeometry(N, N), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      this.resG.rotation.x = -Math.PI / 2; this.resG.position.y = 0.05; this.resG.renderOrder = 2; this.world.add(this.resG);
    }
    if (this.resG) this.resG.visible = !!on;
    this.crystalsOn = !!on; if (this.crystals) this.crystals.visible = !!on;
  }
  // the SUPPLY ROUTES view: an arc for every route goods take, in the good's colour, with packets running along it.
  // routes: [{ a: [x, z], b: [x, z], col, live }]; live ones (a vehicle on it now) are brighter and quicker
  setRoutes(routes) {
    if (this.routeG) { this.world.remove(this.routeG); this.routeG.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); this.routeG = null; }
    if (!routes || !routes.length) return;
    const G = this.routeG = new THREE.Group(), pk = []; this.world.add(G);
    for (const r of routes) {
      const a = new THREE.Vector3(this.wx(r.a[0]), 0.4, this.wx(r.a[1])), b = new THREE.Vector3(this.wx(r.b[0]), 0.4, this.wx(r.b[1])), d = a.distanceTo(b);
      const mid = a.clone().add(b).multiplyScalar(0.5); mid.y = 0.6 + d * 0.25;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b), pts = curve.getPoints(24);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: r.col, transparent: true, opacity: r.live ? 0.95 : 0.5 }));
      line.renderOrder = 3; G.add(line);
      const n = Math.max(1, Math.round(d / 4)); for (let i = 0; i < n; i++) pk.push({ curve, t: i / n, sp: (r.live ? 0.5 : 0.22) * 6 / Math.max(6, d), col: r.col });
    }
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), pk.length), col = new THREE.Color();
    pk.forEach((p, i) => im.setColorAt(i, col.set(p.col))); im.frustumCulled = false; G.add(im);
    this.packets = { im, pk };
  }
  routeTick(dt) {
    const P = this.packets; if (!P || !this.routeG) return;
    const o = new THREE.Object3D();
    P.pk.forEach((p, i) => { p.t = (p.t + p.sp * dt) % 1; o.position.copy(p.curve.getPoint(p.t)); o.updateMatrix(); P.im.setMatrixAt(i, o.matrix); });
    P.im.instanceMatrix.needsUpdate = true;
  }
  // where the edges of the screen meet the ground, in tiles: the camera's footprint, for the minimap
  footprint() {
    const out = [], p = new THREE.Vector3(), pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { this.ray.setFromCamera(new THREE.Vector2(x, y), this.cam); if (this.ray.ray.intersectPlane(pl, p)) out.push([p.x + this.N / 2, p.z + this.N / 2]); }
    return out;
  }
  wx(x) { return x - this.N / 2; }

  // ---------------------------------------------------------------- the ground (0.18): chunks, coloured in the shader
  // The section is drawn as one mesh per parcel, fine (a vertex per cell corner) where the camera is looking and coarse
  // (one per five cells) elsewhere, with skirts so the joins never gape. What the ground looks like is worked out per
  // pixel from two small data textures (one texel per cell: sea bed, rock, wetness, seeps and ore; and the four paints)
  // plus noise, slope and height, so it stays crisp however close the camera gets. Cliffs get a triplanar rock grain.
  paintTiles(x0, z0, x1, z1) {
    const N = this.N, s = this.sim, T = s.terr, A = this.gndA.image.data, Bd = this.gndB.image.data;
    x0 = Math.max(0, x0 - 3); z0 = Math.max(0, z0 - 3); x1 = Math.min(N, x1 + 3); z1 = Math.min(N, z1 + 3);
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
      const i = z * N + x, t = T ? T[i] : 0, k = i * 4;
      let wet = 0; if (T && t !== 1) for (let j = -3; j <= 3 && wet < 1; j++) for (let ii = -3; ii <= 3; ii++) { const xx = x + ii, zz = z + j; if (xx >= 0 && zz >= 0 && xx < N && zz < N && T[zz * N + xx] === 1) { wet = Math.max(wet, 1 - Math.hypot(ii, j) / 4); } }
      A[k] = t === 1 ? 255 : 0; A[k + 1] = t === 2 ? 255 : 0; A[k + 2] = wet * 255; A[k + 3] = t === 3 ? 255 : t === 4 ? 128 : 0;
      const pt = s.paint?.[i] || 0; Bd[k] = pt === 1 ? 255 : 0; Bd[k + 1] = pt === 2 ? 255 : 0; Bd[k + 2] = pt === 3 ? 255 : 0; Bd[k + 3] = pt === 4 ? 255 : 0;
    }
    this.gndA.needsUpdate = this.gndB.needsUpdate = true;
  }
  // one parcel's mesh at a level of detail: positions on the heights, normals from the height field, skirts round it
  chunkGeo(px, pz, step) {
    const s = this.sim, P = LAND.PARCEL, n = Math.ceil(P / step) + 1, x0 = px * P, z0 = pz * P, N = this.N;
    const cx = i => Math.min(x0 + i * step, x0 + P), H1 = (x, z) => s.hgt ? s.hv(Math.max(0, Math.min(N, x)), Math.max(0, Math.min(N, z))) : 0;
    // a coarse chunk takes the mean of the ground each vertex stands for: picking single points made hills vanish and the sea spread when zoomed out
    const r = step > 1 ? 2 : 0, H = r ? (x, z) => { let a = 0; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) a += H1(x + i, z + j); return a / 25; } : H1;
    const pos = [], nor = [], idx = [];
    const vert = (x, z, y) => { pos.push(x - N / 2, y, z - N / 2); const dx = H(x + 1, z) - H(x - 1, z), dz = H(x, z + 1) - H(x, z - 1), l = Math.hypot(dx, 2, dz); nor.push(-dx / l, 2 / l, -dz / l); return pos.length / 3 - 1; };
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) vert(cx(i), cx(j) - x0 + z0, H(cx(i), cx(j) - x0 + z0));
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; idx.push(a, c, b, b, c, d); }
    // skirts: a curtain hanging from every edge vertex, so a coarse neighbour never shows a crack
    const edge = (list) => { const top = list, bot = list.map(k => vert(pos[k * 3] + N / 2, pos[k * 3 + 2] + N / 2, pos[k * 3 + 1] - 3)); for (let k = 0; k < top.length - 1; k++) idx.push(top[k], bot[k], top[k + 1], top[k + 1], bot[k], bot[k + 1], top[k], top[k + 1], bot[k], top[k + 1], bot[k + 1], bot[k]); };
    const row = j => [...Array(n).keys()].map(i => j * n + i), col = i => [...Array(n).keys()].map(j => j * n + i);
    edge(row(0)); edge(row(n - 1)); edge(col(0)); edge(col(n - 1));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
    g.computeBoundingSphere(); return g;
  }
  // which parcels get the fine mesh: those near what the camera is looking at
  chunkLOD(force = false) {
    const P = LAND.PARCEL, G = LAND.GRID, tx = this.target.x + this.N / 2, tz = this.target.z + this.N / 2, R = this.zoom * 2.2 + P;
    for (let pz = 0; pz < G; pz++) for (let px = 0; px < G; px++) {
      const c = this.gch[pz * G + px], want = this.zoom < 160 && Math.hypot(px * P + P / 2 - tx, pz * P + P / 2 - tz) < R ? 1 : 5;
      if (c.step === want && !force && !c.dirty) continue;
      c.mesh.geometry.dispose(); c.mesh.geometry = this.chunkGeo(px, pz, want); c.step = want; c.dirty = false;
    }
  }
  // the ground moved inside a box: mark those parcels for rebuilding, at their present detail
  groundHeights(box = null) {
    const P = LAND.PARCEL, G = LAND.GRID;
    for (let pz = 0; pz < G; pz++) for (let px = 0; px < G; px++) {
      if (box && (px * P > box[2] + 1 || px * P + P < box[0] - 1 || pz * P > box[3] + 1 || pz * P + P < box[1] - 1)) continue;
      this.gch[pz * G + px].dirty = true;
    }
    this.chunkLOD(); HG.load(this.sim, box); this.hgtSeen = this.sim.hgtV;
  }
  // the sea, one sheet at the waterline; seeps get violet crystals (in the RESOURCES view), near your land only
  syncTerrain() {
    const N = this.N, s = this.sim, T = s.terr, bio = s.site ? BIOMES[s.site.biome] : null, nz = this.gnd.nz, mx = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (const o of this.terrObjs || []) { this.world.remove(o); o.geometry?.dispose(); }
    this.terrObjs = []; const add = o => { this.terrObjs.push(o); this.world.add(o); };
    if (!T || !bio) return;
    const wm = this.waterMat ||= water(new THREE.MeshStandardMaterial({ color: new THREE.Color(...bio.sea.map(c => c / 255)), roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.86, defines: { STANDARD: '', NO_HGT: '' } }));     // (GC 0.90: moving ripples)
    const wg = new THREE.PlaneGeometry(N, N); wg.rotateX(-Math.PI / 2); const wi = new THREE.Mesh(wg, wm); wi.position.y = WL + 0.03; wi.receiveShadow = true; add(wi);
    const W = s.win ? s.win(LAND.PARCEL) : [0, 0, N, N], dp = [];
    for (let z = W[1]; z < W[3]; z++) for (let x = W[0]; x < W[2]; x++) { const i = z * N + x; if (T[i] === 3 && nz.v(i * 0.37, 5) > 0.72) dp.push(i); }
    if (dp.length) {
      const cm = new THREE.MeshStandardMaterial({ color: '#2a1838', emissive: '#7a3cff', emissiveIntensity: 0.5, roughness: 0.2 });
      const ci = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.12), cm, dp.length);
      dp.forEach((i, k) => { const j = nz.v(i * 0.7, 9); q.setFromEuler(new THREE.Euler(j, j * 3, 0)); mx.compose(new THREE.Vector3(this.wx(i % N + 0.2 + j * 0.6), 0.08, this.wx(((i / N) | 0) + 0.3 + j * 0.4)), q, new THREE.Vector3(1, 1.6, 1)); ci.setMatrixAt(k, mx); });
      ci.visible = !!this.crystalsOn; add(ci); this.crystals = ci;
    }
  }
  buildGround() {
    this.crystals = null;
    const N = this.N, s = this.sim, nz = new Noise(s.seed + 3), G = LAND.GRID;
    const bio = s.site ? BIOMES[s.site.biome] : null, hue = bio ? bio.ground : [[156, 128, 92], [142, 112, 84], [120, 118, 98], [164, 120, 84]][s.seed % 4];
    this.gnd = { nz, hue, bio };
    const data = () => { const t = new THREE.DataTexture(new Uint8Array(N * N * 4), N, N, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.LinearFilter; return t; };
    this.gndA = data(); this.gndB = data();
    this.paintTiles(0, 0, N, N);
    HG.load(s);
    const lin = c => new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);
    const U = { uGA: { value: this.gndA }, uGB: { value: this.gndB }, uN: { value: N }, uHue: { value: lin(hue) }, uBed: { value: lin((bio?.sea || [70, 110, 150]).map(v => v * 0.7)) }, uElev: this.uElev ||= { value: 0 }, uGrid: this.uGrid ||= { value: 0 }, uLandK: { value: SOIL[s.site?.biome] ?? KIND.soil } };
    // (GC 0.92, Ramzies: "GTA V, not PlayStation 2") the base's land photoscanned too: its biome's two materials (js/scans.js)
    const SC = this.scU = { tScA: { value: null }, tScAn: { value: null }, tScB: { value: null }, tScBn: { value: null }, uScOn: { value: 0 }, uScT: { value: new THREE.Vector2(15, 3) }, uScMA: { value: new THREE.Vector3(0.2, 0.2, 0.2) }, uScMB: { value: new THREE.Vector3(0.2, 0.2, 0.2) }, uScK: { value: new THREE.Vector2(0.6, (this.q ?? 0) >= 3 ? 0 : 1) } };
    Object.assign(U, SC);
    groundSet(s.site?.biome || 'steppe', true).then((g) => { if (!g) return; SC.tScA.value = g.a; SC.tScAn.value = g.an; SC.tScB.value = g.b; SC.tScBn.value = g.bn; SC.uScT.value.set(g.ta, g.tb); SC.uScMA.value.set(...g.ma); SC.uScMB.value.set(...g.mb); SC.uScK.value.x = g.hue; SC.uScOn.value = 1; });
    const gm = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }); gm.defines = { STANDARD: '', NO_HGT: '', GC_NOSURF: '', GC_LAND: '' };     // (GC 0.70: the ground has its own texture, not a model's surface detail; GC 0.90: but the land's grit, pebbles and cracks, close up)
    gm.polygonOffset = true; gm.polygonOffsetFactor = 2; gm.polygonOffsetUnits = 6;   // the ground gives way to whatever lies on it
    gm.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTpW; varying vec3 vTpN;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTpW = (modelMatrix * vec4(transformed, 1.0)).xyz; vTpN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (uScOn > 0.5 && uScK.y > 0.5 && scAmt > 0.0) {     // (GC 0.92) the scans' normals, on the land's own frame
    vec2 sm = vTpW.xz * GC_SCALE; vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition); vec2 st0 = dFdx(sm), st1 = dFdy(sm);
    vec3 N = normal, q1p = cross(q1, N), q0p = cross(N, q0), T = q1p * st0.x + q0p * st1.x, Bt = q1p * st0.y + q0p * st1.y;
    float dt = max(dot(T, T), dot(Bt, Bt)), sc = dt == 0.0 ? 0.0 : inversesqrt(dt);
    normal = normalize(mix(N, mat3(T * sc, Bt * sc, N) * scN, scAmt));
  }`).replace('#include <common>', `#include <common>
varying vec3 vTpW; varying vec3 vTpN;
uniform sampler2D uGA; uniform sampler2D uGB; uniform float uN; uniform vec3 uHue; uniform vec3 uBed; uniform float uElev; uniform float uGrid; uniform float uLandK;
uniform sampler2D tScA; uniform sampler2D tScAn; uniform sampler2D tScB; uniform sampler2D tScBn; uniform float uScOn; uniform vec2 uScT; uniform vec3 uScMA; uniform vec3 uScMB; uniform vec2 uScK; vec3 scN = vec3(0.0, 0.0, 1.0); float scAmt = 0.0;
float tpH(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5); float b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5); float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5); float d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5); return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
float tpGrain(vec3 p, vec3 n) { vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z); return tpH(p.zy * 3.1) * w.x + tpH(p.xz * 3.1) * w.y + tpH(p.xy * 3.1) * w.z; }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
{ vec2 w = vTpW.xz, cuv = (w + uN * 0.5) / uN; float px = max(fwidth(w).x, fwidth(w).y);   // world units to a pixel: fine detail fades out before it can shimmer
  // the per-cell data is read warped by noise and blurred over a cell and a half, so nothing shows the grid
  cuv += (vec2(tpH(w * 0.8), tpH(w * 0.8 + 31.7)) - 0.5) * 1.8 / uN; float o = 0.75 / uN;
  vec4 A = (texture2D(uGA, cuv) * 2.0 + texture2D(uGA, cuv + vec2(o, 0)) + texture2D(uGA, cuv - vec2(o, 0)) + texture2D(uGA, cuv + vec2(0, o)) + texture2D(uGA, cuv - vec2(0, o))) / 6.0;
  vec4 P = (texture2D(uGB, cuv) * 2.0 + texture2D(uGB, cuv + vec2(o, 0)) + texture2D(uGB, cuv - vec2(o, 0)) + texture2D(uGB, cuv + vec2(0, o)) + texture2D(uGB, cuv - vec2(0, o))) / 6.0; float n1 = tpH(w * 0.035) * 0.55 + tpH(w * 0.11) * 0.3 + tpH(w * 0.5) * 0.15, n2 = mix(tpH(w * 1.9), 0.5, smoothstep(0.2, 0.5, px)), gr = mix(tpGrain(vTpW, vTpN) * 0.6 + tpGrain(vTpW * 3.7, vTpN) * 0.4, 0.5, smoothstep(0.08, 0.25, px));
  vec3 col = uHue * (0.78 + n1 * 0.44) * (0.96 + n2 * 0.08);
  // variety: warm bare patches, darker growth, grey gravel, and a fine speckle, each on its own scale
  col = mix(col, col * vec3(1.14, 1.04, 0.88), smoothstep(0.45, 0.72, tpH(w * 0.011 + 3.0)) * 0.55);
  col = mix(col, col * vec3(0.74, 0.86, 0.7), smoothstep(0.5, 0.78, tpH(w * 0.027 + 11.0)) * 0.6);
  col = mix(col, vec3(dot(col, vec3(0.333))) * 0.84, smoothstep(0.6, 0.8, tpH(w * 0.06 + 40.0)) * 0.5);
  col *= 0.92 + 0.16 * mix(tpH(w * 5.0), 0.5, smoothstep(0.07, 0.18, px));
  col *= 0.95 + clamp(vTpW.y * 0.006, -0.1, 0.18);                                             // drier and paler higher up
  col = mix(col, uHue * vec3(0.52, 0.5, 0.42), A.b * 0.45);                                       // mud by the water
  col = mix(col, col * vec3(0.86, 0.8, 0.94), smoothstep(0.6, 0.85, A.a) * 0.6);                              // Biofuel seeps stain it
  col = mix(col, col * vec3(0.98, 0.84, 0.74), smoothstep(0.2, 0.4, A.a) * (1.0 - smoothstep(0.6, 0.85, A.a)) * 0.6);   // ore rusts it
  col = mix(col, vec3(0.83, 0.74, 0.55) * (0.85 + n1 * 0.3), P.r * 0.85);                          // sand
  col = mix(col, vec3(0.66, 0.57, 0.42) * (0.85 + n1 * 0.3), P.g * 0.85);                          // dry ground
  col = mix(col, vec3(0.32, 0.46, 0.2) * (0.8 + n1 * 0.4 + n2 * 0.1), P.b * 0.85);                 // lush grass
  col = mix(col, vec3(0.42, 0.32, 0.23) * (0.85 + n1 * 0.3), P.a * 0.85);                          // dirt
  float steep = 1.0 - clamp(vTpN.y, 0.0, 1.0), rk = max(A.g * 0.8, smoothstep(0.3, 0.62, steep));
  col = mix(col, uHue * 0.5 * (0.6 + gr * 0.7), rk);                                               // bare rock: cliffs and high rock
  col = mix(col, uBed * (0.9 + n2 * 0.2), smoothstep(0.03, -0.3, vTpW.y));                          // the bed under the water, by depth
  if (uScOn > 0.5 && uScK.y > 0.5) {   // (GC 0.92) photoscanned: the biome's main material, its second on dry ground and dirt, each at two sizes turned across each other
    vec2 m = vTpW.xz * GC_SCALE; mat2 R = mat2(0.8, 0.6, -0.6, 0.8);
    vec2 a1 = m / uScT.x, a2 = R * m / (uScT.x * 2.3) + 0.37, b1 = m / uScT.y, b2 = R * m / (uScT.y * 2.1) + 0.61;
    float ta = smoothstep(0.3, 0.7, tpH(m * 0.021 + 3.0)), tb = smoothstep(0.3, 0.7, tpH(m * 0.033 + 7.0));
    vec3 SA = mix(texture2D(tScA, a1).rgb, texture2D(tScA, a2).rgb, ta), SB = mix(texture2D(tScB, b1).rgb, texture2D(tScB, b2).rgb, tb);
    vec3 n2a = texture2D(tScAn, a2).rgb * 2.0 - 1.0, n2b = texture2D(tScBn, b2).rgb * 2.0 - 1.0;
    vec3 An = mix(texture2D(tScAn, a1).rgb * 2.0 - 1.0, vec3(transpose(R) * n2a.xy, n2a.z), ta), Bn = mix(texture2D(tScBn, b1).rgb * 2.0 - 1.0, vec3(transpose(R) * n2b.xy, n2b.z), tb);
    vec3 L3 = vec3(0.3, 0.59, 0.11); float lg = dot(col, L3);
    float wb = smoothstep(0.42, 0.78, tpH(m * 0.045 + 9.0) * 0.6 + tpH(m * 0.17 + 2.0) * 0.25 + (P.g + P.a) * 0.45);
    vec3 S = mix(SA, SB, wb), M = mix(uScMA, uScMB, wb);
    vec3 kept = col * S / max(M, vec3(0.02)), own = S * lg / max(dot(M, L3), 0.02);
    scAmt = smoothstep(0.55, 0.85, vTpN.y) * (1.0 - smoothstep(0.0, -0.4, vTpW.y)) * (1.0 - 0.6 * A.b) * (1.0 - uElev);
    col = mix(col, mix(kept, own, uScK.x), scAmt);
    scN = normalize(mix(An, Bn, wb));
  }
  #ifdef GC_TEX
  { // (GC 0.90) the ground close up: the biome's own (sand, snow, grass, ash, else soil), and where sand (12) or grass (14) or dry
    // ground (8) is painted on it, that one over it; not on cliffs, under water or on mud
    float k2 = P.r >= P.b && P.r >= max(P.g, P.a) ? 12.0 : P.b >= max(P.g, P.a) ? 14.0 : 8.0, t2 = max(P.r, max(P.b, max(P.g, P.a))) * 0.85;
    col = gcLand2(col, vTpW.xz * GC_SCALE, smoothstep(0.55, 0.85, vTpN.y) * (1.0 - smoothstep(0.0, -0.4, vTpW.y)) * (1.0 - 0.6 * A.b), uLandK, k2, t2); }
  #endif
  col *= 1.0 + clamp(dot(vTpN.xz, vec2(-0.6, -0.8)) * 2.2, -0.22, 0.2);                             // hillshade: slopes read even on snow
  if (uElev > 0.5) {                                                                                // the ELEVATION view: a height ramp and contours
    float t = clamp((vTpW.y + 1.0) / 26.0, 0.0, 1.0);
    vec3 ramp = t < 0.25 ? mix(vec3(0.16, 0.42, 0.3), vec3(0.45, 0.62, 0.25), t * 4.0) : t < 0.5 ? mix(vec3(0.45, 0.62, 0.25), vec3(0.85, 0.75, 0.3), t * 4.0 - 1.0) : t < 0.75 ? mix(vec3(0.85, 0.75, 0.3), vec3(0.72, 0.38, 0.2), t * 4.0 - 2.0) : mix(vec3(0.72, 0.38, 0.2), vec3(0.95, 0.95, 0.95), t * 4.0 - 3.0);
    if (vTpW.y < 0.0) ramp = vec3(0.12, 0.25, 0.45);
    col = mix(col, ramp, 0.72);
    float v1 = vTpW.y / 0.625, v2 = vTpW.y / 3.125;                                                 // a line every 5 m, a heavy one every 25 m
    float l1 = 1.0 - smoothstep(0.0, 1.4 * fwidth(v1), abs(fract(v1 - 0.5) - 0.5)), l2 = 1.0 - smoothstep(0.0, 2.2 * fwidth(v2), abs(fract(v2 - 0.5) - 0.5));
    col = mix(col, vec3(0.05), max(l1 * 0.3 * (1.0 - smoothstep(0.3, 0.6, fwidth(v1))), l2 * 0.6));
  }
  if (uGrid > 0.5) { vec2 gd = abs(fract(w + uN * 0.5 - 0.5) - 0.5) / max(fwidth(w), vec2(1e-5)); col = mix(col, vec3(0.62, 1.0, 0.72), (1.0 - min(min(gd.x, gd.y), 1.0)) * 0.3 * (1.0 - smoothstep(0.12, 0.4, px))); }
  diffuseColor.rgb *= col; }`);
    };
    this.gmat = gm;
    const grp = new THREE.Group(); this.gch = [];
    for (let pz = 0; pz < G; pz++) for (let px = 0; px < G; px++) { const m = new THREE.Mesh(new THREE.BufferGeometry(), gm); m.receiveShadow = true; grp.add(m); this.gch.push({ mesh: m, step: 0, dirty: true }); }
    this.world.add(grp); this.ground = grp;
    this.chunkLOD(true); this.hgtSeen = s.hgtV; this.paintSeen = s.paintV; this.terrSeen = s.terrV; s.dirtyBox = null;
    // the land beyond the wire
    const oc = document.createElement('canvas'); oc.width = oc.height = 256; const og = oc.getContext('2d'), oi = og.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const n = nz.fbm(x / 30 + 50, y / 30, 4), i = (y * 256 + x) * 4; oi.data[i] = hue[0] * (0.62 + n * 0.35); oi.data[i + 1] = hue[1] * (0.62 + n * 0.35); oi.data[i + 2] = hue[2] * (0.62 + n * 0.35); oi.data[i + 3] = 255; }
    og.putImageData(oi, 0, 0); const ot = new THREE.CanvasTexture(oc); ot.wrapS = ot.wrapT = THREE.RepeatWrapping; ot.repeat.set(N / 40 + 6, N / 40 + 6); ot.colorSpace = THREE.SRGBColorSpace;
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(N * 4 + 200, N * 4 + 200), new THREE.MeshStandardMaterial({ map: ot, roughness: 1, defines: { STANDARD: '', NO_HGT: '' } }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; outer.receiveShadow = true; this.world.add(outer);
    const sky = new THREE.Color(hue[0] / 255 * 0.35 + 0.36, hue[1] / 255 * 0.35 + 0.43, hue[2] / 255 * 0.35 + 0.56);   // a pale blue haze, warmed by the planet's dust
    this.skyDay = sky.clone(); this.skyNight = new THREE.Color('#0a0f1e'); this.scene.background = sky.clone(); this.scene.fog = new THREE.Fog(sky.clone(), 140, 300 + N);
    // rocks and hills
    const rock = surf(new THREE.MeshStandardMaterial({ color: new THREE.Color(hue[0] / 340, hue[1] / 340, hue[2] / 340), roughness: 1, flatShading: true }), KIND.rock);     // (GC 0.90: rock, with lichen)
    const rg = new THREE.DodecahedronGeometry(1, 0), rocks = new THREE.InstancedMesh(rg, rock, 160), mx = new THREE.Matrix4(), q = new THREE.Quaternion();
    let n = 0, k = 1;
    while (n < 160) {
      k++; const a = nz.v(k * 1.7, 3) * TAU * 3, r = N / 2 + 3 + nz.v(5, k * 1.3) * 45, x = Math.cos(a) * r, z = Math.sin(a) * r, sc = 0.3 + nz.v(k, k) * 1.4;
      if (Math.abs(x) < N / 2 + 2 && Math.abs(z) < N / 2 + 2) continue;
      if (Math.abs(x) < 3 && z > N / 2) continue;   // keep the road out clear
      q.setFromEuler(new THREE.Euler(a, a * 2, 0)); mx.compose(new THREE.Vector3(x, sc * 0.3, z), q, new THREE.Vector3(sc, sc * 0.7, sc)); rocks.setMatrixAt(n++, mx);
    }
    rocks.castShadow = rocks.receiveShadow = true; this.world.add(rocks);
    this.syncTerrain();
    // rock spires on the skyline, fading into the haze
    const sg = new THREE.ConeGeometry(1, 1, 5), spires = new THREE.InstancedMesh(sg, rock, 70);
    for (let i = 0; i < 70; i++) {
      const a = nz.v(i * 2.3, 11) * TAU * 2, r = N / 2 + 14 + nz.v(11, i * 1.9) * 70, h = 4 + nz.v(i, i * 0.7) * 14, w = 1.2 + nz.v(i * 0.3, 4) * 2.6;
      q.setFromEuler(new THREE.Euler((nz.v(i, 1) - 0.5) * 0.25, a, (nz.v(1, i) - 0.5) * 0.25)); mx.compose(new THREE.Vector3(Math.cos(a) * r, h / 2 - 0.3, Math.sin(a) * r), q, new THREE.Vector3(w, h, w)); spires.setMatrixAt(i, mx);
    }
    spires.castShadow = true; this.world.add(spires);
    // (GC 0.92) the rocks and spires are scanned boulders and cliffs once they have come (their far forms: the base is seen from afar)
    if ((this.q ?? 0) < 3) scanModel('rock_flat').then((near) => near && scanModel('rock_flat_far').then((far) => { if (!far) return; rocks.geometry = fitScan(far, 'ball'); rocks.material = near.mats; }));
    if ((this.q ?? 0) < 3) scanModel('rock_spire').then((near) => near && scanModel('rock_spire_far').then((far) => { if (!far) return; spires.geometry = fitScan(far, 'cone'); spires.material = near.mats; }));
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * TAU + nz.v(i, 9), r = N / 2 + 40 + nz.v(9, i) * 60, h = 10 + nz.v(i * 3, 2) * 22;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(h * 1.6, h, 6), rock); hill.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); hill.rotation.y = a; this.world.add(hill);
    }
    this.hes = new THREE.MeshStandardMaterial({ color: '#8c8f88', roughness: 0.9 }); this.hesTop = new THREE.MeshStandardMaterial({ color: '#41464a', roughness: 0.8 });   // concrete perimeter wall, dark cap and buttresses
    const hes = this.hes, mx2 = mx; void mx2;
    const wood = new THREE.MeshStandardMaterial({ color: '#5a5650', roughness: 0.9 }), roof = new THREE.MeshStandardMaterial({ color: '#3f4440', roughness: 0.8 });
    this.tower = (x, z) => {
      const t = new THREE.Group(); t.position.set(this.wx(x + 0.5), 0, this.wx(z + 0.5));
      for (const [a, b] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), wood); l.position.set(a, 1.1, b); l.castShadow = true; t.add(l); }
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.1), hes); cab.position.y = 2.3; cab.castShadow = true; t.add(cab);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.4, 4), roof); rf.position.y = 2.9; rf.rotation.y = Math.PI / 4; rf.castShadow = true; t.add(rf);
      return t;
    };
    // grid shown while building
    // the build grid is drawn by the ground itself (so it lies on the hills and fades out with distance)
    { const u = this.uGrid ||= { value: 0 }; this.grid = { get visible() { return u.value > 0.5; }, set visible(v) { u.value = v ? 1 : 0; } }; }
    // selection and range markers
    this.sel = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#ffe600' }));
    this.sel.visible = false; this.world.add(this.sel);
    this.range = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64), new THREE.MeshBasicMaterial({ color: '#ff4a4a', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
    this.range.rotation.x = -Math.PI / 2; this.range.position.y = 0.05; this.range.visible = false; this.world.add(this.range);
    this.foot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#59ff8a', transparent: true, opacity: 0.25, depthWrite: false }));
    this.foot.rotation.x = -Math.PI / 2; this.foot.position.y = 0.04; this.foot.visible = false; this.world.add(this.foot);
    // (GC 0.86) sparks off what is going up, a dome over the reach of what's selected or being placed, and beams off what it serves
    this.sparks = new Sparks(this.world);
    this.dome = new THREE.Mesh(domeGeo(), domeMat()); this.dome.visible = false; this.dome.raycast = () => {}; this.dome.renderOrder = 4; this.world.add(this.dome);
    this.beams = new THREE.InstancedMesh(beamGeo(), beamMat('#5fe8ff'), 120); this.beams.count = 0; this.beams.frustumCulled = false; this.beams.raycast = () => {}; this.world.add(this.beams);
    this.smokeMat = []; this.smokeGeo = new THREE.SphereGeometry(0.12, 8, 6);
    this.roadMats = { 1: new THREE.MeshStandardMaterial({ color: '#7a6346', roughness: 1 }), 2: new THREE.MeshStandardMaterial({ color: '#3e3f3c', roughness: 0.9 }) };
    this.roadG = new THREE.Group(); this.world.add(this.roadG);
    this.roadGhost = new THREE.Group(); this.world.add(this.roadGhost);
    this.ghostTile = new THREE.MeshBasicMaterial({ color: '#59ff8a', transparent: true, opacity: 0.4, depthWrite: false });
    this.plazaG = new THREE.Group(); this.plazaG.visible = false; this.world.add(this.plazaG);
    this.plotG = new THREE.Group(); this.world.add(this.plotG);
    this.plazaMat = new THREE.MeshBasicMaterial({ color: '#ffe600', transparent: true, opacity: 0.22, depthWrite: false });
  }
  // the sign over the main gate, in the faction's colours
  gateSign(f) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
    x.fillStyle = '#1a1d1a'; x.fillRect(0, 0, 512, 96); x.fillStyle = f.secondary; x.fillRect(0, 0, 512, 6); x.fillRect(0, 90, 512, 6);
    x.fillStyle = '#ffffff'; x.font = 'bold 40px ui-monospace, Menlo, Consolas, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(f.base.toUpperCase().slice(0, 22), 256, 48);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 0.1), [this.m.dark, this.m.dark, this.m.dark, this.m.dark, new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#fff', emissiveIntensity: 0.4 }), new THREE.MeshStandardMaterial({ map: t })]);
  }

  // what holds a bridge up: a concrete deck slab, piers down to the ground (or the bed under the water) every few cells,
  // and a steel rail along each side. Drawn at the deck's own height, not lifted by the shader
  bridgeFrame(a, b, w) {
    const s = this.sim, L = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / L, uz = (b.z - a.z) / L, ha = a.h ?? s.hAt(a.x, a.z), hb = b.h ?? s.hAt(b.x, b.z);
    const conc = this.bridgeMat ||= new THREE.MeshStandardMaterial({ color: '#8d8a82', roughness: 0.85, defines: { STANDARD: '', NO_HGT: '' } });
    const rail = this.railMat ||= new THREE.MeshStandardMaterial({ color: '#5d6266', roughness: 0.5, metalness: 0.5, defines: { STANDARD: '', NO_HGT: '' } });
    const g = new THREE.Group(), ang = -Math.atan2(b.z - a.z, b.x - a.x), mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, pitch = Math.atan2(hb - ha, L);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(L, hb - ha), 0.35, w + 0.3), conc);
    slab.position.set(this.wx(mid.x), (ha + hb) / 2 - 0.18, this.wx(mid.z)); slab.rotation.set(0, ang, pitch, 'YZX'); slab.castShadow = slab.receiveShadow = true; g.add(slab);
    for (const sd of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(L, hb - ha), 0.12, 0.06), rail);
      r.position.set(this.wx(mid.x - uz * (w / 2 + 0.1) * sd), (ha + hb) / 2 + 0.32, this.wx(mid.z + ux * (w / 2 + 0.1) * sd)); r.rotation.set(0, ang, pitch, 'YZX'); g.add(r);
    }
    for (let dd = 4; dd < L - 1; dd += 4) {
      const t = dd / L, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, top = ha + (hb - ha) * t - 0.35, foot = Math.min(s.hAt(x, z), top - 0.2) - 0.5;
      if (top - foot < 0.4) continue;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, top - foot, w * 0.8), conc); p.position.set(this.wx(x), (top + foot) / 2, this.wx(z)); p.rotation.y = ang; p.castShadow = true; g.add(p);
    }
    this.roadG.add(g);
  }
  // the flag plaza: open ground round the Head Office flag with a trail round its edge. It is dressed by the charter:
  // trodden dirt at an outpost, gravel and a footpath at a FOB, pavers and lamps at a fort, pale stone and gold at a major base
  // crates the first dropship set down on the landing zone
  syncLz() {
    const list = this.life?.lzCrates || null, key = list ? list.length + ':' + list[0] : '';
    if (key === this.lzKey) return; this.lzKey = key;
    if (this.lzG) { this.world.remove(this.lzG); this.lzG = null; }
    if (!list || !this.m) return;
    const G = this.lzG = new THREE.Group(); this.world.add(G);
    for (const [x, z] of list) { const c = makeCrate(this.m); c.position.set(this.wx(x), 0, this.wx(z)); G.add(c); }
  }
  syncPlaza() {
    const s = this.sim, f = s?.b.find(b => b.type === 'seflag'), key = f ? `${f.x},${f.z},${s.stage || 0}` : '';
    if (key === this.flagPlzKey) return; this.flagPlzKey = key;
    if (this.flagPlz) { this.world.remove(this.flagPlz); this.flagPlz.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); this.flagPlz = null; }
    if (!f) return;
    const st = Math.min(3, s.stage || 0), G = this.flagPlz = new THREE.Group(); G.position.set(this.wx(f.x + 1), 0, this.wx(f.z + 1)); this.world.add(G);
    const mat = (c, n, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -n, polygonOffsetUnits: -n * 3, ...o });
    const ring = (r0, r1, y, m) => { const g = new THREE.RingGeometry(r0, r1, 56, Math.max(1, Math.round((r1 - r0) * 4))); g.rotateX(-Math.PI / 2); const me = new THREE.Mesh(g, m); me.position.y = y; me.receiveShadow = true; me.frustumCulled = false; G.add(me); };
    const R = PLAZA + 0.95;
    ring(0, R - 0.5, 0.012, mat(['#6f5b40', '#8d887a', '#a9a79c', '#c9c5b6'][st], 1));
    ring(R - 0.5, R, 0.014, mat(['#5d4a33', '#b3b1a6', '#d6d3c6', '#e4e0d2'][st], 2));
    if (st >= 1) ring(1.5, 1.62, 0.016, mat(st >= 3 ? '#c9a23a' : '#d9d9d2', 3));
    if (st >= 3) ring(R - 0.58, R - 0.5, 0.016, mat('#c9a23a', 3));
    if (st >= 2) { const post = new THREE.MeshStandardMaterial({ color: '#2c2f2c', roughness: 0.6 }), lamp = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffe9a0', emissiveIntensity: 1.4 });
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8, x = Math.cos(a) * (R - 0.62), z = Math.sin(a) * (R - 0.62);
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.3, 6), post); p.position.set(x, 0.15, z); p.castShadow = true; G.add(p);
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), lamp); l.position.set(x, 0.32, z); G.add(l); } }
  }
  syncRoads() {
    const s = this.sim; if (s.roadsV === this.roadsV) return; this.roadsV = s.roadsV;
    this.roadG.clear(); this.booms = [];
    if (s.deckV !== this.deckSeen) { this.deckSeen = s.deckV; HG.load(s); }
    const net = s.net, N = this.N, nd = id => net.nodes.find(n => n.id === id), surf = new THREE.Group();
    const strip = (g, a, b, w, y, mat, ext = 0) => {   // a flat strip from a to b, w wide
      const L = Math.hypot(b.x - a.x, b.z - a.z) + ext, geo = new THREE.PlaneGeometry(L, w, Math.max(1, Math.ceil(L * 2)), 1); geo.rotateX(-Math.PI / 2);   // a vertex every half cell, to follow the ground (and up a ramp onto a raised foundation, GC 0.87)
      const m = new THREE.Mesh(geo, mat); m.position.set(this.wx((a.x + b.x) / 2), y, this.wx((a.z + b.z) / 2)); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); m.receiveShadow = true; g.add(m); return m;
    };
    // Roads are built the way road tools build them: each stretch is cut back from its junctions, and every junction is
    // its own piece of asphalt whose edge runs from one road's kerb to the next (meeting at the corner on the inside of
    // a turn, sweeping round in an arc on the outside and at dead ends). Kerbs, centre lines and crossings belong to
    // the stretches, so nothing is ever painted across a junction.
    const dash = this.dashMat ||= new THREE.MeshBasicMaterial({ color: '#d8c35a' }), white = this.zebraMat ||= new THREE.MeshBasicMaterial({ color: '#d9d9d2' });
    const walk = this.walkMat ||= new THREE.MeshStandardMaterial({ color: '#a7a69c', roughness: 0.9 });
    this.roadMats[3] ||= new THREE.MeshStandardMaterial({ color: '#b3b1a6', roughness: 0.9 });
    // surfaces that overlap are layered by depth offset, not by height: dirt under footpath under asphalt under kerbs under paint
    const lay = (mt, n) => { if (!mt.polygonOffset) { mt.polygonOffset = true; mt.polygonOffsetFactor = -n; mt.polygonOffsetUnits = -n * 3; mt.needsUpdate = true; } return mt; };
    lay(this.roadMats[1], 1); lay(this.roadMats[3], 2); lay(this.roadMats[2], 3); lay(walk, 4); lay(dash, 5); lay(white, 5);
    const surfOf = k => k === 'dirt' ? 1 : k === 'path' ? 3 : 2, hwOf = sg => sg.k === 'path' ? 0.36 : sg.k === 'dirt' ? 0.44 : sg.w / 2, rut = lay(this.rutMat ||= new THREE.MeshStandardMaterial({ color: '#5d4a33', roughness: 1 }), 2), kerbed = sg => sg.k === 'paved' || sg.k === 'bridge', KW = 0.22;
    const yOf = sf => 0.012 + (sf === 2 ? 0.004 : sf === 1 ? 0.002 : 0.003);
    const roads = net.segs.filter(g => !isLine(g.k)), inc = new Map(), cut = new Map();     // (GC 0.64: field works are not roads either)
    for (const sg of roads) for (const [me, ot] of [[sg.a, sg.b], [sg.b, sg.a]]) { const n = nd(me), o = nd(ot), L = Math.hypot(o.x - n.x, o.z - n.z) || 1; (inc.get(me) || inc.set(me, []).get(me)).push({ sg, ang: Math.atan2(o.z - n.z, o.x - n.x), ux: (o.x - n.x) / L, uz: (o.z - n.z) / L, hw: hwOf(sg), L }); }
    const poly = (pts, c, y, mat) => {   // a fan from c round pts, facing up
      const pos = [], idx = []; pos.push(this.wx(c.x), y, this.wx(c.z)); for (const p of pts) pos.push(this.wx(p.x), y, this.wx(p.z));
      for (let k = 1; k < pts.length; k++) { const p = pts[k - 1], q = pts[k], up = (p.z - c.z) * (q.x - c.x) - (p.x - c.x) * (q.z - c.z) > 0; idx.push(0, k, k + 1, 0, k + 1, k); void up; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => i % 3 === 1 ? 1 : 0), 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2)); g.setIndex(idx);
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; surf.add(m);
    };
    for (const [id, list] of inc) {
      const N0 = nd(id); list.sort((p, q) => p.ang - q.ang);
      const d = list.length, through = d === 2 && Math.abs(Math.abs(list[1].ang - list[0].ang) - Math.PI) < 0.1 && list[0].sg.k === list[1].sg.k;
      if (through) { for (const e of list) cut.set(e.sg.id + ':' + id, 0); continue; }
      // between each road and the next one round: where their near edges cross (an inside corner), or an arc (outside)
      const gaps = list.map((e, i) => {
        const f = list[(i + 1) % d]; let phi = f.ang - e.ang; if (phi <= 1e-6) phi += Math.PI * 2;
        if (phi < Math.PI - 0.08) { const sn = Math.sin(phi), cs = Math.cos(phi), lim = 4 * Math.max(e.hw, f.hw); return { ce: Math.min(lim, Math.max(0, (f.hw + e.hw * cs) / sn)), cf: Math.min(lim, Math.max(0, (e.hw + f.hw * cs) / sn)) }; }
        return { ce: 0, cf: 0, arc: phi };
      });
      list.forEach((e, i) => { e.cut = Math.min(e.L * 0.45, Math.max(gaps[i].ce, gaps[(i + d - 1) % d].cf)); cut.set(e.sg.id + ':' + id, e.cut); });
      const at = (e, along, side) => ({ x: N0.x + e.ux * along - e.uz * side, z: N0.z + e.uz * along + e.ux * side });
      const ring = [], best = list.reduce((p, q) => surfOf(q.sg.k) === 2 ? q : p, list[0]), sf = surfOf(best.sg.k), y = yOf(sf);
      list.forEach((e, i) => {
        const f = list[(i + 1) % d], g = gaps[i];
        ring.push(at(e, e.cut, -e.hw), at(e, e.cut, e.hw));
        if (g.arc) {   // sweep from this road's left kerb round to the next road's right kerb
          const n = Math.max(2, Math.ceil(g.arc / 0.3)), a0 = e.ang + Math.PI / 2, a1 = e.ang + g.arc - Math.PI / 2, arcP = [];
          for (let k = 0; k <= n; k++) { const t = k / n, aa = a0 + (a1 - a0) * t, r = e.hw + (f.hw - e.hw) * t; arcP.push({ x: N0.x + Math.cos(aa) * r, z: N0.z + Math.sin(aa) * r, aa, r }); }
          ring.push(...arcP);
          if (kerbed(e.sg) && kerbed(f.sg)) for (let k = 0; k < n; k++) { const p = arcP[k], q = arcP[k + 1], in1 = (p.r - KW / 2) / p.r, in2 = (q.r - KW / 2) / q.r; strip(surf, { x: N0.x + (p.x - N0.x) * in1, z: N0.z + (p.z - N0.z) * in1 }, { x: N0.x + (q.x - N0.x) * in2, z: N0.z + (q.z - N0.z) * in2 }, KW, y + 0.012, walk, 0.06); }
          if (kerbed(e.sg) && e.cut > 0.01) strip(surf, at(e, e.cut, e.hw - KW / 2), at(e, 0, e.hw - KW / 2), KW, y + 0.012, walk);
          if (kerbed(f.sg) && f.cut > 0.01) strip(surf, at(f, f.cut, -f.hw + KW / 2), at(f, 0, -f.hw + KW / 2), KW, y + 0.012, walk);
        } else {
          ring.push(at(e, g.ce, e.hw));
          if (kerbed(e.sg) && e.cut - g.ce > 0.02) strip(surf, at(e, e.cut, e.hw - KW / 2), at(e, g.ce - KW / 2, e.hw - KW / 2), KW, y + 0.012, walk);
          if (kerbed(f.sg) && f.cut - g.cf > 0.02) strip(surf, at(f, f.cut, -f.hw + KW / 2), at(f, g.cf - KW / 2, -f.hw + KW / 2), KW, y + 0.012, walk);
        }
      });
      ring.push(ring[0]); poly(ring, N0, y - 0.001, this.roadMats[sf]);
      // a crossing on each kerbed road into a junction of three or more
      if (d >= 3) for (const e of list) if (kerbed(e.sg) && e.L > e.cut * 2 + 2) for (let o = -e.hw + KW + 0.2; o <= e.hw - KW - 0.2 + 1e-6; o += 0.3) strip(surf, at(e, e.cut + 0.15, o), at(e, e.cut + 0.6, o), 0.13, yOf(2) + 0.006, white);
    }
    for (const sg of roads) {
      const a0 = nd(sg.a), b0 = nd(sg.b), L0 = Math.hypot(b0.x - a0.x, b0.z - a0.z) || 1, ux = (b0.x - a0.x) / L0, uz = (b0.z - a0.z) / L0, ca = cut.get(sg.id + ':' + sg.a) || 0, cb = cut.get(sg.id + ':' + sg.b) || 0;
      const a = { x: a0.x + ux * ca, z: a0.z + uz * ca }, b = { x: b0.x - ux * cb, z: b0.z - uz * cb }, L = L0 - ca - cb, sf = surfOf(sg.k), y = yOf(sf), hw = hwOf(sg);
      if (sg.k === 'bridge') this.bridgeFrame(a0, b0, sg.w);
      if (L <= 0.01) continue;
      strip(surf, a, b, hw * 2, y, this.roadMats[sf]);
      if (sg.k === 'paved') {     // (GC 0.88) a paved road is laid on a concrete bed of its own, a little wider than it: its foundation, and what carries the services
        const bed = new THREE.BoxGeometry(L, 0.14, hw * 2 + 0.24, Math.max(1, Math.ceil(L * 2)), 1, 1); bed.translate(0, -0.058, 0);
        const m = new THREE.Mesh(bed, this.m.concrete); m.position.set(this.wx((a.x + b.x) / 2), 0, this.wx((a.z + b.z) / 2)); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); m.receiveShadow = true; surf.add(m);
      }
      if (sf === 1) for (const sd of [-1, 1]) strip(surf, { x: a.x - uz * 0.2 * sd, z: a.z + ux * 0.2 * sd }, { x: b.x - uz * 0.2 * sd, z: b.z + ux * 0.2 * sd }, 0.11, y + 0.003, rut);   // one rough lane: two wheel ruts
      if (kerbed(sg)) {
        const off = hw - KW / 2;
        for (const sd of [-1, 1]) strip(surf, { x: a.x - uz * off * sd, z: a.z + ux * off * sd }, { x: b.x - uz * off * sd, z: b.z + ux * off * sd }, KW, y + 0.012, walk);
        for (let t = 0.5; t < L - 0.6; t += 0.9) strip(surf, { x: a.x + ux * t, z: a.z + uz * t }, { x: a.x + ux * (t + 0.35), z: a.z + uz * (t + 0.35) }, 0.05, y + 0.005, dash);
      }
    }
    this.roadCut = cut;
    mergeStatic(surf); this.roadG.add(surf);
    // walls: HESCO lines with gaps where roads run through, posts at the joints, towers on the corners
    const wallG = new THREE.Group(), gateAt = (x, z) => { const tx = Math.floor(x), tz = Math.floor(z); return tx >= 0 && tz >= 0 && tx < N && tz < N && s.walls[tz * N + tx] === 2; };
    const turns = new Map();
    for (const sg of net.segs) {
      if (!WALLS[sg.k] || (WALLS[sg.k].file && sharedGeo(this.m, WALLS[sg.k].file))) continue;     // (GC 0.89) every kind of wall; those with a model of their own below
      const a = nd(sg.a), b = nd(sg.b), L = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.ceil(L / 0.25));
      if (sg.k !== 'fence') for (const n of [a, b]) { const t = turns.get(n.id) || []; t.push(Math.atan2((n === a ? b : a).z - n.z, (n === a ? b : a).x - n.x)); turns.set(n.id, t); }
      let run = null;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, open = gateAt(x, z);
        if (!open && !run) run = { x, z };
        if ((open || i === steps) && run) { const e = open ? { x: a.x + (b.x - a.x) * (i - 1) / steps, z: a.z + (b.z - a.z) * (i - 1) / steps } : { x, z }; if (Math.hypot(e.x - run.x, e.z - run.z) > 0.1 || i === steps) this.wallPiece(wallG, run, e, sg.k); run = null; }
      }
    }
    mergeStatic(wallG); this.roadG.add(wallG);
    // (GC 0.64) field works (barbed wire, sandbags, trenches): the ground fight's own models, a length a tile, with gaps where roads
    // run through. They stand at 0: like everything here, the height shader (HG) lifts every corner onto the ground under it, so
    // on a slope they lie along it and nothing stands in the air.
    for (const [k, W] of Object.entries(C.WORKS)) {
      const wg = sharedGeo(this.m, W.file), runs = []; if (!wg) continue;
      for (const sg of net.segs) {
        if (sg.k !== k) continue;
        const a = nd(sg.a), b = nd(sg.b), L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.round(L)), ang = -Math.atan2(b.z - a.z, b.x - a.x);
        // (GC 0.78) on a wall: barbed wire runs along its top; sandbags or a trench laid there before are inside it and not drawn
        for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, tx = Math.floor(x), tz = Math.floor(z), i0 = tz * N + tx; if (s.roads[i0]) continue; const on = s.walls[i0] === 1; if (on && k !== 'wire') continue; runs.push([x, z, ang, L / n, on]); }
      }
      if (!runs.length) continue;
      this.m.model ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.04, side: THREE.DoubleSide });
      const im = new THREE.InstancedMesh(wg, this.m.model, runs.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
      runs.forEach(([x, z, ang, l, on], i) => { P.set(this.wx(x), on ? 1.15 : 0, this.wx(z)); Q.setFromAxisAngle(Y, ang); S.set(l / W.len, on ? W.h * 0.8 : W.h, on ? W.d * 0.8 : W.d); im.setMatrixAt(i, M.compose(P, Q, S)); });
      im.castShadow = true; im.receiveShadow = true; this.roadG.add(im);
    }
    // (GC 0.89) the walls the ground fight has models for (its timber barricade, its concrete barriers and its curtain wall):
    // a model a tile, scaled to the wall's height, gaps where roads run through, like the field works
    for (const [k, W] of Object.entries(WALLS)) {
      const wg = W.file && sharedGeo(this.m, W.file), runs = []; if (!wg) continue;
      for (const sg of net.segs) {
        if (sg.k !== k) continue;
        const a = nd(sg.a), b = nd(sg.b), L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.round(L)), ang = -Math.atan2(b.z - a.z, b.x - a.x);
        for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, i0 = Math.floor(z) * N + Math.floor(x); if (s.walls[i0] === 2) continue; runs.push([x, z, ang, L / n]); }
        if (k !== 'fence') for (const nn of [a, b]) { const t = turns.get(nn.id) || []; t.push(Math.atan2((nn === a ? b : a).z - nn.z, (nn === a ? b : a).x - nn.x)); turns.set(nn.id, t); }
      }
      if (!runs.length) continue;
      const mat = W.tint ? (this.wallTint ||= new THREE.MeshStandardMaterial({ vertexColors: true, color: W.tint, roughness: 0.92, metalness: 0.03 })) : (this.m.model ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.04, side: THREE.DoubleSide }));
      const im = new THREE.InstancedMesh(wg, mat, runs.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
      runs.forEach(([x, z, ang, l], i) => { P.set(this.wx(x), 0, this.wx(z)); Q.setFromAxisAngle(Y, ang); S.set((l + 0.04) / W.len, W.h / W.mh, W.d / W.md); im.setMatrixAt(i, M.compose(P, Q, S)); });
      im.castShadow = true; im.receiveShadow = true; this.roadG.add(im);
    }
    for (const [id, angs] of turns) {
      const n = nd(id), bent = angs.length !== 2 || Math.abs(Math.cos(angs[0] - angs[1]) + 1) > 0.1;
      if (bent && !gateAt(n.x, n.z)) { const t = this.tower(n.x - 0.5, n.z - 0.5); this.roadG.add(t); }
    }
    // gates: a boom barrier across the road and a guard hut beside it; the main gate gets the base's sign
    const main = s.gate();
    for (const gt of s.gates || []) {
      const w = net.segs.filter(q => WALLS[q.k]).map(q => { const a = nd(q.a), b = nd(q.b); return { q, a, b, d: Math.abs((b.x - a.x) * (a.z - gt.z) - (a.x - gt.x) * (b.z - a.z)) / Math.hypot(b.x - a.x, b.z - a.z) }; }).sort((p, q) => p.d - q.d)[0];
      const ang = w ? Math.atan2(w.b.z - w.a.z, w.b.x - w.a.x) : 0, half = Math.sqrt(gt.tiles.length) / 2 + 0.5;
      const g = new THREE.Group(); g.position.set(this.wx(gt.x), 0, this.wx(gt.z)); g.rotation.y = -ang; this.roadG.add(g);
      for (const sx of [-half, half]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.4, 0.35), this.m.concrete); p.position.set(sx, 0.7, 0); p.castShadow = true; g.add(p); }
      const boom = new THREE.Group(); boom.position.set(-half + 0.2, 0.75, 0.25); g.add(boom);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(half * 2 - 0.4, 0.07, 0.07), this.m.hazard); arm.position.x = half - 0.2; boom.add(arm);
      for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.075, 0.075), this.m.red); r.position.x = 0.3 + i * (half * 2 - 0.6) / 4; boom.add(r); }
      g.userData.boom = boom;
      const hut = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.7), this.m.wall); hut.position.set(half + 0.75, 0.4, -0.9); hut.castShadow = true; g.add(hut);
      const hr = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.85), this.m.prim); hr.position.set(half + 0.75, 0.84, -0.9); g.add(hr);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.02), this.m.window); win.position.set(half + 0.75, 0.55, -0.54); g.add(win);
      if (Math.abs(gt.x - main.gx) < 0.01 && Math.abs(gt.z - main.gz) < 0.01 && this.faction) {
        const sign = this.gateSign(this.faction); sign.position.set(0, 2.5, 0); g.add(sign);
        for (const sx of [-half, half]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), this.m.dark); p.position.set(sx, 1.9, 0); g.add(p); }
      }
      boom.userData.gx = gt.x; boom.userData.gz = gt.z; boom.userData.r = half + 1.2; (this.booms ||= []).push(boom);
    }
    this.charterLine();
    this.streetLamps();
  }
  // the edge of the ground you hold: a dashed yellow line along every parcel side with your land on one side only
  charterLine() {
    const s = this.sim, P = LAND.PARCEL, G = LAND.GRID; if (!s.own) return;
    const mat = this.charterMat ||= new THREE.MeshBasicMaterial({ color: '#f5d547', transparent: true, opacity: 0.55 });
    const geo = new THREE.PlaneGeometry(0.6, 0.12); geo.rotateX(-Math.PI / 2); const pts = [];
    for (let pz = 0; pz < G; pz++) for (let px = 0; px < G; px++) {
      if (!s.owns(px, pz)) continue;
      const x0 = px * P, z0 = pz * P;
      if (!s.owns(px, pz - 1)) for (let t = 0; t < P; t++) pts.push([x0 + t + 0.3, z0, 0]);
      if (!s.owns(px, pz + 1)) for (let t = 0; t < P; t++) pts.push([x0 + t + 0.3, z0 + P, 0]);
      if (!s.owns(px - 1, pz)) for (let t = 0; t < P; t++) pts.push([x0, z0 + t + 0.3, 1]);
      if (!s.owns(px + 1, pz)) for (let t = 0; t < P; t++) pts.push([x0 + P, z0 + t + 0.3, 1]);
    }
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, pts.length)), mx = new THREE.Matrix4(), q = new THREE.Quaternion(), qr = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), one = new THREE.Vector3(1, 1, 1);
    pts.forEach(([x, z, r], k) => { mx.compose(new THREE.Vector3(this.wx(x), 0.04, this.wx(z)), r ? qr : q, one); im.setMatrixAt(k, mx); });
    im.count = pts.length; this.roadG.add(im);
  }
  // the landscaping brush: a ring on the ground (it drapes over the hills like everything else), and for the slope
  // tool a line back to where the slope starts
  showBrush(x, z, r, a = null) {
    if (!this.brush) {
      const pts = []; for (let i = 0; i <= 48; i++) pts.push(new THREE.Vector3(Math.cos(i / 48 * TAU), 0.08, Math.sin(i / 48 * TAU)));
      // the ring is drawn point by point in world space so the height under each point is its own
      this.brushGeo = new THREE.BufferGeometry().setFromPoints(pts); this.brushPts = pts;
      this.brush = new THREE.Line(this.brushGeo, new THREE.LineBasicMaterial({ color: '#f5d547', transparent: true, opacity: 0.95, depthTest: false })); this.brush.renderOrder = 9; this.brush.frustumCulled = false;
      this.brushLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#7fe9e0', depthTest: false })); this.brushLine.renderOrder = 9; this.brushLine.frustumCulled = false;
      this.world.add(this.brush, this.brushLine);
    }
    this.brush.visible = x != null; this.brushLine.visible = x != null && !!a; if (x == null) return;
    const pos = this.brushGeo.attributes.position;
    for (let i = 0; i <= 48; i++) pos.setXYZ(i, this.wx(x + Math.cos(i / 48 * TAU) * r), 0.08, this.wx(z + Math.sin(i / 48 * TAU) * r));
    pos.needsUpdate = true;
    if (a) { const lp = this.brushLine.geometry.attributes.position; lp.setXYZ(0, this.wx(a[0]), 0.1, this.wx(a[1])); lp.setXYZ(1, this.wx(x), 0.1, this.wx(z)); lp.needsUpdate = true; }
  }
  // the LAND overlay: every parcel of the section, shaded by what you can do with it. mode 'land' or 'callin';
  // hover: [px, pz] under the pointer; start: { parcels, ok } for the 3 x 3 the HQ would bring
  showParcels(mode, hover = null, start = null) {
    const s = this.sim, P = LAND.PARCEL, G = LAND.GRID;
    const key = mode ? `${mode}|${s.ownV || 0}|${s.stage}|${Math.floor(s.credits / 50)}|${Math.floor(s.supplies / 50)}|${hover}|${start ? start.parcels.join(';') + start.ok : ''}` : '';
    if (key === this.parcelKey) return; this.parcelKey = key;
    if (this.parcelG) { this.world.remove(this.parcelG); this.parcelG.traverse(o => { o.geometry?.dispose(); if (o.material && o.material !== this.parcelMat) o.material.dispose?.(); }); this.parcelG = null; }
    if (!mode) return;
    const g = this.parcelG = new THREE.Group(); g.renderOrder = 4;
    const fillGeo = new THREE.PlaneGeometry(P - 0.3, P - 0.3, 15, 15); fillGeo.rotateX(-Math.PI / 2);   // enough vertices to drape over the hills
    const fill = new THREE.InstancedMesh(fillGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 1, depthWrite: false }), G * G);
    const col = new THREE.Color(), mx = new THREE.Matrix4(); let n = 0;
    const startSet = new Set((start?.parcels || []).map(p => p.join(',')));
    const shade = (px, pz) => {
      if (startSet.has(px + ',' + pz)) return start.ok ? ['#7fe9e0'] : ['#ff4a4a'];
      const st = mode === 'callin' ? (s.grantable(px, pz) ? 'far' : 'edge') : s.parcelState(px, pz);
      return { owned: null, buy: ['#f5d547'], next: ['#b0702a'], far: null, edge: ['#000000'] }[st];
    };
    for (let pz = 0; pz < G; pz++) for (let px = 0; px < G; px++) {
      const sh = shade(px, pz); if (!sh) continue;
      if (sh[0] === '#000000') continue;
      const hv = hover && hover[0] === px && hover[1] === pz;
      mx.makeTranslation(this.wx(px * P + P / 2), 0.07, this.wx(pz * P + P / 2)); fill.setMatrixAt(n, mx);
      fill.setColorAt(n, col.set(sh[0]).lerp(new THREE.Color('#ffffff'), hv ? 0.4 : 0)); n++;
    }
    fill.count = n; fill.material.opacity = 0.3; fill.frustumCulled = false; fill.renderOrder = 4;
    // the edge of the section and (calling in) everything else darkens
    const dark = new THREE.InstancedMesh(fillGeo, new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.4, depthWrite: false }), G * G); let k = 0;
    for (let pz = 0; pz < G; pz++) for (let px = 0; px < G; px++) { const sh = shade(px, pz); if (!sh || sh[0] !== '#000000') continue; mx.makeTranslation(this.wx(px * P + P / 2), 0.065, this.wx(pz * P + P / 2)); dark.setMatrixAt(k++, mx); }
    dark.count = k; dark.frustumCulled = false; dark.renderOrder = 4;
    g.add(dark, fill);
    // the grid: a faint line on every parcel edge, a bright one round the parcel under the pointer
    const pts = [], S = 5, nS = G * P / S;
    for (let i = 0; i <= G; i++) for (let k = 0; k < nS; k++) pts.push(new THREE.Vector3(this.wx(k * S), 0.08, this.wx(i * P)), new THREE.Vector3(this.wx(k * S + S), 0.08, this.wx(i * P)), new THREE.Vector3(this.wx(i * P), 0.08, this.wx(k * S)), new THREE.Vector3(this.wx(i * P), 0.08, this.wx(k * S + S)));
    const grid = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#f5d547', transparent: true, opacity: 0.22, depthWrite: false })); grid.renderOrder = 5; grid.frustumCulled = false; g.add(grid);
    if (hover && s.grantable(hover[0], hover[1])) {
      const [px, pz] = hover, a = [];
      for (const [x0, z0, x1, z1] of [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0]]) for (let k = 0; k < 15; k++) a.push(new THREE.Vector3(this.wx((px + x0 + (x1 - x0) * k / 15) * P), 0.09, this.wx((pz + z0 + (z1 - z0) * k / 15) * P)));
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(a), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false })); ring.renderOrder = 6; ring.frustumCulled = false; g.add(ring);
    }
    this.world.add(g);
  }
  wallPiece(g, a, b, k = 'wall') {
    if (k !== 'wall') return this.wallKind(g, a, b, k);
    const L = Math.hypot(b.x - a.x, b.z - a.z) + 0.9, ang = -Math.atan2(b.z - a.z, b.x - a.x), mx = this.wx((a.x + b.x) / 2), mz = this.wx((a.z + b.z) / 2);
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, 1.05, 0.5), this.hes); body.position.set(mx, 0.525, mz); body.rotation.y = ang; body.castShadow = body.receiveShadow = true; g.add(body);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(L, 0.22, 0.8), this.hesTop); foot.position.set(mx, 0.11, mz); foot.rotation.y = ang; foot.receiveShadow = true; g.add(foot);
    const top = new THREE.Mesh(new THREE.BoxGeometry(L, 0.1, 0.62), this.hesTop); top.position.set(mx, 1.1, mz); top.rotation.y = ang; g.add(top);
    // the seams between the baskets
    for (let t = 0.5; t < L - 0.4; t += 1) { const f = (t - L / 2) / L, x = (a.x + b.x) / 2 + (b.x - a.x) * f, z = (a.z + b.z) / 2 + (b.z - a.z) * f; if (Math.round(t) % 2) continue; const sm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.12, 0.74), this.hesTop); sm.castShadow = true; sm.position.set(this.wx(x), 0.56, this.wx(z)); sm.rotation.y = ang; g.add(sm); }
  }
  // (GC 0.89) the other walls. Fence: posts, a rail and chain-link between. Concrete: precast T-wall panels on a footing, the
  // joints showing. Fortified: a thick concrete wall with a walkway along its top between two parapets of merlons
  wallKind(g, a, b, k) {
    const L0 = Math.hypot(b.x - a.x, b.z - a.z), L = L0 + (k === 'fence' ? 0.1 : 0.7), ang = -Math.atan2(b.z - a.z, b.x - a.x), mx = this.wx((a.x + b.x) / 2), mz = this.wx((a.z + b.z) / 2), W = WALLS[k];
    const put = (w, h, d, mat, along, y, side = 0, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); const ux = (b.x - a.x) / (L0 || 1), uz = (b.z - a.z) / (L0 || 1); m.position.set(mx + ux * along - uz * side, y, mz + uz * along + ux * side); m.rotation.y = ang; m.castShadow = cast; m.receiveShadow = true; g.add(m); return m; };
    const M = this.wallMats ||= { post: new THREE.MeshStandardMaterial({ color: '#5b605d', metalness: 0.4, roughness: 0.55 }), mesh: new THREE.MeshStandardMaterial({ color: '#8d938f', metalness: 0.3, roughness: 0.6, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
      tw: new THREE.MeshStandardMaterial({ color: '#9b9a90', roughness: 0.95 }), seam: new THREE.MeshStandardMaterial({ color: '#5f5e57', roughness: 1 }), fort: new THREE.MeshStandardMaterial({ color: '#7d7e77', roughness: 0.95 }), walk: new THREE.MeshStandardMaterial({ color: '#5a5b55', roughness: 1 }) };
    if (k === 'fence') {
      put(L, W.h - 0.08, 0.02, M.mesh, 0, (W.h - 0.08) / 2 + 0.04, 0, false); put(L, 0.025, 0.025, M.post, 0, W.h, 0);
      for (let t = -L / 2; t <= L / 2 + 1e-6; t += Math.max(0.5, L / Math.max(1, Math.round(L)))) put(0.05, W.h + 0.04, 0.05, M.post, t, (W.h + 0.04) / 2);
      return;
    }
    if (k === 'cwall') {
      put(L, 0.14, 0.62, M.tw, 0, 0.07); put(L, W.h, 0.2, M.tw, 0, W.h / 2 + 0.1);
      for (let t = -L / 2 + 0.5; t < L / 2 - 0.1; t += 0.5) for (const sd of [-0.105, 0.105]) put(0.025, W.h - 0.05, 0.01, M.seam, t, W.h / 2 + 0.1, sd, false);
      return;
    }
    // fortified
    put(L, W.h, 0.8, M.fort, 0, W.h / 2); put(L, 0.04, 0.5, M.walk, 0, W.h + 0.02, 0, false);
    for (const sd of [-0.32, 0.32]) { put(L, 0.12, 0.16, M.fort, 0, W.h + 0.06, sd); for (let t = -L / 2 + 0.25; t < L / 2 - 0.1; t += 0.6) put(0.3, 0.22, 0.16, M.fort, t, W.h + 0.23, sd); }
  }
  // street lamps along the roadside every few tiles; their heads and the pools under them light up at night
  streetLamps() {
    const s = this.sim, N = this.N, spots = [], net = s.net, nd = id => net.nodes.find(n => n.id === id);
    for (const sg of net.segs) {
      if (sg.k !== 'paved') continue;   // lamps stand on the sidewalk of paved roads: part of the road, laid with it
      const a = nd(sg.a), b = nd(sg.b), L = Math.hypot(b.x - a.x, b.z - a.z); if (L < 1) continue;
      const ux = (b.x - a.x) / L, uz = (b.z - a.z) / L, off = sg.w / 2 - 0.11, ca = this.roadCut?.get(sg.id + ':' + sg.a) || 0, cb = this.roadCut?.get(sg.id + ':' + sg.b) || 0;
      for (let t = ca + 1.2, k = 0; t < L - cb - 0.5; t += 3.2, k++) {
        const sd = k % 2 ? 1 : -1, x = a.x + ux * t - uz * off * sd, z = a.z + uz * t + ux * off * sd;
        spots.push([x, z, a.x + ux * t, a.z + uz * t]);
      }
    }
    if (!this.lampHead) {
      this.lampHead = new THREE.MeshStandardMaterial({ color: '#2a2618', emissive: '#ffd890', emissiveIntensity: 0.1 });
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      this.lampPool = new THREE.MeshBasicMaterial({ color: '#ffcf7a', map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
        polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -24 });   // (GC 0.63) light lies over every road layer (they reach -5): it was lost under paving and footpaths
    }
    // a warm pool of light at every finished building's door, too
    const doors = s.b.filter(b => b.done && !B[b.type].pad && b.w * b.d > 1).map(b => { const [x, z] = s.door(b); return [x + 0.5, z + 0.5]; });
    if (doors.length) {
      const dp = new THREE.InstancedMesh(new THREE.CircleGeometry(1.0, 16), this.lampPool, doors.length), dm = new THREE.Matrix4(), fq = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      doors.forEach(([x, z], k) => { dm.compose(new THREE.Vector3(this.wx(x), 0.031, this.wx(z)), fq, new THREE.Vector3(1, 1, 1)); dp.setMatrixAt(k, dm); });
      dp.renderOrder = 2; dp.frustumCulled = false; this.roadG.add(dp);
    }
    if (!spots.length) return;
    const mx = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1), q0 = new THREE.Quaternion(), flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.035, 1.2, 6), this.m.steel, spots.length);
    const foot = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 8), this.m.concrete, spots.length);
    const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.025, 0.025), this.m.steel, spots.length);
    const head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.05, 0.1), this.lampHead, spots.length);
    const pool = new THREE.InstancedMesh(new THREE.CircleGeometry(1.3, 18), this.lampPool, spots.length);
    spots.forEach(([x, z, rx, rz], k) => {
      const hx = x + (rx - x) * 0.4, hz = z + (rz - z) * 0.4, reach = Math.hypot(hx - x, hz - z), ang = Math.atan2(hz - z, hx - x), qa = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -ang, 0));
      mx.compose(new THREE.Vector3(this.wx(x), 0.62, this.wx(z)), q0, one); pole.setMatrixAt(k, mx);
      mx.compose(new THREE.Vector3(this.wx(x), 0.045, this.wx(z)), q0, one); foot.setMatrixAt(k, mx);
      mx.compose(new THREE.Vector3(this.wx((x + hx) / 2), 1.21, this.wx((z + hz) / 2)), qa, new THREE.Vector3(reach + 0.04, 1, 1)); arm.setMatrixAt(k, mx);
      mx.compose(new THREE.Vector3(this.wx(hx), 1.19, this.wx(hz)), qa, one); head.setMatrixAt(k, mx);
      mx.compose(new THREE.Vector3(this.wx(rx), 0.03, this.wx(rz)), flat, one); pool.setMatrixAt(k, mx);
    });
    pole.castShadow = arm.castShadow = true; pool.renderOrder = 2; pole.frustumCulled = head.frustumCulled = pool.frustumCulled = foot.frustumCulled = arm.frustumCulled = false;
    this.roadG.add(pole, foot, arm, head, pool);
  }
  // tiles a road tool is about to lay (green) or clear (red)
  showRoadGhost() { this.roadGhost.clear(); }
  // the roadside plots, like zoning cells: brightest next to the road
  showPlots(tiles) {
    this.plotG.clear(); if (!tiles || !tiles.length) return;
    const mats = [0.3, 0.19, 0.19, 0.19, 0.19, 0.19].map(o => new THREE.MeshBasicMaterial({ color: '#59ff8a', transparent: true, opacity: o, depthWrite: false }));
    const geo = new THREE.PlaneGeometry(0.86, 0.86); geo.rotateX(-Math.PI / 2);
    for (let k = 1; k <= 6; k++) {
      const t = tiles.filter(q => q[2] === k); if (!t.length) continue;
      const im = new THREE.InstancedMesh(geo, mats[k - 1], t.length), mx = new THREE.Matrix4();
      t.forEach(([x, z], i) => { mx.makeTranslation(this.wx(x + 0.5), 0.025, this.wx(z + 0.5)); im.setMatrixAt(i, mx); });
      im.frustumCulled = false; this.plotG.add(im);
    }
  }
  // a line being drawn: a see-through strip, green if it can go there; w: its width
  showLine(a, b, w, ok, wall) {
    this.roadGhost.clear(); if (!a || !b) return;
    this.ghostTile.color.set(ok ? (wall ? '#ffe600' : '#59ff8a') : '#ff4a4a');
    const L = Math.max(0.2, Math.hypot(b.x - a.x, b.z - a.z)), geo = new THREE.PlaneGeometry(L + w, w); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, this.ghostTile); m.position.set(this.wx((a.x + b.x) / 2), wall ? 0.5 : 0.04, this.wx((a.z + b.z) / 2)); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); this.roadGhost.add(m);
    for (const p of [a, b]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), this.ghostTile); d.rotation.x = -Math.PI / 2; d.position.set(this.wx(p.x), 0.06, this.wx(p.z)); this.roadGhost.add(d); }
    this.grid.visible = true;
  }

  // the open ground the troops gather on, shown while the flag is selected or being moved
  showPlaza(tiles, ok = true) {
    this.plazaG.clear(); this.plazaG.visible = !!tiles;
    if (!tiles) return;
    this.plazaMat.color.set(ok ? '#ffe600' : '#ff4a4a');
    const geo = new THREE.PlaneGeometry(0.92, 0.92);
    for (const [x, z] of tiles) { const p = new THREE.Mesh(geo, this.plazaMat); p.rotation.x = -Math.PI / 2; p.position.set(this.wx(x + 0.5), 0.035, this.wx(z + 0.5)); this.plazaG.add(p); }
  }

  // ---------------------------------------------------------------- day and night
  setTime(h) {
    const ramp = (a, b, v) => Math.max(0, Math.min(1, (v - a) / (b - a)));
    const d = ramp(4, 6, h) * (1 - ramp(18.5, 21, h)), warm = 1 - Math.min(1, Math.abs(h - 12.5) / 6.5);
    this.dayLight = d;
    if (this.bloom) { this.bloom.strength = 0.06 + 0.24 * (1 - d); this.bloom.threshold = 1.5 - 0.35 * (1 - d); }     // (GC 0.86) lamps and windows glow at night (GC 0.87: and only them, softly)
    const ang = (h - 12.5) / 12 * Math.PI;
    this.sun.position.set(this.target.x - Math.sin(ang) * 26, 8 + 26 * Math.max(0.15, Math.cos(ang * 0.8)), this.target.z + 12);
    this.sun.intensity = 0.45 + 1.95 * d;   // at night this is moonlight: weaker and blue
    this.sun.color.setRGB(0.55 + 0.45 * d, 0.62 + 0.33 * warm * d + 0.08 * (1 - d), 0.85 * (1 - d) + (0.42 + 0.42 * warm) * d);
    this.hemi.intensity = 0.75 + 0.4 * d;
    this.hemi.color.setRGB(0.32 + 0.55 * d, 0.38 + 0.53 * d, 0.6 + 0.4 * d);
    this.scene.background.copy(this.skyNight).lerp(this.skyDay, d); this.scene.fog.color.copy(this.scene.background);
    if (this.lampHead) { this.lampHead.emissiveIntensity = 0.1 + (1 - d) * 2.4; this.lampPool.opacity = (1 - d) * 0.75; }
    if (this.m) { this.m.floodPool.opacity = Math.max(0, 0.75 - d * 1.2); this.m.window.emissiveIntensity = 0.25 + (1 - d) * 1.6; this.m.glowY.emissiveIntensity = 1.4 + (1 - d) * 1.2; this.m.colaFace.emissiveIntensity = 0.55 + (1 - d) * 0.8; }
  }

  // ---------------------------------------------------------------- the camera
  camUpdate(dt) {
    this.yaw += (this.yawT - this.yaw) * Math.min(1, dt * 8);
    this.zoom += (this.zoomT - this.zoom) * Math.min(1, dt * 10);
    // the camera keeps far enough from the edge of the section that the edge is never in view, and the distance fades into haze
    const wide = this.sim?.callIn === 'flag', h = wide ? this.N / 2 + 6 : Math.max(40, this.N / 2 - 30 - this.zoom * 2.7); this.target.x = Math.max(-h, Math.min(h, this.target.x)); this.target.z = Math.max(-h, Math.min(h, this.target.z));
    if (!wide && this.zoomT > 230) this.zoomT = 230;
    if (this.photo) {
      this.dist += (this.distT - this.dist) * Math.min(1, dt * 8); this.tilt += (this.tiltT - this.tilt) * Math.min(1, dt * 8);
      const c = this.persp, cp = Math.cos(this.tilt), d = this.dist;
      c.aspect = this.aspect; c.updateProjectionMatrix();
      const look = this.target.clone(); look.y = Math.min(1.2, d * 0.04);
      c.position.set(look.x + Math.sin(this.yaw) * cp * d, look.y + Math.sin(this.tilt) * d, look.z + Math.cos(this.yaw) * cp * d);
      c.lookAt(look); this.sun.target.position.copy(this.target); this.scene.fog.near = d * 0.5 + 12; this.scene.fog.far = d + 170; return;
    }
    // the game camera: true perspective (0.19), a long lens looking down at the ground under the target. zoom is still
    // half the height of what you see at the target, so everything that goes by zoom works as before
    const c = this.gcam, z = this.zoom, half = c.fov * Math.PI / 360, d = z / Math.tan(half), cp = Math.cos(this.pitch);
    const gy = this.sim?.hAt ? Math.max(0, this.sim.surfAt(this.target.x + this.N / 2, this.target.z + this.N / 2)) : 0;
    c.aspect = this.aspect; c.near = Math.max(0.3, d * 0.5 - 45); c.far = d * 1.7 + 700;   // tight round the ground in view, for depth precision
    if (this.shift) c.setViewOffset(this.w, this.h, this.shift * this.w / 2, 0, this.w, this.h); else if (c.view) c.clearViewOffset();
    c.updateProjectionMatrix();
    c.position.set(this.target.x + Math.sin(this.yaw) * cp * d, gy + Math.sin(this.pitch) * d, this.target.z + Math.cos(this.yaw) * cp * d);
    c.lookAt(this.target.x, gy, this.target.z); if (wide) { this.scene.fog.near = d * 1.1 + 40; this.scene.fog.far = d * 3.2 + 500; } else { this.scene.fog.near = d * 1.02 + 30; this.scene.fog.far = d * 1.75 + 160; }
    this.shadowFit(z);
    this.sun.target.position.copy(this.target);
  }
  rotate(steps) { this.yawT += steps * Math.PI / 4; }
  // photo mode: a perspective camera that orbits, tilts from overhead down to eye level, and closes in
  setPhoto(on) {
    this.photo = on; this.cam = on ? this.persp : this.gcam;
    if (on) { this.distT = this.dist = this.zoom * 1.6; this.tiltT = this.tilt = this.pitch; }
  }
  tiltBy(d) { this.tiltT = Math.max(0.03, Math.min(1.5, this.tiltT + d)); }
  dolly(f) { this.distT = Math.max(1.2, Math.min(90, this.distT * f)); }
  spin(dx) { this.yawT += dx; this.yaw = this.yawT; }
  // out to about two kilometres across, never far enough to see the edge of the section (choosing the landing zone is
  // the one time the whole section is on show)
  zMax() { return this.sim?.callIn === 'flag' ? Math.max(30, Math.round(this.N * 0.5)) : 230; }
  zoomBy(f) { this.zoomT = Math.max(4, Math.min(this.zMax(), this.zoomT * f)); }
  // the sun's shadow box follows the zoom; zoomed right out, nothing is big enough to need one
  shadowFit(z) {
    const h = Math.min(90, Math.max(26, z * 1.5)), sc = this.sun.shadow.camera, on = z < 70;
    if (this.sun.castShadow !== on) this.sun.castShadow = on;
    if (Math.abs(sc.right - h) > 2) { Object.assign(sc, { left: -h, right: h, top: h, bottom: -h, far: 90 + h * 2 }); sc.updateProjectionMatrix(); }
  }
  pan(dxPx, dyPx) {   // drag the ground under the pointer
    const k = this.photo ? this.dist * 1.1 / this.h : this.zoom * 2 / this.h, s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const ax = -dxPx * k, az = dyPx * k / Math.sin(this.photo ? Math.max(0.35, this.tilt) : this.pitch);
    this.target.x += ax * c + az * -s; this.target.z += ax * -s + az * -c;
  }
  move(fx, fz, dt) { const k = (this.photo ? this.dist * 0.7 : this.zoom * 1.2) * dt, s = Math.sin(this.yaw), c = Math.cos(this.yaw); this.target.x += (fx * c - fz * s) * k; this.target.z += (-fx * s - fz * c) * k; }
  lookAt(tx, tz) { this.target.set(this.wx(tx), 0, this.wx(tz)); }

  // where the pointer is: the tile under it and the building it's over
  // a point on the base, on screen: [x, y] in page pixels, or null if behind the camera or off screen
  toScreen(x, z, y = null) {
    const v = new THREE.Vector3(this.wx(x), (y ?? 0) + (this.sim?.hAt ? this.sim.surfAt(x, z) : 0), this.wx(z)).project(this.cam);
    if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) return null;
    const r = this.canvas.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height];
  }
  // where the ear is: the tile the camera looks at, how high the camera is, and the screen's right on the ground
  ear() {
    const h = this.photo ? Math.max(1.2, this.dist * Math.sin(this.tilt) + 0.6) : this.zoom * 0.8;
    const e = this.cam.matrixWorld.elements, l = Math.hypot(e[0], e[2]) || 1;
    return [this.target.x + this.N / 2, this.target.z + this.N / 2, h, e[0] / l, e[2] / l];
  }
  pick(cx, cy) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2((cx - rect.left) / rect.width * 2 - 1, -(cy - rect.top) / rect.height * 2 + 1);
    this.ray.setFromCamera(ndc, this.cam);
    const p = this.groundHit(this.ray.ray);
    // buildings are drawn lifted onto the ground by the shader: test the ray against each one's box, lifted the same
    let bid = null, best = Infinity; const box = new THREE.Box3(), hit = new THREE.Vector3();
    for (const [id, g] of this.bm) {
      const b = this.sim.byId?.(id); if (!b) continue;
      g.userData.box ||= new THREE.Box3().setFromObject(g); box.copy(g.userData.box); const h = this.sim.surfAt(b.x + b.w / 2, b.z + b.d / 2); box.min.y += h; box.max.y += h;
      if (this.ray.ray.intersectBox(box, hit)) { const dd = hit.distanceTo(this.ray.ray.origin); if (dd < best) { best = dd; bid = id; } }
    }
    return { x: p.x + this.N / 2, z: p.z + this.N / 2, bid };
  }
  // where a ray meets the ground: march down it over the height field, then close in
  groundHit(ray) {
    const s = this.sim, o = ray.origin, d = ray.direction, H = x => (s?.hAt ? s.surfAt(x.x + this.N / 2, x.z + this.N / 2) : 0);
    if (!s?.hgt) { const p = new THREE.Vector3(); ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p); return p; }
    // start where the ray comes down through the top of the terrain
    let t0 = d.y < 0 ? Math.max(0, (o.y - 34) / -d.y) : 0, t1 = d.y < 0 ? (o.y + 10) / -d.y : 4000;   // the ground is never above 30 cells
    const step = 0.4, p = new THREE.Vector3(); let prev = t0;
    for (let t = t0; t <= t1; t += step) {
      p.copy(o).addScaledVector(d, t);
      if (p.y <= H(p)) { let a = prev, b = t; for (let k = 0; k < 12; k++) { const m = (a + b) / 2; p.copy(o).addScaledVector(d, m); if (p.y <= H(p)) b = m; else a = m; } p.copy(o).addScaledVector(d, b); return p; }
      prev = t;
    }
    ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p); return p;
  }

  // ---------------------------------------------------------------- the build ghost and the selection
  setGhost(type, x, z, rot, ok, spec = null) {
    if (!type) { if (this.ghostG) this.ghostG.visible = false; this.foot.visible = false; this.range.visible = false; this.grid.visible = false; if (this.ghostOn) { this.ghostOn = false; this.dome.visible = false; this.select(this.sim?.byId(this.selId) || null); } return; }
    this.ghostOn = true;
    const key = type + rot + JSON.stringify(spec);
    if (key !== this.ghostKey) {
      if (this.ghostG) this.world.remove(this.ghostG);
      this.ghostG = buildModel(type, this.m, false, spec && { ...spec, wing: spec.wing ?? (dims(type, 0, spec.design)[0] - B[type].w) / 2 }); this.ghostKey = key;
      // (GC 0.86) a blueprint: a faint wash and drafting lines, pale where it can go and red where it can't
      this.ghostMat ||= holoFill(BP.ok, 0.22); this.ghostEdge ||= holoEdge(BP.ok, 0.95);
      this.ghostG.traverse(o => { if (o.isMesh) { o.material = this.ghostMat; o.castShadow = false; } });
      holoize(this.ghostG, null, this.ghostEdge);
      this.ghostG.rotation.y = rot * Math.PI / 2; this.world.add(this.ghostG);
    }
    const [w, d] = dims(type, rot, spec?.design);
    this.ghostG.visible = true; this.ghostG.position.set(this.wx(x + w / 2), 0, this.wx(z + d / 2));
    tintHolo(this.ghostMat, this.ghostEdge, ok ? BP.ok : BP.bad);
    this.foot.visible = true; this.foot.scale.set(w, d, 1); this.foot.position.set(this.wx(x + w / 2), 0.04, this.wx(z + d / 2)); this.foot.material.color.set(ok ? BP.ok : BP.bad);
    this.grid.visible = true;
    // (GC 0.88) a source shows the network it would join; a Substation or a Water Tower its reach too, as a ring on the ground
    const s = this.sim, link = type === 'substation' ? 'pw' : B[type].relay === 'wa' ? 'wa' : null, ks = link ? [link] : s?.serves ? s.serves({ type }) : [];
    const nr = B[type].noise || (link ? s.coverOf({ type })[link] : 0); this.range.visible = !!nr;
    this.range.material.color.set(B[type].noise ? '#ff4a4a' : COVER_COL[link] || '#c98bff');
    if (nr) { this.range.scale.setScalar(nr); this.range.position.set(this.wx(x + w / 2), 0.05, this.wx(z + d / 2)); }
    this.beams.count = 0; this.dome.visible = false;
    if (ks.length && s.netsAt) { const k = ks[0], J = s.netJoin(), roots = new Set([...s.netsAt(x, z, w, d)].map(v => J.U[k].f(v))); this.setNet([...roots].map(r => ({ tiles: s.netTiles(r, k), col: ok ? COVER_COL[k] : '#ff6a5a' }))); }
    else this.setNet(null);
  }
  // (GC 0.86) a dome over how far a service reaches (GC 0.88: not used; reach is a ring on the ground, and a network its tiles)
  showDome(cx, cz, r, col) {
    const d = this.dome; d.visible = true; d.material.uniforms.uCol.value.set(col);
    d.scale.set(r, Math.min(r * 0.55, 4.5), r); d.position.set(this.wx(cx), this.sim?.hAt ? this.sim.surfAt(cx, cz) : 0, this.wx(cz));
  }
  // (GC 0.88) networks shown on the base: each tile washed in its service's colour, on whatever it is (the decks lift it onto
  // a foundation). Two layers: 'sel', what is selected or being placed; 'lens', the EFFICIENCY lens
  setNet(list, slot = 'sel') {
    const n = list ? list.reduce((a, e) => a + e.tiles.length, 0) : 0, key = 'netM_' + slot;
    let im = this[key];
    if (!n) { if (im) im.count = 0; return; }
    if (!im || im.userData.cap < n) {
      if (im) { this.world.remove(im); im.dispose(); }
      const geo = this.netGeo ||= (() => { const g = new THREE.PlaneGeometry(0.94, 0.94); g.rotateX(-Math.PI / 2); return g; })();
      const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: slot === 'lens' ? 0.26 : 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -18 });
      im = this[key] = new THREE.InstancedMesh(geo, mat, Math.max(256, n * 2)); im.userData.cap = Math.max(256, n * 2); im.raycast = () => {}; im.frustumCulled = false; im.renderOrder = 3; this.world.add(im);
    }
    const o = this.netO ||= new THREE.Object3D(), c = new THREE.Color(), N = this.N; let i = 0;
    for (const e of list) { c.set(e.col); for (const t of e.tiles) { o.position.set(this.wx(t % N + 0.5), slot === 'lens' ? 0.03 : 0.036, this.wx(Math.floor(t / N) + 0.5)); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, c); i++; } }
    im.count = i; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }
  // what a selected source serves: its network's tiles, a beam off everything on it that draws the service, and for a
  // Substation or a Water Tower the reach it joins networks across
  reachOf(b) {
    const s = this.sim; this.beams.count = 0; this.setNet(null);
    if (!b.done || b.off || !s?.serves) return;
    const link = b.type === 'substation' ? 'pw' : B[b.type].relay === 'wa' ? 'wa' : null, ks = link ? [link] : s.serves(b); if (!ks.length) return;
    const k = ks[0], root = s.netOf(b, k);
    if (root) this.setNet([{ tiles: s.netTiles(root, k), col: COVER_COL[k] }]);
    if (link) { const r = s.coverOf(b)[link]; this.range.visible = true; this.range.material.color.set(COVER_COL[link]); this.range.scale.setScalar(r); this.range.position.set(this.wx(b.x + b.w / 2), 0.05, this.wx(b.z + b.d / 2)); }
    this.beams.material.color.set(COVER_COL[k]).multiplyScalar(1.4);
    const o = this.beamO ||= new THREE.Object3D();
    for (const q of s.servedList(b, k)) {
      if (this.beams.count >= 120) break;
      const g = this.bm.get(q.id), top = g?.userData.top ?? 0.8;
      o.position.set(this.wx(q.x + q.w / 2), top + 0.05, this.wx(q.z + q.d / 2)); o.scale.set(1, 1.2 + 0.25 * Math.sin(q.id), 1); o.updateMatrix();
      this.beams.setMatrixAt(this.beams.count++, o.matrix);
    }
    this.beams.instanceMatrix.needsUpdate = true;
  }
  select(b) {
    this.selId = b ? b.id : null; this.sel.visible = !!b;
    if (!this.ghostOn) { this.dome.visible = false; this.beams.count = 0; this.setNet(null); }
    if (!b) { this.range.visible = false; return; }
    const x0 = this.wx(b.x) - 0.05, z0 = this.wx(b.z) - 0.05, x1 = this.wx(b.x + b.w) + 0.05, z1 = this.wx(b.z + b.d) + 0.05;
    this.sel.geometry.setFromPoints([new THREE.Vector3(x0, 0.06, z0), new THREE.Vector3(x1, 0.06, z0), new THREE.Vector3(x1, 0.06, z1), new THREE.Vector3(x0, 0.06, z1)]);
    const nr = B[b.type].noise; this.range.visible = !!nr;
    if (nr) { this.range.scale.setScalar(nr); this.range.position.set(this.wx(b.x + b.w / 2), 0.05, this.wx(b.z + b.d / 2)); }
    if (!this.ghostOn) this.reachOf(b);     // (GC 0.88) after the noise ring: a Substation's reach is a ring too
  }

  // ---------------------------------------------------------------- every frame
  frame(dt) {
    // the fine ground follows the camera
    if (this.gch && (this.lodT = (this.lodT || 0) - dt) <= 0) { this.lodT = 0.3; this.chunkLOD(); }
    // the ground was worked: new heights, colours, water and rock where it changed (at most a few times a second)
    { const s = this.sim; this.tfT = (this.tfT || 0) - dt;
      if (s && this.ground && this.tfT <= 0 && (s.hgtV !== this.hgtSeen || s.paintV !== this.paintSeen || s.terrV !== this.terrSeen)) {
        this.tfT = 0.25;
        const d = s.dirtyBox; s.dirtyBox = null;
        if (s.hgtV !== this.hgtSeen) this.groundHeights(d);
        if (d) this.paintTiles(d[0], d[1], d[2], d[3]);
        if (s.terrV !== this.terrSeen) { this.syncTerrain(); this.terrSeen = s.terrV; }
        this.paintSeen = s.paintV;
        for (const g of this.bm.values()) delete g.userData.box;
      } }
    this.t += dt; this.dtLast = dt; const s = this.sim, t = this.t;
    this.camUpdate(dt);
    this.syncRoads(); this.syncPlaza(); this.syncLz(); this.syncRamps();
    this.syncBuildings(dt);
    this.syncScrub(); this.syncZones(); this.syncFlora(dt);
    this.syncPeople(dt);
    this.syncVehicles(dt);
    this.smokeUpdate(dt); this.routeTick(dt);
    HOLO.t.value = t; this.sparks.update(dt);
    if (this.selId != null && !this.ghostOn && (this.reachT = (this.reachT || 0) - dt) <= 0) { this.reachT = 0.5; const b = s.byId(this.selId); if (b) this.reachOf(b); }
    // the boom barriers lift for anything on wheels and drop behind it
    for (const bm of this.booms || []) {
      const u = bm.userData, up = s.veh.some(v => !v.away && Math.hypot(v.x - u.gx, v.z - u.gz) < u.r);
      if (up !== !!u.up) { u.up = up; this.onBoom?.(u.gx, u.gz, up); }
      bm.rotation.z += ((up ? 1.35 : 0) - bm.rotation.z) * Math.min(1, dt * 4);
    }
    if (this.sel.visible) this.sel.material.color.setHSL(0.15, 1, 0.5 + 0.2 * Math.sin(t * 6));
    // shadows are redrawn every frame only at the top graphics level; lower levels redraw them every few frames
    const every = [1, 3, 6, 0][this.q];
    this.fr = (this.fr || 0) + 1;
    if (every > 1 && this.fr % every === 0) this.r.shadowMap.needsUpdate = true;
    if (this.fr % 60 === 1) surfScale(this.scene, 1.8 / 0.575);     // (GC 0.70) the surface detail in metres: a 1.8 m person stands 0.575 units
    if (this.bloom.on && this.q < 3) this.bloom.render(this.scene, this.cam, this.q <= 1 ? 4 : 0);     // (GC 0.86) with glow; the lowest level goes without
    else this.r.render(this.scene, this.cam);
    this.autoQuality();
    void s;
  }
  // graphics level: 0 full, 1 lighter shadows, 2 lower resolution, 3 no shadows. 'auto' steps down when frames run slow
  setQuality(mode) {
    this.qMode = mode; this.qT = 0; this.qN = 0;
    this.applyQ(mode === 'auto' ? (this.q ?? 0) : mode === 'high' ? 0 : mode === 'low' ? 3 : 1);
  }
  applyQ(q) {
    const was = this.q; this.q = q; if (this.scU) this.scU.uScK.value.y = q >= 3 ? 0 : 1;     // (GC 0.92: no scanned ground on the lowest setting)
    const dpr = window.devicePixelRatio || 1;
    this.r.setPixelRatio([Math.min(2, dpr), Math.min(1.5, dpr), Math.min(1, dpr), Math.min(1, dpr) * 0.75][q]);
    this.r.shadowMap.autoUpdate = q === 0; this.r.shadowMap.needsUpdate = true;
    if ((q === 3) !== (was === 3)) { this.r.shadowMap.enabled = q !== 3; this.sun.castShadow = q !== 3; this.scene.traverse(o => { if (o.material && !Array.isArray(o.material)) o.material.needsUpdate = true; }); }
    this.resize(); this.onQuality?.(q);
  }
  autoQuality() {
    const now = performance.now(), d = now - (this.qLast || now); this.qLast = now;
    if (this.qMode !== 'auto' || d > 500 || document.hidden) return;   // a long gap is a tab switch, not a slow frame
    this.qT += d; this.qN++;
    if (this.qT < 2500) return;
    const avg = this.qT / this.qN; this.qT = 0; this.qN = 0;
    if (avg > 30 && this.q < 3) this.applyQ(this.q + 1);   // under about 33 frames a second: ease off
  }

  syncBuildings(dt) {
    const s = this.sim, t = this.t;
    for (const b of s.b) {
      let g = this.bm.get(b.id);
      const key = `${b.std ?? ''}:${b.design || 0}:${(b.parts || []).join()}:${b.w}x${b.d}@${b.x},${b.z}${b.type === 'slab' ? `:${b.k}:${b.lv}` : ''}`;
      if (g && g.userData.key !== key) { if (g.userData.ck) this.unbatch(g); this.world.remove(g); this.bm.delete(b.id); g = null; }   // refitted: build it again
      if (!g) {
        g = new THREE.Group(); g.userData.b = b.id; g.userData.key = key;
        const std = b.std != null && b.std < 2 ? { std: b.std, w: b.rot % 2 ? b.d : b.w, d: b.rot % 2 ? b.w : b.d } : null;
        const model = b.type === 'slab' ? slabModel(b.w, b.d, b.lv || 0, b.k, this.m) : buildModel(b.type, this.m, true, std || (b.design || b.parts?.length ? { design: b.design, parts: b.parts, wing: wingOf(b) } : null)); model.rotation.y = b.rot * Math.PI / 2; g.add(model); g.userData.model = model;
        if (b.type === 'slab') { g.userData.bot = -SLAB_LV[b.lv || 0].h; g.userData.slab = true; }     // (GC 0.87) rises from the ground to its top
        g.position.set(this.wx(b.x + b.w / 2), 0, this.wx(b.z + b.d / 2));
        g.traverse(o => { o.userData.bid = b.id; });
        const box = new THREE.Box3().setFromObject(model); g.userData.top = box.max.y;
        const d = B[b.type];
        if (d.crew || d.pw < 0) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), this.m.glowG); lamp.position.set(0, box.max.y + 0.25, 0); lamp.userData.bid = b.id; g.add(lamp); g.userData.lamp = lamp; }
        this.world.add(g); this.bm.set(b.id, g);
      }
      const model = g.userData.model, ud = model.userData;
      if (g.userData.slab) { const y = b.done ? 0 : SLAB_LV[b.lv || 0].h; if (g.position.y !== y) { g.position.y = y; delete g.userData.box; } }     // (GC 0.87) until it is down, the decks don't lift it: this does
      // under construction (or being upgraded)
      const busy = !b.done || !!b.upg;
      if (!b.done) this.holoBuild(g, b, dt);     // (GC 0.86) going up: it rises out of its own hologram, sparks flying at the line
      else if (g.userData.holo) this.holoDone(g, b);
      if (busy && b.done) {     // being upgraded: scaffolding round it, sparks along the top
        this.sparkRing(g, b, g.userData.top + 0.1, 0.3);
        if (!g.userData.scaf) {
          const h = Math.max(0.8, g.userData.top + 0.2), sc = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(b.w - 0.1, h, b.d - 0.1, Math.max(1, b.w), 2, Math.max(1, b.d))), this.m.scaffold);
          sc.position.y = h / 2; g.add(sc); g.userData.scaf = sc;
        }
      } else if (g.userData.scaf) { g.remove(g.userData.scaf); g.userData.scaf = null; model.scale.y = 1; }
      // wear: grime on the roof as the condition drops, and it leans a little when it's really bad
      const worn = b.cond < 60 ? (b.cond < 35 ? 2 : 1) : 0;
      if (g.userData.worn !== worn) {
        if (g.userData.grime) g.remove(g.userData.grime);
        g.userData.grime = null; g.userData.worn = worn; model.rotation.z = worn === 2 ? 0.025 : 0; if (g.userData.ck) this.unbatch(g);
        if (worn) {
          const gr = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: worn === 2 ? '#1a120a' : '#3a2c1a', transparent: true, opacity: worn === 2 ? 0.55 : 0.35, depthWrite: false });
          for (let i = 0; i < 3 + worn * 3; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.15 + Math.random() * 0.25, 7), mat); p.rotation.x = -Math.PI / 2; p.position.set((Math.random() - 0.5) * (b.w - 0.4), g.userData.top + 0.01, (Math.random() - 0.5) * (b.d - 0.4)); gr.add(p); }
          g.add(gr); g.userData.grime = gr;
        }
      }
      if (busy) { if (g.userData.ck) this.unbatch(g); continue; }
      if (!g.userData.ck && !this.noBatch) this.batch(g);
      const w = s.work(b);
      if (g.userData.lamp) {
        const d = B[b.type], noCrew = d.crew && b.crew < d.crew, noPow = d.pw < 0 && (s.power.ratio < 1 || b.dark);
        g.userData.lamp.material = b.off ? this.m.glowR : noPow ? ((t * 2) % 1 < 0.5 ? this.m.glowR : this.m.glowY) : noCrew ? this.m.glowY : this.m.glowG;
        g.userData.lamp.position.y = g.userData.top + 0.25 + Math.sin(t * 2 + b.id) * 0.03;
      }
      if (ud.beam) ud.beam.rotation.z = Math.sin(t * 2.2 + b.id) * 0.28 * Math.min(1, w * 1.5);
      if (ud.spin) ud.spin.rotation.y += dt * 0.6;
      if (ud.spin2) ud.spin2.rotation.y -= dt * 0.9;
      if (ud.nod) ud.nod.rotation.x = Math.sin(t * 1.6 + b.id) * 0.3;
      if (ud.spinZ) ud.spinZ.rotation.z += dt * 1.4;
      if (ud.blink) { const on = (t + b.id * 0.37) % 1.6 < 0.8; for (const l of ud.blink) l.visible = on; }
      if (ud.glow) ud.glow.material.emissiveIntensity = w > 0 ? 1 + Math.sin(t * 9) * 0.3 : 0.1;
      if (ud.smoke && b.running && Math.random() < dt * 5) for (const p of ud.smoke) {
        const v = new THREE.Vector3(...p).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.rot * Math.PI / 2).add(g.position); this.puff(v);
      }
      if (ud.plaques) ud.plaques.count = Math.min(64, s.fallen.length);
      if (ud.dirt) { if (ud.dirt.material === this.m.grime) ud.dirt.material = this.m.grime.clone(); ud.dirt.material.opacity = Math.max(0, 0.75 - (b.clean ?? 100) / 100 * 0.9); }
      if (ud.crates) { const cap = (B[b.type].store?.rations || 0) + (B[b.type].store?.ammo || 0), n = Math.round(Math.min(1, ((b.stock?.rations || 0) + (b.stock?.ammo || 0)) / Math.max(1, cap)) * 12); ud.crates.forEach((c, i) => c.visible = i < n); }
      if (B[b.type].pad) this.padCrates(g, b);
      if (!ud.waves) { ud.waves = []; model.traverse(o => { if (o.userData.wave) ud.waves.push(o); }); }
      for (const o of ud.waves) { const wv = o.userData.wave;
        const pos = o.geometry.attributes.position, a = pos.array, base = wv.base;
        for (let i = 0; i < a.length; i += 3) {
          const x = base[i], y = base[i + 1], k = wv.soft ? 0 : x / wv.w;
          a[i + 2] = wv.soft ? Math.sin(t * 1.8 + y * 2 + b.id) * 0.04 * (0.55 - y) : Math.sin(x * 5 - t * 6 + b.id) * 0.07 * k + Math.sin(t * 2.3 + b.id) * 0.03 * k;
        }
        pos.needsUpdate = true; }
    }
    for (const [id, g] of this.bm) if (!s.byId(id)) { if (g.userData.ck) this.unbatch(g); this.world.remove(g); this.bm.delete(id); if (this.selId === id) this.select(null); }
    // one chunk a frame is re-merged, so a big change spreads over a few frames
    for (const c of this.chunks?.values() || []) if (c.dirty) { this.rebuildChunk(c); break; }
  }
  // ---------------------------------------------------------------- (GC 0.87) ramps: where a road or footpath crosses the rim of a
  // raised foundation, a concrete wedge under it. The decks lift the slab's edge corners and not the far ones, so the road
  // over the rim tile already climbs; this fills in under it. One tile box, top at 0 and a level deep, per ramp tile
  syncRamps() {
    const s = this.sim; if (!s.rim) return;
    const key = `${s.slabV}:${s.roadsV}`; if (this.rampKey === key) return; this.rampKey = key;
    const N = s.N, list = [], seen = new Set();
    for (const sl of s.slabs()) {
      if (!sl.lv || !sl.done) continue; const h = SLAB_LV[sl.lv].h;
      for (let j = -1; j <= sl.d; j++) for (let i = -1; i <= sl.w; i++) {
        const x = sl.x + i, z = sl.z + j, k = z * N + x; if (x < 0 || z < 0 || x >= N || z >= N || seen.has(k) || s.slabMap[k] || !s.roads[k]) continue;
        seen.add(k); list.push([x, z, h]);
      }
    }
    if (this.rampM) { this.world.remove(this.rampM); this.rampM.dispose(); this.rampM = null; }
    if (!list.length) return;
    const geo = this.rampGeo ||= (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, -0.5, 0); return g; })();
    const pr = sharedGeo(this.m, 'prop_ramp');     // (GC 0.90) its Blender model, kerbs both sides, once it has come
    const im = this.rampM = new THREE.InstancedMesh(pr || geo, pr ? (this.m.model ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.04, side: THREE.DoubleSide })) : (this.m._slab || this.m.concrete), list.length), o = new THREE.Object3D();
    list.forEach(([x, z, h], n) => { o.position.set(this.wx(x + 0.5), -0.004, this.wx(z + 0.5)); o.scale.set(1, h + 0.3, 1); o.updateMatrix(); im.setMatrixAt(n, o.matrix); });
    im.receiveShadow = true; im.castShadow = true; im.raycast = () => {}; this.world.add(im);
  }
  // laying a foundation: its blueprint over the ground, as big and as high as it will be
  setSlabGhost(r, lv = 0, ok = true) {
    const G = this.slabG;
    if (!r) { if (G) G.visible = false; return; }
    const h = Math.max(0.05, SLAB_LV[lv].h), key = `${r.w}x${r.d}x${lv}`;
    if (!G || G.userData.key !== key) {
      if (G) { this.world.remove(G); G.traverse(o => o.geometry?.dispose()); }
      const g = this.slabG = new THREE.Group(); g.userData.key = key;
      const geo = new THREE.BoxGeometry(r.w, h, r.d, Math.min(24, r.w), 1, Math.min(24, r.d)); geo.translate(0, h / 2, 0);
      this.slabFill ||= holoFill(BP.ok, 0.18); this.slabEdge ||= holoEdge(BP.ok, 0.95);
      const f = new THREE.Mesh(geo, this.slabFill); f.raycast = () => {}; f.renderOrder = 2;
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), this.slabEdge); e.raycast = () => {}; e.renderOrder = 2;
      g.add(f, e); this.world.add(g);
    }
    this.slabG.visible = true; this.slabG.position.set(this.wx(r.x + r.w / 2), 0, this.wx(r.z + r.d / 2));
    tintHolo(this.slabFill, this.slabEdge, ok ? BP.ok : BP.bad);
  }

  // ---------------------------------------------------------------- (GC 0.86) building as a hologram: the finished building is cut
  // off at a line that climbs with the work; above it, its blueprint in light; at it, a burning line throwing sparks
  holoBuild(g, b, dt) {
    const u = g.userData, model = u.model;
    let h = u.holo;
    if (!h) {
      h = u.holo = { pl0: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), pl1: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), mats: [], seen: b.prog, t: -9 };
      h.fill = holoFill(BP.ok, 0.08); h.edge = holoEdge(BP.ok, 0.8); h.fill.clippingPlanes = [h.pl1]; h.edge.clippingPlanes = [h.pl1];
      const swap = m => { const c = m.clone(); c.clippingPlanes = [h.pl0]; c.clipShadows = true; h.mats.push(c); return c; };
      model.traverse(o => { if (o.isMesh && !o.userData.holo) { o.userData.m0 = o.material; o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material); } });
      h.added = holoize(model, h.fill, h.edge);
      const w = b.w / 2 - 0.02, d = b.d / 2 - 0.02;
      h.line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w, 0, -d), new THREE.Vector3(w, 0, -d), new THREE.Vector3(w, 0, d), new THREE.Vector3(-w, 0, d)]), holoEdge(BP.work, 0.9));
      h.line.raycast = () => {}; h.line.renderOrder = 3; g.add(h.line);
      model.scale.y = 1;
    }
    const bot = u.bot || 0, y = bot + Math.max(0.03, (u.top - bot) * b.prog), gy = (this.sim.hAt ? this.sim.surfAt(b.x + b.w / 2, b.z + b.d / 2) : 0) + g.position.y;
    h.pl0.constant = gy + y; h.pl1.constant = -(gy + y); h.line.position.y = y;
    if (b.prog !== h.seen) { h.seen = b.prog; h.t = this.t; }
    const live = this.t - h.t < 1.5;     // work going on: welding sparks at the line; stalled, the drawing fades back
    h.line.material.opacity = live ? 0.9 : 0.35;
    h.edge.opacity = live ? 0.8 : 0.45;
    if (live) this.sparkRing(g, b, y + g.position.y, 1);
  }
  holoDone(g, b) {
    const h = g.userData.holo; g.userData.holo = null;
    unholoize(h.added); g.remove(h.line);
    g.userData.model.traverse(o => { if (o.userData.m0) { o.material = o.userData.m0; delete o.userData.m0; } });
    for (const m of h.mats) m.dispose(); h.fill.dispose(); h.edge.dispose(); h.line.material.dispose(); h.line.geometry.dispose();
    if (b) for (let i = 0; i < 3; i++) this.sparkRing(g, b, g.userData.top * (0.3 + i * 0.35), 0, 10);     // done: a last shower
  }
  // sparks thrown off a footprint's outline at a height: k scales the rate, n (if given) is a burst of that many per tile of edge
  sparkRing(g, b, y, k, n = 0) {
    const S = this.sparks, cx = g.position.x, cz = g.position.z, w = b.w / 2, d = b.d / 2, P = 2 * (b.w + b.d);
    let c = n ? n * P / 8 : 2.5 * P * k * (this.dtLast || 0.016);
    while (c > 0) {
      if (c < 1 && Math.random() > c) break; c--;
      const e = Math.random() * P; let x, z, nx = 0, nz = 0;
      if (e < b.w) { x = -w + e; z = -d; nz = -1; } else if (e < b.w + b.d) { x = w; z = -d + e - b.w; nx = 1; }
      else if (e < 2 * b.w + b.d) { x = w - (e - b.w - b.d); z = d; nz = 1; } else { x = -w; z = d - (e - 2 * b.w - b.d); nx = -1; }
      const sp = 0.4 + Math.random() * 1.4;
      S.emit(cx + x, y, cz + z, nx * sp + (Math.random() - 0.5) * 0.9, 0.6 + Math.random() * 1.8, nz * sp + (Math.random() - 0.5) * 0.9, 0.35 + Math.random() * 0.55);
    }
  }

  // ---------------------------------------------------------------- batching: the still parts of finished buildings are
  // merged per 32-tile chunk and material, so a Major Base is a few hundred draw calls, not a few thousand. The building's
  // own copies stay (hidden) for picking, and come back while it's being built, refitted or changes its wear
  batch(g) {
    const mm = g.userData.mm ||= (() => { const l = []; g.userData.model.traverse(o => { if (o.isMesh && o.userData.merged) l.push(o); }); return l; })();
    if (!mm.length) { g.userData.ck = 'none'; return; }
    const ck = `${Math.floor(g.position.x / 32)},${Math.floor(g.position.z / 32)}`;
    this.chunks ||= new Map();
    let c = this.chunks.get(ck); if (!c) { c = { members: new Set(), group: new THREE.Group(), dirty: true }; this.world.add(c.group); this.chunks.set(ck, c); }
    c.members.add(g); c.dirty = true; g.userData.ck = ck;
  }
  unbatch(g) {
    const c = this.chunks?.get(g.userData.ck); g.userData.ck = null;
    for (const m of g.userData.mm || []) m.visible = true;
    if (c) { c.members.delete(g); c.dirty = true; }
  }
  rebuildChunk(c) {
    c.dirty = false;
    for (const m of [...c.group.children]) { c.group.remove(m); m.geometry.dispose(); }
    this.world.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.world.matrixWorld).invert(), groups = new Map(), mx = new THREE.Matrix4();
    for (const g of c.members) for (const m of g.userData.mm) {
      m.visible = false;
      const key = m.material.uuid + (m.castShadow ? 's' : '');
      if (!groups.has(key)) groups.set(key, { mat: m.material, cast: m.castShadow, list: [] });
      groups.get(key).list.push([m.geometry, mx.multiplyMatrices(inv, m.matrixWorld).clone()]);
    }
    for (const { mat, cast, list } of groups.values()) {
      const n = list.reduce((a, [geo]) => a + geo.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let k = 0; const v = new THREE.Vector3(), nm = new THREE.Matrix3();
      for (const [geo, M] of list) {
        const P = geo.attributes.position.array, Nn = geo.attributes.normal.array, cnt = geo.attributes.position.count; nm.getNormalMatrix(M);
        for (let i = 0; i < cnt; i++) {
          v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(M); pos[(k + i) * 3] = v.x; pos[(k + i) * 3 + 1] = v.y; pos[(k + i) * 3 + 2] = v.z;
          v.set(Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2]).applyMatrix3(nm).normalize(); nor[(k + i) * 3] = v.x; nor[(k + i) * 3 + 1] = v.y; nor[(k + i) * 3 + 2] = v.z;
        }
        uv.set(geo.attributes.uv.array, k * 2); k += cnt;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = cast; mesh.receiveShadow = true; mesh.raycast = () => {}; c.group.add(mesh);
    }
    this.r.shadowMap.needsUpdate = true;
  }

  padCrates(g, b) {   // supplies waiting on the pad, as stacks of crates
    const st = b.stock || {}, n = Math.min(18, Math.ceil(((st.rations || 0) + (st.fuel || 0) + (st.ammo || 0)) / 12));
    // two instanced meshes (the crates and their hazard bands) instead of 36 meshes per pad
    if (!g.userData.pc) {
      const body = new THREE.InstancedMesh(this.crateGeo ||= new THREE.BoxGeometry(0.3, 0.26, 0.3), this.m.crate, 18), band = new THREE.InstancedMesh(this.bandGeo ||= new THREE.BoxGeometry(0.31, 0.05, 0.31), this.m.hazard, 18), o = new THREE.Object3D();
      for (let i = 0; i < 18; i++) { o.position.set(-1.1 + (i % 3) * 0.36, 0.1 + Math.floor(i / 9) * 0.27 + 0.13, 0.75 + (Math.floor(i / 3) % 3) * 0.33); o.updateMatrix(); body.setMatrixAt(i, o.matrix); o.position.y += 0.06; o.updateMatrix(); band.setMatrixAt(i, o.matrix); }
      body.castShadow = true; body.userData.bid = band.userData.bid = b.id; body.raycast = band.raycast = () => {};
      g.add(body, band); g.userData.pc = [body, band];
    }
    for (const im of g.userData.pc) im.count = n;
  }
  puff(p) {
    let m = this.smoke.find(q => !q.visible);
    if (!m) { if (this.smoke.length > 120) return; m = new THREE.Mesh(this.smokeGeo, new THREE.MeshStandardMaterial({ color: '#8d8a84', transparent: true, opacity: 0.6, depthWrite: false })); this.world.add(m); this.smoke.push(m); }
    m.visible = true; m.position.copy(p); m.userData.age = 0; m.scale.setScalar(0.6);
  }
  smokeUpdate(dt) {
    for (const m of this.smoke) if (m.visible) {
      const a = (m.userData.age += dt); m.position.y += dt * 0.5; m.position.x += dt * 0.25; m.scale.setScalar(0.6 + a * 0.9);
      m.material.opacity = Math.max(0, 0.5 * (1 - a / 3.5)); if (a > 3.5) m.visible = false;
    }
  }

  // ---------------------------------------------------------------- (GC 0.42) THE PEOPLE ARE THE MODELS MADE IN BLENDER: the same
  // soldier, Vanguard, citizens and crew the ground and the station show, each act one of the model's own poses. Until the files
  // have come (a moment), the old jointed figure below stands in.
  dressFolk() {
    const m = this.m, dark = (c, f) => c.clone().multiplyScalar(f), u = m.uniform.color, prim = m.prim.color;
    const fleet = { uniform: u, uniform_dark: dark(u, 0.78), kit: dark(u, 0.62), helmet: m.helmet.color, armband: m.armband.color, trim: prim };
    const K = { troop: { file: 'soldier', remap: fleet }, vg: { file: 'vanguard', remap: fleet }, eng: { file: 'engineer', remap: { trim: prim } }, inspector: { file: 'inspector', remap: { trim: prim } },
      civ0: { file: 'citizen_a', remap: { trim: prim } }, civ1: { file: 'citizen_b', remap: { trim: prim } }, civ2: { file: 'citizen_c', remap: { trim: prim } } };
    if (this.folk) this.folk.dispose();
    this.folk = new Crowd3D(this.world, { cap: 64 }); this.folk.load(K);
  }
  syncFolk() {
    const L = this.life, t = this.t, F = this.folk, far = this.zoom > 20, TAU = Math.PI * 2;
    this.cam.updateMatrixWorld(); const fr = this.frust ||= new THREE.Frustum(), sph = this.psph ||= new THREE.Sphere(new THREE.Vector3(), 1.2);
    fr.setFromProjectionMatrix((this.pmat ||= new THREE.Matrix4()).multiplyMatrices(this.cam.projectionMatrix, this.cam.matrixWorldInverse));
    const M = this.fM ||= new THREE.Matrix4(), Q = this.fQ ||= new THREE.Quaternion(), P = this.fP ||= new THREE.Vector3(), S = this.fS ||= new THREE.Vector3(), UP = this.fU ||= new THREE.Vector3(0, 1, 0);
    const step = (ph, n) => Math.floor((((ph % TAU) + TAU) % TAU) / TAU * n) % n;
    F.begin();
    for (const a of L.actors.values()) {
      if (a.hidden) continue;
      const k = F.ready(a.kind) ? a.kind : a.kind.startsWith('civ') ? 'civ0' : 'troop'; if (!F.ready(k)) continue;
      const wx = this.wx(a.x), wz = this.wx(a.z);
      sph.center.set(wx, 0.6 + (this.sim.hAt ? this.sim.surfAt(a.x, a.z) : 0), wz); if (!fr.intersectsSphere(sph)) continue;
      const ph = t * 9 + a.seed; let f = 'stand', y = 0;
      if (a.act === 'lie') f = 'down';
      else if (!far) switch (a.act) {
        case 'walk': f = 'w' + step(ph, 8); y = Math.abs(Math.sin(ph)) * 0.012; break;
        case 'run': f = 'r' + step(ph * 1.4, 8); y = Math.abs(Math.sin(ph * 1.4)) * 0.025; break;
        case 'drill': f = (F.has(k, 'm0') ? 'm' : 'w') + step(t * 6 + Math.floor(a.x), 8); break;
        case 'work': case 'build': f = 'k' + step(t * 7 + a.seed, 4); break;
        case 'inspect': f = 'n' + Math.min(2, Math.floor((Math.sin(t * 1.5 + a.seed) + 1) * 1.5)); break;
        case 'heart': case 'salute': case 'drink': case 'mourn': case 'look': f = a.act; break;
        case 'aim': f = F.has(k, 'aim') ? 'aim' : 'stand'; break;
      }
      const s = 0.3194 / F.unit(k);     // (a 1.8 m person stands 0.575 of the base's units, as the jointed figure did)
      P.set(wx, y, wz); Q.setFromAxisAngle(UP, a.yaw); S.setScalar(s); F.put(k, f, M.compose(P, Q, S), null, far);
    }
    F.end();
    if (this.pm.size) { this.pm.clear(); for (const c of Object.values(this.crowd)) for (const im of c.ims) im.count = 0; }
  }
  syncPeople(dt) {
    if (this.folk && this.folk.ready('troop') && this.folk.ready('civ0')) return this.syncFolk();
    const L = this.life, t = this.t;
    // only people on screen are posed and drawn; zoomed far out, limbs stop moving (nobody can see them) and a person who
    // has not moved keeps last frame's matrices
    this.cam.updateMatrixWorld(); const fr = this.frust ||= new THREE.Frustum(), sph = this.psph ||= new THREE.Sphere(new THREE.Vector3(), 1.2);
    fr.setFromProjectionMatrix((this.pmat ||= new THREE.Matrix4()).multiplyMatrices(this.cam.projectionMatrix, this.cam.matrixWorldInverse));
    const far = this.zoom > 20;
    for (const [id, a] of L.actors) {
      let g = this.pm.get(id);
      // each person is a rig that is never drawn itself: its parts are copied into one instanced mesh per part
      if (!g) { g = makePerson(this.m, a.kind); g.scale.setScalar(1.15); g.userData.list = []; g.traverse(o => { if (o.isMesh) g.userData.list.push(o); }); this.pm.set(id, g); }
      g.visible = !a.hidden;
      const u = g.userData, wx = this.wx(a.x), wz = this.wx(a.z);
      sph.center.set(wx, 0.6 + (this.sim.hAt ? this.sim.surfAt(a.x, a.z) : 0), wz); u.seen = g.visible && fr.intersectsSphere(sph);     // (GC 0.27: where they are drawn, on the land's height; on high ground, close in, they were dropped as out of sight)
      if (!u.seen) continue;
      if (far && a.act !== 'lie') {
        if (!u.rest || u.px !== wx || u.pz !== wz || u.yaw !== a.yaw) {
          if (!u.rest) for (const k of ['legL', 'legR', 'armL', 'armR', 'head']) u.parts[k].rotation.set(0, 0, 0);
          if (!u.rest) { u.parts.armL.userData.elbow.rotation.set(0, 0, 0); u.parts.armR.userData.elbow.rotation.set(0, 0, 0); poseKit(g, 'stand'); }
          g.position.set(wx, 0, wz); g.rotation.set(0, a.yaw, 0); u.rest = true; u.dirty = true; u.px = wx; u.pz = wz; u.yaw = a.yaw;
        }
        continue;
      }
      u.rest = false; u.dirty = true; u.px = NaN;
      g.position.set(wx, 0, wz); g.rotation.set(0, a.yaw, 0);
      const p = g.userData.parts, ph = t * 9 + a.seed;
      p.legL.rotation.set(0, 0, 0); p.legR.rotation.set(0, 0, 0); p.armL.rotation.set(0, 0, 0); p.armR.rotation.set(0, 0, 0); p.head.rotation.set(0, 0, 0);
      const eL = p.armL.userData.elbow, eR = p.armR.userData.elbow; eL.rotation.set(0, 0, 0); eR.rotation.set(0, 0, 0);
      g.position.y = 0;
      switch (a.act) {
        case 'walk': p.legL.rotation.x = Math.sin(ph) * 0.6; p.legR.rotation.x = -Math.sin(ph) * 0.6; p.armL.rotation.x = -Math.sin(ph) * 0.5; p.armR.rotation.x = Math.sin(ph) * 0.5; eL.rotation.x = eR.rotation.x = -0.35; g.position.y = Math.abs(Math.sin(ph)) * 0.015; break;
        case 'heart': p.armR.rotation.set(-0.55, 0, 0.5); eR.rotation.x = -2.0; break;
        case 'salute': p.armR.rotation.set(-0.15, 0, -1.2); eR.rotation.set(-0.2, 0, -2.1); break;     // (the hand to the brow, the elbow out to the side)
        case 'work': case 'build': p.armR.rotation.x = -1.4 + Math.sin(t * 7 + a.seed) * 0.5; eR.rotation.x = -0.9 + Math.sin(t * 7 + a.seed) * 0.4; p.armL.rotation.x = -0.6; eL.rotation.x = -0.8; break;
        case 'drill': { const k = Math.sin(t * 6 + Math.floor(a.x)); p.legL.rotation.x = Math.max(0, k) * -1.1; p.legR.rotation.x = Math.max(0, -k) * -1.1; p.armL.rotation.x = k * 0.7; p.armR.rotation.x = -k * 0.7; eL.rotation.x = eR.rotation.x = -0.4; g.position.y = Math.abs(k) * 0.02; break; }
        case 'drink': p.armR.rotation.set(-0.9, 0, -0.3); eR.rotation.x = -2.0 + Math.sin(t * 2 + a.seed) * 0.25; break;
        case 'mourn': p.head.rotation.x = 0.5; p.armL.rotation.x = -0.3; p.armR.rotation.x = -0.3; eL.rotation.x = eR.rotation.x = -1.2; break;
        case 'inspect': p.armR.rotation.x = -0.4; eR.rotation.x = -1.2; p.head.rotation.x = 0.3; p.head.rotation.y = Math.sin(t * 1.5 + a.seed) * 0.4; break;
        case 'look': p.head.rotation.x = -0.25; break;
        case 'run': p.legL.rotation.x = Math.sin(ph * 1.4) * 0.9; p.legR.rotation.x = -Math.sin(ph * 1.4) * 0.9; p.armL.rotation.x = -Math.sin(ph * 1.4) * 0.8; p.armR.rotation.x = Math.sin(ph * 1.4) * 0.8; eL.rotation.x = eR.rotation.x = -1.2; g.position.y = Math.abs(Math.sin(ph * 1.4)) * 0.03; break;
        case 'aim': p.armR.rotation.set(-1.5, 0, -0.25); p.armL.rotation.set(-1.45, 0, 0.35); eR.rotation.x = -0.2; eL.rotation.x = -0.3; p.head.rotation.x = 0.1; break;
        case 'lie': g.rotation.set(-Math.PI / 2, a.yaw, 0, 'YXZ'); g.position.y = 0.06; break;
        default: p.armL.rotation.x = Math.sin(t * 1.5 + a.seed) * 0.05;
      }
      poseKit(g, a.act, ph);     // (GC 0.27) the knees bend with the stride; the rifle comes off the back to aim
    }
    for (const id of this.pm.keys()) if (!L.actors.has(id)) this.pm.delete(id);
    this.drawCrowd();
  }
  // one instanced mesh per body part and kind of person: a few dozen draw calls for any number of people
  drawCrowd() {
    const counts = {};
    for (const [id, g] of this.pm) {
      if (!g.visible || !g.userData.seen) continue;
      const kind = this.life.actors.get(id)?.kind || 'troop';
      let c = this.crowd[kind];
      const n = counts[kind] || 0;
      if (!c || n >= c.cap) c = this.growCrowd(kind, Math.max(64, (c?.cap || 32) * 2), g);
      if (g.userData.dirty) { g.updateMatrixWorld(true); g.userData.dirty = false; }
      const list = g.userData.list;
      for (let i = 0; i < list.length && i < c.ims.length; i++) c.ims[i].setMatrixAt(n, list[i].matrixWorld);
      counts[kind] = n + 1;
    }
    for (const [kind, c] of Object.entries(this.crowd)) for (const im of c.ims) { im.count = counts[kind] || 0; im.instanceMatrix.needsUpdate = true; }
  }
  growCrowd(kind, cap, rig) {
    const old = this.crowd[kind];
    if (old) for (const im of old.ims) { this.world.remove(im); im.dispose(); }
    const ims = rig.userData.list.map(m => {
      const im = new THREE.InstancedMesh(m.geometry, m.material, cap);
      im.castShadow = m.castShadow; im.receiveShadow = false; im.frustumCulled = false; im.count = 0;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.world.add(im); return im;
    });
    return (this.crowd[kind] = { cap, ims });
  }

  // scrub and debris on the ground, a few low shapes per tile, and the patches ordered cleared, outlined in amber
  // ---------------------------------------------------------------- the wild: plants and rocks on the open ground round
  // the camera, by biome. Decoration only: they never block building, and they give way to roads, buildings and zones
  syncFlora(dt) {
    const s = this.sim; if (!s?.terr || !this.m) return;
    this.floraT = (this.floraT || 0) - dt; if (this.floraT > 0) return; this.floraT = 0.35;
    const N = this.N, cx = Math.round(this.target.x + N / 2), cz = Math.round(this.target.z + N / 2), far = this.zoom > 110, R = Math.round(Math.min(120, Math.max(36, this.zoom * 2.4)));
    const key = far ? 'far' : `${Math.round(cx / 8)},${Math.round(cz / 8)},${R},${s.net?.segs.length || 0},${s.b.length},${s.zoneV || 0},${s.ownV || 0},${s.terrV || 0},${s.site?.biome}`;
    if (key === this.floraKey && this.floraSim === s) return; this.floraKey = key; this.floraSim = s;
    const bio = s.site?.biome || 'steppe';
    if (!this.flora || this.floraBio !== bio) {
      for (const im of this.flora || []) { this.world.remove(im); im.geometry.dispose(); im.material.dispose(); }
      const F = { desert: { tree: ['#7d8a4a', '#6b5a3c', 0.25], bush: '#8a7550', rock: '#9a8468', tuft: '#b09a62' }, steppe: { tree: ['#55703a', '#5a4630', 0.6], bush: '#6b7a3e', rock: '#8a8778', tuft: '#93a05a' },
        ice: { tree: ['#3f5f52', '#4a3c30', 0.45], bush: '#a8b6c0', rock: '#9aa4ae', tuft: '#dfe6ea' }, jungle: { tree: ['#2f6a2c', '#4a3a26', 1.5], bush: '#3f7a34', rock: '#6f7468', tuft: '#5f9a44' }, ash: { tree: ['#3a3432', '#2a2422', 0.3], bush: '#4a4442', rock: '#55504e', tuft: '#6a5a52' } }[bio] || {};
      const mk = (geo, col, cast = true) => { const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 1, flatShading: true }), 3000); im.castShadow = cast; im.receiveShadow = true; im.frustumCulled = false; im.count = 0; this.world.add(im); return im; };
      const crown = bio === 'desert' ? new THREE.CylinderGeometry(0.07, 0.08, 0.55, 6) : bio === 'ash' ? new THREE.ConeGeometry(0.05, 0.6, 4) : bio === 'ice' || bio === 'steppe' ? new THREE.ConeGeometry(0.22, 0.6, 6) : new THREE.IcosahedronGeometry(0.3, 0);
      crown.translate(0, bio === 'desert' ? 0.28 : bio === 'jungle' ? 0.62 : 0.52, 0);
      const trunk = new THREE.CylinderGeometry(0.035, 0.05, 0.4, 5); trunk.translate(0, 0.2, 0);
      const rock = new THREE.DodecahedronGeometry(0.2, 0); rock.scale(1, 0.7, 1); rock.translate(0, 0.08, 0);
      const bush = new THREE.IcosahedronGeometry(0.16, 0); bush.scale(1, 0.75, 1); bush.translate(0, 0.1, 0);
      const tuft = new THREE.ConeGeometry(0.07, 0.2, 4); tuft.translate(0, 0.1, 0);
      this.flora = [mk(crown, F.tree[0]), mk(trunk, F.tree[1]), mk(rock, F.rock), mk(bush, F.bush), mk(tuft, F.tuft, false)]; this.floraBio = bio; this.floraDens = F.tree[2];
    }
    const [crown, trunk, rock, bush, tuft] = this.flora, n = [0, 0, 0, 0, 0], o = new THREE.Object3D(), seed = (s.seed | 0) || 7;
    if (!far) {
      const put = (im, k, x, z, sc, ry) => { if (n[k] >= 3000) return; o.position.set(this.wx(x), 0, this.wx(z)); o.rotation.set(0, ry, 0); o.scale.setScalar(sc); o.updateMatrix(); im.setMatrixAt(n[k]++, o.matrix); };
      const dens = this.floraDens, P = LAND.PARCEL, G = LAND.GRID;
      for (let z = Math.max(1, cz - R); z < Math.min(N - 1, cz + R); z++) for (let x = Math.max(1, cx - R); x < Math.min(N - 1, cx + R); x++) {
        const i = z * N + x; if (s.terr[i] === 1 || s.terr[i] === 2 || s.roads?.[i] || s.occ[i] || s.walls?.[i] || s.zone?.[i]) continue;
        let h = Math.imul(x * 73856093 ^ z * 19349663 ^ seed, 2654435761) >>> 0; const r = h / 4294967296; if (r > 0.16) continue;
        // groves: a slow field makes the trees gather instead of spreading evenly; your own parcels are mostly cleared ground
        const grove = 0.5 + 0.5 * Math.sin(x * 0.045 + Math.sin(z * 0.031) * 2.1) * Math.cos(z * 0.052 + Math.sin(x * 0.027) * 1.7), mine = s.own?.[Math.floor(z / P) * G + Math.floor(x / P)] ? 0.2 : 1;
        h = Math.imul(h ^ 0x9e3779b9, 2246822519) >>> 0; const q = h / 4294967296, a = q * 6.283, jx = x + 0.2 + q * 0.6, jz = z + 0.2 + ((h >>> 8) & 255) / 425;
        if (r < 0.02 * dens * grove * grove * 2.2 * mine) { const sc = 0.9 + q * 0.9; put(crown, 0, jx, jz, sc, a); put(trunk, 1, jx, jz, sc, a); }
        else if (r < 0.05 * mine) put(rock, 2, jx, jz, 0.5 + q * 1.3, a);
        else if (r < 0.05 + 0.04 * dens * mine) put(bush, 3, jx, jz, 0.7 + q * 0.9, a);
        else if (mine === 1 || q < 0.3) put(tuft, 4, jx, jz, 0.7 + q, a);
      }
    }
    [crown, trunk, rock, bush, tuft].forEach((im, k) => { im.count = n[k]; im.instanceMatrix.needsUpdate = true; im.visible = n[k] > 0; });
    if (this.r.shadowMap) this.r.shadowMap.needsUpdate = true;
  }
  syncScrub() {
    const s = this.sim; if (!s.scrub) return;
    const key = `${s.scrubV || 0}:${(s.clr || []).map(o => o.id + '.' + o.tiles.length).join()}`;
    if (this.scrubKey === key && this.scrubSim === s) return;
    this.scrubKey = key; this.scrubSim = s;
    const N = this.N, cols = SCRUB_COL[s.site?.biome] || SCRUB_COL.steppe, tiles = [];
    for (let i = 0; i < s.scrub.length; i++) if (s.scrub[i]) tiles.push(i);
    if (!this.scrubM) {
      const mk = (geo, col) => { const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 1, flatShading: true }), 16); im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; return im; };
      this.scrubM = [mk(new THREE.IcosahedronGeometry(0.2, 0), cols[0]), mk(new THREE.ConeGeometry(0.16, 0.34, 5), cols[1])];
      const om = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.92, 0.92), new THREE.MeshBasicMaterial({ color: '#ffb020', transparent: true, opacity: 0.35, depthWrite: false }), 16);
      om.frustumCulled = false; this.scrubM.push(om);
    }
    for (const im of this.scrubM) if (im.parent !== this.world) this.world.add(im);
    this.scrubM[0].material.color.set(cols[0]); this.scrubM[1].material.color.set(cols[1]);
    const grow = (k, n) => { let im = this.scrubM[k]; if (im.count !== undefined && im.instanceMatrix.count >= n) return im; const nm = new THREE.InstancedMesh(im.geometry, im.material, Math.max(16, n * 1.5 | 0)); nm.castShadow = im.castShadow; nm.receiveShadow = im.receiveShadow; nm.frustumCulled = false; this.world.remove(im); im.dispose(); this.world.add(nm); return (this.scrubM[k] = nm); };
    const a = grow(0, tiles.length), b2 = grow(1, tiles.length), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const h = i => { let x = (i * 2654435761) >>> 0; x ^= x >>> 13; x = Math.imul(x, 1274126177) >>> 0; return (x >>> 8) / 16777216; };
    tiles.forEach((i, n) => {
      const x = i % N, z = (i / N) | 0, r1 = h(i), r2 = h(i + 7919), r3 = h(i + 104729);
      e.set(r1 * 0.6, r2 * TAU, r3 * 0.4); q.setFromEuler(e); sc.setScalar(0.7 + r3 * 0.7); sc.y *= 0.55 + r1 * 0.5;
      M.compose(v.set(this.wx(x + 0.25 + r1 * 0.5), 0.06, this.wx(z + 0.25 + r2 * 0.5)), q, sc); a.setMatrixAt(n, M);
      e.set(0, r3 * TAU, 0); q.setFromEuler(e); sc.setScalar(0.6 + r2 * 0.8);
      M.compose(v.set(this.wx(x + 0.15 + r3 * 0.7), 0.16 * sc.y, this.wx(z + 0.15 + r1 * 0.7)), q, sc); b2.setMatrixAt(n, M);
    });
    a.count = b2.count = tiles.length; a.instanceMatrix.needsUpdate = b2.instanceMatrix.needsUpdate = true;
    const ord = (s.clr || []).flatMap(o => o.tiles), om = grow(2, ord.length);
    e.set(-Math.PI / 2, 0, 0); q.setFromEuler(e); sc.setScalar(1);
    ord.forEach((i, n) => { M.compose(v.set(this.wx(i % N + 0.5), 0.025, this.wx(((i / N) | 0) + 0.5)), q, sc); om.setMatrixAt(n, M); });
    om.count = ord.length; om.instanceMatrix.needsUpdate = true;
  }
  // utility coverage: a see-through disc and a ring for every circle, coloured by what it carries (the Utilities view)
  setCover(list) {
    if (this.coverG) { this.world.remove(this.coverG); this.coverG.traverse(o => { o.geometry?.dispose(); }); this.coverG = null; }
    if (!list || !list.length) return;
    const G = this.coverG = new THREE.Group(), mats = {};
    const mat = (c, o) => mats[c + o] ||= new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide });
    list.forEach(({ x, z, r, col }, i) => {
      const y = 0.03 + (i % 7) * 0.002;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 48), mat(col, 0.08)); disc.rotation.x = -Math.PI / 2; disc.position.set(this.wx(x), y, this.wx(z)); G.add(disc);
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.08, r, 64), mat(col, 0.6)); ring.rotation.x = -Math.PI / 2; ring.position.set(this.wx(x), y + 0.001, this.wx(z)); G.add(ring);
    });
    this.world.add(G);
  }
  // painted zones: a faint wash of colour on every zoned tile nothing stands on, stronger while zoning or in the Zoning view
  syncZones() {
    const s = this.sim; if (!s.zone) return;
    const key = `${s.zoneV || 0}:${s.roadsV || 0}:${s.b.length}:${this.zoneStrong ? 1 : 0}`;
    if (this.zoneKey === key && this.zoneSim === s) return;
    this.zoneKey = key; this.zoneSim = s;
    const N = this.N, tiles = [];
    for (let i = 0; i < s.zone.length; i++) if (s.zone[i] && !s.occ[i] && !s.roads[i]) tiles.push(i);
    let im = this.zoneM;
    if (!im || im.instanceMatrix.count < tiles.length) {
      if (im) { this.world.remove(im); im.dispose(); }
      const geo = new THREE.PlaneGeometry(0.94, 0.94); geo.rotateX(-Math.PI / 2);
      im = this.zoneM = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false }), Math.max(64, tiles.length * 1.5 | 0));
      im.frustumCulled = false; im.renderOrder = 1;
    }
    if (im.parent !== this.world) this.world.add(im);
    const M = new THREE.Matrix4(), c = new THREE.Color(), cols = ZKEYS.map(k => new THREE.Color(ZONES[k].col));
    tiles.forEach((i, n) => { M.makeTranslation(this.wx(i % N + 0.5), 0.02, this.wx(((i / N) | 0) + 0.5)); im.setMatrixAt(n, M); im.setColorAt(n, c.copy(cols[s.zone[i] - 1])); });
    im.count = tiles.length; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.material.opacity = this.zoneStrong ? 0.5 : 0.2;
  }
  syncVehicles(dt) {
    const L = this.life, t = this.t;
    for (const v of this.sim.veh) {
      let g = this.vm.get(v.id);
      if (!g) { g = (VMAKE[v.kind] || makeTruck)(this.m); g.scale.setScalar(v.kind === 'tank' ? 1.5 : 1.2); this.world.add(g); this.vm.set(v.id, g); }
      g.visible = !v.away;
      g.position.set(this.wx(v.x), 0, this.wx(v.z)); g.rotation.y = v.yaw;
      if (g.userData.cargo) g.userData.cargo.visible = v.load > 0;
    }
    for (const [id, g] of this.vm) if (!this.sim.veh.some(v => v.id === id)) { this.world.remove(g); this.vm.delete(id); }
    const live = new Set();
    for (const f of L.flights) {
      if (!f.mid) f.mid = Math.random();
      live.add(f.mid);
      let g = this.fm.get(f.mid); if (!g) { g = makeDropship(this.m); this.world.add(g); this.fm.set(f.mid, g); }
      g.position.set(this.wx(f.x), f.y, this.wx(f.z)); g.rotation.y = f.yaw;
      g.rotation.z = f.ph === 'in' || f.ph === 'up' ? Math.sin(t * 2) * 0.03 : 0;
      for (const e of g.userData.engines) e.rotation.x = Math.PI / 2 + (f.ph === 'land' ? 0 : f.ph === 'down' ? 0.2 : 0.5);
    }
    for (const [k, g] of this.fm) if (!live.has(k)) { this.world.remove(g); this.fm.delete(k); }
    void dt;
  }
}
void wrap;
