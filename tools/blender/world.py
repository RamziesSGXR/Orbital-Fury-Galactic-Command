# THE WORLD'S FURNITURE AND THE FLEETS' SHIPS (GC 0.40): everything that was still built in code. Run after gc_kit.py:
#   exec(open(ROOT + r'\gc_kit.py').read()); exec(open(ROOT + r'\scripts\world.py').read())
# Props stand on the ground at the origin, Z up, front to -Y. Trees have a crown radius of about one; rocks and the
# pillar are one high and one in radius (the game stretches them); buildings and posts have a footprint radius of about
# one. Ships fly nose to +X and are about three long. `accent` and `accent_lit` take a side's colour in the game; a
# material named `white` is left white so the game's own tint colours it (rock by its biome, cloth by its enemy).
import math
from mathutils import Vector
R = math.radians; TAU = math.pi * 2
wipe()
white = mat('white', '#ffffff', rough=0.9); white_d = mat('white_d', '#c9c9c9', rough=0.9)
bark = mat('w_bark', '#4a3424', rough=1.0); bark_d = mat('w_bark_d', '#3a2a1c', rough=1.0); leaf1 = mat('w_leaf1', '#2f6a2c', rough=1.0); leaf2 = mat('w_leaf2', '#4e8a3a', rough=1.0); leaf3 = mat('w_leaf3', '#255227', rough=1.0)
pine1 = mat('w_pine1', '#1f3f2d', rough=1.0); pine2 = mat('w_pine2', '#2a5238', rough=1.0); jung1 = mat('w_jung1', '#2f5222', rough=1.0); jung2 = mat('w_jung2', '#3f6a2c', rough=1.0)
cact1 = mat('w_cact1', '#3d6b33', rough=1.0); cact2 = mat('w_cact2', '#4f8442', rough=1.0); dead1 = mat('w_dead1', '#5a4a3c', rough=1.0); dead2 = mat('w_dead2', '#463a30', rough=1.0)
stone = mat('w_stone', '#8a8a82', rough=1.0)
m_mound = mat('w_m_mound', '#7a4a22', rough=1.0); m_light = mat('w_m_light', '#96602e', rough=1.0); m_dark = mat('w_m_dark', '#2a1608'); m_hot = mat('w_m_hot', '#ff9a3a', emit=2.0); bone = mat('w_bone', '#e0d2aa')
f_iron = mat('w_f_iron', '#5a2a24', rough=0.6, metal=0.4); f_dark = mat('w_f_dark', '#231210'); f_hot = mat('w_f_hot', '#ff5a3a', emit=2.0); f_steel = mat('w_f_steel', '#6a6a6e', rough=0.5, metal=0.6)
t_hide = mat('w_t_hide', '#6a3ea8'); t_hide_d = mat('w_t_hide_d', '#4b2a7c'); t_dark = mat('w_t_dark', '#2c1848'); t_bone = mat('w_t_bone', '#efe6cf'); t_lit = mat('w_t_lit', '#c8ff6a', emit=2.0)
gun = mat('w_gun', '#b4b6ba', rough=0.5, metal=0.5); gun_d = mat('w_gun_d', '#5a5c62', rough=0.5, metal=0.5); soot = mat('w_soot', '#26262a'); hot = mat('w_hot', '#ff5a3a', emit=2.0)
pole = mat('w_pole', '#3a3a3a'); crate_a = mat('w_crate_a', '#8a7a4a'); crate_b = mat('w_crate_b', '#3a3426'); crate_l = mat('w_crate_l', '#e8d27a')
olive = mat('w_olive', '#5a6248'); olive_d = mat('w_olive_d', '#3c4232'); black = mat('w_black', '#1e2022'); bag = mat('w_bag', '#8a7a56', rough=1.0); bag_d = mat('w_bag_d', '#6f6244', rough=1.0); wood = mat('w_wood', '#6a5a40'); tip = mat('w_tip', '#d9d9d9'); lamp_b = mat('w_lamp_b', '#7fd8ff', emit=2.0)
accent = mat('accent', '#7fe9e0'); accent_lit = mat('accent_lit', '#7fe9e0', emit=2.0)
h_hull = mat('s_hullA', '#b9c2c8', rough=0.45, metal=0.4); h_deck = mat('s_deck', '#7f8a91', rough=0.5, metal=0.4); h_dark = mat('s_darkA', '#3a4146', rough=0.5, metal=0.4)
c_hide = mat('s_chitin', '#a8713f', rough=0.9); c_dark = mat('s_chitin_d', '#6e4526', rough=0.9); c_bone = mat('s_cbone', '#f0e4c0')
i_iron = mat('s_iron', '#8d9298', rough=0.5, metal=0.6); i_dark = mat('s_iron_d', '#55595e', rough=0.5, metal=0.6); i_soot = mat('s_soot', '#33363a')
v_ivory = mat('s_ivory', '#e6dcc4', rough=0.6); v_hide = mat('s_vhide', '#6a5a7a', rough=0.8)

MADE = []
def start(name):
    global CUR
    CUR = coll(name); MADE.append(name); return CUR
def disc(name, r, h, z, m, sides=12, r2=None, at=(0, 0)): return cyl(name, (at[0], at[1], z), (at[0], at[1], z + h), r, m=m, sides=sides, r2=r2)
def ball(name, loc, m, r=0.05, sub=1): return blob(name, r=r, loc=loc, sub=sub, m=m)
def cone(name, base, top, r, m, sides=7): return loft(name, [(base, r, r), (top, 0.012, 0.012)], sides=sides, m=m)
def bags(name, r, n, z, m, a0=0.0, arc=TAU, size=0.2):
    for i in range(n):
        a = a0 + arc * (i + 0.5) / n
        o = blob('%s%d' % (name, i), r=size, scale=(1.3, 0.78, 0.6), sub=1, m=m, rough=0.12, seed=i)
        o.location = (math.cos(a) * r, math.sin(a) * r, z); o.rotation_euler = (0, 0, a + math.pi / 2)
def ringpt(i, n, r, z, a0=0.0): return (math.cos(a0 + i / n * TAU) * r, math.sin(a0 + i / n * TAU) * r, z)

# ---------------------------------------------------------------- trees (a crown radius of about one)
def tree_leaf():
    start('prop_tree_leaf')
    loft('trunk', [((0, 0, 0), 0.2, 0.2), ((0.03, 0, 0.5), 0.13, 0.13), ((-0.02, 0.02, 1.2), 0.1, 0.1), ((0, 0, 1.7), 0.07, 0.07)], sides=6, m=bark)
    for i in range(4): a = i / 4 * TAU + 0.4; spike('root%d' % i, (math.cos(a) * 0.12, math.sin(a) * 0.12, 0.16), (math.cos(a) * 0.4, math.sin(a) * 0.4, 0), 0.07, m=bark_d, sides=4)
    blob('crown', r=0.92, scale=(1, 1, 0.74), loc=(0, 0, 1.75), sub=2, m=leaf1, rough=0.22, seed=1)
    blob('lobe1', r=0.58, scale=(1, 1, 0.8), loc=(-0.42, -0.2, 2.1), sub=2, m=leaf2, rough=0.22, seed=2); blob('lobe2', r=0.6, scale=(1, 1, 0.78), loc=(0.48, 0.32, 1.58), sub=2, m=leaf3, rough=0.22, seed=3)
    blob('lobe3', r=0.46, scale=(1, 1, 0.8), loc=(0.2, -0.5, 1.5), sub=2, m=leaf2, rough=0.22, seed=4); cyl('bough', (0, 0, 1.1), (0.4, 0.26, 1.5), 0.045, m=bark_d, sides=4)
