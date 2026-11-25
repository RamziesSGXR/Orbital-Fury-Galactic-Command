// (GC 0.81) FOB Commander's interface, brought back from the standalone game. The base's simulation and 3D came over from
// FOB Super Commander whole (js/base); its interface (main.js and style.css, some 2,000 lines) was replaced by a thin wrapper,
// so a player could build and answer the desk but could not see what the base earned, what it was short of, or what the
// Offices wanted. This is that interface again, in this game's look and words:
//   - the top bar: SUPPLIES, CREDITS and OWED with their change a watch; troops, morale, power, rations, fuel, ammo and READY;
//     BUY SUPPLIES; the day with the allocation bar and your rank. Hover any of them for where it comes from.
//   - the task board (ORDERS & DESK, top left): the next orders, and everything waiting: the Offices' calls, requests,
//     offers from the other bases, files to grade, and what needs fixing.
//   - the build bar: tabs by purpose with icons and their zone's colour, and a card for everything (a picture, what it is
//     for, what it costs and its upkeep); the zones with the base's demand; BUILD AS a standard.
//   - the building card (right): how it is doing in a line, upkeep and what it earns, standard, services, condition, crew,
//     stocks, what it is doing; REPAIR, SWITCH OFF, CREW FIRST, UPGRADE, DEMOLISH with the refund.
//   - the status bar: the clock (slower, pause, faster), the day, the time and what the base is doing at that hour.
// Ministries are Offices here, votes are troops, the pelican a dropship.
import { C, B, GROUPS, ZONES, ZKEYS, GOODS, GKEYS, STD, TRAIN, TECH, VEHICLES, LOANS, CHAINS, GROW, SUPPLY_MODES, SUPPLY_CAPS, COMMIT, MARKET, FOUNDATION } from '../base/config.js';
import { MKEYS, rankOf, LOOSE } from '../base/sim.js';
import { REQUESTS, CALLS } from '../base/desk.js';
import { words } from '../core/words.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const ORD = ['1ST', '2ND', '3RD', '4TH'];
export const OFFICE = { def: 'OPERATIONS OFFICE', pro: 'BUREAU OF EXPANSION', tru: 'PUBLICITY OFFICE' };
export const OSHORT = { def: 'DEF', pro: 'EXP', tru: 'PUB' };
// time as the player reads it: one calendar day is C.WEEK simulation seconds, an hour C.WEEK / 24
const CAL_H = () => C.WEEK / 24;
export function dur(simS) { const h = simS / CAL_H(); if (h >= 36) { const d = Math.round(h / 24); return `${d} day${d === 1 ? '' : 's'}`; } if (h >= 1) return `${Math.round(h)} h`; return `${Math.max(1, Math.round(h * 60))} min`; }
export const calDay = (d) => Math.floor((d - 1) * C.DAY / C.WEEK) + 1;     // a shift number as the calendar day it falls in
const perWatch = (v) => Math.round(v / (C.WEEK / C.DAY) * 10) / 10;           // upkeep is set per day; shown per watch

// thin line icons, 24 x 24, in the current colour (the standalone game's)
export const ICON = {
  landscape: 'M2 20 8 11l4 5 3-4 7 8zM15 6a2 2 0 1 0 0.01 0',
  roads: 'M8 21 11 3M16 21 13 3M12 6v2M12 11v2M12 16v2', logistics: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  training: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8M12 11.5v1', living: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5',
  income: 'M4 20h16M7 17v-4M12 17V9M17 17V5', industry: 'M3 21V11l6 4v-4l6 4V5h4v16zM7 21v-3M12 21v-3', power: 'M13 2 5 14h6l-1 8 8-12h-6z', defence: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  truth: 'M3 10v4h3l7 4V6l-7 4zM16 9c1.5 1.5 1.5 4.5 0 6M19 7c3 3 3 7 0 10', command: 'M12 21V9M8 21h8M5 7c4-4 10-4 14 0M8 10c2-2 6-2 8 0M12 9V3',
  zones: 'M3 3h8v8H3zM13 13h8v8h-8zM13 3h8v8M3 13h8v8', wire: 'M2 12c2-3 4 3 6 0s4 3 6 0 4 3 6 0 2 1 2 1M4 6v12M12 6v12M20 6v12',
  bags: 'M3 17c0-2 2-3 4.5-3S12 15 12 17M12 17c0-2 2-3 4.5-3S21 15 21 17M3 17h18M7.5 14c0-2 2-3 4.5-3s4.5 1 4.5 3', trench: 'M2 9h5l2 8h6l2-8h5M9 17h6',
};
export const icon = (k) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k] || ''}"/></svg>`;

// what the base's troops feel, by cause (the morale breakdown)
const MOR = { base: 'baseline', comfort: 'comfort (mess, habs, vending, domes)', prop: 'propaganda', pride: 'medals and pride', food: 'hunger', noise: 'noise near the bunks', hazard: 'fuel or generators by the bunks', crowd: 'troops without bunks', latrine: 'latrine queues and filth', power: 'power cuts', grief: 'grief', worn: 'worn buildings', mood: 'desk decisions', wall: 'a closed, watched wall', unpaid: 'unpaid wages', water: 'water for the bunks', sewer: 'sewage from the bunks', smell: 'the lagoon smell', sick: 'sickness', commit: 'Publicity commitment' };
// where supplies and credits come from and go
export const CAT = { industry: 'Industry', calls: 'Calls answered', alloc: 'Daily allocation', deploy: 'Troopers shipped', ops: 'Operations and patrols', roster: 'Roster review', sales: 'Franchise sales', ledger: 'Desk decisions',
  deliveries: 'Morning deliveries', upkeep: 'Upkeep', build: 'Building and roads', refund: 'Demolition refunds', repair: 'Repairs', raid: 'Perimeter repairs', research: 'Research', wages: 'Colonist wages', loans: 'Loans and repayments', interest: 'Overdraft fees',
  bought: 'Bought', sold: 'Sold', fees: 'Fees', salvage: 'Salvage and clearing', market: 'Market trades', trade: 'Trades with other bases', commit: 'Office commitments', grant: 'Grants', nuke: 'Warheads shipped' };
const PHASE = { night: 'LIGHTS OUT', firstcall: 'FIRST CALL', reveille: 'REVEILLE', pt: 'PT', chow: 'CHOW', mess: 'MESS', work: 'DUTY', retreat: 'RETREAT', evening: 'FREE TIME' };
const DEMAND = [['bunks', 'BUNKS'], ['seats', 'MESS SEATS'], ['latrines', 'LATRINES'], ['storage', 'STORAGE'], ['shops', 'SHOPS']];
const SNAPS = ['grid', '45', 'free'], SNAPNAME = { grid: 'GRID', 45: '45°', free: 'FREE' };
// the line tools on the ROADS tab: the standalone game's, and this game's field works. pic: a picture the 3D view can draw
export const LINES = {
  road1: { name: 'Dirt Road', k: 'dirt', pic: 't_road1', why: 'One tile wide, cheap, a bit faster', desc: 'Drag to draw. One tile wide and cheap. Vehicles go 1.6 times as fast as off-road, people a little faster, and every building needs a road at its door.' },
  road2: { name: 'Paved Road', k: 'paved', pic: 't_road2', why: 'Two tiles wide, vehicles 2.4× faster', desc: 'Drag to draw. Two tiles wide, two lanes. Trucks run fastest here and do not queue behind each other. Needs a Concrete Batch Plant.' },
  path: { name: 'Footpath', k: 'path', pic: 't_path', why: 'A paved walk for people', desc: 'Drag to draw. A paved walk one tile wide. People keep to it; vehicles get nothing from it. Buildings can front onto it.' },
  wall: { name: 'Wall', k: 'wall', pic: 't_wall', why: 'Close it round the base for a bonus', desc: 'Drag to draw. Draw it all the way round and the base is closed: better morale, and raiders have to come through a gate. A road through a wall makes a gate.' },
  wire: { name: 'Barbed Wire', k: 'wire', ic: 'wire', why: 'Slows raiders; runs along a wall\'s top', desc: 'Razor wire on steel stakes, the same as on the ground. Lay it outside the wall, or draw it along the wall itself and it runs along the top. Every tile adds to the strength the base puts against a raid (2 supplies a tile). Nobody walks through it; a road through it leaves a gap.' },
  bags: { name: 'Sandbags', k: 'bags', ic: 'bags', why: 'Cover in front of the wall', desc: 'A chest-high line of sandbags, the ground fight\'s bastions. Lay them in front of a wall, not along it. The most raid strength a tile of any field work (3 supplies a tile). Field works add up to 20 between them.' },
  trench: { name: 'Trench', k: 'trench', ic: 'trench', why: 'Cheap, dug in', desc: 'A fighting trench between banks of sandbags, as on the ground. Dug in front of a wall, not under it. Cheap, and a little raid strength a tile (2 supplies a tile).' },
  unroad: { name: 'Bulldoze', k: null, pic: 't_unroad', why: 'Take out a road or a wall', desc: 'Tap a stretch of road, wall or field works to take it out. Half its cost comes back.' },
};
export const CONDITION = 'Condition: every building wears a little each day, and the upkeep you pay mends it (more than it wears, unless it is a tent). Upkeep unpaid for most of a day costs 22%. Below 70% it works at 85%, below 40% at half and it lowers morale. REPAIR puts it back to 100% at once.';

