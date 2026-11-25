// THE BASE: the base on a system's key world. The rules and the 3D are FOB Super Commander's (js/base); this file is how
// the commander meets them inside Galactic Command: one base for each system, roads, zones and buildings from the shared
// tool bar, requests on the shared desk, and its charter reported back to the map (the system pays more into the war).
import { C, B, GROUPS, ZONES, GOODS, SUPPLY_MODES, SUPPLY_CAPS, MIN } from '../base/config.js';
import { modal } from '../galaxy/screen.js';
import { makeGuide } from './guide.js';
import { Sim, LOOSE } from '../base/sim.js';
import { Life } from '../base/life.js';
import { View } from '../base/view.js';
import { ensureLogo } from '../base/logo.js';
import { words } from '../core/words.js';
import { note } from '../core/career.js';
import { upgrade } from '../core/roster.js';
import { binds } from '../core/binds.js';
import { makeHud, LINES, CONDITION } from './base-hud.js';     // (GC 0.81) the standalone game's interface
const KB = binds('base');     // (GC 0.73) the player's own keys
// (0.46) what a base puts on air: every parade ground, speaker, billboard, banner, flag and monument standing is footage for the war's ratings
const SHOWS = new Set(['parade', 'speaker', 'billboard', 'banner', 'hdbanner', 'flag', 'seflag', 'statue', 'monument', 'memorial', 'lecture', 'truth', 'plaque']);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const ROADS = LINES;     // (GC 0.81) the line tools: roads, walls and field works, with the standalone game's cards (base-hud.js)
const isZone = (t) => !!t && t.startsWith('zone:'), isRoad = (t) => !!ROADS[t];

let app, ui, audio, canvas, view = null, sim = null, life = null, args = null;
let acc = 0, tool = null, rot = 0, sel = 0, hudT = 0, saveT = 25;
let roadDrag = null, zoneDrag = null, drag = null, pinch = null; const ptrs = new Map(), held = new Set();
let hover = null, tut = null, zsel = null, hud = null;     // zsel: (GC 0.79) the zone picked, by key
const TUT_KEY = 'ofgc.guide.base';

const baseFaction = (sys) => ({ ...structuredClone(app.faction), base: `Fort ${sys.worlds[sys.key].name}`, diff: 'recruit' });

