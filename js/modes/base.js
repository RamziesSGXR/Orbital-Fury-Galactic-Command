// THE BASE: the base on a system's key world. The rules and the 3D are FOB Super Commander's (js/base); this file is how
// the commander meets them inside Galactic Command: one base for each system, roads, zones and buildings from the shared
// tool bar, requests on the shared desk, and its charter reported back to the map (the system pays more into the war).
import { C, B, GROUPS, ZONES } from '../base/config.js';
import { Sim, LOOSE } from '../base/sim.js';
import { Life } from '../base/life.js';
import { View } from '../base/view.js';
import { REQUESTS } from '../base/desk.js';
import { ensureLogo } from '../base/logo.js';
import { words } from '../core/words.js';
// (0.46) what a base puts on air: every parade ground, speaker, billboard, banner, flag and monument standing is footage for the war's ratings
const SHOWS = new Set(['parade', 'speaker', 'billboard', 'banner', 'hdbanner', 'flag', 'seflag', 'statue', 'monument', 'memorial', 'lecture', 'truth', 'plaque']);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const ROADS = { road1: { name: 'Dirt Road', k: 'dirt', sub: 'drag to draw' }, road2: { name: 'Paved Road', k: 'paved', sub: 'two tiles wide' }, path: { name: 'Footpath', k: 'path', sub: 'for boots' },
  wall: { name: 'Wall', k: 'wall', sub: 'close it for a bonus' }, unroad: { name: 'Bulldoze', k: null, sub: words('tap a road or wall') } };
const TABS = GROUPS.filter((g) => g[0] !== 'landscape');
const isZone = (t) => !!t && t.startsWith('zone:'), isRoad = (t) => !!ROADS[t];

let app, ui, audio, canvas, view = null, sim = null, life = null, args = null;
let acc = 0, group = 'roads', tool = null, rot = 0, sel = 0, barSig = '', deskSig = '', hudT = 0, saveT = 25, thumbs = {};
let roadDrag = null, zoneDrag = null, drag = null, pinch = null; const ptrs = new Map(), held = new Set();

const baseFaction = (sys) => ({ ...structuredClone(app.faction), base: `Fort ${sys.worlds[sys.key].name}`, diff: 'recruit' });

