// (GC 0.73, Ramzies: "the menu had the controls for each game but it can't be changed by the player, that should be a thing")
// EVERY GAME'S KEYS, THE PLAYER'S OWN. Each game lists its actions: [action, what it does, its own key, second keys that stay
// fixed]. Giving an action a key another action of the same game has swaps the two, so no key does two things in one game.
// Saved on this browser, one list for each game. The ground fight keeps its own list (js/ground/keys.js, CHANGE KEYS in the
// fight); the main menu changes both the same way (js/core/keys-ui.js).
const DEFS = {
  war: [
    ['panUp', 'Move the map up', 'KeyW', ['ArrowUp']], ['panLeft', 'Move the map left', 'KeyA', ['ArrowLeft']],
    ['panDown', 'Move the map down', 'KeyS', ['ArrowDown']], ['panRight', 'Move the map right', 'KeyD', ['ArrowRight']],
    ['turnLeft', 'Turn the map left', 'KeyQ', []], ['turnRight', 'Turn the map right', 'KeyE', []],
    ['zoomIn', 'Zoom in', 'Equal', ['NumpadAdd']], ['zoomOut', 'Zoom out', 'Minus', ['NumpadSubtract']],
    ['front', 'Look down the front being fought', 'KeyF', []],
  ],
  base: [
    ['panUp', 'Move the view up', 'KeyW', ['ArrowUp']], ['panLeft', 'Move the view left', 'KeyA', ['ArrowLeft']],
    ['panDown', 'Move the view down', 'KeyS', ['ArrowDown']], ['panRight', 'Move the view right', 'KeyD', ['ArrowRight']],
    ['turnLeft', 'Turn the view left', 'KeyQ', []], ['turnRight', 'Turn the view right', 'KeyE', []],
    ['rotate', 'Turn the building you are placing', 'KeyR', []], ['pause', 'Pause and go on', 'Space', []],
  ],
  orbit: [
    ['rotate', 'Turn the part you are placing', 'KeyR', []], ['build', 'Build it at the ring under the cursor', 'Enter', ['NumpadEnter']],
    ['pause', 'Pause and go on', 'Space', []],
  ],
};
// keys that can't be given to anything: the menu's own, and the modifiers
const FIXED = new Set(['Escape', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'CapsLock', 'ContextMenu', 'OSLeft', 'OSRight', 'Tab']);
export const canBind = (code) => !!code && !FIXED.has(code);
const store = (g) => 'gc.keys.' + g;
const made = {};

// The keys of one game: binds('war'), binds('base'), binds('orbit').
export function binds(g) {
  if (made[g]) return made[g];
  const list = DEFS[g] || [], DEF = {}, ALT = {}, WHAT = {};
  for (const [a, w, k, alt] of list) { DEF[a] = k; ALT[a] = alt; WHAT[a] = w; }
  const ACTIONS = list.map((x) => x[0]);
  let own = { ...DEF }, map = new Map();
  const load = () => {
    own = { ...DEF };
    try { const s = JSON.parse(localStorage.getItem(store(g)) || 'null'); if (s && typeof s === 'object') for (const a of ACTIONS) if (typeof s[a] === 'string' && canBind(s[a])) own[a] = s[a]; } catch { /* none kept */ }
    const used = new Set(); for (const a of ACTIONS) { if (own[a] && used.has(own[a])) own[a] = used.has(DEF[a]) ? '' : DEF[a]; if (own[a]) used.add(own[a]); }
    map = new Map(); for (const a of ACTIONS) if (own[a]) map.set(own[a], a);
    for (const a of ACTIONS) for (const k of ALT[a]) if (!map.has(k)) map.set(k, a);
  };
  const save = () => { try { const d = {}; for (const a of ACTIONS) if (own[a] !== DEF[a]) d[a] = own[a]; if (Object.keys(d).length) localStorage.setItem(store(g), JSON.stringify(d)); else localStorage.removeItem(store(g)); } catch { /* no storage */ } };
  load();
  const B = made[g] = {
    game: g, actions: ACTIONS, what: (a) => WHAT[a] || a,
    keyOf: (a) => own[a] || '', defaultOf: (a) => DEF[a], isDefault: () => ACTIONS.every((a) => own[a] === DEF[a]),
    actionOf: (code) => map.get(code) || null,
    codesOf: (a) => { const out = []; for (const [k, b] of map) if (b === a) out.push(k); return out; },
    // is this action's key (own or second) among those held (a Set of KeyboardEvent.code)?
    held: (a, set) => { for (const [k, b] of map) if (b === a && set.has(k)) return true; return false; },
    setKey(a, code) {
      if (!(a in DEF) || !canBind(code)) return { ok: false, swapped: null };
      if (own[a] === code) return { ok: true, swapped: null };
      const other = ACTIONS.find((b) => b !== a && own[b] === code) || null;
      if (other) own[other] = own[a];
      own[a] = code; save(); load(); return { ok: true, swapped: other };
    },
    reset() { try { localStorage.removeItem(store(g)); } catch { /* no storage */ } load(); },
  };
  return B;
}
export const GAMES_WITH_KEYS = Object.keys(DEFS);

// How a key is written on a button: W, 1, SPACE, ↑, NUM +
const NAMES = {
  Space: 'SPACE', Enter: 'ENTER', NumpadEnter: 'NUM ENTER', Tab: 'TAB', Backspace: 'BKSP', Delete: 'DEL', Insert: 'INS', Home: 'HOME', End: 'END',
  PageUp: 'PG UP', PageDown: 'PG DN', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backquote: '`', Minus: '-', Equal: '=',
  BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: '\'', Comma: ',', Period: '.', Slash: '/', IntlBackslash: '\\',
  NumpadAdd: 'NUM +', NumpadSubtract: 'NUM -', NumpadMultiply: 'NUM *', NumpadDivide: 'NUM /', NumpadDecimal: 'NUM .',
};
export function keyName(code) {
  if (!code) return '—';
  if (NAMES[code]) return NAMES[code];
  let m = /^Key([A-Z])$/.exec(code); if (m) return m[1];
  m = /^Digit([0-9])$/.exec(code); if (m) return m[1];
  m = /^Numpad([0-9])$/.exec(code); if (m) return 'NUM ' + m[1];
  if (/^F[0-9]{1,2}$/.test(code)) return code;
  return code.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
}
