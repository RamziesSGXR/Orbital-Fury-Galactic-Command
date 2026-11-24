// THE LIVERY (GC 0.66): the editor for the livery every game wears (core/livery.js). (GC 0.75) Opened by your crest, on every screen.
//   STYLES   the five ready-made liveries, and your own
//   EMBLEM   the emblem in layers, as in a shooter's emblem editor: up to 16 shapes, each with its colour, size, turn,
//            place, opacity, mirror, outline and "keep inside" (drawn only over the layers under it)
//   COLOURS  hulls and roofs, trim, accent, lights, the hull's finish, and how the troopers dress
//   NAME     the command's name and motto, and a picture of your own in place of the emblem
// The page is drawn as HTML by pageLivery() and wired up by bindLivery(); a slider or a drag repaints the pictures only, so
// nothing is rebuilt under the pointer. Every change is kept at once, on this device.
import { livery, setLivery, hasLivery, PRESETS, presetById, SHAPES, COLOURS, FINISHES, MAX_LAYERS, drawEmblem, asFaction } from './livery.js';
import { drawLogo, drawTrooper, readUpload, ensureLogo } from '../base/logo.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const OWN = 'ofgc.livery.own';     // your own design, kept aside while a ready-made style is worn
const readOwn = () => { try { const o = JSON.parse(localStorage.getItem(OWN)); return o && o.v === 1 && o.emblem ? o : null; } catch { return null; } };
const writeOwn = (l) => { try { localStorage.setItem(OWN, JSON.stringify(l)); } catch { /* no room: it is still worn */ } };
export const isOwn = (l) => !!(l.edited || !l.preset);

let sub = 'styles', sel = 0, group = 'FRAMES';
const undo = [];
const snap = () => { undo.push(JSON.stringify(livery())); if (undo.length > 40) undo.shift(); };
const keep = (edited = true) => { const l = livery(); if (edited) l.edited = true; setLivery(l); };
export const liverySub = (k) => { if (k) sub = k; return sub; };

// ---------------------------------------------------------------- names for the shapes (the tooltips)
const NAMES = { roundsq: 'Rounded square', hex: 'Hexagon', star4: 'Four-point star', star6: 'Six-point star', chevron2: 'Double chevron', barthin: 'Thin bar', text: 'Letters', drop: 'Drop', saltire: 'Saltire (X)', half: 'Half', quarter: 'Quarter' };
const nameOf = (k) => NAMES[k] || (k.startsWith('sym:') ? k.slice(4) : k).replace(/^./, (c) => c.toUpperCase());
const STRIPES = new Set(SHAPES.find((g) => g[0] === 'STRIPES')[1]);

// ---------------------------------------------------------------- the ready-made styles, as cards (also on the founding screen)
// cur: the livery shown as chosen; own: your own design to offer beside the five (null: none yet)
export function styleCards(cur, own, ownLabel = 'YOUR OWN', offerNew = true) {
  const on = (p) => !isOwn(cur) && cur.preset === p.preset;
  const strip = (c) => `<i class="lvstrip">${['primary', 'secondary', 'accent', 'glow'].map((k) => `<i style="background:${c[k]}"></i>`).join('')}</i>`;
  const cards = PRESETS.map((p) => `<button class="lvcard${on(p) ? ' on' : ''}" data-lv="preset" data-id="${p.preset}"><canvas width="160" height="160" data-em="${p.preset}"></canvas><b>${esc(p.name)}</b><small>${esc(p.motto)}</small>${strip(p.colours)}</button>`);
  const mine = isOwn(cur) ? cur : own;
  if (mine || offerNew) cards.push(mine ? `<button class="lvcard own${isOwn(cur) ? ' on' : ''}" data-lv="own"><canvas width="160" height="160" data-em="own"></canvas><b>${ownLabel}</b><small>${esc(mine.name || '')}</small>${strip(mine.colours)}</button>`
    : `<button class="lvcard own new" data-lv="own"><span>+</span><b>DESIGN YOUR OWN</b><small>Start from the style you wear</small></button>`);
  return cards.join('');
}
export function drawCards(root, cur, own) {
  for (const c of root.querySelectorAll('canvas[data-em]')) {
    const id = c.dataset.em, l = id === 'own' ? (isOwn(cur) ? cur : own || cur) : presetById(id), g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height); if (l) drawLogo(g, asFaction(l).logo, 6, 6, c.width - 12);
  }
}
// a ready-made style taken up, keeping the name and motto the player typed
export function fromPreset(id, cur) {
  const p = clone(presetById(id) || PRESETS[0]);
  return { v: 1, ...p, ...(cur && cur.ownName ? { name: cur.name, motto: cur.motto, ownName: true } : {}) };
}

