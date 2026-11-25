// (GC 0.82) THE OFFICES: FOB Commander's windows, from the standalone game (FOB Super Commander's Ministries): one window
// over the base, opened from the dock along the bottom, from the numbers at the top, or with O; Esc closes it.
// (GC 0.83) Rebuilt round the base's goals, each measured with bars rather than tables (Ramzies: "bars that measure,
// population milestones, budget & trade, efficiency, citizen happiness"):
//   POPULATION   the milestones: the charters, at 30, 60 and 110 on the base, with the next one's other terms; who is
//                here; bunks and seats; the Growth Office's daily audit; what the charter gives the war
//   BUDGET       what the base makes and what it loses, a watch, in supplies and in credits; the allocation by rank and
//                the three standings that set it, with the commitment that buys each. TRADE & LOANS: the market, offers
//                from the other bases, debt
//   EFFICIENCY   how fast people and goods get in, round and out: the daily efficiency review's six checks, the walks
//                from the bunks, the roads, the pad, the trucks, the transports, crews, power, water and sewage
//   HAPPINESS    morale and what moves it, in three: defence (the wall, the perimeter, raids), housing (bunks, food,
//                latrines, noise, water) and looks (propaganda, condition, what is on air)
//   OPERATIONS   deployment orders, training, special operations (SEND), squads out, the last results
//   SCIENCE      the research tree
// The calls, requests and files to grade are on the task board. Every page fits a 1280 x 720 screen without scrolling.
import { C, B, GKEYS, TECH, TRAIN, VEHICLES, LOANS, COMMIT, MARKET, MIN } from '../base/config.js';
import { MKEYS } from '../base/sim.js';
import { segLen } from '../base/net.js';
import { logoCanvas } from '../base/logo.js';

const $ = (id) => document.getElementById(id);
// the pages: key, name, the colour of its label
export const OTABS = [['pop', 'POPULATION', ''], ['bud', 'BUDGET & TRADE', ''], ['eff', 'EFFICIENCY', ''], ['hap', 'HAPPINESS', ''], ['ops', 'OPERATIONS', 'c-def'], ['sci', 'SCIENCE', 'c-sci']];
const GSHORT = (g) => (g === 'cr' ? 'CR' : g === 'sup' ? 'SUP' : MARKET.goods[g] ? MARKET.goods[g].short : g.toUpperCase());
const chg = (hist) => { if (!hist || hist.length < 2) return ''; const a = hist.at(-2), b = hist.at(-1), d = (b - a) / (a || 1) * 100; return `<small class="${d > 0.5 ? 'up' : d < -0.5 ? 'down' : ''}">${d > 0 ? '▲' : d < 0 ? '▼' : ''}${Math.abs(d).toFixed(1)}%</small>`; };
const clamp01 = (v) => Math.max(0, Math.min(1, v || 0));
// what moves morale, in the three the player can act on (and the rest)
const HAPPY = { defence: ['wall', 'pride', 'grief'], housing: ['crowd', 'comfort', 'food', 'latrine', 'noise', 'hazard', 'power', 'water', 'sewer', 'smell', 'sick'], looks: ['prop', 'worn', 'commit'] };
// what moves morale, by name on the HAPPINESS page (the full wording is the hover)
const CAUSE = { wall: 'CLOSED, WATCHED WALL', pride: 'MEDALS AND PRIDE', grief: 'GRIEF', crowd: 'NO BUNK', comfort: 'COMFORT', food: 'HUNGER', latrine: 'LATRINES', noise: 'NOISE BY THE BUNKS', hazard: 'FUEL BY THE BUNKS', power: 'POWER CUTS', water: 'WATER', sewer: 'SEWAGE', smell: 'THE LAGOON\'S SMELL', sick: 'SICKNESS', prop: 'PROPAGANDA', worn: 'WORN BUILDINGS', commit: 'PUBLICITY COMMITMENT' };
const CHECKS = { latrines: 'Clean latrines, no queues', mess: 'A seat at the mess for everyone', bunks: 'A bunk for everyone', crews: 'Every crewed building fully crewed', power: 'Power for everything', walks: 'Short walks' };

