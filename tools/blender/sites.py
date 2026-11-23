# OBJECTIVES AND SIDE OBJECTIVES (GC 0.38): the things a ground mission is fought over, as models. Run after gc_kit.py:
#   exec(open(ROOT + r'\gc_kit.py').read()); exec(open(ROOT + r'\scripts\sites.py').read())
# Each is built standing on the ground at the origin with a footprint radius of about one (the game sizes it), Z up,
# its front to -Y. They do not move: one frame, `stand`. A material named `accent` or `accent_lit` is given the enemy's
# own colour by the game, so one mast serves all three enemies.
import math
from mathutils import Vector
R = math.radians; TAU = math.pi * 2
wipe()
conc = mat('s_conc', '#8d8f8a', rough=0.95); conc_d = mat('s_conc_d', '#5f625e', rough=0.95); dirt = mat('s_dirt', '#6f6248', rough=1.0)
steel = mat('s_steel', '#737a80', rough=0.5, metal=0.6); steel_d = mat('s_steel_d', '#3a3f44', rough=0.55, metal=0.5); black = mat('s_black', '#1e2022')
hazard = mat('s_hazard', '#e8b72a'); red = mat('s_red', '#ff4a3a', emit=2.0); blue = mat('s_blue', '#7fd8ff', emit=2.0); hull = mat('s_hull', '#d8dde0', rough=0.5)
olive = mat('s_olive', '#5a6248'); olive_d = mat('s_olive_d', '#3c4232'); bag = mat('s_bag', '#8a7a56', rough=1.0); bag_d = mat('s_bag_d', '#6f6244', rough=1.0)
wood = mat('s_wood', '#6a5a40'); rust = mat('s_rust', '#7a4a30', rough=0.9); burnt = mat('s_burnt', '#2c2826', rough=1.0); glass = mat('s_glass', '#2a4a5a', rough=0.2)
flagc = mat('s_flag', '#7fe9e0'); accent = mat('accent', '#ff5a3a'); accent_lit = mat('accent_lit', '#ff5a3a', emit=2.0)
m_mound = mat('s_m_mound', '#7a4a22', rough=1.0); m_light = mat('s_m_light', '#96602e', rough=1.0); m_dark = mat('s_m_dark', '#2a1608'); m_hot = mat('s_m_hot', '#ff9a3a', emit=2.0); bone = mat('s_bone', '#e0d2aa')
t_hide = mat('s_t_hide', '#6a3ea8'); t_dark = mat('s_t_dark', '#2c1848'); t_bone = mat('s_t_bone', '#efe6cf'); t_lit = mat('s_t_lit', '#c8ff6a', emit=2.0)
f_iron = mat('s_f_iron', '#5a2a24', rough=0.6, metal=0.4); f_dark = mat('s_f_dark', '#231210'); f_hot = mat('s_f_hot', '#ff5a3a', emit=2.0); f_steel = mat('s_f_steel', '#6a6a6e', rough=0.5, metal=0.6)

MADE = []
def start(name):
    global CUR
    CUR = coll(name); MADE.append(name); return CUR
def disc(name, r, h, z, m, sides=12, r2=None, at=(0, 0)): return cyl(name, (at[0], at[1], z), (at[0], at[1], z + h), r, m=m, sides=sides, r2=r2)
def lamp(name, loc, m, r=0.05): return blob(name, r=r, loc=loc, sub=1, m=m)
def bags(name, r, n, z, m, a0=0.0, arc=TAU, size=0.2):
    """Sandbags laid along an arc."""
    for i in range(n):
        a = a0 + arc * (i + 0.5) / n
        o = blob('%s%d' % (name, i), r=size, scale=(1.3, 0.78, 0.6), sub=1, m=m, rough=0.12, seed=i)
        o.location = (math.cos(a) * r, math.sin(a) * r, z); o.rotation_euler = (0, 0, a + math.pi / 2)
def lattice(name, n, r0, r1, z0, z1, levels, m, rl=0.035, rb=0.018, a0=0.0):
    """A mast of n legs that close in as they climb, tied with rings and a diagonal on every face."""
    pt = lambda i, z: (math.cos(a0 + i / n * TAU) * (r0 + (r1 - r0) * (z - z0) / (z1 - z0)), math.sin(a0 + i / n * TAU) * (r0 + (r1 - r0) * (z - z0) / (z1 - z0)), z)
    for i in range(n): cyl('%s_leg%d' % (name, i), pt(i, z0), pt(i, z1), rl, m=m, sides=5)
    zs = [z0 + (z1 - z0) * k / levels for k in range(levels + 1)]
    for k in range(1, levels + 1):
        for i in range(n):
            cyl('%s_r%d_%d' % (name, k, i), pt(i, zs[k]), pt((i + 1) % n, zs[k]), rb, m=m, sides=4)
            cyl('%s_d%d_%d' % (name, k, i), pt(i, zs[k - 1]), pt((i + 1) % n, zs[k]), rb, m=m, sides=4)

