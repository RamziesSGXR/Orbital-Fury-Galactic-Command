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
    title = lambda: pg.wait_for_function("gc.state === 'title'", timeout=20000)
    tab = lambda t: (pg.click(f'#t-tabs [data-tab={t}]'), pg.wait_for_timeout(250))
    def leave():     # out of a post by its pause menu
        pg.keyboard.press('Escape')
        try: pg.wait_for_selector('#m-title', timeout=20000)
        except Exception:
            print('  no menu after Escape:', pg.evaluate("[gc.state, document.getElementById('menu').hidden, document.getElementById('modal').hidden, document.activeElement.tagName + '#' + document.activeElement.id, document.getElementById('menu').innerHTML.slice(0, 1400), document.getElementById('menu').innerHTML.length]")); pg.screenshot(path=f'{out}/menu-fail.png'); raise
        pg.click('#m-title'); title(); pg.wait_for_timeout(400)
    slot = lambda g, n: pg.inner_text(f'#t-page .slot:has([data-g={g}][data-n="{n}"]) div')
    # (0.60) one menu: six tabs, HOME first, the game's icon in the bar and in the browser tab
    assert [b.get_attribute('data-tab') for b in pg.query_selector_all('#t-tabs [data-tab]')] == ['home', 'play', 'collection', 'career', 'store', 'options'], 'the six tabs'
    assert pg.evaluate("document.querySelector('.tlogo').naturalWidth > 0 && document.querySelector('link[rel=icon]').href.endsWith('assets/icon.svg')"), "the game's icon is not shown"
    assert pg.is_visible('#b-new') and not pg.is_visible('#b-continue'), 'HOME offers a new campaign when there is none'
    assert pg.evaluate("(() => { const v = document.getElementById('tbg'); return v.tagName === 'VIDEO' && v.getBoundingClientRect().width >= innerWidth - 1; })()"), 'the war room film is not behind the menu'
    pg.screenshot(path=f'{out}/menu-1-home.png')
    # (0.62) COLLECTION: five kinds, nothing met on a new browser; a ground enemy met opens with its model drawn
    tab('collection'); assert pg.evaluate("[document.querySelectorAll('#t-page .ckinds button').length, document.querySelectorAll('#t-page .chip.lock').length]") == [5, 18], 'the collection: five kinds, all eighteen enemies not yet met'
    pg.evaluate("localStorage.setItem('ofgc.career', JSON.stringify({ v: 1, n: { missions: 2, won: 1 }, met: { foe: { 'bots.H': { at: Date.now(), n: 3 } } } }))")
    tab('home'); tab('collection'); pg.wait_for_function("document.querySelector('#c-art canvas') || document.querySelector('#c-art.empty')", timeout=20000)
    assert pg.evaluate("[document.querySelector('#t-page .chip.on b').textContent, !!document.querySelector('#c-art canvas')]") == ['Crusher', True], 'an enemy met opens with its model'
    pg.screenshot(path=f'{out}/menu-1b-collection.png')
    tab('career'); assert pg.evaluate("document.querySelector('#t-page .cstat b').textContent") == '2', 'the career counts the fights'
    pg.evaluate("localStorage.removeItem('ofgc.career')"); tab('home')
    pg.keyboard.press('e'); pg.wait_for_timeout(200); assert pg.evaluate("document.querySelector('#t-tabs .on').dataset.tab") == 'play', 'E steps to the next tab'
    pg.keyboard.press('q'); pg.keyboard.press('q'); pg.wait_for_timeout(200); assert pg.evaluate("document.querySelector('#t-tabs .on').dataset.tab") == 'options', 'Q steps back, and round'
    tab('play'); assert pg.evaluate("[document.querySelectorAll('#t-page .gcard[data-act=game]').length, document.querySelectorAll('#t-page .gcard .gart img').length, document.querySelectorAll('#t-page .slot').length]") == [4, 4, 0], 'PLAY: four picture cards, and no saves to choose while there are none'
    game = lambda g: (tab('play'), pg.click(f'#t-page .gcard[data-g={g}]'), pg.wait_for_timeout(300))
    pg.screenshot(path=f'{out}/menu-2-play.png')
    # FOB Commander with nothing saved: its card starts a game straight away (found a command, build), and it is in save 1
    game('base')
    assert pg.evaluate("gc.state") == 'found' and not pg.is_visible('#f-open'), 'a single post asks for a command but not for a war opening'
    pg.fill('#f-name', 'Kestrel Group'); pg.click('#f-go')
    pg.wait_for_function("gc.state === 'base' && document.getElementById('trans').hidden", timeout=60000); pg.wait_for_timeout(1500)
    leave(); game('base'); assert pg.evaluate("gc.state") == 'title' and pg.evaluate("document.querySelectorAll('#t-page .slot').length") == 3, 'a game with a save asks which save'
    print('base save 1:', slot('base', 0)); assert 'Empty' not in slot('base', 0) and 'Empty' in slot('base', 1)
    pg.screenshot(path=f'{out}/menu-2b-saves.png')
    # save 2 is a second base of its own; save 1 is set aside whole and comes back when it is loaded
    one = pg.evaluate("localStorage.getItem('ofgc.solo.base')")
    pg.click('[data-act=slot][data-g=base][data-n="1"]'); pg.wait_for_function("gc.state === 'base' && document.getElementById('trans').hidden", timeout=60000); pg.wait_for_timeout(1500)
    assert pg.evaluate("JSON.parse(localStorage.getItem('ofgc.slot.base.0'))['ofgc.solo.base']") == one, 'save 1 was not set aside whole'
    leave(); game('base'); print('base saves:', slot('base', 0), '|', slot('base', 1)); assert 'Empty' not in slot('base', 0) and 'Empty' not in slot('base', 1)
    pg.click('[data-act=slot][data-g=base][data-n="0"]'); pg.wait_for_function("gc.state === 'base' && document.getElementById('trans').hidden", timeout=60000); pg.wait_for_timeout(800)
    assert pg.evaluate("localStorage.getItem('ofgc.solo.base')") == one or pg.evaluate("JSON.parse(localStorage.getItem('ofgc.slots')).cur.base") == 0, 'loading save 1 did not bring it back'
    leave(); game('base')
    pg.click('[data-act=del][data-g=base][data-n="1"]'); pg.click('#modal [data-x=yes]'); pg.wait_for_timeout(300); assert 'Empty' in slot('base', 1) and 'Empty' not in slot('base', 0), 'deleting save 2 should leave save 1'
    # the station: nothing saved, so its card starts it. Its menu inside the game is the main menu's style, with tabs
    game('orbit'); pg.wait_for_function("gc.state === 'orbit' && document.getElementById('trans').hidden", timeout=60000); pg.wait_for_timeout(1500)
    pg.keyboard.press('Escape'); pg.wait_for_selector('#m-tabs'); assert [b.inner_text() for b in pg.query_selector_all('#m-tabs button')] == ['GAME', 'OPTIONS', 'CONTROLS'], 'the menu inside a game has the same tabs'
    pg.click('#m-tabs [data-mtab=controls]'); assert 'green ring' in pg.inner_text('#menu'), "the station's controls are not on its menu"
    pg.click('#m-tabs [data-mtab=options]'); pg.click('#menu [data-act=o-hints]'); pg.click('#menu [data-act=o-hints]'); pg.screenshot(path=f'{out}/menu-3-ingame.png')
    pg.click('#m-tabs [data-mtab=game]'); pg.click('#m-resume'); pg.wait_for_timeout(200); assert pg.evaluate("document.getElementById('menu').hidden"), 'RESUME closes the menu'
    leave()
    # HOME: JUMP IN goes back to the last game played; NEWS and LEARN MORE open
    tab('home'); assert 'ORBITAL COMMANDER' in pg.inner_text('[data-act=jump]'), 'JUMP IN should name the last game played'
    pg.click('[data-act=news]'); assert 'update' in pg.inner_text('#modal').lower(); pg.click('#modal [data-x=close]')
    pg.click('[data-act=credits]'); assert 'credits' in pg.inner_text('#modal').lower(); pg.click('#modal [data-x=close]')
    pg.click('[data-act=jump]'); pg.wait_for_function("gc.state === 'orbit' && document.getElementById('trans').hidden", timeout=60000); pg.wait_for_timeout(600); leave()
    # Orbital Fury has no menu of its own: PLAY opens its operation's setup, and leaving that comes back here
    game('fury'); pg.wait_for_timeout(3000)
    f = pg.frame_locator('#g-frame'); fr = next(x for x in pg.frames if 'ground.html' in x.url)
    print('fury:', fr.evaluate("({ title: getComputedStyle(document.getElementById('s-title')).visibility, lock: !document.getElementById('s-lock').classList.contains('hidden') || !document.getElementById('s-notice').classList.contains('hidden') })"))
    assert fr.evaluate("getComputedStyle(document.getElementById('s-title')).visibility") == 'hidden', "the ground game's own title is showing"
    pg.screenshot(path=f'{out}/menu-4-fury.png')
    fr.evaluate("(() => { const n = document.getElementById('btn-notice'); if (n && n.offsetParent) n.click(); })()"); pg.wait_for_timeout(400)
    fr.evaluate("closeLock()") if fr.evaluate("typeof closeLock === 'function'") else fr.evaluate("window.parent.gcFury.onExit()")
    title(); assert not [x for x in pg.frames if 'ground.html' in x.url], 'leaving the ground game should come back to the main menu'
    # OPTIONS: the common settings, and each game's controls
    tab('options'); a = pg.inner_text('#o-hints'); pg.click('#o-hints'); pg.wait_for_timeout(200); b = pg.inner_text('#o-hints'); assert a != b, 'the hints switch did not change'; pg.click('#o-hints')
    pg.click('[data-act=o-tab][data-k=fury]'); assert 'Drop Infantry' in pg.inner_text('#t-page'), "the ground game's controls are not listed"
    pg.screenshot(path=f'{out}/menu-5-options.png')
    # the tutorials: a practice post with no story, not saved, and back to the menu
    tab('play'); pg.click('[data-act=tut][data-g=fury]'); f = pg.frame_locator('#g-frame'); f.locator('#tut:not(.hidden)').wait_for(timeout=90000); pg.wait_for_timeout(1500)
    card = f.locator('#tut').inner_text(); print('ground tutorial:', card.replace('\n', ' | ')[:120])
    assert 'TUTORIAL · 1 OF' in card and 'YOU ARE THE SHIP' in card and 'trn.' not in card, 'the ground tutorial did not open on its first card, in words'
    seen = set()
    for _ in range(60):
        if pg.evaluate("gc.state") == 'title': break
        fr = next((x for x in pg.frames if 'ground.html' in x.url), None)
        if not fr: break
        try:
            seen.add(fr.evaluate("document.getElementById('tut-h').textContent"))
            fr.evaluate("(() => { const c = document.getElementById('tut'); if (c.classList.contains('fold')) document.getElementById('tut-x').click(); for (const id of ['tut-next', 'tut-skip', 'tut-ok']) { const b = document.getElementById(id); if (b && !b.classList.contains('hidden') && b.offsetParent) { b.click(); return id; } } })()")
        except Exception: pass
        pg.wait_for_timeout(450)
    print('ground lessons:', len(seen)); assert len(seen) >= 12 and 'TUTORIAL COMPLETE' in seen, f'the ground tutorial did not run to its end: {sorted(seen)}'
    title(); pg.wait_for_timeout(400)
    for kind in ['base', 'orbit']:
        tab('play'); before = pg.evaluate(f"localStorage.getItem('ofgc.solo.{kind}')")
        pg.click(f'[data-act=tut][data-g={kind}]'); pg.wait_for_function(f"gc.state === '{kind}' && document.getElementById('trans').hidden", timeout=60000); pg.wait_for_timeout(2500)
        card = pg.inner_text('#th-coach'); assert 'TUTORIAL · 1 OF' in card, f'the {kind} tutorial did not open on its first card'
        pg.click('#th-coach [data-gc=next]'); pg.wait_for_timeout(300); pg.click('#th-coach [data-gc=skip]'); title(); pg.wait_for_timeout(500)
        assert pg.evaluate(f"localStorage.getItem('ofgc.solo.{kind}')") == before, f'the {kind} tutorial wrote over the saved {kind}'
    # every tab fits a desktop screen with nothing to scroll to
    for name, vw, vh in [('laptop', 1280, 720), ('small', 1366, 650), ('hd', 1920, 1080)]:
        pg.set_viewport_size({'width': vw, 'height': vh})
        for t in ['home', 'play', 'collection', 'career', 'store', 'options']:
            tab(t); sh, bottom, right = pg.evaluate("[document.getElementById('s-title').scrollHeight, Math.max(...[...document.querySelectorAll('#t-page .tpan, #t-page .btn, #t-ver')].map(e => e.getBoundingClientRect().bottom)), Math.max(...[...document.querySelectorAll('#t-bar > *, #t-page .tpan')].map(e => e.getBoundingClientRect().right))]")
            assert sh <= vh + 1 and bottom <= vh and right <= vw, f'the {t} tab does not fit a {vw}x{vh} screen (bottom {bottom}, right {right})'
            if name == 'laptop': pg.screenshot(path=f'{out}/menu-8-{t}.png')
    br.close()
print('ERRORS:' if errs else 'no page errors'); [print(' ', e[:300]) for e in errs[:20]]
sys.exit(1 if errs else 0)