def tree_pine():
    start('prop_tree_pine')
    loft('trunk', [((0, 0, 0), 0.14, 0.14), ((0, 0, 1.2), 0.07, 0.07), ((0, 0, 2.5), 0.02, 0.02)], sides=6, m=bark_d)
    for i, (z, r, h) in enumerate([(0.45, 1.0, 0.95), (1.0, 0.82, 0.9), (1.5, 0.62, 0.85), (1.95, 0.42, 0.8)]):
        loft('tier%d' % i, [((0, 0, z), r, r), ((0, 0, z + h * 0.35), r * 0.62, r * 0.62), ((0, 0, z + h), 0.02, 0.02)], sides=8, m=pine1 if i % 2 == 0 else pine2, rough=0.08, seed=i)
def tree_jungle():
    start('prop_tree_jungle')
    loft('trunk', [((0, 0, 0), 0.15, 0.15), ((0.1, 0, 0.8), 0.1, 0.1), ((0.05, 0.06, 1.5), 0.085, 0.085), ((0, 0, 1.9), 0.07, 0.07)], sides=6, m=bark)
    blob('canopy', r=0.98, scale=(1, 1, 0.32), loc=(0, 0, 1.95), sub=2, m=jung1, rough=0.2, seed=6)
    for i in range(7):
        a = i / 7 * TAU; box('frond%d' % i, (0.9, 0.3, 0.05), (math.cos(a) * 0.62, math.sin(a) * 0.62, 1.78), m=jung2, rot=(0, R(22), a), taper=0.4)
    for i in range(3): a = i / 3 * TAU + 1; cyl('vine%d' % i, (math.cos(a) * 0.5, math.sin(a) * 0.5, 1.85), (math.cos(a) * 0.56, math.sin(a) * 0.56, 1.1), 0.015, m=jung1, sides=3)
def tree_cactus():
    start('prop_tree_cactus')
    loft('body', [((0, 0, 0), 0.24, 0.24), ((0, 0, 1.9), 0.22, 0.22), ((0, 0, 2.2), 0.16, 0.16), ((0, 0, 2.34), 0.03, 0.03)], sides=8, m=cact1)
    loft('arm1', [((0.2, 0, 1.1), 0.12, 0.12), ((0.55, 0, 1.15), 0.12, 0.12), ((0.64, 0, 1.4), 0.11, 0.11), ((0.64, 0, 1.9), 0.1, 0.1), ((0.64, 0, 2.0), 0.02, 0.02)], sides=7, m=cact2)
    loft('arm2', [((-0.2, 0, 0.8), 0.11, 0.11), ((-0.5, 0, 0.84), 0.11, 0.11), ((-0.58, 0, 1.05), 0.1, 0.1), ((-0.58, 0, 1.45), 0.09, 0.09), ((-0.58, 0, 1.54), 0.02, 0.02)], sides=7, m=cact2)
    ball('flower', (0, 0, 2.36), mat('w_flower', '#ffd24a'), 0.06)
def tree_dead():
    start('prop_tree_dead')
    loft('trunk', [((0, 0, 0), 0.17, 0.17), ((0.05, 0, 0.7), 0.11, 0.11), ((-0.04, 0.04, 1.4), 0.08, 0.08), ((0.02, 0, 2.05), 0.03, 0.03)], sides=6, m=dead1)
    for i, (a, b, r) in enumerate([((0.03, 0, 1.1), (0.6, 0.1, 1.75), 0.05), ((-0.02, 0.02, 0.95), (-0.55, 0.2, 1.5), 0.045), ((0, 0.02, 1.5), (0.1, -0.5, 2.0), 0.04), ((-0.02, 0, 1.7), (-0.4, -0.2, 2.2), 0.035), ((0.6, 0.1, 1.75), (0.8, 0.3, 2.1), 0.025)]):
        spike('br%d' % i, a, b, r, m=dead2, sides=4)

# ---------------------------------------------------------------- stone (one high, one in radius: the game stretches it)
def rock():
    start('prop_rock'); blob('a', r=1.0, scale=(1, 0.9, 0.62), loc=(0, 0, 0.36), sub=2, m=white, rough=0.3, seed=3)
def rock_b():
    start('prop_rock_b'); blob('a', r=0.86, scale=(1, 0.85, 0.66), loc=(-0.14, 0.05, 0.4), sub=2, m=white, rough=0.32, seed=11); blob('b', r=0.5, scale=(1, 1, 0.7), loc=(0.56, -0.2, 0.22), sub=2, m=white_d, rough=0.3, seed=12)
def rock_spire():
    start('prop_rock_spire')
    loft('a', [((0, 0, -0.05), 0.95, 0.85), ((0.05, 0, 0.3), 0.72, 0.66), ((-0.04, 0.05, 0.62), 0.5, 0.44), ((0.03, 0, 0.88), 0.26, 0.24), ((0, 0, 1.0), 0.03, 0.03)], sides=7, m=white, rough=0.16, seed=7)
    blob('b', r=0.34, scale=(1, 1, 0.7), loc=(0.62, 0.3, 0.14), sub=1, m=white_d, rough=0.3, seed=8)
def pillar():
    start('prop_pillar'); box('foot', (2.0, 2.0, 0.08), (0, 0, 0.04), m=stone, bevel=0.02); disc('shaft', 0.74, 0.86, 0.08, stone, 10, r2=0.68); disc('cap', 0.82, 0.06, 0.94, stone, 10)
    for i in range(10): a = i / 10 * TAU; cyl('flute%d' % i, (math.cos(a) * 0.74, math.sin(a) * 0.74, 0.1), (math.cos(a) * 0.68, math.sin(a) * 0.68, 0.92), 0.05, m=white_d, sides=4)

