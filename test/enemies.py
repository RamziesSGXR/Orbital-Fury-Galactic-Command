# Browser check of the enemy's models up close on the ground, one picture for each size: python3 test/enemies.py [biome] [enemy] [out]
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
    pg.wait_for_timeout(6000)
    look = "((o, v) => { const c = __game.cam; c.follow = false; c.x = o.x; c.y = o.y; c.view = v; })"
    print('models loaded (triangles):', f.evaluate("__game.renderer._g3.units.loaded"))
    for kind in ('L', 'M', 'H'):
        got = f.evaluate("((k) => { const m = __game.mission, sq = m.alive[0]; let best = null, bd = 1e9; for (const e of m.enemies) { if (e.dead || e.kind !== k || e.boss) continue; const d = (e.x - sq.x) ** 2 + (e.y - sq.y) ** 2 - (e.vis || 0) * 1e5; if (d < bd) { bd = d; best = e; } } if (!best) return null; for (const e of m.enemies) if (Math.hypot(e.x - best.x, e.y - best.y) < 60) e.vis = 2; %s(best, k === 'H' ? 70 : 46); return [best.sub || '', Math.round(best.x), Math.round(best.y)]; })('%s')" % (look, kind))
        if not got: print(kind, 'none on this map'); continue
        pg.wait_for_timeout(500); f.evaluate("((k) => { const m = __game.mission, c = __game.cam; let best = null, bd = 1e9; for (const e of m.enemies) { if (e.dead || e.kind !== k || e.boss) continue; const d = (e.x - c.x) ** 2 + (e.y - c.y) ** 2; if (d < bd) { bd = d; best = e; } e.vis = Math.max(e.vis || 0, d < 3600 ? 2 : 0); } if (best) { c.x = best.x; c.y = best.y; } })('%s')" % kind)
        pg.wait_for_timeout(350); pg.screenshot(path=f'{out}/enemy-{foe}-{kind}.png'); print(kind, got)
    # every kind on this map, and what is drawn from far off: the lighter models
    print('kinds on the map:', f.evaluate("(() => { const o = {}; for (const e of __game.mission.enemies) { if (e.dead) continue; const k = e.boss ? 'boss' : e.sub || e.v || e.kind; o[k] = (o[k] || 0) + 1; } return o; })()"))
    f.evaluate("(() => { const m = __game.mission, c = __game.cam; let sx = 0, sy = 0, n = 0; for (const e of m.enemies) if (!e.dead) { e.vis = 2; sx += e.x; sy += e.y; n++; } const b = m.enemies.find(e => !e.dead && (e.sub || e.v)) || m.enemies.find(e => !e.dead); c.x = b.x; c.y = b.y; c.view = 60; })()"); pg.wait_for_timeout(700); pg.screenshot(path=f'{out}/enemy-{foe}-variant.png')
    f.evaluate("(() => { const c = __game.cam; c.view = 300; })()"); pg.wait_for_timeout(700); pg.screenshot(path=f'{out}/enemy-{foe}-far.png')
    print('drawn from far off:', f.evaluate("(() => { const u = __game.renderer._g3.units, o = {}; for (const [k, m] of u.kinds) { if (!m || !m.frames) continue; const full = Object.values(m.frames).reduce((a, x) => a + x.count, 0), far = m.lod ? Object.values(m.lod.frames).reduce((a, x) => a + x.count, 0) : 0; if (full || far) o[k] = { full, far }; } return o; })()"))
    print('\n'.join(errs) if errs else 'no page errors'); br.close()
