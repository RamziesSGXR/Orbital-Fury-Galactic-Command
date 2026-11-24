# THE BASE'S BUILDINGS, MADE IN BLENDER FROM THEIR PLANS. Run in Blender after gc_kit.py, with the plans beside it
# (scripts/base_plans.json, written by tools/blender/dump_base.py from the game's own list of buildings).
# Each plan is a building's solid parts: blocks, round bars and a few odd shapes, each of one of the base's named materials.
# Here every block gets the kit's cut edges and every bar its rounded rims, and the whole building is written out as one model
# (export/bld_<type>.json) in the same form as the people and the ground's props. The materials are named b_<the base's name>,
# so the game dresses each part in the base's own colour for it (and in a new livery when the player changes theirs).
# The file base.blend keeps them all side by side (each finished building, then its tent and prefab forms), to be worked on by hand.
import json
wipe()
PLANS = json.load(open(os.path.join(ROOT, 'scripts', 'base_plans.json')))
C3 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1))); C3I = C3.inverted()     # the game's (x, y up, z) to Blender's (x, -z, y up)
def placed(e): return C3 @ Matrix((e[0::4], e[1::4], e[2::4], e[3::4])) @ C3I
def bmat(k, c): return mat('b_' + k if k else 'bx_' + c[1:], c)
def bar(name, rt, rb, h, seg, m):
    """A round (or square, or six-sided) bar standing on Blender's Z, its corners where the game's own would be, its rims cut."""
    ch = min(0.018, h * 0.12, max(rt, rb) * 0.25) if min(rt, rb) > 0.035 and seg > 6 else 0.0
    rings = [(-h / 2, rb - ch), (-h / 2 + ch, rb), (h / 2 - ch, rt), (h / 2, rt - ch)] if ch else [(-h / 2, rb), (h / 2, rt)]
    n = max(seg, 12) if seg > 8 else seg
    bm = bmesh.new(); rows = []
    for z, r in rings:
        if r < 1e-4: rows.append([bm.verts.new((0, 0, z))])
        else: rows.append([bm.verts.new((r * math.sin(i / n * 2 * math.pi), -r * math.cos(i / n * 2 * math.pi), z)) for i in range(n)])
    for a, b in zip(rows, rows[1:]):
        for i in range(n):
            q = [a[i % len(a)], a[(i + 1) % len(a)], b[(i + 1) % len(b)], b[i % len(b)]]; q = [v for j, v in enumerate(q) if v not in q[:j]]
            if len(q) >= 3:
                try: bm.faces.new(q)
                except ValueError: pass
    for row in (rows[0], rows[-1]):
        if len(row) >= 3: bm.faces.new(row)
    return _obj(name, bm, [m], None)
def odd(name, v, idx, m):
    """Any other shape, as the game made it (already where it stands)."""
    bm = bmesh.new(); vs = [bm.verts.new((v[i], -v[i + 2], v[i + 1])) for i in range(0, len(v), 3)]
    idx = idx if idx else list(range(len(vs)))
    for i in range(0, len(idx) - 2, 3):
        t = (vs[idx[i]], vs[idx[i + 1]], vs[idx[i + 2]])
        if len(set(t)) == 3:
            try: bm.faces.new(t)
            except ValueError: pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    return _obj(name, bm, [m], None)
try: ONLY     # (GC 0.67) a list of plan names builds just those
except NameError: ONLY = None
OUT = {}; COLS = 18; GAP = 7.0
for bi, (typ, plan) in enumerate(PLANS.items()):
    if ONLY and typ not in ONLY: continue
    CUR = coll('bld_' + typ)
    for n, p in enumerate(plan['parts']):
        m_ = bmat(p['k'], p['c']); nm = '%s_%03d' % (typ, n)
        if p['t'] == 'box':
            w, h, d = p['p']; lo = min(w, h, d)
            o = box(nm, (w, d, h), m=m_, bevel=min(0.03, 0.12 * lo) if lo > 0.03 else 0.0); o.matrix_world = placed(p['m'])
        elif p['t'] == 'cyl':
            rt, rb, h, seg = p['p']; o = bar(nm, rt, rb, h, int(seg), m_); o.matrix_world = placed(p['m'])
        else: o = odd(nm, p['v'], p['i'], m_)
    bpy.context.view_layer.update()
    OUT[typ] = export('bld_' + typ, CUR, {'stand': (lambda: None)}, None, lod=0)
    root = bpy.data.objects.new('bld_' + typ, None); CUR.objects.link(root)     # then each stands in its own place in the file
    for o in list(CUR.objects):
        if o is not root and o.parent is None: o.parent = root
    root.location = ((bi % COLS) * GAP - (COLS - 1) * GAP / 2, -(bi // COLS) * GAP, 0)
bpy.context.view_layer.update()
if not ONLY: PIC = [shot('base_a', dist=46, target=(-30, -7, 0.5), az=14, el=40, res=(1800, 1000))]
def pack(out=os.path.join(ROOT, 'renders', 'export', 'buildings.json')):
    """(GC 0.67) Every building's export, packed as the game reads them: assets/models/buildings.json."""
    P = {}
    for typ in PLANS:
        f = os.path.join(ROOT, 'export', 'bld_' + typ + '.json')
        if os.path.exists(f): P[typ] = json.load(open(f))
    with open(out, 'w') as fh: json.dump(P, fh, separators=(',', ':'))
    return len(P), os.path.getsize(out)
