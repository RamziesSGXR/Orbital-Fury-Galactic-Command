// THE GROUND: a battle of the war fought on the planet, with fire support from orbit. This is Orbital Fury whole: its
// armoury, briefing, mission (tactical panel, squads, building, supply pod, Demolition Charge, the planning pause, the map) and its
// debrief, running in its own page (ground.html) inside the theatre. This file hands it the fight the war room chose
// (`window.gcGround`) and takes the result back. The campaign's armoury and credits are the very objects it plays with.
import { C as GC } from '../galaxy/config.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const WON = (o) => o === 'victory' || o === 'complete';
const hash = (a, b, c) => { let h = (a * 2654435761) ^ (b * 40503) ^ (c * 97); h = Math.imul(h ^ (h >>> 15), 2246822507); return (h ^ (h >>> 13)) >>> 0; };

let app, ui, frame = null, snap = null, credits0 = 0;

const mode = {
  off: true,
  init(a, f) { app = a; ui = f; },
  enter(a) {
    mode.off = false;
    const b = a.battle, sys = a.system, g = app.camp, kw = sys.worlds[sys.key], atk = b.kind === 'atk';
    const seed = hash(sys.id + 1, (g.war && g.war.seed) || 1, (a.round || 1) * 3 + (atk ? 1 : 2));
    const objs = GC.groundObj[atk ? 'atk' : 'def'];
    credits0 = g.wallet.bal; snap = JSON.stringify({ kit: g.kit, wallet: g.wallet });
    window.gcGround = {
      kit: g.kit, wallet: g.wallet, tier: app.armouryTier(), hints: app.settings.hints, level: a.level || 1, support: a.support || null, livery: app.faction,
      faction: GC.link.foe[b.f] || 'bugs', biome: GC.link.biome[kw.type] || 'grass', seed, obj: a.post ? 'evac' : objs[seed % objs.length], post: a.post || null,     // a post under attack is always its defence and evacuation
      op: a.post ? `Evacuate ${a.system.name}` : `Operation ${kw.name}`, callsign: (app.faction.name || '').toUpperCase().replace(/[^\w \-.]/g, '').slice(0, 16),
      // (0.29) for the debrief: what this result will bring the war, before it is handed over
      preview: (r) => {
        const win = WON(r.outcome), left = win ? clamp(r.livesLeft / Math.max(1, r.livesMax), 0, 1) : 0;
        const pv = a.preview ? a.preview(win, left, { minutes: r.minutes, kills: r.kills, bases: r.bases, baseTotal: r.baseTotal, livesLeft: r.livesLeft, livesMax: r.livesMax, share: r.share }) : { chips: [], notes: [] };
        const earned = Math.max(0, Math.floor((g.wallet.bal - credits0) * GC.link.creditShare)); if (earned) pv.chips.push({ k: 'CR', v: earned });
        return pv;
      },
      // the mission is over and its debrief has been read
      onResult: (r) => {
        const win = WON(r.outcome), earned = Math.max(0, Math.floor((g.wallet.bal - credits0) * GC.link.creditShare));
        if (g.wallet.bal > credits0) g.wallet.bal = credits0 + earned;     // a share of what the ground earns reaches the war
        snap = null;
        const left = win ? clamp(r.livesLeft / Math.max(1, r.livesMax), 0, 1) : 0;
        const res = { minutes: r.minutes, kills: r.kills, bases: r.bases, baseTotal: r.baseTotal, livesLeft: r.livesLeft, livesMax: r.livesMax, share: r.share };
        setTimeout(() => ui.leave({ win, left, res }), 0);
      },
      // the landing was called off before it was fought: nothing bought or earned is kept
      onAbort: () => { mode.undo(); setTimeout(() => ui.leave({ abandon: true }), 0); },
    };
    $('s-theatre').classList.add('bare');
    frame = document.createElement('iframe'); frame.id = 'g-frame'; frame.title = 'Ground battle'; frame.setAttribute('allow', 'autoplay; fullscreen');
    const ready = new Promise((res) => { frame.onload = () => res(); });
    frame.src = 'ground.html' + (new URLSearchParams(location.search).has('debug') ? '?debug' : '');
    document.body.appendChild(frame);
    return ready.then(() => { try { frame.contentWindow.focus(); } catch { /* not focusable yet */ } });
  },
  undo() { if (!snap) return; const o = JSON.parse(snap); snap = null; Object.assign(app.camp.kit, o.kit); Object.assign(app.camp.wallet, o.wallet); },
  report() { mode.undo(); return { abandon: true }; },
  leave() { mode.off = true; if (frame) { frame.remove(); frame = null; } window.gcGround = null; $('s-theatre').classList.remove('bare'); },
  frame() { /* the ground runs on its own clock */ },
  // for the browser checks
  get game() { try { return frame && frame.contentWindow.__game; } catch { return null; } },
};
export default mode;