// ---------------------------------------------------------------- the shared frame: the readouts, the build bar, the desk and the
// building card are FOB Commander's own now (base-hud.js); the frame keeps the top bar's name, MENU and TO THE MAP
const specOf = (k) => (sim.designable(k) ? { design: 0, parts: [] } : sim.hasStd(k) ? { std: sim.std } : null);
const ord = (n) => n + (n % 10 === 1 && n % 100 !== 11 ? 'ST' : n % 10 === 2 && n % 100 !== 12 ? 'ND' : n % 10 === 3 && n % 100 !== 13 ? 'RD' : 'TH');
// (0.63) THE BASE REPORT: the numbers behind the base that had no place on screen. The charter's terms, the three standings
// and where they put you against the other outfits (which sets the weekly allocation), and how defensible the base is.
// Opened from STANDING or CHARTER at the top
function report() {
  const S = C.STAGES, st = sim.stage || 0, nx = S[st + 1], ck = sim.stageCheck() || [], tick = (ok) => `<span class="${ok ? 'y' : 'n'}">${ok ? '✓' : '✗'}</span>`;
  const rank = sim.ranking(), rows = sim.table(), alloc = (r) => Math.round(C.ALLOC.base * C.ALLOC.mult[Math.min(r, C.ALLOC.mult.length - 1)] * (1 + (S[st].alloc || 0)));
  const f = sim.fort || sim.fortify(), pct = (x) => `${Math.round(x * 100)}%`, A = sim.audit, I = sim.inspection;
  let h = `<div class="brep"><h2>Base report</h2>`;
  h += `<h3>CHARTER · ${esc((S[st].short || S[st].name).toUpperCase())}${nx ? ` → ${esc((nx.short || nx.name).toUpperCase())}` : ''}</h3>`;
  h += nx ? `<p class="dim">The Bureau grants the next charter by itself as soon as every term is met, and takes its fee then. It brings more land, a bigger weekly allocation and new buildings.</p><ul class="ck">${ck.map((c) => `<li>${tick(c.ok)} ${esc(c.text)}</li>`).join('')}</ul>`
    : `<p class="dim">The highest charter there is.</p>`;
  h += `<h3>STANDING · ${ord(rank + 1)} OF ${rows.length}</h3><p class="dim">The Head Office ranks every outfit by its three standings added up. Your place sets the allocation paid each day: ${alloc(rank)} supplies now${rank > 0 ? `, ${alloc(rank - 1)} one place up` : ''}. Standings drift back toward ${C.STAND.rest} each day, so they have to be kept up.</p>`;
  for (const m of ['def', 'pro', 'tru']) { const v = Math.round(sim.stand[m]); h += `<div class="sb"><b>${MIN[m].short}</b><i><u style="width:${v}%"></u></i><span>${v}</span></div><p class="sm2 dim" style="margin:0 0 4px">${esc(MIN[m].name)}: ${esc(MIN[m].wants)}</p>`; }
  h += `<table><tr><th>Outfit</th><th>DEF</th><th>EXP</th><th>PUB</th><th>ALL</th></tr>${rows.map((r) => `<tr class="${r.me ? 'me' : ''}"><td>${esc(r.name)}</td>${['def', 'pro', 'tru'].map((m) => `<td>${Math.round(r.stand[m])}</td>`).join('')}<td>${sim.total(r.stand)}</td></tr>`).join('')}</table>`;
  if (A || I) h += `<p class="sm2">${A ? `Last supply audit (day ${A.week}): <b>${A.score}</b>/100 · supply lines ${A.lines}, food ${A.food}, housing ${A.housing}, growth ${A.growth}. ` : ''}${I ? `Last inspection (day ${I.week}): <b>${I.score}</b>/100 · morale ${I.morale}, propaganda ${I.prop}, upkeep ${I.cond}.` : ''}</p>`;
  const W = sim.walks(), R = C.TIDY, mm = (m) => m == null ? '—' : `${m} m`;   // (0.68) the layout
  h += `<h3>LAYOUT · ${W.all == null ? 'NOTHING TO WALK TO YET' : W.all < 5 ? 'ALL UNDER ONE ROOF' : `${W.all} M ON AVERAGE`}</h3><p class="dim">How far troopers walk, on the routes they take, from their bunks. The daily efficiency review wants ${R.walk} m or less on average: put bunks near the mess, the latrines and the work.</p>`;
  h += `<ul class="ck"><li>${tick((W.work ?? 0) <= R.walk)} To work: ${mm(W.work)}${W.far ? ` · longest: ${esc(W.far.name)}, ${W.far.m} m` : ''}</li><li>${tick((W.mess ?? 0) <= R.walk)} To the mess: ${mm(W.mess)}</li><li>${tick((W.latrine ?? 0) <= R.walk)} To a latrine: ${mm(W.latrine)}</li></ul>`;
  { // (GC 0.78) condition, explained: what wears a building, what mends it, what a worn one costs
    const bs = sim.b.filter((b) => b.done && b.type !== 'hq'), avg = bs.length ? Math.round(bs.reduce((a, b) => a + b.cond, 0) / bs.length) : 100;
    const low = bs.filter((b) => b.cond < 70), worst = [...low].sort((p, q) => p.cond - q.cond).slice(0, 3), short = bs.filter((b) => (b.unpaid || 0) >= 2).length;
    h += `<h3>CONDITION · ${avg}% ON AVERAGE</h3><p class="dim">${esc(CONDITION)} Tents wear faster than upkeep mends them; prefabs and permanent buildings do not.</p>`;
    h += `<ul class="ck"><li>${tick(!low.length)} Buildings under 70%: ${low.length}${worst.length ? ` · ${worst.map((b) => `${esc(B[b.type].name)} ${Math.round(b.cond)}%`).join(', ')}` : ''}</li><li>${tick(!short)} Upkeep paid on every building today${short ? `: ${short} missed it (keep supplies in hand)` : ''}</li></ul>`;
  }
  h += `<h3>DEFENCE · ${f.closed ? `${f.score}/100` : 'NO CLOSED WALL'}</h3>`;
  h += `<ul class="ck"><li>${tick(f.closed)} A wall all the way round, with a gate${f.closed ? '' : ' (until it closes, the base scores 0 and raiders walk in)'}</li>`;
  if (f.closed) h += `<li>${tick(f.cover >= 0.9)} Wall watched by a lookout or tower: ${pct(f.cover)}</li>
    <li>${tick(f.armed >= 0.5)} Wall covered by guns with ammunition: ${pct(f.armed)}</li>
    <li>${tick(!f.gates || f.manned >= f.gates)} Gates with a guard: ${f.manned} of ${f.gates}</li>
    <li>${tick(f.entr >= 1)} Two gates or fewer: ${f.gates}</li>
    <li>${tick(f.depth >= 0.8)} Command post and fuel kept well back from the wall: ${pct(f.depth)}</li>`;
  h += `</ul>`;
  h += `<p class="dim sm2">Each day the perimeter review turns this score into Defence standing: above 45 gains it, below loses it. Patrols that come back win it too.</p>`;
  modal(h + '</div><button class="plate btn go" data-x="close" style="margin-top:10px;position:sticky;bottom:0">CLOSE</button>');
  $('modal').querySelector('[data-x=close]').onclick = () => { $('modal').hidden = true; audio.click(); };
}
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
  return `<div class="kv"><span>WARHEADS</span><b class="${n ? 'up' : ''}">${n} of ${S.max}${n < S.max ? ` · next ${Math.round((b.nukeT || 0) * 100)}%` : ''}</b></div><div class="so"><button class="plate btn sm" data-nk="${b.id}" ${n ? '' : 'disabled'} title="Credits and Defence standing; the warhead is no longer here for a raid.">SHIP ONE TO THE FRONT · +${S.cr} CR</button></div>`;
}
// (GC 0.79) A zone's card: how much of it is painted and, for the zones that grow by themselves, what is going up there or why
// nothing is (the reason the simulation keeps in growNote), with what the base is short of.
const ZWANT = { life: ['bunks', 'seats', 'latrines'], logi: ['storage'], comm: ['shops'] };
const DNAME = { bunks: 'bunks', seats: 'mess seats', latrines: 'latrines', storage: 'storage', shops: 'shops' };
function zoneCard(zk) {
  const z = ZONES[zk], n = sim.zoneCount(zk), grows = !!ZWANT[zk];
  let st = n ? `${n} tiles painted` : 'None painted yet', tone = n ? 'ok' : 'warn';
  if (grows) {
    const note = (sim.growNote || {})[zk] || (n ? 'waiting for the next hour' : 'no zone painted');
    const up = sim.b.find((b) => b.grown === zk && !b.done);
    if (note === 'building') st = up ? `A ${B[up.type].name} is going up` : 'Growing';
    else if (note === 'nothing needed') st = 'Nothing needed now: it grows when the base runs short';
    else { st = note.charAt(0).toUpperCase() + note.slice(1); tone = 'warn'; }
  }
  const d = sim.dem || {}, short = grows ? ZWANT[zk].filter((k) => d[k] > 0).map((k) => `${DNAME[k]} ${d[k]}`).join(', ') : '';
  return `<div class="fph"><span style="color:${z.col}">${esc(z.name.toUpperCase())}</span><button class="fx" data-fb="close" aria-label="Close">×</button></div><div class="sp-status ${tone}">${esc(st)}</div><div class="sp-body"><div class="kv"><span>PAINTED</span><b>${n} tiles</b></div>`
    + `${short ? `<div class="kv"><span>THE BASE NEEDS</span><b class="warn">${esc(short)}</b></div>` : ''}<p>${esc(words(z.desc))}</p></div>`;
}
// ---------------------------------------------------------------- the guide: how a base is played (js/modes/guide.js)
const TUT = [
  { t: 'ROADS FIRST', x: 'Everything is built along a road. Pick <b>DIRT ROAD</b> below and drag from the command post across open ground.', done: () => sim.net.segs.some((g) => !['wall', 'wire', 'bags', 'trench'].includes(g.k)) },
  { t: 'ZONE THE ROADSIDE', x: 'Open <b>ZONES</b>, pick <b>Life Support</b> and tap beside your road. Bunks, mess halls and latrines grow there by themselves as the base needs them.', done: () => sim.zone.some((v) => v) },
  { t: 'POWER, WATER, SEWAGE', x: 'Open <b>UTILITIES</b> and place a <b>Biofuel Generator</b> by the road. Each utility covers a circle round it: keep the bunks inside, and keep wells away from a sewage lagoon.', done: () => sim.b.some((b) => B[b.type].group === 'power') },
  { t: 'CHECK ON A BUILDING', x: 'With no tool in hand, tap any building: its card shows its crew, whether it has power, water and sewage, its condition and what is wrong with it. <b>CREW FIRST</b> staffs it before the rest; <b>REPAIR</b> puts a worn one back to 100%.', done: () => !!sel },
  { t: 'WHAT MATTERS', x: 'Keep morale up and the books in profit: troops need beds, food, water and power, and every charter you earn makes the base worth more. Drag to move, right-drag or Q and E to turn, wheel or pinch to zoom. <b>II</b> pauses and <b>1×</b> speeds time up. Requests land on your desk at the side: answer them or they are filed without you. A supply dropship lands every watch, six times a day, and bills you for what it brings: tap the command post to choose what it buys and how much it may spend.', last: true },
];
function setTool(t) {
  tool = tool === t ? null : t; sel = 0; zsel = null; view.select(null);
  view.setGhost(null); view.showLine(null); view.showPlots(isZone(tool) || (tool && !isRoad(tool) && !LOOSE.has(tool)) ? sim.plotTiles() : null);
  audio.click(); hud.buildBar(true); hud.selPanel();
}
const clearSel = () => { sel = 0; zsel = null; view.select(null); hud.selPanel(); };
function demolish() { const r = sim.demolish(sel); if (r === false || (r && r.ok === false)) { audio.deny(); if (r && r.why) app.toast(r.why); } else { audio.baseDown(); clearSel(); } }

