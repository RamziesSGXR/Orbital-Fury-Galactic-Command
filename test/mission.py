# Browser check of a whole ground mission, to its debrief and back to the war: python3 test/mission.py [victory|defeat] [out]
import sys
from playwright.sync_api import sync_playwright
how = sys.argv[1] if len(sys.argv) > 1 else 'victory'; out = sys.argv[2] if len(sys.argv) > 2 else '/tmp/shots'
errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
    pg.click('#b-new'); pg.wait_for_timeout(200); pg.click('#f-go'); pg.wait_for_timeout(200); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(900)
    for i in range(90):
        if pg.evaluate('!!sgs.g.battle'): break
        pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000)
        if pg.is_visible('#commit'): pg.click('#commit')
        pg.wait_for_timeout(250)
    pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000); pg.wait_for_timeout(300)
    before = pg.evaluate("(() => { const g = gc.War.war(); return { res: { ...g.res }, rat: g.rat, cr: gc.app.wallet ? gc.app.wallet.cr : null }; })()")
    pg.click('[data-a=ground]'); pg.wait_for_function("gc.state === 'ground' && document.getElementById('trans').hidden", timeout=60000)
    f = [x for x in pg.frames if 'ground.html' in x.url][0]
    f.wait_for_function("window.__game && __game.state === 'shop'", timeout=30000); pg.wait_for_timeout(500)
    f.click('#shop-go'); f.wait_for_function("__game.state === 'brief'", timeout=20000); pg.wait_for_timeout(1200)
    go = "(() => { const b = [...document.querySelectorAll('#s-brief button')].find(x => /DEPLOY|DROP|CONTINUE|LAUNCH/i.test(x.textContent) && !x.disabled && x.offsetParent); if (b) b.click(); })()"
    f.evaluate(go)
    for i in range(40):
        if f.evaluate("__game.state") == 'play': break
        pg.wait_for_timeout(500); f.evaluate(go)
    assert f.evaluate("__game.state") == 'play', 'the mission did not start'
    pg.keyboard.press('Enter'); pg.wait_for_timeout(12000)     # the squad lands and fights a while
    print('fought:', f.evaluate("({ t: Math.round(__game.mission.t), alive: __game.mission.alive.length, kills: __game.mission.kills || 0, obj: __game.mission.objectives.map(o => o.type) })"))
    f.evaluate("__game.mission.finish('%s')" % how)
    for i in range(80):
        if f.evaluate("__game.state") == 'debrief': break
        pg.wait_for_timeout(500); pg.keyboard.press('Enter')
    print('state after the end:', f.evaluate("__game.state")); pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/mission-debrief-{how}.png')
    assert f.evaluate("__game.state") == 'debrief', 'the debrief did not open'
    print('debrief buttons:', f.evaluate("[...document.querySelectorAll('#s-debrief button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0, 28))"))
    f.evaluate("(() => { const b = document.getElementById('btn-continue'); if (b) b.click(); })()")
    pg.wait_for_function("gc.state === 'war'", timeout=20000); pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/mission-back-{how}.png')
    after = pg.evaluate("(() => { const g = gc.War.war(); return { res: { ...g.res }, rat: g.rat, done: !!(g.battle && g.battle.done), cr: gc.app.wallet ? gc.app.wallet.cr : null }; })()")
    print('before:', before); print('after: ', after)
    assert after['done'], 'the battle on the map was not settled by the ground result'
    print('\n'.join(errs[:8]) if errs else 'no page errors'); br.close()
