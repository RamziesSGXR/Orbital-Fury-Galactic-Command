# VEHICLES, AIRCRAFT AND FIELD WORKS (GC 0.41). Run after gc_kit.py:
#   exec(open(ROOT + r'\gc_kit.py').read()); exec(open(ROOT + r'\scripts\vehicles.py').read())
# Vehicles and aircraft face -Y (the game's forward) and are sized by the game (each is fitted to its own longest
# side). Their materials are named as the people's are (`uniform`, `uniform_dark`, `kit`, `trim`, `armband`), so the
# game dresses them in the fleet's colours. Field works that are laid along a line (wire, trench, walls, bridge) run
# along X from -1 to 1 with their true width and height in metres: the game stretches them to their length.
import math
from mathutils import Vector
R = math.radians; TAU = math.pi * 2
wipe()
uni = mat('uniform', '#5d6a4a'); uni_d = mat('uniform_dark', '#48543a'); kit = mat('kit', '#39422e'); trim = mat('trim', '#2f8f9c'); band = mat('armband', '#f2efe4')
black = mat('v_black', '#1c1e20'); steel = mat('v_steel', '#70777d', rough=0.5, metal=0.6); steel_d = mat('v_steel_d', '#3a3f44', rough=0.5, metal=0.5); glass = mat('v_glass', '#243c4c', rough=0.2)
lit_b = mat('v_lit_b', '#7fd8ff', emit=2.0); lit_r = mat('v_lit_r', '#ff4a3a', emit=2.0); lit_w = mat('v_lit_w', '#fff2c8', emit=2.0); hot = mat('v_hot', '#ffb060', emit=2.0)
white = mat('v_white', '#e6ebee', rough=0.5); orange = mat('v_orange', '#e8862a'); tip = mat('v_tip', '#d9d9d9'); hazard = mat('v_hazard', '#e8b72a')
bag = mat('v_bag', '#8a7a56', rough=1.0); bag_d = mat('v_bag_d', '#6f6244', rough=1.0); dirt = mat('v_dirt', '#5a4e3a', rough=1.0); wood = mat('v_wood', '#6f5a3a'); wood_d = mat('v_wood_d', '#4c3d28')
conc = mat('v_conc', '#9aa29c', rough=0.95); conc_l = mat('v_conc_l', '#c3cac4', rough=0.95); deck = mat('v_deck', '#7c8a90', rough=0.6, metal=0.4)

MADE = []
def start(name):
    global CUR
    CUR = coll(name); MADE.append(name); return CUR
def disc(name, r, h, z, m, sides=12, r2=None, at=(0, 0)): return cyl(name, (at[0], at[1], z), (at[0], at[1], z + h), r, m=m, sides=sides, r2=r2)
def ball(name, loc, m, r=0.05, sub=1): return blob(name, r=r, loc=loc, sub=sub, m=m)
def yl(name, secs, sides=8, m=None):
    """A hull skinned along Y (nose at the low end). secs: [(y, half-width, half-height, z)]."""
    return loft(name, [((0, s[0], s[3]), s[1], s[2]) for s in secs], sides=sides, m=m)
def wheel(name, x, y, r=0.42, w=0.3, z=None):
    s = 1 if x > 0 else -1; z = r if z is None else z
    cyl(name, (x - s * w / 2, y, z), (x + s * w / 2, y, z), r, m=black, sides=10); cyl(name + 'h', (x + s * w / 2, y, z), (x + s * (w / 2 + 0.03), y, z), r * 0.5, m=steel, sides=6)

