// Call-ins: the squad's 16 call-ins dealt into four groups (one per Vanguard), the AI that calls them, and everything
// they put on the map (strikes, zones, turrets, mines, shields, support weapons, the recon vehicle, the mech suit, an escort drone).
// A Vanguard only calls the call-ins in its own group, from where it stands. Squad-wide items (the recon vehicle, jump
// packs, resupply) can be called by whichever Vanguard is alive. The player's orbital strikes reuse strikeAt() below.
import { siteFalls } from './sites.js';
import { t as tr } from '../i18n.js';
import { CONFIG as C } from '../config.js';
import { CALLINS, dealGroups } from '../data/callin.js';
import { LETTERS, TEAM_COLOR, shipNames } from '../data/names.js';
import { COMMS } from '../data/data.js';
import { fireShot, hurtEnemy, damageArea, blocker, jammedAt } from './combat.js';
import { alertGroup, compass } from './enemies.js';
import { bark } from './chatter.js';
import { baseNear } from './pois.js';
import { restock } from './vanguard.js';
import { dropNear } from './reinforce.js';
import { postDown, freeBuild } from './posts.js';

const M = (L, Mm, H, B) => ({ L, M: Mm, H, B });
const TMULT = { bullet: M(1, 0.8, 0.2, 0.03), shell: M(1, 1, 0.6, 0.15), heavy: M(1, 1, 0.85, 0.25), arc: M(1, 1, 0.5, 0.15), 'arc-zap': M(1, 1, 0.4, 0) };
const RK_MULT = M(1, 1, 0.85, 0.2);
const MINE_MULT = M(1, 1, 0.7, 0.1), AT_MULT = M(1, 1, 1.25, 0.5);     // (0.23: anti-tank mines are made for heavies)
const MECH_GAT = M(1, 0.7, 0.25, 0.05);
const MECH_RKT = M(1, 1, 0.7, 0.2);
const DRONE_MULT = M(1, 0.7, 0.2, 0.02);
const LRV_MULT = M(1, 1, 0.95, 0.1);   // the manned gun is heavy-penetration
// Which sound each call-in weapon makes (see audio.js).
const SND = { mg_autoturret: 'mg', gat_autoturret: 'gat', ac_autoturret: 'ac', rk_autoturret: 'rocket', mortar: 'mortar', arcpylon: 'zap',
  atl: 'rocket', autocannon: 'ac', flamethrower: 'flame', coil: 'rail', lmg: 'mg', guided: 'missile', oneshot: 'rocket' };
const FOCUS_R = 30;
const mul = () => C.callin.dmgMul;

// ---------------------------------------------------------------- setup
export function initCallin(m, loadout, keepOrder = false) {
  const rng = m.rng, groups = {}, order = [];
  const ships = shipNames(m.crng, C.callin.groups);
  const ids = dealGroups(loadout, m.seed, keepOrder);
  m.teams = ids.map((list, i) => ({ i, letter: LETTERS[i], color: TEAM_COLOR[i], ship: ships[i], ids: list, vg: null, n: 0,
    respawnAt: 0, pod: false, lastDeath: null, callAt: 0, deaths: 0 }));
  ids.forEach((list, ti) => list.forEach((id) => {
    groups[id] = { id, def: CALLINS[id], count: 1, slots: [], readyAt: rng.range(C.callin.startDelaySec[0], C.callin.startDelaySec[1]), assets: [], uses: 0, team: ti };
    order.push(id);
  }));
  m.loadout = order.slice();
  m.callin = { groups, order, callAt: 0, scanT: 1, rot: 0 };
  m.queue = [];
  m.buff = { jumpUntil: 0 };
  m.lrv = null;
}

// Who calls this call-in: the Vanguard who owns its group, or nobody if that Vanguard is down.
export function callinOwner(m, g) { const t = m.teams[g.team]; return t && t.vg && !t.vg.dead ? t.vg : null; }
export function callinOnline(m, id) {
  const g = m.callin.groups[id];
  if (!g) return false;
  return g.def.shared ? m.vgAlive.length > 0 : !!callinOwner(m, g);
}

// Fraction of the way back to ready for HUD cells (1 = ready).
export function callinReady(m, id) {
  const g = m.callin.groups[id];
  if (!g) return 1;
  const cd = g.def.cd, left = g.readyAt - m.t;
  return left <= 0 ? 1 : Math.max(0, 1 - left / cd);
}

// ---------------------------------------------------------------- picking where and when
function safeSpot(m, x, y, r) {
  for (const a of m.alive) if (!a.dead && (a.x - x) ** 2 + (a.y - y) ** 2 < r * r) return false;
  for (const c of m.civs) if (!c.dead && !c.safe && (c.x - x) ** 2 + (c.y - y) ** 2 < r * r) return false;
  return true;
}
// A call lands only inside the caller's own strike zone (not another Vanguard's, not a UAV circle).
const inOwn = (ctx, x, y) => (x - ctx.cx) ** 2 + (y - ctx.cy) ** 2 <= ctx.zone * ctx.zone;
// (0.47) An attack callin's beacon is thrown: it lands no farther than C.sight.throw from the Vanguard (less than his rifle
// reaches, the vision ladder), and inside his own strike zone. Support weapons are not thrown (their pod lands by him).
// (0.47.1) the throw is 20-40 m from the Vanguard who throws it (throwMin..throw); the space kept from everyone else is clearance's
const inThrow = (ctx, x, y) => { const d2 = (x - ctx.cx) ** 2 + (y - ctx.cy) ** 2; return inOwn(ctx, x, y) && d2 <= C.sight.throw * C.sight.throw && d2 >= C.sight.throwMin * C.sight.throwMin; };

// What one caller can see and needs. owner is a Vanguard; null means the whole squad (for squad-wide items).
function buildCtx(m, owner) {
  const cx = owner ? owner.x : m.hx, cy = owner ? owner.y : m.hy, sq = m.squad;
  const zone = owner ? owner.zone - 5 : (m.vgAlive.length ? Math.min(...m.vgAlive.map((a) => a.zone)) - 5 : 120);
  // How far out a call can reach: a bit past what the caller can see, so a pack is hit on the way in and not on top of the squad,
  // and never past the caller's own strike zone.
  // (0.47) and never past a throw (plus the lead a pack on the move is given)
  const reach = Math.min(190, zone, (owner ? owner.vision : C.sight.vanguard + C.sight.playerBonus) + 55, C.sight.throw + 12);
  // (0.72) a strike too big to throw is marked with the laser instead: anywhere he can see inside his own zone, to 95 m
  const markReach = Math.min(95, zone, owner ? owner.vision * 0.85 : C.sight.vanguard * 0.85);
  const c = { owner, cx, cy, dir: sq.dir || 0, vis: [], heavies: [], hunt: 0, near: 0, centroid: null, reach, zone, markReach,
    engaged: owner ? !!m.eGrid.nearest(cx, cy, C.squad.engageRange) : !!sq.engaged, goalDist: sq.goalDist ?? 0, cl: null,
    panic: !!(owner && owner.retreat) };   // a Vanguard who is running for it calls whatever might save him
  let sx = 0, sy = 0;
  for (const e of m.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - cx, e.y - cy);
    // only what is seen and inside this Vanguard's own zone
    if (e.vis >= 1 && d <= zone) { c.vis.push(e); if (e.kind === 'H') c.heavies.push(e); }
    if (e.g.state === 'hunt' && d <= reach) { c.hunt++; sx += e.x; sy += e.y; }
    if (d <= 70) c.near++;
  }
  if (c.hunt) c.centroid = { x: sx / c.hunt, y: sy / c.hunt };
  c.heavies.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
  return c;
}

