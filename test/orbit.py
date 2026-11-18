# Browser check of the ground battle's circling view: python3 test/orbit.py  (needs `npm start` running)
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
    pg.click('#b-new'); pg.wait_for_timeout(200); pg.click('#f-go'); pg.wait_for_timeout(200); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(900)
    for i in range(90):
        if pg.evaluate('!!sgs.g.battle'): break
        pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000)
        if pg.is_visible('#commit'): pg.click('#commit')
        pg.wait_for_timeout(250)
    pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000); pg.wait_for_timeout(300)
    pg.click('[data-a=ground]'); pg.wait_for_function("gc.state === 'ground' && document.getElementById('trans').hidden", timeout=60000)
    fr = pg.frame_locator('#g-frame'); f = [x for x in pg.frames if 'ground.html' in x.url][0]
    f.wait_for_function("window.__game && __game.state === 'shop'", timeout=30000); pg.wait_for_timeout(500)
    f.click('#shop-go'); f.wait_for_function("__game.state === 'brief'", timeout=20000); pg.wait_for_timeout(1200)
    go = "(() => { const b = [...document.querySelectorAll('#s-brief button')].find(x => /DEPLOY|DROP|CONTINUE|LAUNCH/i.test(x.textContent) && !x.disabled && x.offsetParent); if (b) b.click(); })()"
    f.evaluate(go)
    for i in range(40):
        if f.evaluate("__game.state") == 'play': break
        pg.wait_for_timeout(500); f.evaluate(go)
    assert f.evaluate("__game.state") == 'play', 'the mission did not start'
    f.evaluate("__game.cam.orbit = 0.25"); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/orbit-0-drop.png'); print('in the air:', f.evaluate('__game.renderer._g3.fx ? __game.renderer._g3.fx.n : null')); pg.wait_for_timeout(7500)     # (Enter: the squad drops now)
    yaw = f.evaluate("__game.cam.yaw"); print('yaw after a few seconds', round(yaw, 2)); assert yaw > 0.3, 'the view is not turning'
    # a point on the ground, to the screen and back, comes back to itself
    err = f.evaluate("(() => { const r = __game.renderer, cv = document.querySelector('canvas'), m = __game.mission, p = { x: m.lz.x + 37, y: m.lz.y - 22 }; const s = r.worldToScreen(p.x, p.y, cv), w = r.screenToWorld(s.x, s.y, cv); return Math.hypot(w.x - p.x, w.y - p.y); })()")
    print('there-and-back error, metres', round(err, 4)); assert err < 0.05, 'the pointer does not land where the ground is drawn'
    pg.screenshot(path=f'{out}/orbit-1.png'); f.evaluate("(() => { const m = __game.mission, a = m.alive[0]; if (a) { __game.cam.x = a.x; __game.cam.y = a.y; __game.cam.follow = false; __game.cam.view = 110; } })()"); pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/orbit-2.png')
    print('3D ground on:', f.evaluate('!!__game.renderer._g3on'), '| blocks standing:', f.evaluate('__game.renderer._g3 ? __game.renderer._g3.nBlocks : 0'), '| units standing:', f.evaluate('__game.renderer._g3 && __game.renderer._g3.units ? __game.renderer._g3.units.n : 0'), 'of', f.evaluate('__game.mission.alive.length + __game.mission.enemies.filter(e => !e.dead).length'), 'alive |', '| heights in view (metres):', f.evaluate("(() => { const g = __game.renderer._g3; if (!g) return null; const P = g.pos; let a = 1e9, b = -1e9; for (let i = 1; i < P.length; i += 3) { a = Math.min(a, P[i]); b = Math.max(b, P[i]); } return [Math.round(a * 10) / 10, Math.round(b * 10) / 10]; })()"))
    f.evaluate('__game.renderer._g3 && (__game.renderer._g3.amp = 45)'); pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/orbit-3-tall.png'); f.evaluate('__game.renderer._g3 && (__game.renderer._g3.amp = 22)')
    # photo mode: the fight stops, the interface goes, a drag turns the camera, and leaving puts it all back
    f.click('#btn-photo'); pg.wait_for_timeout(300); t0 = f.evaluate('__game.mission.t'); pg.wait_for_timeout(500)
    box = f.query_selector('#view').bounding_box(); pg.mouse.move(box['x'] + 500, box['y'] + 300); pg.mouse.down(); pg.mouse.move(box['x'] + 700, box['y'] + 240, steps=5); pg.mouse.up(); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{out}/orbit-4-photo.png')
    assert f.evaluate("document.body.classList.contains('photo') && document.body.classList.contains('hide-ui')"), 'photo mode did not open'
    assert abs(f.evaluate('__game.mission.t') - t0) < 0.2, 'the fight went on during photo mode'
    assert abs(f.evaluate('__game.cam.yaw0 || 0')) > 0.5, 'the drag did not turn the camera'
    pg.keyboard.press('F4'); pg.wait_for_timeout(700)
    assert f.evaluate("!document.body.classList.contains('photo') && (__game.cam.yaw0 || 0) === 0") and f.evaluate('__game.mission.t') > t0, 'leaving photo mode did not put things back'
    print('frames drawn', f.evaluate('__game.frames'))
    br.close()
print('\n'.join(errs[:6]) if errs else 'no page errors')
sys.exit(1 if errs else 0)
