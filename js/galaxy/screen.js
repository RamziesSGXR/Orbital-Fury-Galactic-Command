// THE WAR ROOM: the galaxy map. Resources on top, the map with the camera on the front in play, the offices in a
// row, the decision bar along the bottom, and the battle screen when fleets meet. All the rules are in sim.js.
// From here the commander goes down to a system: into a ground battle, up to its station, or onto its base (main.js).
import { C, VERSION } from './config.js';
import { Game } from './sim.js';
import { View, drawPlanet, drawBattle } from './view.js';
import { STEPS, SEED } from './tutorial.js';

const $ = id => document.getElementById(id), N = C.names, HP = C.ship.hp;
const RES = { fuel: N.fuel, ammo: N.ammo, tech: N.tech, army: N.army }, RS = { fuel: ' FUEL', ammo: ' AMMO', tech: ' TECH', army: ' TROOPS' };
const TABS = ['int', 'def', 'pro', 'exp', 'tru', 'hum', 'emp', 'uni'];
let app = null, active = false;     // the game this screen is part of (main.js), and whether the war room is on screen
const f1 = v => (Math.round(v * 10) / 10).toString();
const esc = s => String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
const costTxt = (c, long) => Object.entries(c || {}).filter(([, v]) => v).map(([k, v]) => `${f1(v)}${long ? ' ' + RES[k] : RS[k]}`).join(long ? ' + ' : ' ') || 'FREE';
const ships = n => `${n} SHIP${n === 1 ? '' : 'S'}`;
const lootName = f => C.fronts[C.factions.indexOf(f)].loot;
const ICON = {
  fleet: '<path d="M4 5l8 8 8-8M4 12l8 8 8-8"/>', world: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>',
  site: '<path d="M12 3l9 9-9 9-9-9z"/>', truth: '<path d="M4 10v4h3l8 5V5L7 10zM18 9c1.5 1.5 1.5 4.5 0 6"/>', foe: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
};
const MICON = {
  int: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>', def: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
  pro: '<path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"/>', exp: '<path d="M4 20l6-6 4 4 6-9M14 9h6v6"/>', tru: ICON.truth,
  hum: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21c0-4.5 3-7 7-7s7 2.5 7 7"/>', emp: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', uni: '<path d="M6 21V4h12l-3 4 3 4H6"/>',
};
const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square">${d}</svg>`;

let g, view = new View($('map'));
const ui = { sel: null, fleet: null, half: false, pend: null, tab: 'int', open: false, speed: 1, mark: 0, tut: null, hint: null, dest: null, anims: [], show: null, seen: null, fx: null, auto: 0, front: -2 };
window.sgs = { get g() { return g; }, ui, view, refresh: () => refresh() };   // for the browser checks
export const war = () => g;

const front = () => (g.fi >= 0 ? C.fronts[g.fi] : null);
const myFleet = () => g.fleets.find(f => f.id === ui.fleet && f.owner === 'fed' && !f.moved);
const busy = () => !!ui.show || ui.anims.length > 0;            // something is being shown; wait
const fighting = () => !!g.battle && !busy();                   // the battle screen is up
function odds(mine, theirs) { const r = mine / Math.max(1, theirs); return r >= 1.4 ? ['STRONG', 'cy'] : r >= 1.1 ? ['EDGE', 'cy'] : r >= 0.9 ? ['EVEN', 'am'] : ['WEAK', 'rd2']; }

function start(seed, saved, tutorial) {
  g = (saved && Game.load(saved)) || new Game(seed || (Date.now() % 100000), null, app && app.faction && app.faction.open);
  Object.assign(ui, { sel: null, fleet: null, half: false, pend: null, tab: 'int', open: false, mark: Math.max(0, g.log.length - 6), tut: tutorial ? 0 : null, hint: null, dest: null, anims: [], show: null, seen: null, fx: null, auto: 0, front: -2 });
  tutStep = -1;
  if (view.R0) view.reset();
  step();
}
function store() { if (app && active && g.phase === 'plan' && !g.over) app.keep(); }

// After the rules have moved on: animate the fleets that moved, announce what the enemy did, turn the camera to
// the front in play, then redraw.
function step() {
  for (const m of g.moves.splice(0)) ui.anims.push({ ...m, t: 0 });
  if (g.last && g.last !== ui.seen) { ui.seen = g.last; ui.show = { ...g.last, t: 0 }; ui.sel = g.last.pid ?? null; ui.fleet = null; ui.pend = null; }
  if (g.fi !== ui.front) { ui.front = g.fi; view.focus(g.fi); }
  refresh();
}

// ---------- the top strip ----------
function top() {
  if (app) { const d = g.takeDue(); if (d) { app.camp.wallet.bal += d; app.camp.wallet.earned = (app.camp.wallet.earned || 0) + d; } }
  const cap = g.resMax(), cell = (k, cls) => `<div class="${cls}"><b>${Math.floor(g.res[k])}<i style="color:var(--dim)">/${cap}</i></b><span>${RES[k]}</span></div>`;
  const loot = `<div class="lt" style="--lc:var(--cyan)"><b>${g.fleets.reduce((a, f) => a + (f.owner === 'fed' ? f.ships : 0), 0)}</b><span>SHIPS</span></div>`;
  $('top').innerHTML = `<button class="crest" data-a="menu" aria-label="Menu"><canvas id="crest-war" width="64" height="64"></canvas></button><div class="ttl">${esc(N.fed.toUpperCase())}<small>HIGH COMMAND</small></div><div class="rd">ROUND ${g.round}</div>
    <div class="ro">${cell('fuel', 'a')}${cell('ammo', 'a')}${cell('tech', 'a')}${cell('army', '')}${loot}</div><span class="sm2 ${g.ratBand() === 'high' ? 'cy' : g.ratBand() === 'mid' ? '' : 'rd2'}" style="align-self:center;white-space:nowrap">RATINGS ${Math.round(g.rat)}%</span><button class="plate amber btn sm" data-a="armoury">ARMOURY · ${app ? Math.floor(app.camp.wallet.bal) : 0} CR</button><button class="plate btn sm" data-a="menu">MENU</button>`;
  if (app) app.crest($('crest-war'));
  const last = g.log[g.log.length - 1];
  $('bulletin').className = last.kind; $('bulletin').textContent = `R${last.r} › ${last.text}`;
}

// ---------- whose turn it is ----------
function turnbar() {
  const h = '<div class="trk">' + C.fronts.map((x, i) => `<span class="${g.fi === i ? 'on' : ''}${g.atWar(i) ? '' : ' off'}" style="--tc:${C.color[x.f]}">${x.short}</span>`).join('') +
    `<button class="plate btn sm" data-a="cam">${view.front != null && view.front >= 0 ? 'WHOLE MAP' : 'THIS FRONT'}</button><button class="plate btn sm q" data-a="help" aria-label="Rules">?</button></div>`;
  // The only words here are what the enemy has just done. How to play is in the tutorial and behind the ? button.
  const sub = ui.show ? `<div class="tsub"><b style="color:${C.color[ui.show.f]}">${N.factions[ui.show.f].toUpperCase()}</b> ${esc(ui.show.text)}</div>` : '';
  $('turn').innerHTML = h + sub;
}

