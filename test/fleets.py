# Browser check of the opening choices and the Fleet Office: python3 test/fleets.py  (needs `npm start` running)
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=__import__('os').environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    for name, w, h in [('phone', 390, 844), ('desk', 1280, 800)]:
        pg = br.new_page(viewport={'width': w, 'height': h})
        pg.on('pageerror', lambda e: errs.append(name + ' pageerror: ' + str(e)))
        pg.on('console', lambda m: errs.append(name + ' console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(500)
        pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
        pg.click('#b-new'); pg.wait_for_timeout(200)
        pg.click('#f-level [data-v=hard]'); pg.click('#f-fleets [data-v=strong]'); pg.click('#f-posts [data-v=many]'); pg.wait_for_timeout(100)
        pg.screenshot(path=f'{out}/{name}-open.png', full_page=True)
        pg.click('#f-go'); pg.wait_for_timeout(200); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(900)
        g = 'gc.War.war()'
        ships = pg.evaluate(f'{g}.fleets.filter(f => f.owner === "fed").reduce((a, f) => a + f.ships, 0)')
        posts = pg.evaluate(f'{g}.P.filter(p => p.station || p.base).length')
        print(name, 'opening', pg.evaluate(f'{g}.opt'), 'ships', ships, 'posts', posts, 'rank', pg.evaluate(f'{g}.rank()'))
        assert ships == 18 and posts == 6, 'the opening was not applied'
        pg.click('#mins [data-t=def]') if pg.query_selector('#mins [data-t=def]') else pg.click('text=OPS'); pg.wait_for_timeout(200)
        assert pg.query_selector('[data-a=camp]'), 'no campaigns on offer in the Ops tab'; pg.screenshot(path=f'{out}/{name}-ops.png')
        pg.click('[data-a=fleets]'); pg.wait_for_timeout(200)
        pg.click('#modal [data-a=yard][data-k=gun]'); pg.wait_for_timeout(100)
        assert pg.evaluate(f'{g}.yard') == 'gun'
        # wear a fleet and move the clock: it mends at the capital
        pg.evaluate(f'{g}.fleets.filter(f => f.owner === "fed").forEach(f => f.wear = 60)'); pg.click('#modal [data-a=yard][data-k=gun]'); pg.wait_for_timeout(100)
        pg.screenshot(path=f'{out}/{name}-fleets.png')
        pg.click('#modal [data-a=close]')
        cap = pg.evaluate(f'(() => {{ const g = {g}; g._fleetRound(); return g.fleetAt(0, "fed").wear; }})()')
        assert cap == 33, 'the capital did not mend its fleet: ' + str(cap)
        pg.evaluate('gc.app.keep()'); pg.reload(); pg.wait_for_timeout(600); pg.click('#b-continue'); pg.wait_for_timeout(900)
        assert pg.evaluate(f'{g}.yard') == 'gun' and pg.evaluate(f'{g}.fleetAt(0, "fed").wear') == 33 and pg.evaluate(f'{g}.opt.posts') == 'many', 'not kept over a reload'
        pg.close()
    br.close()
print('\n'.join(errs) if errs else 'no page errors')
sys.exit(1 if errs else 0)
