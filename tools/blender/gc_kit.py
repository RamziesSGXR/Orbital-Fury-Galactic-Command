
# GALACTIC COMMAND: the model kit. Everything here is run inside Blender by a creature's own script.
# A creature is a tree of joints (empties) with low-polygon parts hung on them. A pose turns the joints. The export
# writes the same triangles once and the place of every vertex for each pose, which is what the game draws.
# Blender: Z is up and the creature faces -Y. The game: Y is up and it faces +Z.
import bpy, bmesh, math, json, base64, struct, os
from mathutils import Vector, Matrix, noise

ROOT = os.path.join(os.path.expanduser('~'), 'Documents', 'GalacticCommandAssets')
PRE = ''     # put before every joint's name, so several creatures can live in one file

def wipe():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for b in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.curves):
        for d in list(b):
            if d.users == 0: b.remove(d)
    for c in list(bpy.data.collections): bpy.data.collections.remove(c)

def coll(name):
    c = bpy.data.collections.get(name)
    if not c: c = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c)
    return c

def mat(name, hexc, emit=0.0, rough=0.75, metal=0.0):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    h = hexc.lstrip('#'); rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92 for c in rgb]
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*lin, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*lin, 1); b.inputs['Emission Strength'].default_value = emit
    m.diffuse_color = (*lin, 1); m['hex'] = '#' + h; m['emit'] = emit
    return m

def joint(name, loc=(0, 0, 0), parent=None, c=None):
    e = bpy.data.objects.new(PRE + name, None); e.empty_display_size = 0.08; e.location = loc; e.rotation_mode = 'XYZ'
    (c or CUR).objects.link(e)
    if parent: e.parent = parent
    return e

def _obj(name, bm, mats, parent, c=None):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    o = bpy.data.objects.new(name, me); (c or CUR).objects.link(o)
    if parent: o.parent = parent
    return o

def loft(name, secs, sides=8, m=None, parent=None, seg_mats=None, cap=True, rough=0.0, seed=0):
    """A skin over cross-sections. secs: [(pos, rx, rz[, roll])], each an ellipse square to the path. seg_mats: a material index for each span."""
    bm = bmesh.new(); P = [Vector(s[0]) for s in secs]; n = len(P); rings = []
    for i, s in enumerate(secs):
        t = (P[min(i + 1, n - 1)] - P[max(i - 1, 0)])
        t = t.normalized() if t.length > 1e-6 else Vector((0, -1, 0))
        side = t.cross(Vector((0, 0, 1)))
        if side.length < 1e-3: side = Vector((1, 0, 0))
        side.normalize()
        if i and side.dot(prev) < 0: side = -side     # (GC 0.69) keep each ring turned the way the last one was: a limb that leans a hair forward then back twisted half a turn and pinched
        prev = side; up = side.cross(t).normalized(); roll = s[3] if len(s) > 3 else 0.0
        ring = []
        for k in range(sides):
            a = 2 * math.pi * k / sides + roll
            j = 1.0 + (rough * noise.noise(Vector((i * 1.7 + seed, k * 2.3, seed * 0.37))) if rough else 0.0)
            ring.append(bm.verts.new(P[i] + side * math.cos(a) * s[1] * j + up * math.sin(a) * s[2] * j))
        rings.append(ring)
    for i in range(n - 1):
        for k in range(sides):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
            if seg_mats: f.material_index = seg_mats[i]
    if cap:
        for ring, si in ((rings[0], 0), (rings[-1], -1)):
            try:
                f = bm.faces.new(ring)
                if seg_mats: f.material_index = seg_mats[si]
            except ValueError: pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    mats = m if isinstance(m, (list, tuple)) else [m]
    return _obj(name, bm, mats, parent)

def blob(name, r=1.0, scale=(1, 1, 1), loc=(0, 0, 0), sub=2, m=None, parent=None, rough=0.0, seed=0):
    """A faceted lump: an icosphere, squashed, its corners pushed in and out a little."""
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    for v in bm.verts:
        j = 1.0 + (rough * noise.noise(v.co * 2.1 + Vector((seed, seed * 0.3, 0))) if rough else 0.0)
        v.co = Vector((v.co.x * scale[0] * j + loc[0], v.co.y * scale[1] * j + loc[1], v.co.z * scale[2] * j + loc[2]))
    return _obj(name, bm, [m], parent)

