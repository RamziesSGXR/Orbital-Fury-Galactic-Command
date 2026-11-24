// (GC 0.72) THE WAR ROOM, LIVE: the room behind the main menu, drawn by the game itself with its own people and ships, in the
// player's colours. It replaces the film rendered once in Blender (0.56), which went out of date the day the people were remade.
// A dark command deck: tall windows on the stars and a planet, a fleet ship crossing outside, consoles with live screens along
// the glass, and the holo-table in the middle with the galaxy turning on it in the enemies' colours. Officers stand at the
// table, crew work the consoles, a Vanguard waits in the foreground. The camera drifts slowly. Metres throughout.
// start(canvas) once; play(true/false) as the menu shows and hides (nothing is drawn while it is hidden); restyle() after the
// livery changes. If the graphics card cannot be had, the canvas stays empty and the still picture behind it shows.
import * as THREE from '../vendor/three.js';
import { Crowd3D, staticGeo } from '../model3d.js';
import { surfScale, noSurf } from '../surface.js';
import { livery } from './livery.js';

const FOES = ['#ff9a3c', '#ff5a4e', '#b98cff'];   // the Molt, the Foundry, the Talon: as on the galaxy map
export const SHOT = { pos: [-2, 4.2, 15], at: [-4.5, 1.6, -3], fov: 38, sway: 2 };   // where the camera stands and looks (it drifts across by sway)
let glowLights = [], cap = 1 / 30, since = 1, R = null, scene, cam, crowd, clock, on = false, raf = 0, t0 = 0, glowMats = [], screens = null, galaxy, ship, walkers = [], cast = [], quality = 1, slow = 0;
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