# (GC 0.72, Ramzies: "objects that are still 2d in a 3d game world ... mushrooms") the bugs' mushroom patches and the ruins
# the bugs and the lizards leave across a world they hold, which were painted on the map. A mushroom: its cap a radius of one,
# standing about one and a third high on a pale stalk; the glowing kind's cap is lit. A ruin: one broken length of wall along
# X from -1 to 1 (the game stretches it to each segment's length and height), one high at its tallest.
sh_stalk = mat('w_m_stalk', '#d9cfb0', rough=0.9); sh_cap = mat('w_m_cap', '#a0623a', rough=0.8); sh_gill = mat('w_m_gill', '#5a3a22'); sh_spot = mat('w_m_spot', '#c98a58', rough=0.8)
sh_glow = mat('w_m_hot_cap', '#ff9a3a', emit=1.6); sh_glow2 = mat('w_m_hot_spot', '#ffe0a0', emit=1.2)
r_bug = mat('w_m_ruin', '#8a7656', rough=1.0); r_bug_d = mat('w_m_ruin_d', '#4d3f2a', rough=1.0); r_resin = mat('w_m_resin', '#d29628', rough=0.4)
r_liz = mat('w_t_ruin', '#7d7392', rough=1.0); r_liz_d = mat('w_t_ruin_d', '#463f58', rough=1.0); r_glyph = mat('w_t_glyph', '#78f0ff', emit=1.8)
def _shroom(name, cap, spot):
    start(name)
    loft('stalk', [((0, 0, 0), 0.26, 0.26), ((0.02, 0, 0.5), 0.2, 0.2), ((0.05, 0.02, 1.0), 0.17, 0.17), ((0.05, 0.02, 1.1), 0.19, 0.19)], sides=9, m=sh_stalk, rough=0.05, seed=2)
    dome('cap', (0.05, 0.02, 1.02), (1.0, 0.94), top=0.42, eq=0.06, rim=lambda a: 0.0, rings=3, segs=14, flare=1.0, m=cap)
    disc('gills', 0.96, 0.03, 1.0, sh_gill, 14, at=(0.05, 0.02))
    for i, (a, r) in enumerate(((0.4, 0.5), (2.2, 0.62), (3.9, 0.36), (5.1, 0.7), (1.3, 0.18))):
        o = blob('spot%d' % i, r=0.12, scale=(1, 1, 0.35), loc=(0.05 + math.cos(a) * r, 0.02 + math.sin(a) * r, 1.05 + 0.4 * (1 - (r / 1.0) ** 2) ** 0.5), sub=1, m=spot)
def shroom(): _shroom('prop_shroom', sh_cap, sh_spot)
def shroom_glow(): _shroom('prop_shroom_glow', sh_glow, sh_glow2)
def _ruin(name, top, side, extra):
    start(name)
    # a wall broken along its top: blocks stacked, the courses stepping down toward the ends and one end snapped off
    import random; rnd = random.Random(7 if 'bugs' in name else 11)
    x = -1.0
    while x < 0.98:
        w = rnd.uniform(0.22, 0.36); w = min(w, 1.0 - x); cx = x + w / 2; h = 1.0 - 0.55 * abs(cx) ** 1.4 - rnd.uniform(0, 0.22)
        n = max(1, int(h / 0.26 + 0.5))
        for k in range(n):
            hh = h / n; box('blk%.2f_%d' % (x, k), (w * 0.97, 0.34 + rnd.uniform(-0.03, 0.03), hh * 0.95), (cx, rnd.uniform(-0.02, 0.02), hh * (k + 0.5)), m=side if (k + int(x * 10)) % 3 else top, bevel=0.015, rot=(0, 0, rnd.uniform(-0.04, 0.04)))
        x += w
    for i in range(5):
        a = rnd.uniform(-1, 1); o = blob('rubble%d' % i, r=rnd.uniform(0.08, 0.16), scale=(1.2, 1, 0.6), loc=(a, rnd.choice((-1, 1)) * rnd.uniform(0.24, 0.42), 0.04), sub=1, m=side, rough=0.3, seed=i)
    extra(rnd)
def ruin_bugs(): _ruin('prop_ruin_bugs', r_bug, r_bug_d, lambda rnd: [blob('resin%d' % i, r=0.14, scale=(1, 0.7, 1.3), loc=(rnd.uniform(-0.7, 0.7), -0.19, rnd.uniform(0.2, 0.55)), sub=1, m=r_resin, rough=0.2, seed=i) for i in range(4)])
def ruin_lizards(): _ruin('prop_ruin_lizards', r_liz, r_liz_d, lambda rnd: [box('glyph%d' % i, (0.1, 0.03, 0.18), (-0.45 + i * 0.45, -0.18, 0.45 - 0.1 * abs(i - 1)), m=r_glyph) for i in range(3)])

# (GC 0.72, Ramzies: "bug breaches look like 2d holes", "some craters after blowing things up look 2d") a bug hole and a
# crater's rim, a radius of one. The bug hole: a ring of heaved earth round a dark pit, chitin spikes in the rim, clods thrown out.
# The crater: earth thrown up round a blast; its colour is the ground's (the game tints `white`), its scorched bowl is painted.
def _rim(name, r, tube, h, m, n=22, seed=1, rough=0.18):
    # uneven all the way round (each section its own width, height and reach), and closed: the last section is the first
    import random; rnd = random.Random(seed); v = [(1 + rough * rnd.uniform(-0.9, 0.9), 1 + rough * rnd.uniform(-1.3, 1.3), 1 + rough * rnd.uniform(-0.25, 0.25)) for i in range(n)]; v.append(v[0])
    pts = [((math.cos(i / n * TAU) * r * v[i % n][2], math.sin(i / n * TAU) * r * v[i % n][2], h * 0.3 * v[i % n][1]), tube * v[i % n][0], h * v[i % n][1]) for i in range(n + 2)]     # (one section past the start: the ends overlap, no crack)
    return loft(name, pts, sides=7, m=m, cap=False)
def bughole():
    start('prop_bughole')
    _rim('rim', 0.8, 0.26, 0.22, m_mound, seed=3); _rim('rim2', 0.96, 0.18, 0.1, m_light, seed=5, rough=0.25)
    disc('pit', 0.62, 0.02, 0.0, m_dark, 16); disc('deep', 0.4, 0.02, 0.012, mat('w_m_pit', '#050201'), 14)
    for i in range(6): a = i / 6 * TAU + 0.4; spike('spk%d' % i, (math.cos(a) * 0.72, math.sin(a) * 0.72, 0.12), (math.cos(a) * 0.98, math.sin(a) * 0.98, 0.55), 0.06, m=m_dark)
    for i in range(9):
        a = i * 2.3 + 0.2; d = 1.08 + 0.2 * ((i * 0.37) % 1)
        blob('clod%d' % i, r=0.1 + 0.05 * (i % 3), scale=(1.2, 1, 0.6), loc=(math.cos(a) * d, math.sin(a) * d, 0.04), sub=1, m=m_mound if i % 2 else m_light, rough=0.3, seed=i)
def crater():
    start('prop_crater')
    _rim('rim', 0.84, 0.28, 0.11, white, seed=8, rough=0.28); _rim('rim2', 1.02, 0.16, 0.05, white_d, seed=9, rough=0.35)
    for i in range(10):
        a = i * 2.1 + 0.5; d = 1.05 + 0.25 * ((i * 0.53) % 1)
        blob('clod%d' % i, r=0.06 + 0.04 * (i % 3), scale=(1.2, 1, 0.55), loc=(math.cos(a) * d, math.sin(a) * d, 0.02), sub=1, m=white_d, rough=0.3, seed=i)

# (GC 0.72, Ramzies: "there are still 2d lines for enemy capital bases") a length of the capital's curtain wall, X from -1 to 1,
# one high: buttressed both sides, a walk along its top and teeth along the edge. Tinted to the enemy (white, white_d).
def fortwall():
    start('prop_fortwall')
    box('wall', (2.0, 0.42, 0.86), (0, 0, 0.43), m=white, bevel=0.02, taper=0.92); box('walk', (2.0, 0.5, 0.06), (0, 0, 0.88), m=white_d, bevel=0.01)
    for i in range(9):
        x = -0.92 + i * 0.23; box('tooth%d' % i, (0.12, 0.08, 0.12), (x, -0.22, 0.97), m=white, bevel=0.01)
    for i in range(5):
        x = -0.8 + i * 0.4
        for sy in (-1, 1): box('butt%d%d' % (i, sy > 0), (0.14, 0.2, 0.6), (x, sy * 0.27, 0.3), m=white_d, bevel=0.02, taper=0.6)

