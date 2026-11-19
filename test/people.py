# Browser check that the base's and the station's people are the Blender models: python3 test/people.py [base|orbit] [out]
import sys
from playwright.sync_api import sync_playwright
which = sys.argv[1] if len(sys.argv) > 1 else 'base'; out = sys.argv[2] if len(sys.argv) > 2 else '/tmp/shots'; errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(400)
    pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
    pg.click('#b-new'); pg.click('#f-go'); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(700)
    pid = pg.evaluate('sgs.g.P.find(p => p.owner === "fed" && p.ring === 1).id')
    pg.evaluate(f'gc.app.theatre("{which}", {{ system: sgs.g.P[{pid}] }})')
    pg.wait_for_function(f"gc.state === '{which}' && document.getElementById('trans').hidden", timeout=120000)
    pg.wait_for_function("(() => { const f = gc.mode.view.folk; return f && Object.keys(f.kinds).every(k => f.ready(k)); })()", timeout=60000)
    if which == 'orbit':
        pg.evaluate('(()=>{const s=gc.mode.station; s.build("core",1,1,0); s.build("hab",1,3,0); s.build("dockport",1,2,0); s.build("cargo",1,4,0); for(let i=0;i<3000;i++) s.step(1/30);})()')
        pg.evaluate('(()=>{const v=gc.mode.view; if (v.setCutaway) v.setCutaway(true); else v.cutaway = true; if (v._modeApply) v._modeApply(); })()')
    else:
        pg.evaluate('gc.mode.fast && gc.mode.fast()')
    pg.wait_for_timeout(6000)
    if which == 'base':     # close in on a soldier
        pg.evaluate("(() => { const v = gc.mode.view, a = [...v.life.actors.values()].find(a => a.kind === 'troop' && !a.hidden) || [...v.life.actors.values()][0]; v.target.x = v.wx(a.x); v.target.z = v.wx(a.z); v.zoom = v.zoomT = 4; v.pitch = 0.45; })()")
        pg.wait_for_timeout(1500)
    info = pg.evaluate("(() => { const f = gc.mode.view.folk, by = {}; for (const [id, im] of f.ims) if (im.count) by[id] = im.count; return { kinds: Object.keys(f.kinds).filter(k => f.ready(k)).length, drawn: f.n, by, old: gc.mode.view.pm ? gc.mode.view.pm.size : null }; })()")
    print(which, 'people from the models:', info)
    pg.screenshot(path=f'{out}/people-{which}.png')
    assert info['kinds'] >= 7, 'the models did not load'
    br.close()
print('ERRORS:' if errs else 'no page errors'); [print(' ', e[:300]) for e in errs[:20]]
sys.exit(1 if errs else 0)
