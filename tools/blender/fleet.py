# THE FLEET'S FIELD KIT (GC 0.64): the things your side builds, made once and shared by the ground fight and FOB Commander.
# Run after gc_kit.py:
#   exec(open(ROOT + r'\scripts\gc_kit.py').read()); exec(open(ROOT + r'\scripts\fleet.py').read())
# One look for all of it: dark gunmetal armour in angular plates, pale panels, hazard stripes, cyan light strips and a little
# warning pink: a private fleet's kit, built for the cameras. Nothing from an old war: no wheels and trails, no timber, no
# canvas. Each stands on the ground at the origin with a footprint radius of about one (the games size it), Z up, its front
# to -Y. One frame, `stand`. Every piece touches another or the ground (test/floating.py checks).
#
# Who uses what (js/base/models.js SHARED, js/ground/render/posts.js P3_POST):
#   prop_post_arty     the ground fight's Artillery Cannon, and its abandoned field gun (side objective)
#   prop_post_mg       the Heavy Turret Nest's barrier ring; FOB Commander's Defence Turret stands on it too
#   prop_post_mggun    the gun on it, which turns
#   prop_post_lookout  the Lookout Tower in both games
#   site_pad           the landing pad in both games (the VIP's pad on the ground, FOB Commander's Landing Pad)
#   prop_wire          barbed wire on steel posts, along a line (the ground fight's wire; FOB Commander's wire)
#   prop_post_sam      the SAM Site;  prop_post_tower  the Propaganda Tower (ground fight)
#   site_silo          (sites.py) the launch silo: the ground fight's nuke objective, and FOB Commander's Missile Silo
# ONLY (a tuple of function names) builds just those.
import math, os, shutil
from mathutils import Vector
R = math.radians; TAU = math.pi * 2
wipe()
armor = mat('k_armor', '#3b4249', rough=0.55, metal=0.5); armor_d = mat('k_armor_d', '#23282d', rough=0.6, metal=0.4)
plate = mat('k_plate', '#6b747c', rough=0.5, metal=0.4); pale = mat('k_pale', '#aeb6bb', rough=0.55, metal=0.2); black = mat('k_black', '#14171a', rough=0.7)
hazard = mat('k_hazard', '#e8b72a', rough=0.6); conc = mat('k_conc', '#7d817f', rough=0.95); conc_d = mat('k_conc_d', '#5a5e5c', rough=0.95)
glow = mat('k_glow', '#7fe9e0', emit=2.5); pink = mat('k_pink', '#ff3ea5', emit=2.5); red = mat('k_red', '#ff4a3a', emit=2.5); white = mat('k_white', '#e8eef0', rough=0.5)
OUTDIR = os.path.join(ROOT, 'renders', 'export')     # (a copy of each export, where a linked session can pick it up)
os.makedirs(OUTDIR, exist_ok=True)

MADE = []
def start(name):
    global CUR
    CUR = coll(name); MADE.append(name); return CUR
def disc(name, r, h, z, m, sides=12, r2=None, at=(0, 0)): return cyl(name, (at[0], at[1], z), (at[0], at[1], z + h), r, m=m, sides=sides, r2=r2)
def ball(name, loc, m, r=0.05, sub=1): return blob(name, r=r, loc=loc, sub=sub, m=m)
def V(*a): return Vector(a)
def along(name, a, d, t0, t1, w, h, m, rot):
    """A plate along the line a + d*t from t0 to t1: w across (X), h thick."""
    c = a + d * ((t0 + t1) / 2); return box(name, (w, t1 - t0, h), tuple(c), m=m, rot=rot)
def chevrons(name, r, z, n, h=0.025, w=0.12):
    """Hazard blocks round a rim, yellow and black by turns."""
    for i in range(n):
        a = (i + 0.5) / n * TAU
        box('%s%d' % (name, i), (w, 0.05, h), (math.cos(a) * r, math.sin(a) * r, z + h / 2), m=hazard if i % 2 == 0 else black, rot=(0, 0, a + math.pi / 2))
def ship(fn):
    fn(); bpy.context.view_layer.update()
    o = export(MADE[-1], CUR, {'stand': (lambda: None)}, lod=0)
    shutil.copy(o['path'], os.path.join(OUTDIR, MADE[-1] + '.json'))
    return o

