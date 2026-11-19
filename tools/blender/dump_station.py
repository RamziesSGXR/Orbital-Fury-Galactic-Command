# Writes the plans of the station's parts for tools/blender/station.py: python3 tools/blender/dump_station.py [out.json]  (needs the game on :8080)
# Every part's structural pieces as the game builds them (triangles, where they stand), each with its role (hull, trim, inner, ...).
# Lights, glass, screens and lines are left out: they stay the game's own.
import sys, json, os
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/station_plans.json'
JS = r"""
async () => {
  const THREE = await import('/js/vendor/three.js'), { buildPart, HULL_SKIP } = await import('/js/orbit/parts.js'), { C } = await import('/js/orbit/config.js');
  const r4 = (x) => Math.round(x * 10000) / 10000, res = {}, bad = {};
  for (const type of Object.keys(C.parts)) {
    let g; try { g = buildPart(type, true); } catch (e) { bad[type] = e.message; continue; } g.updateMatrixWorld(true);
    const pieces = [], q = new THREE.Vector3();
    g.traverse((o) => { if (!o.isMesh || !o.userData.role || HULL_SKIP.has(o.userData.role)) return;
      const a = o.geometry.attributes.position, ix = o.geometry.index, n = ix ? ix.count : a.count, v = [];
      for (let i = 0; i < n; i++) { q.fromBufferAttribute(a, ix ? ix.getX(i) : i).applyMatrix4(o.matrixWorld); v.push(r4(q.x), r4(q.y), r4(q.z)); }
      pieces.push({ r: o.userData.role, v }); });
    res[type] = pieces;
  }
  return { res, bad };
}
"""
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(); pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(600)
    r = pg.evaluate(JS); br.close()
json.dump(r['res'], open(out, 'w'), separators=(',', ':'))
roles = {}
for ps in r['res'].values():
    for p in ps: roles[p['r']] = roles.get(p['r'], 0) + len(p['v']) // 9
print('parts', len(r['res']), 'bytes', os.path.getsize(out), 'failed', r['bad']); print('triangles by role', roles)
