// THE GROUND: fire support from orbit over a battle on a planet. The rules and the drawing are Orbital Fury's
// (js/ground/sim, js/ground/render); this file is how the commander meets them inside Galactic Command: which fight
// it is (from the fleets on the map), the ship's weapons along the shared tool bar, and what goes back to the map.
import { CONFIG as C } from '../ground/config.js';
import { Mission } from '../ground/sim/mission.js';
import { Renderer } from '../ground/render/renderer.js';
import { buildTerrain } from '../ground/render/terrain.js';
import { sunAt } from '../ground/render/sky.js';
import { slotStats, refreshAim } from '../ground/sim/player.js';
import { squadCentres } from '../ground/sim/seaf.js';
import { makeBot, botStep, NOVICE } from '../ground/sim/bot.js';
import { POSTS } from '../ground/sim/posts.js';
import { buildStats, buildLevel } from '../ground/data/kit.js';
import { t as tr } from '../ground/i18n.js';
import { C as GC } from '../galaxy/config.js';

const $ = (id) => document.getElementById(id);
const STEP = 1 / C.world.tickHz, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const WON = (o) => o === 'victory' || o === 'complete';

let app, ui, audio, canvas, renderer;
let m = null, args = null, bot = null, auto = false;
let cam = { x: 800, y: 800, view: 400, follow: false };
let tab = 'weapons', mini = null, miniT = 0;
let acc = 0, armed = false, placing = null, overAt = 0, shown = false, level = 1, barSig = '', credits0 = 0;
const keys = new Set(), settings = { polarity: 'white', relief: false, quality: 'auto', reduceFlash: false, colorblind: false, showNames: false, showBlasts: false, relief3d: 'auto', bubbles: true, uiScale: 1, smooth: true };

// ---------------------------------------------------------------- which fight this is
// The odds on the map set how hard the ground is: the enemy's hit points against yours, and a station overhead helps.
function levelFor(b, sys) {
  const mine = Math.max(1, b.you.hp), theirs = Math.max(1, b.foe.hp);
  const raw = 1.5 + 1.5 * Math.log2(theirs / mine) + (sys.kind === 'home' ? 2 : 0) - Math.floor((sys.station || 0) / 2);
  return clamp(Math.round(raw), GC.link.level.min, GC.link.level.max);
}
const hash = (a, b, c) => { let h = (a * 2654435761) ^ (b * 40503) ^ (c * 97); h = Math.imul(h ^ (h >>> 15), 2246822507); return (h ^ (h >>> 13)) >>> 0; };

// ---------------------------------------------------------------- smooth movement between the rules' 30 steps a second
const TWEEN = (q) => [q.alive, q.enemies, q.pelicans, q.civs, q.drops];
function keepPrev(q) { for (const L of TWEEN(q)) if (L) for (const o of L) { o._px = o.x; o._py = o.y; } }
let tweened = false;
function tween(q, k) {
  if (!(k >= 0 && k < 0.98)) return; tweened = true;
  for (const L of TWEEN(q)) if (L) for (const o of L) {
    if (o._px === undefined) { o._tx = undefined; continue; }
    const dx = o.x - o._px, dy = o.y - o._py;
    if (dx * dx + dy * dy > 36 || (dx === 0 && dy === 0)) { o._tx = undefined; continue; }
    o._tx = o.x; o._ty = o.y; o.x = o._px + dx * k; o.y = o._py + dy * k;
  }
}
function untween(q) { if (!tweened) return; tweened = false; for (const L of TWEEN(q)) if (L) for (const o of L) if (o._tx !== undefined) { o.x = o._tx; o.y = o._ty; o._tx = undefined; } }

