// ORBITAL FURY: GALACTIC COMMAND. One war, one command, four posts.
//
// This file is the game's spine: the title, founding a command (its name; its look is the livery, core/livery.js), the saves, the menu,
// and the passage between the war room (the galaxy map) and the three theatres under it:
//   GROUND  fire support from orbit over a ground battle   (js/modes/ground.js, rules in js/ground)
//   ORBIT   the station over a system                      (js/modes/orbit.js,  rules in js/orbit)
//   BASE    the base on its key world                      (js/modes/base.js,   rules in js/base)
// The theatres are loaded when first entered. Each one fills the same frame (#s-theatre) and hands back what the map
// needs to know: who won, what tier the station is, what rank the base is.
import * as WarRoom from './core/warroom.js';
import './surface.js';     // (GC 0.70) surface detail on every 3D model: extends three.js's shaders before anything is drawn
import { MSG_TIMES, msgKey, setMsg, timeMessage } from './core/msgtime.js';
import { VERSION, C as GC } from './galaxy/config.js';
import * as War from './galaxy/screen.js';
import { drawLogo, ensureLogo } from './core/logo.js';
import { livery, setLivery, hasLivery, fromCrest, asFaction, PRESETS } from './core/livery.js';
import { pageLivery, bindLivery, liveryKey, styleCards, drawCards, fromPreset, isOwn } from './core/livery-ui.js';
import { pageStore, bindStore } from './core/store-ui.js';
import { upgrade } from './core/roster.js';
import { SEED } from './galaxy/tutorial.js';
import { shopItems, buy, equip, unequip, shownAt, TIER_MAX } from './ground/data/kit.js';
import { Audio } from './ground/audio.js';
import { newKit, newWallet, fixKit } from './ground/data/kit.js';
import { words } from './core/words.js';
import { career } from './core/career.js';
import { catalogue, KINDS, FACTION_ABOUT } from './core/collection.js';
import { keysPanel, bindKeysPanel } from './core/keys-ui.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const KEY = 'ofgc.campaign', SET_KEY = 'ofgc.settings';
// (0.39) a single post played on its own (FOB Commander, Orbital Commander) keeps its own save, apart from the war's; the
// command's name, crest and colours are kept once and worn in every way of playing
const PROFILE = 'ofgc.profile', SOLO = { base: 'ofgc.solo.base', orbit: 'ofgc.solo.orbit' }, SOLO_META = 'ofgc.solo.meta';
const qs = new URLSearchParams(location.search);

// ---------------------------------------------------------------- settings and sound
const settings = { volume: 0.6, muted: false, hints: true, hintsDone: false, ...read(SET_KEY, {}) };     // (0.39) hints: the coach's cards, on or off
// (GC 0.75) and the settings every game shares: the sound in its parts, the picture, the ground's map aids. A player who
// set them in the ground game before keeps what they chose there. The ground game (its own page) takes them from here
// (window.gcOptions) and sends back a change made on its own SETTINGS.
const SHARED = { sfx: 1, music: 0.5, amb: 1, voice: 1, ui: 1, bgMute: false, quality: 'auto', fps: 'auto', shake: 1, reduceFlash: false, colorblind: false, lighting: true, showNames: false, showBlasts: false, bubbles: true };
const SHARE = ['volume', 'muted', ...Object.keys(SHARED)];
{ const gs = read('ofs.settings', {}) || {}; for (const k in SHARED) if (!(k in settings)) settings[k] = k in gs ? gs[k] : SHARED[k]; }
const shared = () => Object.fromEntries(SHARE.map((k) => [k, settings[k]]));
export const audio = new Audio();
function applySound() { audio.set(settings.volume, settings.muted, settings.music, settings.sfx); audio.levels(settings); audio.background(document.hidden && !!settings.bgMute); }
applySound();
document.addEventListener('visibilitychange', () => audio.background(document.hidden && !!settings.bgMute));
// a setting changed here: kept, heard, and passed to whatever is open (a post's view; the ground game in its own page)
function saveSettings() {
  write(SET_KEY, settings); applySound();
  if (mode && mode.settings) try { mode.settings(settings); } catch (err) { console.error(err); }
  for (const f of document.querySelectorAll('iframe#g-frame')) try { if (f.contentWindow.gcApply) f.contentWindow.gcApply(shared()); } catch { /* not ready yet: it reads them as it opens */ }
}
window.gcOptions = { get: shared, set: (o) => { for (const k of SHARE) if (k in o) settings[k] = o[k]; write(SET_KEY, settings); applySound(); } };
for (const k of ['pointerdown', 'keydown']) window.addEventListener(k, () => audio.unlock(), { once: true, capture: true });
function read(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; } }
function drop(key) { try { localStorage.removeItem(key); } catch { /* no storage here */ } }

// ---------------------------------------------------------------- the command (faction): one identity for every post
// (0.66) Its look (name, motto, emblem, colours, how the troopers dress) is the livery, kept once above every game
// (core/livery.js) and edited from your crest, on every screen (GC 0.75; it was the LIVERY tab). What a campaign keeps of its own is its capital and its opening.
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const baseDraft = () => ({ capital: pick(GC.names.capitals), open: { fleets: 'standard', posts: 'none', level: 'normal' } });

// ---------------------------------------------------------------- the campaign: everything that is saved
// { v, faction, war (the galaxy's own save), kit + wallet (the ship's armoury, carried from battle to battle),
//   sites: { [systemId]: { station: {...}, base: {...} } } (summaries; each theatre keeps its full state under its own key) }
let camp = null;
let state = 'title';       // title | found | war | ground | orbit | base
let mode = null;           // the theatre on screen, if any
let solo = null, soloHome = '';           // (0.39) 'base' or 'orbit' while one post is played on its own, with no war round it
let tutorial = false;      // a post opened as its TUTORIAL from the main menu: a practice post, nothing of it is saved
let soloCamp = null;       // what stands in for the campaign then: the command's identity and nothing else
let fury = null;           // the Orbital Fury mode's own page, while it is open
const modes = {};          // loaded theatres, by name