function clusters(m, ctx, far = false) {
  if (far ? ctx.clFar : ctx.cl) return far ? ctx.clFar : ctx.cl;
  const R_ = far ? ctx.markReach : ctx.reach, out = [], cand = ctx.vis.filter((e) => Math.hypot(e.x - ctx.cx, e.y - ctx.cy) <= R_);
  const stride = Math.max(1, Math.floor(cand.length / 60));
  for (let i = 0; i < cand.length; i += stride) {
    const e = cand[i]; let n = 0, sx = 0, sy = 0, vx = 0, vy = 0;
    m.eGrid.near(e.x, e.y, 12, (o) => { n++; sx += o.x; sy += o.y; vx += o.vx || 0; vy += o.vy || 0; });
    const x = sx / n, y = sy / n, dist = Math.hypot(x - ctx.cx, y - ctx.cy);
    // far packs rate higher: hit them while they are still coming, and the call is a few seconds in the air anyway
    out.push({ x, y, n, vx: vx / n, vy: vy / n, dist, rate: n + Math.min(4, dist / 35) });
  }
  out.sort((a, b) => b.rate - a.rate);
  return far ? (ctx.clFar = out) : (ctx.cl = out);
}

// Call-ins never hurt the squad, but a bomb dropped right on top of them looks wrong, so keep space. (0.46) It was 9 m for
// everything, so a 380 barrage could land almost on the thrower. An attack call-in now keeps its whole footprint clear: its
// spread plus half a shell's splash (or its own `safe`, if bigger), 9 to 45 m. Placed things (turrets, mines, shields, supply)
// still go close.
// (0.47) a throw is 20-40 m: never under C.sight.throwMin, and capped 4 m short of the throw so every attack call-in has somewhere
// to land (the creeping barrage was 45 m).
const clearance = (d) => Math.max(9, Math.min(C.sight.throw - 4, Math.max(d.safe || 0, blastOf(d) + (d.splash || 0) * 0.5)));     // (0.47.1: 9 m at least from any ally, as in 0.46; the 20 m is the thrower's)
// (0.46) Another attack call-in already on its way to (or burning on) this ground: a second one there is a waste, so the
// Vanguards spread their calls out. Defensive things don't count.
function crowded(m, x, y, r) {
  for (const k of m.markers) if (k.type === 'callin' && !k.smoke && m.t < k.end && (k.x - x) ** 2 + (k.y - y) ** 2 < r * r) return true;
  for (const z of m.zones) if (z.kind !== 'smoke' && (z.x - x) ** 2 + (z.y - y) ** 2 < r * r) return true;
  return false;
}
const spreadR = (d) => Math.max(14, Math.min(40, blastOf(d)));

// Where something moving at (vx, vy) will be after `lead` seconds: the call itself takes C.callin.callSec, then the callin's own
// delay. Capped, so a strike is never thrown at a guess far from anything.
// (0.72, Ramzies: "vanguard doesn't seem to know how to use their call-ins") The whole lead was taken: a heavy walking at 6 m/s
// was aimed 30 m ahead of itself, and it stopped to fire long before it got there, so the precision strikes and the rail
// landed on empty ground. A thing already in a fight (it has a target) and close is aimed at nearly where it stands; anything
// else is given half its lead, never more than a third of the old cap, and never closer to the caller than it can come.
function ahead(x, y, vx, vy, lead, ctx = null, busy = false) {
  let k = busy ? 0.2 : 0.5;
  if (ctx && Math.hypot(x - ctx.cx, y - ctx.cy) < 50) k *= 0.6;
  let dx = (vx || 0) * lead * k, dy = (vy || 0) * lead * k;
  const L = Math.hypot(dx, dy), cap = C.callin.leadMax / 3;
  if (L > cap) { dx *= cap / L; dy *= cap / L; }
  return { x: x + dx, y: y + dy };
}
const leadOf = (d) => (d.delay || 0) + C.callin.callSec;

// A strike that would reach the structure of a base that has not seen the squad would wake it: the Vanguards don't call those.
export function wakesBase(m, x, y, reach) {
  for (const b of m.bases) if (!b.destroyed && !b.alert && Math.hypot(b.x - x, b.y - y) < b.r + reach + 6) return true;
  return false;
}
const blastOf = (d) => (d.zone ? d.zone.r : d.splash || 8) + (d.len || 0) / 2;
// While the squad is staging on a base, only what is already hunting it gets a call-in.
const quiet = (m, ctx) => m.squad.staging && !ctx.hunt;

// (0.72) A strike whose footprint is too wide to throw (its clearance is more than the 20-40 m of a throw leaves room for) is
// MARKED: the Vanguard puts his laser on the far ground, and the ship takes it from there. Before, those (the 380, the walking
// barrage, the air strike) were hardly ever called: no pack ever stood 34-40 m from the thrower with every ally 34 m from it.
const marked = (d) => (clearance(d) > 24 && (d.k === 'strike' || d.k === 'zone')) || (d.k === 'strike' && d.pat === 'point' && d.use === 'heavy');     // (and a precision strike on armour is laid on with the laser, whatever its size: the ship follows the laser on the target)
const inMark = (ctx, d, x, y) => { const d2 = (x - ctx.cx) ** 2 + (y - ctx.cy) ** 2, lo = Math.max(C.sight.throwMin, clearance(d) * 0.9); return d2 <= ctx.markReach * ctx.markReach && d2 >= lo * lo; };
// (0.72) a call-in kept waiting while its caller fights is not saved for a better moment for ever: every 12 s ready in a fight
// takes one off the pack it waits for (never below 2)
const needOf = (d, g, ctx) => (ctx.panic ? 2 : Math.max(2, (d.min || 5) - Math.floor(((g && g.waited) || 0) / 12)));
function pickCluster(m, d, ctx, g) {
  const need = needOf(d, g, ctx), lead = leadOf(d), far = marked(d);
  if (quiet(m, ctx)) return null;
  for (const c of clusters(m, ctx, far)) {
    if (c.n < need) continue;
    // aim where the pack will be when the strike lands (0.72: a pack that has reached its fight is not led far)
    const p = ahead(c.x, c.y, c.vx, c.vy, lead, ctx, c.dist < 45);
    if (far && c.dist > ctx.reach) { const ux = (c.x - ctx.cx) / (c.dist || 1), uy = (c.y - ctx.cy) / (c.dist || 1); p.x += ux * 4; p.y += uy * 4; }     // (the far side of it a little: the near edge is still clear of the squad)
    if (safeSpot(m, p.x, p.y, clearance(d)) && (far ? inMark(ctx, d, p.x, p.y) : inThrow(ctx, p.x, p.y)) && m.terrain.isLand(p.x, p.y) && !wakesBase(m, p.x, p.y, blastOf(d)) && !crowded(m, p.x, p.y, spreadR(d))) return { x: p.x, y: p.y, n: c.n, mark: far };
  }
  return null;
}
function pickHeavy(m, d, ctx) {
  const lead = leadOf(d), far = marked(d);
  if (quiet(m, ctx)) return null;
  for (const e of ctx.heavies) {
    // Aim where it will be when the strike lands (0.72: one that has stopped to fire, where it stands)
    const p = ahead(e.x, e.y, e.vx, e.vy, lead, ctx, !!e.tgt);
    if (safeSpot(m, p.x, p.y, clearance(d)) && (far ? inMark(ctx, d, p.x, p.y) : inThrow(ctx, p.x, p.y)) && !wakesBase(m, p.x, p.y, blastOf(d)) && !crowded(m, p.x, p.y, 10)) return { x: p.x, y: p.y, e, mark: far };
  }
  return null;
}
function pickBase(m, d, ctx) {
  const sq = m.squad, b = sq.base;
  if (!b || b.destroyed || sq.state !== 'hold' || !(b.alert || sq.assault)) return null;   // (not a base still being staged on)
  // (0.47) a base too far for a throw is hit at its near side: the throw's length toward its middle, if that is still on the base
  // (0.49) a cluster: its nearest spawner still standing
  let x = b.x, y = b.y;
  if (b.spawners) { const L = b.spawners.filter((q) => !q.dead); if (L.length) { const q = L.reduce((p, z) => (Math.hypot(z.x - ctx.cx, z.y - ctx.cy) < Math.hypot(p.x - ctx.cx, p.y - ctx.cy) ? z : p)); x = q.x; y = q.y; } }
  const dd = Math.hypot(x - ctx.cx, y - ctx.cy), T = C.sight.throw - 1;
  if (dd > T) { if (dd - T > (b.spawners ? 4 : b.r || 14)) return null; x = ctx.cx + (x - ctx.cx) * (T / dd); y = ctx.cy + (y - ctx.cy) * (T / dd); }
  if (!inThrow(ctx, x, y) || !safeSpot(m, x, y, clearance(d))) return null;
  return { x, y, base: b };
}

