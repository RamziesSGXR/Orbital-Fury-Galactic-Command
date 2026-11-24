// ORBIT: the station over a system you hold. The rules and the 3D are Super Orbital Simulator's (js/orbit); this file
// is how the commander meets them inside Galactic Command: one station for each system, built from the shared tool bar,
// its people's requests on the shared desk, and its tier reported back to the map (a harder system to take, cheaper ships).
// (0.76) The standalone game's panels and cards are back (js/modes/orbit-panels.js): comms, the Commander's channel and the
// accounts, the upgrade path, a card for a part, a person or the station, fitting out rooms, the views, and the keys.
// BUILD MODE (0.53): choosing a part marks every free port (a green ring where it fits), shows the part on the port under the
// pointer before anything is built, and opens a card that says whether it fits there and, if not, why.
import { C } from '../orbit/config.js';
import { Station } from '../orbit/sim.js';
import { View } from '../orbit/view.js';
import { ensureLogo } from '../orbit/logo.js';
import { words } from '../core/words.js';
import { note, best } from '../core/career.js';
import { upgrade } from '../core/roster.js';
import { C as GC } from '../galaxy/config.js';
import { makeGuide, guideSeen } from './guide.js';
import { binds } from '../core/binds.js';
import { makePanels, ROLE, ROLE_ONE, READOUT } from './orbit-panels.js';
import { SLOTS } from '../orbit/parts.js';
const KB = binds('orbit');     // (GC 0.73) the player's own keys

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const STEP = 1 / 30;
const partsOf = (g) => Object.keys(C.parts).filter((t) => C.parts[t].group === g && !C.parts[t].fixed);
const SHORT = { platform: 'FIRE SUPPORT', structure: 'STRUCTURE', habitation: 'HABITATION', docking: 'DOCKING', industry: 'INDUSTRY', power: 'POWER', defence: 'DEFENCE', comms: 'COMMS' };

let app, ui, audio, canvas, view = null, st = null, args = null;
// the guide: how a station is played (js/modes/guide.js)
let tut = null, tut0 = 0; const TUT_KEY = 'ofgc.guide.orbit';
const has = (g) => [...st.parts.values()].some((p) => C.parts[p.type] && C.parts[p.type].group === g && !C.parts[p.type].fixed);
const TUT = [
  { t: 'CHOOSE A PART', x: 'A station is built part by part, outward from Station Command. In <b>STRUCTURE</b> below, pick a <b>Core Segment</b>.', done: () => !!tool || st.parts.size > tut0 },
  { t: 'BUILD IT ON A GREEN RING', x: 'Every free port is marked: a <b>green ring</b> where the part fits, a red dot where it does not. Point at a ring to see the part there, <b>TURN</b> it if you like, then <b>BUILD</b>.', done: () => st.parts.size > tut0 },
  { t: 'SOMEWHERE TO LIVE', x: 'People run the station, and they need beds. Open <b>HABITATION</b> and build a <b>Hab Module</b> on a side port.', done: () => has('habitation') },
  { t: 'KEEP THE LIGHTS ON', x: 'Every part draws power. Open <b>POWER</b> and add a <b>Solar Array</b> or a <b>Reactor Core</b> before the station runs short.', done: () => has('power') },
  { t: 'CHECK ON A PART', x: 'With no part in hand, tap any part of the station to read what it is and what it does. <b>VIEW</b> switches between the hull, the blueprint and the inside.', done: () => !!sel },
  { t: 'WHAT MATTERS', x: 'Keep the station in profit and its people housed and fed: that raises its tier, and a higher tier opens bigger parts. Drag to turn the view, wheel or pinch to zoom. <b>II</b> pauses and <b>1×</b> speeds time up. Requests land on your desk at the side.', last: true },
];
let acc = 0, group = 'structure', tool = null, rot = 0, hot = null, hotFit = null, px = null, py = null, portsDirty = false, sel = null, vmode = 'hull', inside = false, cardSig = '';
let barSig = '', deskSig = '', saveT = 20, hudT = 0, thumbs = {};
let P = null, person = 0, follow = 0, edit = null, room = null, slot = null, cut = false, dots = true, viewsOpen = false;
const held = new Set(), FLY = new Set(['flyFwd', 'flyBack', 'flyLeft', 'flyRight', 'turnLeft', 'turnRight']);     // camera keys held down
const canEdit = (id) => { const p = st.parts.get(id); return !!p && !!SLOTS[p.type] && p.state === 'active'; };