// ---------------------------------------------------------------- pointing: roads, zones, buildings, the camera
const tileOf = (e) => { const p = view.pick(e.clientX, e.clientY); return [Math.floor(p.x), Math.floor(p.z)]; };
function tileAt(e) {
  const p = view.pick(e.clientX, e.clientY);
  if (!tool) return p;
  if (!LOOSE.has(tool)) { const pl = sim.plotFor(tool, p.x, p.z, 0); if (pl) return { ...p, tx: pl.tx, tz: pl.tz, rot: pl.rot }; }
  const d = B[tool], w = rot % 2 ? d.d : d.w, dd = rot % 2 ? d.w : d.d;
  return { ...p, tx: Math.round(p.x - w / 2), tz: Math.round(p.z - dd / 2), rot };
}
const lineEnd = (e) => { const p = view.pick(e.clientX, e.clientY); return sim.snapLine({ x: p.x, z: p.z }, e.shiftKey ? 'free' : hud.snap(), ROADS[tool].k || 'dirt', roadDrag); };   // SNAP on the ROADS tab (G); Shift draws free
const zoneRect = (a, b) => { const out = []; for (let z = Math.min(a[1], b[1]); z <= Math.max(a[1], b[1]); z++) for (let x = Math.min(a[0], b[0]); x <= Math.max(a[0], b[0]); x++) out.push([x, z, 1]); return out; };
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
    if (roadDrag && !roadDrag.bull) { const end = lineEnd(e), c = sim.checkLine(roadDrag, end, ROADS[tool].k); view.showLine(roadDrag, end, ROADS[tool].k === 'paved' ? 2 : 1, c.ok, ['wall', 'wire', 'bags', 'trench'].includes(ROADS[tool].k)); return; }
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
      roadDrag = null; view.showLine(null); if (ok) audio.podLand(); else audio.deny(); hud.buildBar(); return;
    }
    if (pinch) { if (ptrs.size < 2) pinch = null; drag = null; return; }
    const d = drag; drag = null; if (!d || d.moved) return;
    if (d.btn === 2) { if (tool) setTool(tool); else clearSel(); return; }
    if (tool) {
      const t = tileAt(e), sp = specOf(tool), ok = sim.canPlace(tool, t.tx, t.tz, t.rot, sp);
      if (!ok.ok) { audio.deny(); app.toast(ok.why || 'It cannot go there.'); return; }
      sim.place(tool, t.tx, t.tz, t.rot, false, sp); audio.podLand(); hud.buildBar();
      if (!LOOSE.has(tool) && !e.shiftKey) setTool(tool);
      return;
    }
    const p = view.pick(e.clientX, e.clientY); sel = p.bid || 0; view.select(sel ? sim.byId(sel) : null);
    zsel = sel ? null : sim.zoneKey(sim.zoneAt(Math.floor(p.x), Math.floor(p.z)));     // (GC 0.79) open ground in a zone: the zone's card
    if (sel || zsel) audio.click(); hud.selPanel();
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; pinch = null; roadDrag = null; zoneDrag = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); view.zoomBy(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
  if (canvasOnly) return;
  window.addEventListener('keydown', (e) => {
    if (mode.off || e.target.tagName === 'INPUT') return;
    held.add(e.code); const a = KB.actionOf(e.code);     // (GC 0.73) the player's own keys (js/core/binds.js)
    if (a === 'rotate') rot = (rot + 1) % 4; else if (a === 'turnLeft') view.spin(-0.3); else if (a === 'turnRight') view.spin(0.3);
    else if (e.code === 'Escape' && tool) { e.stopImmediatePropagation(); setTool(tool); } else if (a === 'pause') { e.preventDefault(); $('th-pause').click(); }
    else if (a === 'snap') hud.cycleSnap(); else if (a === 'slower' || a === 'faster') { const b = document.querySelector(`#fob [data-fb="${a === 'slower' ? 'slow' : 'fast'}"]`); if (b) b.click(); }     // (GC 0.81)
  }, true);
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  new ResizeObserver(() => { if (!mode.off && view) view.resize(); }).observe($('th-stage'));
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
    if (!hud) { hud = makeHud({ app, ui, audio, sim: () => sim, view: () => view, tool: () => tool, setTool, sel: () => sel, zsel: () => zsel, clearSel, demolish, specOf, supplyRow, siloRow, zoneCard, report, toast: (t) => app.toast(t) }); hud.mount(); }
    hud.show(true);
    tut = app.tutorial ? makeGuide(TUT, { key: TUT_KEY, tutorial: app.tutorial, words, audio, exit: () => app.leavePost() }) : null;     // (GC 0.81) outside the tutorial, the task board's ORDERS teach the base
    $('th-where').textContent = sim.faction.base;
    hud.reset(); if (tut) tut.tick(); else { const co = $('th-coach'); if (co) co.hidden = true; }
    if (!loaded) { const gr = app.grant('b_grant'); if (gr) sim.supplies += gr; }
    if (!loaded) { ui.message('A NEW BASE', 2600); ui.feed('BASE: The command post is down. Draw a road from it, then zone along the road.', 'radio'); }
    else ui.feed(`BASE: Welcome back, Commander. Day ${(sim.time && sim.time.cday) || 1}.`, 'radio');     // (GC 0.79: the day the top bar shows)
  },
  store() { if (sim && args) { try { app.siteSave('base', args.system.id, sim.save()); } catch (err) { console.error(err); } } },
  report() { const s = sim.stage || 0, r = sim.rates(), net = r.crNet + r.supNet; return { air: Math.min(5, sim.b.filter((b) => b.done && !b.off && SHOWS.has(b.type)).length), profit: sim.flow.days.length > 0 && net > 0, net, level: Math.min(4, s + 1), charter: C.STAGES[s].name, troops: sim.troops.length }; },
  leave() { mode.store(); mode.off = true; held.clear(); if (hud) hud.show(false); if (tut) tut.hide(); tut = null; if (view) { view.setGhost(null); view.showLine(null); view.showPlots(null); } },
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
        if (ev.t === 'say') ui.feed(`${String(ev.ch || 'base').toUpperCase()}: ${ev.text}`, 'radio');
        else if (ev.t === 'built') { audio.ready(); hud.buildBar(); const b = sim.b.find((o) => o.id === ev.id); if (b && !ev.refit) note(app.tutorial ? {} : { built: 1 }, [['building', b.type]]); }
        else if (ev.t === 'week') { audio.objective(); hud.buildBar(); if (!app.tutorial) note({ baseDays: 1, baseFirst: ev.rank === 0 ? 1 : 0, baseReview: ev.review || 0 }); }
        else if (ev.t === 'desk') audio.chirp();
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
      drew = !!sim.drawLine(a, b, 'dirt'); zoned = sim.zoneFill(Math.floor(dx + ox * 6 + (oz ? 2 : 0)), Math.floor(dz + oz * 6 + (ox ? 2 : 0)), 'life'); break;
    }
    for (let i = 0; i < 4000; i++) sim.step(0.1);
    sim.drain();
    return { drew, zoned: !!(zoned && zoned.ok), buildings: sim.b.length, day: sim.time && sim.time.day };
  },
  get sim() { return sim; }, get view() { return view; },
};
export default mode;