export const app = {
  get faction() { return asFaction(livery(), camp ? camp.faction : soloCamp ? soloCamp.faction : draft); },     // (0.66) the livery over the campaign's own
  get camp() { return camp || soloCamp; },
  audio, settings, version: VERSION,
  crest(canvas) { if (!canvas) return; const g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height); drawLogo(g, app.faction.logo, 2, 2, canvas.width - 4); },
  keep() { if (!camp) return; const g = War.war(); if (g && g.phase === 'plan' && !g.over) camp.war = g.save(); camp.at = Date.now(); write(KEY, camp); },
  toast(text, ms = 2200) { const t = $('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(app._tt); app._tt = setTimeout(() => t.classList.remove('show'), ms); },
  menu: () => openMenu(),
  livery: () => openMenu('livery'),     // (GC 0.75) your crest, in a game: the livery, on the menu
  newWar(seed, tutorial) { camp.war = null; War.open(app, { seed: seed || (Date.now() % 100000), tutorial }); app.keep(); },
  saveSettings() { write(SET_KEY, settings); },
  // the coach's hints, on or off (the war room is told, if it is open)
  setHints(on) { settings.hints = !!on; if (on) settings.hintsDone = false; write(SET_KEY, settings); if (state === 'war') War.hints(!!on); },
  endCampaign() { drop(KEY); for (const k of Object.keys(localStorage)) if (k.startsWith('ofgc.site.')) drop(k); camp = null; toTitle(); },
  theatre: (kind, args) => enterTheatre(kind, args),
  // a theatre's own saved state, kept apart from the campaign so one big base cannot crowd out the rest
  siteLoad: (kind, pid) => tutorial ? null : read(solo ? SOLO[kind] : `ofgc.site.${kind}.${pid}`, null),
  siteSave: (kind, pid, data) => { if (!tutorial) write(solo ? SOLO[kind] : `ofgc.site.${kind}.${pid}`, data); },
  siteDrop: (kind, pid) => { if (!tutorial) drop(solo ? SOLO[kind] : `ofgc.site.${kind}.${pid}`); },
  get tutorial() { return tutorial; },
  leavePost() { if (mode) leaveTheatre(mode.report ? mode.report() : {}); },
};
window.gc = { app, War, get state() { return state; }, get mode() { return mode; } };     // for the browser checks

function show(id) { for (const s of document.querySelectorAll('.scr')) s.classList.toggle('on', s.id === id); if (id === 's-title' && !WarRoom.running()) { if (WarRoom.start($('tbg'))) WarRoom.play(true); } else if (id !== 's-title') WarRoom.play(false); }   // (0.72) the live war room draws only while the menu shows

// ---------------------------------------------------------------- title
// who you are when there is no war on: the identity kept from the last founding, or the saved campaign's
const identity = () => { const c = read(KEY, null), id = read(PROFILE, null) || (c && c.v === 2 && c.faction) || null; return id ? asFaction(livery(), id) : hasLivery() ? asFaction(livery(), baseDraft()) : null; };
// (0.66) a command founded before the livery keeps its crest, name and colours: they become its livery
if (!hasLivery()) { const c = read(KEY, null), old = read(PROFILE, null) || (c && c.v === 2 && c.faction); if (old && old.logo && !old.logo.layers) setLivery({ ...fromCrest(old), ownName: true }); }
const ago = (t) => { if (!t) return ''; const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'saved just now' : m < 60 ? `saved ${m} min ago` : m < 1440 ? `saved ${Math.round(m / 60)} h ago` : `saved ${Math.round(m / 1440)} d ago`; };
// What is saved in each way of playing, in a line or two (the save in hand; the other slots keep theirs, below).
function saves() {
  const c = read(KEY, null), okC = c && c.v === 2 && c.faction, meta = read(SOLO_META, {}) || {}; let f = null; try { f = JSON.parse(localStorage.getItem('ofs.session') || 'null'); } catch { f = null; }
  const okF = f && Array.isArray(f.missions);
  return {
    war: okC ? { title: c.faction.name, text: `Round ${(c.war && c.war.round) || 1}${c.stats && c.stats.ground ? ` · ${c.stats.groundWon || 0} of ${c.stats.ground} ground fights won` : ''}`, at: c.at } : null,
    fury: okF ? { title: f.op || 'Operation', text: `Mission ${f.missions.length + 1} · difficulty ${f.difficulty ?? 1}${f.score ? ` · score ${f.score}` : ''}`, at: f.savedAt || f.startedAt } : null,
    base: read(SOLO.base, null) ? { title: (meta.base && meta.base.name) || 'Your base', text: meta.base ? `${meta.base.charter || 'Charter'} · ${meta.base.troops || 0} troops${meta.base.profit ? ' · in profit' : ''}` : 'A base under way', at: meta.base && meta.base.at } : null,
    orbit: read(SOLO.orbit, null) ? { title: (meta.orbit && meta.orbit.name) || 'Your station', text: meta.orbit ? `${meta.orbit.tier || 'Tier'}${meta.orbit.profit ? ' · in profit' : ''}` : 'A station under way', at: meta.orbit && meta.orbit.at } : null,
  };
}
// ---- (0.60) three saves for each game. One of the three is "in hand": it lives where the game has always kept its save, so
// nothing else in the game knows about slots. The other two are parked, whole, under ofgc.slot.<game>.<n>, with a line
// about each kept in ofgc.slots; choosing a slot parks the one in hand and brings the chosen one out.
const GAMES = { war: { name: 'GALACTIC CAMPAIGN', over: 'THE CAMPAIGN', text: 'Hold the galaxy against three enemies. Fleets, fronts, stations, bases and the fights on the ground, all in one war.' },
  fury: { name: 'ORBITAL FURY', over: 'THE GROUND', text: 'Mission after mission against the enemy you pick, covering your Vanguards from orbit.' },
  base: { name: 'FOB COMMANDER', over: 'THE BASE', text: 'Lay the roads, zone the ground and keep a forward base running in profit.' },
  orbit: { name: 'ORBITAL COMMANDER', over: 'THE STATION', text: 'Build a station part by part, house its people and keep it in profit.' } };
const SLOTS = 'ofgc.slots', LAST = 'ofgc.last', parkKey = (g, n) => `ofgc.slot.${g}.${n}`;
const slots = () => { const v = read(SLOTS, null) || {}; v.cur = v.cur || {}; v.sum = v.sum || {}; for (const g in GAMES) { v.cur[g] = v.cur[g] || 0; v.sum[g] = v.sum[g] || [null, null, null]; } return v; };
function keysOf(g) {
  if (g === 'fury') return ['ofs.session', 'ofs.slots'];
  if (g !== 'war') return [SOLO[g]];
  const out = [KEY]; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('ofgc.site.')) out.push(k); } } catch { /* no storage */ } return out;
}
function clearHand(g) { for (const k of keysOf(g)) drop(k); if (SOLO[g]) { const m = read(SOLO_META, {}) || {}; delete m[g]; write(SOLO_META, m); } }
// makes slot n the save in hand; false if the browser has no room left to park the other
function useSlot(g, n) {
  const v = slots(), cur = v.cur[g]; if (n === cur) return true;
  try {
    const bundle = {}; for (const k of keysOf(g)) { const x = localStorage.getItem(k); if (x != null) bundle[k] = x; }
    if (SOLO[g]) { const m = (read(SOLO_META, {}) || {})[g]; if (m) bundle.__meta = JSON.stringify(m); }
    if (Object.keys(bundle).length) localStorage.setItem(parkKey(g, cur), JSON.stringify(bundle)); else localStorage.removeItem(parkKey(g, cur));
    v.sum[g][cur] = saves()[g];
    clearHand(g);
    const inb = JSON.parse(localStorage.getItem(parkKey(g, n)) || '{}');
    for (const [k, x] of Object.entries(inb)) { if (k === '__meta') { const m = read(SOLO_META, {}) || {}; m[g] = JSON.parse(x); write(SOLO_META, m); } else localStorage.setItem(k, x); }
    localStorage.removeItem(parkKey(g, n)); v.sum[g][n] = null; v.cur[g] = n; localStorage.setItem(SLOTS, JSON.stringify(v)); return true;
  } catch { return false; }
}
const slotInfo = (g, n) => { const v = slots(); return n === v.cur[g] ? saves()[g] : v.sum[g][n]; };
function delSlot(g, n) {
  const v = slots();
  if (n === v.cur[g]) { if (g === 'war') app.endCampaignQuiet(); else clearHand(g); } else { drop(parkKey(g, n)); v.sum[g][n] = null; write(SLOTS, v); }
}
function playSlot(g, n) {
  audio.click();
  if (!useSlot(g, n)) return confirmBox('No room to switch saves', 'This browser has no storage left to set the other save aside. Delete a save you no longer want, then try again.', 'OK', () => {});
  write(LAST, { g, n });
  if (g === 'war') return read(KEY, null) ? warContinue() : toFound('war');
  if (g === 'fury') return enterFury(false);
  soloGo(g, false);
}
async function warContinue() { camp = read(KEY, null); if (!camp) return toTitle(); camp.kit = fixKit(camp.kit);     // (0.77: call-ins renamed)
  write(LAST, { g: 'war', n: slots().cur.war }); await ensureLogo(app.faction.logo); toWar({ saved: camp.war, tutorial: settings.hints && !settings.hintsDone && !qs.has('seed') }); }
function warNew() { write(LAST, { g: 'war', n: slots().cur.war }); if (read(KEY, null)) return confirmBox('Start a new campaign?', 'The campaign in this save, with its stations and bases, will be lost. (To keep it, start the new one in another save on the PLAY tab.)', 'START A NEW CAMPAIGN', () => toFound('war')); toFound('war'); }

