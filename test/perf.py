# Where a ground frame's time goes (the JS side: the GPU here is software): python3 test/perf.py [biome] [enemy] [seconds]
# Prints the frame rate and the functions with the most time of their own. Needs the server on 8080.
import sys, json
from playwright.sync_api import sync_playwright
bio = sys.argv[1] if len(sys.argv) > 1 else 'grass'; foe = sys.argv[2] if len(sys.argv) > 2 else 'bugs'; secs = float(sys.argv[3]) if len(sys.argv) > 3 else 6
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    pg = br.new_page(viewport={'width': 1920, 'height': 1080})
    pg.on('pageerror', lambda e: print('pageerror:', e))
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(500)
    pg.evaluate("(() => { let v = null; Object.defineProperty(window, 'gcGround', { configurable: true, get: () => v, set: (x) => { if (x) { x.biome = '%s'; x.faction = '%s'; }  v = x; } }); })()" % (bio, foe))
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
    if len(sys.argv) > 4: f.evaluate(sys.argv[4])
    pg.keyboard.press('Enter'); pg.wait_for_timeout(9000)
    # a busy picture: the camera on the thick of the enemy, everything seen
    f.evaluate("(() => { const m = __game.mission, c = __game.cam; for (const e of m.enemies) if (!e.dead) e.vis = 2; const b = m.enemies.find(e => !e.dead); c.follow = false; c.x = b.x; c.y = b.y; c.view = 150; })()")
    pg.wait_for_timeout(1000)
    f.evaluate("(() => { window.__ft = []; let last = performance.now(); const tick = () => { const n = performance.now(); __ft.push(n - last); last = n; requestAnimationFrame(tick); }; requestAnimationFrame(tick); })()")
    cdp = pg.context.new_cdp_session(pg); cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 500}); cdp.send('Profiler.start')
    pg.wait_for_timeout(int(secs * 1000))
    prof = cdp.send('Profiler.stop')['profile']
    ft = f.evaluate("__ft.slice(5)"); ft.sort()
    print('frames %d, mean %.1f ms (%.0f fps), median %.1f, worst tenth %.1f' % (len(ft), sum(ft) / len(ft), 1000 * len(ft) / sum(ft), ft[len(ft) // 2], ft[int(len(ft) * 0.9)]))
    print('on screen:', f.evaluate("(() => { const r = __game.renderer, g = r._g3; return { sheet: r._wc ? r._wc.width : 0, units: g && g.units ? [...g.units.kinds.values()].reduce((a, k) => a + (k && k.frames ? Object.values(k.frames).reduce((x, y) => x + y.count, 0) : 0), 0) : 0, calls: g ? g.r.info.render.calls : 0, tris: g ? g.r.info.render.triangles : 0 }; })()"))
    nodes = {n['id']: n for n in prof['nodes']}; dt = prof['timeDeltas']; self = {}
    for s, d in zip(prof['samples'], dt):
        c = nodes[s]['callFrame']; k = (c['functionName'] or '(anon)') + ' ' + c['url'].split('/')[-1] + ':' + str(c['lineNumber'] + 1); self[k] = self.get(k, 0) + d
    tot = sum(self.values())
    for k, v in sorted(self.items(), key=lambda x: -x[1])[:32]: print('%5.1f%%  %s' % (v / tot * 100, k))
    br.close()
