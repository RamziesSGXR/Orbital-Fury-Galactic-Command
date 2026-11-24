// ORBIT: the station over a system you hold. The rules and the 3D are Super Orbital Simulator's (js/orbit); this file
// is how the commander meets them inside Galactic Command: one station for each system, built from the shared tool bar,
// its people's requests on the shared desk, and its tier reported back to the map (a harder system to take, cheaper ships).
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

// THE ENEMY OVER THIS STATION: raids come from the war's own enemies, not nameless raiders. A system on a front is raided by
// that front's enemy; the capital, by one of the three. An enemy the war has destroyed raids no more (another takes its place),
// and once all three are gone the raiders are nameless again.
function foeOf(sys) {
  const F = (app.camp && app.camp.war && app.camp.war.F) || {}, alive = GC.factions.filter((f) => !(F[f] && F[f].state === 'dead'));
  if (!alive.length) return null;
  const own = sys.front >= 0 && GC.fronts[sys.front] ? GC.fronts[sys.front].f : null, f = own && alive.includes(own) ? own : alive[sys.id % alive.length];
  return { id: f, name: GC.names.factions[f], color: GC.color[f] };
}
const stationFaction = (sys) => ({ ...structuredClone(C.founding.def), ...structuredClone(app.faction), station: `${sys.name} Station` });
// (0.66) the livery every game wears: the hull and trim, the accent, the finish and the lights (a soft wash of the glow colour)
const soft = (c) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(c.substr(i, 2), 16) * 0.45 + 255 * 0.55).toString(16).padStart(2, '0')).join('');
const livery = (f) => ({ ...C.livery.def, hull: f.primary, trim: f.secondary, ...(f.livery ? { accent: f.livery.accent, plating: f.livery.finish, ...(/^#[0-9a-f]{6}$/i.test(f.livery.glow || '') ? { lights: soft(f.livery.glow) } : {}) } : {}) });

// ---------------------------------------------------------------- the shared frame
function tabs() {
  $('th-tabs').innerHTML = C.groups.map((g) => `<button data-og="${g.id}" class="${g.id === group ? 'on' : ''}">${SHORT[g.id] || g.name}</button>`).join('') +
    `<button data-ov="view">${inside ? 'VIEW: INSIDE' : vmode === 'blueprint' ? 'VIEW: BLUEPRINT' : 'VIEW: HULL'}</button>`;
}
function thumb(t) { if (!(t in thumbs)) { try { thumbs[t] = view.thumb(t) || ''; } catch { thumbs[t] = ''; } } return thumbs[t]; }
function bar(force) {
  const html = partsOf(group).map((t) => {
    const d = C.parts[t], open = st.partOpen(t), poor = st.credits < d.cost, pic = thumb(t);
    return `<button class="plate btn tool pic${tool === t ? ' on' : ''}" data-op="${t}" ${open ? '' : 'disabled'}>${pic ? `<img src="${pic}" alt="">` : ''}<div><b>${esc(d.name)}</b><span${poor && open ? ' class="rd2"' : ''}>${open ? d.cost + ' CR' : C.tiers[d.tier].name}</span></div></button>`;
  }).join('');
  if (force || html !== barSig) { barSig = html; $('th-bar').innerHTML = html; }
}
function stats() {
  const n = st.next(), mo = Math.round(st.morale);
  ui.stats([{ k: 'CREDITS', v: Math.round(st.credits).toLocaleString('en-US'), tone: 'a' }, { k: 'CAPABILITY', v: st.capability() }, { k: 'POWER', v: `${st.demand}/${st.supply}`, tone: st.eff < 1 ? 'r' : '' },
    { k: 'PEOPLE', v: `${st.residents()}/${st.beds()}` }, { k: 'MORALE', v: mo, tone: mo < 35 ? 'r' : '' }, { k: `WEEK ${st.week()}`, v: `D${st.dow()}` }, { k: 'TIER', v: C.tiers[st.tier].name }]);
  let tip = '';
  if (tool) tip = hot ? '' : words(`${C.parts[tool].name}: tap a green ring to place it.`);
  else if (n) tip = `NEXT · ${n.name}: ` + n.items.map((i) => `${i.label} ${i.have}/${i.need}`).join(' · ');
  ui.tip(tip);
}
function selBar() {
  if (tool) { card(true); return; }
  const el = $('th-sel'), p = sel && st.parts.get(sel);
  el.classList.toggle('hidden', !p); el.classList.remove('build'); cardSig = '';
  if (!p) return;
  const d = C.parts[p.type];
  el.innerHTML = `<b>${esc(st.name(p))}</b><span class="grow dim">${esc(d.about || '')}</span>${d.fixed ? '' : '<button class="plate btn sm" data-od="1">DEMOLISH</button>'}<button class="plate btn sm" data-ox="1">×</button>`;
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
  el.classList.remove('hidden'); el.classList.add('build');
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
      case 'comms': case 'order': { const d = C.div[e.from]; ui.feed(`${(d && d.short) || String(e.from || 'STATION').toUpperCase()}: ${e.text}`, e.warn ? 'warn' : 'radio'); if (e.warn) audio.deny(); break; }
      case 'week': audio.objective(); if (!app.tutorial) note({ stationWeeks: 1 }); break;
      case 'raid':
        if (e.state === 'warn') { audio.siren(); ui.message(`${st.foe ? st.foe.name.toUpperCase() : 'RAIDERS'} INBOUND`, 4000); }
        else if (e.state === 'over') { if (e.hits.length) { audio.baseDown(); ui.message(`${st.foe ? st.foe.name.toUpperCase() : 'THE RAIDERS'} GOT THROUGH`, 4000); } else { audio.win(); ui.message('RAID DRIVEN OFF', 4000); } }
        break;
      case 'fire': try { view.fire(e); } catch { /* a shot not drawn */ } break;
      case 'tier': audio.win(); if (!app.tutorial) best({ stationTier: e.tier }); ui.message(`${C.tiers[e.tier].name} STATUS GRANTED`, 5000); thumbs = {}; bar(true); break;
      default:
    }
  }
  st.events.length = 0;
}
function setTool(t) {
  if (t && !st.partOpen(t)) { audio.deny(); return; }
  tool = tool === t ? null : t; hot = null; hotFit = null; sel = null; view.select(null);
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
  const id = view.pickPart(x, y); sel = id || null; view.select(sel); if (sel) audio.click(); selBar();
}
function bind() {
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { view.touch = e.pointerType === 'touch'; down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => { if (!down || mode.off) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (d < 7 && e.button === 0) click(e.clientX, e.clientY); });
  // with a mouse, the port nearest the pointer is the one in hand: the part shows there before anything is built
  canvas.addEventListener('pointermove', (e) => { if (mode.off || e.pointerType === 'touch') return; view.touch = false; px = e.clientX; py = e.clientY; if (tool && !down) setHot(view.pickPort(px, py)); });
  canvas.addEventListener('pointerleave', (e) => { if (mode.off || e.pointerType === 'touch') return; px = py = null; if (tool) setHot(null); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  $('s-theatre').addEventListener('click', (e) => {
    if (mode.off) return;
    const t = e.target.closest('[data-og],[data-op],[data-oa],[data-od],[data-ox],[data-ov],[data-ob]'); if (!t) return;
    const d = t.dataset;
    if (d.ob) { if (d.ob === 'turn') turn(); else if (d.ob === 'go') buildHot(); else if (tool) setTool(tool); }
    else if (d.og) { group = d.og; audio.click(); tabs(); bar(true); }
    else if (d.op) setTool(d.op);
    else if (d.oa != null) { const id = +t.closest('.req').dataset.id, r = st.answer(id, +d.oa); if (r && r.ok === false) { audio.deny(); if (r.why) app.toast(r.why); } else audio.click(); deskSig = ''; desk(); }
    else if (d.od) { const r = st.demolish(sel); if (r && r.ok === false) { audio.deny(); app.toast(r.why || 'Something is still attached to it.'); } else { audio.baseDown(); sel = null; view.select(null); selBar(); } }
    else if (d.ox) { sel = null; view.select(null); selBar(); }
    else if (d.ov) { // HULL -> INSIDE -> BLUEPRINT
      if (!inside && vmode === 'hull') { inside = true; view.setOpen(true); } else if (inside) { inside = false; view.setOpen(false); vmode = 'blueprint'; view.setMode('blueprint'); } else { vmode = 'hull'; view.setMode('hull'); }
      audio.click(); tabs();
    }
  });
  window.addEventListener('keydown', (e) => { if (mode.off || e.target.tagName === 'INPUT') return; const a = KB.actionOf(e.code);     /* (GC 0.73) the player's own keys (js/core/binds.js) */
    if (a === 'rotate') turn(); else if (a === 'build' && tool && hot) { e.preventDefault(); buildHot(); } else if (e.code === 'Escape' && tool) { e.stopImmediatePropagation(); setTool(tool); } else if (a === 'pause') { e.preventDefault(); $('th-pause').click(); } }, true);
  new ResizeObserver(() => { if (!mode.off && view) view.resize(); }).observe($('th-stage'));
}

// ---------------------------------------------------------------- the mode
const mode = {
  off: true,
  init(a, frame) { app = a; ui = frame; audio = a.audio; canvas = $('v-orbit'); },
  async enter(a) {
    args = a; mode.off = false;
    const sys = a.system, saved = app.siteLoad('orbit', sys.id);
    let loaded = null; try { loaded = saved ? Station.load(saved) : null; } catch (err) { console.error(err); }
    st = loaded || new Station(1000 + sys.id * 37 + ((app.camp.war && app.camp.war.seed) || 0) % 1000, 'run');
    if (!loaded && !app.tutorial) st.credits += upgrade('grant');     // (GC 0.69) the STORE's docking grant
    st.faction = stationFaction(sys); st._noAdvice = true; st.foe = foeOf(sys);
    await ensureLogo(st.faction.logo);
    if (!view) { view = new View(canvas, st); bind(); }
    view.setStation(st); view.setFoe(st.foe);
    st.livery = { ...C.livery.def, ...(st.livery || {}), ...livery(st.faction) };
    try { view.setFaction(st.faction); view.setLivery(st.livery); } catch (err) { console.error(err); }
    view.newSky(st.seed); view.controls.autoRotate = false;
    inside = false; vmode = 'hull'; view.setOpen(false); view.setMode('hull'); view.resize(); view.frame();
    acc = 0; tool = null; hot = null; hotFit = null; rot = 0; sel = null; barSig = ''; deskSig = ''; cardSig = ''; thumbs = {}; saveT = 20; group = 'structure';
    view.showPorts(null); view.setGhost(null, null, 0);
    $('th-where').textContent = st.faction.station;
    tabs(); bar(true); stats(); desk(); selBar();
    tut0 = st.parts.size; tut = app.tutorial || (!loaded && app.settings.hints && !guideSeen(TUT_KEY)) ? makeGuide(TUT, { key: TUT_KEY, tutorial: app.tutorial, words, audio, exit: () => app.leavePost() }) : null; if (tut) tut.tick(); else { const co = $('th-coach'); if (co) co.hidden = true; }
    if (!loaded) { const gr = app.grant('s_grant'); if (gr) st.credits += gr; }
    if (!loaded) { ui.message('A NEW STATION', 2600); ui.feed('HEAD OFFICE: Lay the station out, then let its people at it. Only trouble will reach your desk.', 'radio'); }
    else ui.feed(`HEAD OFFICE: Welcome back, Commander. Week ${st.week()}, day ${st.dow()}.`, 'radio');
  },
  store() { if (st && args) app.siteSave('orbit', args.system.id, st.save()); },
  report() { let net = 0; try { net = st.ledger().credits.net; } catch { /* no accounts yet */ } return { air: Math.min(5, [...st.parts.values()].filter((p) => p.state !== 'building' && C.parts[p.type] && C.parts[p.type].group === 'comms').length), profit: net > 0.05, net, level: Math.min(4, st.tier + 1), tier: C.tiers[st.tier].name, cap: st.capability() }; },
  leave() { mode.store(); mode.off = true; if (tut) tut.hide(); tut = null; tool = null; hot = null; hotFit = null; view.showPorts(null); view.setGhost(null, null, 0); },
  frame(dt, now, real) {
    if (!st) return;
    if (dt > 0) {
      acc += dt; let n = 0;
      try { while (acc >= STEP && n++ < 24) { st.step(STEP); acc -= STEP; } } catch (err) { console.error(err); acc = 0; }
      if (n >= 24) acc = 0;
    }
    drain();
    view.sync(now, real);
    if (tool) {
      if (portsDirty) {      // the marks are redrawn when something changed; fits still to be worked out carry on next frame
        portsDirty = view.showPorts(tool, rot, hot);
        if (hot) { if (!st.parts.has(hot.part) || st.parts.get(hot.part).used.has(hot.i)) setHot(null); else hotFit = view.setGhost(tool, hot, rot); }
        card();
      }
      view.facePorts();
    }
    view.render(now);
    if ((hudT -= real) <= 0) { hudT = 0.3; bar(); stats(); desk(); if (tool) portsDirty = true; if (tut) tut.tick(); }
    if ((saveT -= real) <= 0) { saveT = 20; mode.store(); }
  },
  get station() { return st; }, get view() { return view; },
};
export default mode;
