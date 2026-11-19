# Writes the plans of the base's buildings for tools/blender/base.py: python3 tools/blender/dump_base.py [out.json]  (needs the game served on :8080)
# Every building's solid, plain-coloured parts (what never moves and carries no picture) as boxes, cylinders or raw triangles, with
# the name of the base's material each is made of. Moving parts, lights, glass, flags and signs stay the game's own.
import sys, json
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/base_plans.json'
JS = r"""
async () => {
  const THREE = await import('/js/vendor/three.js'), { buildModel, structural } = await import('/js/base/models.js'), { B } = await import('/js/base/config.js');
  const m = gc.mode.view.m, key = new Map(); for (const [k, v] of Object.entries(m)) if (v && v.isMaterial) key.set(v, k);
  const r3 = (x) => Math.round(x * 1000) / 1000, res = {}, stats = {};
  // every building as it stands when finished, and as it stands at the two early standards (tents, then prefabs), each way round
  const jobs = []; for (const type of Object.keys(B)) { jobs.push([type, null]); for (const k of [0, 1]) for (const [w, d] of B[type].w === B[type].d ? [[B[type].w, B[type].d]] : [[B[type].w, B[type].d], [B[type].d, B[type].w]]) jobs.push([`${type}-s${k}-${w}x${d}`, { std: k, w, d }, type]); }
  for (const [name, spec, of] of jobs) {
    const type = of || name; let g; try { g = buildModel(type, m, false, spec, true); } catch (e) { stats[name] = 'failed: ' + e.message; continue; } g.updateMatrixWorld(true);
    const parts = []; let kept = 0;
    const solid = structural(g);
    g.traverse((o) => {
      if (!o.isMesh) return; if (!solid.has(o)) { kept++; return; }
      const geo = o.geometry, P = geo.parameters || {}, M = Array.from(o.matrixWorld.elements).map(r3), k = key.get(o.material), c = '#' + o.material.color.getHexString();
      if (geo.type === 'BoxGeometry') parts.push({ t: 'box', p: [P.width, P.height, P.depth].map(r3), m: M, k, c });
      else if (geo.type === 'CylinderGeometry' && !P.openEnded && (P.thetaLength === undefined || P.thetaLength > 6.2)) parts.push({ t: 'cyl', p: [r3(P.radiusTop), r3(P.radiusBottom), r3(P.height), P.radialSegments], m: M, k, c });
      else { const a = geo.attributes.position, v = [], q = new THREE.Vector3(); for (let i = 0; i < a.count; i++) { q.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); v.push(r3(q.x), r3(q.y), r3(q.z)); }
        parts.push({ t: 'raw', v, i: geo.index ? Array.from(geo.index.array) : null, k, c, g: geo.type }); }
    });
    res[name] = { w: B[type].w, d: B[type].d, parts }; if (!spec || typeof stats[name] === 'string') stats[name] = [parts.length, kept];
  }
  return { res, stats };
}
"""
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto('http://localhost:8080/?seed=7'); pg.wait_for_timeout(400); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(400)
    pg.click('#b-new'); pg.click('#f-go'); pg.click('#modal [data-x=close]'); pg.wait_for_timeout(700)
    pid = pg.evaluate('sgs.g.P.find(p => p.owner === "fed" && p.ring === 1).id')
    pg.evaluate(f'gc.app.theatre("base", {{ system: sgs.g.P[{pid}] }})')
    pg.wait_for_function("gc.state === 'base' && document.getElementById('trans').hidden", timeout=120000)
    r = pg.evaluate(JS); br.close()
json.dump(r['res'], open(out, 'w'), separators=(',', ':'))
import os
print('buildings', len(r['res']), 'bytes', os.path.getsize(out)); print('failed:', {k: v for k, v in r['stats'].items() if isinstance(v, str)})
kinds = {}
for b in r['res'].values():
    for p in b['parts']: kinds[p['t'] if p['t'] != 'raw' else p['g']] = kinds.get(p['t'] if p['t'] != 'raw' else p['g'], 0) + 1
print(kinds); print('materials', sorted({p['k'] or '?' for b in r['res'].values() for p in b['parts']}))
