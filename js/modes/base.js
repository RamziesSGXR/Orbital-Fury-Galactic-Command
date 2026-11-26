// THE BASE: the base on a system's key world. The rules and the 3D are FOB Super Commander's (js/base); this file is how
// the commander meets them inside Galactic Command: one base for each system, roads, zones and buildings from the shared
// tool bar, requests on the shared desk, and its charter reported back to the map (the system pays more into the war).
import { C, B, GROUPS, GOODS, SUPPLY_MODES, SUPPLY_CAPS } from '../base/config.js';
import { makeGuide } from './guide.js';
import { Sim, LOOSE } from '../base/sim.js';
import { KIND } from '../base/slabs.js';     // (GC 0.87) foundations
import { Life } from '../base/life.js';
import { View } from '../base/view.js';
import { ensureLogo } from '../base/logo.js';
import { words } from '../core/words.js';
import { note } from '../core/career.js';
import { upgrade } from '../core/roster.js';
import { binds } from '../core/binds.js';
import { makeHud, LINES } from './base-hud.js';     // (GC 0.81) the standalone game's interface
import { war as warNow } from '../galaxy/screen.js';
const KB = binds('base');     // (GC 0.73) the player's own keys
// (0.46) what a base puts on air: every parade ground, speaker, billboard, banner, flag and monument standing is footage for the war's ratings
const SHOWS = new Set(['garden', 'fountain', 'park', 'parade', 'speaker', 'billboard', 'banner', 'hdbanner', 'flag', 'seflag', 'statue', 'monument', 'memorial', 'lecture', 'truth', 'plaque']);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const ROADS = LINES;     // (GC 0.81) the line tools: roads, walls and field works, with the standalone game's cards (base-hud.js)
// (GC 0.88) who is talking on the feed, by our own names (the codes are the Offices': operations, growth, publicity)
const CH = { def: 'OPERATIONS', pro: 'GROWTH', tru: 'PUBLICITY', bur: 'BUREAU', log: 'LOGISTICS', riv: 'RIVALS', base: 'BASE' };
const isSlabT = (t) => !!t && t.startsWith('slab:'), isRoad = (t) => !!ROADS[t];     // (GC 0.87) laying a foundation (the zones were here)

let app, ui, audio, canvas, view = null, sim = null, life = null, args = null;
let acc = 0, tool = null, rot = 0, sel = 0, hudT = 0, saveT = 25;
let roadDrag = null, slabDrag = null, slabLv = 0, drag = null, pinch = null; const ptrs = new Map(), held = new Set();
let hover = null, tut = null, zsel = null, hud = null;     // zsel: (GC 0.79) the zone picked, by key (GC 0.87: no zones; always null)
const TUT_KEY = 'ofgc.guide.base';

const baseFaction = (sys) => ({ ...structuredClone(app.faction), base: `Fort ${sys.worlds[sys.key].name}`, diff: 'recruit' });

