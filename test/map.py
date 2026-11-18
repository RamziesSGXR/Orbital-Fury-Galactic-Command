# Browser check of the map's desk controls: python3 test/map.py  (needs `npm start` running)
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
    pg.click('#b-new'); pg.wait_for_timeout(200); pg.click('#f-posts [data-v=many]'); pg.click('#f-go'); pg.wait_for_timeout(200); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(1200)
    cam = lambda: pg.evaluate("(() => { const c = document.getElementById('map3d'); return c ? 1 : 0; })()")
    assert cam() == 1, 'the 3D map is not there'
    box = pg.query_selector('#map').bounding_box(); cx, cy = box['x'] + box['width'] * 0.65, box['y'] + box['height'] * 0.4
    shot = lambda n: pg.screenshot(path=f'{out}/map-{n}.png')
    shot('1-whole')
    pg.mouse.move(cx, cy)
    for _ in range(8): pg.mouse.wheel(0, -120); pg.wait_for_timeout(60)
    pg.wait_for_timeout(300); shot('2-wheel')
    pg.keyboard.down('d'); pg.wait_for_timeout(500); pg.keyboard.up('d'); pg.keyboard.down('q'); pg.wait_for_timeout(500); pg.keyboard.up('q'); pg.wait_for_timeout(200); shot('3-keys')
    pg.mouse.move(cx, cy); pg.mouse.down(button='right'); pg.mouse.move(cx + 200, cy, steps=6); pg.mouse.up(button='right'); pg.wait_for_timeout(200); shot('4-turn')
    pg.keyboard.press('f'); pg.wait_for_timeout(1500); shot('5-front')
    br.close()
print('\n'.join(errs) if errs else 'no page errors')
sys.exit(1 if errs else 0)
