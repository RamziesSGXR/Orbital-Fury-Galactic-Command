// (GC 0.76) THE STATION'S PANELS, brought over from Super Orbital Simulator (its main.js, 0.11.7), which Orbital Commander had
// lost when the station came into Galactic Command: the player had the parts and the desk, but no way to see why anything
// happened or to give an order. Ramzies: "the new one has less features … it is confusing to play".
//   COMMS (C)      every channel's messages, typed out as they come in, kept to scroll back through
//   COMMANDER (O)  the accounts first (the colonist tax, what is asked of you, where every credit, crate, watt and point of
//                  morale comes from and goes), then each division: its weekly allotment, its standing orders, its mood, what it
//                  wants, its people by name
//   UPGRADES (U)   the path, tier by tier: what each needs and what it opens
//   the readouts   hover a number on the top bar for where it comes from; click it for the full accounts
//   bubbles        people near the camera say something now and then
// The words are Galactic Command's (the Head Office, Brand Officers, the Publicity Office). Works the same alone and in the war.
import { C } from '../orbit/config.js';
import { partIcon } from '../orbit/parts.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
export const ROLE = { hauler: 'haulers', engineer: 'engineers', officer: 'officers', medic: 'medics', aide: 'aides', scientist: 'scientists', gunner: 'gunners' };
export const ROLE_ONE = { hauler: 'Hauler', engineer: 'Engineer', officer: 'Brand Officer', medic: 'Medic', aide: 'Aide', scientist: 'Scientist', gunner: 'Gunner', resident: 'Resident' };
const PLACES = { hauler: 'Cargo Stores, Cargo Racks and Station Command', engineer: 'Workshops', officer: 'Security Offices', medic: 'Medbays', aide: 'Brass Suites', scientist: 'Laboratories', gunner: 'Gun Crew Rooms, Barrack Rooms, pads and racks' };
const ORDER_NAMES = { rations: 'RATIONS', shift: 'SHIFTS', plan: 'MAINTENANCE PLAN', checks: 'SHIP INSPECTIONS', care: 'MEDICAL CARE', mix: 'TRAFFIC MIX', rate: 'TRAFFIC VOLUME', broadcast: 'BROADCAST' };
// Radio channels: who is talking, in which colour, and how they sign off
const CH = {
  office: { n: 1, name: 'HEAD OFFICE', col: '#f5d547', off: ['Head Office out.', 'Keep it on brand.', ''] },
  traffic: { n: 2, name: 'TRAFFIC CONTROL', col: '#e6e6e6', off: ['Control out.', 'Keep the lanes clear.', ''] },
  colonists: { n: 7, name: 'CIVILIAN BAND', col: '#b9e6c8', off: ['', 'Thank you for your service.'] },
  captain: { n: 9, name: 'SHIP-TO-STATION', col: '#7fc8ff', off: ['Over.', 'Over and out.'] },
};
let n = 3; for (const k of ['supply', 'maintenance', 'security', 'truth', 'medical', 'command', 'science', 'gunnery']) if (C.div[k]) CH[k] = { n: n++, name: C.div[k].name.toUpperCase(), col: C.div[k].col, off: ['Out.', ''] };
const chOf = (k) => CH[k] || CH.office;
const WHO = (k) => chOf(k).name;
// What people say, in a bubble over their head, when the camera is close
const CHAT = {
  hauler: ['Mind your toes.', 'Another crate for the front.', 'Who labelled this?', 'Coffee first. Then crates.', 'This one rattles.'],
  engineer: ['It was like that when I got here.', 'Hand me the big wrench.', 'Hull is load-bearing. Mostly.', 'Who signed off on this weld?', 'Parts. I need parts.'],
  officer: ['Badge, please.', 'Move along.', 'Report off-brand activity.', 'I am watching that crate.', 'The brand never sleeps. Neither do I.'],
  medic: ['Next.', 'Take two and get back to work.', 'That will heal. Probably.', 'Wash your hands, colonist.', 'I need more medkits.'],
  aide: ['The admiral will notice that.', 'This corridor is a disgrace.', 'Has anyone seen the good cutlery?', 'Smile. There is an inspection.', 'File it in triplicate.'],
  gunner: ['Shot out.', 'Splash, over.', 'Who moved my ear defenders?', 'Danger close means close.', 'More shells. Always more shells.'],
  scientist: ['Fascinating.', 'That reading cannot be right.', 'Do not touch that.', 'The planet is doing something.', 'I will need a bigger dish.'],
  resident: ['Long queue at the mess again.', 'Lovely view of the war today.', 'Have you paid your contribution?', 'They moved the bar again.', 'I heard a rumour about the coffee.', 'My bunk hums.'],
};
const NUM = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const OUTCOME = { approved: 'APPROVED', denied: 'DENIED', expired: 'NO ANSWER', void: 'NO LONGER POSSIBLE' };
const clock = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
// the readouts on the top bar, by their label, and the section of the accounts each opens
export const READOUT = { CREDITS: 'credits', CAPABILITY: 'cap', POWER: 'power', PEOPLE: 'people', MORALE: 'morale', READY: 'ready', SHIPS: 'trade' };