// ---------------------------------------------------------------- the shared frame: the readouts, the build bar, the desk and the
// building card are FOB Commander's own now (base-hud.js); the frame keeps the top bar's name, MENU and TO THE MAP
const specOf = (k) => (sim.designable(k) ? { design: 0, parts: [] } : sim.hasStd(k) ? { std: sim.std } : null);
// (GC 0.82) the base report that was here (the charter, the standings, the layout, condition and defence) is the Offices'
// windows now: EXPANSION, STANDING, PUBLICITY and DEFENCE (base-offices.js)
// what a standing building is doing right now, as short labels: [text, tone] with tone 'g' good, 'r' trouble, '' plain
// (0.58) the standing supply order, on the command post's card: what each watch's dropship may buy, and the most it may spend
function supplyRow() {
  const P = sim.supplyPlan || { mode: 'needs', cap: 0.5 }, L = sim.bill;
  const bill = L ? (() => { const got = Object.keys(GOODS).filter((g) => L.order[g]).map((g) => `${L.order[g]} ${GOODS[g].short}`); return `<div class="kv"><span>LAST DELIVERY</span><b class="${L.capped ? 'warn' : ''}">day ${Math.floor((L.day - 1) * C.DAY / C.WEEK) + 1}, ${String(Math.floor(L.hour ?? 0)).padStart(2, '0')}:00 · ${got.length ? got.join(' · ') + ` · billed ${Math.round(L.cost)} SUP` : 'nothing bought'}${L.capped ? ' (capped)' : ''}</b></div>`; })() : '';
  return `<div class="so"><i>DROPSHIP BUYS</i>${Object.entries(SUPPLY_MODES).map(([k, m]) => `<button class="plate btn sm${P.mode === k ? ' on' : ''}" data-so="${k}" title="${esc(m.desc)}">${m.short}</button>`).join('')}</div>` +
    `<div class="so"><i>SPENDS AT MOST</i>${SUPPLY_CAPS.map((c) => `<button class="plate btn sm${P.cap === c ? ' on' : ''}" data-sc="${c}" title="${c >= 1 ? 'No cap: it may spend every supply the base has.' : `It never spends more than ${Math.round(c * 100)}% of the base's supplies in one morning.`}">${c >= 1 ? 'ALL' : Math.round(c * 100) + '%'}</button>`).join('')}</div>` + bill;
}
// (GC 0.64) the Missile Silo: its warheads, and shipping one to the front
function siloRow(b) {
  const S = C.SILO, n = b.nukes || 0;
  return `<div class="kv"><span>WARHEADS</span><b class="${n ? 'up' : ''}">${n} of ${S.max}${n < S.max ? ` · next ${Math.round((b.nukeT || 0) * 100)}%` : ''}</b></div><div class="so"><button class="plate btn sm" data-nk="${b.id}" ${n ? '' : 'disabled'} title="Credits and Operations standing; the warhead is no longer here for a raid.">SHIP ONE TO THE FRONT · +${S.cr} CR</button></div>`;
}
// ---------------------------------------------------------------- the guide: how a base is played (js/modes/guide.js)
const TUT = [
  { t: 'ROADS FIRST', x: 'Everything is built along a road. Pick <b>DIRT ROAD</b> below and drag from the command post across open ground.', done: () => sim.net.segs.some((g) => !['wall', 'wire', 'bags', 'trench'].includes(g.k)) },
  { t: 'LAY A FOUNDATION', x: 'Open <b>FOUNDATIONS</b>, pick a kind and drag on the ground beside your road. Anything better than a tent stands on a foundation of its kind; tents go on bare ground with their door on a road.', done: () => sim.slabs().length > 0 },
  { t: 'POWER, WATER, SEWAGE', x: 'Lay a <b>Utilities</b> foundation, then open <b>UTILITIES</b> and put a <b>Biofuel Generator</b> on it. It powers its foundation and every foundation a <b>paved road</b> joins to it (dirt roads carry nothing). Keep wells away from a sewage lagoon.', done: () => sim.b.some((b) => B[b.type].group === 'power') },
  { t: 'CHECK ON A BUILDING', x: 'With no tool in hand, tap any building: its card shows its crew, whether it has power, water and sewage, its condition and what is wrong with it. <b>CREW FIRST</b> staffs it before the rest; <b>REPAIR</b> puts a worn one back to 100%.', done: () => !!sel },
  { t: 'WHAT MATTERS', x: 'Keep morale up and the books in profit: troops need beds, food, water and power, and every charter you earn makes the base worth more. Drag to move, right-drag or Q and E to turn, wheel or pinch to zoom. <b>II</b> pauses and <b>1×</b> speeds time up. Requests land on your desk at the side: answer them or they are filed without you. A supply dropship lands every watch, six times a day, and bills you for what it brings: tap the command post to choose what it buys and how much it may spend.', last: true },
];
function setTool(t) {
  tool = tool === t ? null : t; sel = 0; zsel = null; view.select(null);
  view.setGhost(null); view.showLine(null); view.setSlabGhost(null); view.showPlots(tool && !isRoad(tool) && !isSlabT(tool) ? plotsFor(tool) : null);
  audio.click(); hud.buildBar(true); hud.selPanel(); hud.pointerTip(null); hud.slabCard(null);
}
// (GC 0.87) where a building could go: free tiles on foundations of its kind, and for a tent the roadsides too
function plotsFor(t) {
  const need = sim.slabNeed(t, specOf(t)), want = KIND[t], out = [], N = sim.N;
  if (!need && LOOSE.has(t)) return null;
  for (const sl of sim.slabs()) {
    if (want && sl.k !== want) continue; if (B[t].look && sl.k === 'ind') continue;
    for (let j = 0; j < sl.d; j++) for (let i = 0; i < sl.w; i++) { const x = sl.x + i, z = sl.z + j; if (!sim.occ[z * N + x] && !sim.roads[z * N + x]) out.push([x, z, 1]); }
  }
  if (!need && !LOOSE.has(t)) out.push(...sim.plotTiles());
  return out;
}
const clearSel = () => { sel = 0; zsel = null; view.select(null); hud.selPanel(); };
function demolish() { const b = sim.byId(sel), s0 = sim.supplies, r = sim.demolish(sel); if (r === false || (r && r.ok === false)) { audio.deny(); if (r && r.why) app.toast(r.why); } else { audio.baseDown(); if (b && sim.supplies > s0) hud.floatWorld(b.x + b.w / 2, b.z + b.d / 2, 1, `+${Math.round(sim.supplies - s0)} SUP`, 'up'); clearSel(); } }     // (GC 0.85: the refund rises off it)