# ---------------------------------------------------------------- objectives
def silo():     # the warhead's launch site at its true size (the game draws it 14 m in radius, so 1 m is 0.0714 here): a flat
                # apron a soldier can stand on, the silo's mouth with its two doors slid back flat on their rails, the missile's
                # nose standing out of it, a low bunker, a mast and two floodlights. Nothing but the missile, the bunker and the
                # poles stands over a soldier's head, so nobody holding the site is hidden by it.
    start('site_silo')
    lit = mat('s_lit', '#fff2d0', emit=2.0)
    disc('apron', 1.0, 0.022, 0, conc, 12); disc('apron2', 0.62, 0.008, 0.022, conc_d, 12)
    disc('scorch', 0.4, 0.003, 0.0305, burnt, 12)
    disc('collar', 0.27, 0.05, 0.022, steel, 12); disc('shaft', 0.215, 0.006, 0.072, black, 12)
    loft('missile', [((0, 0, 0.06), 0.088, 0.088), ((0, 0, 0.36), 0.088, 0.088), ((0, 0, 0.47), 0.055, 0.055), ((0, 0, 0.54), 0.004, 0.004)], sides=10, m=hull)
    disc('band', 0.091, 0.03, 0.27, red, 10); disc('band2', 0.0905, 0.012, 0.12, steel_d, 10)
    for s in (-1, 1):
        box('door%d' % s, (0.26, 0.5, 0.03), (s * 0.44, 0, 0.075), m=steel_d, bevel=0.006)
        box('stripe%d' % s, (0.03, 0.5, 0.004), (s * 0.325, 0, 0.092), m=hazard)
        for t in (-1, 1): box('rail%d%d' % (s, t), (0.42, 0.02, 0.014), (s * 0.5, t * 0.2, 0.05), m=steel)
    box('bunker', (0.42, 0.28, 0.19), (-0.52, -0.66, 0.115), m=conc, bevel=0.012, rot=(0, 0, R(28)))
    box('slit', (0.26, 0.012, 0.03), (-0.588, -0.788, 0.15), m=black, rot=(0, 0, R(28)))
    box('roof', (0.46, 0.32, 0.016), (-0.52, -0.66, 0.218), m=conc_d, bevel=0.004, rot=(0, 0, R(28)))
    box('duct', (0.03, 0.44, 0.01), (-0.3, -0.38, 0.035), m=steel_d, rot=(0, 0, R(-38)))
    box('vent1', (0.07, 0.07, 0.05), (0.2, -0.36, 0.055), m=steel, bevel=0.006); box('vent2', (0.07, 0.07, 0.05), (0.31, -0.3, 0.055), m=steel, bevel=0.006)
    cyl('mast', (-0.76, -0.46, 0.022), (-0.76, -0.46, 0.86), 0.008, m=steel_d, sides=5); lamp('mastlamp', (-0.76, -0.46, 0.876), red, 0.016)
    for i, (x, y) in enumerate(((0.7, 0.6), (-0.58, 0.72))):
        cyl('flood%d' % i, (x, y, 0.022), (x, y, 0.52), 0.008, m=steel_d, sides=5)
        box('floodhead%d' % i, (0.07, 0.035, 0.03), (x * 0.985, y * 0.985, 0.53), m=steel_d, rot=(0, 0, math.atan2(y, x) + math.pi / 2)); lamp('floodlamp%d' % i, (x * 0.965, y * 0.965, 0.525), lit, 0.014)
    for i in range(10):
        a = i / 10 * TAU + 0.3; x, y = math.cos(a) * 0.95, math.sin(a) * 0.95
        cyl('post%d' % i, (x, y, 0.022), (x, y, 0.097), 0.008, m=hazard, sides=5)
        if i % 2 == 0: lamp('pl%d' % i, (x, y, 0.104), red, 0.012)
