# Browser check of the armoury and the war chest: python3 test/armoury.py  (needs `npm start` running)
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    for name, w, h in [('phone', 390, 844), ('desk', 1280, 800)]:
        pg = br.new_page(viewport={'width': w, 'height': h})
        pg.on('pageerror', lambda e: errs.append(name + ' pageerror: ' + str(e)))
        pg.on('console', lambda m: errs.append(name + ' console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(500)
        pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
        pg.click('#b-new'); pg.wait_for_timeout(200); pg.fill('#f-name', 'Lantern Guard'); pg.click('#f-go'); pg.wait_for_timeout(200)
        pg.click('#modal [data-x=close]'); pg.wait_for_timeout(900)
        g = 'gc.War.war()'
        # nothing is open at rank 0 but the first levels; give the war what a few rounds of posts would
        assert pg.evaluate(f'{g}.rank()') == 0
        pid = pg.evaluate(f'{g}.P.find(p => p.owner === "fed" && p.id && {g}.deposit(p) && {g}.canFound(p.id, "base")).id')
        assert pg.evaluate(f'{g}.found({pid}, "base")'), 'no base founded'
        before = pg.evaluate(f'JSON.stringify({g}.loot)')
        pg.evaluate(f'gc.War.setSite({pid}, "base", 2, true)')
        assert pg.evaluate(f'{g}.rank()') == 2, 'rank does not follow a base in profit'
        pay = pg.evaluate(f'{g}.postsPay()'); print(name, 'posts pay', pay)
        assert pay['cr'] >= 60 and sum(pay['mat'].values()) == 2
        pg.evaluate(f'Object.assign({g}.loot, {{swarm: 50, foundry: 50, veil: 50}}); gc.app.camp.wallet.bal = 5000; gc.War.redraw()')
        pg.click('[data-a=armoury]'); pg.wait_for_timeout(200)
        pg.screenshot(path=f'{out}/{name}-arm-ground.png')
        for tab in ['station', 'base', 'fleet']:
            pg.click(f'#modal [data-tab={tab}]'); pg.wait_for_timeout(100)
            pg.screenshot(path=f'{out}/{name}-arm-{tab}.png')
            b = pg.query_selector('#modal [data-up]:not([disabled])'); assert b, 'nothing to buy on ' + tab
            b.click(); pg.wait_for_timeout(100)
        ups = pg.evaluate(f'{g}.up'); bal = pg.evaluate('gc.app.camp.wallet.bal'); print(name, 'bought', ups, 'left', bal)
        assert len(ups) == 3 and bal < 5000
        pg.click('#modal [data-x=close]'); pg.wait_for_timeout(200)
        assert str(int(bal)) in pg.inner_text('[data-a=armoury]')
        pg.screenshot(path=f'{out}/{name}-arm-war.png')
        # a save and a reload keep the chest, the upgrades and the profit flags
        pg.evaluate('gc.app.keep()'); pg.reload(); pg.wait_for_timeout(600)
        pg.click('#b-continue'); pg.wait_for_timeout(900)
        assert pg.evaluate(f'Object.keys({g}.up).length') == 3 and pg.evaluate(f'{g}.P[{pid}].bp') == 1 and pg.evaluate('gc.app.camp.wallet.bal') == bal, 'not kept over a reload'
        pg.close()
    br.close()
print('\n'.join(errs) if errs else 'no page errors')
sys.exit(1 if errs else 0)
