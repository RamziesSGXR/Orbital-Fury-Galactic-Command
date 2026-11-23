# Draws the menu's line-art pictures from the game's own models (tools/lineart.html) into assets/menu/art-<scene>.png.
# python3 test/lineart.py  (needs the server on 8080)
from PIL import Image
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': 900, 'height': 640})
    for s in ['war', 'fury', 'base', 'orbit']:
        pg.goto(f'http://localhost:8080/tools/lineart.html?scene={s}'); pg.wait_for_function("document.body.dataset.done", timeout=30000)
        p = f'assets/menu/art-{s}.png'; pg.locator('#art').screenshot(path=p, omit_background=True); print(s, pg.evaluate("document.body.dataset.done"))
        im = Image.open(p); x0, y0, x1, y1 = im.getbbox(); im.crop((max(0, x0 - 18), max(0, y0 - 18), min(im.width, x1 + 18), min(im.height, y1 + 18))).save(p, optimize=True)     # trimmed to the drawing
    br.close()
