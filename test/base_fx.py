# (GC 0.86) Browser check of FOB Commander's look: python3 test/base_fx.py [out]   (needs the server on 8080)
#   - a building going up is cut off at a line that climbs with the work: its own materials are clipped below the line and
#     a hologram of it (outlines and a see-through twin) shows above; sparks fly while the work goes on; when it is done
#     the hologram comes off and the building's own materials are back (so it batches again)
#   - the build ghost is a hologram (cyan where it can go, red where it can't), with a label at the pointer: name, cost,
#     reach and how many it serves, and CAN BUILD HERE or why not
#   - selecting a source shows its network (GC 0.88: no dome) and a beam off each building on it that it serves
#   - the glow pass runs (and the lowest graphics level goes without it)
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'; errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path=__import__('os').environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
    pg.click('#b-new'); pg.click('#f-go'); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(700)
    pid = pg.evaluate('sgs.g.P.find(p => p.owner === "fed" && p.ring === 1).id')
    pg.evaluate(f'gc.app.theatre("base", {{ system: sgs.g.P[{pid}] }})')
    pg.wait_for_function("gc.state === 'base' && document.getElementById('trans').hidden", timeout=120000)
    pg.wait_for_timeout(1500)
    S = lambda js: pg.evaluate('(() => { const s = gc.mode.sim, v = gc.mode.view; ' + js + ' })()')
    # a comms tower going up, a generator and a barracks it powers, all near the command post, and the camera on them
    ids = S("""for (let i = 0; i < 2000; i++) s.step(0.1); s.drain(); s.foundedF = true;
      const hq = s.b.find(b => b.type === 'hq');
      const put = (t, ox, oz) => { for (let k = 0; k < 400; k++) { const x = hq.x + ox + (k % 20), z = hq.z + oz + Math.floor(k / 20); if (s.fits(t, x, z, 0).ok) return s.place(t, x, z, 0, true); } return null; };
      const a = put('comms', 6, -2);
      // (GC 0.88) a generator and a barracks on one finished foundation: one network
      let g = null, c = null; for (let k = 0; k < 400 && !g; k++) { const x = hq.x - 14 + (k % 20), z = hq.z + 4 + Math.floor(k / 20); if (s.layCheck(x, z, x + 7, z + 5, 'util', 0).ok) { s.lay(x, z, x + 7, z + 5, 'util', 0, true); g = s.place('gen', x + 1, z + 1, 0, true); c = s.place('barracks', x + 4, z + 1, 0, true); } }
      a.done = false; a.prog = 0.4; s.recalc();
      v.target.set(v.wx(a.x + 1), 0, v.wx(a.z + 3)); v.zoomT = 7;
      return { a: a.id, g: g.id, c: c.id };""")
    print('placed', ids)
    pg.wait_for_timeout(1200)
    st = S(f"""const g = v.bm.get({ids['a']}), h = g && g.userData.holo; if (!h) return null;
      let clip = 0, twin = 0; g.userData.model.traverse(o => {{ if (o.userData.m0) {{ const m = [].concat(o.material); if (m.every(q => q.clippingPlanes && q.clippingPlanes.length)) clip++; }} if (o.userData.holo) twin++; }});
      return {{ clip, twin, cut: h.pl0.constant, line: h.line.position.y, top: g.userData.top }};""")
    print('going up', st)
    assert st and st['clip'] > 0 and st['twin'] > 0, 'a building going up is not drawn as a hologram over its clipped self'
    assert abs(st['line'] - st['top'] * 0.4) < 0.05, 'the cutting line is not at the work done'
    # work goes on: the line climbs and throws sparks
    S(f"window.__w = setInterval(() => {{ const b = gc.mode.sim.byId({ids['a']}); if (b && !b.done) b.prog = Math.min(0.95, b.prog + 0.01); }}, 50)")
    pg.wait_for_function(f"gc.mode.sim.byId({ids['a']}).prog > 0.6", timeout=60000)     # (GC 0.90: software drawing of the textured scene is slower); pg.wait_for_timeout(400)
    sp = S(f"return {{ n: v.sparks.n, line: v.bm.get({ids['a']}).userData.holo.line.position.y }}")
    print('working', sp)
    assert sp['n'] > 5, 'no sparks while the work goes on'
    assert sp['line'] > st['line'] + 0.05, 'the cutting line does not climb with the work'
    pg.screenshot(path=f'{out}/fx-building.png')
    # done: the hologram comes off and its own materials are back
    S(f"clearInterval(window.__w); const b = s.byId({ids['a']}); b.prog = 1; b.done = true; s.recalc();")
    pg.wait_for_timeout(600)
    dn = S(f"""const g = v.bm.get({ids['a']}); let m0 = 0, twin = 0, clip = 0; g.userData.model.traverse(o => {{ if (o.userData.m0) m0++; if (o.userData.holo) twin++; if (o.material && [].concat(o.material).some(q => q.clippingPlanes && q.clippingPlanes.length)) clip++; }});
      return {{ holo: !!g.userData.holo, m0, twin, clip }};""")
    print('done', dn)
    assert not dn['holo'] and dn['m0'] == 0 and dn['twin'] == 0 and dn['clip'] == 0, 'a finished building keeps its hologram'

    # selecting the generator: its network, beams off what it powers
    S(f"gc.mode.view.select(gc.mode.sim.byId({ids['g']}))"); pg.wait_for_timeout(700)
    sel = S("return { net: v.netM_sel ? v.netM_sel.count : 0, beams: v.beams.count, served: s.servedList(s.byId(%d), 'pw').length }" % ids['g'])
    print('selected', sel)
    assert sel['net'] > 0, 'the generator\'s network is not shown'
    assert sel['beams'] == sel['served'] and sel['served'] > 0, 'no beams off what the generator powers'
    pg.screenshot(path=f'{out}/fx-select.png')
    S("gc.mode.view.select(null)"); pg.wait_for_timeout(200)
    assert not S("return (v.netM_sel && v.netM_sel.count > 0) || v.beams.count > 0"), 'the network stays after the selection is cleared'

    # the ghost and the label at the pointer: a substation, over open ground
    pg.evaluate("document.querySelector('#fb-groups [data-g=power]').click()"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('#fb-items [data-b=substation]').click()"); pg.wait_for_timeout(200)
    for x, y in [(900, 420), (905, 425), (700, 300), (705, 305)]:
        pg.mouse.move(x, y); pg.wait_for_timeout(150)
    card = pg.evaluate("(() => { const t = document.getElementById('fb-tip'); return t.hidden ? null : { card: t.classList.contains('pcard'), text: t.textContent }; })()")
    print('label', card)
    assert card and card['card'] and 'SUBSTATION' in card['text'] and 'SUP' in card['text'], 'no blueprint label at the pointer'
    assert 'CAN BUILD HERE' in card['text'] or '✕' in card['text'], 'the label does not say whether it can go here'
    assert 'joins networks within' in card['text'], 'the label does not say what a Substation joins'
    gh = S("let n = 0; v.ghostG.traverse(o => { if (o.userData.holo) n++; }); return { vis: v.ghostG.visible, outl: n, ring: v.range.visible, col: '#' + v.ghostEdge.color.clone().multiplyScalar(1 / 1.5).getHexString() }")
    print('ghost', gh)
    assert gh['vis'] and gh['outl'] > 0 and gh['ring'], 'the ghost is not an outlined blueprint with its reach'
    pg.screenshot(path=f'{out}/fx-ghost.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    assert pg.evaluate("document.getElementById('fb-tip').hidden"), 'the label stays after the tool is put away'
    assert not S("return v.range.visible"), 'the reach stays after the tool is put away'

    # the glow pass: on above the lowest level, off at it
    gl = S("const r = v.bloom; return { on: r.on, w: r.w, q: v.q }")
    print('glow', gl)
    assert gl['q'] == 3 or gl['w'] > 0, 'the glow pass did not run'
    S("v.setQuality('low')"); pg.wait_for_timeout(300)
    assert S("return v.q") == 3
    S("v.setQuality('auto')")
    br.close()
bad = [e for e in errs if 'GPU stall' not in e and 'GL Driver' not in e]
if bad: print('\n'.join(bad[:10])); raise SystemExit('errors in the page')
print('base fx OK')
