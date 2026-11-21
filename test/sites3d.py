# Browser check of the objectives' and side sites' models on the ground (0.38): python3 test/sites3d.py [out]
import sys
from playwright.sync_api import sync_playwright
bio = 'grass'; foe = 'bugs'; out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate("(() => { let v = null; Object.defineProperty(window, 'gcGround', { configurable: true, get: () => v, set: (x) => { if (x) { x.biome = '%s'; x.faction = '%s'; } v = x; } }); })()" % (bio, foe))
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
    pg.keyboard.press('Enter'); pg.wait_for_timeout(6000); f.wait_for_function("__game.mission.alive.length > 0", timeout=90000)     # (0.49.1) on a slow machine the squad is not down in six seconds
    names = f.evaluate("[...__game.renderer._g3.props.files.keys()].sort()"); print('models that came:', len(names), names)
    assert len(names) >= 16, 'not every objective model was loaded'
    f.evaluate("(() => { const g = __game; if (g.settings) g.settings.quality = 'high'; g.renderer.quality = 'high'; g.renderer.qset = 'high'; g.renderer.perf.low = false; g.renderer.perf.tier = 0; })()")
    f.evaluate("""(() => { const g = __game, r = g.renderer, m = g.mission, c = g.cam, sq = m.alive[0], names = [...r._g3.props.files.keys()].sort(), orig = r._props.bind(r);
      c.sight = 'day'; c.follow = false; c.x = sq.x + 30; c.y = sq.y - 26; c.view = 150; c.yaw0 = 0.66;
      r._props = (...a) => { const out = orig(...a); names.forEach((k, i) => out.push({ k, x: sq.x - 15 + (i % 4) * 30, y: sq.y - 62 + Math.floor(i / 4) * 26, s: 8, rot: 0.5 })); return out; }; })()""")
    pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/sites-game.png')
    print('shadows and post:', f.evaluate("({ sun: __game.renderer._g3.sun.castShadow, post: !!__game.renderer._g3.sighted, low: __game.renderer.perf.low })"))
    f.evaluate("__game.cam.sight = 'whot'"); pg.wait_for_timeout(700); pg.screenshot(path=f'{out}/sites-game-thermal.png')
    br.close()
print('\n'.join(errs) if errs else 'no page errors')
sys.exit(1 if errs else 0)
