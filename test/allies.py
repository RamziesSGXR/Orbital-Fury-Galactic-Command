# Browser check of your own people on the ground (do they walk, run, aim, kneel, fire, take cover) and of the enemy's craft in 3D:
# python3 test/allies.py [biome] [bugs|bots|lizards] [out]
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
    f.wait_for_function("__game.mission.alive.length > 0", timeout=60000); pg.wait_for_timeout(1500)     # (the squad is down)
    # (GC 0.50) WHO IS DOING WHAT. The frames in use for the squad and the Infantry (walking, running, rifle up, kneeling, kicking,
    # ducked) are counted over a stretch of the fight; a mission where nobody ever walks or shoots fails here.
    frames = "(() => { const g = __game.renderer._g3, o = {}; for (const k of ['van', 'inf']) { const m = g.units.kinds.get(k); if (!m || !m.frames) continue; for (const set of [m.frames, m.lod ? m.lod.frames : {}]) for (const f in set) if (set[f].count) o[f.replace(/\\d/, '')] = (o[f.replace(/\\d/, '')] || 0) + set[f].count; } return o; })()"
    look = "(() => { const c = __game.cam, a = __game.mission.alive.find((x) => !x.dead && !x.down) || __game.mission.alive[0]; c.follow = false; c.x = a.x; c.y = a.y; c.view = 60; })()"
    seen = {}; fastest = 0
    pg.keyboard.press('g'); pg.wait_for_timeout(300); pg.mouse.click(640, 330); pg.wait_for_timeout(300)     # an Infantry drop, so troopers are on the ground too
    for i in range(40):
        f.evaluate(look); pg.wait_for_timeout(700)
        for k, n in f.evaluate(frames).items(): seen[k] = seen.get(k, 0) + n
        fastest = max(fastest, f.evaluate("Math.max(0, ...__game.mission.alive.map((a) => a.mv || 0))"))
        if i in (3, 12, 24, 36): pg.screenshot(path=f'{out}/allies-{foe}-{i}.png')
    print('ally frames shown:', dict(sorted(seen.items())), 'fastest', round(fastest, 1), 'm/s')
    assert fastest > 1, 'nobody of yours ever moved'
    assert seen.get('w', 0) + seen.get('r', 0) + seen.get('a', 0) > 0, 'nobody of yours was ever drawn walking or running'
    # THE ENEMY'S CRAFT. One is hung over the squad (bots: the dropship; lizards: the war barge), looked at, then shot down.
    if foe in ('bots', 'lizards'):
        kind = 'ship' if foe == 'bots' else 'warp'; file = 'drop_foundry' if foe == 'bots' else 'drop_talon'
        f.evaluate("((kind) => { const m = __game.mission, a = m.alive.find((x) => !x.dead) || m.alive[0], x = a.x + 26, y = a.y - 8; m.drops.push({ id: 99001, drop: true, kind, x: x - 150, y: y - 40, tx: x, ty: y, dx: 0.97, dy: 0.26, state: 'in', alt: 1, left: 0, hp: 9e5, maxHp: 9e5, shield: kind === 'warp' ? 9e5 : 0, maxShield: kind === 'warp' ? 9e5 : 0, shieldAt: -9, hurtAt: -9, vis: 2, hoverT: 0, dropT: 9, groups: [] }); const c = __game.cam; c.follow = false; c.x = x; c.y = y; c.view = 110; })('%s')" % kind)
        pg.wait_for_timeout(350); pg.screenshot(path=f'{out}/craft-{foe}-in.png')
        f.wait_for_function("(() => { const d = __game.mission.drops.find((x) => x.id === 99001); return !d || d.state === 'hover'; })()", timeout=60000)
        f.evaluate("(() => { const d = __game.mission.drops.find((x) => x.id === 99001); if (d) { d.hoverT = 30; d.left = 0; } })()"); pg.wait_for_timeout(500); pg.screenshot(path=f'{out}/craft-{foe}-hover.png')
        got = f.evaluate("(() => { const g = __game.renderer._g3, m = g.units.kinds.get('edrop:%s'); return m && m.frames ? Object.fromEntries(Object.entries(m.frames).map(([k, v]) => [k, v.count])) : null; })()" % kind)
        print('craft drawn (by frame):', got, 'model in:', f.evaluate("__game.renderer._g3.units.loaded['edrop:%s']" % kind))
        assert got and got.get('hover', 0) >= 1, 'the craft was not drawn as its model over the drop'
        f.evaluate("(() => { const d = __game.mission.drops.find((x) => x.id === 99001); d.state = 'down'; d.survivors = 0; Object.defineProperty(d, 'fallT', { configurable: true, get: () => 0.55, set: () => {} }); Object.defineProperty(d, 'alt', { configurable: true, get: () => 0.16, set: () => {} }); })()"); pg.wait_for_timeout(300); pg.screenshot(path=f'{out}/craft-{foe}-down.png')     # (held part-way through its fall for the picture)
        f.evaluate("(() => { const d = __game.mission.drops.find((x) => x.id === 99001); delete d.fallT; delete d.alt; d.fallT = 0.6; d.alt = 0.1; })()")
        pg.wait_for_timeout(2500)
    print('page errors:' if errs else 'no page errors', errs[:6])
    br.close()
if errs: sys.exit(1)
