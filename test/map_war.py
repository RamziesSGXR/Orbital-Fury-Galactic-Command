# Browser check of the map in mid-war: sectors held by each side, a contested sector, a picked sector, the layers off.
# python3 test/map_war.py [out]  (needs the server on 8080)
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
    pg.click('#b-new'); pg.wait_for_timeout(200); pg.click('#f-posts [data-v=many]'); pg.click('#f-go'); pg.wait_for_timeout(200); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(800)
    # give each enemy the outer rings of its front, and the Molt half of one sector further in; put fleets on the board
    pg.evaluate("""(() => { const g = sgs.g, C3 = ['molt', 'foundry', 'talon'];
      for (const p of g.P) if (p.front >= 0 && p.ring >= 8) p.owner = C3[p.front];
      const sc = g.map.sectors.find(s => s.front === 0 && g.P[s.sys[0]].ring === 7); sc.sys.slice(0, Math.ceil(sc.sys.length / 2)).forEach(id => { g.P[id].owner = 'molt'; });
      let id = 900; for (const p of g.P) if (p.owner !== 'fed' && p.ring === 8 && p.id % 3 === 0) g.fleets.push({ id: id++, owner: p.owner, at: p.id, ships: 3 + p.id % 5, moved: true });
      g._sec = null; g._link = null; sgs.refresh(); })()""")
    pg.wait_for_timeout(600); pg.screenshot(path=f'{out}/war-1-whole.png')
    box = pg.query_selector('#map').bounding_box()
    pg.evaluate("sgs.view.focus(0)"); pg.wait_for_timeout(1600); pg.screenshot(path=f'{out}/war-2-front.png')
    pg.evaluate("(() => { const g = sgs.g; sgs.ui.sel = g.P.find(p => p.front === 0 && p.ring === 7).id; sgs.refresh(); })()"); pg.wait_for_timeout(400); pg.screenshot(path=f'{out}/war-3-picked.png')
    pg.evaluate("sgs.view.zoomAt(2.2)"); pg.wait_for_timeout(500); pg.screenshot(path=f'{out}/war-4-close.png')
    n = pg.evaluate("document.querySelectorAll('.lay').length"); assert n == 3, 'the three layer switches are not there'
    for k in ['sec', 'lane', 'name']: pg.click(f'.lay[data-k={k}]'); pg.wait_for_timeout(150)
    pg.wait_for_timeout(300); pg.screenshot(path=f'{out}/war-5-layers-off.png')
    off = pg.evaluate("JSON.stringify(sgs.view.layers)"); assert off == '{"sec":false,"lane":false,"name":false}', off
    pg.reload(); pg.wait_for_timeout(900)
    br.close()
print('\n'.join(errs) if errs else 'no page errors')
sys.exit(1 if errs else 0)
