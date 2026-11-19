# THE STATION'S PARTS, MADE IN BLENDER FROM THEIR PLANS. Run in Blender after gc_kit.py, with scripts/station_plans.json beside it
# (written by tools/blender/dump_station.py). Each plan is a part's structural pieces as triangles, each with its role. Here every
# closed piece is cleaned (flat faces joined) and its hard edges cut, and the part is written out as one model whose materials are
# named s_<role>, so the game can lay its own skins and its own materials (hull, blueprint, x-ray, cutaway) on each role.
# station.blend keeps every part side by side to be worked on by hand.
import json, struct
wipe()
PLANS = json.load(open(os.path.join(ROOT, 'scripts', 'station_plans.json')))
TONE = {'hull': '#8c9690', 'trim': '#f5d547', 'inner': '#59636b', 'hall': '#6b757d', 'wall': '#7b858c', 'dark': '#2a2e33', 'pod': '#a8b0b4'}
def piece(name, v, m):
    bm = bmesh.new(); vs = [bm.verts.new((v[i], -v[i + 2], v[i + 1])) for i in range(0, len(v), 3)]
    for i in range(0, len(vs) - 2, 3):
        if len({vs[i].co.to_tuple(4), vs[i + 1].co.to_tuple(4), vs[i + 2].co.to_tuple(4)}) == 3:
            try: bm.faces.new((vs[i], vs[i + 1], vs[i + 2]))
            except ValueError: pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.6), verts=bm.verts, edges=bm.edges)
    bm.edges.ensure_lookup_table(); closed = len(bm.edges) > 0 and all(len(e.link_faces) == 2 for e in bm.edges)
    if closed and len(bm.verts) <= 400:
        xs = [w.co for w in bm.verts]; dims = [max(c[k] for c in xs) - min(c[k] for c in xs) for k in range(3)]; off = min(0.035, 0.1 * min(dims))
        sharp = [e for e in bm.edges if e.calc_face_angle(0.0) > math.radians(35)]
        if off > 0.004 and sharp:
            try: bmesh.ops.bevel(bm, geom=sharp, offset=off, segments=1, affect='EDGES')
            except Exception: pass
    return _obj(name, bm, [m], None)
OUT = {}; FAIL = {}; COLS = 8; GAP = 16.0
for bi, (typ, pieces) in enumerate(PLANS.items()):
    CUR = coll('stn_' + typ)
    for n, p in enumerate(pieces): piece('%s_%03d' % (typ, n), p['v'], mat('s_' + p['r'], TONE.get(p['r'], '#7a848a')))
    bpy.context.view_layer.update()
    try: OUT[typ] = export('stn_' + typ, CUR, {'stand': (lambda: None)}, None, lod=0)
    except struct.error: FAIL[typ] = 'too many corners for one model'
    root = bpy.data.objects.new('stn_' + typ, None); CUR.objects.link(root)
    for o in list(CUR.objects):
        if o is not root and o.parent is None: o.parent = root
    root.location = ((bi % COLS) * GAP - (COLS - 1) * GAP / 2, -(bi // COLS) * GAP, 0)
bpy.context.view_layer.update()
