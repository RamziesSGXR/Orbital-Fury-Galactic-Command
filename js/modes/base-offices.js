// (GC 0.82) THE OFFICES: FOB Commander's windows, from the standalone game (FOB Super Commander's Ministries), in this
// game's words. One window over the base, opened from the dock along the bottom, from the big numbers at the top or with
// the keys; eight tabs:
//   ECONOMY      the budget (where every supply and credit comes from and goes, a watch), the planet market (prices,
//                the three Office indices, trading in lots, offers from the other outfits' bases), the commitments to
//                each Office, loans and the overdraft, and what every kind of building earns or costs
//   DESK         the Offices' calls, requests from the base, and the roster review (read a file, give the grade)
//   DEFENCE      deployment orders, training, the base's defences, special operations (pick the rover or the tank,
//                SEND), squads in the field, after-action reports, medals and the fallen
//   EXPANSION    the charter and its terms, supply lines, the dropship's last bill, vehicles, food, the daily audit and
//                how far troops walk
//   PUBLICITY    the inspection: morale piece by piece, propaganda and condition
//   SCIENCE      the research tree and the labs
//   INTELLIGENCE what to do next, what is going wrong, what is owed and what is coming
//   STANDING     the outfits ranked, the allocation and the Bureau's ledger
// The standalone game's window scrolls; this one is laid out in columns to fit a desktop screen without scrolling, and
// keeps long lists to their latest few.
import { C, B, GOODS, GKEYS, TECH, TRAIN, VEHICLES, LOANS, COMMIT, MARKET, MIN } from '../base/config.js';
import { MKEYS, rankOf } from '../base/sim.js';
import { REQUESTS, CALLS, GRADES, fileOf } from '../base/desk.js';
import { logoCanvas } from '../base/logo.js';
import { words } from '../core/words.js';

const $ = (id) => document.getElementById(id);
// the tabs: key, name, the colour of its Office
export const OTABS = [['eco', 'ECONOMY', ''], ['led', 'DESK', ''], ['def', 'DEFENCE', 'c-def'], ['pro', 'EXPANSION', 'c-pro'], ['tru', 'PUBLICITY', 'c-tru'], ['sci', 'SCIENCE', 'c-sci'], ['int', 'INTELLIGENCE', ''], ['st', 'STANDING', '']];
const ETABS = [['budget', 'BUDGET'], ['market', 'MARKET'], ['commit', 'COMMITMENTS'], ['loans', 'LOANS'], ['prod', 'PRODUCTION']];
const IDXCOL = { def: '#ff6a4d', pro: '#f5d547', tru: '#7fe9e0' };
const IDX = { def: ['DEFENCE', 'moves ammo and rations'], pro: ['EXPANSION', 'moves supplies and fuel'], tru: ['PUBLICITY', 'moves the price of Publicity favour'] };
const GSHORT = (g) => (g === 'cr' ? 'CR' : g === 'sup' ? 'SUP' : MARKET.goods[g] ? MARKET.goods[g].short : g.toUpperCase());

