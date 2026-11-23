#!/usr/bin/env python3
"""Floating pieces in FOB Commander's buildings as the game builds them (GC 0.66).

test/floating.py checks each model file alone; a building's structure file is only part of it, and js/base/models.js adds
the rest in code (walls, towers, posts; HOLD, for what a file left in the air). This builds every building in the browser,
whole, and runs the same check on it: a piece that cannot be reached from the ground through pieces that touch is floating.

    python3 test/floating_built.py                    # every building and early standard
    python3 test/floating_built.py batch,mast          # some
(needs the game served on :8080) Exit code 1 if any building has a floating piece over 0.2% of its surface; solar is let off
(its panels rest on their rails, a hair over the check's reach).
"""
import sys, json, base64, numpy as np
from scipy.spatial import cKDTree
from playwright.sync_api import sync_playwright
names = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] else None
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    pg = br.new_page(viewport={'width': 400, 'height': 300})
    pg.goto('http://localhost:8080/'); pg.wait_for_timeout(600)
    data = pg.evaluate("""(async (names) => {
      const M = await import('/js/base/models.js'); const T = await import('/js/vendor/three.js');
      await new Promise((res) => M.loadBuildings(res));
      const m = M.makeMats(gc.app.faction);
      const keys = names || Object.keys(await (await fetch('/assets/models/buildings.json')).json()).filter(k => !k.startsWith('veh-'));
      const out = {};
      for (const n of keys) {
        const mm = /^(.+)-s(\\d)-(\\d)x(\\d)$/.exec(n), type = mm ? mm[1] : n, spec = mm ? { std: +mm[2], w: +mm[3], d: +mm[4] } : null;
        let g; try { g = M.buildModel(type, m, false, spec); } catch (e) { out[n] = 'ERR ' + e.message; continue; }
        g.updateMatrixWorld(true); const P = [];
        g.traverse((o) => { if (!o.isMesh || !o.visible) return; const geo = o.geometry, pos = geo.attributes.position, idx = geo.index, v = new T.Vector3();
          const cnt = o.isInstancedMesh ? o.count : 1, im = new T.Matrix4();
          for (let k = 0; k < cnt; k++) { const mw = o.matrixWorld.clone(); if (o.isInstancedMesh) { o.getMatrixAt(k, im); mw.multiply(im); }
            const n2 = idx ? idx.count : pos.count; for (let i = 0; i < n2; i++) { v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(mw); P.push(v.x, v.y, v.z); } } });
        const f = new Float32Array(P); let s = ''; const u = new Uint8Array(f.buffer); for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
        out[n] = btoa(s);
      }
      return out; })""", names)
    br.close()

def check(P, eps=0.015):
    tri = P.reshape(-1, 3, 3)
    q = np.round(P / 1e-4).astype(np.int64)
    key, inv = np.unique(q, axis=0, return_inverse=True); tris = inv.reshape(-1, 3); nv = key.shape[0]
    parent = np.arange(nv)
    def find(a):
        while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for a, b, c in tris:
        ra, rb, rc = find(a), find(b), find(c)
        if ra != rb: parent[rb] = ra
        if ra != rc: parent[find(rc)] = ra
    roots = np.array([find(t[0]) for t in tris]); _, lab = np.unique(roots, return_inverse=True); n = lab.max() + 1
    if n == 1: return None
    size = float(np.linalg.norm(P.max(0) - P.min(0))); e = eps * size; step = e / 2
    a, b, c = tri[:, 0], tri[:, 1], tri[:, 2]
    area = np.linalg.norm(np.cross(b - a, c - a), axis=1) / 2
    k = np.clip(np.ceil(area / (step * step)), 0, 400).astype(int)
    pts, plab = [a, b, c, (a + b + c) / 3], [lab] * 4
    idx = np.repeat(np.arange(len(tri)), k)
    if len(idx):
        r1, r2 = np.random.rand(len(idx), 1), np.random.rand(len(idx), 1); s = np.sqrt(r1)
        pts.append(a[idx] * (1 - s) + b[idx] * (s * (1 - r2)) + c[idx] * (s * r2)); plab.append(lab[idx])
    for u, v in ((a, b), (b, c), (c, a)):
        L = np.linalg.norm(v - u, axis=1); m = np.clip(np.ceil(L / step), 1, 200).astype(int)
        j = np.repeat(np.arange(len(tri)), m); t = (np.concatenate([np.arange(x) for x in m]) + 0.5) / np.repeat(m, m)
        pts.append(u[j] + (v[j] - u[j]) * t[:, None]); plab.append(lab[j])
    Pt, PL = np.concatenate(pts), np.concatenate(plab)
    pairs = cKDTree(Pt).query_pairs(e, output_type='ndarray')
    adj = [set() for _ in range(n)]
    for i, j in pairs:
        li, lj = PL[i], PL[j]
        if li != lj: adj[li].add(lj); adj[lj].add(li)
    ymin = Pt[:, 1].min(); gl = max(ymin, 0.0)
    ground = [i for i in range(n) if Pt[PL == i, 1].min() <= gl + e]
    seen, todo = set(ground), list(ground)
    while todo:
        x = todo.pop()
        for y in adj[x]:
            if y not in seen: seen.add(y); todo.append(y)
    loose = [i for i in range(n) if i not in seen]
    if not loose: return None
    held = np.isin(PL, list(seen)); ht = cKDTree(Pt[held]); tot = area.sum(); out = []
    for i in loose:
        sel = PL == i; gap, _ = ht.query(Pt[sel], k=1)
        lo, hi = Pt[sel].min(0), Pt[sel].max(0); H = Pt[held]
        cx, cz = (lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2; rx, rz = max(0.03, (hi[0] - lo[0]) / 2), max(0.03, (hi[2] - lo[2]) / 2)
        under = H[(np.abs(H[:, 0] - cx) <= rx) & (np.abs(H[:, 2] - cz) <= rz) & (H[:, 1] < lo[1] + 1e-3)]
        below = round(float(under[:, 1].max()), 3) if len(under) else 0.0
        nb = H[(np.abs(H[:, 0] - cx) <= 0.35) & (np.abs(H[:, 2] - cz) <= 0.35) & (H[:, 1] < lo[1] + 1e-3)]
        if len(nb): top = nb[nb[:, 1] > nb[:, 1].max() - 0.02]; below = (below, round(float(nb[:, 1].max()), 3), top[:, [0, 2]].min(0).round(3).tolist(), top[:, [0, 2]].max(0).round(3).tolist())
        out.append((area[lab == i].sum() / tot, lo.round(3).tolist(), hi.round(3).tolist(), round(float(gap.min()), 3), below))
    out.sort(key=lambda x: -x[0]); return out

ALLOW = {'solar'}
bad = 0
for n, b64 in data.items():
    if isinstance(b64, str) and b64.startswith('ERR'): print('ERR', n, b64); continue
    P = np.frombuffer(base64.b64decode(b64), dtype=np.float32).astype(np.float64).reshape(-1, 3)
    if not len(P): continue
    r = check(P)
    if r and r[0][0] > 0.002 and n not in ALLOW:
        bad += 1; print(f'FLOAT {n:22s} {len(r):3d} loose', '\n      ' + '\n      '.join(f'{x[0]*100:.2f}% {x[1]}..{x[2]} gap {x[3]} held below at y {x[4]}' for x in r[:14]))
print(bad, 'of', len(data), 'buildings with floating pieces, as built')
sys.exit(1 if bad else 0)
