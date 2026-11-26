# (GC 0.90) Browser check of the surface detail picture (js/surface.js, assets/textures/detail.png): python3 test/surface.py [out]
#   - the picture loads and every shader built with it compiles (models from each mode, trees and rocks, the land's soil), with
#     it and with ?surf=0
#   - it reaches materials that were drawn before it arrived (the picture is held back here until the scene has drawn)
#   - it shows: close up, the same scene has much more fine detail with it than without
import sys, io
from PIL import Image, ImageFilter, ImageStat
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'; errs = []
def busy(png, box):     # fine detail: the mean of the edges in a part of the picture
    im = Image.open(io.BytesIO(png)).convert('L').crop(box).filter(ImageFilter.FIND_EDGES); return ImageStat.Stat(im).mean[0]
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text[:300]) if m.type == 'error' and 'favicon' not in m.text and 'status of 404' not in m.text else None)
    pg.on('response', lambda r: errs.append('missing: ' + r.url) if r.status == 404 and 'favicon' not in r.url else None)
    held = {'n': 0}
    def slow(route):     # the picture comes late: after the scene has been drawn with the flat one
        held['n'] += 1; pg.wait_for_timeout(2500); route.continue_()
    pg.route('**/detail.png', slow)
    res = {}
    for st in ['base', 'ground', 'people', 'env']:
        for q in ['', '&surf=0']:
            pg.goto(f'http://localhost:8080/test/surface.html?set={st}&d=7{q}')
            pg.wait_for_function('window.__ready', timeout=60000); pg.wait_for_timeout(1200)
            png = pg.screenshot(path=f'{out}/surface-{st}{"-off" if q else ""}.png')
            st_ready = pg.evaluate("import('/js/surface.js').then(m => ({ ready: m.detail.ready, layers: m.detail.tex ? m.detail.tex.image.depth : 0 }))")
            res[st + q] = { 'floor': busy(png, (100, 560, 1180, 710)), 'models': busy(png, (100, 200, 1180, 520)), **st_ready }
            print(st + (q or ''), res[st + q])
    br.close()
assert held['n'] >= 3, 'the detail picture was never asked for'
for st in ['base', 'ground', 'people', 'env']:
    on, off = res[st], res[st + '&surf=0']
    assert on['ready'] and on['layers'] == 17, f'the detail picture did not load ({st})'
    assert on['floor'] > off['floor'] * 1.6, f'the land shows no detail of its own ({st}): {on["floor"]:.2f} against {off["floor"]:.2f}'
    assert on['models'] > off['models'] * 1.15, f'the models show no more detail with it than without ({st}): {on["models"]:.2f} against {off["models"]:.2f}'
print('ERRORS:' if errs else 'no page errors'); [print(' ', e[:300]) for e in errs[:20]]
sys.exit(1 if errs else 0)
