# SCANNED ASSETS (GC 0.91, Ramzies: "we're shooting for GTA V, not PlayStation 2"; "use CC0 scans"). Real photoscanned models
# and material sets from Poly Haven (polyhaven.com, CC0: free for any use, no credit needed, though the game credits them),
# fetched and cut down to what a browser can draw, here in Blender:
#   model(id, name, lod, tris, height)   a tree, a rock, a shrub: its glTF at 1k textures, the level of detail asked for kept
#                                         (Poly Haven ships LOD0..LOD3 in one file), cut further to `tris` triangles if it
#                                         is still heavier, stood on its base at the origin, written as export/scans/<name>.glb
#   texture(id, name)                     a ground's material set: colour, normal (OpenGL) and roughness, 1k, as JPEGs
#   hdri(id, name)                        a sky, 1k, for the light that falls from it
# Everything downloaded is kept in scans_cache/ so a second run costs nothing. Run in Blender after gc_kit.py (for ROOT):
#   exec(open(ROOT + r'\scripts\scans.py').read()); model('quiver_tree_01', 'tree_desert', lod=2, tris=9000)
import bpy, os, json, urllib.request, shutil
try: ROOT
except NameError: ROOT = os.path.join(os.path.expanduser('~'), 'Documents', 'GalacticCommandAssets')
CACHE = os.path.join(ROOT, 'scans_cache'); OUT = os.path.join(ROOT, 'renders', 'export', 'scans')
os.makedirs(CACHE, exist_ok=True); os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'GalacticCommandAssets/1.0 (game asset pipeline)'}
def _get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120) as r: return r.read()
def _json(u): return json.loads(_get(u))
def _fetch(url, dst):
    if os.path.exists(dst) and os.path.getsize(dst) > 0: return dst
    os.makedirs(os.path.dirname(dst), exist_ok=True); tmp = dst + '.part'
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=600) as r, open(tmp, 'wb') as f: shutil.copyfileobj(r, f, 1 << 20)
    os.replace(tmp, dst); return dst
def gltf_files(aid, res='1k'):
    """Download a model's glTF (and everything it includes) into the cache; returns the .gltf path."""
    g = _json('https://api.polyhaven.com/files/' + aid)['gltf'][res]['gltf']; d = os.path.join(CACHE, aid)
    main = _fetch(g['url'], os.path.join(d, os.path.basename(g['url'])))
    for rel, v in g.get('include', {}).items(): _fetch(v['url'], os.path.join(d, rel))
    return main
def _clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for x in list(coll):
            if x.users == 0: coll.remove(x)
def tris_of(objs):
    n = 0
    for o in objs:
        if o.type == 'MESH': n += sum(len(p.vertices) - 2 for p in o.data.polygons)
    return n
def thin(ob, keep, grow, rx=r'leaf|leaves|needle|branch|twig|frond'):
    """(GC 0.91, 30-144 frames a second) A tree's leaves are thousands of separate cards, which no cut can merge: keep a share
    of them (the same ones each time), each grown about its middle so the crown stays as full."""
    import bmesh, random, re
    rnd = random.Random(7); mats = {i for i, m in enumerate(ob.data.materials) if m and re.search(rx, m.name.lower())}
    if not mats: return 0
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.faces.ensure_lookup_table(); seen = set(); kill = []; n = 0
    for f in bm.faces:
        if f.index in seen or f.material_index not in mats: continue
        isl = [f]; seen.add(f.index); stack = [f]
        while stack:
            g = stack.pop()
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen and h.material_index in mats: seen.add(h.index); isl.append(h); stack.append(h)
        n += 1
        if rnd.random() > keep: kill.extend(isl); continue
        vs = {v for q in isl for v in q.verts}; c = sum((v.co for v in vs), vs.__iter__().__next__().co * 0) / len(vs)
        for v in vs: v.co = c + (v.co - c) * grow
    bmesh.ops.delete(bm, geom=list(set(kill)), context='FACES'); bm.to_mesh(ob.data); bm.free(); return n
