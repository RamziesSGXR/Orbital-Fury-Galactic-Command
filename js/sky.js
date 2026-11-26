// LIGHT FROM A REAL SKY (GC 0.92, Ramzies: "GTA V, not PlayStation 2"). A photographed overcast sky (Poly Haven CC0,
// kloofendal_overcast_puresky, assets/scans/sky_overcast.hdr) made into the soft light that falls on every surface from all
// round, and what shiny ones reflect: the game's own sun still gives the direction and the shadows. For the materials that
// can take it (the photoscans, the base's buildings and ground); the modes set how strong it is by the time of day.
//   skyLight(renderer) -> Promise of the light (an environment texture), or null (?sky=0, or it could not load)
import * as THREE from './vendor/three.js';
import { HDRLoader } from './vendor/addons/loaders/HDRLoader.js';

const SRC = new URL('../assets/scans/sky_overcast.hdr', import.meta.url).href;
const OFF = (() => { try { return /[?&](sky|scans)=0/.test(location.search + (parent !== self ? parent.location.search : '')); } catch { return false; } })();
const MADE = new WeakMap();
export function skyLight(renderer) {
  let p = MADE.get(renderer); if (p) return p;
  p = OFF ? Promise.resolve(null) : new HDRLoader().loadAsync(SRC).then((t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer), env = pm.fromEquirectangular(t).texture; t.dispose(); pm.dispose(); return env;
  }).catch((err) => { console.warn('sky light unavailable', err); return null; });
  MADE.set(renderer, p); return p;
}