# (GC 0.72, Ramzies: "upgrading items should show a difference") WHAT A POST GAINS AS IT IS UPGRADED, laid round it by the game at
# the post's own footprint (a radius of about one, its front to -Y). Level 2: a low wall of sandbags across the front. Level 3:
# steel plates standing before them. Level 4: an ammunition stack, a floodlight and an aerial at the back. Level 5: concrete
# barriers along the sides and a pennant on a mast. Nothing goes over the top: the post is still seen from above.
up_lamp = mat('w_up_lamp', '#fff0c0', emit=2.4); up_pen = mat('w_up_flag', '#2f8f9c', rough=0.9); up_conc = mat('w_up_conc', '#a9aea6', rough=0.95); up_stripe = mat('w_up_stripe', '#e8b72a')
def up_bags():
    start('prop_up_bags')
    bags('a', 1.2, 10, 0.08, bag, a0=R(200), arc=R(140), size=0.15); bags('b', 1.2, 9, 0.22, bag_d, a0=R(207), arc=R(126), size=0.15)
def up_plates():
    start('prop_up_plates')
    for i, a in enumerate((R(236), R(270), R(304))):
        x, y = math.cos(a) * 1.46, math.sin(a) * 1.46
        box('plate%d' % i, (0.52, 0.05, 0.5), (x, y, 0.27), m=gun_d, bevel=0.01, rot=(R(-10), 0, a + math.pi / 2))
        box('stripe%d' % i, (0.52, 0.06, 0.07), (x, y, 0.45), m=up_stripe, rot=(R(-10), 0, a + math.pi / 2))
        for k in (-1, 1): cyl('stay%d%d' % (i, k), (x + math.cos(a + math.pi / 2) * 0.2 * k, y + math.sin(a + math.pi / 2) * 0.2 * k, 0.4), (x * 0.86 + math.cos(a + math.pi / 2) * 0.2 * k, y * 0.86 + math.sin(a + math.pi / 2) * 0.2 * k, 0), 0.018, m=black, sides=4)
def up_kit():
    start('prop_up_kit')
    for i, (x, y, z, r) in enumerate(((-0.95, 0.92, 0.09, 12), (-0.7, 1.05, 0.09, -8), (-0.84, 0.97, 0.27, 4))):
        box('ammo%d' % i, (0.3, 0.2, 0.18), (x, y, z), m=olive if i % 2 == 0 else olive_d, bevel=0.012, rot=(0, 0, R(r))); box('ammol%d' % i, (0.31, 0.04, 0.05), (x, y - 0.1, z + 0.03), m=up_stripe, rot=(0, 0, R(r)))
    cyl('mast', (0.95, 0.95, 0), (0.95, 0.95, 1.7), 0.03, m=black, sides=6); box('lamp', (0.22, 0.14, 0.14), (0.95, 0.88, 1.74), m=gun_d, bevel=0.015, rot=(R(-20), 0, R(20)))
    box('lens', (0.17, 0.02, 0.1), (0.93, 0.8, 1.72), m=up_lamp, rot=(R(-20), 0, R(20))); cyl('foot', (0.95, 0.95, 0), (0.95, 0.95, 0.06), 0.14, m=gun_d, sides=9)
    cyl('aerial', (1.08, 0.82, 0.06), (1.12, 0.84, 2.3), 0.01, m=black, sides=3); box('radio', (0.18, 0.12, 0.22), (1.08, 0.82, 0.11), m=olive_d, bevel=0.01)
def up_flag():
    start('prop_up_flag')
    for i, (x, y, a) in enumerate(((-1.35, 0.1, 90), (1.35, 0.1, 90), (-1.05, -0.85, 50), (1.05, -0.85, -50))):
        box('jersey%d' % i, (0.62, 0.22, 0.4), (x, y, 0.2), m=up_conc, bevel=0.02, taper=0.55, rot=(0, 0, R(a))); box('jfoot%d' % i, (0.62, 0.3, 0.08), (x, y, 0.04), m=up_conc, rot=(0, 0, R(a)))
    cyl('pole', (-0.3, 1.25, 0), (-0.3, 1.25, 2.6), 0.025, m=gun, sides=6); ball('knob', (-0.3, 1.25, 2.62), gun, 0.04)
    loft('pennant', [((-0.3, 1.25, 2.5), 0.01, 0.2), ((0.15, 1.27, 2.47), 0.01, 0.12), ((0.6, 1.3, 2.44), 0.008, 0.02)], sides=4, m=up_pen)

# ---------------------------------------------------------------- the enemy's (a footprint radius of about one)
def hive():     # the Molt's nest: a mound, its mouths, spikes round it, glowing sacs
    start('prop_hive')
    blob('mound', r=1.0, scale=(1, 1, 0.78), loc=(0, 0, 0.3), sub=2, m=m_mound, rough=0.24, seed=1); blob('lobe', r=0.62, scale=(1, 1, 1.25), loc=(0.26, 0.2, 0.75), sub=2, m=m_light, rough=0.2, seed=2)
    for i, (a, z) in enumerate([(0.3, 0.55), (2.4, 0.5), (4.4, 0.62)]):
        o = disc('mouth%d' % i, 0.24, 0.1, 0, m_dark, 8); o.location = (math.cos(a) * 0.8, math.sin(a) * 0.8, z); o.rotation_euler = (0, R(70), a)
    for i in range(7): a = i / 7 * TAU + 0.3; spike('spk%d' % i, (math.cos(a) * 0.86, math.sin(a) * 0.86, 0.2), (math.cos(a) * 1.14, math.sin(a) * 1.14, 0.95), 0.085, m=m_dark)
    for i, (a, r, z, s) in enumerate([(1.2, 0.55, 0.92, 0.17), (3.4, 0.62, 0.8, 0.15), (5.3, 0.5, 1.0, 0.16), (0.2, 0.3, 1.42, 0.14)]): ball('sac%d' % i, (math.cos(a) * r, math.sin(a) * r, z), m_hot, s)
    disc('vent', 0.2, 0.12, 1.46, m_dark, 7, at=(0.26, 0.2))