// Where a placed asset goes: ahead of the squad toward the threat, kept inside the caller's own zone.
function placeSpot(m, ctx, aheadBy) {
  const ang = ctx.centroid ? Math.atan2(ctx.centroid.y - ctx.cy, ctx.centroid.x - ctx.cx) : ctx.dir;
  const [jx, jy] = m.rng.inDisc(4);
  let x = ctx.cx + Math.cos(ang) * aheadBy + jx, y = ctx.cy + Math.sin(ang) * aheadBy + jy;
  if (!inOwn(ctx, x, y) || m.terrain.blocked(x, y)) { x = ctx.cx + jx; y = ctx.cy + jy; }
  return { x, y, ang };
}

function canCall(m, g) {
  const d = g.def, t = m.t, owner = callinOwner(m, g);
  g.assets = g.assets.filter((s) => !s.dead);
  if (!d.shared && !owner) return false;
  switch (d.k) {
    case 'weapon': return !owner.sw && !owner.mounted && !(owner.mech && owner.mech.hp > 0);
    case 'turret': case 'mines': case 'shield': case 'drone': {
      if (g.assets.length >= g.count) {      // a new one replaces the oldest, so only call when that is worth it
        const old = g.assets[0], f = old.maxAmmo ? old.ammo / old.maxAmmo : old.maxShield ? old.shield / old.maxShield : old.life ? (old.until - t) / old.life : 1;
        if (f > 0.4 && t - old.born < 50) return false;
      }
      return true;
    }
    case 'lrv': return !m.lrv && m.vgAlive.some((a) => !a.mounted);
    case 'mech': return !owner.mech && !owner.mounted;
    case 'jump': return t >= m.buff.jumpUntil;
    default: return true;
  }
}

function choose(m, g, ctx) {
  const d = g.def;
  switch (d.use) {
    case 'cluster':
      if (d.heavyOnly) return pickHeavy(m, d, ctx);
      return pickCluster(m, d, ctx, g) || (d.heavy ? pickHeavy(m, d, ctx) : null) || (d.base ? pickBase(m, d, ctx) : null);
    case 'heavy':
      if (d.k === 'weapon') {
        // Heavy weapons come out for armor, and also to crack a base the squad is sieging.
        const sq = m.squad, siege = sq.base && !sq.base.destroyed && sq.state === 'hold' && (sq.base.alert || sq.assault) && !d.sw.only && d.sw.mult.B >= C.structure.weaponTry;
        return ctx.heavies.length || siege ? { x: ctx.cx, y: ctx.cy } : null;
      }
      return pickHeavy(m, d, ctx) || (d.base ? pickBase(m, d, ctx) : null);
    case 'smoke':
      if (ctx.engaged && (ctx.hunt >= 6 || (ctx.panic && ctx.hunt >= 2))) return placeSpot(m, ctx, 10);
      return null;
    case 'defense': {
      // Running for it: whatever can be dropped between him and what is chasing him, dropped now.
      const need = ctx.panic ? 2 : d.threat || 5;
      if (ctx.hunt < need && !(d.heavy && ctx.heavies.length)) return null;
      const ahead = ctx.panic ? 10 : d.k === 'mines' ? 28 : d.t && d.t.style === 'arc' ? -6 : 16;
      return placeSpot(m, ctx, ahead);
    }
    case 'fight': {
      if (d.k === 'weapon' && d.anti && ctx.heavies.length) return { x: ctx.cx, y: ctx.cy };   // the light cannon comes out for armor too
      const need = ctx.panic ? 2 : d.threat || 4;
      if (!(ctx.engaged || ctx.hunt >= need) || ctx.hunt < need) return null;
      return placeSpot(m, ctx, 8);
    }
    case 'travel':
      if (ctx.panic && ctx.hunt >= 3) return placeSpot(m, ctx, 12);   // a ride out of trouble
      if (ctx.near > 0 || ctx.goalDist < 260) return null;
      return placeSpot(m, ctx, 12);
    case 'resupply': {
      for (const a of m.vgAlive) {
        if (a.stims <= 1 || a.gren <= 0) return { x: ctx.cx, y: ctx.cy };
        if (a.sw && a.sw.left < a.sw.ammo * 0.3) return { x: ctx.cx, y: ctx.cy };
        if (a.mech && a.mech.hp > 0 && (a.mech.gat < C.callin.mech.gatAmmo * 0.3 || a.mech.rkt <= 3)) return { x: ctx.cx, y: ctx.cy };
      }
      for (const s of m.assets) if (!s.dead && s.kind === 'turret' && s.ammo < s.maxAmmo * 0.35) return { x: ctx.cx, y: ctx.cy };
      return null;
    }
    default: return null;
  }
}