def crash():    # a shuttle that came down hard: nose dug in, a wing torn off, the ground burnt round it
    start('site_crash')
    disc('scorch', 0.98, 0.015, 0, burnt, 9)
    j = joint('body', (0.05, 0.05, 0.02)); j.rotation_euler = (R(13), R(-9), R(22))
    loft('fuse', [((0, -0.98, 0.1), 0.05, 0.05), ((0, -0.72, 0.16), 0.24, 0.19), ((0, -0.1, 0.2), 0.31, 0.25), ((0, 0.5, 0.2), 0.29, 0.24), ((0, 0.86, 0.2), 0.2, 0.18)], sides=8, m=hull, parent=j)
    box('canopy', (0.3, 0.34, 0.1), (0, -0.56, 0.36), m=glass, parent=j, bevel=0.03, rot=(R(-14), 0, 0))
    box('stripe', (0.64, 0.14, 0.03), (0, 0.1, 0.44), m=red, parent=j)
    box('wingL', (0.85, 0.44, 0.05), (-0.66, 0.16, 0.16), m=hull, parent=j, bevel=0.015, rot=(0, R(8), R(-12))); box('tipL', (0.2, 0.44, 0.052), (-0.98, 0.22, 0.2), m=red, parent=j, rot=(0, R(8), R(-12)))
    box('stub', (0.28, 0.4, 0.05), (0.4, 0.16, 0.16), m=burnt, parent=j, rot=(0, R(-8), R(12)))
    box('fin', (0.05, 0.4, 0.42), (0, 0.68, 0.56), m=hull, parent=j, bevel=0.012, taper=0.55)
    for s in (-1, 1): cyl('eng%d' % s, (s * 0.17, 0.72, 0.16), (s * 0.17, 1.0, 0.16), 0.12, m=steel_d, parent=j, sides=8)
    box('wingR', (0.6, 0.4, 0.05), (0.92, -0.42, 0.05), m=hull, bevel=0.015, rot=(R(4), R(6), R(64))); box('tipR', (0.16, 0.4, 0.052), (1.02, -0.2, 0.06), m=red, rot=(R(4), R(6), R(64)))
    for i, (x, y, r) in enumerate([(-0.5, -0.8, 0.1), (0.5, 0.75, 0.08), (-0.86, -0.3, 0.07), (0.3, -0.85, 0.06), (0.75, 0.35, 0.09)]): blob('deb%d' % i, r=r, scale=(1, 1, 0.5), loc=(x, y, 0.03), sub=1, m=burnt, rough=0.3, seed=i)
def pad():      # where the dropship sets down: a slab, its markings, a light at each corner, a beacon
    start('site_pad')
    disc('slab', 1.0, 0.09, 0, conc_d, 8); disc('top', 0.9, 0.025, 0.09, conc, 8)
    for x in (-0.24, 0.24): box('h%d' % (x > 0), (0.09, 0.7, 0.012), (x, 0, 0.122), m=hazard)
    box('hbar', (0.48, 0.09, 0.012), (0, 0, 0.122), m=hazard)
    for i in range(8):
        a = (i + 0.5) / 8 * TAU; x, y = math.cos(a) * 0.86, math.sin(a) * 0.86
        box('mark%d' % i, (0.2, 0.06, 0.012), (math.cos(a) * 0.7, math.sin(a) * 0.7, 0.122), m=hull, rot=(0, 0, a + math.pi / 2))
        cyl('lp%d' % i, (x, y, 0.09), (x, y, 0.2), 0.03, m=steel_d, sides=5); lamp('ll%d' % i, (x, y, 0.23), blue, 0.045)
    cyl('beacon', (0.78, 0.5, 0.09), (0.78, 0.5, 0.95), 0.025, m=steel_d, sides=5); lamp('bl', (0.78, 0.5, 0.99), blue, 0.07)
    box('locker', (0.24, 0.16, 0.2), (-0.72, 0.56, 0.2), m=olive, bevel=0.02, rot=(0, 0, R(-35)))
def derrick():  # the oil site: a drilling tower, its pump house, two tanks and a flare
    start('site_derrick')
    disc('pad', 0.98, 0.06, 0, conc_d, 8)
    lattice('tw', 4, 0.5, 0.11, 0.06, 2.4, 4, steel_d, a0=math.pi / 4)
    box('crown', (0.3, 0.3, 0.12), (0, 0, 2.46), m=steel, bevel=0.02); cyl('string', (0, 0, 0.06), (0, 0, 2.4), 0.03, m=black, sides=6); disc('well', 0.16, 0.14, 0.06, hazard, 8)
    box('house', (0.42, 0.34, 0.32), (0.62, 0.36, 0.22), m=rust, bevel=0.03); box('roof', (0.48, 0.4, 0.04), (0.62, 0.36, 0.4), m=steel_d)
    for i, y in enumerate((-0.42, 0.1)):
        disc('tank%d' % i, 0.21, 0.46, 0.06, rust, 10, at=(-0.62, y)); blob('cap%d' % i, r=0.21, scale=(1, 1, 0.3), loc=(-0.62, y, 0.52), sub=1, m=rust); disc('tb%d' % i, 0.215, 0.05, 0.3, hazard, 10, at=(-0.62, y))
    cyl('pipe', (-0.42, -0.16, 0.14), (-0.1, -0.05, 0.14), 0.035, m=hazard, sides=6)
    cyl('flare', (0.66, -0.52, 0.06), (0.66, -0.52, 1.5), 0.03, m=steel_d, sides=5); blob('flame', r=0.1, scale=(1, 1, 1.7), loc=(0.66, -0.52, 1.66), sub=1, m=m_hot)
