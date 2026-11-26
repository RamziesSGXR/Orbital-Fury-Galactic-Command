// THE GROUND IN 3D (GC 0.18, stage two of the move to 3D). The battle is still drawn from straight above onto its own
// sheet, exactly as before: ground, scenery, units, fire, fog, light. Here that sheet is laid over the real shape of the
// land (the terrain's own heights) and looked at through a tilted lens from a point that circles the fight, as from a
// gunship. So hills stand up, craters sink, and far ground is smaller than near ground. The units are still flat
// pictures lying on the land; they stand up in stage three.
//
// One camera decides everything: where the land is drawn, where a label goes, and what the pointer is over.
import * as THREE from '../../vendor/three.js';
import { noSurf } from '../../surface.js';
import { groundSet } from '../../scans.js';
import { Cover3D } from './cover3d.js';
import { skyLight } from '../../sky.js';
import { Units3D, Fx3D } from './units3d.js';
import { Props3D } from './props3d.js';

const WILD = /^(tree|rock|bush|stump|log|crater|mine)/;     // (what grows or lies on the land takes it as it is)
export const V3 = { tilt: 56, fov: 30, amp: 22, grid: 112, blocks: 420, sides: 8 };     // degrees above the horizon; the lens; metres of relief either way of the middle height; cells across the sheet
const RAD = Math.PI / 180;

