# Browser check of the main menu and the four ways to play (0.39): python3 test/menu.py [out]  (needs the server on 8080)
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    pg = br.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/'); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(700)
    assert pg.evaluate("document.querySelectorAll('.mcard').length") == 4, 'four ways to play should be on the main menu'
    pg.screenshot(path=f'{out}/menu-1-new.png')
    # FOB Commander: found a command (no war's opening to choose), build, back to the menu, and it is on the card
    pg.click('#b-base-new'); pg.wait_for_timeout(400)
    assert pg.evaluate("gc.state") == 'found' and pg.evaluate("document.getElementById('f-open').classList.contains('hidden')"), 'a single post is founded without the war\'s opening'
    pg.click('#f-go'); pg.wait_for_function("gc.state === 'base' && document.getElementById('trans').hidden", timeout=60000); pg.wait_for_timeout(1500)
    print('base alone:', pg.evaluate("[document.getElementById('th-kind').textContent, document.getElementById('th-leave').textContent, document.getElementById('th-where').textContent]"))
    pg.screenshot(path=f'{out}/menu-2-base.png')
    pg.click('#th-leave'); pg.wait_for_timeout(600)
    if pg.evaluate("gc.state") != 'title':     # a base asks before it lets you go
        b = pg.query_selector('#modal:not([hidden]) .go') or pg.query_selector('#modal:not([hidden]) button'); b and b.click(); pg.wait_for_timeout(600)
    assert pg.evaluate("gc.state") == 'title', 'leaving a base played alone should come back to the main menu'
    print('base card:', pg.inner_text('#ms-base').replace('\n', ' | '), '| continue shown:', pg.is_visible('#b-base'))
    assert pg.is_visible('#b-base'), 'the base should be there to continue'
    # Orbital Commander: the same command, straight in
    pg.click('#b-orbit-new'); pg.wait_for_function("gc.state === 'orbit' && document.getElementById('trans').hidden", timeout=60000); pg.wait_for_timeout(1500)
    print('station alone:', pg.evaluate("[document.getElementById('th-kind').textContent, document.getElementById('th-leave').textContent]"))
    pg.screenshot(path=f'{out}/menu-3-orbit.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); pg.click('#m-title'); pg.wait_for_timeout(700)
    assert pg.evaluate("gc.state") == 'title'; print('station card:', pg.inner_text('#ms-orbit').replace('\n', ' | '))
    # continue the base: the same one comes back
    pg.click('#b-base'); pg.wait_for_function("gc.state === 'base' && document.getElementById('trans').hidden", timeout=60000); pg.wait_for_timeout(800)
    pg.click('#th-leave'); pg.wait_for_timeout(600)
    if pg.evaluate("gc.state") != 'title': b = pg.query_selector('#modal:not([hidden]) .go') or pg.query_selector('#modal:not([hidden]) button'); b and b.click(); pg.wait_for_timeout(600)
    # Orbital Fury mode: its own page, with the new look switched on, and the way back
    pg.click('#b-fury'); pg.wait_for_timeout(2500)
    f = [x for x in pg.frames if 'ground.html' in x.url][0]
    f.wait_for_function("window.__game && __game.state === 'title'", timeout=30000)
    print('fury:', f.evaluate("({ cls: document.documentElement.className, g3d: __game.cam.g3d, sight: __game.cam.sight, exit: !!document.getElementById('btn-gc-exit').offsetParent })"))
    assert f.evaluate("__game.cam.g3d === true"), 'Orbital Fury mode should have the 3D look on'
    pg.screenshot(path=f'{out}/menu-4-fury.png')
    f.click('#btn-gc-exit'); pg.wait_for_timeout(700); assert pg.evaluate("gc.state") == 'title' and not [x for x in pg.frames if 'ground.html' in x.url], 'the way back from Orbital Fury mode'
    # the saves list, and the hints switch
    pg.click('#b-saves'); pg.wait_for_timeout(300); print('saves:', [r.inner_text().replace('\n', ' · ') for r in pg.query_selector_all('.svrow')]); pg.screenshot(path=f'{out}/menu-5-saves.png')
    pg.click('#modal [data-x=close]'); pg.wait_for_timeout(200)
    pg.click('#b-settings'); pg.wait_for_timeout(200); a = pg.inner_text('#m-hints').split('\n')[0]; pg.click('#m-hints'); pg.wait_for_timeout(200); b = pg.inner_text('#m-hints').split('\n')[0]; print('hints:', a, '->', b); assert a != b
    pg.click('#m-hints'); pg.click('#m-back'); pg.wait_for_timeout(200)
    pg.screenshot(path=f'{out}/menu-6-saved.png')
    br.close()
print('\n'.join(errs) if errs else 'no page errors')
sys.exit(1 if errs else 0)
