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
        for i in range(90):
            if pg.evaluate('!!sgs.g.battle'): break
            pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000)
            if pg.is_visible('#commit'): pg.click('#commit')
            pg.wait_for_timeout(250)
        pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000); pg.wait_for_timeout(300)
        print(name, 'round', pg.evaluate('sgs.g.round'), 'battle', pg.evaluate('!!sgs.g.battle'))
        pg.screenshot(path=f'{out}/{name}-5-battle.png')
        # down to the ground
        pg.click('[data-a=ground]'); pg.wait_for_function("gc.state === 'ground' && document.getElementById('trans').hidden", timeout=60000)
        fr = pg.frame(url=lambda u: 'ground.html' in u); assert fr, 'the ground theatre did not open'
        fr.wait_for_function("window.__game && __game.state === 'shop'", timeout=30000); pg.wait_for_timeout(500)
        pg.screenshot(path=f'{out}/{name}-6-armoury.png')
        fr.click('#shop-go'); fr.wait_for_function("__game.state === 'brief'", timeout=20000); pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/{name}-6b-brief.png')
        fr.wait_for_selector('#btn-deploy, .brief-go, #brief-go', timeout=1000) if False else None
        fr.evaluate("(() => { const b = [...document.querySelectorAll('#s-brief button')].find(x => /DEPLOY|DROP|CONTINUE|LAUNCH/i.test(x.textContent) && !x.disabled && x.offsetParent); if (b) b.click(); return b ? b.id : null; })()")
        for i in range(40):
            if fr.evaluate("__game.state") == 'play': break
            pg.wait_for_timeout(500); fr.evaluate("(() => { const b = [...document.querySelectorAll('#s-brief button')].find(x => /DEPLOY|DROP|CONTINUE|LAUNCH/i.test(x.textContent) && !x.disabled && x.offsetParent); if (b) b.click(); })()")
        assert fr.evaluate("__game.state") == 'play', 'the mission did not start'
        pg.wait_for_timeout(3000); pg.screenshot(path=f'{out}/{name}-7-ground.png')
        print(name, 'ground', fr.evaluate("({ faction: __game.mission.faction.id, obj: __game.mission.objectives.map(o => o.type), level: __game.mission.difficulty, t: Math.round(__game.mission.t) })"))
        # the result comes back to the map (handed over as Orbital Fury would after its debrief)
        pg.evaluate("gcGround.onResult({ outcome: 'victory', livesLeft: 14, livesMax: 20 })"); pg.wait_for_timeout(800)
        assert pg.evaluate('gc.state') == 'war' and pg.evaluate('sgs.g.battle.done'), 'the ground result did not come back to the map'
        pg.screenshot(path=f'{out}/{name}-9-back.png')
        pg.close()
    br.close()
print('ERRORS:' if errs else 'no page errors'); [print(' ', e) for e in errs[:20]]
sys.exit(1 if errs else 0)
