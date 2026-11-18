// ORBIT: the station over a system you hold. The rules and the 3D are Super Orbital Simulator's (js/orbit); this file
// is how the commander meets them inside Galactic Command: one station for each system, built from the shared tool bar,
// its people's requests on the shared desk, and its tier reported back to the map (a harder system to take, cheaper ships).
import { C } from '../orbit/config.js';
import { Station } from '../orbit/sim.js';
import { View } from '../orbit/view.js';
import { ensureLogo } from '../orbit/logo.js';
import { words } from '../core/words.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const STEP = 1 / 30;
const partsOf = (g) => Object.keys(C.parts).filter((t) => C.parts[t].group === g && !C.parts[t].fixed);
const SHORT = { platform: 'FIRE SUPPORT', structure: 'STRUCTURE', habitation: 'HABITATION', docking: 'DOCKING', industry: 'INDUSTRY', power: 'POWER', defence: 'DEFENCE', comms: 'COMMS' };

let app, ui, audio, canvas, view = null, st = null, args = null;
let acc = 0, group = 'structure', tool = null, rot = 0, hot = null, px = null, py = null, portsDirty = false, sel = null, vmode = 'hull', inside = false;
let barSig = '', deskSig = '', saveT = 20, hudT = 0, thumbs = {};

const stationFaction = (sys) => ({ ...structuredClone(C.founding.def), ...structuredClone(app.faction), station: `${sys.name} Station` });
const livery = (f) => ({ ...C.livery.def, hull: f.primary, trim: f.secondary });

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
  if (tool) tip = words(`${C.parts[tool].name}: tap a glowing port to place it.`);
  else if (n) tip = `NEXT · ${n.name}: ` + n.items.map((i) => `${i.label} ${i.have}/${i.need}`).join(' · ');
  ui.tip(tip);
}
function selBar() {
  const el = $('th-sel'), p = sel && st.parts.get(sel);
  el.classList.toggle('hidden', !p);
  if (!p) return;
  const d = C.parts[p.type];
  el.innerHTML = `<b>${esc(st.name(p))}</b><span class="grow dim">${esc(d.about || '')}</span>${d.fixed ? '' : '<button class="plate btn sm" data-od="1">DEMOLISH</button>'}<button class="plate btn sm" data-ox="1">×</button>`;
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
      case 'built': case 'auto': audio.podLand(); break;
      case 'crate': break;
      case 'comms': case 'order': { const d = C.div[e.from]; ui.feed(`${(d && d.short) || String(e.from || 'STATION').toUpperCase()}: ${e.text}`, e.warn ? 'warn' : 'radio'); if (e.warn) audio.deny(); break; }
      case 'week': audio.objective(); break;
      case 'raid':
        if (e.state === 'warn') { audio.siren(); ui.message('RAIDERS INBOUND', 4000); }
        else if (e.state === 'over') { if (e.hits.length) { audio.baseDown(); ui.message('THE RAIDERS GOT THROUGH', 4000); } else { audio.win(); ui.message('RAID DRIVEN OFF', 4000); } }
        break;
      case 'fire': try { view.fire(e); } catch { /* a shot not drawn */ } break;
      case 'tier': audio.win(); ui.message(`${C.tiers[e.tier].name} STATUS GRANTED`, 5000); thumbs = {}; bar(true); break;
      default:
    }
  }
  st.events.length = 0;
}
function setTool(t) {
  if (t && !st.partOpen(t)) { audio.deny(); return; }
  tool = tool === t ? null : t; hot = null; sel = null; view.select(null); selBar();
  view.setGhost(null, null, 0);
  if (tool) portsDirty = true; else view.showPorts(null);
  audio.click(); bar(true); stats();
}
function click(x, y) {
  if (tool) {
    const p = view.pickPort(x, y); if (!p) return;
    if (view.touch && !(hot && hot.part === p.part && hot.i === p.i)) { hot = p; view.setGhost(tool, p, rot); portsDirty = true; ui.tip('Tap the same port again to build.'); return; }
    const r = st.build(tool, p.part, p.i, rot);
    if (r.ok) { audio.podLand(); hot = null; view.setGhost(null, null, 0); portsDirty = true; } else { audio.deny(); app.toast(r.why || 'It will not fit there.'); }
    return;
  }
  const id = view.pickPart(x, y); sel = id || null; view.select(sel); if (sel) audio.click(); selBar();
}
function bind() {
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { view.touch = e.pointerType === 'touch'; down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => { if (!down || mode.off) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (d < 7 && e.button === 0) { const r = canvas.getBoundingClientRect(); click(e.clientX - r.left, e.clientY - r.top); } });
  canvas.addEventListener('pointermove', (e) => { if (mode.off) return; const r = canvas.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; if (tool) portsDirty = true; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  $('s-theatre').addEventListener('click', (e) => {
    if (mode.off) return;
    const t = e.target.closest('[data-og],[data-op],[data-oa],[data-od],[data-ox],[data-ov]'); if (!t) return;
    const d = t.dataset;
    if (d.og) { group = d.og; audio.click(); tabs(); bar(true); }
    else if (d.op) setTool(d.op);
    else if (d.oa != null) { const id = +t.closest('.req').dataset.id, r = st.answer(id, +d.oa); if (r && r.ok === false) { audio.deny(); if (r.why) app.toast(r.why); } else audio.click(); deskSig = ''; desk(); }
    else if (d.od) { const r = st.demolish(sel); if (r && r.ok === false) { audio.deny(); app.toast(r.why || 'Something is still attached to it.'); } else { audio.baseDown(); sel = null; view.select(null); selBar(); } }
    else if (d.ox) { sel = null; view.select(null); selBar(); }
    else if (d.ov) { // HULL -> INSIDE -> BLUEPRINT
      if (!inside && vmode === 'hull') { inside = true; view.setOpen(true); } else if (inside) { inside = false; view.setOpen(false); vmode = 'blueprint'; view.setMode('blueprint'); } else { vmode = 'hull'; view.setMode('hull'); }
      audio.click(); tabs();
    }
  });
  window.addEventListener('keydown', (e) => { if (mode.off || e.target.tagName === 'INPUT') return; if (e.key === 'r' || e.key === 'R') { rot = (rot + 1) % 4; if (tool && hot) view.setGhost(tool, hot, rot); portsDirty = true; } else if (e.key === 'Escape' && tool) { e.stopImmediatePropagation(); setTool(tool); } else if (e.key === ' ') { e.preventDefault(); $('th-pause').click(); } }, true);
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
    st.faction = stationFaction(sys); st._noAdvice = true;
    await ensureLogo(st.faction.logo);
    if (!view) { view = new View(canvas, st); bind(); }
    view.setStation(st);
    st.livery = { ...C.livery.def, ...(st.livery || {}), ...livery(st.faction) };
    try { view.setFaction(st.faction); view.setLivery(st.livery); } catch (err) { console.error(err); }
    view.newSky(st.seed); view.controls.autoRotate = false;
    inside = false; vmode = 'hull'; view.setOpen(false); view.setMode('hull'); view.resize(); view.frame();
    acc = 0; tool = null; hot = null; sel = null; barSig = ''; deskSig = ''; thumbs = {}; saveT = 20; group = 'structure';
    $('th-where').textContent = st.faction.station;
    tabs(); bar(true); stats(); desk(); selBar();
    if (!loaded) { const gr = app.grant('s_grant'); if (gr) st.credits += gr; }
    if (!loaded) { ui.message('A NEW STATION', 2600); ui.feed('HEAD OFFICE: Lay the station out, then let its people at it. Only trouble will reach your desk.', 'radio'); }
    else ui.feed(`HEAD OFFICE: Welcome back, Commander. Week ${st.week()}, day ${st.dow()}.`, 'radio');
  },
  store() { if (st && args) app.siteSave('orbit', args.system.id, st.save()); },
  report() { let net = 0; try { net = st.ledger().credits.net; } catch { /* no accounts yet */ } return { profit: net > 0.05, net, level: Math.min(4, st.tier + 1), tier: C.tiers[st.tier].name, cap: st.capability() }; },
  leave() { mode.store(); mode.off = true; view.showPorts(null); view.setGhost(null, null, 0); },
  frame(dt, now, real) {
    if (!st) return;
    if (dt > 0) {
      acc += dt; let n = 0;
      try { while (acc >= STEP && n++ < 24) { st.step(STEP); acc -= STEP; } } catch (err) { console.error(err); acc = 0; }
      if (n >= 24) acc = 0;
    }
    drain();
    view.sync(now, real);
    if (tool && portsDirty) { portsDirty = false; view.showPorts(tool, rot, hot, px, py); }
    view.render(now);
    if ((hudT -= real) <= 0) { hudT = 0.3; bar(); stats(); desk(); if (tool) portsDirty = true; }
    if ((saveT -= real) <= 0) { saveT = 20; mode.store(); }
  },
  get station() { return st; }, get view() { return view; },
};
export default mode;