// ---------------------------------------------------------------- what happens, heard and said
const loud = (x, y) => clamp(1.25 - Math.hypot(x - cam.x, y - cam.y) / (cam.view * 1.1), 0.12, 1);
const pan = (x) => clamp((x - cam.x) / (cam.view * 0.55), -1, 1);
function onEvent(ev, now) {
  renderer.handle(ev, now, m);
  const L = ev.x !== undefined ? loud(ev.x, ev.y) : 1, P = ev.x !== undefined ? pan(ev.x) : 0;
  switch (ev.type) {
    case 'boom': if (ev.nuke) audio.nukeBlast(); else audio.boom(ev.r, L, P); break;
    case 'tracer': if (m.visLevel(ev.x, ev.y) > 0 || m.visLevel(ev.tx, ev.ty) > 0) audio.snd(ev.snd || ev.s, L, P); break;
    case 'beam': case 'beam_walk': audio.beam(); break;
    case 'gun': audio.snd('shipgat', L, P); break;
    case 'heal': audio.snd('heal', L, P); break;
    case 'crit': if ((ev.by === 'player' && (ev.f & 3)) || (ev.f & 1)) audio.crit(ev.f & 1, L, P); break;
    case 'flare': audio.flare(L, P); break;
    case 'reinf': audio.reinf(m.faction.id, Math.max(0.5, L), P); break;
    case 'reinf_spawn': audio.arrive(ev.src === 'hole' ? 'bugs' : ev.src, L, P); break;
    case 'drop_down': audio.dropDown(Math.max(0.6, L), P); break;
    case 'boss': audio.siren(); ui.message(`${ev.name} ON THE FIELD`, 3200); break;
    case 'boss_down': audio.baseDown(); audio.objective(); ui.message(`${ev.name} DESTROYED`, 3000); break;
    case 'extract_call': audio.alarm(); ui.message('EXTRACTION CALLED', 2400); break;
    case 'extract_landing': case 'pelican_arrive': audio.rotor(); break;
    case 'extract_down': audio.chirp(); ui.message('PELICAN ON THE PAD', 2200); break;
    case 'pelican_drop': audio.snd('thud', L, P); break;
    case 'side_done': audio.sideDone(); break;
    case 'side_failed': audio.sideLost(); break;
    case 'full_clear': audio.objective(); ui.message('EVERY BASE DESTROYED', 2600); break;
    case 'area_clear': audio.win(); ui.message('AREA CLEAR', 2600); break;
    case 'strat_call': case 'util_call': audio.stratCall(); break;
    case 'strike_call': audio.strikeCall(ev.id); afterCall(); break;
    case 'uav': audio.uav(); afterCall(); break;
    case 'nuke_call': audio.siren(); audio.nukeLaunch(); ui.message('WARHEAD AWAY', 2400); afterCall(); break;
    case 'obj_state': if (ev.type === 'nuke' && ev.state === 'armed') { audio.siren(); ui.message('LAUNCH SITE ARMED: THE WARHEAD IS YOURS', 3200); } break;
    case 'objective_done': audio.objective(); ui.message('OBJECTIVE COMPLETE', 3000); break;
    case 'extract_live': audio.alarm(); ui.message('GET THEM OUT', 2600); break;
    case 'asset_new': case 'mount': audio.ready(); break;
    case 'deny': audio.deny(); break;
    case 'radio': audio.chirp(); ui.feed(ev.text, 'radio'); break;
    case 'notice': ui.feed(ev.text, ev.tone === 'good' ? 'good' : ev.tone === 'bad' ? 'bad' : ev.tone === 'warn' ? 'warn' : ''); break;
    case 'credit': audio.coin(); break;
    case 'pod_call': case 'seaf_order': audio.chirp(); break;
    case 'pod_land': audio.podLand(); break;
    case 'poi_down': case 'base_down': audio.baseDown(); if (ev.type === 'base_down') ui.feed('Enemy base destroyed.', 'good'); break;
    case 'ally_down': audio.allyDown(); break;
    case 'end': if (WON(ev.outcome)) audio.win(); else audio.lose(); break;
    default:
  }
}
function afterCall() { if (armed && m.player.slots[m.player.weapon].type !== 'gun') disarm(); }