export class Ground3D {
  constructor(livery) {
    this.cv = document.createElement('canvas');
    this.r = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.r.setClearColor(0x000000, 1);
    // (GC 0.80.1) the draw calls are counted over the whole frame (the shadow, the scene and the copy to the screen): three.js
    // counts each render() on its own, so the readout only ever saw the last one, the screen copy: "calls 1"
    this.r.info.autoReset = false;
    this.tm = { build: 0, send: 0, draw: 0, gpu: -1 };     // (GC 0.80.1) where the 3D part's time goes, for the F3 readout
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(V3.fov, 1, 5, 6000);
    // (0.37) less light from everywhere and more from the sun, which stands lower: a slope turned to it is bright and one
    // turned away is dark, so the shape of the land can be read
    // (0.38) the light from everywhere is the sky's above and the ground's own below (so the underside of a thing is darker
    // than its top), and the sun throws real shadows: every unit, building, tree and hill on the ground beside it
    this.sky = new THREE.HemisphereLight(0xeef3ff, 0x6a6258, 1.25); this.scene.add(this.sky);
    this.sun = new THREE.DirectionalLight(0xfff6e8, 3.1);
    this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.5;
    this.scene.fog = new THREE.Fog(0x39434a, 400, 1600);     // distance: the far ground fades into haze
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    const n = V3.grid, vn = (n + 1) * (n + 1);
    this.pos = new Float32Array(vn * 3); this.uv = new Float32Array(vn * 2);
    const idx = new Uint32Array(n * n * 6); let k = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d; }
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    // (0.37) THE LAND'S TWO PICTURES. The ground itself (the map's own image) is a picture that is sent to the graphics card
    // once and stays there; what is drawn on the ground this frame (zones, tracks, the dark where nobody is looking) is a
    // second, see-through picture laid over it. Before, the two were one picture, drawn and sent whole every frame.
    this.uDark = { value: null }; this.uDkOn = { value: 0 }; this.uDkO = { value: new THREE.Vector3() }; this.uDkHz = { value: new THREE.Vector4(0, 0, 0, 0) };     // (0.72) uDkHz: by day the unseen is a haze of this colour (w 1), not a dark     // (0.52) the dark of the night and of the unseen, for the models (see _night)
    this.uGround = { value: null }; this.uOver = { value: null }; this.uInv = { value: 1 / 1600 }; this.uTopo = { value: 0 }; this.uAmp = { value: V3.amp }; this.uDet = { value: 1 }; this.uLand = { value: 8 };
    // (GC 0.91) the land's photoscanned materials, two for its biome (js/scans.js): pictures, normals, their sizes and mean colours
    this.sc = { tScA: { value: null }, tScAn: { value: null }, tScB: { value: null }, tScBn: { value: null }, uScOn: { value: 0 }, uScT: { value: new THREE.Vector2(15, 3) }, uScMA: { value: new THREE.Vector3(0.5, 0.5, 0.5) }, uScMB: { value: new THREE.Vector3(0.5, 0.5, 0.5) }, uScK: { value: new THREE.Vector2(0.65, 1) } }; this.scBiome = null;
    const two = (mat) => { mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { tGround: this.uGround, tOver: this.uOver, uInv: this.uInv, uTopo: this.uTopo, uAmp: this.uAmp, uDet: this.uDet, uLand: this.uLand }, this.sc);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uInv; varying vec2 vG; varying vec2 vO; varying float vHt; varying vec2 vWp; varying float vDd;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvG = vec2(position.x * uInv, 1.0 - position.z * uInv); vO = uv; vHt = position.y; vWp = position.xz; vDd = -(modelViewMatrix * vec4(position, 1.0)).z;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform sampler2D tGround; uniform sampler2D tOver; uniform float uTopo; uniform float uAmp; uniform float uDet; uniform float uLand; uniform sampler2D tScA; uniform sampler2D tScAn; uniform sampler2D tScB; uniform sampler2D tScBn; uniform float uScOn; uniform vec2 uScT; uniform vec3 uScMA; uniform vec3 uScMB; uniform vec2 uScK; vec3 scN = vec3(0.0, 0.0, 1.0); varying vec2 vG; varying vec2 vO; varying float vHt; varying vec2 vWp; varying float vDd;
        vec3 gcLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
        float gcH(vec2 p) { p = mod(p, 289.0); return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float gcN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gcH(i), gcH(i + vec2(1.0, 0.0)), f.x), mix(gcH(i + vec2(0.0, 1.0)), gcH(i + vec2(1.0, 1.0)), f.x), f.y); }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (uScOn > 0.5 && uScK.y > 0.5) {     // (GC 0.91) the scans' normals, on the land's own frame (its x and z are the pictures' u and v)
          vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition); vec2 st0 = dFdx(vWp), st1 = dFdy(vWp);
          vec3 N = normal, q1p = cross(q1, N), q0p = cross(N, q0), T = q1p * st0.x + q0p * st1.x, Bt = q1p * st0.y + q0p * st1.y;
          float dt = max(dot(T, T), dot(Bt, Bt)), sc = dt == 0.0 ? 0.0 : inversesqrt(dt);
          normal = normalize(mat3(T * sc, Bt * sc, N) * vec3(scN.xy * uScK.y, scN.z));
        }`)
        .replace('#include <map_fragment>', `
        vec3 gr = texture2D(tGround, clamp(vG, 0.0, 1.0)).rgb;     // (GC 0.92: past the map's edge, its edge carried on, not black)
        float hk = clamp(vHt / uAmp * 0.5 + 0.5, 0.0, 1.0);
        gr *= 0.84 + 0.3 * hk;                                   // high ground a little lighter, hollows a little darker
        // (GC 0.91, Ramzies: "we're shooting for GTA V") the ground is photoscanned: the biome's main material, a second one in
        // patches, each laid at two sizes turned across each other (so it never shows its repeat), coloured and lit as the
        // scan is, and as light or dark as the map's own picture is there (its tracks, scorches and hollows stay)
        if (uScOn > 0.5 && uScK.y > 0.5) {
          // (0.92.4, Ramzies: "make the texture not scale with the camera and not look so repetitive") each scan at a small size
          // close in and a large one, turned, pulled back, so its grain stays about the same size on the screen as the camera
          // zooms; and the ground under it warped slowly, so no two repeats line up
          mat2 R = mat2(0.8, 0.6, -0.6, 0.8); vec2 fw = fwidth(vWp); float zf = smoothstep(0.012, 0.09, max(fw.x, fw.y));
          vec2 wp = vWp + vec2(gcN(vWp * 0.011 + 1.3), gcN(vWp * 0.011 + 8.7)) * 9.0;
          vec2 a1 = wp / (uScT.x * 0.45), a2 = R * wp / (uScT.x * 2.2) + 0.37, b1 = wp / (uScT.y * 0.5), b2 = R * wp / (uScT.y * 2.1) + 0.61;
          float ta = clamp(zf + (gcN(vWp * 0.021 + 3.0) - 0.5) * 0.5, 0.0, 1.0), tb = clamp(zf + (gcN(vWp * 0.033 + 7.0) - 0.5) * 0.5, 0.0, 1.0);
          vec3 A = mix(texture2D(tScA, a1).rgb, texture2D(tScA, a2).rgb, ta), B = mix(texture2D(tScB, b1).rgb, texture2D(tScB, b2).rgb, tb);
          vec3 An = mix(texture2D(tScAn, a1).rgb * 2.0 - 1.0, vec3(transpose(R) * (texture2D(tScAn, a2).rgb * 2.0 - 1.0).xy, (texture2D(tScAn, a2).rgb * 2.0 - 1.0).z), ta);
          vec3 Bn = mix(texture2D(tScBn, b1).rgb * 2.0 - 1.0, vec3(transpose(R) * (texture2D(tScBn, b2).rgb * 2.0 - 1.0).xy, (texture2D(tScBn, b2).rgb * 2.0 - 1.0).z), tb);
          vec3 L3 = vec3(0.3, 0.59, 0.11); float lg = dot(gr, L3);
          float wb = smoothstep(0.42, 0.78, gcN(vWp * 0.045 + 9.0) * 0.6 + gcN(vWp * 0.17 + 2.0) * 0.25 + clamp((0.33 - lg) * 1.6, 0.0, 0.4));     // the second where the noise says, and where the map is dark (tracks, scorches)
          vec3 S = mix(A, B, wb), M = mix(uScMA, uScMB, wb);
          vec3 kept = gr * S / max(M, vec3(0.04)), own = S * lg / max(dot(M, L3), 0.04);     // the map's colour with the scan's detail; the scan's colour at the map's brightness
          gr = mix(gr, mix(kept, own, uScK.x), uScK.y);
          scN = normalize(mix(An, Bn, wb));
        }
        // (0.72, Ramzies: "make things look nicer when zoomed in") close up, the land has a grain of its own under its drawn
        // picture (which is a pixel or two a metre, a blur up close): speckle a hand across, patches a stride across, faded in
        // as the eye comes down to it, none at the usual height
        { float dk = uDet * (1.0 - smoothstep(40.0, 150.0, vDd));
          if (dk > 0.002) gr *= 1.0 + dk * (0.24 * (gcN(vWp * 3.3) - 0.5) + 0.26 * (gcN(vWp * 0.62 + 17.0) - 0.5) + 0.12 * (gcN(vWp * 11.0 + 5.0) - 0.5)); }
        if (uTopo > 0.5) {                                       // the height view: colour by height, and a line every four metres
          vec3 tint = hk < 0.35 ? mix(vec3(0.25, 0.42, 0.75), vec3(0.3, 0.62, 0.42), hk / 0.35) : hk < 0.7 ? mix(vec3(0.3, 0.62, 0.42), vec3(0.85, 0.78, 0.45), (hk - 0.35) / 0.35) : mix(vec3(0.85, 0.78, 0.45), vec3(0.95, 0.5, 0.25), (hk - 0.7) / 0.3);
          gr = mix(vec3(dot(gr, vec3(0.3, 0.6, 0.1))) * 0.8, tint * 0.85, 0.62);
          float q = vHt / 4.0, w = fwidth(q), ln = 1.0 - smoothstep(0.0, 1.4 * w, abs(fract(q + 0.5) - 0.5));
          float q5 = vHt / 20.0, w5 = fwidth(q5), l5 = 1.0 - smoothstep(0.0, 2.4 * w5, abs(fract(q5 + 0.5) - 0.5));
          gr = mix(gr, vec3(0.03), max(ln * 0.55, l5 * 0.85));
        }
        vec4 ov = texture2D(tOver, vO);
        #ifdef GC_OUTER
          ov = vec4(0.0);     // (GC 0.92) the land past the sheet has nothing drawn on it
        #endif
        diffuseColor.rgb *= gcLin(clamp(gr * (1.0 - ov.a) + ov.rgb, 0.0, 1.0));
        #ifdef GC_TEX
          diffuseColor.rgb = gcLand(diffuseColor.rgb, vWp, (uTopo > 0.5 ? 0.0 : 1.0) * (1.0 - ov.a) * (1.0 - smoothstep(0.02, 0.06, max(fwidth(vWp).x, fwidth(vWp).y))), uLand);     /* (grit only close in: pulled back it was a carpet) */     // (GC 0.90) the biome's own ground close up: sand, snow, grass, regolith, soil
        #endif`);
    }; return mat; };
    this.mat = noSurf(two(new THREE.MeshLambertMaterial({ color: 0xffffff })));     /* (GC 0.70) the land wears its own drawn picture: no surface detail */
    this.mat.defines.GC_LAND = '';     /* (GC 0.90) but the land's own grit, pebbles and cracks under it (js/surface.js) */
    // (GC 0.80, Ramzies: "some visual glitches with shadows") the land takes the shadows of what stands on it but throws none of its own:
    // its few-metre facets shadowing each other drew stripes down every slope turned from the sun, and dark smears on the flat
    // below a dune. Its hills are already shaded by their own slope (and the map's own shading); what stands on them still throws its shadow.
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.receiveShadow = true; this.mesh.castShadow = false; this.scene.add(this.mesh);
    // (GC 0.92, Ramzies: "odd visual glitch when zooming in") THE LAND PAST THE SHEET. Tilted low and close in, the camera sees
    // past the patch of land under the sheet, where there was only black: a coarse ring of the same land carries on round it
    // (a hole where the sheet's land is, so nothing is drawn twice), fading into the haze.
    { const m = 24, vn2 = (m + 1) * (m + 1); this.skM = m; this.skPos = new Float32Array(vn2 * 3); this.skUv = new Float32Array(vn2 * 2); this.skIdx = new Uint32Array(m * m * 6);
      const sg = this.skGeo = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(this.skPos, 3)); sg.setAttribute('uv', new THREE.BufferAttribute(this.skUv, 2)); sg.setIndex(new THREE.BufferAttribute(this.skIdx, 1));
      this.matOut = noSurf(two(new THREE.MeshLambertMaterial({ color: 0xffffff }))); this.matOut.defines.GC_LAND = ''; this.matOut.defines.GC_OUTER = '';
      this.skirt = new THREE.Mesh(sg, this.matOut); this.skirt.frustumCulled = false; this.skirt.receiveShadow = true; this.scene.add(this.skirt); }
    // THE THINGS THAT STAND UP (GC 0.19): rocks, trees, buildings, guns. Each is a block risen out of the sheet: its roof is the
    // very patch of the sheet it stands on (so it wears its own top-down drawing, lit and fogged like everything else) and
    // its walls take the colours at its edge, darker. Built afresh each frame from what is in view.
    { const nv = V3.blocks * V3.sides * 9; this.bp = new Float32Array(nv * 3); this.bu = new Float32Array(nv * 2); this.bn = new Float32Array(nv * 3); this.bc = new Float32Array(nv * 3);
      const bg = this.bgeo = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(this.bp, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(this.bu, 2)); bg.setAttribute('normal', new THREE.BufferAttribute(this.bn, 3)); bg.setAttribute('color', new THREE.BufferAttribute(this.bc, 3));
      this.bmat = noSurf(two(new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true })));
      this.bmesh = new THREE.Mesh(bg, this.bmat); this.bmesh.frustumCulled = false; this.bmesh.castShadow = true; this.bmesh.receiveShadow = true; this.scene.add(this.bmesh); }
    this.v = new THREE.Vector3(); this.pv = new THREE.Matrix4(); this.inv = new THREE.Matrix4();
    this.h = () => 0.5; this.W = this.H = 1; this.ok = true; this.amp = V3.amp;
    try { this.units = new Units3D(this.scene, livery); this.fx = new Fx3D(this.scene); } catch (err) { console.warn('3D units unavailable', err); this.units = null; this.fx = null; }
    this.gun = new THREE.Vector3();
    try { this.props = new Props3D(this.scene); } catch (err) { console.warn('3D props unavailable', err); this.props = null; }
    skyLight(this.r).then((env) => { this.skyEnv = env; });     // (GC 0.92) light from a real sky, on the photoscans
    try { this.cover = new Cover3D(this.scene); } catch (err) { console.warn('ground cover unavailable', err); this.cover = null; }     // (GC 0.92)
  }
  // metres above the middle height at a point of the map
  // (GC 0.44) NOTHING BURIED, NOTHING FLOATING. The land is levelled under whatever is built on it: inside a thing's footprint the
  // ground is at the height of its middle, and it eases back to the hill's own shape over the next stretch. Units, shots and the
  // land's own mesh all ask here, so everything agrees on where the ground is.
  y(x, z) {
    let h = (this.h(x, z) - 0.5) * 2 * this.amp; const P = this.pads;
    if (P) for (let i = 0; i < P.length; i += 4) {
      const dx = x - P[i], dz = z - P[i + 1], r = P[i + 2], R = r * 1.9, d2 = dx * dx + dz * dz; if (d2 >= R * R) continue;
      const d = Math.sqrt(d2), t = d <= r ? 1 : 1 - (d - r) / (R - r); h += (P[i + 3] - h) * t * t * (3 - 2 * t);
    }
    // (GC 0.80, Ramzies: "craters look awful and don't conform to terrain") A CRATER IS DUG INTO THE LAND: a bowl depth metres deep
    // at its middle, a lip of thrown-up earth at its edge falling away to nothing at 1.6 times its radius, all of it on the slope
    // where it is. Everything that stands on the land stands in it. (It was a ring model set level, half buried on a hillside.)
    const D = this.dents;
    if (D) for (let i = 0; i < D.length; i += 4) {
      const r = D[i + 2], R = r * 1.6, dx = x - D[i], dz = z - D[i + 1]; if (dx > R || dx < -R || dz > R || dz < -R) continue;
      const u2 = (dx * dx + dz * dz) / (r * r); if (u2 >= 2.56) continue;
      const dep = D[i + 3], lip = dep * 0.3;
      if (u2 < 1) h += -dep * (1 - u2) * (1 - 0.35 * u2) + lip * u2 * u2 * u2; else { const q = 1 - (Math.sqrt(u2) - 1) / 0.6; h += lip * q * q; }
    }
    return h;
  }
  _level(list) {
    const P = this.pads || (this.pads = []); P.length = 0; if (!list) return;
    for (const u of list) { if (u.l || !(u.s >= 3) || WILD.test(u.k)) continue; P.push(u.x, u.y, u.s * 1.05, (this.h(u.x, u.y) - 0.5) * 2 * this.amp); }
  }
  // Lay this frame's sheet on the land and take the picture.
  //   sheet: the canvas the battle was drawn on, S pixels square, the camera's point at its middle, `scale` pixels to a metre
  //   W, H: the screen, in the same pixels; fy: how far down the screen the camera's point sits (0 to 1); yaw: how far round
  //   the gunship has flown; sun: { lx, ly } the way the light falls on the map, if the hour has a sun
  frame(o) {
    const T0 = performance.now(); this.r.info.reset();
    const { sheet, S, scale, camX, camY, yaw, W, H, fy, sun } = o; this.h = o.height; this._level(o.props); this.dents = o.dents && o.dents.length ? o.dents : null;     // (GC 0.80) [x, y, r, depth] for each crater near the view
    if (this.W !== W || this.H !== H) { this.W = W; this.H = H; this.r.setSize(W, H, false); }
    // (0.49.1) The sheet's canvas changes size (the window, the zoom, or the quality stepping down) while staying the same canvas.
    // The graphics card keeps a texture at the size it was first sent, so a resized sheet went into a corner of the old one: the
    // dark of the unseen and the rings lay shrunk and off to one side of where they belong. A new size is a new texture.
    // (0.52) THE NIGHT ON THE MODELS. The ground has always gone dark at night with the light of every torch, lamp and blast
    // carved out of it, but that was painted on the ground alone: people and buildings stood fully lit in the dark, and a
    // flashlight lit the grass and not the man in its beam. The same mask (the night with its lights cut out, and the dark of
    // the unseen) is now given to every model's material, read at the place the model stands: what the ground is, they are.
    { const dk = o.dark || null, L0 = S / scale;
      if (dk && dk.width > 0) {
        if (!this.dtex || this.dtex.image !== dk || this._dw !== dk.width || this._dh !== dk.height) { if (this.dtex) this.dtex.dispose(); this._dw = dk.width; this._dh = dk.height; this.dtex = new THREE.CanvasTexture(dk); this.dtex.generateMipmaps = false; this.dtex.minFilter = THREE.LinearFilter; this.dtex.magFilter = THREE.LinearFilter; this.uDark.value = this.dtex; }
        this.dtex.needsUpdate = true; this.uDkOn.value = 1; this.uDkO.value.set(camX - L0 / 2, camY - L0 / 2, 1 / L0);
        if (o.haze) this.uDkHz.value.set(o.haze[0], o.haze[1], o.haze[2], 1); else this.uDkHz.value.w = 0;
      } else this.uDkOn.value = 0;
      this._night(); }
    if (!this.tex || this.tex.image !== sheet || this._tw !== sheet.width || this._th !== sheet.height) { if (this.tex) this.tex.dispose(); this._tw = sheet.width; this._th = sheet.height; this.tex = new THREE.CanvasTexture(sheet); this.tex.premultiplyAlpha = true; this.tex.generateMipmaps = false; this.tex.minFilter = THREE.LinearFilter; this.tex.magFilter = THREE.LinearFilter; this.uOver.value = this.tex; }
    this.tex.needsUpdate = true;
    // the ground's own picture: sent again only when it has changed (the hour's light, a new scorch mark), and then no more than four times a second
    if (o.ground) {
      if (!this.gtex || this.gtex.image !== o.ground) { if (this.gtex) this.gtex.dispose(); this.gtex = new THREE.CanvasTexture(o.ground); this.gtex.anisotropy = Math.min(8, this.r.capabilities.getMaxAnisotropy()); this.uGround.value = this.gtex; this.gRev = -1; this.gAt = -1e9; }
      const nowMs = performance.now(); if (this.gRev !== o.groundRev && nowMs - this.gAt > 250) { this.gRev = o.groundRev; this.gAt = nowMs; this.gtex.needsUpdate = true; }
    }
    this.uInv.value = 1 / (o.size || 1600); this.uTopo.value = o.topo ? 1 : 0; this.uDet.value = o.det ?? 1; this.uLand.value = o.land ?? 8;
    if (this.props && this.props.setDetail) this.props.setDetail(this._near = (o.scale || 0) > (this._near ? 10 : 12), o.scans !== false);     // (GC 0.91: near forms when close in; none on the low setting)
    this.sc.uScK.y = o.scans === false ? 0 : 1;
    if (o.biome && o.biome !== this.scBiome) {     // (GC 0.91) the biome's scanned ground, as it comes; the trees and rocks too
      this.scBiome = o.biome; this.sc.uScOn.value = 0; if (this.props && this.props.setBiome) this.props.setBiome(o.biome);
      groundSet(o.biome).then((g) => { if (!g || this.scBiome !== o.biome) return; const c = this.sc;
        c.tScA.value = g.a; c.tScAn.value = g.an; c.tScB.value = g.b; c.tScBn.value = g.bn; c.uScT.value.set(g.ta, g.tb); c.uScMA.value.set(...g.ma); c.uScMB.value.set(...g.mb); c.uScK.value.x = g.hue; c.uScOn.value = 1; });
    }
    // the land under the sheet: a grid whose corners stay at fixed places on the map (so the hills do not shimmer as the
    // camera slides), covering the sheet and a cell more
    const n = V3.grid, L = S / scale, c = L / (n - 1), x0 = Math.floor((camX - L / 2) / c) * c, z0 = Math.floor((camY - L / 2) / c) * c, P = this.pos, U = this.uv;
    let p = 0, q = 0;
    for (let j = 0; j <= n; j++) { const z = z0 + j * c; for (let i = 0; i <= n; i++) { const x = x0 + i * c; P[p++] = x; P[p++] = this.y(x, z); P[p++] = z; U[q++] = (x - (camX - L / 2)) / L; U[q++] = 1 - (z - (camY - L / 2)) / L; } }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true; this.geo.computeVertexNormals();
    if (this.skirt) {     // (GC 0.92) the coarse land round the sheet's, four sheets across, its middle left open
      const m = this.skM, E = L * 4, c2 = E / m, sx = Math.floor((camX - E / 2) / c2) * c2, sz = Math.floor((camY - E / 2) / c2) * c2, SP = this.skPos, SU = this.skUv, SI = this.skIdx;
      let a = 0, b = 0, t = 0;
      for (let j = 0; j <= m; j++) { const z = sz + j * c2; for (let i = 0; i <= m; i++) { const x = sx + i * c2; SP[a++] = x; SP[a++] = this.y(x, z); SP[a++] = z; SU[b++] = 0.5; SU[b++] = 0.5; } }
      const hx0 = x0 + c, hx1 = x0 + n * c - c, hz0 = z0 + c, hz1 = z0 + n * c - c;     // (cells wholly under the sheet's land are left out; the rest overlap it a little, under it)
      for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) {
        const cx0 = sx + i * c2, cz0 = sz + j * c2; if (cx0 >= hx0 && cx0 + c2 <= hx1 && cz0 >= hz0 && cz0 + c2 <= hz1) continue;
        const p0 = j * (m + 1) + i, p1 = p0 + 1, p2 = p0 + m + 1, p3 = p2 + 1; SI[t++] = p0; SI[t++] = p2; SI[t++] = p1; SI[t++] = p1; SI[t++] = p2; SI[t++] = p3;
      }
      for (let i = 1; i < SP.length; i += 3) SP[i] -= 0.35;     // (a little lower, so where the two overlap the sheet's land is the one seen)
      this.skGeo.setDrawRange(0, t); this.skGeo.attributes.position.needsUpdate = true; this.skGeo.index.needsUpdate = true; this.skGeo.computeVertexNormals();
      if (this.scene.fog && !this._clr?.equals(this.scene.fog.color)) { this._clr = this.scene.fog.color.clone(); this.r.setClearColor(this._clr, 1); }     // (and past it all, the haze, not black)
    }
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
    this.scene.environment = this.skyEnv && o.scans !== false ? this.skyEnv : null; this.scene.environmentIntensity = 0.38 * (o.lit ?? 1);
    if (this.cover) this.cover.frame({ biome: this.scBiome, near: this._near, scale: o.scale, camX: o.camX, camY: o.camY, ter: o.ter, y: (x, z) => this.y(x, z), lit: o.lit, on: o.scans !== false });
    // the lens: as far off as makes a metre at the camera's point the same size on screen as it is on the sheet
    const E = Math.max(30, Math.min(86, o.tilt || V3.tilt)) * RAD, d = H / 2 / Math.tan(V3.fov * RAD / 2) / scale, fx = -Math.sin(yaw), fz = -Math.cos(yaw), ly = this.y(camX, camY), C = this.cam;
    C.aspect = W / H; C.setViewOffset(W, H, 0, (0.5 - fy) * H, W, H);
    C.position.set(camX - fx * d * Math.cos(E), ly + d * Math.sin(E), camY - fz * d * Math.cos(E)); C.lookAt(camX, ly, camY); C.updateMatrixWorld(); C.updateProjectionMatrix();
    C.matrixWorldInverse.copy(C.matrixWorld).invert(); this.pv.multiplyMatrices(C.projectionMatrix, C.matrixWorldInverse); this.inv.copy(this.pv).invert();
    // the light falls the way the map's own shading says it does (from the north-west when the hour has no sun)
    // (0.55) the hour's colour on the light itself, so the land and everything standing on it take the same hue
    { const h = o.hue || null; if (!this._sunC) { this._sunC = this.sun.color.clone(); this._skyC = this.sky.color.clone(); this._gndC = this.sky.groundColor.clone(); }
      const hr = h ? h[0] : 1, hg = h ? h[1] : 1, hb = h ? h[2] : 1;
      this.sun.color.setRGB(this._sunC.r * hr, this._sunC.g * hg, this._sunC.b * hb); this.sky.color.setRGB(this._skyC.r * hr, this._skyC.g * hg, this._skyC.b * hb); this.sky.groundColor.setRGB(this._gndC.r * hr, this._gndC.g * hg, this._gndC.b * hb); }
    const lx = sun ? sun.lx : -0.6, lz = sun ? sun.ly : -0.6; this.sun.position.set(camX + lx * 400, ly + 300, camY + lz * 400); this.sun.target.position.set(camX, ly, camY); this.sun.target.updateMatrixWorld();
    // the shadows' own camera: square on the ground in view, no wider than it need be (so a shadow keeps its edge)
    // (0.52) At true scale a soldier is two metres tall, and the shadows were made for people three times that: the map was spread
    // over more ground than the screen shows (a quarter of a metre to a texel), offset half a metre off every surface (so a
    // person's shadow stood apart from his feet), and slid under the view as it moved (so edges crawled). Now it covers what is
    // on screen and no more, the offsets follow the texel's size, and it moves in whole texels, so a shadow stays where it is.
    { const on = o.shadows !== false, sh = this.sun.shadow, sc = sh.camera, half = Math.max(30, Math.min(320, Math.max(W / scale * 0.62, H / scale * 0.9))), res = Math.min(o.shadowRes || 2048, this.r.capabilities.maxTextureSize >= 8192 ? 4096 : 2048);
      if (this.sun.castShadow !== on) { this.sun.castShadow = on; this.mat.needsUpdate = true; this.bmat.needsUpdate = true; }
      if (sh.mapSize.x !== res) { sh.mapSize.set(res, res); if (sh.map) { sh.map.dispose(); sh.map = null; } }
      if (on) {
        const tex = 2 * half / res, dx = lx * 400, dy = 300, dz = lz * 400, dl = Math.hypot(dx, dy, dz), nx = dx / dl, ny = dy / dl, nz = dz / dl;     // towards the sun
        let rx = nz, rz = -nx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;     // across the light (level)
        const ux = ny * rz, uy = nz * rx - nx * rz, uz = -ny * rx;     // and up it
        const a = camX * rx + camY * rz, b = camX * ux + ly * uy + camY * uz, da = Math.round(a / tex) * tex - a, db = Math.round(b / tex) * tex - b;
        const tx = camX + rx * da + ux * db, ty = ly + uy * db, tz = camY + rz * da + uz * db;
        this.sun.position.set(tx + dx, ty + dy, tz + dz); this.sun.target.position.set(tx, ty, tz); this.sun.target.updateMatrixWorld();
        sh.normalBias = Math.min(0.12, tex * 0.6); sh.bias = -0.00025;     /* (0.72) a smaller offset: with a quarter to half a metre of it a rock's shadow stood off from its foot */
        if (sc.right !== half || !this._shOk) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 10; sc.far = 1400; sc.updateProjectionMatrix(); this._shOk = true; }
      } }
    this.scene.fog.near = d * 1.35; this.scene.fog.far = d * 6;
    // the ship's gun hangs under the gunship, off to the right of the sight: its shells come in from the edge of the picture
    let fxErr = null;     // (0.49.1) a fault in the effects must not stop the picture being drawn: it is kept, the frame is drawn, then it is passed on to the report
    if (this.fx) { const e = C.matrixWorld.elements; this.gun.set(C.position.x + e[0] * d * 0.5 - e[4] * d * 0.22, C.position.y + e[1] * d * 0.5 - e[5] * d * 0.22, C.position.z + e[2] * d * 0.5 - e[6] * d * 0.22); try { this.fx.frame({ gunUp: o.gunUp, drops: o.drops, shells: o.shells, strobes: o.strobes, blasts: o.blasts, bolts: o.bolts, orbs: o.orbs, domes: o.domes, puffs: o.puffs, rings: o.rings, eye: this.cam.quaternion, gun: this.gun }, (x, z) => this.y(x, z)); } catch (err) { fxErr = err; } }
    // (GC 0.80.1) the time to this point is building the frame (the land, the blocks, the models); then the pictures the
    // frame needs are sent to the graphics card (the sheet every frame), then it is drawn
    const T1 = performance.now(); this._send(); const T2 = performance.now(); const gq = this._gpuBegin();
    try { this._render(o, W, H, C); } finally { this._gpuEnd(gq); const T3 = performance.now(), M = this.tm, k = 0.08; M.build += (T1 - T0 - M.build) * k; M.send += (T2 - T1 - M.send) * k; M.draw += (T3 - T2 - M.draw) * k; }
    this.at = { camX, camY };
    if (fxErr) throw fxErr;
  }
  _render(o, W, H, C) {
    // (0.37) the picture is taken onto a target, and the sight (infrared white-hot, black-hot, or plain colour) is put on as it
    // is copied to the screen: one cheap step on the graphics card, where it used to be a filter on the finished canvas
    // (pixel test) THE PIXEL LOOK: the same 3D picture taken small (about 300 lines), every pixel kept square and hard, its colours
    // cut to a few steps with a fine checker between them, and a dark line round whatever stands in front of something farther off.
    const px = o.pixel ? this._pixel(W, H, o.pixel) : null;
    if (px) { const u = px.mat.uniforms; u.uMode.value = o.sight === 'whot' ? 1 : o.sight === 'bhot' ? 2 : 0; u.uNear.value = C.near; u.uFar.value = C.far; this.sighted = true;
      this.r.setRenderTarget(px.rt); this.r.render(this.scene, C); this.r.setRenderTarget(null); this.r.render(px.scene, px.cam); return; }
    const po = o.post === false ? null : this._post(W, H); this.sighted = !!po;
    if (po) { po.mat.uniforms.uMode.value = o.sight === 'whot' ? 1 : o.sight === 'bhot' ? 2 : 0; this.r.setRenderTarget(po.rt); this.r.render(this.scene, C); this.r.setRenderTarget(null); this.r.render(po.scene, po.cam); }
    else this.r.render(this.scene, C);
  }
  // (GC 0.80.1) the pictures sent before drawing, so their time is told apart from the drawing's: the sheet (every frame), the
  // night's mask (every frame at night), the ground's own picture (when it has changed). A texture not changed is not sent again.
  _send() { for (const t of [this.tex, this.dtex, this.gtex]) if (t && t.image) try { this.r.initTexture(t); } catch { /* it is sent by the drawing instead */ } }
  // (GC 0.80.1) THE GRAPHICS CARD'S OWN TIME. Everything else in the readout is the processor's: how long it took to hand the
  // work over, not to do it. Where the browser offers it (EXT_disjoint_timer_query_webgl2), the card is asked how long the
  // frame's drawing took; the answer comes back a frame or two later. Where it does not, the readout says so.
  _gpuBegin() {
    try {
      const gl = this.r.getContext(); if (this._tq === undefined) this._tq = gl.getExtension('EXT_disjoint_timer_query_webgl2') || null;
      const X = this._tq; if (!X) return null; const Q = this._tqs || (this._tqs = []);
      while (Q.length && gl.getQueryParameter(Q[0], gl.QUERY_RESULT_AVAILABLE)) { const q = Q.shift(), ns = gl.getQueryParameter(q, gl.QUERY_RESULT); gl.deleteQuery(q); if (gl.getParameter(X.GPU_DISJOINT_EXT)) continue; const ms = ns / 1e6; this.tm.gpu = this.tm.gpu < 0 ? ms : this.tm.gpu + (ms - this.tm.gpu) * 0.08; }
      if (Q.length > 6) return null;
      const q = gl.createQuery(); gl.beginQuery(X.TIME_ELAPSED_EXT, q); return q;
    } catch { this._tq = null; return null; }
  }
  _gpuEnd(q) { if (!q) return; try { const gl = this.r.getContext(); gl.endQuery(this._tq.TIME_ELAPSED_EXT); this._tqs.push(q); } catch { this._tq = null; } }
  _pixel(W, H, lines) {
    if (this.pix === null) return null;
    const k = Math.max(2, Math.round(H / (lines > 1 ? lines : 300))), w = Math.ceil(W / k), h = Math.ceil(H / k);
    if (!this.pix) {
      try {
        const half = this.r.extensions.has('EXT_color_buffer_float') || this.r.extensions.has('EXT_color_buffer_half_float');
        const rt = new THREE.WebGLRenderTarget(w, h, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
        rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter;
        const mat = new THREE.ShaderMaterial({ uniforms: { t: { value: rt.texture }, d: { value: rt.depthTexture }, uMode: { value: 0 }, uRes: { value: new THREE.Vector2(w, h) }, uNear: { value: 5 }, uFar: { value: 6000 } }, depthTest: false, depthWrite: false,
          vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
          fragmentShader: `uniform sampler2D t; uniform sampler2D d; uniform int uMode; uniform vec2 uRes; uniform float uNear; uniform float uFar; varying vec2 vUv;
            vec3 enc(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
            vec3 film(vec3 x) { x *= 1.05; return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
            float dist(vec2 uv) { float z = texture2D(d, uv).x * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
            void main() {
              vec2 cell = floor(vUv * uRes), uv = (cell + 0.5) / uRes, st = 1.0 / uRes;
              vec3 lin = texture2D(t, uv).rgb; vec3 c = enc(uMode > 0 ? clamp(lin, 0.0, 1.0) : film(max(lin, 0.0)));
              // the line: a neighbour of this pixel stands well in front of it
              float z0 = dist(uv), near = min(min(dist(uv + vec2(st.x, 0.0)), dist(uv - vec2(st.x, 0.0))), min(dist(uv + vec2(0.0, st.y)), dist(uv - vec2(0.0, st.y))));
              float edge = step(1.2 + z0 * 0.01, z0 - near);     // (the line is drawn on what lies behind, so a small figure keeps every pixel of its own colours)
              if (uMode == 0) { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, 0.96); }
              else { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); l = pow(l, 0.7); if (uMode == 2) l = 1.0 - l; l = clamp((l - 0.5) * 1.15 + 0.56, 0.0, 1.0) * 0.9; c = vec3(l); }
              // a few steps of each colour, a checker between two steps where the colour falls between them
              float ch = mod(cell.x + cell.y, 2.0) * 0.5 + mod(cell.x, 2.0) * 0.25 - 0.375, n = uMode > 0 ? 10.0 : 15.0;
              c = floor(clamp(c, 0.0, 1.0) * n + 0.5 + ch * 0.45) / n;
              c = mix(c, c * 0.22, edge * (uMode > 0 ? 0.6 : 1.0));
              gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }` });
        const scene = new THREE.Scene(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
        this.pix = { rt, mat, scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), w, h };
      } catch (err) { console.warn('no pixel pass', err); this.pix = null; return null; }
    }
    const P = this.pix; if (P.w !== w || P.h !== h) { P.rt.setSize(w, h); P.w = w; P.h = h; P.mat.uniforms.uRes.value.set(w, h); }
    return P;
  }
  // every lit material in the scene but the land's own (which wears the mask already, in the sheet laid over it) reads the dark
  // at its place and is dimmed by it. Done once for each material as it turns up; the glowing ones (lamps, flames) are left alone.
  _night() {
    const U = this, skip = (m) => !m || m._gcNight || !(m.isMeshLambertMaterial || (m.userData && m.userData.scan));     // (GC 0.91: and the photoscans)
    if (!this._nightSet) { this._nightSet = true; this.mat._gcNight = true; if (this.bmat) this.bmat._gcNight = true; }
    const fix = (m) => {
      if (skip(m)) return; m._gcNight = true;
      const prev = m.onBeforeCompile, key = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : null;
      m.onBeforeCompile = (sh, r) => {
        if (prev) prev.call(m, sh, r);
        sh.uniforms.tDark = U.uDark; sh.uniforms.uDkOn = U.uDkOn; sh.uniforms.uDkO = U.uDkO; sh.uniforms.uDkHz = U.uDkHz;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec3 uDkO; varying vec2 vDk;')
          .replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 gw = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n gw = instanceMatrix * gw;\n#endif\n gw = modelMatrix * gw; vDk = vec2((gw.x - uDkO.x) * uDkO.z, 1.0 - (gw.z - uDkO.y) * uDkO.z); }');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tDark; uniform float uDkOn; uniform vec4 uDkHz; varying vec2 vDk;')
          .replace('#include <color_fragment>', '#include <color_fragment>\nif (uDkOn > 0.0) { float dka = texture2D(tDark, vDk).a * uDkOn; if (uDkHz.w > 0.5) { float l = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(l), uDkHz.rgb, 0.6), dka); } else diffuseColor.rgb *= 1.0 - dka; }');
      };
      m.customProgramCacheKey = () => (key ? key() : '') + '|gcnight2';
      m.needsUpdate = true;
    };
    this.scene.traverse((o) => { const m = o.material; if (!m) return; if (Array.isArray(m)) m.forEach(fix); else fix(m); });
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
            vec3 film(vec3 x) { x *= 1.05; return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }     // a film's curve: bright things roll off, dark things keep their depth
            void main() { vec3 lin = texture2D(t, vUv).rgb; vec3 c = enc(uMode > 0 ? clamp(lin, 0.0, 1.0) : film(max(lin, 0.0)));
              if (uMode == 0) { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, 0.86); }
              vec2 q = vUv - 0.5; c *= 1.0 - 0.22 * smoothstep(0.45, 1.0, length(q * vec2(1.0, 0.82)) * 1.45);     // darker toward the corners, as through a lens
              if (uMode > 0) { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); l = pow(l, 0.7); if (uMode == 2) l = 1.0 - l; l = clamp((l - 0.5) * 1.15 + 0.56, 0.0, 1.0) * 0.9; c = vec3(l); }     // (0.39) the infrared picture: dark ground is lifted before the contrast goes on, so land in shadow or out of sight is dim, not black
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