// ---------- the offices ----------
const head = () => '';
const shieldSvg = cl => `<svg class="shd ${cl}" viewBox="0 0 14 16"><path d="M1 1h12v8l-6 6-6-6z"/></svg>`;
function threatLine(p, t) {
  const D = g.strength(p.id), [w, cl] = odds(D, t.hp);
  return `<button class="ln lk" data-a="sel" data-p="${p.id}">${shieldSvg(cl)} <b>${esc(p.name)}</b> · ${N.factions[t.f]} ${ships(t.ships)} beside it (${t.hp} hit points), yours ${D} <span class="${cl}">${w}</span></button>`;
}
const threats = () => g.P.map(p => ({ p, t: g.threat(p.id) })).filter(x => x.t).sort((a, b) => a.p.ring - b.p.ring);
// A picture for every card, so a card is known at a glance (line drawings for now; painted art replaces them one for one).
const A = (d) => `<svg class="art" viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ART = {
  volley: '<path d="M6 20l10-6v12zM22 12h34M22 20h38M22 28h34"/><path d="M52 8l5 4-5 4M56 16l5 4-5 4M52 24l5 4-5 4"/>',
  brace: '<path d="M32 4l18 6v10c0 9-8 14-18 17C22 34 14 29 14 20V10z"/><path d="M24 22l8-8 8 8M24 29l8-8 8 8"/>',
  burn: '<path d="M60 20L38 10l4 10-4 10z"/><path d="M36 14H18M36 20H6M36 26H18" stroke-dasharray="6 4"/>',
  armour: '<path d="M8 28l8-18h22l14 9-14 9z"/><path d="M20 12v16M30 10v20M40 13v14M46 6l10 6-10 6"/>',
  drop: '<path d="M32 4v6M24 10h16l-3 14H27z"/><path d="M32 24l-5 8M32 24l5 8M10 36h44"/><path d="M12 8v10M20 4v8M44 4v8M52 8v10" stroke-dasharray="3 3"/>',
  bulwark: '<path d="M8 34V14h8v-6h8v6h16v-6h8v6h8v20z"/><path d="M8 22h48M22 14v8M42 14v8M32 22v12"/>',
  railgun: '<path d="M4 16h34v8H4zM38 20h22"/><path d="M12 16V10h8v6M46 6c6 6 6 22 0 28" stroke-dasharray="1 0"/><path d="M52 14l8 6-8 6"/>',
  acid: '<path d="M22 6c8 10 12 16 12 21a12 12 0 0 1-24 0c0-5 4-11 12-21z"/><path d="M44 12l10 4-2 6M46 26l8 2M16 26a6 6 0 0 0 6 6"/>',
  mirror: '<ellipse cx="38" cy="20" rx="12" ry="16"/><path d="M4 12l22 8-22 8M10 9l-6 3 4 5M34 12l8 6M34 22l6 4"/>',
  newsreel: '<rect x="8" y="6" width="48" height="28" rx="2"/><path d="M8 12h48M8 28h48M16 6v6M28 6v6M40 6v6M52 6v6M16 28v6M28 28v6M40 28v6M52 28v6M28 16l10 4-10 4z"/>',
  heroes: '<path d="M22 4l6 12M42 4l-6 12"/><circle cx="32" cy="25" r="11"/><path d="M32 18l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z"/>',
  lastStand: '<path d="M6 36c8-10 44-10 52 0M30 30V6M30 6c8-3 12 5 22 1v12c-10 4-14-4-22-1"/>',
  rush: '<path d="M6 10l8 5-8 5M20 6l8 5-8 5M20 22l8 5-8 5M34 12l8 5-8 5M48 16l10 4-10 4M6 26l8 5-8 5"/>',
  frenzy: '<path d="M6 12l8 8 6-8 6 8 6-8 6 8 6-8 6 8 8-8M6 30l8-8 6 8 6-8 6 8 6-8 6 8 6-8 8 8"/>',
  siege: '<circle cx="18" cy="28" r="8"/><path d="M14 20L44 6l6 10-26 14M50 8l10-4M52 14l10 0"/>',
  plating: '<path d="M10 8h14l6 6v12l-6 6H10zM34 8h14l6 6v12l-6 6H34z"/><path d="M14 14h6M14 26h6M38 14h6M38 26h6"/>',
  phase: '<path d="M36 4v32M42 4v32"/><path d="M4 20h24" /><path d="M46 20h14M54 14l6 6-6 6" stroke-dasharray="4 3"/>',
  fog: '<path d="M8 14c6-6 12 6 18 0s12-6 18 0 8 2 12 0M8 22c6-6 12 6 18 0s12-6 18 0 8 2 12 0M8 30c6-6 12 6 18 0s12-6 18 0 8 2 12 0"/>',
  dread: '<path d="M32 36V16M26 36l6-14 6 14"/><circle cx="32" cy="12" r="2.5"/><path d="M24 6a12 12 0 0 0 0 12M40 6a12 12 0 0 1 0 12M17 2a20 20 0 0 0 0 20M47 2a20 20 0 0 1 0 20"/>',
  triumph: '<path d="M24 36l4-24 4-8 4 8 4 24zM28 20h8M27 28h10"/><path d="M12 12l6 4M52 12l-6 4M8 24h8M56 24h-8"/>',
};
const SI = { h: '<path d="M2 12L10 4M6 3h5v5M3 8l3 3"/>', b: '<path d="M7 1l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V3z"/>', r: '<path d="M7 2v10M2 7h10"/>' };
const stat = (k, v) => `<i class="${k}"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SI[k]}</svg>${v}</i>`;
function cardHtml(id, attrs = '', cls = '') {
  const c = C.bcards[id], stats = [c.atk && stat('h', c.atk), c.block && stat('b', c.block > 50 ? 'ALL' : c.block), c.heal && stat('r', c.heal)].filter(Boolean).join('');
  return `<button class="card t-${c.kind}${cls}" ${attrs}><span class="ct"><em>${{ fleet: 'FLEET', world: 'WORLD', site: 'SITE', truth: 'PUBLICITY', foe: 'ENEMY' }[c.kind]}</em></span>${A(ART[id] || '')}<b>${c.name}</b><span class="st">${stats}</span><span class="tx">${c.when || c.text}</span></button>`;
}
function deckList(owner) {
  const n = {}; for (const id of g.deck(owner)) n[id] = (n[id] || 0) + 1;
  return Object.keys(n).map(id => `<div class="sm2"><b class="${C.bcards[id].kind === 'truth' ? 'cy' : 'am'}">${n[id]} × ${C.bcards[id].name}</b> <span class="dim">${C.bcards[id].text}</span></div>`).join('');
}

function tabSys() {
  const p = g.P[ui.sel];
  if (!p) return '<div class="sm2 dim">Pick a star system on the map.</div>';
  const fed = p.owner === 'fed', fl = g.fedLinked(), th = g.threat(p.id), fr = p.front >= 0 ? C.fronts[p.front] : null, T = C.worlds[g.keyWorld(p).type], n = g.shipsAt(p.id, p.owner);
  let h = `<section class="plate"><div class="row"><span class="big grow">${esc(p.name)}</span><span class="sm2 dim">${p.kind === 'capital' ? 'THE CAPITAL' : p.kind === 'home' ? 'ENEMY HOME' : fr.name}</span></div>`;
  h += `<div class="sm2" style="color:${C.color[p.owner]}">${(fed ? N.fed : N.factions[p.owner]).toUpperCase()} · ${g.strength(p.id)} HIT POINTS (system ${g.fort(p)} + ${ships(n)})${fed && !fl.has(p.id) ? ' · <span class="rd2">CUT OFF</span>' : ''}${p.dev ? ` · DEVELOPED ${p.dev}` : ''}</div>`;
  if (p.site) h += `<div class="sm2 am">${C.sites[p.site].name}: ${C.sites[p.site].text}</div>`;
  { const sc = g.sectorOf(p), own = g.sectorOwners().get(sc.id), mine = sc.sys.filter(id => g.P[id].owner === 'fed').length;
    h += `<div class="sm2 ${own === 'fed' ? 'cy' : 'dim'}">SECTOR: ${esc(sc.name.toUpperCase())} · ${mine} / ${sc.sys.length} HELD${own === 'fed' ? ` · WHOLE: +${Math.round(C.sector.yield * 100)}% OUTPUT, +${C.sector.fort} HP` : own ? ` · HELD WHOLE BY ${N.factions[own].toUpperCase()}` : ` · hold it all for +${Math.round(C.sector.yield * 100)}% output`}</div>`; }
  if (!fed && (p.station || p.base)) h += `<div class="sm2" style="color:${C.color[p.owner]}">${[p.station ? 'STATION: a yard for its ships' : '', p.base ? 'BASE: supplies for its yards' : ''].filter(Boolean).join(' · ')}</div>`;
  { const d = g.deposit(p); if (d) { const fr = C.fronts[C.factions.indexOf(d)]; h += `<div class="sm2" style="color:${C.color[d]}">DEPOSIT: ${fr.dep} → ${fr.loot}${fed ? (p.base ? '' : ' · needs a base') : ''}</div>`; } }
  if (th) h += threatLine(p, th);
  h += '<canvas id="sys"></canvas>';
  if (fed && p.id !== 0) {
    const ok = fl.has(p.id) && g.ready() && !busy(), L = C.link;
    const btn = (kind, key, have, what) => `<button class="plate amber btn pol" data-a="${key}" data-p="${p.id}" ${ok && (have || g.canFound(p.id, kind)) ? '' : 'disabled'}><b>${have ? what + ' ' + have : 'FOUND A ' + kind.toUpperCase() + ' · ' + costTxt(L.found[kind])}</b><span>${kind === 'station' ? `+${L.stationFort} HP a tier · eases the ground here` : `+${Math.round(L.baseYield * 100)}% output a charter · ships at ${L.shipAt}`}</span></button>`;
    h += `<div class="thr">${btn('station', 'orbit', p.station, 'STATION · TIER')}${btn('base', 'base', p.base, 'BASE · CHARTER')}</div>`;
    const showBtn = (kind, what) => p[kind] ? `<button class="plate btn pol" data-a="show" data-k="${kind}" data-p="${p.id}" ${ok && g.canShow(p.id, kind) ? '' : 'disabled'}><b>${what} · ${costTxt(g.showCost(kind))}</b><span>+${C.ratings.show.gain} ratings</span></button>` : '';
    if (p.station || p.base) h += `<div class="thr">${showBtn('station', 'HOLD A GALA')}${showBtn('base', 'HOLD A PARADE')}</div>`;
    const run = (have, on, what) => have ? `<span class="${on ? 'cy' : 'am'}">${what} ${on ? 'IN PROFIT' : 'NOT IN PROFIT'}</span>` : '';
    if (p.station || p.base) h += `<div class="sm2">${[run(p.station, p.sp, 'STATION'), run(p.base, p.bp, 'BASE')].filter(Boolean).join(' · ')}</div>`;
  }
  if (fed && T.yard) h += `<div class="sm2 am">${T.name}: ${T.yard}</div>`;
  p.worlds.forEach((w, i) => {
    const W = C.worlds[w.type];
    h += `<div class="mis"><div><b style="color:${W.col}">${esc(w.name)}</b> <span class="sm2 dim">${W.name}${W.res ? ` · +${W.y} ${RES[W.res]}` : W.fort ? ` · +${W.fort} DEFENCE` : ''}${W.card ? ` · feeds ${C.bcards[W.card].name}` : ''}</span></div><span></span></div>`;
  });
  return h + '</section>';
}
function tabInt() {
  let h = head('int');
  const rep = g.log.slice(ui.mark);
  if (rep.length) h += '<section class="rep"><h3>Report</h3>' + rep.slice(-8).map(e => `<div class="${e.kind}">${esc(e.text)}</div>`).join('') + '</section>';
  const adv = g.advice();
  if (adv.length) h += '<section class="rep"><h3>Suggested actions</h3>' + adv.map(a => a.pid != null ? `<button class="adv lk ${a.kind}" data-a="sel" data-p="${a.pid}">${esc(a.text)}</button>` : `<div class="${a.kind}">${esc(a.text)}</div>`).join('') + '</section>';
  const ths = threats();
  if (ths.length) h += '<section><h3>Needs defending</h3>' + ths.slice(0, 6).map(x => threatLine(x.p, x.t)).join('') + '</section>';
  h += '<section><h3>The enemy</h3>';
  C.fronts.forEach(fr => {
    const F = g.F[fr.f], own = g.P.filter(p => p.owner === fr.f).length, n = g.fleets.filter(x => x.owner === fr.f).reduce((a, x) => a + x.ships, 0);
    h += `<div class="front" style="--fc:${C.color[fr.f]}"><div class="fh"><b>${fr.short} · ${F.state === 'wait' ? 'UNKNOWN' : N.factions[fr.f]}</b><span class="sm2 dim">${F.state === 'wait' ? 'QUIET' : F.state === 'warn' ? `EXPECTED ROUND ${F.at}` : F.state === 'dead' ? 'DESTROYED' : `${own} SYSTEMS · ${ships(n)} · HOME ${g.strength(F.home)}`}</span></div>` +
      (F.state === 'active' ? `<div class="ln dim">${C.enemy[fr.f].text}</div>` + (() => { const pl = g.planSeen(fr.f); return pl ? `<div class="ln"><b class="am">PLAN: ${pl.name}</b> <span class="sm2">${pl.text}</span></div>` : `<div class="ln"><b class="dim">PLAN: ?</b> <button class="plate btn sm" data-a="leak" data-k="${fr.f}" ${g.canLeak(fr.f) ? '' : 'disabled'}>BUY A LEAK · ${C.plans.leak} TECH</button></div>`; })() : '') + '</div>';
  });
  return h + '</section>';
}
function tabDef() {
  const mine = g.fleets.filter(f => f.owner === 'fed'), total = mine.reduce((a, f) => a + f.ships, 0);
  let h = head('def') + `<section><h3>Your fleets · ${ships(total)}</h3>`;
  for (const fi of [-1, 0, 1, 2]) {
    const fs = mine.filter(f => g.P[f.at].front === fi); if (!fs.length) continue;
    h += `<div class="front" style="--fc:${fi < 0 ? 'var(--cyan)' : C.color[C.fronts[fi].f]}"><div class="fh"><b>${fi < 0 ? 'AT THE CAPITAL' : C.fronts[fi].name}</b><span class="sm2 dim">${fi === g.fi ? 'IN PLAY' : ''}</span></div>` +
      fs.map(f => `<button class="ln lk" data-a="pick" data-f="${f.id}">${ships(f.ships)} at <b>${esc(g.P[f.at].name)}</b> · ${f.moved ? '<span class="dim">has moved this round</span>' : '<span class="cy">ready</span>'}${f.wear >= 1 ? ` · <span class="${f.wear >= 50 ? 'rd2' : 'am'}">worn ${Math.round(f.wear)}%</span>` : ''}</button>`).join('') + '</div>';
  }
  h += `<button class="plate amber btn sm" data-a="fleets" style="margin-top:8px;width:100%">FLEET OFFICE</button>`;
  // the campaign: the one that is running, with its goal filling up and its rounds running down; or the three on offer
  { const cs = g.campState(), prize = (P) => [P.rat && `+${P.rat} RATINGS`, P.cr && `${P.cr} CR`, P.ships && `${P.ships} SHIPS`, P.tech && `${P.tech} TECH`].filter(Boolean).join(' · ');
    h += `</section><section><h3>Campaign${cs ? '' : 's on offer'} · won ${g.campLog.won} · failed ${g.campLog.lost}</h3>`;
    if (cs) h += `<div class="mis" style="display:block"><div class="row" style="justify-content:space-between"><b class="am">${cs.def.name}</b><span class="sm2 ${cs.left <= 2 ? 'rd2' : ''}">${'●'.repeat(Math.max(0, cs.left))}${'○'.repeat(Math.max(0, cs.def.rounds - cs.left))}</span></div>
      <div class="sm2">${cs.def.text}</div><div class="bar big2"><i style="width:${Math.min(100, cs.n / cs.of * 100)}%"></i></div><div class="sm2 cy">${Math.min(cs.n, cs.of)} / ${cs.of} · PRIZE ${prize(cs.def.prize)}</div></div>`;
    else h += `<div class="deckrow" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px">` + g.offers.map(id => { const c = g.campDef(id); return `<button class="card t-truth" data-a="camp" data-k="${id}" ${g.canCampaign(id) ? '' : 'disabled'} style="height:auto;min-height:190px;flex:0 0 132px;width:132px">${A(ART[c.art] || '')}<b>${c.name}</b><span class="tx">${c.text} ${c.rounds} rounds.</span><span class="st" style="font-size:11px;flex-wrap:wrap"><i class="h">STAKE ${costTxt(c.stake)}</i></span><span class="st" style="font-size:11px"><i class="r">${prize(c.prize)}</i></span></button>`; }).join('') + '</div>'; }
  h += `</section><section><h3>Your battle deck · ${g.deck('fed').length} cards</h3>${deckList('fed')}</section>`;
  return h;
}
function tabPro() {
  const inc = g.income();
  let h = head('pro') + '<section><h3>Stock</h3><table class="tb"><tr><th></th><th>HAVE</th><th>NEXT ROUND</th></tr>';
  for (const k of ['fuel', 'ammo', 'tech', 'army']) h += `<tr><td>${RES[k]}</td><td class="${k === 'fuel' ? 'am' : 'cy'}">${f1(g.res[k])}</td><td>+${f1(inc[k])}</td></tr>`;
  { const pay = g.postsPay(), bill = g.fleetBill(); h += `<tr><td>CREDITS</td><td class="am">${Math.floor(app ? app.camp.wallet.bal : 0)}</td><td>+${pay.cr}</td></tr>`; if (bill > 0) h += `<tr><td class="dim">FLEET UPKEEP</td><td></td><td class="rd2">−${f1(bill)} FUEL</td></tr>`; }
  // the market: the three products, their prices and which way each is moving
  const bal = app ? app.camp.wallet.bal : 0;
  h += `</table></section><section><h3>The market · ${Math.floor(bal)} CR</h3>`;
  for (const k of ['fuel', 'ammo', 'tech']) {
    const m = g.mkt[k], dir = m > 1.03 ? '<span class="rd2">▲ DEAR</span>' : m < 0.97 ? '<span class="cy">▼ CHEAP</span>' : '<span class="dim">STEADY</span>';
    h += `<div class="mis"><div><b>${RES[k]}</b> <span class="sm2">${dir}</span><div class="bar"><i style="width:${Math.min(100, m / C.market.max * 100)}%;background:${m > 1.03 ? 'var(--red)' : 'var(--cyan)'}"></i></div></div>
      <span class="row" style="flex-wrap:nowrap"><button class="plate amber btn sm" data-a="mbuy" data-k="${k}" ${g.canBuyRes(k, bal) ? '' : 'disabled'}>BUY 1 · ${g.buyPrice(k)} CR</button><button class="plate btn sm" data-a="msell" data-k="${k}" ${g.canSellRes(k) ? '' : 'disabled'}>SELL 1 · ${g.sellPrice(k)} CR</button></span></div>`;
  }
  return h + '</section>';
}
function tabExp() {
  let h = head('exp');
  const p = g.P[ui.sel], fl = g.fedLinked(), mine = p && p.owner === 'fed';
  h += `<section><h3>Special sites</h3>${mine ? `<div class="sm2 cy" style="margin-bottom:6px">${esc(p.name.toUpperCase())}</div>` : ''}`;
  for (const k in C.sites) {
    const s = C.sites[k], have = g.P.filter(q => q.site === k).length;
    h += `<button class="plate amber btn pol" data-a="site" data-k="${k}" ${mine && g.canSite(p.id, k) ? '' : 'disabled'}><b>${s.name} · ${s.cost} ${lootName(s.loot)}</b><span>${s.text} · ${g.loot[s.loot]} / ${s.cost} · built ${have} / ${C.siteMax}</span></button>`;
  }
  h += '</section><section><h3>Develop a system</h3>';
  if (mine && p.id !== 0 && p.worlds.some(w => C.worlds[w.type].res)) {
    const c = g.developCost(p), max = p.dev >= C.develop.max;
    h += `<div class="sm2"><b>${esc(p.name)}</b> · level ${p.dev} of ${C.develop.max}</div><button class="plate amber btn" style="width:100%;margin-top:6px" data-a="dev" data-p="${p.id}" ${!max && fl.has(p.id) && g.ready() && g.canPay(c) ? '' : 'disabled'}>${max ? 'FULLY DEVELOPED' : `DEVELOP · ${costTxt(c, true)} · +${C.develop.mult * 100}% OUTPUT`}</button>`;
  }
  return h + '</section>';
}
function tabTru() {
  const list = (o, none) => (g.truth[o].length ? g.truth[o].map(id => `<div class="sm2"><b class="cy">${C.bcards[id].name}</b> <span class="dim">${C.bcards[id].text}</span></div>`).join('') : `<div class="sm2 dim">${none}</div>`);
  let h = head('tru') + `<section><h3>Your publicity · ${g.truth.fed.length} of ${C.truthMax}</h3>${list('fed', 'None yet.')}</section>
    <section><h3>Enemy propaganda</h3>`;
  for (const f of C.factions) if (g.F[f].state === 'active') h += `<div class="front" style="--fc:${C.color[f]}"><div class="fh"><b>${N.factions[f]}</b></div>${list(f, 'None.')}</div>`;
  return h + '</section>';
}
function tabHum() {
  const inc = g.income();
  let h = head('hum') + '<section><h3>Who the colonies send</h3>';
  for (const k in C.policy) h += `<button class="plate amber btn pol${g.policy === k ? ' on' : ''}" data-a="pol" data-k="${k}" ${g.ready() ? '' : 'disabled'}><b>${C.policy[k].name}</b><span>${C.policy[k].text}</span></button>`;
  return h + `<div class="sm2 dim">NEXT ROUND: +${f1(inc.army)} ${N.army} · +${f1(inc.ammo)} ${N.ammo}</div></section>`;
}
function tabEmp() {
  const fl = g.fedLinked();
  let h = head('emp') + `<section><h3>Priority front · +${C.priority.fort} HP · +${(C.priority.yield - 1) * 100}% OUTPUT · −${C.priority.fuel} FUEL A SHIP</h3>`;
  C.fronts.forEach((fr, k) => {
    const sys = g.P.filter(p => p.front === k), mine = sys.filter(p => p.owner === 'fed'), thr = mine.filter(p => g.threat(p.id)).length;
    const mineS = g.fleets.filter(f => f.owner === 'fed' && g.P[f.at].front === k).reduce((a, f) => a + f.ships, 0), foeS = g.fleets.filter(f => f.owner === fr.f).reduce((a, f) => a + f.ships, 0);
    h += `<button class="plate amber btn pol${g.priority === k ? ' on' : ''}" data-a="prio" data-k="${k}" ${g.ready() ? '' : 'disabled'}><b>${fr.name}${g.priority === k ? ' · PRIORITY' : ''}</b>
      <span>${mine.filter(p => fl.has(p.id)).length} of ${sys.length} systems · your ${ships(mineS)} against ${foeS}${thr ? ` · ${thr} threatened` : ''}</span></button>`;
  });
  return h + '</section>';
}
function tabUni() {
  const fed = g.P.filter(p => p.owner === 'fed').length, near = new Set(g.fleets.filter(f => f.owner !== 'fed' && g.P[0].adj.includes(f.at)).map(f => f.owner)).size;
  const R = C.ratings, band = g.ratBand(), pct = (x) => (x > 1 ? '+' : '') + Math.round((x - 1) * 100) + '%';
  const eff = band === 'mid' ? 'Output as normal.' : `Output ${pct(g.ratYield())}.`;
  return head('uni') + `<section><h3>Ratings</h3><div class="bar big2"><i style="width:${g.rat}%"></i></div>
    <div class="sm2 ${band === 'high' ? 'cy' : band === 'mid' ? '' : 'rd2'}" style="margin-top:6px">${Math.round(g.rat)}% · ${eff} Sponsors pay ${pct(g.ratPay())}.</div>
    <div class="sm2 dim">${R.high}% and over: output ${pct(R.yield.high)}. Under ${R.low}%: ${pct(R.yield.low)}. Under ${R.sack}% for ${R.sackRounds} rounds: you are replaced.</div>
    ${g.sack ? `<div class="sm2 rd2">THE BOARD MEETS IN ${R.sackRounds - g.sack}</div>` : ''}</section><section><h3>The standing of the war</h3><div class="sm2">SYSTEMS HELD: ${fed} / ${g.P.length}</div>
    <div class="bar big2"><i style="width:${fed / g.P.length * 100}%"></i></div>
    <div class="sm2 ${near >= 2 ? 'rd2' : near ? 'am' : 'dim'}" style="margin-top:6px">ENEMIES BESIDE ${N.capital.toUpperCase()}: ${near}</div>
    <div class="sm2 dim">ENEMIES DESTROYED: ${C.factions.filter(f => g.F[f].state === 'dead').length} / 3</div>
    <div class="sm2 dim">Systems taken ${g.stats.taken} · fallen ${g.stats.fallen} · defences held ${g.stats.held}</div></section>
    <section><div class="row"><button class="plate btn sm grow" data-a="log">WAR LOG</button><button class="plate btn sm grow" data-a="help">RULES</button></div>
    <div class="row" style="margin-top:6px"><button class="plate amber btn sm grow" data-a="asktut">TUTORIAL</button><button class="plate btn sm grow" data-a="ask">NEW WAR</button></div></section>`;
}
const TAB = { sys: tabSys, int: tabInt, def: tabDef, pro: tabPro, exp: tabExp, tru: tabTru, hum: tabHum, emp: tabEmp, uni: tabUni };
function side() {
  const adv = g.advice().filter(a => a.kind === 'bad' || a.kind === 'warn').length, sites = Object.keys(C.sites).some(k => g.P.some(p => g.canSite(p.id, k)));
  const dot = { int: adv, exp: sites ? 1 : 0 };
  $('mins').innerHTML = TABS.map(k => `<button class="min${ui.open && ui.tab === k ? ' on' : ''}" data-a="tab" data-t="${k}">${svg(MICON[k])}<span>${C.offices[k].short}</span>${dot[k] ? `<i>${dot[k]}</i>` : ''}</button>`).join('');
  $('side').classList.toggle('open', ui.open);
  const p = g.P[ui.sel];
  $('panel').innerHTML = `<div class="sh"><b>${ui.tab === 'sys' ? (p ? esc(p.name.toUpperCase()) : 'SYSTEM') : C.offices[ui.tab].name + ' OFFICE'}</b><button class="plate btn sm" data-a="shut" aria-label="Close">×</button></div>` + TAB[ui.tab]();
}

