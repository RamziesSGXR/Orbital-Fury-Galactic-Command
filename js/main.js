// ORBITAL FURY: GALACTIC COMMAND. One war, one command, four posts.
//
// This file is the game's spine: the title, founding a command (name, crest, colours), the one campaign save, the menu,
// and the passage between the war room (the galaxy map) and the three theatres under it:
//   GROUND  fire support from orbit over a ground battle   (js/modes/ground.js, rules in js/ground)
//   ORBIT   the station over a system                      (js/modes/orbit.js,  rules in js/orbit)
//   BASE    the base on its key world                      (js/modes/base.js,   rules in js/base)
// The theatres are loaded when first entered. Each one fills the same frame (#s-theatre) and hands back what the map
// needs to know: who won, what tier the station is, what rank the base is.
import { VERSION, C as GC } from './galaxy/config.js';
import * as War from './galaxy/screen.js';
import { drawLogo, ensureLogo, readUpload, SHAPES, SYMBOLS, PATTERNS, PALETTE } from './core/logo.js';
import { SEED } from './galaxy/tutorial.js';
import { shopItems, buy, equip, unequip, shownAt, TIER_MAX } from './ground/data/kit.js';
import { Audio } from './ground/audio.js';
import { newKit, newWallet } from './ground/data/kit.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const KEY = 'ofgc.campaign', SET_KEY = 'ofgc.settings';
const qs = new URLSearchParams(location.search);

// ---------------------------------------------------------------- settings and sound
const settings = { volume: 0.6, muted: false, ...read(SET_KEY, {}) };
export const audio = new Audio();
audio.set(settings.volume, settings.muted);
for (const k of ['pointerdown', 'keydown']) window.addEventListener(k, () => audio.unlock(), { once: true, capture: true });
function read(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; } }
function drop(key) { try { localStorage.removeItem(key); } catch { /* no storage here */ } }