// ---------------------------------------------------------------- calling
function execute(m, g, tgt, ctx) {
  const d = g.def, t = m.t, team = m.teams[g.team];
  const caller = callinOwner(m, g) || m.vgAlive[0];
  m.stats.callinCalls++; m.stats.callinBy[g.id] = (m.stats.callinBy[g.id] || 0) + 1;
  m.radio(COMMS.callinCall(d.name), 'callin', 1.2);
  bark(m, caller, 'callin', d.name, true);
  const cs0 = C.callin.callSec;
  if (caller && tgt.mark) { caller.markAt = t; caller.markX = tgt.x; caller.markY = tgt.y; caller.aimA = Math.atan2(tgt.y - caller.y, tgt.x - caller.x); caller.aimUntil = Math.max(caller.aimUntil || 0, t + cs0); }     // (0.72) too big to throw: he puts his laser on it
  else if (caller) { caller.throwAt = t; caller.throwA = Math.atan2(tgt.y - caller.y, tgt.x - caller.x); }     // (0.72) he throws the beacon at the mark (drawn: render allyFig)
  const cs = C.callin.callSec;      // the beacon is thrown, then the ship lines up: the ground is marked for this long first
  m.emit('callin_call', { id: g.id, x: tgt.x, y: tgt.y, delay: (d.delay || 4) + cs, team: team.i, cx: caller ? caller.x : ctx.cx, cy: caller ? caller.y : ctx.cy, base: tgt.base ? tgt.base.id : undefined, mark: !!tgt.mark });
  switch (d.k) {
    case 'strike': strikeAt(m, { ...d, id: g.id, delay: d.delay + cs }, tgt, { ox: ctx.cx, oy: ctx.cy, by: 'callin', friendly: false, dmgMul: mul(), team: team.i }); break;
    case 'zone': queueZone(m, d.zone, tgt.x, tgt.y, t + d.delay + cs, d.delay + cs, d, 'callin', team.i); break;
    case 'turret': case 'mines': case 'shield': case 'drone': case 'weapon': case 'mech': case 'lrv': {
      const drop = (d.k === 'lrv' ? C.callin.lrv.dropSec : d.k === 'mech' ? C.callin.mech.dropSec : 3.5) + cs;
      m.queue.push({ at: t + drop, type: d.k, sid: g.id, team: g.team, x: tgt.x, y: tgt.y });
      m.markers.push({ type: 'pod', x: tgt.x, y: tgt.y, r: 6, start: t, end: t + drop, id: g.id, team: g.team });
      if (d.k === 'lrv') m.radio(COMMS.lrvIn, 'lrvin', 5);
      if (d.k === 'mech') m.radio(COMMS.mechIn, 'mechin', 5);
      break;
    }
    case 'jump':
      m.buff.jumpUntil = t + C.callin.jump.sec; m.radio(COMMS.jump, 'jump', 5);
      m.emit('jump', {});
      break;
    case 'resupply':
      m.queue.push({ at: t + 3 + cs, type: 'resupply', sid: g.id, team: g.team, x: tgt.x, y: tgt.y });
      m.markers.push({ type: 'pod', x: tgt.x, y: tgt.y, r: 6, start: t, end: t + 3 + cs, id: g.id });
      break;
    default:
  }
}

export function queueZone(m, z, x, y, at, delay, d, by = 'callin', team = -1) {
  m.queue.push({ at, type: 'zone', kind: z.kind, x, y, r: z.r, sec: z.sec, dps: z.dps || 0, sid: d.name, by });
  if (delay > 0) m.markers.push({ type: 'callin', x, y, r: z.r, start: m.t, end: at, impact: at, id: d.name, cat: d.cat, by, team, smoke: z.kind === 'smoke' });
}

// A strike on a point. d is the call-in entry (already scaled for the player when the player fires it).
// o: { ox, oy } where the caller stands (sets the direction of a line), by: who gets the credit, friendly: hurts allies,
// dmgMul: extra multiplier on top of the entry's damage.
export function strikeAt(m, d, tgt, o) {
  const t = m.t, rng = m.rng, n = d.n, dmg = d.dmg * (o.dmgMul ?? 1), splash = d.splash * m.biome.splash;
  const ang = Math.atan2(tgt.y - o.oy, tgt.x - o.ox), ux = Math.cos(ang), uy = Math.sin(ang);
  const at0 = t + d.delay;
  for (let i = 0; i < n; i++) {
    const f = n > 1 ? i / (n - 1) : 0;
    let x = tgt.x, y = tgt.y;
    if (d.pat === 'scatter') { const [dx, dy] = rng.inDisc(d.len); x += dx; y += dy; }
    else if (d.pat === 'line' || d.pat === 'walk') { const s = (f - 0.5) * d.len, [jx, jy] = rng.inDisc(d.pat === 'walk' ? 3 : 1.6); x += ux * s + jx; y += uy * s + jy; }
    const at = at0 + f * d.span;
    m.shells.push({ x, y, at, dmg, splash, mult: d.mult, by: o.by, friendly: o.friendly, lock: (d.lock || (d.pat === 'point' && tgt.mark)) && tgt.e ? tgt.e : null, big: d.dmg >= 500, sid: d.id || '', cat: d.cat || '', n: i, of: n });     // (0.23: what it is, for its explosion)
    if (d.zone) m.queue.push({ at, type: 'zone', kind: d.zone.kind, x, y, r: d.zone.r, sec: d.zone.sec, dps: d.zone.dps || 0, sid: d.name, by: o.by });
  }
  const rr = d.pat === 'point' ? Math.max(d.splash, 6) : d.len || d.splash;
  // The marker also says which way the strike runs, so the ground shows where a Striker comes from and which strip it will hit.
  m.markers.push({ type: 'callin', x: tgt.x, y: tgt.y, r: rr, start: t, end: at0 + d.span, impact: at0, id: d.name, cat: d.cat, lock: (d.lock || (d.pat === 'point' && tgt.mark)) && tgt.e ? tgt.e : null, by: o.by,
    pat: d.pat, len: d.len || 0, rad: splash, ux, uy, fly: !!d.fly, span: d.span || 0, team: o.team ?? -1 });
  if (d.fly) {
    const L = 520;
    m.emit('flyby', { x1: tgt.x - ux * L, y1: tgt.y - uy * L, x2: tgt.x + ux * L, y2: tgt.y + uy * L, at: Math.max(t, at0 - 1.6), dur: 3.2 + d.span });
  }
}

// ---------------------------------------------------------------- deliveries
function placeAsset(m, sid, s) {
  const g = m.callin.groups[sid];
  g.assets = g.assets.filter((a) => !a.dead);
  while (g.assets.length >= g.count) destroyAsset(m, g.assets.shift(), 'replaced');
  g.assets.push(s); m.assets.push(s);
  m.emit('asset_new', { kind: s.kind, sid, x: s.x, y: s.y });
  return s;
}
function newAsset(m, kind, sid, x, y, o) {
  return { id: m.nextId++, kind, sid, x, y, hp: 100, maxHp: 100, r: 3, born: m.t, dead: false, hurtAt: -9, ...o };
}

function runQueue(m) {
  const t = m.t, q = m.queue;
  for (let i = 0; i < q.length;) {
    if (t < q[i].at) { i++; continue; }
    const it = q.splice(i, 1)[0];
    land(m, it);
  }
}