# ---------------------------------------------------------------- aircraft
def dropship():     # the troop carrier: a box body between two lift engines, a ramp at the back
    start('veh_dropship')
    yl('body', [(-2.3, 0.22, 0.2, 0.86), (-1.7, 0.62, 0.46, 0.86), (-0.3, 0.78, 0.58, 0.84), (1.3, 0.74, 0.55, 0.86), (2.1, 0.5, 0.34, 1.0)], 8, uni)
    box('glass', (0.7, 0.5, 0.26), (0, -1.72, 1.2), m=glass, bevel=0.06, rot=(R(-24), 0, 0)); box('roof', (0.9, 2.2, 0.14), (0, 0.2, 1.42), m=uni_d, bevel=0.03)
    box('wing', (3.6, 1.0, 0.14), (0, 0.15, 1.36), m=uni_d, bevel=0.03)
    for s in (-1, 1):
        disc('pod%d' % s, 0.46, 0.62, 1.02, kit, 10, r2=0.4, at=(s * 1.72, 0.15)); disc('fan%d' % s, 0.36, 0.04, 1.0, lit_b, 10, at=(s * 1.72, 0.15)); disc('cap%d' % s, 0.3, 0.1, 1.64, steel_d, 8, at=(s * 1.72, 0.15))
        box('stripe%d' % s, (0.04, 2.2, 0.2), (s * 0.77, -0.1, 0.9), m=band); box('door%d' % s, (0.05, 0.9, 0.62), (s * 0.78, 0.2, 0.74), m=uni_d)
        box('fin%d' % s, (0.07, 0.7, 0.62), (s * 0.4, 2.0, 1.5), m=trim, bevel=0.015, taper=0.6, rot=(0, s * R(14), 0)); cyl('skid%d' % s, (s * 0.6, -1.0, 0.3), (s * 0.66, -1.0, 0.0), 0.05, m=steel_d, sides=5); cyl('skidb%d' % s, (s * 0.6, 1.0, 0.3), (s * 0.66, 1.0, 0.0), 0.05, m=steel_d, sides=5)
    box('ramp', (1.0, 0.9, 0.07), (0, 2.3, 0.44), m=uni_d, rot=(R(28), 0, 0)); box('boom', (0.4, 0.8, 0.3), (0, 2.0, 1.2), m=uni, bevel=0.04); ball('nav', (0, -2.28, 0.9), lit_r, 0.07)
    cyl('gun', (0, -1.9, 0.5), (0, -2.5, 0.46), 0.05, m=black, sides=6)
def striker():      # the strike fighter: a dart with swept wings, twin fins, bombs under them
    start('veh_striker')
    yl('fuse', [(-2.6, 0.03, 0.03, 0.5), (-1.8, 0.26, 0.2, 0.5), (-0.4, 0.4, 0.3, 0.52), (1.2, 0.38, 0.28, 0.52), (2.2, 0.26, 0.2, 0.52)], 8, uni)
    box('canopy', (0.34, 0.9, 0.2), (0, -1.1, 0.78), m=glass, bevel=0.07)
    for s in (-1, 1):
        box('wing%d' % s, (1.8, 1.5, 0.08), (s * 1.1, 0.7, 0.48), m=uni, bevel=0.02, rot=(0, 0, s * R(-26)), taper=1.0); box('tipw%d' % s, (0.5, 0.6, 0.085), (s * 1.9, 1.2, 0.48), m=trim, rot=(0, 0, s * R(-26)))
        box('fin%d' % s, (0.07, 0.8, 0.7), (s * 0.34, 1.8, 0.95), m=trim, bevel=0.015, taper=0.5, rot=(0, s * R(18), 0)); box('intake%d' % s, (0.26, 0.9, 0.26), (s * 0.46, -0.3, 0.42), m=uni_d, bevel=0.04)
        cyl('eng%d' % s, (s * 0.2, 1.9, 0.52), (s * 0.2, 2.4, 0.52), 0.17, m=steel_d, sides=8); cyl('burn%d' % s, (s * 0.2, 2.4, 0.52), (s * 0.2, 2.44, 0.52), 0.13, m=hot, sides=8)
        for k in (0, 1): loft('bomb%d%d' % (s, k), [((s * (0.9 + k * 0.5), 0.2 + k * 0.3, 0.3), 0.02, 0.02), ((s * (0.9 + k * 0.5), 0.45 + k * 0.3, 0.3), 0.09, 0.09), ((s * (0.9 + k * 0.5), 1.0 + k * 0.3, 0.3), 0.07, 0.07)], sides=6, m=kit)
        box('canard%d' % s, (0.5, 0.3, 0.05), (s * 0.5, -1.4, 0.52), m=uni_d, rot=(0, 0, s * R(-20)))
    box('stripe', (0.82, 0.16, 0.02), (0, 0.4, 0.83), m=band)

