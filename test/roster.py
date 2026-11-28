# (GC 0.69) Browser check of the STORE and the Vanguard roster: credits from the career, buying a role and a personality, giving
# them to a Vanguard, a name; then a campaign fight on the ground, where the Vanguards carry what they were given.
# python3 test/roster.py [out]  (needs the server on 8080)
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=__import__('os').environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    pg = br.new_page(viewport={'width': 1440, 'height': 900})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(500); pg.evaluate('localStorage.clear()')
    # 12 fights won of 15, 30 objectives, 2400 kills, 20 base days: 500 + 1200 + 90 + 450 + 120 + 300 = 2660 credits
    pg.evaluate("localStorage.setItem('ofgc.career', JSON.stringify({ v: 1, n: { missions: 15, won: 12, objectives: 30, kills: 2400, baseDays: 20 }, met: {} }))")
    pg.reload(); pg.wait_for_function("gc.state === 'title'", timeout=20000); pg.wait_for_timeout(400)
    bal = lambda: int(pg.inner_text('#st-bal').replace(',', ''))
    st = lambda k: (pg.click(f'[data-st=sub][data-k={k}]'), pg.wait_for_timeout(200))
    fits = lambda: pg.evaluate("(() => { const p = document.getElementById('t-page'); return p.scrollHeight <= p.clientHeight + 1 && document.documentElement.scrollHeight <= innerHeight; })()")
    pg.click('#t-tabs [data-tab=store]'); pg.wait_for_timeout(300)
    assert bal() == 2660, f'the credits come from the career: {bal()}'
    assert pg.evaluate("document.querySelectorAll('.vcard').length") == 4 and fits(), 'four Vanguards, and the roster fits without scrolling'
    assert pg.evaluate("[...document.querySelectorAll('.vpick .chip:not(.lock)')].map((b) => b.dataset.id).join()") == 'rifle,none', 'only the Rifleman and no act to begin with'
    # a locked role on the roster leads to its shelf
    pg.click('.vpick .chip.lock[data-id=marksman]'); pg.wait_for_timeout(200)
    assert pg.evaluate("document.querySelector('.stp').classList.contains('st-role')") and fits(), 'a locked role opens ROLES'
    pg.click('[data-st=buy][data-kind=role][data-id=marksman]'); pg.wait_for_timeout(200)
    pg.click('[data-st=buy][data-kind=role][data-id=medic]'); pg.wait_for_timeout(200)
    assert bal() == 2660 - 500 - 700, f'two roles bought: {bal()}'
    st('persona'); assert fits(), 'PERSONALITIES fits'
    pg.click('[data-st=buy][data-kind=persona][data-id=heartthrob]'); pg.wait_for_timeout(200)
    pg.click('[data-st=buy][data-kind=persona][data-id=prepper]'); pg.wait_for_timeout(200)
    left = bal(); assert left == 2660 - 500 - 700 - 600 - 350, f'two acts bought: {left}'
    pg.screenshot(path=f'{out}/roster-1-shelf.png')
    # an upgrade, a level at a time: Reserve contracts, one more Vanguard life in every fight
    st('upgrades'); assert fits(), 'UPGRADES fits'
    pg.click('[data-st=up][data-id=reserve]'); pg.wait_for_timeout(200)
    left = bal(); assert left == 110 and pg.evaluate("JSON.parse(localStorage.getItem('ofgc.roster')).up.reserve") == 1, f'a level of Reserve contracts: {left}'
    assert pg.evaluate("document.querySelector('[data-st=up][data-id=reserve]').disabled") and pg.evaluate("JSON.parse(localStorage.getItem('ofgc.roster')).spent") == 2550, 'the next level costs more; what was spent is kept'
    st('persona'); assert pg.evaluate("document.querySelector('[data-st=buy][data-id=showboat]').disabled"), f'what cannot be paid for cannot be bought ({left} left)'
    # give them out: A a Marksman and a Heartthrob called HAWK, B a Medic and a Prepper
    st('roster')
    pg.fill('input.vname[data-i="0"]', 'hawk'); pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.click('.vcard[data-i="0"]'); pg.wait_for_timeout(150)
    pg.click('[data-st=give][data-kind=role][data-id=marksman]'); pg.wait_for_timeout(150)
    pg.click('[data-st=give][data-kind=persona][data-id=heartthrob]'); pg.wait_for_timeout(150)
    pg.click('.vcard[data-i="1"]'); pg.wait_for_timeout(150)
    pg.click('[data-st=give][data-kind=role][data-id=medic]'); pg.wait_for_timeout(150)
    pg.click('[data-st=give][data-kind=persona][data-id=prepper]'); pg.wait_for_timeout(150)
    r = pg.evaluate("JSON.parse(localStorage.getItem('ofgc.roster'))")
    assert [s['role'] for s in r['slots']] == ['marksman', 'medic', 'rifle', 'rifle'] and [s['persona'] for s in r['slots']] == ['heartthrob', 'prepper', 'none', 'none'], r
    assert pg.evaluate("JSON.parse(localStorage.getItem('ofs.names')).vg[0]") == 'HAWK', 'the name is the ground fight\'s own'
    assert pg.inner_text('.vcard[data-i="1"] em') == 'Combat medic' and pg.is_visible('.stdet .sfx li') and fits(), 'the card and the details show it'
    pg.wait_for_timeout(800); pg.screenshot(path=f'{out}/roster-2-roster.png')
    # the fight: a new campaign, the first battle taken to the ground
    pg.evaluate("(() => { let v = null; Object.defineProperty(window, 'gcGround', { configurable: true, get: () => v, set: (x) => { if (x) { x.biome = 'grass'; x.faction = 'bugs'; x.sight = 'day'; x.orbit = 0; } v = x; } }); })()")
    pg.click('#t-tabs [data-tab=home]'); pg.wait_for_timeout(200)
    pg.click('#b-new'); pg.wait_for_timeout(200); pg.click('#f-go'); pg.wait_for_timeout(200); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(900)
    for i in range(90):
        if pg.evaluate('!!sgs.g.battle'): break
        pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000)
        if pg.is_visible('#commit'): pg.click('#commit')
        pg.wait_for_timeout(250)
    pg.wait_for_function('!sgs.ui.show && !sgs.ui.anims.length', timeout=30000); pg.wait_for_timeout(300)
    pg.click('[data-a=ground]'); pg.wait_for_function("gc.state === 'ground' && document.getElementById('trans').hidden", timeout=60000)
    f = [x for x in pg.frames if 'ground.html' in x.url][0]
    f.wait_for_function("window.__game && __game.state === 'shop'", timeout=30000); pg.wait_for_timeout(500)
    f.click('#shop-go'); f.wait_for_function("__game.state === 'brief'", timeout=20000); pg.wait_for_timeout(1200)
    go = "(() => { const b = [...document.querySelectorAll('#s-brief button')].find(x => /DEPLOY|DROP|CONTINUE|LAUNCH/i.test(x.textContent) && !x.disabled && x.offsetParent); if (b) b.click(); })()"
    f.evaluate(go)
    for i in range(40):
        if f.evaluate("__game.state") == 'play': break
        pg.wait_for_timeout(500); f.evaluate(go)
    assert f.evaluate("__game.state") == 'play', 'the mission did not start'
    pg.keyboard.press('Enter'); pg.wait_for_timeout(4000)
    f.wait_for_function("__game.mission.vgAlive.length >= 2", timeout=60000); pg.wait_for_timeout(800)
    v = f.evaluate("""(() => { const m = __game.mission, by = (i) => m.vgAlive.find((a) => a.team === i);
      const o = (a) => a && ({ name: a.name, vr: a.vr, vp: a.vp, tag: a.vtag, max: a.maxHp, stims: a.stims, stimMax: a.stimMax, gren: a.gren, gun: a.gun, aud: a.aud, pay: a.payMul, medic: a.medic, sight: a.sight0 });
      return { a: o(by(0)), b: o(by(1)), c: o(by(2)), roster: m.roster && m.roster.map((s) => s.role + '/' + s.persona) }; })()""")
    print(v)
    a, b, c = v['a'], v['b'], v['c']
    assert v['roster'] == ['marksman/heartthrob', 'medic/prepper', 'rifle/none', 'rifle/none'], v['roster']
    assert f.evaluate("[__game.mission.ups.lives, __game.mission.vg.max >= 2]") == [1, True], 'Reserve contracts: a life more'
    assert a['name'] == 'HAWK' and a['vr'] == 'marksman' and a['tag'] == 'MRK' and a['gun']['range'] == 1.4 and abs(a['aud'] - 0.1) < 1e-9 and a['pay'] == 1.6, a
    assert b['vr'] == 'medic' and b['stimMax'] == 7 and b['stims'] == 7 and b['gren'] == 7 and b['medic'] > 0, b
    assert c is None or (c['vr'] == 'rifle' and c['stimMax'] == 4 and not c['gun'] and c['sight'] < a['sight']), c
    # the HUD names the role; a medic heals; a Heartthrob who falls is a dearer claim
    f.wait_for_function("/MRK · /.test(document.getElementById('hdrows').textContent) && /MED · /.test(document.getElementById('hdrows').textContent)", timeout=10000)
    healed = f.evaluate("""(() => { const m = __game.mission, med = m.vgAlive.find((a) => a.vr === 'medic'), o = m.vgAlive.find((a) => a !== med);
      o.x = med.x + 4; o.y = med.y; o.hp = o.maxHp * 0.5; return o.id; })()""")
    pg.wait_for_timeout(2500)
    assert f.evaluate(f"(() => {{ const o = __game.mission.allies.find((a) => a.id === {healed}); return o.dead || o.hp > o.maxHp * 0.5; }})()"), 'the medic heals'
    ins = f.evaluate("(() => { const m = __game.mission, a = m.vgAlive.find((x) => x.vr === 'marksman'); m.killAlly(a, 'enemy', 'L'); return m.ins; })()")
    assert abs(ins['pay'] - 120 * 1.6) < 1e-6 and abs(ins['sign'] - 180 * 1.35) < 1e-6, ins
    pg.screenshot(path=f'{out}/roster-3-ground.png')
    # the upgrades that carry into the other games: the war chest (a new campaign), seed money (a new base), a docking grant (a new station)
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear()')
    pg.evaluate("localStorage.setItem('ofgc.roster', JSON.stringify({ v: 1, up: { chest: 2, seed: 1, grant: 2 }, spent: 0 }))")
    pg.reload(); pg.wait_for_function("gc.state === 'title'", timeout=20000); pg.wait_for_timeout(300)
    pg.click('#b-new'); pg.click('#f-go'); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(700)
    assert pg.evaluate('gc.app.camp.wallet.bal') == 1200 + 300, f"the war chest: {pg.evaluate('gc.app.camp.wallet.bal')}"
    pid = pg.evaluate('sgs.g.P.find(p => p.owner === "fed" && p.ring === 1).id')
    # (a new base has spent some of its supplies on the ground it stands on: 4800 of 5100, where it would have 4200 of 4500)
    for which, checks in [('base', [('gc.mode.sim.credits', 600 + 200), ('gc.mode.sim.supplies', 4800)]), ('orbit', [('gc.mode.station.credits', 2500 + 1200)])]:
        pg.evaluate(f'gc.app.theatre("{which}", {{ system: sgs.g.P[{pid}] }})')
        pg.wait_for_function(f"gc.state === '{which}' && document.getElementById('trans').hidden", timeout=120000)
        for got, want in checks:
            v = pg.evaluate(got); print(which, got, v); assert abs(v - want) < 100, f'{got}: {v}, not about {want}'     # (a moment of the post has run)
        pg.click('#th-leave'); pg.wait_for_timeout(700); pg.wait_for_function("gc.state === 'war'", timeout=20000)
    br.close()
assert not errs, errs
print('no page errors · roster ok')