// THE ENEMY OVER THIS STATION: raids come from the war's own enemies, not nameless raiders. A system on a front is raided by
// that front's enemy; the capital, by one of the three. An enemy the war has destroyed raids no more (another takes its place),
// and once all three are gone the raiders are nameless again.
function foeOf(sys) {
  const F = (app.camp && app.camp.war && app.camp.war.F) || {}, alive = GC.factions.filter((f) => !(F[f] && F[f].state === 'dead'));
  if (!alive.length) return null;
  const own = sys.front >= 0 && GC.fronts[sys.front] ? GC.fronts[sys.front].f : null, f = own && alive.includes(own) ? own : alive[sys.id % alive.length];
  return { id: f, name: GC.names.factions[f], color: GC.color[f] };
}
const stationFaction = (sys) => ({ ...structuredClone(C.founding.def), ...structuredClone(app.faction), station: /\bstation$/i.test(sys.name) ? sys.name : `${sys.name} Station` });   // (0.76) not "Kestrel Station Station"
// (0.66) the livery every game wears: the hull and trim, the accent, the finish and the lights (a soft wash of the glow colour)
const soft = (c) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(c.substr(i, 2), 16) * 0.45 + 255 * 0.55).toString(16).padStart(2, '0')).join('');
const livery = (f) => ({ ...C.livery.def, hull: f.primary, trim: f.secondary, ...(f.livery ? { accent: f.livery.accent, plating: f.livery.finish, ...(/^#[0-9a-f]{6}$/i.test(f.livery.glow || '') ? { lights: soft(f.livery.glow) } : {}) } : {}) });

// ---------------------------------------------------------------- the shared frame
function tabs() {
  $('th-tabs').innerHTML = C.groups.map((g) => `<button data-og="${g.id}" class="${g.id === group ? 'on' : ''}">${SHORT[g.id] || g.name}</button>`).join('') +
    `<button data-ov="view" class="${viewsOpen ? 'on' : ''}">VIEW: ${vmode === 'blueprint' ? 'BLUEPRINT' : vmode === 'life' ? 'LIFE SIGNS' : 'HULL'}${inside ? ' · INSIDE' : ''}${cut ? ' · CUT' : ''}</button>`;
  if (edit) $('th-tabs').innerHTML = `<button class="on">ROOMS · ${esc(st.name(st.parts.get(edit)).toUpperCase())}</button><button data-oe="done">DONE (I)</button>`;
  views();
}
// (0.76) the views: hull, blueprint or life signs; and over any of them the hull taken away (INSIDE), cut open (CUTAWAY), the ports' dots
function views() {
  let el = $('op-views');
  if (!el) { el = document.createElement('div'); el.id = 'op-views'; el.className = 'plate'; $('op').appendChild(el); }
  el.hidden = !viewsOpen || mode.off;
  el.innerHTML = [['hull', 'HULL'], ['blueprint', 'BLUEPRINT'], ['life', 'LIFE SIGNS']].map(([k, l]) => `<button class="plate btn sm${vmode === k ? ' on' : ''}" data-vw="${k}">${l}</button>`).join('')
    + `<span class="sep"></span><button class="plate btn sm${inside ? ' on' : ''}" data-vw="inside" title="T">INSIDE</button><button class="plate btn sm${cut ? ' on' : ''}" data-vw="cut" title="G">CUTAWAY</button><button class="plate btn sm${dots ? ' on' : ''}" data-vw="dots" title="J">PORT DOTS</button>`;
}
function setView(k) {
  if (k === 'inside') { inside = !inside; view.setOpen(inside); if (inside && vmode !== 'hull') { vmode = 'hull'; view.setMode('hull'); } }
  else if (k === 'cut') { cut = !cut; view.setCutaway(cut); }
  else if (k === 'dots') { dots = !dots; view.portMode = dots ? 'near' : 'off'; portsDirty = true; if (!tool) view.showPorts(null); }
  else { vmode = k; view.setMode(k); if (k !== 'hull' && inside) { inside = false; view.setOpen(false); } }
  audio.click(); tabs();
}
function thumb(t) { if (!(t in thumbs)) { try { thumbs[t] = view.thumb(t) || ''; } catch { thumbs[t] = ''; } } return thumbs[t]; }
function bar(force) {
  if (edit) { palette(force); return; }
  const html = partsOf(group).map((t) => {
    const d = C.parts[t], open = st.partOpen(t), poor = st.credits < d.cost, pic = thumb(t);
    return `<button class="plate btn tool pic${tool === t ? ' on' : ''}" data-op="${t}" ${open ? '' : 'disabled'}>${pic ? `<img src="${pic}" alt="">` : ''}<div><b>${esc(d.name)}</b><span${poor && open ? ' class="rd2"' : ''}>${open ? d.cost + ' CR' : C.tiers[d.tier].name}</span></div></button>`;
  }).join('');
  if (force || html !== barSig) { barSig = html; $('th-bar').innerHTML = html; }
}
// (0.76) FITTING OUT A PART, room by room: the rooms in the tool bar; pick one, then a room inside the part (or its number)
function palette(force) {
  const p = st.parts.get(edit); if (!p) { endEdit(); return; }
  const html = C.roomOrder.map((r) => {
    const R = C.rooms[r], locked = !st.roomOpen(r), na = !!R.bay && !C.parts[p.type].bay, poor = !locked && !na && st.credits < R.cost;
    return `<button class="plate btn tool rb${room === r ? ' on' : ''}" data-or="${r}" ${locked || na ? 'disabled' : ''} title="${esc(R.name + (R.about ? ' · ' + R.about : ''))}"><i style="background:${R.col}"></i><div><b>${esc(R.short || 'EMPTY')}</b><span${poor ? ' class="rd2"' : ''}>${locked ? C.tiers[R.tier].name : na ? 'BAYS ONLY' : R.cost ? R.cost + ' CR' : 'free'}</span></div></button>`;
  }).join('');
  if (force || html !== barSig) { barSig = html; $('th-bar').innerHTML = html; }
}
function startEdit(id) {
  if (!canEdit(id)) return;
  if (tool) setTool(tool);
  edit = id; room = null; slot = null; sel = id; person = 0; view.select(id); view.editPart(id); audio.click(); tabs(); bar(true); selBar();
}
function endEdit() {
  if (!edit) return;
  edit = null; room = null; slot = null; view.editPart(null); view.setSlotHot(null); view.select(sel); tabs(); bar(true); selBar();
}
function paint(id, s) {
  const r = st.setRoom(id, s, room);
  if (r.ok) audio.podLand();
  else if (r.why === 'Already that room') { if (st.refit(id, s).ok) audio.click(); }     // the same room again: rearrange it
  else if (r.why) { audio.deny(); app.toast(r.why); }
  selBar(true);
}
function editClick(x, y) {
  const hit = view.pickSlot(x, y);
  if (hit) { if (room && !(view.touch && slot !== hit.slot)) paint(hit.part, hit.slot); slot = hit.slot; view.setSlotHot(hit); audio.click(); selBar(true); return; }
  const id = view.pickPart(x, y);
  if (id && id !== edit && canEdit(id)) { startEdit(id); return; }
  slot = null; view.setSlotHot(null); selBar(true);
}
function stats() {
  const n = st.next(), mo = Math.round(st.morale);
  const rdy = Math.round(st.platform().ready * 100), mt = Object.values(st.moraleParts()).reduce((s, x) => s + x, 0), acc = (k) => ({ act: 'acc-' + READOUT[k], title: 'Where it comes from and goes: click for the accounts' });
  ui.stats([{ k: 'CREDITS', v: Math.round(st.credits).toLocaleString('en-US'), tone: st.credits < 0 ? 'r' : 'a', ...acc('CREDITS') }, { k: 'CAPABILITY', v: st.capability(), ...acc('CAPABILITY') }, { k: 'POWER', v: `${st.demand}/${st.supply}`, tone: st.eff < 1 ? 'r' : '', ...acc('POWER') },
    { k: 'PEOPLE', v: `${st.residents()}/${st.beds()}`, ...acc('PEOPLE') }, { k: 'MORALE', v: `${mo}${mt > st.morale + 2 ? ' ▲' : mt < st.morale - 2 ? ' ▼' : ''}`, tone: mo < 35 ? 'r' : '', ...acc('MORALE') }, { k: 'READY', v: `${rdy}%`, tone: !st.platformN ? 'r' : '', ...acc('READY') },
    { k: `WEEK ${st.week()}`, v: `D${st.dow()}` }, { k: 'TIER', v: C.tiers[st.tier].name, act: 'upg', title: 'The upgrade path (U)' }]);
  let tip = '';
  if (tool) tip = hot ? '' : words(`${C.parts[tool].name}: tap a green ring to place it.`);
  else if (edit) tip = '';
  else if (n) tip = `NEXT · ${n.name}: ` + n.items.map((i) => `${i.label} ${Math.min(i.have, i.need)}/${i.need}${i.ok ? ' ✓' : ''}`).join(' · ') + ' · TIER for the full path';
  ui.tip(tip);
}
// (0.76) THE CARD above the tool bar: the part in hand (build mode), the room being fitted, a person, a part, or the station
const stat = (label, value, cls = '') => `<span class="sv ${cls}"><i>${label}</i>${value}</span>`;
const pw = (d) => (d.pw < 0 ? `+${-d.pw}` : `−${d.pw}`);
function roomSums(rooms) {
  const s = { beds: 0, leisure: 0, income: 0, homes: {} };
  for (const r of rooms) { const R = C.rooms[r]; s.beds += R.beds || 0; s.leisure += R.leisure || 0; s.income += R.income || 0; for (const [k, v] of Object.entries(R.homes || {})) s.homes[k] = (s.homes[k] || 0) + v; }
  return s;
}
const sumStats = (s) => (s.beds ? stat('BEDS', s.beds) : '') + (s.leisure ? stat('MORALE', `${s.leisure > 0 ? '+' : ''}${s.leisure}`) : '') + (s.income ? stat('INCOME', `+${s.income}/min`) : '') + Object.entries(s.homes).map(([k, v]) => stat(ROLE[k].toUpperCase(), v)).join('');
let selSig = '';
function setCard(html, cls = '') {
  const el = $('th-sel'); el.classList.remove('hidden', 'build'); el.classList.add('ocard'); el.dataset.k = cls;
  if (html !== selSig) { selSig = html; el.innerHTML = html; }
}
function selBar(force) {
  if (tool) { card(true); return; }
  if (force) selSig = '';
  cardSig = '';
  if (edit) { editCard(); return; }
  if (person) { const a = st.agents.find((x) => x.id === person); if (a) { personCard(a); return; } person = 0; follow = 0; }
  const p = sel && st.parts.get(sel);
  if (p) { partCard(p); return; }
  overCard();
}
function partCard(p) {
  const d = C.parts[p.type];
  const state = p.state === 'building' ? `<span class="warn">Building ${Math.round(p.prog * 100)}%</span>` : p.state === 'demolish' ? '<span class="bad">Coming down</span>'
    : p.fault ? `<span class="warn">Fault: ${st.agents.some((a) => a.eva && a.at === p.id) ? 'engineers on EVA' : st.staff.engineer ? 'engineers on the way' : 'no engineers'}</span>` : '<span class="ok">Running</span>';
  let extra = '';
  const s = roomSums(p.rooms), housed = st.agents.filter((a) => a.home === p.id);
  if (s.beds) extra += stat('RESIDENTS', `${housed.filter((a) => a.role === 'resident').length}/${s.beds}`);
  const staff = housed.filter((a) => a.role !== 'resident').length; if (staff) extra += stat('STAFF', staff);
  if (d.berth) { const b = st.berthStatus(p); extra += stat('BERTH', ['open', 'busy'].includes(b.k) ? esc(b.why) : `<span class="bad">${esc(b.why)}</span>`); }
  const counts = {}; for (const r of p.rooms) counts[r] = (counts[r] || 0) + 1;
  const chips = Object.entries(counts).map(([r, k]) => `<span class="chip" style="--c:${C.rooms[r].col}">${esc(C.rooms[r].short || 'EMPTY')}${k > 1 ? ` ×${k}` : ''}</span>`).join('');
  const cd = st.canDemolish(p.id), ed = SLOTS[p.type];
  setCard(`<div class="ch"><b>${esc(st.name(p).toUpperCase())}</b>${chips ? `<span class="chips">${chips}</span>` : `<span class="dim">${esc(d.about || '')}</span>`}</div>`
    + `<div class="stl">${stat('STATUS', state)}${stat('POWER', pw(d))}${stat('UPKEEP', `${d.up}/min`)}${extra}</div>`
    + `<div class="acts"><button class="plate btn sm" data-oc="focus">FOCUS <small>F</small></button>${ed ? `<button class="plate btn sm hl" data-oc="edit" ${p.state === 'active' ? '' : 'disabled'}>FIT OUT ROOMS <small>I</small></button>` : ''}`
    + `${d.fixed ? '' : `<button class="plate btn sm" data-od="1" ${cd.ok ? '' : 'disabled'} title="${esc(cd.why || '')}">DEMOLISH <small>X</small>${cd.ok ? ` +${Math.round(d.cost * C.demolish.refund)} CR` : ''}</button>`}<button class="plate btn sm" data-ox="1" aria-label="Close">×</button></div>`, 'part');
}
function personCard(a) {
  const k = C.divOrder.find((d) => C.div[d].staff === a.role), home = st.parts.get(a.home), at = st.parts.get(a.at), F = k && C.factions[k];
  setCard(`<div class="ch"><b>${esc(a.name.toUpperCase())}</b><span class="dim">${ROLE_ONE[a.role] || 'Resident'}${F ? `, ${esc(F.who)}. ${esc(F.who)} is ${st.sat[k] >= 65 ? 'in good spirits' : st.sat[k] >= C.faction.low ? 'getting by' : 'unhappy'}.` : '.'}</span></div>`
    + `<div class="stl">${stat('DOING', esc(st.doing(a)))}${stat('IN', at ? esc(st.name(at)) : '—')}${stat(a.role === 'resident' ? 'QUARTERS' : 'POSTED', home ? esc(st.name(home)) : '—')}${stat('ABOARD', `${Math.max(1, Math.round((st.t - a.since) / C.time.daySec))} days`)}</div>`
    + (a.story && a.story.length ? `<ul class="story">${a.story.slice(-2).reverse().map((x) => `<li><i>${esc(x.d)}</i>${esc(x.text)}</li>`).join('')}</ul>` : '')
    + `<div class="acts"><button class="plate btn sm${follow === a.id ? ' on' : ''}" data-oc="follow">${follow === a.id ? 'FOLLOWING' : 'FOLLOW'} <small>F</small></button><button class="plate btn sm" data-ox="1" aria-label="Close">×</button></div>`, 'person');
}
function editCard() {
  const p = st.parts.get(edit); if (!p) { endEdit(); return; }
  const R = room && C.rooms[room], s = roomSums(p.rooms);
  const chips = p.rooms.map((x, i) => `<button type="button" class="chip${slot === i ? ' on' : ''}" data-os="${i}" style="--c:${C.rooms[x].col}">${i + 1} ${esc(C.rooms[x].short || '—')}</button>`).join('');
  const how = R ? `<b>${esc(R.name)}</b>${R.cost ? ` · ${R.cost} CR` : ''}${R.up ? ` · upkeep ${R.up}/min` : ''}. ${esc(R.about || 'Clears the room.')} ${words('Tap a room inside the part, or its number, to make it one.')}`
    : `${slot != null ? `Room ${slot + 1} is a <b>${esc(C.rooms[p.rooms[slot]].name)}</b>. ` : ''}${words('Pick a room below, then tap a room inside the part (or its number). The divisions also change rooms to suit themselves.')}`;
  setCard(`<div class="ch"><b>FITTING OUT · ${esc(st.name(p).toUpperCase())}</b><span class="dim">${how}</span></div><div class="stl"><span class="chips">${chips}</span>${sumStats(s) || stat('ROOMS', 'all empty')}</div>`
    + `<div class="acts"><button class="plate btn sm" data-oc="focus">FOCUS <small>F</small></button><button class="plate btn sm hl" data-oe="done">DONE <small>I</small></button></div>`, 'edit');
}
// with nothing chosen: the station at a glance, and the one thing most asked of the commander
function overCard() {
  const a = st.asks()[0], low = Object.keys(C.factions).filter((k) => st.roomOpen(C.factions[k].room));
  setCard(`<div class="ch"><b>STATION OVERVIEW · ${esc(C.tiers[st.tier].name.toUpperCase())}</b><span class="${a && a.urgent ? 'warn' : ''}">${st.requests.length ? `<b>${st.requests.length} on your desk.</b> ` : ''}${a ? `<b>${esc(a.text)}</b> <span class="dim">${esc(a.why)}</span>` : words('Pick a part below and tap a green ring to build it. Tap a part to fit out its rooms. The divisions do the rest.')}</span></div>`
    + `<div class="stl moods">${low.map((k) => stat(esc(C.factions[k].who.toUpperCase()), Math.round(st.sat[k]), st.sat[k] < C.faction.low ? 'bad' : st.sat[k] >= 65 ? 'ok' : 'warn')).join('')}</div>`
    + `<div class="acts"><button class="plate btn sm" data-oc="acc">ACCOUNTS</button><button class="plate btn sm" data-oc="cmdr">ORDERS <small>O</small></button></div>`, 'over');
}
// ---------------------------------------------------------------- BUILD MODE: the card for the part in hand
// It says where the part fits (the green rings), and, for the port pointed at or tapped, whether it fits there and why not.
// TURN tries the next way round that fits; BUILD builds at the chosen port (on a touch screen, tapping the ring again does too).
function card(force) {
  const el = $('th-sel'), d = C.parts[tool];
  let say, tone = '';
  if (hot && hotFit) {
    if (hotFit.ok) { say = view.touch ? 'Fits here. Press BUILD, or tap the ring again.' : 'Fits here. Click to build.'; tone = 'ok'; }
    else { say = `${hotFit.why}.`; tone = 'no'; }
  } else if (view.portFits == null) say = 'Finding where it fits…';
  else if (view.portFits) say = `Fits on ${view.portFits} of ${view.portKnown} free ports: the green rings.`;
  else { say = whyNowhere(); tone = 'no'; }
  const sig = `${tool}|${say}|${hot ? 1 : 0}|${hotFit && hotFit.ok}`;
  if (!force && sig === cardSig) return; cardSig = sig;
  el.classList.remove('hidden', 'ocard'); el.classList.add('build'); selSig = '';
  el.innerHTML = `<b>BUILD · ${esc(d.name)}</b><span class="cost">${d.cost} CR</span><span class="grow say ${tone}">${esc(say)}</span>` +
    `<button class="plate btn sm" data-ob="turn" title="R">TURN</button><button class="plate btn sm bgo" data-ob="go" ${hot && hotFit && hotFit.ok ? '' : 'disabled'}>BUILD</button><button class="plate btn sm" data-ob="x" title="Cancel (Esc)" aria-label="Cancel">×</button>`;
}
// Why the part fits nowhere: the reason most of the free ports give.
function whyNowhere() {
  const n = new Map();
  for (const fp of view.portList || []) if (fp.fit && !fp.fit.ok) { const w = fp.fit.why.replace(/It would run into .*/, 'It would run into another part'); n.set(w, (n.get(w) || 0) + 1); }
  const top = [...n].sort((a, b) => b[1] - a[1])[0];
  return top ? `Nowhere fits it yet. ${top[0]}.` : 'There is no free port to build on.';
}
function setHot(p) {
  if ((p && p.part) === (hot && hot.part) && (p && p.i) === (hot && hot.i)) return;
  hot = p || null; hotFit = hot ? view.setGhost(tool, hot, rot) : (view.setGhost(null, null, 0), null);
  portsDirty = true; card();
}
function turn() {
  if (!tool) return;
  const was = hot && hotFit ? where(hotFit.rot) : '';
  rot = ((hotFit ? hotFit.rot : rot) + 1) % 8;
  if (hot) hotFit = view.setGhost(tool, hot, rot);
  if (was && hotFit.ok && where(hotFit.rot) === was) app.toast('It only goes one way round here.');
  portsDirty = true; audio.click(); card(true);
}
// where the part in hand would sit on the hot port, turned so (to tell whether a turn changed anything)
function where(r) { const pl = st.placement(tool, st.parts.get(hot.part), hot.i, r); return pl.pos.map((x) => x.toFixed(2)) + '|' + pl.quat.map((x) => x.toFixed(3)); }
function buildHot() {
  if (!tool || !hot) return;
  const f = view.fitAt(tool, hot, rot), r = f.ok ? st.build(tool, hot.part, hot.i, f.rot) : f;
  if (r.ok) { audio.podLand(); hot = null; hotFit = null; view.setGhost(null, null, 0); portsDirty = true; card(true); }
  else { audio.deny(); app.toast(r.why || 'It will not fit there.'); }
}
function desk() {
  const sig = st.requests.map((r) => r.id).join(',');
  if (sig === deskSig) return; deskSig = sig;
  $('th-desk').innerHTML = st.requests.slice(0, innerWidth < 640 ? 1 : 3).map((r) => { const d = C.div[r.k] || { short: 'STATION' };
    return `<div class="plate amber req" data-id="${r.id}"><b>${esc(d.short || r.k)} · ${r.kind === 'dilemma' ? 'A MATTER OF PEOPLE' : r.kind === 'allot' ? 'ALLOTMENT' : 'REQUEST'}</b>${esc(r.text)}<div class="row">${r.options.map((o, i) => `<button class="plate btn sm" data-oa="${i}">${esc(o)}</button>`).join('')}</div></div>`; }).join('');
}
function drain() {
  for (const e of st.events) {
    switch (e.type) {
      case 'built': case 'auto': audio.podLand(); if (e.part && e.type === 'built') note(app.tutorial ? {} : { parts: 1 }, [['part', e.part.type]]); break;
      case 'crate': break;
      case 'comms': case 'order': {     // (0.76) into the comms log; while it is shut, the corner shows the line too
        const shown = P.radio(e.from, e.text, e.type === 'comms' ? e : {});
        if (!shown) { const d = C.div[e.from]; ui.feed(`${(d && d.short) || (e.from === 'office' ? 'HEAD OFFICE' : String(e.from || 'STATION').toUpperCase())}: ${e.text}`, e.warn ? 'warn' : 'radio'); }
        if (e.warn) audio.deny(); break;
      }
      case 'request': P.settled(e); deskSig = ''; desk(); break;
      case 'week': audio.objective(); if (!app.tutorial) note({ stationWeeks: 1 }); break;
      case 'raid':
        if (e.state === 'warn') { audio.siren(); ui.message(`${st.foe ? st.foe.name.toUpperCase() : 'RAIDERS'} INBOUND`, 4000); }
        else if (e.state === 'over') { if (e.hits.length) { audio.baseDown(); ui.message(`${st.foe ? st.foe.name.toUpperCase() : 'THE RAIDERS'} GOT THROUGH`, 4000); } else { audio.win(); ui.message('RAID DRIVEN OFF', 4000); } }
        break;
      case 'fire': try { view.fire(e); } catch { /* a shot not drawn */ } break;
      case 'tier': { audio.win(); if (!app.tutorial) best({ stationTier: e.tier }); ui.message(`${C.tiers[e.tier].name} STATUS GRANTED`, 5000); thumbs = {}; bar(true);
        const T = C.tiers[e.tier], u = st.unlocksOf(e.tier), nw = [...u.parts, ...u.rooms]; P.radio('office', `${T.name} status granted. The build zone grows to ${T.radius}.${nw.length ? ` New: ${nw.join(', ')}.` : ''}`, { gold: true }); break; }
      default:
    }
  }
  st.events.length = 0;
}
function setTool(t) {
  if (t && !st.partOpen(t)) { audio.deny(); return; }
  if (edit) endEdit();
  tool = tool === t ? null : t; hot = null; hotFit = null; sel = null; person = 0; follow = 0; view.select(null);
  view.setGhost(null, null, 0);
  if (tool) portsDirty = true; else view.showPorts(null);
  selBar(); audio.click(); bar(true); stats();
}
// x, y: where on the page (client coordinates, as the view's picking takes them)
function click(x, y) {
  if (tool) {
    const p = view.pickPort(x, y, view.touch ? 64 : 56);
    if (!p) { if (view.touch) setHot(null); return; }
    // a touch screen has no pointer to hover with: the first tap chooses the port and shows the part there, the second builds
    if (view.touch && !(hot && hot.part === p.part && hot.i === p.i)) { setHot(p); return; }
    setHot(p); buildHot();
    return;
  }
  if (edit) { editClick(x, y); return; }
  // a person first (they are small), then a part; tapping the same person again follows them
  const who = view.pickAgent(x, y);
  if (who) { if (person === who && follow !== who) setFollow(who); else { person = who; follow = 0; sel = null; view.select(null); audio.click(); } P.hideTip(); selBar(); return; }
  const id = view.pickPart(x, y); sel = id || null; person = 0; follow = 0; view.select(sel); if (sel) audio.click(); selBar();
}
function setFollow(id) {
  audio.click(); follow = id; if (!id) { selBar(); return; }
  person = id; sel = null; view.select(null);
  if (vmode === 'hull' && !inside && !cut) { inside = true; view.setOpen(true); tabs(); }      // so they can be seen
  const a = st.agents.find((x) => x.id === id); if (a) { view.lookAtAgent(a); view.closeIn(1.8); }
  selBar();
}
function pickPerson(id) { person = id; follow = 0; sel = null; view.select(null); selBar(); }
// with a mouse and nothing in hand: who or what is under the pointer; fitting out: which room
function hover(x, y) {
  if (edit) {
    const hit = view.pickSlot(x, y);
    view.setSlotHot(hit || (slot != null ? { part: edit, slot } : null));
    if (!hit) { P.hideTip(); return; }
    const p = st.parts.get(hit.part), R = C.rooms[p.rooms[hit.slot] || 'empty'];
    let line = 'Pick a room below to build here';
    if (room) { const chk = st.canRoom(hit.part, hit.slot, room); line = chk.ok ? `Click: make it a ${esc(C.rooms[room].name)} · ${C.rooms[room].cost} CR` : `<span class="bad">${esc(chk.why)}</span>`; }
    P.tipAt(x, y, `<b>Room ${hit.slot + 1} · ${esc(R.name)}</b><br>${line}`); return;
  }
  const who = view.pickAgent(x, y), pa = who && st.agents.find((a) => a.id === who);
  if (pa) { P.tipAt(x, y, `<b>${esc(pa.name)}</b> · ${ROLE_ONE[pa.role] || 'Resident'}<br>${esc(st.doing(pa))}`); return; }
  const id = view.pickPart(x, y);
  if (id) { const p = st.parts.get(id); P.tipAt(x, y, `<b>${esc(st.name(p))}</b>${p.state === 'building' ? ' · building' : p.state === 'demolish' ? ' · coming down' : p.fault ? ' · <span class="bad">fault</span>' : ''}`); }
  else P.hideTip();
}
function demolish() {
  const p = sel && st.parts.get(sel); if (!p || C.parts[p.type].fixed) return;
  const r = st.demolish(sel); if (r && r.ok === false) { audio.deny(); app.toast(r.why || 'Something is still attached to it.'); } else { audio.baseDown(); sel = null; view.select(null); selBar(); }
}
// (0.76) the dock, the cards and the views shift so nothing lies on top of anything
function layout() {
  const el = $('op'); if (!el) return;
  el.classList.toggle('float', P.floatOpen); el.classList.toggle('comms', P.commsOn);
  $('th-desk').classList.toggle('op-comms', P.commsOn);
}
function bind() {
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { view.touch = e.pointerType === 'touch'; down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => { if (!down || mode.off) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (d < 7 && e.button === 0) click(e.clientX, e.clientY); });
  // with a mouse, the port nearest the pointer is the one in hand: the part shows there before anything is built
  canvas.addEventListener('pointermove', (e) => { if (mode.off || e.pointerType === 'touch') return; view.touch = false; px = e.clientX; py = e.clientY; if (tool && !down) setHot(view.pickPort(px, py)); else if (!tool && !e.buttons) hover(px, py); });
  canvas.addEventListener('pointerleave', (e) => { if (mode.off || e.pointerType === 'touch') return; px = py = null; if (tool) setHot(null); P.hideTip(); });
  // (0.76) the readouts on the top bar: hover for where it comes from, click for the accounts; TIER opens the upgrade path
  $('th-stats').addEventListener('pointermove', (e) => { if (mode.off || e.pointerType === 'touch') return; const t = e.target.closest('[data-act^="acc-"]'); if (t) P.readoutTip(t.dataset.act.slice(4), e.clientX, 60); else P.hideTip(); });
  $('th-stats').addEventListener('pointerleave', () => { if (!mode.off) P.hideTip(); });
  $('th-stats').addEventListener('click', (e) => { if (mode.off) return; const t = e.target.closest('[data-act]'); if (!t) return; if (t.dataset.act === 'upg') P.upg(); else if (t.dataset.act.startsWith('acc-')) P.openLedger(t.dataset.act.slice(4)); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  $('s-theatre').addEventListener('click', (e) => {
    if (mode.off) return;
    const t = e.target.closest('[data-og],[data-op],[data-oa],[data-od],[data-ox],[data-ov],[data-ob],[data-or],[data-oe],[data-os],[data-oc],[data-vw]'); if (!t) return;
    const d = t.dataset;
    if (d.vw) { setView(d.vw); return; }
    if (d.or) { room = room === d.or && slot == null ? null : d.or; if (slot != null && room) paint(edit, slot); else audio.click(); bar(true); selBar(true); return; }
    if (d.oe) { audio.click(); endEdit(); return; }
    if (d.os != null) { const i = +d.os; slot = slot === i ? null : i; if (slot != null && room) paint(edit, slot); view.setSlotHot(slot != null ? { part: edit, slot } : null); audio.click(); selBar(true); return; }
    if (d.oc) { if (d.oc === 'focus') { if (edit) view.focus(edit, true); else if (sel) view.focus(sel); } else if (d.oc === 'edit') startEdit(sel); else if (d.oc === 'follow') setFollow(follow === person ? 0 : person); else if (d.oc === 'acc') P.openLedger('asks'); else if (d.oc === 'cmdr') P.cmdr(); return; }
    if (d.ob) { if (d.ob === 'turn') turn(); else if (d.ob === 'go') buildHot(); else if (tool) setTool(tool); }
    else if (d.og) { group = d.og; audio.click(); tabs(); bar(true); }
    else if (d.op) setTool(d.op);
    else if (d.oa != null) { const id = +t.closest('.req').dataset.id, r = st.answer(id, +d.oa); if (r && r.ok === false) { audio.deny(); if (r.why) app.toast(r.why); } else audio.click(); deskSig = ''; desk(); }
    else if (d.od) demolish();
    else if (d.ox) { sel = null; person = 0; follow = 0; view.select(null); selBar(); }
    else if (d.ov) { viewsOpen = !viewsOpen; audio.click(); tabs(); }
  });
  window.addEventListener('keydown', (e) => { if (mode.off || e.target.tagName === 'INPUT') return; const a = KB.actionOf(e.code);     /* (GC 0.73) the player's own keys (js/core/binds.js) */
    if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('#menu:not([hidden]), #modal:not([hidden])')) return;
    // Esc steps back one thing at a time: the views, a panel, the room in hand, fitting out, the part in hand, a choice; then the menu
    if (e.code === 'Escape') {
      const did = viewsOpen ? (viewsOpen = false, tabs(), 1) : P.floatOpen ? (P.closeFloat(), 1) : edit ? (room ? (room = null, bar(true), selBar(true)) : endEdit(), 1) : tool ? (setTool(tool), 1) : (sel || person) ? (sel = null, person = 0, follow = 0, view.select(null), selBar(), 1) : 0;
      if (did) { e.stopImmediatePropagation(); e.preventDefault(); } return;
    }
    if (e.code === 'Tab') { e.preventDefault(); if (edit) return; const i = C.groups.findIndex((g) => g.id === group), k = C.groups.length; group = C.groups[(i + (e.shiftKey ? k - 1 : 1)) % k].id; audio.click(); tabs(); bar(true); return; }
    const dn = /^(Digit|Numpad)([1-9])$/.exec(e.code);
    if (dn && !edit) { const list = partsOf(group), t = list[+dn[2] - 1]; if (t) setTool(t); return; }
    if (FLY.has(a)) { held.add(a); e.preventDefault(); return; }
    if (a === 'rotate') turn(); else if (a === 'build' && tool && hot) { e.preventDefault(); buildHot(); } else if (a === 'pause') { e.preventDefault(); $('th-pause').click(); }
    else if (a === 'commander') P.cmdr(); else if (a === 'upgrades') P.upg(); else if (a === 'comms') P.comms(!P.commsOn);
    else if (a === 'fitout') { if (edit) endEdit(); else if (sel) startEdit(sel); }
    else if (a === 'demolish') demolish();
    else if (a === 'focus') { if (sel) view.focus(sel); else if (person) setFollow(follow === person ? 0 : person); }
    else if (a === 'view') setView({ hull: 'blueprint', blueprint: 'life', life: 'hull' }[vmode]);
    else if (a === 'inside') setView('inside'); else if (a === 'cutaway') setView('cut'); else if (a === 'dots') setView('dots');
    else if (a === 'slower' || a === 'faster') { const S = ui.speeds, i = S.indexOf(ui.speed); ui.speed = S[Math.max(0, Math.min(S.length - 1, i + (a === 'faster' ? 1 : -1)))]; $('th-speed').textContent = `${ui.speed === 0.5 ? '½' : ui.speed}×`; audio.click(); }
  }, true);
  window.addEventListener('keyup', (e) => { const a = KB.actionOf(e.code); if (a) held.delete(a); });
  window.addEventListener('blur', () => held.clear());
  new ResizeObserver(() => { if (!mode.off && view) view.resize(); }).observe($('th-stage'));
}

// ---------------------------------------------------------------- the mode
const mode = {
  off: true,
  init(a, frame) {
    app = a; ui = frame; audio = a.audio; canvas = $('v-orbit');
    P = makePanels({ audio, toast: (t) => app.toast(t), st: () => st, view: () => view, pickPerson, layout: () => layout(), changed: () => { deskSig = ''; desk(); selBar(); } });
    P.mount($('th-stage')); P.show(false);
  },
  settings(s) { if (view) view.setQuality(s.quality || 'auto'); },     // (GC 0.75) OPTIONS changed while the post is open
  async enter(a) {
    args = a; mode.off = false;
    const sys = a.system, saved = app.siteLoad('orbit', sys.id);
    let loaded = null; try { loaded = saved ? Station.load(saved) : null; } catch (err) { console.error(err); }
    st = loaded || new Station(1000 + sys.id * 37 + ((app.camp.war && app.camp.war.seed) || 0) % 1000, 'run');
    if (!loaded && !app.tutorial) st.credits += upgrade('grant');     // (GC 0.69) the STORE's docking grant
    st.faction = stationFaction(sys); st._noAdvice = !app.settings.hints || app.tutorial; st.foe = foeOf(sys);     // (0.76) the divisions' advice, on the comms, follows HINTS
    await ensureLogo(st.faction.logo);
    if (!view) { view = new View(canvas, st); bind(); }
    view.setQuality(app.settings.quality || 'auto');     // (GC 0.75) GRAPHICS, in OPTIONS
    view.setStation(st); view.setFoe(st.foe);
    st.livery = { ...C.livery.def, ...(st.livery || {}), ...livery(st.faction) };
    try { view.setFaction(st.faction); view.setLivery(st.livery); } catch (err) { console.error(err); }
    view.newSky(st.seed); view.controls.autoRotate = false;
    inside = false; vmode = 'hull'; view.setOpen(false); view.setMode('hull'); view.resize(); view.frame();
    acc = 0; tool = null; hot = null; hotFit = null; rot = 0; sel = null; barSig = ''; deskSig = ''; cardSig = ''; thumbs = {}; saveT = 20; group = 'structure';
    person = 0; follow = 0; edit = null; room = null; slot = null; cut = false; dots = true; viewsOpen = false; selSig = ''; held.clear();
    view.setCutaway(false); view.portMode = 'near'; view.editPart(null);
    ui.speeds = [0.5, 1, 2, 4, 8];     // (0.76) half speed to watch people work, up to 8× to get on
    P.reset(); P.show(true); layout();
    view.showPorts(null); view.setGhost(null, null, 0);
    $('th-where').textContent = st.faction.station;
    tabs(); bar(true); stats(); desk(); selBar();
    tut0 = st.parts.size; tut = app.tutorial || (!loaded && app.settings.hints && !guideSeen(TUT_KEY)) ? makeGuide(TUT, { key: TUT_KEY, tutorial: app.tutorial, words, audio, exit: () => app.leavePost() }) : null; if (tut) tut.tick(); else { const co = $('th-coach'); if (co) co.hidden = true; }
    if (!loaded) { const gr = app.grant('s_grant'); if (gr) st.credits += gr; }
    if (!loaded) { ui.message('A NEW STATION', 2600); P.radio('office', `Welcome aboard, Commander. ${st.faction.station} is yours, with an Outpost permit and ${Math.round(st.credits).toLocaleString('en-US')} CR. Start with a gun from FIRE SUPPORT, a Docking Port, and somewhere to put the cargo.`); P.radio('office', 'Lay the station out, then let your people at it. They will change it to suit themselves, and only trouble will reach your desk. The accounts are under COMMANDER.', { dim: true }); }
    else P.radio('office', `Welcome back, Commander. Week ${st.week()}, day ${st.dow()}.`);
  },
  store() { if (st && args) app.siteSave('orbit', args.system.id, st.save()); },
  report() { let net = 0; try { net = st.ledger().credits.net; } catch { /* no accounts yet */ } return { air: Math.min(5, [...st.parts.values()].filter((p) => p.state !== 'building' && C.parts[p.type] && C.parts[p.type].group === 'comms').length), profit: net > 0.05, net, level: Math.min(4, st.tier + 1), tier: C.tiers[st.tier].name, cap: st.capability() }; },
  leave() {
    mode.store(); mode.off = true; if (tut) tut.hide(); tut = null; tool = null; hot = null; hotFit = null; view.showPorts(null); view.setGhost(null, null, 0);
    if (edit) { view.editPart(null); edit = null; } person = 0; follow = 0; held.clear(); P.show(false); ui.speeds = [1, 2, 4]; $('th-sel').classList.remove('ocard'); $('th-desk').classList.remove('op-comms');
  },
  frame(dt, now, real) {
    if (!st) return;
    if (dt > 0) {
      acc += dt; let n = 0;
      try { while (acc >= STEP && n++ < 24) { st.step(STEP); acc -= STEP; } } catch (err) { console.error(err); acc = 0; }
      if (n >= 24) acc = 0;
    }
    drain();
    view.sync(now, real);
    // (0.76) the camera: flown by the keys, or kept on the person being followed (a camera key lets go of them)
    if (held.size) { const h = (k) => (held.has(k) ? 1 : 0); view.fly(h('flyFwd') - h('flyBack'), h('flyRight') - h('flyLeft'), 0, h('turnRight') - h('turnLeft'), real); if (follow && ['flyFwd', 'flyBack', 'flyLeft', 'flyRight'].some((k) => held.has(k))) { follow = 0; selBar(); } }
    if (follow) { const a = st.agents.find((x) => x.id === follow); if (!a || !view.follow(a, real)) { follow = 0; selBar(); } }
    P.tick(real, now);
    if (tool) {
      if (portsDirty) {      // the marks are redrawn when something changed; fits still to be worked out carry on next frame
        portsDirty = view.showPorts(tool, rot, hot);
        if (hot) { if (!st.parts.has(hot.part) || st.parts.get(hot.part).used.has(hot.i)) setHot(null); else hotFit = view.setGhost(tool, hot, rot); }
        card();
      }
      view.facePorts();
    }
    view.render(now);
    if ((hudT -= real) <= 0) { hudT = 0.3; bar(); stats(); desk(); if (tool) portsDirty = true; else selBar(); P.hud(); if (tut) tut.tick(); }
    if ((saveT -= real) <= 0) { saveT = 20; mode.store(); }
  },
  get station() { return st; }, get view() { return view; },
};
export default mode;