// ---- the pictures: line art for each game, drawn here so the menu needs no image files for them
// (0.61) each game's picture: its own models drawn as glowing line art (tools/lineart.html, test/lineart.py)
const PIC = (g) => `<img src="assets/menu/art-${g}.png" alt="" draggable="false">`;
// (GC 0.75, Ramzies: "the play menu images don't really show what each game is about") each game's card shows the game itself: a 16:9 picture taken in it
const SHOT = (g) => `<img src="assets/menu/play-${g}.jpg" alt="${GAMES[g] ? GAMES[g].name : ''}" draggable="false">`;
const ART = {
  war: '<svg viewBox="0 0 200 110" aria-hidden="true"><ellipse cx="100" cy="58" rx="88" ry="32" fill="rgba(127,233,224,.06)" stroke="#7fe9e0" stroke-opacity=".4"/><ellipse cx="100" cy="58" rx="58" ry="21" fill="none" stroke="#f5d547" stroke-width="1.6"/><ellipse cx="100" cy="58" rx="29" ry="10.5" fill="rgba(245,213,71,.12)" stroke="#f5d547" stroke-opacity=".6"/><circle cx="100" cy="58" r="4" fill="#f5d547"/><g fill="#e6eadc"><circle cx="72" cy="50" r="1.4"/><circle cx="126" cy="64" r="1.4"/><circle cx="112" cy="46" r="1.2"/><circle cx="84" cy="68" r="1.2"/><circle cx="58" cy="62" r="1"/><circle cx="140" cy="52" r="1"/><circle cx="100" cy="76" r="1"/><circle cx="98" cy="40" r="1"/></g><g fill="none" stroke-width="1.6"><circle cx="30" cy="46" r="7" stroke="#ff9a3d"/><circle cx="172" cy="50" r="7" stroke="#ff4d4d"/><circle cx="104" cy="92" r="7" stroke="#a77bff"/></g><g><circle cx="30" cy="46" r="2.4" fill="#ff9a3d"/><circle cx="172" cy="50" r="2.4" fill="#ff4d4d"/><circle cx="104" cy="92" r="2.4" fill="#a77bff"/></g><path d="M40 48 L60 54 M162 52 L142 56 M104 83 L102 72" stroke="#e6eadc" stroke-opacity=".5" stroke-dasharray="4 4"/><path d="M90 14 l16 5 l-16 5 l4 -5 z" fill="#f5d547"/><path d="M118 20 l10 3 l-10 3 l2.5 -3 z" fill="#7fe9e0"/></svg>',
  fury: '<svg viewBox="0 0 200 110" aria-hidden="true"><path d="M0 84 Q40 60 80 78 T160 70 T200 80 V110 H0 Z" fill="rgba(127,233,224,.08)" stroke="#7fe9e0" stroke-opacity=".35"/><path d="M0 96 Q50 82 100 94 T200 90" fill="none" stroke="#7fe9e0" stroke-opacity=".2"/><circle cx="104" cy="60" r="26" fill="none" stroke="#f5d547" stroke-width="1.6"/><circle cx="104" cy="60" r="3" fill="#f5d547"/><path d="M104 26 V44 M104 76 V94 M70 60 H88 M120 60 H138" stroke="#f5d547" stroke-width="1.6"/><path d="M176 6 L112 54" stroke="#fff2d0" stroke-width="2.4" stroke-dasharray="10 7"/><g fill="#ff6a4d"><rect x="92" y="54" width="5" height="5"/><rect x="110" y="64" width="5" height="5"/><rect x="102" y="70" width="4" height="4"/></g><g fill="#7fe9e0"><circle cx="56" cy="80" r="3"/><circle cx="64" cy="86" r="3"/><circle cx="48" cy="88" r="3"/></g></svg>',
  base: '<svg viewBox="0 0 200 110" aria-hidden="true"><path d="M10 78 L100 104 L190 78 L100 52 Z" fill="rgba(127,233,224,.07)" stroke="#7fe9e0" stroke-opacity=".4"/><path d="M40 78 L100 95 L160 78" fill="none" stroke="#e6eadc" stroke-opacity=".45" stroke-dasharray="5 5"/><g stroke="#f5d547" fill="rgba(245,213,71,.14)"><path d="M84 66 L84 44 L100 38 L116 44 L116 66 L100 72 Z"/><path d="M84 44 L100 50 L116 44 M100 50 V72"/></g><g stroke="#7fe9e0" fill="rgba(127,233,224,.14)"><path d="M48 74 L48 62 L60 58 L72 62 L72 74 L60 78 Z"/><path d="M128 74 L128 60 L142 55 L156 60 L156 74 L142 79 Z"/></g><path d="M100 38 V18 M100 18 L114 23 L100 28" stroke="#f5d547" fill="rgba(245,213,71,.5)"/><g fill="#7fe9e0"><circle cx="88" cy="84" r="2"/><circle cx="96" cy="87" r="2"/><circle cx="104" cy="88" r="2"/><circle cx="112" cy="86" r="2"/></g></svg>',
  orbit: '<svg viewBox="0 0 200 110" aria-hidden="true"><path d="M-10 120 Q100 60 210 120" fill="rgba(127,233,224,.08)" stroke="#7fe9e0" stroke-opacity=".5"/><ellipse cx="100" cy="50" rx="62" ry="20" fill="none" stroke="#f5d547" stroke-width="1.6"/><ellipse cx="100" cy="50" rx="40" ry="12" fill="none" stroke="#f5d547" stroke-opacity=".5"/><rect x="88" y="34" width="24" height="32" fill="rgba(245,213,71,.16)" stroke="#f5d547"/><path d="M100 34 V14 M38 50 H88 M112 50 H162" stroke="#f5d547"/><g fill="rgba(127,233,224,.2)" stroke="#7fe9e0"><rect x="26" y="44" width="14" height="12"/><rect x="160" y="44" width="14" height="12"/></g><path d="M150 22 l12 -4 l-5 5 l5 5 z" fill="#7fe9e0"/><path d="M40 20 l10 -3 l-4 4 l4 4 z" fill="#7fe9e0" opacity=".6"/></svg>',
};
// ---- the tabs
// (GC 0.75, Ramzies: "we don't need the livery menu on the main menu page") the livery is opened by your crest, at the right
// of the bar on every screen: it is a page here (PAGES.livery) with no tab of its own
const TABS = [['home', 'HOME'], ['play', 'PLAY'], ['collection', 'COLLECTION'], ['career', 'CAREER'], ['store', 'STORE'], ['options', 'OPTIONS']];
const tabName = (k) => (TABS.find((x) => x[0] === k) || [k, k === 'livery' ? 'YOUR LIVERY' : k.toUpperCase()])[1];
let tab = 'home', optTab = 'play', playGame = null;     // playGame: the game whose saves the PLAY tab is showing
const NEWS = { title: 'FOB Commander: the base\'s goals, measured', lines: ['The Offices are rebuilt round a base\'s goals, with bars that measure instead of tables. Six pages, each with its measure on the dock.', 'POPULATION: the charter milestones at 30, 60 and 110, the next one\'s terms, who is here, bunks and seats, and what the charter gives the war.', 'BUDGET & TRADE: what the base makes and loses a watch, the allocation and the standings behind it, and the market and loans.', 'EFFICIENCY: the daily review\'s six checks, the walks from the bunks, roads, the pad, trucks, crews and services. HAPPINESS: morale and what moves it, in defence, housing and looks.', 'Files to grade are on the task board now. Operations and research stay as they were.'] };
// (GC 0.73) what is done with the mouse and Esc (fixed); every key below them can be changed (js/core/keys-ui.js)
const KEYS = {
  war: [['Click a system', 'Select it; click another to send a fleet'], ['Drag, mouse wheel', 'Move and zoom the map'], ['END ROUND', 'Play out the round'], ['Esc', 'The menu']],
  fury: [['Mouse wheel', 'Zoom'], ['Click / drag a box', 'Pick troopers'], ['Right-click', 'Order the troopers you picked'], ['Middle-drag', 'Turn and tilt the view'], ['Shift+1-9', 'Pick a squad'], ['Esc', 'Pause']],
  base: [['Drag', 'Move the view'], ['Right-drag', 'Turn the view'], ['Mouse wheel', 'Zoom'], ['Drag with a road tool', 'Draw a road on the tiles (hold Shift to draw free)'], ['Click a building', 'Its status card'], ['Esc', 'The menu']],
  orbit: [['Drag', 'Turn the view'], ['Mouse wheel', 'Zoom'], ['Click a part, then a green ring', 'Build it there'], ['Click a part', 'What it is and does'], ['Esc', 'The menu']],
};
const panel = (title, body, cls = '') => `<section class="tpan ${cls}"><h3>${title}</h3>${body}</section>`;
function pageHome() {
  const S = saves(), w = S.war, last = read(LAST, null), li = last && GAMES[last.g] ? slotInfo(last.g, last.n) : null;
  return `<div class="trow">${panel('News', `<div class="hgrid">
      <button class="tile hot" style="background:linear-gradient(180deg,rgba(8,10,9,.2) 25%,rgba(8,10,9,.95)),url(assets/menu/warroom.jpg) 70% 60%/cover" data-act="news"><em>UPDATE ${VERSION}</em><b>WHAT'S NEW</b><span>${esc(NEWS.title)}</span></button>
      <button class="tile" data-act="jump"><i class="tart">${PIC(last && GAMES[last.g] ? last.g : 'war')}</i><em>${last && GAMES[last.g] ? GAMES[last.g].name : 'NOTHING PLAYED YET'}</em><b>JUMP IN</b><span>${li ? `${esc(li.title)} · ${esc(li.text)}` : last && GAMES[last.g] ? 'Pick up where you left off' : 'Choose a game on the PLAY tab'}</span></button>
      <button class="tile" data-act="credits"><i class="tart"><img src="assets/icon.svg" alt=""></i><em>ABOUT THE GAME</em><b>LEARN MORE</b><span>Credits, and how the war fits together</span></button></div>`)}
    <div class="hcamp">${panel('Galactic campaign', `<p>${GAMES.war.text}</p><p class="msave${w ? '' : ' none'}" id="ms-war">${w ? `<b>${esc(w.title)}</b>${esc(w.text)}${w.at ? ' · ' + ago(w.at) : ''}` : 'No campaign in this save yet.'}</p>
      ${w ? '<button class="plate btn go" id="b-continue" data-act="war-continue">CONTINUE</button>' : ''}<button class="plate btn${w ? '' : ' go'}" id="b-new" data-act="war-new" style="margin-top:6px">NEW CAMPAIGN</button>`, 'pcard main pic')}
      ${panel('Daily challenges', `<div class="chal"><div><span>FIRST BLOOD<small>Win a ground fight</small></span><i>SOON</i></div><div><span>QUARTERMASTER<small>End a day at the base in profit</small></span><i>SOON</i></div><div><span>DOCKMASTER<small>Raise a station a tier</small></span><i>SOON</i></div></div>`, 'pic cons')}</div></div>`;
}
// PLAY: a picture card for each game. A game with nothing saved starts straight away; one with a save shows its three
// saves first (playGame), to load one or start another beside it.
const hasSave = (g) => [0, 1, 2].some((n) => slotInfo(g, n));
function slotRows(g) {
  const v = slots();
  return [0, 1, 2].map((n) => { const i = slotInfo(g, n);
    return `<div class="slot${n === v.cur[g] && i ? ' cur' : ''}"><i>SAVE ${n + 1}</i><div>${i ? `<b>${esc(i.title)}</b>${esc(i.text)}${i.at ? ' · ' + ago(i.at) : ''}` : 'Empty'}</div>${i ? `<button class="plate btn x" data-act="del" data-g="${g}" data-n="${n}" aria-label="Delete save ${n + 1}" title="Delete this save">×</button>` : ''}<button class="plate btn${i ? ' go' : ''}" data-act="slot" data-g="${g}" data-n="${n}">${i ? 'LOAD' : 'NEW'}</button></div>`; }).join('');
}
function gameCard(g, still = false) {
  const d = GAMES[g], n = [0, 1, 2].filter((k) => slotInfo(g, k)).length, tut = `<button class="plate btn" data-act="tut" data-g="${g}">${g === 'war' ? 'HOW IT FITS' : 'TUTORIAL'}</button>`;
  return `<div class="gcard${g === 'war' ? ' main' : ''}${still ? ' still' : ''}" ${still ? '' : `role="button" tabindex="0" data-act="game" data-g="${g}"`}><div class="gart">${SHOT(g)}</div><em>${d.over}</em><b>${d.name}</b><span>${d.text}</span><div class="gfoot"><i>${g === 'war' ? '1 PLAYER · THE CAMPAIGN' : '1 PLAYER · ENDLESS PLAY'}</i><i class="${n ? 'has' : ''}">${n ? `${n} OF 3 SAVES` : 'NEW GAME'}</i>${still ? '' : tut}</div></div>`;
}
function pagePlay() {
  if (playGame) { const g = playGame;
    return `<div class="psave">${gameCard(g, true)}${panel('Choose a save', `<p>Load a save, or start a new game in a save of its own. Each is kept apart.</p>${slotRows(g)}<div class="pfoot"><button class="plate btn" data-act="back">BACK</button><button class="plate btn" data-act="tut" data-g="${g}">${g === 'war' ? 'HOW IT FITS TOGETHER' : 'TUTORIAL'}</button></div>`, 'pcard' + (g === 'war' ? ' main' : ''))}</div>`; }
  return '<div class="ggrid">' + Object.keys(GAMES).map((g) => gameCard(g)).join('') + '</div>';
}
// COLLECTION: everything the career has met (core/career.js), by kind, each open to read with its model turning beside it
let colKind = 'foe', colSel = null;
const metOf = (k) => (career().met[k] || {});
function pageCollection() {
  const cat = catalogue(), met = metOf(colKind), all = cat[colKind], seen = all.filter((e) => met[e.id]);
  if (!colSel || !met[colSel] || !all.some((e) => e.id === colSel)) colSel = seen.length ? seen[0].id : null;
  const tabs = KINDS.map(([k, n]) => { const m = metOf(k), got = cat[k].filter((e) => m[e.id]).length; return `<button class="${colKind === k ? 'on' : ''}" data-act="c-kind" data-k="${k}">${n} <small>${got}/${cat[k].length}</small></button>`; }).join('');
  const chip = (e) => met[e.id] ? `<button class="chip${e.id === colSel ? ' on' : ''}" data-act="c-sel" data-id="${e.id}">${e.tag ? `<i>${e.tag}</i>` : ''}<b>${esc(e.name)}</b><small>${met[e.id].n || ''}</small></button>` : `<span class="chip lock">${e.tag ? `<i>${e.tag}</i>` : ''}<b>???</b></span>`;
  let grid;
  if (colKind === 'foe') grid = ['bugs', 'bots', 'lizards'].map((f) => `<div class="cside"><i style="color:${GC.color[{ bugs: 'molt', bots: 'foundry', lizards: 'talon' }[f]]}">${FACTION_ABOUT[f].name.toUpperCase()}${all.some((e) => e.side === f && met[e.id]) ? `<span>${FACTION_ABOUT[f].about}</span>` : ''}</i><div class="chips six">${all.filter((e) => e.side === f).map(chip).join('')}</div></div>`).join('');
  else grid = `<div class="chips${all.length > 24 ? ' many' : ''}">${all.map(chip).join('')}</div>`;
  const e = all.find((x) => x.id === colSel), m = e && met[e.id], about = KINDS.find((x) => x[0] === colKind)[2];
  const card = e ? `<div class="cart" id="c-art"></div><em>${esc(e.what)}</em><b>${esc(e.name)}</b><p>${esc(e.about)}</p><dl><dt>FIRST MET</dt><dd>${new Date(m.at).toLocaleDateString()}</dd><dt>COUNT</dt><dd>${m.n}</dd></dl>`
    : `<div class="cart empty"></div><em>NOTHING YET</em><b>Not yet met</b><p>${about} Play to fill it in.</p>`;
  return `<div class="osub ckinds">${tabs}</div><div class="crow">${panel(`${seen.length} of ${all.length} met`, `<p class="soon">${about}</p>${grid}`, 'cbox')}${panel('Details', card, 'cdet')}</div>`;
}
// the open entry's model, drawn once the page is on screen
function collectionArt() {
  const box = $('c-art'), e = colSel && catalogue()[colKind].find((x) => x.id === colSel);
  if (box && e) import('./core/lineart.js').then(({ showArt }) => showArt(box, e.art)).then((ok) => { if (!ok) box.classList.add('empty'); }).catch(() => box.classList.add('empty'));
}
function pageCareer() {
  const c = career(), n = c.n, cat = catalogue();
  const rows = [];
  for (const g in GAMES) for (const k of [0, 1, 2]) { const i = slotInfo(g, k); if (i) rows.push(`<tr><td><b>${GAMES[g].name}</b></td><td>Save ${k + 1}</td><td>${esc(i.title)}</td><td>${esc(i.text)}</td></tr>`); }
  const CR = ' <small>CR</small>', num = (v) => (v || 0).toLocaleString(), mins = Math.round((n.groundSec || 0) / 60);
  const stat = (label, v, sub = '') => `<div class="cstat"><i>${label}</i><b>${v}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const ground = [stat('FIGHTS', num(n.missions), `${num(n.won)} won`), stat('KILLS', num(n.kills)), stat('OBJECTIVES DONE', num(n.objectives)), stat('VANGUARDS LOST', num(n.starsLost), `${num(n.troopsLost)} Infantry`),
    stat('INSURANCE CLAIMED', num(n.insurance) + CR, `${num(n.contracts)} CR on new contracts`), stat('SKILL BONUSES', num(n.skill) + CR), stat('CREDITS EARNED', num(n.groundCr) + CR), stat('TIME ON THE GROUND', mins >= 60 ? `${Math.floor(mins / 60)}H ${mins % 60}M` : `${mins}M`)].join('');
  const post = [stat('BUILDINGS PUT UP', num(n.built)), stat('BASE DAYS', num(n.baseDays), `${num(n.baseFirst)} ranked first`), stat('STATION PARTS BUILT', num(n.parts)), stat('STATION WEEKS', num(n.stationWeeks), n.stationTier ? `best tier ${n.stationTier}` : '')].join('');
  const col = KINDS.map(([k, name]) => { const m = c.met[k] || {}, got = cat[k].filter((e) => m[e.id]).length; return stat(name, `${got}/${cat[k].length}`); }).join('');
  return `<div class="crow car">${panel('On the ground', `<div class="cstats">${ground}</div>`)}${panel('At the base and the station', `<div class="cstats two">${post}</div>`)}</div>
    <div class="crow car">${panel('Your games', rows.length ? `<table class="ctab"><tr><th>GAME</th><th>SAVE</th><th>NAME</th><th>WHERE IT STANDS</th></tr>${rows.join('')}</table>` : '<p class="soon">Nothing played yet. Start a game on the PLAY tab and it will show here.</p>')}${panel('Collection', `<div class="cstats three">${col}</div>`)}</div>
    <p class="soon">Your career is kept across every game and every save: deleting a save does not take it away. Tutorials count for what you meet, not for the totals.</p>`;
}
// ---- OPTIONS (GC 0.75, Ramzies: "more of the normal setup where controls is its own button and menu, and display settings,
// and other such settings there. As well as more nuanced audio settings"): GAMEPLAY, DISPLAY, AUDIO and CONTROLS, each a page
// of its own. The same pages are on the menu inside a game (CONTROLS there is a tab of the menu, for the game being played).
// Every setting here does something: one that only one game has says which.
const OSECT = [['play', 'GAMEPLAY'], ['display', 'DISPLAY'], ['audio', 'AUDIO'], ['controls', 'CONTROLS']];
const CTL = [['war', 'WAR ROOM'], ['fury', 'GROUND'], ['base', 'BASE'], ['orbit', 'STATION']];
let ctlTab = 'war', mOpt = 'play';     // the game whose keys CONTROLS shows; the page of OPTIONS on the menu inside a game
const curOf = (key) => (key === 'msg' ? msgKey() : settings[key]);
const seg = (key, opts) => `<div class="seg">${opts.map(([v, n]) => `<button class="plate btn${String(curOf(key)) === String(v) ? ' on' : ''}" data-act="o-set" data-k="${key}" data-v="${v}">${n}</button>`).join('')}</div>`;
const onoff = (key) => seg(key, [[true, 'ON'], [false, 'OFF']]);
const orow = (label, ctl, hint = '') => `<span class="ol">${label}</span>${ctl}<small>${hint}</small>`;
const pct = (v) => `${Math.round((v ?? 1) * 100)}%`;
const vol = (key, label, hint, soon = false) => orow(label, `<div class="ovol${soon ? ' soon' : ''}"><input type="range" min="0" max="100" step="5" data-vol="${key}" value="${Math.round((settings[key] ?? 1) * 100)}" aria-label="${label}"${soon ? ' disabled' : ''}><b>${soon ? 'SOON' : pct(settings[key])}</b></div>`, hint);
const optPlay = () => `<div class="oset">${orow('HINTS', onoff('hints'), "The coach's cards and tips, in every game.")
  + orow('MESSAGE TIME', seg('msg', MSG_TIMES.map(([k, n]) => [k, n])), 'How long the messages in the corner of the base, the station and the ground fight stay up.')
  + orow('NAMES ON THE MAP', onoff('showNames'), 'On the ground: the names of buildings and enemies, not only of what you pick or aim at.')
  + orow('BLAST RINGS', onoff('showBlasts'), 'On the ground: a ring where each enemy rocket, shell and grenade will land. Your own strikes always show theirs.')
  + orow('SPEECH BUBBLES', onoff('bubbles'), 'On the ground: what your Vanguards and Infantry say before they act.')}</div>`;
const optDisplay = () => `<div class="oset">${orow('SCREEN', `<div class="seg"><button class="plate btn${document.fullscreenElement ? '' : ' on'}" data-act="o-fs" data-v="0">WINDOW</button><button class="plate btn${document.fullscreenElement ? ' on' : ''}" data-act="o-fs" data-v="1">FULL SCREEN</button></div>`, 'The game on the whole screen. Esc or F11 leaves it too.')
  + orow('GRAPHICS', seg('quality', [['auto', 'AUTO'], ['high', 'HIGH'], ['low', 'LOW']]), 'The ground, the base and the station. AUTO lowers the detail when the frames slow down.')
  + orow('FRAME RATE', seg('fps', [['auto', 'AUTO'], ['30', '30'], ['60', '60'], ['144', '144'], ['max', 'NO CAP']]), 'Frames a second at most. AUTO is 30 on a phone and as many as your screen shows elsewhere.')
  + orow('SCREEN SHAKE', seg('shake', [[1, 'FULL'], [0.5, 'HALF'], [0, 'OFF']]), 'The view shaking on the ground under big blasts and landings.')
  + orow('FLASHING', seg('reduceFlash', [[false, 'FULL'], [true, 'REDUCED']]), 'Reduced: slower strobes and softer explosions on the ground.')
  + orow('COLOUR-SAFE', onoff('colorblind'), 'On the ground: enemies in yellow, your own in bright blue.')
  + orow('LIGHTING', onoff('lighting'), 'The hour on the ground: night, flashlights and lamps, muzzle flashes.')}</div>`;
const optAudio = () => `<div class="oset">${orow('SOUND', seg('muted', [[false, 'ON'], [true, 'OFF']]), 'All of it, in every game.')
  + vol('volume', 'MASTER', 'Everything together.')
  + vol('sfx', 'EFFECTS', 'Guns and blasts, alarms, buildings going up, ships docking.')
  + vol('amb', 'AMBIENCE', 'The field around you on the ground: packs, squads, fights, and the hum of the ship.')
  + vol('voice', 'VOICES', 'Your Vanguards, your Infantry and the radio.')
  + vol('ui', 'INTERFACE', 'Clicks, the armoury\'s coins, the supply canister\'s keys.')
  + vol('music', 'MUSIC', 'The score is still being written.', true)
  + orow('IN THE BACKGROUND', seg('bgMute', [[false, 'KEEP PLAYING'], [true, 'GO QUIET']]), 'When the game is hidden or another tab is on top.')}</div>`;
const optKeys = (k) => keysPanel(k, KEYS[k] || []);     // (GC 0.73: the keys can be changed here; controller support is still to come)
const optControls = () => `<div class="osub o2">${CTL.map(([k, n]) => `<button class="${ctlTab === k ? 'on' : ''}" data-act="o-ctl" data-k="${k}">${n}</button>`).join('')}</div>${optKeys(ctlTab)}`;
// the OPTIONS page: its section buttons, then the section (inGame: the menu inside a game, whose CONTROLS is its own tab)
function optBody(inGame) {
  const t = inGame ? mOpt : optTab, secs = inGame ? OSECT.slice(0, 3) : OSECT;
  const body = t === 'display' ? optDisplay() : t === 'audio' ? optAudio() : t === 'controls' ? optControls() : optPlay();
  return `<div class="osub osec">${secs.map(([k, n]) => `<button class="${t === k ? 'on' : ''}" data-act="o-tab" data-k="${k}">${n}</button>`).join('')}</div>${body}`;
}
// a click on OPTIONS; true if it was one (the page is then drawn again)
function optAct(d, inGame = false) {
  if (d.act === 'o-tab') { if (inGame) mOpt = d.k; else optTab = d.k; }
  else if (d.act === 'o-ctl') ctlTab = d.k;
  else if (d.act === 'o-fs') { const on = d.v === '1'; try { if (on && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => app.toast('This browser kept the game in its window.')); else if (!on && document.fullscreenElement) document.exitFullscreen(); } catch { app.toast('This browser has no full screen for the game.'); } }
  else if (d.act === 'o-set') {
    const k = d.k, v = d.v === 'true' ? true : d.v === 'false' ? false : k === 'shake' ? Number(d.v) : d.v;
    if (k === 'hints') { app.setHints(v); return true; }
    if (k === 'msg') setMsg(v);
    settings[k] = v; saveSettings();
  } else return false;
  return true;
}
// the volume sliders: heard as they move, kept when let go (with a blip at the new level, where there is one to hear)
function optBind(root, redraw) {
  for (const r of root.querySelectorAll('input[data-vol]')) {
    const k = r.dataset.vol, out = r.parentElement.querySelector('b');
    r.oninput = () => { settings[k] = r.value / 100; out.textContent = pct(settings[k]); applySound(); };
    r.onchange = () => { saveSettings(); audio.unlock(); if (k === 'ui') audio.click(); else if (k === 'volume' || k === 'sfx') audio.ready(); };
  }
  if (redraw) { optBind.redraw = redraw; }
}
document.addEventListener('fullscreenchange', () => { if (optBind.redraw && document.querySelector('[data-act=o-fs]')) optBind.redraw(); });
function pageOptions() { return panel('Options', optBody(false), 'opan'); }
const PAGES = { home: pageHome, play: pagePlay, livery: pageLivery, collection: pageCollection, career: pageCareer, store: pageStore, options: pageOptions };
function drawTitle() {
  $('t-tabs').innerHTML = TABS.map(([k, n], i) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-tab="${k}">${i === 0 ? '<kbd class="l">Q</kbd>' : ''}${n}${i === TABS.length - 1 ? '<kbd class="r">E</kbd>' : ''}</button>`).join('');
  $('t-page').className = 'tp-' + tab + (tab === 'play' && !playGame ? ' wide' : '');
  $('t-page').innerHTML = `<h2>${tabName(tab)}</h2>` + PAGES[tab]();
  $('t-me').classList.toggle('on', tab === 'livery');
  optBind($('t-page'), drawTitle); bindKeysPanel($('t-page'), drawTitle);
  if (tab === 'collection') collectionArt();
  if (tab === 'livery') bindLivery($('t-page'), { redraw: drawTitle, changed: liveryChanged, audio, toast: app.toast });
  if (tab === 'store') bindStore($('t-page'), { redraw: drawTitle, audio, toast: app.toast });
}
function setTab(k) { tab = k; playGame = null; audio.click(); drawTitle(); }
// the player's own emblem and name, in the bar: their command's; the game's icon stands for the game (the bar, the browser
// tab, the credits). (GC 0.75) The crest is the way to the livery, so it is always there: before a command is founded or a
// livery made it is an empty shield to fill in.
function emptyShield(cv) {
  const g = cv.getContext('2d'), w = cv.width; g.clearRect(0, 0, w, w); g.save(); g.scale(w / 100, w / 100);
  g.strokeStyle = 'rgba(230,234,220,.75)'; g.lineWidth = 4; g.setLineDash([9, 6]); g.beginPath(); g.moveTo(50, 8); g.lineTo(88, 20); g.lineTo(84, 60); g.quadraticCurveTo(76, 80, 50, 94); g.quadraticCurveTo(24, 80, 16, 60); g.lineTo(12, 20); g.closePath(); g.stroke();
  g.setLineDash([]); g.strokeStyle = '#f5d547'; g.lineWidth = 6; g.beginPath(); g.moveTo(50, 34); g.lineTo(50, 66); g.moveTo(34, 50); g.lineTo(66, 50); g.stroke(); g.restore();
}
function paintCrest(cv, logo) {
  if (!cv) return; const w = cv.width, draw = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, w, w); drawLogo(g, logo, w * 0.025, w * 0.025, w * 0.95); };
  if (logo.img) ensureLogo(logo).then(() => { if (cv.isConnected) draw(); }); draw();
}
function barCrest() {
  const id = identity();
  $('t-who').textContent = id ? id.name.toUpperCase() : 'NO LIVERY YET';
  if (id) paintCrest($('t-crest'), id.logo); else emptyShield($('t-crest'));
}
// after the livery changes, wherever it was changed: every crest on show, and the war room behind the menu
function liveryChanged() {
  barCrest(); WarRoom.restyle();
  for (const id of ['crest-th', 'crest-war']) if ($(id)) app.crest($(id));
  const mc = $('m-crest'); if (mc) { const id = identity(); if (id) paintCrest(mc, id.logo); }
}
function toTitle() {
  state = 'title'; mode = null; solo = null; soloCamp = null; tutorial = false; playGame = null; War.show(false); show('s-title');
  barCrest();
  $('t-ver').textContent = `PROTOTYPE ${VERSION} · AN ORIGINAL SETTING · NOT AFFILIATED WITH ANY STUDIO`;
  drawTitle();
}
$('t-tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); };
$('t-me').onclick = () => setTab('livery');
$('t-page').onclick = (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return; const d = b.dataset, g = d.g, n = +d.n;
  if (d.act === 'slot') return playSlot(g, n);
  if (d.act === 'game' && !hasSave(g)) return playSlot(g, 0);     // nothing saved: there is nothing to choose, so it starts
  audio.click();
  if (optAct(d)) return drawTitle();
  if (d.act === 'game') { playGame = g; return drawTitle(); }
  if (d.act === 'c-kind') { colKind = d.k; colSel = null; return drawTitle(); }
  if (d.act === 'c-sel') { colSel = d.id; return drawTitle(); }
  if (d.act === 'back') { playGame = null; return drawTitle(); }
  if (d.act === 'war-continue') warContinue();
  else if (d.act === 'war-new') warNew();
  else if (d.act === 'news') { War.modal(`<h2>Update ${VERSION}</h2><p>${esc(NEWS.title)}.</p><ul class="nws">${NEWS.lines.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><button class="plate btn go" data-x="close">CLOSE</button>`); $('modal').querySelector('[data-x=close]').onclick = () => { $('modal').hidden = true; audio.click(); }; }
  else if (d.act === 'jump') { const l = read(LAST, null); if (l && GAMES[l.g]) playSlot(l.g, l.n); else setTab('play'); }
  else if (d.act === 'credits') credits();
  else if (d.act === 'tut') { if (g === 'war') how(); else if (g === 'fury') enterFury(true); else soloGo(g, false, true); }
  else if (d.act === 'del') confirmBox(`Delete save ${n + 1} of ${GAMES[g].name}?`, 'It cannot be brought back.', 'DELETE IT', () => { delSlot(g, n); if (!hasSave(g)) playGame = null; drawTitle(); });
};
$('t-page').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button]')) { e.preventDefault(); e.target.click(); } });
// Q and E step along the tabs, as shoulder buttons would
window.addEventListener('keydown', (e) => {
  if (state === 'title' && tab === 'livery' && $('modal').hidden && liveryKey(e)) return;     // (0.66) the livery's keys: undo, nudge
  if (state !== 'title' || !$('modal').hidden || !$('menu').hidden || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) return;
  const dir = e.key === 'q' || e.key === 'Q' ? -1 : e.key === 'e' || e.key === 'E' ? 1 : 0; if (!dir) return;
  const i = TABS.findIndex((x) => x[0] === tab); setTab(TABS[i < 0 ? (dir > 0 ? 0 : TABS.length - 1) : (i + dir + TABS.length) % TABS.length][0]);     // (from the livery, which has no tab: to either end)
});
// ---- (0.39) one post on its own: FOB Commander (the base) and Orbital Commander (the station)
const SOLO_NAME = { base: 'FOB COMMANDER', orbit: 'ORBITAL COMMANDER' };
function soloGo(kind, fresh, tut = false) {
  if (tut) { const me = identity() || draft; tutorial = true; return enterSolo(kind, me); }     // a practice post: no founding first, nothing saved
  const me = identity(); if (!me) return toFound(kind); enterSolo(kind, me);
}
async function enterSolo(kind, me) {
  solo = kind; soloCamp = { v: 2, faction: me, war: null, kit: newKit(), wallet: newWallet(), sites: {}, stats: {}, solo: true };
  await ensureLogo(app.faction.logo);
  // (GC 0.79) a post already saved keeps the world it was built on: it was named after the command's capital each time, so
  // founding a new war renamed it (Fort Longwatch became Fort Kestrel Station)
  const meta = (read(SOLO_META, {}) || {})[kind], had = read(SOLO[kind], null) && meta;
  const kept = had ? meta.home || String(meta.name || '').replace(/^Fort\s+/i, '').replace(/\s+Station$/i, '').trim() : '';
  const home = kept || me.capital || GC.names.capital || 'Aurelia';
  soloHome = home;
  enterTheatre(kind, { system: { id: kind === 'base' ? 9001 : 9002, name: home, kind: 'capital', worlds: [{ name: home, type: 'capital' }], key: 0 } }, true);
}
// ---- Orbital Fury: the ground game whole, in its own page. (0.60) It has no menu of its own here: it starts on its
// operation (the one saved, or a new one's setup) or its tutorial, and leaving that comes back to this menu.
function enterFury(training = false) {
  if (fury) return;
  const me = identity();
  window.gcFury = { livery: asFaction(livery(), me || draft), hints: settings.hints, training, direct: !training, onExit: () => setTimeout(leaveFury, 0) };
  WarRoom.play(false);   // (0.72) the ground game's frame covers the menu: the war room rests under it
  state = 'fury'; fury = document.createElement('iframe'); fury.id = 'g-frame'; fury.title = 'Orbital Fury'; fury.setAttribute('allow', 'autoplay; fullscreen');
  fury.onload = () => { try { fury.contentWindow.focus(); } catch { /* not focusable yet */ } };
  fury.src = 'ground.html' + (qs.has('debug') ? '?debug' : ''); document.body.appendChild(fury);
}
function leaveFury() { if (fury) { fury.remove(); fury = null; } window.gcFury = null; toTitle(); }