// ---------- the decision bar ----------
// What you can do right now, in one place: the fleet you picked up, the order waiting to be confirmed, what can be
// built at the system you tapped, and the button that holds the front.
function actbar() {
  const fr = front(), p = g.P[ui.sel], f = myFleet(), lock = busy() || !g.ready();
  let h = '';
  if (g.phase === 'over' || lock) h = '<div class="arow"></div>';
  else if (ui.pend) {
    const q = g.P[ui.pend.pid], n = ui.half ? Math.ceil(f.ships / 2) : f.ships, atk = ui.pend.type === 'atk', [w, cl] = odds(n * HP, g.strength(q.id));
    h = `<div class="arow"><span class="grow"><b class="${atk ? 'am' : 'cy'}">${esc(q.name.toUpperCase())}</b> <span class="sm2">${atk ? `${n * HP} vs ${g.strength(q.id)} <b class="${cl}">${w}</b>` : `${g.strength(q.id)} → ${g.strength(q.id) + n * HP}`}</span></span><button class="plate btn sm" data-a="pcancel">CANCEL</button></div>
      <button class="plate btn go" data-a="confirm">${atk ? 'ATTACK' : 'MOVE'} · ${ships(n)}</button>`;
  } else {
    let row = '';
    if (f) row = `<b class="cy grow">${esc(g.P[f.at].name.toUpperCase())} · ${ships(f.ships)}</b>` + (f.ships > 1 ? `<button class="plate btn sm${ui.half ? ' on' : ''}" data-a="half">${ui.half ? 'SEND HALF' : 'SEND ALL'}</button>` : '');
    else if (p) row = `<b class="${p.owner === 'fed' ? 'cy' : 'rd2'} grow">${esc(p.name.toUpperCase())} · ${g.strength(p.id)} HP${p.station ? ' · STN ' + p.station : ''}${p.base ? ' · BASE ' + p.base : ''}</b>`;
    let build = '';
    if (p && p.owner === 'fed' && g.onFront(p.id)) {
      build += `<button class="plate amber btn sm" data-a="build" data-p="${p.id}" ${g.canBuild(p.id) ? '' : 'disabled'}>${p.built ? 'BUILT' : !g.hasYard(p) ? '+1 SHIP · NEEDS A STATION' : '+1 SHIP · ' + costTxt(g.shipCost(p))}</button>`;
      for (const k in C.sites) if (g.canSite(p.id, k)) build += `<button class="plate amber btn sm" data-a="site" data-k="${k}">${C.sites[k].name} · ${C.sites[k].cost}</button>`;
    }
    h = (p ? `<div class="arow">${row}<button class="plate btn sm" data-a="info">INFO</button><button class="plate btn sm" data-a="unsel">×</button></div>` : '') +
      `<div class="arow">${build}<button class="plate btn go hold" id="commit" data-a="hold">${fr ? `HOLD ${fr.short}` : 'END ROUND'}</button></div>`;
  }
  $('deck').innerHTML = h;
  // what is ringed on the map: where the picked-up fleet can attack (amber) or move to (cyan)
  ui.dest = null;
  if (f && !lock && !ui.pend) { ui.dest = new Map(); for (const id of g.posts(f)) ui.dest.set(id, 'move'); for (const id of g.targets(f)) ui.dest.set(id, 'attack'); }
  document.body.style.setProperty('--dh', $('deck').offsetHeight + $('mins').offsetHeight + $('coach').offsetHeight + 'px');
}