// ---------------------------------------------------------------- the command (faction): one identity for every post
const NAMES = ['Aurelian Vanguard', 'Ninth Meridian', 'Lantern Guard', 'Cinder Legion', 'Halcyon Watch', 'Iron Chorus', 'Harrow Company', 'Sable Dawn', 'Emberline Corps', 'Vigil of Tarsen'];
const MOTTOS = ['Hold the centre.', 'First in, last out.', 'The line is here.', 'By our hands.', 'Never the second step back.', 'Light the way.'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function rollFaction() {
  const bg = pick(['#1b2a1a', '#111111', '#1d3f8a', '#3d4247', '#8a1c1c', '#2e4a2a']), fg = pick(['#ffe600', '#f4f4f4', '#ffb020', '#3da9ff']);
  const pc = pick(['#3d4247', '#8a1c1c', '#1d3f8a', '#2e4a2a', '#111111', '#c0392b'].filter((c) => c !== bg));     // the pattern: dark, and never the field's or the symbol's colour
  const name = pick(NAMES);
  return { name, motto: pick(MOTTOS), primary: pick(['#22262a', '#2e4a2a', '#3a4f6a', '#5d6a4a', '#8a5a44']), secondary: fg,
    logo: { shape: pick(SHAPES), symbol: pick(SYMBOLS.filter((s) => s !== 'none')), bg, fg, rim: fg, text: name.split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase(), pattern: pick(PATTERNS), pc },
    look: { uniform: '#5d6a4a', helmet: '#4c5a3c', armband: fg, crest: true } };
}

// ---------------------------------------------------------------- the campaign: everything that is saved
// { v, faction, war (the galaxy's own save), kit + wallet (the ship's armoury, carried from battle to battle),
//   sites: { [systemId]: { station: {...}, base: {...} } } (summaries; each theatre keeps its full state under its own key) }
let camp = null;
let state = 'title';       // title | found | war | ground | orbit | base
let mode = null;           // the theatre on screen, if any
const modes = {};          // loaded theatres, by name

export const app = {
  get faction() { return camp ? camp.faction : draft; },
  get camp() { return camp; },
  audio, settings, version: VERSION,
  crest(canvas) { if (!canvas) return; const g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height); drawLogo(g, app.faction.logo, 2, 2, canvas.width - 4); },
  keep() { if (!camp) return; const g = War.war(); if (g && g.phase === 'plan' && !g.over) camp.war = g.save(); camp.at = Date.now(); write(KEY, camp); },
  toast(text, ms = 2200) { const t = $('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(app._tt); app._tt = setTimeout(() => t.classList.remove('show'), ms); },
  menu: () => openMenu(),
  newWar(seed, tutorial) { camp.war = null; War.open(app, { seed: seed || (Date.now() % 100000), tutorial }); app.keep(); },
  endCampaign() { drop(KEY); for (const k of Object.keys(localStorage)) if (k.startsWith('ofgc.site.')) drop(k); camp = null; toTitle(); },
  theatre: (kind, args) => enterTheatre(kind, args),
  // a theatre's own saved state, kept apart from the campaign so one big base cannot crowd out the rest
  siteLoad: (kind, pid) => read(`ofgc.site.${kind}.${pid}`, null),
  siteSave: (kind, pid, data) => write(`ofgc.site.${kind}.${pid}`, data),
  siteDrop: (kind, pid) => drop(`ofgc.site.${kind}.${pid}`),
};
window.gc = { app, War, get state() { return state; }, get mode() { return mode; } };     // for the browser checks

function show(id) { for (const s of document.querySelectorAll('.scr')) s.classList.toggle('on', s.id === id); }

// ---------------------------------------------------------------- title
function toTitle() {
  state = 'title'; mode = null; War.show(false); show('s-title');
  const saved = read(KEY, null), ok = saved && saved.v === 1 && saved.faction;
  $('b-continue').classList.toggle('hidden', !ok);
  $('b-new').classList.toggle('go', !ok);
  if (ok && saved.faction.logo.img) ensureLogo(saved.faction.logo).then(() => { if (state === 'title') drawLogo($('t-crest').getContext('2d'), saved.faction.logo, 4, 4, 152); });
  if (ok) { $('b-continue-sub').textContent = `${saved.faction.name} · round ${(saved.war && saved.war.round) || 1}`; drawLogo($('t-crest').getContext('2d'), saved.faction.logo, 4, 4, 152); }
  else { const g = $('t-crest').getContext('2d'); g.clearRect(0, 0, 160, 160); drawLogo(g, draft.logo, 4, 4, 152); }
  $('t-ver').textContent = `PROTOTYPE ${VERSION} · A FAN PROJECT · NOT AFFILIATED WITH ANY STUDIO`;
}
$('b-continue').onclick = async () => { audio.click(); camp = read(KEY, null); if (!camp) return toTitle(); await ensureLogo(camp.faction.logo); toWar({ saved: camp.war }); };
$('b-new').onclick = () => { audio.click(); if (read(KEY, null)) return confirmBox('Start a new campaign?', 'The campaign in progress, with its stations and bases, will be lost.', 'START A NEW CAMPAIGN', toFound); toFound(); };
$('b-how').onclick = () => { audio.click(); how(); };
$('b-settings').onclick = () => { audio.click(); openMenu('settings'); };
$('b-credits').onclick = () => { audio.click(); credits(); };

function how(then) {
  War.modal(`<h2>One war, four posts</h2><p>You hold the centre of the map. Three enemies are coming for it. Every part of the war is yours to run, and each part changes the others.</p>
    <div class="how">
      <div><b>THE WAR ROOM</b>The galaxy map. One decision on each front a round: attack, defend or hold. This is where the war is won or lost.</div>
      <div><b>THE GROUND</b>When fleets meet you can take the fight down to the planet and cover the landing from orbit with the ship's guns. Win there and the system is yours.</div>
      <div><b>THE STATION</b>Found a station over a system you hold. Each tier it reaches makes the system harder to take and ships cheaper to build there.</div>
      <div><b>THE BASE</b>Found a base on its key world. Each rank it earns raises what the system pays into the war.</div>
    </div>
    <p class="dim">A system that falls takes its station and its base with it.</p>
    <button class="plate btn go" data-x="close">${then ? 'TO THE WAR ROOM' : 'CLOSE'}</button>`);
  $('modal').querySelector('[data-x=close]').onclick = () => { $('modal').hidden = true; audio.click(); if (then) then(); };
}
function credits() {
  War.modal(`<h2>Credits</h2><p>Design and direction: Ramzies. Built with Claude (Anthropic) as a coding assistant.</p>
    <p>Galactic Command brings four prototypes into one game: Orbital Fury, Super Orbital Simulator, FOB Super Commander and Super Galactic Strategy. Art is drawn in code and sound is synthesised in the browser.</p>
    <p>3D is drawn with three.js (MIT licence, js/vendor/THREE-LICENSE).</p>
    <p class="dim">An unofficial fan project. Not affiliated with or endorsed by any game studio or publisher.</p>
    <button class="plate btn go" data-x="close">CLOSE</button>`);
  $('modal').querySelector('[data-x=close]').onclick = () => { $('modal').hidden = true; audio.click(); };
}
function confirmBox(title, text, yes, go) {
  War.modal(`<h2>${esc(title)}</h2><p>${esc(text)}</p><button class="plate btn go" data-x="yes">${esc(yes)}</button><button class="plate btn" style="width:100%;margin-top:8px" data-x="no">CANCEL</button>`);
  $('modal').querySelector('[data-x=yes]').onclick = () => { $('modal').hidden = true; audio.click(); go(); };
  $('modal').querySelector('[data-x=no]').onclick = () => { $('modal').hidden = true; audio.click(); };
}

// the title's backdrop: a slow field of stars and the limb of a world, drawn in code
const stars = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, p: Math.random() * 7 }));
function titleBg(now) {
  const c = $('tbg'), dpr = Math.min(2, devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#050706'; g.fillRect(0, 0, w, h);
  for (const s of stars) { const x = ((s.x + now * 0.004 * s.z) % 1) * w, y = s.y * h, a = 0.35 + 0.35 * Math.sin(now * 1.3 + s.p); g.fillStyle = `rgba(214,232,226,${a * s.z})`; g.fillRect(x, y, s.z * 1.6, s.z * 1.6); }
  // the world below: a wide limb with a thin line of air
  const R = Math.max(w, h) * 1.25, cx = w * 0.5, cy = h + R * 0.72;
  const body = g.createRadialGradient(cx - R * 0.2, cy - R * 0.5, R * 0.2, cx, cy, R); body.addColorStop(0, '#22382f'); body.addColorStop(0.7, '#0e1915'); body.addColorStop(1, '#050706');
  g.fillStyle = body; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  g.strokeStyle = 'rgba(127,233,224,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R + 1, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(127,233,224,0.12)'; g.lineWidth = 9; g.beginPath(); g.arc(cx, cy, R + 6, 0, 7); g.stroke();
  // a picket line of ships crossing the limb
  const col = app.faction.secondary || '#f5d547';
  for (let i = 0; i < 5; i++) {
    const t = ((now * 0.012 + i * 0.07) % 1.3) - 0.15, x = t * w, y = h * 0.34 + Math.sin(i * 1.7) * 18 + (i % 2) * 26 - t * 30, k = 5 + (i % 3) * 2;
    g.fillStyle = col; g.beginPath(); g.moveTo(x + k * 2.2, y); g.lineTo(x - k, y - k * 0.6); g.lineTo(x - k * 0.5, y); g.lineTo(x - k, y + k * 0.6); g.closePath(); g.fill();
    g.fillStyle = 'rgba(127,233,224,0.5)'; g.fillRect(x - k * 2.4, y - 0.6, k * 1.4, 1.2);
  }
}

// ---------------------------------------------------------------- found your command
let draft = rollFaction();
const CYCLE = { shape: SHAPES, symbol: SYMBOLS, pattern: PATTERNS };
function toFound() {
  state = 'found'; show('s-found');
  $('f-name').value = draft.name; $('f-motto').value = draft.motto; $('f-text').value = draft.logo.text || '';
  const sw = (id, get, set) => { $(id).innerHTML = PALETTE.map((c) => `<button style="background:${c}" data-c="${c}" class="${get() === c ? 'on' : ''}" aria-label="${c}"></button>`).join(''); $(id).onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; set(b.dataset.c); audio.click(); toFound(); }; };
  sw('f-bg', () => draft.logo.bg, (c) => { draft.logo.bg = c; });
  sw('f-fg', () => draft.logo.fg, (c) => { draft.logo.fg = c; });
  sw('f-pc', () => draft.logo.pc, (c) => { draft.logo.pc = c; });
  sw('f-rim', () => draft.logo.rim, (c) => { draft.logo.rim = c; });
  $('f-unup').classList.toggle('hidden', !draft.logo.img); $('f-up').textContent = draft.logo.img ? 'CHANGE THE PICTURE' : 'UPLOAD A PICTURE';
  sw('f-primary', () => draft.primary, (c) => { draft.primary = c; });
  sw('f-secondary', () => draft.secondary, (c) => { draft.secondary = c; draft.look.armband = c; });
  foundDraw();
}
function foundDraw() {
  for (const k in CYCLE) $('f-' + k).textContent = draft.logo[k];
  const g = $('f-crest').getContext('2d'); g.clearRect(0, 0, 320, 320); drawLogo(g, draft.logo, 10, 10, 300);
  $('f-strip').innerHTML = `<i style="background:${draft.primary}"></i><i style="background:${draft.secondary}"></i><i style="background:${draft.logo.bg}"></i>`;
}
$('s-found').addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]'); if (!b) return;
  const list = CYCLE[b.dataset.f], i = list.indexOf(draft.logo[b.dataset.f]);
  draft.logo[b.dataset.f] = list[(i + +b.dataset.d + list.length) % list.length]; audio.click(); foundDraw();
});
$('f-name').oninput = () => { draft.name = $('f-name').value; };
$('f-motto').oninput = () => { draft.motto = $('f-motto').value; };
$('f-text').oninput = () => { draft.logo.text = $('f-text').value.toUpperCase(); foundDraw(); };
$('f-roll').onclick = () => { draft = rollFaction(); audio.click(); toFound(); };
// your own picture in place of the crest: shrunk to 128 px and kept with the campaign on this device
$('f-up').onclick = () => $('f-file').click();
$('f-file').onchange = async () => {
  const f = $('f-file').files[0]; $('f-file').value = ''; if (!f) return;
  try { draft.logo.img = await readUpload(f); audio.ready(); toFound(); } catch (err) { audio.deny(); app.toast(err.message || 'That picture could not be read.', 4000); }
};
$('f-unup').onclick = () => { delete draft.logo.img; audio.click(); toFound(); };
$('f-back').onclick = () => { audio.click(); toTitle(); };
$('f-go').onclick = () => {
  audio.ready();
  draft.name = (draft.name || '').trim() || 'The Command'; draft.motto = (draft.motto || '').trim();
  app.endCampaignQuiet();
  camp = { v: 1, faction: JSON.parse(JSON.stringify(draft)), war: null, kit: newKit(), wallet: newWallet(), sites: {}, stats: { ground: 0, groundWon: 0 }, at: Date.now() };
  how(() => {
    if (qs.has('seed')) return toWar({ seed: Number(qs.get('seed')) });
    War.modal(`<h2>Your first war</h2><p>The guided opening walks you through the first rounds in the war room, one step at a time: reading the map, moving a fleet, your first battle. It takes about three minutes, and the war carries on from there.</p>
      <button class="plate btn go" data-x="tut">PLAY THE GUIDED OPENING</button><button class="plate btn" style="width:100%;margin-top:8px" data-x="skip">SKIP IT, I KNOW THE WAR ROOM</button>`);
    $('modal').querySelector('[data-x=tut]').onclick = () => { $('modal').hidden = true; audio.click(); toWar({ seed: SEED, tutorial: true }); };
    $('modal').querySelector('[data-x=skip]').onclick = () => { $('modal').hidden = true; audio.click(); toWar({ seed: Date.now() % 100000 }); };
  });
};
app.endCampaignQuiet = () => { drop(KEY); try { for (const k of Object.keys(localStorage)) if (k.startsWith('ofgc.site.')) drop(k); } catch { /* no storage */ } };