export function start(canvas) {
  if (R) return true;
  try { R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch { R = null; return false; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.2;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
  // a backdrop needs no more than 30 frames a second; with no graphics card (drawing in software) a few, smaller, no shadows
  try { const gl = R.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'), name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    if (/swiftshader|llvmpipe|software|basic render/i.test(name)) { cap = 1 / 6; quality = 0.6; R.setPixelRatio(0.6); R.shadowMap.enabled = false; } } catch { /* unknown: as a card */ }
  scene = new THREE.Scene(); scene.background = new THREE.Color('#030506'); scene.fog = new THREE.FogExp2('#061012', 0.012);
  cam = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 400); clock = performance.now();
  build(); resize(); addEventListener('resize', resize);
  return true;
}
function resize() { if (!R) return; const w = innerWidth, h = innerHeight; R.setSize(w, h, false); since = 1; cam.aspect = w / h; cam.updateProjectionMatrix(); }
export function play(yes) {
  if (!R || yes === on) return; on = yes;
  if (on) { clock = performance.now(); raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
}
export const running = () => on;

// ---------------------------------------------------------------- the room
const glow = (c, o = 1) => { const m = new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); glowMats.push(m); return m; };
const std = (c, rough = 0.7, metal = 0.2) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });
const box = (w, h, d, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
function soft(size = 64) {   // a round, soft dot for the hologram's stars
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
function build() {
  const L = livery(), GLOW = L.colours.glow || '#7fe9e0';
  // floor, walls, ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), std('#11191b', 0.42, 0.55)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallM = std('#121a1c', 0.8, 0.3), trimM = std('#1c2628', 0.6, 0.5);
  box(60, 0.5, 40, std('#080b0c', 0.9, 0.1), 0, 7.2, 0);   // ceiling
  for (const x of [-15, 15]) box(0.6, 7.2, 40, wallM, x, 3.6, 0);
  // the glass: a wall of tall windows on the stars, mullions between them, a sill under them
  const back = -10;
  box(32, 1.4, 0.6, wallM, 0, 0.7, back); box(32, 0.9, 0.6, wallM, 0, 6.75, back);
  for (let x = -14; x <= 14; x += 4) box(0.38, 5.4, 0.5, trimM, x, 4.1, back);
  const sill = box(32, 0.12, 1.2, trimM, 0, 1.45, back + 0.5); sill.castShadow = false;
  const strip = new THREE.Mesh(new THREE.BoxGeometry(30, 0.04, 0.04), glow(GLOW, 0.9)); strip.position.set(0, 1.52, back + 1.08); scene.add(strip);
  // outside: stars, a planet low in the glass, and a ship of the fleet going by
  const N = 2200, sp = new Float32Array(N * 3), sc = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 220; sp[i * 3 + 1] = Math.random() * 90 - 15; sp[i * 3 + 2] = back - 30 - Math.random() * 80; const k = 0.5 + Math.random() * 0.5; sc[i * 3] = k; sc[i * 3 + 1] = k; sc[i * 3 + 2] = k * (0.9 + Math.random() * 0.2); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.6, map: soft(), vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })));
  const planet = new THREE.Mesh(new THREE.SphereGeometry(26, 64, 40), new THREE.MeshStandardMaterial({ color: '#2a5d63', roughness: 1, metalness: 0, fog: false }));
  planet.position.set(4, -21, back - 46); noSurf(planet.material); scene.add(planet);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(26.9, 64, 40), new THREE.MeshBasicMaterial({ color: '#7fe9e0', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false, fog: false }));
  halo.position.copy(planet.position); scene.add(halo);
  const sun = new THREE.DirectionalLight('#bfe8ff', 1.3); sun.position.set(-30, 25, back - 60); sun.target.position.set(4, -21, back - 46); scene.add(sun, sun.target);
  // the consoles along the glass, each with a screen of figures that changes
  screens = screenTex(); const scrM = new THREE.MeshBasicMaterial({ map: screens.tex, fog: false, toneMapped: false });
  for (let i = 0; i < 7; i++) {
    const x = -12 + i * 4, desk = box(3.1, 0.95, 1.1, std('#141c1e', 0.55, 0.45), x, 0.48, back + 2.2);
    box(3.1, 0.06, 1.2, std('#1f2a2c', 0.4, 0.6), x, 0.98, back + 2.2);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.1), scrM.clone()); scr.material.map = screens.tex; scr.position.set(x, 1.75, back + 1.75); scr.rotation.x = -0.12; scene.add(scr);
    const uv = scr.geometry.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) + i) / 7);
    box(2.9, 1.3, 0.08, std('#0d1314', 0.6, 0.5), x, 1.75, back + 1.68);
  }
  for (const x of [-8, 0, 8]) { const pool = new THREE.PointLight(GLOW, 14, 9, 1.8); pool.position.set(x, 1.7, back + 2.8); scene.add(pool); glowLights.push(pool); }   // the screens' light on the desks and the crew: three lights for seven screens
  // the holo-table: a drum with a lit rim, and the galaxy on it
  const table = new THREE.Group(); scene.add(table);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.3, 0.95, 64), std('#141b1d', 0.45, 0.6)); drum.position.y = 0.48; drum.castShadow = drum.receiveShadow = true; table.add(drum);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.95, 2.95, 0.04, 64), new THREE.MeshStandardMaterial({ color: '#06090a', roughness: 0.15, metalness: 0.8 })); top.position.y = 0.97; table.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.02, 0.035, 8, 96), glow(GLOW)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.98; table.add(rim);
  for (const [r, o] of [[4.6, 0.75], [6.4, 0.45], [8.6, 0.25]]) { const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.04, r + 0.04, 128), glow(GLOW, o)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012; scene.add(ring); }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 1.6, 64, 1, true), new THREE.MeshBasicMaterial({ color: GLOW, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 1.8; table.add(beam); glowMats.push(beam.material);
  galaxy = makeGalaxy(GLOW); galaxy.position.y = 1.35; table.add(galaxy); scene.userData.table = table;
  const holo = new THREE.PointLight(GLOW, 45, 14, 1.6); holo.position.set(0, 2.2, 0); scene.add(holo); glowLights.push(holo);   // no shadow: a point light's shadow is six pictures a frame
  // light: little from everywhere, cool from the glass, a key over the table, warm fill from the side
  scene.add(new THREE.HemisphereLight('#5d8794', '#0a1012', 1.6));
  const key = new THREE.SpotLight('#dff6ff', 210, 34, 0.62, 0.6, 1.4); key.position.set(-4, 6.9, 4); key.target.position.set(0, 0.5, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key, key.target);
  const fill = new THREE.PointLight('#ffb36b', 60, 22, 1.6); fill.position.set(9, 3.4, 9); scene.add(fill);
  for (let x = -12; x <= 12; x += 6) { const s = new THREE.Mesh(new THREE.BoxGeometry(4, 0.03, 0.18), glow('#cfe9ea', 0.55)); s.position.set(x, 6.95, 2); scene.add(s); }
  surfScale(scene, 1);
  // the people, in the player's colours
  crowd = new Crowd3D(scene, { cap: 8 });
  crowd.load(dress(L)).then(() => { surfScale(scene, 1); });
  cast = [
    // officers at the table, facing it
    { k: 'off', at: [-1.9, 3.4], face: 0, act: ['stand', 'look'] }, { k: 'off', at: [2.6, 3.0], face: 0, act: ['look', 'stand'] }, { k: 'off2', at: [3.9, -0.4], face: 0, act: ['stand', 'look'] },
    { k: 'pilot', at: [-3.6, -1.6], face: 0, act: ['stand', 'look'] }, { k: 'medic', at: [0.6, -3.9], face: 0, act: ['look', 'stand'] },
    // at the consoles, backs to the room
    { k: 'crew', at: [-8, back + 3.1], face: Math.PI, act: ['stand', 'look'] }, { k: 'crew', at: [4, back + 3.1], face: Math.PI, act: ['look', 'stand'] },
    // the Vanguard and a guard by the near pillar
    { k: 'van', at: [-3.4, 2.4], face: 0, act: ['stand', 'look', 'salute'] }, { k: 'troop', at: [-10.5, 4.5], face: 0.9, act: ['stand'] },
  ].map((c, i) => ({ ...c, t: 3 + i * 2.3, a: 0 }));
  walkers = [{ k: 'crew2', from: [-12, back + 4.4], to: [10, back + 4.4], speed: 1.2, x: 0 }];
  // a ship of the fleet, going by outside
  fetch('assets/models/ship_fed.json').then((r) => r.json()).then((d) => {
    ship = new THREE.Mesh(staticGeo(d), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 }));
    ship.scale.setScalar(5); ship.rotation.y = Math.PI / 2; ship.position.set(-60, 7, back - 32); scene.add(ship); surfScale(scene, 1);
  }).catch(() => {});
}
function dress(L) {
  const u = new THREE.Color(L.uniform.uniform), dark = (c, f) => c.clone().multiplyScalar(f), trim = new THREE.Color(L.colours.secondary);
  const fleet = { uniform: u, uniform_dark: dark(u, 0.78), kit: dark(u, 0.62), helmet: new THREE.Color(L.uniform.helmet), armband: new THREE.Color(L.uniform.armband), trim };
  const only = /^(stand|look|salute|w\d)$/;
  return { troop: { file: 'soldier', remap: fleet, only }, van: { file: 'vanguard', remap: { trim }, only }, off: { file: 'inspector', remap: { trim }, only }, off2: { file: 'inspector', remap: { trim, c_coat_i: dark(u, 0.9), c_coat_i_legs: dark(u, 0.7) }, only },
    crew: { file: 'crew', remap: { trim }, only }, crew2: { file: 'crew', remap: { trim }, only }, pilot: { file: 'pilot', remap: { trim }, only }, medic: { file: 'medic', remap: { trim }, only } };
}
export function restyle() {
  if (!R) return; const L = livery(), G = L.colours.glow || '#7fe9e0';
  crowd.load(dress(L)); for (const m of glowMats) m.color.set(G); for (const l of glowLights) l.color.set(G);
  const t = scene.userData.table, old = galaxy; galaxy = makeGalaxy(G); galaxy.position.y = 1.35; galaxy.rotation.y = old.rotation.y; t.remove(old); old.traverse((o) => o.geometry && o.geometry.dispose()); t.add(galaxy);   // the player's arm in the new colour
}

