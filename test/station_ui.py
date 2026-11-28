# (0.76) Orbital Commander's panels and cards, brought over from Super Orbital Simulator (js/modes/orbit-panels.js, orbit.js):
# COMMANDER (the accounts, the tax, a division's order), UPGRADES, COMMS, the readouts' tips, a part's card and fitting out
# its rooms, a person's card, the views, the keys, and Esc stepping back one thing at a time. Opens the station on its own.
#   python3 test/station_ui.py [shots-dir]       (a server on localhost:8080 serving the repo)
import sys
from playwright.sync_api import sync_playwright

ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
OUT = sys.argv[1] if len(sys.argv) > 1 else None
errs, fails = [], []
def check(ok, what):
    print(('ok   ' if ok else 'FAIL ') + what)
    if not ok: fails.append(what)

with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=__import__('os').environ.get('CHROME', '/usr/bin/google-chrome'), args=ARGS)
    pg = br.new_page(viewport={'width': 1600, 'height': 900}); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8080/'); pg.evaluate("localStorage.clear(); localStorage.setItem('ofgc.guide.orbit','1')"); pg.reload(); pg.wait_for_timeout(1500)
    pg.click('#t-tabs [data-tab=play]'); pg.wait_for_timeout(300); pg.click('#t-page .gcard[data-g=orbit]'); pg.wait_for_timeout(800)
    for sel in ['#f-go', '#modal [data-x=close]']:
        if pg.evaluate(f"!!document.querySelector('{sel}') && document.querySelector('{sel}').offsetParent !== null"): pg.click(sel); pg.wait_for_timeout(500)
    pg.wait_for_function("gc.state === 'orbit' && document.getElementById('trans').hidden", timeout=120000); pg.wait_for_timeout(2500)
    S = lambda js: pg.evaluate(f"(() => {{ const st = gc.mode.station; return {js}; }})()")
    vis = lambda sel: pg.evaluate(f"(() => {{ const e = document.querySelector('{sel}'); return !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none'; }})()")

    check(not S("/station station$/i.test(st.faction.station.replace(/ station$/i, ''))"), 'the station is not named "... Station Station"')
    check(vis('#op-dock'), 'the dock shows: COMMANDER, UPGRADES, COMMS')
    check(pg.evaluate("document.querySelectorAll('#op-list .cm').length") >= 1, 'the comms log has the Head Office\'s welcome')
    check('STATION OVERVIEW' in pg.evaluate("document.getElementById('th-sel').textContent"), 'with nothing chosen, the card is the station overview')
    check(pg.evaluate("[...document.querySelectorAll('#th-stats [data-act]')].length") >= 7, 'the readouts on the top bar can be opened')

    # COMMANDER: the accounts and the tax
    pg.keyboard.press('KeyO'); pg.wait_for_timeout(600)
    check(vis('#op-float') and vis('#op-lg'), 'O opens the Commander\'s channel on the accounts')
    check(pg.evaluate("document.querySelectorAll('#op-lg section').length") >= 6, 'the accounts have their sections')
    pg.evaluate("(() => { const i = document.getElementById('op-tax'); i.value = 20; i.dispatchEvent(new Event('input', { bubbles: true })); })()"); pg.wait_for_timeout(200)
    check(S('st.tax') == 20, 'the tax slider sets the tax')
    # a division and an order
    pg.click('#op [data-dv=supply]'); pg.wait_for_timeout(500)
    check(vis('#op-allot') and vis('#op-stores'), 'a division\'s page: its allotment and the stores')
    pg.click('#op [data-o=rations][data-v=double]'); pg.wait_for_timeout(200)
    check(S("st.div.supply.order.rations") == 'double', 'an order given there is given to the station')
    pg.evaluate("(() => { const i = document.getElementById('op-allot'); i.value = 14; i.dispatchEvent(new Event('input', { bubbles: true })); })()"); pg.wait_for_timeout(200)
    check(S('st.div.supply.allot') == 14, 'the allotment slider sets the allotment')
    if OUT: pg.screenshot(path=f'{OUT}/station-cmdr.png')
    pg.keyboard.press('KeyU'); pg.wait_for_timeout(500)
    check(pg.evaluate("document.querySelectorAll('#op .tier').length") >= 3, 'U opens the upgrade path, every tier')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    check(not vis('#op-float') and pg.evaluate("gc.state") == 'orbit', 'Esc closes the panel, not the game')

    # a readout: hover tip, click for the accounts at its section
    b = pg.evaluate("(() => { const r = document.querySelector('#th-stats [data-act=acc-power]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()")
    pg.mouse.move(b[0], b[1]); pg.wait_for_timeout(400)
    check(vis('#op-tip') and 'POWER' in pg.evaluate("document.getElementById('op-tip').textContent"), 'hovering POWER says where it comes from')
    pg.mouse.click(b[0], b[1]); pg.wait_for_timeout(500)
    check(vis('#op-float') and vis('#lg-power'), 'clicking it opens the accounts at power')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)

    # COMMS: shut and open
    pg.keyboard.press('KeyC'); pg.wait_for_timeout(200); check(not vis('#op-comms'), 'C shuts the comms'); pg.keyboard.press('KeyC'); pg.wait_for_timeout(200); check(vis('#op-comms'), 'C opens them again')

    # a part's card, fitting out its rooms
    pg.mouse.move(10, 400); pg.mouse.click(800, 450); pg.wait_for_timeout(500)
    card = pg.evaluate("document.getElementById('th-sel').textContent")
    check('STATION COMMAND' in card and 'STATUS' in card and 'FIT OUT ROOMS' in card, 'clicking Station Command opens its card: status, power, rooms')
    pg.keyboard.press('KeyI'); pg.wait_for_timeout(600)
    check('FITTING OUT' in pg.evaluate("document.getElementById('th-sel').textContent") and pg.evaluate("document.querySelectorAll('#th-bar [data-or]').length") > 5, 'I fits out its rooms: the rooms in the tool bar')
    cr0, rooms0 = S('st.credits'), S('[...st.parts.values()].find(p => p.type === "command").rooms.slice()')
    target = pg.evaluate("(() => { const p = [...gc.mode.station.parts.values()].find(p => p.type === 'command'); const R = ['mess', 'hydro', 'quarters', 'cargostore', 'workshop'].find(r => !p.rooms.includes(r) && gc.mode.station.roomOpen(r)); return R; })()")
    pg.click(f'#th-bar [data-or={target}]'); pg.wait_for_timeout(200); pg.click('#th-sel [data-os="0"]'); pg.wait_for_timeout(400)
    rooms1 = S('[...st.parts.values()].find(p => p.type === "command").rooms.slice()')
    check(rooms1[0] == target and S('st.credits') < cr0, f'picking a {target} and room 1 fits it, and it is paid for')
    if OUT: pg.screenshot(path=f'{OUT}/station-rooms.png')
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    check('FITTING OUT' not in pg.evaluate("document.getElementById('th-sel').textContent"), 'Esc, Esc: the room put down, then fitting out done')

    # a person's card
    pg.evaluate("(() => { const a = gc.mode.station.agents[0]; document.dispatchEvent(new CustomEvent('noop')); window.__a = a.id; })()")
    pid = pg.evaluate("window.__a")
    xy = pg.evaluate("(() => { const st = gc.mode.station, v = gc.mode.view, a = st.agents.find(x => x.id === window.__a); v.setOpen(true); const s = v.agentScreen(a, performance.now() / 1000); return s ? [s.x, s.y] : null; })()")
    if xy:
        pg.wait_for_timeout(300); xy = pg.evaluate("(() => { const st = gc.mode.station, v = gc.mode.view, a = st.agents.find(x => x.id === window.__a); const s = v.agentScreen(a, performance.now() / 1000); return s ? [s.x, s.y] : null; })()")
        pg.mouse.click(xy[0], xy[1] + 4); pg.wait_for_timeout(500)
        t = pg.evaluate("document.getElementById('th-sel').textContent")
        check('DOING' in t and 'FOLLOW' in t, 'clicking a person opens their card: what they are doing, FOLLOW')
    else: check(False, 'a person could be found on screen')

    # the views
    pg.click('#th-tabs [data-ov=view]'); pg.wait_for_timeout(300); check(vis('#op-views'), 'VIEW opens the views')
    pg.click('#op-views [data-vw=blueprint]'); pg.wait_for_timeout(300); check('BLUEPRINT' in pg.evaluate("document.querySelector('#th-tabs [data-ov=view]').textContent"), 'BLUEPRINT is the view now')
    pg.keyboard.press('KeyV'); pg.wait_for_timeout(300); check('LIFE SIGNS' in pg.evaluate("document.querySelector('#th-tabs [data-ov=view]').textContent"), 'V steps on to LIFE SIGNS')
    pg.keyboard.press('KeyG'); pg.wait_for_timeout(200); check(pg.evaluate("gc.mode.view.cutaway") is True, 'G cuts the station open')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)

    # keys: a part by number, Tab to the next group, speed
    pg.keyboard.press('Digit1'); pg.wait_for_timeout(300); check('BUILD ·' in pg.evaluate("document.getElementById('th-sel').textContent"), '1 takes the first part of the group in hand')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.keyboard.press('Tab'); pg.wait_for_timeout(200); check(pg.evaluate("document.querySelector('#th-tabs .on').dataset.og") != 'structure', 'Tab opens the next group')
    pg.keyboard.press('BracketRight'); pg.keyboard.press('BracketRight'); pg.wait_for_timeout(200); check(pg.evaluate("gc.frame ? gc.frame.speed : +document.getElementById('th-speed').textContent.replace('×', '')") in (4, 4.0), '] ] goes to 4×')
    pg.keyboard.press('BracketLeft'); pg.keyboard.press('BracketLeft'); pg.keyboard.press('BracketLeft'); pg.wait_for_timeout(200); check(pg.evaluate("document.getElementById('th-speed').textContent") == '½×', '[ [ [ goes down to half speed')

    # leaving: nothing of the station's is left on another game's screen
    pg.click('#th-leave'); pg.wait_for_timeout(1500)
    check(not vis('#op'), 'leaving the station takes its panels with it')
    if OUT: pg.screenshot(path=f'{OUT}/station-left.png')
    print('page errors:', errs[:3] if errs else 'none')
    sys.exit(1 if fails or errs else 0)
