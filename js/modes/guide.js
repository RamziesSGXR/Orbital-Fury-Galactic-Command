// A post's guide: a short run of cards that teach how the post is played, with no story to it. Each step is done by
// doing it (or NEXT). It runs two ways: as the TUTORIAL from the main menu (a practice post that is not saved; its last
// card ends it and goes back to the menu), and once, by itself, the first time a post is played for real.
//   steps: [{ t: title, x: text (may hold <b>), done: () => bool, last: true on the closing card }]
//   o: { key: where "seen" is kept, tutorial: bool, words: fn, audio, exit: fn (leave the post, tutorial only) }
const $ = (id) => document.getElementById(id);
export function makeGuide(steps, o) {
  let i = 0, on = true, sig = '', folded = false;
  const seen = () => { try { localStorage.setItem(o.key, '1'); } catch { /* private browsing: it will be offered again */ } };
  const el = () => { let e = $('th-coach'); if (!e) { e = document.createElement('div'); e.id = 'th-coach'; $('th-stage').appendChild(e); } return e; };
  const draw = () => {
    const e = el(); if (!on) { e.hidden = true; sig = ''; return; }
    const st = steps[i], s = i + (folded ? 'f' : ''); if (s === sig) return; sig = s;
    e.hidden = false;
    const bt = st.last ? `<button class="plate btn sm go" data-gc="done">${o.tutorial ? 'FINISH: TO THE MAIN MENU' : 'GOT IT'}</button>${o.tutorial ? '<button class="plate btn sm" data-gc="stay">KEEP PRACTISING</button>' : ''}`
      : `<button class="plate btn sm" data-gc="next">NEXT</button><button class="plate btn sm" data-gc="skip">${o.tutorial ? 'END THE TUTORIAL' : 'SKIP THE GUIDE'}</button>`;
    // the card lies over the post, so only its buttons take the pointer (a tap on its words reaches the ground under it), and it folds to its title
    e.classList.toggle('fold', folded);
    e.innerHTML = `<button class="cfold" data-gc="fold" aria-label="${folded ? 'Open the guide' : 'Fold the guide away'}">${folded ? '▸' : '▾'}</button><em>${o.tutorial ? 'TUTORIAL' : 'GETTING STARTED'} · ${i + 1} OF ${steps.length}</em><b>${st.t}</b>${folded ? '' : `<p>${o.words(st.x)}</p><div class="cbt">${bt}</div>`}`;
    e.onclick = (ev) => { const b = ev.target.closest('[data-gc]'); if (!b) return; o.audio.click(); const k = b.dataset.gc;
      if (k === 'fold') { folded = !folded; draw(); } else if (k === 'next') { i++; draw(); } else if (k === 'stay') { seen(); on = false; draw(); }
      else { seen(); on = false; draw(); if (o.tutorial) o.exit(); } };
  };
  return {
    get on() { return on; },
    // called a few times a second: moves on when the step in hand has been done
    tick() { if (!on) return; const st = steps[i]; if (st.done && !st.last && st.done()) { i++; folded = false; o.audio.ready(); } draw(); },
    hide() { const e = $('th-coach'); if (e) e.hidden = true; },
  };
}
// whether a post's guide has been seen on this browser
export function guideSeen(key) { try { return !!localStorage.getItem(key); } catch { return false; } }
