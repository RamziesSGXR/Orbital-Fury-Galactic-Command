// The game's models as line art (see lineart.html). Each scene is a few models placed and a camera; every model is drawn
// as black faces (so its far side is hidden) with its sharp edges in white over them.
import * as THREE from '../js/vendor/three.js';

const qs = new URLSearchParams(location.search);
const b64 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
const files = {};
async function file(name) { if (!files[name]) files[name] = fetch(`../assets/models/${name}.json`).then((r) => r.json()); return files[name]; }
// one model's triangles in a pose, as places only (the line art has no colour)
function geo(d, frame = 'stand') {
  const tris = new Uint16Array(b64(d.tris).buffer.slice(0)), q = new Uint16Array(b64(d.frames[frame] || d.frames.stand).buffer.slice(0)), pos = new Float32Array(d.nt * 9);
  for (let t = 0; t < d.nt; t++) for (let k = 0; k < 3; k++) { const v = tris[t * 3 + k] * 3, o = t * 9 + k * 3; for (let a = 0; a < 3; a++) pos[o + a] = d.min[a] + q[v + a] / 65535 * d.size[a]; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g;
}
const fill = new THREE.MeshBasicMaterial({ color: 0x000000, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
async function put(scene, { model, part, frame, at = [0, 0, 0], turn = 0, scale = 1, angle = 28, opacity = 1 }) {
  let d = await file(model); if (part) d = d[part];
  const g = geo(d, frame), o = new THREE.Group();
  o.add(new THREE.Mesh(g, fill));
  o.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, angle), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: opacity < 1, opacity })));
  o.position.set(...at); o.rotation.y = turn; o.scale.setScalar(scale); scene.add(o); return o;
}
// the scenes: what is in each picture, and where the camera stands
const SCENES = {
  war: { cam: [7, 2.2, 9], look: [0, 0.3, 0], fov: 26, fit: 0.6, items: [{ model: 'ship_fed', turn: 0.85, scale: 1.7 }, { model: 'ship_fed', at: [-5.5, 2.2, -7], turn: 0.85, scale: 1.0, opacity: 0.6 }, { model: 'ship_fed', at: [4.5, 3.2, -11], turn: 0.85, scale: 0.85, opacity: 0.45 }] },
  fury: { cam: [3.4, 1.3, 2.4], look: [0, 1.0, 0], fov: 30, fit: 0.9, items: [{ model: 'vanguard', frame: 'aim', turn: -0.2 }] },
  base: { cam: [10, 7.5, 12], look: [0, 0.8, 0], fov: 30, fit: 0.72, items: [{ model: 'buildings', part: 'warroom', turn: 0 }, { model: 'buildings', part: 'lookout', at: [-5.2, 0, 1.5], turn: 0 }, { model: 'buildings', part: 'comms', at: [4.6, 0, -3.5], turn: 0, opacity: 0.8 }] },
  orbit: { cam: [7, 2.4, 9], look: [0, 0, 0], fov: 30, fit: 0.7, items: [{ model: 'station', part: 'reactor', scale: 1.5, at: [0, -0.8, 0] }, { model: 'station', part: 'bigring' }, { model: 'station', part: 'lance', at: [0, 1.0, 0], scale: 0.8 }] },
};
async function draw() {
  const name = qs.get('scene') || (qs.get('model') ? '' : 'fury'), sc = SCENES[name] || { cam: [4, 2, 6], look: [0, 1, 0], fov: 30, items: [{ model: qs.get('model'), part: qs.get('part'), frame: qs.get('frame') }] };
  if (qs.get('cam')) sc.cam = qs.get('cam').split(',').map(Number);
  if (qs.get('look')) sc.look = qs.get('look').split(',').map(Number);
  const canvas = document.getElementById('art'), r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(sc.fov, canvas.width / canvas.height, 0.05, 200);
  for (const it of sc.items) await put(scene, it);
  // fit: if asked, frame the whole scene in view from the camera's direction
  scene.updateMatrixWorld(true);
  if (qs.has('fit') || sc.fit) { const sp = new THREE.Box3().setFromObject(scene).getBoundingSphere(new THREE.Sphere()), dir = new THREE.Vector3(...sc.cam).sub(new THREE.Vector3(...sc.look)).normalize(), k = sc.fit || 1.08; sc.look = sp.center.toArray(); sc.cam = sp.center.clone().add(dir.multiplyScalar(sp.radius / Math.sin(sc.fov * Math.PI / 360) * k)).toArray(); }
  cam.position.set(...sc.cam); cam.lookAt(...sc.look);
  r.render(scene, cam);
  const c2 = new THREE.Vector3(...sc.look).project(cam); document.body.dataset.done = JSON.stringify({ cam: sc.cam.map((v) => +v.toFixed(2)), look: sc.look.map((v) => +v.toFixed(2)), proj: [+c2.x.toFixed(2), +c2.y.toFixed(2)] });
}
draw().catch((e) => { document.body.dataset.done = 'error: ' + e.message; });
