# Browser check that the base's buildings are the Blender models: python3 test/buildings.py [out]
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
    pg.wait_for_timeout(5000)
    info = pg.evaluate("""(async () => { const { BLD, buildModel } = await import('/js/base/models.js'), { B } = await import('/js/base/config.js'), v = gc.mode.view; let on = 0, all = 0, bad = [];
      for (const g of v.bm.values()) { all++; let has = false; g.traverse(o => { if (o.userData.model3) has = true; }); if (has) on++; }
      for (const t of Object.keys(B)) { try { const g = buildModel(t, v.m, true); let has = false; g.traverse(o => { if (o.userData.model3) has = true; }); if (!has) bad.push(t); } catch (e) { bad.push(t + ': ' + e.message); } }
      return { files: BLD.data.size, standing: all, modelled: on, kindsWithoutModel: bad }; })()""")
    print('buildings from the models:', info)
    pg.evaluate("(() => { const v = gc.mode.view; v.target.x = 0; v.target.z = 2; v.zoom = v.zoomT = 7; v.pitch = 0.6; })()"); pg.wait_for_timeout(2500)
    pg.screenshot(path=f'{out}/buildings-base.png')
    assert info['files'] >= 71 and not info['kindsWithoutModel'], 'buildings are missing their models'
    br.close()
print('ERRORS:' if errs else 'no page errors'); [print(' ', e[:300]) for e in errs[:20]]
sys.exit(1 if errs else 0)
