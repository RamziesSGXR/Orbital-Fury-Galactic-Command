# Browser check of the ground view (0.37): the sight switch, the height view, the single pass, stillness when paused, and
# health read by aiming. python3 test/view.py [out]  (needs the server on 8080)
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
    pg.keyboard.press('Enter'); pg.wait_for_timeout(7000); f.wait_for_function("__game.mission.alive.length > 0", timeout=90000)     # (0.49.1) on a slow machine the squad is not down in seven seconds
    f.evaluate("(() => { const m = __game.mission, c = __game.cam, sq = m.alive[0]; c.follow = false; c.x = sq.x; c.y = sq.y; c.view = 170; for (const e of m.enemies) if (!e.dead) e.vis = 2; })()"); pg.wait_for_timeout(600)
    # 1. the sight: infrared to begin with, colour at a click, and the height view
    assert f.evaluate("__game.cam.sight") == 'whot', 'the sight should start in infrared'
    pg.screenshot(path=f'{out}/view-1-thermal.png')
    f.click('.sgt[data-sight=day]'); pg.wait_for_timeout(400); assert f.evaluate("__game.cam.sight") == 'day'     # (0.49: a desktop names the three sights, one button each)
    f.click('.sgt[data-sight=bhot]'); pg.wait_for_timeout(300); assert f.evaluate("__game.cam.sight") == 'bhot'; f.click('.sgt[data-sight=day]'); pg.wait_for_timeout(300)
    assert f.evaluate("document.getElementById('btn-pause').parentElement.id") == 'gamebar', 'pause should sit in the top bar on a desktop'; pg.screenshot(path=f'{out}/view-2-colour.png')
    f.click('#btn-topo'); pg.wait_for_timeout(400); assert f.evaluate("__game.cam.topo") is True; pg.screenshot(path=f'{out}/view-3-height.png')
    f.click('#btn-topo'); pg.wait_for_timeout(200)
    print('sight put on by the graphics card:', f.evaluate("!!__game.renderer._g3.sighted"), '| kept:', f.evaluate("localStorage.getItem('ofgc.view')"))
    # 2. one pass: the view swings one way over the mission, steepest in the middle, and never goes round
    P = f.evaluate("""(() => { const m = __game.mission, c = __game.cam, r = __game.renderer, keep = m.t, out = [];
      for (const u of [0, 0.25, 0.5, 0.75, 1]) { m.t = u * m.limitSec; r.pass(m, c); out.push([+c.yaw.toFixed(3), +c.passTilt.toFixed(1)]); }
      m.t = keep; r.pass(m, c); return out; })()""")
    print('the pass (turn, tilt) at 0, 1/4, 1/2, 3/4, 1 of the mission:', P)
    assert all(P[i][0] < P[i + 1][0] for i in range(4)), 'the view should swing one way only'
    assert abs(P[4][0] - P[0][0]) < 3.2, 'the view should never go right round'
    assert P[2][1] > P[0][1] and P[2][1] > P[4][1], 'the view should be steepest in the middle'
    # 3. paused: nothing in the view moves
    pg.keyboard.press('p'); pg.wait_for_timeout(500)
    a = f.evaluate("(() => { const v = __game.renderer.view; return [v.camX, v.camY, v.yaw, __game.mission.t]; })()"); pg.wait_for_timeout(1500)
    b = f.evaluate("(() => { const v = __game.renderer.view; return [v.camX, v.camY, v.yaw, __game.mission.t]; })()")
    print('paused, 1.5 s apart:', a, b); assert a == b, 'the view moved while paused'
    pg.keyboard.press('p'); pg.wait_for_timeout(400)
    # 4. no health bars beside units; aim at an enemy and its name and health come up; a hurt one flashes and darkens
    got = f.evaluate("""(async () => { const V = (await import('./js/ground/render/view.js')).VIEW, m = __game.mission, c = __game.cam, r = __game.renderer;
      const e = m.enemies.filter(x => !x.dead && !x.boss).sort((p, q) => Math.hypot(p.x - c.x, p.y - c.y) - Math.hypot(q.x - c.x, q.y - c.y))[0]; e.vis = 2; e.hp = e.maxHp * 0.4; e.vx = e.vy = 0;
      c.x = e.x; c.y = e.y; c.view = 90;
      r.draw(m, c, { now: performance.now() / 1000, aim: { x: e.x, y: e.y } });
      const L = r.labels.filter(l => l.bars && Math.abs(l.x - e.x) < 2 && Math.abs(l.y - e.y) < 2);
      return { bars: V.bars, label: L.map(l => [l.text, +l.bars[0].f.toFixed(2)]) }; })()""")
    print('aimed at an enemy:', got); assert got['bars'] is False and got['label'], 'aiming at an enemy should give its name and health'
    pg.wait_for_timeout(300); pg.screenshot(path=f'{out}/view-4-aimed.png')
    br.close()
print('\n'.join(errs) if errs else 'no page errors')
sys.exit(1 if errs else 0)