// a 14-day line, for the tickers
function spark(hist, col, w = 96, h = 26) {
  if (!hist || hist.length < 2) return `<svg class="spark" width="${w}" height="${h}"></svg>`;
  const lo = Math.min(...hist), hi = Math.max(...hist), r = hi - lo || 1;
  const pts = hist.map((v, i) => `${(i / (hist.length - 1) * (w - 2) + 1).toFixed(1)},${(h - 2 - (v - lo) / r * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.5"/></svg>`;
}
const chg = (hist) => { const a = hist.at(-2) ?? hist.at(-1), b = hist.at(-1), d = (b - a) / (a || 1) * 100; return `<small class="${d > 0.5 ? 'up' : d < -0.5 ? 'down' : ''}">${d > 0 ? '▲' : d < 0 ? '▼' : ''}${Math.abs(d).toFixed(1)}%</small>`; };

// h: the interface's helpers (base-hud.js): fmt, esc, dur, calDay, OFFICE, CAT, MOR, CONDITION, ORDERS, warns(),
// moneyOf(b), roleOf(k), GOLD, flash(text), refresh()
export function makeOffices(o, h) {
  const { fmt, esc, dur, calDay } = h, sim = () => o.sim(), audio = o.audio;
  let tab = 'eco', eco = 'budget', tradeQ = 50, repOpen = null, lastGrade = null, sigT = '', sigB = '';
  const vPick = {}, logos = {};
  const el = () => $('fb-mins');
  const isOpen = () => !!el() && !el().hidden;
  const sec = (t, extra = '') => `<h3 class="oc-h">${t}${extra}</h3>`;
  const kv = (k, v, cls = '') => `<div class="kv"><span>${k}</span><b class="${cls}">${v}</b></div>`;
  const fine = (t) => `<p class="fine">${t}</p>`;
  const prog = (f) => `<div class="meter"><i style="width:${Math.max(0, Math.min(100, f * 100))}%;background:var(--amber)"></i></div>`;
  const logo = (lg) => { const k = JSON.stringify(lg || {}); if (!(k in logos)) { try { logos[k] = logoCanvas(lg, 40).toDataURL(); } catch { logos[k] = ''; } } return logos[k] ? `<img src="${logos[k]}" width="18" height="18" alt="">` : ''; };
  const head = (m) => { const s = sim(); return `<div class="oc-head"><div class="big c-${m}">${Math.round(s.stand[m])}</div><div><b class="c-${m}">${esc(MIN[m].name.toUpperCase())}</b><p>${esc(MIN[m].wants)} Standing drifts back toward ${C.STAND.rest} every day.</p></div></div>`; };
  const more = (n, where) => (n > 0 ? `<p class="fine">and ${n} more${where ? ' ' + where : ''}</p>` : '');

  // ---------------------------------------------------------------- ECONOMY
  // income against spending, a watch, as two stacked bars and the list beside them
  function budget(ob, net, label) {
    const ks = Object.keys(ob).filter((k) => Math.abs(ob[k]) >= 0.5), inc = ks.filter((k) => ob[k] > 0).sort((a, b) => ob[b] - ob[a]), out = ks.filter((k) => ob[k] < 0).sort((a, b) => ob[a] - ob[b]);
    const tin = inc.reduce((a, k) => a + ob[k], 0), tout = -out.reduce((a, k) => a + ob[k], 0), top = Math.max(tin, tout, 1);
    const G = ['#3fe07a', '#2fb565', '#7cf0a4', '#1f8a4c', '#a8f5c6'], R = ['#ff6a4d', '#d4482f', '#ff9a85', '#a83420', '#ffc0b3'];
    const bar = (list, cols) => `<div class="bb">${list.map((k, i) => `<i style="height:${Math.abs(ob[k]) / top * 100}%;background:${cols[i % 5]}" title="${esc(h.CAT[k] || k)}: ${fmt(ob[k])}"></i>`).join('')}</div>`;
    const row = (k, i, cols) => `<tr><td><i class="sw" style="background:${cols[i % 5]}"></i>${esc(h.CAT[k] || k)}</td><td class="${ob[k] < 0 ? 'down' : 'up'}">${ob[k] > 0 ? '+' : ''}${fmt(ob[k])}</td></tr>`;
    return `<div class="budget"><div class="bchart">${bar(inc, G)}${bar(out, R)}</div><table class="acct"><tr><td><b>${label} IN</b></td><td class="up"><b>+${fmt(tin)}</b></td></tr>${inc.map((k, i) => row(k, i, G)).join('')}
      <tr><td><b>${label} OUT</b></td><td class="down"><b>−${fmt(tout)}</b></td></tr>${out.map((k, i) => row(k, i, R)).join('')}
      <tr class="net"><td><b>NET A WATCH</b></td><td class="${net < 0 ? 'down' : 'up'}"><b>${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}</b></td></tr></table></div>`;
  }
  function pageEco(s) {
    let x = `<div class="subtabs">${ETABS.map(([k, n]) => `<button class="plate btn sm${eco === k ? ' on' : ''}" data-et="${k}">${n}</button>`).join('')}</div>`;
    if (eco === 'budget') {
      const r = s.rates();
      x += fine(`A watch, averaged over the last ${r.days} watch${r.days > 1 ? 'es' : ''}; a day is ${Math.round(C.WEEK / C.DAY)} watches. Daily items (the allocation, loan payments) are spread across the day's watches.`);
      x += `<div class="oc-2"><div>${sec('SUPPLIES')}${budget(r.sup, r.supNet, 'SUPPLIES')}</div><div>${sec('CREDITS')}${budget(r.cr, r.crNet, 'CREDITS')}</div></div>`;
      x += fine(`<b>More supplies:</b> rank higher for a bigger allocation (${fmt(s.lastAlloc || 0)} last time), ship trained troopers (${C.DEPLOY_PAY} each), win operations, grade files, answer calls, or buy on the MARKET. <b>More credits:</b> ship troopers (${C.DEPLOY_CR} each, half again for grade A), run operations, open franchises, sell surplus on the market. <b>Spending less:</b> PRODUCTION shows what every kind of building earns or costs; a building's card shows its own.`);
    } else if (eco === 'market') {
      const M = s.market;
      x += fine(`Every outfit's base on ${esc(s.planet || 'the planet')} trades here. Prices move each watch with the three Office indices (how hard every base is chasing each Office's favour) and with what you buy and sell: the more at once, the further the price moves against you. You buy at the higher price and sell at the lower.`);
      x += `<div class="tickers">${MKEYS.map((m) => { const I = M.idx[m]; return `<div class="tk"><b class="c-${m}">${IDX[m][0]} INDEX</b><span class="v">${Math.round(I.v)} ${chg(I.hist)}</span>${spark(I.hist, IDXCOL[m])}<span class="fine">${IDX[m][1]}</span></div>`; }).join('')}</div>`;
      if (M.shocks.length) x += `<p class="warn">${M.shocks.map((q) => `Until day ${calDay(q.until)}: ${esc(q.text)}`).join('<br>')}</p>`;
      x += `<div class="oc-2"><div><div class="qsel"><span>TRADE IN LOTS OF</span>${[10, 50, 100, 250].map((q) => `<button class="plate btn sm${tradeQ === q ? ' on' : ''}" data-tq="${q}">${q}</button>`).join('')}</div>`;
      x += `<table class="mkt"><tr><th>GOOD</th><th>PRICE /10</th><th>14 DAYS</th><th>HELD</th><th>ROOM</th><th></th></tr>` + Object.keys(MARKET.goods).map((g) => {
        const G = M.goods[g], d = MARKET.goods[g], buy = s.canTrade(g, tradeQ, true), sell = s.canTrade(g, tradeQ, false), room = s.room(g);
        return `<tr><td><b>${esc(d.name)}</b></td><td><span class="up" title="you sell at">${(s.sellAt(g) * 10).toFixed(1)}</span> / <span class="down" title="you buy at">${(s.buyAt(g) * 10).toFixed(1)}</span> ${chg(G.hist)}</td><td>${spark(G.hist, '#7fe9e0', 70, 20)}</td><td>${fmt(s.holding(g))}</td><td>${room === Infinity ? '—' : fmt(room)}</td>
          <td class="tbtn"><button class="plate btn sm" data-trade="${g}:1" ${buy.ok ? '' : 'disabled'} title="${esc(buy.ok ? `Buy ${tradeQ} for ${fmt(buy.cr)} CR` : buy.why || '')}">BUY −${fmt(s.quote(g, tradeQ, true))}</button><button class="plate btn sm" data-trade="${g}:0" ${sell.ok ? '' : 'disabled'} title="${esc(sell.ok ? `Sell ${tradeQ} for ${fmt(sell.cr)} CR` : sell.why || '')}">SELL +${fmt(s.quote(g, tradeQ, false))}</button></td></tr>`;
      }).join('') + `</table></div><div>${sec('OFFERS FROM OTHER BASES')}`;
      if (!M.offers.length) x += fine('None right now. The other bases post offers at 10:00 and 15:00: what they are short of, they pay over the market for; what they have too much of, they sell under it. Offers last two watches.');
      for (const of of M.offers.slice(0, 4)) {
        const d = MARKET.goods[of.g], ok = s.canTakeOffer(of), mk = (of.buys ? s.sellAt(of.g) : s.buyAt(of.g)) * 10;
        x += `<div class="card2"><div class="l"><b>${logo(of.logo)} ${esc(of.from)} ${of.buys ? 'WANTS' : 'SELLS'} ${of.n} ${esc(d.name.toUpperCase())}</b><span>${(of.p * 10).toFixed(1)} CR per 10 (the market ${of.buys ? 'pays' : 'charges'} ${mk.toFixed(1)}) · ${fmt(of.p * of.n)} CR in all · until day ${calDay(of.until)}${ok.ok ? '' : ` · <span class="warn">${esc(ok.why || '')}</span>`}</span></div><button class="plate btn sm" data-offer="${of.id}" ${ok.ok ? '' : 'disabled'}>${of.buys ? 'SELL TO THEM' : 'BUY FROM THEM'}</button></div>`;
      }
      x += more(M.offers.length - 4) + `</div></div>`;
    } else if (eco === 'commit') {
      x += fine('What the base gives each Office every watch, paid from your stores as the watch changes. Each level buys standing at today\'s index: when an Office\'s index is low its favour is cheap; when every base is chasing it, dear. No base can afford ALL OUT on everything: pick what to chase, and trade for what you are short of.');
      x += `<div class="oc-3">` + MKEYS.map((m) => {
        const lvl = s.commit[m] || 0, I = s.market.idx[m], cost = s.commitCost(m, lvl), gain = s.commitGain(m, lvl), paid = s.commitLast?.[m] ?? 1;
        const cval = Object.entries(cost).reduce((a, [g, n]) => a + (g === 'cr' ? n : n * s.price(g)), 0);
        const short = Object.keys(cost).filter((g) => (g === 'cr' ? s.credits + s.OD : s.holding(g)) < cost[g]).map((g) => (g === 'cr' ? 'credits' : g === 'sup' ? 'supplies' : MARKET.goods[g].name.toLowerCase()));
        return `<div class="cmt"><div class="cmt-h"><div class="big c-${m}">${Math.round(s.stand[m])}</div><div><b class="c-${m}">${esc(COMMIT[m].dept.toUpperCase())}</b><span>Index ${Math.round(I.v)} ${chg(I.hist)}</span></div></div>
          <p class="fine">${esc(COMMIT[m].perk)}</p><div class="lv">${COMMIT.levels.map((n, i) => `<button class="plate btn sm${i === lvl ? ' on' : ''}" data-commit="${m}:${i}">${n}</button>`).join('')}</div>
          ${kv('COSTS A WATCH', lvl ? Object.entries(cost).map(([g, n]) => `${fmt(n)} ${GSHORT(g)}`).join(' + ') : 'nothing')}${lvl ? kv('AT MARKET', `about ${fmt(cval)} CR`) : ''}
          ${kv('BUYS A WATCH', lvl ? `+${gain.toFixed(1)} standing` : `nothing; drifts to ${C.STAND.rest}`, `c-${m}`)}
          ${lvl && paid < 1 ? `<p class="${paid < 0.6 ? 'down' : 'warn'}">Last watch only ${Math.round(paid * 100)}% was paid${short.length ? `: short of ${short.join(', ')}` : ''}.</p>` : ''}</div>`;
      }).join('') + `</div>`;
      const tot = {}; for (const m of MKEYS) for (const [g, n] of Object.entries(s.commitCost(m))) tot[g] = (tot[g] || 0) + n;
      x += kv('ALL COMMITMENTS, A WATCH', Object.entries(tot).filter(([, n]) => n).map(([g, n]) => `${fmt(n)} ${GSHORT(g)}`).join(' + ') || 'nothing');
    } else if (eco === 'loans') {
      const debt = s.debt();
      x += `<div class="oc-2"><div>${sec('DEBT')}${kv('OWED TO THE BUREAU', `${fmt(debt)} CR`, debt > 0 ? 'warn' : 'up')}`;
      s.loans.forEach((l, i) => {
        const L = LOANS[l.k], rate = l.k === 'charter' && s.D && s.D.rate != null ? s.D.rate : L.rate;
        x += `<div class="card2"><div class="l"><b>${esc(L.name.toUpperCase())}</b><span>${fmt(l.bal)} CR owed · ${Math.round(rate * 1000) / 10}% a day · at least ${L.pay} CR taken each day${l.int ? ` · ${fmt(l.int)} CR interest so far` : ''}</span></div><div class="oc-btns"><button class="plate btn sm" data-repay="${i}:100" ${s.credits >= 1 ? '' : 'disabled'}>REPAY 100</button><button class="plate btn sm" data-repay="${i}:${Math.ceil(l.bal)}" ${s.credits >= l.bal ? '' : 'disabled'}>REPAY ALL</button></div></div>`;
      });
      if (!s.loans.length) x += fine('No loans. The Founding Charter is paid off.');
      if (s.credits < 0) x += `<p class="${s.credits < -s.OD ? 'down' : 'warn'}">Overdrawn by ${fmt(-s.credits)} CR: a ${Math.round(C.ODFEE * 100)}% fee each day. Past ${fmt(s.OD)} CR the colonist staff go unpaid, franchises stop trading and morale falls.</p>`;
      x += fine(`You landed on the Founding Charter: the Bureau paid for your start and takes its money back a little every day. Credits may run ${fmt(s.OD)} CR into overdraft. Repaying a loan in full earns Expansion standing.`) + `</div><div>${sec('BORROW')}`;
      for (const k of ['dev', 'quick']) { const L = LOANS[k]; x += `<div class="card2"><div class="l"><b>${esc(L.name.toUpperCase())}: ${fmt(L.amt)} CR</b><span>${esc(L.desc)} ${Math.round(L.rate * 1000) / 10}% a day, at least ${L.pay} CR a day.</span></div><button class="plate btn sm" data-borrow="${k}" ${s.canBorrow(k) ? '' : 'disabled'}>BORROW</button></div>`; }
      x += fine('One of each at a time, and only while the base\'s debt stays within what the Bureau will carry.') + `</div></div>`;
    } else if (eco === 'prod') {
      const by = {};
      for (const b of s.b) { if (!b.done || (B[b.type].fixed && b.type !== 'hq')) continue; const k = b.type; by[k] ||= { n: 0, v: 0, up: 0 }; by[k].n++; by[k].v += h.moneyOf(b); by[k].up += s.upkeepOf(b) / (C.WEEK / C.DAY); }
      let list = Object.entries(by).sort((a, b) => b[1].v - a[1].v), cut = 0;
      if (list.length > 16) { cut = list.length - 16; list = [...list.slice(0, 8), null, ...list.slice(-8)]; }
      x += `<div class="oc-2"><div>${sec('BUILDINGS')}<table class="acct"><tr><td><b>KIND</b></td><td><b>HOW MANY</b></td><td><b>UPKEEP /WATCH</b></td><td><b>NET /WATCH</b></td></tr>` + list.map((r) => (r ? `<tr><td><i class="sw" style="background:${h.GOLD[h.roleOf(r[0])] || '#9aa3a0'}"></i>${esc(B[r[0]].name)}</td><td>${r[1].n}</td><td>${fmt(r[1].up)}</td><td class="${r[1].v < 0 ? 'down' : 'up'}">${r[1].v >= 0 ? '+' : '−'}${fmt(Math.abs(r[1].v))}</td></tr>` : `<tr><td colspan="4" class="fine">… ${cut} more in between</td></tr>`)).join('') + `</table>`;
      x += fine('Counted in supplies a watch (a credit at the market price of supplies): earnings less upkeep, colonist wages and the goods it burns. Training and housing show as costs: what they bring in arrives through the pad, as troopers shipped.') + `</div>`;
      const u = s.usage();
      x += `<div>${sec('GOODS')}<table class="acct"><tr><td><b>GOOD</b></td><td><b>IN STORE</b></td><td><b>ON THE PAD</b></td><td><b>AT USE</b></td><td><b>USED /WATCH</b></td></tr>` + GKEYS.map((g) => `<tr><td><i class="sw" style="background:${GOODS[g].color}"></i>${esc(GOODS[g].name)}</td><td>${Math.floor(s.stored(g))} / ${Math.floor(s.storage(g))}</td><td>${Math.floor(s.onPad(g))}</td><td>${Math.floor(s.inUse(g))}</td><td>${Math.round(u[g])}</td></tr>`).join('') + `</table>`;
      x += fine('The morning dropship tops the stores up (tap the command post to say what it buys). More storage, bigger deliveries.') + `</div></div>`;
    }
    return x;
  }

  // ---------------------------------------------------------------- DESK
  function pageLed(s) {
    const calls = s.calls, files = s.toReview(), left = s.reviewsLeft();
    let c1 = sec('CALLS FROM THE OFFICES', calls.length ? ` · ${calls.length}` : '');
    if (!calls.length) c1 += fine('No calls open. The Offices ask for goods, supplies or credits every few watches. Set them aside and they go on the day; decline and standing and morale suffer.');
    for (const c of calls.slice(0, 3)) {
      const q = CALLS[c.k], have = s.have(c.g), short = have < c.n;
      c1 += `<div class="req"><i class="c-${q.m}">${h.OFFICE[q.m]} · DUE DAY ${calDay(c.due)} (${dur(Math.max(0, (c.due - s.time.day) * C.DAY))})</i><b>${esc(q.title)}: ${fmt(c.n)} ${c.g.toUpperCase()}</b><p>${esc(q.text)}</p>`
        + `<p class="${short ? 'warn' : 'up'}">You have ${fmt(have)}.${short ? ' Not enough yet.' : ''}</p>`
        + (c.acc ? `<p class="up">SET ASIDE: it goes on day ${calDay(c.due)} if you still have it then.</p>` : `<div class="tb-b"><button class="plate btn sm" data-call="${c.id}:1">SET IT ASIDE</button><button class="plate btn sm" data-call="${c.id}:0">DECLINE (−2)</button></div>`) + `</div>`;
    }
    c1 += more(calls.length - 3, 'on the task board');
    let c2 = sec('REQUESTS', s.desk.length ? ` · ${s.desk.length}` : '');
    if (!s.desk.length) c2 += fine('Nothing waiting. Requests arrive during duty hours, wait two watches, then file themselves, and people notice.');
    for (const r of s.desk.slice(0, 3)) {
      const q = REQUESTS[r.k];
      c2 += `<div class="req"><i>${esc(q.from.toUpperCase())} · ${dur(Math.max(0, r.due - s.t)).toUpperCase()} LEFT</i><b>${esc(q.title)}</b><p>${esc(q.text.replaceAll('NAME', r.name))}</p><div class="tb-b">`
        + q.opts.map((op, i) => `<button class="plate btn sm" data-dec="${r.id}:${i}" ${s.canDecide(r, i) ? '' : 'disabled'} title="${esc(fxText(op.fx))}">${esc(op.label)}</button>`).join('') + `</div></div>`;
    }
    c2 += more(s.desk.length - 3, 'on the task board');
    let c3 = sec('ROSTER REVIEW', ` · ${Math.max(0, left)} LEFT THIS WATCH`) + fine(`Read the file, give the grade the trooper has earned. A fair grade pays 8 supplies and 3 credits; a wild one is audited. A: outstanding on the range, the course and in conduct. B: solid. C: gets by. D: back to training. Missions and medals count for a lot. Head Office takes ${C.REVIEWS_DAY} files a watch.`);
    if (lastGrade) c3 += `<p class="${lastGrade.off ? 'warn' : 'up'}">${esc(lastGrade.text)}</p>`;
    if (!files.length) c3 += fine(`No files waiting. A file comes up when a trooper finishes training, and again every ${C.REVIEW} watches.`);
    else if (left <= 0) c3 += fine(`${files.length} file${files.length > 1 ? 's' : ''} waiting for the next watch.`);
    for (const t of files.slice(0, left > 0 ? 2 : 0)) {
      const f = fileOf(t);
      c3 += `<div class="file"><div><b>${rankOf(t.missions)} ${esc(t.name)}</b>${t.grade ? ` <span>last graded ${t.grade}</span>` : ''}<br><span>RANGE</span> ${f.range} · <span>COURSE</span> ${f.course} · <span>MISSIONS</span> ${f.missions}${f.medals ? ` · <span>MEDALS</span> ${f.medals}` : ''}<br><span>CONDUCT</span> ${esc(f.conduct)}<br><span>NEXT OF KIN</span> <i>${esc(f.kin)}</i></div>`
        + `<div class="g">${GRADES.map((g) => `<button class="plate btn sm" data-grade="${t.id}:${g}">${g}</button>`).join('')}</div></div>`;
    }
    return `<div class="oc-3"><div>${c1}</div><div>${c2}</div><div>${c3}</div></div>`;
  }
  const fxText = (fx) => Object.entries(fx || {}).map(([k, v]) => ({ sup: `${v > 0 ? '+' : ''}${v} supplies`, cr: `${v > 0 ? '+' : ''}${v} credits`, mood: `morale ${v > 0 ? 'up' : 'down'}`, def: `Defence ${v > 0 ? '+' : ''}${v}`, pro: `Expansion ${v > 0 ? '+' : ''}${v}`, tru: `Publicity ${v > 0 ? '+' : ''}${v}`, pride: 'pride up', clean: 'latrines cleaned', heal: 'wounded mend faster' })[k]).filter(Boolean).join(', ') || 'no effect';

  // ---------------------------------------------------------------- DEFENCE
  function pageDef(s) {
    const home = s.troops.filter((t) => t.state !== 'patrol'), ready = home.filter((t) => t.train >= 100).length, rec = s.troops.filter((t) => t.train < 100), training = rec.filter((t) => t.at).length;
    const pads = s.b.filter((b) => b.done && B[b.type].pad).length;
    // the first column: orders and training, and the honours
    let c1 = sec('DEPLOYMENT ORDERS');
    if (!s.orders.length) c1 += fine('No orders open. The next comes with the day.');
    for (const od of s.orders.slice(0, 2)) c1 += `<div class="card2"><div class="l"><b>${od.n} TRAINED TROOPERS TO THE FRONT</b><span>${od.sent} shipped · due day ${calDay(od.due)} (${dur(Math.max(0, od.due - s.time.day) * C.DAY)} left) · +${C.DEPLOY_PAY} SUP each, +${od.def} DEF when complete</span>${prog(od.sent / od.n)}</div></div>`;
    c1 += fine(`Transports leave the landing pad at ${C.DEPLOY_AT}:00 every watch, ${s.padSeats() * pads} seats across your pads. They take trained troopers who are not crewing a building; the Patrol Office keeps its own squads back.`);
    c1 += sec('TRAINING') + kv('READY TO SHIP', ready) + kv('RECRUITS', `${rec.length} · ${training} training now`);
    { const w = s.troops.filter((t) => t.hurt > 0).length; if (w || s.has('medbay')) c1 += kv('WOUNDED', `${w}${s.wardBeds ? ` · ${s.wardBeds} ward beds` : ' · no Medical Bay'}`, w > s.wardBeds ? 'warn' : ''); }
    const places = s.b.filter((b) => b.done && B[b.type].slots);
    c1 += places.length ? places.slice(0, 3).map((b) => kv(esc(B[b.type].name.toUpperCase()), `${s.troops.filter((t) => t.at === b.id).length}/${s.cap(b, 'slots')}${TRAIN[B[b.type].train] ? ` · ${TRAIN[B[b.type].train]} an hour` : ''}`)).join('') + more(places.length - 3) : '<p class="warn">Nowhere to train. Build a Firing Range, an Obstacle Course or a Parade Ground (TRAINING).</p>';
    c1 += fine('Recruits train 08:00 to 20:00, except at lunch; 100 points makes a trooper. They come in on the morning dropship and fill empty bunks.');
    if (s.honours.length || s.fallen.length) c1 += `<div class="oc-2 tight">${s.honours.length ? `<div>${sec('MEDALS OF VALOUR')}<div class="list2">${s.honours.slice(-3).reverse().map((q) => `<div>${esc(q.rank)} ${esc(q.name)}</div>`).join('')}</div></div>` : '<div></div>'}${s.fallen.length ? `<div>${sec('THE FALLEN')}<div class="list2">${s.fallen.slice(-3).reverse().map((q) => `<div>${esc(q.rank)} ${esc(q.name)}</div>`).join('')}</div></div>` : ''}</div>`;
    // the second: the base's defences, the standing patrols and what came back
    let c2 = '';
    { const f = s.fort || s.fortify(), pc = (v) => Math.round((v || 0) * 100) + '%';
      c2 += sec('BASE DEFENCE') + kv('DEFENSIBILITY', f.closed ? `${f.score} / 100` : 'NO CLOSED WALL', !f.closed ? 'down' : f.score >= 60 ? 'up' : f.score < 40 ? 'down' : 'warn')
        + kv('WALL WATCHED', pc(f.cover)) + kv('WALL ARMED', pc(f.armed)) + kv('GATES MANNED', `${f.manned || 0} of ${f.gates || 0}`) + kv('COMMAND POST AND FUEL FROM THE WALL', pc(f.depth))
        + fine(`${f.closed ? '' : '<span class="down">No closed wall yet: the base scores 0 and raiders walk in. </span>'}Reviewed every day: above 45 earns Defence standing, below loses it. Lookout Towers watch the wall, every gate takes a trained trooper, and more than two gates is asking for trouble.`); }
    const offices = s.b.filter((b) => b.type === 'patrol' && b.done);
    c2 += sec('STANDING PATROLS') + (offices.length ? offices.slice(0, 2).map((b) => kv('PATROL OFFICE', `${s.patrols.filter((p) => p.office === b.id).length} of ${b.squads} squads out · ammo ${Math.floor(b.stock.ammo || 0)}`)).join('') : fine(`Build a Patrol Office (OPERATIONS) and it sends squads of three trained troopers out every morning at ${C.PATROL_AT}:00, on its own.`));
    if (s.reports?.length) {
      c2 += sec('AFTER-ACTION REPORTS');
      for (const r of s.reports.slice(-2).reverse()) {
        const open = repOpen === r.id;
        c2 += `<div class="card2 aar${r.win ? '' : ' lost'}"><div class="l"><b>${esc(r.op)} <span class="${r.win ? 'up' : 'down'}">${r.win ? 'SUCCESS' : 'FAILED'}</span></b><span>Day ${calDay(r.day)} · ${esc(r.kind)} · ${r.n} under ${esc(r.leader || '—')}${r.veh.length ? ' · ' + r.veh.join(', ') : ''} · ${r.def >= 0 ? '+' : ''}${r.def} DEF${r.sup ? `, +${r.sup} SUP` : ''}</span>${open ? `<p class="rep-t">${r.lines.map(esc).join(' ')}</p>` : ''}</div><button class="plate btn sm" data-rep="${r.id}">${open ? 'CLOSE' : 'READ'}</button></div>`;
      }
    }
    // the third: special operations, and the squads out
    let c3 = sec('SPECIAL OPERATIONS', ' · OPTIONAL');
    if (!s.offers.length) c3 += fine('None on offer. New operations come in with the day.');
    for (const [oi, op] of s.offers.slice(0, 3).entries()) {
      const pick = (vPick[op.id] || []).filter((k) => s.armourFree(k)), ch = s.chance({ ...op, veh: pick }), ok = home.length >= op.size;
      const vb = ['lrv', 'tank'].filter((k) => s.veh.some((v) => v.kind === k)).map((k) => { const free = s.armourFree(k), on = pick.includes(k); return `<button class="plate btn sm${on ? ' on' : ''}" data-veh="${op.id}:${k}" ${free ? '' : 'disabled'} title="${esc(VEHICLES[k].desc)} Burns ${VEHICLES[k].fuel} fuel.">${on ? '✓ ' : '+ '}${VEHICLES[k].name.toUpperCase()}</button>`; }).join('');
      const want = op.wants ? ` · <b class="${pick.includes(op.wants) ? 'up' : op.needs ? 'down' : 'warn'}">${op.needs ? 'NEEDS' : 'CALLS FOR'} ${op.wants === 'lrv' ? 'A ROVER' : 'A TANK'}</b>` : '';
      c3 += `<div class="card2 op"><div class="l"><b><i class="opn">${oi + 1}</i>${esc(op.op)}${op.heavy ? ' <span class="warn">· HEAVY</span>' : ''}</b><span>${esc(op.kind)}${op.place ? `, the ${esc(op.place)}, ${op.km} km ${op.dir}` : ''}${want}</span><span>${'◆'.repeat(op.diff)}${'◇'.repeat(5 - op.diff)} · ${op.size} troopers · ${dur(op.dur * C.PATROL)} · +${op.def} DEF, +${op.sup} SUP</span>${vb ? `<div class="oc-veh">${vb}</div>` : ''}</div>
        <div class="oc-odds"><b class="${ch >= 0.65 ? 'up' : ch < 0.45 ? 'down' : 'warn'}">${ok ? Math.round(ch * 100) + '%' : '—'}</b><button class="plate btn sm" data-send="${op.id}" ${ok ? '' : 'disabled'} title="${ok ? 'The odds are the squad\'s, with what it takes along' : `Needs ${op.size} troopers at home`}">SEND</button></div></div>`;
    }
    if (!s.has('vbay')) c3 += fine('Research Scout Rovers and build a Vehicle Bay, and operations can take a rover, or later a tank, along.');
    if (s.patrols.length) {
      c3 += sec('IN THE FIELD', ` · ${s.patrols.length}`) + s.patrols.slice(0, 3).map((p) => `<div class="kv fld"><span>${esc(p.op)}</span><b>${p.brief > 0 ? 'briefing' : Math.round(p.t / p.dur * 100) + '%'} · odds ${Math.round(p.chance * 100)}%</b></div>`).join('') + more(s.patrols.length - 3);
    }
    return head('def') + `<div class="oc-3"><div>${c1}</div><div>${c2}</div><div>${c3}</div></div>`;
  }

  // ---------------------------------------------------------------- EXPANSION
  function pagePro(s) {
    const st = C.STAGES[s.stage || 0], nx = s.nextStage(), ck = s.stageCheck() || [];
    let c1 = sec('CHARTER') + kv(`${esc((s.faction.base || 'THE BASE').toUpperCase())} IS A`, `${esc(st.name.toUpperCase())}`) + kv('LAND HELD', `${s.held()} of ${Math.min(441, st.parcels ?? 441)} parcels`);
    if (nx) c1 += fine(`The Bureau grants the next charter, a ${esc(nx.name)}, by itself as soon as every term is met, and takes its fee then. It brings more land (up to ${nx.parcels >= 441 ? 'all 441' : nx.parcels} parcels, bought with ROADS → LAND), a bigger allocation and new buildings.`)
      + ck.map((c) => kv(`${c.ok ? '✓' : '·'} ${esc(c.text)}`, c.ok ? 'MET' : 'NOT YET', c.ok ? 'up' : 'warn')).join('') + (ck.length && ck.every((c) => c.ok) ? '<p class="up">Every term is met: the charter comes within the hour.</p>' : '');
    else c1 += fine('The largest charter the Bureau grants. Any parcel on the section can be bought, so long as it touches yours.');
    const u = s.usage(), home = s.troops.filter((t) => t.state !== 'patrol').length;
    let c2 = sec('SUPPLY LINES') + `<table class="acct"><tr><td><b>GOOD</b></td><td><b>STORE</b></td><td><b>PAD</b></td><td><b>USED /WATCH</b></td><td><b>COST /WATCH</b></td></tr>`
      + GKEYS.map((g) => `<tr><td><i class="sw" style="background:${GOODS[g].color}"></i>${esc(GOODS[g].short)}</td><td>${Math.floor(s.stored(g))} / ${Math.floor(s.storage(g))}</td><td>${Math.floor(s.onPad(g))}</td><td>${Math.round(u[g])}</td><td>${Math.round(u[g] * GOODS[g].cost)}</td></tr>`).join('') + `</table>`;
    if (s.bill) c2 += fine(`Last dropship, day ${calDay(s.bill.day)}: ${GKEYS.map((g) => `${s.bill.order[g] || 0} ${GOODS[g].short}`).join(', ')}, billed ${Math.round(s.bill.cost)} supplies. It lands at 0${C.SUPPLY_AT}:00 with what your standing order buys (the command post's card), up to ${s.padLoad()} a pad.`);
    const lifts = s.veh.filter((v) => v.kind === 'lift'), trucks = s.veh.filter((v) => v.kind === 'truck');
    c2 += sec('VEHICLES') + kv('FORKLIFTS', `${lifts.filter((v) => v.job).length} of ${lifts.length} on a run`) + kv('SUPPLY TRUCKS', `${trucks.filter((v) => v.job).length} of ${trucks.length} on a run`)
      + fine('They carry goods from the pad to storage and on to the buildings that use them, without being told: 1.6 times as fast on dirt road, 2.4 times on paved. A Motor Pool adds two trucks.');
    c2 += sec('FOOD') + kv('SEATS AT MEALS', `${s.seats} for ${home} troops`, s.seats < home ? 'down' : '') + kv('HUNGER', `${Math.round(s.hunger * 100)}%`, s.hunger > 0.15 ? 'down' : '');
    let c3 = '';
    if (s.audit) { const A = s.audit; c3 += sec(`LAST AUDIT, DAY ${A.week}`, `: ${A.score}/100 (${A.delta >= 0 ? '+' : ''}${A.delta})`) + kv('SUPPLY LINES', A.lines) + kv('TROOPS FED', A.food) + kv('HOUSING', A.housing) + kv(`GROWTH (${A.target} EXPECTED)`, A.growth) + (A.notes.length ? `<ul class="notes">${A.notes.slice(0, 4).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''); }
    else c3 += sec('THE AUDIT');
    c3 += fine('The Growth Office audits at the end of each day: supply lines that never run dry, troops fed, a bunk for everyone, and a base that keeps growing.');
    { const W = s.walks(), R = C.TIDY, mm = (m) => (m == null ? '—' : `${m} m`), ok = (m) => (m ?? 0) <= R.walk;
      c3 += sec('LAYOUT', ` · ${W.all == null ? 'NOTHING TO WALK TO YET' : W.all < 5 ? 'ALL UNDER ONE ROOF' : `${W.all} M ON AVERAGE`}`)
        + kv('TO WORK', mm(W.work), ok(W.work) ? 'up' : 'warn') + (W.far ? kv('LONGEST', `${esc(W.far.name)}, ${W.far.m} m`) : '') + kv('TO THE MESS', mm(W.mess), ok(W.mess) ? 'up' : 'warn') + kv('TO A LATRINE', mm(W.latrine), ok(W.latrine) ? 'up' : 'warn')
        + fine(`How far troopers walk from their bunks, on the routes they take. The daily efficiency review wants ${R.walk} m or less on average: put bunks near the mess, the latrines and the work.`); }
    return head('pro') + `<div class="oc-3"><div>${c1}</div><div>${c2}</div><div>${c3}</div></div>`;
  }

  // ---------------------------------------------------------------- PUBLICITY
  function pageTru(s) {
    const ins = s.inspection, at = C.WEEK * C.INSPECT_AT - s.wt;
    let c1 = sec('RIGHT NOW') + kv('MORALE', Math.round(s.morale)) + kv('PROPAGANDA', s.prop) + kv('CONDITION', Math.round(s.avgCond)) + kv('LIKELY SCORE', Math.round(0.35 * s.morale + 0.45 * s.prop + 0.2 * s.avgCond), 'c-tru');
    c1 += fine(`${s.inspected ? 'Today\'s inspection is done.' : `Next inspection in ${dur(Math.max(0, at))}.`} The score is 35% morale, 45% propaganda and 20% condition; Publicity standing moves most of the way to it.`);
    if (ins) c1 += sec(`LAST REPORT, DAY ${ins.week}`, `: ${ins.score}/100 (${ins.delta >= 0 ? '+' : ''}${ins.delta})`) + (ins.notes.length ? `<ul class="notes">${ins.notes.slice(0, 5).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '');
    const mor = Object.entries(s.mor || {}).filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
    let c2 = sec('MORALE, PIECE BY PIECE', ` · ${Math.round(s.morale)} → ${Math.round(s.moraleTarget ?? s.morale)}`) + (mor.length ? mor.slice(0, 14).map(([k, v]) => kv(esc(h.MOR[k] || k), `${v > 0 ? '+' : ''}${Math.round(v)}`, v < 0 ? 'down' : 'up')).join('') : fine('Nothing moving it yet.'));
    c2 += fine('Morale moves slowly toward the target. Every kind of propaganda counts for less the more of it you have, so a flag, banners, a loudspeaker, a statue and a pool beat ten banners.');
    const bs = s.b.filter((b) => b.done && b.type !== 'hq'), avg = bs.length ? Math.round(bs.reduce((a, b) => a + b.cond, 0) / bs.length) : 100;
    const low = bs.filter((b) => b.cond < 70), worst = [...low].sort((p, q) => p.cond - q.cond).slice(0, 4), short = bs.filter((b) => (b.unpaid || 0) >= 2).length;
    let c3 = sec('CONDITION', ` · ${avg}% ON AVERAGE`) + kv('UNDER 70%', low.length, low.length ? 'warn' : 'up') + worst.map((b) => kv(esc(B[b.type].name), `${Math.round(b.cond)}%`, b.cond < 40 ? 'down' : 'warn')).join('') + kv('UPKEEP MISSED TODAY', short, short ? 'warn' : 'up');
    c3 += fine(`${esc(h.CONDITION)} Tents wear faster than upkeep mends them; prefabs and permanent buildings do not.`);
    return head('tru') + `<div class="oc-3"><div>${c1}</div><div>${c2}</div><div>${c3}</div></div>`;
  }

  // ---------------------------------------------------------------- SCIENCE
  function pageSci(s) {
    const labs = s.b.filter((b) => b.type === 'lab' && b.done), rate = s.labRate();
    let top = !s.has('comms') ? '<p class="warn">Build a Comms Tower, then a Science Lab (OPERATIONS), to start research.</p>' : !labs.length ? '<p class="warn">Build a Science Lab (OPERATIONS) to start research.</p>' : kv('LABS', `${labs.length} · ${rate.toFixed(1)} lab hours an hour`);
    top += fine(`One thing at a time, while a lab is crewed and powered; more labs, faster research. Paid for up front, in credits. Landing pads: ${s.count('pad')} of ${s.padCap()} allowed (each Comms Tower runs ${s.hasTech('radio') ? 3 : 2} more); every dropship carries ${s.padLoad()} goods and ${s.padSeats()} seats.`);
    let cur = '';
    if (s.tech.cur) { const k = s.tech.cur; cur = `<div class="card2"><div class="l"><b>RESEARCHING: ${esc(TECH[k].name.toUpperCase())}</b><span>${Math.floor(s.tech.pts)} of ${TECH[k].hrs} lab hours${rate > 0 ? ` · about ${dur((TECH[k].hrs - s.tech.pts) / rate * C.WEEK / 24)} left` : ' · stalled: the lab needs crew and power'}</span>${prog(s.tech.pts / TECH[k].hrs)}</div></div>`; }
    else cur = `<div class="card2"><div class="l"><b>${labs.length ? 'THE LAB IS IDLE' : 'NO RESEARCH'}</b><span>${s.tech.done.length} of ${Object.keys(TECH).length} researched${labs.length ? ' · pick something below' : ''}</span></div></div>`;
    const node = ([k, t]) => {
      const st = s.techState(k), can = st === 'open' && labs.length && !s.tech.cur && s.credits - t.cost >= -s.OD;
      return `<div class="tn ${st}" title="${esc(t.name + ': ' + t.desc)}"><b>${esc(t.name)}</b><span class="d">${esc(t.desc)}</span>${t.needs && st === 'locked' ? `<span class="nd">Needs ${t.needs.map((n) => esc(TECH[n].name)).join(', ')}</span>` : ''}`
        + (st === 'done' ? '<span class="ok">RESEARCHED</span>' : st === 'busy' ? '<span class="ok">IN THE LAB</span>' : `<button class="plate btn sm" data-tech="${k}" ${can ? '' : 'disabled'} title="Research it: ${t.cost} credits, ${t.hrs} lab hours">${t.cost} CR · ${t.hrs}H</button>`) + `</div>`;
    };
    const tier = (n) => Object.entries(TECH).filter(([, t]) => t.tier === n);
    return `<div class="oc-sci"><div>${top}</div>${cur}</div><div class="tech"><div class="col"><i>TIER 1</i>${tier(1).map(node).join('')}</div><div class="col"><i>TIER 2</i><div class="tg">${tier(2).map(node).join('')}</div></div><div class="col"><i>TIER 3</i>${tier(3).map(node).join('')}</div></div>`;
  }

  // ---------------------------------------------------------------- INTELLIGENCE
  function pageInt(s) {
    const done = h.ORDERS.map((q) => { try { return !!q[1](s); } catch { return false; } }), todo = h.ORDERS.map((_, i) => i).filter((i) => !done[i]).slice(0, 4), W = h.warns();
    let c1 = sec('SUGGESTED ACTIONS') + (todo.length ? `<ul class="notes">${todo.map((i) => `<li>${esc(words(h.ORDERS[i][0]))}</li>`).join('')}</ul>` : fine('The orders are all done.'));
    const n = s.nextStage(), ck = n ? (s.stageCheck() || []).filter((c) => !c.ok) : [];
    if (n) c1 += sec(`TOWARD A ${esc(n.name.toUpperCase())}`) + (ck.length ? `<ul class="notes">${ck.map((c) => `<li class="down">Still needed: ${esc(c.text)}</li>`).join('')}</ul>` : '<p class="up">Every term is met: the charter comes within the hour.</p>');
    { const eq = [['yard', 'Engineer Yard', 'earthworks and prefab buildings'], ['batch', 'Concrete Batch Plant', 'paved roads, footpaths, bridges and permanent buildings']].filter(([k]) => !s.has(k));
      if (eq.length) c1 += sec('CONSTRUCTION EQUIPMENT') + `<ul class="notes">${eq.map(([, nm, what]) => `<li>No ${nm} yet (INDUSTRY): the engineers cannot do ${what}.</li>`).join('')}</ul>`; }
    let c2 = sec('WARNINGS', W.length ? ` · ${W.length}` : '') + (W.length ? W.slice(0, 6).map((w) => `<div class="card2 alert"><div class="l"><b class="down">${esc(w.t)}</b><span>${esc(words(w.why))}</span></div></div>`).join('') + more(W.length - 6) : fine('Nothing is going wrong that Intelligence can see.'));
    const pay = s.loans.reduce((a, l) => a + Math.min(l.bal, LOANS[l.k].pay), 0);
    let c3 = sec('PAYMENTS') + kv('OWED IN ALL', `${fmt(s.loans.reduce((a, l) => a + l.bal, 0))} CR`) + kv('TAKEN EACH DAY', `${fmt(pay)} CR`)
      + (s.credits < 0 ? kv('OVERDRAWN', `${fmt(-s.credits)} CR of ${fmt(s.OD)}`, 'down') : '') + (s.unpaidDays ? kv('WAGES UNPAID', `${s.unpaidDays} watch${s.unpaidDays > 1 ? 'es' : ''}`, 'down') : '');
    const inc = [];
    for (const c of s.calls) inc.push(`${h.OFFICE[CALLS[c.k].m]}: "${CALLS[c.k].title}", ${fmt(c.n)} ${c.g} due day ${calDay(c.due)}${c.acc ? ' (set aside)' : ''}`);
    for (const od of s.orders) inc.push(`Deployment order: ${od.sent} of ${od.n} troopers shipped, due day ${calDay(od.due)}`);
    if (!s.inspected) inc.push(`The Publicity Office inspects in ${dur(Math.max(0, C.WEEK * C.INSPECT_AT - s.wt))}`);
    c3 += sec('INCOMING') + (inc.length ? `<ul class="notes">${inc.slice(0, 5).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : fine('Nothing due.'));
    { const ri = s.raidInfo(), lr = s.lastRaid, ears = ['No lookout and no comms: the base will only hear a raid when it is at the wire.', 'Lookouts give a day of warning. A Comms Tower would give the hour, the size and the side.', 'The Comms Tower gives the hour, the size and the side.'][ri.intel] || '';
      c3 += sec('THREATS') + kv('THREAT LEVEL', `${ri.threat} of 100`, ri.threat > 60 ? 'down' : '') + kv('BASE STRENGTH', ri.strength)
        + (ri.known ? `<div class="card2 alert"><div class="l"><b class="down">${esc(ri.what)}${ri.dir ? ' from the ' + esc(ri.dir) : ''}</b><span>Expected ${esc(ri.when)}.${ri.attack != null ? ` Its strength is about ${ri.attack}; yours is ${ri.strength}. ${ri.strength >= ri.attack + 12 ? 'The wall should hold.' : ri.strength >= ri.attack - 6 ? 'It will be close: a manned gate would settle it.' : 'As things stand they will get in and give everyone a fright. A closed, watched wall earns standing instead.'}` : ' Size unknown.'}</span></div></div>` : fine(s.week < 4 ? 'Quiet. Nothing has found the base yet; it will, in time.' : 'No contact reported.'))
        + fine(ears) + (lr ? fine(`Last raid, day ${lr.week}: ${esc(lr.out)} (their ${lr.atk} against your ${lr.str}).`) : ''); }
    return `<div class="oc-3"><div>${c1}</div><div>${c2}</div><div>${c3}</div></div>`;
  }

  // ---------------------------------------------------------------- STANDING
  function pageSt(s) {
    const rows = s.table(), S = C.STAGES[s.stage || 0], alloc = (i) => Math.round(C.ALLOC.base * C.ALLOC.mult[Math.min(i, C.ALLOC.mult.length - 1)] * (1 + (S.alloc || 0)));
    let c1 = fine(`Every day Head Office ranks the outfits on ${esc(s.planet || 'the planet')} by their three standings added up, and splits the allocation: 1st gets ${C.ALLOC.mult[0]}×, last ${C.ALLOC.mult[C.ALLOC.mult.length - 1]}×; the higher you rank, the more of your empty bunks the morning recruits fill. Standings drift back toward ${C.STAND.rest} each day, so they have to be kept up.`);
    c1 += `<table class="st"><tr><th>#</th><th>OUTFIT</th><th class="c-def">DEF</th><th class="c-pro">EXP</th><th class="c-tru">PUB</th><th>TOTAL</th><th>SHARE</th></tr>`
      + rows.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td>${logo(r.logo)} ${esc(r.name)}</td>${MKEYS.map((m) => `<td>${Math.round(r.stand[m])}</td>`).join('')}<td><b>${s.total(r.stand)}</b></td><td>${fmt(alloc(i))}</td></tr>`).join('') + `</table>`;
    c1 += sec('YOUR STANDINGS') + MKEYS.map((m) => { const v = Math.round(s.stand[m]); return `<div class="sbar"><b class="c-${m}">${esc(MIN[m].short)}</b><i><u class="bg-${m}" style="width:${Math.max(0, Math.min(100, v))}%"></u></i><span>${v}</span></div><p class="fine sb">${esc(MIN[m].name)}: ${esc(MIN[m].wants)}</p>`; }).join('');
    let c2 = '';
    if (s.ledger) { const L = s.ledger; c2 += sec(`BUREAU LEDGER, DAY ${L.week}`) + kv('Allocation approved by Head Office', fmt(L.gross)) + kv('Bureau handling fee', `−${fmt(L.fee)}`, 'down') + kv('Consulting', `−${fmt(L.consult)}`, 'down') + kv(`Delivered to ${esc(s.faction.base)}`, fmt(L.net), 'up') + fine('The numbers add up. The Bureau has checked.'); }
    else c2 += sec('BUREAU LEDGER') + fine('The first allocation comes at the end of the first day.');
    const st = s.stats || {};
    c2 += sec('THE RECORD') + kv('LAST ALLOCATION', `${fmt(s.lastAlloc || 0)} SUP`) + kv('TROOPERS SHIPPED', st.deployed || 0) + kv('OPERATIONS WON / LOST', `${st.patrolsWon || 0} / ${st.patrolsLost || 0}`) + kv('INSPECTIONS', st.inspections || 0) + kv('FILES GRADED', st.graded || 0);
    return `<div class="oc-st"><div>${c1}</div><div>${c2}</div></div>`;
  }

  const PAGES = { eco: pageEco, led: pageLed, def: pageDef, pro: pagePro, tru: pageTru, sci: pageSci, int: pageInt, st: pageSt };
  // only redraw what changed, and never under a button the pointer is on, so it stays put while you click it
  function render(force) {
    if (!isOpen()) return;
    const s = sim(), w = el(), tb = $('fb-mi-tabs'), body = $('fb-mi-body');
    const tabs = OTABS.map(([k, n, c]) => `<button class="plate btn sm${tab === k ? ' on' : ''}" data-mt="${k}"><span class="${c}">${n}</span></button>`).join('');
    if (tabs !== sigT) { sigT = tabs; tb.innerHTML = tabs; }
    let x = '';
    try { x = PAGES[tab](s); } catch (err) { console.error(err); x = `<p class="warn">This page could not be drawn: ${esc(err.message)}</p>`; }
    if (x !== sigB && (force || !w.querySelector('#fb-mi-body button:hover'))) { sigB = x; body.innerHTML = x; }
  }
  function open(t, sub) { if (t) tab = t; if (sub) eco = sub; el().hidden = false; sigB = ''; render(true); dock(); }
  function close() { if (el()) el().hidden = true; dock(); }
  function toggle(t) { if (isOpen() && (!t || t === tab)) close(); else open(t); audio.click(); }
  // the dock along the bottom: one button an Office, with how it is doing
  function dock() {
    const s = sim(); if (!s || !$('md-eco')) return;
    const set = (id, v) => { const e = $(id); if (e && e.textContent !== v) e.textContent = v; };
    const W = h.warns(), use = s.usage(), low = GKEYS.filter((g) => use[g] > 0 && s.amount(g) < use[g] * 0.5);
    set('md-eco', s.market.offers.length ? `${s.market.offers.length} offer${s.market.offers.length > 1 ? 's' : ''}` : `SUP ${(s.price('sup') * 10).toFixed(1)}/10`);
    { const files = Math.min(Math.max(0, s.reviewsLeft()), s.toReview().length), calls = s.calls.filter((c) => !c.acc).length;
      set('md-led', calls ? `${calls} call${calls > 1 ? 's' : ''}` : s.desk.length ? `${s.desk.length} request${s.desk.length > 1 ? 's' : ''}` : files ? `${files} file${files > 1 ? 's' : ''}` : 'clear');
      $('md-led').parentElement.classList.toggle('alert', !!(calls || s.desk.length)); }
    const od = s.orders[0];
    set('md-def', od ? `${od.sent}/${od.n} shipped` : `${s.patrols.length} out · ${s.offers.length} ops`);
    $('md-def').parentElement.classList.toggle('alert', !!od && od.due - s.time.day <= 1 && od.sent < od.n);
    const nx = s.nextStage(), ck = nx ? s.stageCheck() || [] : null;
    set('md-pro', low.length ? `${low.map((g) => GOODS[g].short).join(', ')} low` : s.hunger > 0.15 ? 'troops hungry' : ck ? `charter ${ck.filter((c) => c.ok).length}/${ck.length}` : 'supplies OK');
    $('md-pro').parentElement.classList.toggle('alert', !!low.length || s.hunger > 0.15);
    set('md-tru', s.inspected ? `inspected · ${s.inspection ? s.inspection.score : '—'}` : `inspects in ${dur(Math.max(0, C.WEEK * C.INSPECT_AT - s.wt))}`);
    set('md-sci', s.tech.cur ? `${Math.floor(s.tech.pts / TECH[s.tech.cur].hrs * 100)}%` : s.has('lab') ? 'idle' : `${s.tech.done.length}/${Object.keys(TECH).length}`);
    $('md-sci').parentElement.classList.toggle('alert', !s.tech.cur && s.has('lab'));
    set('md-int', W.length ? `${W.length} warning${W.length > 1 ? 's' : ''}` : 'all clear');
    $('md-int').parentElement.classList.toggle('alert', W.length > 0);
    set('md-st', `${['1st', '2nd', '3rd', '4th', '5th'][s.ranking()] || ''} of ${s.rivals.length + 1}`);
    for (const b of document.querySelectorAll('#fb-dock [data-mt]')) b.classList.toggle('on', isOpen() && b.dataset.mt === tab);
  }

  // clicks inside the window and on the dock; true if it was one of ours
  function click(e) {
    const s = sim(), t = e.target;
    const mt = t.closest('[data-mt]'); if (mt) { const k = mt.dataset.mt; if (mt.closest('#fb-mi-tabs')) { tab = k; render(true); dock(); audio.click(); } else toggle(k); return true; }
    if (t.closest('[data-fb=mclose]')) { close(); audio.click(); return true; }
    if (!t.closest('#fb-mins')) return false;
    const redo = () => { render(true); dock(); h.refresh(); };
    const et = t.closest('[data-et]'); if (et) { eco = et.dataset.et; audio.click(); render(true); return true; }
    const q = t.closest('[data-tq]'); if (q) { tradeQ = +q.dataset.tq; audio.click(); render(true); return true; }
    const tr = t.closest('[data-trade]'); if (tr) { const [g, b] = tr.dataset.trade.split(':'); const r = s.trade(g, tradeQ, b === '1'); if (r && r.ok) audio.click(); else { h.flash((r && r.why) || 'Not now.'); audio.deny(); } redo(); return true; }
    const cm = t.closest('[data-commit]'); if (cm) { const [m, l] = cm.dataset.commit.split(':'); s.setCommit(m, +l); audio.click(); redo(); return true; }
    const rp = t.closest('[data-rep]'); if (rp) { repOpen = repOpen === +rp.dataset.rep ? null : +rp.dataset.rep; audio.click(); render(true); return true; }
    const vh = t.closest('[data-veh]'); if (vh) { const [id, k] = vh.dataset.veh.split(':'), cur = vPick[id] || []; vPick[id] = cur.includes(k) ? cur.filter((v) => v !== k) : [...cur, k]; audio.click(); render(true); return true; }
    const sd = t.closest('[data-send]'); if (sd) { if (s.send(+sd.dataset.send, vPick[sd.dataset.send] || [])) { delete vPick[sd.dataset.send]; audio.click(); } else { audio.deny(); h.flash('Not enough troopers at home for that.'); } redo(); return true; }
    const gr = t.closest('[data-grade]'); if (gr) { const [id, g] = gr.dataset.grade.split(':'); const r = s.gradeTroop(+id, g); if (r) { lastGrade = r; if (r.off) audio.deny(); else audio.click(); } redo(); return true; }
    const bo = t.closest('[data-borrow]'); if (bo) { if (s.borrow(bo.dataset.borrow)) audio.click(); else audio.deny(); redo(); return true; }
    const ry = t.closest('[data-repay]'); if (ry) { const [i, a] = ry.dataset.repay.split(':'); if (s.repay(+i, +a)) audio.click(); else audio.deny(); redo(); return true; }
    const te = t.closest('[data-tech]'); if (te) { if (s.research(te.dataset.tech)) audio.click(); else { audio.deny(); h.flash('Not now: a lab must be built and free, and the credits there.'); } redo(); return true; }
    return false;
  }
  function reset() { tab = 'eco'; eco = 'budget'; repOpen = null; lastGrade = null; sigT = ''; sigB = ''; for (const k in vPick) delete vPick[k]; close(); }
  return { open, close, toggle, isOpen, render, dock, click, reset, tab: () => tab };
}