// ---------------------------------------------------------------- the ship's weapons on the shared tool bar
const SLOT_KEYS = ['Q', '1', '2', '3', '4', '5', '6', 'F', '7'];
function arm(i) {
  if (!m || m.over) return;
  if (armed && m.player.weapon === i) { disarm(); audio.click(); return; }
  placing = null;
  m.selectWeapon(i);
  if (m.player.weapon !== i) { audio.deny(); return; }
  armed = true; audio.click(); bar(true);
}
function disarm() { armed = false; if (m) { m.setFiring(false); m.player.queued = -1; } bar(true); }
const ORDERS = { move: ['MOVE', 'go there and hold'], attack: ['ATTACK', 'push on that point'], protect: ['PROTECT', 'guard that spot'] };
const bname = (w) => { const n = tr('kit.bld.' + w); return n && n !== 'kit.bld.' + w ? n : w === 'wire' ? 'Razor Wire' : w === 'foxhole' ? 'Foxhole' : w; };
function tabs() { $('th-tabs').innerHTML = [['weapons', 'SHIP WEAPONS'], ['troops', 'TROOPS'], ['build', 'BUILD']].map(([k, n]) => `<button data-gt="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join(''); }
function setPlacing(k) { placing = placing === k ? null : k; if (placing) { armed = false; m.setFiring(false); } audio.click(); bar(true); stats(); }
function bar(force) {
  if (!m) return;
  const p = m.player, t = m.t, items = [];
  if (m.dropIn > 0) items.push(`<button class="plate amber btn tool on" data-g="deploy"><b>DROP NOW</b><span>${Math.ceil(m.dropIn)} s to the drop</span></button>`);
  if (tab === 'weapons') {
    p.slots.forEach((s, i) => {
      if (s.type === 'empty') return;
      const st = slotStats(m, i) || { name: s.type }, on = armed && p.weapon === i;
      let sub = 'READY', cool = false, frac = 0;
      if (s.type === 'gun') { sub = `${Math.floor(p.gun.ammo)} / ${p.gun.max} ROUNDS`; frac = p.gun.ammo / p.gun.max; }
      else if (s.type === 'nuke') { const ok = m.nukeReady(); sub = s.uses > 0 ? (ok ? 'ARMED' : 'NEEDS A LAUNCH SITE') : 'SPENT'; cool = !ok || s.uses <= 0; }
      else if (s.readyAt > t) { sub = `${Math.ceil(s.readyAt - t)} s`; cool = true; frac = 1 - clamp((s.readyAt - t) / Math.max(1, st.cd || 30), 0, 1); }
      else if (s.eu !== undefined) sub = `${s.eu} RUN${s.eu === 1 ? '' : 'S'}`;
      else if (s.uses !== undefined && s.uses !== Infinity) sub = `${s.uses} LEFT`;
      items.push(`<button class="plate btn tool${on ? ' on' : ''}${cool ? ' cool' : ''}" data-g="arm" data-i="${i}"><kbd>${SLOT_KEYS[i] || ''}</kbd><b>${esc(st.name || s.type)}</b><span>${sub}</span>${frac ? `<i class="cd" style="width:${Math.round(frac * 100)}%"></i>` : ''}</button>`);
    });
    items.push(`<button class="plate btn tool${auto ? ' on' : ''}" data-g="auto"><b>AUTO-GUNNER</b><span>${auto ? 'ON · THE CREW FIRES' : 'OFF · YOU FIRE'}</span></button>`);
  } else if (tab === 'troops') {
    const sf = m.seaf, sq = sf.squads || [];
    items.push(`<button class="plate btn tool${placing === 'seaf' ? ' on' : ''}" data-g="place" data-k="seaf"><kbd>T</kbd><b>TROOP DROP</b><span>${Math.floor(m.wallet.bal)} CR</span></button>`);
    if (sq.length) {
      items.push(`<button class="plate btn tool${sf.sel < 0 ? ' on' : ''}" data-g="squad" data-i="-1"><b>ALL SQUADS</b><span>${sq.reduce((a, q) => a + (q.n || 0), 0)} troops</span></button>`);
      sq.forEach((q, i) => { if (q.n > 0) items.push(`<button class="plate btn tool${sf.sel === i ? ' on' : ''}" data-g="squad" data-i="${i}"><b>SQUAD ${i + 1}</b><span>${q.n} · ${esc(String(typeof q.order === 'string' ? q.order : (q.order && q.order.kind) || 'auto').toUpperCase())}</span></button>`); });
      for (const k in ORDERS) items.push(`<button class="plate amber btn tool${placing === 'order:' + k ? ' on' : ''}" data-g="place" data-k="order:${k}"><b>${ORDERS[k][0]}</b><span>${ORDERS[k][1]}</span></button>`);
      items.push('<button class="plate amber btn tool" data-g="order" data-k="escort"><b>ESCORT</b><span>stay with the squad</span></button>');
      items.push('<button class="plate amber btn tool" data-g="order" data-k="auto"><b>AT WILL</b><span>their own judgement</span></button>');
      items.push(`<button class="plate btn tool${placing === 'pickup' ? ' on' : ''}" data-g="place" data-k="pickup"><b>PICKUP</b><span>lift troops out</span></button>`);
    }
  } else {
    for (const w of POSTS) {
      const free = w === 'foxhole' || w === 'wire', lvl = free ? 1 : buildLevel(m.kit, w), st = lvl ? buildStats(w, lvl) : null, cost = st && st.cost != null ? Math.round(st.cost * (m.buildMul ? m.buildMul() : 1)) : null;
      items.push(`<button class="plate btn tool${placing === 'build:' + w ? ' on' : ''}" data-g="place" data-k="build:${w}" ${lvl ? '' : 'disabled'}><b>${esc(bname(w))}</b><span>${!lvl ? 'ARMOURY' : cost ? cost + ' CR' : 'FREE'}</span></button>`);
    }
  }
  const html = items.join('');
  if (force || html !== barSig) { barSig = html; $('th-bar').innerHTML = html; }
}
function stats() {
  const left = Math.max(0, C.world.missionSec + (m.extraSec || 0) - m.t), mm = Math.floor(left / 60), ss = String(Math.floor(left % 60)).padStart(2, '0');
  const done = m.objectives.filter((o) => o.done).length;
  ui.stats([{ k: 'LIVES', v: `${m.hd.lives}`, tone: m.hd.lives <= 4 ? 'r' : 'a' }, { k: 'OBJECTIVE', v: `${done}/${m.objectives.length}` }, { k: 'BASES', v: `${m.stats.bases}/${m.baseTotal}` },
    { k: 'CLOCK', v: `${mm}:${ss}` }, { k: 'CREDITS', v: `${Math.floor(m.wallet.bal)}` }, { k: 'THREAT', v: `L${level}` }]);
  let tip = '';
  if (m.over) tip = '';
  else if (placing === 'seaf') tip = 'Tap where the troops should land.';
  else if (placing === 'pickup') tip = 'Tap where the pelican should lift them out.';
  else if (placing && placing.startsWith('order:')) tip = `${ORDERS[placing.slice(6)][0]}: tap the ground.`;
  else if (placing && placing.startsWith('build:')) tip = `${bname(placing.slice(6))}: tap where the troops should build it.`;
  else if (armed) { const s = m.player.slots[m.player.weapon]; tip = s.type === 'gun' ? 'Hold on the map to fire the ship gun.' : `${(slotStats(m, m.player.weapon) || {}).name || 'Weapon'}: tap the map to call it.`; }
  ui.tip(tip);
}

// ---------------------------------------------------------------- pointing: aim, fire, pan, zoom
const ptr = new Map(); let moved = 0, pinch = 0, firing = false, downAt = 0;
const world = (e) => renderer.screenToWorld(e.clientX, e.clientY, canvas);
function panBy(dx, dy) { const k = cam.view / canvas.clientWidth; cam.x = clamp(cam.x - dx * k, 0, C.world.size); cam.y = clamp(cam.y - dy * k, 0, C.world.size); }
function zoom(f) { cam.view = clamp(cam.view / f, C.world.zoomMin, C.world.zoomMax); }
function tapAt(e) {
  const w = world(e); if (!w || !m || m.over) return;
  if (placing) {
    const r = placing === 'seaf' ? m.callSeaf(w.x, w.y) : placing === 'pickup' ? m.callPickup(w.x, w.y) : placing.startsWith('order:') ? m.seafOrder(placing.slice(6), w.x, w.y) : m.seafBuild(placing.slice(6), w.x, w.y, {});
    if (r && r.ok === false) audio.deny(); else { audio.chirp(); if (!placing.startsWith('build:')) placing = null; bar(true); stats(); }
    return;
  }
  if (armed && !auto) { m.setAim(w.x, w.y); m.fire(); }
}
function bind() {
  canvas.addEventListener('pointerdown', (e) => {
    if (!m) return;
    canvas.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 1) { moved = 0; downAt = performance.now(); const gun = armed && !auto && m.player.slots[m.player.weapon].type === 'gun' && e.button !== 2 && e.button !== 1;
      if (gun) { const w = world(e); if (w) { m.setAim(w.x, w.y); m.setFiring(true); firing = true; } } }
    else if (firing) { m.setFiring(false); firing = false; }
    pinch = 0;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!m) return;
    if (!ptr.has(e.pointerId)) { if (e.pointerType === 'mouse' && !auto) { const w = world(e); if (w) m.setAim(w.x, w.y); } return; }
    const [px, py] = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 1) {
      if (firing) { const w = world(e); if (w) m.setAim(w.x, w.y); return; }
      moved += Math.abs(e.clientX - px) + Math.abs(e.clientY - py);
      if (moved > 8) panBy(e.clientX - px, e.clientY - py);
    } else if (ptr.size === 2) {
      const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) zoom(d / pinch); pinch = d; moved = 99;
      panBy((e.clientX - px) / 2, (e.clientY - py) / 2);
    }
  });
  const up = (e) => {
    if (!ptr.has(e.pointerId)) return;
    ptr.delete(e.pointerId); pinch = 0;
    if (firing) { m.setFiring(false); firing = false; return; }
    if (ptr.size || moved > 8 || e.type === 'pointercancel' || e.button === 2) return;
    tapAt(e);
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (armed) disarm(); placing = null; bar(true); });
  $('th-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-gt]'); if (!b || mode.off) return; tab = b.dataset.gt; placing = null; audio.click(); tabs(); bar(true); stats(); });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  $('th-bar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]'); if (!b || !m || mode.off) return;
    const g = b.dataset.g;
    if (g === 'arm') arm(+b.dataset.i);
    else if (g === 'deploy') { m.deployNow(); audio.ready(); }
    else if (g === 'place') setPlacing(b.dataset.k);
    else if (g === 'squad') { m.selectSquad(+b.dataset.i); audio.click(); bar(true); }
    else if (g === 'order') { const r = m.seafOrder(b.dataset.k); if (r && r.ok === false) audio.deny(); else audio.chirp(); bar(true); }
    else if (g === 'auto') { auto = !auto; bot = auto ? makeBot(NOVICE) : null; if (auto) { armed = false; placing = null; } audio.click(); bar(true); }
  });
  window.addEventListener('keydown', (e) => {
    if (mode.off || !m || e.target.tagName === 'INPUT' || !$('menu').hidden || !$('modal').hidden) return;
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    keys.add(k);
    const i = SLOT_KEYS.indexOf(k);
    if (i >= 0 && m.player.slots[i] && m.player.slots[i].type !== 'empty') arm(i);
    else if (k === 'T') { tab = 'troops'; tabs(); setPlacing('seaf'); }
    else if (k === 'Escape' && (placing || armed)) { e.stopImmediatePropagation(); placing = null; if (armed) disarm(); bar(true); stats(); }
    else if (k === ' ') { e.preventDefault(); $('th-pause').click(); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.length === 1 ? e.key.toUpperCase() : e.key));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('resize', () => { if (!mode.off) renderer.resize(); });
}

// ---------------------------------------------------------------- the end of the fight
function result() {
  const r = m.result(), win = WON(r.outcome), earned = Math.max(0, Math.floor(m.wallet.bal - credits0));
  const left = win ? clamp(0.35 + 0.65 * (r.livesLeft / Math.max(1, r.livesMax)), 0.1, 1) : clamp(1 - 0.5 * (r.bases / Math.max(1, r.baseTotal)), 0.3, 1);
  const sys = args.system, atk = args.battle.kind === 'atk';
  const box = document.createElement('div');
  $('modal').innerHTML = `<div class="plate amber box"><h2 class="${win ? '' : 'rd2'}">${win ? (atk ? 'THE GROUND IS TAKEN' : 'THE LINE HOLDS') : (atk ? 'THE LANDING FAILED' : 'THE GROUND IS LOST')}</h2>
    <p>${esc(sys.name)} · ${esc(String(r.outcome).toUpperCase())} · threat level ${level}</p>
    <table class="tb"><tr><td>Enemy destroyed</td><td>${r.kills}</td></tr><tr><td>Bases destroyed</td><td>${r.bases} / ${r.baseTotal}</td></tr>
    <tr><td>Lives left</td><td>${r.livesLeft} / ${r.livesMax}</td></tr><tr><td>Credits earned for the armoury</td><td class="am">+${earned}</td></tr></table>
    <p class="dim">${win ? 'What is left of the landing force holds the system. The fleet keeps what the ground saved.' : 'The fleet pulls back with what it could lift off.'}</p>
    <button class="plate btn go" id="g-done">RETURN TO THE WAR ROOM</button></div>`;
  void box; $('modal').hidden = false;
  $('g-done').onclick = () => { $('modal').hidden = true; audio.click(); ui.leave({ win, left }); };
}

// ---------------------------------------------------------------- the mode
const mode = {
  off: true,
  init(a, frame) {
    app = a; ui = frame; audio = a.audio; canvas = $('v-ground');
    renderer = new Renderer(canvas); renderer.setSettings(settings); renderer.quality = 'high'; renderer.qset = 'auto';
    bind();
  },
  async enter(a) {
    args = a; mode.off = false;
    const b = a.battle, sys = a.system, g = app.camp, kw = sys.worlds[sys.key];
    const faction = GC.link.foe[b.f] || 'bugs', biome = GC.link.biome[kw.type] || 'grass';
    const seed = hash(sys.id + 1, (g.war && g.war.seed) || 1, g.stats.ground + 1);
    level = levelFor(b, sys);
    $('s-theatre').classList.add('full');
    renderer.phone = Math.min(innerWidth, innerHeight) < 540; renderer.resize();
    credits0 = g.wallet.bal;
    const tod = 6 + (seed % 12);
    renderer.setTerrain(buildTerrain(biome, seed, { polarity: 'white', quality: renderer.phone ? 0.6 : 1, relief: false, sun: sunAt(tod) }));
    m = new Mission({ seed, faction, biome, sessionMinutes: 0, events: true, missionN: 1, opDone: 0, difficulty: level, kit: g.kit, wallet: g.wallet, tod, countdown: C.helldivers.countdown, defenders: true });
    cam = { x: m.lz.x, y: m.lz.y, view: innerWidth >= innerHeight ? C.world.viewWidth : 280, follow: false, ao: m.ao };
    acc = 0; armed = false; placing = null; overAt = 0; shown = false; auto = false; bot = null; barSig = '';
    $('th-where').textContent = `${sys.name} · ${kw.name}`;
    audio.humStart();
    ui.message(b.kind === 'atk' ? `ASSAULT ON ${kw.name.toUpperCase()}` : `DEFEND ${kw.name.toUpperCase()}`, 3000);
    ui.feed('Your ship holds over the landing. Pick a weapon below, then tap the ground.', 'radio');
    tab = 'weapons'; tabs(); bar(true); stats();
    if (!mini) { mini = document.createElement('canvas'); mini.id = 'g-mini'; $('th-stage').appendChild(mini); }
    mini.width = mini.height = 220; mini.classList.remove('hidden');
    document.body.style.setProperty('--tt', $('th-top').offsetHeight + 'px'); document.body.style.setProperty('--tb', $('th-bar').offsetHeight + 'px');
    if (new URLSearchParams(location.search).has('auto')) { auto = true; bot = makeBot(); }
  },
  leave() { if (mini) mini.classList.add('hidden'); $('th-tabs').innerHTML = ''; mode.off = true; audio.humStop(); if (audio.scapeStop) audio.scapeStop(); m = null; $('s-theatre').classList.remove('full'); keys.clear(); },
  askLeave() {
    if (!m || m.over) return;
    const was = ui.paused; ui.paused = true;
    $('modal').innerHTML = `<div class="plate amber box"><h2>Call off the landing?</h2><p>The troops are lifted off and the fleets still face each other. You can fight it in space instead.</p>
      <button class="plate btn go" id="g-yes">CALL IT OFF</button><button class="plate btn" style="width:100%;margin-top:8px" id="g-no">STAY IN THE FIGHT</button></div>`;
    $('modal').hidden = false;
    $('g-yes').onclick = () => { $('modal').hidden = true; ui.leave({ abandon: true }); };
    $('g-no').onclick = () => { $('modal').hidden = true; ui.paused = was; };
  },
  frame(dt, now, real) {
    if (!m) return;
    // the camera: keys, and kept inside the world
    const sp = cam.view * 0.9 * real, kx = (keys.has('D') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('A') || keys.has('ArrowLeft') ? 1 : 0), ky = (keys.has('S') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('W') || keys.has('ArrowUp') ? 1 : 0);
    if (kx || ky) { cam.x = clamp(cam.x + kx * sp, 0, C.world.size); cam.y = clamp(cam.y + ky * sp, 0, C.world.size); }
    renderer.focusY = 0.5;
    renderer.updateView(cam, now);
    if (dt > 0 && !shown) {
      acc += dt; let n = 0;
      while (acc >= STEP && n < 8) {
        if (bot && !m.over) botStep(m, bot);
        keepPrev(m);
        try { m.step(STEP); } catch (err) { console.error(err); } finally { acc -= STEP; n++; }
      }
      if (acc > STEP * 8) acc = 0;
      if (m.events.length) { for (const ev of m.events) { try { onEvent(ev, now); } catch (err) { console.error(err); } } m.events.length = 0; }
      refreshAim(m); squadCentres(m);
    }
    const p = m.player, tw = dt > 0 && !m.over;
    if (tw) tween(m, acc / STEP);
    const bp = placing && placing.startsWith('build:') ? placing : null;
    try { renderer.draw(m, cam, { now, aim: { x: p.aimX, y: p.aimY }, armed: armed || auto, placing: bp, ghost: bp ? { x: p.aimX, y: p.aimY } : null, plan: [], draw: null, snap: (x, y) => ({ x, y }), sel: null, box: null, pface: null, pshape: 'ring' }); }
    finally { if (tw) untween(m); }
    if ((mode._t = (mode._t || 0) + real) > 0.2) { mode._t = 0; bar(); stats(); }
    if (mini && (miniT -= real) <= 0) { miniT = 0.1; try { renderer.drawMinimap(mini, m, cam); } catch { /* no map this frame */ } }
    if (m.over && !shown) { overAt = overAt || now; if (now - overAt > 3.2) { shown = true; result(); } }
  },
  report() { return { abandon: true }; },
  // for the browser checks: run the fight on quickly with the crew firing
  fast(steps) { const b = bot || makeBot(); for (let i = 0; i < steps && m && !m.over; i++) { botStep(m, b); m.step(STEP); if (m.events.length > 400) m.events.length = 0; } return m ? { over: m.over, outcome: m.outcome, t: m.t } : null; },
  // for the browser checks
  get mission() { return m; }, get cam() { return cam; },
};
export default mode;