# ---------------------------------------------------------------- vehicles
def lrv():          # the squad's light vehicle: four wheels, a roll cage, a gun on a ring
    start('veh_lrv')
    box('chassis', (1.3, 2.7, 0.3), (0, 0, 0.56), m=uni, bevel=0.05); box('hood', (1.2, 0.8, 0.26), (0, -0.9, 0.8), m=uni, bevel=0.06, taper=0.86); box('bed', (1.2, 0.9, 0.3), (0, 0.85, 0.82), m=uni_d, bevel=0.04)
    box('screen', (1.1, 0.05, 0.36), (0, -0.46, 1.06), m=glass, rot=(R(-22), 0, 0)); box('bumper', (1.4, 0.12, 0.16), (0, -1.42, 0.5), m=steel_d, bevel=0.02); box('stripe', (1.22, 0.14, 0.02), (0, -0.9, 0.935), m=band)
    for i, (x, y) in enumerate(((0.72, -0.92), (-0.72, -0.92), (0.72, 0.92), (-0.72, 0.92))): wheel('wh%d' % i, x, y)
    for s in (-1, 1):
        cyl('cageA%d' % s, (s * 0.6, -0.4, 0.9), (s * 0.56, -0.2, 1.62), 0.035, m=steel_d, sides=5); cyl('cageB%d' % s, (s * 0.56, -0.2, 1.62), (s * 0.56, 0.5, 1.62), 0.035, m=steel_d, sides=5); cyl('cageC%d' % s, (s * 0.56, 0.5, 1.62), (s * 0.6, 0.6, 0.9), 0.035, m=steel_d, sides=5)
        box('seat%d' % s, (0.4, 0.4, 0.4), (s * 0.3, 0.05, 0.9), m=kit, bevel=0.04); ball('lamp%d' % s, (s * 0.46, -1.32, 0.76), lit_w, 0.07); box('fender%d' % s, (0.2, 0.7, 0.08), (s * 0.72, -0.92, 0.9), m=uni_d)
    cyl('bar', (-0.56, 0.5, 1.62), (0.56, 0.5, 1.62), 0.035, m=steel_d, sides=5); disc('ring', 0.26, 0.08, 1.62, steel_d, 8, at=(0, 0.3)); box('mgun', (0.12, 0.5, 0.12), (0, 0.1, 1.8), m=black, bevel=0.01); cyl('mbar', (0, -0.1, 1.8), (0, -0.9, 1.82), 0.03, m=black, sides=6)
    o = disc('spare', 0.36, 0.2, 0.0, black, 10); o.rotation_euler = (R(90), 0, 0); o.location = (0, 1.56, 0.86)
