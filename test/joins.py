# The station's build mode: what joins to what, nothing built through anything else, and the pointer landing on the port it is
# over, with a mouse and by touch.   python3 test/joins.py   (needs `npm start` running)
import sys
from playwright.sync_api import sync_playwright
errs = []; fails = []
def check(ok, what):
    if not ok: fails.append(what)
RULES = '''async () => {
  const { C } = await import('./js/orbit/config.js'); const { Station } = await import('./js/orbit/sim.js'); const { solidOf } = await import('./js/orbit/solid.js');
  const mk = () => { const s = new Station(7, 'sandbox'); s.credits = 1e9; s.radius = 1e6; return s; }, out = {};
  const put = (st, t, h, pi) => { const f = st.fit(t, h, pi, 0); return f.ok ? st.build(t, h, pi, f.rot).id : 0; };
  const side = (st, id) => st.def(st.parts.get(id)).ports.findIndex((_, i) => !st.parts.get(id).used.has(i) && Math.abs(st.port(st.parts.get(id), i).dir[1]) < 0.5);
  let st = mk(); const s1 = side(st, 1);
  out.domeSide = st.fit('dome', 1, s1, 0); out.domeTop = st.fit('dome', 1, 1, 0); out.ringSide = st.fit('ring', 1, s1, 0); out.hangarTop = st.fit('hangar', 1, 1, 0);
  out.dockTop = st.fit('dockport', 1, 1, 0); out.spireSide = st.fit('spire', 1, s1, 0); out.habSide = st.fit('hab', 1, s1, 0); out.coreTop = st.fit('core', 1, 1, 0);
  out.longBeside = st.fit('longcore', 1, s1, 0);      // it would stand in Station Command's brim
  const rack = put(st, 'rack', 1, s1); out.habOnRack = st.fit('hab', rack, 1, 0); out.solarOnRack = st.fit('solar', rack, 1, 0);
  const gun = put(st, 'gunmount', 1, side(st, 1)); out.habOnGun = st.fit('hab', gun, 1, 0); out.turretOnGun = st.fit('turret', gun, 1, 0);
  st = mk(); const core = put(st, 'core', 1, 1); out.hangarOnCore = st.fit('hangar', core, side(st, core), 0); out.hangarOnCommand = st.fit('hangar', 1, side(st, 1), 0);
  const tube = put(st, 'tube', core, 1);      // a tube lying on the roof: it rests on it, neither floating nor sunk in
  out.tubeRests = Math.abs((st.parts.get(tube).pos[1] + solidOf('tube').y0) - st.port(st.parts.get(core), 1).pos[1]) < 1e-6;
  st = mk(); const node = put(st, 'node', 1, 1); out.relayUnderNode = st.fit('relay', node, 3, 0);      // the dish would hang into Station Command
  // every kind of part still goes somewhere on a small station, and every kind can be built on
  st = mk(); const c = put(st, 'core', 1, 1); put(st, 'tube', c, side(st, c)); put(st, 'node', c, side(st, c)); const j = put(st, 'junction', 1, 0);
  out.nowhere = Object.keys(C.parts).filter((t) => !C.parts[t].fixed && !st.freePorts().some((fp) => st.fit(t, fp.part, fp.i, 0).ok));
  return out; }'''
