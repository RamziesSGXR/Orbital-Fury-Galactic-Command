// THE BASE: the base on a system's key world. The rules and the 3D are FOB Super Commander's (js/base); this file is how
// the commander meets them inside Galactic Command: one base for each system, roads, zones and buildings from the shared
// tool bar, requests on the shared desk, and its charter reported back to the map (the system pays more into the war).
import { C, B, GROUPS, ZONES, GOODS, SUPPLY_MODES, SUPPLY_CAPS, MIN } from '../base/config.js';
import { modal } from '../galaxy/screen.js';
import { makeGuide, guideSeen } from './guide.js';
import { Sim, LOOSE } from '../base/sim.js';
import { Life } from '../base/life.js';
import { View } from '../base/view.js';
import { REQUESTS } from '../base/desk.js';
import { ensureLogo } from '../base/logo.js';
import { words } from '../core/words.js';
import { note } from '../core/career.js';
// (0.46) what a base puts on air: every parade ground, speaker, billboard, banner, flag and monument standing is footage for the war's ratings
const SHOWS = new Set(['parade', 'speaker', 'billboard', 'banner', 'hdbanner', 'flag', 'seflag', 'statue', 'monument', 'memorial', 'lecture', 'truth', 'plaque']);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const ROADS = { road1: { name: 'Dirt Road', k: 'dirt', sub: 'drag to draw', desc: 'One tile wide and cheap. People and vehicles move faster on it than over open ground, and every building needs a road at its door.' },
  road2: { name: 'Paved Road', k: 'paved', sub: 'two tiles wide', desc: 'Two tiles wide, two lanes. Trucks run fastest here and do not queue behind each other. Needs a Concrete Plant.' },
  path: { name: 'Footpath', k: 'path', sub: 'for boots', desc: 'A paved walk one tile wide. People keep to it; vehicles do not use it.' },
  wall: { name: 'Wall', k: 'wall', sub: 'close it for a bonus', desc: 'Draw it all the way round and the base is closed: better morale, and raiders have to come through a gate. A road through a wall makes a gate.' },
  unroad: { name: 'Bulldoze', k: null, sub: words('tap a road or wall'), desc: 'Tap a stretch of road or wall to take it out. Half its cost comes back.' } };
const TABS = GROUPS.filter((g) => g[0] !== 'landscape');
const isZone = (t) => !!t && t.startsWith('zone:'), isRoad = (t) => !!ROADS[t];

let app, ui, audio, canvas, view = null, sim = null, life = null, args = null;
let acc = 0, group = 'roads', tool = null, rot = 0, sel = 0, barSig = '', deskSig = '', hudT = 0, saveT = 25, thumbs = {};
let roadDrag = null, zoneDrag = null, drag = null, pinch = null; const ptrs = new Map(), held = new Set();
let hover = null, selSig = '', tut = null; const deskSeen = new Map();
const DESK_OPEN = 20000;   // a request lies open on the desk this long (ms), then folds down to its title until it is tapped
const TUT_KEY = 'ofgc.guide.base';

const baseFaction = (sys) => ({ ...structuredClone(app.faction), base: `Fort ${sys.worlds[sys.key].name}`, diff: 'recruit' });