// ---------------------------------------------------------------- the page
const sw = (field, value, mine = null) => `<div class="sw lvsw" data-f="${field}">${mine ? mine.map((c) => `<button class="mine${value === c ? ' on' : ''}" style="background:${c}" data-c="${c}" title="Your colour"></button>`).join('') + '<i class="sep"></i>' : ''}${COLOURS.map((c) => `<button class="${value === c ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="${c}"></button>`).join('')}<input type="color" value="${/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'}" data-f="${field}" title="Any colour"></div>`;
const btn = (lv, text, o = {}) => `<button class="plate btn sm${o.on ? ' on' : ''}" data-lv="${lv}"${o.dis ? ' disabled' : ''}${o.title ? ` title="${esc(o.title)}"` : ''}>${text}</button>`;
function pageEmblem(l) {
  const L = l.emblem.layers, cur = L[sel], full = L.length >= MAX_LAYERS;
  const tiles = L.map((x, i) => `<button class="lvtile${i === sel ? ' on' : ''}${x.hide ? ' off' : ''}" data-lv="sel" data-i="${i}" title="Layer ${i + 1}: ${esc(nameOf(x.k))}"><canvas width="68" height="68" data-ly="${i}"></canvas><i>${i + 1}</i></button>`).join('') || '<p class="soon">No layers yet: add one.</p>';
  const groups = SHAPES.map(([g]) => `<button class="${g === group ? 'on' : ''}" data-lv="group" data-g="${g}">${g}</button>`).join('');
  const shapes = SHAPES.find((x) => x[0] === group)[1].map((k) => `<button class="lvshape${cur && cur.k === k ? ' on' : ''}" data-lv="shape" data-k="${k}" title="${esc(nameOf(k))}"><canvas width="68" height="68" data-sh="${k}"></canvas></button>`).join('');
  const C = l.colours, mine = [...new Set([C.primary, C.secondary, C.accent, C.glow])];
  const slider = (k, label, min, max, v) => `<label>${label}<input type="range" data-k="${k}" min="${min}" max="${max}" value="${v}"${cur ? '' : ' disabled'}><output data-o="${k}">${v}</output></label>`;
  const v = cur || { s: 1, r: 0, x: 50, y: 50, a: 1 };
  return `<div class="lvsec"><span>LAYERS <small>${L.length} OF ${MAX_LAYERS} · 1 IS AT THE BOTTOM</small></span><div class="lvtiles">${tiles}</div></div>
    <div class="lvrow">${btn('add', '+ ADD A LAYER', { dis: full })}${btn('dup', 'COPY', { dis: !cur || full })}${btn('down', '◀ LOWER', { dis: !cur || sel === 0 })}${btn('up', 'HIGHER ▶', { dis: !cur || sel >= L.length - 1 })}${btn('hide', cur && cur.hide ? 'SHOW' : 'HIDE', { dis: !cur })}${btn('del', 'DELETE', { dis: !cur })}</div>
    <div class="lvsec"><span>SHAPE</span><div class="lvgroups">${groups}</div></div><div class="lvshapes">${shapes}</div>
    <div class="lvsec"><span>COLOUR</span>${sw('layer', cur ? cur.c : '', mine)}</div>
    <div class="lvsl">${slider('s', 'SIZE', 5, 200, Math.round((v.s ?? 1) * 100))}${slider('r', 'TURN', -180, 180, Math.round(v.r || 0))}${slider('a', 'SHOW', 10, 100, Math.round((v.a ?? 1) * 100))}
      ${slider('x', 'LEFT-RIGHT', -20, 120, Math.round(v.x ?? 50))}${slider('y', 'UP-DOWN', -20, 120, Math.round(v.y ?? 50))}${cur && cur.k === 'text' ? `<label>LETTERS<input type="text" class="lvtext" data-k="t" maxlength="6" value="${esc(cur.t || '')}" autocomplete="off"></label>` : '<label class="blank"></label>'}</div>
    <div class="lvrow">${btn('fx', 'MIRROR', { on: cur && cur.fx, dis: !cur })}${btn('o', 'OUTLINE ONLY', { on: cur && cur.o, dis: !cur || cur.k.startsWith('sym:') })}${btn('m', 'KEEP INSIDE THE LAYERS BELOW', { on: cur && cur.m, dis: !cur || sel === 0, title: 'Drawn only where the layers under it are: a stripe across a shield, not past its edge' })}</div>`;
}
function pageColours(l) {
  const C = l.colours, U = l.uniform;
  const row = (label, f, v, note) => `<span title="${esc(note)}">${label}</span>${sw(f, v)}`;
  return `<div class="lvcols">${row('HULLS AND ROOFS', 'primary', C.primary, "The station's hull, the base's roofs and the ship's plating")}${row('TRIM', 'secondary', C.secondary, 'Stripes, edges and nameplates')}
    ${row('ACCENT', 'accent', C.accent, 'Dark bands, frames and fittings')}${row('LIGHTS', 'glow', C.glow, 'Lamps, windows and signs')}
    <span>HULL FINISH</span><div class="seg">${FINISHES.map(([k, n]) => `<button class="plate btn sm${l.finish === k ? ' on' : ''}" data-lv="finish" data-k="${k}">${n}</button>`).join('')}</div>
    ${row('UNIFORM', 'uniform', U.uniform, "The troopers' armour")}${row('HELMET', 'helmet', U.helmet, "The troopers' helmets")}${row('ARMBAND', 'armband', U.armband, 'The armband, with your emblem on the shoulder')}</div>
    <div class="lvrow">${btn('paint', 'PAINT THE EMBLEM IN THESE COLOURS', { title: "Recolours the emblem's layers with your hull, trim, accent and light colours, in order" })}</div>`;
}
function pageName(l) {
  const base = l.preset && presetById(l.preset);
  return `<div class="lvname"><label>COMMAND NAME<input id="lv-n" maxlength="32" autocomplete="off" value="${esc(l.name)}"></label><label>MOTTO<input id="lv-m" maxlength="40" autocomplete="off" value="${esc(l.motto)}"></label></div>
    <div class="lvsec"><span>YOUR OWN PICTURE</span><div class="lvrow">${btn('upload', l.emblem.img ? 'CHANGE THE PICTURE' : 'UPLOAD A PICTURE')}${l.emblem.img ? btn('unup', 'REMOVE IT') : ''}<input type="file" id="lv-file" accept="image/*" hidden></div>
      <p class="soon">A picture of your own (up to 2 MB) is worn in place of the emblem, shrunk to 128 pixels and kept on this device.</p></div>
    <div class="lvsec"><span>WHERE IT IS WORN</span><ul class="lvwhere"><li><b>THE WAR ROOM</b>your emblem and name over the map</li><li><b>THE GROUND</b>your troopers' armour, armbands and banners</li><li><b>THE STATION</b>the hull, its finish and trim, the lights and the emblem on its side</li><li><b>FOB COMMANDER</b>the roofs, the trim and the emblem on the buildings</li></ul>
      <p class="soon">Each game puts on the livery as it opens: a game already open wears the new one the next time you go in.</p></div>
    ${base ? `<div class="lvrow">${btn('reset', `BACK TO ${esc(base.name.toUpperCase())}`, { title: 'Throws away your changes to this style' })}</div>` : ''}`;
}
export function pageLivery() {
  const l = livery(), L = l.emblem.layers; sel = Math.max(0, Math.min(sel, L.length - 1));
  const subs = [['styles', 'STYLES'], ['emblem', 'EMBLEM'], ['colours', 'COLOURS'], ['name', 'NAME AND MOTTO']];
  const body = sub === 'emblem' ? pageEmblem(l) : sub === 'colours' ? pageColours(l) : sub === 'name' ? pageName(l)
    : `<div class="lvcards">${styleCards(l, readOwn())}</div><p class="soon">Pick a style to wear, or design your own. Your livery is worn in all four games: the war room, the ground fight, the station and FOB Commander. ${l.ownName ? 'A style keeps the name and motto you gave your command.' : 'A style brings its own name and motto; give your command one of its own under NAME AND MOTTO.'}</p>`;
  const side = sub === 'emblem'
    ? `<p class="lvhint">Drag to move the layer · wheel to size it · Shift and wheel to turn it · arrow keys to nudge</p><div class="lvrow">${btn('undo', 'UNDO', { dis: !undo.length, title: 'Ctrl+Z' })}${btn('clear', 'CLEAR', { dis: !L.length })}</div>${l.emblem.img ? '<p class="soon">Your own picture is worn in place of this emblem (NAME AND MOTTO).</p>' : ''}`
    : `<div class="lvlook"><canvas id="lv-trooper" width="150" height="150" title="A trooper"></canvas><canvas id="lv-hull" width="270" height="150" title="A hull plate"></canvas></div>${sub !== 'styles' ? `<div class="lvrow">${btn('undo', 'UNDO', { dis: !undo.length, title: 'Ctrl+Z' })}</div>` : ''}`;
  return `<section class="tpan lvp"><h3>Your livery</h3><div class="osub">${subs.map(([k, n]) => `<button class="${sub === k ? 'on' : ''}" data-lv="sub" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="lvg"><div class="lvside"><div class="lvbig${sub === 'emblem' ? ' edit' : ''}"><canvas id="lv-big" width="440" height="440"></canvas></div><b id="lv-name">${esc(l.name || 'The Command')}</b><small id="lv-motto">${esc(l.motto)}</small>${side}</div>
    <div class="lvmain lv-${sub}">${body}</div></div></section>`;
}

// ---------------------------------------------------------------- the pictures
const one = (L) => ({ layers: [{ ...L, m: false, hide: false }] });
function thumb(c, em) { const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); drawEmblem(g, em, 4, 4, c.width - 8); }
function shapeThumb(c, k) {
  const fg = '#e6eadc';
  thumb(c, STRIPES.has(k) ? { layers: [{ k: 'circle', c: '#3a4248', x: 50, y: 50, s: 0.96 }, { k, c: fg, x: 50, y: 50, s: 1, m: true }] }
    : { layers: [{ k, c: fg, x: 50, y: 50, s: k.startsWith('sym:') ? 0.8 : 0.92, t: 'AB' }] });
}
// a hull plate in the livery: the finish in the hull colour, a trim stripe, the accent band, the lights and the emblem
function drawHull(c, l) {
  const g = c.getContext('2d'), W = c.width, H = c.height, C = l.colours; g.save(); g.clearRect(0, 0, W, H);
  g.fillStyle = C.primary; g.fillRect(0, 0, W, H);
  const dark = 'rgba(0,0,0,0.28)', light = 'rgba(255,255,255,0.10)';
  g.lineWidth = 1.5;
  if (l.finish === 'panels' || l.finish === 'hazard') { for (let x = 0; x <= W; x += 45) { g.strokeStyle = dark; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y <= H; y += 38) { g.strokeStyle = dark; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.strokeStyle = light; g.beginPath(); g.moveTo(0, y + 2); g.lineTo(W, y + 2); g.stroke(); } }
  if (l.finish === 'plates') { for (let r = 0; r < 3; r++) for (let i = -1; i < 4; i++) { const x = i * 90 + (r % 2) * 45, y = r * 50; g.fillStyle = light; g.fillRect(x + 3, y + 3, 84, 3); g.fillStyle = dark; g.fillRect(x + 3, y + 44, 84, 3); g.strokeStyle = dark; g.strokeRect(x + 2, y + 2, 86, 46); g.fillStyle = 'rgba(0,0,0,0.35)'; for (const [dx, dy] of [[8, 8], [80, 8], [8, 40], [80, 40]]) { g.beginPath(); g.arc(x + dx, y + dy, 2, 0, 7); g.fill(); } } }
  if (l.finish === 'smooth') { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.strokeStyle = dark; g.beginPath(); g.moveTo(W * 0.62, 0); g.lineTo(W * 0.62, H); g.stroke(); }
  if (l.finish === 'worn') { let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < 70; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.07)'; g.fillRect(rnd() * W, rnd() * H, 4 + rnd() * 26, 1 + rnd() * 3); } for (let x = 0; x <= W; x += 60) { g.strokeStyle = dark; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } }
  // the accent band and the trim stripe
  g.fillStyle = C.accent; g.fillRect(0, H - 34, W, 34);
  if (l.finish === 'hazard') { g.save(); g.beginPath(); g.rect(0, H - 34, W, 34); g.clip(); g.fillStyle = C.secondary; for (let x = -40; x < W + 40; x += 28) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 14, H); g.lineTo(x + 48, H - 34); g.lineTo(x + 34, H - 34); g.fill(); } g.restore(); }
  g.fillStyle = C.secondary; g.fillRect(0, H - 44, W, 6);
  // the lights
  g.shadowColor = C.glow; g.shadowBlur = 10; g.fillStyle = C.glow;
  for (const x of [22, 52, 82]) { g.beginPath(); g.arc(x, 22, 4.5, 0, 7); g.fill(); }
  g.shadowBlur = 0;
  drawLogo(g, asFaction(l).logo, W - 96, 14, 82);
  g.restore();
}
// the big picture: the emblem (as it is worn, or in layers while it is being edited) and, while editing, the layer picked
function drawBig(c, l) {
  const g = c.getContext('2d'), W = c.width; g.clearRect(0, 0, W, W);
  if (sub !== 'emblem') { drawLogo(g, asFaction(l).logo, 10, 10, W - 20); return; }
  g.strokeStyle = 'rgba(230,234,220,0.08)'; g.lineWidth = 1;
  for (let i = 1; i < 10; i++) { const p = (W * i) / 10; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, W); g.moveTo(0, p); g.lineTo(W, p); g.stroke(); }
  g.strokeStyle = 'rgba(230,234,220,0.22)'; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, W); g.moveTo(0, W / 2); g.lineTo(W, W / 2); g.stroke();
  drawEmblem(g, l.emblem, 0, 0, W);
  const L = l.emblem.layers[sel]; if (!L) return;
  const k = W / 100; g.save(); g.translate((L.x ?? 50) * k, (L.y ?? 50) * k); g.rotate(((L.r || 0) * Math.PI) / 180);
  const h = 50 * (L.s ?? 1) * k; g.setLineDash([8, 6]); g.lineWidth = 2; g.strokeStyle = '#000'; g.strokeRect(-h, -h, h * 2, h * 2); g.strokeStyle = '#f5d547'; g.lineDashOffset = 7; g.strokeRect(-h, -h, h * 2, h * 2);
  g.setLineDash([]); g.fillStyle = '#f5d547'; for (const [x, y] of [[-h, -h], [h, -h], [-h, h], [h, h]]) g.fillRect(x - 4, y - 4, 8, 8);
  g.restore();
}
function paint(root) {
  const l = livery(), f = asFaction(l);
  const big = root.querySelector('#lv-big'); if (big) drawBig(big, l);
  const tr = root.querySelector('#lv-trooper'); if (tr) { const g = tr.getContext('2d'); g.clearRect(0, 0, tr.width, tr.height); drawTrooper(g, f, 0, 0, tr.width); }
  const hu = root.querySelector('#lv-hull'); if (hu) drawHull(hu, l);
  const t = root.querySelector(`canvas[data-ly="${sel}"]`), L = l.emblem.layers[sel]; if (t && L) thumb(t, one(L));
  const n = root.querySelector('#lv-name'); if (n) n.textContent = l.name || 'The Command';
  const m = root.querySelector('#lv-motto'); if (m) m.textContent = l.motto || '';
}
function paintAll(root) {
  const l = livery();
  paint(root);
  for (const c of root.querySelectorAll('canvas[data-ly]')) { const L = l.emblem.layers[+c.dataset.ly]; if (L) thumb(c, one(L)); }
  for (const c of root.querySelectorAll('canvas[data-sh]')) shapeThumb(c, c.dataset.sh);
  drawCards(root, l, readOwn());
}

// ---------------------------------------------------------------- what the controls do
const lay = (k, c, o = {}) => ({ k, c, x: 50, y: 50, s: 1, r: 0, a: 1, ...o });
// a new layer's colour: the first of the livery's colours (then white, then black) that stands out from the emblem's ground
const lum = (c) => { const n = parseInt(String(c).slice(1, 7), 16) || 0; return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
function standOut(l) {
  const C = l.colours, L = l.emblem.layers, opts = [C.secondary, C.accent, C.glow, C.primary, '#f4f4f4', '#14171a'];
  if (!L.length) return C.primary;
  const u = lum(L[0].c); return opts.find((c) => Math.abs(lum(c) - u) >= 90) || opts.reduce((b, c) => (Math.abs(lum(c) - u) > Math.abs(lum(b) - u) ? c : b));
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// after a change: redraw the page (rebuild: the controls changed too) and tell the menu (its bar shows the emblem)
export function bindLivery(root, { redraw, changed = () => {}, audio = null, toast = () => {} }) {
  const box = root.querySelector('.lvp'); if (!box) return;
  const click = () => audio && audio.click();
  const done = (rebuild = true) => { keep(); changed(); if (rebuild) redraw(); else paint(box); };
  paintAll(box);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lv],[data-c]'); if (!b || b.disabled) return;
    const l = livery(), L = l.emblem.layers, cur = L[sel], d = b.dataset;
    if (d.c) {     // a swatch
      const f = b.closest('[data-f]').dataset.f; snap(); setColour(l, f, d.c); click(); return done();
    }
    click();
    switch (d.lv) {
      case 'sub': sub = d.k; return redraw();
      case 'preset': { const cur0 = livery(); if (isOwn(cur0) && hasLivery()) writeOwn(cur0); snap(); setLivery(fromPreset(d.id, cur0)); sel = 0; changed(); return redraw(); }
      case 'own': {
        const own = readOwn();
        if (isOwn(l)) { sub = 'emblem'; return redraw(); }
        snap();
        if (own) setLivery(own); else { l.edited = true; setLivery(l); sub = 'emblem'; }
        changed(); return redraw();
      }
      case 'group': group = d.g; return redraw();
      case 'sel': sel = +d.i; return redraw();
      case 'shape': {
        snap();
        if (!cur) { L.push(lay(d.k, standOut(l), { s: STRIPES.has(d.k) ? 1 : 0.6 })); sel = L.length - 1; }
        else { cur.k = d.k; if (d.k === 'text' && !cur.t) cur.t = initials(l.name); if (cur.k.startsWith('sym:')) cur.o = false; }
        return done();
      }
      case 'add': { if (L.length >= MAX_LAYERS) return; snap(); const k = group === 'LETTERS' ? 'text' : SHAPES.find((x) => x[0] === group)[1][0]; const n = lay(k, standOut(l), { s: STRIPES.has(k) || !L.length ? 1 : 0.5, t: k === 'text' ? initials(l.name) : undefined, m: STRIPES.has(k) && L.length > 0 }); L.splice(sel + 1, 0, n); sel = Math.min(sel + 1, L.length - 1); if (L.length === 1) sel = 0; return done(); }
      case 'dup': { if (!cur || L.length >= MAX_LAYERS) return; snap(); L.splice(sel + 1, 0, clone(cur)); sel++; return done(); }
      case 'down': if (cur && sel > 0) { snap(); [L[sel - 1], L[sel]] = [L[sel], L[sel - 1]]; sel--; if (sel === 0) L[0].m = false; return done(); } return;
      case 'up': if (cur && sel < L.length - 1) { snap(); [L[sel + 1], L[sel]] = [L[sel], L[sel + 1]]; if (sel === 0) L[0].m = false; sel++; return done(); } return;
      case 'hide': if (cur) { snap(); cur.hide = !cur.hide; return done(); } return;
      case 'del': if (cur) { snap(); L.splice(sel, 1); sel = Math.max(0, sel - 1); if (L[0]) L[0].m = false; return done(); } return;
      case 'fx': case 'o': case 'm': if (cur) { snap(); cur[d.lv] = !cur[d.lv]; return done(); } return;
      case 'clear': snap(); L.length = 0; sel = 0; return done();
      case 'undo': return doUndo();
      case 'finish': snap(); l.finish = d.k; return done();
      case 'paint': { snap(); const pal = [l.colours.primary, l.colours.secondary, l.colours.accent, l.colours.glow], map = new Map(); for (const x of L) { if (!map.has(x.c)) map.set(x.c, pal[map.size % pal.length]); x.c = map.get(x.c); } return done(); }
      case 'reset': { const p = presetById(l.preset); if (!p) return; snap(); setLivery(fromPreset(l.preset, l)); sel = 0; changed(); return redraw(); }
      case 'upload': { const file = box.querySelector('#lv-file'); if (file) file.click(); return; }
      case 'unup': snap(); delete l.emblem.img; return done();
    }
  });
  // the picture of your own (NAME AND MOTTO)
  const file = box.querySelector('#lv-file');
  if (file) {
    file.onchange = async () => { const f = file.files[0]; file.value = ''; if (!f) return; try { const img = await readUpload(f); snap(); livery().emblem.img = img; await ensureLogo({ img }); audio && audio.ready(); done(); } catch (err) { audio && audio.deny(); toast(err.message || 'That picture could not be read.', 4000); } };
  }
  function doUndo() { const s = undo.pop(); if (!s) return; setLivery(JSON.parse(s)); sel = Math.min(sel, Math.max(0, livery().emblem.layers.length - 1)); changed(); redraw(); }
  box._undo = doUndo;
  // colour pickers: the colour shows as it is dragged, and is kept when the picker closes
  for (const inp of box.querySelectorAll('input[type=color]')) {
    let first = true;
    inp.addEventListener('input', () => { if (first) { snap(); first = false; } setColour(livery(), inp.dataset.f, inp.value); paint(box); });
    inp.addEventListener('change', () => { first = true; setColour(livery(), inp.dataset.f, inp.value); done(); });
  }
  // the sliders and the letters
  for (const inp of box.querySelectorAll('.lvsl input')) {
    let first = true;
    const apply = () => {
      const L = livery().emblem.layers[sel]; if (!L) return; const k = inp.dataset.k, v = inp.value;
      if (first) { snap(); first = false; }
      if (k === 't') L.t = v.toUpperCase(); else if (k === 's' || k === 'a') L[k] = +v / 100; else L[k] = +v;
      const o = box.querySelector(`output[data-o="${k}"]`); if (o) o.textContent = v;
      paint(box);
    };
    inp.addEventListener('input', apply);
    inp.addEventListener('change', () => { first = true; keep(); changed(); });
  }
  // the name and motto
  const nm = box.querySelector('#lv-n'), mo = box.querySelector('#lv-m');
  if (nm) { nm.oninput = () => { const l = livery(); l.name = nm.value; l.ownName = true; paint(box); }; nm.onchange = () => { const l = livery(); l.name = nm.value.trim() || 'The Command'; nm.value = l.name; setLivery(l); changed(); }; }
  if (mo) { mo.oninput = () => { const l = livery(); l.motto = mo.value; l.ownName = true; paint(box); }; mo.onchange = () => { const l = livery(); l.motto = mo.value.trim(); setLivery(l); changed(); }; }
  // the big picture: drag the layer picked, wheel to size it, Shift and wheel to turn it
  const big = box.querySelector('.lvbig.edit canvas');
  if (big) {
    let drag = null;
    const syncSliders = () => { const L = livery().emblem.layers[sel]; if (!L) return; for (const [k, v] of [['x', L.x], ['y', L.y], ['s', (L.s ?? 1) * 100], ['r', L.r || 0]]) { const i = box.querySelector(`.lvsl input[data-k="${k}"]`), o = box.querySelector(`output[data-o="${k}"]`); if (i) i.value = Math.round(v); if (o) o.textContent = Math.round(v); } };
    big.addEventListener('pointerdown', (e) => { const L = livery().emblem.layers[sel]; if (!L) return; snap(); drag = { x: e.clientX, y: e.clientY, x0: L.x ?? 50, y0: L.y ?? 50, w: big.getBoundingClientRect().width }; big.setPointerCapture(e.pointerId); });
    big.addEventListener('pointermove', (e) => { if (!drag) return; const L = livery().emblem.layers[sel]; if (!L) return; L.x = Math.round(clamp(drag.x0 + ((e.clientX - drag.x) / drag.w) * 100, -20, 120)); L.y = Math.round(clamp(drag.y0 + ((e.clientY - drag.y) / drag.w) * 100, -20, 120)); syncSliders(); paint(box); });
    const end = () => { if (!drag) return; drag = null; keep(); changed(); };
    big.addEventListener('pointerup', end); big.addEventListener('pointercancel', end);
    let wt = 0;
    big.addEventListener('wheel', (e) => {
      const L = livery().emblem.layers[sel]; if (!L) return; e.preventDefault();
      if (!wt) snap(); clearTimeout(wt); wt = setTimeout(() => { wt = 0; keep(); changed(); }, 500);
      const d = Math.sign(e.deltaY || e.deltaX);
      if (e.shiftKey) { L.r = ((Math.round((L.r || 0) - d * 5) + 540) % 360) - 180; } else L.s = clamp(Math.round(((L.s ?? 1) * (d > 0 ? 0.94 : 1.0638)) * 100) / 100, 0.05, 2);
      syncSliders(); paint(box);
    }, { passive: false });
    box._nudge = (dx, dy) => { const L = livery().emblem.layers[sel]; if (!L) return; snap(); L.x = clamp((L.x ?? 50) + dx, -20, 120); L.y = clamp((L.y ?? 50) + dy, -20, 120); syncSliders(); paint(box); keep(); changed(); };
  }
}
// keys while the livery is open (the main menu's, or the menu's inside a game): Ctrl+Z undoes; the arrows nudge the layer picked (Shift: further)
export function liveryKey(e) {
  const box = document.querySelector('#menu:not([hidden]) .lvp') || document.querySelector('#s-title.on #t-page .lvp'); if (!box) return false;
  if (/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '') && document.activeElement.type !== 'range') return false;
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { if (box._undo) { e.preventDefault(); box._undo(); } return true; }
  const a = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (a && box._nudge && document.activeElement.type !== 'range') { e.preventDefault(); const k = e.shiftKey ? 5 : 1; box._nudge(a[0] * k, a[1] * k); return true; }
  return false;
}
const initials = (name) => String(name || 'GC').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || 'GC';
function setColour(l, f, c) {
  if (f === 'layer') { const L = l.emblem.layers[sel]; if (L) L.c = c; }
  else if (f in l.colours) l.colours[f] = c;
  else if (f in l.uniform) l.uniform[f] = c;
}
