# FOB WORKS (GC 0.90): what FOB Commander still drew in code, made here. Run after gc_kit.py:
#   exec(open(ROOT + r'\scripts\gc_kit.py').read()); exec(open(ROOT + r'\scripts\works.py').read())
# - prop_hesco: the Barrier Wall, two wire-mesh baskets lined with cloth and filled with earth, X from -1 to 1, one high.
# - the foundation, in pieces the game lays out to the size dragged (js/base/models.js slabModel), Blender Z up, X along:
#   prop_slab_top_a..d  one tile of its top, its surface at z = 0: a concrete panel with its edges eased into the joint,
#                       plain, with a drain grate, with a tie-down ring and a patch, with lifting anchors
#   prop_slab_side      one tile of its edge, the face toward -Y at y = -0.5, from the top (z = 0) down one: the game
#                       stretches it to the foundation's height. A steel nosing along the top, form-tie bolts, board marks
#   prop_slab_corner    the steel corner guard where two edges meet
#   prop_ramp           one tile of a ramp's body under a road (the game slopes it): kerbs both sides
# Material names say what each is made of for the game's surface texture (js/surface.js): conc/dirt stone, bag fabric.
import math
from mathutils import Vector
R = math.radians; TAU = math.pi * 2
wipe()
m_mesh = mat('w_hesco_mesh', '#6c6f68', rough=0.6, metal=0.5); m_liner = mat('w_hesco_bag', '#b5a687', rough=1.0); m_liner_d = mat('w_hesco_bag_d', '#9c8e70', rough=1.0)
m_fill = mat('w_hesco_dirt', '#6f5c40', rough=1.0)
conc = mat('w_slab_conc', '#8f9089', rough=0.95); conc_d = mat('w_slab_conc_d', '#6d6e67', rough=0.95); conc_p = mat('w_slab_conc_p', '#9d9b92', rough=0.95)
steel = mat('w_slab_steel', '#56595a', rough=0.5, metal=0.6); grate = mat('w_slab_grate', '#34363a', rough=0.6, metal=0.5); rust = mat('w_slab_rust', '#6b4a33', rough=0.9)
hazard = mat('w_slab_hazard', '#d8a82a', rough=0.8); dark = mat('w_slab_dark', '#2a2b2c', rough=1.0)

MADE = []
def disc(name, r, h, z, m, sides=12, r2=None, at=(0, 0)): return cyl(name, (at[0], at[1], z), (at[0], at[1], z + h), r, m=m, sides=sides, r2=r2)
def start(name):
    global CUR
    CUR = coll(name); MADE.append(name); return CUR

def hesco():
    start('prop_hesco')
    for i, x in enumerate((-0.5, 0.5)):
        # the liner, bulging a little between the posts, and the earth heaped in the top
        box('liner%d' % i, (0.94, 0.9, 0.97), (x, 0, 0.485), m=m_liner if i else m_liner_d, bevel=0.035)
        blob('fill%d' % i, r=0.5, scale=(0.92, 0.86, 0.13), loc=(x, 0, 0.965), sub=2, m=m_fill, rough=0.35, seed=i * 3 + 1)
        for sy in (-1, 1):
            for k, sx in enumerate((-0.25, 0.25)): box('bulge%d%d%d' % (i, sy > 0, k), (0.42, 0.04, 0.8), (x + sx, sy * 0.455, 0.46), m=m_liner if i else m_liner_d, bevel=0.02)
        # the cage: posts at the corners and between, wire round it at four heights
        for sx in (-0.48, 0.0, 0.48):
            for sy in (-0.475, 0.475): cyl('post%d%d%d' % (i, int(sx * 100), sy > 0), (x + sx, sy, 0), (x + sx, sy, 1.0), 0.011, m=m_mesh, sides=4)
        for z in (0.03, 0.34, 0.66, 0.99):
            for sy in (-0.48, 0.48): box('wy%d%d%d' % (i, int(z * 100), sy > 0), (0.98, 0.012, 0.012), (x, sy, z), m=m_mesh)
            for sx in (-0.49, 0.49): box('wx%d%d%d' % (i, int(z * 100), sx > 0), (0.012, 0.97, 0.012), (x + sx, 0, z), m=m_mesh)
        for sy in (-0.485, 0.485):
            for sx in (-0.37, -0.12, 0.12, 0.37): box('wv%d%d%d' % (i, int(sx * 100), sy > 0), (0.008, 0.008, 0.98), (x + sx, sy, 0.49), m=m_mesh)