// ---------------------------------------------------------------- the shared frame
function tabs() { $('th-tabs').innerHTML = TABS.map((g) => `<button data-bg="${g[0]}" class="${g[0] === group ? 'on' : ''}">${g[1]}</button>`).join(''); }
function thumb(t) { if (!(t in thumbs)) { try { thumbs[t] = view.thumb(t, sim.std ?? 0) || ''; } catch { thumbs[t] = ''; } } return thumbs[t]; }
function bar(force) {
  let html = '';
  if (group === 'roads') html = Object.entries(ROADS).map(([k, r]) => `<button class="plate btn tool${tool === k ? ' on' : ''}" data-bt="${k}" title="${esc(words(r.desc))}"><b>${r.name}</b><span>${r.sub}</span></button>`).join('');
  else if (group === 'zones') html = Object.entries(ZONES).map(([k, z]) => `<button class="plate btn tool${tool === 'zone:' + k ? ' on' : ''}" data-bt="zone:${k}" title="${esc(z.desc)}" style="border-color:${z.col}"><b style="color:${z.col}">${z.name}</b><span>tap a road, or drag</span></button>`).join('') +
    `<button class="plate btn tool${tool === 'zone:' ? ' on' : ''}" data-bt="zone:"><b>Unzone</b><span>clear a zone</span></button>`;
  else {
    const g = TABS.find((x) => x[0] === group) || TABS[0];
    html = g[3].filter((t) => B[t]).map((t) => {
      const lk = sim.locked(t), cost = sim.costOf(t, specOf(t)), c = typeof cost === 'object' ? cost.sup ?? cost.cost ?? 0 : cost, pic = thumb(t);
      return `<button class="plate btn tool pic${tool === t ? ' on' : ''}" data-bt="${t}" title="${esc(B[t].desc || '')}" ${lk ? 'disabled' : ''}>${pic ? `<img src="${pic}" alt="">` : ''}<div><b>${esc(B[t].name)}</b><span>${lk ? 'needs ' + esc(lk[0]) : Math.round(c) + ' SUP'}</span></div></button>`;
    }).join('') || '<span class="dim" style="align-self:center">Nothing to place by hand here yet. These grow in their zone.</span>';
  }
  if (force || html !== barSig) { barSig = html; $('th-bar').innerHTML = html; }
}
const specOf = (k) => (sim.designable(k) ? { design: 0, parts: [] } : sim.hasStd(k) ? { std: sim.std } : null);
function stats() {
  const T = sim.time || { day: 1, hour: 8 }, mo = Math.round(sim.morale), S = C.STAGES[sim.stage || 0];
  ui.stats([{ k: 'SUPPLIES', v: Math.round(sim.supplies).toLocaleString('en-US'), tone: sim.supplies < 100 ? 'r' : 'a' }, { k: 'CREDITS', v: Math.round(sim.credits).toLocaleString('en-US') }, { k: 'TROOPS', v: sim.troops.length },
    { k: 'MORALE', v: mo, tone: mo < 35 ? 'r' : '' }, { k: `DAY ${Math.floor(T.day)}`, v: `${String(Math.floor(T.hour)).padStart(2, '0')}:00` },
    ...(innerWidth < 640 ? [{ k: `CHARTER · ${ord(sim.ranking() + 1)}`, v: (S.short || S.name).toUpperCase(), act: 'report', title: 'The charter, your standing and your defences' }]   // a phone: one tile for both
      : [{ k: 'STANDING', v: `${ord(sim.ranking() + 1)} OF ${sim.rivals.length + 1}`, act: 'report', title: 'Your standing with the Head Office against the other outfits, and your defences' }, { k: 'CHARTER', v: (S.short || S.name).toUpperCase(), act: 'report', title: 'What the next charter needs' }])]);
  let tip = '';
  if (isRoad(tool)) tip = tool === 'unroad' ? words('Tap a road or a wall to take it out.') : `${ROADS[tool].name}: drag across the ground to draw it. It keeps to the tiles${matchMedia('(pointer: fine)').matches ? '; hold Shift to draw free' : ''}.`;
  else if (isZone(tool)) tip = words('Tap beside a road to zone its block, or drag a rectangle.');
  else if (tool) tip = words(`${B[tool].name}: it snaps to a plot along a road. Tap to place.`);
  else { const nx = C.STAGES[(sim.stage || 0) + 1], ck = sim.stageCheck(); if (nx && ck) { const met = ck.filter((c) => c.ok).length; tip = `NEXT CHARTER · ${(nx.short || nx.name).toUpperCase()}: ${met} of ${ck.length} terms met` + (met === ck.length ? ' · granted within the hour' : ` · still: ${ck.find((c) => !c.ok).text.replace(/ \(.*\)$/, '')}`) + ' · tap CHARTER for the list'; } }
  ui.tip(tip);
}
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
  h += `<h3>STANDING · ${ord(rank + 1)} OF ${rows.length}</h3><p class="dim">The Head Office ranks every outfit by its three standings added up. Your place sets the allocation paid each week: ${alloc(rank)} supplies now${rank > 0 ? `, ${alloc(rank - 1)} one place up` : ''}. Standings drift back toward ${C.STAND.rest} each week, so they have to be kept up.</p>`;
  for (const m of ['def', 'pro', 'tru']) { const v = Math.round(sim.stand[m]); h += `<div class="sb"><b>${MIN[m].short}</b><i><u style="width:${v}%"></u></i><span>${v}</span></div><p class="sm2 dim" style="margin:0 0 4px">${esc(MIN[m].name)}: ${esc(MIN[m].wants)}</p>`; }
  h += `<table><tr><th>Outfit</th><th>DEF</th><th>EXP</th><th>PUB</th><th>ALL</th></tr>${rows.map((r) => `<tr class="${r.me ? 'me' : ''}"><td>${esc(r.name)}</td>${['def', 'pro', 'tru'].map((m) => `<td>${Math.round(r.stand[m])}</td>`).join('')}<td>${sim.total(r.stand)}</td></tr>`).join('')}</table>`;
  if (A || I) h += `<p class="sm2">${A ? `Last supply audit (week ${A.week}): <b>${A.score}</b>/100 · supply lines ${A.lines}, food ${A.food}, housing ${A.housing}, growth ${A.growth}. ` : ''}${I ? `Last inspection (week ${I.week}): <b>${I.score}</b>/100 · morale ${I.morale}, propaganda ${I.prop}, upkeep ${I.cond}.` : ''}</p>`;
  h += `<h3>DEFENCE · ${f.closed ? `${f.score}/100` : 'NO CLOSED WALL'}</h3>`;
  h += `<ul class="ck"><li>${tick(f.closed)} A wall all the way round, with a gate${f.closed ? '' : ' (until it closes, the base scores 0 and raiders walk in)'}</li>`;
  if (f.closed) h += `<li>${tick(f.cover >= 0.9)} Wall watched by a lookout or tower: ${pct(f.cover)}</li>
    <li>${tick(f.armed >= 0.5)} Wall covered by guns with ammunition: ${pct(f.armed)}</li>
    <li>${tick(!f.gates || f.manned >= f.gates)} Gates with a guard: ${f.manned} of ${f.gates}</li>
    <li>${tick(f.entr >= 1)} Two gates or fewer: ${f.gates}</li>
    <li>${tick(f.depth >= 0.8)} Command post and fuel kept well back from the wall: ${pct(f.depth)}</li>`;
  h += `</ul>`;
  h += `<p class="dim sm2">Each week the perimeter review turns this score into Defence standing: above 45 gains it, below loses it. Patrols that come back win it too.</p>`;
  modal(h + '</div><button class="plate btn go" data-x="close" style="margin-top:10px;position:sticky;bottom:0">CLOSE</button>');
  $('modal').querySelector('[data-x=close]').onclick = () => { $('modal').hidden = true; audio.click(); };
}
// what a standing building is doing right now, as short labels: [text, tone] with tone 'g' good, 'r' trouble, '' plain
function statusOf(b) {
  const d = B[b.type], out = [], u = sim.util || sim.utilities(), nb = (n) => `${n} building${n === 1 ? '' : 's'}`;
  if (!b.done) return [[`Under construction: ${Math.round((b.prog || 0) * 100)}%`, '']];
  if (b.off) out.push(['Switched off', 'r']);
  if (d.crew) out.push([`Crew ${b.crew || 0} of ${d.crew}`, (b.crew || 0) >= d.crew ? 'g' : 'r']);
  if (d.staff) out.push([`${d.staff} colonist staff`, '']);
  if (d.pw < 0) out.push(b.dark ? ['No power: outside every power circle', 'r'] : sim.power.ratio < 1 ? [`Power short: ${Math.round(sim.power.ratio * 100)}%`, 'r'] : ['Powered', 'g']);
  else if (d.pw > 0) out.push([`Makes ${d.pw} power · serves ${nb(sim.servedBy(b, 'pw'))}`, '']);
  else if (d.cover?.pw) out.push([`Carries power to ${nb(sim.servedBy(b, 'pw'))}`, '']);
  if (sim.needsWater(b)) out.push(b.dry ? ['No water in reach', 'r'] : ['Water', 'g']);
  if (sim.needsSewer(b)) out.push(b.foul ? ['No sewage in reach', 'r'] : ['Sewage', 'g']);
  if (b.bad) out.push(['Contaminated: a sewage lagoon is too close', 'r']);
  if (b.smelly) out.push(['Smells the lagoon', 'r']);
  if (d.water || d.relay === 'wa' || b.type === 'hq') { const n = sim.servedBy(b, 'wa'); out.push([`Water to ${nb(n)} · base ${u.water.use} of ${u.water.made} a day`, u.water.ratio < 1 ? 'r' : '']); }
  if (d.sewer || b.type === 'hq') { const n = sim.servedBy(b, 'se'); out.push([n || b.type === 'hq' ? `Takes the waste of ${nb(n)} · base ${u.sewer.use} of ${u.sewer.cap} a day` : 'Nothing in reach to serve: bunks and mess halls must stand inside its circle', n || b.type === 'hq' ? (u.sewer.ratio < 1 ? 'r' : '') : 'r']); }
  if (d.cover?.fu) out.push([`Pipes fuel to ${nb(sim.servedBy(b, 'fu'))}`, '']);
  if (d.beds) out.push([`${sim.cap(b, 'beds')} beds`, '']);
  if (d.eat) out.push([`${sim.cap(b, 'eat')} seats`, '']);
  if (d.potty) out.push([`Clean ${Math.round(b.clean ?? 100)}%`, (b.clean ?? 100) < 25 ? 'r' : '']);
  const st = Object.keys(GOODS).filter((g) => (b.stock?.[g] || 0) >= 1).map((g) => `${GOODS[g].short} ${Math.round(b.stock[g])}`); if (st.length) out.push([st.join(' · '), '']);
  if (b.cond < 70) out.push([`Condition ${Math.round(b.cond)}%`, b.cond < 40 ? 'r' : '']);
  if (b.type === 'hq' && sim.bill) {   // (0.58) the morning dropship's receipt
    const L = sim.bill, got = Object.keys(GOODS).filter((g) => L.order[g]).map((g) => `${L.order[g]} ${GOODS[g].short}`);
    out.push([`Day ${Math.floor(L.day)} delivery: ${got.length ? got.join(' · ') + ` · billed ${Math.round(L.cost)} SUP` : 'nothing bought'}${L.capped ? ' (capped)' : ''}`, L.capped ? 'r' : '']);
  }
  return out;
}
// (0.58) the standing supply order, on the command post's card: what the 07:00 dropship may buy, and the most it may spend
function supplyRow() {
  const P = sim.supplyPlan || { mode: 'needs', cap: 0.5 };
  return `<span class="so"><i class="st">DROPSHIP BUYS</i>${Object.entries(SUPPLY_MODES).map(([k, m]) => `<button class="plate btn sm${P.mode === k ? ' on' : ''}" data-so="${k}" title="${esc(m.desc)}">${m.short}</button>`).join('')}` +
    `<i class="st">SPENDS AT MOST</i>${SUPPLY_CAPS.map((c) => `<button class="plate btn sm${P.cap === c ? ' on' : ''}" data-sc="${c}" title="${c >= 1 ? 'No cap: it may spend every supply the base has.' : `It never spends more than ${Math.round(c * 100)}% of the base's supplies in one morning.`}">${c >= 1 ? 'ALL' : Math.round(c * 100) + '%'}</button>`).join('')}</span>`;
}
function selBar() {
  const el = $('th-sel'), b = sel && sim.byId(sel), t = tool || hover; let html = '';
  if (b) html = `<b>${esc(B[b.type].name)}</b>${statusOf(b).map(([x, tone]) => `<i class="st ${tone}">${esc(x)}</i>`).join('')}${b.type === 'hq' ? supplyRow() : ''}<span class="grow"></span>${b.type === 'hq' ? '' : '<button class="plate btn sm" data-bd="1">DEMOLISH</button>'}<button class="plate btn sm" data-bx="1">×</button><span class="dim desc">${esc(B[b.type].desc || B[b.type].why || '')}</span>`;
  else if (t && (B[t] || ROADS[t] || (isZone(t) && ZONES[t.slice(5)]))) { const d = B[t] || ROADS[t] || ZONES[t.slice(5)]; html = `<b>${esc(d.name)}</b><span class="grow dim">${esc(words(d.desc || d.why || ''))}</span>`; }
  el.classList.toggle('hidden', !html);
  if (html !== selSig) { selSig = html; el.innerHTML = html; }
}
function desk() {
  const now = performance.now(), live = sim.desk.slice(0, innerWidth < 640 ? 1 : 2), hr = C.WEEK / 24;
  for (const r of live) if (!deskSeen.has(r.id)) deskSeen.set(r.id, now);
  const left = (r) => Math.max(1, Math.ceil((r.due - sim.t) / hr)), folded = (r) => now - deskSeen.get(r.id) > DESK_OPEN;
  const sig = live.map((r) => `${r.id}${folded(r) ? 'f' : ''}${left(r)}`).join(',');
  if (sig === deskSig) return; deskSig = sig;
  $('th-desk').innerHTML = live.map((r) => { const q = REQUESTS[r.k], due = `${left(r)} h to answer`;
    if (folded(r)) return `<button class="plate amber req fold" data-bo="${r.id}"><b>${esc(q.title.toUpperCase())}</b><span>${due} · ${words('tap to read')}</span></button>`;
    return `<div class="plate amber req" data-id="${r.id}"><b>${esc(q.title.toUpperCase())}</b>${esc(q.text.replaceAll('NAME', r.name))}<small>${due}, then it is filed without you.</small><div class="row">${q.opts.map((o, i) => `<button class="plate btn sm" data-ba="${i}" ${sim.canDecide(r, i) ? '' : 'disabled'}>${esc(o.label)}</button>`).join('')}</div></div>`; }).join('');
}
// ---------------------------------------------------------------- the guide: how a base is played (js/modes/guide.js)
const TUT = [
  { t: 'ROADS FIRST', x: 'Everything is built along a road. Pick <b>DIRT ROAD</b> below and drag from the command post across open ground.', done: () => sim.net.segs.some((g) => g.k !== 'wall') },
  { t: 'ZONE THE ROADSIDE', x: 'Open <b>ZONES</b>, pick <b>Life Support</b> and tap beside your road. Bunks, mess halls and latrines grow there by themselves as the base needs them.', done: () => sim.zone.some((v) => v) },
  { t: 'POWER, WATER, SEWAGE', x: 'Open <b>UTILITIES</b> and place a <b>Biofuel Generator</b> by the road. Each utility covers a circle round it: keep the bunks inside, and keep wells away from a sewage lagoon.', done: () => sim.b.some((b) => B[b.type].group === 'power') },
  { t: 'CHECK ON A BUILDING', x: 'With no tool in hand, tap any building: its card shows its crew, whether it has power, water and sewage, and what is wrong with it.', done: () => !!sel },
  { t: 'WHAT MATTERS', x: 'Keep morale up and the books in profit: troops need beds, food, water and power, and every charter you earn makes the base worth more. Drag to move, right-drag or Q and E to turn, wheel or pinch to zoom. <b>II</b> pauses and <b>1×</b> speeds time up. Requests land on your desk at the side: answer them or they are filed without you. The supply dropship lands at 07:00 and bills you for what it brings: tap the command post to choose what it buys and how much it may spend.', last: true },
];
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
const lineEnd = (e) => { const p = view.pick(e.clientX, e.clientY); return sim.snapLine({ x: p.x, z: p.z }, e.shiftKey ? 'free' : '45', ROADS[tool].k || 'dirt', roadDrag); };   // on the tiles, straight or diagonal; Shift draws free
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
    const t = e.target.closest('[data-bg],[data-bt],[data-ba],[data-bd],[data-bx],[data-bo],[data-so],[data-sc]'); if (!t) return;
    const d = t.dataset;
    if (d.bg) { group = d.bg; if (tool) setTool(tool); audio.click(); tabs(); bar(true); }
    else if (d.bt != null) setTool(d.bt);
    else if (d.ba != null) { const ok = sim.decide(+t.closest('.req').dataset.id, +d.ba); if (ok) audio.click(); else audio.deny(); deskSig = ''; desk(); }
    else if (d.bd) { const r = sim.demolish(sel); if (r === false || (r && r.ok === false)) { audio.deny(); if (r && r.why) app.toast(r.why); } else { audio.baseDown(); sel = 0; view.select(null); selBar(); } }
    else if (d.bx) { sel = 0; view.select(null); selBar(); }
    else if (d.so || d.sc) { if (sim.setSupplyPlan(d.so ? 'mode' : 'cap', d.so || +d.sc)) audio.click(); selSig = ''; selBar(); }
    else if (d.bo) { deskSeen.set(+d.bo, performance.now()); audio.click(); desk(); }
  });
  $('th-stats').addEventListener('click', (e) => { if (mode.off || !e.target.closest('[data-act=report]')) return; audio.click(); report(); });
  // with a mouse, resting on a tool shows what it is before it is picked
  $('th-bar').addEventListener('pointerover', (e) => { if (mode.off || e.pointerType !== 'mouse') return; const t = e.target.closest('[data-bt]'); hover = t ? t.dataset.bt : null; selBar(); });
  $('th-bar').addEventListener('pointerleave', () => { if (hover) { hover = null; if (!mode.off) selBar(); } });
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
    acc = 0; tool = null; sel = 0; hover = null; barSig = ''; deskSig = ''; selSig = ''; deskSeen.clear(); thumbs = {}; saveT = 25; group = 'roads'; ui.speeds = [1, 2, 4];
    tut = app.tutorial || (!loaded && app.settings.hints && !guideSeen(TUT_KEY)) ? makeGuide(TUT, { key: TUT_KEY, tutorial: app.tutorial, words, audio, exit: () => app.leavePost() }) : null;
    $('th-where').textContent = sim.faction.base;
    tabs(); bar(true); stats(); desk(); selBar(); if (tut) tut.tick(); else { const co = $('th-coach'); if (co) co.hidden = true; }
    if (!loaded) { const gr = app.grant('b_grant'); if (gr) sim.supplies += gr; }
    if (!loaded) { ui.message('A NEW BASE', 2600); ui.feed('BASE: The command post is down. Draw a road from it, then zone along the road.', 'radio'); }
    else ui.feed(`BASE: Welcome back, Commander. Day ${Math.floor((sim.time || { day: 1 }).day)}.`, 'radio');
  },
  store() { if (sim && args) { try { app.siteSave('base', args.system.id, sim.save()); } catch (err) { console.error(err); } } },
  report() { const s = sim.stage || 0, r = sim.rates(), net = r.crNet + r.supNet; return { air: Math.min(5, sim.b.filter((b) => b.done && !b.off && SHOWS.has(b.type)).length), profit: sim.flow.days.length > 0 && net > 0, net, level: Math.min(4, s + 1), charter: C.STAGES[s].name, troops: sim.troops.length }; },
  leave() { mode.store(); mode.off = true; held.clear(); if (tut) tut.hide(); tut = null; if (view) { view.setGhost(null); view.showLine(null); view.showPlots(null); } },
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
        else if (ev.t === 'built') { audio.ready(); barSig = ''; const b = sim.b.find((o) => o.id === ev.id); if (b && !ev.refit) note(app.tutorial ? {} : { built: 1 }, [['building', b.type]]); }
        else if (ev.t === 'week') { audio.objective(); barSig = ''; if (!app.tutorial) note({ baseDays: 1, baseFirst: ev.rank === 0 ? 1 : 0, baseReview: ev.review || 0 }); }
        else if (ev.t === 'desk') audio.chirp();
        else if (ev.t === 'raidAlarm') { audio.siren(); ui.message('MOVEMENT AT THE WIRE', 3000); }
      }
      life.update(dt);
    }
    if (sim.time) view.setTime(sim.time.hour);
    if (!view.lost) view.frame(real);
    if ((hudT -= real) <= 0) { hudT = 0.3; bar(); stats(); desk(); selBar(); if (tut) tut.tick(); }
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