def fab():      # the Foundry's works: a hall, its stacks, a lit door, a crane
    start('prop_fab')
    box('hall', (1.5, 1.2, 0.86), (0, 0, 0.43), m=f_iron, bevel=0.05); box('roof', (1.6, 1.3, 0.12), (0, 0, 0.92), m=f_dark, bevel=0.03); box('door', (0.5, 0.05, 0.5), (0, -0.61, 0.27), m=f_hot)
    for i, (x, y, r, h) in enumerate([(-0.5, 0.3, 0.13, 1.5), (-0.14, 0.36, 0.1, 1.2)]): disc('stack%d' % i, r, h, 0.9, f_steel, 8, at=(x, y)); disc('glow%d' % i, r * 0.8, 0.04, 0.9 + h, f_hot, 8, at=(x, y)); disc('band%d' % i, r * 1.12, 0.06, 0.9 + h * 0.6, f_dark, 8, at=(x, y))
    box('annex', (0.5, 0.7, 0.56), (0.78, -0.18, 0.28), m=f_dark, bevel=0.04); box('vent', (0.3, 0.3, 0.12), (0.4, -0.2, 1.03), m=f_steel, bevel=0.02)
    cyl('crane', (0.42, 0.3, 0.98), (0.42, 0.3, 1.62), 0.035, m=f_steel, sides=5); cyl('jib', (0.42, 0.3, 1.6), (0.42, -0.5, 1.72), 0.03, m=f_steel, sides=5); cyl('hook', (0.42, -0.46, 1.7), (0.42, -0.46, 1.32), 0.012, m=f_dark, sides=3)
    for s in (-1, 1): box('strip%d' % s, (0.04, 0.9, 0.08), (s * 0.76, 0, 0.6), m=f_hot)
    cyl('pipe', (-0.76, -0.4, 0.2), (-0.76, 0.5, 0.2), 0.06, m=f_steel, sides=6)
def camp():     # the Talon's roost: a hide tent on bone poles, a living crystal at its top
    start('prop_camp')
    loft('tent', [((0, 0, 0), 0.92, 0.92), ((0, 0, 0.9), 0.5, 0.5), ((0, 0, 1.62), 0.06, 0.06)], sides=7, m=t_hide, cap=True)
    loft('skirt', [((0, 0, 0), 0.97, 0.97), ((0, 0, 0.26), 0.86, 0.86)], sides=7, m=t_hide_d, cap=False)
    box('flap', (0.44, 0.06, 0.6), (0, -0.74, 0.3), m=t_dark, rot=(R(-24), 0, 0), taper=0.5)
    for i in range(3): a = i / 3 * TAU + 0.2; cyl('pole%d' % i, (math.cos(a) * 0.06, math.sin(a) * 0.06, 1.5), (math.cos(a + math.pi) * 0.3, math.sin(a + math.pi) * 0.3, 2.15), 0.028, m=t_bone, sides=4)
    blob('crystal', r=0.25, scale=(1, 1, 1.4), loc=(0, 0, 2.12), sub=1, m=t_lit)     # (GC 0.64: held by its poles, not hanging between them)
    for i in range(6): a = i / 6 * TAU + 0.5; cyl('stake%d' % i, (math.cos(a) * 1.02, math.sin(a) * 1.02, 0), (math.cos(a) * 1.0, math.sin(a) * 1.0, 0.85), 0.03, m=t_bone, sides=4, r2=0.012)
    box('rack', (0.5, 0.04, 0.04), (0.8, 0.62, 0.62), m=t_bone, rot=(0, 0, R(40)))
    for s in (-1, 1): cyl('rackleg%d' % (s > 0), (0.8 + s * 0.19, 0.62 + s * 0.16, 0), (0.8 + s * 0.19, 0.62 + s * 0.16, 0.64), 0.02, m=t_bone, sides=4)     # (GC 0.64: the rack on two legs)
def spire():    # a Molt side site: spore towers
    start('prop_spire')
    blob('mound', r=0.95, scale=(1, 1, 0.3), loc=(0, 0, 0.02), sub=2, m=m_mound, rough=0.22, seed=5)
    for i, (x, y, h, r) in enumerate([(0, 0.05, 2.6, 0.3), (0.5, -0.3, 1.6, 0.22), (-0.48, -0.26, 1.3, 0.2)]):
        loft('ch%d' % i, [((x, y, 0.08), r * 1.25, r * 1.25), ((x + 0.04, y, h * 0.45), r * 0.8, r * 0.8), ((x - 0.03, y + 0.02, h * 0.82), r * 0.62, r * 0.62), ((x, y, h), r * 0.95, r * 0.95)], sides=7, m=m_light if i else m_mound, rough=0.1, seed=i)
        ball('puff%d' % i, (x, y, h - 0.04), m_hot, r * 0.5); ball('sac%d' % i, (x + r * 0.8, y, h * 0.4), m_hot if i % 2 == 0 else m_dark, r * 0.36)
def totem():    # a Talon side site: a standing bone, a hide wrapped round it, a living crystal
    start('prop_totem')
    disc('base', 0.9, 0.2, 0, t_dark, 9, r2=0.8); cyl('bone', (0, 0, 0.2), (0, 0, 2.7), 0.11, m=t_bone, sides=6, r2=0.07); box('bar', (1.5, 0.1, 0.1), (0, 0, 2.3), m=t_bone, rot=(0, R(7), 0))
    loft('wrap', [((0, 0, 0.3), 0.4, 0.4), ((0, 0, 1.4), 0.13, 0.13)], sides=7, m=t_hide, cap=False); blob('crystal', r=0.16, scale=(1, 1, 1.6), loc=(0, 0, 2.95), sub=1, m=t_lit)
    for s in (-1, 1): box('hang%d' % s, (0.12, 0.02, 0.5), (s * 0.66, 0, 2.02), m=t_hide_d)
    for i in range(4): a = i / 4 * TAU + 0.4; cyl('stake%d' % i, (math.cos(a) * 0.82, math.sin(a) * 0.82, 0.1), (math.cos(a) * 0.74, math.sin(a) * 0.74, 1.05), 0.03, m=t_bone, sides=4, r2=0.012)
def turret():   # a gun on a mount, facing -Y here (the game's forward)
    start('prop_turret')
    disc('ring', 0.78, 0.3, 0, gun_d, 10, r2=0.7); disc('table', 0.5, 0.14, 0.3, gun, 10)
    box('body', (0.86, 0.9, 0.5), (0, 0.06, 0.7), m=gun, bevel=0.06, taper=0.82); box('mantle', (0.9, 0.12, 0.42), (0, -0.44, 0.68), m=gun_d, bevel=0.03)
    for s in (-1, 1): cyl('barrel%d' % s, (s * 0.2, -0.4, 0.72), (s * 0.2, -1.5, 0.76), 0.07, m=gun_d, sides=7); cyl('muz%d' % s, (s * 0.2, -1.38, 0.755), (s * 0.2, -1.52, 0.76), 0.095, m=soot, sides=7)
    box('sight', (0.2, 0.2, 0.14), (0.26, 0.2, 1.0), m=gun_d, bevel=0.02); ball('eye', (0.26, 0.09, 1.0), hot, 0.05)
def cannon():   # the great gun: a pit, a cradle, a barrel at the sky
    start('prop_cannon')
    disc('pit', 0.98, 0.34, 0, gun_d, 10, r2=0.9); disc('floor', 0.8, 0.06, 0.34, soot, 10)
    box('cradle', (0.9, 1.1, 0.7), (0, 0.1, 0.72), m=gun, bevel=0.06, taper=0.8)
    cyl('barrel', (0, 0.3, 0.9), (0, -1.25, 2.3), 0.19, m=gun, sides=9, r2=0.15); cyl('sleeve', (0, 0.15, 1.03), (0, -0.4, 1.53), 0.24, m=gun_d, sides=9); cyl('muzzle', (0, -1.14, 2.2), (0, -1.3, 2.35), 0.2, m=soot, sides=9)
    ball('bore', (0, -1.29, 2.34), hot, 0.12)
    for s in (-1, 1): cyl('ram%d' % s, (s * 0.34, 0.3, 0.6), (s * 0.24, -0.3, 1.34), 0.05, m=gun_d, sides=6); box('step%d' % s, (0.2, 0.5, 0.2), (s * 0.62, 0.3, 0.46), m=gun_d, bevel=0.02)
