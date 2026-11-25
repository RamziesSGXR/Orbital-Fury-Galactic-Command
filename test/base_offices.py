# (GC 0.82) Browser check of FOB Commander's Offices (js/modes/base-offices.js): python3 test/base_offices.py [out]
# (needs the server on 8080)
#   - the dock opens each Office's window and marks it; every page and every ECONOMY page fits a 1280 x 720 screen
#     without scrolling
#   - the big numbers open ECONOMY (budget, loans), the day opens STANDING, MORALE opens PUBLICITY; Esc closes, O opens
#   - the window's controls work: trade on the market, a commitment's level, borrow and repay, research, grade a file,
#     send a special operation
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'; errs = []
TABS = ['eco', 'led', 'def', 'pro', 'tru', 'sci', 'int', 'st']
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
    # a base with something in every window: a day and a half on, a lab, a file to grade, money in the bank
    prep = pg.evaluate("""(() => { const s = gc.mode.sim; for (let i = 0; i < 5000; i++) s.step(0.1); s.drain();
      const hq = s.b.find(b => b.type === 'hq'), put = [];
      for (const t of ['comms', 'lab']) { let b = null; for (let k = 0; k < 900 && !b; k++) { const r = s.place(t, hq.x - 24 + (k % 30) * 2, hq.z - 24 + Math.floor(k / 30) * 2, 0, true); if (r && r.id) b = r; } if (b) { b.done = true; b.prog = 1; put.push(b.type); } }
      s.recalc(); s.credits += 3000; s.supplies += 2000; const t = s.troops.find(x => x.state !== 'patrol'); t.train = 100; t.grade = null;
      return { put, troops: s.troops.length, offers: s.offers.length, files: s.toReview().length }; })()""")
    print('prep', prep); assert prep['put'] == ['comms', 'lab'], prep
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
        if t == 'eco':
            for sub in ['market', 'commit', 'loans', 'prod', 'budget']:
                pg.evaluate(f"document.querySelector('#fb-mi-body [data-et={sub}]').click()"); pg.wait_for_timeout(300)
                sh, ch = pg.evaluate("[document.getElementById('fb-mi-body').scrollHeight, document.getElementById('fb-mi-body').clientHeight]")
                assert pg.evaluate(f"!!document.querySelector('#fb-mi-body [data-et={sub}].on')"), f'ECONOMY {sub} did not open'
                assert sh <= ch + 1, f'ECONOMY {sub}: the page scrolls ({sh} > {ch})'
    pg.click('#fb-dock [data-mt=st]'); pg.wait_for_timeout(300)
    assert pg.evaluate("document.getElementById('fb-mins').hidden"), 'the dock button does not close its own window'

    # --- the readouts open the right page; Esc closes; O opens
    pg.click('.fbig.debt'); pg.wait_for_timeout(300)
    assert pg.evaluate("!document.getElementById('fb-mins').hidden && !!document.querySelector('#fb-mi-body [data-et=loans].on')"), 'OWED does not open LOANS'
    pg.click('.fweek'); pg.wait_for_timeout(300)
    assert pg.evaluate("!!document.querySelector('#fb-mi-tabs [data-mt=st].on') && document.getElementById('fb-mi-body').textContent.includes('OUTFIT')"), 'the day does not open STANDING'
    pg.click('#th-stats .ri[data-info=morale]'); pg.wait_for_timeout(300)
    assert pg.evaluate("!!document.querySelector('#fb-mi-tabs [data-mt=tru].on')"), 'MORALE does not open PUBLICITY'
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    assert pg.evaluate("document.getElementById('fb-mins').hidden") and pg.evaluate("gc.state") == 'base', 'Esc does not close the window (or leaves the base)'
    pg.keyboard.press('KeyO'); pg.wait_for_timeout(300)
    assert not pg.evaluate("document.getElementById('fb-mins').hidden"), 'O does not open the Offices'

    js = lambda sel: pg.evaluate(f"(() => {{ const b = document.querySelector({sel!r}); if (!b) return 'missing'; if (b.disabled) return 'disabled'; b.click(); return 'ok'; }})()")
    S = lambda e: pg.evaluate(f'(() => {{ const s = gc.mode.sim; return {e}; }})()')
    # --- the market
    pg.click('.fbig.sup'); pg.evaluate("document.querySelector('#fb-mi-body [data-et=market]').click()"); pg.wait_for_timeout(300)
    h0, c0 = S('[s.holding("rations"), s.credits]')
    assert js('#fb-mi-body [data-tq="10"]') == 'ok'; pg.wait_for_timeout(150)
    assert js('#fb-mi-body [data-trade="rations:1"]') == 'ok', 'BUY rations is not there'; pg.wait_for_timeout(200)
    h1, c1 = S('[s.holding("rations"), s.credits]'); print('market', h0, '->', h1, 'credits', round(c0), '->', round(c1))
    assert 9 <= h1 - h0 <= 10.5 and c1 < c0, 'buying on the market did nothing'     # (rations are eaten as it runs)
    # --- a commitment
    pg.evaluate("document.querySelector('#fb-mi-body [data-et=commit]').click()"); pg.wait_for_timeout(200)
    assert js('#fb-mi-body [data-commit="def:3"]') == 'ok'; pg.wait_for_timeout(200)
    assert S('s.commit.def') == 3 and pg.evaluate("!!document.querySelector('#fb-mi-body [data-commit=\"def:3\"].on')"), 'the commitment did not change'
    # --- borrow and repay
    pg.evaluate("document.querySelector('#fb-mi-body [data-et=loans]').click()"); pg.wait_for_timeout(200)
    n0 = S('s.loans.length'); assert js('#fb-mi-body [data-borrow=quick]') == 'ok', 'BORROW is not offered'; pg.wait_for_timeout(200)
    assert S('s.loans.length') == n0 + 1 and S('s.loans.some(l => l.k === "quick")'), 'borrowing did nothing'
    i = S('s.loans.findIndex(l => l.k === "quick")'); b0 = S(f's.loans[{i}].bal')
    assert js(f'#fb-mi-body [data-repay="{i}:100"]') == 'ok'; pg.wait_for_timeout(200)
    assert S(f's.loans[{i}].bal') == b0 - 100, 'REPAY 100 did nothing'
    pg.screenshot(path=f'{out}/offices-loans.png')
    # --- research
    pg.click('#fb-dock [data-mt=sci]'); pg.wait_for_timeout(300)
    assert js('#fb-mi-body [data-tech=radio]') == 'ok', 'RESEARCH is not offered with a lab built'; pg.wait_for_timeout(300)
    assert S('s.tech.cur') == 'radio' and 'RESEARCHING' in pg.inner_text('#fb-mi-body'), 'research did not start'
    # --- grade a file
    pg.click('#fb-mi-tabs [data-mt=led]'); pg.wait_for_timeout(300)
    g0 = S('s.stats.graded || 0'); r = pg.evaluate("(() => { const b = document.querySelector('#fb-mi-body [data-grade]'); if (!b) return null; b.click(); return b.dataset.grade; })()")
    pg.wait_for_timeout(300); print('graded', r)
    assert r and S('s.stats.graded || 0') == g0 + 1, 'grading a file did nothing'
    # --- send a special operation
    pg.click('#fb-mi-tabs [data-mt=def]'); pg.wait_for_timeout(300)
    p0, o0 = S('s.patrols.length'), S('s.offers.length')
    assert o0 > 0, 'no special operations on offer'
    assert js('#fb-mi-body [data-send]:not([disabled])') == 'ok', 'SEND is not offered'; pg.wait_for_timeout(300)
    assert S('s.patrols.length') == p0 + 1 and S('s.offers.length') == o0 - 1, 'SEND did nothing'
    pg.screenshot(path=f'{out}/offices-def-sent.png')
    br.close()
assert not errs, errs
print('no page errors · the Offices ok')
