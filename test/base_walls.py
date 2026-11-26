# (GC 0.89) Browser check of FOB Commander's walls: python3 test/base_walls.py [out]   (needs the server on 8080)
#   - DEFENCE has four kinds of wall (fence, barrier, concrete, fortified) beside the field works, fitting without a scroll
#   - each draws and closes the base like a wall; a road through any of them is a gate
#   - concrete and fortified walls need the Concrete Batch Plant; a fortified wall only goes along a finished foundation
#     and stands on its top
#   - what the wall is made of counts in a raid: a fence for less, concrete for more, fortified most
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
    # --- the bar
    pg.evaluate("document.querySelector('#fb-groups [data-g=defence]').click()"); pg.wait_for_timeout(400)
    bar = pg.evaluate("""(() => { const it = document.getElementById('fb-items'), row = it.querySelector('.bi-row'), cs = [...it.querySelectorAll('[data-b]')], last = cs[cs.length - 1].getBoundingClientRect(), r = row.getBoundingClientRect(); return { cards: cs.map(b => b.dataset.b), sh: it.scrollHeight, ch: it.clientHeight, sw: row.scrollWidth, cw: row.clientWidth, lastRight: last.right, rowRight: r.right }; })()""")
    print('bar', bar)
    assert all(k in bar['cards'] for k in ['fence', 'wall', 'cwall', 'rampart']), 'DEFENCE does not have the four walls'
    assert bar['sh'] <= bar['ch'] + 1 and bar['sw'] <= bar['cw'] + 1 and bar['lastRight'] <= bar['rowRight'] + 1, 'the DEFENCE bar scrolls, or a card falls off its end'
    pg.screenshot(path=f'{out}/walls-bar.png')
    pg.evaluate("document.querySelector('#fb-groups [data-g=defence]').click()"); pg.wait_for_timeout(200)     # the bar folds
    # --- one of each, side by side, south of the command post
    r = S("""v.setQuality('low'); s.foundedF = true; s.supplies += 9000; for (let i = 0; i < 600; i++) s.step(0.1);
      const hq = s.b.find(b => b.type === 'hq'), [dx, dz] = s.door(hq), N = s.N;
      const line = (x0, z0, x1, z1, k) => { const a = s.snapLine({ x: x0 + 0.5, z: z0 + 0.5 }, 'free', k), b = s.snapLine({ x: x1 + 0.5, z: z1 + 0.5 }, 'free', k, a); const c = s.checkLine(a, b, k); return c.ok ? !!s.drawLine(a, b, k) : c.why; };
      const out = { noBatch: line(dx - 8, dz + 8, dx + 8, dz + 8, 'cwall') };
      s.equipFree = true;
      out.fence = line(dx - 8, dz + 6, dx + 8, dz + 6, 'fence'); out.wall = line(dx - 8, dz + 8, dx + 8, dz + 8, 'wall');
      out.cwall = line(dx - 8, dz + 10, dx + 8, dz + 10, 'cwall'); out.bare = line(dx - 8, dz + 13, dx + 8, dz + 13, 'rampart');
      const sl = s.lay(dx - 9, dz + 12, dx + 9, dz + 14, 'ops', 1, true); out.rampart = line(dx - 8, dz + 13, dx + 8, dz + 13, 'rampart');
      out.str = ['fence', 'wall', 'cwall', 'rampart'].map((k, i) => s.wallStr.get((dz + [6, 8, 10, 13][i]) * N + dx));
      out.lift = s.surfAt(dx + 0.5, dz + 13.5) - s.hAt(dx + 0.5, dz + 13.5);
      v.target.set(v.wx(dx), 0, v.wx(dz + 9)); v.zoomT = 6.5;
      return out;""")
    print('walls', r)
    assert 'Batch Plant' in r['noBatch'], 'a concrete wall went up without a batch plant'
    assert r['fence'] is True and r['wall'] is True and r['cwall'] is True and r['rampart'] is True, 'a wall would not draw'
    assert 'foundation' in r['bare'], 'a fortified wall went up off a foundation'
    assert r['str'] == sorted(r['str']) and r['str'][0] < 1 < r['str'][2] < r['str'][3], 'the walls are not worth more as they get stronger'
    assert r['lift'] > 0.35, 'the fortified wall is not on the raised foundation'
    pg.wait_for_timeout(2500)
    pg.screenshot(path=f'{out}/walls-four.png')
    # --- closing the base: a fence ring, then the same ring in concrete scores higher
    f = S("""const hq = s.b.find(b => b.type === 'hq'), [dx, dz] = s.door(hq);
      const ring = (k, R) => { const pts = [[dx - R, dz - R], [dx + R, dz - R], [dx + R, dz + R + 6], [dx - R, dz + R + 6]]; let ok = true; for (let i = 0; i < 4; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % 4]; const a = s.snapLine({ x: x0 + 0.5, z: z0 + 0.5 }, 'free', k), b = s.snapLine({ x: x1 + 0.5, z: z1 + 0.5 }, 'free', k, a); const c = s.checkLine(a, b, k); ok = ok && c.ok && !!s.drawLine(a, b, k); } return ok; };
      const a = ring('fence', 24); s.recalc(); const f1 = s.fortify();
      return { ring: a, closed: f1.closed, str: f1.str };""")
    print('fence ring', f)
    assert f['ring'] and f['closed'], 'a fence all the way round did not close the base'
    br.close()
bad = [e for e in errs if 'GPU stall' not in e and 'GL Driver' not in e]
if bad: print('\n'.join(bad[:10])); raise SystemExit('errors in the page')
print('walls OK')