def node():     # a mast and its dish
    start('prop_node')
    box('base', (1.1, 1.1, 0.44), (0, 0, 0.22), m=gun_d, bevel=0.05, taper=0.86); cyl('mast', (0, 0, 0.44), (0, 0, 2.3), 0.06, m=gun, sides=7)
    o = blob('dish', r=0.52, scale=(1, 0.24, 1), sub=2, m=gun); o.location = (0, -0.16, 2.0); o.rotation_euler = (R(-28), 0, 0)
    cyl('arm', (0, -0.2, 2.0), (0, -0.6, 2.24), 0.02, m=gun_d, sides=4); ball('feed', (0, -0.6, 2.24), hot, 0.06); ball('top', (0, 0, 2.36), hot, 0.07)
    for i in range(3): a = i / 3 * TAU + 0.5; cyl('guy%d' % i, (0, 0, 1.7), (math.cos(a) * 0.8, math.sin(a) * 0.8, 0.02), 0.012, m=soot, sides=3)
def banner():
    start('prop_banner'); cyl('pole', (0, 0, 0), (0, 0, 7.0), 0.08, m=pole, sides=6); box('arm', (1.5, 0.06, 0.06), (0.72, 0, 6.8), m=pole); box('cloth', (1.4, 0.05, 2.8), (0.76, 0, 5.38), m=white, taper=1.0); ball('knob', (0, 0, 7.05), pole, 0.12)
    for i in range(3): box('tail%d' % i, (0.36, 0.05, 0.5), (0.3 + i * 0.46, 0, 3.74), m=white, taper=0.2, rot=(R(180), 0, 0))
def flag():
    start('prop_flag'); cyl('pole', (0, 0, 0), (0, 0, 5.0), 0.06, m=pole, sides=6); box('cloth', (1.3, 0.04, 0.9), (0.7, 0, 4.42), m=white); ball('knob', (0, 0, 5.04), pole, 0.09); disc('foot', 0.3, 0.1, 0, pole, 7, r2=0.16)
def crate():    # something worth picking up
    start('prop_crate'); box('box', (1.5, 1.1, 0.86), (0, 0, 0.43), m=crate_a, bevel=0.03)
    for x in (-0.46, 0.46): box('band%d' % (x > 0), (0.12, 1.14, 0.9), (x, 0, 0.44), m=crate_b)
    box('lid', (0.5, 0.5, 0.03), (0, 0, 0.875), m=crate_l); box('latch', (0.16, 0.04, 0.14), (0, -0.56, 0.6), m=crate_b)

# ---------------------------------------------------------------- yours: built or dropped
def post_mg():
    # (GC 0.59) the Heavy Turret Nest, one unit = 2 m: a chest-high horseshoe of sandbags round the front and the sides, open at
    # the back, where its crew stand at the gun in plain sight. The gun is its own model (post_mggun): it turns, the bags do not.
    start('prop_post_mg'); disc('floor', 0.98, 0.03, 0, mat('w_dirt', '#6f6248', rough=1.0), 10)
    bags('a', 0.8, 9, 0.09, bag, a0=R(150), arc=R(240), size=0.16); bags('b', 0.8, 8, 0.26, bag_d, a0=R(158), arc=R(224), size=0.16); bags('c', 0.8, 8, 0.43, bag, a0=R(150), arc=R(240), size=0.16)
    box('ammo1', (0.22, 0.15, 0.13), (0.42, 0.36, 0.1), m=olive, bevel=0.01, rot=(0, 0, R(20))); box('ammo2', (0.22, 0.15, 0.13), (0.44, 0.34, 0.235), m=olive_d, bevel=0.01, rot=(0, 0, R(8)))
def post_mggun():
    start('prop_post_mggun')
    for i in range(3): a = i / 3 * TAU + math.pi / 2; cyl('leg%d' % i, (0, 0, 0.5), (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.03), 0.018, m=black, sides=4)
    cyl('post', (0, 0, 0.46), (0, 0, 0.58), 0.03, m=black, sides=5)
    box('gun', (0.075, 0.4, 0.09), (0, 0.02, 0.62), m=black, bevel=0.01); cyl('barrel', (0, -0.16, 0.63), (0, -0.74, 0.64), 0.022, m=black, sides=6); cyl('jacket', (0, -0.16, 0.63), (0, -0.42, 0.635), 0.034, m=olive_d, sides=6)
    box('feed', (0.12, 0.16, 0.12), (0.1, -0.02, 0.6), m=olive, bevel=0.01)
    for sx in (-1, 1): cyl('grip%d' % (sx > 0), (sx * 0.05, 0.22, 0.62), (sx * 0.05, 0.3, 0.6), 0.012, m=black, sides=4)
def post_sam():
    start('prop_post_sam'); disc('table', 0.76, 0.3, 0, black, 10, r2=0.7); box('yoke', (0.5, 0.56, 0.6), (0, 0.1, 0.6), m=olive, bevel=0.04, taper=0.8)
    for s in (-1, 1):
        box('box%d' % s, (0.36, 1.5, 0.36), (s * 0.46, -0.1, 1.0), m=olive, bevel=0.03, rot=(R(38), 0, 0)); cone('tip%d' % s, (s * 0.46, -0.68, 1.46), (s * 0.46, -0.95, 1.67), 0.11, tip)
    o = blob('dish', r=0.2, scale=(1, 0.25, 1), sub=1, m=olive_d); o.location = (0, 0.36, 1.2); o.rotation_euler = (R(-30), 0, 0); ball('lamp', (0, 0.3, 0.95), lamp_b, 0.04)
def post_arty():
    start('prop_post_arty'); box('car', (0.4, 0.66, 0.14), (0, 0.05, 0.32), m=olive, bevel=0.02)
    for s in (-1, 1):
        cyl('wh%d' % s, (s * 0.24, 0, 0.26), (s * 0.34, 0, 0.26), 0.26, m=black, sides=10); cyl('hub%d' % s, (s * 0.34, 0, 0.26), (s * 0.36, 0, 0.26), 0.1, m=olive_d, sides=6)
        cyl('trail%d' % s, (s * 0.12, 0.3, 0.3), (s * 0.5, 0.98, 0.06), 0.045, m=olive, sides=5); box('spade%d' % s, (0.2, 0.05, 0.14), (s * 0.5, 0.99, 0.08), m=olive_d, rot=(0, 0, s * R(-30)))
    box('shield', (0.9, 0.05, 0.5), (0, -0.24, 0.56), m=olive, bevel=0.015, rot=(R(-10), 0, 0)); cyl('barrel', (0, 0.3, 0.6), (0, -1.3, 1.2), 0.065, m=olive_d, sides=8); cyl('brake', (0, -1.24, 1.18), (0, -1.42, 1.25), 0.095, m=black, sides=8); cyl('recup', (0, 0.1, 0.56), (0, -0.5, 0.8), 0.045, m=black, sides=6)