// ---------------------------------------------------------------- the war room
function toWar(o = {}) {
  state = 'war'; mode = null; show('s-war');
  War.open(app, o);
  // a system that fell while we were away took its station and base with it
  for (const pid of War.lostSites()) { app.siteDrop('orbit', pid); app.siteDrop('base', pid); if (camp.sites[pid]) delete camp.sites[pid]; }
  app.keep();
}

// ---------------------------------------------------------------- between places
const LOAD = { ground: () => import('./modes/ground.js'), orbit: () => import('./modes/orbit.js'), base: () => import('./modes/base.js') };
const PASS = {
  ground: (a) => ['DROP', a.battle.kind === 'atk' ? `ASSAULT ON ${a.system.name}` : `DEFENCE OF ${a.system.name}`, 'Gunnery crew to stations. The landing goes in under your guns.'],
  orbit: (a) => ['ORBIT', `STATION OVER ${a.system.name}`, 'Shuttle on approach. The station is yours to lay out; its people will do the rest.'],
  base: (a) => ['SURFACE', `BASE ON ${a.system.worlds[a.system.key].name}`, 'Lander on final. Roads first, then let the base grow along them.'],
};
async function enterTheatre(kind, args) {
  if (state !== 'war') return;
  app.keep(); audio.strikeCall();
  const [over, title, sub] = PASS[kind](args);
  $('tr-over').textContent = over; $('tr-title').textContent = title; $('tr-sub').textContent = sub; $('tr-bar').style.width = '8%';
  app.crest($('tr-crest')); $('trans').hidden = false;
  const t0 = performance.now();
  try {
    $('tr-bar').style.width = '45%';
    if (!modes[kind]) { modes[kind] = (await LOAD[kind]()).default; modes[kind].init(app, frameUi); }
    $('tr-bar').style.width = '80%';
    await new Promise((r) => setTimeout(r, 30));
    War.show(false); state = kind; mode = modes[kind];
    for (const c of document.querySelectorAll('.tv')) c.classList.toggle('on', c.id === 'v-' + kind);
    frameUi.reset(kind, args); show('s-theatre');
    await mode.enter(args);
    $('tr-bar').style.width = '100%';
    await new Promise((r) => setTimeout(r, Math.max(250, 900 - (performance.now() - t0))));
  } catch (err) {
    console.error(err); state = 'war'; mode = null; show('s-war'); War.show(true);
    app.toast('That post could not be reached. ' + (err && err.message ? err.message : ''), 5000);
  }
  $('trans').hidden = true;
}
// Back to the war room. `out` is what the theatre reports: { win, left } from the ground; { level } from a station or a base.
function leaveTheatre(out = {}) {
  const kind = state, args = frameUi.args; if (!mode) return;
  try { mode.leave(); } catch (err) { console.error(err); }
  mode = null;
  if (kind === 'ground') { camp.stats.ground++; if (out.win) camp.stats.groundWon++; if (!out.abandon) War.groundResult(!!out.win, out.left ?? 0.5); }
  else if (out.level != null) {
    const key = kind === 'orbit' ? 'station' : 'base', g = War.war(), p = args.system, rec = (camp.sites[p.id] ||= {}), cur = p[key] || 1;
    let level = Math.min(out.level, cur);
    if (out.level > cur) { if (rec[key + 'Up'] !== g.round) { level = cur + 1; rec[key + 'Up'] = g.round; app.toast(`${p.name}: ${key} raised to ${level} on the map.`); } else app.toast(`${p.name}: the map takes one new ${key === 'station' ? 'tier' : 'charter'} a round. The rest is waiting for next round.`, 4000); }
    else if (out.level < cur) level = out.level;
    War.setSite(p.id, key, Math.max(1, level)); rec[kind] = out;
  }
  state = 'war'; show('s-war'); War.show(true); app.keep();
  if (kind === 'ground' && out.abandon) app.toast('The landing is called off. The fleets still face each other.');
}