// ---------------------------------------------------------------- the shared frame
function tabs() { $('th-tabs').innerHTML = TABS.map((g) => `<button data-bg="${g[0]}" class="${g[0] === group ? 'on' : ''}">${g[1]}</button>`).join(''); }
function thumb(t) { if (!(t in thumbs)) { try { thumbs[t] = view.thumb(t, sim.std ?? 0) || ''; } catch { thumbs[t] = ''; } } return thumbs[t]; }
function bar(force) {
  let html = '';
  if (group === 'roads') html = Object.entries(ROADS).map(([k, r]) => `<button class="plate btn tool${tool === k ? ' on' : ''}" data-bt="${k}"><b>${r.name}</b><span>${r.sub}</span></button>`).join('');
  else if (group === 'zones') html = Object.entries(ZONES).map(([k, z]) => `<button class="plate btn tool${tool === 'zone:' + k ? ' on' : ''}" data-bt="zone:${k}" style="border-color:${z.col}"><b style="color:${z.col}">${z.name}</b><span>tap a road, or drag</span></button>`).join('') +
    `<button class="plate btn tool${tool === 'zone:' ? ' on' : ''}" data-bt="zone:"><b>Unzone</b><span>clear a zone</span></button>`;
  else {
    const g = TABS.find((x) => x[0] === group) || TABS[0];
    html = g[3].filter((t) => B[t]).map((t) => {
      const lk = sim.locked(t), cost = sim.costOf(t, specOf(t)), c = typeof cost === 'object' ? cost.sup ?? cost.cost ?? 0 : cost, pic = thumb(t);
      return `<button class="plate btn tool pic${tool === t ? ' on' : ''}" data-bt="${t}" ${lk ? 'disabled' : ''}>${pic ? `<img src="${pic}" alt="">` : ''}<div><b>${esc(B[t].name)}</b><span>${lk ? 'needs ' + esc(lk[0]) : Math.round(c) + ' SUP'}</span></div></button>`;
    }).join('') || '<span class="dim" style="align-self:center">Nothing to place by hand here yet. These grow in their zone.</span>';
  }
  if (force || html !== barSig) { barSig = html; $('th-bar').innerHTML = html; }
}
const specOf = (k) => (sim.designable(k) ? { design: 0, parts: [] } : sim.hasStd(k) ? { std: sim.std } : null);
function stats() {
  const T = sim.time || { day: 1, hour: 8 }, mo = Math.round(sim.morale), S = C.STAGES[sim.stage || 0];
  ui.stats([{ k: 'SUPPLIES', v: Math.round(sim.supplies).toLocaleString('en-US'), tone: sim.supplies < 100 ? 'r' : 'a' }, { k: 'CREDITS', v: Math.round(sim.credits).toLocaleString('en-US') }, { k: 'TROOPS', v: sim.troops.length },
    { k: 'MORALE', v: mo, tone: mo < 35 ? 'r' : '' }, { k: `DAY ${Math.floor(T.day)}`, v: `${String(Math.floor(T.hour)).padStart(2, '0')}:00` }, { k: 'CHARTER', v: (S.short || S.name).toUpperCase() }]);
  let tip = '';
  if (isRoad(tool)) tip = tool === 'unroad' ? words('Tap a road or a wall to take it out.') : `${ROADS[tool].name}: drag across the ground to draw it.`;
  else if (isZone(tool)) tip = words('Tap beside a road to zone its block, or drag a rectangle.');
  else if (tool) tip = words(`${B[tool].name}: it snaps to a plot along a road. Tap to place.`);
  else { const nx = C.STAGES[(sim.stage || 0) + 1]; if (nx) tip = `NEXT CHARTER · ${(nx.short || nx.name).toUpperCase()}: ` + (nx.needs || []).map((t) => `${B[t] ? B[t].name : t}${sim.has(t) ? ' ✓' : ''}`).join(' · '); }
  ui.tip(tip);
}
function selBar() {
  const el = $('th-sel'), b = sel && sim.byId(sel);
  el.classList.toggle('hidden', !b);
  if (!b) return;
  el.innerHTML = `<b>${esc(B[b.type].name)}</b><span class="grow dim">${b.done ? esc(B[b.type].desc || B[b.type].why || '') : 'under construction'}</span>${b.type === 'hq' ? '' : '<button class="plate btn sm" data-bd="1">DEMOLISH</button>'}<button class="plate btn sm" data-bx="1">×</button>`;
}
function desk() {
  const sig = sim.desk.map((r) => r.id).join(',');
  if (sig === deskSig) return; deskSig = sig;
  $('th-desk').innerHTML = sim.desk.slice(0, innerWidth < 640 ? 1 : 2).map((r) => { const q = REQUESTS[r.k];
    return `<div class="plate amber req" data-id="${r.id}"><b>${esc(q.title.toUpperCase())}</b>${esc(q.text.replaceAll('NAME', r.name))}<div class="row">${q.opts.map((o, i) => `<button class="plate btn sm" data-ba="${i}" ${sim.canDecide(r, i) ? '' : 'disabled'}>${esc(o.label)}</button>`).join('')}</div></div>`; }).join('');
}
function setTool(t) {
  tool = tool === t ? null : t; sel = 0; view.select(null); selBar();
  view.setGhost(null); view.showLine(null); view.showPlots(isZone(tool) || (tool && !isRoad(tool) && !LOOSE.has(tool)) ? sim.plotTiles() : null);
  audio.click(); bar(true); stats();
}