def post_tower():
    start('prop_post_tower')
    for sx in (-1, 1):
        for sy in (-1, 1): cyl('leg%d%d' % (sx, sy), (sx * 0.58, sy * 0.58, 0), (sx * 0.5, sy * 0.5, 2.4), 0.05, m=wood, sides=4)
    for z in (0.8, 1.6):
        for i in range(4): a = ringpt(i, 4, 0.76 - z * 0.03, z, math.pi / 4); b = ringpt(i + 1, 4, 0.76 - z * 0.03, z, math.pi / 4); cyl('br%d%d' % (z * 10, i), a, b, 0.025, m=wood, sides=3)
    for i in range(4): a = ringpt(i, 4, 0.8, 0.1, math.pi / 4); b = ringpt(i + 1, 4, 0.72, 1.6, math.pi / 4); cyl('x%d' % i, a, b, 0.02, m=wood, sides=3)
    box('deck', (1.3, 1.3, 0.1), (0, 0, 2.42), m=wood, bevel=0.01)
    for i, (x, y, sx, sy) in enumerate([(0, -0.62, 1.3, 0.06), (0, 0.62, 1.3, 0.06), (0.62, 0, 0.06, 1.3), (-0.62, 0, 0.06, 1.3)]): box('rail%d' % i, (sx, sy, 0.44), (x, y, 2.7), m=wood)
    for sx in (-1, 1):
        for sy in (-1, 1): cyl('post%d%d' % (sx, sy), (sx * 0.6, sy * 0.6, 2.46), (sx * 0.6, sy * 0.6, 3.3), 0.035, m=wood, sides=4)
    box('roof', (1.7, 1.7, 0.5), (0, 0, 3.52), m=olive_d, taper=0.08); cyl('ladder', (0, 0.66, 0), (0, 0.66, 2.4), 0.03, m=wood, sides=3); ball('light', (0.4, -0.62, 3.0), lamp_b, 0.09)
    # (GC 0.59) the operator's station behind it (one unit = 2.2 m): a console in a waist-high crescent of sandbags, open at the back
    box('desk', (0.36, 0.2, 0.42), (0, 0.96, 0.21), m=olive, bevel=0.015); box('panel', (0.32, 0.03, 0.2), (0, 0.9, 0.52), m=olive_d, rot=(R(-20), 0, 0)); ball('lamp2', (0.1, 0.9, 0.6), lamp_b, 0.025)
    for z, m_, n in ((0.07, bag, 7), (0.2, bag_d, 6), (0.33, bag, 7)):
        for i in range(n):
            a = R(190) + R(160) * (i + 0.5) / n
            o = blob('sb%d%d' % (z * 100, i), r=0.12, scale=(1.3, 0.78, 0.6), sub=1, m=m_, rough=0.12, seed=i); o.location = (math.cos(a) * 0.62, 1.2 + math.sin(a) * 0.62, z); o.rotation_euler = (0, 0, a + math.pi / 2)

def post_lookout():
    # (GC 0.59) the Lookout Tower, one unit = 1.6 m: an open deck four metres up with a plank rail all round; the lookouts stand
    # on it, in plain sight. No roof: they are seen from above.
    start('prop_post_lookout')
    for sx in (-1, 1):
        for sy in (-1, 1): cyl('leg%d%d' % (sx, sy), (sx * 0.66, sy * 0.66, 0), (sx * 0.58, sy * 0.58, 2.4), 0.05, m=wood, sides=4)
    for z in (0.8, 1.6):
        for i in range(4): a = ringpt(i, 4, 0.86 - z * 0.03, z, math.pi / 4); b = ringpt(i + 1, 4, 0.86 - z * 0.03, z, math.pi / 4); cyl('br%d%d' % (z * 10, i), a, b, 0.025, m=wood, sides=3)
    for i in range(4): a = ringpt(i, 4, 0.9, 0.1, math.pi / 4); b = ringpt(i + 1, 4, 0.82, 1.6, math.pi / 4); cyl('x%d' % i, a, b, 0.02, m=wood, sides=3)
    box('deck', (1.5, 1.5, 0.08), (0, 0, 2.43), m=wood, bevel=0.01)
    for i, (x, y, sx, sy) in enumerate([(0, -0.73, 1.5, 0.05), (0.73, 0, 0.05, 1.5), (-0.73, 0, 0.05, 1.5)]):
        box('rail%d' % i, (sx, sy, 0.2), (x, y, 2.6), m=wood); box('rtop%d' % i, (sx, sy, 0.12), (x, y, 2.98), m=wood)
    box('railb0', (0.5, 0.05, 0.2), (-0.5, 0.73, 2.6), m=wood); box('railb1', (0.5, 0.05, 0.12), (-0.5, 0.73, 2.98), m=wood)     # (the back: a gap where the ladder comes up)
    for sx in (-1, 1):
        for sy in (-1, 1): cyl('post%d%d' % (sx, sy), (sx * 0.73, sy * 0.73, 2.46), (sx * 0.73, sy * 0.73, 3.06), 0.035, m=wood, sides=4)
    for sx in (-1, 1): cyl('lad%d' % (sx > 0), (0.3 + sx * 0.13, 0.9, 0), (0.3 + sx * 0.13, 0.76, 2.5), 0.02, m=wood, sides=3)
    for k in range(7): z = 0.3 + k * 0.33; y = 0.9 - 0.14 * z / 2.5; cyl('rung%d' % k, (0.17, y, z), (0.43, y, z), 0.014, m=wood, sides=3)
    ball('light', (0.6, -0.73, 3.1), lamp_b, 0.07)
def aturret():
    start('prop_aturret')
    for i in range(3): a = i / 3 * TAU + math.pi / 2; cyl('leg%d' % i, (0, 0, 0.6), (math.cos(a) * 0.62, math.sin(a) * 0.62, 0), 0.04, m=black, sides=4)
    box('head', (0.6, 0.7, 0.42), (0, 0, 0.8), m=olive, bevel=0.05, taper=0.84); cyl('barrel', (0, -0.3, 0.82), (0, -1.3, 0.84), 0.05, m=black, sides=7); cyl('shroud', (0, -0.3, 0.82), (0, -0.7, 0.83), 0.085, m=olive_d, sides=7)
    box('plate', (0.5, 0.5, 0.05), (0, 0.04, 1.03), m=white); ball('eye', (0.2, -0.36, 0.92), lamp_b, 0.045)

# ---------------------------------------------------------------- the fleets' ships (nose to +X, about three long)
def xl(name, secs, sides=8, m=None):
    """A hull skinned along X. secs: [(x, half-width (y), half-height (z)[, z lift])]."""
    return loft(name, [((s[0], 0, s[3] if len(s) > 3 else 0), s[1], s[2]) for s in secs], sides=sides, m=m)