def wreck():    # a burnt-out carrier: something worth searching
    start('site_wreck')
    disc('scorch', 0.95, 0.015, 0, burnt, 9)
    j = joint('hull', (0, 0, 0)); j.rotation_euler = (R(4), R(-7), R(24))
    box('body', (0.74, 1.5, 0.36), (0, 0, 0.42), m=burnt, parent=j, bevel=0.05, taper=0.8); box('nose', (0.7, 0.3, 0.2), (0, -0.82, 0.34), m=steel_d, parent=j, bevel=0.04, rot=(R(28), 0, 0))
    box('ring', (0.36, 0.36, 0.05), (0, 0.1, 0.62), m=steel_d, parent=j, bevel=0.01); box('door', (0.4, 0.04, 0.3), (0, 0.84, 0.26), m=rust, parent=j, rot=(R(-58), 0, 0))
    for i, y in enumerate((-0.5, 0.0, 0.5)):
        for s in (-1, 1):
            if (i, s) == (2, 1): continue
            cyl('wh%d%d' % (i, s), (s * 0.32, y, 0.18), (s * 0.44, y, 0.18), 0.18, m=black, parent=j, sides=8)
    cyl('lost', (0.78, 0.7, 0.07), (0.9, 0.74, 0.12), 0.18, m=black, sides=8)
    box('turret', (0.4, 0.44, 0.17), (-0.82, 0.24, 0.1), m=rust, bevel=0.04, rot=(R(12), R(8), R(-30)), taper=0.8); cyl('gun', (-0.74, 0.08, 0.14), (-0.5, -0.5, 0.05), 0.035, m=steel_d, sides=6)
    box('glint', (0.2, 0.16, 0.12), (0.5, -0.62, 0.07), m=hazard, bevel=0.02, rot=(0, 0, R(20)))
def charge():   # the demolition charge: a drum on three legs, banded, a lamp and an aerial
    start('site_charge')
    for i in range(3):
        a = i / 3 * TAU + 0.5; cyl('leg%d' % i, (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.3), (math.cos(a) * 0.62, math.sin(a) * 0.62, 0), 0.04, m=steel_d, sides=5)
    disc('drum', 0.42, 0.52, 0.2, olive, 10); disc('b1', 0.43, 0.06, 0.27, hazard, 10); disc('b2', 0.43, 0.06, 0.59, hazard, 10); disc('cap', 0.3, 0.08, 0.72, steel_d, 10)
    lamp('lamp', (0, 0, 0.86), red, 0.09); cyl('aerial', (0.2, 0.1, 0.8), (0.24, 0.12, 1.6), 0.012, m=black, sides=4)
    box('pad', (0.2, 0.05, 0.16), (0, -0.43, 0.46), m=black); box('keys', (0.14, 0.02, 0.06), (0, -0.46, 0.5), m=blue)
    for s in (-1, 1): box('grip%d' % s, (0.05, 0.2, 0.04), (s * 0.45, 0, 0.48), m=steel_d)

# ---------------------------------------------------------------- side objectives (yours to take or to save)
def radio():    # a radio mast to bring back on the air: the mast, its dishes, the hut and generator
    start('side_radio')
    disc('base', 0.84, 0.06, 0, conc_d, 9)
    lattice('ms', 3, 0.36, 0.05, 0.06, 3.3, 6, steel_d, rl=0.03, rb=0.015)
    cyl('aerial', (0, 0, 3.3), (0, 0, 3.95), 0.014, m=steel, sides=4); lamp('top', (0, 0, 3.36), red, 0.06)
    for i, (z, a) in enumerate(((2.5, R(-70)), (1.95, R(150)))):
        o = blob('dish%d' % i, r=0.26, scale=(1, 0.26, 1), sub=1, m=hull); o.location = (math.cos(a) * 0.26, math.sin(a) * 0.26, z); o.rotation_euler = (R(14), 0, a + math.pi / 2)
        lamp('feed%d' % i, (math.cos(a) * 0.42, math.sin(a) * 0.42, z + 0.03), blue, 0.04)
    for i in range(3):
        a = i / 3 * TAU + math.pi / 3; cyl('guy%d' % i, (math.cos(a) * 0.12, math.sin(a) * 0.12, 2.6), (math.cos(a) * 0.82, math.sin(a) * 0.82, 0.06), 0.012, m=black, sides=3)
    box('hut', (0.5, 0.4, 0.36), (0.5, 0.42, 0.24), m=olive, bevel=0.03, rot=(0, 0, R(18))); box('door', (0.16, 0.03, 0.26), (0.44, 0.22, 0.2), m=olive_d, rot=(0, 0, R(18)))
    box('gen', (0.26, 0.2, 0.2), (-0.5, 0.4, 0.16), m=steel, bevel=0.02); cyl('exh', (-0.5, 0.4, 0.26), (-0.5, 0.4, 0.5), 0.025, m=black, sides=5)
