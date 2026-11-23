// THE LIVERY (GC 0.66): your command's look, kept above every game. One livery on this device; the war room, the station,
// FOB Commander and the ground fight all wear it, and changing it changes them all (each game takes it as it opens).
//
//   { v: 1, preset, name, motto,
//     colours: { primary, secondary, accent, glow },      hulls and roofs; trim and stripes; the third colour; lights
//     finish: 'panels' | 'plates' | 'smooth' | 'worn' | 'hazard',   the station's hull plating
//     uniform: { uniform, helmet, armband },               how the troopers dress
//     emblem: { layers: [layer...], img? } }               the emblem, drawn in layers like a shooter's emblem editor
//
// A layer: { k: shape, c: colour, x, y (0..100, its middle), s: size (1 fills the emblem), r: turn (degrees), fx: mirrored,
//   a: opacity (0..1), o: outline only, m: inside what is below (drawn only over the layers under it), t: the letters (k 'text') }
// Layers draw bottom first, each on its own sheet, so a shape with holes cuts only itself.
import { drawCrest, drawSymbol } from '../base/logo.js';

export const MAX_LAYERS = 16;
// ---------------------------------------------------------------- the shapes
// Each draws a path (or fills itself) in a 100 x 100 box, its middle at 50, 50. ORDER: as the editor lists them, by group.
const P = {};
const poly = (g, pts) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
const ngon = (g, n, r, a0 = -Math.PI / 2, cy = 50) => poly(g, Array.from({ length: n }, (_, i) => [50 + Math.cos(a0 + i * 2 * Math.PI / n) * r, cy + Math.sin(a0 + i * 2 * Math.PI / n) * r]));
const starp = (g, n, ro, ri, a0 = -Math.PI / 2) => poly(g, Array.from({ length: n * 2 }, (_, i) => { const a = a0 + i * Math.PI / n, r = i % 2 ? ri : ro; return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r]; }));
Object.assign(P, {
  // frames: the crest shapes
  shield: (g) => drawCrest(g, 'shield'), circle: (g) => g.arc(50, 50, 47, 0, Math.PI * 2), roundsq: (g) => g.roundRect(4, 4, 92, 92, 14), square: (g) => g.rect(4, 4, 92, 92),
  hex: (g) => ngon(g, 6, 48, 0), octagon: (g) => ngon(g, 8, 48, Math.PI / 8), diamond: (g) => poly(g, [[50, 2], [98, 50], [50, 98], [2, 50]]),
  triangle: (g) => poly(g, [[50, 6], [96, 90], [4, 90]]), pentagon: (g) => ngon(g, 5, 48, -Math.PI / 2, 54), pennant: (g) => drawCrest(g, 'pennant'),
  banner: (g) => drawCrest(g, 'chevron'), oval: (g) => g.ellipse(50, 50, 36, 48, 0, 0, Math.PI * 2),
  // marks
  ring: (g) => { g.arc(50, 50, 47, 0, Math.PI * 2); g.moveTo(88, 50); g.arc(50, 50, 38, 0, Math.PI * 2, true); },
  star: (g) => starp(g, 5, 48, 19), star4: (g) => starp(g, 4, 48, 11, -Math.PI / 2), star6: (g) => starp(g, 6, 48, 26),
  burst: (g) => starp(g, 12, 48, 34), cross: (g) => { g.rect(38, 4, 24, 92); g.rect(4, 38, 92, 24); }, saltire: (g) => { poly(g, [[14, 4], [50, 40], [86, 4], [96, 14], [60, 50], [96, 86], [86, 96], [50, 60], [14, 96], [4, 86], [40, 50], [4, 14]]); },
  chevron: (g) => poly(g, [[4, 44], [50, 16], [96, 44], [96, 68], [50, 40], [4, 68]]), chevron2: (g) => { for (const y of [0, 30]) poly(g, [[4, 34 + y], [50, 10 + y], [96, 34 + y], [96, 50 + y], [50, 26 + y], [4, 50 + y]]); },
  arrow: (g) => poly(g, [[50, 4], [92, 46], [66, 46], [66, 96], [34, 96], [34, 46], [8, 46]]), crescent: (g) => { g.arc(50, 50, 46, 0.35 * Math.PI, 1.65 * Math.PI); g.arc(66, 50, 38, 1.75 * Math.PI, 0.25 * Math.PI, true); g.closePath(); },
  claw: (g) => { for (const dx of [-24, 0, 24]) { g.moveTo(42 + dx, 6); g.quadraticCurveTo(64 + dx, 46, 46 + dx, 94); g.quadraticCurveTo(54 + dx, 46, 34 + dx, 8); g.closePath(); } },
  wing: (g) => { g.moveTo(50, 70); for (let i = 0; i < 5; i++) { g.lineTo(46 - i * 9, 22 + i * 7); g.lineTo(44 - i * 9, 36 + i * 7); } g.lineTo(52, 84); g.closePath(); },
  laurel: (g) => { for (let i = 0; i < 7; i++) { const a = Math.PI * (0.62 + i * 0.105), x = 50 + Math.cos(a) * 40, y = 52 + Math.sin(a) * 40; g.moveTo(x, y); g.ellipse(x, y, 9, 4, a + Math.PI / 2.6, 0, Math.PI * 2); } },
  eye: (g) => { g.moveTo(4, 50); g.quadraticCurveTo(50, 6, 96, 50); g.quadraticCurveTo(50, 94, 4, 50); g.closePath(); g.moveTo(66, 50); g.arc(50, 50, 16, 0, Math.PI * 2, true); g.moveTo(57, 50); g.arc(50, 50, 7, 0, Math.PI * 2); },
  crown: (g) => poly(g, [[8, 84], [8, 30], [29, 52], [50, 16], [71, 52], [92, 30], [92, 84]]), drop: (g) => { g.moveTo(50, 4); g.bezierCurveTo(78, 40, 86, 58, 82, 70); g.arc(50, 64, 33, 0.18, Math.PI - 0.18); g.bezierCurveTo(14, 58, 22, 40, 50, 4); },
  // stripes and fields: best inside another layer
  bar: (g) => g.rect(-20, 38, 140, 24), barthin: (g) => g.rect(-20, 45, 140, 10), slash: (g) => poly(g, [[-10, 74], [74, -10], [110, 26], [26, 110]]),
  half: (g) => g.rect(50, -20, 70, 140), quarter: (g) => g.rect(-20, -20, 70, 70), stripes: (g) => { for (let i = -6; i < 7; i++) poly(g, [[i * 16, 110], [i * 16 + 8, 110], [i * 16 + 128, -10], [i * 16 + 120, -10]]); },
  hazard: (g) => { for (let i = -6; i < 8; i++) poly(g, [[i * 22, 110], [i * 22 + 11, 110], [i * 22 + 131, -10], [i * 22 + 120, -10]]); }, grid: (g) => { for (let i = 0; i < 6; i++) { g.rect(i * 18 + 2, -10, 4, 120); g.rect(-10, i * 18 + 2, 120, 4); } },
  dots: (g) => { for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { const cx = 8 + x * 17 + (y % 2) * 8, cy = 8 + y * 17; g.moveTo(cx + 4, cy); g.arc(cx, cy, 4, 0, Math.PI * 2); } },
});
// the symbols the crests always had (they fill themselves)
const SYMS = ['striker', 'skull', 'helmet', 'fist', 'sword', 'bolt', 'flame', 'gear', 'planet', 'globe', 'wings', 'tower', 'crosshair', 'anchor', 'chevrons'];
export const SHAPES = [
  ['FRAMES', ['shield', 'circle', 'roundsq', 'square', 'hex', 'octagon', 'diamond', 'triangle', 'pentagon', 'pennant', 'banner', 'oval']],
  ['MARKS', ['ring', 'star', 'star4', 'star6', 'burst', 'cross', 'saltire', 'chevron', 'chevron2', 'arrow', 'crescent', 'claw', 'wing', 'laurel', 'eye', 'crown', 'drop']],
  ['SYMBOLS', SYMS.map((s) => 'sym:' + s)],
  ['STRIPES', ['bar', 'barthin', 'slash', 'half', 'quarter', 'stripes', 'hazard', 'grid', 'dots']],
  ['LETTERS', ['text']],
];
const SELF = new Set(SYMS.map((s) => 'sym:' + s));
// the symbols sit in the middle of their box; scaled up so that size 1 fills the emblem like the other shapes
const SYM_K = 1.45;
function path(g, L) {
  g.beginPath();
  if (L.k === 'text') {
    const t = String(L.t || '').toUpperCase().slice(0, 6) || 'GC';
    g.font = `700 ${Math.round(64 / Math.max(1, t.length * 0.62))}px "Chakra Petch", "Arial Narrow", ui-sans-serif, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (L.o) { g.lineWidth = 4; g.strokeText(t, 50, 53); } else g.fillText(t, 50, 53);
    return true;
  }
  if (SELF.has(L.k)) { g.translate(50, 50); g.scale(SYM_K, SYM_K); g.translate(-50, -50); drawSymbol(g, L.k.slice(4)); return true; }
  const f = P[L.k]; if (!f) return true; f(g);
  return false;
}

// ---------------------------------------------------------------- drawing
const sheet = (n) => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
let SHEET = null, ACC = null;
// the emblem into a 2D context at (x, y), size s. It is put together on a sheet of its own first, so a layer drawn 'inside what
// is below' is inside the emblem's own layers, never over whatever was already on the page.
export function drawEmblem(g0, em, x = 0, y = 0, s = 100) {
  const n = Math.max(8, Math.ceil(s)), layers = (em && em.layers) || [];
  if (!SHEET || SHEET.width < n) { SHEET = sheet(Math.max(n, 128)); ACC = sheet(SHEET.width); }
  const sh = SHEET, q = sh.getContext('2d'), k = n / 100, g = ACC.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, ACC.width, ACC.height);
  g.save();
  for (const L of layers) {
    if (L.hide) continue;
    q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, n, n); q.globalCompositeOperation = 'source-over';
    q.setTransform(k, 0, 0, k, 0, 0);
    q.translate(L.x ?? 50, L.y ?? 50); q.rotate(((L.r || 0) * Math.PI) / 180); q.scale((L.s ?? 1) * (L.fx ? -1 : 1), L.s ?? 1); q.translate(-50, -50);
    q.fillStyle = L.c || '#ffffff'; q.strokeStyle = L.c || '#ffffff';
    const done = path(q, L);
    if (!done) { if (L.o) { q.lineWidth = 5 / Math.max(0.3, L.s ?? 1); q.lineJoin = 'round'; q.stroke(); } else q.fill('evenodd'); }
    g.globalAlpha = L.a ?? 1; g.globalCompositeOperation = L.m ? 'source-atop' : 'source-over';
    g.drawImage(sh, 0, 0, n, n, 0, 0, n, n);
  }
  g.restore();
  g0.drawImage(ACC, 0, 0, n, n, x, y, s, s);
}
// a canvas of the emblem, kept for reuse (textures, the trooper's armband, the menus)
const CACHE = new Map();
export function emblemCanvas(em, size = 256) {
  const key = size + '|' + JSON.stringify(em.layers || []);
  let c = CACHE.get(key);
  if (!c) { c = sheet(size); const g = c.getContext('2d'); drawEmblem(g, em, 0, 0, size); CACHE.set(key, c); if (CACHE.size > 40) CACHE.delete(CACHE.keys().next().value); }
  return c;
}
// a canvas drawn on its own (not cached), for the editor's big preview
export function drawEmblemTo(canvas, em) { const g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height); drawEmblem(g, em, 0, 0, canvas.width); }

// ---------------------------------------------------------------- the colours, finishes and the five ready-made liveries
export const COLOURS = ['#f4f4f4', '#c9ced1', '#8a929a', '#4a5259', '#2b3036', '#14171a', '#e8c25a', '#ffb020', '#ffe600', '#e8b72a', '#c0392b', '#8a1c1c',
  '#ff3ea5', '#a24bd6', '#5b3fa0', '#1d3f8a', '#3a4f6a', '#3da9ff', '#7fe9e0', '#0f6b5c', '#2e4a2a', '#5d6a4a', '#8a5a44', '#d9c7a0'];
export const FINISHES = [['panels', 'PANELLED'], ['plates', 'ARMOUR'], ['smooth', 'SMOOTH'], ['worn', 'WEATHERED'], ['hazard', 'HAZARD']];
const lay = (k, c, o = {}) => ({ k, c, x: 50, y: 50, s: 1, r: 0, a: 1, ...o });
export const PRESETS = [
  { preset: 'helix', name: 'Helix Dynamics', motto: 'Tomorrow\'s victories, today.', finish: 'plates',
    colours: { primary: '#1f252b', secondary: '#7fe9e0', accent: '#e8eef0', glow: '#7fe9e0' }, uniform: { uniform: '#2b3036', helmet: '#14171a', armband: '#7fe9e0' },
    emblem: { layers: [lay('hex', '#14171a'), lay('stripes', '#2b3036', { m: true, a: 0.9 }), lay('hex', '#7fe9e0', { s: 0.92, o: true }), lay('crescent', '#e8eef0', { s: 0.56, x: 44, r: 20 }), lay('crescent', '#7fe9e0', { s: 0.56, x: 56, r: 200 }), lay('star4', '#f4f4f4', { s: 0.2 })] } },
  { preset: 'meridian', name: 'Crimson Meridian', motto: 'Security you can see from orbit.', finish: 'panels',
    colours: { primary: '#3a3f45', secondary: '#c0392b', accent: '#e8c25a', glow: '#ff6a4a' }, uniform: { uniform: '#4a4f55', helmet: '#2a1d1d', armband: '#c0392b' },
    emblem: { layers: [lay('shield', '#8a1c1c'), lay('chevron', '#e8c25a', { m: true, y: 60, s: 1.05 }), lay('shield', '#e8c25a', { s: 0.9, o: true }), lay('star', '#f4f4f4', { s: 0.3, y: 32 })] } },
  { preset: 'aurora', name: 'Aurora Media Group', motto: 'Live from the front line.', finish: 'smooth',
    colours: { primary: '#dfe5e8', secondary: '#ff3ea5', accent: '#3da9ff', glow: '#ff3ea5' }, uniform: { uniform: '#dfe5e6', helmet: '#3d7fc4', armband: '#ff3ea5' },
    emblem: { layers: [lay('circle', '#f4f4f4'), lay('slash', '#3da9ff', { m: true, a: 0.85 }), lay('ring', '#ff3ea5', { s: 0.98 }), lay('star4', '#ff3ea5', { s: 0.62 }), lay('star4', '#14171a', { s: 0.22, x: 70, y: 30 })] } },
  { preset: 'sable', name: 'Sable & Lantern', motto: 'We keep the lights on.', finish: 'hazard',
    colours: { primary: '#2b2e26', secondary: '#ffb020', accent: '#5d6a4a', glow: '#ffb020' }, uniform: { uniform: '#5d6a4a', helmet: '#2e3324', armband: '#ffb020' },
    emblem: { layers: [lay('octagon', '#ffb020'), lay('hazard', '#14171a', { m: true }), lay('octagon', '#14171a', { s: 0.74 }), lay('sym:flame', '#ffb020', { s: 0.62, y: 52 })] } },
  { preset: 'nova', name: 'Nova Prime Expeditionary', motto: 'First to land, first on air.', finish: 'panels',
    colours: { primary: '#1d2a4a', secondary: '#e8c25a', accent: '#f4f4f4', glow: '#9fd8ff' }, uniform: { uniform: '#3a4f6a', helmet: '#1d2a4a', armband: '#e8c25a' },
    emblem: { layers: [lay('circle', '#1d3f8a'), lay('ring', '#e8c25a', { s: 0.9 }), lay('sym:wings', '#e8c25a', { s: 0.66, y: 58 }), lay('star', '#f4f4f4', { s: 0.26, y: 32 })] } },
];
export const presetById = (id) => PRESETS.find((p) => p.preset === id) || null;
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------------------------------------------------------------- kept on the device
const KEY = 'ofgc.livery';
let mine = null;
export function livery() {
  if (mine) return mine;
  try { const l = JSON.parse(localStorage.getItem(KEY)); if (l && l.v === 1 && l.emblem && l.colours) return (mine = l); } catch { /* none */ }
  return (mine = { v: 1, ...clone(PRESETS[0]) });
}
export function setLivery(l) { mine = l; try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* no storage: kept for this visit */ } }
export const hasLivery = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };
export const usePreset = (id) => { const p = presetById(id); if (p) setLivery({ v: 1, ...clone(p) }); return livery(); };

// An older command's crest (shape, symbol, pattern, colours, letters) as layers, so a player who made one keeps it.
export function fromCrest(f) {
  const lg = (f && f.logo) || {}, L = [lay(lg.shape === 'roundel' ? 'circle' : lg.shape === 'chevron' ? 'banner' : P[lg.shape] ? lg.shape : 'shield', lg.bg || '#1b2a1a')];
  const pat = { halves: 'half', stripe: ['bar', { r: 90 }], band: 'bar', chevron: ['chevron', { y: 56 }], quarters: 'quarter', cross: 'cross', diagonal: 'slash' }[lg.pattern];
  if (pat) { const [k, o] = Array.isArray(pat) ? pat : [pat, {}]; L.push(lay(k, lg.pc || lg.rim || '#3d4247', { m: true, ...o })); if (lg.pattern === 'quarters') L.push(lay('quarter', lg.pc || lg.rim || '#3d4247', { m: true, x: 100, y: 100 })); }
  L.push(lay(L[0].k, lg.rim || lg.fg || '#ffe600', { s: lg.pattern === 'border' ? 0.8 : 0.96, o: true }));
  const text = (lg.text || '').trim();
  if (lg.symbol && lg.symbol !== 'none') L.push(lay(lg.symbol === 'star' ? 'star' : 'sym:' + lg.symbol, lg.fg || '#ffe600', { s: lg.symbol === 'star' ? 0.5 : text ? 0.8 : 1, y: text ? 44 : 50 }));
  if (text) L.push(lay('text', lg.fg || '#ffe600', { t: text, s: lg.symbol === 'none' ? 1 : 0.42, y: lg.symbol === 'none' ? 50 : 80 }));
  return { v: 1, preset: null, name: f.name || 'The Command', motto: f.motto || '', finish: 'panels',
    colours: { primary: f.primary || '#22262a', secondary: f.secondary || '#ffe600', accent: lg.bg || '#3d4247', glow: f.secondary || '#7fe9e0' },
    uniform: { uniform: (f.look && f.look.uniform) || '#5d6a4a', helmet: (f.look && f.look.helmet) || '#4c5a3c', armband: (f.look && f.look.armband) || f.secondary || '#ffe600' },
    emblem: { layers: L, ...(lg.img ? { img: lg.img } : {}) } };
}
// The command as every game reads it: name, motto, the two colours, the crest (now the emblem) and the troopers' look.
// The old crest fields stay filled for anything that still reads them.
export function asFaction(l = livery(), base = {}) {
  const C = l.colours, em = l.emblem, L0 = (em.layers && em.layers[0]) || {};
  return { ...base, name: l.name || base.name || 'The Command', motto: l.motto ?? base.motto ?? '', primary: C.primary, secondary: C.secondary,
    logo: { layers: em.layers, ...(em.img ? { img: em.img } : {}), shape: P[L0.k] ? L0.k : 'shield', symbol: 'none', bg: L0.c || C.primary, fg: C.secondary, rim: C.secondary, pc: C.accent, pattern: 'none', text: '' },
    look: { uniform: l.uniform.uniform, helmet: l.uniform.helmet, armband: l.uniform.armband, crest: true }, livery: { finish: l.finish, accent: C.accent, glow: C.glow } };
}