# (GC 0.72, Ramzies: "animations for the mech aren't in and it looks too much like the helldivers one") THE WALKER, made
# over: not a suit with a gun for each arm but a two-legged gun carriage. An angular armoured hull with a sloped glacis and a
# vision slit, a turret on top with a pair of long autocannon, a missile box on the left flank, a sensor mast on the right,
# and legs that fold in a Z (the thigh forward to the knee, the shin back to a raised heel, a long foot forward to three toes
# and a spur). It walks: its feet are placed by hand for each frame (MECH_FRAMES) and each leg reaches them, so a foot stays
# where it is put down while the hull bobs over it. It faces -Y; about 3.3 m to the top of the mast, 2 m across the hips.
MK = {}
MK_L = (1.0, 1.1, 0.2, 0.5)     # thigh, shin, and the long foot's rise (back, up) from the toes to the heel
MK_HIP = (0.84, 0.1, 2.32)      # a hip at rest, from the ground under the middle of the hull
def mech():
    start('veh_mech'); MK.clear()
    root = joint('mk_root'); hull = joint('mk_hull', (0, 0, 2.47), root); MK['root'] = root; MK['hull'] = hull
    # the hull: a belly, an upper deck narrowing to its top, a sloped glacis with a lit slit, skirts and their markings
    box('mk_belly', (1.3, 1.7, 0.5), (0, 0.05, -0.2), m=uni_d, bevel=0.06, parent=hull)
    box('mk_upper', (1.42, 1.6, 0.55), (0, 0.12, 0.28), m=uni, bevel=0.06, taper=0.82, parent=hull)
    box('mk_glacis', (1.16, 0.66, 0.62), (0, -0.82, 0.04), m=uni, bevel=0.05, rot=(R(-38), 0, 0), parent=hull)
    box('mk_chin', (0.9, 0.4, 0.3), (0, -0.92, -0.32), m=kit, bevel=0.04, rot=(R(20), 0, 0), parent=hull)
    box('mk_slit', (0.72, 0.05, 0.075), (0, -1.06, 0.19), m=lit_b, rot=(R(-38), 0, 0), parent=hull)
    for sx in (-1, 1):
        box('mk_skirt%d' % sx, (0.08, 1.5, 0.52), (sx * 0.71, 0.05, -0.06), m=kit, bevel=0.02, parent=hull)
        box('mk_mark%d' % sx, (0.02, 0.32, 0.12), (sx * 0.755, -0.38, 0.06), m=band, parent=hull)
        box('mk_stripe%d' % sx, (0.02, 0.5, 0.05), (sx * 0.755, 0.3, 0.12), m=trim, parent=hull)
        cyl('mk_hipcase%d' % sx, (sx * 0.62, 0.1, -0.15), (sx * 1.0, 0.1, -0.15), 0.27, m=steel_d, sides=10, parent=hull)
        cyl('mk_hipcap%d' % sx, (sx * 1.0, 0.1, -0.15), (sx * 1.04, 0.1, -0.15), 0.18, m=kit, sides=10, parent=hull)
        cyl('mk_stack%d' % sx, (sx * 0.34, 0.8, 0.45), (sx * 0.34, 0.86, 0.82), 0.07, m=black, sides=9, parent=hull)
    box('mk_rear', (1.1, 0.3, 0.5), (0, 0.98, 0.05), m=uni_d, bevel=0.04, parent=hull)
    # the missile box on the left flank (six tubes, their caps showing), the sensor mast on the right
    box('mk_pod', (0.38, 0.82, 0.52), (-0.9, -0.12, 0.3), m=kit, bevel=0.03, parent=hull); box('mk_podarm', (0.2, 0.3, 0.16), (-0.72, -0.05, 0.22), m=steel_d, parent=hull)
    for i in range(6): x = -0.98 + (i % 3) * 0.08 * 1.6; z = 0.2 + (i // 3) * 0.19; cyl('mk_tube%d' % i, (x, -0.52, z), (x, -0.56, z), 0.055, m=tip, sides=9, parent=hull)
    cyl('mk_mast', (0.5, 0.45, 0.5), (0.5, 0.45, 1.0), 0.03, m=steel_d, sides=6, parent=hull); box('mk_sensor', (0.18, 0.14, 0.12), (0.5, 0.42, 1.04), m=kit, bevel=0.02, parent=hull)
    box('mk_eye', (0.1, 0.02, 0.05), (0.5, 0.34, 1.05), m=lit_r, parent=hull); cyl('mk_whip', (0.56, 0.5, 1.0), (0.6, 0.6, 1.5), 0.012, m=black, sides=3, parent=hull)
    o = disc('mk_hatch', 0.22, 0.05, 0.55, steel_d, 10, at=(-0.28, 0.42)); o.parent = hull
    # the turret: a ring, a mantlet, two long barrels on their own joint (they run back when it fires)
    tur = joint('mk_turret', (0, -0.05, 0.56), hull); MK['turret'] = tur
    cyl('mk_ring', (0, 0, -0.02), (0, 0, 0.1), 0.46, m=steel_d, sides=12, parent=tur)
    box('mk_mantlet', (0.66, 0.62, 0.34), (0, -0.12, 0.26), m=uni, bevel=0.05, taper=0.86, parent=tur)
    box('mk_tband', (0.67, 0.06, 0.08), (0, -0.44, 0.3), m=band, parent=tur)
    guns = joint('mk_guns', (0, -0.4, 0.24), tur); MK['guns'] = guns
    for sx in (-1, 1):
        cyl('mk_shroud%d' % sx, (sx * 0.13, 0, 0), (sx * 0.13, -0.45, 0), 0.085, m=kit, sides=9, parent=guns)
        cyl('mk_barrel%d' % sx, (sx * 0.13, -0.45, 0), (sx * 0.13, -1.45, 0), 0.05, m=black, sides=9, parent=guns)
        box('mk_brake%d' % sx, (0.13, 0.2, 0.13), (sx * 0.13, -1.5, 0), m=steel_d, bevel=0.015, parent=guns)
    # the legs: each a hip, a knee, a heel and a foot, every bone hanging straight down at rest (the pose folds them)
    for sx, sd in ((1, 'L'), (-1, 'R')):
        hip = joint('mk_hip.' + sd, (sx * MK_HIP[0], MK_HIP[1], MK_HIP[2] - 2.47), hull)
        box('mk_thigh' + sd, (0.28, 0.36, MK_L[0] + 0.12), (0, 0, -MK_L[0] / 2), m=uni, bevel=0.05, taper=0.85, parent=hip)
        box('mk_thighplate' + sd, (0.3, 0.06, 0.6), (0, -0.2, -0.42), m=uni_d, bevel=0.02, parent=hip)
        cyl('mk_piston' + sd, (sx * -0.17, 0.12, -0.1), (sx * -0.17, 0.12, -0.78), 0.045, m=steel, sides=9, parent=hip)
        kn = joint('mk_knee.' + sd, (0, 0, -MK_L[0]), hip)
        cyl('mk_kneecase' + sd, (-0.17, 0, 0), (0.17, 0, 0), 0.17, m=steel_d, sides=10, parent=kn)
        box('mk_shin' + sd, (0.22, 0.28, MK_L[1]), (0, 0, -MK_L[1] / 2), m=uni_d, bevel=0.04, taper=0.9, parent=kn)
        box('mk_shinplate' + sd, (0.26, 0.06, 0.7), (0, 0.16, -0.45), m=uni, bevel=0.02, parent=kn)
        an = joint('mk_heel.' + sd, (0, 0, -MK_L[1]), kn)
        cyl('mk_heelcase' + sd, (-0.13, 0, 0), (0.13, 0, 0), 0.13, m=steel_d, sides=10, parent=an)
        L3 = math.hypot(MK_L[2], MK_L[3])
        box('mk_meta' + sd, (0.16, 0.2, L3), (0, 0, -L3 / 2), m=steel_d, bevel=0.03, parent=an)
        ft = joint('mk_foot.' + sd, (0, 0, -L3), an)
        for k, dx in enumerate((-0.15, 0.0, 0.15)):
            box('mk_toe%s%d' % (sd, k), (0.11, 0.52, 0.09), (dx, -0.24, -0.06), m=kit, bevel=0.02, rot=(0, 0, dx * 0.9), parent=ft)
            spike('mk_claw%s%d' % (sd, k), (dx * 1.25, -0.48, -0.07), (dx * 1.4, -0.62, -0.1), 0.04, sides=4, m=black, parent=ft)
        box('mk_spur' + sd, (0.1, 0.3, 0.08), (0, 0.16, -0.06), m=kit, bevel=0.02, parent=ft)
        MK['hip' + sd] = hip; MK['knee' + sd] = kn; MK['heel' + sd] = an; MK['foot' + sd] = ft
    rest(root)
def mk_leg(sd, fy, fz, toe=0.0):
    """Fold one leg so its foot stands at (fy, fz): fore and aft, and up, from its hip (metres). The knee goes forward, the
    heel back, the long foot down to the toes, and the toes lie flat (toe: tipped up by that much, as a foot is lifted)."""
    ay, az = fy + MK_L[2], fz + MK_L[3]; L1, L2 = MK_L[0], MK_L[1]
    d = min(L1 + L2 - 1e-3, max(abs(L1 - L2) + 1e-3, math.hypot(ay, az)))
    tA = math.atan2(ay, -az); al = math.acos(max(-1.0, min(1.0, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))))
    t1 = tA - al; ky, kz = L1 * math.sin(t1), -L1 * math.cos(t1)
    t2 = math.atan2(ay - ky, -(az - kz)); t3 = math.atan2(fy - ay, -(fz - az))
    MK['hip' + sd].rotation_euler = (t1, 0, 0); MK['knee' + sd].rotation_euler = (t2 - t1, 0, 0)
    MK['heel' + sd].rotation_euler = (t3 - t2, 0, 0); MK['foot' + sd].rotation_euler = (-t3 - toe, 0, 0)
