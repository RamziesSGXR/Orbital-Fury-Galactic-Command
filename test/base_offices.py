# (GC 0.82) Browser check of FOB Commander's Offices (js/modes/base-offices.js): python3 test/base_offices.py [out]
# (needs the server on 8080)
#   - (GC 0.83) the dock opens each page (POPULATION, BUDGET & TRADE, EFFICIENCY, HAPPINESS, OPERATIONS, SCIENCE) and
#     marks it; each leads with its measure; every page fits a 1280 x 720 screen without scrolling
#   - the big numbers open BUDGET (OWED: TRADE & LOANS), the day the budget, MORALE HAPPINESS; Esc closes, O opens
#   - the controls work: trade on the market, a commitment up a level, borrow and repay, send a special operation; a
#     file graded from the task board
#   - (GC 0.84) no SCIENCE: upgrades come with milestones (the ladder on POPULATION); beauty lifts morale near the bunks,
#     not at all in an Industry zone; the cursor says why a building cannot go where it points
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'; errs = []
TABS = ['pop', 'bud', 'eff', 'hap', 'ops']
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
    pg.click('#b-new'); pg.click('#f-go'); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(700)
    pid = pg.evaluate('sgs.g.P.find(p => p.owner === "fed" && p.ring === 1).id')
    pg.evaluate(f'gc.app.theatre("base", {{ system: sgs.g.P[{pid}] }})')
    pg.wait_for_function("gc.state === 'base' && document.getElementById('trans').hidden", timeout=120000)
    pg.wait_for_timeout(1500)
    print(pg.evaluate('JSON.stringify(gc.mode.fast())'))
    # a base with something in every window: a day and a half on, a comms tower, a file to grade, money in the bank
    prep = pg.evaluate("""(() => { const s = gc.mode.sim; for (let i = 0; i < 5000; i++) s.step(0.1); s.drain();
      const hq = s.b.find(b => b.type === 'hq'), put = [];
      for (const t of ['comms']) { let b = null; for (let k = 0; k < 900 && !b; k++) { const r = s.place(t, hq.x - 24 + (k % 30) * 2, hq.z - 24 + Math.floor(k / 30) * 2, 0, true); if (r && r.id) b = r; } if (b) { b.done = true; b.prog = 1; put.push(b.type); } }
      s.recalc(); s.credits += 3000; s.supplies += 2000; const t = s.troops.find(x => x.state !== 'patrol'); t.train = 100; t.grade = null;
      return { put, troops: s.troops.length, offers: s.offers.length, files: s.toReview().length }; })()""")
    print('prep', prep); assert prep['put'] == ['comms'], prep
    pg.wait_for_timeout(600)

    # --- every window from the dock, and every page fits
    for t in TABS:
        pg.click(f'#fb-dock [data-mt={t}]'); pg.mouse.move(640, 700); pg.wait_for_timeout(400)
        st = pg.evaluate(f"""(() => {{ const w = document.getElementById('fb-mins'), b = document.getElementById('fb-mi-body');
          return {{ open: !w.hidden, on: !!document.querySelector('#fb-mi-tabs [data-mt={t}].on'), dock: !!document.querySelector('#fb-dock [data-mt={t}].on'), n: b.textContent.length, sh: b.scrollHeight, ch: b.clientHeight, bottom: w.getBoundingClientRect().bottom, bar: document.getElementById('fb-status').getBoundingClientRect().top }}; }})()""")
        print(t, st)
        assert st['open'] and st['on'] and st['dock'] and st['n'] > 200, f'{t}: the window did not open on its page'
        assert st['sh'] <= st['ch'] + 1, f'{t}: the page scrolls at 1280 x 720 ({st["sh"]} > {st["ch"]})'
        assert st['bottom'] <= st['bar'] + 1, f'{t}: the window runs under the status bar'
        pg.screenshot(path=f'{out}/offices-{t}.png')
        if t in ('pop', 'eff', 'hap'): assert pg.evaluate("!!document.querySelector('#fb-mi-body .og .og-m')"), f'{t}: no measure at the head of the page'
        if t == 'bud':
            for sub in ['trade', 'budget']:
                pg.evaluate(f"document.querySelector('#fb-mi-body [data-et={sub}]').click()"); pg.wait_for_timeout(300)
                sh, ch = pg.evaluate("[document.getElementById('fb-mi-body').scrollHeight, document.getElementById('fb-mi-body').clientHeight]")
                assert pg.evaluate(f"!!document.querySelector('#fb-mi-body [data-et={sub}].on')"), f'BUDGET {sub} did not open'
                assert sh <= ch + 1, f'BUDGET {sub}: the page scrolls ({sh} > {ch})'
    assert pg.evaluate("[...document.querySelectorAll('#fb-dock .mdm u')].filter(u => parseFloat(u.style.width) > 0).length") >= 3, 'the dock has no measures'
    assert not pg.evaluate("!!document.querySelector('#fb-dock [data-mt=sci]')"), 'SCIENCE is still on the dock'
    pg.click('#fb-dock [data-mt=ops]'); pg.wait_for_timeout(300)
    assert pg.evaluate("document.getElementById('fb-mins').hidden"), 'the dock button does not close its own window'

    # --- the readouts open the right page; Esc closes; O opens
    pg.click('.fbig.debt'); pg.wait_for_timeout(300)
    assert pg.evaluate("!document.getElementById('fb-mins').hidden && !!document.querySelector('#fb-mi-body [data-et=trade].on')"), 'OWED does not open TRADE & LOANS'
    pg.click('.fweek'); pg.wait_for_timeout(300)
    assert pg.evaluate("!!document.querySelector('#fb-mi-tabs [data-mt=bud].on') && document.getElementById('fb-mi-body').textContent.includes('THE ALLOCATION')"), 'the day does not open the budget'
    pg.click('#th-stats .ri[data-info=morale]'); pg.wait_for_timeout(300)
    assert pg.evaluate("!!document.querySelector('#fb-mi-tabs [data-mt=hap].on')"), 'MORALE does not open HAPPINESS'
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    assert pg.evaluate("document.getElementById('fb-mins').hidden") and pg.evaluate("gc.state") == 'base', 'Esc does not close the window (or leaves the base)'
    pg.keyboard.press('KeyO'); pg.wait_for_timeout(300)
    assert not pg.evaluate("document.getElementById('fb-mins').hidden"), 'O does not open the Offices'

    js = lambda sel: pg.evaluate(f"(() => {{ const b = document.querySelector({sel!r}); if (!b) return 'missing'; if (b.disabled) return 'disabled'; b.click(); return 'ok'; }})()")
    S = lambda e: pg.evaluate(f'(() => {{ const s = gc.mode.sim; return {e}; }})()')
    # --- the market
    pg.click('.fbig.sup'); pg.evaluate("document.querySelector('#fb-mi-body [data-et=trade]').click()"); pg.wait_for_timeout(300)
    h0, c0 = S('[s.holding("rations"), s.credits]')
    assert js('#fb-mi-body [data-tq="10"]') == 'ok'; pg.wait_for_timeout(150)
    assert js('#fb-mi-body [data-trade="rations:1"]') == 'ok', 'BUY rations is not there'; pg.wait_for_timeout(200)
    h1, c1 = S('[s.holding("rations"), s.credits]'); print('market', h0, '->', h1, 'credits', round(c0), '->', round(c1))
    assert 9 <= h1 - h0 <= 10.5 and c1 < c0, 'buying on the market did nothing'     # (rations are eaten as it runs)
    # --- a commitment
    pg.evaluate("document.querySelector('#fb-mi-body [data-et=budget]').click()"); pg.wait_for_timeout(200)
    l0 = S('s.commit.def || 0'); assert js(f'#fb-mi-body [data-commit="def:{l0 + 1}"]') == 'ok', 'COMMIT + is not there'; pg.wait_for_timeout(200)
    assert S('s.commit.def') == l0 + 1, 'the commitment did not go up a level'
    # --- borrow and repay
    pg.evaluate("document.querySelector('#fb-mi-body [data-et=trade]').click()"); pg.wait_for_timeout(200)
    n0 = S('s.loans.length'); assert js('#fb-mi-body [data-borrow=quick]') == 'ok', 'BORROW is not offered'; pg.wait_for_timeout(200)
    assert S('s.loans.length') == n0 + 1 and S('s.loans.some(l => l.k === "quick")'), 'borrowing did nothing'
    i = S('s.loans.findIndex(l => l.k === "quick")'); b0 = S(f's.loans[{i}].bal')
    assert js(f'#fb-mi-body [data-repay="{i}:100"]') == 'ok'; pg.wait_for_timeout(200)
    assert S(f's.loans[{i}].bal') == b0 - 100, 'REPAY 100 did nothing'
    pg.screenshot(path=f'{out}/offices-loans.png')
    # --- milestones, not research: 45 on the base unlocks the better solar arrays; the Hab Block waits for the FOB charter
    ms = S('(() => { const a = s.hasTech("solar"), why = s.milestoneText("solar"), blk = (s.locked("block") || []).join(", "); s.peak = Math.max(s.peak || 0, 45); s.recalc(); return { a, why, blk, b: s.hasTech("solar"), said: s.log.slice(-2).map(l => l.text || l).join(" | ") }; })()')
    print('milestones', ms)
    assert not ms['a'] and ms['why'] == '45 on the base' and ms['b'], 'the 45 milestone did not unlock solar'
    assert 'Forward Operating Base charter' in ms['blk'], 'the Hab Block does not say it waits for the charter'
    assert 'Milestone: 45 on the base' in ms['said'], 'the milestone was not announced'
    pg.click('#fb-dock [data-mt=pop]'); pg.wait_for_timeout(400)
    assert 'UNLOCKS' in pg.inner_text('#fb-mi-body') and pg.evaluate("document.querySelectorAll('#fb-mi-body .track s.mini').length") >= 3, 'POPULATION has no unlock ladder'
    pg.screenshot(path=f'{out}/offices-pop-ladder.png')
    # --- beauty: a garden by the bunks counts in full; nothing goes in an Industry zone
    bt = S('''(() => { s.foundedF = true; const bk = s.b.find(b => b.done && s.cap(b, 'beds') > 0); const l0 = s.look || 0; let put = null, why = null;
      for (let k = 0; k < 400 && !put; k++) { const x = bk.x - 6 + (k % 20), z = bk.z - 6 + Math.floor(k / 20); const c = s.canPlace('tree', x, z, 0); if (c.ok) put = s.place('tree', x, z, 0); else why = c.why; }
      if (put) { put.done = true; put.prog = 1; } s.recalc();
      return { placed: !!put, why, seen: put && put.seen, l0, l1: s.look, mor: s.mor.beauty }; })()''')
    print('beauty', bt)
    assert bt['placed'] and bt['l1'] > bt['l0'], 'a tree by the bunks did not lift the beauty score'
    zoned = S('''(() => { const hq = s.b.find(b => b.type === 'hq'); for (let k = 0; k < 900; k++) { const x = hq.x - 30 + (k % 30) * 2, z = hq.z + 14 + Math.floor(k / 30) * 2; if (s.canPlace('tree', x, z, 0).ok) { s.paintZone(x, z, x, z, 'ind'); const c = s.canPlace('tree', x, z, 0); return c; } } return null; })()''')
    print('tree in industry:', zoned)
    assert zoned and not zoned['ok'] and 'Industry' in zoned['why'], 'beauty was allowed in an Industry zone'
    # --- the cursor says why: a Garden (it needs a road out front) over open ground far from any road
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.evaluate("document.querySelector('#fb-groups [data-g=beauty]').click()"); pg.wait_for_timeout(300)
    assert pg.evaluate("document.querySelectorAll('#fb-items .bi[data-b]').length") == 5, 'the BEAUTY tab does not have its five'
    pg.screenshot(path=f'{out}/beauty-bar.png')
    pg.evaluate("document.querySelector('#fb-items [data-b=garden]').click()"); pg.wait_for_timeout(200)
    pg.mouse.move(1100, 200); pg.wait_for_timeout(100); pg.mouse.move(1110, 210); pg.wait_for_timeout(300)
    why = pg.evaluate("document.getElementById('fb-tip').hidden ? null : document.getElementById('fb-tip').textContent")
    print('cursor says:', why); assert why, 'no reason at the cursor'
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    assert pg.evaluate("document.getElementById('fb-tip').hidden"), 'the reason stays after the tool is put away'
    # --- send a special operation
    pg.click('#fb-dock [data-mt=ops]'); pg.wait_for_timeout(300)
    p0, o0 = S('s.patrols.length'), S('s.offers.length')
    assert o0 > 0, 'no special operations on offer'
    assert js('#fb-mi-body [data-send]:not([disabled])') == 'ok', 'SEND is not offered'; pg.wait_for_timeout(300)
    assert S('s.patrols.length') == p0 + 1 and S('s.offers.length') == o0 - 1, 'SEND did nothing'
    pg.screenshot(path=f'{out}/offices-ops-sent.png')
    # --- grade a file, from the task board (GC 0.83)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.wait_for_selector('#fb-body [data-grade]', timeout=5000)
    g0 = S('s.stats.graded || 0'); r = pg.evaluate("(() => { const b = document.querySelector('#fb-body [data-grade]'); if (!b) return null; b.click(); return b.dataset.grade; })()")
    pg.wait_for_timeout(300); print('graded', r)
    assert r and S('s.stats.graded || 0') == g0 + 1, 'grading a file from the task board did nothing'
    br.close()
assert not errs, errs
print('no page errors · the Offices ok')
