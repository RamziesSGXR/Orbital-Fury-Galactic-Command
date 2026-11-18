
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
        side.normalize(); up = side.cross(t).normalized(); roll = s[3] if len(s) > 3 else 0.0
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
def export(name, collection, frames, extra=None):
    """frames: {name: a function that poses the creature}. Writes export/<name>.json: triangles and colours once, every vertex's place per frame."""
    objs = [o for o in collection.all_objects if o.type == 'MESH']
    tris, cols, base = [], [], 0
    for o in objs:
        me = o.data; me.calc_loop_triangles()
        neg = o.matrix_world.determinant() < 0
        for lt in me.loop_triangles:
            a, b, c = (base + v for v in lt.vertices)
            tris += [a, c, b] if neg else [a, b, c]
            mm = me.materials[lt.material_index] if me.materials else None
            h = (mm.get('hex') if mm else None) or '#888888'; rgb = [int(h[i:i + 2], 16) for i in (1, 3, 5)]
            if mm and mm.get('emit'): rgb = [min(255, int(v * 1.15 + 20)) for v in rgb]
            cols += rgb
        base += len(me.vertices)
    nv = base; raw = {}; lo = [1e9] * 3; hi = [-1e9] * 3
    for fn, pose in frames.items():
        pose(); bpy.context.view_layer.update(); pts = []
        for o in objs:
            M = o.matrix_world
            for v in o.data.vertices:
                w = M @ v.co; p = (w.x, w.z, -w.y); pts.append(p)
                for i in range(3): lo[i] = min(lo[i], p[i]); hi[i] = max(hi[i], p[i])
        raw[fn] = pts
    size = [max(1e-6, hi[i] - lo[i]) for i in range(3)]
    def q(pts): return base64.b64encode(struct.pack('<%dH' % (nv * 3), *[int(round((p[i] - lo[i]) / size[i] * 65535)) for p in pts for i in range(3)])).decode()
    out = {'v': 1, 'name': name, 'nv': nv, 'nt': len(tris) // 3, 'min': lo, 'size': size,
           'tris': base64.b64encode(struct.pack('<%dH' % len(tris), *tris)).decode(), 'cols': base64.b64encode(bytes(cols)).decode(),
           'frames': {fn: q(p) for fn, p in raw.items()}}
    if extra: out.update(extra)
    p = os.path.join(ROOT, 'export', name + '.json')
    with open(p, 'w') as f: json.dump(out, f, separators=(',', ':'))
    return {'path': p, 'verts': nv, 'tris': len(tris) // 3, 'frames': len(raw), 'bytes': os.path.getsize(p), 'size': [round(s, 2) for s in size]}

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