MK_S, MK_H, MK_Y0 = 0.6, 0.42, -0.15     # half a stride, how high a foot lifts, where a foot stands (from under its hip)
def mk_pose(ph=None, fire=False):
    zero(MK['root'])
    bob = 0.0 if ph is None else -0.05 + 0.05 * math.cos(2 * ph)
    MK['hull'].location = (0, 0, 2.47 + bob)
    if fire: MK['guns'].location = (0, -0.4 + 0.14, 0.24); MK['hull'].rotation_euler = (R(-1.5), 0, 0)
    hz = MK_HIP[2] + bob
    for sd, off in (('L', 0.0), ('R', math.pi)):
        if ph is None: mk_leg(sd, MK_Y0, 0.1 - hz); continue
        u = ((ph + off) / TAU) % 1.0
        if u < 0.5: fy = MK_Y0 + MK_S * (-1 + 4 * u); lift = 0.0; toe = 0.0
        else: q = (u - 0.5) / 0.5; fy = MK_Y0 + MK_S * (1 - 2 * q); lift = MK_H * math.sin(math.pi * q); toe = 0.35 * math.sin(math.pi * q)
        mk_leg(sd, fy, 0.1 + lift - hz, toe)
MECH_FRAMES = {'stand': (lambda: mk_pose()), 'atk': (lambda: mk_pose(fire=True))}
for i in range(8): MECH_FRAMES['w%d' % i] = (lambda i=i: mk_pose(i / 8 * TAU))
def shuttle():      # the evacuation shuttle: a white lifting body with a row of windows
    start('veh_shuttle')
    yl('body', [(-2.4, 0.1, 0.1, 0.7), (-1.7, 0.56, 0.4, 0.72), (-0.2, 0.74, 0.5, 0.74), (1.4, 0.7, 0.46, 0.76), (2.2, 0.5, 0.3, 0.82)], 8, white)
    box('glass', (0.7, 0.5, 0.22), (0, -1.72, 1.02), m=glass, bevel=0.06, rot=(R(-26), 0, 0))
    for s in (-1, 1):
        box('wing%d' % s, (1.3, 1.2, 0.09), (s * 1.2, 0.8, 0.62), m=white, bevel=0.02, rot=(0, 0, s * R(-22))); box('stripe%d' % s, (0.03, 2.8, 0.14), (s * 0.74, -0.1, 0.9), m=orange)
        for k in range(5): box('win%d%d' % (s, k), (0.03, 0.24, 0.16), (s * 0.75, -0.9 + k * 0.5, 1.02), m=glass)
        cyl('eng%d' % s, (s * 0.4, 1.9, 0.76), (s * 0.4, 2.5, 0.76), 0.22, m=steel_d, sides=8); cyl('burn%d' % s, (s * 0.4, 2.5, 0.76), (s * 0.4, 2.54, 0.76), 0.17, m=hot, sides=8)
        cyl('leg%d' % s, (s * 0.5, -0.8, 0.36), (s * 0.56, -0.8, 0), 0.05, m=steel_d, sides=5); cyl('legb%d' % s, (s * 0.5, 1.0, 0.36), (s * 0.56, 1.0, 0), 0.05, m=steel_d, sides=5)
    box('fin', (0.08, 0.9, 0.8), (0, 1.9, 1.5), m=orange, bevel=0.015, taper=0.5)
