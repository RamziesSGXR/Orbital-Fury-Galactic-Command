#!/usr/bin/env python3
"""Floating parts: pieces of a model that touch nothing.

Each model's still frame is split into its separate pieces (triangles sharing a corner, corners at the same place welded).
Points are scattered over every piece's surface; two pieces touch where any of their points come within `eps` (a share of
the model's size) of each other. A piece touches the ground if it reaches the ground (0, where the models are built standing; or the lowest point, if nothing goes below 0). A piece that cannot be
reached from the ground through pieces that touch is floating.

    python3 test/floating.py                 # every model; packs (buildings, station) part by part
    python3 test/floating.py prop_post_arty   # some
    python3 test/floating.py --eps 0.02 --min 0.002

Prints each model with floating pieces: how many, the biggest one's share of the model's surface, where it is, and its gap.
Exit code 1 if any model has a floating piece bigger than --min of its surface. Hung things (a lamp on a wire, a flag) can be
listed in ALLOW below.
"""
import base64, json, os, sys, glob
import numpy as np
from scipy.spatial import cKDTree

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'models')
# models (or pack:part) whose loose pieces are meant: things in the air by design
ALLOW = {'ship_fed', 'ship_molt', 'ship_foundry', 'ship_talon', 'veh_dropship', 'veh_striker', 'veh_uav', 'drop_foundry', 'drop_talon', 'veh_shuttle'}


def geom(d, frame='stand'):
    tris = np.frombuffer(base64.b64decode(d['tris']), dtype=np.uint16).reshape(-1, 3).astype(np.int64)
    fr = d['frames'].get(frame) or next(iter(d['frames'].values()))
    q = np.frombuffer(base64.b64decode(fr), dtype=np.uint16).reshape(-1, 3).astype(np.float64)
    pos = np.array(d['min']) + q / 65535.0 * np.array(d['size'])
    # weld corners at the same place
    key, inv = np.unique(q.astype(np.int64), axis=0, return_inverse=True)
    return pos, inv.reshape(-1)[tris], key.shape[0]


def pieces(tris, nv):
    parent = np.arange(nv)
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for a, b, c in tris:
        ra, rb, rc = find(a), find(b), find(c)
        if ra != rb: parent[rb] = ra
        if ra != rc: parent[find(rc)] = ra
    roots = np.array([find(t[0]) for t in tris])
    _, lab = np.unique(roots, return_inverse=True)
    return lab


def check(name, d, eps=0.015, step=None):
    pos, tris, nv = geom(d)
    # positions by welded index
    wpos = np.zeros((nv, 3))
    tq = np.frombuffer(base64.b64decode(d['tris']), dtype=np.uint16).reshape(-1, 3).astype(np.int64)
    wpos[tris.reshape(-1)] = pos[tq.reshape(-1)]
    lab = pieces(tris, nv)
    n = lab.max() + 1
    size = float(np.linalg.norm(np.array(d['size'])))
    e = eps * size
    if n == 1: return None
    a, b, c = wpos[tris[:, 0]], wpos[tris[:, 1]], wpos[tris[:, 2]]
    area = np.linalg.norm(np.cross(b - a, c - a), axis=1) / 2
    # scatter points: corners, plus area-weighted samples at spacing about e/2
    step = step or e / 2
    k = np.clip(np.ceil(area / (step * step)), 0, 400).astype(int)
    pts, plab = [a, b, c, (a + b + c) / 3], [lab] * 4
    idx = np.repeat(np.arange(len(tris)), k)
    if len(idx):
        r1, r2 = np.random.rand(len(idx), 1), np.random.rand(len(idx), 1)
        s = np.sqrt(r1)
        pts.append(a[idx] * (1 - s) + b[idx] * (s * (1 - r2)) + c[idx] * (s * r2)); plab.append(lab[idx])
    # edge midpoints and samples, so thin bars are found
    for u, v in ((a, b), (b, c), (c, a)):
        L = np.linalg.norm(v - u, axis=1); m = np.clip(np.ceil(L / step), 1, 200).astype(int)
        j = np.repeat(np.arange(len(tris)), m); t = (np.concatenate([np.arange(x) for x in m]) + 0.5) / np.repeat(m, m)
        pts.append(u[j] + (v[j] - u[j]) * t[:, None]); plab.append(lab[j])
    P, PL = np.concatenate(pts), np.concatenate(plab)
    tree = cKDTree(P)
    pairs = tree.query_pairs(e, output_type='ndarray')
    adj = [set() for _ in range(n)]
    for i, j in pairs:
        li, lj = PL[i], PL[j]
        if li != lj: adj[li].add(lj); adj[lj].add(li)
    ymin = P[:, 1].min(); gl = max(ymin, 0.0) if ymin < 0 else ymin     # (the ground is at 0: what goes below it is sunk in)
    ground = [i for i in range(n) if P[PL == i, 1].min() <= gl + e]
    seen, todo = set(ground), list(ground)
    while todo:
        x = todo.pop()
        for y in adj[x]:
            if y not in seen: seen.add(y); todo.append(y)
    loose = [i for i in range(n) if i not in seen]
    if not loose: return None
    tot = area.sum()
    out = []
    held = np.isin(PL, list(seen))
    ht = cKDTree(P[held])
    for i in loose:
        sel = PL == i
        gap, _ = ht.query(P[sel], k=1)
        c0 = P[sel].mean(axis=0)
        out.append((area[lab == i].sum() / tot, c0, gap.min(), int((lab == i).sum())))
    out.sort(key=lambda x: -x[0])
    return out


def main():
    args = sys.argv[1:]
    eps, mn = 0.015, 0.002
    if '--eps' in args: i = args.index('--eps'); eps = float(args[i + 1]); del args[i:i + 2]
    if '--min' in args: i = args.index('--min'); mn = float(args[i + 1]); del args[i:i + 2]
    names = args or sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(ROOT, '*.json')) if not f.endswith('index.json'))
    bad = 0
    for nm in names:
        f, _, part = nm.partition(':')
        d = json.load(open(os.path.join(ROOT, f + '.json')))
        todo = [(nm, d)] if 'frames' in d or part else [(f'{f}:{k}', v) for k, v in d.items() if isinstance(v, dict) and 'frames' in v]
        if part: todo = [(nm, d[part])]
        for n2, dd in todo:
            if n2 in ALLOW or n2.split(':')[0] in ALLOW: continue
            r = check(n2, dd, eps)
            if not r: continue
            big = r[0][0]
            flag = big > mn
            bad += flag
            if flag or args:
                x = r[0]
                print(f"{'FLOAT' if flag else 'tiny '} {n2:34s} {len(r):3d} loose · biggest {x[0]*100:5.2f}% of surface, {x[3]} tris, at ({x[1][0]:.2f},{x[1][1]:.2f},{x[1][2]:.2f}) gap {x[2]:.3f}")
    print(f'{bad} models with floating pieces')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
