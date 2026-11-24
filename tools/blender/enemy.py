# THE ENEMY'S POSTS AND BUILDINGS (GC 0.67): each enemy its own look, and each building's ruin. Run after gc_kit.py:
#   exec(open(ROOT + r'\scripts\gc_kit.py').read()); exec(open(ROOT + r'\scripts\enemy.py').read())
# Three enemies, three ways of building, each from its own creatures:
#   the Molt     (bugs)     banded chitin, orange and dark brown, bone tusks, glowing sacs: things grown, not built
#   the Foundry  (bots)     rust-red riveted iron, soot, stacks and furnaces glowing red: things cast and bolted
#   the Talon    (lizards)  violet hide on great bones, standing stone, living crystal: things raised and worn
# For each: its nest (where its troops come from), its turret, and its four places worth taking out (a relay, a cache, a
# battery, a broadcast); the Foundry's great gun and the Talon's shield node besides.
# Each stands on the ground at the origin with a footprint radius of about one (the game sizes it), Z up, front to -Y.
# Two frames: `stand`, and `dead`: the same building fallen in (tall parts toppled one way, roofs and shells slumped onto
# the pile, lit parts gone out, rubble that was hidden under it scattered round). The game lets it fall from one to the
# other when it is destroyed, and leaves the ruin standing. Every piece touches another or the ground (test/floating.py).
# ONLY (a tuple of names, e.g. ('hive',)) builds just those.
import math, os, shutil, random
from mathutils import Vector, Matrix
R = math.radians; TAU = math.pi * 2
wipe()
# the Molt
ch = mat('e_m_chitin', '#b8742f', rough=0.7); ch_l = mat('e_m_chitin_l', '#d8994e', rough=0.7); ch_d = mat('e_m_chitin_d', '#4a2a12', rough=0.8)
mbone = mat('e_m_bone', '#efe2bf', rough=0.6); memb = mat('e_m_memb', '#7a2e22', rough=0.8); maw = mat('e_m_maw', '#1e0e08', rough=1.0)
silk = mat('e_m_silk', '#ddd3b8', rough=0.9); ichor = mat('e_m_ichor', '#ffd24a', emit=2.5)
# the Foundry
iron = mat('e_f_iron', '#7a2c22', rough=0.55, metal=0.5); iron_d = mat('e_f_iron_d', '#2a1512', rough=0.6, metal=0.4); steel = mat('e_f_steel', '#6e6a68', rough=0.45, metal=0.7)
brass = mat('e_f_brass', '#b08a3a', rough=0.4, metal=0.8); soot = mat('e_f_soot', '#1c1918', rough=0.9); fhot = mat('e_f_hot', '#ff7a2a', emit=3.0)
# the Talon
hide = mat('e_t_hide', '#6a3ea8', rough=0.85); hide_d = mat('e_t_hide_d', '#3b2066', rough=0.85); tbone = mat('e_t_bone', '#efe6cf', rough=0.6); tbone_d = mat('e_t_bone_d', '#bdb093', rough=0.7)
stone = mat('e_t_stone', '#5c5668', rough=0.95); stone_d = mat('e_t_stone_d', '#3c3846', rough=0.95); scale_g = mat('e_t_scale', '#2f7a5a', rough=0.7); gold = mat('e_t_gold', '#d8b24a', rough=0.4, metal=0.7)
cry = mat('e_t_crystal', '#d8ff6a', emit=2.5); cry_c = mat('e_t_crystal_c', '#7fe9ff', emit=2.5)
# the enemy's own colour, laid on by the game (bugs orange, bots red, lizards violet)
accent = mat('accent', '#ff7a1a'); accent_lit = mat('accent_lit', '#ff7a1a', emit=2.5)
OUTDIR = os.path.join(ROOT, 'renders', 'export'); os.makedirs(OUTDIR, exist_ok=True)

MADE = []
def start(name):
    global CUR
    CUR = coll(name); MADE.append(name); return CUR