def dog():          # the guard dog: a small four-legged machine with a sensor head
    start('veh_dog')
    box('body', (0.4, 1.0, 0.3), (0, 0, 0.62), m=uni, bevel=0.06); box('head', (0.3, 0.36, 0.26), (0, -0.62, 0.74), m=uni_d, bevel=0.05); box('eye', (0.2, 0.03, 0.08), (0, -0.81, 0.76), m=lit_b); box('pack', (0.3, 0.4, 0.14), (0, 0.1, 0.84), m=kit, bevel=0.03)
    for i, (x, y) in enumerate(((0.24, -0.36), (-0.24, -0.36), (0.24, 0.4), (-0.24, 0.4))):
        cyl('up%d' % i, (x, y, 0.6), (x * 1.2, y + 0.12, 0.32), 0.06, m=steel_d, sides=5); cyl('lo%d' % i, (x * 1.2, y + 0.12, 0.32), (x * 1.2, y - 0.04, 0.0), 0.045, m=black, sides=5)
    cyl('aerial', (0.1, 0.4, 0.76), (0.12, 0.5, 1.2), 0.012, m=black, sides=3); box('band', (0.42, 0.08, 0.31), (0, 0.3, 0.62), m=band)
def uav():          # the recon drone: long thin wings, a V tail, an eye under its nose
    start('veh_uav')
    yl('fuse', [(-1.0, 0.04, 0.04, 0.3), (-0.6, 0.13, 0.12, 0.3), (0.5, 0.11, 0.1, 0.3), (1.0, 0.04, 0.04, 0.32)], 6, steel)
    box('wing', (3.6, 0.36, 0.035), (0, 0.0, 0.38), m=steel, bevel=0.01); ball('eye', (0, -0.62, 0.18), black, 0.1); ball('lens', (0, -0.7, 0.16), lit_b, 0.04)
    for s in (-1, 1): box('tail%d' % s, (0.6, 0.24, 0.03), (s * 0.24, 0.95, 0.5), m=steel_d, rot=(0, s * R(-38), 0)); ball('nav%d' % s, (s * 1.8, 0, 0.38), lit_r if s < 0 else lit_b, 0.035)
    o = disc('prop', 0.22, 0.01, 0, steel_d, 8); o.rotation_euler = (R(90), 0, 0); o.location = (0, 1.05, 0.31)

# ---------------------------------------------------------------- small things you lay down
def mine():
    start('prop_mine'); disc('body', 0.9, 0.22, 0, kit, 10, r2=0.74); disc('plate', 0.5, 0.06, 0.22, steel_d, 8); ball('lamp', (0, 0, 0.3), lit_r, 0.1)
    for i in range(3): a = i / 3 * TAU; cyl('prong%d' % i, (math.cos(a) * 0.6, math.sin(a) * 0.6, 0.2), (math.cos(a) * 0.7, math.sin(a) * 0.7, 0.42), 0.035, m=black, sides=4)
def shieldgen():    # the shield generator: a tripod, a column, a ring that hums
    start('prop_shieldgen')
    for i in range(3): a = i / 3 * TAU + 0.5; cyl('leg%d' % i, (0, 0, 0.5), (math.cos(a) * 0.9, math.sin(a) * 0.9, 0), 0.06, m=steel_d, sides=5)
    disc('col', 0.2, 1.1, 0.4, uni, 8, r2=0.14); disc('head', 0.34, 0.2, 1.5, steel_d, 10); ball('orb', (0, 0, 1.95), lit_b, 0.24, 2)
    for i in range(8): a = i / 8 * TAU; b = (i + 1) / 8 * TAU; cyl('ring%d' % i, (math.cos(a) * 0.6, math.sin(a) * 0.6, 1.9), (math.cos(b) * 0.6, math.sin(b) * 0.6, 1.9), 0.045, m=steel, sides=5)
    for i in range(4): a = i / 4 * TAU; cyl('spoke%d' % i, (math.cos(a) * 0.3, math.sin(a) * 0.3, 1.62), (math.cos(a) * 0.6, math.sin(a) * 0.6, 1.9), 0.025, m=steel_d, sides=4)