// the galaxy on the table: arms of stars in the three enemies' colours and the player's own, turning slowly
function makeGalaxy(own) {
  const N = 2600, p = new Float32Array(N * 3), c = new Float32Array(N * 3), col = new THREE.Color(), cols = [own, ...FOES];
  for (let i = 0; i < N; i++) {
    const arm = i % 4, r = Math.pow(Math.random(), 0.7) * 2.7, a = arm * Math.PI / 2 + r * 1.9 + (Math.random() - 0.5) * 0.7 / (0.4 + r);
    p[i * 3] = Math.cos(a) * r; p[i * 3 + 2] = Math.sin(a) * r; p[i * 3 + 1] = (Math.random() - 0.5) * 0.12 * (1.6 - r / 2.7);
    col.set(r < 0.35 ? '#fff4d8' : cols[arm]).multiplyScalar(0.8 + Math.random() * 0.7); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const grp = new THREE.Group(), pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.11, map: soft(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  grp.add(pts);
  // a few marked systems: a thin line up from the table and a ring round each
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + 0.4, r = 0.8 + (i % 3) * 0.6, x = Math.cos(a) * r, z = Math.sin(a) * r, cc = i % 2 ? FOES[i % 3] : own;
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.9), glow(cc, 0.8)); line.position.set(x, 0.1, z); grp.add(line);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 32), glow(cc)); ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.55, z); grp.add(ring);
  }
  return grp;
}
// the consoles' screens: one picture shared by all seven, a slice each, redrawn now and then
function screenTex() {
  const c = document.createElement('canvas'); c.width = 1792; c.height = 256; const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const bars = Array.from({ length: 7 * 6 }, () => Math.random());
  const draw = (dt = 0) => {
    const own = livery().colours.glow || '#7fe9e0';
    g.fillStyle = '#071214'; g.fillRect(0, 0, c.width, c.height);
    for (let s = 0; s < 7; s++) {
      const x0 = s * 256; g.strokeStyle = 'rgba(127,233,224,0.25)'; g.lineWidth = 2; g.strokeRect(x0 + 10, 10, 236, 236);
      for (let b = 0; b < 6; b++) { const i = s * 6 + b; bars[i] = Math.max(0.08, Math.min(1, bars[i] + (Math.random() - 0.5) * dt * 0.8)); const h = bars[i] * 170;
        g.fillStyle = b === (s * 2) % 6 ? FOES[s % 3] : own; g.globalAlpha = 0.85; g.fillRect(x0 + 30 + b * 34, 220 - h, 20, h); g.globalAlpha = 1; }
      g.fillStyle = 'rgba(127,233,224,0.5)'; for (let k = 0; k < 4; k++) g.fillRect(x0 + 30, 30 + k * 12, 60 + ((s * 37 + k * 53) % 120), 4);
    }
    tex.needsUpdate = true;
  };
  draw(); return { tex, draw, t: 0 };
}

