# Plays the guided opening from start to finish, using its own "do it for me" buttons: python3 test/tutorial.py
# A step that has to be skipped is a fault: the step could not be done, or did not notice it was done.
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/'); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
    pg.click('#b-new'); pg.wait_for_timeout(200); pg.click('#f-go'); pg.wait_for_timeout(300); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(300)
    pg.click('#modal [data-x=tut]'); pg.wait_for_timeout(1500)
    total = pg.evaluate("document.querySelector('#coach em, #fcoach em').textContent"); print('starts:', total)
    seen, skipped, idle, last = [], [], 0, None
    for i in range(400):
        el = pg.query_selector('#coach:not([hidden])') or pg.query_selector('#fcoach:not([hidden])')
        if not el:
            if pg.evaluate("document.querySelector('#coach').hidden && document.querySelector('#fcoach').hidden && !document.querySelector('#coach em')"): pass
            pg.wait_for_timeout(300); idle += 1
            if idle > 60: break
            continue
        label = el.query_selector('em').inner_text()
        if label != last: seen.append(label); last = label; idle = 0; pg.screenshot(path=f'{out}/tut-{len(seen):02d}.png')
        helpb = el.query_selector('[data-a=thelp]'); go = el.query_selector('.go[data-a=tnext]')
        if go: go.click(); pg.wait_for_timeout(350); continue
        if helpb and idle < 2: helpb.click(); pg.wait_for_timeout(900); idle += 1; continue
        idle += 1; pg.wait_for_timeout(400)
        if idle % 3 == 0:     # a step the player does alone: confirm what is planned, or hold
            for sel in ['[data-a=confirm]:not([disabled])', '#commit:not([disabled])']:
                b = pg.query_selector(sel)
                if b and b.is_visible():
                    try: b.click(timeout=1500); pg.wait_for_timeout(700); break
                    except Exception as ex: print('  could not click', sel, str(ex)[:160])
        if idle > 40:
            skipped.append(label + ' :: ' + el.query_selector('p').inner_text()[:90]); el.query_selector('[data-a=tnext]').click(); pg.wait_for_timeout(400); idle = 0
    print('steps seen:', len(seen), 'last:', seen[-1] if seen else None)
    print('skipped:', len(skipped)); [print('  ', s) for s in skipped]
    print('tutorial over:', pg.evaluate("document.querySelector('#coach').hidden && document.querySelector('#fcoach').hidden"), 'round', pg.evaluate('gc.War.war().round'))
    br.close()
print('\n'.join(errs[:8]) if errs else 'no page errors')
sys.exit(1 if errs or skipped else 0)