# ---------------------------------------------------------------- field works laid along a line (X from -1 to 1; width and height in metres)
def wire():         # a roll of barbed wire between crossed stakes
    start('prop_wire')
    n = 40
    for i in range(n):
        a0 = i / n * TAU * 5; a1 = (i + 1) / n * TAU * 5; x0 = -1 + 2 * i / n; x1 = -1 + 2 * (i + 1) / n
        cyl('coil%d' % i, (x0, math.cos(a0) * 0.42, 0.46 + math.sin(a0) * 0.42), (x1, math.cos(a1) * 0.42, 0.46 + math.sin(a1) * 0.42), 0.025, m=steel_d, sides=3)
    for k, x in enumerate((-0.98, 0, 0.98)):
        for s in (-1, 1): cyl('stake%d%d' % (k, s), (x, s * 0.5, 0), (x, -s * 0.5, 1.0), 0.04, m=wood_d, sides=4)
def trench():       # a fighting trench: a dug floor between two banks of sandbags
    start('prop_trench')
    box('floor', (2.0, 1.5, 0.06), (0, 0, 0.03), m=dirt)
    for s in (-1, 1):
        box('bank%d' % s, (2.0, 0.7, 0.34), (0, s * 1.05, 0.17), m=dirt, taper=0.7)
        for i in range(4):
            o = blob('bagA%d%d' % (s, i), r=0.3, scale=(0.84, 1.2, 0.6), sub=1, m=bag if i % 2 else bag_d, rough=0.12, seed=i + (5 if s > 0 else 0)); o.location = (-0.75 + i * 0.5, s * 1.0, 0.46); o.scale = (1, 1, 1)
        for i in range(3):
            o = blob('bagB%d%d' % (s, i), r=0.28, scale=(0.84, 1.2, 0.6), sub=1, m=bag_d if i % 2 else bag, rough=0.12, seed=i + 20); o.location = (-0.5 + i * 0.5, s * 1.02, 0.74)
        for x in (-0.9, 0, 0.9): box('plank%d%d' % (s, int(x * 10)), (0.06, 0.06, 0.5), (x, s * 0.72, 0.28), m=wood_d)
def cover0():       # a sandbag wall
    start('prop_cover0')
    for i in range(5):
        o = blob('a%d' % i, r=0.34, scale=(0.62, 1.15, 0.62), sub=1, m=bag if i % 2 else bag_d, rough=0.12, seed=i); o.location = (-0.8 + i * 0.4, 0, 0.2)
    for i in range(4):
        o = blob('b%d' % i, r=0.33, scale=(0.62, 1.1, 0.62), sub=1, m=bag_d if i % 2 else bag, rough=0.12, seed=i + 9); o.location = (-0.6 + i * 0.4, 0, 0.5)
    for i in range(3):
        o = blob('c%d' % i, r=0.31, scale=(0.62, 1.0, 0.6), sub=1, m=bag if i % 2 else bag_d, rough=0.12, seed=i + 15); o.location = (-0.4 + i * 0.4, 0, 0.78)
def cover1():       # a wooden barricade: planks on crossed posts
    start('prop_cover1')
    for z in (0.35, 0.75, 1.15): box('plank%d' % int(z * 100), (2.0, 0.1, 0.26), (0, 0, z), m=wood, bevel=0.01)
    for x in (-0.85, 0, 0.85):
        box('post%d' % int(x * 10), (0.07, 0.2, 1.5), (x, 0.12, 0.75), m=wood_d); cyl('prop%d' % int(x * 10), (x, 0.2, 1.0), (x, 1.0, 0), 0.05, m=wood_d, sides=4)
    cyl('brace', (-0.85, -0.07, 0.3), (0.85, -0.07, 1.2), 0.04, m=wood_d, sides=4)
def cover2():       # a concrete barrier: wide at the foot, three sections
    start('prop_cover2')
    for i in range(3):
        x = -0.667 + i * 0.667
        box('seg%d' % i, (0.63, 1.1, 0.5), (x, 0, 0.25), m=conc, bevel=0.04, taper=0.5); box('top%d' % i, (0.63, 0.45, 1.0), (x, 0, 1.0), m=conc_l, bevel=0.04, taper=0.8)
    box('stripe', (2.0, 0.47, 0.12), (0, 0, 1.2), m=hazard)