function how(then) {
  War.modal(`<h2>One war, four jobs</h2><p>You run a private fleet. Three enemies are coming for your worlds. Win the war, and look good doing it.</p>
    <div class="how">
      <div><b>THE WAR ROOM</b>The map. Each round you move your fleets, attack or defend. Battles are fought with cards.</div>
      <div><b>THE GROUND</b>Or fight a battle yourself: cover your squad from orbit with the ship's guns. One fight a round is on camera.</div>
      <div><b>THE STATION</b>Builds your ships and repairs them.</div>
      <div><b>THE BASE</b>Trains your troops and digs up materials.</div>
    </div>
    <p class="dim">Lose a system and the enemy takes its station and base too.</p>
    <p class="dim">Your Vanguards are the war's celebrities: elite soldiers and the stars of the evening broadcast, each one a fortune spent on training and on film. When one falls the insurance pays out, and the next star costs more to sign.</p>
    <button class="plate btn go" data-x="close">${then ? 'TO THE WAR ROOM' : 'CLOSE'}</button>`);
  $('modal').querySelector('[data-x=close]').onclick = () => { $('modal').hidden = true; audio.click(); if (then) then(); };
}
function credits() {
  War.modal(`<h2>Credits</h2><p>Design and direction: Ramzies. Built with Claude (Anthropic) as a coding assistant.</p>
    <p>Galactic Command is one war in four parts: the war room, where you give the fronts their orders; the ground fight, from a fire-support ship's gun; the orbital station; and FOB Commander, the bases. Art is drawn in code and sound is synthesised in the browser.</p>
    <p>The setting: a war fought by private fleets for the cameras. Its Vanguards are influencers in armour, insured like film stars and signed like athletes; the bases grade themselves on morale and publicity; every victory is a broadcast.</p>
    <p>3D is drawn with three.js (MIT licence, js/vendor/THREE-LICENSE).</p>
    <p>Thanks to the SESF community for testing, ideas and feedback.</p>
    <p class="dim">An original setting. Not affiliated with or endorsed by any game studio or publisher.</p>
    <button class="plate btn go" data-x="close">CLOSE</button>`);
  $('modal').querySelector('[data-x=close]').onclick = () => { $('modal').hidden = true; audio.click(); };
}
function confirmBox(title, text, yes, go) {
  War.modal(`<h2>${esc(title)}</h2><p>${esc(text)}</p><button class="plate btn go" data-x="yes">${esc(yes)}</button><button class="plate btn" style="width:100%;margin-top:8px" data-x="no">CANCEL</button>`);
  $('modal').querySelector('[data-x=yes]').onclick = () => { $('modal').hidden = true; audio.click(); go(); };
  $('modal').querySelector('[data-x=no]').onclick = () => { $('modal').hidden = true; audio.click(); };
}