// ---------------------------------------------------------------- the frame every theatre shares
// A theatre never touches the page outside this: it sets where it is, its numbers, its tools and what is said.
export const frameUi = {
  args: null, paused: false, speed: 1, speeds: [1, 2, 4],
  reset(kind, args) {
    this.args = args; this.paused = false; this.speed = 1;
    $('th-kind').textContent = { ground: 'FIRE SUPPORT', orbit: 'STATION COMMAND', base: 'BASE COMMAND' }[kind];
    $('th-where').textContent = args.system.name; $('th-stats').innerHTML = ''; $('th-bar').innerHTML = ''; $('th-tabs').innerHTML = '';
    $('th-feed').innerHTML = ''; $('th-desk').innerHTML = ''; $('th-msg').classList.remove('show'); $('th-side').classList.add('hidden'); $('th-sel').classList.add('hidden'); $('th-tip').classList.add('hidden');
    $('th-pause').textContent = 'II'; $('th-speed').textContent = '1×'; $('th-leave').textContent = kind === 'ground' ? 'ABORT' : 'TO THE MAP';
    $('th-speed').classList.toggle('hidden', kind === 'ground');
    app.crest($('crest-th'));
  },
  stats(list) {     // [{ k: 'CREDITS', v: 120, tone: 'a' | '' | 'r' }]
    const sig = JSON.stringify(list); if (sig === this._sig) return; this._sig = sig;
    $('th-stats').innerHTML = list.map((s) => `<div class="${s.tone === 'a' ? 'a' : ''}"${s.tone === 'r' ? ' style="border-color:var(--red)"' : ''}><b${s.tone === 'r' ? ' style="color:var(--red)"' : ''}>${esc(s.v)}</b><span>${esc(s.k)}</span></div>`).join('');
  },
  message(text, ms = 2600) { const m = $('th-msg'); m.textContent = text; m.classList.add('show'); clearTimeout(this._mt); this._mt = setTimeout(() => m.classList.remove('show'), ms); },
  feed(text, tone = '') { const f = $('th-feed'), d = document.createElement('div'); d.className = tone; d.textContent = text; f.appendChild(d); while (f.children.length > 4) f.firstChild.remove(); setTimeout(() => d.remove(), 7000); },
  tip(text) { const t = $('th-tip'); t.classList.toggle('hidden', !text); if (text) t.textContent = text; },
  leave: (out) => leaveTheatre(out),
};
$('th-menu').onclick = () => openMenu();
$('th-pause').onclick = () => { frameUi.paused = !frameUi.paused; $('th-pause').textContent = frameUi.paused ? '▶' : 'II'; $('th-pause').classList.toggle('on', frameUi.paused); audio.click(); };
$('th-speed').onclick = () => { const s = frameUi.speeds; frameUi.speed = s[(s.indexOf(frameUi.speed) + 1) % s.length]; $('th-speed').textContent = frameUi.speed + '×'; audio.click(); };
$('th-leave').onclick = () => { audio.click(); if (mode && mode.askLeave) mode.askLeave(); else if (mode) leaveTheatre(mode.report ? mode.report() : {}); };