def lz():           # a landing zone: a light at each corner, arrows pointing in
    start('prop_lz')
    for i in range(4):
        a = i / 4 * TAU + math.pi / 4; x, y = math.cos(a) * 0.96, math.sin(a) * 0.96
        disc('foot%d' % i, 0.07, 0.03, 0, steel_d, 6, at=(x, y)); cyl('post%d' % i, (x, y, 0), (x, y, 0.22), 0.02, m=steel_d, sides=4); ball('light%d' % i, (x, y, 0.25), lit_b, 0.045)
        box('arrow%d' % i, (0.3, 0.07, 0.012), (math.cos(a) * 0.7, math.sin(a) * 0.7, 0.012), m=hazard, rot=(0, 0, a), taper=1.0)
    box('h1', (0.05, 0.36, 0.012), (-0.12, 0, 0.012), m=white); box('h2', (0.05, 0.36, 0.012), (0.12, 0, 0.012), m=white); box('h3', (0.24, 0.05, 0.012), (0, 0, 0.012), m=white)
def bridge():       # the light bridge: a deck of hard light between four emitter posts. Width one (the game widens it to carry vehicles)
    start('prop_bridge')
    light = mat('v_light', '#8fdcff', emit=2.0); light_e = mat('v_light_e', '#e8fbff', emit=2.0); light_d = mat('v_light_d', '#4aa6d8', emit=1.0)
    box('deck', (2.0, 0.92, 0.06), (0, 0, 0.1), m=light)
    for i in range(9): box('rib%d' % i, (0.012, 0.92, 0.065), (-1 + i * 0.25, 0, 0.1), m=light_d)
    for s in (-1, 1):
        box('edge%d' % s, (2.0, 0.04, 0.12), (0, s * 0.48, 0.12), m=light_e); box('rail%d' % s, (2.0, 0.012, 0.03), (0, s * 0.49, 0.75), m=light_d)
        for e in (-1, 1):
            box('post%d%d' % (s, e), (0.02, 0.07, 1.25), (e * 0.99, s * 0.5, 0.6), m=steel_d, bevel=0.004); box('cap%d%d' % (s, e), (0.024, 0.09, 0.1), (e * 0.99, s * 0.5, 1.26), m=light_e)
            box('foot%d%d' % (s, e), (0.03, 0.14, 0.1), (e * 0.985, s * 0.5, 0.05), m=steel)
def worksite():     # a work site: scaffolding, stores and a mast, where something is being built
    start('prop_worksite')
    disc('pad', 0.98, 0.04, 0, conc, 10)
    for sx in (-1, 1):
        for sy in (-1, 1): cyl('pole%d%d' % (sx, sy), (sx * 0.5, sy * 0.4, 0), (sx * 0.5, sy * 0.4, 1.5), 0.03, m=steel_d, sides=4)
    for z in (0.5, 1.0, 1.5): box('lvl%d' % int(z * 10), (1.1, 0.9, 0.04), (0, 0, z), m=wood, bevel=0.005)
    for s in (-1, 1): cyl('x%d' % s, (-0.5, s * 0.4, 0.04), (0.5, s * 0.4, 1.0), 0.02, m=steel_d, sides=3)
    box('crate1', (0.34, 0.26, 0.24), (0.7, -0.4, 0.16), m=uni, bevel=0.015, rot=(0, 0, R(20))); box('crate2', (0.3, 0.3, 0.2), (-0.72, 0.4, 0.14), m=wood, bevel=0.015, rot=(0, 0, R(-15)))
    disc('drum', 0.11, 0.3, 0.04, uni_d, 8, at=(0.66, 0.5)); cyl('mast', (-0.6, -0.5, 0), (-0.6, -0.5, 2.0), 0.025, m=steel_d, sides=4); ball('lamp', (-0.6, -0.5, 2.04), hazard, 0.07); box('sign', (0.4, 0.03, 0.26), (0, -0.46, 1.14), m=hazard)

OUT = {}
ALL = (dropship, striker, lrv, mech, shuttle, dog, uav, mine, shieldgen, trench, cover0, cover1, cover2, lz, bridge, worksite)     # (GC 0.64: the wire is fleet.py's)
for fn in ALL:
    fn(); bpy.context.view_layer.update()
    OUT[MADE[-1]] = export(MADE[-1], CUR, MECH_FRAMES if MADE[-1] == 'veh_mech' else {'stand': (lambda: None)}, lod=0)     # (GC 0.72: the walker walks)
for i, name in enumerate(MADE):
    for o in bpy.data.collections[name].objects:
        if o.parent is None: o.location = Vector(o.location) + Vector(((i % 5) * 5.4, -(i // 5) * 5.6, 0))
PIC = shot('vehicles', dist=46, target=(10.5, -8.6, 1.0), res=(1700, 1250), az=18, el=40)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'vehicles.blend'))