def redoubt():  # your Infantry dug in, at its true size (the game draws it 8 m in radius, so 1 m is 0.125 here): a ring of
                # sandbags chest high with a way in at the back, a gun at the wall, their flag, stores and a radio. Only the
                # flag stands over a soldier's head, so the troopers inside are seen over their wall.
    start('side_redoubt')
    disc('floor', 0.9, 0.012, 0, dirt, 12)
    n = 14; arc = R(300); a0 = R(120); seg = 2 * 0.84 * math.sin(arc / n / 2) * 1.05
    for i in range(n):
        a = a0 + arc * (i + 0.5) / n
        box('wall%d' % i, (seg, 0.09, 0.105), (math.cos(a) * 0.84, math.sin(a) * 0.84, 0.0645), m=bag_d, bevel=0.012, rot=(0, 0, a + math.pi / 2))
    bags('t', 0.84, 26, 0.137, bag, a0=a0, arc=arc, size=0.05)
    cyl('pole', (0.2, 0.25, 0.012), (0.2, 0.25, 0.8), 0.008, m=steel_d, sides=5); box('flag', (0.2, 0.008, 0.12), (0.305, 0.25, 0.73), m=flagc)
    box('crate1', (0.14, 0.1, 0.09), (-0.3, 0.3, 0.057), m=olive, bevel=0.006, rot=(0, 0, R(20))); box('crate2', (0.11, 0.09, 0.08), (-0.29, 0.29, 0.142), m=wood, bevel=0.006, rot=(0, 0, R(-10)))
    box('ammo1', (0.06, 0.035, 0.035), (-0.12, 0.42, 0.03), m=olive_d, rot=(0, 0, R(40))); box('ammo2', (0.06, 0.035, 0.035), (-0.05, 0.47, 0.03), m=olive_d, rot=(0, 0, R(-15)))
    box('mg', (0.02, 0.11, 0.02), (0, -0.8, 0.2), m=black); cyl('mgb', (0, -0.85, 0.203), (0, -0.99, 0.208), 0.006, m=black, sides=5)
    for s in (-1, 1): cyl('mgleg%d' % s, (0, -0.8, 0.19), (s * 0.04, -0.74, 0.14), 0.004, m=black, sides=4)
    box('radio', (0.05, 0.04, 0.05), (0.42, -0.2, 0.037), m=olive_d, bevel=0.004); cyl('aerial', (0.43, -0.2, 0.06), (0.43, -0.2, 0.36), 0.003, m=black, sides=4)
    disc('fire', 0.05, 0.012, 0.012, burnt, 6, at=(0.1, -0.15))
