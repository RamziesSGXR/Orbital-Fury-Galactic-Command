# (0.72) The live war room behind the main menu (js/core/warroom.js).
#   python3 test/warroom.py            checks it draws, that its people come, that it stops while a game is open and starts again
#                                     at the menu, and how many frames it draws in ten seconds (software graphics here)
#   python3 test/warroom.py stills     takes the menu's still pictures from it: assets/menu/warroom.jpg (the picture shown until
#                                     the room draws, or if it cannot), table.jpg (the campaign panel), consoles.jpg
# A server on localhost:8080 serving the repo is expected.
import sys, io
from playwright.sync_api import sync_playwright
from PIL import Image

ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
URL = 'http://localhost:8080/'
SHOTS = {   # where the camera stands for each still, and the picture's size
    'warroom': ({'pos': [-2, 4.2, 15], 'at': [-4.5, 1.6, -3], 'fov': 38}, (1600, 900), None),
    'table': ({'pos': [-2.5, 3.9, 7.6], 'at': [0.2, 1.0, 0], 'fov': 40}, (1200, 700), None),
    'consoles': ({'pos': [-1, 2.0, 4], 'at': [-1, 1.7, -9], 'fov': 34}, (1200, 700), (0, 235, 1200, 465)),
}

def bare(pg):
    pg.evaluate("for (const s of ['#s-title .tmain', '#tscrim']) document.querySelector(s).style.visibility = 'hidden'")

with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=__import__('os').environ.get('CHROME', '/usr/bin/google-chrome'), args=ARGS)
    errs = []
    if len(sys.argv) > 1 and sys.argv[1] == 'stills':
        for name, (shot, size, crop) in SHOTS.items():
            pg = br.new_page(viewport={'width': size[0], 'height': size[1]}); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(7000)
            pg.evaluate("(s) => import('/js/core/warroom.js').then(m => Object.assign(m.SHOT, s, { sway: 0 }))", shot); bare(pg); pg.wait_for_timeout(1800)
            im = Image.open(io.BytesIO(pg.screenshot())).convert('RGB')
            if crop: im = im.crop(crop)
            im.save(f'assets/menu/{name}.jpg', quality=84, optimize=True, progressive=True); print(name, im.size)
            pg.close()
    else:
        pg = br.new_page(viewport={'width': 1600, 'height': 900}); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(7000)
        st = pg.evaluate("""import('/js/core/warroom.js').then(m => { const d = m._debug(); return { running: m.running(), people: ['off', 'van', 'crew', 'troop', 'pilot', 'medic'].filter((k) => d.crowd.ready(k)), drawn: d.crowd.n }; })""")
        print('menu:', st)
        assert st['running'] and len(st['people']) == 6 and st['drawn'] >= 9, 'the war room did not draw its people'
        n0 = pg.evaluate("performance.now()"); f0 = pg.evaluate("new Promise((r) => { let n = 0; const t = performance.now(); (function f() { n++; if (performance.now() - t < 10000) requestAnimationFrame(f); else r(n); })(); })")
        print('frames in 10 s (software graphics):', f0)
        pg.click('#t-tabs [data-tab=play]'); pg.wait_for_timeout(300); pg.click('#t-page .gcard[data-g=base]'); pg.wait_for_timeout(800)
        for sel in ['#f-go', '#modal [data-x=close]']:
            if pg.evaluate(f"!!document.querySelector('{sel}') && document.querySelector('{sel}').offsetParent !== null"): pg.click(sel); pg.wait_for_timeout(500)
        pg.wait_for_function("gc.state === 'base'", timeout=120000); pg.wait_for_timeout(1000)
        away = pg.evaluate("import('/js/core/warroom.js').then(m => m.running())"); print('in the base, still drawing:', away)
        assert not away, 'the war room kept drawing behind a game'
        pg.click('#th-leave'); pg.wait_for_timeout(2000)
        back = pg.evaluate("import('/js/core/warroom.js').then(m => m.running())"); print('back at the menu, drawing:', back)
        assert back, 'the war room did not start again at the menu'
        # the ground game opens in a frame over the menu: the room rests under it, and wakes when it closes
        pg.click('#t-tabs [data-tab=play]'); pg.wait_for_timeout(300); pg.click('#t-page .gcard[data-g=fury]'); pg.wait_for_timeout(800)
        for sel in ['#t-page .pfoot .btn.go', '#t-page [data-act=new]', '#modal [data-x=close]']:
            if not pg.evaluate("!!document.getElementById('g-frame')") and pg.evaluate(f"!!document.querySelector('{sel}') && document.querySelector('{sel}').offsetParent !== null"): pg.click(sel); pg.wait_for_timeout(800)
        pg.wait_for_function("!!document.getElementById('g-frame')", timeout=30000); pg.wait_for_timeout(1500)
        under = pg.evaluate("import('/js/core/warroom.js').then(m => m.running())"); print('under Orbital Fury, drawing:', under)
        assert not under, 'the war room kept drawing under the ground game'
        pg.evaluate("window.gcFury.onExit()"); pg.wait_for_timeout(1500)
        print('Orbital Fury closed, drawing:', pg.evaluate("import('/js/core/warroom.js').then(m => m.running())"))
    print('no page errors' if not errs else 'page errors: ' + '; '.join(errs[:3]))
    sys.exit(1 if errs else 0)
