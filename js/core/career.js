// The career: one record, kept on this browser, of what the player has done and met across every game.
// Each game writes to it as things happen (the ground fight at its debrief, the base and the station as things are built);
// the main menu's COLLECTION and CAREER tabs read it. It is kept apart from the saves: deleting a save does not undo a career.
//
//   n    totals, by name: { missions: 12, won: 9, starsLost: 4, ... }
//   met  what has been met, by kind and id: { foe: { 'bugs.L': { at, n } }, world: {...}, obj: {...}, building: {...}, part: {...} }
//        at: when it was first met; n: how many times since (kills, fights, buildings put up)
const KEY = 'ofgc.career';
const blank = () => ({ v: 1, n: {}, met: {} });

export function career() {
  try { const c = JSON.parse(localStorage.getItem(KEY)); return c && c.v === 1 && c.n && c.met ? c : blank(); } catch { return blank(); }
}

// add to the totals, and mark things met: note({ missions: 1 }, [['foe', 'bugs.L', 14], ['world', 'ice']])
export function note(adds, met) {
  const c = career();
  for (const k in adds || {}) { const v = +adds[k] || 0; if (v) c.n[k] = (c.n[k] || 0) + v; }
  for (const [kind, id, by = 1] of met || []) {
    if (!kind || id == null) continue;
    const s = (c.met[kind] ||= {}), e = (s[id] ||= { at: Date.now(), n: 0 });
    e.n += by;
  }
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* no storage: the career is not kept */ }
  return c;
}

// the biggest of a total so far: best({ bestStreak: 5 })
export function best(vals) {
  const c = career();
  for (const k in vals) c.n[k] = Math.max(c.n[k] || 0, +vals[k] || 0);
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* no storage */ }
}
