// (GC 0.73) CHANGING THE KEYS FROM THE MENU: each game's keys as buttons (OPTIONS on the main menu, CONTROLS in the menu inside
// a game). Click one, press the new key; a key another action of the same game had swaps with it; Esc lets it be. The war room,
// the base and the station keep their keys in js/core/binds.js; the ground fight in its own js/ground/keys.js (the same list
// CHANGE KEYS edits in the fight), which a fight already open takes up at once (it listens for the change).
import { binds, keyName, canBind } from './binds.js';
import * as GK from '../ground/keys.js';
import EN from '../ground/lang/en.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// what the rows say: the ground's from its own wording, the others' from binds.js
function rows(game) {
  if (game === 'fury') return GK.GROUPS.map(([g, list]) => ({ head: EN['keys.g.' + g] || g, items: list.map(([a]) => ({ a, what: EN['keys.a.' + a] || a, key: GK.keyOf(a), def: GK.defaultOf(a), more: GK.codesOf(a).filter((c) => c !== GK.keyOf(a)) })) }));
  const B = binds(game);
  return [{ head: '', items: B.actions.map((a) => ({ a, what: B.what(a), key: B.keyOf(a), def: B.defaultOf(a), more: B.codesOf(a).filter((c) => c !== B.keyOf(a)) })) }];
}
const isDefault = (game) => (game === 'fury' ? GK.isDefault() : binds(game).isDefault());
let waiting = null, note = '', noteG = '';     // (the last change's message, shown on its own game's page)
// The panel: fixed: [[what you press, what it does]] that can't be changed (the mouse, Esc), shown above the keys
export function keysPanel(game, fixed = []) {
  const groups = rows(game);
  const body = groups.map((g) => `${g.head ? `<h4 class="kb-h">${esc(g.head)}</h4>` : ''}<div class="kb-list">${g.items.map((it) => {
    const wait = waiting && waiting.game === game && waiting.a === it.a, changed = it.key !== it.def;
    return `<div class="kb-row${changed ? ' changed' : ''}"><span>${esc(it.what)}</span><button class="plate btn kb-key${wait ? ' wait' : ''}" data-kb="${it.a}" data-kg="${game}" title="Click, then press the new key">${wait ? 'PRESS A KEY…' : esc(keyName(it.key))}</button><small>${it.more.length ? 'also ' + it.more.map(keyName).map(esc).join(', ') : ''}</small></div>`;
  }).join('')}</div>`).join('');
  return `<div class="kbind">${fixed.length ? `<dl class="keys">${fixed.map(([a, d]) => `<dt>${esc(a)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>` : ''}${body}</div>
    <p class="soon kb-note">${esc((noteG === game && note) || 'Click a key, then press the new one. A key another action already has swaps with it; Esc leaves it as it was. Kept on this device.')}</p>
    <button class="plate btn" data-kbreset="${game}"${isDefault(game) ? ' disabled' : ''}>BACK TO THE DEFAULT KEYS</button>`;
}
// Wire the panel's buttons once it is on the page. redraw(): draw the page again (the panel with it).
export function bindKeysPanel(root, redraw) {
  for (const b of root.querySelectorAll('[data-kb]')) b.onclick = (e) => {
    e.stopPropagation(); waiting = { game: b.dataset.kg, a: b.dataset.kb }; note = ''; noteG = b.dataset.kg; redraw();
    const grab = (k) => {
      if (k.code === 'ShiftLeft' || k.code === 'ShiftRight' || k.code === 'ControlLeft' || k.code === 'ControlRight' || k.code === 'AltLeft' || k.code === 'AltRight' || k.code === 'MetaLeft' || k.code === 'MetaRight') return;     // (a modifier on its own: wait for the key)
      k.preventDefault(); k.stopImmediatePropagation(); window.removeEventListener('keydown', grab, true);
      const w = waiting; waiting = null;
      if (!w || k.code === 'Escape') { note = ''; redraw(); return; }
      const can = w.game === 'fury' ? GK.canBind(k.code) : canBind(k.code);
      if (!can) { note = `${keyName(k.code)} can't be given to anything: it stays as it is.`; redraw(); return; }
      const r = w.game === 'fury' ? GK.setKey(w.a, k.code) : binds(w.game).setKey(w.a, k.code);
      const what = (a) => (w.game === 'fury' ? EN['keys.a.' + a] || a : binds(w.game).what(a));
      note = r.swapped ? `${keyName(k.code)} is now "${what(w.a)}". "${what(r.swapped)}" took its old key.` : r.ok ? `${keyName(k.code)} is now "${what(w.a)}".` : '';
      redraw();
    };
    window.addEventListener('keydown', grab, true);
  };
  for (const b of root.querySelectorAll('[data-kbreset]')) b.onclick = (e) => {
    e.stopPropagation(); const g = b.dataset.kbreset; if (g === 'fury') GK.resetKeys(); else binds(g).reset(); waiting = null; note = 'Back to the default keys.'; noteG = g; redraw();
  };
}
