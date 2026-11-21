// THE PIXEL LOOK TEST, ON ITS OWN PAGE. ground.html opened by itself with #pixel on its address (or <html data-test="pixel">)
// plays one mission of the war against the Foundry, whole: armoury, briefing, the fight, the debrief. Nothing is saved and no
// war is touched. #pixel-nuke, #pixel-evac and #pixel-vip pick the mission; with none it is a fortress. #scale (and #scale-nuke and so on) is the
// same mission at true scale with the ordinary look, no pixels. When it is over the
// page starts again. (pixel-test.html is the same thing behind a small menu, for a build served from a folder.)
import { newKit, newWallet } from './data/kit.js';
const el = document.documentElement, h = (location.hash || '').slice(1), on = el.dataset.test === 'pixel' || /^(pixel|scale)/.test(h), plain = /^scale/.test(h);     // (#scale: true scale with the ordinary look)
if (on && !(() => { try { return window.parent !== window && window.parent.gcGround; } catch { return false; } })()) {
  // somewhere that keeps nothing (a page shown inside another): the game's notes are kept in memory for the visit
  try { localStorage.setItem('ofgc.t', '1'); localStorage.removeItem('ofgc.t'); }
  catch { const mem = new Map(), shim = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); }, clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
    try { Object.defineProperty(window, 'localStorage', { configurable: true, value: shim }); } catch { /* it stays as it is */ } }
  const obj = (/^(?:pixel|scale)-(fortress|nuke|evac|vip)$/.exec(h) || [])[1] || el.dataset.obj || 'fortress', again = () => setTimeout(() => location.reload(), 600);
  window.gcGroundSelf = {
    kit: newKit(), wallet: newWallet(6000), tier: 2, hints: true, level: 2, support: null,
    livery: { name: 'Test Command', primary: '#2f8f9c', secondary: '#f2efe4', logo: { shape: 'shield', bg: '#2f8f9c', sym: 'star', fg: '#f2efe4' } },
    faction: 'bots', biome: 'grass', seed: (Math.random() * 1e9) | 0, obj, post: null, op: 'Operation Pixel', callsign: 'TEST',
    sight: 'day', pixel: !plain, preview: () => ({ chips: [], notes: [] }), onResult: again, onAbort: again,
  };
}
