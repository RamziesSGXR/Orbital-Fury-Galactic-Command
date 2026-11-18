# Browser check of what flies and bursts in 3D (a dropship, a Striker, a blast, a supply drop): python3 test/air.py [out]
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate("(() => { let v = null; Object.defineProperty(window, 'gcGround', { configurable: true, get: () => v, set: (x) => { if (x) { x.sight = 'day'; x.orbit = 0; } v = x; } }); })()")
    pg.click('#b-new'); pg.wait_for_timeout(200); pg.click('#f-go'); pg.wait_for_timeout(200); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(900)
    for i in range(90):
        if pg.evaluate('!!sgs.g.battle'): break
        pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000)
        if pg.is_visible('#commit'): pg.click('#commit')
        pg.wait_for_timeout(250)
    pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000); pg.wait_for_timeout(300)
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
    pg.keyboard.press('Enter'); pg.wait_for_timeout(9000)
    f.evaluate("(() => { const c = __game.cam, a = __game.mission.alive[0]; c.follow = false; c.x = a.x; c.y = a.y; c.view = 120; })()")
    # an Infantry drop called onto the middle of the picture: its dropship comes in
    pg.keyboard.press('g'); pg.wait_for_timeout(300); pg.mouse.click(700, 330); pg.wait_for_timeout(2500)
    # a Striker passing over and a blast, put straight into the picture
    f.evaluate("(() => { const r = __game.renderer, m = __game.mission, a = m.alive[0], now = r.fxNow(m); r.fx.push({ k: 'fly', x: a.x - 90, y: a.y - 30, x2: a.x + 90, y2: a.y + 10, t0: now - 3.4, life: 9 }); r.fx.push({ k: 'fireball', x: a.x + 22, y: a.y - 12, r: 12, t0: now - 0.6, life: 5 }); r.fx.push({ k: 'fireball', x: a.x - 30, y: a.y + 14, r: 8, t0: now - 2.2, life: 5 }); })()")     # (long-lived, so the picture catches them: the check runs the clock fast)
    pg.wait_for_timeout(120); pg.screenshot(path=f'{out}/air-1.png')
    print('in the air:', f.evaluate("(() => { const g = __game.renderer._g3, o = {}; for (const [k, m] of g.units.kinds) { if (!m) continue; const n = m.frames ? Object.values(m.frames).reduce((a, f) => a + f.count, 0) : m.count; if (n) o[k] = n; } return { units: o, fx: g.fx.n, dships: __game.mission.dships.length }; })()"))
    pg.wait_for_timeout(5000); pg.screenshot(path=f'{out}/air-2.png')
    print('later:', f.evaluate("(() => { const g = __game.renderer._g3, o = {}; for (const [k, m] of g.units.kinds) { if (!m) continue; const n = m.frames ? Object.values(m.frames).reduce((a, f) => a + f.count, 0) : m.count; if (n) o[k] = n; } return { units: o, fx: g.fx.n, dships: __game.mission.dships.map(d => d.state) }; })()"))
    # the troops' own fire: streaks of light in the air (the squad is sent at the nearest enemy and watched until it shoots)
    best = 0
    for i in range(60):
        n = f.evaluate("(() => { const g = __game.renderer._g3, m = __game.mission, a = m.alive[0]; if (a) { __game.cam.x = a.x; __game.cam.y = a.y; } return g.fx.n.bolts + g.fx.n.orbs; })()")
        if n > best: best = n; pg.screenshot(path=f'{out}/air-3-fire.png')
        if best >= 3: break
        pg.wait_for_timeout(400)
    print('streaks and balls of fire in the air at once:', best)
    f.evaluate("(() => { const c = __game.cam, m = __game.mission, a = m.infantryAlive[0] || m.alive[0]; c.follow = false; c.x = a.x; c.y = a.y; c.view = 42; })()"); pg.wait_for_timeout(700); pg.screenshot(path=f'{out}/air-4-close.png')
    print('a person has these frames:', f.evaluate("(() => { const u = __game.renderer._g3.units, o = {}; for (const k of ['van', 'inf', 'civ0', 'civ2']) { const K = u._kind(k); o[k] = K && K.frames ? Object.keys(K.frames).length : 0; } return o; })()"))
    print('\n'.join(errs) if errs else 'no page errors'); br.close()