def ship_fed():     # yours: a long grey wedge with a bridge and liveried wings
    start('ship_fed')
    xl('hull', [(-1.5, 0.3, 0.2), (-1.2, 0.44, 0.26), (-0.3, 0.42, 0.25), (0.6, 0.26, 0.17), (1.3, 0.1, 0.08), (1.5, 0.02, 0.02)], 8, h_hull)
    box('spine', (1.7, 0.26, 0.1), (-0.35, 0, 0.26), m=h_deck, bevel=0.02); box('bridge', (0.4, 0.3, 0.26), (-0.78, 0, 0.42), m=h_hull, bevel=0.04, taper=0.8); box('glass', (0.04, 0.22, 0.09), (-0.57, 0, 0.45), m=accent_lit); box('mast', (0.08, 0.05, 0.2), (-0.86, 0, 0.64), m=h_deck)
    for s in (-1, 1):
        box('wing%d' % s, (0.95, 0.62, 0.06), (-0.82, s * 0.6, 0.0), m=accent, bevel=0.015, rot=(0, 0, s * R(-22)), taper=0.9); cyl('eng%d' % s, (-1.74, s * 0.26, 0), (-1.24, s * 0.26, 0), 0.15, m=h_dark, sides=8); cyl('burn%d' % s, (-1.78, s * 0.26, 0), (-1.74, s * 0.26, 0), 0.11, m=accent_lit, sides=8)
        box('stripe%d' % s, (0.9, 0.04, 0.05), (0.3, s * 0.27, 0.13), m=accent, rot=(0, 0, s * R(-10))); box('gun%d' % s, (0.3, 0.05, 0.05), (0.2, s * 0.2, 0.26), m=h_dark)
    box('keel', (0.9, 0.08, 0.14), (-0.6, 0, -0.26), m=h_dark, bevel=0.02)
def ship_molt():    # the Molt: a living thing, sacs on its back, mandibles ahead
    start('ship_molt')
    xl('body', [(-1.5, 0.05, 0.05), (-1.1, 0.42, 0.3), (-0.3, 0.62, 0.44), (0.4, 0.5, 0.36), (0.9, 0.34, 0.26), (1.3, 0.2, 0.16)], 8, c_hide)
    blob('head', r=0.42, scale=(1.2, 1, 0.8), loc=(1.15, 0, 0.02), sub=2, m=c_dark, rough=0.12, seed=2)
    for s in (-1, 1):
        spike('jaw%d' % s, (1.4, s * 0.26, -0.04), (2.1, s * 0.1, -0.08), 0.09, m=c_bone); spike('fin%d' % s, (-0.2, s * 0.56, 0.0), (-1.2, s * 1.1, -0.05), 0.16, m=c_dark, flat=0.3); spike('fin2%d' % s, (-0.8, s * 0.42, 0.0), (-1.6, s * 0.8, -0.05), 0.13, m=c_dark, flat=0.3)
        ball('eye%d' % s, (1.36, s * 0.22, 0.14), accent_lit, 0.07)
    for i, (x, r) in enumerate([(0.3, 0.2), (-0.25, 0.26), (-0.8, 0.22)]): blob('sac%d' % i, r=r, scale=(1.1, 1, 0.8), loc=(x, 0, 0.4), sub=1, m=accent_lit)
    for i in range(4): box('plate%d' % i, (0.3, 0.9 - i * 0.12, 0.04), (0.55 - i * 0.42, 0, 0.36 + (0.05 if i in (1, 2) else 0)), m=c_dark, bevel=0.01, rot=(0, R(-8), 0))
    spike('tail', (-1.3, 0, 0), (-2.0, 0, 0.1), 0.16, m=c_hide)
def ship_foundry(): # the Foundry: a block of iron with a spinal gun
    start('ship_foundry')
    box('hull', (2.2, 0.9, 0.6), (-0.1, 0, 0), m=i_iron, bevel=0.05); box('ram', (0.62, 1.12, 0.82), (1.15, 0, 0), m=i_dark, bevel=0.06); box('top', (0.9, 0.5, 0.34), (-0.45, 0, 0.44), m=i_dark, bevel=0.04)
    cyl('gun', (0.0, 0, 0.5), (1.75, 0, 0.5), 0.085, m=i_soot, sides=8); box('muzzle', (0.16, 0.26, 0.26), (1.74, 0, 0.5), m=i_soot, bevel=0.02)
    for s in (-1, 1):
        disc('stack%d' % s, 0.1, 0.5, 0.44, i_soot, 7, at=(-1.0, s * 0.2)); box('strip%d' % s, (1.5, 0.04, 0.2), (-0.1, s * 0.46, 0.02), m=accent); box('pod%d' % s, (1.2, 0.3, 0.2), (-0.2, s * 0.6, -0.2), m=i_dark, bevel=0.03)
    box('line', (1.2, 0.2, 0.03), (-0.1, 0, 0.31), m=accent); box('eng', (0.36, 0.82, 0.52), (-1.38, 0, 0), m=i_dark, bevel=0.04); box('burn', (0.03, 0.6, 0.3), (-1.57, 0, 0), m=accent_lit)
def ship_talon():   # the Talon: a pale blade between two horns
    start('ship_talon')
    xl('blade', [(-1.5, 0.3, 0.1), (-0.8, 0.44, 0.15), (0.2, 0.3, 0.12), (1.1, 0.12, 0.06), (1.5, 0.01, 0.01)], 6, v_ivory); xl('ridge', [(-1.2, 0.16, 0.1, 0.12), (-0.2, 0.2, 0.12, 0.12), (0.8, 0.02, 0.02, 0.1)], 6, v_hide)
    for s in (-1, 1):
        spike('horn%d' % s, (-0.65, s * 0.78, 0), (1.35, s * 0.52, 0), 0.13, m=v_hide, flat=0.75); box('pylon%d' % s, (0.5, 0.6, 0.07), (-0.55, s * 0.48, 0), m=v_hide, bevel=0.015)
        spike('tailfin%d' % s, (-1.2, s * 0.26, 0.1), (-1.9, s * 0.3, 0.3), 0.1, m=v_ivory, flat=0.3)
    blob('crystal', r=0.3, scale=(1.25, 0.8, 0.8), loc=(-0.45, 0, 0.3), sub=1, m=accent_lit); blob('core', r=0.25, scale=(1, 1, 0.72), loc=(-1.4, 0, 0), sub=1, m=accent_lit)

OUT = {}
PROPS = (tree_leaf, tree_pine, tree_jungle, tree_cactus, tree_dead, rock, rock_b, rock_spire, pillar, shroom, shroom_glow, ruin_bugs, ruin_lizards, bughole, crater, fortwall, up_bags, up_plates, up_kit, up_flag, spire, totem, turret, banner, flag, crate, aturret)     # (GC 0.64: the heavy turret, its gun, the artillery, the SAM site, the propaganda tower and the lookout are fleet.py's. GC 0.67: the nests, the great gun and the shield node are enemy.py's; turret stays as the old shared one)
SHIPS = (ship_fed, ship_molt, ship_foundry, ship_talon)
for fn in PROPS + SHIPS:
    fn(); bpy.context.view_layer.update()
    OUT[MADE[-1]] = export(MADE[-1], CUR, {'stand': (lambda: None)}, lod=0)
# the picture: all of them set out in rows (after the export, which wants each at the origin)
for i, name in enumerate(MADE):
    for o in bpy.data.collections[name].objects:
        if o.parent is None: o.location = Vector(o.location) + Vector(((i % 6) * 3.6, -(i // 6) * 4.2, 0))
PIC = shot('world', dist=40, target=(9.0, -8.6, 1.0), res=(1700, 1250), az=18, el=40)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'world.blend'))