// ---------------------------------------------------------------- found your command
// (0.66) The founding screen: a livery to start from (the five styles, or the one you wear), the command's name, capital and
// motto, and for a war its opening. The emblem and colours are made your own from the crest in the bar.
let draft = baseDraft();
let fl = null;            // the livery the command is being founded in, kept only when it is
let foundFor = 'war';     // what the founding is for: the war, or a single post ('base', 'orbit')
function toFound(what = 'war') {
  foundFor = what; state = 'found'; show('s-found'); $('f-open').classList.toggle('hidden', what !== 'war');
  draft = baseDraft(); fl = JSON.parse(JSON.stringify(livery()));
  $('f-capital').value = draft.capital || ''; openDraw(); foundFill();
}
function foundFill() { $('f-name').value = fl.name || ''; $('f-motto').value = fl.motto || ''; foundDraw(); }
// The opening: how much the command starts with. Fewer fleets and no posts is the harder war.
const OPEN = { level: [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD'], ['brutal', 'BRUTAL']], fleets: [['lean', 'LEAN'], ['standard', 'STANDARD'], ['strong', 'STRONG']], posts: [['none', 'NONE'], ['some', 'ONE EACH'], ['many', 'THREE EACH']] };
function openDraw() {
  draft.open ||= { fleets: 'standard', posts: 'none', level: 'normal' }; draft.open.level ||= 'normal';
  for (const k of ['level', 'fleets', 'posts']) {
    $('f-' + k).innerHTML = OPEN[k].map(([id, name]) => `<button class="plate btn sm grow${draft.open[k] === id ? ' on' : ''}" data-open="${k}" data-v="${id}">${name}</button>`).join('');
    for (const b of $('f-' + k).querySelectorAll('button')) b.onclick = () => { draft.open[b.dataset.open] = b.dataset.v; audio.click(); openDraw(); };
  }
}
const wornOwn = () => hasLivery() && isOwn(livery()) ? livery() : null;
function foundDraw() {
  $('f-styles').innerHTML = styleCards(fl, wornOwn(), 'YOUR LIVERY', false); drawCards($('f-styles'), fl, wornOwn());
}
$('f-styles').onclick = (e) => {
  const b = e.target.closest('[data-lv]'); if (!b) return; audio.click();
  if (b.dataset.lv === 'preset') fl = fromPreset(b.dataset.id, fl); else if (wornOwn()) fl = JSON.parse(JSON.stringify(livery()));
  foundFill();
};
$('f-name').oninput = () => { fl.name = $('f-name').value; fl.ownName = true; };
$('f-capital').oninput = () => { draft.capital = $('f-capital').value; };
$('f-motto').oninput = () => { fl.motto = $('f-motto').value; fl.ownName = true; };
// the next of the five styles
$('f-roll').onclick = () => { const i = PRESETS.findIndex((p) => p.preset === fl.preset && !isOwn(fl)); fl = fromPreset(PRESETS[(i + 1) % PRESETS.length].preset, fl); audio.click(); foundFill(); };
$('f-back').onclick = () => { audio.click(); toTitle(); };
$('f-go').onclick = () => {
  audio.ready();
  fl.name = (fl.name || '').trim() || 'The Command'; fl.motto = (fl.motto || '').trim(); draft.capital = (draft.capital || '').replace(/[<>&]/g, '').trim() || GC.names.capital;
  setLivery(JSON.parse(JSON.stringify(fl)));
  const me = asFaction(livery(), draft);
  write(PROFILE, JSON.parse(JSON.stringify(me)));
  if (foundFor !== 'war') return enterSolo(foundFor, JSON.parse(JSON.stringify(me)));
  app.endCampaignQuiet();
  camp = { v: 2, faction: JSON.parse(JSON.stringify(me)), war: null, kit: newKit(), wallet: newWallet(), sites: {}, stats: { ground: 0, groundWon: 0 }, at: Date.now() };
  camp.wallet.bal += upgrade('chest');     // (0.69) the STORE's war chest
  // (0.39) no asking whether to play a tutorial: the coach's hints are on or off (Settings), and a first war with them on is
  // the opening they were written for
  how(() => { const hints = settings.hints && !settings.hintsDone && !qs.has('seed'); toWar({ seed: qs.has('seed') ? Number(qs.get('seed')) : hints ? SEED : Date.now() % 100000, tutorial: hints }); });
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
async function enterTheatre(kind, args, alone = false) {
  if (state !== 'war' && !alone) return;
  app.keep(); audio.strikeCall();
  const [over, title, sub] = alone ? [kind === 'base' ? 'SURFACE' : 'ORBIT', SOLO_NAME[kind] + (tutorial ? ': TUTORIAL' : ''), tutorial ? 'A practice post. Nothing here is saved.' : kind === 'base' ? 'One base, yours to grow. Roads first, then let it grow along them.' : 'One station, yours to lay out. Its people will do the rest.'] : PASS[kind](args);
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
    console.error(err); mode = null; if (alone) toTitle(); else { state = 'war'; show('s-war'); War.show(true); }
    app.toast('That post could not be reached. ' + (err && err.message ? err.message : ''), 5000);
  }
  $('trans').hidden = true;
}
// Back to the war room. `out` is what the theatre reports: { win, left } from the ground; { level } from a station or a base.
function leaveTheatre(out = {}) {
  const kind = state, args = frameUi.args; if (!mode) return;
  if (solo && !tutorial) soloNote(out);
  try { mode.leave(); } catch (err) { console.error(err); }
  mode = null; clearInterval(frameUi._wt); frameUi.war(null);
  if (solo) return toTitle();     // (0.39) a post on its own answers to no war: back to the main menu
  if (kind === 'ground') { camp.stats.ground++; if (out.win) camp.stats.groundWon++; if (!out.abandon) War.groundResult(!!out.win, out.left ?? 0.5, out.res || null); }
  else if (out.level != null) {
    const key = kind === 'orbit' ? 'station' : 'base', g = War.war(), p = args.system, rec = (camp.sites[p.id] ||= {}), cur = p[key] || 1;
    let level = Math.min(out.level, cur);
    if (out.level > cur) { if (rec[key + 'Up'] !== g.round) { level = cur + 1; rec[key + 'Up'] = g.round; app.toast(`${p.name}: ${key} raised to ${level} on the map.`); } else app.toast(`${p.name}: the map takes one new ${key === 'station' ? 'tier' : 'charter'} a round. The rest is waiting for next round.`, 4000); }
    else if (out.level < cur) level = out.level;
    War.setSite(p.id, key, Math.max(1, level), !!out.profit, out.air || 0); rec[kind] = out;
  }
  state = 'war'; show('s-war'); War.show(true); app.keep();
  if (kind === 'ground' && out.abandon) app.toast('The landing is called off. The fleets still face each other.');
}

// (0.39) a line about the post played on its own, for its card on the main menu
function soloNote(out) {
  if (!solo || !mode) return; let r = out; try { if (r == null || r.level == null) r = mode.report ? mode.report() : {}; } catch { r = {}; }
  const m = read(SOLO_META, {}) || {}; m[solo] = { name: $('th-where').textContent || '', home: soloHome || '', charter: r.charter || '', tier: r.tier || '', troops: r.troops || 0, profit: !!r.profit, at: Date.now() }; write(SOLO_META, m);
}
// ---------------------------------------------------------------- the frame every theatre shares
// A theatre never touches the page outside this: it sets where it is, its numbers, its tools and what is said.
export const frameUi = {
  args: null, paused: false, speed: 1, speeds: [1, 2, 4],
  reset(kind, args) {
    this.args = args; this.paused = false; this.speed = 1;
    $('th-kind').textContent = solo ? SOLO_NAME[kind] : { ground: 'FIRE SUPPORT', orbit: 'STATION COMMAND', base: 'BASE COMMAND' }[kind]; this.war(null); clearInterval(this._wt);
    if (kind !== 'ground') this._wt = setInterval(() => { try { const g = War.war(); if (!mode || !mode.report || !g || (state !== 'orbit' && state !== 'base')) return; const r = mode.report(), key = state === 'orbit' ? 'station' : 'base'; this.war(g.postGives(args.system.id, key, Math.max(1, Math.min(r.level || 1, (args.system[key] || 0) + 1)), !!r.profit, r.air || 0)); } catch (err) { /* the post is still opening */ } }, 700);
    $('th-where').textContent = args.system.name; $('th-stats').innerHTML = ''; this._sig = ''; $('th-bar').innerHTML = ''; $('th-tabs').innerHTML = '';     // (0.78: the numbers are drawn afresh, or a post reopened just as it was left showed none)
    $('th-feed').innerHTML = ''; $('th-desk').innerHTML = ''; $('th-msg').classList.remove('show'); $('th-side').classList.add('hidden'); $('th-sel').classList.add('hidden'); $('th-tip').classList.add('hidden');
    $('th-pause').textContent = 'II'; $('th-speed').textContent = '1×'; $('th-leave').textContent = kind === 'ground' ? 'ABORT' : solo ? 'MAIN MENU' : 'TO THE MAP';
    $('th-speed').classList.toggle('hidden', kind === 'ground');
    app.crest($('crest-th'));
  },
  // (0.28) what this post gives the war each round, as it stands right now: shown under the bar while you are inside it
  war(list) {
    const el = $('th-war'); if (!list || !list.length) { el.classList.add('hidden'); this._wsig = ''; return; }
    const sig = JSON.stringify(list); if (sig === this._wsig) return; this._wsig = sig;
    el.innerHTML = '<span class="wl">THIS POST GIVES THE WAR, EACH ROUND</span>' + list.map((s) => `<span class="wc${s.wait ? ' wait' : ''}"><b>${s.v != null ? '+' + s.v : ''}</b> ${esc(s.k)}${s.text ? ` <i>${esc(s.text)}</i>` : ''}${s.wait ? ' <i>ONCE IN PROFIT</i>' : ''}</span>`).join('');
    el.classList.remove('hidden');
  },
  stats(list) {     // [{ k: 'CREDITS', v: 120, tone: 'a' | '' | 'r' }]
    const sig = JSON.stringify(list); if (sig === this._sig) return; this._sig = sig;
    $('th-stats').innerHTML = list.map((s) => `<div class="${s.tone === 'a' ? 'a' : ''}${s.act ? ' act' : ''}"${s.act ? ` data-act="${esc(s.act)}" title="${esc(s.title || 'Tap for the details')}"` : ''}${s.tone === 'r' ? ' style="border-color:var(--red)"' : ''}><b${s.tone === 'r' ? ' style="color:var(--red)"' : ''}>${esc(s.v)}</b><span>${esc(s.k)}${s.act ? ' ›' : ''}</span></div>`).join('');   // (0.63) act: a stat that opens a report
  },
  message(text, ms = 2600) { const m = $('th-msg'); m.textContent = text; m.classList.add('show'); clearTimeout(this._mt); this._mt = setTimeout(() => m.classList.remove('show'), ms); },
  feed(text, tone = '') { const f = $('th-feed'), d = document.createElement('div'); d.className = tone; d.textContent = text; f.appendChild(d); while (f.children.length > 4) f.firstChild.remove(); timeMessage(d, 7000); },     // (0.58) how long: MESSAGE TIME in Settings
  tip(text) { if (!settings.hints) text = ''; const t = $('th-tip'); t.classList.toggle('hidden', !text); if (text) t.textContent = text; },     // (0.39: a tip is a hint, and hints can be off)
  leave: (out) => leaveTheatre(out),
};
$('th-menu').onclick = () => openMenu();
$('th-livery').onclick = () => openMenu('livery');     // (GC 0.75) the crest opens your livery; MENU, beside the pause, opens the menu
$('th-pause').onclick = () => { frameUi.paused = !frameUi.paused; $('th-pause').textContent = frameUi.paused ? '▶' : 'II'; $('th-pause').classList.toggle('on', frameUi.paused); audio.click(); };
$('th-speed').onclick = () => { const s = frameUi.speeds; frameUi.speed = s[(s.indexOf(frameUi.speed) + 1) % s.length]; $('th-speed').textContent = frameUi.speed + '×'; audio.click(); };
$('th-leave').onclick = () => { audio.click(); if (mode && mode.askLeave) mode.askLeave(); else if (mode) leaveTheatre(mode.report ? mode.report() : {}); };

// ---------------------------------------------------------------- the armoury: one shop for the whole war
// Everything is bought from the war chest. Four shelves: the ground (the ship's weapons, Orbital Fury's own list), the
// stations, the bases and the fleet. What a shelf will sell is set by the armoury rank: one for every station tier and
// base charter that is linked to the capital and running in profit. What you own, you keep.
const SECTIONS = { orbitals: 'ORBITALS', strikers: 'STRIKERS', defense: 'DEFENCES', utilities: 'UTILITIES', hangar: 'HANGAR', gun: 'SHIP GUN', uav: 'UAV', infantry: 'TROOPS', build: 'BUILDING', support: 'SUPPORT', classified: 'CLASSIFIED' };
const SHELVES = { ground: 'GROUND', station: 'STATIONS', base: 'BASES', fleet: 'FLEET' };
app.armouryTier = () => { const g = War.war(); return g ? Math.min(TIER_MAX, g.rank()) : 0; };
app.grant = (id) => { const g = War.war(), it = g && g.shelfItem(id); return it ? g.lv(id) * it.per : 0; };
let armTab = 'ground';
app.armoury = (then, done = 'DONE') => {
  const kit = camp.kit, wal = camp.wallet, g = War.war();
  const draw = (note = '') => {
    const tier = app.armouryTier(), pay = g.postsPay();
    const mats = GC.fronts.map((fr) => `<span style="color:${GC.color[fr.f]}">${g.loot[fr.f]} ${fr.lootShort}${pay.mat[fr.f] ? ` <i class="dim">+${pay.mat[fr.f]}</i>` : ''}</span>`).join(' · ');
    let h = `<h2>Armoury</h2><p><b class="am">${Math.floor(wal.bal)} CR</b>${pay.cr ? ` <span class="dim">+${pay.cr} a round</span>` : ''} · ${mats}</p>
      <p class="sm2">RANK ${tier} OF ${TIER_MAX} <span class="dim">· one for every station tier and base charter in profit</span></p>
      <div class="row" style="margin-bottom:10px">${Object.keys(SHELVES).map((k) => `<button class="plate btn sm grow${armTab === k ? ' on' : ''}" data-tab="${k}">${SHELVES[k]}</button>`).join('')}</div>${note ? `<p class="am">${esc(note)}</p>` : ''}`;
    if (armTab === 'ground') {
      const items = shopItems(kit), secs = [...new Set(items.map((i) => i.section))];
      const slots = Array.from({ length: kit.slots }, (_, i) => { const id = kit.loadout[i], it = id && items.find((x) => x.orb === id); return `<button class="plate btn sm${id ? ' on' : ''}" data-un="${i}" ${id ? '' : 'disabled'}>${id ? esc((it && it.name) || id) + ' ×' : 'EMPTY'}</button>`; }).join('');
      h += `<h3>${words('Loadout · tap to take one out')}</h3><div class="row" style="margin-bottom:10px">${slots}</div>`;
      for (const sec of secs) {
        h += `<h3>${SECTIONS[sec] || sec.toUpperCase()}</h3>`;
        for (const it of items.filter((i) => i.section === sec)) {
          const open = shownAt(it, tier), maxed = it.cost == null, can = open && !maxed && wal.bal >= it.cost, inLoad = it.orb && kit.loadout.includes(it.orb);
          h += `<div class="mis"><div><b class="${open ? '' : 'dim'}">${esc(it.name || it.id)}</b> <span class="sm2 dim">${it.max > 1 ? `level ${it.level}/${it.max}` : it.level ? 'owned' : ''}${it.blurb ? ' · ' + esc(it.blurb) : ''}</span></div>
            <span class="row" style="flex-wrap:nowrap">${it.orb && it.owned && !inLoad ? `<button class="plate btn sm" data-eq="${it.orb}">EQUIP</button>` : ''}<button class="plate amber btn sm" data-buy="${it.id}" ${can ? '' : 'disabled'}>${!open ? 'LOCKED' : maxed ? 'MAX' : it.cost + ' CR'}</button></span></div>`;
        }
      }
    } else {
      for (const it of GC.shelf[armTab]) {
        const lv = g.lv(it.id), n = g.nextLevel(it.id), fr = GC.fronts[GC.factions.indexOf(it.mat)], open = n && tier >= n.rank;
        h += `<div class="mis"><div><b class="${!n || open ? '' : 'dim'}">${it.name}</b> <span class="sm2 dim">level ${lv}/${it.lv.length} · ${esc(it.text)}</span></div>
          <button class="plate amber btn sm" data-up="${it.id}" ${n && g.canBuy(it.id, wal.bal) ? '' : 'disabled'}>${!n ? 'MAX' : !open ? 'RANK ' + n.rank : `${n.cr} CR · ${n.n} ${fr.lootShort}`}</button></div>`;
      }
    }
    War.modal(h + '<button class="plate btn go" data-x="close" style="margin-top:10px;position:sticky;bottom:0">' + done + '</button>');
    const box = $('modal');
    box.querySelector('[data-x=close]').onclick = () => { box.hidden = true; audio.click(); app.keep(); War.redraw(); if (then) then(); };
    for (const b of box.querySelectorAll('[data-tab]')) b.onclick = () => { armTab = b.dataset.tab; audio.click(); draw(); };
    for (const b of box.querySelectorAll('[data-buy]')) b.onclick = () => { const r = buy(kit, wal, b.dataset.buy, false, tier); if (r.ok) { audio.coin(); draw(); } else { audio.deny(); draw('That cannot be bought yet.'); } };
    for (const b of box.querySelectorAll('[data-up]')) b.onclick = () => { if (g.buy(b.dataset.up, wal)) { audio.coin(); draw(); } else { audio.deny(); draw('That cannot be bought yet.'); } };
    for (const b of box.querySelectorAll('[data-eq]')) b.onclick = () => { if (equip(kit, b.dataset.eq)) { audio.click(); draw(); } else { audio.deny(); draw('Every slot is full. Take one out first.'); } };
    for (const b of box.querySelectorAll('[data-un]')) b.onclick = () => { unequip(kit, +b.dataset.un); audio.click(); draw(); };
  };
  draw();
};

// ---------------------------------------------------------------- the menu (the same one everywhere)
// (0.61) The menu inside a game is the main menu's own style: the bar with its tabs (GAME, OPTIONS, CONTROLS) and a panel.
// (GC 0.75) Your crest is at the right of its bar too, as on the main menu: it opens your livery, here on the menu.
let menuWas = false;
function closeMenu() { const m = $('menu'); if (m.hidden) return; m.hidden = true; if (mode) frameUi.paused = menuWas; audio.click(); }
function openMenu(page = 'game') {
  const m = $('menu');
  if (m.hidden) { menuWas = frameUi.paused; if (mode) frameUi.paused = true; }
  const g = War.war(), key = solo || (state === 'ground' ? 'fury' : KEYS[state] ? state : 'war'), me = app.faction;
  const where = solo ? SOLO_NAME[solo][0] + SOLO_NAME[solo].slice(1).toLowerCase() : state === 'war' ? `The war room · round ${g ? g.round : 1}` : state === 'ground' ? 'Fire support' : state === 'orbit' ? 'Station command' : 'Base command';
  const body = page === 'livery' ? pageLivery() : page === 'options' ? panel('Options', optBody(true), 'opan') : page === 'controls' ? panel('Controls', optKeys(key))
    : panel(esc(me.name), `<p class="soon">${esc(me.motto || '')}</p><p class="soon">${esc(where)} · saved on this device</p>
      <div class="gbtns"><button class="plate btn go" id="m-resume" data-act="resume">RESUME</button><button class="plate btn" id="m-how" data-act="how">HOW THE WAR FITS TOGETHER</button><button class="plate btn" id="m-title" data-act="title">SAVE AND GO TO THE MAIN MENU</button></div>`);
  m.innerHTML = `<div class="gmenu"><header id="m-bar"><img class="tlogo" src="assets/icon.svg" alt=""><div class="tname"><span>${esc(where.toUpperCase())}</span><b>${page === 'livery' ? 'YOUR LIVERY' : 'PAUSED'}</b></div>
    <nav class="ttabs" id="m-tabs">${[['game', 'GAME'], ['options', 'OPTIONS'], ['controls', 'CONTROLS']].map(([k, n]) => `<button class="${page === k ? 'on' : ''}" data-mtab="${k}">${n}</button>`).join('')}</nav>
    <button class="twho${page === 'livery' ? ' on' : ''}" id="m-me" type="button" data-mtab="livery" title="Your livery: your name, emblem and colours"><span class="twn"><span>${esc(String(me.name || '').toUpperCase())}</span><small>YOUR LIVERY</small></span><canvas id="m-crest" width="160" height="160"></canvas></button></header>
    <main class="gpage${page === 'livery' || page === 'options' ? ' wide' : ''}">${body}</main></div>`;
  paintCrest($('m-crest'), me.logo);
  optBind(m, () => openMenu('options')); bindKeysPanel(m, () => openMenu('controls'));
  if (page === 'livery') bindLivery(m, { redraw: () => openMenu('livery'), changed: () => { liveryChanged(); const n = m.querySelector('#m-me .twn > span'); if (n) n.textContent = String(app.faction.name || '').toUpperCase(); }, audio, toast: app.toast });
  m.onclick = (e) => {
    const t = e.target.closest('[data-mtab]'); if (t) { audio.click(); return openMenu(t.dataset.mtab); }
    const b = e.target.closest('[data-act]'); if (!b || !m.contains(b)) return; const d = b.dataset;
    if (optAct(d, true)) { audio.click(); return openMenu('options'); }
    if (d.act === 'resume') closeMenu();
    else if (d.act === 'how') { m.hidden = true; how(); if (mode) frameUi.paused = menuWas; }
    else if (d.act === 'title') {
      m.hidden = true; audio.click();
      if (mode) { const out = mode.report ? mode.report() : {}; leaveTheatre(state === 'ground' ? { abandon: true } : out); }
      app.keep(); toTitle();
    }
  };
  m.hidden = false;
}
window.addEventListener('keydown', (e) => {
  if (!$('menu').hidden && $('modal').hidden && liveryKey(e)) return;     // (GC 0.75) the livery's keys, on the menu inside a game
  if (e.key === 'Escape') { if (!$('menu').hidden) { closeMenu(); return; } if (!$('modal').hidden) return; if (state !== 'title' && state !== 'found' && state !== 'fury') openMenu(); }
});
window.addEventListener('beforeunload', () => { if (mode && mode.store) mode.store(); soloNote(null); app.keep(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (mode && mode.store) mode.store(); app.keep(); } });

// ---------------------------------------------------------------- the clock: one loop for the whole game
let last = performance.now();
let nextDraw = 0;
function loop(ms) {
  requestAnimationFrame(loop);
  // (GC 0.75) FRAME RATE in OPTIONS: at most that many frames a second (AUTO and NO CAP: as many as the screen shows)
  const cap = { 30: 30, 60: 60, 144: 144 }[settings.fps] || 0;
  if (cap) { if (ms < nextDraw - 1.5) return; nextDraw = Math.max(nextDraw + 1000 / cap, ms); }
  const now = ms / 1000, dt = Math.min(0.1, Math.max(0, (ms - last) / 1000)); last = ms;
  try {
    // (0.72: the title's backdrop is the live war room, js/core/warroom.js, on its own clock while the menu shows)
    if (state === 'war') War.frame(ms);
    else if (mode) mode.frame(frameUi.paused ? 0 : dt * frameUi.speed, now, dt);
  } catch (err) { if (!loop.said) { loop.said = true; console.error(err); app.toast('Something went wrong on this screen: ' + err.message, 6000); } }
}
void GC;
toTitle();
requestAnimationFrame(loop);