// The orders: what to do next, in the order a base is built. Each is done when its test passes.
const ORDERS = [
  ['Draw a road from the command post (ROADS, drag)', (s) => s.net.segs.some((q) => !['wall', 'wire', 'bags', 'trench'].includes(q.k))],
  ['Paint a Life Support zone and a Logistics zone along the road (ZONES: tap beside a road to fill a block): barracks, a mess, latrines and a depot grow there', (s) => s.zoneCount('life') > 0 && s.zoneCount('logi') > 0],
  ['Lay the foundation: place a Firing Range (TRAINING); the zones grow the Supply Depot, Barracks and Mess Hall', (s) => s.founded()],
  ['Power the base: a Biofuel Generator by the road (UTILITIES). Every utility covers a circle round it', (s) => s.b.some((b) => b.done && B[b.type].pw > 0 && b.type !== 'hq')],
  ['Wall the base in and put up a Lookout Tower (DEFENCE): inside a closed wall everything produces 5% more and morale is +3; with a tower, 10% and +6', (s) => s.wallBonus().tower],
  ['Build an Engineer Yard (INDUSTRY): a third engineer crew means three jobs at once', (s) => s.crews.some((c) => c.yard)],
  ['Paint a Civic and Commerce zone and pick a franchise: shops grow as the base fills up', (s) => s.zoneCount('comm') > 0],
  ['Give the bunks water and sewage beyond the command post: a Water Well and a Sewage Lagoon (UTILITIES). Keep the well away from the lagoon', (s) => s.has('well') && s.has('lagoon')],
  ['Carry the power further with a Substation, so nothing goes dark (UTILITIES)', (s) => s.has('substation')],
  ['Upgrade a tent to a prefab: tap it and press UPGRADE', (s) => s.b.some((b) => b.done && s.hasStd(b.type) && b.type !== 'hq' && s.stdOf(b) >= 1)],
  ['Ship trained troopers to the front: transports leave the landing pad at 16:00', (s) => s.stats.deployed > 0],
  ['Deal with the desk: answer a request', (s) => (s.stats.desk || 0) + (s.stats.graded || 0) > 0],
  ['Answer an Office call: set aside what they ask for', (s) => (s.stats.calls || 0) > 0],
  ['Take an offer from another base, or trade on the market', (s) => (s.stats.trades || 0) + (s.stats.mkt || 0) > 0],
  ['Keep supplies and credits rising: the change a watch is under each, at the top', (s) => { const r = s.rates(); return s.week >= 2 && r.supNet >= 0 && r.crNet >= 0; }],
  ['Build a Patrol Office for standing patrols (OPERATIONS)', (s) => s.has('patrol')],
  ['Be granted a Forward Operating Base charter (STANDING, then the charter\'s terms)', (s) => s.stage >= 1],
  ['Be granted a Fort: more land, permanent buildings', (s) => s.stage >= 2],
  ['Be granted a Major Base', (s) => s.stage >= 3],
  ['Score 60 or more in a Publicity Office inspection', (s) => s.inspection && s.inspection.score >= 60],
  ['Reach 1st place in the standings', (s) => s.rank === 0],
];

// a panel under the pointer keeps still: redrawing it would pull the button out from under a click (the numbers catch up a moment later)
const held = (el) => !!el.querySelector('button:hover, select:focus, input:focus');