// ---------------------------------------------------------------- pointing: roads, zones, buildings, the camera
const tileOf = (e) => { const p = view.pick(e.clientX, e.clientY); return [Math.floor(p.x), Math.floor(p.z)]; };
function tileAt(e) {
  const p = view.pick(e.clientX, e.clientY);
  if (!tool) return p;
  if (!LOOSE.has(tool)) { const pl = sim.plotFor(tool, p.x, p.z, 0); if (pl) return { ...p, tx: pl.tx, tz: pl.tz, rot: pl.rot }; }
  const d = B[tool], w = rot % 2 ? d.d : d.w, dd = rot % 2 ? d.w : d.d;
  return { ...p, tx: Math.round(p.x - w / 2), tz: Math.round(p.z - dd / 2), rot };
}
const lineEnd = (e) => { const p = view.pick(e.clientX, e.clientY); return sim.snapLine({ x: p.x, z: p.z }, 'free', ROADS[tool].k || 'dirt', roadDrag); };
const zoneRect = (a, b) => { const out = []; for (let z = Math.min(a[1], b[1]); z <= Math.max(a[1], b[1]); z++) for (let x = Math.min(a[0], b[0]); x <= Math.max(a[0], b[0]); x++) out.push([x, z, 1]); return out; };
function bind() {
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (mode.off) return;
    canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) }; drag = null; roadDrag = null; zoneDrag = null; view.showLine(null); return; }
    if (isZone(tool) && e.button === 0) { zoneDrag = tileOf(e); drag = null; return; }
    if (isRoad(tool) && e.button === 0) { roadDrag = tool === 'unroad' ? { bull: true } : lineEnd(e); drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, btn: e.button, moved: false };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (mode.off) return;
    const p0 = ptrs.get(e.pointerId);
    if (p0) {
      const dx = e.clientX - p0.x, dy = e.clientY - p0.y; p0.x = e.clientX; p0.y = e.clientY;
      if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x); view.zoomBy(pinch.d / Math.max(1, d)); view.spin(-(ang - pinch.ang)); pinch.d = d; pinch.ang = ang; return; }
      if (drag) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true; if (drag.moved) { if (drag.btn === 2 || drag.btn === 1) view.spin(-dx * 0.008); else view.pan(dx, dy); } }
    }
    if (zoneDrag) { view.showPlots(zoneRect(zoneDrag, tileOf(e))); return; }
    if (roadDrag && !roadDrag.bull) { const end = lineEnd(e), c = sim.checkLine(roadDrag, end, ROADS[tool].k); view.showLine(roadDrag, end, ROADS[tool].k === 'paved' ? 2 : 1, c.ok, ROADS[tool].k === 'wall'); return; }
    if (tool && !isRoad(tool) && !isZone(tool)) { const t = tileAt(e), sp = specOf(tool); view.setGhost(tool, t.tx, t.tz, t.rot, sim.canPlace(tool, t.tx, t.tz, t.rot, sp).ok, sp); }
  });
  const up = (e) => {
    if (mode.off) return;
    ptrs.delete(e.pointerId);
    if (zoneDrag) {
      const a = zoneDrag, t = tileOf(e), zk = tool.slice(5) || null; zoneDrag = null;
      const one = a[0] === t[0] && a[1] === t[1], r = one ? sim.zoneFill(t[0], t[1], zk) : sim.paintZone(a[0], a[1], t[0], t[1], zk);
      if (r.ok) { audio.podLand(); sim.growStep(); } else { audio.deny(); app.toast(one ? (r.why || 'Zones go beside a road, on your land.') : 'Zones go on open ground on your land.'); }
      view.showPlots(sim.plotTiles()); return;
    }
    if (roadDrag) {
      let ok;
      if (tool === 'unroad') { const p = view.pick(e.clientX, e.clientY); ok = sim.removeLine(p.x, p.z); }
      else { const end = lineEnd(e), c = sim.checkLine(roadDrag, end, ROADS[tool].k); ok = c.ok && sim.drawLine(roadDrag, end, ROADS[tool].k); if (!ok && c.why && c.why !== 'Too short') app.toast(c.why); }
      roadDrag = null; view.showLine(null); if (ok) audio.podLand(); else audio.deny(); barSig = ''; return;
    }
    if (pinch) { if (ptrs.size < 2) pinch = null; drag = null; return; }
    const d = drag; drag = null; if (!d || d.moved) return;
    if (d.btn === 2) { if (tool) setTool(tool); else { sel = 0; view.select(null); selBar(); } return; }
    if (tool) {
      const t = tileAt(e), sp = specOf(tool), ok = sim.canPlace(tool, t.tx, t.tz, t.rot, sp);
      if (!ok.ok) { audio.deny(); app.toast(ok.why || 'It cannot go there.'); return; }
      sim.place(tool, t.tx, t.tz, t.rot, false, sp); audio.podLand(); barSig = '';
      if (!LOOSE.has(tool) && !e.shiftKey) setTool(tool);
      return;
    }
    const p = view.pick(e.clientX, e.clientY); sel = p.bid || 0; view.select(sel ? sim.byId(sel) : null); if (sel) audio.click(); selBar();
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; pinch = null; roadDrag = null; zoneDrag = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); view.zoomBy(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
  $('s-theatre').addEventListener('click', (e) => {
    if (mode.off) return;
    const t = e.target.closest('[data-bg],[data-bt],[data-ba],[data-bd],[data-bx]'); if (!t) return;
    const d = t.dataset;
    if (d.bg) { group = d.bg; if (tool) setTool(tool); audio.click(); tabs(); bar(true); }
    else if (d.bt != null) setTool(d.bt);
    else if (d.ba != null) { const ok = sim.decide(+t.closest('.req').dataset.id, +d.ba); if (ok) audio.click(); else audio.deny(); deskSig = ''; desk(); }
    else if (d.bd) { const r = sim.demolish(sel); if (r === false || (r && r.ok === false)) { audio.deny(); if (r && r.why) app.toast(r.why); } else { audio.baseDown(); sel = 0; view.select(null); selBar(); } }
    else if (d.bx) { sel = 0; view.select(null); selBar(); }
  });
  window.addEventListener('keydown', (e) => {
    if (mode.off || e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase(); held.add(k);
    if (k === 'r') rot = (rot + 1) % 4; else if (k === 'q') view.spin(-0.3); else if (k === 'e') view.spin(0.3);
    else if (k === 'escape' && tool) { e.stopImmediatePropagation(); setTool(tool); } else if (k === ' ') { e.preventDefault(); $('th-pause').click(); }
  }, true);
  window.addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => held.clear());
  new ResizeObserver(() => { if (!mode.off && view) view.resize(); }).observe($('th-stage'));
}