function land(m, it) {
  const t = m.t, rng = m.rng;
  if (it.type === 'zone') {
    m.zones.push({ kind: it.kind, x: it.x, y: it.y, r: it.r, until: t + it.sec, dps: it.dps, tick: 0, born: t, by: it.by || 'callin' });
    m.emit('zone', { kind: it.kind, x: it.x, y: it.y, r: it.r });
    return;
  }
  const g = m.callin.groups[it.sid], d = g && g.def;
  if (!d) return;
  if (it.type === 'turret') {
    const p = d.t;
    placeAsset(m, it.sid, newAsset(m, 'turret', it.sid, it.x, it.y, {
      hp: p.hp, maxHp: p.hp, ammo: p.ammo, maxAmmo: p.ammo, p, cool: 0.6, scan: 0, tgt: null, face: m.squad.dir || 0, focus: null, name: d.name, r: 3.5, snd: SND[it.sid] || 'mg',
    }));
  } else if (it.type === 'mines') {
    const mines = [];
    for (let i = 0; i < d.n; i++) { const [dx, dy] = rng.inDisc(d.r); mines.push({ x: it.x + dx, y: it.y + dy, dead: false }); }
    placeAsset(m, it.sid, newAsset(m, 'mines', it.sid, it.x, it.y, { mines, left: d.n, until: t + d.life, life: d.life, d, name: d.name, scan: 0 }));
  } else if (it.type === 'shield') {
    placeAsset(m, it.sid, newAsset(m, 'shield', it.sid, it.x, it.y, { hp: 60, maxHp: 60, shield: d.shield, maxShield: d.shield, r: d.r, until: t + d.life, life: d.life, name: d.name }));
  } else if (it.type === 'drone') {
    const D = C.callin.drone;
    placeAsset(m, it.sid, newAsset(m, 'drone', it.sid, it.x, it.y, { hp: D.hp, maxHp: D.hp, until: t + D.life, life: D.life, cool: 0.5, name: d.name, r: 2.2 }));
  } else if (it.type === 'weapon') {
    const owner = m.teams[it.team] && m.teams[it.team].vg;
    let best = owner && !owner.dead && !owner.sw && !owner.mounted && !(owner.mech && owner.mech.hp > 0) ? owner : null, bd = Infinity;
    if (!best) {
      for (const a of m.vgAlive) {
        if (a.sw || a.mounted || (a.mech && a.mech.hp > 0)) continue;
        const dd = (a.x - it.x) ** 2 + (a.y - it.y) ** 2;
        if (dd < bd) { bd = dd; best = a; }
      }
    }
    if (best) {
      best.sw = { id: it.sid, ...d.sw, left: d.sw.ammo, t: 0.8, snd: SND[it.sid] || 'ac', lockE: null, lockT: 0 };
      m.emit('asset_new', { kind: 'weapon', sid: it.sid, x: best.x, y: best.y });
      m.notice(tr('n.pickedUp', { who: m.tag(best), name: d.name.toUpperCase() }), 'info');
    }
  } else if (it.type === 'mech') {
    const owner = m.teams[it.team] && m.teams[it.team].vg;
    let best = owner && !owner.dead && !owner.mech && !owner.mounted ? owner : null, bd = Infinity;
    if (!best) {
      for (const a of m.vgAlive) {
        if (a.mech || a.mounted) continue;
        const dd = (a.x - it.x) ** 2 + (a.y - it.y) ** 2 + (a.sw ? 900 : 0);
        if (dd < bd) { bd = dd; best = a; }
      }
    }
    if (best) {
      const M_ = C.callin.mech;
      best.sw = null;
      best.mech = { hp: M_.hp, maxHp: M_.hp, gat: M_.gatAmmo, rkt: M_.rktAmmo, gatT: 0.5, rktT: 2 };
      m.emit('asset_new', { kind: 'mech', sid: it.sid, x: best.x, y: best.y });
      m.stats.mechs++;
      bark(m, best, 'mech', '', true);
    }
  } else if (it.type === 'lrv') {
    const F = C.callin.lrv;
    const v = newAsset(m, 'vehicle', it.sid, it.x, it.y, { hp: F.hp, maxHp: F.hp, until: t + F.life, life: F.life, seats: [], cool: 0.5, name: d.name, r: 5, face: m.squad.dir || 0, wreck: false, gunner: null });
    placeAsset(m, it.sid, v);
    // Nobody rides the vehicle and a mech suit at once: a pilot climbs out of the suit to board.
    const near = m.vgAlive.filter((a) => !a.mounted && Math.hypot(a.x - it.x, a.y - it.y) <= 70).sort((p, q) => Math.hypot(p.x - it.x, p.y - it.y) - Math.hypot(q.x - it.x, q.y - it.y));
    for (const a of near) {
      if (v.seats.length >= F.seats) break;
      if (a.mech) {
        a.mech = null;
        m.emit('asset_down', { kind: 'mech', sid: 'mech', x: a.x, y: a.y, why: 'abandoned' });
        m.notice(tr('n.mechToLrv', { who: m.tag(a) }), 'info');
      }
      a.mounted = v; v.seats.push(a);
    }
    if (!v.seats.length) { destroyAsset(m, v, 'spent'); return; }
    v.gunner = v.seats[0];
    m.lrv = v; m.stats.lrvs++;
    m.emit('mount', { x: v.x, y: v.y, n: v.seats.length });
    bark(m, v.seats[0], 'lrv', '', true);
  } else if (it.type === 'resupply') {
    restock(m);
    for (const a of m.vgAlive) {
      if (a.sw) a.sw.left = a.sw.ammo;
      if (a.mech) { a.mech.gat = C.callin.mech.gatAmmo; a.mech.rkt = C.callin.mech.rktAmmo; a.mech.hp = Math.min(a.mech.maxHp, a.mech.hp + 250); }
    }
    for (const s of m.assets) {
      if (s.dead) continue;
      if (s.kind === 'turret') s.ammo = Math.min(s.maxAmmo, s.ammo + s.maxAmmo * 0.6);
      if (s.kind === 'drone') s.hp = s.maxHp;
    }
    m.emit('asset_new', { kind: 'supply', sid: it.sid, x: it.x, y: it.y });
  }
}

export function destroyAsset(m, s, why) {
  if (s.dead) return;
  if (s.kind === 'post' && s.what === 'site') { siteFalls(m, s); return; }     // (0.52) a work site falls, and can be taken back
  if (s.kind === 'post') { const free = freeBuild(s); postDown(m, s); m.emit('asset_down', { kind: 'post', sid: s.sid, x: s.x, y: s.y, why }); if (!free) m.emit('boom', { x: s.x, y: s.y, r: 6, dmg: 0, by: 'enemy' }); return; }     // (0.62.13: a free build doesn't go up)
  s.dead = true;
  if (s.kind === 'vehicle') {
    dismount(m, s, why === 'killed' ? 'bail' : why);
    if (m.lrv === s) m.lrv = null;
  }
  m.emit('asset_down', { kind: s.kind, sid: s.sid, x: s.x, y: s.y, why });
  const name = s.name || 'Asset';
  if (why === 'killed') { m.radio(COMMS.assetDown(name), 'adown', 2); m.emit('boom', { x: s.x, y: s.y, r: s.kind === 'vehicle' ? 8 : 4, dmg: 0, by: 'enemy' }); }
  else if (why === 'spent' && s.kind !== 'vehicle' && s.kind !== 'mines') m.radio(COMMS.assetSpent(name), 'aspent', 2);
  const g = m.callin && m.callin.groups[s.sid];
  if (g) g.assets = g.assets.filter((a) => a !== s);
}