# ---------------------------------------------------------------- the artillery
def post_arty():
    # a mass driver on an armoured plinth: four braced legs instead of wheels and trails; a turntable; an angular housing with
    # cheek plates, vents and light strips; a rail barrel ringed with glowing coils; capacitor canisters behind; mini-nuke slugs
    start('prop_post_arty')
    disc('plinth', 0.74, 0.12, 0, armor_d, 8); disc('deck', 0.68, 0.035, 0.12, plate, 8); chevrons('chev', 0.7, 0.12, 16)
    for i in range(4):
        a = R(45) + i * R(90); c, s = math.cos(a), math.sin(a)
        cyl('leg%d' % i, (c * 0.5, s * 0.5, 0.1), (c * 0.98, s * 0.98, 0.05), 0.045, m=armor, sides=6)
        cyl('ram%d' % i, (c * 0.58, s * 0.58, 0.16), (c * 0.9, s * 0.9, 0.08), 0.022, m=pale, sides=5)
        box('pad%d' % i, (0.2, 0.2, 0.05), (c * 1.0, s * 1.0, 0.025), m=black, bevel=0.01, rot=(0, 0, a))
        box('padl%d' % i, (0.05, 0.05, 0.012), (c * 1.0, s * 1.0, 0.054), m=glow, rot=(0, 0, a))
    disc('turn', 0.48, 0.08, 0.155, black, 12); disc('ring', 0.5, 0.016, 0.2, glow, 16)
    box('house', (0.62, 0.78, 0.36), (0, 0.1, 0.41), m=armor, bevel=0.04, taper=0.78)
    box('glacis', (0.5, 0.26, 0.05), (0, -0.25, 0.42), m=plate, bevel=0.012, rot=(R(52), 0, 0))
    for k in range(3): box('chv%d' % k, (0.07, 0.1, 0.012), (-0.12 + k * 0.12, -0.27, 0.445), m=hazard if k != 1 else glow, rot=(R(52), 0, 0))
    box('hatch', (0.22, 0.22, 0.035), (0.0, 0.3, 0.6), m=pale, bevel=0.01); box('hatchl', (0.14, 0.02, 0.012), (0, 0.2, 0.62), m=glow)
    for sx in (-1, 1):
        box('cheek%d' % (sx > 0), (0.07, 0.66, 0.4), (sx * 0.33, 0.06, 0.45), m=plate, bevel=0.015, rot=(0, sx * R(-8), 0))
        box('strip%d' % (sx > 0), (0.012, 0.46, 0.03), (sx * 0.37, 0.04, 0.55), m=glow, rot=(0, sx * R(-8), 0))
        box('haz%d' % (sx > 0), (0.012, 0.14, 0.16), (sx * 0.37, -0.2, 0.4), m=hazard, rot=(0, sx * R(-8), 0))
        for k in range(3): box('vent%d%d' % (sx > 0, k), (0.012, 0.18, 0.018), (sx * 0.365, 0.2, 0.36 + k * 0.045), m=black, rot=(0, sx * R(-8), 0))
    el = R(32); p = V(0, -0.06, 0.64); d = V(0, -math.cos(el), math.sin(el)); rot = (-el, 0, 0); L = 1.62; up = V(0, math.sin(el), math.cos(el))
    box('breech', (0.34, 0.42, 0.3), tuple(p + d * 0.08), m=armor_d, bevel=0.03, rot=rot)
    along('shroud', p, d, 0.25, 0.7, 0.3, 0.26, armor_d, rot)
    along('shroudl', p + up * 0.135, d, 0.3, 0.66, 0.05, 0.012, glow, rot)
    for sx in (-1, 1):
        along('rail%d' % (sx > 0), p + V(sx * 0.095, 0, 0), d, 0.6, L, 0.055, 0.12, armor, rot)
        along('railin%d' % (sx > 0), p + V(sx * 0.066, 0, 0), d, 0.72, L - 0.04, 0.008, 0.06, glow, rot)
    for k in range(4):
        t = 0.82 + k * 0.2
        cyl('coil%d' % k, tuple(p + d * t), tuple(p + d * (t + 0.045)), 0.125, m=armor_d, sides=8)
        cyl('band%d' % k, tuple(p + d * (t + 0.012)), tuple(p + d * (t + 0.033)), 0.131, m=glow, sides=8)
    for sz in (-1, 1): along('capr%d' % (sz > 0), p + up * sz * 0.075, d, L - 0.08, L, 0.25, 0.03, black, rot)
    along('muzzlel', p + up * 0.095, d, L - 0.07, L - 0.01, 0.16, 0.012, pink, rot)
    for sx in (-1, 1):
        x = sx * 0.2
        cyl('cap%d' % (sx > 0), (x, 0.44, 0.2), (x, 0.44, 0.62), 0.1, m=pale, sides=8)
        for z in (0.3, 0.42, 0.54): cyl('capb%d%d' % (sx > 0, z * 100), (x, 0.44, z), (x, 0.44, z + 0.025), 0.104, m=black, sides=8)
        disc('capt%d' % (sx > 0), 0.07, 0.02, 0.62, glow, 8, at=(x, 0.44))
        cyl('cable%d' % (sx > 0), (x, 0.4, 0.58), (sx * 0.1, 0.06, 0.72), 0.022, m=black, sides=5)
    cyl('mast', (-0.26, 0.24, 0.58), (-0.26, 0.24, 0.98), 0.016, m=black, sides=5); box('sensor', (0.1, 0.09, 0.08), (-0.26, 0.22, 0.6), m=armor_d, bevel=0.01)
    box('lens', (0.05, 0.012, 0.04), (-0.26, 0.17, 0.61), m=glow); ball('tip', (-0.26, 0.24, 0.99), red, 0.022)
    box('rack', (0.3, 0.2, 0.05), (0.42, 0.34, 0.18), m=black, bevel=0.008, rot=(0, 0, R(-35)))
    for i in range(4):
        a = R(-35); u = ((i % 2) - 0.5) * 0.12; v = ((i // 2) - 0.5) * 0.09
        x, y = 0.42 + u * math.cos(a) - v * math.sin(a), 0.34 + u * math.sin(a) + v * math.cos(a)
        cyl('slug%d' % i, (x, y, 0.2), (x, y, 0.4), 0.038, m=hazard, sides=8); cyl('slugb%d' % i, (x, y, 0.29), (x, y, 0.32), 0.04, m=black, sides=8)
        loft('slugt%d' % i, [((x, y, 0.4), 0.038, 0.038), ((x, y, 0.46), 0.006, 0.006)], sides=8, m=pink)

# ---------------------------------------------------------------- the heavy turret: its barrier ring, and the gun that turns on it
def post_mg():
    # (one unit = 2 m) a chest-high horseshoe of modular blast barriers round the front and the sides, open at the back where
    # the crew stand; a deck plate, ammunition and a terminal
    start('prop_post_mg')
    disc('floor', 0.96, 0.03, 0, armor_d, 8); disc('inner', 0.62, 0.012, 0.03, plate, 8)
    n = 7
    for i in range(n):
        a = R(150) + R(240) * (i + 0.5) / n; c, s = math.cos(a), math.sin(a); rz = a + math.pi / 2
        box('seg%d' % i, (0.44, 0.17, 0.5), (c * 0.8, s * 0.8, 0.28), m=conc, bevel=0.02, rot=(0, 0, rz), taper=0.86)
        box('band%d' % i, (0.445, 0.175, 0.05), (c * 0.8, s * 0.8, 0.38), m=hazard if i % 2 == 0 else black, rot=(0, 0, rz))
        box('lit%d' % i, (0.22, 0.012, 0.014), (c * 0.72, s * 0.72, 0.5), m=glow, rot=(0, 0, rz))
        box('foot%d' % i, (0.46, 0.24, 0.04), (c * 0.8, s * 0.8, 0.05), m=conc_d, rot=(0, 0, rz))
    for k, (x, y, z, r) in enumerate([(0.44, 0.38, 0.09, 20), (0.46, 0.36, 0.22, 8)]):
        box('ammo%d' % k, (0.22, 0.15, 0.13), (x, y, z), m=armor, bevel=0.01, rot=(0, 0, R(r))); box('amml%d' % k, (0.1, 0.01, 0.03), (x - 0.01, y - 0.075, z), m=glow, rot=(0, 0, R(r)))
    cyl('term', (-0.46, 0.4, 0.03), (-0.46, 0.4, 0.42), 0.025, m=black, sides=5); box('screen', (0.18, 0.05, 0.12), (-0.46, 0.38, 0.46), m=armor_d, bevel=0.01, rot=(R(20), 0, 0)); box('scrl', (0.15, 0.01, 0.09), (-0.46, 0.355, 0.465), m=glow, rot=(R(20), 0, 0))
def post_mggun():
    # a twin rotary autocannon on a pedestal, behind an angled shield with a lit sight slit; an ammunition drum on its right
    start('prop_post_mggun')
    disc('base', 0.17, 0.05, 0.03, armor_d, 8); cyl('post', (0, 0, 0.08), (0, 0, 0.5), 0.05, m=black, sides=6)
    disc('ring', 0.11, 0.04, 0.48, armor, 8); box('yoke', (0.24, 0.14, 0.1), (0, 0, 0.55), m=armor_d, bevel=0.01)
    box('recv', (0.2, 0.44, 0.17), (0, 0.02, 0.66), m=armor, bevel=0.02); box('recvl', (0.012, 0.3, 0.02), (-0.104, 0.02, 0.69), m=glow); box('recvl2', (0.012, 0.3, 0.02), (0.104, 0.02, 0.69), m=glow)
    cyl('shroud', (0, -0.2, 0.66), (0, -0.52, 0.66), 0.07, m=armor_d, sides=8)
    for k, y in enumerate((-0.3, -0.44)): cyl('sb%d' % k, (0, y, 0.66), (0, y - 0.02, 0.66), 0.074, m=glow, sides=8)
    for sx in (-1, 1): cyl('bar%d' % (sx > 0), (sx * 0.035, -0.4, 0.66), (sx * 0.035, -0.86, 0.66), 0.02, m=black, sides=6)
    cyl('drum2', (0.1, 0.04, 0.64), (0.24, 0.04, 0.64), 0.1, m=plate, sides=10); cyl('drumb', (0.16, 0.04, 0.64), (0.18, 0.04, 0.64), 0.103, m=hazard, sides=10)
    box('shield', (0.52, 0.04, 0.34), (0, -0.2, 0.66), m=plate, bevel=0.012, rot=(R(-12), 0, 0)); box('slit', (0.16, 0.01, 0.03), (0, -0.225, 0.72), m=glow, rot=(R(-12), 0, 0))
    for sx in (-1, 1): box('wing%d' % (sx > 0), (0.12, 0.04, 0.28), (sx * 0.3, -0.16, 0.64), m=plate, bevel=0.01, rot=(R(-12), 0, sx * R(-25)))
    box('eye', (0.08, 0.1, 0.06), (0, -0.04, 0.78), m=armor_d, bevel=0.01); box('lens', (0.05, 0.01, 0.03), (0, -0.095, 0.78), m=pink)
    for sx in (-1, 1): cyl('grip%d' % (sx > 0), (sx * 0.06, 0.24, 0.66), (sx * 0.06, 0.34, 0.62), 0.014, m=black, sides=5)

# ---------------------------------------------------------------- the lookout
def post_lookout():
    # (one unit = 1.6 m) steel legs on concrete feet, X-braced; an eight-sided deck with an armoured parapet lit along its top,
    # open at the back where the ladder comes up; a searchlight and an aerial. No roof: the lookouts are seen from above.
    start('prop_post_lookout')
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl('leg%d%d' % (sx, sy), (sx * 0.64, sy * 0.64, 0), (sx * 0.56, sy * 0.56, 2.4), 0.055, m=armor_d, sides=4)
            box('foot%d%d' % (sx, sy), (0.22, 0.22, 0.1), (sx * 0.64, sy * 0.64, 0.05), m=conc, bevel=0.01)
    pts = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    for z0, z1 in ((0.1, 1.2), (1.2, 2.3)):
        r0 = 0.64 - 0.08 * z0 / 2.4; r1 = 0.64 - 0.08 * z1 / 2.4
        for i in range(4):
            (ax, ay), (bx, by) = pts[i], pts[(i + 1) % 4]
            cyl('x%d%d' % (z0 * 10, i), (ax * r0, ay * r0, z0), (bx * r1, by * r1, z1), 0.018, m=black, sides=4)
            cyl('h%d%d' % (z0 * 10, i), (ax * r1, ay * r1, z1), (bx * r1, by * r1, z1), 0.022, m=armor, sides=4)
    disc('under', 0.8, 0.06, 2.32, armor_d, 8); disc('deck', 0.86, 0.06, 2.38, plate, 8); chevrons('chev', 0.84, 2.44, 16, h=0.012, w=0.1)
    for i in range(8):
        a = (i + 0.5) / 8 * TAU
        if 1.2 < a < 1.95: continue
        c, s = math.cos(a), math.sin(a)
        box('wall%d' % i, (0.62, 0.05, 0.34), (c * 0.8, s * 0.8, 2.61), m=armor, bevel=0.01, rot=(0, 0, a + math.pi / 2))
        box('wlit%d' % i, (0.4, 0.06, 0.02), (c * 0.8, s * 0.8, 2.74), m=glow, rot=(0, 0, a + math.pi / 2))
    cyl('lpost', (0.4, -0.66, 2.44), (0.4, -0.66, 3.0), 0.02, m=black, sides=5); box('lamp', (0.16, 0.18, 0.12), (0.4, -0.7, 3.02), m=black, bevel=0.015); box('lens', (0.12, 0.01, 0.08), (0.4, -0.795, 3.02), m=glow)
    cyl('ant', (-0.5, -0.5, 2.44), (-0.5, -0.5, 3.4), 0.012, m=black, sides=4); ball('anttip', (-0.5, -0.5, 3.41), red, 0.025)
    for sx in (-1, 1): cyl('lad%d' % (sx > 0), (sx * 0.13, 0.86, 0), (sx * 0.13, 0.74, 2.42), 0.02, m=black, sides=4)
    for k in range(7):
        z = 0.3 + k * 0.33; y = 0.86 - 0.12 * z / 2.42
        cyl('rung%d' % k, (-0.13, y, z), (0.13, y, z), 0.013, m=pale, sides=4)

# ---------------------------------------------------------------- the landing pad
def site_pad():
    # an eight-sided concrete slab with an armoured deck, hazard edge, a lit landing ring and the H; lights round the rim, two
    # beacon masts and a fuel point. Low, so a dropship sits on it and nobody is hidden by it.
    start('site_pad')
    o = disc('slab', 1.0, 0.05, 0, conc_d, 8); o.rotation_euler = (0, 0, R(22.5))
    o = disc('top', 0.93, 0.012, 0.05, armor, 8); o.rotation_euler = (0, 0, R(22.5))
    for i in range(24):
        a = (i + 0.5) / 24 * TAU; r = 0.965 / math.cos(((a - R(22.5)) % R(45)) - R(22.5)) * math.cos(R(22.5))
        box('edge%d' % i, (0.2, 0.05, 0.016), (math.cos(a) * r * 0.97, math.sin(a) * r * 0.97, 0.058), m=hazard if i % 2 == 0 else black, rot=(0, 0, a + math.pi / 2))
    disc('ring', 0.62, 0.004, 0.062, glow, 24); disc('ringin', 0.585, 0.006, 0.062, armor, 24)
    box('h1', (0.08, 0.5, 0.008), (-0.18, 0, 0.068), m=hazard); box('h2', (0.08, 0.5, 0.008), (0.18, 0, 0.068), m=hazard); box('h3', (0.36, 0.08, 0.008), (0, 0, 0.068), m=hazard)
    for i in range(8):
        a = i / 8 * TAU + R(22.5); r = 0.9
        box('light%d' % i, (0.07, 0.07, 0.03), (math.cos(a) * r, math.sin(a) * r, 0.07), m=glow if i % 2 else pink)
    for k, (x, y) in enumerate([(0.82, -0.82), (-0.82, 0.82)]):
        cyl('mast%d' % k, (x, y, 0.0), (x, y, 0.5), 0.02, m=black, sides=5); ball('beacon%d' % k, (x, y, 0.52), red, 0.035)
    box('fuel', (0.14, 0.1, 0.24), (0.86, 0.62, 0.12), m=armor_d, bevel=0.01); box('fuell', (0.1, 0.01, 0.05), (0.86, 0.565, 0.18), m=glow)

# ---------------------------------------------------------------- the SAM site
def post_sam():
    # an armoured turntable; a box launcher of six cells on a yoke, raised 38 degrees, lit along its sides; a flat radar on a mast
    start('prop_post_sam')
    disc('base', 0.76, 0.14, 0, armor_d, 8); disc('deck', 0.7, 0.03, 0.14, plate, 8); chevrons('chev', 0.72, 0.14, 16)
    disc('turn', 0.42, 0.1, 0.17, black, 12); disc('ring', 0.44, 0.014, 0.22, glow, 16)
    box('yoke', (0.62, 0.42, 0.36), (0, 0.12, 0.45), m=armor, bevel=0.03, taper=0.82)
    for sx in (-1, 1): box('arm%d' % (sx > 0), (0.08, 0.3, 0.5), (sx * 0.34, 0.02, 0.72), m=armor_d, bevel=0.01)
    el = R(38); rot = (-el, 0, 0); c = V(0, -0.12, 0.98); d = V(0, -math.cos(el), math.sin(el)); up = V(0, math.sin(el), math.cos(el))
    box('pod', (0.62, 1.2, 0.42), tuple(c), m=armor, bevel=0.03, rot=rot)
    box('podtop', (0.5, 0.9, 0.02), tuple(c + up * 0.215), m=plate, rot=rot)
    for sx in (-1, 1): box('podl%d' % (sx > 0), (0.02, 0.8, 0.03), tuple(c + up * 0.12 + V(sx * 0.315, 0, 0)), m=glow, rot=rot)
    f = c + d * 0.6
    box('face', (0.58, 0.03, 0.38), tuple(f), m=black, rot=rot)
    for i in range(3):
        for j in range(2):
            p = f + V(-0.18 + i * 0.18, 0, 0) + up * (-0.09 + j * 0.18) + d * 0.02
            box('cell%d%d' % (i, j), (0.12, 0.03, 0.12), tuple(p), m=pink if (i + j) % 2 == 0 else hazard, rot=rot)
    for sx in (-1, 1): box('haz%d' % (sx > 0), (0.02, 0.16, 0.36), tuple(c + d * 0.42 + V(sx * 0.315, 0, 0)), m=hazard, rot=rot)
    cyl('rmast', (0, 0.3, 0.6), (0, 0.42, 1.18), 0.035, m=black, sides=6)
    box('radar', (0.56, 0.05, 0.4), (0, 0.46, 1.32), m=plate, bevel=0.01, rot=(R(-20), 0, 0))
    for k in range(3): box('rgrid%d' % k, (0.5, 0.012, 0.02), (0, 0.445 + 0.034 * (k - 1), 1.23 + k * 0.09), m=glow, rot=(R(-20), 0, 0))
    ball('beacon', (0.26, 0.2, 0.64), red, 0.03)

# ---------------------------------------------------------------- the propaganda tower
def post_tower():
    # (one unit = 2.2 m) a tapering steel mast with a lit screen and two loudspeakers on top; well behind it, the operator's
    # console in a crescent of barrier blocks, open at the back, a cable to the mast
    start('prop_post_tower')
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl('leg%d%d' % (sx, sy), (sx * 0.56, sy * 0.56, 0), (sx * 0.34, sy * 0.34, 2.6), 0.05, m=armor_d, sides=4)
            box('foot%d%d' % (sx, sy), (0.2, 0.2, 0.1), (sx * 0.56, sy * 0.56, 0.05), m=conc, bevel=0.01)
    pts = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    for z0, z1 in ((0.1, 0.95), (0.95, 1.8), (1.8, 2.55)):
        r0 = 0.56 - 0.22 * z0 / 2.6; r1 = 0.56 - 0.22 * z1 / 2.6
        for i in range(4):
            (ax, ay), (bx, by) = pts[i], pts[(i + 1) % 4]
            cyl('x%d%d' % (z0 * 10, i), (ax * r0, ay * r0, z0), (bx * r1, by * r1, z1), 0.016, m=black, sides=4)
            cyl('h%d%d' % (z0 * 10, i), (ax * r1, ay * r1, z1), (bx * r1, by * r1, z1), 0.02, m=armor, sides=4)
    disc('cap', 0.46, 0.08, 2.55, armor, 8)
    box('screen', (1.3, 0.12, 0.72), (0, -0.06, 3.05), m=armor_d, bevel=0.02)
    box('glass', (1.18, 0.02, 0.6), (0, -0.13, 3.05), m=pink); box('logo', (0.5, 0.025, 0.14), (0, -0.14, 3.1), m=glow); box('bar', (0.9, 0.025, 0.05), (0, -0.14, 2.88), m=white)
    box('screenb', (1.36, 0.16, 0.06), (0, -0.06, 2.66), m=black)
    for sx in (-1, 1):
        box('spk%d' % (sx > 0), (0.24, 0.26, 0.3), (sx * 0.5, 0.18, 2.78), m=plate, bevel=0.02)
        loft('horn%d' % (sx > 0), [((sx * 0.5, 0.04, 2.78), 0.08, 0.08), ((sx * 0.5, -0.12, 2.78), 0.16, 0.13)], sides=8, m=black)
    cyl('ant', (0.3, -0.06, 3.38), (0.3, -0.06, 3.85), 0.012, m=black, sides=4); ball('anttip', (0.3, -0.06, 3.86), red, 0.025)
    # the operator's station, well behind the mast: nothing of it reaches the legs or the braces (the back legs stand at y 0.56)
    cy = 1.62
    box('pad', (1.2, 0.9, 0.025), (0, cy + 0.05, 0.0125), m=armor_d)
    box('desk', (0.36, 0.2, 0.42), (0, cy - 0.12, 0.21), m=armor, bevel=0.015); box('panel', (0.32, 0.03, 0.2), (0, cy - 0.18, 0.52), m=armor_d, rot=(R(-20), 0, 0)); box('panl', (0.26, 0.012, 0.14), (0, cy - 0.195, 0.525), m=glow, rot=(R(-20), 0, 0))
    cyl('cable', (0, cy - 0.22, 0.02), (0, 0.6, 0.02), 0.02, m=black, sides=5)
    for i in range(4):
        a = R(195) + R(150) * (i + 0.5) / 4; c, s = math.cos(a), math.sin(a)
        box('blk%d' % i, (0.3, 0.13, 0.36), (c * 0.5, cy + s * 0.5, 0.18), m=conc, bevel=0.015, rot=(0, 0, a + math.pi / 2), taper=0.86)
        box('blkb%d' % i, (0.305, 0.135, 0.04), (c * 0.5, cy + s * 0.5, 0.26), m=hazard if i % 2 == 0 else black, rot=(0, 0, a + math.pi / 2))

# ---------------------------------------------------------------- barbed wire, laid along a line (two long on X; the games stretch it)
def wire():
    # a coil of razor wire between crossed steel stakes on concrete feet, hazard caps on the stakes
    start('prop_wire')
    n = 44
    for i in range(n):
        a0 = i / n * TAU * 5; a1 = (i + 1) / n * TAU * 5; x0 = -1 + 2 * i / n; x1 = -1 + 2 * (i + 1) / n
        cyl('coil%d' % i, (x0, math.cos(a0) * 0.4, 0.46 + math.sin(a0) * 0.4), (x1, math.cos(a1) * 0.4, 0.46 + math.sin(a1) * 0.4), 0.022, m=pale, sides=3)
    for k, x in enumerate((-0.96, 0, 0.96)):
        box('foot%d' % k, (0.22, 0.7, 0.08), (x, 0, 0.04), m=conc, bevel=0.01)
        for s in (-1, 1):
            cyl('stake%d%d' % (k, s), (x, s * 0.32, 0.06), (x, -s * 0.5, 1.0), 0.032, m=armor_d, sides=4)
            box('tip%d%d' % (k, s), (0.07, 0.07, 0.07), (x, -s * 0.5, 1.0), m=hazard)
        box('tag%d' % k, (0.02, 0.1, 0.05), (x, 0, 0.53), m=glow if k == 1 else armor_d)

BUILD = [post_arty, post_mg, post_mggun, post_lookout, site_pad, post_sam, post_tower, wire]
OUT = {}
for fn in BUILD:
    if 'ONLY' in globals() and ONLY and fn.__name__ not in ONLY: continue
    OUT[fn.__name__] = ship(fn)
