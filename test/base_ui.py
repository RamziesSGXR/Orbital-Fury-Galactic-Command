# Browser check of the base's controls (0.53): python3 test/base_ui.py [out]  (needs `npm start` running)
#   - dragging the ground moves it with the pointer, up and down as well as left and right
#   - roads drawn with the mouse keep to the tiles, and a road drawn across another makes a junction
#   - a tool shows what it is; a building shows its status; a request on the desk folds away; the guide runs
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'; errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
    pg.click('#b-new'); pg.click('#f-go'); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(700)
    pid = pg.evaluate('sgs.g.P.find(p => p.owner === "fed" && p.ring === 1).id')
    pg.evaluate(f'gc.app.theatre("base", {{ system: sgs.g.P[{pid}] }})')
    pg.wait_for_function("gc.state === 'base' && document.getElementById('trans').hidden", timeout=120000)
    pg.wait_for_timeout(3000)
    # the guide is up on a first base
    assert pg.evaluate("!document.getElementById('th-coach').hidden && document.getElementById('th-coach').textContent.includes('ROADS FIRST')"), 'no guide on the first base'
    pg.screenshot(path=f'{out}/ui-1-guide.png')

    # --- dragging: the ground under the pointer stays under the pointer
    box = pg.evaluate("(() => { const r = document.getElementById('v-base').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()")
    cx, cy = box[0] + box[2] / 2, box[1] + box[3] / 2
    pick = lambda x, y: pg.evaluate(f"(() => {{ const p = gc.mode.view.pick({x}, {y}); return [p.x, p.z]; }})()")
    for name, dx, dy in [('down', 0, 120), ('up', 0, -120), ('right', 150, 0), ('left', -150, 0)]:
        g0 = pick(cx, cy)
        pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + dx / 2, cy + dy / 2, steps=4); pg.mouse.move(cx + dx, cy + dy, steps=4); pg.mouse.up(); pg.wait_for_timeout(250)
        g1 = pick(cx + dx, cy + dy); err = ((g1[0] - g0[0]) ** 2 + (g1[1] - g0[1]) ** 2) ** 0.5
        print(f'drag {name}: the ground that was under the pointer is now {err:.2f} tiles from it')
        assert err < 1.5, f'dragging {name} does not carry the ground with the pointer ({err:.1f} tiles off)'
    pg.evaluate("(() => { const s = gc.mode.sim, v = gc.mode.view, hq = s.b.find(b => b.type === 'hq'); v.lookAt(hq.x + 1.5, hq.z + 1.5); v.zoom = v.zoomT = 14; })()"); pg.wait_for_timeout(500)

    # --- roads with the mouse, drawn sloppily: they land on the tiles
    scr = lambda x, z: pg.evaluate(f"gc.mode.view.toScreen({x}, {z})")
    def drag_road(a, b):
        p, q = scr(*a), scr(*b)
        pg.mouse.move(*p); pg.mouse.down(); pg.mouse.move((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, steps=5); pg.mouse.move(*q, steps=5); pg.mouse.up(); pg.wait_for_timeout(300)
    door = pg.evaluate("(() => { const s = gc.mode.sim, hq = s.b.find(b => b.type === 'hq'); return s.door(hq); })()")
    way = pg.evaluate("""(() => { const s = gc.mode.sim, hq = s.b.find(b => b.type === 'hq'), [dx, dz] = s.door(hq);
      for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = s.snapLine({ x: dx + 0.5, z: dz + 0.5 }, '45', 'dirt'), b = s.snapLine({ x: dx + 0.5 + ox * 12, z: dz + 0.5 + oz * 12 }, '45', 'dirt', a);
        const m = { x: dx + 0.5 + ox * 6 - oz * 5, z: dz + 0.5 + oz * 6 - ox * 5 }, n = { x: dx + 0.5 + ox * 6 + oz * 5, z: dz + 0.5 + oz * 6 + ox * 5 };
        if (s.checkLine(a, b, 'dirt').ok && s.checkLine(s.snapLine(m, '45', 'dirt'), s.snapLine(n, '45', 'dirt', s.snapLine(m, '45', 'dirt')), 'dirt').ok) return [ox, oz]; } return null; })()""")
    assert way, 'no clear ground for the test roads'
    ox, oz = way; dx, dz = door
    pg.click('[data-bt=road1]'); pg.wait_for_timeout(200)
    assert pg.evaluate("document.getElementById('th-sel').textContent.includes('One tile wide')"), 'the tool in hand is not described'
    drag_road((dx + 0.3, dz + 0.8), (dx + 0.2 + ox * 12 + oz * 0.3, dz + 0.7 + oz * 12 + ox * 0.3))
    drag_road((dx + 0.6 + ox * 6 - oz * 5.2, dz + 0.3 + oz * 6 - ox * 5.2), (dx + 0.4 + ox * 6 + oz * 5.3, dz + 0.6 + oz * 6 + ox * 5.3))
    net = pg.evaluate("(() => { const n = gc.mode.sim.net; const deg = {}; for (const s of n.segs) for (const id of [s.a, s.b]) deg[id] = (deg[id] || 0) + 1; return { segs: n.segs.length, nodes: n.nodes.map(o => [o.x, o.z]), most: Math.max(0, ...Object.values(deg)) }; })()")
    print('roads drawn by hand:', net)
    assert net['segs'] == 4 and net['most'] == 4, 'two roads drawn across each other did not make one junction'
    assert all(x % 1 == 0.5 and z % 1 == 0.5 for x, z in net['nodes']), 'a road end is not on a tile centre'
    pg.click('[data-bt=road1]'); pg.wait_for_timeout(1500)
    pg.evaluate(f"(() => {{ const v = gc.mode.view; v.lookAt({dx + ox * 6 + 0.5}, {dz + oz * 6 + 0.5}); v.zoom = v.zoomT = 6; }})()"); pg.wait_for_timeout(1200)
    pg.screenshot(path=f'{out}/ui-2-crossing.png')
    assert pg.evaluate("document.getElementById('th-coach').textContent.includes('ZONE THE ROADSIDE')"), 'the guide did not move on after the first road'

    # --- a building's card
    pg.evaluate("(() => { const s = gc.mode.sim, v = gc.mode.view, hq = s.b.find(b => b.type === 'hq'); v.lookAt(hq.x + 1.5, hq.z + 1.5); v.zoom = v.zoomT = 10; })()"); pg.wait_for_timeout(800)
    hqs = pg.evaluate("(() => { const s = gc.mode.sim, hq = s.b.find(b => b.type === 'hq'); return gc.mode.view.toScreen(hq.x + 1.5, hq.z + 1.5, 0.5); })()")
    pg.mouse.click(*hqs); pg.wait_for_timeout(500)
    card = pg.evaluate("document.getElementById('th-sel').innerText"); print('HQ card:', card.replace('\n', ' | ')[:300])
    assert 'power' in card.lower() and 'water' in card.lower(), 'the building card has no status'
    pg.screenshot(path=f'{out}/ui-3-status.png')

    # --- a request folds away by itself, and opens again
    pg.evaluate("(() => { const s = gc.mode.sim; s.desk.push({ id: s.nid++, k: 2, name: 'A. Test', due: s.t + 240 }); })()")
    pg.wait_for_selector('#th-desk .req:not(.fold)', timeout=8000)
    pg.screenshot(path=f'{out}/ui-4-desk-open.png')
    pg.wait_for_selector('#th-desk .req.fold', timeout=30000)
    assert pg.evaluate("!document.querySelector('#th-desk .req:not(.fold)')"), 'the request did not fold away by itself'
    pg.screenshot(path=f'{out}/ui-5-desk-folded.png')
    pg.click('#th-desk .req.fold'); pg.wait_for_selector('#th-desk .req:not(.fold) [data-ba]', timeout=8000)
    br.close()
print('ERRORS:' if errs else 'no page errors'); [print(' ', e[:300]) for e in errs[:20]]
sys.exit(1 if errs else 0)