// ---------------------------------------------------------------- each frame
function frame() {
  raf = requestAnimationFrame(frame);
  const now = performance.now(); since += (now - clock) / 1000; clock = now; if (since < cap) return;
  const dt = Math.min(0.25, since), t = (t0 += dt); since = 0;
  // the camera drifts along an arc, the table to the right of the menu
  const k = Math.sin(t * 0.045), P = SHOT.pos, A = SHOT.at;
  cam.position.set(P[0] + k * SHOT.sway, P[1] + Math.sin(t * 0.07) * 0.2, P[2] - k * SHOT.sway * 0.4); cam.lookAt(A[0] + k * SHOT.sway * 0.5, A[1], A[2]); cam.fov = SHOT.fov; cam.updateProjectionMatrix();
  galaxy.rotation.y = t * 0.06;
  for (const m of glowMats) if (m.userData.pulse) m.opacity = m.userData.pulse * (0.85 + 0.15 * Math.sin(t * 2));
  if ((screens.t += dt) > 0.4) { screens.draw(screens.t); screens.t = 0; }
  if (ship) { ship.position.x += dt * 1.6; if (ship.position.x > 70) ship.position.x = -70; }
  // the people: each holds a pose for a while, then another
  crowd.begin();
  if (crowd.ready('off')) {
    for (const c of cast) {
      if ((c.t -= dt) < 0) { c.a = (c.a + 1) % c.act.length; c.t = c.act[c.a] === 'salute' ? 2.2 : 5 + Math.random() * 6; }
      place(c.k, c.act[c.a], c.at[0], c.at[1], c.face === 0 ? Math.atan2(-c.at[0], -c.at[1]) : c.face);
    }
    for (const w of walkers) {
      const len = Math.hypot(w.to[0] - w.from[0], w.to[1] - w.from[1]); w.x = (w.x + dt * w.speed) % (len * 2);
      const f = w.x < len ? w.x / len : 2 - w.x / len, x = w.from[0] + (w.to[0] - w.from[0]) * f, z = w.from[1] + (w.to[1] - w.from[1]) * f;
      place(w.k, 'w' + (Math.floor(w.x / 0.21) % 8), x, z, Math.atan2(w.to[0] - w.from[0], w.to[1] - w.from[1]) + (w.x < len ? 0 : Math.PI));
    }
  }
  crowd.end();
  const ms = performance.now(); R.render(scene, cam); watch(performance.now() - ms);
}
function place(k, frame, x, z, yaw) {
  const s = 1 / crowd.unit(k); Q.setFromAxisAngle(UP, yaw); M.compose(V.set(x, 0, z), Q, S.set(s, s, s)); crowd.put(k, frame, M);
}
// a slow card: draw fewer pixels, then no shadows, rather than slow the menu
function watch(ms) {
  slow = slow * 0.95 + ms * 0.05;
  if (slow > 22 && quality > 0.6) { quality = Math.max(0.6, quality - 0.2); R.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5) * quality); slow = 0; }
  else if (slow > 22 && R.shadowMap.enabled) { R.shadowMap.enabled = false; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); slow = 0; }
}
export const _debug = () => ({ cam, crowd, scene, THREE });   // for test/warroom.py
