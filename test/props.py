# Browser check of what stands on the land in 3D (trees, rocks, the enemy's buildings): python3 test/props.py [biome] [enemy] [out]
import sys
from playwright.sync_api import sync_playwright
bio = sys.argv[1] if len(sys.argv) > 1 else 'grass'; foe = sys.argv[2] if len(sys.argv) > 2 else 'bugs'; out = sys.argv[3] if len(sys.argv) > 3 else '/tmp/shots'
errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate("(() => { let v = null; Object.defineProperty(window, 'gcGround', { configurable: true, get: () => v, set: (x) => { if (x) { x.biome = '%s'; x.faction = '%s'; x.sight = 'day'; x.orbit = 0; } v = x; } }); })()" % (bio, foe))
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
    pg.keyboard.press('Enter'); pg.wait_for_timeout(6000)
    kinds = "(() => { const p = __game.renderer._g3 && __game.renderer._g3.props, o = {}; if (!p) return null; for (const [k, m] of p.kinds) if (m && m.count) o[k] = m.count; return o; })()"
    look = "((o, v) => { const c = __game.cam; c.follow = false; c.x = o.x; c.y = o.y; c.view = v; })"
    # a base, seen
    f.evaluate("(() => { const m = __game.mission; for (const b of m.bases) b.seen = true; const b = m.bases.find(b => !b.destroyed); %s(b, 90); })()" % look); pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{out}/props-{bio}-{foe}-base.png'); print('at a base:', f.evaluate(kinds))
    # a side site of the enemy's
    if f.evaluate("__game.mission.pois.filter(p => !p.done).length"):
        f.evaluate("(() => { const p = __game.mission.pois.find(p => !p.done); %s(p, 80); })()" % look); pg.wait_for_timeout(1500)
        pg.screenshot(path=f'{out}/props-{bio}-{foe}-site.png'); print('at a side site:', f.evaluate(kinds))
    # where the trees are thickest
    f.evaluate("(() => { const m = __game.mission, T = m.scenery.trees; if (!T.length) return; let best = T[0], bn = -1; for (const t of T.slice(0, 200)) { let n = 0; for (const u of T) if ((u.x - t.x) ** 2 + (u.y - t.y) ** 2 < 900) n++; if (n > bn) { bn = n; best = t; } } %s(best, 80); })()" % look); pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{out}/props-{bio}-{foe}-trees.png'); print('in the trees:', f.evaluate(kinds), '| trees on the map:', f.evaluate('__game.mission.scenery.trees.length'))
    print('\n'.join(errs) if errs else 'no page errors'); br.close()
