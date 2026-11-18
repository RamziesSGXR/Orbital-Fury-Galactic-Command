// Each game's rules run on their own, with no screen, looking for faults: `node test/games.mjs [ground|station|base]`
// A fault is anything thrown, a number that is not a number, a value outside its range, or a save that does not load
// back to the same game.
const which = process.argv[2] || 'all', bad = [];
const fin = (name, v) => { if (!Number.isFinite(v)) bad.push(`${name} is ${v}`); };

if (which === 'all' || which === 'ground') {
  const { Mission } = await import('../js/ground/sim/mission.js');
  const { makeBot, botStep } = await import('../js/ground/sim/bot.js');
  const { hbFilling, tapDemoCharge } = await import('../js/ground/sim/ops.js');
  const { newKit, newWallet } = await import('../js/ground/data/kit.js');
  const out = {};
  for (const faction of ['bugs', 'bots', 'squids']) for (const obj of ['fortress', 'nuke', 'evac', 'vip']) {
    const kit = newKit(), wallet = newWallet(), b0 = wallet.bal; let faults = 0;
    const m = new Mission({ seed: 100 + faction.length * 7 + obj.length, faction, biome: 'desert', sessionMinutes: 0, events: true, missionN: 1, opDone: 0, difficulty: 3, objectives: [obj], kit, wallet, countdown: 0, defenders: true });
    m.guard = true; m.onFault = (part, err) => { faults++; if (faults === 1) bad.push(`ground ${faction}/${obj}: fault in ${part}: ${err && err.message}`); };
    const bot = makeBot(); let i = 0;
    try { for (; i < 30 * 2400 && !m.over; i++) { botStep(m, bot); if (hbFilling(m) && i % 8 === 0) tapDemoCharge(m, -1); m.step(1 / 30); m.events.length = 0; } }
    catch (err) { bad.push(`ground ${faction}/${obj}: threw at ${Math.round(m.t)} s: ${err.message}`); }
    if (!m.over) bad.push(`ground ${faction}/${obj}: not over after ${Math.round(m.t)} s`);
    for (const a of m.alive) { fin(`ground ${faction}/${obj} unit x`, a.x); fin(`ground ${faction}/${obj} unit y`, a.y); }
    fin(`ground ${faction}/${obj} wallet`, wallet.bal); if (wallet.bal < 0) bad.push(`ground ${faction}/${obj}: credits below zero`);
    const r = m.over ? m.result() : {}; fin(`ground ${faction}/${obj} score`, r.score ?? 0);
    out[`${faction}/${obj}`] = `${m.outcome || 'running'} ${Math.round(m.t)}s +${Math.round(wallet.bal - b0)}cr`;
  }
  console.log('GROUND', JSON.stringify(out));
}

if (which === 'all' || which === 'station') {
  const { Station } = await import('../js/orbit/sim.js');
  const { C } = await import('../js/orbit/config.js');
  const st = new Station(4242, 'run');
  try {
    for (const [t, h, p] of [['core', 1, 1], ['gunmount', 1, 0], ['dockport', 1, 2], ['cargo', 1, 4], ['hab', 1, 3], ['solar', 1, 5]]) { const r = st.build(t, h, p, 0); if (!r.ok) console.log('  station: could not build', t, r.why); }
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 30 * 60 * 40; i++) {
      st.step(1 / 30); st.events.length = 0;
      if (i % 300 === 0) { for (const r of [...st.requests]) st.answer(r.id, 0); lo = Math.min(lo, st.credits); hi = Math.max(hi, st.credits); fin('station credits', st.credits); fin('station morale', st.morale); if (st.morale < 0 || st.morale > 100) bad.push(`station morale ${st.morale}`); }
    }
    const data = JSON.parse(JSON.stringify(st.save())), st2 = Station.load(data);
    for (let i = 0; i < 900; i++) { st.step(1 / 30); st2.step(1 / 30); }
    if (Math.abs(st.credits - st2.credits) > 1e-6 || st.parts.size !== st2.parts.size) bad.push(`station: a loaded save ran differently (${st.credits} against ${st2.credits})`);
    console.log('STATION', JSON.stringify({ tier: C.tiers[st.tier].name, week: st.week(), credits: Math.round(st.credits), low: Math.round(lo), high: Math.round(hi), people: st.residents(), parts: st.parts.size, capability: st.capability(), save: JSON.stringify(data).length }));
  } catch (err) { bad.push('station threw: ' + err.message + ' ' + String(err.stack).split('\n')[1]); }
}

if (which === 'all' || which === 'base') {
  const { Sim } = await import('../js/base/sim.js');
  const { C } = await import('../js/base/config.js');
  const sim = new Sim({ seed: 9090, diff: 'recruit' });
  try {
    const hq = sim.b.find(b => b.type === 'hq'), [dx, dz] = sim.door(hq); let roads = 0;
    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = sim.snapLine({ x: dx + 0.5, z: dz + 0.5 }, 'free', 'dirt'), b = sim.snapLine({ x: dx + 0.5 + ox * 14, z: dz + 0.5 + oz * 14 }, 'free', 'dirt', a);
      if (sim.checkLine(a, b, 'dirt').ok && sim.drawLine(a, b, 'dirt')) { roads++; sim.zoneFill(Math.floor(dx + ox * 5 + (oz ? 2 : 0)), Math.floor(dz + oz * 5 + (ox ? 2 : 0)), ['life', 'logi', 'comm', 'train'][roads - 1]); }
    }
    let lo = Infinity;
    for (let i = 0; i < 30000; i++) {
      sim.step(0.1); sim.drain();
      if (i % 500 === 0) { for (const r of [...sim.desk]) for (let k = 0; k < 3; k++) if (sim.decide(r.id, k)) break; lo = Math.min(lo, sim.supplies); fin('base supplies', sim.supplies); fin('base credits', sim.credits); fin('base morale', sim.morale); if (sim.morale < 0 || sim.morale > 100) bad.push(`base morale ${sim.morale}`); }
    }
    const data = JSON.parse(JSON.stringify(sim.save())), s2 = new Sim({ state: data });
    if (s2.b.length !== sim.b.length || Math.abs(s2.supplies - sim.supplies) > 1e-6 || s2.troops.length !== sim.troops.length) bad.push('base: a loaded save is not the same base');
    console.log('BASE', JSON.stringify({ roads, day: Math.floor(sim.time.day), charter: C.STAGES[sim.stage || 0].name, buildings: sim.b.length, troops: sim.troops.length, supplies: Math.round(sim.supplies), lowest: Math.round(lo), credits: Math.round(sim.credits), morale: Math.round(sim.morale), save: JSON.stringify(data).length }));
  } catch (err) { bad.push('base threw: ' + err.message + ' ' + String(err.stack).split('\n')[1]); }
}
console.log(bad.length ? 'FAULTS:\n  ' + bad.join('\n  ') : 'no faults found');
process.exit(bad.length ? 1 : 0);