// ---------------------------------------------------------------- the armoury: the ship's weapons, bought with what the ground earns
// What it will sell is set by the war effort behind you: every station tier and every base charter you hold opens the
// next rank of it. Lose them and the shelves close again (what you own, you keep).
const SECTIONS = { orbitals: 'ORBITALS', eagles: 'EAGLES', defense: 'DEFENCES', utilities: 'UTILITIES', hangar: 'HANGAR', gun: 'SHIP GUN', uav: 'UAV', seaf: 'TROOPS', build: 'BUILDING', support: 'SUPPORT', classified: 'CLASSIFIED' };
app.armouryTier = () => { const g = War.war(); let n = 0; if (g) for (const p of g.P) if (p.owner === 'fed') n += (p.station || 0) + (p.base || 0); return Math.min(TIER_MAX, n); };
app.armoury = (then, done = 'DONE') => {
  const kit = camp.kit, wal = camp.wallet, tier = app.armouryTier();
  const draw = (note = '') => {
    const items = shopItems(kit), secs = [...new Set(items.map((i) => i.section))];
    const slots = Array.from({ length: kit.slots }, (_, i) => { const id = kit.loadout[i], it = id && items.find((x) => x.orb === id); return `<button class="plate btn sm${id ? ' on' : ''}" data-un="${i}" ${id ? '' : 'disabled'}>${id ? esc((it && it.name) || id) + ' ×' : 'EMPTY'}</button>`; }).join('');
    let h = `<h2>Armoury</h2><p><b class="am">${Math.floor(wal.bal)} CR</b> · rank ${tier} of ${TIER_MAX} open <span class="dim">(one for every station tier and base charter you hold)</span></p>
      <h3>Loadout · tap to take one out</h3><div class="row" style="margin-bottom:10px">${slots}</div>${note ? `<p class="am">${esc(note)}</p>` : ''}`;
    for (const sec of secs) {
      h += `<h3>${SECTIONS[sec] || sec.toUpperCase()}</h3>`;
      for (const it of items.filter((i) => i.section === sec)) {
        const open = shownAt(it, tier), maxed = it.cost == null, can = open && !maxed && wal.bal >= it.cost, inLoad = it.orb && kit.loadout.includes(it.orb);
        h += `<div class="mis"><div><b class="${open ? '' : 'dim'}">${esc(it.name || it.id)}</b> <span class="sm2 dim">${it.max > 1 ? `level ${it.level}/${it.max}` : it.level ? 'owned' : ''}${it.blurb ? ' · ' + esc(it.blurb) : ''}</span></div>
          <span class="row" style="flex-wrap:nowrap">${it.orb && it.owned && !inLoad ? `<button class="plate btn sm" data-eq="${it.orb}">EQUIP</button>` : ''}<button class="plate amber btn sm" data-buy="${it.id}" ${can ? '' : 'disabled'}>${!open ? 'LOCKED' : maxed ? 'MAX' : it.cost + ' CR'}</button></span></div>`;
      }
    }
    War.modal(h + '<button class="plate btn go" data-x="close" style="margin-top:10px;position:sticky;bottom:0">' + done + '</button>');
    const box = $('modal');
    box.querySelector('[data-x=close]').onclick = () => { box.hidden = true; audio.click(); app.keep(); if (then) then(); };
    for (const b of box.querySelectorAll('[data-buy]')) b.onclick = () => { const r = buy(kit, wal, b.dataset.buy, false, tier); if (r.ok) { audio.coin(); draw(); } else { audio.deny(); draw('That cannot be bought yet.'); } };
    for (const b of box.querySelectorAll('[data-eq]')) b.onclick = () => { if (equip(kit, b.dataset.eq)) { audio.click(); draw(); } else { audio.deny(); draw('Every slot is full. Take one out first.'); } };
    for (const b of box.querySelectorAll('[data-un]')) b.onclick = () => { unequip(kit, +b.dataset.un); audio.click(); draw(); };
  };
  draw();
};