export function makePanels(o) {
  const { audio, toast } = o, st = () => o.st(), view = () => o.view();
  let root = null, typing = [], cmType = null, facSig = '', upgHTML = '', div = 'ledger', commsOn = false, unread = 0, bubbles = [], chatT = 5, tipSec = null;
  const log = [], reqEls = new Map();

  function mount(stage) {
    if (root) return;
    root = document.createElement('div'); root.id = 'op';
    root.innerHTML = `<div id="op-dock">
        <button class="plate btn sm" data-pk="cmdr" title="Commander's channel: the accounts, the tax, the divisions' orders (O)">COMMANDER<em id="op-nreq"></em></button>
        <button class="plate btn sm" data-pk="upg" title="The upgrade path (U)">UPGRADES</button>
        <button class="plate btn sm" data-pk="comms" title="Station comms (C)">COMMS<em id="op-unread"></em></button></div>
      <div id="op-float" class="plate" hidden><button class="op-x" data-pk="close" aria-label="Close">×</button><div id="op-fh"></div><div id="op-body"></div></div>
      <div id="op-comms" class="plate" hidden><div class="op-ch"><b>STATION COMMS</b><span class="dim">all channels</span><button class="op-x" data-pk="comms" aria-label="Close">×</button></div><div id="op-list"></div></div>
      <div id="op-tip" hidden></div><div id="op-bub"></div>`;
    stage.appendChild(root);
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pk]'); if (b) { const k = b.dataset.pk; if (k === 'cmdr') cmdr(); else if (k === 'upg') upg(); else if (k === 'comms') comms(!commsOn); else if (k === 'close') closeFloat(); return; }
      const t = e.target.closest('[data-dv]'); if (t) { div = t.dataset.dv; audio.click(); drawCmdr(); return; }
      const ob = e.target.closest('[data-o]'); if (ob) { const k = div; if (st().div[k].order[ob.dataset.o] === ob.dataset.v) return; st().setOrder(k, ob.dataset.o, ob.dataset.v); audio.click(); for (const x of root.querySelectorAll(`[data-o="${ob.dataset.o}"]`)) x.classList.toggle('on', x === ob); cmType = { el: $('op-rep'), full: st().report(k), i: 0 }; return; }
      const fa = e.target.closest('[data-fa]'); if (fa) { const r = st().answer(+fa.dataset.req, +fa.dataset.fa); if (r && r.ok === false) { audio.deny(); if (r.why) toast(r.why); } else audio.click(); facSig = ''; drawFac(); o.changed(); return; }
      const pp = e.target.closest('[data-pp]'); if (pp) { const a = st().agents.find((x) => x.id === +pp.dataset.pp); if (a) { o.pickPerson(a.id); view().lookAtAgent(a); } return; }
      const sec = e.target.closest('[data-sec]'); if (sec) { openLedger(sec.dataset.sec); }
    });
    // a way to raise morale that is an order, given on the spot (on press: the page redraws as numbers change)
    root.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-do]'); if (!b || !WAYS[b.dataset.do]) return; e.preventDefault(); const r = WAYS[b.dataset.do](); if (r && r.ok === false) { audio.deny(); toast(r.why); } else audio.click(); cmdrText(); });
    root.addEventListener('input', (e) => {
      if (e.target.id === 'op-tax') { st().setTax(+e.target.value); cmdrText(); }
      else if (e.target.id === 'op-allot') { st().setAllot(div, +e.target.value); cmdrText(); }
    });
  }
  function show(on) { if (root) root.hidden = !on; if (!on) { hideTip(); clearBubbles(); } }
  function reset() {
    typing = []; cmType = null; facSig = ''; upgHTML = ''; div = 'ledger'; unread = 0; reqEls.clear(); log.length = 0;
    $('op-list').innerHTML = ''; closeFloat(); comms(innerWidth >= 900, true); clearBubbles(); hideTip();
  }
  const WAYS = {
    tax: () => st().setTax(C.morale.taxFree), festival: () => st().celebrate(), amnesty: () => st().amnesty(), checks: () => st().setOrder('security', 'checks', 'every'),
    rations2: () => st().setOrder('supply', 'rations', 'double'), rations1: () => st().setOrder('supply', 'rations', 'normal'), shift: () => st().setOrder('supply', 'shift', 'normal'),
    care: () => st().setOrder('medical', 'care', 'free'), patriotic: () => st().setOrder('truth', 'broadcast', 'patriotic'),
  };

  // ---------------------------------------------------------------- comms
  function radio(from, text, opt = {}) {
    const ch = chOf(from), list = $('op-list'); if (!list) return;
    log.push(text); if (log.length > 400) log.shift();
    const el = document.createElement('div');
    el.className = `cm new${opt.warn ? ' warn' : ''}${opt.gold ? ' gold' : ''}${opt.dim ? ' dim' : ''}`; el.style.setProperty('--c', ch.col);
    const off = ch.off[Math.floor(Math.random() * ch.off.length)];
    el.innerHTML = `<div class="cmh"><b>CH ${ch.n} · ${esc(ch.name)}</b><time>${clock(st().t)}</time></div><div class="cmt"></div>${off ? `<div class="cms">${esc(off)}</div>` : ''}`;
    if (opt.request) { const bar = document.createElement('div'); bar.className = 'rq-bar'; bar.innerHTML = '<span class="rq-out wait">ON YOUR DESK</span>'; el.appendChild(bar); reqEls.set(opt.request, bar); }
    typing.push({ el: el.querySelector('.cmt'), wrap: el, full: text, i: 0 });
    const stick = list.scrollTop + list.clientHeight >= list.scrollHeight - 30;
    list.appendChild(el); while (list.children.length > 60) list.removeChild(list.firstChild);
    if (stick) list.scrollTop = list.scrollHeight;
    if (!commsOn) { unread++; $('op-unread').textContent = unread; }
    if (!opt.dim) audio.chirp();
    return commsOn;
  }
  function settled(e) { const bar = reqEls.get(e.id); if (bar) { bar.innerHTML = `<span class="rq-out ${e.outcome}">${esc(e.label || OUTCOME[e.outcome] || '')}</span>`; reqEls.delete(e.id); } }
  function typeTick(dt) {
    while (typing.length > 3) { const m = typing.shift(); m.el.textContent = m.full; m.wrap.classList.remove('new'); }
    for (let k = typing.length - 1; k >= 0; k--) {
      const m = typing[k]; m.i += dt * 70; const c = Math.min(m.full.length, Math.floor(m.i));
      m.el.textContent = m.full.slice(0, c) + (c < m.full.length ? '▌' : '');
      if (c >= m.full.length) { m.wrap.classList.remove('new'); typing.splice(k, 1); }
    }
    if (typing.length) { const l = $('op-list'); if (l.scrollTop + l.clientHeight >= l.scrollHeight - 60) l.scrollTop = l.scrollHeight; }
  }
  function comms(on, quiet) {
    commsOn = on; $('op-comms').hidden = !on; root.querySelector('[data-pk=comms]').classList.toggle('on', on);
    if (on) { unread = 0; $('op-unread').textContent = ''; const l = $('op-list'); l.scrollTop = l.scrollHeight; }
    if (!quiet) audio.click(); o.layout();
  }

  // ---------------------------------------------------------------- the floating panel: the Commander's channel or the upgrade path
  let floatK = null;
  function closeFloat() { floatK = null; if (!root) return; $('op-float').hidden = true; for (const b of root.querySelectorAll('#op-dock [data-pk]')) if (b.dataset.pk !== 'comms') b.classList.remove('on'); o.layout(); }
  function openFloat(k) { floatK = k; $('op-float').hidden = false; for (const b of root.querySelectorAll('#op-dock [data-pk]')) if (b.dataset.pk !== 'comms') b.classList.toggle('on', b.dataset.pk === k); o.layout(); }
  function cmdr(on = floatK !== 'cmdr') { audio.click(); if (!on) { closeFloat(); return; } openFloat('cmdr'); drawCmdr(); }
  function upg(on = floatK !== 'upg') { audio.click(); if (!on) { closeFloat(); return; } openFloat('upg'); upgHTML = ''; drawUpg(); }

  function drawCmdr() {
    const S = st();
    $('op-fh').innerHTML = `<b>COMMANDER'S CHANNEL</b><span class="dim">orders and the accounts</span>`;
    const tabs = [`<button class="dt${div === 'ledger' ? ' on' : ''}" style="--c:#f5d547" data-dv="ledger">ACCOUNTS<small id="dt-ledger"></small></button>`]
      .concat(C.divOrder.map((k) => `<button class="dt${k === div ? ' on' : ''}" style="--c:${C.div[k].col}" data-dv="${k}">${C.div[k].short}<small id="dt-${k}"></small></button>`)).join('');
    let h = `<div class="cm-g"><div class="cm-tabs">${tabs}</div><div class="cm-main" id="op-main">`;
    if (div === 'ledger') {
      h += `<div class="dh" style="--c:#f5d547"><b>THE STATION'S ACCOUNTS</b></div>`
        + `<div class="brow"><span class="bl">VICTORY CONTRIBUTION · THE COLONIST TAX</span><span class="bv" id="bv-tax"></span><input id="op-tax" type="range" min="0" max="30" step="1" value="${S.tax}"><span class="bn" id="bn-tax"></span></div><div class="lg" id="op-lg"></div>`;
      cmType = null;
    } else {
      const k = div, d = C.div[k], dv = S.div[k];
      h += `<div class="dh" style="--c:${d.col}"><b>${esc(d.name.toUpperCase())}</b></div><div class="rep" id="op-rep"></div><div id="op-fac"></div>`;
      if (d.uses) h += `<div class="brow"><span class="bl">WEEKLY ALLOTMENT · ${C.supplies[d.uses].name.toUpperCase()}</span><span class="bv" id="op-bv"></span><input id="op-allot" type="range" min="0" max="${C.allotMax}" step="1" value="${dv.allot}"><span class="bn" id="op-bn"></span></div>`;
      if (k === 'supply') h += '<div class="stores" id="op-stores"></div>';
      if (k === 'gunnery') h += '<div class="plat" id="op-plat"></div>';
      for (const [od, opts] of Object.entries(d.orders || {})) h += `<div class="ord"><span class="ol">${ORDER_NAMES[od] || od.toUpperCase()}</span><div class="obs">${opts.map(([v, l]) => `<button type="button" class="plate btn sm ob${(dv.order[od] ?? opts[0][0]) === v ? ' on' : ''}" data-o="${od}" data-v="${v}">${esc(l)}</button>`).join('')}</div></div>`;
      cmType = { full: S.report(k), i: 0 };
    }
    $('op-body').innerHTML = h + '</div></div>'; facSig = '';
    if (cmType) cmType.el = $('op-rep');
    cmdrText(); drawFac();
  }
  function drawFac() {
    const box = $('op-fac'); if (!box) return;
    const S = st(), k = div, F = C.factions[k];
    if (!F) { box.innerHTML = ''; facSig = ''; return; }
    const crew = S.crew(k), req = S.requests.find((r) => r.k === k && r.kind !== 'dilemma'), shown = crew.slice(0, 8);
    const sig = `${k}|${req ? req.id : 0}|${shown.map((a) => a.id).join(',')}|${crew.length}`;
    if (sig !== facSig) {
      facSig = sig;
      box.innerHTML = `<div class="fac"><div class="fh"><b>${esc(F.who.toUpperCase())} · MOOD</b><span class="fs"></span></div><div class="fbar"><i></i></div>`
        + `<p class="fw"><b>Wants:</b> ${esc(F.wants)}</p><p class="fy"></p>`
        + (req ? `<div class="freq"><span>${esc(req.text)} <em class="ft"></em></span>${req.options.map((op, i) => `<button type="button" class="plate btn sm${i === 0 ? ' go' : ''}" data-req="${req.id}" data-fa="${i}">${esc(op)}</button>`).join('')}</div>` : '')
        + `<div class="crew"><b>${ROLE[C.div[k].staff].toUpperCase()} ON STATION (${crew.length})</b>${shown.map((a) => `<button type="button" class="pp" data-pp="${a.id}">${esc(a.name)}<small></small></button>`).join('')}${crew.length > shown.length ? `<em>+${crew.length - shown.length} more</em>` : ''}</div></div>`;
    }
    const sat = Math.round(S.sat[k]), cls = sat >= 65 ? 'ok' : sat >= C.faction.low ? 'mid' : 'bad';
    const fs = box.querySelector('.fs'); fs.textContent = sat; fs.className = `fs ${cls}`;
    box.querySelector('.fbar').className = `fbar ${cls}`; box.querySelector('.fbar i').style.width = `${sat}%`;
    box.querySelector('.fy').textContent = S.why[k] || '';
    if (req) box.querySelector('.ft').textContent = `${Math.max(0, Math.round(C.faction.ttl - req.t))} s left`;
    for (const b of box.querySelectorAll('.pp')) { const a = S.agents.find((x) => x.id === +b.dataset.pp); b.querySelector('small').textContent = a ? S.doing(a) : ''; }
  }
  function cmdrText() {
    if (floatK !== 'cmdr') return;
    const S = st();
    for (const k of C.divOrder) { const d = C.div[k], s = $(`dt-${k}`); if (s) s.textContent = d.staff ? `${S.staff[d.staff]}` : k === 'truth' ? (S.div.truth.order.broadcast === 'silence' ? 'off' : 'on') : S.div.traffic.order.rate; }
    const dl = $('dt-ledger'); if (dl) { const v = S.ledger().credits.net; dl.textContent = `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v))}`; dl.style.color = v < -0.5 ? 'var(--red)' : ''; }
    if (div === 'ledger') {
      const i = $('op-tax'); if (i) { const p = S.moraleParts(); if (document.activeElement !== i) i.value = S.tax; $('bv-tax').textContent = `${S.tax}%`; $('bn-tax').textContent = `+${Math.round(S.taxPerMin())} CR a minute from ${S.residents()} residents · morale ${p.tax >= 0 ? '+' : ''}${Math.round(p.tax)}. Up to ${C.morale.taxFree}% they do not mind; every point above costs ${C.morale.taxPenalty} morale.`; }
      const box = $('op-lg'); if (box) { const html = ledgerPage(); if (html !== box._html) { box._html = html; box.innerHTML = html; } }
      return;
    }
    const k = div, d = C.div[k], dv = S.div[k];
    if ($('op-bv')) {
      const r = d.staff, sup = C.supplies[d.uses], can = Math.floor(dv.allot / d.per);
      $('op-bv').textContent = `${dv.allot} ${sup.unit} a week`;
      $('op-bn').textContent = `${S.staff[r]} ${ROLE[r]} on duty at ${d.per} ${sup.unit} each a week · ${S.homes[r]} places in ${PLACES[r]} · ${Math.floor(S.stock[d.uses])} in the stores.`
        + (S.short[k] ? ' The stores are empty: they are going without.' : can > S.homes[r] ? ' More than the places need: build more places, or lower it.' : can < S.homes[r] ? ` Raise it to fill ${S.homes[r] - can} more.` : '');
    }
    if ($('op-stores')) $('op-stores').innerHTML = '<b>THE STORES</b>' + Object.entries(C.supplies).map(([t, Sp]) => { const need = S.weeklyNeed(t), have = Math.floor(S.stock[t]); return `<span class="${have < need / 7 ? 'bad' : have < need ? 'warn' : ''}"><i>${esc(Sp.name)}</i>${have}<small> · ${Math.round(need)} a week</small></span>`; }).join('') + `<em>${S.weekIn} crates in so far this week, ${S.lastWeek.in} last week. Freighters bring more of whatever is short.</em>`;
    if ($('op-plat')) { const P = S.platform(); $('op-plat').innerHTML = `<b>THE PLATFORM · ${Math.round(P.ready * 100)}% READY</b>` + P.sys.map((x) => `<div class="ps${!x.open ? ' off' : x.n ? (x.ready > 0.8 ? ' ok' : x.ready > 0.4 ? ' mid' : ' bad') : ' none'}"><span>${esc(x.name)}</span><span class="pn">${x.n}/${x.max}</span><span class="pb"><i style="width:${Math.round(x.ready * 100)}%"></i></span><em>${esc(x.n && !x.why ? 'Ready' : x.why || '')}</em></div>`).join('') + `<em>Calls from the ground answered: ${S.stats.calls || 0}. Missed: ${S.stats.missed || 0}. Shells in the stores: ${Math.floor(S.stock.shells)}.</em>`; }
    if (!cmType) { const r = $('op-rep'); if (r) r.textContent = S.report(k); }
  }
  function cmTick(dt) {
    if (!cmType || !cmType.el) return;
    cmType.i += dt * 110; const c = Math.min(cmType.full.length, Math.floor(cmType.i));
    cmType.el.textContent = cmType.full.slice(0, c) + (c < cmType.full.length ? '▌' : ''); if (c >= cmType.full.length) cmType = null;
  }
  function openLedger(sec) {
    div = sec === 'ready' ? 'gunnery' : 'ledger'; hideTip(); openFloat('cmdr'); drawCmdr(); audio.click();
    const el = $(`lg-${sec}`); if (el) el.scrollIntoView({ block: 'start' });
  }

  // ---------------------------------------------------------------- the accounts
  const sgn = (x, d = 0) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(d).replace(/\.0$/, '')}`;
  const lrow = (label, val, cls = '', note = '') => `<div class="lr"><span>${label}${note ? `<small>${note}</small>` : ''}</span><b class="${cls}">${val}</b></div>`;
  const money = (x) => lrow(esc(x.label), `${sgn(x.v, Math.abs(x.v) < 10 ? 1 : 0)}`, x.v > 0.04 ? 'up' : x.v < -0.04 ? 'down' : 'dim', esc(x.note || ''));
  const days = (d) => (d === Infinity ? '—' : d < 1 ? 'under a day' : `${Math.round(d)} day${Math.round(d) === 1 ? '' : 's'}`);
  function ledgerSec(sec, L, full) {
    const S = st(), c = L.credits, cut = (xs, k) => (full ? xs : xs.slice(0, k));
    if (sec === 'credits') {
      return `<b class="lh">CREDITS · ${Math.round(c.now).toLocaleString('en-US')} CR<i class="${c.net >= 0 ? 'up' : 'down'}">${sgn(c.net)} a minute</i></b>`
        + `<div class="lsub">COMING IN, a minute</div>${cut(c.ins, 4).map(money).join('')}${lrow('<em>In</em>', sgn(c.income), 'up')}`
        + `<div class="lsub">GOING OUT, a minute${full ? ' · upkeep, biggest first' : ''}</div>${cut(c.outs, 4).map(money).join('')}${!full && c.outs.length > 4 ? lrow(`and ${c.outs.length - 4} more lines`, '', 'dim') : ''}${lrow('<em>Out</em>', sgn(c.spend), 'down')}`
        + `<div class="lnet ${c.net >= 0 ? 'up' : 'down'}">${c.net >= 0 ? `Gaining ${Math.round(c.net)} CR a minute.` : `Losing ${Math.round(-c.net)} CR a minute. ${c.now <= 0 ? 'The station is in debt: morale −15 until it is not.' : `At this rate the credits run out in ${days(c.runway)}.`}`}</div>`
        + (c.idle.n ? `<p class="warn">${c.idle.n} part${c.idle.n > 1 ? 's stand' : ' stands'} empty or broken and still cost${c.idle.n > 1 ? '' : 's'} ${Math.round(c.idle.v)} CR a minute.</p>` : '')
        + (full ? `<p>Spent on building so far: ${Math.round(c.built).toLocaleString('en-US')} CR. Earned from trade so far: ${Math.round(c.traded).toLocaleString('en-US')} CR.</p>` : '');
    }
    if (sec === 'power') {
      const p = L.power;
      return `<b class="lh">POWER · ${p.demand} used of ${p.supply} made<i class="${p.eff < 1 ? 'down' : 'up'}">${p.eff < 1 ? `running at ${Math.round(p.eff * 100)}%` : `${p.supply - p.demand} spare`}</i></b>`
        + `<div class="lsub">MADE BY</div>${cut(p.make, 4).map((x) => lrow(esc(x.label), sgn(x.v), x.v ? 'up' : 'down')).join('') || lrow('Nothing', '0', 'down')}`
        + `<div class="lsub">USED BY</div>${cut(p.use, 5).map((x) => lrow(esc(x.label), sgn(x.v), 'down')).join('')}${!full && p.use.length > 5 ? lrow(`and ${p.use.length - 5} more`, '', 'dim') : ''}`
        + (p.eff < 1 ? '<p class="warn">Short of power, everything works slower and morale falls. Build a Solar Array or a Reactor Core.</p>' : '');
    }
    if (sec === 'people') {
      const p = L.people;
      return `<b class="lh">PEOPLE · ${p.residents} residents in ${p.beds} beds<i class="${p.free ? 'up' : 'dim'}">${p.free} free</i></b><p>${p.leaving ? '<span class="down">Morale is so low that residents are leaving.</span> ' : ''}${esc(p.why)}</p>`
        + `<div class="lsub">STAFF ON DUTY, of the places built for them</div>${p.staff.filter((x) => full || x.places).map((x) => lrow(WHO(x.k), `${x.on} / ${x.places}`, x.places && !x.on ? 'down' : x.on < x.places ? 'warn' : 'up')).join('')}`
        + (full ? '<p>Staff are kept by weekly supplies, not credits: each division\'s page sets how many it keeps on duty.</p>' : '');
    }
    if (sec === 'morale') {
      const m = L.morale, Sm = C.ships.shuttleMorale, lv = C.morale.leaveBelow;
      let chart = '';
      if (m.log.length > 1) {
        const W = 300, H = 46, k = m.log.length, X = (i) => (i / (k - 1) * W).toFixed(1), Y = (v) => (H - Math.max(0, Math.min(100, v)) / 100 * H).toFixed(1);
        chart = `<svg class="mlog" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${Y(Sm)}" y2="${Y(Sm)}" class="l1"/><line x1="0" x2="${W}" y1="${Y(lv)}" y2="${Y(lv)}" class="l2"/><polyline points="${m.log.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}"/></svg>`
          + `<div class="mkey"><span>${Math.round(k / 4)} day${Math.round(k / 4) === 1 ? '' : 's'} ago: ${m.log[0]}</span><span>lowest ${Math.min(...m.log)} · highest ${Math.max(...m.log)}</span><span>now ${Math.round(m.now)}</span></div>`;
      }
      const ways = (full ? m.ways : m.ways.slice(0, 3)).map((w) => `<div class="lr way"><span>${esc(w.label)}<small>${esc(w.cost)}</small></span><b class="up">+${Math.round(w.gain)}</b>${full ? (w.do ? `<button type="button" class="plate btn sm" data-do="${w.do}">DO IT</button>` : '<i></i>') : ''}</div>`).join('');
      return `<b class="lh">MORALE · ${Math.round(m.now)}<i class="${m.target >= m.now - 0.5 ? 'up' : 'down'}">${Math.abs(m.target - m.now) < 1.5 ? 'steady' : `${m.target > m.now ? 'rising' : 'falling'} towards ${Math.round(m.target)}`}</i></b>${full ? chart : ''}`
        + `<div class="lsub">WHAT MAKES IT UP</div>${m.lines.map((x) => lrow(esc(x.label), sgn(x.v), x.v >= 0 ? 'up' : 'down')).join('')}`
        + (ways ? `<div class="lsub">WAYS TO RAISE IT${full ? '' : ' · the quickest'}</div>${ways}` : '')
        + `<p>Below ${Sm} colonists stop coming. Below ${lv} residents leave.${full ? ' Morale moves towards its total a little at a time, so a change takes a day or so to show.' : ''}</p>`;
    }
    if (sec === 'stores') {
      const s = L.stores;
      return `<b class="lh">THE STORES · ${Math.round(s.need)} crates needed a week<i class="${s.lastWeek >= s.need ? 'up' : 'warn'}">${s.weekIn} in so far, ${s.lastWeek} last week</i></b>`
        + `<div class="lsub">IN THE STORES · USED A WEEK · LASTS</div>${s.supplies.filter((x) => full || x.need > 0).map((x) => lrow(esc(x.label), `${x.have} · ${Math.round(x.need)} · ${x.need > 0 ? days(x.days) : '—'}`, x.short || (x.need > 0 && x.days < 1) ? 'down' : x.need > 0 && x.days < 3 ? 'warn' : '', esc(x.by || ''))).join('')}`
        + `<p>${s.berths ? `${s.berths} berth${s.berths > 1 ? 's' : ''} for freighters and ${s.haulers} hauler${s.haulers === 1 ? '' : 's'} on duty bring it in. Freighters carry more of whatever is short.` : '<span class="down">No berth for freighters: nothing can come in.</span>'}</p>`;
    }
    if (sec === 'cap') {
      const k = L.cap;
      return `<b class="lh">CAPABILITY · ${k.now.toLocaleString('en-US')}<i>the score</i></b>${cut(k.lines, 5).map((x) => lrow(esc(x.label), sgn(x.v), 'up')).join('')}${lrow('The factions\' mood', `× ${k.mood.toFixed(2)}`, k.mood >= 1 ? 'up' : 'down')}`
        + (full ? '<p>What the station adds to the war effort. It opens the upgrade path.</p>' : '');
    }
    if (sec === 'ready') {
      const P = S.platform();
      return `<b class="lh">THE PLATFORM · ${Math.round(P.ready * 100)}% ready</b>${P.sys.filter((x) => x.open).map((x) => lrow(esc(x.name), x.n ? `${Math.round(x.ready * 100)}%` : 'not built', x.n ? (x.ready > 0.8 ? 'up' : x.ready > 0.4 ? 'warn' : 'down') : 'dim', x.n && !x.why ? '' : esc(x.why || ''))).join('')}`
        + `<p>Calls from the ground answered: ${S.stats.calls || 0}. Missed: ${S.stats.missed || 0}.</p>`;
    }
    if (sec === 'trade') {
      const T = L.trade, by = (k) => S.ships.filter((x) => x.state === k).length, shut = S._shut ? [...S._shut] : [], D = T.demand, rateK = C.ships.rate[S.div.traffic.order.rate];
      const repW = T.rep > 0.7 ? 'good' : T.rep > 0.4 ? 'fair' : 'poor';
      return `<b class="lh">TRADE · ${Math.round(D.total * rateK)} crates a minute asked for<i class="${T.price >= 1 ? 'up' : 'warn'}">${T.fee} CR a crate</i></b>`
        + `<div class="lsub">WHY FREIGHTERS COME, crates a minute</div>${lrow(`The sector's trade for a ${C.tiers[S.tier].name.toLowerCase()}`, D.base.toFixed(0))}${lrow(`Reputation: ${repW}`, `× ${D.repK.toFixed(2)}`, T.rep > 0.5 ? 'up' : 'down', 'ships served on time raise it; ships kept waiting or lost lower it')}${D.hub > 1.001 ? lrow('Spires and Operations Centres', `× ${D.hub.toFixed(2)}`, 'up') : ''}${D.runs ? lrow('Supply runs: the stores are short', `+${D.runs.toFixed(0)}`, 'up') : ''}${rateK !== 1 ? lrow(`Traffic Control: ${S.div.traffic.order.rate} traffic`, `× ${rateK}`, rateK > 1 ? 'warn' : 'dim') : ''}`
        + `<div class="lsub">THE PRICE OF A CRATE</div>${lrow('Crates taken in, a minute', T.supply.toFixed(1))}${lrow('Market price', `× ${T.price.toFixed(2)}`, T.price >= 1 ? 'up' : 'down', T.price < 0.95 ? 'more crates come in than the sector wants moved: each is worth less' : T.price > 1.05 ? 'fewer crates come in than the sector wants: each is worth more' : 'supply and demand are level')}`
        + `<div class="lsub">BERTHS</div>${lrow('For freighters · shuttles · warships', `${S.berths('freighter').length} · ${S.berths('shuttle').length} · ${S.berths('warship').length}`)}${lrow('Enough for this much trade', `about ${T.needBerths}`, T.berths.n >= T.needBerths ? 'up' : 'warn')}${lrow('Busy now · busy on average', `${T.berths.busy} · ${T.berths.occ.toFixed(1)}`)}${T.berths.spare ? lrow('More than the trade needs', `${T.berths.spare}`, T.berths.spare > 1 ? 'warn' : '', `each still costs ${C.parts.dockport.up} CR a minute`) : ''}${lrow('Waiting · coming in · docked', `${by('hold')} · ${by('approach')} · ${by('docked')}`)}${lrow('Served · lost', `${S.stats.ships} · ${S.stats.lost}`, S.stats.lost ? 'warn' : '')}`
        + shut.map(([id, w]) => `<p class="warn">${esc(S.name(S.parts.get(id)))} is shut: ${esc(w)} is across its approach.</p>`).join('')
        + T.notYet.map((x) => `<p class="warn">${esc(x.name)} takes no ships until a ${esc(x.room)} is fitted inside it.</p>`).join('')
        + (full ? '<p>More berths do not bring more ships. Ships come for the trade; berths serve them. A berth past what the trade needs stands idle and still costs upkeep.</p>' : '');
    }
    return '';
  }
  function asksHtml(max) {
    const A = st().asks(); if (!A.length) return '';
    return A.slice(0, max).map((a) => `<div class="ask${a.urgent ? ' urgent' : ''}"><i>${esc(WHO(a.from))}</i><b>${esc(a.text)}</b><span>${esc(a.why)}</span></div>`).join('') + (A.length > max ? `<div class="ask more">and ${A.length - max} more</div>` : '');
  }
  function ledgerPage() {
    const L = st().ledger(), asks = asksHtml(6);
    return (asks ? `<section id="lg-asks"><b class="lh">ASKED OF YOU<i>most pressing first</i></b>${asks}</section>` : '')
      + ['credits', 'trade', 'stores', 'power', 'people', 'morale', 'cap'].map((k) => `<section id="lg-${k}">${ledgerSec(k, L, true)}</section>`).join('');
  }

  // ---------------------------------------------------------------- the upgrade path
  function needsText(T) {
    const nd = T.needs || {}, out = [];
    if (nd.residents) out.push(`${nd.residents} residents`); if (nd.cap) out.push(`${nd.cap} capability`); if (nd.crates) out.push(`${nd.crates} crates traded`);
    if (nd.power) out.push(`${nd.power} power`); if (nd.morale) out.push(`morale ${nd.morale}`); if (nd.ready) out.push(`platform ${nd.ready}% ready`);
    for (const r of nd.rooms || []) out.push(`a ${C.rooms[r].name}`);
    return out.join(' · ');
  }
  function drawUpg() {
    if (floatK !== 'upg') return;
    const S = st(), nx = S.next();
    $('op-fh').innerHTML = `<b>UPGRADE PATH</b><span class="dim">the Head Office's charter, tier by tier</span>`;
    const h = C.tiers.map((T, i) => {
      const s = i < S.tier ? 'done' : i === S.tier ? 'now' : i === S.tier + 1 ? 'next' : 'later', label = { done: 'GRANTED', now: 'CURRENT', next: 'NEXT', later: 'LOCKED' }[s];
      const parts = Object.keys(C.parts).filter((t) => (C.parts[t].tier ?? -1) === i && !C.parts[t].fixed), rooms = C.roomOrder.filter((r) => C.rooms[r].tier === i);
      let req = '';
      if (s === 'next' && nx) req = `<div class="reqs">${nx.items.map((it) => `<div class="rq${it.ok ? ' ok' : ''}"><span>${esc(it.label)}</span><span>${Math.min(it.have, it.need)}/${it.need}</span><i style="width:${Math.min(100, it.have / it.need * 100)}%"></i></div>`).join('')}</div>`;
      else if (s === 'later') req = `<div class="rqt">Needs ${esc(needsText(T))}</div>`;
      return `<div class="tier ${s}"><div class="tn"><span class="tnum">${NUM[i] || i + 1}</span><b>${esc(T.name)}</b><em>${label}</em><span class="tz">BUILD ZONE ${T.radius}</span></div><p>${esc(T.about)}</p>${req}`
        + (parts.length || rooms.length ? `<div class="unl">${parts.map((t) => `<span class="up-p" title="${esc(C.parts[t].name)}">${partIcon(t)}<small>${esc(C.parts[t].name)}</small></span>`).join('')}${rooms.map((r) => `<span class="up-r" style="--c:${C.rooms[r].col}" title="${esc(C.rooms[r].about || '')}">${esc(C.rooms[r].name)}</span>`).join('')}</div>` : '') + '</div>';
    }).join('');
    if (h !== upgHTML) { upgHTML = h; $('op-body').innerHTML = `<div class="up-list">${h}</div>`; }
  }

  // ---------------------------------------------------------------- hover tips
  function tipAt(x, y, html, wide = false) {
    const t = $('op-tip'); t.innerHTML = html; t.hidden = false; t.classList.toggle('wide', wide);
    t.style.left = `${Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, x + 16))}px`; t.style.top = `${Math.max(8, Math.min(innerHeight - t.offsetHeight - 8, y + 18))}px`;
  }
  function hideTip() { const t = root && $('op-tip'); if (t) t.hidden = true; tipSec = null; }
  function readoutTip(sec, x, y) { tipSec = sec; tipSec_xy = [x, y]; tipAt(x, y, `<div class="lg">${ledgerSec(sec, st().ledger(), false)}<p class="dim">Click for the full accounts.</p></div>`, true); }
  let tipSec_xy = [0, 0];

  // ---------------------------------------------------------------- speech bubbles
  function clearBubbles() { for (const b of bubbles) b.el.remove(); bubbles = []; }
  function bubbleTick(dt, now) {
    const V = view(), S = st();
    if (!V || !V.figOn) { if (bubbles.length) clearBubbles(); return; }
    if ((chatT -= dt) <= 0) {
      chatT = 4 + Math.random() * 5;
      const near = S.agents.filter((a) => !a.eva && !bubbles.some((b) => b.id === a.id)).map((a) => ({ a, s: V.agentScreen(a, now) })).filter((x) => x.s && x.s.d < 26 && x.s.x > 60 && x.s.x < innerWidth - 60 && x.s.y > 90 && x.s.y < innerHeight - 220);
      if (near.length) {
        const { a } = near[Math.floor(Math.random() * near.length)], pool = CHAT[a.role] || CHAT.resident, k = C.divOrder.find((d) => C.div[d].staff === a.role);
        const line = k && S.short[k] && Math.random() < 0.6 ? `We are out of ${C.supplies[C.div[k].uses].name.toLowerCase()}.` : k && S.sat[k] < C.faction.low && Math.random() < 0.5 ? 'Nobody asked us about any of this.' : pool[Math.floor(Math.random() * pool.length)];
        if (bubbles.length >= 3) { bubbles[0].el.remove(); bubbles.shift(); }
        const el = document.createElement('div'); el.className = 'bubble'; el.innerHTML = `<i>${esc(a.name)}</i>${esc(line)}`; $('op-bub').appendChild(el);
        bubbles.push({ id: a.id, el, t: 4.5 });
      }
    }
    for (const b of bubbles) {
      b.t -= dt; const a = S.agents.find((x) => x.id === b.id), s = a && V.agentScreen(a, now);
      if (!s || b.t <= 0) { b.el.remove(); b.dead = true; continue; }
      b.el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%) translateY(-14px)`; b.el.style.opacity = Math.min(1, b.t * 2);
    }
    bubbles = bubbles.filter((b) => !b.dead);
  }

  // ---------------------------------------------------------------- each frame, and every so often
  function tick(dt, now) { typeTick(dt); cmTick(dt); bubbleTick(dt, now); }
  function hud() {
    const S = st(); $('op-nreq').textContent = S.requests.length || '';
    if (floatK === 'cmdr') { cmdrText(); drawFac(); } else if (floatK === 'upg') drawUpg();
    if (tipSec) readoutTip(tipSec, ...tipSec_xy);
  }
  return { mount, show, reset, radio, settled, comms, cmdr, upg, openLedger, closeFloat, tick, hud, tipAt, hideTip, readoutTip, ledgerSec,
    get floatOpen() { return !!floatK; }, get commsOn() { return commsOn; }, refreshFac() { facSig = ''; drawFac(); } };
}
