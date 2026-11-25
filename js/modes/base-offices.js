// (GC 0.82) THE OFFICES: FOB Commander's windows, from the standalone game (FOB Super Commander's Ministries).
// (GC 0.83) Rebuilt round the base's goals, measured with bars. (GC 0.84) No research: milestones.
// (GC 0.85) SHOW, DON'T TELL (Ramzies: "everything is a lot of text, and feels more like a spreadsheet than a game"). Each
// page is now a LENS: opening it turns the base itself into the picture (base-hud.js colours every building for it, and
// draws coverage, reach or the supply routes on the ground), and the page beside it is a slim column of bars, pictures and
// numbers. What used to be paragraphs is in the tips: hover anything.
//   POPULATION   the milestone ladder (charters and head counts) with pictures of what the next one unlocks; its terms;
//                who is here; bunks and seats. The map: where people live, train and work (crewed, short, empty)
//   BUDGET       made against lost; where it comes from and goes; the allocation by rank and the standings, with the
//                commitment that buys each. TRADE and LOANS beside it. The map: green earns, red costs
//   EFFICIENCY   the daily review's six checks; walks; roads; the pad, trucks, transports, crews; services. The map:
//                served or not, the utilities' reach and the supply routes
//   HAPPINESS    morale; defence, housing and looks; what moves it most; beauty, propaganda, condition. The map: bunks by
//                their surroundings, beauty seen or half seen, and where beauty counts round the bunks
//   OPERATIONS   orders, training, special operations (SEND), squads out. The map: the base's defences and training
import { C, B, GKEYS, GOODS, TECH, VEHICLES, LOANS, COMMIT, MARKET, MIN } from '../base/config.js';
import { MKEYS } from '../base/sim.js';
import { segLen } from '../base/net.js';
import { logoCanvas } from '../base/logo.js';

const $ = (id) => document.getElementById(id);
// the pages: key, name, icon (base-hud.js ICON), colour class
export const OTABS = [['pop', 'POPULATION', 'people', ''], ['bud', 'BUDGET', 'income', ''], ['eff', 'EFFICIENCY', 'roads', ''], ['hap', 'HAPPINESS', 'smile', ''], ['ops', 'OPERATIONS', 'defence', 'c-def']];
const GSHORT = (g) => (g === 'cr' ? 'CR' : g === 'sup' ? 'SUP' : MARKET.goods[g] ? MARKET.goods[g].short : g.toUpperCase());
const clamp01 = (v) => Math.max(0, Math.min(1, v || 0));
const HAPPY = { defence: ['wall', 'pride', 'grief'], housing: ['crowd', 'comfort', 'food', 'latrine', 'noise', 'hazard', 'power', 'water', 'sewer', 'smell', 'sick'], looks: ['beauty', 'prop', 'worn', 'commit'] };
const CAUSE = { beauty: 'BEAUTY', wall: 'CLOSED WALL', pride: 'PRIDE', grief: 'GRIEF', crowd: 'NO BUNK', comfort: 'COMFORT', food: 'HUNGER', latrine: 'LATRINES', noise: 'NOISE', hazard: 'FUEL NEARBY', power: 'POWER CUTS', water: 'WATER', sewer: 'SEWAGE', smell: 'LAGOON SMELL', sick: 'SICKNESS', prop: 'PROPAGANDA', worn: 'WORN BUILDINGS', commit: 'COMMITMENT', mood: 'DESK', unpaid: 'UNPAID WAGES', base: 'BASELINE' };
const CHECKS = { latrines: ['potty', 'Clean latrines, no queues'], mess: ['living', 'A mess seat for everyone'], bunks: ['living', 'A bunk for everyone'], crews: ['people', 'Every crewed building fully crewed'], power: ['power', 'Power for everything'], walks: ['roads', 'Short walks from the bunks'] };