PORT = '''(ok) => { const v = gc.mode.view, fp = v.portList.find((p) => p.fit && p.fit.ok === ok && !v._farPort(p)); const r = v.canvas.getBoundingClientRect(), s = gc.mode.station;
  const P = s.port(s.parts.get(fp.part), fp.i).pos, e = v.camera.matrixWorldInverse.elements, m = v.camera.projectionMatrix.elements;
  const x = e[0] * P[0] + e[4] * P[1] + e[8] * P[2] + e[12], y = e[1] * P[0] + e[5] * P[1] + e[9] * P[2] + e[13], z = e[2] * P[0] + e[6] * P[1] + e[10] * P[2] + e[14], w = -z;
  return [((m[0] * x + m[8] * z) / w + 1) / 2 * r.width + r.left, (1 - (m[5] * y + m[9] * z) / w) / 2 * r.height + r.top, fp.part, fp.i]; }'''
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for name, w, h, touch in [('desk', 1280, 800, False), ('phone', 390, 844, True)]:
        pg = br.new_page(viewport={'width': w, 'height': h}, has_touch=touch)
        pg.on('pageerror', lambda e: errs.append(name + ' pageerror: ' + str(e)))
        pg.on('console', lambda m: errs.append(name + ' console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(400)
        pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
        pg.click('#b-new'); pg.click('#f-go'); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(700)
        pid = pg.evaluate('sgs.g.P.find(p => p.owner === "fed" && p.ring === 1).id')
        pg.evaluate(f'gc.app.theatre("orbit", {{ system: sgs.g.P[{pid}] }})')
        pg.wait_for_function("gc.state === 'orbit' && document.getElementById('trans').hidden", timeout=120000); pg.wait_for_timeout(1500)
        if name == 'desk':
            r = pg.evaluate(RULES)
            for k, want in [('domeSide', 'stands upright'), ('ringSide', 'round the spine'), ('hangarTop', 'side port'), ('dockTop', 'side port'), ('spireSide', 'stands on end'), ('habOnRack', 'open frame'), ('habOnGun', 'mount'),
                            ('longBeside', 'run into'), ('hangarOnCommand', 'run into'), ('relayUnderNode', 'run into')]:
                check(not r[k]['ok'] and want in r[k]['why'], f'{k} should be refused ({want}): {r[k]}')
            for k in ['domeTop', 'habSide', 'coreTop', 'solarOnRack', 'turretOnGun', 'hangarOnCore']: check(r[k]['ok'], f'{k} should fit: {r[k]}')
            check(r['tubeRests'], 'a tube on a roof should rest on it'); check(not r['nowhere'], f"parts that fit nowhere: {r['nowhere']}")
            print('rules', 'ok' if not fails else fails)
        tap = (lambda x, y: pg.touchscreen.tap(x, y)) if touch else (lambda x, y: pg.mouse.click(x, y))
        (pg.tap if touch else pg.click)('[data-op=core]'); pg.wait_for_function('gc.mode.view.portFits != null'); pg.wait_for_timeout(300)
        check('BUILD' in pg.inner_text('#th-sel') and pg.evaluate('gc.mode.view.portFits') > 0, name + ': the build card should say where the part fits')
        x, y, part, i = pg.evaluate(PORT, True); n0 = pg.evaluate('gc.mode.station.parts.size')
        if touch:
            tap(x, y); pg.wait_for_timeout(400)
            check(pg.evaluate('!!gc.mode.view.ghost') and n0 == pg.evaluate('gc.mode.station.parts.size'), name + ': the first tap should show the part, not build it')
            pg.tap('[data-ob=go]'); pg.wait_for_timeout(400)
        else:
            pg.mouse.move(x, y); pg.wait_for_timeout(400)
            check(pg.evaluate('!!gc.mode.view.ghost') and 'Fits here' in pg.inner_text('#th-sel'), name + ': pointing at a port should show the part there')
            tap(x, y); pg.wait_for_timeout(400)
        built = pg.evaluate(f'(() => {{ const s = gc.mode.station, p = [...s.parts.values()].pop(); return [s.parts.size, p.parent, p.pport]; }})()')
        check(built == [n0 + 1, part, i], f'{name}: the part should be built on the port under the pointer: {built} != {[n0 + 1, part, i]}')
        x, y, part, i = pg.evaluate(PORT, False); (tap(x, y) if touch else pg.mouse.move(x, y)); pg.wait_for_timeout(400)
        check(pg.evaluate('document.querySelector("#th-sel .say").classList.contains("no")') and pg.evaluate('document.querySelector("[data-ob=go]").disabled'), name + ': a port it does not fit should say why, and BUILD be off')
        if not touch: n1 = pg.evaluate('gc.mode.station.parts.size'); tap(x, y); pg.wait_for_timeout(300); check(n1 == pg.evaluate('gc.mode.station.parts.size'), name + ': nothing should be built where it does not fit')
        pg.screenshot(path=f'/tmp/shots/{name}-joins.png')
        (pg.tap if touch else pg.click)('[data-ob=x]'); pg.wait_for_timeout(200)
        check(pg.evaluate('document.getElementById("th-sel").classList.contains("hidden") && !gc.mode.view.ghost && !gc.mode.view.markers.children.length'), name + ': cancel should clear build mode')
        print(name, 'build mode', 'ok' if not fails else fails)
        pg.close()
    br.close()
for f in fails: print('FAIL', f)
print('ERRORS:' if errs else 'no page errors'); [print(' ', e[:300]) for e in errs[:20]]
sys.exit(1 if errs or fails else 0)
