# (GC 0.78) Browser check of FOB Commander's player feedback: python3 test/base_fixes.py [out]  (needs the server on 8080)
#   - barbed wire drawn along a wall runs along its top; sandbags and trenches are kept out of walls, and walls out of them
#   - the numbers at the top right are there after the main menu and back (they were drawn only when they changed)
#   - a 3D view the graphics driver drops comes back: given back by the browser, or built again if it is not
#   - the water purifier, treatment plant, Concrete Batch Plant and Missile Silo get crews (they never did)
#   - a building's card: condition always shown and explained, REPAIR, CREW FIRST, SWITCH OFF; CONDITION on the HAPPINESS page
import io, sys
from PIL import Image
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'; errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=__import__('os').environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_function("gc.state === 'title'", timeout=20000); pg.wait_for_timeout(400)
    def lit():     # how bright the middle of the 3D view is (0 black, 255 white)
        im = Image.open(io.BytesIO(pg.screenshot(clip={'x': 420, 'y': 220, 'width': 600, 'height': 300}))).convert('L').resize((60, 30)); px = list(im.get_flattened_data()); return sum(px) / len(px)
    def leave():
        pg.keyboard.press('Escape'); pg.wait_for_selector('#m-title', timeout=20000); pg.click('#m-title'); pg.wait_for_function("gc.state === 'title'", timeout=20000); pg.wait_for_timeout(400)
    def play():
        pg.click('#t-tabs [data-tab=play]'); pg.wait_for_timeout(250); pg.click('#t-page .gcard[data-g=base]')
        pg.wait_for_function("gc.state !== 'title' || document.querySelector('[data-act=slot][data-g=base]')", timeout=20000); pg.wait_for_timeout(300)
        st = pg.evaluate("gc.state")
        if st == 'found': pg.click('#f-go'); pg.wait_for_timeout(300)
        elif st == 'title': pg.click('[data-act=slot][data-g=base][data-n="0"]')
        pg.wait_for_function("gc.state === 'base' && document.getElementById('trans').hidden", timeout=90000); pg.wait_for_timeout(1500)
    nums = lambda: pg.evaluate("document.querySelectorAll('#th-stats .fbig b, #th-stats .fres .ri b').length - [...document.querySelectorAll('#th-stats .fbig b, #th-stats .fres .ri b')].filter((b) => !b.textContent).length")
    # --- the numbers at the top right, three visits running, the game paused as it is left
    for k in range(3):
        play(); n = nums(); print('visit', k + 1, 'numbers at the top right:', n)
        assert n >= 10, f'visit {k + 1}: the numbers at the top are missing ({n})'
        if k < 2: pg.click('#fb-clock [data-fb=pause]'); pg.wait_for_timeout(200); leave()
    # --- walls and field works
    r = pg.evaluate("""(() => { const s = gc.mode.sim, hq = s.b.find(b => b.type === 'hq'); s.supplies += 9000;
      const x0 = hq.x + 8.5, z0 = hq.z - 3.5, o = {};
      const line = (k, ax, az, bx, bz) => { const a = s.snapLine({ x: ax, z: az }, 'grid', k), b = s.snapLine({ x: bx, z: bz }, 'grid', k, a); const c = s.checkLine(a, b, k); if (c.ok) s.drawLine(a, b, k); return c.ok ? 'ok' : c.why; };
      o.wall = line('wall', x0, z0, x0, z0 + 8); o.wireOn = line('wire', x0, z0 + 1, x0, z0 + 7); o.bagsOn = line('bags', x0, z0 + 1, x0, z0 + 7); o.trenchOn = line('trench', x0, z0 + 2, x0, z0 + 6);
      o.bagsBy = line('bags', x0 + 1, z0 + 1, x0 + 1, z0 + 7); o.wallOverBags = line('wall', x0 + 1, z0 + 2, x0 + 1, z0 + 5);
      const v = gc.mode.view; v.lookAt(x0 + 1, z0 + 4); v.zoom = v.zoomT = 7; return o; })()""")
    print('lines:', r)
    assert r['wall'] == 'ok' and r['wireOn'] == 'ok' and r['bagsBy'] == 'ok', r
    assert r['bagsOn'].startswith('Sandbags go in front of a wall') and r['trenchOn'].startswith('A trench goes in front of a wall') and 'Sandbags or a trench in the way' in r['wallOverBags'], r
    pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/fix-1-wire-on-wall.png')
    # --- the 3D view dropped: given back, then not given back
    pg.evaluate("window.__ext = gc.mode.view.r.getContext().getExtension('WEBGL_lose_context')")
    b0 = lit(); pg.evaluate('__ext.loseContext()'); pg.wait_for_timeout(1200); dark = lit()
    pg.evaluate('__ext.restoreContext()'); pg.wait_for_timeout(2500); back = lit()
    print(f'view: {b0:.0f} lit, {dark:.0f} dropped, {back:.0f} given back')
    assert dark < 20 and back > b0 * 0.8, 'a view the browser gives back is not drawn again'
    pg.evaluate("window.__v0 = gc.mode.view; window.__ext = gc.mode.view.r.getContext().getExtension('WEBGL_lose_context'); __ext.loseContext()"); pg.wait_for_timeout(800)
    assert 'DROPPED OUT' in pg.evaluate("document.getElementById('th-msg').textContent"), 'a dropped view is not said'
    pg.wait_for_timeout(4500); again = lit()
    print(f'view not given back: built again {pg.evaluate("gc.mode.view !== __v0 && !gc.mode.view.lost")}, {again:.0f} lit')
    assert pg.evaluate('gc.mode.view !== __v0 && !gc.mode.view.lost') and again > b0 * 0.8, 'a view the browser does not give back stays black'
    z0 = pg.evaluate('gc.mode.view.zoomT'); pg.mouse.move(720, 400); pg.mouse.wheel(0, 300); pg.wait_for_timeout(300)
    assert pg.evaluate('gc.mode.view.zoomT') != z0, 'the view built again does not take the mouse'
    # --- crews for the four that never had one; a card's controls
    c = pg.evaluate("""(() => { const s = gc.mode.sim, hq = s.b.find(b => b.type === 'hq'), put = [];
      for (const t of ['batch', 'rowpu', 'treatment', 'silo']) { let b = null; for (let k = 0; k < 600 && !b; k++) { const r = s.place(t, hq.x - 20 + (k % 30) * 2, hq.z + 10 + Math.floor(k / 30) * 2, 0, true); if (r && r.id) b = r; } if (b) { b.done = true; b.prog = 1; put.push(b); } }
      for (let i = 0; i < 8; i++) s.addRecruit ? s.addRecruit() : null;
      s.recalc(); for (const b of put) b.cond = 55; const g = put[0]; const v = gc.mode.view; v.lookAt(g.x + g.w / 2, g.z + g.d / 2); v.zoom = v.zoomT = 7;
      return { crew: put.map(b => [b.type, b.crew, b.off]), ids: put.map(b => b.id), id: g.id, x: g.x + g.w / 2, z: g.z + g.d / 2, troops: s.troops.length }; })()""")
    print('crews:', c['crew'], 'troops', c['troops'])
    assert len(c['crew']) == 4 and all(n > 0 for _, n, _ in c['crew']), f"a crewed building gets no crew: {c['crew']}"
    pg.wait_for_timeout(1200)
    p = pg.evaluate(f"gc.mode.view.toScreen({c['x']}, {c['z']})"); pg.mouse.click(p[0], p[1]); pg.wait_for_timeout(500)
    card = pg.evaluate("document.getElementById('fb-selp').innerText"); print(card.replace('\n', ' | '))
    assert '55% · works at 85%' in card and 'REPAIR' in card and 'CREW FIRST' in card and 'SWITCH OFF' in card, 'the card does not show condition and its controls'
    assert pg.evaluate("document.querySelector('#fb-selp .kv[title]').title.includes('upkeep you pay mends it')"), 'condition is not explained on the card'
    pg.screenshot(path=f'{out}/fix-2-card.png')
    pg.evaluate("document.querySelector('#fb-selp [data-fb=rep]').click()"); pg.wait_for_timeout(300)
    fixed = pg.evaluate(f"{c['ids']}.filter(id => gc.mode.sim.byId(id).cond === 100)"); assert len(fixed) == 1, f'REPAIR: {fixed}'
    c['id'] = fixed[0]     # the one on the card
    pg.evaluate("document.querySelector('#fb-selp [data-fb=first]').click()"); pg.wait_for_timeout(300); assert pg.evaluate(f"gc.mode.sim.byId({c['id']}).first") is True, 'CREW FIRST'
    pg.evaluate("document.querySelector('#fb-selp [data-fb=off]').click()"); pg.wait_for_timeout(300); assert pg.evaluate(f"[gc.mode.sim.byId({c['id']}).off, gc.mode.sim.byId({c['id']}).crew]") == [True, 0], 'SWITCH OFF frees its crew'
    pg.click('#fb-dock [data-mt=hap]'); pg.wait_for_timeout(500)     # (GC 0.83) the report's CONDITION is on the Offices' HAPPINESS page now
    assert pg.evaluate("[...document.querySelectorAll('#fb-mi-body .om')].some(r => r.textContent.startsWith('CONDITION') && r.title.includes('upkeep you pay mends it'))"), 'HAPPINESS has no CONDITION, explained'
    br.close()
assert not errs, errs
print('no page errors · base fixes ok')