// ---------------------------------------------------------------- pointing: roads, zones, buildings, the camera
const tileOf = (e) => { const p = view.pick(e.clientX, e.clientY); return [Math.floor(p.x), Math.floor(p.z)]; };
function tileAt(e) {
  const p = view.pick(e.clientX, e.clientY);
  if (!tool) return p;
  { const sp = specOf(tool), pl = sim.slabPlot(tool, p.x, p.z, rot, sp?.design || 0, sp); if (pl) return { ...p, tx: pl.tx, tz: pl.tz, rot: pl.rot }; }     // (GC 0.87) on a foundation: where the pointer is
  if (!LOOSE.has(tool)) { const pl = sim.plotFor(tool, p.x, p.z, 0); if (pl) return { ...p, tx: pl.tx, tz: pl.tz, rot: pl.rot }; }
  const d = B[tool], w = rot % 2 ? d.d : d.w, dd = rot % 2 ? d.w : d.d;
  return { ...p, tx: Math.round(p.x - w / 2), tz: Math.round(p.z - dd / 2), rot };
}
const lineEnd = (e) => { const p = view.pick(e.clientX, e.clientY); return sim.snapLine({ x: p.x, z: p.z }, e.shiftKey ? 'free' : hud.snap(), ROADS[tool].k || 'dirt', roadDrag); };   // SNAP on the ROADS tab (G); Shift draws free
// (GC 0.87) laying a foundation: from where the drag began (or the tile under the pointer) to the tile under it now
const slabNow = (e) => { const t = tileOf(e), a = slabDrag || t, k = tool.slice(5); return { k, c: sim.layCheck(a[0], a[1], t[0], t[1], k, slabLv) }; };
function slabHover(e) { const { k, c } = slabNow(e); view.setSlabGhost(c, slabLv, c.ok); hud.slabCard(c, k, slabLv, e.clientX, e.clientY); }
// (GC 0.78) a graphics driver can drop the 3D view, most often while the browser tab is in the background: the HUD keeps
// working over a black screen. The browser is asked for the view back; if it has not given it back in a few seconds, the
// view is built again on a fresh canvas, where it was looking. Coming back to the tab, the view is sized and checked again.
let lostT = 0;
function watchView() {
  view.onLost = (lost) => {
    clearTimeout(lostT);
    if (!lost) { view.resize(); view.r.shadowMap.needsUpdate = true; return; }
    if (!mode.off) ui.message('THE 3D VIEW DROPPED OUT · BRINGING IT BACK', 2600);
    lostT = setTimeout(() => { if (view.lost) rebuildView(); }, 3000);
  };
}
function rebuildView() {
  const old = view, fresh = canvas.cloneNode(false);     // the same id and classes; no context yet
  canvas.replaceWith(fresh); canvas = fresh;
  view = new View(canvas); bind(true); watchView();
  view.setQuality(app.settings.quality || 'auto');
  if (sim) { view.attach(sim, life); view.target.copy(old.target); view.zoom = view.zoomT = old.zoomT; view.yaw = view.yawT = old.yawT; view.resize(); }
  try { old.r.dispose(); } catch { /* the old context is gone already */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !view || mode.off) return;
  const gl = view.r.getContext();
  if (gl && gl.isContextLost && gl.isContextLost() && !view.lost) { view.lost = true; view.onLost(true); }     // a loss the page was not told about
  else if (!view.lost) { view.resize(); view.r.shadowMap.needsUpdate = true; }
});
function bind(canvasOnly = false) {     // (GC 0.78: canvasOnly, for a view built again on a fresh canvas)
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (mode.off) return;
    canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x) }; drag = null; roadDrag = null; slabDrag = null; view.showLine(null); return; }
    if (isSlabT(tool) && e.button === 0) { slabDrag = tileOf(e); drag = null; slabHover(e); return; }
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
    if (isSlabT(tool) && !drag?.moved) { slabHover(e); return; }
    if (roadDrag && !roadDrag.bull) { const end = lineEnd(e), c = sim.checkLine(roadDrag, end, ROADS[tool].k); view.showLine(roadDrag, end, ROADS[tool].k === 'paved' ? 2 : 1, c.ok, ['wall', 'wire', 'bags', 'trench'].includes(ROADS[tool].k)); hud.pointerTip(!c.ok && c.why && c.why !== 'Too short' ? c.why : null, e.clientX, e.clientY); return; }
    if (tool && !isRoad(tool) && !isSlabT(tool)) { const t = tileAt(e), sp = specOf(tool), c = sim.canPlace(tool, t.tx, t.tz, t.rot, sp); view.setGhost(tool, t.tx, t.tz, t.rot, c.ok, sp); hud.placeCard(tool, c, e.clientX, e.clientY, { x: t.tx, z: t.tz, rot: t.rot }); }     // (GC 0.84) and why not, at the pointer; (GC 0.86) on a blueprint's label
    else hud.pointerTip(null);
  });
  const up = (e) => {
    if (mode.off) return;
    ptrs.delete(e.pointerId);
    if (slabDrag) {     // (GC 0.87) lay it
      const { k, c } = slabNow(e); slabDrag = null;
      if (!c.ok) { audio.deny(); app.toast(c.why || 'It cannot go there.'); slabHover(e); return; }
      const sl = sim.lay(c.x, c.z, c.x + c.w - 1, c.z + c.d - 1, k, slabLv); audio.podLand(); hud.buildBar();
      if (sl) hud.floatWorld(sl.x + sl.w / 2, sl.z + sl.d / 2, 0.5, `−${sl.cost} SUP`, 'down');
      slabHover(e); return;
    }
    if (roadDrag) {
      let ok;
      if (tool === 'unroad') { const p = view.pick(e.clientX, e.clientY); ok = sim.removeLine(p.x, p.z); }
      else { const end = lineEnd(e), c = sim.checkLine(roadDrag, end, ROADS[tool].k); ok = c.ok && sim.drawLine(roadDrag, end, ROADS[tool].k); if (!ok && c.why && c.why !== 'Too short') app.toast(c.why); }
      roadDrag = null; view.showLine(null); if (ok) audio.podLand(); else audio.deny(); hud.buildBar(); return;
    }
    if (pinch) { if (ptrs.size < 2) pinch = null; drag = null; return; }
    const d = drag; drag = null; if (!d || d.moved) return;
    if (d.btn === 2) { if (tool) setTool(tool); else clearSel(); return; }
    if (tool) {
      const t = tileAt(e), sp = specOf(tool), ok = sim.canPlace(tool, t.tx, t.tz, t.rot, sp);
      if (!ok.ok) { audio.deny(); app.toast(ok.why || 'It cannot go there.'); return; }
      const s0 = sim.supplies, nb = sim.place(tool, t.tx, t.tz, t.rot, false, sp); audio.podLand(); hud.buildBar();
      if (nb && sim.supplies < s0) hud.floatWorld(nb.x + nb.w / 2, nb.z + nb.d / 2, 1, `−${Math.round(s0 - sim.supplies)} SUP`, 'down');     // (GC 0.85) what it cost, where it went
      if (!LOOSE.has(tool) && !e.shiftKey) setTool(tool);
      return;
    }
    const p = view.pick(e.clientX, e.clientY); sel = p.bid || 0; view.select(sel ? sim.byId(sel) : null);
    zsel = null;
    if (sel) audio.click(); hud.selPanel();
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointerleave', () => { if (hud) { hud.pointerTip(null); hud.slabCard(null); } if (view && !slabDrag) view.setSlabGhost(null); });     // (GC 0.84)
  canvas.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; pinch = null; roadDrag = null; slabDrag = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); view.zoomBy(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
  if (canvasOnly) return;
  window.addEventListener('keydown', (e) => {
    if (mode.off || e.target.tagName === 'INPUT') return;
    held.add(e.code); const a = KB.actionOf(e.code);     // (GC 0.73) the player's own keys (js/core/binds.js)
    if (a === 'rotate') rot = (rot + 1) % 4; else if (a === 'turnLeft') view.spin(-0.3); else if (a === 'turnRight') view.spin(0.3);
    else if (e.code === 'Escape' && hud && hud.offices() && hud.offices().isOpen()) { e.stopImmediatePropagation(); hud.offices().close(); }     // (GC 0.82)
    else if (e.code === 'Escape' && tool) { e.stopImmediatePropagation(); setTool(tool); } else if (a === 'pause') { e.preventDefault(); $('th-pause').click(); }
    else if (a === 'offices') hud.offices().toggle(); else if (a === 'snap') hud.cycleSnap(); else if (a === 'slower' || a === 'faster') { const b = document.querySelector(`#fob [data-fb="${a === 'slower' ? 'slow' : 'fast'}"]`); if (b) b.click(); }     // (GC 0.81)
  }, true);
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  new ResizeObserver(() => { if (!mode.off && view) view.resize(); }).observe($('th-stage'));
}

