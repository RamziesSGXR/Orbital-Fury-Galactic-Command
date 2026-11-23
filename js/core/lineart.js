// One of the game's models drawn as line art, turning slowly: the COLLECTION tab's picture of whatever is open.
// The same drawing as the menu's pictures (tools/lineart.js): black faces, so the far side is hidden, and white sharp edges.
// One renderer is kept for the whole page and moved into whichever box asks for it; it stops when its box leaves the page.
import * as THREE from '../vendor/three.js';

const files = {};
const file = (name) => (files[name] ||= fetch(`assets/models/${name}.json`).then((r) => { if (!r.ok) throw new Error(name); return r.json(); }));
const b64 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
function geo(d, frame = 'stand') {
  const tris = new Uint16Array(b64(d.tris).buffer.slice(0)), q = new Uint16Array(b64(d.frames[frame] || d.frames.stand).buffer.slice(0)), pos = new Float32Array(d.nt * 9);
  for (let t = 0; t < d.nt; t++) for (let k = 0; k < 3; k++) { const v = tris[t * 3 + k] * 3, o = t * 9 + k * 3; for (let a = 0; a < 3; a++) pos[o + a] = d.min[a] + q[v + a] / 65535 * d.size[a]; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g;
}
const fill = new THREE.MeshBasicMaterial({ color: 0x000000, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const edge = new THREE.LineBasicMaterial({ color: 0xffffff });
let R = null, scene = null, cam = null, obj = null, raf = 0, ask = 0;

function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
function clear() { if (!obj) return; scene.remove(obj); obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); obj = null; }

// draw art ({ model, part, frame }) in box; false if it could not be drawn (no WebGL, or no such model)
export async function showArt(box, art) {
  const me = ++ask; stop();
  if (!R) {
    try { R = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { R = false; }
    if (R) { R.setClearColor(0x000000, 0); R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(30, 1, 0.05, 400); }
  }
  if (!R || !art || !art.model) return false;
  let d;
  try { d = await file(art.model); if (art.part) d = d[art.part]; } catch { return false; }
  if (me !== ask || !d || !d.tris) return false;
  clear();
  const g = geo(d, art.frame), o = new THREE.Group(), inner = new THREE.Group();
  inner.add(new THREE.Mesh(g, fill)); inner.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), edge));
  // centred on its own middle, so it turns in place
  g.computeBoundingSphere(); const s = g.boundingSphere; inner.position.set(-s.center.x, -s.center.y, -s.center.z); o.add(inner);
  scene.add(o); obj = o;
  const w = Math.max(80, box.clientWidth), h = Math.max(80, box.clientHeight);
  R.setSize(w, h, false); R.domElement.style.width = '100%'; R.domElement.style.height = '100%';
  cam.aspect = w / h; cam.updateProjectionMatrix();
  const fov = THREE.MathUtils.degToRad(cam.fov) / 2, fit = Math.min(fov, Math.atan(Math.tan(fov) * cam.aspect)), dist = s.radius / Math.sin(fit) * 1.05;
  const dir = new THREE.Vector3(0.62, 0.42, 0.66).normalize();
  cam.position.copy(dir.multiplyScalar(dist)); cam.lookAt(0, 0, 0);
  box.appendChild(R.domElement);
  let last = performance.now();
  o.rotation.y = -0.6;
  const frame = (now) => {
    if (me !== ask || !R.domElement.isConnected || !R.domElement.offsetParent) { raf = 0; return; }
    o.rotation.y += Math.min(0.05, (now - last) / 1000) * 0.35; last = now;
    R.render(scene, cam); raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return true;
}
