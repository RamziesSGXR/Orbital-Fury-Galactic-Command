// (0.61.5) What the player is doing, for the map's drawing: less is drawn while a building or a drop is being placed (the zones
// that have nothing to do with it go, so the ghost and the ground can be seen). Set by the renderer once a frame.
// (GC 0.23) p3: what stands on the land is drawn as models in 3D, so the flat drawings of the same things are left out.
// (GC 0.24) air: the list that aircraft are added to when they fly in 3D (null when the picture is flat); drops: the same for what comes down by parachute.
// (GC 0.37) bars: health bars drawn on the map beside units and buildings. Off: damage is shown on the thing itself (it flashes
// when hit and darkens as it is worn down, a building smokes), and aiming at a thing or picking it gives its name and health.
// (GC 0.50) fx3: the lists of light and smoke drawn in the air in 3D ({ orbs, bolts, puffs }; null when the picture is flat), for what flies.
// (GC 0.51) ts: true scale. 0: people and creatures drawn far larger than life and never smaller than a few pixels (as before);
// 1: everything at its own size (TRUE, below), shrinking with distance like the land it stands on.
export const VIEW = { quiet: false, squad: false, p3: false, air: null, drops: null, fx3: null, ts: 0, bars: false, m3: new Set(), sh: false };     // (GC 0.38) m3: the objectives and side sites whose models have come, so their flat drawings are left out

// (GC 0.51) TRUE SIZES. With VIEW.ts on, each thing is the size it would be beside a two-metre soldier, not a mark big enough
// to pick out from orbit. `r` is half its longest side in metres (half its height, for a person).
//   people: the Vanguard and the trooper are the same height; a citizen a little less
//   craft and vehicles: by kind (a scout car 4.8 m long, a dropship 13 m, the dog 1.2 m ...)
//   what stands on the ground: a share of its old size by kind; trees, rocks, buildings and sites are left as they are
export const TRUE = {
  man: 1.0, civ: 0.92, foe: 0.36,
  air: { dship: 6.5, crate: 0.9, jet: 8, shuttle: 8, dog: 0.6, lrv: 2.4, uav: 1.6, mech: 2.0, 'edrop:ship': 8.5, 'edrop:warp': 11 },
  prop: { crate: [0, 0.8], mine: [0, 0.3], shieldgen: [0, 1.6], aturret: [0, 0.9], 'post:mg': [0.7], 'post:sam': [0.8], 'post:arty': [0.85], 'post:tower': [0.85], turret: [0.8], side_howitzer: [0.6], site_charge: [0, 1.0] },     // [a share of its size] or [0, metres]
};
export const trueR = (k, r) => (VIEW.ts && TRUE.air[k] ? TRUE.air[k] : r);