// h: the interface's helpers (base-hud.js): fmt, esc, dur, calDay, OFFICE, CAT, MOR, CONDITION, warns(), flash(text),
// refresh(), icon(k), thumb(type), lens(k), floatAt(el, text, cls); o.war(): what the war takes from the base (base.js)
export function makeOffices(o, h) {
  const { fmt, esc, dur, calDay, icon } = h, sim = () => o.sim(), audio = o.audio;
  let tab = 'pop', sub = 'budget', tradeQ = 50, sigT = '', sigB = '';
  const vPick = {}, logos = {};
  const el = () => $('fb-mins');
  const isOpen = () => !!el() && !el().hidden;
  const sec = (t, tip = '') => `<h3 class="oc-h"${tip ? ` title="${esc(tip)}"` : ''}>${t}</h3>`;
  const sg = (v) => (v >= 0 ? '+' : '−') + fmt(Math.abs(v));
  const logo = (lg) => { const k = JSON.stringify(lg || {}); if (!(k in logos)) { try { logos[k] = logoCanvas(lg, 40).toDataURL(); } catch { logos[k] = ''; } } return logos[k] ? `<img src="${logos[k]}" width="16" height="16" alt="">` : ''; };
  // a measuring bar: a label, the bar (filled to f, 0..1; g green, a amber, r red, c cyan), the value; tick: a mark on it
  const meter = (label, val, f, col = 'g', x = {}) => `<div class="om${x.big ? ' big' : ''}"${x.tip ? ` title="${esc(x.tip)}"` : ''}><span>${x.ic ? icon(x.ic) : ''}${label}</span><i><u class="${col}" style="width:${clamp01(f) * 100}%"></u>${x.tick != null ? `<s style="left:${clamp01(x.tick) * 100}%"></s>` : ''}</i><b class="${x.vc || ''}">${val}</b></div>`;
  const dmeter = (label, v, scale, tip) => { const w = Math.min(50, Math.abs(v) / scale * 50); return `<div class="om d"${tip ? ` title="${esc(tip)}"` : ''}><span>${label}</span><i><u class="${v < 0 ? 'r' : 'g'}" style="${v < 0 ? 'right' : 'left'}:50%;width:${w}%"></u><s style="left:50%"></s></i><b class="${v < 0 ? 'down' : v > 0 ? 'up' : ''}">${v > 0 ? '+' : ''}${v}</b></div>`; };
  // a big number with its name and a gauge under it
  const big = (name, val, f, col, tip, extra = '') => `<div class="ln-big"${tip ? ` title="${esc(tip)}"` : ''}><span>${name}</span><b class="${col === 'r' ? 'down' : ''}">${val}</b>${extra}<i><u class="${col}" style="width:${clamp01(f) * 100}%"></u></i></div>`;
  const pic = (type, ok, tip) => { const u = h.thumb(type); return `<span class="ln-pic${ok ? ' ok' : ''}" title="${esc(tip || B[type].name)}">${u ? `<img src="${u}" alt="">` : ''}<em>${esc(B[type].name)}</em></span>`; };

  // ---------------------------------------------------------------- POPULATION
  function ladder(s) {
    const g = new Map();
    for (const [k, t] of Object.entries(TECH)) { if (t.pop == null && t.stage == null) continue; const id = `${t.stage || 0}:${t.pop || 0}`; if (!g.has(id)) g.set(id, { stage: t.stage || 0, pop: t.pop || 0, keys: [] }); g.get(id).keys.push(k); }
    return [...g.values()].map((m) => ({ ...m, at: Math.max(m.pop, m.stage ? C.STAGES[m.stage].troops : 0), got: m.keys.every((k) => s.hasTech(k)),
      label: (m.stage ? `${(C.STAGES[m.stage].short || C.STAGES[m.stage].name).toUpperCase()}` : '') + (m.stage && m.pop ? ' + ' : '') + (m.pop && (!m.stage || m.pop > C.STAGES[m.stage].troops) ? `${m.pop} PEOPLE` : '') })).sort((a, b) => a.at - b.at || a.stage - b.stage);
  }
  function pagePop(s) {
    const heads = s.heads(), st = s.stage || 0, S = C.STAGES, top = S[S.length - 1].troops, nx = s.nextStage(), L = ladder(s), peak = s.peak || heads;
    const marks = S.map((q, i) => (i ? `<s class="${i <= st ? 'on' : ''}${q.troops >= top * 0.9 ? ' end' : ''}" style="left:${q.troops / top * 100}%"><em>${esc((q.short || q.name).toUpperCase())}</em></s>` : '')).join('')
      + L.filter((m) => !m.stage).map((m) => `<s class="mini${peak >= m.pop ? ' on' : ''}" style="left:${m.pop / top * 100}%" title="${m.pop} people: ${esc(m.keys.map((k) => TECH[k].name).join(', '))}"></s>`).join('');
    let x = `<div class="ln-big"><span>ON THE BASE</span><b>${heads}</b><em>${nx ? `next: ${esc(nx.short || nx.name)} at ${nx.troops}` : 'every charter held'}</em></div><div class="track"><i><u style="width:${clamp01(heads / top) * 100}%"></u>${marks}</i></div>`;
    // what the next milestone brings, as pictures
    const next = L.find((m) => !m.got);
    if (next) {
      const bld = Object.keys(B).filter((t) => next.keys.includes(B[t].tech) && !B[t].fixed), perks = next.keys.filter((k) => !bld.some((t) => B[t].tech === k));
      x += sec(`UNLOCKS AT ${esc(next.label)}`, 'No research: upgrades come with milestones, a head count on the base (the most it has had) or a charter.') + `<div class="ln-pics">${bld.slice(0, 5).map((t) => pic(t, false, `${B[t].name}: ${B[t].desc || ''}`)).join('')}${perks.map((k) => `<span class="ln-pic perk" title="${esc(TECH[k].desc)}">${icon('star')}<em>${esc(TECH[k].name)}</em></span>`).join('')}</div>`;
    }
    if (nx) {
      const R = (v, need, label, ic, tip) => meter(label, `${fmt(v)}/${fmt(need)}`, v / need, v >= need ? 'g' : 'a', { vc: v >= need ? 'up' : '', ic, tip });
      x += sec(`${esc((nx.short || nx.name).toUpperCase())} CHARTER`, `Granted by itself when every term is met: more land (up to ${nx.parcels >= 441 ? 'all 441' : nx.parcels} parcels), a bigger allocation, new buildings, and in a campaign more for the war.`)
        + R(heads, nx.troops, 'PEOPLE', 'people') + R(Math.round(s.stand.pro), nx.pro, 'GROWTH', 'income', 'Growth standing: the Growth Office\'s daily audit, and the commitment you pay it (BUDGET).') + R(Math.floor(s.credits), nx.cr, 'FEE', 'income', 'Credits for the charter fee.')
        + (nx.sup ? R(Math.floor(s.supplies), nx.sup, 'WORKS', 'logistics', 'Supplies for the charter works.') : '') + (nx.store ? R(Math.round(s.storeAll()), nx.store, 'STORAGE', 'logistics', 'Rations, fuel and ammo the stores can hold.') : '');
      if ((nx.needs || []).length) x += `<div class="ln-pics sm">${nx.needs.map((t) => pic(t, s.has(t), `${B[t].name}${s.has(t) ? ': built' : ': needed'}`)).join('')}</div>`;
    }
    // who is here
    const T = s.troops, patrol = T.filter((t) => t.state === 'patrol').length, hurt = T.filter((t) => t.state !== 'patrol' && t.hurt > 0).length, ready = T.filter((t) => t.state !== 'patrol' && !(t.hurt > 0) && t.train >= 100).length, rec = T.length - patrol - hurt - ready, eng = s.engineers();
    const parts = [['TRAINED', ready, '#8df0a0'], ['RECRUITS', rec, 'var(--amber)'], ['OUT', patrol, 'var(--cyan)'], ['WOUNDED', hurt, '#ff8a7a'], ['ENGINEERS', eng, '#9ab8ff']], all = Math.max(1, heads);
    x += sec('WHO IS HERE', 'The map: where they live (blue), train (amber) and work (green crewed, amber short, red empty).') + `<div class="stack">${parts.map(([n, v, c]) => (v ? `<u style="width:${v / all * 100}%;background:${c}" title="${n}: ${v}"></u>` : '')).join('')}</div><div class="legend">${parts.filter(([, v]) => v).map(([n, v, c]) => `<span><i style="background:${c}"></i>${n} ${v}</span>`).join('')}</div>`;
    const home = T.length - patrol, empty = Math.max(0, s.beds - T.length);
    x += meter('BUNKS', `${T.length}/${s.beds}`, T.length / Math.max(1, s.beds), T.length > s.beds ? 'r' : empty ? 'g' : 'a', { ic: 'living', tip: empty ? `${empty} empty: recruits fill them each morning.` : 'Full: no recruits will come until there are empty bunks. Zone Life Support.' })
      + meter('MESS SEATS', `${s.seats}/${home}`, s.seats / Math.max(1, home), s.seats >= home ? 'g' : 'r', { ic: 'living' });
    const w = o.war ? o.war() : null;
    if (w && w.gives && w.gives.length) x += `<div class="oc-gives" title="What the base gives the war each round. Greyed out: once it is in profit.">${w.gives.map((g) => `<span class="${g.wait ? 'wait' : ''}"><b>${g.v != null ? '+' + g.v : ''}</b> ${esc(g.k)}</span>`).join('')}</div>`;
    return x;
  }

  // ---------------------------------------------------------------- BUDGET, TRADE, LOANS
  function pageBud(s) {
    const r = s.rates(), net = r.supNet + r.crNet;
    let x = `<div class="subtabs">${[['budget', 'BUDGET'], ['trade', 'TRADE'], ['loans', 'LOANS']].map(([k, n]) => `<button class="plate btn sm${sub === k ? ' on' : ''}" data-et="${k}">${n}</button>`).join('')}</div>`;
    if (sub === 'budget') {
      x += big('NET A WATCH', sg(net), 0.5 + Math.max(-0.5, Math.min(0.5, net / 400)), net > 0 ? 'g' : 'r', 'Supplies and credits a watch, together. In profit, the war gets this base\'s ratings and credits. The map: green buildings earn, red cost.', `<em>${net > 0 ? 'in profit' : 'not in profit'}</em>`);
      // made against lost, one row a currency: the green bar is what came in a watch, the red what went out
      const pair = (ob, unit) => { let made = 0, lost = 0; for (const v of Object.values(ob)) { if (v > 0) made += v; else lost -= v; } const t = Math.max(made, lost, 1); return `<div class="ln-ml" title="${unit}: +${fmt(made)} made, −${fmt(lost)} lost a watch"><b>${unit}</b><i><u class="g" style="width:${made / t * 100}%"></u></i><span class="up">+${fmt(made)}</span><i><u class="r" style="width:${lost / t * 100}%"></u></i><span class="down">−${fmt(lost)}</span></div>`; };
      x += `<div class="ln-mlh"><span></span><span>MADE</span><span></span><span>LOST</span></div>` + pair(r.sup, 'SUP') + pair(r.cr, 'CR');
      // the biggest sources and costs, both currencies, one list each
      const all = []; for (const [k, v] of Object.entries(r.sup)) all.push([k, v, 'SUP']); for (const [k, v] of Object.entries(r.cr)) all.push([k, v, 'CR']);
      const inc = all.filter((q) => q[1] >= 0.5).sort((a, b) => b[1] - a[1]).slice(0, 3), out = all.filter((q) => q[1] <= -0.5).sort((a, b) => a[1] - b[1]).slice(0, 3), topv = Math.max(1, ...all.map((q) => Math.abs(q[1])));
      x += sec('BIGGEST IN') + inc.map(([k, v, u]) => meter(esc((h.CAT[k] || k).toUpperCase()), `+${fmt(v)} ${u}`, v / topv, 'g', { vc: 'up' })).join('')
        + sec('BIGGEST OUT') + out.map(([k, v, u]) => meter(esc((h.CAT[k] || k).toUpperCase()), `−${fmt(-v)} ${u}`, -v / topv, 'r', { vc: 'down' })).join('');
      const rows = s.table(), S = C.STAGES[s.stage || 0], rank = s.ranking(), alloc = (i) => Math.round(C.ALLOC.base * C.ALLOC.mult[Math.min(i, C.ALLOC.mult.length - 1)] * (1 + (S.alloc || 0)));
      x += sec(`ALLOCATION · ${['1ST', '2ND', '3RD', '4TH', '5TH'][rank]} · ${fmt(alloc(rank))} A DAY`, 'Paid each day by rank among the outfits; rank is the three standings added up. Each standing drifts back toward ' + C.STAND.rest + ' every day; a commitment buys it every watch.')
        + `<div class="oc-ranks">${rows.map((q, i) => `<span class="${q.me ? 'me' : ''}" title="${esc(q.name)}">${i + 1} ${logo(q.logo)} ${s.total(q.stand)}</span>`).join('')}</div>`;
      for (const m of MKEYS) {
        const lvl = s.commit[m] || 0, cost = s.commitCost(m, lvl), paid = s.commitLast?.[m] ?? 1, ct = lvl ? `${Object.entries(cost).map(([g, n]) => `${fmt(n)} ${GSHORT(g)}`).join(' + ')} a watch buys +${s.commitGain(m, lvl).toFixed(1)} standing. ` : '';
        x += `<div class="oc-st"><span title="${esc(MIN[m].name + ': ' + MIN[m].wants)}">${esc(MIN[m].short)}</span><i><u class="${m === 'def' ? 'r' : m === 'pro' ? 'a' : 'c'}" style="width:${clamp01(s.stand[m] / 100) * 100}%"></u></i><b>${Math.round(s.stand[m])}</b>`
          + `<button class="plate btn sm" data-commit="${m}:${lvl - 1}" ${lvl ? '' : 'disabled'} title="Commit less">−</button><em class="${lvl && paid < 0.6 ? 'down' : ''}" title="${esc(ct + COMMIT[m].perk)}">${COMMIT.levels[lvl]}</em><button class="plate btn sm" data-commit="${m}:${lvl + 1}" ${lvl < COMMIT.levels.length - 1 ? '' : 'disabled'} title="Commit more">+</button></div>`;
      }
    } else if (sub === 'trade') {
      const M = s.market;
      x += `<div class="qsel"><span>LOTS OF</span>${[10, 50, 100, 250].map((q) => `<button class="plate btn sm${tradeQ === q ? ' on' : ''}" data-tq="${q}">${q}</button>`).join('')}</div>`;
      x += Object.keys(MARKET.goods).map((g) => {
        const d = MARKET.goods[g], buy = s.canTrade(g, tradeQ, true), sell = s.canTrade(g, tradeQ, false), col = g === 'sup' ? 'var(--amber)' : GOODS[g]?.color || '#ccc';
        return `<div class="ln-good" title="${esc(`${d.name}: you sell at ${(s.sellAt(g) * 10).toFixed(1)} and buy at ${(s.buyAt(g) * 10).toFixed(1)} credits per 10.`)}"><i style="background:${col}"></i><b>${esc(d.short)}</b><span>${fmt(s.holding(g))}</span>`
          + `<button class="plate btn sm" data-trade="${g}:1" ${buy.ok ? '' : 'disabled'} title="${esc(buy.ok ? '' : buy.why || '')}">BUY −${fmt(s.quote(g, tradeQ, true))}</button><button class="plate btn sm" data-trade="${g}:0" ${sell.ok ? '' : 'disabled'} title="${esc(sell.ok ? '' : sell.why || '')}">SELL +${fmt(s.quote(g, tradeQ, false))}</button></div>`;
      }).join('');
      if (M.shocks.length) x += `<p class="warn sm">${M.shocks.map((q) => esc(q.text)).join(' ')}</p>`;
      x += sec('OFFERS', 'Other bases post offers at 10:00 and 15:00.') + (M.offers.length ? M.offers.slice(0, 3).map((of) => {
        const d = MARKET.goods[of.g], ok = s.canTakeOffer(of), mk = (of.buys ? s.sellAt(of.g) : s.buyAt(of.g)) * 10, better = of.buys ? of.p * 10 > mk : of.p * 10 < mk;
        return `<div class="ln-offer" title="${esc(`${of.from} · until day ${calDay(of.until)} · market ${mk.toFixed(1)}${ok.ok ? '' : ' · ' + (ok.why || '')}`)}">${logo(of.logo)}<b>${of.buys ? 'WANT' : 'SELL'} ${of.n} ${esc(d.short)}</b><span class="${better ? 'up' : 'down'}">${(of.p * 10).toFixed(1)}/10</span><button class="plate btn sm" data-offer="${of.id}" ${ok.ok ? '' : 'disabled'}>${of.buys ? 'SELL' : 'BUY'}</button></div>`;
      }).join('') : '<p class="fine">None right now.</p>');
    } else {
      const debt = s.debt();
      x += big('OWED', fmt(debt), debt / Math.max(1, LOANS.charter.amt), debt > 0 ? 'r' : 'g', 'Against the Founding Charter you landed on, and any loans since. The Bureau takes its payments every day.');
      s.loans.forEach((l, i) => { const L = LOANS[l.k], rate = l.k === 'charter' && s.D && s.D.rate != null ? s.D.rate : L.rate;
        x += `<div class="ln-offer" title="${esc(`${Math.round(rate * 1000) / 10}% a day; ${L.pay} credits a day taken`)}"><b>${esc(L.name.toUpperCase())}</b><span>${fmt(l.bal)}</span><button class="plate btn sm" data-repay="${i}:100" ${s.credits >= 1 ? '' : 'disabled'}>−100</button><button class="plate btn sm" data-repay="${i}:${Math.ceil(l.bal)}" ${s.credits >= l.bal ? '' : 'disabled'}>ALL</button></div>`; });
      if (s.credits < 0) x += meter('OVERDRAFT', `${fmt(-s.credits)}/${fmt(s.OD)}`, -s.credits / s.OD, 'r', { tip: `${Math.round(C.ODFEE * 100)}% a day. Past the limit the staff go unpaid and morale falls.` });
      x += sec('BORROW', 'Repaying a loan in full earns Growth standing.') + ['dev', 'quick'].map((k) => { const L = LOANS[k]; return `<div class="ln-offer" title="${esc(L.desc + ` ${Math.round(L.rate * 1000) / 10}% a day.`)}"><b>${esc(L.name.toUpperCase())}</b><span>${fmt(L.amt)}</span><button class="plate btn sm" data-borrow="${k}" ${s.canBorrow(k) ? '' : 'disabled'}>BORROW</button></div>`; }).join('');
    }
    return x;
  }

  // ---------------------------------------------------------------- EFFICIENCY
  function pageEff(s) {
    const ch = s.reviewChecks(), ok = ch.filter((c) => c[1]).length, R = C.TIDY, pay = ok * R.per + (ok === ch.length ? R.all : 0);
    let x = `<div class="ln-big" title="The daily efficiency review pays supplies for each check in order, and a bonus for all six."><span>DAILY REVIEW</span><b>${ok}/${ch.length}</b><em>+${pay} supplies</em></div>`
      + `<div class="segs">${ch.map(([k, good, why]) => `<span class="${good ? 'ok' : 'no'}" title="${esc(good ? CHECKS[k][1] : why)}">${icon(CHECKS[k][0])}</span>`).join('')}</div>`;
    const W = s.walks(), wm = (label, m, tip) => meter(label, m == null ? '—' : `${m} m`, m == null ? 0 : m / (R.walk * 2), m == null ? 'c' : m <= R.walk ? 'g' : m <= R.walk * 1.4 ? 'a' : 'r', { tick: 0.5, tip });
    x += sec(`WALKS FROM THE BUNKS · ${W.all == null ? '—' : W.all + ' M'}`, `The mark is ${R.walk} m on average.${W.far ? ` Longest: ${W.far.name}, ${W.far.m} m.` : ''}`) + wm('TO WORK', W.work) + wm('TO THE MESS', W.mess) + wm('TO A LATRINE', W.latrine);
    const len = { dirt: 0, paved: 0 }; for (const g of s.net.segs) if (g.k in len) len[g.k] += segLen(s.net, g);
    const road = len.dirt + len.paved;
    x += meter('PAVED ROAD', road ? `${Math.round(len.paved / road * 100)}%` : '—', road ? len.paved / road : 0, 'c', { ic: 'roads', tip: 'Trucks go 1.6 times as fast on dirt road and 2.4 times on paved.' });
    const pads = s.b.filter((b) => b.done && B[b.type].pad), onPad = GKEYS.reduce((a, g) => a + s.onPad(g), 0), padCap = Math.max(1, pads.length * s.padLoad());
    const tr = s.veh.filter((v) => v.kind === 'truck'), busy = (vs) => vs.filter((v) => v.job).length, ready = s.troops.filter((t) => t.state !== 'patrol' && t.train >= 100 && !t.job).length, seats = s.padSeats() * pads.length, cs = s.crews || [], cb = cs.filter((c) => c.job != null && !c.wait).length, q = s.jobQueue().length;
    x += sec('IN AND OUT', 'The map draws the supply routes: brighter, a truck or forklift is on it now.') + meter('ON THE PAD', `${Math.floor(onPad)}`, onPad / padCap, onPad > padCap * 0.6 ? 'a' : 'g', { ic: 'logistics', tip: 'Goods the dropship left that nobody has moved yet.' })
      + meter('TRUCKS OUT', `${busy(tr)}/${tr.length}`, tr.length ? busy(tr) / tr.length : 0, busy(tr) === tr.length && tr.length ? 'a' : 'c', { ic: 'logistics', tip: 'All out means goods wait. A Motor Pool adds two.' })
      + meter('TRANSPORT', `${ready}/${seats}`, seats ? Math.min(ready, seats) / seats : 0, 'g', { ic: 'command', tip: `Troopers ready for the ${C.DEPLOY_AT}:00 transport, and its seats.` })
      + meter(`CREWS · ${q} JOBS`, `${cb}/${cs.length}`, cs.length ? cb / cs.length : 0, q > cs.length + 2 ? 'a' : 'c', { ic: 'industry', tip: 'Engineer crews at work, and the building jobs waiting. An Engineer Yard trains another crew.' });
    const done = s.b.filter((b) => b.done && !b.off), crewed = done.filter((b) => B[b.type].crew), full = crewed.filter((b) => s.crewFrac(b) >= 1).length, u = s.util;
    x += sec('SERVICES', 'The map: green served, amber short of water, sewage or crew, red dark. The rings are each utility\'s reach.') + meter('CREWED', `${full}/${crewed.length}`, crewed.length ? full / crewed.length : 1, full === crewed.length ? 'g' : 'a', { ic: 'people' })
      + meter('POWER', `${s.power.made}/${s.power.used}`, s.power.used ? s.power.made / s.power.used : 1, s.power.ratio >= 1 ? 'g' : 'r', { ic: 'power' })
      + (u ? meter('WATER', `${u.water.made}/${u.water.use}`, u.water.use ? u.water.made / u.water.use : 1, u.water.ratio >= 1 ? 'g' : 'a', { ic: 'drop' }) + meter('SEWAGE', `${u.sewer.cap}/${u.sewer.use}`, u.sewer.use ? u.sewer.cap / u.sewer.use : 1, u.sewer.ratio >= 1 ? 'g' : 'a', { ic: 'potty' }) : '');
    return x;
  }

  // ---------------------------------------------------------------- HAPPINESS
  function pageHap(s) {
    const mor = s.mor || {}, tgt = Math.round(s.moraleTarget ?? s.morale), now = Math.round(s.morale), sum = (ks) => ks.reduce((a, k) => a + (mor[k] || 0), 0);
    let x = `<div class="ln-big" title="Morale moves slowly toward where it is heading. Under 40, troopers work and train worse."><span>MORALE</span><b class="${now < 40 ? 'down' : ''}">${now}</b><em>${tgt > now + 1 ? `↑ heading for ${tgt}` : tgt < now - 1 ? `↓ heading for ${tgt}` : 'steady'}</em></div>`
      + `<div class="track mor"><i><u class="${now < 40 ? 'r' : now < 60 ? 'a' : 'g'}" style="width:${now}%"></u><s class="tgt" style="left:${tgt}%"></s></i></div>`;
    const G = [['DEFENCE', 'defence', HAPPY.defence, 'A closed wall: +3, +6 with a Lookout Tower. Medals bring pride; troopers lost bring grief.'], ['HOUSING', 'living', HAPPY.housing, 'Bunks, comfort (mess, habs, domes), food, latrines, quiet, water and sewage.'], ['LOOKS', 'beauty', HAPPY.looks, 'Beauty near the bunks, propaganda, and the condition of the buildings.']];
    x += `<div class="ln-groups">${G.map(([n, ic, ks, tip]) => { const v = sum(ks); return `<div class="${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}" title="${esc(tip)}">${icon(ic)}<b>${v > 0 ? '+' : ''}${v}</b><span>${n}</span></div>`; }).join('')}</div>`;
    const causes = Object.entries(mor).filter(([k, v]) => v && k !== 'base').sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 7), scale = Math.max(8, ...causes.map(([, v]) => Math.abs(v)));
    x += sec('WHAT MOVES IT MOST', `A baseline of ${mor.base ?? 45}, then these.`) + causes.map(([k, v]) => dmeter(CAUSE[k] || esc(k.toUpperCase()), v, scale, h.MOR[k])).join('');
    const w = o.war ? o.war() : null, likely = Math.round(0.35 * s.morale + 0.45 * s.prop + 0.2 * s.avgCond);
    x += sec('HOW THE BASE LOOKS', 'The map: bunks blue when happy where they stand, red beside noise, fuel or a lagoon; beauty bright where the bunks can see it. The green rings are where beauty counts in full.')
      + meter('BEAUTY', s.look || 0, (s.look || 0) / 100, 'g', { ic: 'beauty', tip: 'Trees, planters, gardens, fountains and parks (BEAUTY).' })
      + meter('PROPAGANDA', s.prop, s.prop / 100, 'c', { ic: 'truth', tip: 'Each kind counts for less the more of it there is.' })
      + meter('CONDITION', `${Math.round(s.avgCond)}%`, s.avgCond / 100, s.avgCond >= 70 ? 'g' : 'a', { ic: 'wrench', tip: h.CONDITION })
      + meter('ON AIR', `${w ? w.air || 0 : 0}/5`, (w ? w.air || 0 : 0) / 5, 'c', { ic: 'command', tip: 'Gardens, fountains, parks, parades, flags, statues: footage for the war\'s ratings.' })
      + meter('INSPECTION', s.inspected && s.inspection ? s.inspection.score : `≈${likely}`, (s.inspected && s.inspection ? s.inspection.score : likely) / 100, 'a', { ic: 'star', tip: 'The Publicity Office inspects daily: 35% morale, 45% propaganda, 20% condition.' });
    return x;
  }

  // ---------------------------------------------------------------- OPERATIONS
  function pageOps(s) {
    const home = s.troops.filter((t) => t.state !== 'patrol'), ready = home.filter((t) => t.train >= 100).length, rec = s.troops.filter((t) => t.train < 100), training = rec.filter((t) => t.at).length;
    const od = s.orders[0];
    let x = od ? `<div class="ln-big" title="${esc(`Transports leave the pad at ${C.DEPLOY_AT}:00 with trained troopers not crewing a building. +${C.DEPLOY_PAY} supplies each; +${od.def} Operations standing when complete.`)}"><span>TO THE FRONT BY DAY ${calDay(od.due)}</span><b>${od.sent}/${od.n}</b><em>${dur(Math.max(0, od.due - s.time.day) * C.DAY)} left</em><i><u class="${od.due - s.time.day <= 1 && od.sent < od.n ? 'r' : 'a'}" style="width:${clamp01(od.sent / od.n) * 100}%"></u></i></div>` : '<div class="ln-big"><span>DEPLOYMENT</span><b>—</b><em>no orders open</em></div>';
    x += meter('READY TO SHIP', ready, od ? ready / Math.max(1, od.n - od.sent) : ready ? 1 : 0, 'g', { ic: 'people' }) + meter('TRAINING NOW', `${training}/${rec.length}`, rec.length ? training / rec.length : 0, 'a', { ic: 'training', tip: 'Recruits train 08:00 to 20:00; 100 points makes a trooper.' });
    if (!s.b.some((b) => b.done && B[b.type].slots)) x += '<p class="warn sm">Nowhere to train: TRAINING has the Firing Range.</p>';
    x += sec('SPECIAL OPERATIONS', 'Optional. Success: standing and supplies. Failure: standing, and troopers can be lost. A rover or tank improves the odds.');
    if (!s.offers.length) x += '<p class="fine">None on offer today.</p>';
    for (const op of s.offers.slice(0, 3)) {
      const pick = (vPick[op.id] || []).filter((k) => s.armourFree(k)), ch = s.chance({ ...op, veh: pick }), ok = home.length >= op.size;
      const vb = ['lrv', 'tank'].filter((k) => s.veh.some((v) => v.kind === k)).map((k) => { const free = s.armourFree(k), on = pick.includes(k); return `<button class="plate btn sm${on ? ' on' : ''}" data-veh="${op.id}:${k}" ${free ? '' : 'disabled'} title="${esc(VEHICLES[k].desc)}">${on ? '✓' : '+'}${k === 'lrv' ? 'ROVER' : 'TANK'}</button>`; }).join('');
      x += `<div class="ln-op" title="${esc(`${op.kind}${op.place ? `, the ${op.place}, ${op.km} km ${op.dir}` : ''}. ${op.size} troopers, ${dur(op.dur * C.PATROL)}. +${op.def} standing, +${op.sup} supplies.${op.wants ? (op.needs ? ' Needs a ' : ' Calls for a ') + (op.wants === 'lrv' ? 'rover.' : 'tank.') : ''}`)}"><div><b>${esc(op.op.replace(/^Operation /, ''))}</b><span>${'◆'.repeat(op.diff)}${'◇'.repeat(5 - op.diff)} · ${op.size}${icon('people')} · +${op.sup}</span>${vb ? `<div class="oc-veh">${vb}</div>` : ''}</div><b class="odds ${ch >= 0.65 ? 'up' : ch < 0.45 ? 'down' : 'warn'}">${ok ? Math.round(ch * 100) + '%' : '—'}</b><button class="plate btn sm" data-send="${op.id}" ${ok ? '' : 'disabled'}>SEND</button></div>`;
    }
    if (s.patrols.length) x += sec('IN THE FIELD') + s.patrols.slice(0, 3).map((p) => meter(esc(p.op.replace(/^Operation /, '').toUpperCase()), p.brief > 0 ? 'briefing' : `${Math.round(p.chance * 100)}%`, p.brief > 0 ? 0 : p.t / p.dur, 'c')).join('');
    if (s.reports?.length) x += `<div class="ln-res">${s.reports.slice(-4).reverse().map((r) => `<span class="${r.win ? 'up' : 'down'}" title="${esc(r.op + ': ' + r.lines.join(' '))}">${r.win ? '✓' : '✗'} ${r.def >= 0 ? '+' : ''}${r.def}</span>`).join('')}</div>`;
    return x;
  }

  const PAGES = { pop: pagePop, bud: pageBud, eff: pageEff, hap: pageHap, ops: pageOps };
  // only redraw what changed, and never under a button the pointer is on, so it stays put while you click it
  function render(force) {
    if (!isOpen()) return;
    const s = sim(), w = el(), tb = $('fb-mi-tabs'), body = $('fb-mi-body');
    const tabs = OTABS.map(([k, n, ic, c]) => `<button class="ln-tab${tab === k ? ' on' : ''}" data-mt="${k}" title="${n}"><span class="${c}">${icon(ic)}</span></button>`).join('');
    if (tabs !== sigT) { sigT = tabs; tb.innerHTML = tabs; $('fb-mi-name').textContent = OTABS.find((q) => q[0] === tab)[1]; }
    let x = '';
    try { x = PAGES[tab](s); } catch (err) { console.error(err); x = `<p class="warn">This page could not be drawn: ${esc(err.message)}</p>`; }
    if (x !== sigB && (force || !w.querySelector('#fb-mi-body button:hover'))) { sigB = x; body.innerHTML = x; }
  }
  function open(t, sb) { if (t && PAGES[t]) tab = t; if (sb) sub = sb; el().hidden = false; sigB = ''; sigT = ''; render(true); dock(); h.lens(tab); }
  function close() { if (el()) el().hidden = true; dock(); h.lens(null); }
  function toggle(t) { if (isOpen() && (!t || t === tab)) close(); else open(t); audio.click(); }
  // the dock along the bottom: a button a page, each with its measure as a thin bar
  function dock() {
    const s = sim(); if (!s || !$('md-pop')) return;
    const set = (k, text, f, col, alert) => { const e = $('md-' + k); if (!e) return; if (e.textContent !== text) e.textContent = text; const b = $('mdb-' + k); if (b) { b.style.width = clamp01(f) * 100 + '%'; b.className = col; } e.parentElement.classList.toggle('alert', !!alert); };
    const nx = s.nextStage(), heads = s.heads(), r = s.rates(), net = r.supNet + r.crNet;
    set('pop', nx ? `${heads}/${nx.troops}` : `${heads}`, nx ? heads / nx.troops : 1, 'a');
    { let made = 0, lost = 0; for (const ob of [r.sup, r.cr]) for (const v of Object.values(ob)) { if (v > 0) made += v; else lost -= v; } set('bud', `${sg(net)}`, made + lost ? made / (made + lost) : 0.5, net > 0 ? 'g' : 'r', net <= 0); }
    { const ch = s.reviewChecks(), ok = ch.filter((c) => c[1]).length; set('eff', `${ok}/${ch.length}`, ok / ch.length, ok === ch.length ? 'g' : 'a', ok < ch.length - 2); }
    set('hap', `${Math.round(s.morale)}`, s.morale / 100, s.morale < 40 ? 'r' : s.morale < 60 ? 'a' : 'g', s.morale < 40);
    const od = s.orders[0];
    set('ops', od ? `${od.sent}/${od.n}` : s.offers.length ? `${s.offers.length} ops` : `${s.patrols.length} out`, od ? od.sent / od.n : 0, 'a', !!od && od.due - s.time.day <= 1 && od.sent < od.n);
    for (const b of document.querySelectorAll('#fb-dock [data-mt]')) b.classList.toggle('on', isOpen() && b.dataset.mt === tab);
  }

  // clicks inside the panel and on the dock; true if it was one of ours
  function click(e) {
    const s = sim(), t = e.target;
    const mt = t.closest('[data-mt]'); if (mt) { const k = mt.dataset.mt; if (mt.closest('#fb-mi-tabs')) { tab = k; sigT = ''; render(true); dock(); h.lens(tab); audio.click(); } else toggle(k); return true; }
    if (t.closest('[data-fb=mclose]')) { close(); audio.click(); return true; }
    if (!t.closest('#fb-mins')) return false;
    const redo = () => { render(true); dock(); h.refresh(); };
    const et = t.closest('[data-et]'); if (et) { sub = et.dataset.et; audio.click(); render(true); return true; }
    const q = t.closest('[data-tq]'); if (q) { tradeQ = +q.dataset.tq; audio.click(); render(true); return true; }
    const tr = t.closest('[data-trade]'); if (tr) { const [g, b] = tr.dataset.trade.split(':'); const r = s.trade(g, tradeQ, b === '1'); if (r && r.ok) { audio.click(); h.floatAt(tr, `${b === '1' ? '+' : '−'}${tradeQ} ${GSHORT(g)}`, b === '1' ? 'up' : 'down'); } else { h.flash((r && r.why) || 'Not now.'); audio.deny(); } redo(); return true; }
    const cm = t.closest('[data-commit]'); if (cm) { const [m, l] = cm.dataset.commit.split(':'); s.setCommit(m, +l); audio.click(); redo(); return true; }
    const vh = t.closest('[data-veh]'); if (vh) { const [id, k] = vh.dataset.veh.split(':'), cur = vPick[id] || []; vPick[id] = cur.includes(k) ? cur.filter((v) => v !== k) : [...cur, k]; audio.click(); render(true); return true; }
    const sd = t.closest('[data-send]'); if (sd) { if (s.send(+sd.dataset.send, vPick[sd.dataset.send] || [])) { delete vPick[sd.dataset.send]; audio.click(); } else { audio.deny(); h.flash('Not enough troopers at home for that.'); } redo(); return true; }
    const bo = t.closest('[data-borrow]'); if (bo) { if (s.borrow(bo.dataset.borrow)) { audio.click(); h.floatAt(bo, `+${LOANS[bo.dataset.borrow].amt} CR`, 'up'); } else audio.deny(); redo(); return true; }
    const ry = t.closest('[data-repay]'); if (ry) { const [i, a] = ry.dataset.repay.split(':'); if (s.repay(+i, +a)) audio.click(); else audio.deny(); redo(); return true; }
    return false;
  }
  function reset() { tab = 'pop'; sub = 'budget'; sigT = ''; sigB = ''; for (const k in vPick) delete vPick[k]; close(); }
  return { open, close, toggle, isOpen, render, dock, click, reset, tab: () => tab };
}
