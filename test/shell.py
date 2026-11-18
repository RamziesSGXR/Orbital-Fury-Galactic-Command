# Browser check of the shell and the war room: python3 test/shell.py  (needs `npm start` running)
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
        pg.screenshot(path=f'{out}/{name}-1-title.png')
        pg.click('#b-new'); pg.wait_for_timeout(200)
        pg.fill('#f-name', 'Lantern Guard'); pg.click('[data-f=shape][data-d="1"]')
        pg.screenshot(path=f'{out}/{name}-2-found.png')
        pg.click('#f-go'); pg.wait_for_timeout(200)
        pg.screenshot(path=f'{out}/{name}-3-how.png')
        pg.click('#modal [data-x=close]'); pg.wait_for_timeout(900)
        assert pg.evaluate('gc.state') == 'war', 'not in the war room'
        pg.screenshot(path=f'{out}/{name}-4-war.png')
        # hold until the first enemy arrives and a battle starts
        for i in range(40):
            if pg.evaluate('!!sgs.g.battle'): break
            pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000)
            if pg.is_visible('#commit'): pg.click('#commit')
            pg.wait_for_timeout(250)
        pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000); pg.wait_for_timeout(300)
        print(name, 'round', pg.evaluate('sgs.g.round'), 'battle', pg.evaluate('!!sgs.g.battle'))
        pg.screenshot(path=f'{out}/{name}-5-battle.png')
        # the armoury, from the battle's choice
        pg.click('[data-a=armoury]'); pg.wait_for_timeout(200); pg.screenshot(path=f'{out}/{name}-5b-armoury.png')
        assert pg.locator('#modal [data-buy]').count() > 5, 'the armoury is empty'
        pg.click('#modal [data-x=close]'); pg.wait_for_timeout(150)
        # down to the ground
        pg.click('[data-a=ground]'); pg.wait_for_function("gc.state === 'ground' && document.getElementById('trans').hidden", timeout=60000)
        pg.wait_for_timeout(2500)
        pg.screenshot(path=f'{out}/{name}-6-ground.png')
        t0 = pg.evaluate('gc.mode.mission.t'); pg.wait_for_timeout(1000); assert pg.evaluate('gc.mode.mission.t') > t0, 'the ground battle is not running'
        pg.click('[data-g=deploy]') if pg.is_visible('[data-g=deploy]') else None
        pg.click('[data-g=arm]'); pg.mouse.click(w / 2, h / 2); pg.wait_for_timeout(800)
        pg.evaluate('gc.mode.fast(1200)')
        pg.click('[data-gt=troops]'); pg.wait_for_timeout(150); pg.click('[data-k=seaf]'); pg.mouse.click(w / 2, h / 2); pg.wait_for_timeout(300)
        pg.evaluate('gc.mode.fast(900)'); pg.wait_for_timeout(400); pg.screenshot(path=f'{out}/{name}-6b-troops.png')
        pg.click('[data-gt=build]'); pg.wait_for_timeout(150); pg.click('[data-k="build:foxhole"]'); pg.mouse.click(w / 2 + 30, h / 2 + 20); pg.wait_for_timeout(300); pg.screenshot(path=f'{out}/{name}-6c-build.png')
        pg.click('[data-gt=weapons]')
        # the planning pause: a strike tapped while paused is planned, and goes out on resume
        pg.click('#th-pause'); pg.click('[data-g=arm][data-i="1"]'); pg.mouse.click(w / 2, h / 2); pg.wait_for_timeout(200)
        pg.screenshot(path=f'{out}/{name}-6d-plan.png')
        pg.click('#th-pause'); pg.wait_for_timeout(500)
        for i in range(60):
            r = pg.evaluate('gc.mode.fast(900)')
            if r['over']: break
        print(name, 'ground', r)
        pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/{name}-7-ground-late.png')
        pg.wait_for_selector('#g-done', timeout=20000); pg.screenshot(path=f'{out}/{name}-8-result.png')
        pg.click('#g-done'); pg.wait_for_timeout(600)
        assert pg.evaluate('gc.state') == 'war' and pg.evaluate('sgs.g.battle.done'), 'the ground result did not come back to the map'
        pg.screenshot(path=f'{out}/{name}-9-back.png')
        pg.close()
    br.close()
print('ERRORS:' if errs else 'no page errors'); [print(' ', e) for e in errs[:20]]
sys.exit(1 if errs else 0)