function dismount(m, v, why) {
  for (const a of v.seats) {
    a.mounted = null;
    const [dx, dy] = m.rng.inDisc(7);
    a.x = v.x + dx; a.y = v.y + dy;
    if (m.terrain.blocked(a.x, a.y)) { const l = m.terrain.nearestLand(a.x, a.y); a.x = l.x; a.y = l.y; }   // not into deep water
  }
  if (v.seats.length) { m.radio(why === 'bail' ? COMMS.lrvBail : COMMS.lrvOut, 'lrvout', 3); m.emit('dismount', { x: v.x, y: v.y, why }); }
  v.seats = [];
}

// ---------------------------------------------------------------- assets each tick
function turretTarget(m, s) {
  const p = s.p, focus = s.focus;
  if (p.prefer && p.prefer.includes('H')) { const d = dropNear(m, s.x, s.y, p.range); if (d) return d; }   // a dropship in reach comes first
  let best = null, bs = -Infinity;
  m.eGrid.near(s.x, s.y, p.range, (e, d2) => {
    if (e.vis <= 0) return;
    const d = Math.sqrt(d2);
    if (p.minRange && d < p.minRange) return;
    if (p.splash > 0 && !m.squad.assault && wakesBase(m, e.x, e.y, p.splash)) return;   // its blast would wake a base
    let score = -d;
    if (p.prefer && p.prefer.includes(e.kind)) score += 40;
    if (focus) {
      const fd = Math.hypot(e.x - focus.x, e.y - focus.y);
      if (fd <= FOCUS_R) score += 120 - fd; else if (d > 18) return;   // aimed at the focus point; only defends itself elsewhere
    }
    if (score > bs) { bs = score; best = e; }
  });
  return best;
}

// (a manned MG post runs the same gun: s.rate is how fast its crew keep it firing, and it never runs dry)
export function turretStep(m, s, dt) {
  const p = s.p;
  s.cool -= dt; s.scan -= dt;
  if (s.scan <= 0) { s.scan = 0.2; s.tgt = turretTarget(m, s); }
  if (s.tgt && s.tgt.dead) s.tgt = null;
  if (s.tgt) s.face = Math.atan2(s.tgt.y - s.y, s.tgt.x - s.x);
  else if (s.focus) s.face = Math.atan2(s.focus.y - s.y, s.focus.x - s.x);
  if (!s.tgt || s.cool > 0) return;
  const e = s.tgt, k = s.kind === 'post' ? 1 : mul();
  s.cool = p.every / (s.rate || 1);
  if (p.style === 'arc-zap') {
    let n = 0;
    const hit = [];
    m.eGrid.near(s.x, s.y, p.range, (o, d2) => { if (o.vis > 0) hit.push([d2, o]); });
    hit.sort((a, b) => a[0] - b[0]);
    for (const [, o] of hit) {
      if (n >= p.chain) break;
      m.emit('tracer', { x: s.x, y: s.y, tx: o.x, ty: o.y, s: 't', hit: true, big: false, zap: true, snd: 'zap' });
      alertGroup(m, o.g);
      hurtEnemy(m, o, p.dmg * k, 'callin', s.x, s.y, undefined, false, TMULT['arc-zap'][o.kind]);
      n++;
    }
  } else {
    const mult = p.prefer === 'H' ? RK_MULT : TMULT[p.style];
    fireShot(m, s, e, { dmg: p.dmg * k, acc: p.acc, splash: p.splash, mult, flight: p.flight || 0 }, 'callin', 't', s.snd);
  }
  if (s.ammo !== Infinity) { s.ammo -= 1; if (s.ammo <= 0) destroyAsset(m, s, 'spent'); }
}

function minesStep(m, s, dt) {
  const t = m.t, d = s.d;
  s.scan -= dt;
  if (s.scan > 0) return;
  s.scan = 0.1;
  for (const mine of s.mines) {
    if (mine.dead) continue;
    let e = null;
    if (d.heavyOnly) m.eGrid.near(mine.x, mine.y, d.trig, (x) => { if (!e && x.kind === 'H') e = x; });     // (0.23) anti-tank: only a heavy sets one off
    else e = m.eGrid.nearest(mine.x, mine.y, d.trig);
    if (!e) continue;
    mine.dead = true; s.left--;
    const mine1 = s.by === 'player';      // (0.23) the gunner's minefields: their numbers already carry the player's levels, and they hurt allies
    damageArea(m, mine.x, mine.y, d.splash, d.dmg * (mine1 ? 1 : mul()), d.heavyOnly ? AT_MULT : MINE_MULT, mine1 ? 'player' : 'callin', mine1);
    m.emit('boom', { x: mine.x, y: mine.y, r: d.splash, dmg: d.dmg, by: mine1 ? 'player' : 'callin', sid: s.sid, mine: true });
    if (d.fire) { m.zones.push({ kind: 'fire', x: mine.x, y: mine.y, r: d.fire.r, until: m.t + d.fire.sec, dps: d.fire.dps * (mine1 ? 1 : mul()), tick: 0, born: m.t, by: mine1 ? 'player' : 'callin' }); m.emit('zone', { kind: 'fire', x: mine.x, y: mine.y, r: d.fire.r }); }
  }
  if (s.left <= 0 || t >= s.until) destroyAsset(m, s, 'spent');
}

function droneStep(m, s, dt) {
  const D = C.callin.drone, t = m.t;
  if (t >= s.until) { destroyAsset(m, s, 'spent'); return; }
  // Follow the nearest Vanguard at a short distance.
  let best = null, bd = Infinity;
  for (const a of m.vgAlive) { const dd = (a.x - s.x) ** 2 + (a.y - s.y) ** 2; if (dd < bd) { bd = dd; best = a; } }
  if (best) {
    const tx = best.x - 5, ty = best.y + 5, dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
    if (d > 3) { const st = Math.min(9 * dt, d); s.x += (dx / d) * st; s.y += (dy / d) * st; }
  }
  s.cool -= dt;
  if (s.cool > 0) return;
  const e = m.eGrid.nearest(s.x, s.y, D.range);
  if (!e) { s.cool = 0.2; return; }
  s.cool = D.every;
  fireShot(m, s, e, { dmg: D.dmg * mul(), acc: 0.8, splash: 0, mult: DRONE_MULT }, 'callin', 't', 'drone');
}