// ---------------------------------------------------------------- the mode
const mode = {
  off: true,
  init(a, frame) { app = a; ui = frame; audio = a.audio; canvas = $('v-base'); },
  async enter(a) {
    args = a; mode.off = false;
    const sys = a.system, saved = app.siteLoad('base', sys.id), f = baseFaction(sys);
    let loaded = null; try { if (saved) loaded = new Sim({ state: saved }); } catch (err) { console.error(err); }
    sim = loaded || new Sim({ faction: f, diff: 'recruit', seed: 5000 + sys.id * 101 + (((app.camp.war && app.camp.war.seed) || 0) % 997) });
    sim.faction = { ...sim.faction, ...f };
    await ensureLogo(sim.faction.logo);
    if (!view) { view = new View(canvas); bind(); }
    life = new Life(sim); view.attach(sim, life);
    const hq = sim.b.find((b) => b.type === 'hq');
    view.lookAt(hq ? hq.x + hq.w / 2 : sim.N / 2, hq ? hq.z + hq.d / 2 : sim.N / 2);
    view.zoomT = view.zoom = 16;
    view.resize();
    acc = 0; tool = null; sel = 0; barSig = ''; deskSig = ''; thumbs = {}; saveT = 25; group = 'roads'; ui.speeds = [1, 2, 4];
    $('th-where').textContent = sim.faction.base;
    tabs(); bar(true); stats(); desk(); selBar();
    if (!loaded) { const gr = app.grant('b_grant'); if (gr) sim.supplies += gr; }
    if (!loaded) { ui.message('A NEW BASE', 2600); ui.feed('BASE: The command post is down. Draw a road from it, then zone along the road.', 'radio'); }
    else ui.feed(`BASE: Welcome back, Commander. Day ${Math.floor((sim.time || { day: 1 }).day)}.`, 'radio');
  },
  store() { if (sim && args) { try { app.siteSave('base', args.system.id, sim.save()); } catch (err) { console.error(err); } } },
  report() { const s = sim.stage || 0, r = sim.rates(), net = r.crNet + r.supNet; return { air: Math.min(5, sim.b.filter((b) => b.done && !b.off && SHOWS.has(b.type)).length), profit: sim.flow.days.length > 0 && net > 0, net, level: Math.min(4, s + 1), charter: C.STAGES[s].name, troops: sim.troops.length }; },
  leave() { mode.store(); mode.off = true; held.clear(); if (view) { view.setGhost(null); view.showLine(null); view.showPlots(null); } },
  frame(dt, now, real) {
    if (!sim) return;
    const fx = (held.has('d') || held.has('arrowright') ? 1 : 0) - (held.has('a') || held.has('arrowleft') ? 1 : 0), fz = (held.has('w') || held.has('arrowup') ? 1 : 0) - (held.has('s') || held.has('arrowdown') ? 1 : 0);
    if (fx || fz) view.move(fx, fz, real);
    if (dt > 0) {
      acc += dt * Sim.rate(); let n = 0;
      try { while (acc >= 0.1 && n++ < 40) { sim.step(0.1); acc -= 0.1; } } catch (err) { console.error(err); acc = 0; }
      if (n >= 40) acc = 0;
      for (const ev of sim.drain()) {
        life.event(ev);
        if (ev.t === 'say') ui.feed(`${String(ev.ch || 'base').toUpperCase()}: ${ev.text}`, 'radio');
        else if (ev.t === 'built') { audio.ready(); barSig = ''; }
        else if (ev.t === 'week') { audio.objective(); barSig = ''; }
        else if (ev.t === 'desk') audio.chirp();
        else if (ev.t === 'raidAlarm') { audio.siren(); ui.message('MOVEMENT AT THE WIRE', 3000); }
      }
      life.update(dt);
    }
    if (sim.time) view.setTime(sim.time.hour);
    if (!view.lost) view.frame(real);
    if ((hudT -= real) <= 0) { hudT = 0.3; bar(); stats(); desk(); }
    if ((saveT -= real) <= 0) { saveT = 25; mode.store(); }
  },
  // for the browser checks: put down the start of a base and run a few days
  fast() {
    const hq = sim.b.find((b) => b.type === 'hq'), [dx, dz] = sim.door(hq); let drew = false, zoned = null;
    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = sim.snapLine({ x: dx + 0.5, z: dz + 0.5 }, 'free', 'dirt'), b = sim.snapLine({ x: dx + 0.5 + ox * 12, z: dz + 0.5 + oz * 12 }, 'free', 'dirt', a);
      if (!sim.checkLine(a, b, 'dirt').ok) continue;
      drew = !!sim.drawLine(a, b, 'dirt'); zoned = sim.zoneFill(Math.floor(dx + ox * 6 + (oz ? 2 : 0)), Math.floor(dz + oz * 6 + (ox ? 2 : 0)), 'life'); break;
    }
    for (let i = 0; i < 4000; i++) sim.step(0.1);
    sim.drain();
    return { drew, zoned: !!(zoned && zoned.ok), buildings: sim.b.length, day: sim.time && sim.time.day };
  },
  get sim() { return sim; }, get view() { return view; },
};
export default mode;
