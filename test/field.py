# Browser check of vehicles, aircraft and field works as models on the ground (0.41): python3 test/field.py [out]
import sys
from playwright.sync_api import sync_playwright
bio = 'grass'; foe = 'bugs'; out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=__import__('os').environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
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
    pg.keyboard.press('Enter'); pg.wait_for_timeout(6500); f.wait_for_function("__game.mission.alive.length > 0", timeout=90000)     # (0.49.1) wait for the squad to be down, however slow the machine
    got = f.evaluate("(async () => { const V = (await import('./js/ground/render/view.js')).VIEW; return [...V.m3].filter(n => /^veh_|prop_(wire|trench|cover|lz|bridge|worksite|mine|shieldgen)/.test(n)).sort(); })()")
    print('models that came:', len(got), got); assert len(got) >= 17, 'not every vehicle and field work model was loaded'
    f.evaluate("(() => { const g = __game; if (g.settings) g.settings.quality = 'high'; g.renderer.quality = 'high'; g.renderer.qset = 'high'; g.renderer.perf.low = false; g.renderer.perf.tier = 0; })()")
    f.evaluate("""(() => { const g = __game, r = g.renderer, m = g.mission, c = g.cam, sq = m.alive[0], X = sq.x, Y = sq.y, op = r._props.bind(r), U = r._g3.units, of = U.frame.bind(U);
      c.sight = 'day'; c.follow = false; c.x = X + 34; c.y = Y - 30; c.view = 170; c.yaw0 = 0.66;
      r._props = (...a) => { const o = op(...a);
        o.push({ k: 'bridge', x: X + 30, y: Y - 70, l: 22, s: 20, h: 5, rot: -0.2, up: 0.3 }, { k: 'wire', x: X - 20, y: Y - 40, l: 6, s: 1.5, h: 1.5, rot: 0.3 }, { k: 'wire', x: X - 8.6, y: Y - 43.5, l: 6, s: 1.5, h: 1.5, rot: 0.3 },
          { k: 'trench', x: X - 22, y: Y - 22, l: 6, s: 1.25, rot: -0.4 }, { k: 'cover0', x: X + 8, y: Y - 30, l: 4, s: 1.5, h: 1.5, rot: 0.2 }, { k: 'cover1', x: X + 22, y: Y - 30, l: 4, s: 1.5, h: 1.5, rot: -0.3 }, { k: 'cover2', x: X + 36, y: Y - 30, l: 4, s: 1.5, h: 1.5, rot: 0.1 },
          { k: 'lz', x: X + 62, y: Y - 34, s: 9, h: 5 }, { k: 'worksite', x: X + 60, y: Y - 8, s: 4.5 }, { k: 'shieldgen', x: X + 42, y: Y - 8, s: 2.4 });
        for (let i = 0; i < 6; i++) o.push({ k: 'mine', x: X + 20 + (i % 3) * 4, y: Y - 12 + Math.floor(i / 3) * 4, s: 0.8 }); return o; };
      U.frame = (list, ...a) => of([...list, { k: 'lrv', x: X + 30, y: Y - 70, r: 8.5, face: -0.2 + Math.PI }, { k: 'lrv', x: X - 4, y: Y - 14, r: 8.5, face: 0.6 }, { k: 'mech', x: X + 10, y: Y - 8, r: 9.5, face: -1.2 }, { k: 'dog', x: X - 2, y: Y + 4, r: 2.6, face: 2 },
        { k: 'dship', x: X + 62, y: Y - 34, r: 9, face: -0.8, up: 2 }, { k: 'jet', x: X + 4, y: Y - 56, r: 9, face: 0.3, up: 26 }, { k: 'shuttle', x: X + 78, y: Y - 60, r: 9, face: 2.4, up: 1 }, { k: 'uav', x: X + 44, y: Y - 48, r: 5, face: 1, up: 30 }], ...a); })()""")
    pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/field-game.png')
    # rings: a UAV's patch, a zone and whatever the fight has put down, as lines of light off the ground (none painted on the sheet)
    f.evaluate("(() => { const m = __game.mission, sq = m.alive[0]; m.uavs.push({ x: sq.x + 20, y: sq.y - 30, r: 46, born: m.t, until: m.t + 90 }); m.zones.push({ kind: 'gas', x: sq.x + 70, y: sq.y - 50, r: 16, born: m.t, until: m.t + 90 }); })()")
    pg.wait_for_timeout(1500); rings = f.evaluate("({ taken: __game.renderer._rings.length, bars: __game.renderer._g3.fx.n.rings })"); print('rings in 3D:', rings); assert rings['taken'] >= 2 and rings['bars'] > 20, 'the rings should be drawn in 3D'
    pg.screenshot(path=f'{out}/field-rings.png')
    f.evaluate("__game.cam.sight = 'whot'"); pg.wait_for_timeout(700); pg.screenshot(path=f'{out}/field-game-thermal.png')
    br.close()
print('\n'.join(errs) if errs else 'no page errors')
sys.exit(1 if errs else 0)