// (GC 0.83) what the war takes from this base as it stands, for the Offices' OVERVIEW: the charter (its level multiplies
// the troops, credits and defence), profit (ratings and credits wait for it) and what it puts on air; and in a campaign,
// the round's list itself (the same one the frame shows under the top bar)
function forWar() {
  const r = mode.report(); let gives = null;
  try { const g = warNow(); if (g && !app.camp.solo && args && args.system) gives = g.postGives(args.system.id, 'base', Math.max(1, Math.min(r.level || 1, (args.system.base || 0) + 1)), !!r.profit, r.air || 0); } catch { gives = null; }
  return { ...r, gives };
}

// ---------------------------------------------------------------- the mode
const mode = {
  off: true,
  init(a, frame) { app = a; ui = frame; audio = a.audio; canvas = $('v-base'); },
  settings(s) { if (view) view.setQuality(s.quality || 'auto'); },     // (GC 0.75) OPTIONS changed while the post is open
  async enter(a) {
    args = a; mode.off = false;
    const sys = a.system, saved = app.siteLoad('base', sys.id), f = baseFaction(sys);
    let loaded = null; try { if (saved) loaded = new Sim({ state: saved }); } catch (err) { console.error(err); }
    sim = loaded || new Sim({ faction: f, diff: 'recruit', seed: 5000 + sys.id * 101 + (((app.camp.war && app.camp.war.seed) || 0) % 997) });
    if (!loaded && !app.tutorial) { const n = upgrade('seed'); sim.credits += n * 200; sim.supplies += n * 600; }     // (GC 0.69) the STORE's seed money
    sim.faction = { ...sim.faction, ...f };
    await ensureLogo(sim.faction.logo);
    if (!view) { view = new View(canvas); bind(); watchView(); }
    view.setQuality(app.settings.quality || 'auto');     // (GC 0.75) GRAPHICS, in OPTIONS
    life = new Life(sim); view.attach(sim, life);
    const hq = sim.b.find((b) => b.type === 'hq');
    view.lookAt(hq ? hq.x + hq.w / 2 : sim.N / 2, hq ? hq.z + hq.d / 2 : sim.N / 2);
    view.zoomT = view.zoom = 16;
    view.resize();
    acc = 0; tool = null; sel = 0; zsel = null; hover = null; saveT = 25; ui.speeds = [1, 2, 4];
    if (!hud) { hud = makeHud({ app, ui, audio, sim: () => sim, view: () => view, tool: () => tool, setTool, sel: () => sel, zsel: () => zsel, clearSel, demolish, specOf, supplyRow, siloRow, slabLv: () => slabLv, setSlabLv: (k) => { slabLv = k; }, war: forWar, select: (id) => { sel = id; zsel = null; view.select(sim.byId(id)); audio.click(); hud.selPanel(); }, toast: (t) => app.toast(t) }); hud.mount(); }
    hud.show(true);
    tut = app.tutorial ? makeGuide(TUT, { key: TUT_KEY, tutorial: app.tutorial, words, audio, exit: () => app.leavePost() }) : null;     // (GC 0.81) outside the tutorial, the task board's ORDERS teach the base
    $('th-where').textContent = sim.faction.base;
    hud.reset(); if (tut) tut.tick(); else { const co = $('th-coach'); if (co) co.hidden = true; }
    if (!loaded) { const gr = app.grant('b_grant'); if (gr) sim.supplies += gr; }
    if (!loaded) { ui.message('A NEW BASE', 2600); ui.feed('BASE: The command post is down. Draw a road from it, put the groundwork up along it as tents, then lay foundations (FOUNDATIONS) for anything better.', 'radio'); }
    else ui.feed(`BASE: Welcome back, Commander. Day ${(sim.time && sim.time.cday) || 1}.`, 'radio');     // (GC 0.79: the day the top bar shows)
  },
  store() { if (sim && args) { try { app.siteSave('base', args.system.id, sim.save()); } catch (err) { console.error(err); } } },
  report() { const s = sim.stage || 0, r = sim.rates(), net = r.crNet + r.supNet; return { air: Math.min(5, sim.b.filter((b) => b.done && !b.off && SHOWS.has(b.type)).length), profit: sim.flow.days.length > 0 && net > 0, net, level: Math.min(4, s + 1), charter: C.STAGES[s].name, troops: sim.troops.length }; },
  leave() { mode.store(); mode.off = true; held.clear(); if (hud) hud.show(false); if (tut) tut.hide(); tut = null; if (view) { view.setGhost(null); view.showLine(null); view.showPlots(null); view.setSlabGhost(null); } },
  frame(dt, now, real) {
    if (!sim) return;
    const fx = (KB.held('panRight', held) ? 1 : 0) - (KB.held('panLeft', held) ? 1 : 0), fz = (KB.held('panUp', held) ? 1 : 0) - (KB.held('panDown', held) ? 1 : 0);
    if (fx || fz) view.move(fx, fz, real);
    if (dt > 0) {
      acc += dt * Sim.rate(); let n = 0;
      try { while (acc >= 0.1 && n++ < 40) { sim.step(0.1); acc -= 0.1; } } catch (err) { console.error(err); acc = 0; }
      if (n >= 40) acc = 0;
      for (const ev of sim.drain()) {
        life.event(ev);
        if (ev.t === 'say') ui.feed(`${CH[ev.ch] || String(ev.ch || 'base').toUpperCase()}: ${ev.text}`, 'radio');
        else if (ev.t === 'built') { audio.ready(); hud.buildBar(); const b = sim.b.find((o) => o.id === ev.id); if (b && !ev.refit) note(app.tutorial ? {} : { built: 1 }, [['building', b.type]]); }
        else if (ev.t === 'week') { audio.objective(); hud.buildBar(); if (!app.tutorial) note({ baseDays: 1, baseFirst: ev.rank === 0 ? 1 : 0, baseReview: ev.review || 0 }); }
        else if (ev.t === 'desk') audio.chirp();
        else if (ev.t === 'cash') hud.cash(ev);     // (GC 0.85) money made, rising off where it was made
        else if (ev.t === 'milestone') { audio.objective(); ui.message('MILESTONE', 2400); hud.buildBar(true); }     // (GC 0.84)
        else if (ev.t === 'raidAlarm') { audio.siren(); ui.message('MOVEMENT AT THE WIRE', 3000); }
      }
      life.update(dt);
    }
    if (sim.time) view.setTime(sim.time.hour);
    if (!view.lost) view.frame(real);
    hud.layout(real);
    if ((hudT -= real) <= 0) { hudT = 0.3; hud.tick(); if (tut) tut.tick(); }
    if ((saveT -= real) <= 0) { saveT = 25; mode.store(); }
  },
  // for the browser checks: put down the start of a base and run a few days
  fast() {
    const hq = sim.b.find((b) => b.type === 'hq'), [dx, dz] = sim.door(hq); let drew = false, zoned = null;
    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = sim.snapLine({ x: dx + 0.5, z: dz + 0.5 }, 'free', 'dirt'), b = sim.snapLine({ x: dx + 0.5 + ox * 12, z: dz + 0.5 + oz * 12 }, 'free', 'dirt', a);
      if (!sim.checkLine(a, b, 'dirt').ok) continue;
      drew = !!sim.drawLine(a, b, 'dirt');
      // (GC 0.87) a Living foundation along it, the side away from the command post
      const sx = ox ? Math.floor(dx + ox * 3) : Math.floor(dx - 3), sz = oz ? Math.floor(dz + oz * 3) : Math.floor(dz + 1);
      zoned = sim.lay(sx, sz, sx + (ox ? ox * 7 : 6), sz + (oz ? oz * 7 : 4), 'life', 0, true); break;
    }
    for (let i = 0; i < 4000; i++) sim.step(0.1);
    sim.drain();
    return { drew, laid: !!zoned, buildings: sim.b.length, day: sim.time && sim.time.day };
  },
  get sim() { return sim; }, get view() { return view; },
};
export default mode;