def box(name, size=(1, 1, 1), loc=(0, 0, 0), m=None, parent=None, bevel=0.0, rot=None, taper=1.0):
    """A block; bevel cuts its edges; taper narrows its top."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        k = taper if v.co.z > 0 else 1.0
        v.co = Vector((v.co.x * size[0] * k, v.co.y * size[1] * k, v.co.z * size[2]))
    if bevel: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect='EDGES')
    M = Matrix.Translation(loc) @ (Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X') if rot else Matrix.Identity(4))
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return _obj(name, bm, [m], parent)

def shell(name, c=(0, 0), r0=(0.1, 0.1), r1=None, z=(0.0, 0.1), arc=(-2.6, -0.54), segs=10, t=0.01, m=None, parent=None):
    """(GC 0.69) A curved band round the Z axis, like a visor or a mask: centre c (x, y), radii r0 at z[0] and r1 at z[1] (x, y),
    from angle arc[0] to arc[1] (radians in the XY plane; -pi/2 is the front, -Y), t thick (outward)."""
    r1 = r1 or r0; bm = bmesh.new(); V = []
    for i in range(segs + 1):
        a = arc[0] + (arc[1] - arc[0]) * i / segs; ca, sa = math.cos(a), math.sin(a); col = []
        for (zz, (rx, ry)) in ((z[0], r0), (z[1], r1)):
            for dt in (0.0, t): col.append(bm.verts.new((c[0] + (rx + dt) * ca, c[1] + (ry + dt) * sa, zz)))
        V.append(col)     # [in-low, out-low, in-high, out-high]
    for i in range(segs):
        a, b = V[i], V[i + 1]
        bm.faces.new((a[1], b[1], b[3], a[3])); bm.faces.new((a[0], a[2], b[2], b[0]))
        bm.faces.new((a[2], a[3], b[3], b[2])); bm.faces.new((a[0], b[0], b[1], a[1]))
    for col in (V[0], V[-1]): bm.faces.new((col[0], col[1], col[3], col[2]))
    return _obj(name, bm, [m], parent)

def dome(name, c=(0, 0, 0), r=(0.1, 0.1), top=0.1, eq=0.0, rim=None, rings=4, segs=14, flare=1.0, m=None, parent=None):
    """(GC 0.69) A helmet's shell: a dome over an ellipse r (x, y) at height eq round centre c, its crown at c.z + top. Below the
    equator its sides drop to rim(a) (the height of the edge at angle a: -pi/2 is the front), flaring out to `flare` times as wide."""
    bm = bmesh.new(); cx, cy, cz = c; R = []
    ang = [2 * math.pi * k / segs - math.pi / 2 for k in range(segs)]
    R.append([bm.verts.new((cx + r[0] * flare * math.cos(a), cy + r[1] * flare * math.sin(a), cz + (rim(a) if rim else eq))) for a in ang])
    for j in range(rings):
        u = j / rings; s = math.cos(u * math.pi / 2); zz = cz + eq + (top - eq) * math.sin(u * math.pi / 2)
        R.append([bm.verts.new((cx + r[0] * s * math.cos(a), cy + r[1] * s * math.sin(a), zz)) for a in ang])
    for j in range(len(R) - 1):
        for k in range(segs): bm.faces.new((R[j][k], R[j][(k + 1) % segs], R[j + 1][(k + 1) % segs], R[j + 1][k]))
    tip = bm.verts.new((cx, cy, cz + top))
    for k in range(segs): bm.faces.new((R[-1][k], R[-1][(k + 1) % segs], tip))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new(name, me); CUR.objects.link(o)
    if parent: o.parent = parent
    return o

def spike(name, base, tip, r, sides=5, m=None, parent=None, flat=1.0):
    """A horn, claw or blade from base to tip; flat < 1 makes it a blade."""
    b, t = Vector(base), Vector(tip); mid = b.lerp(t, 0.55)
    return loft(name, [(b, r, r * flat), (mid, r * 0.62, r * 0.62 * flat), (t, 0.004, 0.004)], sides=sides, m=m, parent=parent)

def mirror_x(o, name=None):
    """A copy of a part (or a joint and all that hangs on it) on the other side."""
    def cp(src, parent):
        d = src.copy()
        if src.data: 
            d.data = src.data.copy()
            for v in d.data.vertices: v.co.x = -v.co.x
            d.data.flip_normals()
        d.name = (name if (name and src is o) else src.name.replace('.L', '.R') if '.L' in src.name else src.name + '.R')
        d.location.x = -d.location.x; d.rotation_euler = (d.rotation_euler.x, -d.rotation_euler.y, -d.rotation_euler.z); d.parent = parent
        for cc in src.users_collection: cc.objects.link(d)
        for ch in src.children: cp(ch, d)
        return d
    return cp(o, o.parent)

# ---- seeing it
def stage(dist=6.0, target=(0, 0, 0.6), res=(900, 620), az=35, el=28):
    sc = bpy.context.scene
    cam = bpy.data.objects.get('GC_cam')
    if not cam:
        cam = bpy.data.objects.new('GC_cam', bpy.data.cameras.new('GC_cam')); sc.collection.objects.link(cam)
        for nm, loc, en in (('GC_sun', (4, -5, 8), 3.5),):
            L = bpy.data.objects.new(nm, bpy.data.lights.new(nm, 'SUN')); L.data.energy = en; L.rotation_euler = (math.radians(42), 0, math.radians(28)); sc.collection.objects.link(L)
        g = bpy.data.objects.get('GC_floor')
        if not g:
            bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30)
            me = bpy.data.meshes.new('GC_floor'); bm.to_mesh(me); bm.free(); me.materials.append(mat('gc_floor', '#8a7a62', rough=1.0))
            sc.collection.objects.link(bpy.data.objects.new('GC_floor', me))
    a, e = math.radians(az), math.radians(el); T = Vector(target)
    cam.location = T + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    cam.rotation_euler = (T - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 60
    sc.camera = cam; sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    w = sc.world or bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    if bg: bg.inputs[0].default_value = (0.55, 0.6, 0.66, 1); bg.inputs[1].default_value = 0.9

def shot(name, **kw):
    stage(**kw); p = os.path.join(ROOT, 'renders', name + '.png'); bpy.context.scene.render.filepath = p
    bpy.ops.render.render(write_still=True); return p

# ---- handing it to the game
def _full(objs):
    out = []
    for o in objs:
        me = o.data; me.calc_loop_triangles()
        out.append((o, [v.co.copy() for v in me.vertices], [(tuple(lt.vertices), lt.material_index) for lt in me.loop_triangles], list(me.materials)))
    return out
import re
KEEP_LIGHT = re.compile(r'hand|foot|sole|heel|toecap|glove')
def _light(objs, ratio, size):
    """The same parts in far fewer triangles: the small ones left out, the rest cut down."""
    out = []
    for o in objs:
        me = o.data; bb = [Vector(c) for c in o.bound_box]; diag = (bb[6] - bb[0]).length * max(abs(c) for c in o.matrix_world.to_scale())
        if diag < 0.085 * size and not KEEP_LIGHT.search(o.name): continue     # (GC 0.75: a hand, a foot or a sole is never left out: a rifle or a slate held by a hand that was gone floated)
        me.calc_loop_triangles()
        if len(me.loop_triangles) <= 14:
            out.append((o, [v.co.copy() for v in me.vertices], [(tuple(lt.vertices), lt.material_index) for lt in me.loop_triangles], list(me.materials))); continue
        md = o.modifiers.new('gc_lod', 'DECIMATE'); md.ratio = ratio
        ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get()); m2 = ev.to_mesh(); m2.calc_loop_triangles()
        out.append((o, [v.co.copy() for v in m2.vertices], [(tuple(lt.vertices), lt.material_index) for lt in m2.loop_triangles], list(me.materials)))
        ev.to_mesh_clear(); o.modifiers.remove(md)
    return out
def _pack(parts, mats_at, pal):
    """parts: [(object, its vertices, its triangles, its materials)]; mats_at: {frame: {object name: its place in the world}}."""
    tris, cols, mi, base = [], [], [], 0
    for o, vs, ts, ms in parts:
        for (a, b, c), k in ts:
            tris += [base + a, base + b, base + c]
            mm = ms[k] if ms and k < len(ms) else None
            h = (mm.get('hex') if mm else None) or '#888888'; rgb = [int(h[q:q + 2], 16) for q in (1, 3, 5)]
            if mm and mm.get('emit'): rgb = [min(255, int(v * 1.15 + 20)) for v in rgb]
            cols += rgb; nm = mm.name if mm else '-'
            if nm not in pal: pal.append(nm)
            mi.append(pal.index(nm))
        base += len(vs)
    nv = base; raw = {}; lo = [1e9] * 3; hi = [-1e9] * 3
    for fn, MW in mats_at.items():
        pts = []
        for o, vs, ts, ms in parts:
            M = MW[o.name]
            for co in vs:
                w = M @ co; p = (w.x, w.z, -w.y); pts.append(p)
                for q in range(3): lo[q] = min(lo[q], p[q]); hi[q] = max(hi[q], p[q])
        raw[fn] = pts
    size = [max(1e-6, hi[q] - lo[q]) for q in range(3)]
    def qz(pts): return base64.b64encode(struct.pack('<%dH' % (nv * 3), *[int(round((p[q] - lo[q]) / size[q] * 65535)) for p in pts for q in range(3)])).decode()
    return {'nv': nv, 'nt': len(tris) // 3, 'min': lo, 'size': size, 'tris': base64.b64encode(struct.pack('<%dH' % len(tris), *tris)).decode(),
            'cols': base64.b64encode(bytes(cols)).decode(), 'mi': base64.b64encode(bytes(mi)).decode(), 'frames': {fn: qz(p) for fn, p in raw.items()}}
def export(name, collection, frames, extra=None, lod=0.34):
    """frames: {name: a function that poses the creature}. Writes export/<name>.json: triangles and colours once, every vertex's place per
    frame, the names of its materials (so the game can dress a part in other colours), and a lighter copy of the whole thing (lod)."""
    objs = [o for o in collection.all_objects if o.type == 'MESH']
    mats_at = {}
    for fn, pose in frames.items():
        pose(); bpy.context.view_layer.update(); mats_at[fn] = {o.name: o.matrix_world.copy() for o in objs}
    pal = []; out = {'v': 2, 'name': name}; out.update(_pack(_full(objs), mats_at, pal))
    if lod:
        frames['stand'](); bpy.context.view_layer.update()
        out['lod'] = _pack(_light(objs, lod, max(out['size'])), mats_at, pal)
    out['pal'] = pal
    if extra: out.update(extra)
    p = os.path.join(ROOT, 'export', name + '.json')
    with open(p, 'w') as f: json.dump(out, f, separators=(',', ':'))
    return {'path': p, 'verts': out['nv'], 'tris': out['nt'], 'lod_tris': out['lod']['nt'] if lod else 0, 'frames': len(frames), 'bytes': os.path.getsize(p), 'size': [round(v, 2) for v in out['size']]}

def rest(j):
    """Remember how every joint under j stands now: that is its rest."""
    for o in [j] + list(j.children_recursive):
        if o.type == 'EMPTY': o['rest'] = tuple(o.location); o['rrot'] = tuple(o.rotation_euler)
def zero(j):
    """Every joint under j back to rest."""
    for o in [j] + list(j.children_recursive):
        if o.type == 'EMPTY' and 'rest' in o: o.location = o['rest']; o.rotation_euler = o['rrot']
def J(name): return bpy.data.objects[PRE + name]
def turn(name, x=0.0, y=0.0, z=0.0):
    """Turn a joint from its rest by these angles (radians)."""
    o = bpy.data.objects[PRE + name]; r = o['rrot']; o.rotation_euler = (r[0] + x, r[1] + y, r[2] + z)
def shift(name, x=0.0, y=0.0, z=0.0):
    o = bpy.data.objects[PRE + name]; r = o['rest']; o.location = (r[0] + x, r[1] + y, r[2] + z)

def leg(tag, parent, hip, rz, out, rise, drop, r, m_thigh, m_shin, sides=5, toe=0.0, reach2=0.75, tip=0.12, foot=None, m_foot=None, roll=0.0):
    """A two-part leg on the +X side (it is mirrored for the other): hip joint, a thigh up and out, a knee joint, a shin down to the ground.
    tip: how thick the shin ends (a share of r); foot: the size of a pad under it, for a machine."""
    h = joint('hip%s.L' % tag, hip, parent); h.rotation_euler = (0, 0, rz)
    loft(PRE + 'thigh%s.L' % tag, [((0, 0, 0), r * 1.25, r * 1.25, roll), ((out * 0.5, 0, rise * 0.62), r, r, roll), ((out, 0, rise), r * 0.8, r * 0.8, roll)], sides=sides, m=m_thigh, parent=h)
    k = joint('knee%s.L' % tag, (out, 0, rise), h); fd = foot[2] if foot else 0.0
    loft(PRE + 'shin%s.L' % tag, [((0, 0, 0), r, r, roll), ((out * reach2 * 0.55, 0, -(drop - fd) * 0.42), r * 0.7, r * 0.7, roll), ((out * reach2, toe, -(drop - fd)), max(0.004, r * tip), max(0.004, r * tip), roll)], sides=sides, m=m_shin, parent=k)
    if foot: box(PRE + 'foot%s.L' % tag, foot, (out * reach2, toe, -drop + fd / 2), m=m_foot or m_shin, parent=k, bevel=min(foot) * 0.18)
    mirror_x(h); return h
def bleg(parent, hip, thigh, shin, r, m_thigh, m_shin, foot, m_foot, sides=6, roll=0.0, kneecap=None, m_knee=None, tag=''):
    """A leg that hangs straight down on the +X side (mirrored for the other): hip joint, thigh, knee joint, shin, a foot."""
    h = joint('hip%s.L' % tag, hip, parent)
    loft(PRE + 'thigh%s.L' % tag, [((0, 0, 0), r * 1.15, r * 1.15, roll), ((0, 0, -thigh), r * 0.85, r * 0.85, roll)], sides=sides, m=m_thigh, parent=h)
    k = joint('knee%s.L' % tag, (0, 0, -thigh), h)
    loft(PRE + 'shin%s.L' % tag, [((0, 0, 0), r * 0.95, r * 0.95, roll), ((0, 0, -shin), r * 0.7, r * 0.7, roll)], sides=sides, m=m_shin, parent=k)
    if kneecap: box(PRE + 'kneecap.L', kneecap, (0, -r * 0.8, 0), m=m_knee or m_thigh, parent=k, bevel=min(kneecap) * 0.2)
    box(PRE + 'foot.L', foot, (0, -foot[1] * 0.18, -shin - foot[2] / 2), m=m_foot, parent=k, bevel=min(foot) * 0.2)
    mirror_x(h); return h
def stride(ph, sw=0.5, kn=0.7, arm=0.4):
    """Two legs walking: hips swing, the knee of the leg coming forward bends, the arms swing against the legs."""
    for s, sd in ((1, 'L'), (-1, 'R')):
        a = ph + (0 if s > 0 else math.pi)
        turn('hip.' + sd, x=-sw * math.sin(a)); turn('knee.' + sd, x=kn * max(0.0, math.cos(a)) + 0.06)
        if arm and (PRE + 'sho.' + sd) in bpy.data.objects: turn('sho.' + sd, x=arm * math.sin(a))
def cyl(name, a, b, r, m=None, parent=None, sides=8, r2=None):
    """A round bar from a to b."""
    return loft(name, [(a, r, r), (b, r if r2 is None else r2, r if r2 is None else r2)], sides=sides, m=m, parent=parent)
def lineup(name, roots, gaps, scales, **kw):
    """Stand several creatures side by side at their sizes in the game and take a picture."""
    x = 0.0
    for r, g, sc in zip(roots, gaps, scales): r.location = (x, 0, 0); r.scale = (sc, sc, sc); x += g
    bpy.context.view_layer.update(); return shot(name, **kw)

def tail(parent, at, lens, radii, m, sides=6, droop=0.0, flat=1.0):
    """A chain of joints running back (+Y), a tapering piece on each: tail0, tail1, ... radii has one more entry than lens."""
    p = parent; loc = at; out = []
    for i, L in enumerate(lens):
        j = joint('tail%d' % i, loc, p); j.rotation_euler = (droop if i else 0.0, 0, 0)
        loft(PRE + 'tailseg%d' % i, [((0, 0, 0), radii[i], radii[i] * flat), ((0, L, 0), max(0.004, radii[i + 1]), max(0.004, radii[i + 1] * flat))], sides=sides, m=m[i % len(m)] if isinstance(m, (list, tuple)) else m, parent=j)
        out.append(j); p = j; loc = (0, L, 0)
    return out
def wag(n, ph, amp=0.18, lag=0.9, up=0.0):
    for i in range(n): turn('tail%d' % i, z=amp * math.sin(ph - i * lag), x=up * math.sin(2 * ph - i * lag))

def aim_joint(j, world_dir):
    """Turn a joint so that the limb hanging from it (down its own -Z) points along world_dir."""
    bpy.context.view_layer.update()
    pm = j.parent.matrix_world.to_3x3().normalized() if j.parent else Matrix.Identity(3)
    d = (pm.inverted() @ Vector(world_dir)).normalized()
    j.rotation_euler = Vector((0, 0, -1)).rotation_difference(d).to_euler('XYZ')
def reach(sho, elb, target, L1, L2, pole=(0, 0, -1)):
    """Put a hand on a point: turn the shoulder and the elbow so an arm of two lengths ends at target, the elbow leaning toward pole."""
    bpy.context.view_layer.update()
    S = sho.matrix_world.translation.copy(); d = Vector(target) - S; D = max(1e-4, min(d.length, (L1 + L2) * 0.999))
    a = (L1 * L1 - L2 * L2 + D * D) / (2 * D); h = math.sqrt(max(0.0, L1 * L1 - a * a)); n = d.normalized()
    p = Vector(pole); p = p - n * p.dot(n); p = p.normalized() if p.length > 1e-6 else Vector((0, 0, -1))
    E = S + n * a + p * h
    aim_joint(sho, E - S); aim_joint(elb, (S + n * D) - E)
def at(j, loc=None, rot=None):
    """Place a joint outright (not from its rest)."""
    o = bpy.data.objects[PRE + j] if isinstance(j, str) else j
    if loc is not None: o.location = loc
    if rot is not None: o.rotation_euler = rot
def wpt(j, local):
    bpy.context.view_layer.update(); o = bpy.data.objects[PRE + j] if isinstance(j, str) else j
    return o.matrix_world @ Vector(local)

def dead(top='body', roll=1.4, curl=0.5, seed=1):
    """A pose for the fallen: over on its side, limbs curled or slack, lying on the ground. top: the joint the whole body hangs from."""
    def f():
        r = J('root'); zero(r); turn(top, y=roll); k = 0
        for o in r.children_recursive:
            if o.type != 'EMPTY' or 'rrot' not in o: continue
            nm = o.name[len(PRE):]; k += 1; h = math.sin(k * 12.9898 + seed) * 43758.5453; h -= math.floor(h); rr = o['rrot']; sd = 1 if '.L' in nm else -1
            if nm.startswith('hip') or nm.startswith('hop'): o.rotation_euler = (rr[0] + (h - 0.5) * curl, rr[1] + sd * 0.6 * curl, rr[2] + (h - 0.5) * curl)
            elif nm.startswith('knee'): o.rotation_euler = (rr[0] + 0.5 * curl + h * 0.4, rr[1], rr[2])
            elif nm.startswith(('tail', 'neck', 'jaw', 'head')): o.rotation_euler = (rr[0] + (h - 0.5) * 0.5, rr[1], rr[2] + (h - 0.5) * 0.6)
            elif nm.startswith(('sho', 'arm', 'claw')): o.rotation_euler = (rr[0] + (h - 0.5) * 1.0, rr[1] + sd * 0.4, rr[2])
        bpy.context.view_layer.update()
        lo = min((o.matrix_world @ v.co).z for o in CUR.all_objects if o.type == 'MESH' for v in o.data.vertices)
        r.location = (0, 0, -lo)
    return f