def slab_top(name, extra=None):
    start(name)
    box('panel', (0.982, 0.982, 0.07), (0, 0, -0.035), m=conc, bevel=0.014)
    box('joint', (1.0, 1.0, 0.04), (0, 0, -0.085), m=conc_d)
    if extra: extra()
def top_grate():
    box('frame', (0.56, 0.16, 0.012), (0.08, -0.1, -0.004), m=steel)
    box('slot', (0.5, 0.11, 0.01), (0.08, -0.1, -0.006), m=dark)
    for i in range(9): box('bar%d' % i, (0.012, 0.11, 0.012), (0.08 - 0.24 + i * 0.06, -0.1, -0.003), m=grate)
def top_ring():
    box('patch', (0.36, 0.3, 0.012), (-0.18, 0.16, -0.004), m=conc_p, bevel=0.01)
    box('plate', (0.13, 0.13, 0.01), (0.22, -0.2, 0.0), m=steel, bevel=0.01)
    loft('ring', [((0.22 + 0.045 * math.cos(a), -0.2, 0.012 + 0.045 * math.sin(a)), 0.009, 0.009) for a in [i / 10 * math.pi for i in range(11)]], sides=4, m=rust)
def top_anchor():
    for x, y in ((-0.3, -0.3), (0.3, -0.3), (-0.3, 0.3), (0.3, 0.3)): disc('anch%d%d' % (x > 0, y > 0), 0.03, 0.008, -0.004, rust, 6, at=(x, y))
    box('stain', (0.3, 0.22, 0.004), (0.05, 0.02, -0.0005), m=conc_d)

def slab_side():
    start('prop_slab_side')
    box('face', (1.0, 0.14, 1.0), (0, -0.43, -0.5), m=conc, bevel=0.008)
    for z in (-0.34, -0.67): box('board%d' % int(-z * 100), (1.0, 0.006, 0.012), (0, -0.501, z), m=conc_d)
    box('nose', (1.0, 0.05, 0.035), (0, -0.48, -0.0175), m=steel, bevel=0.004)
    box('lip', (1.0, 0.012, 0.09), (0, -0.505, -0.06), m=steel)
    for x in (-0.25, 0.25):
        for z in (-0.2, -0.52): disc('tie%d%d' % (x > 0, int(-z * 100)), 0.018, 0.012, 0, rust, 6, at=(0, 0)); o = bpy.data.objects['tie%d%d' % (x > 0, int(-z * 100))]; o.rotation_euler = (R(90), 0, 0); o.location = (x, -0.5, z)
    box('streak', (0.08, 0.004, 0.5), (0.18, -0.502, -0.3), m=rust)
def slab_corner():
    start('prop_slab_corner')
    box('guard_a', (0.12, 0.012, 1.0), (-0.44, -0.505, -0.5), m=steel)
    box('guard_b', (0.012, 0.12, 1.0), (-0.505, -0.44, -0.5), m=steel)
    box('cap', (0.1, 0.1, 0.04), (-0.46, -0.46, -0.02), m=hazard)
def ramp():
    start('prop_ramp')
    box('body', (1.0, 1.0, 1.0), (0, 0, -0.5), m=conc, bevel=0.006)
    for s in (-1, 1): box('kerb%d' % s, (1.0, 0.08, 0.09), (0, s * 0.46, 0.04), m=conc_p, bevel=0.01); box('kstripe%d' % s, (1.0, 0.085, 0.02), (0, s * 0.46, 0.085), m=hazard)

OUT = {}
for fn in (hesco, (lambda: slab_top('prop_slab_top_a')), (lambda: slab_top('prop_slab_top_b', top_grate)), (lambda: slab_top('prop_slab_top_c', top_ring)), (lambda: slab_top('prop_slab_top_d', top_anchor)), slab_side, slab_corner, ramp):
    fn(); bpy.context.view_layer.update()
    OUT[MADE[-1]] = export(MADE[-1], CUR, {'stand': (lambda: None)}, lod=0)
# the picture: a foundation of the pieces, three by two, one high, with a barrier wall before it and a ramp up to it
for i, name in enumerate(MADE):
    for o in bpy.data.collections[name].objects:
        if o.parent is None: o.location = Vector(o.location) + Vector(((i % 4) * 2.6, -(i // 4) * 2.8, 0))
PIC = shot('works', dist=14, target=(4.0, -1.4, 0.0), res=(1400, 900), az=28, el=38)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'works.blend'))
