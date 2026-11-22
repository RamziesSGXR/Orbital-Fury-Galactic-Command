// (GC 0.58) MESSAGE TIME: how long the messages in the corner of the base, the station and the ground game stay up.
// One switch on the main menu's Settings, kept with the other settings ('ofgc.settings'). The ground game runs in its
// own frame, so each side reads the switch from storage and hears when the other side changes it.
export const MSG_TIMES = [
  ['normal', 'NORMAL', 1],
  ['long', 'LONG', 1.7],
  ['vlong', 'VERY LONG', 3],
  ['tap', 'UNTIL TAPPED', Infinity],
];
export const MSG_DEFAULT = 'long';
const SET_KEY = 'ofgc.settings';
let cur = MSG_DEFAULT;
function read() { try { const s = JSON.parse(localStorage.getItem(SET_KEY) || '{}') || {}; cur = MSG_TIMES.some((m) => m[0] === s.msg) ? s.msg : MSG_DEFAULT; } catch { cur = MSG_DEFAULT; } }
read();
try { window.addEventListener('storage', (e) => { if (!e.key || e.key === SET_KEY) read(); }); } catch { /* no window */ }
// the setting's key ('normal' ... 'tap'), and how many times longer than before a message stays (Infinity: until tapped)
export const msgKey = () => cur;
export const msgK = () => (MSG_TIMES.find((m) => m[0] === cur) || MSG_TIMES[1])[2];
export function setMsg(k) { if (MSG_TIMES.some((m) => m[0] === k)) cur = k; }
// keep a message up for base ms (scaled by the setting), then fade and remove it; with UNTIL TAPPED, a tap removes it
export function timeMessage(el, base, fade = 0, fadeCls = 'old') {
  const k = msgK();
  if (k === Infinity) { el.style.pointerEvents = 'auto'; el.style.cursor = 'pointer'; el.title = 'Tap to clear'; el.addEventListener('pointerdown', (e) => { e.stopPropagation(); el.remove(); }); return; }
  const life = base * k;
  if (fade) { setTimeout(() => el.classList.add(fadeCls), life); setTimeout(() => el.remove(), life + fade); } else setTimeout(() => el.remove(), life);
}