function vehicleStep(m, s, dt) {
  const F = C.callin.lrv, sq = m.squad, t = m.t;
  if (s.wreck) {
    s.burn -= dt;
    if (s.burn <= 0) {
      damageArea(m, s.x, s.y, 9, 320 * mul(), M(1, 1, 0.6, 0.1), 'callin', false);
      m.emit('boom', { x: s.x, y: s.y, r: 9, dmg: 320, by: 'callin' });
      destroyAsset(m, s, 'spent');
    }
    return;
  }
  if (sq.formed) { s.x = sq.ax; s.y = sq.ay; s.face = sq.dir; }
  const seats = s.seats.filter((a) => !a.dead);
  s.seats = seats;
  seats.forEach((a, i) => { a.x = s.x + Math.cos(s.face + Math.PI / 2) * (i - 1.5) * 2; a.y = s.y + Math.sin(s.face + Math.PI / 2) * (i - 1.5) * 2; });
  // Bail out when it is nearly dead, run out of time, or arrive.
  if (!seats.length) { destroyAsset(m, s, 'spent'); return; }
  if (s.hp <= s.maxHp * F.ejectAt) {
    dismount(m, s, 'bail'); s.wreck = true; s.burn = 4; if (m.lrv === s) m.lrv = null; return;
  }
  if (t >= s.until || (sq.goalDist ?? 999) < 40 || m.phase === 'over') {
    dismount(m, s, 'arrive'); destroyAsset(m, s, 'spent'); return;
  }
  // The manned gun: a heavy-penetration cannon that prefers the biggest thing in range. It needs a living gunner.
  s.gunner = seats[0];
  s.cool -= dt;
  if (s.cool <= 0) {
    let best = dropNear(m, s.x, s.y, F.gunRange), bs = best ? Infinity : -Infinity;
    m.eGrid.near(s.x, s.y, F.gunRange, (e, d2) => { const sc = (e.kind === 'H' ? 60 : e.kind === 'M' ? 20 : 0) - Math.sqrt(d2); if (sc > bs) { bs = sc; best = e; } });
    if (best) { s.cool = F.gunEvery; s.aimA = Math.atan2(best.y - s.y, best.x - s.x); s.aimUntil = t + 1.2; s.shotAt = t; fireShot(m, s, best, { dmg: F.gunDmg * mul(), acc: 0.85, splash: 0, mult: LRV_MULT }, 'callin', 't', 'lrvgun'); } else s.cool = 0.2;     // (0.72: where the gunner looks)
  }
}

function updateAssets(m, dt) {
  for (const s of m.assets) {
    if (s.dead) continue;
    switch (s.kind) {
      case 'turret': turretStep(m, s, dt); break;
      case 'mines': minesStep(m, s, dt); break;
      case 'drone': droneStep(m, s, dt); break;
      case 'vehicle': vehicleStep(m, s, dt); break;
      case 'shield': if (m.t >= s.until || s.shield <= 0) destroyAsset(m, s, 'spent'); break;
      default:
    }
  }
}

// Support weapons and the mech suit's guns.
function pickWeaponTarget(m, a, w) {
  // a lock-on stays on its target for as long as that target is still there to be locked
  const le = w.lockE;
  if (le && !le.dead && le.vis > 0 && (!le.drop || le.low) && (le.x - a.x) ** 2 + (le.y - a.y) ** 2 <= w.range * w.range) return le;
  // anti-armor weapons go for a dropship or war barge that is low enough to hit: it carries several groups
  if ((w.prefer && w.prefer.includes('H')) || w.only === 'H' || (w.kinds && w.kinds.includes('H'))) { const d = dropNear(m, a.x, a.y, w.range); if (d) return d; }
  let best = null, bs = -Infinity;
  m.eGrid.near(a.x, a.y, w.range, (e, d2) => {
    if (e.vis <= 0) return;
    if (w.only && e.kind !== w.only) return;
    if (w.kinds && !w.kinds.includes(e.kind)) return;
    let score = -Math.sqrt(d2);
    if (w.prefer && w.prefer.includes(e.kind)) score += 60;
    if (w.crowd) { let n = 0; m.eGrid.near(e.x, e.y, 4, () => { n++; }); score += n * 6; }   // the light cannon likes a crowd
    if (score > bs) { bs = score; best = e; }
  });
  return best;
}

// A lock-on weapon (the guided missile, the one-shot rocket) needs a moment on its target before it will fire.
function lockedOn(m, w, e, dt) {
  if (w.lockE !== e) { w.lockE = e; w.lockT = 0; }
  w.lockT += dt;
  e.lockedUntil = m.t + 0.2; e.lockFrac = Math.min(1, w.lockT / w.lock);
  return w.lockT >= w.lock;
}

function updateWeapons(m, dt) {
  const sq = m.squad, k = C.callin.swMul ?? mul();      // (0.19: the support weapons have their own multiplier)
  for (const a of m.vgAlive) {
    if (a.mounted) continue;
    const ok = (e) => e.drop || sq.free || e.g.state === 'hunt';
    if (a.sw) {
      const w = a.sw;
      w.t -= dt;
      if (w.t <= 0) {
        let e = pickWeaponTarget(m, a, w);
        if (e && w.splash > 0 && !sq.assault && wakesBase(m, e.x, e.y, w.splash)) e = null;   // its blast would wake a base
        if (e && ok(e)) {
          if (w.splash < 3 && blocker(m, a, e.x, e.y)) { w.t = 0.3; w.lockE = null; w.lockT = 0; }   // a friendly is in the line of fire
          else if (w.lock && !lockedOn(m, w, e, dt)) w.t = 0;                                        // still acquiring
          else {
            w.t = w.every; w.lockE = null; w.lockT = 0;
            const dmg = w.dmg * k * (w.vary ? 1 + (m.rng.next() * 2 - 1) * w.vary : 1);
            fireShot(m, a, e, { dmg, acc: w.acc, splash: w.splash, mult: w.mult, flight: w.splash > 0 && w.range > 40 ? 0.35 : 0 }, 'callin', 'a', w.snd);
            w.left--;
            if (w.left <= 0) { a.sw = null; m.radio(COMMS.assetSpent(CALLINS[w.id].name), 'aspent', 2); m.emit('asset_down', { kind: 'weapon', sid: w.id, x: a.x, y: a.y, why: 'spent' }); }
          }
        } else {
          w.lockE = null; w.lockT = 0;
          // No enemy to shoot: a weapon that can crack structures works on a base or the citadel in range.
          let bs = w.only || w.mult.B < C.structure.weaponTry ? null : baseNear(m, a.x, a.y, w.range * 0.9, m.squad && m.squad.base);     // (0.53.4: the squad's base first; never the keep)
          if (bs && !bs.alert && !(sq.assault && sq.base === bs)) bs = null;     // not a base the squad has not gone in on yet
          if (bs) {
            w.t = w.every;
            const dx = a.x - bs.x, dy = a.y - bs.y, d = Math.hypot(dx, dy) || 1, kk = bs.r * 0.7 / d;
            m.emit('tracer', { x: a.x, y: a.y, tx: bs.x + dx * kk, ty: bs.y + dy * kk, s: 'a', hit: true, big: true, fl: w.splash > 0 && w.range > 40 ? 0.35 : 0, snd: w.snd });
            m.damageBase(bs, w.dmg * k * w.mult.B * C.structure.callinMul, 'callin', a.x, a.y);
            if (w.splash >= 3) m.emit('boom', { x: bs.x + dx * kk, y: bs.y + dy * kk, r: w.splash, dmg: w.dmg, by: 'callin' });
            w.left--;
            if (w.left <= 0) { a.sw = null; m.radio(COMMS.assetSpent(CALLINS[w.id].name), 'aspent', 2); m.emit('asset_down', { kind: 'weapon', sid: w.id, x: a.x, y: a.y, why: 'spent' }); }
          } else w.t = 0.2;
        }
      }
    }
    const mc = a.mech;
    if (mc && mc.hp > 0) {
      mc.gatT -= dt; mc.rktT -= dt;
      if (mc.gatT <= 0 && mc.gat > 0) {
        const e = m.eGrid.nearest(a.x, a.y, 42);
        if (e && ok(e)) { mc.gatT = 0.15; mc.gat--; fireShot(m, a, e, { dmg: 6.5 * k, acc: 0.8, splash: 0, mult: MECH_GAT }, 'callin', 'a', 'mechgat'); } else mc.gatT = 0.2;
      }
      if (mc.rktT <= 0 && mc.rkt > 0) {
        const e = pickWeaponTarget(m, a, { range: 80, prefer: 'HM', mult: MECH_RKT });
        if (e && ok(e)) { mc.rktT = 3.5; mc.rkt--; fireShot(m, a, e, { dmg: 260 * k, acc: 0.9, splash: 5, mult: MECH_RKT, flight: 0.45 }, 'callin', 'a', 'mechrkt'); } else mc.rktT = 0.3;
      }
      if (mc.gat <= 0 && mc.rkt <= 0) mechOut(m, a, 'empty');
    }
  }
}

