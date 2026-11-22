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
import { words } from './core/words.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const KEY = 'ofgc.campaign', SET_KEY = 'ofgc.settings';
// (0.39) a single post played on its own (FOB Commander, Orbital Commander) keeps its own save, apart from the war's; the
// command's name, crest and colours are kept once and worn in every way of playing
const PROFILE = 'ofgc.profile', SOLO = { base: 'ofgc.solo.base', orbit: 'ofgc.solo.orbit' }, SOLO_META = 'ofgc.solo.meta';
const qs = new URLSearchParams(location.search);

// ---------------------------------------------------------------- settings and sound
const settings = { volume: 0.6, muted: false, hints: true, hintsDone: false, ...read(SET_KEY, {}) };     // (0.39) hints: the coach's cards, on or off
export const audio = new Audio();
audio.set(settings.volume, settings.muted);
for (const k of ['pointerdown', 'keydown']) window.addEventListener(k, () => audio.unlock(), { once: true, capture: true });
function read(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; } }
function drop(key) { try { localStorage.removeItem(key); } catch { /* no storage here */ } }

// ---------------------------------------------------------------- the command (faction): one identity for every post
const NAMES = ['Aurelian Vanguard', 'Ninth Meridian', 'Lantern Guard', 'Cinder Legion', 'Halcyon Watch', 'Iron Chorus', 'Harrow Company', 'Sable Dawn', 'Emberline Corps', 'Vigil of Tarsen'];
const MOTTOS = ['As seen on every front.', 'First in, best lit.', 'Victory, brought to you by us.', 'Trusted by nine planets in ten.', 'We hold the line. Ask for us by name.', 'Results you can broadcast.'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function rollFaction() {
  const bg = pick(['#1b2a1a', '#111111', '#1d3f8a', '#3d4247', '#8a1c1c', '#2e4a2a']), fg = pick(['#ffe600', '#f4f4f4', '#ffb020', '#3da9ff']);
  const pc = pick(['#3d4247', '#8a1c1c', '#1d3f8a', '#2e4a2a', '#111111', '#c0392b'].filter((c) => c !== bg));     // the pattern: dark, and never the field's or the symbol's colour
  const name = pick(NAMES);
  return { name, capital: pick(GC.names.capitals), motto: pick(MOTTOS), primary: pick(['#22262a', '#2e4a2a', '#3a4f6a', '#5d6a4a', '#8a5a44']), secondary: fg,
    logo: { shape: pick(SHAPES), symbol: pick(SYMBOLS.filter((s) => s !== 'none')), bg, fg, rim: fg, text: name.split(/\s+/).map((w) => w[0]).join('').slice(0, 4).toUpperCase(), pattern: pick(PATTERNS), pc },
    look: { uniform: '#5d6a4a', helmet: '#4c5a3c', armband: fg, crest: true } };
}

// ---------------------------------------------------------------- the campaign: everything that is saved
// { v, faction, war (the galaxy's own save), kit + wallet (the ship's armoury, carried from battle to battle),
//   sites: { [systemId]: { station: {...}, base: {...} } } (summaries; each theatre keeps its full state under its own key) }
let camp = null;
let state = 'title';       // title | found | war | ground | orbit | base
let mode = null;           // the theatre on screen, if any
let solo = null;           // (0.39) 'base' or 'orbit' while one post is played on its own, with no war round it
let tutorial = false;      // a post opened as its TUTORIAL from the main menu: a practice post, nothing of it is saved
let soloCamp = null;       // what stands in for the campaign then: the command's identity and nothing else
let fury = null;           // the Orbital Fury mode's own page, while it is open
const modes = {};          // loaded theatres, by name

export const app = {
  get faction() { return camp ? camp.faction : soloCamp ? soloCamp.faction : draft; },
  get camp() { return camp || soloCamp; },
  audio, settings, version: VERSION,
  crest(canvas) { if (!canvas) return; const g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height); drawLogo(g, app.faction.logo, 2, 2, canvas.width - 4); },
  keep() { if (!camp) return; const g = War.war(); if (g && g.phase === 'plan' && !g.over) camp.war = g.save(); camp.at = Date.now(); write(KEY, camp); },
  toast(text, ms = 2200) { const t = $('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(app._tt); app._tt = setTimeout(() => t.classList.remove('show'), ms); },
  menu: () => openMenu(),
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

function show(id) { for (const s of document.querySelectorAll('.scr')) s.classList.toggle('on', s.id === id); const v = $('tbg'); if (v && v.play) { if (id === 's-title') { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); } }

// ---------------------------------------------------------------- title
// who you are when there is no war on: the identity kept from the last founding, or the saved campaign's
const identity = () => { const c = read(KEY, null); return read(PROFILE, null) || (c && c.v === 2 && c.faction) || null; };
const ago = (t) => { if (!t) return ''; const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'saved just now' : m < 60 ? `saved ${m} min ago` : m < 1440 ? `saved ${Math.round(m / 60)} h ago` : `saved ${Math.round(m / 1440)} d ago`; };
// What is saved in each way of playing, in a line or two: shown on its card and in the SAVES list.
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
const NONE = { war: 'No campaign yet.', fury: 'Mission after mission against the enemy you pick.', base: 'Lay the roads, zone the ground, hold the wire.', orbit: 'Build it part by part and keep it in profit.' };
function toTitle() {
  state = 'title'; mode = null; solo = null; soloCamp = null; tutorial = false; War.show(false); show('s-title');
  const saved = read(KEY, null), ok = saved && saved.v === 2 && saved.faction, me = (ok && saved.faction) || identity() || draft, S = saves();
  $('b-continue').classList.toggle('hidden', !ok);
  $('b-new').classList.toggle('go', !ok);
  const crest = () => { const g = $('t-crest').getContext('2d'); g.clearRect(0, 0, 160, 160); drawLogo(g, me.logo, 4, 4, 152); };
  if (me.logo.img) ensureLogo(me.logo).then(() => { if (state === 'title') crest(); }); crest();
  for (const k of ['war', 'fury', 'base', 'orbit']) { const el = $('ms-' + k), v = S[k]; el.classList.toggle('none', !v); el.innerHTML = v ? `<b>${esc(v.title)}</b>${esc(v.text)}${v.at ? ' · ' + ago(v.at) : ''}` : NONE[k]; }
  $('b-fury').textContent = S.fury ? 'CONTINUE' : 'PLAY';
  $('b-base-new').textContent = S.base ? 'NEW' : 'PLAY'; $('b-orbit-new').textContent = S.orbit ? 'NEW' : 'PLAY';
  for (const k of ['base', 'orbit']) { $('b-' + k).classList.toggle('hidden', !S[k]); $('b-' + k + '-new').classList.toggle('go', !S[k]); }
  $('t-ver').textContent = `PROTOTYPE ${VERSION} · AN ORIGINAL SETTING · NOT AFFILIATED WITH ANY STUDIO`;
}
$('b-continue').onclick = async () => { audio.click(); camp = read(KEY, null); if (!camp) return toTitle(); await ensureLogo(camp.faction.logo); toWar({ saved: camp.war, tutorial: settings.hints && !settings.hintsDone && !qs.has('seed') }); };
$('b-new').onclick = () => { audio.click(); if (read(KEY, null)) return confirmBox('Start a new campaign?', 'The campaign in progress, with its stations and bases, will be lost.', 'START A NEW CAMPAIGN', () => toFound('war')); toFound('war'); };
// ---- (0.39) one post on its own: FOB Commander (the base) and Orbital Commander (the station)
const SOLO_NAME = { base: 'FOB COMMANDER', orbit: 'ORBITAL COMMANDER' };
function soloGo(kind, fresh, tut = false) {
  audio.click();
  if (tut) { const me = identity() || draft; tutorial = true; return enterSolo(kind, me); }     // a practice post: no founding first, nothing saved
  const go = () => { if (fresh) { drop(SOLO[kind]); const m = read(SOLO_META, {}) || {}; delete m[kind]; write(SOLO_META, m); } const me = identity(); if (!me) return toFound(kind); enterSolo(kind, me); };
  if (fresh && read(SOLO[kind], null)) return confirmBox(kind === 'base' ? 'Start a new base?' : 'Start a new station?', `The ${kind === 'base' ? 'base' : 'station'} you have been building will be lost.`, kind === 'base' ? 'START A NEW BASE' : 'START A NEW STATION', go);
  go();
}
async function enterSolo(kind, me) {
  await ensureLogo(me.logo);
  solo = kind; soloCamp = { v: 2, faction: me, war: null, kit: newKit(), wallet: newWallet(), sites: {}, stats: {}, solo: true };
  const home = (me.capital || GC.names.capital || 'Aurelia');
  enterTheatre(kind, { system: { id: kind === 'base' ? 9001 : 9002, name: home, kind: 'capital', worlds: [{ name: home, type: 'capital' }], key: 0 } }, true);
}
$('b-base').onclick = () => soloGo('base', false); $('b-base-new').onclick = () => soloGo('base', true); $('b-base-tut').onclick = () => soloGo('base', false, true);
$('b-orbit').onclick = () => soloGo('orbit', false); $('b-orbit-new').onclick = () => soloGo('orbit', true); $('b-orbit-tut').onclick = () => soloGo('orbit', false, true);
// ---- (0.39) Orbital Fury mode: the ground game whole, with its own missions, difficulty and saves, in its own page
function enterFury(training = false) {
  audio.click(); if (fury) return;
  const me = identity();
  // (0.56) training: straight into its tutorial (a practice base, nothing kept), and back here when it ends
  window.gcFury = { livery: me || draft, hints: settings.hints, training, onExit: () => setTimeout(leaveFury, 0) };
  state = 'fury'; fury = document.createElement('iframe'); fury.id = 'g-frame'; fury.title = 'Orbital Fury'; fury.setAttribute('allow', 'autoplay; fullscreen');
  fury.onload = () => { try { fury.contentWindow.focus(); } catch { /* not focusable yet */ } };
  fury.src = 'ground.html' + (qs.has('debug') ? '?debug' : ''); document.body.appendChild(fury);
}
function leaveFury() { if (fury) { fury.remove(); fury = null; } window.gcFury = null; toTitle(); }
$('b-fury').onclick = () => enterFury(false); $('b-fury-tut').onclick = () => enterFury(true);
// ---- (0.39) what is saved, in one list: every way of playing, what it holds, and a way to clear it
function savesBox() {
  const S = saves(), name = { war: 'GALACTIC', fury: 'ORBITAL FURY', base: 'FOB COMMANDER', orbit: 'ORBITAL COMMANDER' };
  War.modal('<h2>Saves</h2><p class="dim">Everything is kept on this device, in this browser.</p>' + ['war', 'fury', 'base', 'orbit'].map((k) => { const v = S[k];
    return `<div class="svrow${v ? '' : ' none'}"><div><b>${name[k]}</b><span>${v ? `${esc(v.title)} · ${esc(v.text)}${v.at ? ' · ' + ago(v.at) : ''}` : NONE[k]}</span></div>${v ? `<button class="plate btn sm" data-del="${k}">DELETE</button>` : ''}</div>`; }).join('') +
    '<button class="plate btn go" data-x="close" style="margin-top:12px">CLOSE</button>');
  const box = $('modal'); box.querySelector('[data-x=close]').onclick = () => { box.hidden = true; audio.click(); toTitle(); };
  for (const b of box.querySelectorAll('[data-del]')) b.onclick = () => confirmBox(`Delete the ${name[b.dataset.del]} save?`, 'It cannot be brought back.', 'DELETE IT', () => {
    const k = b.dataset.del;
    if (k === 'war') app.endCampaignQuiet(); else if (k === 'fury') { for (const q of ['ofs.session', 'ofs.campRun', 'ofs.slots']) drop(q); } else { drop(SOLO[k]); const m = read(SOLO_META, {}) || {}; delete m[k]; write(SOLO_META, m); }
    savesBox();
  });
}
$('b-saves').onclick = () => { audio.click(); savesBox(); };
$('b-how').onclick = () => { audio.click(); how(); };
$('b-settings').onclick = () => { audio.click(); openMenu('settings'); };
$('b-credits').onclick = () => { audio.click(); credits(); };

function how(then) {
  War.modal(`<h2>One war, four jobs</h2><p>You run a private fleet. Three enemies are coming for your worlds. Win the war, and look good doing it.</p>
    <div class="how">
      <div><b>THE WAR ROOM</b>The map. Each round you move your fleets, attack or defend. Battles are fought with cards.</div>
      <div><b>THE GROUND</b>Or fight a battle yourself: cover your squad from orbit with the ship's guns. One fight a round is on camera.</div>
      <div><b>THE STATION</b>Builds your ships and repairs them.</div>
      <div><b>THE BASE</b>Trains your troops and digs up materials.</div>
    </div>
    <p class="dim">Lose a system and the enemy takes its station and base too.</p>
    <button class="plate btn go" data-x="close">${then ? 'TO THE WAR ROOM' : 'CLOSE'}</button>`);
  $('modal').querySelector('[data-x=close]').onclick = () => { $('modal').hidden = true; audio.click(); if (then) then(); };
}
function credits() {
  War.modal(`<h2>Credits</h2><p>Design and direction: Ramzies. Built with Claude (Anthropic) as a coding assistant.</p>
    <p>Galactic Command brings four prototypes into one game: Orbital Fury, Super Orbital Simulator, FOB Super Commander and Super Galactic Strategy. Art is drawn in code and sound is synthesised in the browser.</p>
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
let draft = rollFaction();
const CYCLE = { shape: SHAPES, symbol: SYMBOLS, pattern: PATTERNS };
let foundFor = 'war';     // what the founding is for: the war, or a single post ('base', 'orbit')
function toFound(what = 'war') {
  foundFor = what; state = 'found'; show('s-found'); $('f-open').classList.toggle('hidden', what !== 'war');
  $('f-name').value = draft.name; $('f-capital').value = draft.capital || ''; openDraw(); $('f-motto').value = draft.motto; $('f-text').value = draft.logo.text || '';
  const sw = (id, get, set) => { $(id).innerHTML = PALETTE.map((c) => `<button style="background:${c}" data-c="${c}" class="${get() === c ? 'on' : ''}" aria-label="${c}"></button>`).join(''); $(id).onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; set(b.dataset.c); audio.click(); toFound(foundFor); }; };
  sw('f-bg', () => draft.logo.bg, (c) => { draft.logo.bg = c; });
  sw('f-fg', () => draft.logo.fg, (c) => { draft.logo.fg = c; });
  sw('f-pc', () => draft.logo.pc, (c) => { draft.logo.pc = c; });
  sw('f-rim', () => draft.logo.rim, (c) => { draft.logo.rim = c; });
  $('f-unup').classList.toggle('hidden', !draft.logo.img); $('f-up').textContent = draft.logo.img ? 'CHANGE THE PICTURE' : 'UPLOAD A PICTURE';
  sw('f-primary', () => draft.primary, (c) => { draft.primary = c; });
  sw('f-secondary', () => draft.secondary, (c) => { draft.secondary = c; draft.look.armband = c; });
  foundDraw();
}
// The opening: how much the command starts with. Fewer fleets and no posts is the harder war.
const OPEN = { level: [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD'], ['brutal', 'BRUTAL']], fleets: [['lean', 'LEAN'], ['standard', 'STANDARD'], ['strong', 'STRONG']], posts: [['none', 'NONE'], ['some', 'ONE EACH'], ['many', 'THREE EACH']] };
function openDraw() {
  draft.open ||= { fleets: 'standard', posts: 'none', level: 'normal' }; draft.open.level ||= 'normal';
  for (const k of ['level', 'fleets', 'posts']) {
    $('f-' + k).innerHTML = OPEN[k].map(([id, name]) => `<button class="plate btn sm grow${draft.open[k] === id ? ' on' : ''}" data-open="${k}" data-v="${id}">${name}</button>`).join('');
    for (const b of $('f-' + k).querySelectorAll('button')) b.onclick = () => { draft.open[b.dataset.open] = b.dataset.v; audio.click(); openDraw(); };
  }
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
$('f-capital').oninput = () => { draft.capital = $('f-capital').value; };
$('f-motto').oninput = () => { draft.motto = $('f-motto').value; };
$('f-text').oninput = () => { draft.logo.text = $('f-text').value.toUpperCase(); foundDraw(); };
$('f-roll').onclick = () => { draft = rollFaction(); audio.click(); toFound(foundFor); };
// your own picture in place of the crest: shrunk to 128 px and kept with the campaign on this device
$('f-up').onclick = () => $('f-file').click();
$('f-file').onchange = async () => {
  const f = $('f-file').files[0]; $('f-file').value = ''; if (!f) return;
  try { draft.logo.img = await readUpload(f); audio.ready(); toFound(foundFor); } catch (err) { audio.deny(); app.toast(err.message || 'That picture could not be read.', 4000); }
};
$('f-unup').onclick = () => { delete draft.logo.img; audio.click(); toFound(foundFor); };
$('f-back').onclick = () => { audio.click(); toTitle(); };
$('f-go').onclick = () => {
  audio.ready();
  draft.name = (draft.name || '').trim() || 'The Command'; draft.motto = (draft.motto || '').trim(); draft.capital = (draft.capital || '').replace(/[<>&]/g, '').trim() || GC.names.capital;
  write(PROFILE, JSON.parse(JSON.stringify(draft)));
  if (foundFor !== 'war') return enterSolo(foundFor, JSON.parse(JSON.stringify(draft)));
  app.endCampaignQuiet();
  camp = { v: 2, faction: JSON.parse(JSON.stringify(draft)), war: null, kit: newKit(), wallet: newWallet(), sites: {}, stats: { ground: 0, groundWon: 0 }, at: Date.now() };
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
  const m = read(SOLO_META, {}) || {}; m[solo] = { name: $('th-where').textContent || '', charter: r.charter || '', tier: r.tier || '', troops: r.troops || 0, profit: !!r.profit, at: Date.now() }; write(SOLO_META, m);
}
// ---------------------------------------------------------------- the frame every theatre shares
// A theatre never touches the page outside this: it sets where it is, its numbers, its tools and what is said.
export const frameUi = {
  args: null, paused: false, speed: 1, speeds: [1, 2, 4],
  reset(kind, args) {
    this.args = args; this.paused = false; this.speed = 1;
    $('th-kind').textContent = solo ? SOLO_NAME[kind] : { ground: 'FIRE SUPPORT', orbit: 'STATION COMMAND', base: 'BASE COMMAND' }[kind]; this.war(null); clearInterval(this._wt);
    if (kind !== 'ground') this._wt = setInterval(() => { try { const g = War.war(); if (!mode || !mode.report || !g || (state !== 'orbit' && state !== 'base')) return; const r = mode.report(), key = state === 'orbit' ? 'station' : 'base'; this.war(g.postGives(args.system.id, key, Math.max(1, Math.min(r.level || 1, (args.system[key] || 0) + 1)), !!r.profit, r.air || 0)); } catch (err) { /* the post is still opening */ } }, 700);
    $('th-where').textContent = args.system.name; $('th-stats').innerHTML = ''; $('th-bar').innerHTML = ''; $('th-tabs').innerHTML = '';
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
    $('th-stats').innerHTML = list.map((s) => `<div class="${s.tone === 'a' ? 'a' : ''}"${s.tone === 'r' ? ' style="border-color:var(--red)"' : ''}><b${s.tone === 'r' ? ' style="color:var(--red)"' : ''}>${esc(s.v)}</b><span>${esc(s.k)}</span></div>`).join('');
  },
  message(text, ms = 2600) { const m = $('th-msg'); m.textContent = text; m.classList.add('show'); clearTimeout(this._mt); this._mt = setTimeout(() => m.classList.remove('show'), ms); },
  feed(text, tone = '') { const f = $('th-feed'), d = document.createElement('div'); d.className = tone; d.textContent = text; f.appendChild(d); while (f.children.length > 4) f.firstChild.remove(); setTimeout(() => d.remove(), 7000); },
  tip(text) { if (!settings.hints) text = ''; const t = $('th-tip'); t.classList.toggle('hidden', !text); if (text) t.textContent = text; },     // (0.39: a tip is a hint, and hints can be off)
  leave: (out) => leaveTheatre(out),
};
$('th-menu').onclick = () => openMenu();
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
function openMenu(page = 'main') {
  const inPlay = state !== 'title' && state !== 'found', m = $('menu'), was = frameUi.paused;
  if (mode) frameUi.paused = true;
  const close = () => { m.hidden = true; if (mode) { frameUi.paused = was; } audio.click(); };
  if (page === 'settings') {
    m.innerHTML = `<div class="plate amber box"><h2>Settings</h2>
      <label class="rng">VOLUME<input type="range" id="m-vol" min="0" max="100" value="${Math.round(settings.volume * 100)}"></label>
      <div class="mm"><button class="plate btn${settings.muted ? ' on' : ''}" id="m-mute">${settings.muted ? 'SOUND IS OFF' : 'SOUND IS ON'}</button>
      <button class="plate btn${settings.hints ? ' on' : ''}" id="m-hints">${settings.hints ? 'HINTS ARE ON' : 'HINTS ARE OFF'}<small>The coach's cards and tips. Turn them off when you know your way round, and on again whenever you like.</small></button>
      <button class="plate btn go" id="m-back">${inPlay ? 'BACK' : 'CLOSE'}</button></div></div>`;
    $('m-vol').oninput = () => { settings.volume = $('m-vol').value / 100; audio.set(settings.volume, settings.muted); write(SET_KEY, settings); };
    $('m-mute').onclick = () => { settings.muted = !settings.muted; audio.set(settings.volume, settings.muted); write(SET_KEY, settings); openMenu('settings'); };
    $('m-hints').onclick = () => { app.setHints(!settings.hints); audio.click(); openMenu('settings'); };
    $('m-back').onclick = () => { if (inPlay) openMenu('main'); else close(); };
  } else {
    const g = War.war();
    m.innerHTML = `<div class="plate amber box"><h2>${esc(app.faction.name)}</h2><p>${esc(app.faction.motto || '')}</p>
      <p>${solo ? SOLO_NAME[solo][0] + SOLO_NAME[solo].slice(1).toLowerCase() : state === 'war' ? `The war room · round ${g ? g.round : 1}` : state === 'ground' ? 'Fire support' : state === 'orbit' ? 'Station command' : 'Base command'} · saved on this device</p>
      <div class="mm"><button class="plate btn go" id="m-resume">RESUME</button>
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
  if (e.key === 'Escape') { if (!$('menu').hidden) { $('menu').hidden = true; return; } if (!$('modal').hidden) return; if (state !== 'title' && state !== 'found' && state !== 'fury') openMenu(); }
});
window.addEventListener('beforeunload', () => { if (mode && mode.store) mode.store(); soloNote(null); app.keep(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (mode && mode.store) mode.store(); app.keep(); } });

// ---------------------------------------------------------------- the clock: one loop for the whole game
let last = performance.now();
function loop(ms) {
  requestAnimationFrame(loop);
  const now = ms / 1000, dt = Math.min(0.1, Math.max(0, (ms - last) / 1000)); last = ms;
  try {
    // (0.56: the title's backdrop is the war room film, #tbg; it plays by itself and is paused away from the title)
    if (state === 'war') War.frame(ms);
    else if (mode) mode.frame(frameUi.paused ? 0 : dt * frameUi.speed, now, dt);
  } catch (err) { if (!loop.said) { loop.said = true; console.error(err); app.toast('Something went wrong on this screen: ' + err.message, 6000); } }
}
void GC;
toTitle();
requestAnimationFrame(loop);
