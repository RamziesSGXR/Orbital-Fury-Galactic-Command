// (0.61.5) What the player is doing, for the map's drawing: less is drawn while a building or a drop is being placed (the zones
// that have nothing to do with it go, so the ghost and the ground can be seen). Set by the renderer once a frame.
// (GC 0.23) p3: what stands on the land is drawn as models in 3D, so the flat drawings of the same things are left out.
// (GC 0.24) air: the list that aircraft are added to when they fly in 3D (null when the picture is flat); drops: the same for what comes down by parachute.
export const VIEW = { quiet: false, squad: false, p3: false, air: null, drops: null };
