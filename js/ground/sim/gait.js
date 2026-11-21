// HOW AN ALLY IS MOVING (GC 0.50). The squad and the Infantry are moved a step at a time by their own rules (squad.js,
// infantry.js, vanguard.js), and none of them said how fast: so the picture never knew anyone was walking, and every
// Vanguard and trooper slid across the ground standing still. Here, once a step, each one's speed and the ground he has
// covered are worked out from where he was a step ago. Nothing in the rules reads these: they are for the eye only.
//   a.mv    metres a second, smoothed over a few steps (so one held step does not stop his legs)
//   a.gait  metres walked since he landed: the picture takes his stride from it, so a foot stays where it is put down
//   a.mvA   the way he is going (radians on the map), kept while he moves
export function updateGait(m, dt) {
  if (!(dt > 0)) return;
  for (const a of m.alive) {
    if (a._gx === undefined) { a._gx = a.x; a._gy = a.y; a.mv = 0; a.gait = 0; continue; }
    const dx = a.x - a._gx, dy = a.y - a._gy; let d = Math.hypot(dx, dy); a._gx = a.x; a._gy = a.y;
    if (d > 6 || a.down || a.mounted || a.inside) d = 0;     // (a drop, a lift, a ride: not a walk)
    a.mv += (d / dt - a.mv) * 0.4; if (a.mv < 0.05) a.mv = 0;
    a.gait += d; if (d > 0.02) a.mvA = Math.atan2(dy, dx);
  }
}