def disc(name, r, h, z, m, sides=12, r2=None, at=(0, 0)): return cyl(name, (at[0], at[1], z), (at[0], at[1], z + h), r, m=m, sides=sides, r2=r2)
def ball(name, loc, m, r=0.05, sub=1, scale=(1, 1, 1)): return blob(name, r=r, loc=loc, sub=sub, m=m, scale=scale)
def V(*a): return Vector(a)
def bez(p0, p1, p2, n):
    """Points along a curve from p0 to p2, pulled toward p1."""
    p0, p1, p2 = V(*p0), V(*p1), V(*p2)
    return [(1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2 for t in (i / (n - 1) for i in range(n))]
def bone(name, p0, p1, p2, r, m, n=6, sides=6, knob=1.35, r_end=None):
    """A long bone along a curve, thicker at its two knuckles."""
    P = bez(p0, p1, p2, n); re = r if r_end is None else r_end; secs = []
    for i, p in enumerate(P):
        t = i / (n - 1); k = knob if i in (0, n - 1) else 1.0; rr = (r * (1 - t) + re * t) * k * (0.85 if 0 < i < n - 1 else 1.0)
        secs.append((tuple(p), rr, rr))
    return loft(name, secs, sides=sides, m=m)
def banded(name, secs, a, b, sides=10, rough=0.0, seed=0):
    """A loft whose spans alternate between two materials: the Molt's striped chitin."""
    return loft(name, secs, sides=sides, m=[a, b], seg_mats=[i % 2 for i in range(len(secs) - 1)], rough=rough, seed=seed)
def rivets(name, a, b, n, r, m):
    """A row of rivet heads from a to b."""
    a, b = V(*a), V(*b)
    for i in range(n): ball('%s%d' % (name, i), tuple(a.lerp(b, (i + 0.5) / n)), m, r, sub=1)
def rubble(n, r, mats, seed=3, size=(0.08, 0.22), at=(0, 0), squat=0.55):
    """Chunks that lie about the ruin. Standing, each is hidden on the ground under the building's middle (`hide_at`)."""
    rnd = random.Random(seed)
    for i in range(n):
        a = rnd.uniform(0, TAU); d = r * math.sqrt(rnd.uniform(0.08, 1.0)); s = rnd.uniform(*size)
        o = box('rub%d' % i, (s * rnd.uniform(0.8, 1.5), s * rnd.uniform(0.7, 1.3), s * squat), (at[0] + math.cos(a) * d, at[1] + math.sin(a) * d, s * squat * 0.4),
                m=mats[i % len(mats)], rot=(rnd.uniform(-0.4, 0.4), rnd.uniform(-0.4, 0.4), rnd.uniform(0, TAU)), bevel=s * 0.12)

# ---------------------------------------------------------------- the ruin: how a building falls in
UNIT = {}     # a part's name -> the assembly it falls with (a stack with its cap and bands, a tower with its horns)
from contextlib import contextmanager
@contextmanager
def unit(name):
    """Everything made inside this falls together, as one piece."""
    before = set(o.name for o in CUR.all_objects); yield
    for o in CUR.all_objects:
        if o.name not in before: UNIT[o.name] = name
def ruin(seed=1, fall=None, slump=(), stay=(), flat=(), hide_at=(0, 0), keep_z=0.16, k=None, sink=0.04):
    """Make the `dead` pose, piece by piece from the lowest up (a piece: a part, or an assembly made with `unit`). Pieces named in
    `stay` (or no higher than keep_z of the whole) do not move; those in `slump` sag where they stand, squashed toward the ground
    (a shell, a hall, a tent); a piece all lit goes out (shrinks into the heap), and a lit part of a piece goes out where it
    is; everything else topples (tall ones and those in `flat` lie down, the way the building falls: `fall`, radians, else at
    random) and comes to rest on whatever is under its middle by then: a ray cast down onto all that has been laid, so nothing
    is left in the air. Rubble (pieces named rub*) is hidden under the middle standing, and lies on the heap fallen."""
    from mathutils.bvhtree import BVHTree
    rnd = random.Random(seed); objs = [o for o in CUR.all_objects if o.type == 'MESH']
    M0 = {o.name: o.matrix_world.copy() for o in objs}
    wv = lambda o, M: [M @ v.co for v in o.data.vertices]
    lit = lambda o: all(m is not None and m.get('emit', 0) > 0 for m in o.data.materials)
    H = max(max(p.z for p in wv(o, M0[o.name])) for o in objs)
    a0 = rnd.uniform(0, TAU) if fall is None else fall; kk = k or rnd.uniform(0.36, 0.48)
    PV, PF = [], []
    def add(ms, T):
        for o in ms:
            if T.get(o.name) is None: continue
            base = len(PV); PV.extend(wv(o, T[o.name])); PF.extend([tuple(base + i for i in p.vertices) for p in o.data.polygons])
    def support(x, y):
        if not PF: return 0.0
        hit = BVHTree.FromPolygons(PV, PF).ray_cast(V(x, y, 60.0), V(0, 0, -1))
        return max(0.0, hit[0].z) if hit[0] is not None else 0.0
    def verts(ms, D): return [p for o in ms for p in wv(o, D @ M0[o.name])]
    def ext(W):
        xs = [p.x for p in W]; ys = [p.y for p in W]; zs = [p.z for p in W]
        return V((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, (min(zs) + max(zs)) / 2), max(max(xs) - min(xs), max(ys) - min(ys)), min(zs), max(zs)
    def out(o, D):     # a lit part goes out where it is: small, into the middle of what it was on
        c, _, _, _ = ext(wv(o, M0[o.name])); return D @ Matrix.Translation(c) @ Matrix.Scale(0.06, 4) @ Matrix.Translation(-c) @ M0[o.name]
    DEAD = {}; pieces = {}
    for o in objs: pieces.setdefault(UNIT.get(o.name, o.name), []).append(o)
    rubs = [k_ for k_ in pieces if k_.startswith('rub')]
    order = sorted([k_ for k_ in pieces if k_ not in rubs], key=lambda k_: min(p.z for o in pieces[k_] for p in wv(o, M0[o.name])))
    I = Matrix.Identity(4)
    for key in order:
        ms = pieces[key]; c, w, z0, z1 = ext(verts(ms, I)); h = z1 - z0
        named = lambda L: any(key.startswith(t) for t in L)
        if named(stay) or (z1 <= keep_z * H and not all(lit(o) for o in ms)):
            for o in ms: DEAD[o.name] = out(o, I) if lit(o) and len(ms) > 1 else M0[o.name]
            add(ms, DEAD); continue
        if all(lit(o) for o in ms):     # it goes out: down into the heap, small
            for o in ms: DEAD[o.name] = Matrix.Translation(V(c.x * 0.6, c.y * 0.6, 0.0)) @ Matrix.Scale(0.06, 4) @ Matrix.Translation(-c) @ M0[o.name]
            continue
        if named(slump):
            d = a0 + rnd.uniform(-1, 1); ax = V(-math.sin(d), math.cos(d), 0); piv = V(c.x, c.y, 0)
            D = Matrix.Translation(piv) @ Matrix.Rotation(R(rnd.uniform(3, 8)), 4, ax) @ Matrix.Diagonal((1.05, 1.05, kk, 1.0)) @ Matrix.Translation(-piv)
            lo = min(p.z for p in verts(ms, D)); D = Matrix.Translation(V(0, 0, max(0.0, -lo - 0.02))) @ D
        elif named(flat):     # it lies down on its flat side: its thinnest way turned up, then turned about at random
            import numpy as np
            P = np.array([tuple(p) for p in verts(ms, I)]); ev, evec = np.linalg.eigh(np.cov((P - P.mean(0)).T)); n = V(*evec[:, 0])
            if n.z < 0: n = -n
            Rm = n.rotation_difference(V(0, 0, 1)).to_matrix().to_4x4(); sp = Matrix.Rotation(rnd.uniform(0, TAU), 4, 'Z')
            out_ = V(math.cos(a0), math.sin(a0), 0) * (z0 * 0.3 + 0.1); piv = V(c.x, c.y, c.z)
            D = Matrix.Translation(out_) @ Matrix.Translation(piv) @ sp @ Rm @ Matrix.Translation(-piv)
            c2, _, lo, hi = ext(verts(ms, D)); D = Matrix.Translation(V(0, 0, support(c2.x, c2.y) - lo - min(sink, 0.25 * (hi - lo)))) @ D
        else:
            d = a0 + rnd.uniform(-0.75, 0.75); ax = V(-math.sin(d), math.cos(d), 0); piv = V(c.x, c.y, z0)
            th = R(rnd.uniform(70, 92)) if h > 1.4 * w or (h > 0.42 * H and h > 0.9 * w) else R(rnd.uniform(28, 55)) if h > 0.6 * w else R(rnd.uniform(6, 20))
            D = Matrix.Translation(piv) @ Matrix.Rotation(th, 4, ax) @ Matrix.Translation(-piv)
            c2, _, lo, hi = ext(verts(ms, D)); D = Matrix.Translation(V(0, 0, support(c2.x, c2.y) - lo - min(sink, 0.25 * (hi - lo)))) @ D
        for o in ms: DEAD[o.name] = out(o, D) if lit(o) else D @ M0[o.name]
        add(ms, DEAD)
    hide = Matrix.Translation(V(hide_at[0], hide_at[1], 0.0)); STAND = dict(M0)
    for key in rubs:     # standing: small, on the ground under the middle; fallen: where it was made, on the heap
        for o in pieces[key]:
            M = M0[o.name]; W = wv(o, M); x = sum(p.x for p in W) / len(W); y = sum(p.y for p in W) / len(W); lo = min(p.z for p in W); hi = max(p.z for p in W)
            STAND[o.name] = hide @ Matrix.Scale(0.05, 4) @ Matrix.Translation(-V(x, y, lo)) @ M
            DEAD[o.name] = Matrix.Translation(V(0, 0, support(x, y) - lo - min(sink, 0.25 * (hi - lo)))) @ M; add([o], DEAD)
    def pose(T):
        def f():
            for o in objs: o.matrix_world = T[o.name]
        return f
    return {'stand': pose(STAND), 'dead': pose(DEAD)}

def ship(fn, **kw):
    fn(); bpy.context.view_layer.update()
    fr = ruin(**{**getattr(fn, 'ruin', {}), **kw})
    o = export(MADE[-1], CUR, fr, lod=0)
    fr['stand'](); bpy.context.view_layer.update()
    shutil.copy(o['path'], os.path.join(OUTDIR, MADE[-1] + '.json'))
    return o
def how(**kw):
    def wrap(fn): fn.ruin = kw; return fn
    return wrap

# ================================================================ THE MOLT: grown
@how(seed=4, slump=('dome', 'skirt'), stay=('root',), flat=('rib',))
def hive():
    # the nest: a banded carapace dome over a skirt of plates, a maw at the front between two tusks, three chimneys breathing
    # spores, egg sacs bunched round its foot, a ridge of spines down its back
    start('prop_hive')
    blob('skirt', r=1.0, scale=(1, 1, 0.26), loc=(0, 0, 0.04), sub=2, m=ch_d, rough=0.18, seed=2)
    banded('dome', [((0, 0, 0.05), 0.9, 0.9), ((0, 0, 0.42), 0.88, 0.86), ((0, 0.02, 0.76), 0.76, 0.74), ((0, 0.04, 1.04), 0.58, 0.56), ((0, 0.06, 1.24), 0.36, 0.35), ((0, 0.06, 1.36), 0.1, 0.1)], ch, ch_d, sides=11, rough=0.05, seed=1)
    for i, (x, z, s) in enumerate([(0, 0.38, 1.0)]):
        o = disc('mawring', 0.34, 0.12, 0, ch_l, 10, r2=0.3); o.location = (x, -0.8, z); o.rotation_euler = (R(78), 0, 0)
        o = disc('maw', 0.27, 0.14, 0, maw, 10); o.location = (x, -0.8, z); o.rotation_euler = (R(78), 0, 0)
    for i in range(8):     # teeth round the maw
        a = i / 8 * TAU; c, s = math.cos(a), math.sin(a)
        spike('tooth%d' % i, (c * 0.3, -0.84, 0.38 + s * 0.3), (c * 0.2, -0.98, 0.38 + s * 0.2), 0.04, m=mbone)
    for s in (-1, 1):     # the tusks
        spike('tusk%d' % (s > 0), (s * 0.42, -0.72, 0.3), (s * 0.16, -1.22, 0.06), 0.1, m=mbone, flat=0.8)
        bone('rib%d' % (s > 0), (s * 0.78, -0.3, 0.08), (s * 1.02, 0.1, 0.95), (s * 0.28, 0.36, 1.2), 0.055, mbone, n=7)
    for i, (x, y, h, r) in enumerate([(0.0, 0.18, 0.55, 0.13), (0.34, 0.3, 0.42, 0.1), (-0.3, 0.36, 0.36, 0.09)]):
        z = 1.3 - math.hypot(x, y - 0.06) * 0.9
        with unit('chim%d' % i):
            banded('chim%d' % i, [((x, y, z - 0.1), r * 1.3, r * 1.3), ((x, y, z + h * 0.45), r, r), ((x + 0.02, y, z + h * 0.8), r * 0.8, r * 0.8), ((x + 0.03, y, z + h), r * 1.05, r * 1.05)], ch_l, ch_d, sides=8)
            disc('puff%d' % i, r * 0.8, 0.05, z + h - 0.02, accent_lit, 8, at=(x + 0.03, y))
    for i in range(6):     # the spines down its back
        t = i / 5; y = -0.1 + t * 0.85; z = 1.32 - t * 0.95
        spike('spine%d' % i, (0, y, z - 0.08), (0, y + 0.18, z + 0.24 - t * 0.08), 0.05, m=ch_d, flat=0.4)
    for i, (a, r, z, s) in enumerate([(0.9, 0.86, 0.1, 0.16), (1.15, 0.92, 0.12, 0.13), (1.0, 0.98, 0.26, 0.11), (2.4, 0.88, 0.12, 0.15), (2.15, 0.95, 0.1, 0.12), (4.0, 0.9, 0.1, 0.14), (4.3, 0.84, 0.24, 0.11)]):
        ball('sac%d' % i, (math.cos(a) * r, math.sin(a) * r, z), accent_lit, s, sub=2, scale=(1, 1, 1.15))
    for i in range(5):     # roots gripping the ground
        a = i / 5 * TAU + 0.6; spike('root%d' % i, (math.cos(a) * 0.82, math.sin(a) * 0.82, 0.12), (math.cos(a) * 1.18, math.sin(a) * 1.18, 0.0), 0.08, m=ch_d)
    rubble(14, 1.15, [ch, ch_d, ch_l, mbone], seed=4)

@how(seed=7, slump=('bulb', 'base'), stay=('claw',))
def turret_bugs():
    # the spitter: a banded bulb on three claws, its neck reaching forward to a maw full of acid; sacs of it on its back
    start('prop_turret_bugs')
    blob('base', r=0.62, scale=(1, 1, 0.42), loc=(0, 0.08, 0.1), sub=2, m=ch_d, rough=0.14, seed=3)
    banded('bulb', [((0, 0.12, 0.18), 0.5, 0.5), ((0, 0.12, 0.42), 0.55, 0.54), ((0, 0.1, 0.66), 0.48, 0.46), ((0, 0.06, 0.84), 0.32, 0.3), ((0, 0.02, 0.94), 0.16, 0.16)], ch, ch_d, sides=10)
    U = unit('neck'); U.__enter__()
    banded('neck', [((0, -0.05, 0.82), 0.2, 0.2), ((0, -0.3, 0.98), 0.17, 0.17), ((0, -0.56, 1.0), 0.15, 0.15), ((0, -0.8, 0.92), 0.14, 0.14), ((0, -0.96, 0.82), 0.17, 0.17)], ch_l, ch_d, sides=8)
    loft('head', [((0, -0.9, 0.85), 0.2, 0.2), ((0, -1.08, 0.76), 0.22, 0.19), ((0, -1.2, 0.7), 0.17, 0.14)], sides=8, m=ch)
    ball('spit', (0, -1.17, 0.71), accent_lit, 0.12, sub=2)
    for i, (x, z) in enumerate([(-0.1, 0.8), (0.1, 0.8), (-0.13, 0.62), (0.13, 0.62)]):
        spike('fang%d' % i, (x, -1.12, z), (x * 0.6, -1.32, z - 0.08 if z > 0.7 else z + 0.06), 0.035, m=mbone)
    U.__exit__(None, None, None)
    for i in range(3):
        a = R(90) + i * R(120) + R(60); c, s = math.cos(a), math.sin(a)
        bone('claw%d' % i, (c * 0.4, 0.08 + s * 0.4, 0.22), (c * 0.85, 0.08 + s * 0.85, 0.42), (c * 0.98, 0.08 + s * 0.98, 0.0), 0.05, ch_d, n=6, r_end=0.012, knob=1.2)
    for i, (x, y, z, s) in enumerate([(-0.24, 0.42, 0.62, 0.16), (0.22, 0.46, 0.56, 0.14), (0.0, 0.56, 0.4, 0.13)]): ball('sac%d' % i, (x, y, z), accent_lit, s, sub=2)
    for i in range(4): t = i / 3; spike('spine%d' % i, (0, 0.2 + t * 0.3, 0.9 - t * 0.4), (0, 0.38 + t * 0.3, 1.08 - t * 0.36), 0.04, m=mbone, flat=0.5)
    rubble(8, 0.8, [ch, ch_d, mbone], seed=7, size=(0.06, 0.16))

@how(seed=11, slump=('mound',), stay=('root',))
def relay_bugs():
    # the scent relay: a segmented stalk from a mound, a glowing node at its top, two long feelers arching off it
    start('poi_relay_bugs')
    blob('mound', r=0.92, scale=(1, 1, 0.3), loc=(0, 0, 0.02), sub=2, m=ch_d, rough=0.2, seed=5)
    U = unit('stalk'); U.__enter__()
    banded('stalk', [((0, 0, 0.1), 0.26, 0.26), ((0.02, 0, 0.55), 0.19, 0.19), ((0.05, 0.02, 1.0), 0.16, 0.16), ((0.04, 0.03, 1.4), 0.14, 0.14), ((0, 0.02, 1.72), 0.16, 0.16)], ch, ch_d, sides=9)
    ball('node', (0, 0.02, 1.84), accent_lit, 0.2, sub=2, scale=(1, 1, 1.2)); disc('cup', 0.2, 0.08, 1.68, ch_l, 9, r2=0.24, at=(0, 0.02))
    for s in (-1, 1):
        P = bez((s * 0.08, 0.02, 1.96), (s * 0.55, -0.2, 2.35), (s * 0.95, -0.45, 1.95), 8)
        loft('feeler%d' % (s > 0), [(tuple(p), 0.035 * (1 - i / 9), 0.035 * (1 - i / 9)) for i, p in enumerate(P)], sides=5, m=ch_d)
        for k in range(2, 7):
            p = P[k]; spike('barb%d_%d' % (s > 0, k), tuple(p), (p.x + s * 0.02, p.y - 0.14, p.z - 0.1), 0.014, m=mbone, sides=3)
    U.__exit__(None, None, None)
    for i, (x, y, h) in enumerate([(0.5, 0.3, 0.7), (-0.46, 0.36, 0.55), (0.18, -0.55, 0.45)]):
        with unit('sub%d' % i):
            banded('sub%d' % i, [((x, y, 0.08), 0.12, 0.12), ((x, y, h * 0.6), 0.09, 0.09), ((x, y, h), 0.1, 0.1)], ch_l, ch_d, sides=7)
            ball('subnode%d' % i, (x, y, h + 0.06), accent_lit, 0.08)
    for i in range(4): a = i / 4 * TAU + 0.3; spike('root%d' % i, (math.cos(a) * 0.7, math.sin(a) * 0.7, 0.14), (math.cos(a) * 1.08, math.sin(a) * 1.08, 0.0), 0.07, m=ch_d)
    rubble(10, 1.05, [ch, ch_d, ch_l], seed=11)

@how(seed=13, stay=('floor', 'pod'), flat=('rib',))
def cache_bugs():
    # the larder: great bone ribs arched over a heap of silk cocoons and lumps of amber, a shell roof plate on the ribs
    start('poi_cache_bugs')
    blob('floor', r=0.95, scale=(1, 1, 0.12), loc=(0, 0, 0.0), sub=2, m=ch_d, rough=0.2, seed=8)
    for i, x in enumerate((-0.55, 0.0, 0.55)):
        bone('rib%d' % i, (x, -0.78, 0.04), (x, -0.1, 1.6), (x, 0.78, 0.04), 0.06, mbone, n=9, knob=1.4)
    P = bez((0, -0.78, 0.04), (0, -0.1, 1.6), (0, 0.78, 0.04), 11)
    with unit('roof'):
        banded('roof', [(tuple(p + V(0, 0, 0.075)), 0.74, 0.035) for p in P[2:9]], ch, ch_d, sides=4)
        for i, p in enumerate(P[3:8]): spike('ridge%d' % i, tuple(p + V(0, 0, 0.09)), tuple(p + V(0, 0.08, 0.24)), 0.04, m=ch_d, flat=0.4)
    for i, (x, y, s) in enumerate([(-0.3, -0.1, 0.24), (0.15, 0.1, 0.27), (0.42, -0.25, 0.2), (-0.1, 0.35, 0.22), (0.4, 0.38, 0.18), (-0.5, 0.3, 0.19), (0.0, -0.4, 0.2)]):
        o = ball('pod%d' % i, (x, y, s * 0.85), silk, s, sub=2, scale=(1, 0.8, 1.35)); o.rotation_euler = (R(20 * (i % 3 - 1)), R(30 * ((i * 7) % 3 - 1)), 0)
    for i, (x, y, s) in enumerate([(-0.15, -0.55, 0.12), (0.62, 0.0, 0.11), (-0.62, -0.25, 0.1), (0.25, 0.6, 0.1)]):
        o = box('amber%d' % i, (s, s * 0.8, s * 1.6), (x, y, s * 0.7), m=ichor, rot=(R(12 * i), R(-10 * i), R(37 * i)), taper=0.4)
    rubble(10, 1.05, [mbone, ch, silk], seed=13)

@how(seed=17, slump=('ring',), stay=('vein',), flat=('rib',))
def battery_bugs():
    # the brood heart: a great glowing sac held up in a cradle of bone ribs, veins running from it into the ground
    start('poi_battery_bugs')
    blob('ring', r=0.9, scale=(1, 1, 0.28), loc=(0, 0, 0.04), sub=2, m=ch_d, rough=0.16, seed=9)
    banded('cradle', [((0, 0, 0.12), 0.5, 0.5), ((0, 0, 0.42), 0.36, 0.36), ((0, 0, 0.62), 0.42, 0.42)], ch, ch_d, sides=10)
    ball('heart', (0, 0, 1.12), accent_lit, 0.5, sub=2, scale=(1, 1, 1.15))
    ball('core', (0.0, -0.36, 1.18), ichor, 0.22, sub=2)     # (bulging from the heart's front)
    for i in range(6):
        a = i / 6 * TAU + 0.25; c, s = math.cos(a), math.sin(a)
        bone('rib%d' % i, (c * 0.38, s * 0.38, 0.55), (c * 0.92, s * 0.92, 1.05), (c * 0.3, s * 0.3, 1.7), 0.045, mbone, n=8, r_end=0.02)
    for i in range(5):
        a = i / 5 * TAU + 0.7; c, s = math.cos(a), math.sin(a)
        P = bez((c * 0.4, s * 0.4, 0.7), (c * 0.75, s * 0.75, 0.55), (c * 1.05, s * 1.05, 0.0), 6)
        loft('vein%d' % i, [(tuple(p), 0.05 - k * 0.005, 0.05 - k * 0.005) for k, p in enumerate(P)], sides=6, m=memb)
    rubble(10, 1.05, [ch, mbone, memb], seed=17)

@how(seed=19, slump=('base',), stay=('root',))
def broadcast_bugs():
    # the chorus: a banded column with resonating horns opening out round it, membrane between them, a glowing throat in each
    start('poi_broadcast_bugs')
    blob('base', r=0.9, scale=(1, 1, 0.3), loc=(0, 0, 0.02), sub=2, m=ch_d, rough=0.2, seed=10)
    U = unit('column'); U.__enter__()
    banded('column', [((0, 0, 0.1), 0.34, 0.34), ((0, 0, 0.6), 0.24, 0.24), ((0, 0, 1.1), 0.2, 0.2), ((0, 0, 1.6), 0.18, 0.18), ((0, 0, 1.95), 0.24, 0.24), ((0, 0, 2.05), 0.06, 0.06)], ch, ch_d, sides=9)
    for i, (a, z, L) in enumerate([(R(-90), 1.55, 0.7), (R(30), 1.35, 0.62), (R(150), 1.15, 0.6), (R(-30), 0.85, 0.5), (R(210), 0.65, 0.45)]):
        c, s = math.cos(a), math.sin(a)
        loft('horn%d' % i, [((c * 0.12, s * 0.12, z - 0.1), 0.08, 0.08), ((c * L * 0.5, s * L * 0.5, z + 0.02), 0.11, 0.11), ((c * L, s * L, z + 0.18), 0.24, 0.24)], sides=9, m=ch_l, cap=False)
        ball('throat%d' % i, (c * L * 0.62, s * L * 0.62, z + 0.06), accent_lit, 0.125, sub=2)
    U.__exit__(None, None, None)
    for i in range(4): a = i / 4 * TAU + 0.8; spike('root%d' % i, (math.cos(a) * 0.7, math.sin(a) * 0.7, 0.12), (math.cos(a) * 1.06, math.sin(a) * 1.06, 0.0), 0.07, m=ch_d)
    rubble(10, 1.05, [ch, ch_d, ch_l], seed=19)

# ================================================================ THE FOUNDRY: cast and bolted
@how(seed=23, slump=('hall', 'roof'), stay=('apron', 'pad'))
def fab():
    # the works: a riveted iron hall under a sawtooth roof lit along its teeth, a furnace door glowing at the front, three
    # banded stacks, a conveyor up to the roof from an ore bin, a gantry crane over the yard
    start('prop_fab')
    box('apron', (1.9, 1.6, 0.06), (0, 0, 0.03), m=soot)
    box('hall', (1.4, 1.1, 0.72), (-0.05, 0.05, 0.42), m=iron, bevel=0.03)
    for i in range(3):     # the sawtooth roof: a steep lit face to the front, a long slope behind
        x = -0.52 + i * 0.47
        box('roof%d' % i, (0.47, 1.14, 0.06), (x, 0.05, 0.86), m=iron_d, rot=(0, R(-24), 0))
        box('tooth%d' % i, (0.04, 1.1, 0.19), (x + 0.215, 0.05, 0.86), m=accent_lit)
    box('door', (0.5, 0.06, 0.46), (-0.05, -0.51, 0.31), m=fhot); box('doorframe', (0.62, 0.08, 0.56), (-0.05, -0.49, 0.34), m=iron_d)
    box('lintel', (0.7, 0.12, 0.08), (-0.05, -0.52, 0.62), m=steel)
    for s in (-1, 1): rivets('rv%d' % (s > 0), (-0.7, s * 0.6, 0.72), (0.6, s * 0.6, 0.72), 9, 0.018, steel)
    for i, (x, y, r, h) in enumerate([(-0.5, 0.4, 0.11, 1.5), (-0.18, 0.44, 0.09, 1.25), (0.14, 0.44, 0.08, 1.05)]):
        with unit('stack%d' % i):
            disc('stack%d' % i, r, h, 0.78, steel, 9, at=(x, y)); disc('cap%d' % i, r * 1.25, 0.08, 0.78 + h, iron_d, 9, at=(x, y))
            disc('glow%d' % i, r * 0.9, 0.02, 0.86 + h, accent_lit, 9, at=(x, y))
            for k in range(2): disc('band%d_%d' % (i, k), r * 1.15, 0.05, 0.9 + h * (0.35 + k * 0.3), iron, 9, at=(x, y))
    box('bin', (0.42, 0.46, 0.36), (0.88, -0.38, 0.24), m=iron_d, bevel=0.02, taper=1.18); box('ore', (0.38, 0.4, 0.08), (0.88, -0.38, 0.44), m=fhot)
    with unit('belt'):
        box('belt', (0.16, 0.86, 0.05), (0.88, 0.05, 0.62), m=soot, rot=(R(28), 0, 0))
        for k, y in enumerate((-0.12, 0.22)): cyl('beltleg%d' % k, (0.88, y, 0.0), (0.88, y, 0.52 + (y + 0.12) * 0.55), 0.025, m=steel, sides=5)
    with unit('gantry'):
        for k, (x, y) in enumerate([(0.6, -0.72), (-0.7, -0.72)]): cyl('gleg%d' % k, (x, y, 0.0), (x, y, 1.05), 0.03, m=steel, sides=6)
        box('gantry', (1.42, 0.07, 0.07), (-0.05, -0.72, 1.06), m=iron); box('trolley', (0.14, 0.12, 0.08), (0.3, -0.72, 1.0), m=iron_d)
        cyl('hook', (0.3, -0.72, 0.97), (0.3, -0.72, 0.7), 0.01, m=soot, sides=3); box('load', (0.16, 0.16, 0.12), (0.3, -0.72, 0.64), m=steel)
    for i, z in enumerate((0.18, 0.3)): cyl('pipe%d' % i, (-0.77, -0.4, z), (-0.77, 0.55, z), 0.04, m=steel, sides=6)
    rubble(14, 1.15, [iron, iron_d, steel, soot], seed=23)

@how(seed=29, stay=('base', 'ring', 'rv'))
def turret_bots():
    # an iron turret: an eight-sided riveted base, a slab-sided housing with a sloped glacis, one heavy gun with a muzzle brake
    # and a lighter one beside it, a periscope with a glowing slit, an exhaust stack at the back
    start('prop_turret_bots')
    disc('base', 0.62, 0.22, 0, iron_d, 8, r2=0.56); disc('ring', 0.5, 0.06, 0.22, steel, 8)
    for i in range(8): a = (i + 0.5) / 8 * TAU; ball('rv%d' % i, (math.cos(a) * 0.58, math.sin(a) * 0.58, 0.16), steel, 0.025, sub=1)
    U = unit('housing'); U.__enter__()
    box('housing', (0.7, 0.8, 0.36), (0, 0.08, 0.46), m=iron, bevel=0.03, taper=0.86)
    box('glacis', (0.66, 0.3, 0.08), (0, -0.38, 0.5), m=iron, rot=(R(-38), 0, 0))
    box('roof', (0.6, 0.66, 0.06), (0, 0.08, 0.66), m=iron_d)
    cyl('mantlet', (0, -0.38, 0.5), (0, -0.5, 0.5), 0.12, m=iron_d, sides=8)
    cyl('gun', (0, -0.42, 0.5), (0, -1.42, 0.52), 0.06, m=steel, sides=8)
    for k in range(2): cyl('gband%d' % k, (0, -0.65 - k * 0.3, 0.505), (0, -0.7 - k * 0.3, 0.505), 0.075, m=iron_d, sides=8)
    box('brake', (0.2, 0.18, 0.11), (0, -1.42, 0.52), m=iron_d, bevel=0.02); box('brakeslot', (0.22, 0.04, 0.05), (0, -1.38, 0.52), m=soot)
    cyl('coax', (0.22, -0.4, 0.44), (0.22, -0.92, 0.44), 0.03, m=steel, sides=6)
    box('scope', (0.14, 0.14, 0.16), (-0.18, -0.12, 0.76), m=iron_d); box('slit', (0.11, 0.02, 0.04), (-0.18, -0.195, 0.79), m=accent_lit)
    disc('exhaust', 0.06, 0.34, 0.6, steel, 7, at=(0.22, 0.4)); disc('exglow', 0.05, 0.02, 0.94, fhot, 7, at=(0.22, 0.4))
    for s in (-1, 1): box('skirt%d' % (s > 0), (0.05, 0.74, 0.24), (s * 0.38, 0.08, 0.38), m=iron_d)
    U.__exit__(None, None, None)
    rubble(8, 0.8, [iron, iron_d, steel], seed=29, size=(0.06, 0.15))

@how(seed=31, stay=('pit', 'floor', 'plate', 'race'))
def cannon():
    # the great gun: an eight-sided iron pit, a cradle on recoil rams, a long banded barrel at the sky with a muzzle brake, the
    # breech glowing, a shell hoist behind, a stack for its boiler
    start('prop_cannon')
    disc('pit', 0.98, 0.3, 0, iron_d, 8, r2=0.9); disc('floor', 0.82, 0.04, 0.3, soot, 8)
    for i in range(8): a = (i + 0.5) / 8 * TAU; box('plate%d' % i, (0.62, 0.05, 0.26), (math.cos(a) * 0.93, math.sin(a) * 0.93, 0.14), m=iron, rot=(R(-8), 0, a + math.pi / 2))
    disc('race', 0.56, 0.12, 0.34, steel, 12)
    U = unit('gun'); U.__enter__()
    box('cradle', (0.78, 0.9, 0.5), (0, 0.1, 0.7), m=iron, bevel=0.04, taper=0.82)
    for s in (-1, 1): box('cheek%d' % (s > 0), (0.08, 0.86, 0.7), (s * 0.42, 0.08, 0.82), m=iron_d, taper=0.7)
    cyl('breech', (0, 0.42, 0.78), (0, 0.06, 1.08), 0.27, m=iron_d, sides=10); disc('breechglow', 0.18, 0.02, 0, fhot, 10).matrix_world = Matrix.Translation(V(0, 0.44, 0.76)) @ V(0, 0.8, -0.6).to_track_quat('Z', 'Y').to_matrix().to_4x4()
    cyl('barrel', (0, 0.1, 1.0), (0, -1.25, 2.25), 0.17, m=iron, sides=10, r2=0.13)
    for k in range(4): t = 0.15 + k * 0.22; p = V(0, 0.1, 1.0).lerp(V(0, -1.25, 2.25), t); cyl('band%d' % k, tuple(p - V(0, -0.04, 0.037)), tuple(p + V(0, -0.04, 0.037)), 0.2 - t * 0.05, m=iron_d, sides=10)
    cyl('brake', (0, -1.18, 2.19), (0, -1.38, 2.37), 0.19, m=iron_d, sides=8); ball('bore', (0, -1.37, 2.36), accent_lit, 0.1)
    for s in (-1, 1): cyl('ram%d' % (s > 0), (s * 0.3, 0.32, 0.62), (s * 0.24, -0.3, 1.3), 0.06, m=steel, sides=7)
    U.__exit__(None, None, None)
    box('hoist', (0.3, 0.3, 0.9), (0.56, 0.55, 0.75), m=iron_d, bevel=0.02); box('shell', (0.12, 0.12, 0.3), (0.56, 0.36, 0.5), m=brass)
    disc('stack', 0.08, 0.9, 0.34, steel, 8, at=(-0.55, 0.55)); disc('stackglow', 0.07, 0.02, 1.24, accent_lit, 8, at=(-0.55, 0.55))
    rubble(12, 1.1, [iron, iron_d, steel], seed=31)

@how(seed=37, stay=('hut', 'base', 'spool'))
def relay_bots():
    # the transmitter: a tapering riveted iron pylon with crossbars, a dish on an arm near its top, red lamps up it, a generator
    # hut at its foot and cable spools
    start('poi_relay_bots')
    box('base', (0.7, 0.7, 0.16), (0, 0, 0.08), m=iron_d, bevel=0.02)
    U = unit('tower'); U.__enter__()
    for i in range(4):
        sx, sy = (1 if i in (0, 1) else -1), (1 if i in (0, 3) else -1)
        cyl('leg%d' % i, (sx * 0.28, sy * 0.28, 0.14), (sx * 0.08, sy * 0.08, 2.05), 0.035, m=iron, sides=5)
    for k, z in enumerate((0.55, 1.0, 1.45, 1.85)):
        w = 0.28 - (z - 0.14) / 1.91 * 0.2
        for j, (a, b) in enumerate([((-w, -w), (w, -w)), ((w, -w), (w, w)), ((w, w), (-w, w)), ((-w, w), (-w, -w))]):
            cyl('bar%d_%d' % (k, j), (a[0], a[1], z), (b[0], b[1], z), 0.018, m=iron_d, sides=4)
        ball('lamp%d' % k, (w + 0.03, -w - 0.03, z), accent_lit, 0.04)
    disc('top', 0.12, 0.1, 2.02, iron_d, 8); ball('beacon', (0, 0, 2.17), accent_lit, 0.07)
    cyl('arm', (0, -0.1, 1.85), (0, -0.44, 1.85), 0.03, m=iron, sides=5)
    o = blob('dish', r=0.34, scale=(1, 0.22, 1), sub=2, m=steel); o.location = (0, -0.5, 1.86); o.rotation_euler = (R(-20), 0, 0)
    cyl('feed', (0, -0.52, 1.86), (0, -0.78, 1.92), 0.015, m=iron_d, sides=4); ball('feedtip', (0, -0.78, 1.92), accent_lit, 0.03)
    U.__exit__(None, None, None)
    box('hut', (0.5, 0.42, 0.38), (0.62, 0.5, 0.19), m=iron, bevel=0.02); box('hutroof', (0.56, 0.48, 0.05), (0.62, 0.5, 0.4), m=iron_d)
    box('vent', (0.18, 0.02, 0.12), (0.62, 0.28, 0.24), m=fhot); disc('hutstack', 0.04, 0.2, 0.42, steel, 6, at=(0.75, 0.6))
    for i, (x, y) in enumerate([(-0.6, 0.45), (-0.62, -0.35)]):
        o = disc('spool%d' % i, 0.18, 0.12, 0, iron_d, 10); o.location = (x, y, 0.18); o.rotation_euler = (R(90), 0, R(30 * i))
    cyl('cable', (-0.5, 0.42, 0.04), (-0.2, 0.18, 0.04), 0.02, m=soot, sides=4)
    rubble(10, 1.0, [iron, iron_d, steel], seed=37)

@how(seed=41, stay=('pad', 'crate', 'barrel'))
def cache_bots():
    # the stockpile: iron crates stacked two high, drums of fuel banded red, a corrugated lean-to on posts, a jib crane
    start('poi_cache_bots')
    box('pad', (1.8, 1.5, 0.06), (0, 0, 0.03), m=soot)
    for i, (x, y, z, s) in enumerate([(-0.45, 0.25, 0.06, 0.42), (0.02, 0.25, 0.06, 0.42), (-0.22, 0.25, 0.455, 0.4), (0.5, 0.3, 0.06, 0.36), (-0.5, -0.3, 0.06, 0.34)]):
        box('crate%d' % i, (s, s * 0.9, s * 0.95), (x, y, z + s * 0.475), m=iron if i % 2 == 0 else iron_d, bevel=0.02)
        box('crateband%d' % i, (s * 1.02, s * 0.12, s * 0.97), (x, y, z + s * 0.475), m=steel)
    for i, (x, y) in enumerate([(0.15, -0.35), (0.38, -0.42), (0.27, -0.16), (0.62, -0.2)]):
        disc('barrel%d' % i, 0.11, 0.34, 0.06, iron_d, 9, at=(x, y)); disc('barrelband%d' % i, 0.115, 0.05, 0.28, accent_lit, 9, at=(x, y))
    for i, (x, y) in enumerate([(-0.8, 0.62), (0.8, 0.62), (-0.8, 0.0), (0.8, 0.0)]): cyl('post%d' % i, (x, y, 0.06), (x, y, 0.88 + (0.62 - y) * 0.25), 0.03, m=steel, sides=5)
    box('lean', (1.72, 0.8, 0.04), (0, 0.31, 0.96), m=iron, rot=(R(-12), 0, 0))
    for k in range(6): box('rib%d' % k, (0.03, 0.82, 0.025), (-0.75 + k * 0.3, 0.31, 0.99), m=iron_d, rot=(R(-12), 0, 0))
    cyl('jibpost', (0.75, -0.6, 0.06), (0.75, -0.6, 1.2), 0.04, m=iron, sides=6); cyl('jib', (0.75, -0.6, 1.18), (0.15, -0.6, 1.22), 0.03, m=iron, sides=5)
    cyl('jibline', (0.22, -0.6, 1.2), (0.22, -0.6, 0.8), 0.008, m=soot, sides=3); box('jibload', (0.2, 0.2, 0.16), (0.22, -0.6, 0.72), m=steel)
    rubble(10, 1.0, [iron, iron_d, steel, soot], seed=41)

@how(seed=43, stay=('plinth', 'xfmr'))
def battery_bots():
    # the capacitor bank: three tall cells wound with brass coils and glowing at their caps, on an iron plinth; insulator
    # stacks, a transformer and heavy cables to it
    start('poi_battery_bots')
    box('plinth', (1.5, 0.9, 0.2), (0, 0.1, 0.1), m=iron_d, bevel=0.03)
    for i, x in enumerate((-0.48, 0.0, 0.48)):
        with unit('cell%d' % i):
            disc('cell%d' % i, 0.2, 1.3, 0.2, steel, 12, at=(x, 0.12))
            for k in range(4): disc('coil%d_%d' % (i, k), 0.225, 0.08, 0.42 + k * 0.24, brass, 12, at=(x, 0.12))
            disc('cap%d' % i, 0.23, 0.08, 1.5, iron_d, 12, at=(x, 0.12)); disc('glow%d' % i, 0.15, 0.05, 1.58, accent_lit, 12, at=(x, 0.12))
            for k in range(3): disc('ins%d_%d' % (i, k), 0.06 - k * 0.008, 0.05, 1.63 + k * 0.05, mbone, 8, at=(x, 0.12))
    box('xfmr', (0.5, 0.4, 0.48), (0.45, -0.6, 0.24), m=iron, bevel=0.02)
    for k in range(4): box('fin%d' % k, (0.04, 0.44, 0.4), (0.24 + k * 0.14, -0.6, 0.24), m=iron_d)
    box('warn', (0.2, 0.02, 0.12), (0.45, -0.81, 0.35), m=accent_lit)
    for i, x in enumerate((-0.48, 0.0)):
        P = bez((x, -0.06, 0.24), (x * 0.5 + 0.1, -0.55, 0.0), (0.22, -0.6, 0.12), 6); loft('cable%d' % i, [(tuple(p), 0.03, 0.03) for p in P], sides=5, m=soot)
    rubble(10, 1.0, [iron, steel, brass], seed=43)

@how(seed=47, stay=('foot',))
def broadcast_bots():
    # the loudspeaker tower: an iron trestle, a screen glowing in the enemy's colour, three horns at the top facing out, a beacon
    start('poi_broadcast_bots')
    for i, (x, y) in enumerate([(-0.5, -0.4), (0.5, -0.4), (-0.5, 0.4), (0.5, 0.4)]):
        box('foot%d' % i, (0.2, 0.2, 0.12), (x, y, 0.06), m=iron_d)
    U = unit('tower'); U.__enter__()
    for i, (x, y) in enumerate([(-0.5, -0.4), (0.5, -0.4), (-0.5, 0.4), (0.5, 0.4)]): cyl('leg%d' % i, (x, y, 0.12), (x * 0.45, y * 0.45, 1.9), 0.04, m=iron, sides=5)
    for k, z in enumerate((0.55, 1.05, 1.5)):
        f = 1 - (z - 0.12) / 1.78 * 0.55
        for j, (a, b) in enumerate([((-0.5, -0.4), (0.5, -0.4)), ((0.5, -0.4), (0.5, 0.4)), ((0.5, 0.4), (-0.5, 0.4)), ((-0.5, 0.4), (-0.5, -0.4))]):
            cyl('bar%d_%d' % (k, j), (a[0] * f, a[1] * f, z), (b[0] * f, b[1] * f, z), 0.02, m=iron_d, sides=4)
    box('screenback', (0.92, 0.1, 0.62), (0, -0.33, 1.15), m=iron_d, bevel=0.02); box('screen', (0.82, 0.03, 0.52), (0, -0.39, 1.15), m=accent_lit)
    disc('deck', 0.36, 0.08, 1.9, iron_d, 8)
    for i, a in enumerate((R(-90), R(30), R(150))):
        c, s = math.cos(a), math.sin(a)
        loft('horn%d' % i, [((c * 0.1, s * 0.1, 2.08), 0.07, 0.07), ((c * 0.38, s * 0.38, 2.12), 0.1, 0.1), ((c * 0.62, s * 0.62, 2.18), 0.24, 0.2)], sides=8, m=steel, cap=False)
        cyl('hornback%d' % i, (c * 0.06, s * 0.06, 1.98), (c * 0.14, s * 0.14, 2.1), 0.09, m=iron, sides=8)
    disc('mast', 0.04, 0.4, 1.98, iron, 6); ball('beacon', (0, 0, 2.42), accent_lit, 0.07)
    U.__exit__(None, None, None)
    rubble(10, 1.0, [iron, iron_d, steel], seed=47)

# ================================================================ THE TALON: raised and worn
@how(seed=53, slump=('tent', 'skirt', 'door'), stay=('ring', 'stake'), flat=('rib', 'pole'))
def camp():
    # the roost: a broad hide pavilion stretched over great curved ribs, a crown of bone claws holding a living crystal, a
    # doorway of two tusks, banners with the clan's mark, a ring of stones and stakes round it
    start('prop_camp')
    disc('ring', 1.0, 0.1, 0, stone_d, 9, r2=0.96)
    loft('tent', [((0, 0, 0.08), 0.86, 0.86), ((0, 0, 0.6), 0.74, 0.74), ((0, 0, 1.05), 0.48, 0.48), ((0, 0, 1.38), 0.16, 0.16)], sides=7, m=hide, cap=True)
    loft('skirt', [((0, 0, 0.08), 0.92, 0.92), ((0, 0, 0.34), 0.84, 0.84)], sides=7, m=hide_d, cap=False)
    for i in range(7):     # the ribs, from the ground up over the hide to the crown
        a = (i + 0.5) / 7 * TAU; c, s = math.cos(a), math.sin(a)
        bone('rib%d' % i, (c * 0.96, s * 0.96, 0.08), (c * 0.95, s * 0.95, 1.05), (c * 0.14, s * 0.14, 1.52), 0.045, tbone, n=8, r_end=0.03)
    with unit('crown'):
        disc('crown', 0.16, 0.12, 1.44, tbone_d, 7)
        for i in range(4): a = i / 4 * TAU + 0.4; spike('claw%d' % i, (math.cos(a) * 0.1, math.sin(a) * 0.1, 1.54), (math.cos(a) * 0.22, math.sin(a) * 0.22, 1.92), 0.04, m=tbone)
        o = box('crystal', (0.2, 0.2, 0.48), (0, 0, 1.78), m=cry, taper=0.25, rot=(0, 0, R(20)))
        box('crystalb', (0.1, 0.1, 0.16), (0, 0, 1.5), m=cry, taper=2.0, rot=(0, 0, R(20)))
    for s in (-1, 1):
        spike('tusk%d' % (s > 0), (s * 0.3, -0.82, 0.08), (s * 0.08, -0.98, 0.95), 0.07, m=tbone)
    box('door', (0.4, 0.05, 0.6), (0, -0.82, 0.38), m=hide_d, taper=0.55)
    for i, (a, h) in enumerate([(R(-60), 1.2), (R(-120), 1.05), (R(80), 1.3)]):
        c, s = math.cos(a), math.sin(a)
        with unit('pole%d' % i):
            cyl('pole%d' % i, (c * 1.12, s * 1.12, 0.0), (c * 1.12, s * 1.12, h), 0.025, m=tbone_d, sides=5)
            box('banner%d' % i, (0.02, 0.24, 0.5), (c * 1.12 - s * 0.13, s * 1.12 + c * 0.13, h - 0.3), m=hide_d, rot=(0, 0, a))
            box('mark%d' % i, (0.03, 0.1, 0.26), (c * 1.12 - s * 0.13, s * 1.12 + c * 0.13, h - 0.3), m=accent, rot=(0, 0, a))
    for i in range(9): a = i / 9 * TAU + 0.2; cyl('stake%d' % i, (math.cos(a) * 1.02, math.sin(a) * 1.02, 0.06), (math.cos(a) * 1.07, math.sin(a) * 1.07, 0.5), 0.025, m=tbone, sides=4, r2=0.008)
    rubble(14, 1.15, [hide, hide_d, tbone, stone], seed=53)

@how(seed=59, stay=('drum', 'claw', 'lip', 'rune', 'shard'))
def turret_lizards():
    # the crystal lance: a carved stone drum, two curved bone claws cradling a long faceted crystal aimed forward, hide wrapped
    # round its butt, small crystals bristling from the stone
    start('prop_turret_lizards')
    disc('drum', 0.6, 0.26, 0, stone, 7, r2=0.54); disc('lip', 0.46, 0.06, 0.26, stone_d, 7)
    for i in range(7): a = (i + 0.5) / 7 * TAU; box('rune%d' % i, (0.1, 0.02, 0.12), (math.cos(a) * 0.575, math.sin(a) * 0.575, 0.13), m=accent_lit, rot=(0, 0, a + R(90)))
    U = unit('lance'); U.__enter__()
    for s in (-1, 1): bone('cradle%d' % (s > 0), (s * 0.34, 0.2, 0.3), (s * 0.42, -0.1, 0.78), (s * 0.12, -0.3, 0.68), 0.05, tbone, n=7, r_end=0.025)
    loft('lance', [((0, 0.42, 0.56), 0.1, 0.1), ((0, -0.2, 0.66), 0.14, 0.14), ((0, -0.9, 0.78), 0.09, 0.09), ((0, -1.35, 0.86), 0.01, 0.01)], sides=6, m=cry_c)
    loft('wrap', [((0, 0.5, 0.55), 0.12, 0.12), ((0, 0.18, 0.6), 0.16, 0.16)], sides=7, m=hide_d)
    cyl('post', (0, 0.2, 0.3), (0, 0.22, 0.58), 0.07, m=tbone_d, sides=6)
    U.__exit__(None, None, None)
    for i, (x, y, h) in enumerate([(0.32, 0.3, 0.26), (-0.3, 0.34, 0.22), (0.18, -0.34, 0.18), (-0.36, -0.2, 0.2)]):
        box('shard%d' % i, (0.07, 0.07, h), (x, y, 0.3 + h * 0.4), m=cry, taper=0.2, rot=(R(10 * (i - 1.5)), R(12 * (1 - i % 2 * 2)), R(25 * i)))
    for i in range(3): a = R(30) + i * R(120); spike('claw%d' % i, (math.cos(a) * 0.5, math.sin(a) * 0.5, 0.18), (math.cos(a) * 0.82, math.sin(a) * 0.82, 0.0), 0.05, m=tbone)
    rubble(8, 0.8, [stone, tbone, hide_d], seed=59, size=(0.06, 0.15))

@how(seed=61, stay=('plinth',))
def node():
    # the shield node (the Talon's dome): a stone plinth, three bone tines curving in to hold a great pale crystal, hide wrapped
    # round them, runes lit on the stone
    start('prop_node')
    disc('plinth', 0.6, 0.3, 0, stone, 6, r2=0.5); disc('plinth2', 0.42, 0.16, 0.3, stone_d, 6, r2=0.36)
    for i in range(6): a = (i + 0.5) / 6 * TAU; box('rune%d' % i, (0.12, 0.02, 0.14), (math.cos(a) * 0.53, math.sin(a) * 0.53, 0.16), m=accent_lit, rot=(0, 0, a + R(90)))
    for i in range(3):
        a = i / 3 * TAU + R(90); c, s = math.cos(a), math.sin(a)
        bone('tine%d' % i, (c * 0.3, s * 0.3, 0.44), (c * 0.52, s * 0.52, 1.3), (c * 0.14, s * 0.14, 2.05), 0.055, tbone, n=8, r_end=0.02)
        loft('wrap%d' % i, [((c * 0.36, s * 0.36, 0.62), 0.09, 0.09), ((c * 0.44, s * 0.44, 0.9), 0.085, 0.085)], sides=6, m=hide)
    U = unit('crystal'); U.__enter__()
    box('crystal', (0.32, 0.32, 0.9), (0, 0, 1.48), m=cry_c, taper=0.3, rot=(0, 0, R(15)))
    box('crystalb', (0.14, 0.14, 0.36), (0, 0, 0.85), m=cry_c, taper=0.32 / 0.14, rot=(0, 0, R(15)))
    U.__exit__(None, None, None)
    disc('seat', 0.14, 0.24, 0.46, tbone_d, 6)
    rubble(8, 0.85, [stone, tbone], seed=61)

@how(seed=67, stay=('stone', 'drumleg'))
def relay_lizards():
    # the drum tower: three long bones lashed as a tripod, a great hide drum slung in it, a crystal spire at its top, skins hanging
    start('poi_relay_lizards')
    disc('stone', 0.5, 0.12, 0, stone_d, 7)
    U = unit('frame'); U.__enter__()
    for i in range(3):
        a = i / 3 * TAU + R(30); c, s = math.cos(a), math.sin(a)
        bone('leg%d' % i, (c * 0.92, s * 0.92, 0.0), (c * 0.6, s * 0.6, 1.2), (c * 0.05, s * 0.05, 2.1), 0.05, tbone, n=7, r_end=0.035, knob=1.25)
    loft('lash', [((0, 0, 1.92), 0.1, 0.1), ((0, 0, 2.06), 0.1, 0.1)], sides=6, m=hide_d)
    box('spire', (0.14, 0.14, 0.5), (0, 0, 2.3), m=cry, taper=0.15, rot=(0, 0, R(30)))
    U.__exit__(None, None, None)
    o = disc('drum', 0.34, 0.34, 0, hide, 10); o.location = (0, 0, 0.95)
    disc('drumtop', 0.33, 0.02, 1.29, tbone_d, 10); disc('drumbot', 0.33, 0.02, 0.93, tbone_d, 10)
    for i in range(3): a = i / 3 * TAU + R(30); c, s = math.cos(a), math.sin(a); cyl('drumleg%d' % i, (c * 0.3, s * 0.3, 0.12), (c * 0.3, s * 0.3, 0.95), 0.025, m=tbone_d, sides=4)
    for i in range(3):
        a = i / 3 * TAU + R(30); c, s = math.cos(a), math.sin(a); r = 0.43
        with unit('frame'):
            box('skin%d' % i, (0.3, 0.02, 0.4), (c * r, s * r, 1.4), m=hide_d if i % 2 else hide, rot=(0, 0, a + R(90)), taper=0.7)
            box('skinmark%d' % i, (0.12, 0.025, 0.16), (c * (r + 0.005), s * (r + 0.005), 1.42), m=accent, rot=(0, 0, a + R(90)))
    rubble(10, 1.0, [tbone, hide, stone], seed=67)

@how(seed=71, stay=('ground', 'basket', 'heap'))
def cache_lizards():
    # the hoard: hide-covered baskets, a heap of crystals, bone shields leaning on a rack, a hide stretched to dry on bones
    start('poi_cache_lizards')
    disc('ground', 0.95, 0.06, 0, stone_d, 9)
    for i, (x, y, r, h) in enumerate([(-0.42, 0.3, 0.2, 0.36), (-0.12, 0.45, 0.18, 0.3), (-0.55, -0.1, 0.17, 0.28)]):
        disc('basket%d' % i, r, h, 0.06, tbone_d, 9, r2=r * 1.15, at=(x, y)); disc('basketlid%d' % i, r * 1.12, 0.06, 0.06 + h, hide, 9, at=(x, y))
    blob('heap', r=0.34, scale=(1, 1, 0.4), loc=(0.3, 0.12, 0.06), sub=1, m=stone)
    for i, (x, y, h, m_) in enumerate([(0.3, 0.12, 0.42, cry), (0.42, 0.24, 0.3, cry), (0.16, 0.2, 0.28, cry_c), (0.38, -0.02, 0.26, cry), (0.2, -0.04, 0.22, accent_lit)]):
        box('cry%d' % i, (0.09, 0.09, h), (x, y, 0.14 + h * 0.4), m=m_, taper=0.2, rot=(R(14 * (i - 2)), R(10 * (1 - i % 2 * 2)), R(30 * i)))
    for i, x in enumerate((-0.3, 0.3)): cyl('rackpost%d' % i, (x, -0.55, 0.06), (x, -0.55, 0.7), 0.025, m=tbone, sides=5)
    cyl('rackbar', (-0.36, -0.55, 0.68), (0.36, -0.55, 0.68), 0.025, m=tbone, sides=5)
    for i, x in enumerate((-0.18, 0.12)):
        o = blob('shield%d' % i, r=0.2, scale=(1, 0.18, 1.3), sub=1, m=tbone_d); o.location = (x, -0.62, 0.32); o.rotation_euler = (R(-14), 0, 0)
        box('shieldmark%d' % i, (0.1, 0.02, 0.18), (x, -0.665, 0.33), m=accent_lit, rot=(R(-14), 0, 0))
    for i, x in enumerate((0.55, 0.85)): cyl('dry%d' % i, (x, -0.2, 0.06), (x, -0.2, 0.8), 0.022, m=tbone, sides=4)
    box('hide', (0.32, 0.02, 0.5), (0.7, -0.2, 0.5), m=hide); cyl('drybar', (0.53, -0.2, 0.77), (0.87, -0.2, 0.77), 0.02, m=tbone, sides=4)
    rubble(10, 1.0, [tbone, hide, stone], seed=71)

@how(seed=73, stay=('base', 'menhir'))
def battery_lizards():
    # the geode: a ring of standing stones round a split boulder from which great crystals grow, bone braces leaning on them
    start('poi_battery_lizards')
    disc('base', 0.98, 0.08, 0, stone_d, 10)
    for i in range(6):
        a = i / 6 * TAU + 0.3; c, s = math.cos(a), math.sin(a); h = 0.7 + 0.25 * ((i * 7) % 3) / 2
        box('menhir%d' % i, (0.2, 0.14, h), (c * 0.82, s * 0.82, 0.08 + h / 2), m=stone, taper=0.7, rot=(0, R(-6), a))
        box('glyph%d' % i, (0.1, 0.02, 0.2), (c * 0.89, s * 0.89, 0.3 + h * 0.35), m=accent_lit, rot=(0, 0, a + R(90)))
    blob('boulder', r=0.45, scale=(1, 1, 0.6), loc=(0, 0, 0.12), sub=1, m=stone_d, rough=0.2, seed=4)
    for i, (x, y, h, w, rx, ry) in enumerate([(0, 0, 1.6, 0.26, 0, 0), (0.18, 0.1, 1.1, 0.2, 10, 16), (-0.2, 0.06, 1.0, 0.18, -8, -18), (0.02, -0.2, 0.9, 0.18, -18, 4), (-0.06, 0.24, 0.8, 0.16, 16, -6)]):
        box('cry%d' % i, (w, w, h), (x, y, 0.3 + h * 0.42), m=cry if i % 2 == 0 else cry_c, taper=0.18, rot=(R(rx), R(ry), R(23 * i)))
    for i in range(3):
        a = i / 3 * TAU + 1.0; c, s = math.cos(a), math.sin(a)
        cyl('brace%d' % i, (c * 0.62, s * 0.62, 0.08), (c * 0.1, s * 0.1, 1.0), 0.035, m=tbone, sides=5)
    rubble(10, 1.05, [stone, stone_d, tbone], seed=73)

@how(seed=79, stay=('base', 'plinth'))
def broadcast_lizards():
    # the war-horn tower: a squat stone tower, three great curled horns sounding out from its top, banners, a crystal at the peak
    start('poi_broadcast_lizards')
    disc('base', 0.8, 0.12, 0, stone_d, 8)
    disc('plinth', 0.5, 0.2, 0.12, stone_d, 8, r2=0.46)
    U = unit('tower'); U.__enter__()
    disc('tower', 0.42, 1.3, 0.12, stone, 8, r2=0.32)
    for k in range(3): disc('band%d' % k, 0.4 - k * 0.03, 0.06, 0.5 + k * 0.32, tbone_d, 8)
    disc('top', 0.4, 0.1, 1.42, stone_d, 8)
    for i, a in enumerate((R(-90), R(30), R(150))):
        c, s = math.cos(a), math.sin(a); n = V(-s, c, 0)
        P = [V(c * 0.15, s * 0.15, 1.5) + V(c, s, 0) * (0.62 * t) + V(0, 0, 0.42 * math.sin(t * 2.6)) + n * (0.12 * math.sin(t * 3.4)) for t in (k / 7 for k in range(8))]
        loft('horn%d' % i, [(tuple(p), 0.06 + 0.15 * (k / 7) ** 1.6, 0.06 + 0.15 * (k / 7) ** 1.6) for k, p in enumerate(P)], sides=8, m=tbone, cap=False)
        disc('bell%d' % i, 0.2, 0.02, 0, accent_lit, 8).matrix_world = Matrix.Translation(P[-1] + (P[-1] - P[-2]).normalized() * -0.02) @ (P[-1] - P[-2]).to_track_quat('Z', 'Y').to_matrix().to_4x4()
    cyl('mast', (0, 0, 1.52), (0, 0, 2.0), 0.03, m=tbone_d, sides=5); box('peak', (0.12, 0.12, 0.36), (0, 0, 2.12), m=cry, taper=0.15)
    for i, a in enumerate((R(-30), R(90), R(210))):
        c, s = math.cos(a), math.sin(a)
        box('banner%d' % i, (0.26, 0.02, 0.6), (c * 0.34, s * 0.34, 0.95), m=hide_d, rot=(0, 0, a + R(90)), taper=0.8)
        box('bmark%d' % i, (0.1, 0.025, 0.2), (c * 0.352, s * 0.352, 1.0), m=accent, rot=(0, 0, a + R(90)))
    U.__exit__(None, None, None)
    rubble(10, 1.0, [stone, tbone, hide_d], seed=79)

# ---------------------------------------------------------------- make them, and a picture of each standing and fallen
ALL = (hive, turret_bugs, relay_bugs, cache_bugs, battery_bugs, broadcast_bugs,
       fab, turret_bots, cannon, relay_bots, cache_bots, battery_bots, broadcast_bots,
       camp, turret_lizards, node, relay_lizards, cache_lizards, battery_lizards, broadcast_lizards)
try: ONLY
except NameError: ONLY = None
OUT = {}
for fn in ALL:
    if ONLY and fn.__name__ not in ONLY: continue
    OUT[fn.__name__] = ship(fn)

# the picture: every one made, standing in the front row and fallen behind it (after the export, which wants each at the origin)
def lineup(names, pic, cols=7):
    for i, name in enumerate(names):
        objs = [o for o in bpy.data.collections[name].objects]
        for o in objs: o.location = Vector(o.location) + Vector(((i % cols) * 3.0, -(i // cols) * 3.2, 0))
    return shot(pic, dist=24, target=((min(len(names), cols) - 1) * 1.5, -(len(names) - 1) // cols * 1.6, 0.6), res=(1800, 900), az=20, el=32)
