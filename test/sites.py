# Browser check of the station and the base: python3 test/sites.py [orbit|base]  (needs `npm start` running)
import sys
from playwright.sync_api import sync_playwright
which = sys.argv[1] if len(sys.argv) > 1 else 'orbit'
out = '/tmp/shots'; errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=__import__('os').environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for name, w, h in [('desk', 1280, 800), ('phone', 390, 844)]:
        pg = br.new_page(viewport={'width': w, 'height': h})
        pg.on('pageerror', lambda e: errs.append(name + ' pageerror: ' + str(e)))
        pg.on('console', lambda m: errs.append(name + ' console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(400)
        pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
        pg.click('#b-new'); pg.click('#f-go'); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(700)
        pid = pg.evaluate('sgs.g.P.find(p => p.owner === "fed" && p.ring === 1).id')
        pg.evaluate(f'gc.app.theatre("{which}", {{ system: sgs.g.P[{pid}] }})')
        pg.wait_for_function(f"gc.state === '{which}' && document.getElementById('trans').hidden", timeout=120000)
        pg.wait_for_timeout(2500)
        pg.screenshot(path=f'{out}/{name}-{which}-1.png')
        if which == 'orbit':
            pg.click('[data-op=core]'); pg.wait_for_timeout(600); pg.screenshot(path=f'{out}/{name}-{which}-2-tool.png')
            n0 = pg.evaluate('gc.mode.station.parts.size')
            pg.evaluate('(()=>{const s=gc.mode.station; s.build("core",1,1,0); s.build("hab",1,3,0); s.build("dockport",1,2,0); s.build("cargo",1,4,0); for(let i=0;i<2400;i++) s.step(1/30);})()')
            assert pg.evaluate('gc.mode.station.parts.size') > n0, 'nothing was built'
        else:
            print(name, 'fast', pg.evaluate('gc.mode.fast && gc.mode.fast()'))
        pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/{name}-{which}-3.png')
        print(name, which, 'report', pg.evaluate('gc.mode.report()'))
        pg.click('#th-leave'); pg.wait_for_timeout(700)
        assert pg.evaluate('gc.state') == 'war', 'did not come back to the war room'
        print(name, 'site on the map', pg.evaluate(f'[sgs.g.P[{pid}].station, sgs.g.P[{pid}].base]'), 'saved', pg.evaluate(f'!!localStorage.getItem("ofgc.site.{which}.{pid}")'), pg.evaluate(f'(localStorage.getItem("ofgc.site.{which}.{pid}")||"").length'))
        # and back in: the same place is there
        pg.evaluate(f'gc.app.theatre("{which}", {{ system: sgs.g.P[{pid}] }})')
        pg.wait_for_function(f"gc.state === '{which}' && document.getElementById('trans').hidden", timeout=120000); pg.wait_for_timeout(1500)
        pg.screenshot(path=f'{out}/{name}-{which}-4-again.png')
        pg.close()
    br.close()
print('ERRORS:' if errs else 'no page errors'); [print(' ', e[:300]) for e in errs[:20]]
sys.exit(1 if errs else 0)