function mechOut(m, a, why) {
  if (!a.mech) return;
  a.mech = null;
  m.radio(why === 'empty' ? tr('c.mechEmpty') : COMMS.mechDown, 'mechout', 3);
  m.emit('asset_down', { kind: 'mech', sid: 'mech', x: a.x, y: a.y, why });
}
export function mechDown(m, a) {
  if (!a.mech) return;
  a.mech = null;
  damageArea(m, a.x, a.y, 6, 260 * mul(), M(1, 1, 0.5, 0.1), 'callin', false);
  m.radio(COMMS.mechDown, 'mechout', 3);
  m.emit('boom', { x: a.x, y: a.y, r: 6, dmg: 260, by: 'callin' });
  m.emit('asset_down', { kind: 'mech', sid: 'mech', x: a.x, y: a.y, why: 'killed' });
}

// Fire, gas, Stun and smoke zones.
function updateZones(m, dt) {
  const t = m.t, k = mul();
  for (let i = m.zones.length - 1; i >= 0; i--) {
    const z = m.zones[i];
    if (t >= z.until) { m.zones.splice(i, 1); continue; }
    z.tick -= dt;
    if (z.tick > 0) continue;
    z.tick += 0.25;
    if (z.kind === 'fire' || z.kind === 'gas') {
      const dm = z.by === 'player' ? 1 : k;   // the player's zones already carry the player's upgrades
      m.eGrid.near(z.x, z.y, z.r, (e) => { alertGroup(m, e.g); hurtEnemy(m, e, z.dps * 0.25 * dm, z.by || 'callin', null, null, ''); });
    } else if (z.kind === 'ems') {
      m.eGrid.near(z.x, z.y, z.r, (e) => { e.stunUntil = t + 0.6; });
    }
  }
}

// ---------------------------------------------------------------- main update
export function updateCallin(m, dt) {
  const S = m.callin, t = m.t;
  runQueue(m);
  updateAssets(m, dt);
  updateWeapons(m, dt);
  updateZones(m, dt);
  for (let i = m.assets.length - 1; i >= 0; i--) if (m.assets[i].dead) m.assets.splice(i, 1);
  if (m.over || !m.vgAlive.length) return;
  S.scanT -= dt;
  if (S.scanT > 0) return;
  S.scanT = 0.4;
  // (0.26) every Vanguard keeps his own clock: each can call one of his own call-ins in the same moment as the others (no
  // squad-wide turn to wait for); the squad-wide items still go one at a time. (S.callAt holds every call: scripted moments, tests)
  if (t < S.callAt) return;
  // (0.72, Ramzies: "vanguard doesn't seem to know how to use their call-ins") Each Vanguard weighs everything he has ready
  // and calls the one that does the most good now (scoreCall), not the first in his list that would do: the big guns for the
  // big packs, the armour-breakers for armour, the light ones for the small fights. A call-in that sits ready while he fights
  // counts its wait (needOf lowers the pack it waits for).
  const ctxs = {}, n = S.order.length, best = new Map();
  for (let i = 0; i < n; i++) {
    const g = S.groups[S.order[(S.rot + i) % n]], d = g.def, team = m.teams[g.team];
    if (t < g.readyAt) { g.waited = 0; continue; }
    if (d.shared ? t < (S.sharedAt || 0) : t < team.callAt) continue;
    if (!canCall(m, g)) continue;
    const key = d.shared ? 's' : g.team;
    const ctx = ctxs[key] || (ctxs[key] = buildCtx(m, d.shared ? null : team.vg));
    if (ctx.engaged || ctx.hunt) g.waited = (g.waited || 0) + 0.4;
    const tgt = choose(m, g, ctx);
    if (!tgt) continue;
    // a commander's jammer: nothing can be called down inside it, and nobody standing in it can call at all
    const caller = callinOwner(m, g);
    if (jammedAt(m, tgt.x, tgt.y, 4) || (caller && jammedAt(m, caller.x, caller.y))) { m.stats.jammed = (m.stats.jammed || 0) + 1; continue; }
    const sc = scoreCall(m, g, tgt, ctx), b = best.get(key);
    if (!b || sc > b.sc) best.set(key, { g, tgt, ctx, sc });
  }
  for (const [key, { g, tgt, ctx }] of best) {
    if (!ctx.panic && m.rng.next() > 0.7) continue;   // not every opportunity gets taken the instant it appears (but a runner calls at once)
    const d = g.def, team = m.teams[g.team];
    execute(m, g, tgt, ctx);
    g.readyAt = t + d.cd * (C.callin.cdMul ?? 1); g.uses++; g.waited = 0;
    if (key === 's') S.sharedAt = t + 0.5; else team.callAt = t + C.callin.callGapSec;
  }
  S.rot = (S.rot + 1) % n;
}
// (0.72) How much good a call does now, to choose between those ready: the enemies it would catch (a pack counts up to what the
// strike can take in), armour for what breaks armour, and the defensive things by the threat. A short cooldown is the cheaper
// call: the long ones wait for the moments that need them.
function scoreCall(m, g, tgt, ctx) {
  const d = g.def, cdK = Math.sqrt(60 / Math.max(30, d.cd || 60));
  if (tgt.e) return (6 + (d.anti ? 4 : 0)) * cdK + (ctx.panic ? 3 : 0);     // a heavy
  if (tgt.base) return 7 * cdK;
  if (tgt.n) return Math.min(tgt.n, 4 + blastOf(d) / 3) * cdK + (tgt.n >= 10 && blastOf(d) > 20 ? 4 : 0);     // a pack (a big pack is what the big ones are for)
  switch (d.use) {
    case 'smoke': return ctx.panic ? 9 : 4;
    case 'defense': case 'fight': return Math.min(ctx.hunt, 10) * 0.6 * cdK + (ctx.panic ? 3 : 0) + (d.anti && ctx.heavies.length ? 3 : 0);
    case 'heavy': return ctx.heavies.length ? 7 : 3;
    case 'resupply': return 6;
    case 'travel': return ctx.panic ? 8 : 2;
    default: return 1;
  }
}

export { compass };
