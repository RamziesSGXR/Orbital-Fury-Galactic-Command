// (0.61.5) What the player is doing, for the map's drawing: less is drawn while a building or a drop is being placed (the zones
// that have nothing to do with it go, so the ghost and the ground can be seen). Set by the renderer once a frame.
// (GC 0.23) p3: what stands on the land is drawn as models in 3D, so the flat drawings of the same things are left out.
// (GC 0.24) air: the list that aircraft are added to when they fly in 3D (null when the picture is flat); drops: the same for what comes down by parachute.
// (GC 0.37) bars: health bars drawn on the map beside units and buildings. Off: damage is shown on the thing itself (it flashes
// when hit and darkens as it is worn down, a building smokes), and aiming at a thing or picking it gives its name and health.
// (GC 0.50) fx3: the lists of light and smoke drawn in the air in 3D ({ orbs, bolts, puffs }; null when the picture is flat), for what flies.
export const VIEW = { quiet: false, squad: false, p3: false, air: null, drops: null, fx3: null, bars: false, m3: new Set(), sh: false };     // (GC 0.38) m3: the objectives and side sites whose models have come, so their flat drawings are left out
