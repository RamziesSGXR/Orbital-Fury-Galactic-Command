// (GC 0.69) The STORE tab: command credits (core/roster.js) spent on the Vanguard roster's roles and personalities, and the
// roster itself: four Vanguards, one for each group on the ground, each given a name, a role and a personality.
// Ship and base upgrades are still to come.
import { ROLES, PERSONAS, KIND, SLOTS, EARN, START, UPGRADES, roster, credits, owns, buy, assign, squad, fxLines, upLevel, buyUp } from './roster.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const num = (v) => Math.floor(v || 0).toLocaleString();
let sub = 'roster', pick = 0;
export const storeSub = (k) => { if (k) sub = k; return sub; };

// The Vanguards' names are the ground fight's own (its NAMES screen keeps them in ofs.names): one list, edited in either place.
const NAMES = 'ofs.names', MAX = 18;
const names = () => { try { const n = JSON.parse(localStorage.getItem(NAMES)) || {}; return { ships: SLOTS.map((_, i) => String((n.ships || [])[i] || '')), vg: SLOTS.map((_, i) => String((n.vg || n.hd || [])[i] || '')) }; } catch { return { ships: ['', '', '', ''], vg: ['', '', '', ''] }; } };
const clean = (s) => String(s || '').replace(/[^\w \-.'#]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX).toUpperCase();
function setName(i, v) { const n = names(); n.vg[i] = clean(v); try { localStorage.setItem(NAMES, JSON.stringify(n)); } catch { /* not kept */ } }

// little pictures for the roles and the acts (a 24-unit square, drawn in lines)
const P = {
  rifle: '<path d="M2 13h13l2-2h5v3h-4l-1 2h-3l-1 3h-3l1-3H2z"/><path d="M8 13v-2h4"/>',
  scope: '<circle cx="12" cy="12" r="7"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/><circle cx="12" cy="12" r="1.2"/>',
  mg: '<path d="M1 11h15l2-2h5v3h-5l-2 2H5"/><path d="M7 14l-3 6M10 14l3 6"/><path d="M15 12c0 3 2 5 5 5"/>',
  medic: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  charge: '<rect x="4" y="9" width="12" height="11" rx="1"/><path d="M7 9V6h6v3M16 13h3l2-4"/><path d="M21 5l1-2M22 8h1.5"/>',
  eye: '<path d="M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7S5 17 2 12z"/><circle cx="12" cy="12" r="3"/>',
  none: '<circle cx="12" cy="9" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/>',
  star: '<path d="M12 2l3 7h7l-5.5 4.5 2 7.5L12 16.5 5.5 21l2-7.5L2 9h7z"/>',
  shield: '<path d="M12 2l8 3v6c0 6-4 9-8 11-4-2-8-5-8-11V5z"/><path d="M8 12h8"/>',
  heart: '<path d="M12 21C5 16 2 12 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 4-3 8-10 13z"/>',
  crate: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  mic: '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10c0 4 3 6 7 6s7-2 7-6M12 16v5M8 21h8"/>',
  flag: '<path d="M5 22V3"/><path d="M5 4h13l-3 4 3 4H5"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.8-1-2-1.5-3.2-1.5-1.8 0-3 .9-3 2.3 0 3.2 6.4 1.8 6.4 5 0 1.4-1.3 2.4-3.2 2.4-1.3 0-2.6-.5-3.4-1.6M12 5v2M12 17v2"/>',
  pod: '<path d="M8 3h8l2 6v7l-6 5-6-5V9z"/><path d="M6 9h12M10 13h4"/>',
  doc: '<path d="M6 2h9l4 4v16H6z"/><path d="M15 2v4h4M9 11h7M9 15h7M9 19h4"/>',
  tower: '<path d="M12 9v13M8 22l4-13 4 13M9.5 16h5"/><path d="M8.5 5.5a5 5 0 0 1 7 0M6 3a8.5 8.5 0 0 1 12 0"/><circle cx="12" cy="8.5" r="1"/>',
  dock: '<circle cx="12" cy="12" r="3"/><path d="M12 2v7M12 15v7M2 12h7M15 12h7"/><rect x="9" y="1" width="6" height="3"/><rect x="9" y="20" width="6" height="3"/>',
};
const pic = (k, cls = '') => `<svg class="sico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[k] || P.none}</svg>`;
const fxList = (fx, max = 9) => { const L = fxLines(fx); return L.length ? `<ul class="sfx">${L.slice(0, max).map(([t, good]) => `<li class="${good ? 'up' : 'dn'}">${esc(t)}</li>`).join('')}</ul>` : '<ul class="sfx"><li class="nil">The standard Vanguard</li></ul>'; };

export function pageStore() {
  const c = credits(), subs = [['roster', 'ROSTER'], ['role', 'ROLES'], ['persona', 'PERSONALITIES'], ['upgrades', 'UPGRADES']];
  const top = `<div class="sttop"><div class="osub">${subs.map(([k, n]) => `<button class="${sub === k ? 'on' : ''}" data-st="sub" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="stbal" title="Earned in every game; ${num(c.spent)} spent so far"><i>COMMAND CREDITS</i><b id="st-bal">${num(c.bal)}</b></div></div>`;
  return `<div class="stp st-${sub}">${top}${sub === 'roster' ? pageRoster() : sub === 'upgrades' ? pageUpgrades() : pageShelf(sub)}</div>`;
}

// ROSTER: the four, and what the one picked carries
function pageRoster() {
  const r = roster(), sq = squad(r), nm = names();
  pick = Math.max(0, Math.min(3, pick));
  const cards = SLOTS.map((L, i) => {
    const s = r.slots[i], R = ROLES[s.role], Pe = PERSONAS[s.persona];
    return `<div class="vcard${i === pick ? ' on' : ''}" data-st="slot" data-i="${i}" role="button" tabindex="0"><div class="vtop"><b class="vlet">${L}</b>${pic(R.icon, 'big')}</div>
      <input class="vname" data-i="${i}" maxlength="${MAX}" placeholder="VANGUARD ${L}" value="${esc(nm.vg[i])}" aria-label="Vanguard ${L}'s name" spellcheck="false">
      <em>${esc(R.name)}</em><span>${s.persona === 'none' ? 'No act' : esc(Pe.name)}</span></div>`;
  }).join('');
  const s = r.slots[pick];
  const row = (kind) => Object.entries(KIND[kind]).map(([id, d]) => {
    const own = owns(kind, id, r), on = s[kind] === id;
    return own ? `<button class="chip${on ? ' on' : ''}" data-st="give" data-kind="${kind}" data-id="${id}" title="${esc(d.line)}">${pic(d.icon)}<b>${esc(d.name)}</b></button>`
      : `<button class="chip lock buy" data-st="shop" data-kind="${kind}" data-id="${id}" title="Buy it on the ${kind === 'role' ? 'ROLES' : 'PERSONALITIES'} tab">${pic(d.icon)}<b>${esc(d.name)}</b><small>${num(d.cost)}</small></button>`;
  }).join('');
  const R = ROLES[s.role], Pe = PERSONAS[s.persona];
  return `<div class="crow stro">${'<section class="tpan"><h3>Your Vanguards</h3>'}<p class="soon">One Vanguard leads each group on the ground. Give each a name, a role and an act for the cameras; a replacement takes over the same ones.</p>
      <div class="vgrid">${cards}</div>
      <div class="vpick"><i>ROLE</i><div class="chips">${row('role')}</div><i>PERSONALITY</i><div class="chips">${row('persona')}</div></div></section>
    <section class="tpan cdet stdet"><h3>Vanguard ${SLOTS[pick]}</h3><div class="cart" id="st-art"></div>
      <b class="sdn">${esc(nm.vg[pick] || 'Vanguard ' + SLOTS[pick])}</b><small class="sds">${esc(R.name)}${s.persona !== 'none' ? ' · ' + esc(Pe.name) : ''}</small>
      <p>${esc(R.line)}${s.persona !== 'none' ? ' ' + esc(Pe.line) : ''}</p>${fxList(sq[pick].fx)}</section></div>`;
}

// ROLES and PERSONALITIES: everything there is, what it does and what it costs
function pageShelf(kind) {
  const r = roster(), c = credits(), all = Object.entries(KIND[kind]);
  const who = (id) => SLOTS.filter((_, i) => r.slots[i][kind] === id);
  const cards = all.map(([id, d]) => {
    const own = owns(kind, id, r), w = who(id), can = c.bal >= d.cost;
    const foot = own ? `<span class="sown">${d.cost ? 'OWNED' : 'STANDARD'}${w.length ? ` · ${w.join(' ')}` : ''}</span>`
      : `<button class="plate btn sm${can ? ' go' : ''}" data-st="buy" data-kind="${kind}" data-id="${id}"${can ? '' : ' disabled'}>BUY · ${num(d.cost)}</button>`;
    return `<div class="sitem${own ? ' own' : ''}">${pic(d.icon, 'big')}<b>${esc(d.name)}</b><p>${esc(d.line)}</p>${fxList(d.fx, 5)}<div class="sfoot">${foot}</div></div>`;
  }).join('');
  const earn = EARN.map(([, per, what]) => `<span><b>${per < 1 ? Math.round(per * 20) : per}</b> ${what}</span>`).join(' ');
  return `<section class="tpan stshelf"><h3>${kind === 'role' ? 'Roles' : 'Personalities'}</h3><p class="soon">${kind === 'role' ? 'What a Vanguard carries and how they fight. Bought once, given to any of the four on ROSTER.' : 'The act a Vanguard puts on for the cameras. The viewers follow the act; some acts change the fight too. Bought once, given to any of the four on ROSTER.'}</p>
    <div class="sgrid ${kind}">${cards}</div>
    <p class="searn"><i>EARNED IN EVERY GAME</i> ${earn} <span><b>${num(START)}</b> to start with</span></p></section>`;
}

function pageUpgrades() {
  const r = roster(), c = credits();
  const cards = Object.entries(UPGRADES).map(([id, u]) => {
    const n = upLevel(id, r), max = u.costs.length, full = n >= max, cost = full ? 0 : u.costs[n], can = !full && c.bal >= cost;
    const pips = u.costs.map((_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
    const now = n ? `<li class="up">${esc(u.say(n))}</li>` : '<li class="nil">Not bought yet</li>';
    const next = full ? '' : `<li class="nx">Next: ${esc(u.say(n + 1))}</li>`;
    const foot = full ? '<span class="sown">ALL LEVELS</span>' : `<button class="plate btn sm${can ? ' go' : ''}" data-st="up" data-id="${id}"${can ? '' : ' disabled'}>${n ? 'LEVEL ' + (n + 1) : 'BUY'} · ${num(cost)}</button>`;
    return `<div class="sitem${n ? ' own' : ''}">${pic(u.icon, 'big')}<b>${esc(u.name)}<em>${u.where}</em></b><p>${esc(u.line)}</p><ul class="sfx">${now}${next}</ul><div class="sfoot"><span class="pips">${pips}</span>${foot}</div></div>`;
  }).join('');
  const earn = EARN.map(([, per, what]) => `<span><b>${per < 1 ? Math.round(per * 20) : per}</b> ${what}</span>`).join(' ');
  return `<section class="tpan stshelf"><h3>Upgrades</h3><p class="soon">Kept for good, a level at a time. Each carries into one of the games: a campaign, a base or a station started after it was bought, and every fight on the ground.</p>
    <div class="sgrid role">${cards}</div>
    <p class="searn"><i>EARNED IN EVERY GAME</i> ${earn} <span><b>${num(START)}</b> to start with</span></p></section>`;
}

// the picture of the Vanguard picked, drawn once the page is on screen
export function storeArt(root) {
  const box = root.querySelector('#st-art');
  if (box) import('./lineart.js').then(({ showArt }) => showArt(box, { model: 'vanguard' })).then((ok) => { if (!ok) box.classList.add('empty'); }).catch(() => box.classList.add('empty'));
}

export function bindStore(page, { redraw, audio = null, toast = () => {} }) {
  const root = page.querySelector('.stp'); if (!root) return;
  const click = () => audio && audio.click && audio.click();
  storeArt(root);
  root.addEventListener('click', (e) => {
    if (e.target.closest('input')) return;
    const b = e.target.closest('[data-st]'); if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.st === 'sub') { sub = d.k; click(); return redraw(); }
    if (d.st === 'slot') { if (pick !== +d.i) { pick = +d.i; click(); redraw(); } return; }
    if (d.st === 'give') { assign(pick, d.kind, d.id); click(); return redraw(); }
    if (d.st === 'shop') { sub = d.kind; click(); return redraw(); }
    if (d.st === 'up') {
      const u = UPGRADES[d.id];
      if (buyUp(d.id)) { if (audio && audio.objective) audio.objective(); else click(); toast(`${u.name}: level ${upLevel(d.id)}`); }
      else toast('Not enough command credits yet');
      return redraw();
    }
    if (d.st === 'buy') {
      const k = KIND[d.kind][d.id];
      if (buy(d.kind, d.id)) { if (audio && audio.objective) audio.objective(); else click(); toast(`${k.name} bought: give it to a Vanguard on ROSTER`); }
      else toast('Not enough command credits yet');
      return redraw();
    }
  });
  root.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.vcard[role=button]')) { e.preventDefault(); e.target.click(); } });
  for (const inp of root.querySelectorAll('input.vname')) {
    inp.addEventListener('focus', () => { const i = +inp.dataset.i; if (pick !== i) { pick = i; for (const c of root.querySelectorAll('.vcard')) c.classList.toggle('on', +c.dataset.i === i); } });
    inp.addEventListener('input', () => { const p = inp.selectionStart; inp.value = inp.value.toUpperCase(); try { inp.setSelectionRange(p, p); } catch { /* fine */ } });
    inp.addEventListener('change', () => { setName(+inp.dataset.i, inp.value); inp.value = clean(inp.value); redraw(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); e.stopPropagation(); });
  }
}
