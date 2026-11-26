// THE DEBUG READOUT, EVERYWHERE (GC 0.92, Ramzies: "you can't open F3 debug UI everywhere"). F3 (or Ctrl+Shift+D) shows it
// over the menu, the war room, the base and the station, as the ground fight already had its own: the version, where you
// are, frames a second and how long a frame takes, what the graphics card drew (calls, triangles, textures), the card itself,
// and the screen: its size, the window's, the page's and the pixel ratio, and whether it is full screen (to see why a
// screen's interface does not fit). COPY REPORT puts it all on the clipboard. Off until asked for; it costs nothing then.
import { VERSION } from '../galaxy/config.js';

let box = null, on = false, last = null, gpu = '', frames = 0, t0 = performance.now(), fps = 0, ms = 0, worst = 0, prev = performance.now();
// the renderer on show: the biggest visible canvas among the renderers the game's objects hold (three.js's renderer keeps its
// methods on itself, so they are found, not wrapped)
function findR() {
  const gc = window.gc || {}, seen = new Set(), out = [], look = (o, d) => {
    if (!o || typeof o !== 'object' || seen.has(o) || d > 2) return; seen.add(o);
    if (o.isWebGLRenderer) { out.push(o); return; }
    for (const k of Object.keys(o)) { const v = o[k]; if (v && typeof v === 'object' && !(v instanceof Node) && !ArrayBuffer.isView(v) && !Array.isArray(v)) look(v, d + 1); }
  };
  look(gc.mode, 0); look(gc, 1);
  let best = null, area = 0;
  for (const r of out) { const b = r.domElement.getBoundingClientRect(), a = b.width * b.height; if (a > area && r.domElement.isConnected) { area = a; best = r; } }
  return best;
}

function gpuOf(r) {
  try { const gl = r.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch { return '?'; }
}
function text() {
  const r = last = findR() || last, i = r && r.info, vv = window.visualViewport, gc = window.gc || {};
  if (r && !gpu) gpu = gpuOf(r);
  const cv = r && r.domElement, px = cv ? `${cv.width}x${cv.height}` : '-';
  return [
    `v${VERSION}  ${gc.state || '-'}${gc.mode && gc.mode.view && gc.mode.view.q != null ? '  quality ' + gc.mode.view.q : ''}`,
    `fps ${fps.toFixed(0)}  frame ${ms.toFixed(1)} ms  worst ${worst.toFixed(0)} ms`,
    i ? `calls ${i.render.calls}  tris ${(i.render.triangles / 1000).toFixed(0)}k  geometries ${i.memory.geometries}  textures ${i.memory.textures}  programs ${(i.programs || []).length}` : 'nothing drawn yet',
    `picture ${px}  page ${innerWidth}x${innerHeight}  ratio ${devicePixelRatio}${vv && vv.scale !== 1 ? '  zoom ' + vv.scale.toFixed(2) : ''}`,
    `screen ${screen.width}x${screen.height}  window ${outerWidth}x${outerHeight}  ${document.fullscreenElement ? 'full screen' : 'windowed'}  touch ${navigator.maxTouchPoints || 0}`,
    `gpu ${gpu || '-'}`,
  ].join('\n');
}
function tick(t) {
  frames++; const dt = t - prev; prev = t; worst = Math.max(worst, dt);
  if (t - t0 > 500) { fps = frames * 1000 / (t - t0); ms = (t - t0) / frames; frames = 0; t0 = t; if (box) box.firstChild.textContent = text(); worst *= 0.5; }
  if (on) requestAnimationFrame(tick);
}
function show(v) {
  on = v;
  if (!box) {
    box = document.createElement('div'); box.id = 'gc-debug';
    box.style.cssText = 'position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:9999;background:rgba(6,9,8,.88);border:1px solid #2e3b36;padding:8px 10px;font:11px/1.45 ui-monospace,Consolas,monospace;color:#7fe0a8;white-space:pre;pointer-events:auto;max-width:96vw;overflow:hidden';
    box.innerHTML = '<div></div><button style="margin-top:6px;font:600 11px ui-monospace,monospace;background:#16201c;color:#dfe;border:1px solid #3c5048;padding:4px 10px;cursor:pointer">COPY REPORT</button>';
    box.querySelector('button').onclick = () => { try { navigator.clipboard.writeText(text()); } catch {} };
    document.body.appendChild(box);
  }
  box.style.display = v ? '' : 'none';
  if (v) { box.firstChild.textContent = text(); t0 = prev = performance.now(); frames = 0; requestAnimationFrame(tick); }
}
addEventListener('keydown', (e) => {
  if (e.code === 'F3' || (e.ctrlKey && e.shiftKey && e.code === 'KeyD')) { e.preventDefault(); show(!on); }
});
export const debugReadout = { show, text };