// h: the interface's helpers (base-hud.js): fmt, esc, dur, calDay, OFFICE, CAT, MOR, CONDITION, warns(), flash(text),
// refresh(); o.war(): what the war takes from the base (base.js)
export function makeOffices(o, h) {
  const { fmt, esc, dur, calDay } = h, sim = () => o.sim(), audio = o.audio;
  let tab = 'pop', sub = 'budget', tradeQ = 50, sigT = '', sigB = '';
  const vPick = {}, logos = {};
  const el = () => $('fb-mins');
  const isOpen = () => !!el() && !el().hidden;
  const sec = (t, extra = '') => `<h3 class="oc-h">${t}${extra}</h3>`;
  const kv = (k, v, cls = '', tip = '') => `<div class="kv"${tip ? ` title="${esc(tip)}"` : ''}><span>${k}</span><b class="${cls}">${v}</b></div>`;
  const fine = (t) => `<p class="fine">${t}</p>`;
  const sg = (v) => (v >= 0 ? '+' : '−') + fmt(Math.abs(v));
  const logo = (lg) => { const k = JSON.stringify(lg || {}); if (!(k in logos)) { try { logos[k] = logoCanvas(lg, 40).toDataURL(); } catch { logos[k] = ''; } } return logos[k] ? `<img src="${logos[k]}" width="16" height="16" alt="">` : ''; };
  // a measuring bar: a label, the bar (filled to f, 0..1, in a colour: g green, a amber, r red, c cyan), the value;
  // tick: a mark on the bar (a target or a milestone), 0..1
  const meter = (label, val, f, col = 'g', x = {}) => `<div class="om${x.big ? ' big' : ''}"${x.tip ? ` title="${esc(x.tip)}"` : ''}><span>${label}</span><i><u class="${col}" style="width:${clamp01(f) * 100}%"></u>${x.tick != null ? `<s style="left:${clamp01(x.tick) * 100}%"></s>` : ''}</i><b class="${x.vc || ''}">${val}</b></div>`;
  // a bar either side of nought: what lifts morale goes right in green, what holds it down left in red
  const dmeter = (label, v, scale, tip) => { const w = Math.min(50, Math.abs(v) / scale * 50); return `<div class="om d"${tip ? ` title="${esc(tip)}"` : ''}><span>${label}</span><i><u class="${v < 0 ? 'r' : 'g'}" style="${v < 0 ? 'right' : 'left'}:50%;width:${w}%"></u><s style="left:50%"></s></i><b class="${v < 0 ? 'down' : v > 0 ? 'up' : ''}">${v > 0 ? '+' : ''}${v}</b></div>`; };
  // a page's headline: its name, a line on what it is, and its measure
  const headline = (name, line, measure) => `<div class="og"><div class="og-l"><b>${name}</b><span>${line}</span></div><div class="og-m">${measure}</div></div>`;
  const tick = (ok) => `<b class="${ok ? 'up' : 'warn'}">${ok ? '✓' : '·'}</b>`;

  // ---------------------------------------------------------------- POPULATION: the milestones
  function pagePop(s) {
    const heads = s.heads(), st = s.stage || 0, S = C.STAGES, top = S[S.length - 1].troops, nx = s.nextStage(), ck = s.stageCheck() || [];
    const marks = S.map((x, i) => i ? `<s class="${i <= st ? 'on' : ''}" style="left:${x.troops / top * 100}%"><em>${esc((x.short || x.name).toUpperCase())}<br>${x.troops}</em></s>` : '').join('');
    let x = headline('POPULATION', `${heads} on the base, engineers included. ${nx ? `The next milestone, a ${esc(nx.name)} charter, comes at ${nx.troops}, with the terms below.` : 'Every charter granted.'}`,
      `<div class="track"><i><u style="width:${clamp01(heads / top) * 100}%"></u>${marks}</i><b>${heads}</b></div>`);
    // the next charter
    let c1 = sec(nx ? `NEXT MILESTONE · ${esc(nx.name.toUpperCase())}` : 'THE LAST MILESTONE');
    if (nx) {
      const R = (v, need, label, tip) => meter(label, `${fmt(v)} / ${fmt(need)}`, v / need, v >= need ? 'g' : 'a', { vc: v >= need ? 'up' : '', tip });
      c1 += R(heads, nx.troops, 'ON THE BASE', 'Recruits come in on the morning dropship to fill empty bunks: more bunks, more recruits.') + R(Math.round(s.stand.pro), nx.pro, 'GROWTH STANDING', 'The Growth Office\'s daily audit, and the commitment you pay it (BUDGET).')
        + R(Math.floor(s.credits), nx.cr, 'CREDITS (THE FEE)') + (nx.sup ? R(Math.floor(s.supplies), nx.sup, 'SUPPLIES (THE WORKS)') : '') + (nx.store ? R(Math.round(s.storeAll()), nx.store, 'STORAGE', 'Rations, fuel and ammo the stores can hold: Logistics zones and depots.') : '');
      const need = nx.needs || [];
      if (need.length) c1 += `<div class="oc-needs">${need.map((t) => `<span class="${s.has(t) ? 'up' : 'warn'}">${s.has(t) ? '✓' : '·'} ${esc(B[t].name)}</span>`).join('')}</div>`;
      c1 += fine(ck.length && ck.every((c) => c.ok) ? '<span class="up">Every term met: the Bureau grants it within the hour.</span>' : `Granted by itself when every term is met: more land (up to ${nx.parcels >= 441 ? 'all 441' : nx.parcels} parcels), a bigger allocation, new buildings.`);
    } else c1 += fine('The largest charter the Bureau grants.');
    const w = o.war ? o.war() : null;
    c1 += sec('FOR THE WAR', ` · CHARTER LEVEL ${st + 1}`) + (w && w.gives && w.gives.length ? `<div class="oc-gives">${w.gives.map((g) => `<span class="${g.wait ? 'wait' : ''}"><b>${g.v != null ? '+' + g.v : ''}</b> ${esc(g.k)}${g.text ? ' ' + esc(g.text.toLowerCase()) : ''}</span>`).join('')}</div>` + fine('Each round. Each charter multiplies the troops, credits and defence; greyed out waits until the base is in profit.')
      : fine('In a campaign, each charter multiplies the troops, credits and defence a base gives the war each round.'));
    // who is here
    const T = s.troops, patrol = T.filter((t) => t.state === 'patrol').length, hurt = T.filter((t) => t.state !== 'patrol' && t.hurt > 0).length, ready = T.filter((t) => t.state !== 'patrol' && !(t.hurt > 0) && t.train >= 100).length, rec = T.length - patrol - hurt - ready, eng = s.engineers();
    const parts = [['TRAINED', ready, '#8df0a0'], ['RECRUITS', rec, 'var(--amber)'], ['OUT ON OPERATIONS', patrol, 'var(--cyan)'], ['WOUNDED', hurt, '#ff8a7a'], ['ENGINEERS', eng, '#9ab8ff']], all = Math.max(1, heads);
    let c2 = sec('WHO IS HERE') + `<div class="stack">${parts.map(([n, v, c]) => (v ? `<u style="width:${v / all * 100}%;background:${c}" title="${n}: ${v}"></u>` : '')).join('')}</div><div class="legend">${parts.map(([n, v, c]) => `<span><i style="background:${c}"></i>${n} ${v}</span>`).join('')}</div>`;
    const home = T.length - patrol, empty = Math.max(0, s.beds - T.length);
    c2 += sec('ROOM TO GROW') + meter('BUNKS', `${T.length} / ${s.beds}`, T.length / Math.max(1, s.beds), T.length > s.beds ? 'r' : empty ? 'g' : 'a', { tip: 'Recruits only come to fill empty bunks. Zone more Life Support, or build barracks and habs.' })
      + meter('MESS SEATS', `${s.seats} / ${home}`, s.seats / Math.max(1, home), s.seats >= home ? 'g' : 'r', { tip: 'A seat at the mess for every trooper at home.' })
      + fine(empty ? `${empty} empty bunk${empty > 1 ? 's' : ''}: recruits fill them with the morning dropship, more the higher the base ranks.` : '<span class="warn">No empty bunks: no recruits will come. More housing grows on Life Support zones.</span>');
    // the Growth Office's audit
    const A = s.audit;
    let c3 = sec('GROWTH OFFICE AUDIT', A ? ` · DAY ${A.week}` : '') + meter('GROWTH STANDING', Math.round(s.stand.pro), s.stand.pro / 100, 'a', { big: true, tick: nx ? nx.pro / 100 : null, tip: nx ? `The next charter wants ${nx.pro}.` : '' });
    if (A) c3 += meter('LAST SCORE', `${A.score}/100`, A.score / 100, A.score >= 60 ? 'g' : 'a') + meter('SUPPLY LINES NEVER DRY', A.lines, A.lines / 100, 'c') + meter('TROOPS FED', A.food, A.food / 100, 'c') + meter('A BUNK FOR EVERYONE', A.housing, A.housing / 100, 'c') + meter(`GROWTH (${A.target} EXPECTED)`, A.growth, A.growth / 100, 'c');
    else c3 += fine('The first audit comes at the end of the day.');
    c3 += fine('Audited at the end of each day; the score moves Growth standing most of the way to it.');
    return x + `<div class="oc-3"><div>${c1}</div><div>${c2}</div><div>${c3}</div></div>`;
  }

  // ---------------------------------------------------------------- BUDGET & TRADE
  // made against lost, for one currency: two bars on one scale, then every source and cost as its own bar
  function flows(ob, unit) {
    const ks = Object.keys(ob).filter((k) => Math.abs(ob[k]) >= 0.5), inc = ks.filter((k) => ob[k] > 0).sort((a, b) => ob[b] - ob[a]), out = ks.filter((k) => ob[k] < 0).sort((a, b) => ob[a] - ob[b]);
    const made = inc.reduce((a, k) => a + ob[k], 0), lost = -out.reduce((a, k) => a + ob[k], 0), top = Math.max(made, lost, 1), net = made - lost;
    const big = Math.max(1, ...ks.map((k) => Math.abs(ob[k])));
    return meter('MADE', `+${fmt(made)}`, made / top, 'g', { big: true, vc: 'up' }) + meter('LOST', `−${fmt(lost)}`, lost / top, 'r', { big: true, vc: 'down' })
      + `<div class="oc-net2">NET <b class="${net < 0 ? 'down' : 'up'}">${sg(net)}</b> ${unit} A WATCH</div>`
      + inc.slice(0, 6).map((k) => meter(esc(h.CAT[k] || k), `+${fmt(ob[k])}`, ob[k] / big, 'g', { vc: 'up' })).join('') + (inc.length > 6 ? fine(`and ${inc.length - 6} more`) : '')
      + out.slice(0, 7).map((k) => meter(esc(h.CAT[k] || k), `−${fmt(-ob[k])}`, -ob[k] / big, 'r', { vc: 'down' })).join('') + (out.length > 7 ? fine(`and ${out.length - 7} more`) : '');
  }
  function pageBud(s) {
    const r = s.rates(), net = r.supNet + r.crNet;
    let x = `<div class="subtabs">${[['budget', 'BUDGET'], ['trade', 'TRADE & LOANS']].map(([k, n]) => `<button class="plate btn sm${sub === k ? ' on' : ''}" data-et="${k}">${n}</button>`).join('')}<span class="oc-sum">NET A WATCH <b class="${net > 0 ? 'up' : 'down'}">${sg(net)}</b> ${net > 0 ? 'in profit' : '<span class="down">not in profit: the war\'s ratings and credits from this base wait until it is</span>'} · averaged over ${r.days} watch${r.days > 1 ? 'es' : ''}</span></div>`;
    if (sub === 'budget') {
      const rows = s.table(), S = C.STAGES[s.stage || 0], rank = s.ranking(), alloc = (i) => Math.round(C.ALLOC.base * C.ALLOC.mult[Math.min(i, C.ALLOC.mult.length - 1)] * (1 + (S.alloc || 0)));
      let c3 = sec('THE ALLOCATION', ` · ${['1ST', '2ND', '3RD', '4TH', '5TH'][rank]} OF ${rows.length}`) + meter('PAID A DAY', `${fmt(alloc(rank))} SUP`, alloc(rank) / alloc(0), 'a', { big: true, tip: 'Paid at the end of each day by rank among the outfits. Rank is the three standings added up.' })
        + `<div class="oc-ranks">${rows.map((q, i) => `<span class="${q.me ? 'me' : ''}" title="${esc(q.name)}: ${s.total(q.stand)}">${i + 1}. ${logo(q.logo)} ${s.total(q.stand)}</span>`).join('')}</div>`;
      for (const m of MKEYS) {
        const lvl = s.commit[m] || 0, cost = s.commitCost(m, lvl), paid = s.commitLast?.[m] ?? 1;
        c3 += meter(esc(MIN[m].name.toUpperCase()), Math.round(s.stand[m]), s.stand[m] / 100, m === 'def' ? 'r' : m === 'pro' ? 'a' : 'c', { tip: MIN[m].wants })
          + `<div class="oc-cm"><span>COMMIT</span><button class="plate btn sm" data-commit="${m}:${lvl - 1}" ${lvl ? '' : 'disabled'} title="Less">−</button><b>${COMMIT.levels[lvl]}</b><button class="plate btn sm" data-commit="${m}:${lvl + 1}" ${lvl < COMMIT.levels.length - 1 ? '' : 'disabled'} title="More">+</button><i class="${lvl && paid < 0.6 ? 'down' : ''}" title="${esc((lvl ? Object.entries(cost).map(([g, n]) => `${fmt(n)} ${GSHORT(g)}`).join(' + ') + ' a watch. ' : '') + COMMIT[m].perk)}">${lvl ? `${Object.entries(cost).map(([g, n]) => `${fmt(n)} ${GSHORT(g)}`).join(' + ')} a watch, +${s.commitGain(m, lvl).toFixed(1)} standing${paid < 1 ? ` · ${Math.round(paid * 100)}% paid` : ''}` : 'buys no standing'}</i></div>`;
      }
      c3 += fine('A commitment is paid from your stores every watch and buys that Office\'s standing; standings drift back toward ' + C.STAND.rest + ' every day.');
      x += `<div class="oc-3"><div>${sec('SUPPLIES')}${flows(r.sup, 'SUPPLIES')}</div><div>${sec('CREDITS')}${flows(r.cr, 'CREDITS')}</div><div>${c3}</div></div>`;
    } else {
      const M = s.market, debt = s.debt();
      let c1 = `<div class="qsel"><span>TRADE IN LOTS OF</span>${[10, 50, 100, 250].map((q) => `<button class="plate btn sm${tradeQ === q ? ' on' : ''}" data-tq="${q}">${q}</button>`).join('')}</div>`;
      c1 += `<table class="mkt"><tr><th>GOOD</th><th>SELL / BUY, PER 10</th><th>HELD</th><th>ROOM</th><th></th></tr>` + Object.keys(MARKET.goods).map((g) => {
        const G = M.goods[g], d = MARKET.goods[g], buy = s.canTrade(g, tradeQ, true), sell = s.canTrade(g, tradeQ, false), room = s.room(g);
        return `<tr><td><b>${esc(d.name)}</b></td><td><span class="up">${(s.sellAt(g) * 10).toFixed(1)}</span> / <span class="down">${(s.buyAt(g) * 10).toFixed(1)}</span> ${chg(G.hist)}</td><td>${fmt(s.holding(g))}</td><td>${room === Infinity ? '—' : fmt(room)}</td>
          <td class="tbtn"><button class="plate btn sm" data-trade="${g}:1" ${buy.ok ? '' : 'disabled'} title="${esc(buy.ok ? `Buy ${tradeQ} for ${fmt(buy.cr)} CR` : buy.why || '')}">BUY −${fmt(s.quote(g, tradeQ, true))}</button><button class="plate btn sm" data-trade="${g}:0" ${sell.ok ? '' : 'disabled'} title="${esc(sell.ok ? `Sell ${tradeQ} for ${fmt(sell.cr)} CR` : sell.why || '')}">SELL +${fmt(s.quote(g, tradeQ, false))}</button></td></tr>`;
      }).join('') + `</table>`;
      if (M.shocks.length) c1 += `<p class="warn">${M.shocks.map((q) => `Until day ${calDay(q.until)}: ${esc(q.text)}`).join('<br>')}</p>`;
      c1 += fine(`Every outfit's base on ${esc(s.planet || 'the planet')} trades here: buy at the higher price, sell at the lower, and the more at once the further it moves against you.`);
      c1 += sec('OFFERS FROM OTHER BASES') + (M.offers.length ? `<div class="oc-2 tight">${M.offers.slice(0, 4).map((of) => {
        const d = MARKET.goods[of.g], ok = s.canTakeOffer(of), mk = (of.buys ? s.sellAt(of.g) : s.buyAt(of.g)) * 10, better = of.buys ? of.p * 10 > mk : of.p * 10 < mk;
        return `<div class="card2"><div class="l"><b>${logo(of.logo)} ${of.buys ? 'WANTS' : 'SELLS'} ${of.n} ${esc(d.short)}</b><span>${esc(of.from)} · ${(of.p * 10).toFixed(1)} per 10 <span class="${better ? 'up' : 'down'}">(market ${mk.toFixed(1)})</span> · until day ${calDay(of.until)}${ok.ok ? '' : ` · <span class="warn">${esc(ok.why || '')}</span>`}</span></div><button class="plate btn sm" data-offer="${of.id}" ${ok.ok ? '' : 'disabled'}>${of.buys ? 'SELL' : 'BUY'}</button></div>`;
      }).join('')}</div>` : fine('None right now. The other bases post offers at 10:00 and 15:00.'));
      let c2 = sec('DEBT') + meter('OWED', `${fmt(debt)} CR`, debt / Math.max(1, LOANS.charter.amt), debt > 0 ? 'r' : 'g', { big: true, vc: debt > 0 ? 'warn' : 'up', tip: 'Against the Founding Charter you landed on.' });
      s.loans.forEach((l, i) => {
        const L = LOANS[l.k], rate = l.k === 'charter' && s.D && s.D.rate != null ? s.D.rate : L.rate;
        c2 += `<div class="card2"><div class="l"><b>${esc(L.name.toUpperCase())}</b><span>${fmt(l.bal)} CR · ${Math.round(rate * 1000) / 10}% a day · ${L.pay} a day taken</span></div><div class="oc-btns"><button class="plate btn sm" data-repay="${i}:100" ${s.credits >= 1 ? '' : 'disabled'}>REPAY 100</button><button class="plate btn sm" data-repay="${i}:${Math.ceil(l.bal)}" ${s.credits >= l.bal ? '' : 'disabled'}>ALL</button></div></div>`;
      });
      if (s.credits < 0) c2 += `<p class="${s.credits < -s.OD ? 'down' : 'warn'}">Overdrawn by ${fmt(-s.credits)} CR: ${Math.round(C.ODFEE * 100)}% a day. Past ${fmt(s.OD)} CR the colonist staff go unpaid and morale falls.</p>`;
      c2 += sec('BORROW');
      for (const k of ['dev', 'quick']) { const L = LOANS[k]; c2 += `<div class="card2"><div class="l"><b>${esc(L.name.toUpperCase())}</b><span>${fmt(L.amt)} CR · ${Math.round(L.rate * 1000) / 10}% a day · ${L.pay} a day</span></div><button class="plate btn sm" data-borrow="${k}" ${s.canBorrow(k) ? '' : 'disabled'} title="${esc(L.desc)}">BORROW</button></div>`; }
      c2 += fine('Repaying a loan in full earns Growth standing.');
      x += `<div class="oc-tr"><div>${c1}</div><div>${c2}</div></div>`;
    }
    return x;
  }

  // ---------------------------------------------------------------- EFFICIENCY: getting people and goods in, round and out
  function pageEff(s) {
    const ch = s.reviewChecks(), ok = ch.filter((c) => c[1]).length, R = C.TIDY, pay = ok * R.per + (ok === ch.length ? R.all : 0);
    let x = headline('EFFICIENCY', `The daily efficiency review: ${ok} of ${ch.length} in order, worth ${pay} supplies today${ok < ch.length ? ` (${ch.length * R.per + R.all} with all six)` : ''}. Marked down for: ${ok === ch.length ? 'nothing' : ch.filter((c) => !c[1]).map((c) => esc(c[2])).join(', ')}.`,
      `<div class="segs">${ch.map(([k, good, why]) => `<span class="${good ? 'ok' : 'no'}" title="${esc(good ? CHECKS[k] : why)}">${esc(k.toUpperCase())}</span>`).join('')}</div>`);
    // the layout: the walks
    const W = s.walks(), wm = (label, m, tip) => meter(label, m == null ? '—' : `${m} m`, m == null ? 0 : m / (R.walk * 2), m == null ? 'c' : m <= R.walk ? 'g' : m <= R.walk * 1.4 ? 'a' : 'r', { tick: 0.5, tip });
    let c1 = sec('LAYOUT · THE WALKS', W.all != null ? ` · ${W.all} M ON AVERAGE` : '') + wm('BUNKS TO WORK', W.work, 'From the bunks to the crewed buildings, on the routes troopers really take.') + wm('BUNKS TO THE MESS', W.mess) + wm('BUNKS TO A LATRINE', W.latrine)
      + (W.far ? kv('LONGEST', `${esc(W.far.name)}, ${W.far.m} m`, W.far.m > R.walk ? 'warn' : '') : '') + fine(`The mark is ${R.walk} m. Put bunks near the mess, the latrines and the work.`);
    // the roads
    const len = { dirt: 0, paved: 0, path: 0 }; for (const g of s.net.segs) if (g.k in len) len[g.k] += segLen(s.net, g);
    const road = len.dirt + len.paved;
    c1 += sec('ROADS') + meter('PAVED', road ? `${Math.round(len.paved / road * 100)}%` : '—', road ? len.paved / road : 0, 'c', { tip: 'Trucks go 1.6 times as fast on dirt road and 2.4 times on paved.' })
      + kv('DIRT · PAVED · FOOTPATH', `${Math.round(len.dirt)} · ${Math.round(len.paved)} · ${Math.round(len.path)} tiles`) + fine('Vehicles go 1.6 times as fast on dirt road, 2.4 on paved; people keep to footpaths. Every building needs a road at its door.');
    // in and out
    const pads = s.b.filter((b) => b.done && B[b.type].pad), onPad = GKEYS.reduce((a, g) => a + s.onPad(g), 0), padCap = Math.max(1, pads.length * s.padLoad());
    const tr = s.veh.filter((v) => v.kind === 'truck'), li = s.veh.filter((v) => v.kind === 'lift'), busy = (vs) => vs.filter((v) => v.job).length;
    const ready = s.troops.filter((t) => t.state !== 'patrol' && t.train >= 100 && !t.job).length, seats = s.padSeats() * pads.length, cs = s.crews || [], cb = cs.filter((c) => c.job != null && !c.wait).length, q = s.jobQueue().length;
    let c2 = sec('IN AND OUT') + meter('WAITING ON THE PAD', `${Math.floor(onPad)} goods`, onPad / padCap, onPad > padCap * 0.6 ? 'a' : 'g', { tip: 'Goods the dropship left that nobody has moved to storage yet. More trucks, forklifts and road.' })
      + meter('SUPPLY TRUCKS OUT', `${busy(tr)} of ${tr.length}`, tr.length ? busy(tr) / tr.length : 0, busy(tr) === tr.length && tr.length ? 'a' : 'c', { tip: 'All out means goods wait. A Motor Pool adds two.' })
      + meter('FORKLIFTS OUT', `${busy(li)} of ${li.length}`, li.length ? busy(li) / li.length : 0, 'c')
      + meter('READY FOR THE TRANSPORT', `${ready} for ${seats}`, seats ? Math.min(ready, seats) / seats : 0, 'g', { tip: `Transports leave the pad at ${C.DEPLOY_AT}:00 with trained troopers who are not crewing a building.` })
      + meter(`ENGINEER CREWS · ${q} JOB${q === 1 ? '' : 'S'}`, `${cb} of ${cs.length} busy`, cs.length ? cb / cs.length : 0, q > cs.length + 2 ? 'a' : 'c', { tip: 'Every building job takes a crew. An Engineer Yard trains another.' })
      + fine('How fast goods come off the pad, troopers go out on the transports, and building gets done.');
    // staff and services
    const done = s.b.filter((b) => b.done && !b.off), crewed = done.filter((b) => B[b.type].crew), full = crewed.filter((b) => s.crewFrac(b) >= 1).length, u = s.util, P = s.potties || { n: 0, perPotty: 0 };
    let c3 = sec('STAFF AND SERVICES') + meter('FULLY CREWED', `${full} of ${crewed.length}`, crewed.length ? full / crewed.length : 1, full === crewed.length ? 'g' : 'a', { tip: 'CREW FIRST on a building\'s card puts it ahead; SWITCH OFF frees its crew.' })
      + meter('POWER', `${s.power.made} / ${s.power.used}`, s.power.used ? s.power.made / s.power.used : 1, s.power.ratio >= 1 ? 'g' : 'r')
      + (u ? meter('WATER A DAY', `${u.water.made} / ${u.water.use}`, u.water.use ? u.water.made / u.water.use : 1, u.water.ratio >= 1 ? 'g' : 'a') + meter('SEWAGE A DAY', `${u.sewer.cap} / ${u.sewer.use}`, u.sewer.use ? u.sewer.cap / u.sewer.use : 1, u.sewer.ratio >= 1 ? 'g' : 'a') : '')
      + meter('PER LATRINE', P.n ? `${Math.round(P.perPotty)} troops` : 'none', P.n ? P.perPotty / (R.perPotty * 2) : 1, !P.n || P.perPotty > R.perPotty || P.filthy ? 'r' : 'g', { tick: 0.5, tip: `The review wants ${R.perPotty} or fewer to a latrine, and none filthy.` })
      + (u && u.dark ? `<p class="warn">${u.dark} building${u.dark > 1 ? 's' : ''} outside power coverage: a Substation (UTILITIES).</p>` : '');
    return x + `<div class="oc-3"><div>${c1}</div><div>${c2}</div><div>${c3}</div></div>`;
  }

  // ---------------------------------------------------------------- HAPPINESS: morale, and what moves it
  function pageHap(s) {
    const mor = s.mor || {}, tgt = Math.round(s.moraleTarget ?? s.morale), now = Math.round(s.morale), sum = (ks) => ks.reduce((a, k) => a + (mor[k] || 0), 0);
    const rest = Object.keys(mor).filter((k) => !Object.values(HAPPY).flat().includes(k) && k !== 'base' && mor[k]);
    let x = headline('HAPPINESS', `Morale ${now}, heading for ${tgt}: a baseline of ${mor.base ?? 45}${rest.map((k) => `, ${esc(h.MOR[k] || k)} ${mor[k] > 0 ? '+' : ''}${mor[k]}`).join('')}, and the three below. It moves slowly toward the target. Under 40, troopers work and train worse.`,
      `<div class="track mor"><i><u class="${now < 40 ? 'r' : now < 60 ? 'a' : 'g'}" style="width:${now}%"></u><s class="tgt" style="left:${tgt}%"><em>${tgt}</em></s></i><b>${now}</b></div>`);
    const group = (name, ks, extra) => {
      const v = sum(ks), on = ks.filter((k) => mor[k] || k === 'wall' || k === 'crowd' || k === 'comfort' || k === 'prop'), scale = Math.max(10, ...on.map((k) => Math.abs(mor[k] || 0)));
      return sec(name, ` · ${v > 0 ? '+' : ''}${v} MORALE`) + on.map((k) => dmeter(CAUSE[k] || esc(k.toUpperCase()), mor[k] || 0, scale, h.MOR[k])).join('') + '<div class="oc-sep"></div>' + extra;
    };
    const f = s.fort || s.fortify(), ri = s.raidInfo(), wb = s.wallBonus();
    const def = group('DEFENCE', HAPPY.defence, meter('PERIMETER REVIEW', f.closed ? `${f.score}/100` : 'no wall', f.closed ? f.score / 100 : 0, f.closed && f.score >= 45 ? 'g' : 'r', { tick: 0.45, tip: 'Reviewed every day by the Operations Office: a closed wall, watched, armed, guarded gates, the command post and fuel kept back. Above 45 earns standing.' })
      + meter('RAID THREAT', `${ri.threat} / 100`, ri.threat / 100, ri.threat > 60 ? 'r' : 'a') + meter('BASE STRENGTH', ri.strength, ri.strength / Math.max(60, ri.strength), 'c', { tip: 'Walls, towers, turrets, field works and troopers at the gates.' })
      + fine(`${wb.tower ? 'A closed wall with a tower: +6 morale and 10% more from every building.' : f.closed ? 'A closed wall: +3. Put up a Lookout Tower for +6 and 10% more from every building.' : 'Close a wall round the base: +3 morale, +6 with a Lookout Tower.'} Troopers lost on operations bring grief; medals bring pride.`));
    const home = s.troops.filter((t) => t.state !== 'patrol').length;
    const hou = group('HOUSING', HAPPY.housing, meter('BUNKS', `${s.troops.length} / ${s.beds}`, s.troops.length / Math.max(1, s.beds), s.troops.length > s.beds ? 'r' : 'g') + meter('MESS SEATS', `${s.seats} / ${home}`, s.seats / Math.max(1, home), s.seats >= home ? 'g' : 'r')
      + fine('Comfort comes from the mess, habs, vending and domes. Keep generators, fuel and Industry away from the bunks.'));
    const w = o.war ? o.war() : null, low = s.b.filter((b) => b.done && b.type !== 'hq' && b.cond < 70).length, likely = Math.round(0.35 * s.morale + 0.45 * s.prop + 0.2 * s.avgCond);
    const looks = group('LOOKS', HAPPY.looks, meter('PROPAGANDA SCORE', s.prop, s.prop / 100, 'c', { tip: 'Each kind counts for less the more of it there is: a flag, banners, a loudspeaker and a statue beat ten banners.' })
      + meter('CONDITION', `${Math.round(s.avgCond)}%${low ? ` · ${low} worn` : ''}`, s.avgCond / 100, s.avgCond >= 70 ? 'g' : 'a', { tip: h.CONDITION })
      + meter('ON AIR', `${w ? w.air || 0 : 0} of 5`, (w ? w.air || 0 : 0) / 5, 'c', { tip: 'Parade grounds, speakers, billboards, banners, flags, statues and monuments: footage for the war\'s ratings, in a campaign.' })
      + meter('INSPECTION', s.inspected && s.inspection ? `${s.inspection.score} today` : `likely ${likely}`, (s.inspected && s.inspection ? s.inspection.score : likely) / 100, 'a', { tip: 'The Publicity Office inspects each day: 35% morale, 45% propaganda, 20% condition. It sets Publicity standing.' }));
    return x + `<div class="oc-3"><div>${def}</div><div>${hou}</div><div>${looks}</div></div>`;
  }

  // ---------------------------------------------------------------- OPERATIONS
  function pageOps(s) {
    const home = s.troops.filter((t) => t.state !== 'patrol'), ready = home.filter((t) => t.train >= 100).length, rec = s.troops.filter((t) => t.train < 100), training = rec.filter((t) => t.at).length;
    const pads = s.b.filter((b) => b.done && B[b.type].pad).length;
    let c1 = sec('DEPLOYMENT ORDERS');
    if (!s.orders.length) c1 += fine('No orders open. The next comes with the day.');
    for (const od of s.orders.slice(0, 2)) c1 += meter(`${od.n} TO THE FRONT BY DAY ${calDay(od.due)}`, `${od.sent} / ${od.n}`, od.sent / od.n, od.sent >= od.n ? 'g' : od.due - s.time.day <= 1 ? 'r' : 'a', { big: true, tip: `+${C.DEPLOY_PAY} supplies each, +${od.def} Operations standing when complete.` });
    c1 += fine(`Transports leave the landing pad at ${C.DEPLOY_AT}:00 every watch, ${s.padSeats() * pads} seats across your pads, with trained troopers not crewing a building. +${C.DEPLOY_PAY} supplies each.`);
    c1 += sec('TRAINING') + meter('READY TO SHIP', ready, ready / Math.max(1, s.orders[0] ? s.orders[0].n - s.orders[0].sent : ready || 1), 'g') + meter('RECRUITS TRAINING NOW', `${training} of ${rec.length}`, rec.length ? training / rec.length : 0, 'a', { tip: 'Recruits train 08:00 to 20:00; 100 points makes a trooper.' });
    { const w = s.troops.filter((t) => t.hurt > 0).length; if (w || s.has('medbay')) c1 += kv('WOUNDED', `${w}${s.wardBeds ? ` · ${s.wardBeds} ward beds` : ' · no Medical Bay'}`, w > s.wardBeds ? 'warn' : ''); }
    const places = s.b.filter((b) => b.done && B[b.type].slots);
    c1 += places.length ? places.slice(0, 3).map((b) => { const n = s.troops.filter((t) => t.at === b.id).length, c = s.cap(b, 'slots'); return meter(esc(B[b.type].name.toUpperCase()), `${n}/${c}${TRAIN[B[b.type].train] ? ` · ${TRAIN[B[b.type].train]}/h` : ''}`, n / Math.max(1, c), 'c'); }).join('') : '<p class="warn">Nowhere to train. Build a Firing Range, an Obstacle Course or a Parade Ground (TRAINING).</p>';
    let c2 = sec('SPECIAL OPERATIONS', ' · OPTIONAL');
    if (!s.offers.length) c2 += fine('None on offer. New operations come in with the day.');
    for (const [oi, op] of s.offers.slice(0, 3).entries()) {
      const pick = (vPick[op.id] || []).filter((k) => s.armourFree(k)), ch = s.chance({ ...op, veh: pick }), ok = home.length >= op.size;
      const vb = ['lrv', 'tank'].filter((k) => s.veh.some((v) => v.kind === k)).map((k) => { const free = s.armourFree(k), on = pick.includes(k); return `<button class="plate btn sm${on ? ' on' : ''}" data-veh="${op.id}:${k}" ${free ? '' : 'disabled'} title="${esc(VEHICLES[k].desc)} Burns ${VEHICLES[k].fuel} fuel.">${on ? '✓ ' : '+ '}${VEHICLES[k].name.toUpperCase()}</button>`; }).join('');
      const want = op.wants ? ` · <b class="${pick.includes(op.wants) ? 'up' : op.needs ? 'down' : 'warn'}">${op.needs ? 'NEEDS' : 'CALLS FOR'} ${op.wants === 'lrv' ? 'A ROVER' : 'A TANK'}</b>` : '';
      c2 += `<div class="card2 op"><div class="l"><b><i class="opn">${oi + 1}</i>${esc(op.op)}${op.heavy ? ' <span class="warn">· HEAVY</span>' : ''}</b><span>${esc(op.kind)}${op.place ? `, the ${esc(op.place)}, ${op.km} km ${op.dir}` : ''}${want}</span><span>${'◆'.repeat(op.diff)}${'◇'.repeat(5 - op.diff)} · ${op.size} troopers · ${dur(op.dur * C.PATROL)} · +${op.def} standing, +${op.sup} SUP</span>${vb ? `<div class="oc-veh">${vb}</div>` : ''}</div>
        <div class="oc-odds"><b class="${ch >= 0.65 ? 'up' : ch < 0.45 ? 'down' : 'warn'}">${ok ? Math.round(ch * 100) + '%' : '—'}</b><button class="plate btn sm" data-send="${op.id}" ${ok ? '' : 'disabled'} title="${ok ? 'The odds are the squad\'s, with what it takes along' : `Needs ${op.size} troopers at home`}">SEND</button></div></div>`;
    }
    c2 += fine(s.has('vbay') ? 'A failed operation costs Operations standing, and troopers can be lost.' : 'A failed operation costs standing, and troopers can be lost. Research Scout Rovers and build a Vehicle Bay to take a rover, later a tank, along: better odds.');
    let c3 = sec('IN THE FIELD', s.patrols.length ? ` · ${s.patrols.length}` : '') + (s.patrols.length ? s.patrols.slice(0, 4).map((p) => meter(esc(p.op), `${p.brief > 0 ? 'briefing' : Math.round(p.t / p.dur * 100) + '%'} · odds ${Math.round(p.chance * 100)}%`, p.brief > 0 ? 0 : p.t / p.dur, 'c')).join('') : fine('Nobody out.'));
    const offices = s.b.filter((b) => b.type === 'patrol' && b.done);
    c3 += offices.length ? kv('STANDING PATROLS', `${offices.reduce((a, b) => a + (b.squads || 0), 0)} squads, from ${offices.length} Patrol Office${offices.length > 1 ? 's' : ''}`) : fine(`A Patrol Office (OPERATIONS) sends squads of three out every morning at ${C.PATROL_AT}:00 by itself.`);
    if (s.reports?.length) c3 += sec('LAST RESULTS') + s.reports.slice(-4).reverse().map((r) => kv(esc(r.op), `${r.win ? 'SUCCESS' : 'FAILED'} · ${r.def >= 0 ? '+' : ''}${r.def}`, r.win ? 'up' : 'down', r.lines.join(' '))).join('') + fine('Hover one for its report.');
    return `<div class="oc-3"><div>${c1}</div><div>${c2}</div><div>${c3}</div></div>`;
  }

  // ---------------------------------------------------------------- SCIENCE
  function pageSci(s) {
    const labs = s.b.filter((b) => b.type === 'lab' && b.done), rate = s.labRate();
    let top = !s.has('comms') ? '<p class="warn">Build a Comms Tower, then a Science Lab (OPERATIONS), to start research.</p>' : !labs.length ? '<p class="warn">Build a Science Lab (OPERATIONS) to start research.</p>' : kv('LABS', `${labs.length} · ${rate.toFixed(1)} lab hours an hour`);
    top += fine('One thing at a time, while a lab is crewed and powered; more labs, faster research. Paid for up front, in credits.');
    let cur;
    if (s.tech.cur) { const k = s.tech.cur; cur = meter(`RESEARCHING: ${esc(TECH[k].name.toUpperCase())}`, `${Math.floor(s.tech.pts)} / ${TECH[k].hrs} h${rate > 0 ? ` · ${dur((TECH[k].hrs - s.tech.pts) / rate * C.WEEK / 24)} left` : ' · stalled'}`, s.tech.pts / TECH[k].hrs, rate > 0 ? 'c' : 'r', { big: true }); }
    else cur = meter(labs.length ? 'THE LAB IS IDLE' : 'RESEARCHED', `${s.tech.done.length} of ${Object.keys(TECH).length}`, s.tech.done.length / Object.keys(TECH).length, 'c', { big: true });
    const node = ([k, t]) => {
      const st = s.techState(k), can = st === 'open' && labs.length && !s.tech.cur && s.credits - t.cost >= -s.OD;
      return `<div class="tn ${st}" title="${esc(t.name + ': ' + t.desc)}"><b>${esc(t.name)}</b><span class="d">${esc(t.desc)}</span>${t.needs && st === 'locked' ? `<span class="nd">Needs ${t.needs.map((n) => esc(TECH[n].name)).join(', ')}</span>` : ''}`
        + (st === 'done' ? '<span class="ok">RESEARCHED</span>' : st === 'busy' ? '<span class="ok">IN THE LAB</span>' : `<button class="plate btn sm" data-tech="${k}" ${can ? '' : 'disabled'} title="Research it: ${t.cost} credits, ${t.hrs} lab hours">${t.cost} CR · ${t.hrs}H</button>`) + `</div>`;
    };
    const tier = (n) => Object.entries(TECH).filter(([, t]) => t.tier === n);
    return `<div class="oc-sci"><div>${top}</div><div>${cur}</div></div><div class="tech"><div class="col"><i>TIER 1</i>${tier(1).map(node).join('')}</div><div class="col"><i>TIER 2</i><div class="tg">${tier(2).map(node).join('')}</div></div><div class="col"><i>TIER 3</i>${tier(3).map(node).join('')}</div></div>`;
  }

  const PAGES = { pop: pagePop, bud: pageBud, eff: pageEff, hap: pageHap, ops: pageOps, sci: pageSci };
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
  function open(t, sb) { if (t && PAGES[t]) tab = t; if (sb) sub = sb; el().hidden = false; sigB = ''; render(true); dock(); }
  function close() { if (el()) el().hidden = true; dock(); }
  function toggle(t) { if (isOpen() && (!t || t === tab)) close(); else open(t); audio.click(); }
  // the dock along the bottom: a button a page, each with its measure as a thin bar and a word on how it stands
  function dock() {
    const s = sim(); if (!s || !$('md-pop')) return;
    const set = (k, text, f, col, alert) => { const e = $('md-' + k); if (!e) return; if (e.textContent !== text) e.textContent = text; const b = $('mdb-' + k); if (b) { b.style.width = clamp01(f) * 100 + '%'; b.className = col; } e.parentElement.classList.toggle('alert', !!alert); };
    const nx = s.nextStage(), heads = s.heads(), r = s.rates(), net = r.supNet + r.crNet;
    set('pop', nx ? `${heads} of ${nx.troops}` : `${heads}`, nx ? heads / nx.troops : 1, 'a');
    { let made = 0, lost = 0; for (const ob of [r.sup, r.cr]) for (const v of Object.values(ob)) { if (v > 0) made += v; else lost -= v; } set('bud', `${sg(net)}/watch`, made + lost ? made / (made + lost) : 0.5, net > 0 ? 'g' : 'r', net <= 0); }
    { const ch = s.reviewChecks(), ok = ch.filter((c) => c[1]).length; set('eff', `${ok} of ${ch.length}`, ok / ch.length, ok === ch.length ? 'g' : 'a', ok < ch.length - 2); }
    set('hap', `morale ${Math.round(s.morale)}`, s.morale / 100, s.morale < 40 ? 'r' : s.morale < 60 ? 'a' : 'g', s.morale < 40);
    const od = s.orders[0];
    set('ops', od ? `${od.sent}/${od.n} shipped` : s.offers.length ? `${s.offers.length} on offer` : `${s.patrols.length} out`, od ? od.sent / od.n : 0, 'a', !!od && od.due - s.time.day <= 1 && od.sent < od.n);
    set('sci', s.tech.cur ? `${Math.floor(s.tech.pts / TECH[s.tech.cur].hrs * 100)}%` : s.has('lab') ? 'idle' : `${s.tech.done.length}/${Object.keys(TECH).length}`, s.tech.cur ? s.tech.pts / TECH[s.tech.cur].hrs : 0, 'c', !s.tech.cur && s.has('lab'));
    for (const b of document.querySelectorAll('#fb-dock [data-mt]')) b.classList.toggle('on', isOpen() && b.dataset.mt === tab);
  }

  // clicks inside the window and on the dock; true if it was one of ours
  function click(e) {
    const s = sim(), t = e.target;
    const mt = t.closest('[data-mt]'); if (mt) { const k = mt.dataset.mt; if (mt.closest('#fb-mi-tabs')) { tab = k; render(true); dock(); audio.click(); } else toggle(k); return true; }
    if (t.closest('[data-fb=mclose]')) { close(); audio.click(); return true; }
    if (!t.closest('#fb-mins')) return false;
    const redo = () => { render(true); dock(); h.refresh(); };
    const et = t.closest('[data-et]'); if (et) { sub = et.dataset.et; audio.click(); render(true); return true; }
    const q = t.closest('[data-tq]'); if (q) { tradeQ = +q.dataset.tq; audio.click(); render(true); return true; }
    const tr = t.closest('[data-trade]'); if (tr) { const [g, b] = tr.dataset.trade.split(':'); const r = s.trade(g, tradeQ, b === '1'); if (r && r.ok) audio.click(); else { h.flash((r && r.why) || 'Not now.'); audio.deny(); } redo(); return true; }
    const cm = t.closest('[data-commit]'); if (cm) { const [m, l] = cm.dataset.commit.split(':'); s.setCommit(m, +l); audio.click(); redo(); return true; }
    const vh = t.closest('[data-veh]'); if (vh) { const [id, k] = vh.dataset.veh.split(':'), cur = vPick[id] || []; vPick[id] = cur.includes(k) ? cur.filter((v) => v !== k) : [...cur, k]; audio.click(); render(true); return true; }
    const sd = t.closest('[data-send]'); if (sd) { if (s.send(+sd.dataset.send, vPick[sd.dataset.send] || [])) { delete vPick[sd.dataset.send]; audio.click(); } else { audio.deny(); h.flash('Not enough troopers at home for that.'); } redo(); return true; }
    const bo = t.closest('[data-borrow]'); if (bo) { if (s.borrow(bo.dataset.borrow)) audio.click(); else audio.deny(); redo(); return true; }
    const ry = t.closest('[data-repay]'); if (ry) { const [i, a] = ry.dataset.repay.split(':'); if (s.repay(+i, +a)) audio.click(); else audio.deny(); redo(); return true; }
    const te = t.closest('[data-tech]'); if (te) { if (s.research(te.dataset.tech)) audio.click(); else { audio.deny(); h.flash('Not now: a lab must be built and free, and the credits there.'); } redo(); return true; }
    return false;
  }
  function reset() { tab = 'pop'; sub = 'budget'; sigT = ''; sigB = ''; for (const k in vPick) delete vPick[k]; close(); }
  return { open, close, toggle, isOpen, render, dock, click, reset, tab: () => tab };
}
