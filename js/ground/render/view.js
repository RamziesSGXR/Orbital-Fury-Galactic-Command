// (0.61.5) What the player is doing, for the map's drawing: less is drawn while a building or a drop is being placed (the zones
// that have nothing to do with it go, so the ghost and the ground can be seen). Set by the renderer once a frame.
// (GC 0.23) p3: what stands on the land is drawn as models in 3D, so the flat drawings of the same things are left out.
// (GC 0.24) air: the list that aircraft are added to when they fly in 3D (null when the picture is flat); drops: the same for what comes down by parachute.
// (GC 0.37) bars: health bars drawn on the map beside units and buildings. Off: damage is shown on the thing itself (it flashes
// when hit and darkens as it is worn down, a building smokes), and aiming at a thing or picking it gives its name and health.
// (GC 0.50) fx3: the lists of light and smoke drawn in the air in 3D ({ orbs, bolts, puffs }; null when the picture is flat), for what flies.
// (GC 0.51) ts: true scale. 0: people and creatures drawn far larger than life and never smaller than a few pixels (as before);
// 1: everything at its own size (TRUE, below), shrinking with distance like the land it stands on.
export const VIEW = { quiet: false, squad: false, loud: false, p3: false, air: null, drops: null, fx3: null, ts: 0, bars: false, m3: new Set(), sh: false };     // (GC 0.38) m3: the objectives and side sites whose models have come, so their flat drawings are left out

// (GC 0.51) TRUE SIZES. With VIEW.ts on, each thing is the size it would be beside a two-metre soldier, not a mark big enough
// to pick out from orbit. `r` is half its longest side in metres (half its height, for a person).
//   people: the Vanguard and the trooper are the same height; a citizen a little less
//   craft and vehicles: by kind (a scout car 4.8 m long, a dropship 13 m, the dog 1.2 m ...)
//   what stands on the ground: a share of its old size by kind; trees, rocks, buildings and sites are left as they are
export const TRUE = {
  man: 1.0, civ: 0.92, foe: 0.36,
  air: { dship: 6.5, crate: 0.9, jet: 8, shuttle: 8, dog: 0.6, lrv: 2.4, uav: 1.6, mech: 2.0, 'edrop:ship': 8.5, 'edrop:warp': 11 },
  // (0.52) field works: [how deep, how tall] as shares of the model, so that cover is chest high beside a two-metre soldier and
  // he is seen over it. Sandbags 1.2 m, a barricade and a concrete barrier 1.3 m, wire 1 m, a foxhole's parapet 1.1 m. (They were
  // sized for troopers drawn three times life: a wall 3.8 m tall hid everyone behind it.) Their length is still the game's own.
  field: { cover0: [1.1, 1.07], cover1: [1.0, 0.85], cover2: [1.0, 0.85], wire: [1.0, 1.0], trench: [1.0, 1.2] },
  prop: { crate: [0, 0.8], mine: [0, 0.3], shieldgen: [0, 1.6], aturret: [0, 0.9], 'post:mg': [0, 2.0], 'post:mggun': [0, 2.0], 'post:lookout': [0, 1.6], 'post:sam': [0.8], 'post:arty': [0.85], 'post:tower': [0.85], turret: [0.8], side_howitzer: [0.6], site_charge: [0, 1.0] },     // [a share of its size] or [0, metres]
};
export const trueR = (k, r) => (VIEW.ts && TRUE.air[k] ? TRUE.air[k] : r);

// (0.52, from Orbital Fury 0.62.24/25) DASHED LINES ARE THE PLAYER'S OWN MARKS. Most dashed rings were standing information (an
// objective's ring, a base's, a side site's, a building's reach) and with a dozen on screen they shouted over the fight. Every
// stroke made with a dash set is drawn at `k` of its strength (0: not at all), except while VIEW.loud is set (something being
// placed, a squad's orders, a strike or pod coming down, the aim: the lines the player asked for) and anything red (a warning
// stays). Done once per canvas by wrapping its stroke and setLineDash, so every dashed ring in every file follows.
export function quietDashes(ctx, k) {
  if (!ctx._qd) {
    const stroke = ctx.stroke.bind(ctx), dash = ctx.setLineDash.bind(ctx);
    ctx._qd = { k: 1, on: false };
    ctx.setLineDash = (a) => { ctx._qd.on = !!(a && a.length); dash(a); };
    ctx.stroke = (...a) => {
      const q = ctx._qd;
      if (!q.on || q.k >= 1 || VIEW.loud || isWarn(ctx.strokeStyle)) return stroke(...a);
      if (q.k <= 0) return undefined;
      const g = ctx.globalAlpha; ctx.globalAlpha = g * q.k; const r = stroke(...a); ctx.globalAlpha = g; return r;
    };
  }
  ctx._qd.k = k;
}
// a red line: '#ff4a4a', 'rgba(255, 70, 50, 0.8)'
const WARN = new Map();
function isWarn(s) {
  if (typeof s !== 'string') return false;
  let v = WARN.get(s);
  if (v === undefined) {
    let r = 0, g = 255, b = 255;
    if (s[0] === '#' && s.length >= 7) { r = parseInt(s.slice(1, 3), 16); g = parseInt(s.slice(3, 5), 16); b = parseInt(s.slice(5, 7), 16); }
    else { const m = /rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/.exec(s); if (m) { r = +m[1]; g = +m[2]; b = +m[3]; } }
    v = r > 200 && g < 135 && b < 135;
    if (WARN.size > 400) WARN.clear();
    WARN.set(s, v);
  }
  return v;
}