export function makeHud(o) {
  const { audio } = o, sim = () => o.sim(), view = () => o.view();
  let root = null, group = 'roads', buildOpen = true, snapMode = 'grid', thumbs = {}, flashT = 0, itemsSig = '', groupsSig = '', boardSig = '', selSig = '', ivT = 0;
  let lastWarn = [];

  // ---------------------------------------------------------------- the DOM
  function mount() {
    if (root) return;
    root = document.createElement('div'); root.id = 'fob';
    root.innerHTML = `<aside id="fb-orders" class="fpan"><div class="fph"><span>ORDERS &amp; DESK</span><b id="fb-n"></b><button class="fx" data-fb="fold" title="Fold away" aria-label="Fold away">–</button></div><div id="fb-body"></div></aside>
      <div id="fb-selp" class="fpan" hidden></div>
      <div id="fb-build"><div id="fb-items"></div><div id="fb-groups" role="toolbar" aria-label="Build"></div></div>
      <div id="fb-status"><div id="fb-clock"><button class="plate btn sm" data-fb="slow" title="Slower ( [ )">◀</button><button class="plate btn sm" data-fb="pause" title="Pause (Space)" id="fb-pause">II</button><button class="plate btn sm" data-fb="fast" title="Faster ( ] )">▶</button><b id="fb-speed">1×</b>
        <span class="ck"><b id="fb-day">DAY 1</b> <b id="fb-time">06:00</b> <span id="fb-phase"></span></span></div>
        <div id="fb-dock"><button class="md" data-fb="report" data-info="week"><b>STANDING</b><span id="md-st"></span></button><button class="md" data-fb="report"><b>CHARTER</b><span id="md-ch"></span></button><button class="md" data-fb="report"><b>DEFENCE</b><span id="md-def"></span></button><span id="fb-next"></span></div></div>
      <div id="fb-tip" hidden></div>`;
    $('th-stage').appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('change', (e) => { if (e.target.id === 'fb-chain') { sim().setChain(e.target.value || null); sim().growStep(); buildBar(true); audio.click(); } });
    $('fb-items').addEventListener('pointermove', itemTip);
    $('fb-items').addEventListener('pointerleave', hideTip);
    // the readouts at the top: a breakdown on hover
    document.addEventListener('pointermove', (e) => {
      if (!root || root.hidden) return;
      const el = e.target.closest && e.target.closest('#s-theatre.fob [data-info]'); if (!el) return;
      const h = infoHtml(el.dataset.info); if (!h) return;
      const r = el.getBoundingClientRect(); tip(h, r.left + r.width / 2, r.top < innerHeight / 2 ? r.bottom + 6 : r.top - 6, r.top >= innerHeight / 2);
    });
    document.addEventListener('pointerout', (e) => { if (e.target.closest && e.target.closest('[data-info]') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-info]')) && flashT <= 0) hideTip(); });
    $('th-stats').addEventListener('click', (e) => { if (!root || root.hidden) return; const b = e.target.closest('[data-fb],[data-info]'); if (b) onClick(e); });
  }
  function show(on) { if (root) root.hidden = !on; $('s-theatre').classList.toggle('fob', on); if (!on) hideTip(); }
  function reset() {
    group = 'roads'; buildOpen = true; thumbs = {}; itemsSig = ''; groupsSig = ''; boardSig = ''; selSig = ''; lastWarn = [];
    $('fb-orders').classList.remove('min');
    topBar(); buildBar(true); board(); selPanel(); tick();
  }

  // ---------------------------------------------------------------- the top bar: three big numbers, the readouts, the day
  function topBar() {
    $('th-stats').innerHTML = `<div class="fb-top">
      <button class="fbig sup" data-info="sup" data-fb="report"><b id="fr-sup">0</b><span>SUPPLIES</span><i id="fr-sup-d"></i></button>
      <button class="fbig cr" data-info="cr" data-fb="report"><b id="fr-cr">0</b><span>CREDITS</span><i id="fr-cr-d"></i></button>
      <button class="fbig debt" data-info="debt" data-fb="report"><b id="fr-debt">0</b><span>OWED</span><i id="fr-debt-d"></i></button>
      <div class="fres">${[['troops', 'TROOPS', 'trp'], ['morale', 'MORALE', 'mrl'], ['power', 'POWER', 'pw'], ['rations', 'RAT', 'rations'], ['fuel', 'FUEL', 'fuel'], ['ammo', 'AMMO', 'ammo'], ['ready', 'READY', 'ready']].map(([k, n, id]) => `<span class="ri" data-info="${k}"><i>${n}</i><b id="fr-${id}"></b></span>`).join('')}</div>
      <button class="plate btn sm" id="fr-buy" data-fb="buy" title="Buy 100 supplies on the planet market with credits">BUY SUPPLIES</button>
      <button class="fweek" data-info="week" data-fb="report"><b id="fw-title">DAY 1</b><span class="wbar"><span id="fw-fill"></span><span id="fw-insp" title="The Publicity Office's inspection"></span></span><span id="fw-rank"></span></button></div>`;
  }
  function readouts() {
    const s = sim(), r = s.rates(), sg = (v) => (v >= 0 ? '+' : '−') + fmt(Math.abs(v)), set = (id, v) => { const el = $(id); if (el && el.textContent !== String(v)) el.textContent = v; };
    if (!$('fr-sup')) topBar();
    set('fr-sup', fmt(s.supplies)); set('fr-sup-d', `${sg(r.supNet)}/watch`); $('fr-sup-d').className = r.supNet < 0 ? 'down' : 'up';
    set('fr-cr', fmt(s.credits)); set('fr-cr-d', `${sg(r.crNet)}/watch`); $('fr-cr-d').className = r.crNet < 0 ? 'down' : 'up';
    $('fr-cr').parentElement.classList.toggle('bad', s.credits < 0);
    const debt = s.debt(), pay = s.loans.reduce((a, l) => a + Math.min(l.bal, LOANS[l.k].pay), 0);
    set('fr-debt', fmt(debt)); set('fr-debt-d', pay ? `−${fmt(pay)}/day` : debt ? 'overdraft' : 'clear'); $('fr-debt').parentElement.classList.toggle('clear', debt <= 0);
    const home = s.troops.filter((t) => t.state !== 'patrol').length, use = s.usage();
    set('fr-trp', `${home}/${s.troops.length}/${s.beds}`); $('fr-trp').parentElement.classList.toggle('bad', s.troops.length > s.beds);
    set('fr-mrl', Math.round(s.morale) + (s.moraleTarget > s.morale + 1 ? '↑' : s.moraleTarget < s.morale - 1 ? '↓' : '')); $('fr-mrl').parentElement.classList.toggle('bad', s.morale < 40);
    set('fr-pw', `${s.power.made}/${s.power.used}`); $('fr-pw').parentElement.classList.toggle('bad', s.power.ratio < 1);
    for (const g of GKEYS) { const n = Math.floor(s.amount(g)), el = $('fr-' + g); if (!el) continue; set('fr-' + g, n); el.parentElement.classList.toggle('bad', use[g] > 0 && n < use[g] * 0.5); }
    const ready = s.troops.filter((t) => t.train >= 100 && t.state !== 'patrol').length, rec = s.troops.filter((t) => t.train < 100).length;
    set('fr-ready', `${ready}/${rec}`);
    set('fw-title', `DAY ${s.time.cday || 1}`); $('fw-fill').style.width = (s.wt / C.WEEK * 100) + '%'; $('fw-insp').style.left = (C.INSPECT_AT * 100) + '%';
    set('fw-rank', `${ORD[s.rank] || ''} OF ${s.rivals.length + 1} · ALLOCATION IN ${dur(C.WEEK - s.wt).toUpperCase()}`);
    // the clock
    const hh = Math.floor(s.time.hour), mm = Math.floor((s.time.hour - hh) * 60);
    set('fb-day', `DAY ${s.time.cday || 1}`); set('fb-time', `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`); set('fb-phase', PHASE[s.time.phase] || '');
    set('fb-pause', o.ui.paused ? '▶' : 'II'); $('fb-pause').classList.toggle('on', o.ui.paused); set('fb-speed', o.ui.speed + '×');
    // the dock
    const S = C.STAGES[s.stage || 0], nx = C.STAGES[(s.stage || 0) + 1], ck = nx ? s.stageCheck() : null, ord = s.orders[0];
    set('md-st', `${(ORD[s.ranking()] || '').toLowerCase()} of ${s.rivals.length + 1}`);
    set('md-ch', `${(S.short || S.name)}${ck ? ` · ${ck.filter((c) => c.ok).length}/${ck.length}` : ''}`);
    set('md-def', ord ? `${ord.sent}/${ord.n} shipped` : `${s.patrols.length} patrols out`);
    $('md-def').parentElement.classList.toggle('alert', !!ord && ord.due - s.time.day <= 1 && ord.sent < ord.n);
    let nt = '';
    if (nx && ck) { const met = ck.filter((c) => c.ok).length; nt = `NEXT CHARTER · ${(nx.short || nx.name).toUpperCase()}: ${met === ck.length ? 'every term met, granted within the hour' : 'still ' + ck.find((c) => !c.ok).text.replace(/ \(.*\)$/, '')}`; }
    set('fb-next', nt);
  }
  // a readout's breakdown, on hover
  function infoHtml(k) {
    const s = sim(), r = s.rates(), sg = (v) => (v >= 0 ? '+' : '−') + fmt(Math.abs(v)), row = (n, v, cls) => `<tr><td>${esc(n)}</td><td class="${cls ?? (v < 0 ? 'down' : 'up')}">${typeof v === 'number' ? sg(v) : v}</td></tr>`;
    const flows = (ob) => Object.entries(ob).filter(([, v]) => Math.abs(v) >= 0.5).sort((a, b) => b[1] - a[1]).map(([c, v]) => row(CAT[c] || c, Math.round(v))).join('');
    const t = (title, body, foot) => `<b>${title}</b><table class="tipt">${body}</table>${foot ? `<span class="fine">${foot}</span>` : ''}`;
    if (k === 'sup') return t(`SUPPLIES ${fmt(s.supplies)} · ${sg(Math.round(r.supNet))} A WATCH`, flows(r.sup), 'Averaged over the last watches. A day is six watches.');
    if (k === 'cr') return t(`CREDITS ${fmt(s.credits)} · ${sg(Math.round(r.crNet))} A WATCH`, flows(r.cr), 'Colonist wages, research and the market are paid in credits.');
    if (k === 'debt') return t(`OWED ${fmt(s.debt())}`, s.loans.map((l) => row(LOANS[l.k].name, `${fmt(l.bal)} · −${Math.min(l.bal, LOANS[l.k].pay)}/day`, '')).join('') + (s.credits < 0 ? row('Overdraft', fmt(-s.credits), 'down') : ''), 'The Bureau takes a little back every day.');
    if (k === 'troops') {
      const home = s.troops.filter((x) => x.state !== 'patrol').length, out = s.troops.length - home, by = {}, d = s.dem;
      for (const b of s.b) if (b.done && B[b.type].beds) by[B[b.type].name] = (by[B[b.type].name] || 0) + s.cap(b, 'beds');
      return t(`TROOPS ${home} HOME · ${s.troops.length} IN ALL · ${s.beds} BUNKS`, Object.entries(by).map(([n, v]) => row(n, v + ' bunks', '')).join('') + row('Out on patrol', out, '') + row('Engineers (at their yard)', s.engineers(), '') + (d ? row('Bunks wanted', d.bunks ? `${d.bunks} more` : 'enough', d.bunks ? 'warn' : 'up') : ''), 'Recruits fill empty bunks each morning: more bunks, more recruits.');
    }
    if (k === 'morale') return t(`MORALE ${Math.round(s.morale)} → ${Math.round(s.moraleTarget)}`, Object.entries(s.mor).filter(([, v]) => v).sort((a, b) => b[1] - a[1]).map(([n, v]) => row(MOR[n] || n, v)).join(''), 'Morale moves slowly toward the target.');
    if (k === 'power') {
      const u = s.util, src = {}; for (const b of s.b) if (b.done && !b.off && B[b.type].pw > 0) src[B[b.type].name] = (src[B[b.type].name] || 0) + 1;
      return t(`POWER ${s.power.made} MADE · ${s.power.used} USED`, Object.entries(src).map(([n, c]) => row(n, '×' + c, '')).join('') + (u ? row('Water a day', `${u.water.made} / ${u.water.use}`, u.water.ratio < 1 ? 'warn' : 'up') + row('Sewage a day', `${u.sewer.cap} / ${u.sewer.use}`, u.sewer.ratio < 1 ? 'warn' : 'up') + (u.dark ? row('Dark: outside coverage', u.dark, 'down') : '') : ''), 'UTILITIES has the generators, wells and lagoons.');
    }
    if (GOODS[k]) {
      const use = s.usage()[k] || 0, have = s.amount(k);
      return t(`${GOODS[k].name.toUpperCase()} ${Math.floor(have)}`, row('In storage', Math.floor(s.stored(k)), '') + row('Room in storage', Math.floor(s.storage(k)), '') + row('Waiting on the pads', Math.floor(s.onPad(k)), '') + row('At the buildings using it', Math.floor(s.inUse(k)), '') + row('On trucks and forklifts', Math.floor(s.carried(k)), '') + row('Used a watch', Math.round(use), '') + row('Lasts', use ? dur(have / use * C.DAY) : 'as long as it likes', use && have < use ? 'down' : ''), 'The morning dropship tops it up: tap the command post to say what it buys.');
    }
    if (k === 'ready') {
      const ready = s.troops.filter((x) => x.train >= 100 && x.state !== 'patrol').length, rec = s.troops.filter((x) => x.train < 100), od = s.orders[0];
      return t(`READY ${ready} · IN TRAINING ${rec.length}`, row('Training places', s.b.filter((b) => b.done && B[b.type].train).reduce((a, b) => a + s.cap(b, 'slots'), 0), '') + row('Average progress', rec.length ? Math.round(rec.reduce((a, x) => a + x.train, 0) / rec.length) + '%' : '—', '') + (od ? row('Deployment order', `${od.sent} of ${od.n}, by day ${calDay(od.due)}`, od.sent < od.n && od.due - s.time.day <= 1 ? 'down' : '') : ''), 'At 100 points a recruit is a trooper. Transports leave the pad at 16:00.');
    }
    if (k === 'week') return t(`DAY ${s.time.cday || 1} · ${ORD[s.rank] || ''} OF ${s.rivals.length + 1}`, row('Allocation at this rank', `~${fmt(C.ALLOC.base * C.ALLOC.mult[s.rank])} SUP`, '') + row('Inspection', s.inspected ? 'done today' : 'later today', '') + row('Charter', C.STAGES[s.stage || 0].name, ''), 'Tap for your standing, the charter and your defences.');
    return '';
  }

  // ---------------------------------------------------------------- the task board
  function board() {
    const s = sim(), items = [], done = ORDERS.map((q) => { try { return !!q[1](s); } catch { return false; } }), todo = ORDERS.map((_, i) => i).filter((i) => !done[i]);
    let h = '';
    if (todo.length) h += `<div class="tb-sec">ORDERS · ${done.filter(Boolean).length} OF ${ORDERS.length} DONE</div>` + todo.slice(0, 3).map((i, n) => `<div class="tb-o${n === 0 ? ' next' : ''}"><i>${i + 1}</i>${esc(words(ORDERS[i][0]))}</div>`).join('');
    // the Offices' calls: set aside what they ask for by a day, or pay for ignoring them
    for (const c of s.calls.filter((x) => !x.acc)) {
      const q = CALLS[c.k], have = s.have(c.g);
      items.push(`<div class="tb-i call"><em class="c-${q.m}">${OFFICE[q.m]} · DUE DAY ${calDay(c.due)}</em><b>${esc(q.title)}: ${fmt(c.n)} ${c.g.toUpperCase()}</b><span class="${have < c.n ? 'warn' : 'up'}">You have ${fmt(have)}</span><div class="tb-b"><button class="plate btn sm" data-call="${c.id}:1">SET ASIDE</button><button class="plate btn sm" data-call="${c.id}:0">DECLINE</button></div></div>`);
    }
    // requests
    for (const r of s.desk) {
      const q = REQUESTS[r.k];
      items.push(`<div class="tb-i"><em>${esc(q.from.toUpperCase())} · ${dur(Math.max(0, r.due - s.t)).toUpperCase()} LEFT</em><b>${esc(q.title)}</b><span class="tb-txt">${esc(q.text.replaceAll('NAME', r.name))}</span><div class="tb-b">${q.opts.map((op, i) => `<button class="plate btn sm" data-dec="${r.id}:${i}" ${s.canDecide(r, i) ? '' : 'disabled'}>${esc(op.label)}</button>`).join('')}</div></div>`);
    }
    // offers from the other bases
    for (const of of s.market.offers) {
      const M = MARKET.goods[of.g], mk = (of.buys ? s.sellAt(of.g) : s.buyAt(of.g)) * 10, ok = s.canTakeOffer(of);
      items.push(`<div class="tb-i offer"><em>${esc(of.from.toUpperCase())} · UNTIL DAY ${calDay(of.until)}</em><b>${of.buys ? 'WANTS' : 'SELLS'} ${of.n} ${M.short} at ${(of.p * 10).toFixed(1)} CR per 10</b><span>The market ${of.buys ? 'pays' : 'charges'} ${mk.toFixed(1)}.${of.buys ? ` You hold ${Math.floor(s.holding(of.g))}.` : ''}</span><div class="tb-b"><button class="plate btn sm" data-offer="${of.id}" ${ok.ok ? '' : 'disabled'} title="${esc(ok.ok ? '' : ok.why || '')}">${of.buys ? 'SELL' : 'BUY'} · ${of.buys ? '+' : '−'}${Math.round(of.n * of.p)} CR</button></div></div>`);
    }
    // what needs fixing
    lastWarn = [];
    const warn = (title, why) => { lastWarn.push(title); items.push(`<div class="tb-i alert"><b>${esc(title)}</b><span>${esc(words(why))}</span></div>`); };
    { const ri = s.raidInfo(); if (ri.known) warn(ri.alarm ? 'RAID AT THE WIRE' : 'Raid expected', `${ri.what}${ri.dir ? ' from the ' + ri.dir : ''}, ${ri.when}.`); }
    const use = s.usage();
    for (const g of GKEYS) if (use[g] > 0 && s.amount(g) < use[g] * 0.5) warn(`${GOODS[g].name} running low`, `${Math.floor(s.amount(g))} left, ${Math.round(use[g])} used a watch. More storage brings bigger deliveries; or take an offer.`);
    for (const m of MKEYS) if ((s.commit?.[m] || 0) && (s.commitLast?.[m] ?? 1) < 0.6) warn(`${COMMIT[m].dept}: commitment short`, `Only ${Math.round(s.commitLast[m] * 100)}% paid yesterday.`);
    { const u = s.util; if (u && !s.graceOn()) { if (u.dark) warn('Buildings dark', `${u.dark} building${u.dark > 1 ? 's are' : ' is'} outside power coverage. Build a Substation near ${u.dark > 1 ? 'them' : 'it'} (UTILITIES).`); if (s.waterEff() < 0.75) warn('Short of water', 'Bunks without water lose morale and fall sick. Wells, a purification unit, or a tower to carry it (UTILITIES).'); if (s.sewerEff() < 0.75) warn('Short of sewage', 'Bunks with nowhere for their waste lose morale and fall sick. A lagoon or a treatment plant (UTILITIES).'); } }
    if (s.power.ratio < 1) warn('Short of power', `${s.power.made} made, ${s.power.used} wanted: buildings run slow. Build a Generator or a Solar Array.`);
    if (s.hunger > 0.15) warn('Troops going hungry', 'Not enough seats at meals, or not enough rations. A Mess Hall feeds 24.');
    if (s.troops.length > s.beds) warn('Not enough bunks', `${s.troops.length} troops, ${s.beds} bunks. Zone more Life Support, or build a Barracks or a Prefab Hab.`);
    if (s.credits < -s.OD) warn('Past the overdraft', 'Wages go unpaid and franchises stop. Take an offer that pays, or sell supplies.');
    if (s.nextStage() && s.stageCheck().every((c) => c.ok)) warn('A bigger charter is on its way', 'Every term is met: it is granted within the hour.');
    if (items.length) h += `<div class="tb-sec">ON THE DESK · ${items.length}</div>` + items.join('');
    else if (!todo.length) h += '<p class="fine">Nothing waiting. The base runs itself; the desk fills up during duty hours.</p>';
    $('fb-n').textContent = items.length || '';
    const el = $('fb-body');
    if (h !== boardSig && !held(el)) { boardSig = h; el.innerHTML = h; }
  }

  // ---------------------------------------------------------------- the build bar
  const thumb = (k) => { if (!(k in thumbs)) { try { thumbs[k] = view().thumb(k, sim().hasStd(k) ? sim().std : 2) || ''; } catch { thumbs[k] = ''; } } return thumbs[k]; };
  const pic = (k, ic) => { const u = k ? thumb(k) : ''; return u ? `<span class="th"><img src="${u}" alt=""></span>` : `<span class="th ic-th">${icon(ic || 'roads')}</span>`; };
  // what a building is for, in a few words, from what it does
  function whyOf(k) {
    const s = sim(), d = B[k], m = [], cf = s.hasStd(k) ? STD[s.std].cap : 1, cp = (v) => Math.max(1, Math.round(v * cf));
    if (d.pad) m.push('supplies and recruits in, troopers out');
    if (C.SALES[k] || d.sales) m.push(`+${C.SALES[k] || d.sales} CR a watch`);
    if (d.make) m.push(`+${d.make} supplies a watch`);
    if (d.pump) m.push(`+${d.pump} fuel a watch`);
    if (d.slots) m.push(`trains ${cp(d.slots)} recruits`);
    if (d.beds) m.push(`houses ${cp(d.beds)}`);
    if (d.eat) m.push(`feeds ${cp(d.eat)}`);
    if (d.pw > 0) m.push(`+${d.pw} power`);
    if (d.water) m.push(`${d.water} water a day`);
    if (d.sewer) m.push(`takes ${d.sewer} waste a day`);
    if (d.cover) m.push(`covers ${Math.max(...Object.values(d.cover))} tiles`);
    if (d.store) m.push(`stores ${Math.floor(Object.values(d.store).reduce((a, b) => a + b, 0) * cf)} goods`);
    if (d.trucks) m.push(`${d.trucks} supply trucks`);
    if (d.ward) m.push(`${cp(d.ward)} beds for the wounded`);
    if (d.watch) m.push(`watches ${d.watch} tiles of wall`);
    if (d.guns) m.push(`arms ${d.guns} tiles of wall`);
    if (d.squads) m.push('sends standing patrols');
    if (d.lab) m.push('research');
    if (d.weekly) m.push(Object.entries(d.weekly).map(([st, v]) => `${v > 0 ? '+' : ''}${v} ${{ def: 'Defence', pro: 'Expansion', tru: 'Publicity' }[st]} a day`).join(', '));
    const sk = s.hasStd(k) ? STD[s.std] : null;
    if (d.prop) m.push(`+${Math.round(d.prop * (sk?.prop ?? 1))} propaganda`);
    if (d.mor) m.push(`+${Math.round(d.mor * (sk?.mor ?? 1))} morale`);
    return m.slice(0, 2).join(' · ') || String(d.desc || '').split('. ')[0];
  }
  const TABS = GROUPS.filter((g) => g[0] !== 'landscape');
  function buildBar(force) {
    const s = sim(), tool = o.tool();
    const gh = TABS.map(([k, n, desc, , zk]) => `<button class="bg${k === group ? ' on' : ''}${k === group && buildOpen ? ' open' : ''}" data-g="${k}" ${zk && ZONES[zk] ? `style="box-shadow: inset 0 -3px 0 ${ZONES[zk].col}"` : ''} title="${esc(desc)}">${icon(k)}<span>${n}</span></button>`).join('');
    if (force || gh !== groupsSig) { groupsSig = gh; $('fb-groups').innerHTML = gh; }
    $('fb-items').hidden = !buildOpen;
    if (!buildOpen) return;
    const G = TABS.find((x) => x[0] === group) || TABS[0];
    let html;
    if (group === 'zones') html = zonesBar(G);
    else {
      const found = s.founded(), fm = s.foundMissing();
      const items = group === 'roads' ? [] : G[3].filter((k) => B[k] && !B[k].fixed);
      const stdRow = items.some((k) => s.hasStd(k)) ? `<span class="bi-std"><span>BUILD AS</span>${STD.map((t, i) => { const lk = s.stdLock(i); return `<button class="plate btn${s.std === i ? ' on' : ''}${lk ? ' lock' : ''}" data-std="${i}" title="${esc(t.doctrine + ' standard. ' + t.desc + (lk ? ' ' + lk + '.' : ''))}">${t.name.toUpperCase()}</button>`; }).join('')}</span>` : '';
      const u = s.util, utilLine = group === 'power' && u ? `<span class="bi-crews">POWER ${s.power.made}/${s.power.used} · WATER ${u.water.made}/${u.water.use} · SEWAGE ${u.sewer.cap}/${u.sewer.use} A DAY${u.dark ? ` · ${u.dark} DARK` : ''}</span>` : '';
      const cs = s.crews || [], busy = cs.filter((c) => c.job != null && !c.wait).length, q = s.jobQueue().length;
      const crews = `<span class="bi-crews${q > cs.length + 2 ? ' bad' : ''}" title="Engineer crews do every building job, one each. An Engineer Yard (INDUSTRY) trains another.">CREWS ${busy}/${cs.length} AT WORK · ${q} JOB${q === 1 ? '' : 'S'} OPEN${!s.secure() ? ' · SWEEP UNDER WAY' : ''}</span>`;
      const head = `<div class="bi-head"><b>${G[1]}</b><span class="bi-desc" title="${esc(words(G[2]))}">${group === 'power' ? '' : esc(words(G[2]))}</span>${utilLine}${crews}${stdRow}${!found && group !== 'roads' ? `<em>Foundation first: ${fm.map((t) => B[t].name).join(', ')}. These bring the money in.</em>` : ''}</div>`;
      let cards = '';
      if (group === 'roads' || group === 'defence') {
        const lines = group === 'roads' ? ['road1', 'road2', 'path', 'unroad'] : ['wall', 'wire', 'bags', 'trench', 'unroad'];
        if (group === 'roads') cards += `<button class="bi road" data-snap="1">${pic('t_snap')}<b>SNAP</b><span class="why">${SNAPNAME[snapMode]}${matchMedia('(pointer: fine)').matches ? ' · Shift draws free' : ''}</span><span class="cost">G TO SWITCH</span></button>`;
        cards += lines.map((k) => { const L = LINES[k], lk = L.k ? s.equipLock(L.k) : null; return `<button class="bi road${tool === k ? ' on' : ''}${lk ? ' lock' : ''}" data-b="${k}">${pic(L.pic, L.ic)}<b>${L.name}</b><span class="why">${esc(lk || L.why)}</span><span class="cost">${L.k ? Math.round(s.linePrice(L.k) * 10) / 10 + ' SUP / TILE' : 'HALF BACK'}</span></button>`; }).join('');
      }
      cards += items.map((k) => {
        const d = B[k], lk = s.locked(k), spec = o.specOf(k), cost = s.costOf(k, spec), c = typeof cost === 'object' ? cost.sup ?? cost.cost ?? 0 : cost, poor = s.supplies < c, fnd = !found && FOUNDATION.includes(k) && fm.includes(k);
        const up = d.up ? ` · <i>−${perWatch(d.up * (s.hasStd(k) ? STD[s.std].up : 1))}/watch</i>` : '', pw = d.pw < 0 ? ` · <i>${d.pw}⚡</i>` : '';
        return `<button class="bi${lk ? ' lock' : ''}${poor ? ' poor' : ''}${tool === k ? ' on' : ''}${fnd ? ' found' : ''}" data-b="${k}">${pic(k)}<b>${esc(d.name)}</b><span class="why">${esc(lk ? 'Needs ' + lk.join(' and ') : whyOf(k))}</span><span class="cost">${s.designable(k) ? 'FROM ' : ''}${Math.round(c)} SUP${up}${pw}</span></button>`;
      }).join('');
      if (!cards) cards = '<span class="fine">Nothing to place by hand here yet.</span>';
      html = head + `<div class="bi-row">${cards}</div>`;
    }
    if (force || (html !== itemsSig && !held($('fb-items')))) { itemsSig = html; $('fb-items').innerHTML = html; }
  }
  function zonesBar(G) {
    const s = sim(), tool = o.tool(), d = s.dem, ch = s.chainNow(), lockedChain = s.b.some((b) => B[b.type].chain);
    const dem = d ? DEMAND.map(([k, n]) => `<span class="dm" title="${d[k] ? `Short by ${d[k]}${k === 'bunks' ? ` (jobs for ${d.jobs})` : ''}` : 'Enough for now'}"><i>${n}</i><b><u style="width:${Math.round((d.bars[k] || 0) * 100)}%"></u></b></span>`).join('') : '<span class="fine">Demand is worked out every hour.</span>';
    const stdRow = `<span class="bi-std"><span>GROW AS</span>${STD.map((t, i) => { const lk = s.stdLock(i); return `<button class="plate btn${s.std === i ? ' on' : ''}${lk ? ' lock' : ''}" data-std="${i}" title="${esc(t.doctrine + ' standard. ' + t.desc + (lk ? ' ' + lk + '.' : ''))}">${t.name.toUpperCase()}</button>`; }).join('')}</span>`;
    const chain = lockedChain ? `<span class="bi-chain">FRANCHISE <b>${esc(B[ch].name)}</b></span>` : `<span class="bi-chain">FRANCHISE <select id="fb-chain" title="The one chain your Civic and Commerce zone grows (one a base)">${['', ...CHAINS].map((k) => `<option value="${k}" ${ch === (k || null) ? 'selected' : ''}>${k ? esc(B[k].name) : 'None'}</option>`).join('')}</select></span>`;
    const head = `<div class="bi-head"><b>${G[1]}</b><span class="bi-dem">${dem}</span>${chain}${stdRow}</div>`;
    const card = (k) => {
      const z = ZONES[k], note = s.growNote?.[k], n = s.zoneCount(k);
      const what = z.grows.length ? 'Grows ' + z.grows.map((t) => t === 'chain' ? (ch ? B[ch].name : 'your franchise') : B[t].name).join(', ') : z.fits ? 'Placed here, works 5% better' : 'Kept clear';
      return `<button class="bi zone${tool === 'zone:' + k ? ' on' : ''}" data-b="zone:${k}"><span class="th" style="box-shadow: inset 0 -3px 0 ${z.col}">${thumb('t_zone_' + k) ? `<img src="${thumb('t_zone_' + k)}" alt="">` : ''}</span><b style="color:${z.col}">${esc(z.name)}</b><span class="why">${esc(what)}</span><span class="cost">${n ? n + ' tiles' : 'none painted'}${note && z.grows.length && note !== 'building' ? ' · ' + esc(note) : ''}</span></button>`;
    };
    return head + `<div class="bi-row">${ZKEYS.map(card).join('')}<button class="bi zone${tool === 'zone:' ? ' on' : ''}" data-b="zone:">${pic('t_unzone')}<b>Unzone</b><span class="why">Drag to clear zoning. Buildings already up stay.</span><span class="cost">FREE</span></button></div>`;
  }
  // with a mouse, what a card is before it is picked
  function itemTip(e) {
    const b = e.target.closest('[data-b],[data-snap]'); if (!b) return hideTip();
    const s = sim(), at = (h) => tip(h, e.clientX, e.clientY - 12, true);
    if (b.dataset.snap) return at('<b>Snapping</b><br>GRID: ends on tile centres. 45°: straight lines at 45-degree steps. FREE: anywhere. Ends always join existing roads and walls. G switches; Shift draws free.');
    const k = b.dataset.b;
    if (k.startsWith('zone:')) return at(k === 'zone:' ? '<b>Unzone</b><br>Drag over the ground to clear zoning.' : `<b>${esc(ZONES[k.slice(5)].name)}</b><br>${esc(words(ZONES[k.slice(5)].desc))}`);
    if (LINES[k]) return at(`<b>${LINES[k].name}</b><br>${esc(words(LINES[k].desc))}`);
    const d = B[k]; if (!d) return hideTip();
    const lk = s.locked(k), cf = s.hasStd(k) ? STD[s.std].cap : 1, cp = (v) => Math.max(1, Math.round(v * cf));
    const bits = [d.pw > 0 ? `+${d.pw} power` : d.pw < 0 ? `${d.pw} power` : '', d.crew ? `crew ${d.crew}` : '', d.beds ? `houses ${cp(d.beds)} troops` : '', d.eat ? `feeds ${cp(d.eat)}` : '', d.slots ? `trains ${cp(d.slots)} at ${TRAIN[d.train]}/h` : '', d.store ? 'stores ' + Object.entries(d.store).map(([g, n]) => `${n} ${GOODS[g].name.toLowerCase()}`).join(', ') : '', d.need ? 'uses ' + Object.keys(d.need).map((g) => GOODS[g].name.toLowerCase()).join(', ') : '', d.up ? `upkeep ${perWatch(d.up)} supplies a watch` : ''].filter(Boolean);
    at(`<b>${esc(d.name)}</b><br>${esc(d.desc || '')}<br><span class="fine">${bits.join(' · ')}</span>` + (lk ? `<br><span class="warn">Needs ${esc(lk.join(' and '))}</span>` : ''));
  }

  // ---------------------------------------------------------------- the building card
  const days = (simS) => dur(simS);
  function buildState(b) {
    const s = sim();
    if (!s.secure()) return 'waiting: the landing zone is being swept';
    const c = s.crewOn(b.id);
    if (!c) { const n = s.waitingAhead(b.id); return `waiting for a free engineer crew${n > 0 ? ` (${n} job${n > 1 ? 's' : ''} ahead)` : ''}`; }
    if (b.clr?.length) return `${c.name} clearing ${s.scrubName()}, ${b.clr.length} tile${b.clr.length > 1 ? 's' : ''} to go`;
    return `${c.name} at work, ${Math.round((b.done ? b.upg.prog : b.prog) * 100)}%`;
  }
  function moneyOf(b) {     // a building's direct money a watch, in supplies: earnings less upkeep, wages and the goods it burns
    const s = sim(), d = B[b.type], crp = 1 / Math.max(0.2, s.price('sup'));
    if (!b.done) return 0;
    const w = s.work(b);
    let v = -s.upkeepOf(b) / (C.WEEK / C.DAY) - (d.staff || 0) * C.WAGE * crp;
    v += ((C.SALES[b.type] || 0) * s.capF(b) + s.stat(b, 'sales')) * crp * (b.off ? 0 : 1);
    v += s.stat(b, 'make') * w + (d.pump || 0) * w * GOODS.fuel.cost;
    if (d.burn) for (const g in d.burn) v -= d.burn[g] * GOODS[g].cost;
    if (d.pad) { const r = s.rates(); v += ((r.sup.deploy || 0) + (r.cr.deploy || 0) * crp) / Math.max(1, s.count('pad')); }
    return v;
  }
  const GOLD = { roads: '#9aa3a0', logistics: '#e6eadc', training: '#f5d547', living: '#7fe9e0', income: '#59ff8a', power: '#ffb03a', defence: '#ff6a4d', truth: '#c98bff', command: '#6aa8ff', industry: '#c8705a' };
  const roleOf = (k) => (GROUPS.find((g) => g[3].includes(k)) || ['command', 'COMMAND'])[0];
  function selPanel() {
    const s = sim(), p = $('fb-selp'), id = o.sel(), b = id && s.byId(id), zk = !b && o.zsel();
    let html = '';
    if (b) html = buildingCard(b);
    else if (zk && ZONES[zk]) html = o.zoneCard(zk);
    p.hidden = !html;
    if (html !== selSig && (!html || !held(p) || !selSig)) { selSig = html; p.innerHTML = html; }
  }
  function buildingCard(b) {
    const s = sim(), d = B[b.type], bits = [], kv = (k, v, cls = '') => `<div class="kv"><span>${k}</span><b class="${cls}">${v}</b></div>`, meter = (pc, col) => `<div class="meter"><i style="width:${Math.max(0, Math.min(100, pc))}%;background:${col}"></i></div>`;
    if (s.hasStd(b.type)) { const k = s.stdOf(b); bits.push(kv('STANDARD', `${STD[k].name} <small>(${STD[k].doctrine.toLowerCase()})</small>`)); }
    if (!b.done || b.upg) { const pr = b.done ? b.upg.prog : b.prog; bits.push(kv(b.done ? 'UPGRADE TO ' + STD[b.upg.to].name.toUpperCase() : 'CONSTRUCTION', Math.round(pr * 100) + '%') + meter(pr * 100, 'var(--amber)') + kv('ENGINEERS', esc(buildState(b)))); }
    { const notes = []; if (b.grown && ZONES[b.grown]) notes.push(`Grew in ${ZONES[b.grown].name}`); if (d.beds && b.noisy) notes.push('<span class="warn">Noisy neighbours: morale suffers</span>'); if (d.beds && b.hazard) notes.push('<span class="warn">Fuel or a generator next door: a hazard</span>'); if (b.nearPad) notes.push(`Near a landing pad: holds ${Math.round((GROW.padBonus - 1) * 100)}% more`); if (s.zoneFit(b) > 1) notes.push('In its own zone: works 5% better'); if (notes.length) bits.push(kv('ZONE', notes.join('<br>'))); }
    if (b.done && (d.pw < 0 || s.needsWater(b) || s.needsSewer(b))) { const sv = []; if (d.pw < 0) sv.push(b.dark ? '<span class="down">no power: outside the grid</span>' : 'power'); if (s.needsWater(b)) sv.push(b.dry ? '<span class="warn">no water</span>' : 'water'); if (s.needsSewer(b)) sv.push(b.foul ? '<span class="warn">no sewage</span>' : 'sewage'); if (b.smelly) sv.push('<span class="warn">smells the lagoon</span>'); bits.push(kv('SERVICES', sv.join(' · '))); }
    if (d.water && b.done) bits.push(kv('WATER', `${d.water} a day${b.bad ? ' · <span class="down">contaminated: a lagoon is too close</span>' : ''}`));
    if (b.type === 'yard') { const cs = s.crews.filter((c) => c.yard === b.id); bits.push(kv('CREW', cs.length ? cs.map((c) => `${esc(c.name)}: ${c.wait > 0 ? 'in training' : c.job == null ? 'free' : 'at work'}`).join('; ') : b.done ? 'waiting for 3 recruits' : 'none yet')); }
    if (b.done) {
      bits.push(`<div class="kv" title="${esc(CONDITION)}"><span>CONDITION</span><b class="${b.cond < 40 ? 'down' : ''}">${Math.round(b.cond)}%${b.cond < 40 ? ' · works at half' : b.cond < 70 ? ' · works at 85%' : ''}</b></div>` + meter(b.cond, b.cond < 40 ? 'var(--red)' : b.cond < 70 ? 'var(--amber)' : 'var(--text)'));
      if (d.crew) bits.push(kv('CREW', `${b.crew} / ${d.crew}${b.first ? ' · first' : ''}`, b.crew < d.crew ? 'warn' : ''));
      if (d.crew && b.crew < d.crew && !b.off && !s.freeHands) bits.push('<p class="warn">Every trooper is busy: more recruits, CREW FIRST here, or switch something off.</p>');
      if (d.staff) bits.push(kv('COLONIST STAFF', d.staff));
      if (d.pw) bits.push(kv('POWER', `${d.pw > 0 ? '+' : ''}${b.type === 'gen' ? Math.round(d.pw * s.crewFrac(b) * (b.stock.fuel > 0 ? 1 : 0)) : d.pw}${d.pw > 0 || d.cover?.pw ? ` · serves ${s.servedBy(b, 'pw')}` : ''}`));
      const bar = (g, n, cap, label) => kv(label || GOODS[g].name.toUpperCase(), `${Math.floor(n)} / ${cap}`, n < cap * 0.15 ? 'down' : '') + meter(n / cap * 100, GOODS[g].color);
      if (d.store) for (const g in d.store) bits.push(bar(g, b.stock[g] || 0, s.storeCap(b, g)));
      if (d.need) for (const g in d.need) bits.push(bar(g, b.stock[g] || 0, d.need[g], 'NEEDS ' + GOODS[g].name.toUpperCase()));
      if (d.pad) { const n = GKEYS.reduce((a, g) => a + (b.stock[g] || 0), 0); bits.push(kv('WAITING TO BE MOVED', Math.floor(n))); }
      if (d.eat) bits.push(kv('FEEDS', `${s.cap(b, 'eat')} troops a watch`));
      if (d.slots) { const n = s.troops.filter((t) => t.at === b.id).length; bits.push(kv('TRAINING NOW', `${n} / ${s.cap(b, 'slots')}`)); }
      if (d.trucks || d.lifts) { const vs = s.veh.filter((v) => v.home === b.id); bits.push(kv(d.trucks ? 'TRUCKS' : 'FORKLIFT', `${vs.filter((v) => v.job).length} of ${vs.length} on a run`)); }
      if (d.ward) { const w = s.troops.filter((t) => t.hurt > 0); bits.push(kv('PATIENTS', `${Math.min(w.length, d.ward)} of ${d.ward} beds`) + w.slice(0, 5).map((t) => kv(esc(t.name), days(t.hurt))).join('')); }
      if (d.watch) bits.push(kv('WATCHES', b.crew > 0 ? d.watch + ' tiles of wall' : 'nothing: no crew'));
      if (d.lab) bits.push(kv('RESEARCH', s.tech.cur ? `${TECH[s.tech.cur].name}, ${Math.floor(s.tech.pts / TECH[s.tech.cur].hrs * 100)}%` : 'idle'));
      if (d.armour) for (const k of ['frv', 'tank']) { const v = s.veh.find((x) => x.home === b.id && x.kind === k), w = b.wreck?.[k]; if (v || w) bits.push(kv(VEHICLES[k].name.toUpperCase(), v ? (v.mission ? 'on an operation' : 'ready') : `replacement in ${days(w)}`)); }
      if (d.squads) { const out = s.patrols.filter((q) => q.office === b.id).length; bits.push(`<div class="kv"><span>SQUADS KEPT OUT</span><b><button class="plate btn sm ic" data-fb="sq:-1">−</button> ${b.squads} <button class="plate btn sm ic" data-fb="sq:1">+</button></b></div>` + kv('IN THE FIELD NOW', out)); }
      if (d.beds) bits.push(kv('TROOPS HOUSED', s.cap(b, 'beds')));
      if (d.potty) bits.push(kv('CLEANLINESS', Math.round(b.clean ?? 100) + '%', (b.clean ?? 100) < 25 ? 'down' : '') + meter(b.clean ?? 100, (b.clean ?? 100) < 25 ? 'var(--red)' : 'var(--cyan)'));
      if (b.type === 'memorial') bits.push(kv('NAMES ON THE WALL', s.fallen.length));
      if (b.type === 'hq') bits.push(o.supplyRow());
      if (b.type === 'silo') bits.push(o.siloRow(b));
    }
    const crew = s.troops.filter((t) => t.job === b.id).slice(0, 6).map((t) => `${rankOf(t.missions)} ${esc(t.name)}`).join(', ');
    const out = d.need && Object.keys(d.need).find((g) => (b.stock[g] || 0) < 0.5);
    const st = !b.done ? ['warn', `Under construction: ${buildState(b)}`] : b.upg ? ['warn', `Upgrading, half pace: ${buildState(b)}`] : b.off ? ['warn', 'Switched off: its crew and power go elsewhere'] : out ? ['bad', `Out of ${GOODS[out].name.toLowerCase()}`]
      : b.dark ? ['bad', 'Dark: outside power coverage. Build a Substation (UTILITIES)'] : d.crew && b.crew < 1 ? ['bad', 'No crew'] : d.pw < 0 && s.power.ratio < 1 ? ['bad', 'Short of power'] : d.crew && b.crew < d.crew ? ['warn', `Short of crew, ${b.crew} of ${d.crew}`]
        : b.cond < 40 ? ['bad', 'Falling apart: repair it'] : ['ok', d.store ? 'Stocked and running' : 'Running'];
    const mv = b.done ? moneyOf(b) : 0, role = roleOf(b.type);
    const top = `<div class="sp-status ${st[0]}">${esc(st[1])}</div><div class="sp-money"><span>UPKEEP <b class="down">−${fmt(perWatch(s.upkeepOf(b)))}</b>/watch</span><span>NET <b class="${mv < 0 ? 'down' : 'up'}">${mv >= 0 ? '+' : '−'}${fmt(Math.abs(mv))}</b> SUP/watch</span><span class="role" style="color:${GOLD[role] || 'var(--dim)'}">${(GROUPS.find((g) => g[0] === role) || [0, 'COMMAND'])[1]}</span></div>`;
    const upg = (() => { if (!s.hasStd(b.type) || s.stdOf(b) >= 2 || b.upg || !b.done) return ''; const u = s.upgradeInfo(b); if (!u || u.to == null) return ''; return `<button class="plate btn sm${u.ok ? ' go2' : ''}" data-fb="upg" title="${esc(u.ok ? STD[u.to].desc : u.why)}" ${u.ok ? '' : 'disabled'}>UPGRADE TO ${STD[u.to].name.toUpperCase()} · ${u.cost}</button>`; })();
    const btns = [b.done && b.cond < 100 && b.type !== 'hq' ? `<button class="plate btn sm" data-fb="rep" title="${esc(CONDITION)}" ${s.supplies < s.repairCost(b) ? 'disabled' : ''}>REPAIR · ${s.repairCost(b)}</button>` : '',
      b.done && d.crew ? `<button class="plate btn sm${b.first ? ' on' : ''}" data-fb="first" title="Crew this before anything else, taking hands from the least needed if nobody is free">CREW FIRST</button>` : '',
      b.done && (d.crew || d.pw < 0) ? `<button class="plate btn sm${b.off ? ' on' : ''}" data-fb="off">${b.off ? 'SWITCH ON' : 'SWITCH OFF'}</button>` : '', upg,
      d.fixed || b.type === 'hq' ? '' : `<button class="plate btn sm danger" data-fb="del">${b.done ? 'DEMOLISH +' + Math.round((b.cost ?? d.cost) * C.REFUND) : 'CANCEL +' + (b.cost ?? d.cost)}</button>`].filter(Boolean).join('');
    return `<div class="fph"><span>${esc(d.name.toUpperCase())}</span><button class="fx" data-fb="close" aria-label="Close">×</button></div>${top}<div class="sp-body">${bits.join('')}<p>${esc(d.desc || '')}</p>${crew ? `<p>On duty: ${crew}</p>` : ''}</div><div class="sp-btns">${btns}</div>`;
  }

  // ---------------------------------------------------------------- clicks
  function onClick(e) {
    const s = sim();
    const g = e.target.closest('[data-g]'); if (g && root.contains(g)) { const k = g.dataset.g; buildOpen = k === group ? !buildOpen : true; group = k; if (o.tool()) o.setTool(o.tool()); audio.click(); buildBar(true); return; }
    const sd = e.target.closest('[data-std]'); if (sd) { const k = +sd.dataset.std, lk = s.stdLock(k); if (lk) { flash(lk + '.'); audio.deny(); return; } s.setStd(k); thumbs = {}; audio.click(); buildBar(true); return; }
    if (e.target.closest('[data-snap]')) { snapMode = SNAPS[(SNAPS.indexOf(snapMode) + 1) % SNAPS.length]; audio.click(); buildBar(true); return; }
    const bi = e.target.closest('[data-b]'); if (bi) { const k = bi.dataset.b; if (LINES[k] && LINES[k].k) { const lk = s.equipLock(LINES[k].k); if (lk) { flash(`${LINES[k].name}: ${lk.toLowerCase()} (INDUSTRY).`); audio.deny(); return; } } if (B[k] && s.locked(k)) { flash(`${B[k].name} needs ${s.locked(k).join(' and ')} first.`); audio.deny(); return; } o.setTool(k); buildBar(true); return; }
    const call = e.target.closest('[data-call]'); if (call) { const [id, y] = call.dataset.call.split(':').map(Number); s.answer(id, !!y); audio.click(); boardSig = ''; board(); return; }
    const dec = e.target.closest('[data-dec]'); if (dec) { const [id, i] = dec.dataset.dec.split(':').map(Number); if (s.decide(id, i)) audio.click(); else audio.deny(); boardSig = ''; board(); return; }
    const of = e.target.closest('[data-offer]'); if (of) { const r = s.takeOffer(+of.dataset.offer); if (!r.ok) { flash(r.why || 'Not now.'); audio.deny(); } else audio.click(); boardSig = ''; board(); return; }
    const so = e.target.closest('[data-so],[data-sc]'); if (so) { if (s.setSupplyPlan(so.dataset.so ? 'mode' : 'cap', so.dataset.so || +so.dataset.sc)) audio.click(); selSig = ''; selPanel(); return; }
    const nk = e.target.closest('[data-nk]'); if (nk) { if (s.shipNuke(+nk.dataset.nk)) audio.click(); else audio.deny(); selSig = ''; selPanel(); return; }
    const f = e.target.closest('[data-fb]'); if (!f) return;
    const a = f.dataset.fb, b = o.sel() && s.byId(o.sel());
    if (a === 'fold') { const or = $('fb-orders'); or.classList.toggle('min'); f.textContent = or.classList.contains('min') ? '+' : '–'; return; }
    if (a === 'slow' || a === 'fast') { const sp = o.ui.speeds, i = Math.max(0, Math.min(sp.length - 1, sp.indexOf(o.ui.speed) + (a === 'fast' ? 1 : -1))); o.ui.speed = sp[i]; $('th-speed').textContent = o.ui.speed + '×'; if (o.ui.paused) $('th-pause').click(); else audio.click(); readouts(); return; }
    if (a === 'pause') { $('th-pause').click(); readouts(); return; }
    if (a === 'report') { audio.click(); o.report(); return; }
    if (a === 'buy') { if (s.buySupplies()) { audio.click(); readouts(); } else { audio.deny(); flash('Not enough credits for 100 supplies.'); } return; }
    if (a === 'close') { o.clearSel(); return; }
    if (!b) return;
    if (a === 'rep') { if (s.repair(b.id)) { audio.click(); o.toast('Repaired: back to 100%'); } else audio.deny(); }
    else if (a === 'first') { if (s.crewFirst(b.id)) audio.click(); }
    else if (a === 'off') { s.toggle(b.id); audio.click(); }
    else if (a === 'upg') { const u = s.upgrade(b.id); if (!u || u.ok === false) { flash((u && u.why) || 'Not now.'); audio.deny(); } else audio.click(); }
    else if (a.startsWith('sq:')) { s.setSquads(b.id, b.squads + +a.slice(3)); audio.click(); }
    else if (a === 'del') { o.demolish(); return; }
    selSig = ''; selPanel(); readouts();
  }

  // ---------------------------------------------------------------- the tip and the flash
  function tip(html, x, y, above) {
    const t = $('fb-tip'); t.innerHTML = html; t.hidden = false;
    const r = t.getBoundingClientRect(), host = $('th-stage').getBoundingClientRect();
    t.style.left = Math.min(host.width - r.width - 6, Math.max(6, x - host.left - r.width / 2)) + 'px';
    t.style.top = Math.max(4, (above ? y - host.top - r.height - 4 : y - host.top + 14)) + 'px';
  }
  function hideTip() { const t = $('fb-tip'); if (t) t.hidden = true; }
  function flash(text) { const top = $('fb-build').getBoundingClientRect().top || innerHeight - 200; tip(`<span class="warn">${esc(words(text))}</span>`, innerWidth / 2, top - 8, true); flashT = 2.4; }

  // ---------------------------------------------------------------- layout: keep the panels out of each other's way
  function layout(dt) {
    if (!root || root.hidden) return;
    if (flashT > 0 && (flashT -= dt) <= 0) hideTip();
    const st = $('th-stage').getBoundingClientRect(), bar = $('fb-build').getBoundingClientRect(), barTop = bar.top - st.top;
    $('th-stage').style.setProperty('--fb-bottom', (st.height - barTop + 8) + 'px');     // the guide sits on the build bar
    const co = $('th-coach'), coTop = co && !co.hidden ? co.getBoundingClientRect().top - st.top : barTop;
    const or = $('fb-orders'); or.style.maxHeight = Math.max(60, Math.min(barTop, coTop) - 16) + 'px';     // the task board stops above them
    const sp = $('fb-selp'); if (!sp.hidden) sp.style.maxHeight = Math.max(140, barTop - 16) + 'px';
  }

  // every 0.3 s
  function tick() {
    if (!root || root.hidden) return;
    readouts(); board(); selPanel();
    if (group === 'zones' && (ivT = (ivT + 1) % 10) === 0) buildBar();
    else buildBar();
    view().zoneStrong = !!(o.tool() && o.tool().startsWith('zone:')) || (buildOpen && group === 'zones');
  }

  return { mount, show, reset, tick, layout, buildBar, selPanel, board, flash, snap: () => snapMode, cycleSnap: () => { snapMode = SNAPS[(SNAPS.indexOf(snapMode) + 1) % SNAPS.length]; buildBar(true); }, group: () => group };
}