def model(aid, name, lod=None, tris=None, height=None, res='1k', tex=1024, upright=False, cards=None, only=None, rx=None):
    """One scanned model into export/scans/<name>.glb, cut to its level of detail and triangle budget."""
    scn = bpy.data.scenes.get('gc_scans') or bpy.data.scenes.new('gc_scans'); bpy.context.window.scene = scn
    _clear(); path = gltf_files(aid, res)
    bpy.ops.import_scene.gltf(filepath=path, merge_vertices=True)     # (joined at its seams, so the cut can work across them)
    meshes = [o for o in scn.objects if o.type == 'MESH']
    if only:     # (a file of several: the one asked for)
        for o in meshes:
            if o.name != only: bpy.data.objects.remove(o, do_unlink=True)
        meshes = [o for o in scn.objects if o.type == 'MESH']
    names = sorted(o.name for o in meshes)
    if upright:     # (a trunk scanned lying down: stood up on its thick end)
        import mathutils
        for o in meshes: o.matrix_world = mathutils.Matrix.Rotation(-1.5708, 4, 'Y') @ o.matrix_world
    if lod is not None:     # Poly Haven names its levels ..._LOD0 to _LOD3: keep the one asked for (or the nearest there is)
        has = sorted({int(n.split('LOD')[-1][:1]) for n in names if 'LOD' in n and n.split('LOD')[-1][:1].isdigit()})
        if has:
            want = min(has, key=lambda k: abs(k - lod))
            for o in meshes:
                if 'LOD' in o.name and not o.name.split('LOD')[-1].startswith(str(want)): bpy.data.objects.remove(o, do_unlink=True)
    meshes = [o for o in scn.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    for o in list(scn.objects):
        if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active; ob.name = name
    before = tris_of([ob])
    if cards: thin(ob, cards[0], cards[1], **({'rx': rx} if rx else {}))
    if tris and tris_of([ob]) > tris:     # cut it down, keeping its outline (UVs and the material edges are kept by the collapse)
        m = ob.modifiers.new('cut', 'DECIMATE'); m.ratio = max(0.01, tris / tris_of([ob])); m.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier='cut')
    # stand it on its base, centred, and (if asked) at a height in metres
    import mathutils
    bb = [ob.matrix_world @ mathutils.Vector(c) for c in ob.bound_box]
    lo = mathutils.Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb))); hi = mathutils.Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
    if height: s = height / max(1e-6, hi.z - lo.z); ob.scale = (s, s, s); bpy.ops.object.transform_apply(scale=True); lo *= s; hi *= s
    ob.data.transform(mathutils.Matrix.Translation((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))); ob.location = (0, 0, 0)
    for img in bpy.data.images:     # textures no bigger than asked (a small rock needs no more than 512)
        if img.size[0] > tex: img.scale(tex, max(1, int(tex * img.size[1] / img.size[0])))
    out = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_yup=True, export_apply=True,
                              export_image_format='AUTO', export_jpeg_quality=82, export_texcoords=True, export_normals=True,
                              export_tangents=False, export_materials='EXPORT', export_animations=False, export_extras=False)
    after = tris_of([ob]); dims = [round(hi.x - lo.x, 3), round(hi.z - lo.z, 3), round(hi.y - lo.y, 3)]
    rec = {'id': aid, 'name': name, 'tris': after, 'from': before, 'size': dims, 'bytes': os.path.getsize(out), 'materials': [m.name for m in ob.data.materials]}
    man = os.path.join(OUT, 'manifest.json'); M = json.load(open(man)) if os.path.exists(man) else {}
    M[name] = rec; json.dump(M, open(man, 'w'), indent=1); return rec
def texture(aid, name, res='1k', maps=(('Diffuse', 'diff'), ('nor_gl', 'nor'), ('Rough', 'rough'))):
    """A ground's material set into export/scans/<name>_<map>.jpg."""
    f = _json('https://api.polyhaven.com/files/' + aid); got = {}
    for key, short in maps:
        v = f.get(key, {}).get(res, {}); u = (v.get('jpg') or v.get('png') or {}).get('url')
        if not u: continue
        src = _fetch(u, os.path.join(CACHE, aid, os.path.basename(u))); dst = os.path.join(OUT, '%s_%s%s' % (name, short, os.path.splitext(u)[1]))
        shutil.copyfile(src, dst); got[short] = os.path.getsize(dst)
    man = os.path.join(OUT, 'manifest.json'); M = json.load(open(man)) if os.path.exists(man) else {}
    dim = _json('https://api.polyhaven.com/info/' + aid).get('dimensions')     # (millimetres the picture spans, where known)
    M['tex:' + name] = {'id': aid, 'maps': got, 'mm': dim}; json.dump(M, open(man, 'w'), indent=1); return M['tex:' + name]
def hdri(aid, name, res='1k'):
    f = _json('https://api.polyhaven.com/files/' + aid); u = f['hdri'][res]['hdr']['url']
    dst = os.path.join(OUT, name + '.hdr'); shutil.copyfile(_fetch(u, os.path.join(CACHE, aid, os.path.basename(u))), dst); return os.path.getsize(dst)