// ---------------------------------------------------------------- the menu (the same one everywhere)
function openMenu(page = 'main') {
  const inPlay = state !== 'title' && state !== 'found', m = $('menu'), was = frameUi.paused;
  if (mode) frameUi.paused = true;
  const close = () => { m.hidden = true; if (mode) { frameUi.paused = was; } audio.click(); };
  if (page === 'settings') {
    m.innerHTML = `<div class="plate amber box"><h2>Settings</h2>
      <label class="rng">VOLUME<input type="range" id="m-vol" min="0" max="100" value="${Math.round(settings.volume * 100)}"></label>
      <div class="mm"><button class="plate btn${settings.muted ? ' on' : ''}" id="m-mute">${settings.muted ? 'SOUND IS OFF' : 'SOUND IS ON'}</button>
      <button class="plate btn go" id="m-back">${inPlay ? 'BACK' : 'CLOSE'}</button></div></div>`;
    $('m-vol').oninput = () => { settings.volume = $('m-vol').value / 100; audio.set(settings.volume, settings.muted); write(SET_KEY, settings); };
    $('m-mute').onclick = () => { settings.muted = !settings.muted; audio.set(settings.volume, settings.muted); write(SET_KEY, settings); openMenu('settings'); };
    $('m-back').onclick = () => { if (inPlay) openMenu('main'); else close(); };
  } else {
    const g = War.war();
    m.innerHTML = `<div class="plate amber box"><h2>${esc(app.faction.name)}</h2><p>${esc(app.faction.motto || '')}</p>
      <p>${state === 'war' ? `The war room · round ${g ? g.round : 1}` : state === 'ground' ? 'Fire support' : state === 'orbit' ? 'Station command' : 'Base command'} · saved on this device</p>
      <div class="mm"><button class="plate btn go" id="m-resume">RESUME</button>
      ${state === 'war' ? '<button class="plate btn" id="m-arm">ARMOURY</button>' : ''}
      <button class="plate btn" id="m-how">HOW THE WAR FITS TOGETHER</button>
      <button class="plate btn" id="m-set">SETTINGS</button>
      <button class="plate btn" id="m-title">SAVE AND GO TO THE MAIN MENU</button></div></div>`;
    $('m-resume').onclick = close;
    if ($('m-arm')) $('m-arm').onclick = () => { m.hidden = true; audio.click(); app.armoury(); };
    $('m-how').onclick = () => { m.hidden = true; how(); if (mode) frameUi.paused = was; };
    $('m-set').onclick = () => openMenu('settings');
    $('m-title').onclick = () => {
      m.hidden = true; audio.click();
      if (mode) { const out = mode.report ? mode.report() : {}; leaveTheatre(state === 'ground' ? { abandon: true } : out); }
      app.keep(); toTitle();
    };
  }
  m.hidden = false;
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!$('menu').hidden) { $('menu').hidden = true; return; } if (!$('modal').hidden) return; if (state !== 'title' && state !== 'found') openMenu(); }
});
window.addEventListener('beforeunload', () => { if (mode && mode.store) mode.store(); app.keep(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (mode && mode.store) mode.store(); app.keep(); } });

// ---------------------------------------------------------------- the clock: one loop for the whole game
let last = performance.now();
function loop(ms) {
  requestAnimationFrame(loop);
  const now = ms / 1000, dt = Math.min(0.1, Math.max(0, (ms - last) / 1000)); last = ms;
  try {
    if (state === 'title') titleBg(now);
    else if (state === 'war') War.frame(ms);
    else if (mode) mode.frame(frameUi.paused ? 0 : dt * frameUi.speed, now, dt);
  } catch (err) { if (!loop.said) { loop.said = true; console.error(err); app.toast('Something went wrong on this screen: ' + err.message, 6000); } }
}
void GC;
toTitle();
requestAnimationFrame(loop);