// ---------- the battle screen ----------
function fight() {
  const el = $('fight'), b = g.battle;
  if (!fighting()) { el.hidden = true; return; }
  el.hidden = false;
  const p = g.P[b.pid], you = b.you, foe = b.foe, bar = (s, color, name) => `<div class="hp"><div class="row"><b style="color:${color}">${name}</b><span class="grow"></span><b>${Math.max(0, Math.ceil(s.hp))}</b><span class="sm2 dim">/ ${s.max} · ▲${s.fire}</span></div><div class="bar big2"><i style="width:${Math.max(0, s.hp) / s.max * 100}%;background:${color}"></i></div></div>`;
  let h = `<div class="fh2"><b>${b.kind === 'atk' ? 'YOUR ATTACK ON' : 'DEFEND'} ${esc(p.name.toUpperCase())}</b><span class="sm2 dim">ROUND ${b.round + (b.done ? 0 : 1)}</span></div>
    <canvas id="fc"></canvas><div class="hps">${bar(you, 'var(--cyan)', 'YOU')}${bar(foe, C.color[b.f], N.factions[b.f].toUpperCase())}</div>
    <div class="flog">${b.lines.map(l => `<div>${esc(l)}</div>`).join('')}</div>${b.gains && Object.keys(b.gains).length ? `<div class="gains">${Object.entries(b.gains).map(([k, d]) => `<span class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '+' : '−'}${Math.abs(d)}${k === 'rat' ? '%' : ''} <i>${k === 'rat' ? 'RATINGS' : N[k] || k.toUpperCase()}</i></span>`).join('')}</div>` : ''}`;
  if (b.pending) h += `<div class="fres am">NEITHER SIDE GIVES WAY</div><div class="fchoice"><button class="plate btn go" data-a="press">PRESS THE ATTACK<small>${C.battle.press.fuel} FUEL · ${C.battle.press.rounds} MORE ROUNDS NOW</small></button>
      <button class="plate btn" data-a="bclose">BREAK OFF<small>THE FIGHT GOES ON NEXT ROUND</small></button></div>`;
  else if (b.done) h += `<div class="fres ${b.win ? 'cy' : b.win === null ? 'am' : 'rd2'}">${b.win ? 'VICTORY' : b.win === null ? 'THE FIGHT GOES ON' : 'DEFEAT'} · ${esc(b.result || '')}</div><button class="plate btn go" data-a="bclose">CONTINUE</button>`;
  else if (ui.fx && ui.fx.t < 0.9) h += '<div class="fhand wait"><span class="sm2 dim">…</span></div>';
  else if (b.round === 0 && !ui.cards && ui.tut == null) h += `<div class="sm2 dim" style="margin-bottom:6px">${N.factions[b.f].toUpperCase()} COMMITS ${ships(foe.ships)}${b.kind === 'atk' ? ` AND THE SYSTEM'S ${b.fort} DEFENCES` : ''} · GROUND THREAT L${g.groundLevel()} · ONE ENGAGEMENT IS ${C.battle.engage} ROUNDS</div>
    ${(() => { const st = g.stunt(); return st ? `<div class="sm2 am" style="margin:6px 0">SPONSOR STUNT · <b>${st.name}</b> · ${st.text} <span class="cy">+${C.ratings.stunt} RATINGS</span></div>` : '<div class="sm2 dim" style="margin:6px 0">NOT AIRED · one fight a round is on camera</div>'; })()}
    ${(() => { const s = g.groundSupport(b.pid), t = []; if (s.base) t.push(`<span class="cy">BASE NEARBY · GARRISON +${s.garrison}</span>`); if (s.station) t.push(`<span class="cy">STATION NEARBY · +${s.station * C.support.stationLives} REINFORCEMENTS</span>`); if (s.ratings) t.push(`<span class="${s.ratings > 0 ? 'cy' : 'rd2'}">RATINGS · ${s.ratings > 0 ? '+' : ''}${s.ratings} REINFORCEMENTS</span>`); return t.length ? `<div class="sm2" style="margin:6px 0">ON THE GROUND: ${t.join(' · ')}</div>` : ''; })()}
    <div class="fchoice"><button class="plate btn go" data-a="ground" ${g.canGround() ? '' : 'disabled'}>${b.kind === 'atk' ? 'LAND THE ASSAULT' : g.postAt(b) === 'base' ? 'DEFEND AND EVACUATE THE BASE' : g.postAt(b) === 'station' ? 'DEFEND THE STATION\'S GROUND SITE' : 'DEFEND ON THE GROUND'} · ${C.groundAmmo} AMMO<small>${g.canGround() ? '' : 'NOT ENOUGH AMMUNITION · '}${b.kind === 'atk' ? 'ASSAULT MISSION' : 'DEFENCE MISSION'} · ARMOURY, BRIEFING, THEN THE DROP</small></button>
      <button class="plate btn" data-a="cards">FIGHT IT IN SPACE<small>FLEET ACTION · CARDS</small></button></div>`;
  else if (you.hand.length) h += `<div class="fhand">${you.hand.map((id, i) => cardHtml(id, `data-a="bplay" data-i="${i}"`)).join('')}</div><button class="plate btn sm" style="width:100%;margin-top:6px" data-a="bplay">PASS</button>`;
  else h += '<div class="fhand wait"><b class="dim">GUNS ONLY</b></div>';
  $('fbody').innerHTML = h;
}

function refresh() { tutorial(); top(); document.body.style.setProperty('--th', $('top').offsetHeight + 'px'); turnbar(); side(); coach(); actbar(); fight(); outline(); store(); if (g.over && !g.battle) gameOver(); }

// ---------- the tutorial coach ----------
let tutStep = -1;
function tutorial() {
  if (ui.tut == null) { ui.hint = null; return; }
  if (g.over) { ui.tut = null; ui.hint = null; return; }
  for (let guard = 0; guard < STEPS.length; guard++) {
    const st = STEPS[ui.tut]; if (!st) { ui.tut = null; ui.hint = null; return; }
    if (st.wait && st.wait(g, ui)) { ui.hint = null; return; }
    const fresh = tutStep !== ui.tut;
    if ((fresh && st.skipIf && st.skipIf(g, ui)) || (st.done && st.done(g, ui))) { ui.tut++; continue; }
    if (fresh) { tutStep = ui.tut; if (st.tab && g.ready()) { ui.tab = st.tab; ui.open = true; } else if (st.shut) ui.open = false; }
    ui.hint = st.hint ? st.hint(g, ui) : null;
    return;
  }
}
// On a mouse it is a click, on a touch screen a tap.
const FINE = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
const words = (s) => (FINE ? s.replace(/\bTap\b/g, 'Click').replace(/\btap\b/g, 'click') : s);
function coach() {
  const st = ui.tut == null ? null : STEPS[ui.tut], inFight = fighting(), show = st && (inFight || !busy());
  for (const el of [$('coach'), $('fcoach')]) el.hidden = true;
  if (!show) return;
  const el = inFight ? $('fcoach') : $('coach'); el.hidden = false;
  el.innerHTML = `<div class="ctx"><em>TUTORIAL · ${ui.tut + 1} OF ${STEPS.length}</em><p>${words(st.text(g, ui))}</p></div><div class="cbt">` +
    (st.next ? `<button class="plate btn go" data-a="tnext">${st.last ? 'FINISH' : 'NEXT'}</button>` : '') +
    (st.help ? `<button class="plate amber btn sm" data-a="thelp">${st.help}</button>` : '') +
    (st.next ? '' : '<button class="plate btn sm" data-a="tnext">SKIP STEP</button>') + '<button class="plate btn sm" data-a="tend">END TUTORIAL</button></div>';
}
function outline() {
  const st = ui.tut == null ? null : STEPS[ui.tut];
  document.querySelectorAll('.hl').forEach(x => x.classList.remove('hl'));
  if (!st || !st.hi || (st.wait && st.wait(g, ui))) return;
  document.querySelectorAll(st.hi).forEach(x => x.classList.add('hl'));
}

// ---------- overlays ----------
function modal(html) { $('modal').innerHTML = `<div class="plate amber box">${words(html)}</div>`; $('modal').hidden = false; }
export { modal };
// THE FLEET OFFICE: every fleet, what it is made of, how worn it is and where it mends; what the yards are turning out;
// and what the fleets will cost when the round ends.
function fleetOffice() {
  const F = C.fleet, mine = g.fleets.filter(f => f.owner === 'fed').sort((a, b) => b.ships - a.ships), total = mine.reduce((a, f) => a + f.ships, 0), bill = g.fleetBill();
  const cols = ['var(--amber)', 'var(--cyan)', '#c8ff6a'], pc = (x) => Math.round(x * 100);
  let h = `<h2>Fleet Office</h2><p class="sm2">${ships(total)} in ${mine.length} fleet${mine.length === 1 ? '' : 's'} · upkeep at the end of the round: <b class="${bill > g.res.fuel ? 'rd2' : 'am'}">${bill.toFixed(1)} fuel</b> <span class="dim">(the first ${F.upkeep.free} ships are free)</span></p>
    <h3>The yards are building</h3><div class="row" style="margin-bottom:6px">${[['bal', 'BALANCED']].concat(F.roles.map(r => [r.id, r.name])).map(([k, n]) => `<button class="plate btn sm grow${g.yard === k ? ' on' : ''}" data-a="yard" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="sm2 dim" style="margin-bottom:10px">${F.roles.map((r, i) => `<span style="color:${cols[i]}">${r.name}</span> ${r.text}`).join(' · ')}</div>
    ${g.P.some(p => p.built && p.owner === 'fed') ? `<div class="sm2">Built this round at ${g.P.filter(p => p.built && p.owner === 'fed').map(p => esc(p.name)).join(', ')}.</div>` : ''}<h3>Your fleets</h3>`;
  for (const f of mine) {
    const p = g.P[f.at], mix = f.mix || [1 / 3, 1 / 3, 1 / 3], rep = g.repairAt(f), w = f.wear || 0;
    h += `<div class="mis" style="display:block"><div class="row" style="justify-content:space-between"><b>${ships(f.ships)} at ${esc(p.name)}</b><span class="sm2 ${w >= 50 ? 'rd2' : w >= 1 ? 'am' : 'cy'}">${w >= 1 ? 'WORN ' + Math.round(w) + '%' : 'FRESH'}</span></div>
      <div style="display:flex;height:6px;margin:5px 0;background:var(--empty)">${mix.map((x, i) => `<i style="width:${x * 100}%;background:${cols[i]}"></i>`).join('')}</div>
      <div class="sm2 dim">${F.roles.map((r, i) => `${r.name} ${pc(mix[i])}%`).join(' · ')}</div>
      <div class="sm2">Attack fire ${g.fleetFire(f, true)} · defends with +${g.escortHp(f)} HP · ${rep >= 1 ? `<span class="cy">mends ${Math.round(rep)}% a round here</span>` : '<span class="am">no repair here</span>'}</div></div>`;
  }
  modal(h + '<button class="plate btn go" data-a="close" style="margin-top:10px">DONE</button>');
}
function help() {
  modal(`<h2>${N.game}</h2>
    <p>You are ${N.fed} High Command at ${N.capital}. Three enemies come at you on three war fronts: east, west and south.</p>
    <ul>
      <li><b class="am">One front at a time.</b> Each round goes east, west, south. The map turns to the front in play. First the enemy there takes one action. Then you make one decision.</li>
      <li><b class="am">Your decision:</b> attack, defend, or hold. Tap one of your fleets, then an amber ring to attack that system or a cyan ring to move the fleet there. A fleet may travel any distance through systems you hold, once a round, so you can bring one across from another front.</li>
      <li><b class="am">Battles</b> are a card game. Each side has hit points (${HP} a ship, plus the system's own) and draws ${C.battle.hand} cards at random from its deck. Each round you play one card, then every ship fires. The first out of hit points loses and falls back with half its ships.</li>
      <li><b class="am">Your deck</b> is made of what you hold: worlds add cards, and so do special sites.</li>
      <li><b class="am">Building is extra.</b> On the front in play you can build a ship at each of your systems, and special sites with that front's own resource, without using up your decision.</li>
      <li><b class="am">Shields</b> mark systems of yours with an enemy fleet beside them: cyan is safe, amber is close, red is likely to fall.</li>
      <li><b class="cy">Win</b> by taking all three enemy homes. <b class="rd2">Lose</b> if ${N.capital} falls, or if two enemies strike it in the same round.</li>
    </ul>
    <button class="plate btn go" data-a="close">TO YOUR POST</button>`);
}
function logModal() {
  modal('<h2>War log</h2><div class="rep">' + g.log.slice(-60).reverse().map(e => `<div class="${e.kind}">R${e.r} · ${esc(e.text)}</div>`).join('') + '</div><button class="plate btn go" data-a="close" style="margin-top:10px">CLOSE</button>');
}
function gameOver() {
  if (!$('modal').hidden) return;
  const s = g.stats, won = g.over.result === 'won';
  modal(`<h2>${won ? 'Total victory' : /replaced/.test(g.over.why) ? 'You have been replaced' : 'The capital is lost'}</h2><p>${esc(g.over.why)}</p><p class="dim">Round ${g.over.round} · systems taken ${s.taken} · systems fallen ${s.fallen} · defences held ${s.held}</p><button class="plate btn go" data-a="totitle">MAIN MENU</button>`);
}

// ---------- input ----------
// Tap a system: with a fleet picked up, a ringed system becomes an order to confirm. Otherwise the tap picks the
// system up, and its fleet with it if that fleet can still move.
function tapSystem(id) {
  if (busy() || !g.ready()) return;
  const f = myFleet();
  if (f && id != null && ui.dest && ui.dest.has(id)) { ui.pend = { type: ui.dest.get(id) === 'attack' ? 'atk' : 'move', pid: id }; ui.sel = id; return; }
  ui.pend = null;
  if (id == null) { ui.sel = null; ui.fleet = null; ui.open = false; return; }
  const here = g.fleetAt(id, 'fed');
  ui.sel = id; ui.fleet = here && !here.moved ? here.id : null; ui.half = false; ui.tab = 'sys';
}
document.addEventListener('click', e => {
  if (!active) return;
  const el = e.target.closest('[data-a]'); if (!el || el.disabled || !el.closest('#s-war, #modal')) return;
  const d = el.dataset;
  switch (d.a) {
    case 'menu': return app.menu();
    case 'armoury': return app.armoury();
    case 'show': g.show(+d.p, d.k); break;
    case 'totitle': $('modal').hidden = true; return app.endCampaign();
    case 'cards': ui.cards = true; break;
    case 'ground': { const a = { battle: g.battle, system: g.P[g.battle.pid], level: g.groundLevel(), round: g.round, support: g.groundSupport(g.battle.pid), post: g.postAt() }; return app.theatre('ground', a); }
    case 'press': g.press(); ui.fx = null; ui.auto = 0; break;
    case 'orbit': if (!g.P[+d.p].station && !g.found(+d.p, 'station')) break; return app.theatre('orbit', { system: g.P[+d.p] });
    case 'base': if (!g.P[+d.p].base && !g.found(+d.p, 'base')) break; return app.theatre('base', { system: g.P[+d.p] });
    case 'tab': if (ui.open && ui.tab === d.t) ui.open = false; else { ui.tab = d.t; ui.open = true; } break;
    case 'shut': ui.open = false; break;
    case 'info': ui.tab = 'sys'; ui.open = true; break;
    case 'sel': tapSystem(+d.p); ui.open = false; break;
    case 'pick': { const f = g.fleets.find(x => x.id === +d.f); if (f) { tapSystem(f.at); ui.open = false; } break; }
    case 'half': ui.half = !ui.half; break;
    case 'pcancel': ui.pend = null; ui.sel = myFleet() ? myFleet().at : null; break;
    case 'unsel': ui.sel = null; ui.fleet = null; ui.pend = null; break;
    case 'confirm': {
      const f = myFleet(), n = f && ui.half ? Math.ceil(f.ships / 2) : undefined, pd = ui.pend; if (!f || !pd) break;
      ui.mark = g.log.length; ui.fleet = null; ui.pend = null; ui.open = false; ui.sel = pd.pid; ui.fx = null;
      if (pd.type === 'atk') g.attack(f.id, pd.pid, n); else g.moveTo(f.id, pd.pid, n);
      return step();
    }
    case 'hold': ui.mark = g.log.length; ui.fleet = null; ui.pend = null; ui.sel = null; ui.open = false; g.hold(); return step();
    case 'build': g.build(+d.p); break;
    case 'site': g.site(ui.sel, d.k); break;
    case 'bplay': if (g.battle && !g.battle.done && !(ui.fx && ui.fx.t < 0.9)) { const ev = g.battlePlay(d.i == null ? null : +d.i); ui.fx = { ev, t: 0 }; ui.auto = 0; } break;
    case 'bclose': ui.fx = null; ui.cards = false; ui.mark = Math.min(ui.mark, g.log.length); g.battleClose(); return step();
    case 'cam': view.focus(view.front != null && view.front >= 0 ? -1 : g.fi); break;
    case 'mbuy': if (app && g.buyRes(d.k, app.camp.wallet)) app.keep(); break;
    case 'msell': if (app && g.sellRes(d.k, app.camp.wallet)) app.keep(); break;
    case 'dev': g.develop(+d.p); break;
    case 'pol': g.setPolicy(d.k); break;
    case 'prio': g.setPriority(+d.k); break;
    case 'tnext': ui.tut++; break;
    case 'thelp': STEPS[ui.tut].do(g, ui); return step();
    case 'tend': ui.tut = null; break;
    case 'tut': $('modal').hidden = true; app.newWar(SEED, true); return;
    case 'zin': view.zoomAt(1.4); return;
    case 'zout': view.zoomAt(1 / 1.4); return;
    case 'help': return help();
    case 'log': return logModal();
    case 'camp': g.campaign(d.k); break;
    case 'leak': g.leak(d.k); break;
    case 'fleets': return fleetOffice();
    case 'yard': g.setYard(d.k); return fleetOffice();
    case 'asktut': return modal('<h2>Play the tutorial?</h2><p>It starts a new guided war. The war in progress will be lost.</p><button class="plate btn go" data-a="tut">START THE TUTORIAL</button><button class="plate btn" style="width:100%;margin-top:8px" data-a="close">KEEP PLAYING</button>');
    case 'ask': return modal('<h2>New war?</h2><p>The war in progress will be lost.</p><button class="plate btn go" data-a="new">START A NEW WAR</button><button class="plate btn" style="width:100%;margin-top:8px" data-a="close">KEEP PLAYING</button>');
    case 'close': $('modal').hidden = true; return;
    case 'new': $('modal').hidden = true; app.newWar(0, false); return;
  }
  refresh();
});

// The map: tap to pick up and place, drag to move the map, pinch or scroll to zoom.
const map = $('map'), ptr = new Map(); let moved = 0, pinch = 0;
const at = e => { const r = map.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
map.addEventListener('pointerdown', e => { map.setPointerCapture(e.pointerId); ptr.set(e.pointerId, at(e)); if (ptr.size === 1) moved = 0; pinch = 0; });
map.addEventListener('pointermove', e => {
  if (!ptr.has(e.pointerId)) return;
  const [x, y] = at(e), [px, py] = ptr.get(e.pointerId); ptr.set(e.pointerId, [x, y]);
  if (ptr.size === 1) { moved += Math.abs(x - px) + Math.abs(y - py); if (moved > 8) { if (e.buttons & 6 || e.shiftKey) view.turn((x - px) * 0.006); else view.pan(x - px, y - py); } }     // right or middle button, or Shift: turn the board
  else if (ptr.size === 2) {
    const [a, b] = [...ptr.values()], dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinch) view.zoomAt(dist / pinch, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    pinch = dist; moved = 99;
  }
});
const up = e => {
  if (!ptr.has(e.pointerId)) return;
  const [x, y] = ptr.get(e.pointerId); ptr.delete(e.pointerId); pinch = 0;
  if (ptr.size || moved > 8 || e.type === 'pointercancel') return;
  tapSystem(view.pick(g, x, y)); refresh();
};
map.addEventListener('pointerup', up); map.addEventListener('pointercancel', up);
map.addEventListener('contextmenu', e => e.preventDefault());
// The keyboard, for a desk: W A S D or the arrows slide the map, Q and E turn it, + and - zoom, F looks down the front in play.
const held = new Set();
addEventListener('keydown', e => { if (!active || e.target.closest('input, textarea') || !$('modal').hidden) return; const k = e.key.toLowerCase(); held.add(k);
  if (k === '+' || k === '=') view.zoomAt(1.2); else if (k === '-') view.zoomAt(1 / 1.2); else if (k === 'f' && g) view.focus(g.fi >= 0 ? g.fi : null); });
addEventListener('keyup', e => held.delete(e.key.toLowerCase())); addEventListener('blur', () => held.clear());
function keys(dt) {
  if (!held.size || fighting()) return; const v = 520 * dt, on = (...k) => k.some(x => held.has(x));
  const dx = (on('a', 'arrowleft') ? 1 : 0) - (on('d', 'arrowright') ? 1 : 0), dy = (on('w', 'arrowup') ? 1 : 0) - (on('s', 'arrowdown') ? 1 : 0);
  if (dx || dy) view.pan(dx * v, dy * v);
  const r = (on('q') ? 1 : 0) - (on('e') ? 1 : 0); if (r) view.turn(r * 1.4 * dt);
}
map.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = at(e); view.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
new ResizeObserver(() => { view.resize(); if (view.front != null) view.focus(view.front); }).observe($('stage'));

// ---------- the clock ----------
let last = performance.now(), last0 = last;
export function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000) * ui.speed; last = now;
  if (!active || !g) return;
  keys(Math.min(0.1, (now - last0) / 1000)); last0 = now;
  const was = busy(), wasFight = fighting();
  if (ui.anims.length) { for (const a of ui.anims) a.t += dt; ui.anims = ui.anims.filter(a => a.t < 0.6); }
  else if (ui.show) { ui.show.t += dt; if (ui.show.t > (ui.show.arrived ? 2.4 : 1.5)) ui.show = null; }
  if (was !== busy() || wasFight !== fighting()) refresh();
  // in a battle: let the round just played be seen, then let the guns decide once the cards are spent
  if (fighting()) {
    const b = g.battle;
    if (ui.fx) { const before = ui.fx.t < 0.9; ui.fx.t += dt; if (before && ui.fx.t >= 0.9) refresh(); }
    if (!b.done && !b.you.hand.length && (!ui.fx || ui.fx.t >= 0.9)) { ui.auto += dt; if (ui.auto > 0.35) { ui.auto = 0; ui.fx = { ev: g.battlePlay(null), t: 0 }; refresh(); } }
    const fc = $('fc'); if (fc) drawBattle(fc, g, b, ui.fx, now / 1000);
  }
  view.draw(g, ui, now / 1000);
  const sc = $('sys'), p = g.P[ui.sel];
  if (sc && p && sc.offsetParent) { const th = g.threat(p.id); drawPlanet(sc, g, p, { threat: th ? th.hp : 0, enemy: th ? th.f : p.owner, mine: g.shipsAt(p.id, 'fed'), foe: p.owner === 'fed' ? 0 : g.shipsAt(p.id, p.owner) }, now / 1000); }
}

// ---------- in and out ----------
// open(): the war room comes on screen with this war (a saved one, or a new one from a seed).
export function open(a, { saved = null, seed = 0, tutorial = false } = {}) {
  app = a; active = true; N.fed = a.faction.name || N.fed; N.capital = a.faction.capital || N.capital;
  if (saved || !g || seed || tutorial) start(seed, saved, tutorial);
  g.P[0].name = N.capital;
  view.resize(); if (view.front != null) view.focus(view.front);
  refresh();
}
export function show(on) { active = on; if (on) { view.resize(); if (view.front != null) view.focus(view.front); refresh(); } }
// A battle settled on the ground comes back here: the result goes on the map and the battle screen shows it.
export function groundResult(win, left, res) { if (g && g.battle && !g.battle.done) { g.battleResolve(win, left, res); ui.fx = null; ui.cards = false; } }
// A station or a base has changed: its tier or rank goes on the system.
export function setSite(pid, kind, level, profit) { if (g && g.P[pid]) { g.P[pid][kind] = level; g.P[pid][kind === 'station' ? 'sp' : 'bp'] = profit ? 1 : 0; g._sec = null; } }
export function redraw() { if (g && active) refresh(); }
export function lostSites() { const l = (g && g.lostSites) || []; if (g) g.lostSites = []; return l; }