def howitzer(): # an abandoned field gun in its pit: take it and it fires for you
    start('side_howitzer')
    disc('floor', 0.84, 0.03, 0, dirt, 10)
    bags('a', 0.9, 9, 0.11, bag, a0=R(170), arc=R(200)); bags('b', 0.89, 8, 0.32, bag_d, a0=R(180), arc=R(180))
    box('car', (0.4, 0.66, 0.14), (0, 0.05, 0.32), m=olive, bevel=0.02)
    for s in (-1, 1):
        cyl('wh%d' % s, (s * 0.24, 0, 0.26), (s * 0.34, 0, 0.26), 0.26, m=black, sides=10); cyl('hub%d' % s, (s * 0.34, 0, 0.26), (s * 0.36, 0, 0.26), 0.1, m=olive_d, sides=6)
        cyl('trail%d' % s, (s * 0.12, 0.3, 0.3), (s * 0.5, 0.95, 0.06), 0.045, m=olive, sides=5); box('spade%d' % s, (0.2, 0.05, 0.14), (s * 0.5, 0.96, 0.08), m=steel_d, rot=(0, 0, s * R(-30)))
    box('shield', (0.9, 0.05, 0.5), (0, -0.24, 0.56), m=olive, bevel=0.015, rot=(R(-10), 0, 0)); box('cradle', (0.16, 0.6, 0.14), (0, -0.05, 0.6), m=olive_d, rot=(R(-27), 0, 0))
    cyl('barrel', (0, 0.3, 0.6), (0, -1.2, 1.36), 0.065, m=steel_d, sides=8); cyl('brake', (0, -1.14, 1.33), (0, -1.32, 1.42), 0.095, m=black, sides=8); cyl('recup', (0, 0.1, 0.56), (0, -0.5, 0.86), 0.045, m=steel, sides=6)
    for i in range(4): cyl('shell%d' % i, (0.52 + (i % 2) * 0.1, 0.3 + (i // 2) * 0.1, 0.03), (0.52 + (i % 2) * 0.1, 0.3 + (i // 2) * 0.1, 0.25), 0.04, m=hazard, sides=6, r2=0.02)
    box('box', (0.3, 0.2, 0.14), (-0.52, 0.36, 0.1), m=wood, bevel=0.015, rot=(0, 0, R(15)))
def jam_bugs(): # the Molt's jammer: a shrieker, a living horn that screams over your radio
    start('side_jam_bugs')
    blob('mound', r=0.92, scale=(1, 1, 0.34), loc=(0, 0, 0.02), sub=2, m=m_mound, rough=0.22, seed=3)
    loft('stalk', [((0, 0, 0.1), 0.34, 0.34), ((0.06, 0, 0.9), 0.22, 0.22), ((-0.05, 0.03, 1.6), 0.19, 0.19), ((0, 0, 2.1), 0.3, 0.3), ((0, 0, 2.46), 0.47, 0.47)], sides=8, m=m_light, rough=0.1, seed=2)
    disc('throat', 0.36, 0.02, 2.45, m_dark, 8); blob('glow', r=0.17, loc=(0, 0, 2.4), sub=1, m=m_hot)
    for i in range(7):
        a = i / 7 * TAU; spike('fang%d' % i, (math.cos(a) * 0.44, math.sin(a) * 0.44, 2.44), (math.cos(a) * 0.3, math.sin(a) * 0.3, 2.9), 0.055, m=bone)
    for i, (z, a, r) in enumerate([(0.55, 0.4, 0.15), (0.95, 2.6, 0.13), (1.35, 4.4, 0.12), (1.8, 1.2, 0.11), (0.3, 5.3, 0.17)]): blob('sac%d' % i, r=r, loc=(math.cos(a) * 0.2, math.sin(a) * 0.2, z), sub=1, m=m_hot)
    for i in range(5):
        a = i / 5 * TAU + 0.3; spike('root%d' % i, (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.14), (math.cos(a) * 1.02, math.sin(a) * 1.02, 0.02), 0.09, m=m_dark)
def jam_bots(): # the Foundry's jammer: a crawler with a mast of panels that drowns your call-ins
    start('side_jam_bots')
    box('base', (0.8, 1.3, 0.3), (0, 0, 0.3), m=f_iron, bevel=0.04)
    for s in (-1, 1): box('track%d' % s, (0.24, 1.44, 0.3), (s * 0.5, 0, 0.16), m=f_dark, bevel=0.06)
    box('strip', (0.5, 0.03, 0.06), (0, -0.66, 0.34), m=f_hot); disc('table', 0.36, 0.12, 0.45, f_steel, 10); cyl('mast', (0, 0, 0.55), (0, 0, 2.3), 0.065, m=f_steel, sides=7)
    for i in range(3):
        a = i / 3 * TAU + 0.5; x, y = math.cos(a), math.sin(a)
        box('panel%d' % i, (0.5, 0.05, 0.85), (x * 0.3, y * 0.3, 1.62), m=f_dark, bevel=0.012, rot=(R(-12), 0, a + math.pi / 2)); box('glow%d' % i, (0.36, 0.02, 0.1), (x * 0.33, y * 0.33, 1.86), m=f_hot, rot=(R(-12), 0, a + math.pi / 2))
        cyl('arm%d' % i, (0, 0, 1.6), (x * 0.28, y * 0.28, 1.6), 0.025, m=f_steel, sides=4)
    box('bar', (1.0, 0.06, 0.06), (0, 0, 2.34), m=f_steel, rot=(0, 0, R(25))); lamp('e1', (math.cos(R(25)) * 0.5, math.sin(R(25)) * 0.5, 2.34), f_hot, 0.07); lamp('e2', (-math.cos(R(25)) * 0.5, -math.sin(R(25)) * 0.5, 2.34), f_hot, 0.07)
def jam_lizards():  # the Talon's jammer: a living crystal hung between three great bones, that clouds the mind
    start('side_jam_lizards')
    for i, (x, y, r) in enumerate([(0.3, 0.2, 0.34), (-0.36, 0.1, 0.3), (0.02, -0.36, 0.28)]): blob('stone%d' % i, r=r, scale=(1, 1, 0.42), loc=(x, y, 0.04), sub=1, m=t_dark, rough=0.2, seed=i)
    for i in range(3):
        a = i / 3 * TAU + 0.6; cyl('bone%d' % i, (math.cos(a) * 0.86, math.sin(a) * 0.86, 0), (math.cos(a) * 0.1, math.sin(a) * 0.1, 1.75), 0.075, m=t_bone, sides=6, r2=0.03)
        spike('horn%d' % i, (math.cos(a) * 0.1, math.sin(a) * 0.1, 1.72), (math.cos(a) * 0.5, math.sin(a) * 0.5, 2.5), 0.05, m=t_bone)
        box('hide%d' % i, (0.5, 0.02, 0.5), (math.cos(a + TAU / 6) * 0.135, math.sin(a + TAU / 6) * 0.135, 1.36), m=t_hide, rot=(0, 0, a + TAU / 6 + math.pi / 2))     # (GC 0.64: hung from bone to bone, not in the air)
    blob('crystal', r=0.3, scale=(1, 1, 1.75), loc=(0, 0, 2.2), sub=1, m=t_lit)
    for i in range(6):
        a = i / 6 * TAU; spike('shard%d' % i, (math.cos(a) * 0.24, math.sin(a) * 0.24, 2.2), (math.cos(a) * 0.62, math.sin(a) * 0.62, 2.32), 0.05, m=t_lit, sides=4)     # (GC 0.64: out of the crystal)
    blob('skull', r=0.13, scale=(1, 1.3, 0.9), loc=(0.62, -0.5, 0.12), sub=1, m=t_bone)

# ---------------------------------------------------------------- the enemy's side sites (points of interest)
def broadcast():    # a propaganda tower: a screen, four horns, the hut it runs from
    start('poi_broadcast')
    disc('base', 0.9, 0.06, 0, conc_d, 9); box('hut', (0.66, 0.5, 0.4), (0.1, 0.36, 0.26), m=conc, bevel=0.03); box('door', (0.2, 0.03, 0.28), (0.1, 0.1, 0.22), m=accent)
    lattice('tw', 4, 0.26, 0.2, 0.06, 2.7, 4, steel_d, a0=math.pi / 4, rl=0.03, rb=0.016)
    box('frame', (1.16, 0.07, 0.68), (0, -0.32, 2.0), m=black, bevel=0.02); box('screen', (1.04, 0.03, 0.56), (0, -0.36, 2.0), m=accent_lit)
    box('bracket', (0.4, 0.24, 0.08), (0, -0.2, 2.0), m=steel_d); box('bracket2', (0.4, 0.24, 0.08), (0, -0.2, 2.24), m=steel_d)     # (GC 0.64: the screen held on the mast)
    disc('hub', 0.18, 0.3, 2.68, steel_d, 8)     # (GC 0.64: the horns' mount, on the mast's top)
    for i in range(4):
        a = i / 4 * TAU + math.pi / 4; x, y = math.cos(a), math.sin(a)
        cyl('horn%d' % i, (x * 0.16, y * 0.16, 2.82), (x * 0.56, y * 0.56, 2.92), 0.05, m=steel, sides=8, r2=0.2)
    cyl('aerial', (0, 0, 2.7), (0, 0, 3.5), 0.014, m=steel, sides=4); lamp('top', (0, 0, 3.02), accent_lit, 0.07)
    box('amp', (0.24, 0.2, 0.2), (-0.56, -0.3, 0.16), m=steel_d, bevel=0.02)
def relay():    # a relay: a bunker with a great dish on its roof
    start('poi_relay')
    box('bunker', (1.1, 0.9, 0.36), (0, 0.05, 0.18), m=conc, bevel=0.04, taper=0.88); box('door', (0.26, 0.03, 0.24), (0, -0.4, 0.16), m=accent); box('vent', (0.3, 0.2, 0.1), (-0.3, 0.2, 0.4), m=steel_d, bevel=0.015)
    cyl('ped', (0.1, 0.05, 0.36), (0.1, 0.05, 0.86), 0.09, m=steel, sides=7)
    o = blob('dish', r=0.58, scale=(1, 0.24, 1), sub=2, m=hull); o.location = (0.1, 0.0, 1.05); o.rotation_euler = (R(52), 0, R(20))
    cyl('arm', (0.1, 0.0, 1.05), (0.26, -0.44, 1.4), 0.02, m=steel_d, sides=4); lamp('feed', (0.26, -0.44, 1.4), accent_lit, 0.06)
    for i, (x, y, h) in enumerate([(-0.44, -0.3, 1.2), (0.46, 0.38, 0.9)]): cyl('mast%d' % i, (x, y, 0.36), (x, y, h), 0.02, m=steel_d, sides=5); lamp('ml%d' % i, (x, y, h + 0.04), accent_lit, 0.045)
    disc('drum', 0.16, 0.2, 0, steel_d, 8, at=(-0.72, -0.5))
def cache():    # a supply dump under a net: crates, drums, a canopy on poles
    start('poi_cache')
    disc('floor', 0.94, 0.03, 0, dirt, 9)
    for i, (x, y) in enumerate(((-0.62, -0.5), (0.62, -0.5), (0.62, 0.5), (-0.62, 0.5))): cyl('pole%d' % i, (x, y, 0), (x * 0.94, y * 0.94, 0.86), 0.025, m=wood, sides=5)
    box('net', (1.36, 1.1, 0.06), (0, 0, 0.88), m=olive_d, bevel=0.01, taper=0.9); box('net2', (0.9, 0.7, 0.06), (0, 0, 0.94), m=olive, taper=0.7)
    for i, (x, y, z, s, m_, a) in enumerate([(-0.3, 0.2, 0.14, (0.4, 0.3, 0.22), olive, 12), (0.14, 0.24, 0.13, (0.34, 0.3, 0.2), wood, -8), (-0.26, 0.2, 0.35, (0.3, 0.26, 0.18), wood, 25), (0.34, -0.2, 0.12, (0.3, 0.24, 0.18), olive, 40), (-0.1, -0.24, 0.1, (0.4, 0.2, 0.14), steel_d, -15)]):
        box('crate%d' % i, s, (x, y, z), m=m_, bevel=0.015, rot=(0, 0, R(a)))
    box('mark', (0.2, 0.2, 0.012), (-0.3, 0.2, 0.256), m=accent, rot=(0, 0, R(12)))
    for i, (x, y) in enumerate(((0.44, 0.24), (0.56, 0.06), (0.4, 0.04))): disc('drum%d' % i, 0.09, 0.26, 0.03, rust, 8, at=(x, y)); disc('db%d' % i, 0.093, 0.04, 0.16, accent, 8, at=(x, y))
def spewer():   # the Molt's spore towers: three chimneys of chitin breathing spores
    start('poi_spewer')
    blob('mound', r=0.95, scale=(1, 1, 0.3), loc=(0, 0, 0.02), sub=2, m=m_mound, rough=0.22, seed=5)
    for i, (x, y, h, r) in enumerate([(0, 0.05, 2.5, 0.3), (0.5, -0.3, 1.6, 0.22), (-0.48, -0.26, 1.25, 0.2)]):
        loft('ch%d' % i, [((x, y, 0.08), r * 1.25, r * 1.25), ((x + 0.04, y, h * 0.45), r * 0.8, r * 0.8), ((x - 0.03, y + 0.02, h * 0.82), r * 0.62, r * 0.62), ((x, y, h), r * 0.95, r * 0.95)], sides=7, m=m_light if i else m_mound, rough=0.1, seed=i)
        disc('mouth%d' % i, r * 0.72, 0.02, h - 0.01, m_dark, 7, at=(x, y)); blob('puff%d' % i, r=r * 0.5, loc=(x, y, h - 0.04), sub=1, m=m_hot)
        for k in range(3):
            a = k / 3 * TAU + i; blob('sac%d%d' % (i, k), r=r * 0.36, loc=(x + math.cos(a) * r * 0.8, y + math.sin(a) * r * 0.8, h * (0.25 + 0.2 * k)), sub=1, m=m_hot if k % 2 == 0 else m_dark)
    for i in range(5):
        a = i / 5 * TAU + 0.8; spike('root%d' % i, (math.cos(a) * 0.4, math.sin(a) * 0.4, 0.14), (math.cos(a) * 1.02, math.sin(a) * 1.02, 0.02), 0.08, m=m_dark)

OUT = {}
# (GC 0.64) the landing pad is made by fleet.py now, shared with FOB Commander; the field gun is gone (the ground fight draws the
# Artillery Cannon's model, prop_post_arty, for it). pad() and howitzer() are kept here only as they were.
for fn in (silo, crash, derrick, wreck, charge, radio, redoubt, jam_bugs, jam_bots, jam_lizards, broadcast, relay, cache, spewer):
    fn(); bpy.context.view_layer.update()
    OUT[MADE[-1]] = export(MADE[-1], CUR, {'stand': (lambda: None)}, lod=0)
# the picture: all of them set out in rows (after the export, which wants each at the origin)
for i, name in enumerate(MADE):
    for o in bpy.data.collections[name].objects:
        if o.parent is None: o.location = Vector(o.location) + Vector(((i % 4) * 3.2, -(i // 4) * 3.4, 0))
PIC = shot('sites', dist=27, target=(4.8, -5.1, 0.8), res=(1500, 1100), az=20, el=38)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'sites.blend'))
