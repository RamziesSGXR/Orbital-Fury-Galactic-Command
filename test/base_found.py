# (GC 0.87) Browser check of FOB Commander's foundations (js/base/slabs.js): python3 test/base_found.py [out]   (needs the server on 8080)
#   - FOUNDATIONS on the build bar: a card for each of the seven kinds and the three heights, fitting without a scroll
#   - dragging on the ground shows the blueprint with its sizes along its edges and a label (kind, size, cost, CAN LAY
#     HERE); letting go lays it; the engineers build it, and nothing goes up on it until it is down
#   - a building of the wrong kind is refused, with the reason; the right kind goes on; a foundation with no road to it
#     takes nothing that needs a door
#   - a raised foundation lifts what stands on it to its top, a road meeting its edge gets a ramp, and nobody walks off
#     its edge anywhere else
#   - a foundation's card (kind, size, height, what is on it) and no taking it up while something stands on it
#   - saved and loaded; a save from before foundations gets one under each building that needs one
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'; errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
    pg.click('#b-new'); pg.click('#f-go'); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(700)
    pid = pg.evaluate('sgs.g.P.find(p => p.owner === "fed" && p.ring === 1).id')
    pg.evaluate(f'gc.app.theatre("base", {{ system: sgs.g.P[{pid}] }})')
    pg.wait_for_function("gc.state === 'base' && document.getElementById('trans').hidden", timeout=120000)
    pg.wait_for_timeout(1000)
    S = lambda js: pg.evaluate('(() => { const s = gc.mode.sim, v = gc.mode.view; ' + js + ' })()')
    print(pg.evaluate('JSON.stringify(gc.mode.fast())'))
    info = S("""v.setQuality('low'); s.foundedF = true; s.supplies += 6000;
      const hq = s.b.find(b => b.type === 'hq'), [dx, dz] = s.door(hq);
      const a = s.snapLine({ x: dx + 0.5, z: dz + 0.5 }, 'free', 'dirt'), b = s.snapLine({ x: dx + 0.5, z: dz + 14.5 }, 'free', 'dirt', a); const ok = s.checkLine(a, b, 'dirt').ok && !!s.drawLine(a, b, 'dirt');
      v.target.set(v.wx(dx), 0, v.wx(dz + 7)); v.zoomT = 7; return { dx, dz, road: ok };""")
    print('road', info); assert info['road'], 'no road down from the command post'
    dx, dz = info['dx'], info['dz']
    pg.wait_for_timeout(1500)

    # --- the bar
    pg.evaluate("document.querySelector('#fb-groups [data-g=found]').click()"); pg.wait_for_timeout(400)
    bar = pg.evaluate("""(() => { const it = document.getElementById('fb-items'); return { kinds: it.querySelectorAll('[data-b^="slab:"]').length, heights: it.querySelectorAll('[data-slv]').length, sh: it.scrollHeight, ch: it.clientHeight, sw: it.scrollWidth, cw: it.clientWidth }; })()""")
    print('bar', bar)
    assert bar['kinds'] == 7 and bar['heights'] == 3, 'FOUNDATIONS does not have its seven kinds and three heights'
    assert bar['sh'] <= bar['ch'] + 1, 'the FOUNDATIONS bar scrolls'
    pg.screenshot(path=f'{out}/found-bar.png')

    # --- drag a raised Utilities foundation beside the road
    pg.evaluate("document.querySelector('#fb-items [data-slv=\"1\"]').click()"); pg.wait_for_timeout(200)
    pg.evaluate("document.querySelector('#fb-items [data-b=\"slab:util\"]').click()"); pg.wait_for_timeout(300)
    p0 = S(f"return v.toScreen({dx} - 6.5, {dz} + 4.5)"); p1 = S(f"return v.toScreen({dx} - 0.5, {dz} + 9.5)")
    pg.mouse.move(p0[0], p0[1]); pg.mouse.down(); pg.mouse.move((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2); pg.mouse.move(p1[0], p1[1]); pg.wait_for_timeout(500)
    lab = pg.evaluate("(() => { const t = document.getElementById('fb-tip'), d = document.getElementById('fb-dims'); return { tip: t.hidden ? '' : t.textContent, dims: d && !d.hidden ? [...d.children].filter(e => !e.hidden).map(e => e.textContent) : [] }; })()")
    gh = S("return { vis: !!v.slabG && v.slabG.visible, key: v.slabG && v.slabG.userData.key }")
    print('dragging', lab, gh)
    assert gh['vis'] and gh['key'] == '7x6x1', 'no blueprint of the foundation while dragging'
    assert 'UTILITIES FOUNDATION' in lab['tip'] and '7 × 6' in lab['tip'] and 'CAN LAY HERE' in lab['tip'], 'the label does not say what, how big and whether it can go'
    assert '56 m' in lab['dims'] and '48 m' in lab['dims'] and any('3.2 m' in t for t in lab['dims']), 'the sizes are not along the blueprint'
    pg.screenshot(path=f'{out}/found-drag.png')
    pg.mouse.up(); pg.wait_for_timeout(300)
    sl = S("const u = s.slabs().find(x => x.k === 'util'); return u && { id: u.id, x: u.x, z: u.z, w: u.w, d: u.d, lv: u.lv, done: u.done }")
    print('laid', sl); assert sl and sl['lv'] == 1 and not sl['done'], 'letting go did not lay the foundation'
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)

    # --- nothing goes up on it until it is down; the wrong kind is refused; the right kind goes on
    q = S(f"""const g = s.place('gen', {sl['x']} + 2, {sl['z']} + 2, 0, false); return {{ wait: !s.jobQueue().includes(g.id), id: g.id, bad: s.canPlace('barracks', {sl['x']} + 4, {sl['z']} + 2, 0, {{ std: 0 }}).why }}""")
    print('queued', q)
    assert q['wait'], "a building went into the engineers' queue before its foundation was down"
    assert 'Utilities foundation' in q['bad'], 'a barracks was allowed on a Utilities foundation'
    S("for (let i = 0; i < 4000 && !s.slabs().find(x => x.k === 'util').done; i++) s.step(0.1)")
    lift = S(f"""const u = s.byId({sl['id']}), g = s.b.find(b => b.id === {q['id']}); for (let i = 0; i < 3000 && !g.done; i++) s.step(0.1);
      const N = s.N, w = s.walkGrid(); let rimWalk = 0, rimRoad = 0;
      for (let j = -1; j <= u.d; j++) for (let i = -1; i <= u.w; i++) {{ const x = u.x + i, z = u.z + j; if (s.slabMap[z * N + x]) continue; if (s.roads[z * N + x]) rimRoad++; else if (w[z * N + x]) rimWalk++; }}
      return {{ done: u.done, gen: g.done, lift: s.surfAt(g.x + 1, g.z + 1) - s.hAt(g.x + 1, g.z + 1), road: s.foundOf(u).road, rimWalk, rimRoad }}""")
    print('raised', lift)
    assert lift['done'] and lift['gen'], 'the foundation and the generator on it were not built'
    assert abs(lift['lift'] - 0.4) < 0.02, 'what stands on a raised foundation is not lifted to its top'
    assert lift['road'] and lift['rimRoad'] > 0, 'the road to the foundation is not counted'
    assert lift['rimWalk'] == 0, 'people can walk off the edge of a raised foundation'
    pg.wait_for_timeout(1500)
    rp = S("return { ramps: v.rampM ? v.rampM.count : 0 }"); print('ramps', rp)
    assert rp['ramps'] > 0, 'no ramp where the road meets the raised foundation'
    S(f"v.target.set(v.wx({dx} - 3), 0, v.wx({dz} + 7)); v.zoomT = 5.5"); pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{out}/found-raised.png')

    # --- a foundation with no road to it takes nothing with a door
    nr = S(f"""for (let k = 0; k < 400; k++) {{ const x = {dx} - 30 + (k % 20) * 3, z = {dz} + 20 + Math.floor(k / 20) * 3; if (s.layCheck(x, z, x + 4, z + 4, 'life', 0).ok) {{ let road = false; for (let j = -1; j <= 5; j++) for (let i = -1; i <= 5; i++) if (s.road(x + i, z + j)) road = true; if (road) continue;
        const n = s.lay(x, z, x + 4, z + 4, 'life', 0, true); return s.canPlace('barracks', x + 1, z + 1, 0, {{ std: 0 }}).why; }} }} return null;""")
    print('no road', nr); assert nr and 'road' in nr, 'a building was allowed on a foundation with no road to it'

    # --- its card, and no taking it up with something on it
    card = S(f"""const b = s.byId({sl['id']}); const r = s.demolish({sl['id']}); return {{ del: r && r.why, still: !!s.byId({sl['id']}) }}""")
    print('take up', card); assert card['still'] and 'Clear it first' in card['del'], 'a foundation with a generator on it was taken up'
    pm = S(f"return v.toScreen({sl['x']} + 5.5, {sl['z']} + 1.5, 0)")
    pg.mouse.click(pm[0], pm[1]); pg.wait_for_timeout(500)
    sp = pg.evaluate("(() => { const p = document.getElementById('fb-selp'); return p.hidden ? '' : p.textContent; })()")
    print('card', sp[:160])
    assert 'UTILITIES FOUNDATION' in sp and 'SIZE' in sp and 'HEIGHT' in sp, 'no foundation card'

    # --- saved and loaded; an old save gets foundations
    sv = S("""const d = JSON.parse(JSON.stringify(s.save())), s2 = new s.constructor({ state: d });
      const old = JSON.parse(JSON.stringify(s.save())); old.v = 12; old.b = old.b.filter(b => b.type !== 'slab'); const s3 = new s.constructor({ state: old });
      const need = s3.b.filter(b => b.type !== 'slab' && s3.slabNeed(b.type, { std: b.std ?? 2 })), under = need.filter(b => s3.slabAt(b.x, b.z));
      return { same: s2.slabs().length === s.slabs().length && s2.slabs().every(x => s2.slabMap[x.z * s2.N + x.x] === x.id), need: need.length, under: under.length }""")
    print('saves', sv)
    assert sv['same'], 'foundations did not survive a save'
    assert sv['need'] > 0 and sv['under'] == sv['need'], 'an old save did not get foundations under its buildings'
    br.close()
bad = [e for e in errs if 'GPU stall' not in e and 'GL Driver' not in e]
if bad: print('\n'.join(bad[:10])); raise SystemExit('errors in the page')
print('foundations OK')
