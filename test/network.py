# Browser check of the network (sponsors, the ratings ledger): python3 test/network.py [out]
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'; errs = []
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
    pg.click('#b-new'); pg.click('#f-go'); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(700)
    print('on offer:', pg.evaluate('sgs.g.net.offers'), 'slots', pg.evaluate('sgs.g.netSlots()'))
    pg.evaluate("(() => { sgs.ui.open = true; sgs.ui.tab = 'uni'; sgs.refresh(); })()"); pg.wait_for_timeout(300)
    pg.click('[data-a=sign]:not([disabled])'); pg.wait_for_timeout(300)
    d = pg.evaluate('sgs.g.net.deals.map(d => sgs.g.dealState(d)).map(s => [s.s.name, s.pay, s.left, s.n, s.need])'); print('signed:', d); assert len(d) == 1, 'nothing was signed'
    due0 = pg.evaluate('sgs.g.due')
    paid = pg.evaluate("(() => { const g = sgs.g; g.rate(2, 'Systems taken'); g._ratRound(); const d = g.due; sgs.refresh(); return d; })()") - due0; pg.wait_for_timeout(300)
    print('after a round: paid', paid, 'ledger', pg.evaluate('sgs.g.air.last'))
    assert paid > 0, 'the sponsor did not pay'
    pg.evaluate("document.getElementById('side').scrollTop = 0"); pg.screenshot(path=f'{out}/network.png')
    saved = pg.evaluate("(() => { const d = JSON.parse(JSON.stringify(sgs.g.save ? sgs.g.save() : null)); return d && d.net ? d.net.deals.length : null; })()"); print('in the save:', saved)
    br.close()
print('ERRORS:' if errs else 'no page errors'); [print(' ', e[:300]) for e in errs[:20]]
sys.exit(1 if errs else 0)
