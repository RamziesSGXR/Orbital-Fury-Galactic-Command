
# THE FLEET'S OWN PEOPLE: the soldier (the infantry), the Vanguard (the squad), three citizens, and the crew of the base and the
# station (an engineer, an inspector, a medic, a pilot, a deck hand). Run in Blender after gc_kit.py.
# Every one of them has the same frames to stand, walk, run, salute, drink, mourn, work and lie down, so the ground, the base and the station draw one person.
# Materials named uniform, uniform_dark, kit, helmet, armband and trim are dressed in the player's fleet colours by the game.
import math
wipe()
uni = mat('uniform', '#5d6a4a'); unid = mat('uniform_dark', '#49543a'); kit = mat('kit', '#3a422e'); helm = mat('helmet', '#4c5a3c'); band = mat('armband', '#e0b21c'); trim = mat('trim', '#2f8f9c')
boots = mat('c_boots', '#26262a'); gunm = mat('c_gun', '#1c1e20', metal=0.5, rough=0.45); wood = mat('c_wood', '#5a4630'); visor = mat('c_visor', '#12181c', metal=0.4, rough=0.25)
plate = mat('c_plate', '#3a4048', metal=0.45, rough=0.45); plated = mat('c_plate_dark', '#262b31', metal=0.4); lamp = mat('c_lamp', '#59e0ff', emit=2.5); strap = mat('c_strap', '#2e2a22'); eyem = mat('c_eye', '#1c1a1a')
SKIN = [mat('c_skin_a', '#c99670'), mat('c_skin_b', '#8d5a3c'), mat('c_skin_c', '#f0c8a4'), mat('c_skin_d', '#b97f58'), mat('c_skin_e', '#e0b48c')]
HAIR = [mat('c_hair_a', '#3a2a1c'), mat('c_hair_b', '#17120e'), mat('c_hair_c', '#b98a4a')]
# the citizens: colonists of a company fleet. A technician in a pale suit and headset, a dock hand in a harness and rebreather, a company officer in a long coat with a lit hem.
CLOTH = {'a': (mat('c_suit_a', '#d5dade'), mat('c_suit_a_legs', '#4a5562')), 'b': (mat('c_suit_b', '#56606b'), mat('c_suit_b_legs', '#3a424c')), 'c': (mat('c_coat_c', '#27324a'), mat('c_coat_c_legs', '#1c2334')),
         'e': (mat('c_suit_e', '#7a6a3c'), mat('c_suit_e_legs', '#5a4a1e')), 'i': (mat('c_coat_i', '#2a2c33'), mat('c_coat_i_legs', '#17181c')), 'm': (mat('c_suit_m', '#f2f4ee'), mat('c_suit_m_legs', '#d8dcd6')),
         'p': (mat('c_suit_p', '#6b737e'), mat('c_suit_p_legs', '#5d646e')), 'w': (mat('c_suit_w', '#c7652a'), mat('c_suit_w_legs', '#3a424c'))}
hardhat = mat('c_hardhat', '#f0c020'); capm = mat('c_cap', '#1c1e24'); HAIRX = {'e': 0, 'i': 1, 'm': 2, 'p': 0, 'w': 1}
SLATE = ('cc_', 'in_')     # who carries a slate in the right hand
hivis = mat('c_hivis', '#e8a22a'); glow = mat('c_glow', '#7af6ff', emit=2.5); amberl = mat('c_amber', '#ffb040', emit=2.0); shellm = mat('c_shell', '#8a939c', metal=0.3, rough=0.5); sole = mat('c_sole', '#c8ced2'); lining = mat('c_lining', '#c9d2dc')
OUT = {}; L1, L2 = 0.29, 0.27; GRIP = (0, 0.0, -0.05); GUARD = (0, -0.2, -0.03)

# (GC 0.75, Ramzies: "their shoes look like lego blocks") A SHOE THAT FOLLOWS THE FOOT. The upper rises from a rounded heel over a
# high instep to a toe box that drops and rounds off; the sole under it follows the same outline a few millimetres proud of it
# (narrow at the heel, wide at the ball, round at the toe), its edge rounded. Before, a flat block of sole twice the width of
# the heel and toe stuck out under a tube. k: the build; boot: a soldier's boot (a deeper sole, a heel block, a toe cap).
def shoe(name, parent, k, m, m_sole, boot=False):
    w = 1.06 if boot else 1.0
    up = [(0.078, 0.03, 0.026, -0.466), (0.064, 0.047, 0.043, -0.454), (0.02, 0.052, 0.047, -0.452), (-0.05, 0.054, 0.04, -0.458), (-0.115, 0.051, 0.029, -0.471),
          (-0.165, 0.042, 0.021, -0.479), (-0.196, 0.028, 0.015, -0.484), (-0.212, 0.012, 0.008, -0.488)]
    loft(PRE + name, [((0, y, z), rx * k * w, rz * (1.04 if boot else 1.0)) for y, rx, rz, z in up], sides=10, m=m, parent=parent)
    t = 0.016 if boot else 0.011; zs = -0.5 + (0.004 if boot else 0.0)
    so = [(0.084, 0.026), (0.07, 0.046), (0.03, 0.048), (-0.02, 0.05), (-0.08, 0.059), (-0.14, 0.057), (-0.185, 0.044), (-0.208, 0.026), (-0.222, 0.01)]
    loft(PRE + name.replace('foot', 'sole'), [((0, y, zs), rx * k * w * 1.04, t) for y, rx in so], sides=10, m=m_sole, parent=parent)
    if boot:
        loft(PRE + name.replace('foot', 'heel'), [((0, 0.09, zs - 0.004), 0.03 * k, 0.014), ((0, 0.04, zs - 0.006), 0.048 * k, 0.016), ((0, 0.0, zs - 0.004), 0.046 * k, 0.012)], sides=9, m=m_sole, parent=parent)
        loft(PRE + name.replace('foot', 'toecap'), [((0, -0.15, -0.474), 0.045 * k * w, 0.028), ((0, -0.19, -0.481), 0.031 * k * w, 0.02), ((0, -0.213, -0.486), 0.013 * k, 0.01)], sides=9, m=m_sole if boot == 'cap' else m, parent=parent)

# (GC 0.69, Ramzies: "our characters have such a cartoonish look") THE SOLDIER AND THE VANGUARD, MADE OVER. The same joints, the same
# lengths and the same poses as before, so every frame the game asks for still comes out; what hangs on the joints is new.
# A grown man's build (about seven and a half heads tall): a small head in a close helmet, the face behind a dark visor and a
# respirator (no painted-on eyes), shoulders wider than the waist, limbs that taper, real boots. The soldier wears fatigues under a
# plate carrier with pouches and an assault pack; the Vanguard is a heavy trooper in plates over a dark suit, with a sealed helmet.
# The fleet's colour is the fatigues and the helmet; its armband and trim are small (a band on the arm, a stripe, an edge).
glove = mat('c_glove', '#2a2b28'); tread = mat('c_tread', '#18191a'); poly = mat('c_poly', '#6a6250'); maskm = mat('c_mask', '#43484c', rough=0.6)
visorv = mat('c_visor_v', '#16262c', emit=0.35, metal=0.4, rough=0.2); lampd = mat('c_lamp_dim', '#9fe8ff', emit=1.2)
def trooper(van):
    def bx(n, size, loc, bevel=0.0, **kw):     # (a small part's edges are not cut: at the size it is seen it looks the same, in a third of the corners)
        return box(n, size, loc, bevel=0.0 if (max(size) < 0.1 or min(size) < 0.03) else bevel, **kw)
    k = 1.06 if van else 1.0; top, legs = (plated, plated) if van else (uni, unid); skin_none = None
    gear = plate if van else kit
    root = joint('root'); pel = joint('pelvis', (0, 0, 1.0), root)
    # hips and belt
    loft(PRE + 'hips', [((0, 0, 0.085), 0.152 * k, 0.106 * k), ((0, 0, -0.03), 0.166 * k, 0.116 * k), ((0, 0, -0.11), 0.142 * k, 0.104 * k)], sides=10, m=legs, parent=pel)
    loft(PRE + 'belt', [((0, 0, 0.07), 0.162 * k, 0.114 * k), ((0, 0, 0.115), 0.16 * k, 0.112 * k)], sides=10, m=gear if van else kit, parent=pel, cap=False)
    if van:
        bx(PRE + 'codplate', (0.13, 0.035, 0.12), (0, -0.118, -0.03), m=plate, parent=pel, bevel=0.015, taper=1.25)
        bx(PRE + 'beltunit', (0.12, 0.06, 0.08), (0, 0.125, 0.07), m=plated, parent=pel, bevel=0.015)
    else:
        bx(PRE + 'dump', (0.12, 0.055, 0.1), (0, 0.13, 0.03), m=kit, parent=pel, bevel=0.018)
        for x in (-0.155, 0.155): bx(PRE + 'beltpouch', (0.055, 0.05, 0.08), (x, -0.045, 0.06), m=kit, parent=pel, bevel=0.012)
    # legs: a thigh that tapers to the knee, a shin with a calf, a boot with a toe and a sole
    h = joint('hip.L', (0.093 * k, 0, -0.07), pel)
    loft(PRE + 'thigh.L', [((0, 0, 0.03), 0.095 * k, 0.1 * k), ((0, -0.008, -0.14), 0.09 * k, 0.096 * k), ((0, 0, -0.3), 0.07 * k, 0.076 * k), ((0, 0.004, -0.42), 0.058 * k, 0.062 * k)], sides=9, m=legs, parent=h)
    kn = joint('knee.L', (0, 0, -0.42), h)
    loft(PRE + 'shin.L', [((0, 0, 0.01), 0.058 * k, 0.062 * k), ((0, 0.012, -0.1), 0.062 * k, 0.07 * k), ((0, 0.006, -0.22), 0.053 * k, 0.058 * k), ((0, 0, -0.3), 0.048 * k, 0.052 * k)], sides=9, m=legs, parent=kn)
    loft(PRE + 'bootup.L', [((0, 0.002, -0.27), 0.053 * k, 0.058 * k), ((0, 0.004, -0.36), 0.056 * k, 0.062 * k), ((0, 0.006, -0.44), 0.058 * k, 0.064 * k)], sides=9, m=plated if van else boots, parent=kn, cap=False)
    shoe('foot.L', kn, k, plated if van else boots, tread, boot=True)     # (GC 0.75: a boot that follows the foot)
    if van:
        bx(PRE + 'cuisse.L', (0.15, 0.05, 0.24), (0, -0.088, -0.19), m=plate, parent=h, bevel=0.02, taper=0.86)
        bx(PRE + 'tasset.L', (0.13, 0.03, 0.13), (0.02, -0.1, 0.0), m=plate, parent=h, bevel=0.012, taper=1.15)
        bx(PRE + 'kneecop.L', (0.105, 0.06, 0.12), (0, -0.062, 0.0), m=plate, parent=kn, bevel=0.024)
        bx(PRE + 'greave.L', (0.1, 0.05, 0.22), (0, -0.058, -0.16), m=plate, parent=kn, bevel=0.02, taper=0.9)
    else:
        bx(PRE + 'cargo.L', (0.035, 0.11, 0.13), (0.084, 0.0, -0.2), m=legs, parent=h, bevel=0.012)
        bx(PRE + 'kneepad.L', (0.096, 0.05, 0.115), (0, -0.054, -0.005), m=kit, parent=kn, bevel=0.02)
    mirror_x(h)
    if not van:     # a pistol on the right thigh: one side unlike the other, as kit is worn
        bx(PRE + 'holster', (0.045, 0.1, 0.15), (-0.1, -0.01, -0.16), m=kit, parent=J('hip.R'), bevel=0.012)
        bx(PRE + 'pistol', (0.03, 0.04, 0.07), (-0.1, 0.01, -0.07), m=gunm, parent=J('hip.R'), bevel=0.006)
    # the body: chest wider than the waist, the shoulders sloping to the neck
    tor = joint('torso', (0, 0, 0.1), pel)
    loft(PRE + 'trunk', [((0, 0, -0.03), 0.148 * k, 0.102 * k), ((0, 0, 0.1), 0.15 * k, 0.1 * k), ((0, -0.004, 0.25), 0.178 * k, 0.112 * k), ((0, -0.004, 0.36), 0.19 * k, 0.112 * k),
                         ((0, 0.008, 0.425), 0.17 * k, 0.098 * k), ((0, 0.012, 0.465), 0.132 * k, 0.086), ((0, 0.012, 0.5), 0.08, 0.066), ((0, 0.012, 0.53), 0.058, 0.055)], sides=10, m=top, parent=tor)
    if van:
        loft(PRE + 'chestplate', [((0, -0.006, 0.19), 0.196 * k, 0.128 * k), ((0, -0.01, 0.33), 0.212 * k, 0.136 * k), ((0, 0.0, 0.43), 0.186 * k, 0.118 * k)], sides=10, m=plate, parent=tor, cap=False)
        for i, (z0, z1) in enumerate(((0.02, 0.085), (0.095, 0.165))): loft(PRE + 'abplate%d' % i, [((0, -0.004, z0), 0.164 * k, 0.114 * k), ((0, -0.006, z1), 0.17 * k, 0.118 * k)], sides=10, m=plate, parent=tor, cap=False)
        loft(PRE + 'gorget', [((0, 0.006, 0.415), 0.15, 0.112), ((0, 0.01, 0.48), 0.118, 0.096), ((0, 0.01, 0.535), 0.09, 0.084)], sides=10, m=plated, parent=tor, cap=False)
        bx(PRE + 'chestflash', (0.045, 0.02, 0.11), (0.075, -0.152, 0.33), m=trim, parent=tor, bevel=0.006)
        bx(PRE + 'backunit', (0.28, 0.15, 0.33), (0, 0.205, 0.27), m=plated, parent=tor, bevel=0.04)
        for x in (-0.085, 0.085): bx(PRE + 'vent', (0.07, 0.03, 0.16), (x, 0.285, 0.26), m=plate, parent=tor, bevel=0.01)
        bx(PRE + 'strobe', (0.045, 0.02, 0.03), (0, 0.285, 0.41), m=lampd, parent=tor)
        cyl(PRE + 'aerial', (0.11, 0.25, 0.42), (0.125, 0.27, 0.8), 0.006, m=gunm, parent=tor, sides=4)
    else:
        loft(PRE + 'cummerbund', [((0, 0, 0.13), 0.168, 0.118), ((0, 0, 0.25), 0.18, 0.122)], sides=10, m=kit, parent=tor, cap=False)
        bx(PRE + 'frontplate', (0.25, 0.045, 0.27), (0, -0.118, 0.29), m=kit, parent=tor, bevel=0.018, taper=0.92)
        bx(PRE + 'backplate', (0.26, 0.045, 0.29), (0, 0.11, 0.29), m=kit, parent=tor, bevel=0.018, taper=0.92)
        for x in (-0.095, 0.095): bx(PRE + 'strap', (0.055, 0.23, 0.025), (x, 0.0, 0.448), m=kit, parent=tor, bevel=0.006)
        for i in range(3): bx(PRE + 'mag%d' % i, (0.062, 0.045, 0.095), ((i - 1) * 0.07, -0.158, 0.215), m=kit, parent=tor, bevel=0.01)
        bx(PRE + 'admin', (0.15, 0.03, 0.07), (0, -0.148, 0.37), m=unid, parent=tor, bevel=0.008)
        bx(PRE + 'radio', (0.05, 0.07, 0.12), (0.18, 0.03, 0.25), m=kit, parent=tor, bevel=0.01)
        bx(PRE + 'pack', (0.26, 0.13, 0.3), (0, 0.2, 0.25), m=kit, parent=tor, bevel=0.035)
        bx(PRE + 'packlid', (0.24, 0.12, 0.06), (0, 0.205, 0.415), m=unid, parent=tor, bevel=0.02)
        for x in (-0.15, 0.15): bx(PRE + 'packside', (0.05, 0.1, 0.18), (x, 0.2, 0.22), m=kit, parent=tor, bevel=0.015)
    # the head: small, in a close helmet; the face behind a dark visor and a respirator
    head = joint('head', (0, 0, 0.52), tor)
    hg = joint('headgear', (0, 0, -0.028), head)     # (the head sits a little lower on the neck than the joint the poses turn)
    cyl(PRE + 'neck', (0, 0.005, -0.03), (0, 0.005, 0.08), 0.056, m=plated if van else unid, parent=hg, sides=10)
    if not van: loft(PRE + 'gaiter', [((0, 0.006, -0.05), 0.074, 0.072), ((0, 0.006, 0.02), 0.068, 0.068), ((0, 0.006, 0.07), 0.062, 0.064)], sides=10, m=unid, parent=hg, cap=False)     # a neck gaiter
    blob(PRE + 'skull', 0.1, (0.9, 1.02, 1.12), (0, 0.006, 0.145), sub=1, m=plated if van else unid, parent=hg)
    if van:
        dome(PRE + 'helmet', (0, 0.006, 0.0), (0.124, 0.136), top=0.3, eq=0.17, rim=lambda a: 0.05 + 0.03 * max(0.0, math.sin(a)), rings=3, segs=14, flare=1.02, m=plate, parent=hg)
        shell(PRE + 'visor', (0, 0.006), (0.127, 0.139), (0.13, 0.142), z=(0.135, 0.185), arc=(-math.pi / 2 - 0.95, -math.pi / 2 + 0.95), segs=8, t=0.01, m=visorv, parent=hg)
        shell(PRE + 'jaw', (0, 0.006), (0.128, 0.14), (0.128, 0.14), z=(0.05, 0.12), arc=(-math.pi / 2 - 0.8, -math.pi / 2 + 0.8), segs=8, t=0.014, m=plated, parent=hg)
        for sx in (1, -1): bx(PRE + 'comm', (0.03, 0.07, 0.06), (sx * 0.13, 0.01, 0.14), m=plated, parent=hg, bevel=0.01)
        loft(PRE + 'crest', [((0, 0.006 + 0.142 * math.sin(t), 0.17 + 0.134 * math.cos(t)), 0.014, 0.006) for t in [math.radians(d) for d in (-62, -40, -15, 10, 35, 60, 78)]], sides=6, m=trim, parent=hg)     # a stripe over the crown in the team's colour
        bx(PRE + 'helmlamp', (0.022, 0.03, 0.02), (0.125, -0.05, 0.2), m=lampd, parent=hg)
    else:
        dome(PRE + 'helmet', (0, 0.008, 0.0), (0.117, 0.131), top=0.282, eq=0.2, rim=lambda a: 0.095 + 0.1 * max(0.0, -math.sin(a)) ** 2 + 0.03 * max(0.0, abs(math.cos(a)) - 0.75) * 4, rings=3, segs=14, flare=1.03, m=helm, parent=hg)
        shell(PRE + 'visor', (0, 0.006), (0.099, 0.11), (0.104, 0.115), z=(0.128, 0.19), arc=(-math.pi / 2 - 0.95, -math.pi / 2 + 0.95), segs=8, t=0.008, m=visor, parent=hg)
        shell(PRE + 'mask', (0, 0.006), (0.092, 0.104), (0.097, 0.108), z=(0.058, 0.122), arc=(-math.pi / 2 - 0.75, -math.pi / 2 + 0.75), segs=8, t=0.012, m=maskm, parent=hg)
        cyl(PRE + 'filter', (0, -0.11, 0.09), (0, -0.14, 0.082), 0.024, m=maskm, parent=hg, sides=8)
        for sx in (1, -1):
            blob(PRE + 'earpro', 0.036, (0.6, 1.0, 1.15), (sx * 0.1, 0.012, 0.145), sub=1, m=kit, parent=hg)
            bx(PRE + 'rail', (0.012, 0.09, 0.016), (sx * 0.114, 0.01, 0.178), m=gunm, parent=hg)
        bx(PRE + 'nvgmount', (0.042, 0.025, 0.034), (0, -0.125, 0.212), m=gunm, parent=hg, bevel=0.006)
    # arms: a shoulder, an arm that tapers, a sleeve, a glove
    sho = joint('sho.L', (0.2 * k, 0, 0.43), tor)
    blob(PRE + 'deltoid.L', 0.062 * k, (0.92, 1.04, 1.0), (0.002, 0, -0.026), sub=2, m=top, parent=sho)
    loft(PRE + 'upper.L', [((0, 0, -0.032), 0.059 * k, 0.061 * k), ((0, 0, -0.12), 0.055 * k, 0.058 * k), ((0, 0, -0.26), 0.044 * k, 0.046 * k), ((0, 0, -0.3), 0.042 * k, 0.044 * k)], sides=9, m=top, parent=sho)
    elb = joint('elbow.L', (0, 0, -L1), sho)
    loft(PRE + 'fore.L', [((0, 0, 0), 0.045 * k, 0.047 * k), ((0, -0.004, -0.07), 0.048 * k, 0.05 * k), ((0, 0, -0.2), 0.035 * k, 0.036 * k), ((0, 0, -0.235), 0.033 * k, 0.034 * k)], sides=9, m=top, parent=elb)
    loft(PRE + 'cuff.L', [((0, 0, -0.19), 0.038 * k, 0.039 * k), ((0, 0, -0.245), 0.036 * k, 0.037 * k)], sides=9, m=glove, parent=elb, cap=False)
    blob(PRE + 'hand.L', 0.04, (0.75, 1.0, 1.25), (0, -0.005, -L2 - 0.005), sub=1, m=plated if van else glove, parent=elb)
    if van:
        dome(PRE + 'pauldron.L', (0.02, 0, 0.0), (0.088, 0.104), top=0.07, eq=0.0, rim=lambda a: -0.07 + 0.03 * max(0.0, -math.cos(a)), rings=3, segs=12, flare=1.05, m=plate, parent=sho)
        bx(PRE + 'pauldmark.L', (0.05, 0.07, 0.012), (0.055, 0, 0.06), m=trim, parent=sho, rot=(0, 0.55, 0))
        loft(PRE + 'rerebrace.L', [((0, 0, -0.07), 0.066, 0.068), ((0, 0, -0.21), 0.058, 0.06)], sides=9, m=plate, parent=sho, cap=False)
        loft(PRE + 'vambrace.L', [((0, -0.004, -0.03), 0.056, 0.058), ((0, 0, -0.19), 0.045, 0.047)], sides=9, m=plate, parent=elb, cap=False)
    else:
        loft(PRE + 'band.L', [((0, 0, -0.09), 0.058, 0.06), ((0, 0, -0.125), 0.056, 0.058)], sides=9, m=band, parent=sho, cap=False)
        bx(PRE + 'elbowpad.L', (0.07, 0.05, 0.075), (0, 0.04, 0.0), m=kit, parent=elb, bevel=0.016)
    mirror_x(sho)
    # the rifle: a carbine with a rail, an optic and a polymer stock (the Vanguard's is heavier, with a launcher under it)
    g = joint('gun', (-0.1, -0.2, 0.2), tor); w = 1.15 if van else 1.0
    bx(PRE + 'receiver', (0.05 * w, 0.24, 0.075 * w), (0, -0.06, 0.0), m=gunm, parent=g, bevel=0.008)
    bx(PRE + 'toprail', (0.03, 0.3, 0.012), (0, -0.1, 0.045 * w), m=gunm, parent=g)
    bx(PRE + 'optic', (0.032, 0.07, 0.04), (0, -0.05, 0.075 * w), m=gunm, parent=g, bevel=0.008)
    bx(PRE + 'handguard', (0.052 * w, 0.22, 0.06 * w), (0, -0.27, 0.005), m=gunm if van else poly, parent=g, bevel=0.012)
    cyl(PRE + 'barrel', (0, -0.38, 0.01), (0, -0.5, 0.01), 0.011 * w, m=gunm, parent=g, sides=6)
    cyl(PRE + 'muzzle', (0, -0.5, 0.01), (0, -0.545, 0.01), 0.016 * w, m=gunm, parent=g, sides=8)
    bx(PRE + 'magazine', (0.032, 0.06, 0.15), (0, -0.1, -0.09), m=gunm if van else poly, parent=g, bevel=0.008, rot=(0.25, 0, 0))
    bx(PRE + 'gripp', (0.032, 0.042, 0.085), (0, 0.025, -0.065), m=gunm, parent=g, rot=(-0.3, 0, 0))
    cyl(PRE + 'buffer', (0, 0.06, 0.0), (0, 0.2, -0.005), 0.016, m=gunm, parent=g, sides=8)
    bx(PRE + 'stock', (0.04, 0.1, 0.075), (0, 0.2, -0.02), m=gunm if van else poly, parent=g, bevel=0.012)
    bx(PRE + 'foregrip', (0.025, 0.03, 0.06), (0, -0.3, -0.05), m=gunm, parent=g)
    if van:
        cyl(PRE + 'launcher', (0, -0.2, -0.055), (0, -0.44, -0.055), 0.026, m=gunm, parent=g, sides=8)
        bx(PRE + 'gunlamp', (0.02, 0.03, 0.02), (0.035, -0.38, 0.02), m=lampd, parent=g)
    rest(root); return root

# (GC 0.70) THE REST OF THE CAST, MADE OVER the same way: the same body as the troopers (a grown build, tapered limbs, real shoes),
# a real face (a chin, a nose, ears and brows; no painted-on box eyes), hair that follows the skull with a hairline, and the
# lit trims cut back to a light or two. Each keeps what tells them apart: the technician's headset, the dock hand's hi-vis
# harness and rebreather, the officer's long coat, the engineer's hard hat and tool belt, the inspector's cap and slate, the
# medic's bag, the pilot's flight helmet, the deck hand's ear defenders.
glowd = mat('c_glow_d', '#8fd6dc', emit=0.8); brow = mat('c_brow', '#2a2018'); eyed = mat('c_eye_d', '#241c18'); lips = mat('c_lips', '#9a6450')
def civilian(cz):
    def bx(n, size, loc, bevel=0.0, **kw): return box(n, size, loc, bevel=0.0 if (max(size) < 0.1 or min(size) < 0.03) else bevel, **kw)
    top, legs = CLOTH[cz]; skin = SKIN[{'a': 4, 'b': 1, 'c': 2, 'e': 4, 'i': 2, 'm': 3, 'p': 4, 'w': 1}[cz]]
    hair = HAIR[{'a': 0, 'b': 1, 'c': 2}.get(cz, HAIRX.get(cz, 0))]
    work = cz in 'bepw'; k = {'c': 0.94, 'b': 0.96, 'm': 0.97}.get(cz, 1.0)     # (the officer, the dock hand and the medic a little slighter)
    hand_m = boots if work else skin; shoe_m = boots if work else capm
    root = joint('root'); pel = joint('pelvis', (0, 0, 1.0), root)
    loft(PRE + 'hips', [((0, 0, 0.085), 0.15 * k, 0.104 * k), ((0, 0, -0.03), 0.164 * k, 0.114 * k), ((0, 0, -0.11), 0.14 * k, 0.102 * k)], sides=10, m=legs, parent=pel)
    loft(PRE + 'belt', [((0, 0, 0.07), 0.155 * k, 0.108 * k), ((0, 0, 0.1), 0.153 * k, 0.106 * k)], sides=10, m=strap, parent=pel, cap=False)
    h = joint('hip.L', (0.09 * k, 0, -0.07), pel)
    loft(PRE + 'thigh.L', [((0, 0, 0.03), 0.09 * k, 0.096 * k), ((0, -0.008, -0.14), 0.085 * k, 0.09 * k), ((0, 0, -0.3), 0.066 * k, 0.072 * k), ((0, 0.004, -0.42), 0.055 * k, 0.059 * k)], sides=9, m=legs, parent=h)
    kn = joint('knee.L', (0, 0, -0.42), h)
    loft(PRE + 'shin.L', [((0, 0, 0.01), 0.055 * k, 0.059 * k), ((0, 0.012, -0.1), 0.059 * k, 0.066 * k), ((0, 0.006, -0.22), 0.05 * k, 0.055 * k), ((0, 0, -0.34), 0.044 * k, 0.048 * k), ((0, 0.004, -0.44), 0.042 * k, 0.046 * k)], sides=9, m=legs, parent=kn)
    if work: loft(PRE + 'bootup.L', [((0, 0.002, -0.3), 0.051 * k, 0.056 * k), ((0, 0.006, -0.44), 0.056 * k, 0.062 * k)], sides=9, m=boots, parent=kn, cap=False)
    shoe('foot.L', kn, k, shoe_m, tread, boot=work)     # (GC 0.75: a shoe that follows the foot)
    if cz == 'a': bx(PRE + 'legpanel.L', (0.03, 0.1, 0.14), (0.08, 0, -0.2), m=shellm, parent=h)
    if cz == 'p': bx(PRE + 'legpocket.L', (0.04, 0.12, 0.15), (0.085, 0, -0.22), m=legs, parent=h, bevel=0.012)
    if cz == 'e': bx(PRE + 'kneepad.L', (0.09, 0.045, 0.1), (0, -0.052, -0.005), m=strap, parent=kn)
    mirror_x(h)
    tor = joint('torso', (0, 0, 0.1), pel)
    loft(PRE + 'trunk', [((0, 0, -0.03), 0.146 * k, 0.1 * k), ((0, 0, 0.1), 0.146 * k, 0.098 * k), ((0, -0.004, 0.25), 0.172 * k, 0.108 * k), ((0, -0.004, 0.36), 0.184 * k, 0.108 * k),
                         ((0, 0.008, 0.425), 0.165 * k, 0.095 * k), ((0, 0.012, 0.465), 0.128 * k, 0.084), ((0, 0.012, 0.5), 0.078, 0.064), ((0, 0.012, 0.53), 0.056, 0.053)], sides=10, m=top, parent=tor)
    # what each wears
    if cz == 'a':     # the technician: a coverall with a yoke in the company's colour, a chest panel with one small readout
        loft(PRE + 'yoke', [((0, -0.002, 0.34), 0.188 * k, 0.112 * k), ((0, 0.006, 0.43), 0.168 * k, 0.098 * k)], sides=10, m=trim, parent=tor, cap=False)
        bx(PRE + 'panel', (0.1, 0.018, 0.12), (-0.05, -0.112, 0.22), m=shellm, parent=tor); bx(PRE + 'readout', (0.05, 0.008, 0.02), (-0.05, -0.122, 0.25), m=glowd, parent=tor)
        bx(PRE + 'toolpack', (0.06, 0.12, 0.14), (-0.13, 0.0, -0.13), m=shellm, parent=pel, bevel=0.015)
    if cz == 'b':     # the dock hand: a hi-vis harness, a rebreather on the back, a mask hanging at the throat
        for sx in (1, -1):
            bx(PRE + 'hstrap', (0.045, 0.026, 0.42), (sx * 0.085, -0.112, 0.24), m=hivis, parent=tor); bx(PRE + 'hstrapb', (0.045, 0.026, 0.42), (sx * 0.085, 0.104, 0.24), m=hivis, parent=tor)
            bx(PRE + 'hstraptop', (0.045, 0.23, 0.02), (sx * 0.085, 0.0, 0.447), m=hivis, parent=tor); bx(PRE + 'reflect', (0.046, 0.028, 0.03), (sx * 0.085, -0.114, 0.3), m=sole, parent=tor)
        loft(PRE + 'hband', [((0, 0, 0.1), 0.15 * k, 0.102 * k), ((0, 0, 0.145), 0.152 * k, 0.103 * k)], sides=10, m=hivis, parent=tor, cap=False)
        bx(PRE + 'rebreather', (0.24, 0.11, 0.3), (0, 0.17, 0.27), m=shellm, parent=tor, bevel=0.035)
        for sx in (1, -1): cyl(PRE + 'tank', (sx * 0.065, 0.24, 0.12), (sx * 0.065, 0.24, 0.42), 0.042, m=legs, parent=tor, sides=9)
    if cz == 'c':     # the company officer: a long coat with a pale front, a mantle in the company's colour
        loft(PRE + 'coat', [((0, 0, 0.08), 0.158 * k, 0.11 * k), ((0, 0.008, -0.2), 0.2 * k, 0.16 * k), ((0, 0.016, -0.55), 0.25 * k, 0.215 * k)], sides=12, m=top, parent=pel, cap=False)
        bx(PRE + 'coatfront', (0.03, 0.014, 0.58), (0.04, -0.2, -0.24), m=legs, parent=pel, rot=(0.16, 0, 0))
        bx(PRE + 'chestfront', (0.03, 0.014, 0.36), (0.04, -0.113, 0.24), m=legs, parent=tor)
        loft(PRE + 'mantle', [((0, 0.004, 0.32), 0.2 * k, 0.122 * k), ((0, 0.008, 0.4), 0.188 * k, 0.112 * k), ((0, 0.01, 0.455), 0.14 * k, 0.09)], sides=10, m=trim, parent=tor, cap=False)
    if cz == 'e':     # the engineer: a hi-vis vest with pale bands, a tool belt with pouches and a hammer
        loft(PRE + 'vest', [((0, -0.002, 0.08), 0.158 * k, 0.11 * k), ((0, -0.004, 0.3), 0.184 * k, 0.116 * k), ((0, 0.006, 0.42), 0.17 * k, 0.1 * k)], sides=10, m=hivis, parent=tor, cap=False)
        loft(PRE + 'vestband', [((0, -0.004, 0.2), 0.18 * k, 0.115 * k), ((0, -0.004, 0.235), 0.182 * k, 0.116 * k)], sides=10, m=sole, parent=tor, cap=False)
        for x in (-0.14, 0.14): bx(PRE + 'toolpouch', (0.07, 0.06, 0.1), (x, -0.095, -0.02), m=strap, parent=pel)
        cyl(PRE + 'hammer', (0.17, 0.03, 0.05), (0.17, 0.03, -0.19), 0.012, m=wood, parent=pel, sides=6); bx(PRE + 'hammerhead', (0.035, 0.09, 0.035), (0.17, 0.03, 0.06), m=shellm, parent=pel)
    if cz == 'i':     # the inspector: a long dark coat with a pale front and tabs on the shoulders
        loft(PRE + 'coat', [((0, 0, 0.08), 0.158 * k, 0.11 * k), ((0, 0.008, -0.2), 0.195 * k, 0.155 * k), ((0, 0.016, -0.53), 0.235 * k, 0.205 * k)], sides=12, m=top, parent=pel, cap=False)
        bx(PRE + 'coatfront', (0.03, 0.014, 0.55), (0.04, -0.195, -0.23), m=legs, parent=pel, rot=(0.15, 0, 0)); bx(PRE + 'shirt', (0.07, 0.012, 0.1), (0, -0.108, 0.42), m=lining, parent=tor)
        for sx in (1, -1): bx(PRE + 'tab', (0.08, 0.06, 0.012), (sx * 0.15, 0.004, 0.452), m=trim, parent=tor)
    if cz == 'm':     # the medic: a yoke in the company's colour, a bag on a strap
        loft(PRE + 'yoke', [((0, -0.002, 0.34), 0.188 * k, 0.112 * k), ((0, 0.006, 0.43), 0.168 * k, 0.098 * k)], sides=10, m=trim, parent=tor, cap=False)
        bx(PRE + 'bagstrap', (0.04, 0.24, 0.46), (0.0, 0.0, 0.22), m=strap, parent=tor, rot=(0, 0.6, 0)); bx(PRE + 'bag', (0.09, 0.2, 0.18), (-0.19, 0.0, -0.02), m=shellm, parent=pel, bevel=0.025)
        bx(PRE + 'bagmark', (0.01, 0.06, 0.06), (-0.237, 0.0, 0.0), m=trim, parent=pel)
    if cz == 'p':     # the pilot: a harness over a flight suit, a chest box, a neck ring for the helmet
        for sx in (1, -1): bx(PRE + 'strap', (0.042, 0.024, 0.4), (sx * 0.085, -0.112, 0.25), m=strap, parent=tor); bx(PRE + 'strapb', (0.042, 0.024, 0.4), (sx * 0.085, 0.104, 0.25), m=strap, parent=tor)
        bx(PRE + 'chestbox', (0.14, 0.05, 0.09), (0, -0.135, 0.27), m=shellm, parent=tor, bevel=0.012); bx(PRE + 'chestlamp', (0.03, 0.008, 0.02), (-0.035, -0.162, 0.28), m=glowd, parent=tor)
        loft(PRE + 'neckring', [((0, 0.008, 0.47), 0.1, 0.09), ((0, 0.008, 0.5), 0.1, 0.09)], sides=10, m=shellm, parent=tor, cap=False)
    if cz == 'w':     # the deck hand: a jersey with a broad band in the company's colour, a pouch on the belt
        loft(PRE + 'jerseyband', [((0, -0.004, 0.24), 0.177 * k, 0.11 * k), ((0, -0.004, 0.32), 0.184 * k, 0.11 * k)], sides=10, m=trim, parent=tor, cap=False)
        bx(PRE + 'beltpouch', (0.09, 0.06, 0.1), (0.13, -0.1, -0.02), m=strap, parent=pel)
    # the head: a face with a chin, a nose, ears, brows and eyes set in it
    head = joint('head', (0, 0, 0.52), tor); hg = joint('headgear', (0, 0, -0.028), head)
    cyl(PRE + 'neck', (0, 0.008, -0.04), (0, 0.008, 0.08), 0.05, m=skin, parent=hg, sides=10)
    blob(PRE + 'skull', 0.1, (0.88, 1.0, 1.1), (0, 0.008, 0.15), sub=2, m=skin, parent=hg)
    blob(PRE + 'jaw', 0.064, (0.92, 0.88, 0.82), (0, -0.022, 0.09), sub=2, m=skin, parent=hg)
    spike(PRE + 'nose', (0, -0.088, 0.152), (0, -0.112, 0.128), 0.016, sides=4, m=skin, parent=hg, flat=0.7)
    for sx in (1, -1):
        blob(PRE + 'ear', 0.022, (0.45, 0.8, 1.25), (sx * 0.089, 0.012, 0.145), sub=1, m=skin, parent=hg)
        blob(PRE + 'eye', 0.011, (1.0, 0.45, 0.65), (sx * 0.034, -0.088, 0.165), sub=1, m=eyed, parent=hg)
        bx(PRE + 'brow', (0.032, 0.012, 0.008), (sx * 0.035, -0.091, 0.185), m=hair if cz != 'c' else brow, parent=hg, rot=(0, -sx * 0.12, 0))
    bx(PRE + 'mouth', (0.032, 0.008, 0.006), (0, -0.094, 0.1), m=lips, parent=hg)
    # hair: a cap that follows the skull, its edge high on the brow and low at the nape
    hairline = lambda a: 0.2 + 0.0 * a if False else (0.205 * max(0.0, -math.sin(a)) + (0.15 if abs(math.cos(a)) > 0.6 else 0.13) * (1 - max(0.0, -math.sin(a))) - 0.05 * max(0.0, math.sin(a)))
    if cz not in 'ep':
        dome(PRE + 'hair', (0, 0.01, 0.0), (0.094, 0.108), top=0.272, eq=0.2, rim=hairline, rings=3, segs=14, flare=1.02, m=hair, parent=hg)
    if cz == 'a':     # a headset: a band, cups over the ears, a small lit eyepiece, a boom
        loft(PRE + 'headband', [((0.104 * math.sin(t), 0.012, 0.15 + 0.128 * math.cos(t)), 0.006, 0.014) for t in [math.radians(d) for d in (-80, -50, -20, 0, 20, 50, 80)]], sides=6, m=shellm, parent=hg)
        for sx in (1, -1): blob(PRE + 'earcup', 0.038, (0.6, 1, 1.15), (sx * 0.1, 0.012, 0.15), sub=1, m=legs, parent=hg)
        bx(PRE + 'eyepiece', (0.05, 0.016, 0.03), (0.04, -0.104, 0.168), m=glowd, parent=hg); cyl(PRE + 'boom', (-0.1, 0.0, 0.13), (-0.045, -0.1, 0.1), 0.006, m=shellm, parent=hg, sides=4)
    if cz == 'b':     # hair tied back, goggles pushed up on the brow
        bx(PRE + 'tail', (0.05, 0.05, 0.2), (0, 0.11, 0.1), m=hair, parent=hg, bevel=0.015, taper=0.6)
        loft(PRE + 'gogband', [((0, 0.01, 0.222), 0.1, 0.114), ((0, 0.01, 0.245), 0.098, 0.112)], sides=12, m=strap, parent=hg, cap=False)
        for sx in (1, -1): bx(PRE + 'lens', (0.058, 0.024, 0.036), (sx * 0.038, -0.1, 0.236), m=shellm, parent=hg)
    if cz == 'c':     # a high knot held by a pin, a comm piece behind the ear
        blob(PRE + 'bun', 0.05, (1, 1, 0.9), (0, 0.07, 0.27), sub=2, m=hair, parent=hg); cyl(PRE + 'pin', (-0.06, 0.07, 0.27), (0.07, 0.07, 0.3), 0.005, m=shellm, parent=hg, sides=4)
        bx(PRE + 'comm', (0.016, 0.04, 0.05), (0.094, 0.02, 0.15), m=shellm, parent=hg)
    if cz == 'e':     # short hair under a hard hat with a brim and a lamp
        dome(PRE + 'hair', (0, 0.01, 0.0), (0.094, 0.108), top=0.24, eq=0.18, rim=hairline, rings=2, segs=14, flare=1.02, m=hair, parent=hg)
        dome(PRE + 'hardhat', (0, 0.006, 0.0), (0.118, 0.13), top=0.3, eq=0.235, rim=lambda a: 0.205, rings=3, segs=14, m=hardhat, parent=hg)
        loft(PRE + 'hatbrim', [((0, -0.012, 0.21), 0.138, 0.162), ((0, -0.012, 0.198), 0.136, 0.16)], sides=14, m=hardhat, parent=hg); bx(PRE + 'hatlamp', (0.04, 0.025, 0.03), (0, -0.13, 0.235), m=glowd, parent=hg)
    if cz == 'i':     # a peaked cap with a band in the company's colour
        loft(PRE + 'capband', [((0, 0.01, 0.215), 0.102, 0.116), ((0, 0.01, 0.252), 0.106, 0.12)], sides=12, m=trim, parent=hg, cap=False)
        loft(PRE + 'capcrown', [((0, 0.01, 0.252), 0.124, 0.138), ((0, 0.01, 0.278), 0.118, 0.132)], sides=12, m=capm, parent=hg); bx(PRE + 'cappeak', (0.15, 0.085, 0.012), (0, -0.14, 0.218), m=capm, parent=hg, rot=(0.25, 0, 0))
    if cz == 'm':     # a soft cap
        dome(PRE + 'softcap', (0, 0.012, 0.0), (0.1, 0.114), top=0.285, eq=0.225, rim=lambda a: 0.2 + 0.015 * max(0.0, -math.sin(a)), rings=3, segs=14, m=top, parent=hg)
    if cz == 'p':     # a flight helmet, its dark visor pushed up, cups over the ears, a boom
        dome(PRE + 'helmet', (0, 0.008, 0.0), (0.118, 0.13), top=0.29, eq=0.19, rim=lambda a: 0.11 + 0.08 * max(0.0, -math.sin(a)) ** 2, rings=3, segs=14, flare=1.03, m=shellm, parent=hg)
        shell(PRE + 'visor', (0, 0.008), (0.122, 0.134), (0.112, 0.124), z=(0.225, 0.272), arc=(-math.pi / 2 - 0.9, -math.pi / 2 + 0.9), segs=8, t=0.008, m=visor, parent=hg)
        loft(PRE + 'helmstripe', [((0, 0.008 + 0.132 * math.sin(t), 0.19 + 0.1 * math.cos(t)), 0.012, 0.005) for t in [math.radians(d) for d in (-20, 10, 40, 70, 95)]], sides=6, m=trim, parent=hg)
        for sx in (1, -1): blob(PRE + 'earcup', 0.04, (0.6, 1, 1.15), (sx * 0.11, 0.012, 0.15), sub=1, m=legs, parent=hg)
        cyl(PRE + 'boom', (-0.11, 0.0, 0.13), (-0.045, -0.105, 0.1), 0.006, m=gunm, parent=hg, sides=4)
    if cz == 'w':     # ear defenders on a band
        loft(PRE + 'headband', [((0.11 * math.sin(t), 0.012, 0.15 + 0.13 * math.cos(t)), 0.007, 0.016) for t in [math.radians(d) for d in (-80, -50, -20, 0, 20, 50, 80)]], sides=6, m=hivis, parent=hg)
        for sx in (1, -1): blob(PRE + 'earcup', 0.044, (0.6, 1, 1.15), (sx * 0.104, 0.012, 0.15), sub=1, m=hivis, parent=hg)
    # arms
    sho = joint('sho.L', (0.182 * k, 0, 0.425), tor)
    blob(PRE + 'deltoid.L', 0.058 * k, (0.92, 1.04, 1.0), (0.002, 0, -0.026), sub=2, m=top, parent=sho)
    loft(PRE + 'upper.L', [((0, 0, -0.032), 0.056 * k, 0.058 * k), ((0, 0, -0.12), 0.052 * k, 0.055 * k), ((0, 0, -0.26), 0.042 * k, 0.044 * k), ((0, 0, -0.3), 0.04 * k, 0.042 * k)], sides=9, m=top, parent=sho)
    elb = joint('elbow.L', (0, 0, -L1), sho)
    loft(PRE + 'fore.L', [((0, 0, 0), 0.043 * k, 0.045 * k), ((0, -0.004, -0.07), 0.046 * k, 0.048 * k), ((0, 0, -0.2), 0.034 * k, 0.035 * k), ((0, 0, -0.235), 0.032 * k, 0.033 * k)], sides=9, m=top if cz not in 'ci' else top, parent=elb)
    loft(PRE + 'cuff.L', [((0, 0, -0.17), 0.04 * k, 0.041 * k), ((0, 0, -0.215), 0.038 * k, 0.039 * k)], sides=9, m=lining if cz in 'ci' else legs, parent=elb, cap=False)
    loft(PRE + 'wrist.L', [((0, 0, -0.2), 0.03, 0.031), ((0, 0, -0.245), 0.03, 0.031)], sides=9, m=hand_m, parent=elb, cap=False)
    blob(PRE + 'hand.L', 0.038, (0.72, 1.0, 1.25), (0, -0.005, -L2 - 0.005), sub=1, m=hand_m, parent=elb)
    mirror_x(sho)
    bx(PRE + 'wristband', (0.06, 0.05, 0.04), (0, -0.016, -L2 + 0.09), m=shellm, parent=J('elbow.L'))     # a band on the left wrist with a small face
    bx(PRE + 'wristface', (0.03, 0.008, 0.022), (0, -0.044, -L2 + 0.09), m=glowd, parent=J('elbow.L'))
    if cz in 'ci':     # (GC 0.75) the slate on a joint of its own, put in the hand for each pose (slate_at): it was hung off the forearm, and floated beside or above the hand
        sj = joint('slatej', (0, 0, 0), root); bx(PRE + 'slate', (0.15, 0.012, 0.2), (0, 0, 0.1), m=legs, parent=sj); bx(PRE + 'slateface', (0.12, 0.006, 0.16), (0, 0.008, 0.1), m=glowd, parent=sj)
    rest(root); return root

def person(kind):
    armed = kind in ('soldier', 'vanguard'); van = kind == 'vanguard'; cz = kind[-1] if not armed else '-'
    if armed: return trooper(van)     # (GC 0.69)
    return civilian(cz)     # (GC 0.70)
    top, legs = (plate, plated) if van else (uni, unid) if armed else CLOTH[cz]
    skin = SKIN[{'soldier': 0, 'vanguard': 3, 'a': 4, 'b': 1, 'c': 2, 'e': 4, 'i': 2, 'm': 3, 'p': 4, 'w': 1}[kind if armed else cz]]
    k = 1.1 if van else 1.0
    root = joint('root'); pel = joint('pelvis', (0, 0, 1.0), root)
    loft(PRE + 'hips', [((0, 0, 0.07), 0.165 * k, 0.115 * k), ((0, 0, -0.1), 0.155 * k, 0.11 * k)], sides=8, m=legs, parent=pel)
    bleg(pel, (0.095, 0, -0.07), 0.42, 0.42, 0.085 * k, legs, legs, (0.11, 0.27, 0.09), boots, sides=7, kneecap=(0.115, 0.05, 0.13) if (armed or cz in 'bew') else None, m_knee=trim if van else hivis if cz in 'be' else strap if cz == 'w' else kit)
    for sd in ('L', 'R'):
        loft(PRE + 'boot', [((0, 0, -0.2), 0.078 * k, 0.078 * k), ((0, 0, -0.42), 0.07 * k, 0.07 * k)], sides=7, m=boots, parent=J('knee.' + sd), cap=False)
        if van: box(PRE + 'cuisse', (0.15, 0.06, 0.26), (0, -0.09, -0.2), m=plate, parent=J('hip.' + sd), bevel=0.02)
        elif armed: box(PRE + 'pocket', (0.05, 0.12, 0.14), (0.1 if sd == 'L' else -0.1, 0, -0.2), m=kit, parent=J('hip.' + sd), bevel=0.015)
        else:
            box(PRE + 'sole', (0.118, 0.285, 0.03), (0, -0.05, -0.495), m=sole, parent=J('knee.' + sd))     # a pale sole and a lit tab on every boot
            box(PRE + 'boottab', (0.05, 0.02, 0.035), (0, -0.075, -0.25), m=glow, parent=J('knee.' + sd))
            if cz == 'a': box(PRE + 'legseam', (0.02, 0.03, 0.36), (0.085 if sd == 'L' else -0.085, 0, -0.2), m=trim, parent=J('hip.' + sd))
    loft(PRE + 'belt', [((0, 0, 0.09), 0.175 * k, 0.125 * k), ((0, 0, 0.03), 0.175 * k, 0.125 * k)], sides=8, m=trim if van else strap, parent=pel, cap=False)
    if armed:
        for x in (-0.13, 0.13): box(PRE + 'pouch', (0.09, 0.06, 0.1), (x, -0.125, 0.02), m=kit, parent=pel, bevel=0.015)
        box(PRE + 'canteen', (0.09, 0.07, 0.13), (0.13, 0.12, 0.0), m=strap, parent=pel, bevel=0.03)
    tor = joint('torso', (0, 0, 0.1), pel)
    loft(PRE + 'trunk', [((0, 0, -0.02), 0.16 * k, 0.11 * k), ((0, 0, 0.16), 0.17 * k, 0.115 * k), ((0, 0, 0.34), 0.205 * k, 0.13 * k), ((0, 0, 0.45), 0.17 * k, 0.11 * k), ((0, 0, 0.5), 0.075, 0.07)], sides=9, m=top, parent=tor)
    if armed:
        loft(PRE + 'vest', [((0, 0, 0.12), 0.185 * k, 0.135 * k), ((0, 0, 0.3), 0.215 * k, 0.15 * k), ((0, 0, 0.43), 0.19 * k, 0.13 * k)], sides=9, m=plated if van else kit, parent=tor, cap=False)
        box(PRE + 'frontplate', (0.26 * k, 0.04, 0.2), (0, -0.14 * k, 0.3), m=plate if van else kit, parent=tor, bevel=0.015, taper=0.85)
        for i in range(3): box(PRE + 'mag%d' % i, (0.065, 0.045, 0.1), ((i - 1) * 0.085, -0.155 * k, 0.15), m=trim if (van and i == 1) else kit, parent=tor, bevel=0.012)
        box(PRE + 'pack', (0.3 * k, 0.16, 0.36), (0, 0.2, 0.26), m=plated if van else kit, parent=tor, bevel=0.035)
        cyl(PRE + 'roll', (-0.17, 0.2, 0.48), (0.17, 0.2, 0.48), 0.06, m=unid if not van else plate, parent=tor, sides=7)
        if van:
            loft(PRE + 'collar', [((0, 0, 0.42), 0.2, 0.14), ((0, 0, 0.48), 0.16, 0.12)], sides=9, m=trim, parent=tor, cap=False)
            cyl(PRE + 'aerial', (0.11, 0.24, 0.44), (0.13, 0.27, 1.05), 0.008, m=gunm, parent=tor, sides=4); box(PRE + 'packlamp', (0.07, 0.03, 0.05), (-0.08, 0.285, 0.36), m=lamp, parent=tor)
    else:
        # every suit: a stand collar, a lit strip on the chest, the company's badge, a buckle that glows
        loft(PRE + 'collar', [((0, 0.005, 0.44), 0.105, 0.095), ((0, 0.01, 0.53), 0.085, 0.08)], sides=8, m=legs, parent=tor, cap=False)
        box(PRE + 'badge', (0.06, 0.02, 0.06), (0.09, -0.125, 0.34), m=trim, parent=tor, bevel=0.008); box(PRE + 'buckle', (0.06, 0.02, 0.04), (0, -0.128, -0.04), m=glow, parent=tor)
        if cz == 'a':     # the technician: a yoke in the company's colour, a lit panel, a tool pack on the thigh
            loft(PRE + 'yoke', [((0, 0, 0.33), 0.215, 0.14), ((0, 0, 0.45), 0.18, 0.118)], sides=9, m=trim, parent=tor, cap=False)
            box(PRE + 'panel', (0.12, 0.02, 0.16), (-0.03, -0.128, 0.2), m=legs, parent=tor, bevel=0.01); box(PRE + 'readout', (0.09, 0.012, 0.03), (-0.03, -0.14, 0.24), m=glow, parent=tor); box(PRE + 'readout2', (0.05, 0.012, 0.02), (-0.045, -0.14, 0.18), m=amberl, parent=tor)
            box(PRE + 'toolpack', (0.06, 0.13, 0.16), (-0.125, 0, -0.14), m=shellm, parent=pel, bevel=0.02)
        if cz == 'b':     # the dock hand: a hi-vis harness, a rebreather on the back, a mask hanging at the throat
            loft(PRE + 'harness', [((0, 0, 0.1), 0.19, 0.135), ((0, 0, 0.3), 0.222, 0.148), ((0, 0, 0.42), 0.195, 0.13)], sides=9, m=hivis, parent=tor, cap=False)
            for sx in (1, -1): box(PRE + 'strap', (0.05, 0.3, 0.035), (sx * 0.1, 0.0, 0.455), m=strap, parent=tor); box(PRE + 'reflect', (0.07, 0.015, 0.2), (sx * 0.1, -0.152, 0.26), m=sole, parent=tor)
            box(PRE + 'rebreather', (0.3, 0.14, 0.36), (0, 0.2, 0.26), m=shellm, parent=tor, bevel=0.04)
            for sx in (1, -1): cyl(PRE + 'tank', (sx * 0.08, 0.3, 0.1), (sx * 0.08, 0.3, 0.44), 0.05, m=legs, parent=tor, sides=7); cyl(PRE + 'tankcap', (sx * 0.08, 0.3, 0.44), (sx * 0.08, 0.3, 0.47), 0.04, m=amberl, parent=tor, sides=7)
            box(PRE + 'mask', (0.13, 0.07, 0.08), (0, -0.13, 0.43), m=legs, parent=tor, bevel=0.025)
            for sx in (1, -1): cyl(PRE + 'filter', (sx * 0.05, -0.16, 0.42), (sx * 0.08, -0.2, 0.41), 0.025, m=shellm, parent=tor, sides=6)
        if cz == 'c':     # the company officer: a long coat with a pale front and a hem that glows, a mantle in the company's colour
            loft(PRE + 'coat', [((0, 0, 0.08), 0.175, 0.125), ((0, 0.01, -0.3), 0.25, 0.21), ((0, 0.02, -0.7), 0.31, 0.28)], sides=10, m=top, parent=pel, cap=False)
            loft(PRE + 'hem', [((0, 0.02, -0.68), 0.315, 0.285), ((0, 0.02, -0.72), 0.315, 0.285)], sides=10, m=glow, parent=pel, cap=False)
            box(PRE + 'coatfront', (0.07, 0.02, 0.62), (0.05, -0.245, -0.33), m=lining, parent=pel, rot=(0.19, 0, 0))
            box(PRE + 'chestfront', (0.07, 0.02, 0.4), (0.05, -0.128, 0.22), m=lining, parent=tor)
            loft(PRE + 'mantle', [((0, 0.01, 0.3), 0.26, 0.17), ((0, 0.01, 0.4), 0.235, 0.15), ((0, 0.005, 0.46), 0.17, 0.115)], sides=9, m=trim, parent=tor, cap=False)
        if cz == 'e':     # the engineer: a hi-vis vest with pale bands, a tool belt with pouches and a hammer in its loop
            loft(PRE + 'vest', [((0, 0, 0.08), 0.188, 0.133), ((0, 0, 0.3), 0.222, 0.148), ((0, 0, 0.43), 0.195, 0.13)], sides=9, m=hivis, parent=tor, cap=False)
            loft(PRE + 'vestband', [((0, 0, 0.2), 0.212, 0.146), ((0, 0, 0.25), 0.218, 0.15)], sides=9, m=sole, parent=tor, cap=False)
            loft(PRE + 'toolbelt', [((0, 0, 0.1), 0.185, 0.135), ((0, 0, 0.02), 0.185, 0.135)], sides=8, m=strap, parent=pel, cap=False)
            for x in (-0.15, 0.15): box(PRE + 'toolpouch', (0.09, 0.07, 0.12), (x, -0.11, -0.02), m=strap, parent=pel, bevel=0.015)
            cyl(PRE + 'hammer', (0.19, 0.03, 0.06), (0.19, 0.03, -0.2), 0.014, m=wood, parent=pel, sides=5); box(PRE + 'hammerhead', (0.04, 0.1, 0.04), (0.19, 0.03, 0.07), m=shellm, parent=pel)
        if cz == 'i':     # the inspector: a long dark coat with a pale front, tabs on the shoulders
            loft(PRE + 'coat', [((0, 0, 0.08), 0.175, 0.125), ((0, 0.01, -0.3), 0.24, 0.2), ((0, 0.02, -0.66), 0.29, 0.26)], sides=10, m=top, parent=pel, cap=False)
            box(PRE + 'coatfront', (0.05, 0.02, 0.6), (0.05, -0.235, -0.31), m=lining, parent=pel, rot=(0.17, 0, 0)); box(PRE + 'chestfront', (0.05, 0.02, 0.4), (0.05, -0.128, 0.22), m=lining, parent=tor)
            for sx in (1, -1): box(PRE + 'tab', (0.1, 0.07, 0.02), (sx * 0.17, 0, 0.475), m=trim, parent=tor, bevel=0.006)
        if cz == 'm':     # the medic: a yoke in the company's colour, a bag on a strap with a lit bar
            loft(PRE + 'yoke', [((0, 0, 0.33), 0.215, 0.14), ((0, 0, 0.45), 0.18, 0.118)], sides=9, m=trim, parent=tor, cap=False)
            box(PRE + 'bagstrap', (0.05, 0.3, 0.5), (0.0, 0.0, 0.22), m=strap, parent=tor, rot=(0, 0.62, 0)); box(PRE + 'bag', (0.1, 0.22, 0.2), (-0.21, 0.0, -0.02), m=shellm, parent=pel, bevel=0.03); box(PRE + 'bagbar', (0.012, 0.12, 0.04), (-0.265, 0.0, 0.0), m=glow, parent=pel)
        if cz == 'p':     # the pilot: a harness over a flight suit, a chest box with lights, a neck ring for the helmet
            for sx in (1, -1): box(PRE + 'strap', (0.05, 0.3, 0.035), (sx * 0.1, 0.0, 0.455), m=strap, parent=tor); box(PRE + 'strapfront', (0.05, 0.02, 0.42), (sx * 0.1, -0.135, 0.24), m=strap, parent=tor)
            box(PRE + 'chestbox', (0.16, 0.06, 0.11), (0, -0.16, 0.26), m=shellm, parent=tor, bevel=0.015); box(PRE + 'chestlamp', (0.04, 0.012, 0.03), (-0.04, -0.195, 0.27), m=glow, parent=tor); box(PRE + 'chestlamp2', (0.04, 0.012, 0.03), (0.04, -0.195, 0.27), m=amberl, parent=tor)
            loft(PRE + 'neckring', [((0, 0.005, 0.47), 0.115, 0.105), ((0, 0.005, 0.5), 0.115, 0.105)], sides=9, m=shellm, parent=tor, cap=False)
            for sd in ('L', 'R'): box(PRE + 'legpocket', (0.05, 0.12, 0.15), (0.1 if sd == 'L' else -0.1, 0, -0.22), m=legs, parent=J('hip.' + sd), bevel=0.015)
        if cz == 'w':     # the deck hand: a jersey with a broad band in the company's colour, a pouch on the belt
            loft(PRE + 'jerseyband', [((0, 0, 0.24), 0.2, 0.128), ((0, 0, 0.33), 0.21, 0.134)], sides=9, m=trim, parent=tor, cap=False)
            box(PRE + 'beltpouch', (0.1, 0.07, 0.11), (0.14, -0.11, -0.02), m=strap, parent=pel, bevel=0.015)
    head = joint('head', (0, 0, 0.52), tor)
    cyl(PRE + 'neck', (0, 0, -0.04), (0, 0, 0.06), 0.05, m=skin, parent=head, sides=7)
    blob(PRE + 'face', 0.105, (0.95, 1.0, 1.12), (0, 0, 0.15), sub=2, m=skin, parent=head)
    for sx in (1, -1): box(PRE + 'eye', (0.024, 0.02, 0.028), (sx * 0.042, -0.098, 0.165), m=eyem, parent=head)
    box(PRE + 'nose', (0.022, 0.03, 0.04), (0, -0.108, 0.135), m=skin, parent=head)
    if armed:
        hm = plate if van else helm
        loft(PRE + 'helmet', [((0, 0.005, 0.135), 0.135, 0.15), ((0, 0.005, 0.2), 0.13, 0.145), ((0, 0.01, 0.265), 0.095, 0.105), ((0, 0.01, 0.29), 0.03, 0.035)], sides=9, m=hm, parent=head)
        loft(PRE + 'brim', [((0, 0.0, 0.14), 0.15, 0.17), ((0, 0.0, 0.125), 0.148, 0.168)], sides=9, m=hm, parent=head)
        box(PRE + 'goggles', (0.18, 0.04, 0.05), (0, -0.115, 0.165), m=lamp if van else visor, parent=head, bevel=0.012)
        box(PRE + 'chin', (0.19, 0.02, 0.02), (0, -0.06, 0.07), m=strap, parent=head)
        if van: box(PRE + 'stripe', (0.045, 0.27, 0.03), (0, 0.005, 0.285), m=trim, parent=head); box(PRE + 'jawguard', (0.17, 0.05, 0.07), (0, -0.09, 0.09), m=plate, parent=head, bevel=0.015)
    else:
        hair = HAIR[{'a': 0, 'b': 1, 'c': 2}.get(cz, HAIRX.get(cz, 0))]
        if cz != 'p': loft(PRE + 'hair', [((0, 0.02, 0.15), 0.112, 0.125), ((0, 0.025, 0.22), 0.105, 0.115), ((0, 0.03, 0.275), 0.04, 0.045)], sides=8, m=hair, parent=head)
        if cz == 'a':     # a headset: a band, cups over the ears, a lit eyepiece, a boom
            box(PRE + 'headband', (0.25, 0.03, 0.03), (0, 0.01, 0.275), m=shellm, parent=head)
            for sx in (1, -1): blob(PRE + 'earcup', 0.045, (0.6, 1, 1.2), (sx * 0.115, 0.01, 0.16), sub=1, m=legs, parent=head)
            box(PRE + 'eyepiece', (0.06, 0.02, 0.04), (0.045, -0.115, 0.165), m=glow, parent=head); cyl(PRE + 'boom', (-0.11, 0.0, 0.13), (-0.05, -0.11, 0.1), 0.008, m=shellm, parent=head, sides=4)
        if cz == 'b':     # hair tied back, goggles pushed up on the brow
            box(PRE + 'tail', (0.07, 0.07, 0.26), (0, 0.11, 0.08), m=hair, parent=head, bevel=0.02, taper=0.6)
            box(PRE + 'gogband', (0.23, 0.2, 0.035), (0, 0.0, 0.235), m=strap, parent=head, bevel=0.01)
            for sx in (1, -1): box(PRE + 'lens', (0.07, 0.03, 0.045), (sx * 0.045, -0.105, 0.235), m=amberl, parent=head, bevel=0.012)
        if cz == 'c':     # a high knot held by a lit pin, a comm piece behind the ear
            blob(PRE + 'bun', 0.065, (1, 1, 1), (0, 0.08, 0.3), sub=1, m=hair, parent=head); cyl(PRE + 'pin', (-0.11, 0.08, 0.27), (0.12, 0.08, 0.34), 0.008, m=glow, parent=head, sides=4)
            box(PRE + 'comm', (0.02, 0.05, 0.06), (0.108, 0.02, 0.15), m=glow, parent=head)
        if cz == 'e':     # a hard hat with a brim and a lamp
            loft(PRE + 'hardhat', [((0, 0.005, 0.205), 0.132, 0.147), ((0, 0.005, 0.262), 0.116, 0.128), ((0, 0.01, 0.3), 0.04, 0.045)], sides=9, m=hardhat, parent=head)
            loft(PRE + 'hatbrim', [((0, -0.01, 0.21), 0.152, 0.18), ((0, -0.01, 0.197), 0.15, 0.178)], sides=9, m=hardhat, parent=head); box(PRE + 'hatlamp', (0.05, 0.03, 0.035), (0, -0.142, 0.235), m=glow, parent=head)
        if cz == 'i':     # a peaked cap with a band in the company's colour
            loft(PRE + 'capband', [((0, 0.01, 0.228), 0.118, 0.13), ((0, 0.01, 0.27), 0.122, 0.134)], sides=9, m=trim, parent=head, cap=False)
            loft(PRE + 'capcrown', [((0, 0.01, 0.27), 0.142, 0.154), ((0, 0.01, 0.298), 0.136, 0.148)], sides=9, m=capm, parent=head); box(PRE + 'cappeak', (0.17, 0.1, 0.014), (0, -0.155, 0.232), m=capm, parent=head, rot=(0.25, 0, 0))
        if cz == 'm':     # a soft cap, a lit lens over one eye
            loft(PRE + 'softcap', [((0, 0.015, 0.21), 0.116, 0.129), ((0, 0.02, 0.272), 0.102, 0.112), ((0, 0.02, 0.292), 0.04, 0.045)], sides=8, m=top, parent=head); box(PRE + 'lens', (0.05, 0.02, 0.04), (-0.045, -0.115, 0.165), m=glow, parent=head)
        if cz == 'p':     # a flight helmet, its dark visor pushed up, cups over the ears, a boom
            loft(PRE + 'helmet', [((0, 0.005, 0.12), 0.132, 0.146), ((0, 0.005, 0.2), 0.134, 0.15), ((0, 0.01, 0.268), 0.098, 0.108), ((0, 0.01, 0.292), 0.03, 0.035)], sides=9, m=shellm, parent=head)
            box(PRE + 'visor', (0.19, 0.07, 0.06), (0, -0.105, 0.245), m=visor, parent=head, bevel=0.02, rot=(-0.5, 0, 0)); box(PRE + 'helmstripe', (0.04, 0.26, 0.03), (0, 0.01, 0.283), m=trim, parent=head)
            for sx in (1, -1): blob(PRE + 'earcup', 0.05, (0.6, 1, 1.2), (sx * 0.128, 0.01, 0.16), sub=1, m=legs, parent=head)
            cyl(PRE + 'boom', (-0.12, 0.0, 0.13), (-0.05, -0.115, 0.1), 0.008, m=gunm, parent=head, sides=4)
        if cz == 'w':     # ear defenders on a band, a short cap
            box(PRE + 'headband', (0.26, 0.03, 0.03), (0, 0.01, 0.278), m=hivis, parent=head)
            for sx in (1, -1): blob(PRE + 'earcup', 0.052, (0.6, 1, 1.2), (sx * 0.118, 0.01, 0.16), sub=1, m=hivis, parent=head)
    sho = joint('sho.L', (0.2 * k, 0, 0.43), tor)
    blob(PRE + 'shoulder.L', 0.075 * k, (1, 1, 0.9), (0, 0, 0), sub=1, m=top, parent=sho)
    loft(PRE + 'upper.L', [((0, 0, 0), 0.058 * k, 0.058 * k), ((0, 0, -L1), 0.048 * k, 0.048 * k)], sides=7, m=top, parent=sho)
    if armed and not van: loft(PRE + 'band.L', [((0, 0, -0.1), 0.064, 0.064), ((0, 0, -0.16), 0.062, 0.062)], sides=7, m=band, parent=sho, cap=False)
    if van: blob(PRE + 'pauldron.L', 0.125, (1.05, 1.15, 0.72), (0.02, 0, 0.04), sub=1, m=trim, parent=sho)
    elb = joint('elbow.L', (0, 0, -L1), sho)
    loft(PRE + 'fore.L', [((0, 0, 0), 0.05 * k, 0.05 * k), ((0, 0, -L2 + 0.03), 0.04 * k, 0.04 * k)], sides=7, m=plate if van else top, parent=elb)
    blob(PRE + 'hand.L', 0.045, (1, 1, 1.1), (0, 0, -L2), sub=1, m=boots if (armed or cz in 'bepw') else skin, parent=elb)
    if not armed: loft(PRE + 'cuff.L', [((0, 0, -L2 + 0.1), 0.05, 0.05), ((0, 0, -L2 + 0.04), 0.047, 0.047)], sides=7, m=legs if cz not in 'ci' else lining, parent=elb, cap=False)
    mirror_x(sho)
    if not armed:     # a lit band on the left wrist; the officer carries a slate
        box(PRE + 'wristband', (0.07, 0.06, 0.05), (0, -0.02, -L2 + 0.11), m=shellm, parent=J('elbow.L'), bevel=0.012); box(PRE + 'wristface', (0.04, 0.012, 0.03), (0, -0.055, -L2 + 0.11), m=glow, parent=J('elbow.L'))
        if cz in 'ci': box(PRE + 'slate', (0.16, 0.015, 0.22), (0.0, -0.06, -L2 + 0.02), m=legs, parent=J('elbow.R'), bevel=0.006); box(PRE + 'slateface', (0.13, 0.008, 0.18), (0.0, -0.071, -L2 + 0.02), m=glow, parent=J('elbow.R'))
    if armed:
        g = joint('gun', (-0.1, -0.2, 0.2), tor)
        box(PRE + 'receiver', (0.05, 0.3, 0.085), (0, -0.07, 0.0), m=gunm, parent=g, bevel=0.01)
        loft(PRE + 'stock', [((0, 0.08, 0.0), 0.022, 0.04), ((0, 0.22, -0.02), 0.024, 0.055)], sides=5, m=gunm if van else wood, parent=g)
        box(PRE + 'handguard', (0.045, 0.2, 0.055), (0, -0.3, 0.0), m=gunm if van else wood, parent=g, bevel=0.01)
        cyl(PRE + 'barrel', (0, -0.38, 0.01), (0, -0.62, 0.01), 0.014, m=gunm, parent=g, sides=6)
        box(PRE + 'magazine', (0.035, 0.065, 0.15), (0, -0.1, -0.1), m=gunm, parent=g, bevel=0.008, rot=(0.2, 0, 0)); box(PRE + 'sight', (0.02, 0.1, 0.035), (0, -0.05, 0.06), m=gunm, parent=g)
        box(PRE + 'gripp', (0.035, 0.045, 0.09), (0, 0.02, -0.07), m=gunm, parent=g, rot=(-0.25, 0, 0))
        if van: cyl(PRE + 'launcher', (0, -0.22, -0.045), (0, -0.46, -0.045), 0.026, m=gunm, parent=g, sides=6); box(PRE + 'gunlamp', (0.02, 0.03, 0.02), (0.03, -0.38, 0.02), m=lamp, parent=g)
    rest(root); return root

def hold(mode):
    """Bring the rifle to the ready or to the shoulder and put both hands on it."""
    if (PRE + 'gun') not in bpy.data.objects: return
    if mode == 'aim': at('gun', (-0.1, -0.28, 0.4), (0.0, 0, 0.06)); turn('head', y=-0.12, x=0.06)
    elif mode == 'gone': at('gun', (-0.55, -0.1, 0.05), (1.5, 0.3, 1.3)); return
    elif mode == 'slung': at('gun', (0.05, 0.36, 0.3), (-1.5708, 0.45, 0)); return     # on the back, the hands free
    else: at('gun', (-0.1, -0.2, 0.2), (0.42, 0, 0.6))
    reach(J('sho.R'), J('elbow.R'), wpt('gun', GRIP), L1, L2, pole=(-0.7, 0.5, -0.6)); reach(J('sho.L'), J('elbow.L'), wpt('gun', GUARD), L1, L2, pole=(0.5, 0.2, -1))
def swing(ph):
    turn('sho.L', x=0.45 * math.sin(ph)); turn('sho.R', x=-0.45 * math.sin(ph)); turn('elbow.L', x=-0.3 - 0.15 * math.sin(ph)); turn('elbow.R', x=-0.3 + 0.15 * math.sin(ph))
    if PRE in SLATE: turn('sho.R', x=-0.25 + 0.45 * math.sin(ph) * 0.8); turn('elbow.R', x=-1.1 - 0.3 + 0.15 * math.sin(ph) * -1)     # the slate is carried up, not swung
def p_stand(mode='ready'):
    zero(J('root')); turn('elbow.L', x=-0.12); turn('elbow.R', x=-0.12); hold(mode)
    if PRE in SLATE: turn('sho.R', x=-0.3); turn('elbow.R', x=-1.25); turn('head', x=0.18)     # reading the slate
def p_walk(ph, mode='ready', armed=True):
    zero(J('root')); long = PRE in SLATE; stride(ph, 0.26 if long else 0.5, 0.4 if long else 0.8, 0.0); shift('pelvis', z=0.03 * abs(math.sin(ph)) - 0.03);     # (in the long coat: a shorter step) turn('torso', z=0.07 * math.sin(ph) * (0.4 if mode == 'aim' else 1), x=0.05); turn('head', z=-0.06 * math.sin(ph))
    if armed: hold(mode)
    else: swing(ph)
def p_kneel(): zero(J('root')); shift('pelvis', z=-0.47); turn('hip.L', x=-1.45); turn('knee.L', x=1.45); turn('hip.R', x=0.12); turn('knee.R', x=1.5); turn('torso', x=0.1); hold('aim')
def p_down():
    zero(J('root')); turn('pelvis', x=-1.5708); shift('pelvis', z=-0.86); turn('sho.L', y=-1.1); turn('sho.R', y=1.2, x=0.3); turn('elbow.L', x=-0.5); turn('knee.L', x=0.6); turn('hip.L', x=-0.3, y=-0.15); turn('hip.R', y=0.12); turn('head', z=0.4); hold('gone')
# (GC 0.50) FIRING AND COVER. The rifle kicks: back into the shoulder and up at the muzzle, the shoulders rocked back with it.
# `fire` is that standing, `kfire` kneeling. `duck` is a man down behind a wall between shots: both knees bent low, the back
# rounded, the head pulled in, the rifle held close and upright. `kw0-3` he gets his head up for a look and goes down again.
def kick(k=1.0):
    g = bpy.data.objects.get(PRE + 'gun')
    if not g: return
    g.location = (g.location[0], g.location[1] + 0.055 * k, g.location[2] + 0.012 * k); g.rotation_euler = (g.rotation_euler[0] + 0.09 * k, g.rotation_euler[1], g.rotation_euler[2])
    reach(J('sho.R'), J('elbow.R'), wpt('gun', GRIP), L1, L2, pole=(-0.7, 0.5, -0.6)); reach(J('sho.L'), J('elbow.L'), wpt('gun', GUARD), L1, L2, pole=(0.5, 0.2, -1))
def p_fire(): zero(J('root')); turn('elbow.L', x=-0.12); turn('elbow.R', x=-0.12); turn('torso', x=-0.07); hold('aim'); kick()
def p_kfire(): zero(J('root')); shift('pelvis', z=-0.47); turn('hip.L', x=-1.45); turn('knee.L', x=1.45); turn('hip.R', x=0.12); turn('knee.R', x=1.5); turn('torso', x=0.03); hold('aim'); kick()
def p_duck(up=0.0):
    zero(J('root')); shift('pelvis', z=-0.5 + 0.05 * up); turn('hip.L', x=-1.5); turn('knee.L', x=1.6); turn('hip.R', x=0.1); turn('knee.R', x=1.55); turn('torso', x=0.5 - 0.3 * up); turn('head', x=0.3 - 0.45 * up)
    if (PRE + 'gun') in bpy.data.objects:
        at('gun', (-0.08, -0.17, 0.2), (1.2, 0, 0.25))
        reach(J('sho.R'), J('elbow.R'), wpt('gun', GRIP), L1, L2, pole=(-0.7, 0.5, -0.6)); reach(J('sho.L'), J('elbow.L'), wpt('gun', GUARD), L1, L2, pole=(0.5, 0.2, -1))
# (GC 0.72) riding the recon vehicle: sat down, thighs level, shins down, the rifle held at the ready across the lap
def p_sit(): zero(J('root')); shift('pelvis', z=-0.49); turn('hip.L', x=-1.5, y=0.08); turn('knee.L', x=1.5); turn('hip.R', x=-1.5, y=-0.08); turn('knee.R', x=1.5); turn('torso', x=0.06); hold('ready')
# (GC 0.72, Ramzies: "allies don't throw call-ins where they're going to land") throwing a call-in's beacon: the rifle
# dropped to the left hand, the right arm drawn back behind the head (throw0), then over and out toward the mark (throw1)
def p_throw(k):
    zero(J('root')); turn('hip.L', x=-0.3); turn('knee.L', x=0.25); turn('hip.R', x=0.18); turn('knee.R', x=0.1)
    turn('torso', z=(0.38 if k == 0 else -0.32), x=(-0.08 if k == 0 else 0.14)); turn('head', z=(-0.3 if k == 0 else 0.25))
    if (PRE + 'gun') in bpy.data.objects:
        at('gun', (0.2, -0.14, 0.08), (1.25, 0.15, 0.25)); reach(J('sho.L'), J('elbow.L'), wpt('gun', GRIP), L1, L2, pole=(0.7, 0.3, -0.6))
    else: turn('elbow.L', x=-0.4)
    if k == 0: hand('R', 'torso', (-0.24, 0.2, 0.66), (-0.8, 0.5, -0.2))
    else: hand('R', 'torso', (-0.14, -0.5, 0.6), (-1.0, 0.1, -0.4))
def p_hit(): zero(J('root')); turn('torso', x=-0.3, z=0.25); turn('head', x=-0.25); turn('hip.L', x=0.2); turn('knee.L', x=0.3); shift('pelvis', y=0.06); hold('ready')

# WHAT THE BASE AND THE STATION ASK OF A PERSON (GC 0.42). A soldier's rifle goes on the back for anything done with the hands.
def free(): zero(J('root')); turn('elbow.L', x=-0.12); turn('elbow.R', x=-0.12); hold('slung')
def hand(sd, joint_name, local, pole): reach(J('sho.' + sd), J('elbow.' + sd), wpt(joint_name, local), L1, L2, pole=pole)
def p_run(ph, armed):
    zero(J('root')); long = PRE in SLATE; stride(ph, 0.4 if long else 0.85, 0.7 if long else 1.3, 0.0); shift('pelvis', z=0.05 * abs(math.sin(ph)) - 0.05); turn('torso', x=0.2, z=0.1 * math.sin(ph))
    if armed: hold('ready')
    else:
        for s, sd in ((1, 'L'), (-1, 'R')): turn('sho.' + sd, x=0.85 * s * math.sin(ph)); turn('elbow.' + sd, x=-1.35)
def p_look(): p_stand('ready'); turn('head', x=-0.32)
def p_drink(): free(); turn('head', x=-0.15); hand('R', 'head', (-0.02, -0.13, 0.11), (-1, 0.1, -0.5))
def p_salute(): free(); hand('R', 'head', (-0.1, -0.1, 0.2), (-1, 0.25, -0.15))
# (GC 0.80, Ramzies: "Seaf units just appear, they should parachute down") hanging under a canopy: the rifle slung, both hands up
# on the risers above the shoulders, the elbows out; legs together and a little bent, ready for the ground
def p_hang():
    free(); turn('hip.L', x=-0.2, y=0.02); turn('knee.L', x=0.34); turn('hip.R', x=-0.2, y=-0.02); turn('knee.R', x=0.34)
    hand('R', 'torso', (-0.27, 0.03, 0.86), (-1, 0, 0.1)); hand('L', 'torso', (0.27, 0.03, 0.86), (1, 0, 0.1))
def p_heart(): free(); hand('R', 'torso', (0.07, -0.17, 0.33), (-0.7, -0.2, -1))
def p_mourn(): free(); turn('head', x=0.45); turn('torso', x=0.06); hand('R', 'pelvis', (-0.03, -0.17, 0.0), (-1, 0.2, 0)); hand('L', 'pelvis', (0.03, -0.17, 0.0), (1, 0.2, 0))
def p_work(i):
    free(); k = math.sin(i / 4 * 2 * math.pi); turn('torso', x=0.22); turn('head', x=0.15); turn('hip.L', x=-0.25); turn('knee.L', x=0.3); turn('hip.R', x=0.12)
    hand('R', 'pelvis', (-0.16, -0.5, 0.42 + 0.17 * k), (-1, 0.3, -0.4)); hand('L', 'pelvis', (0.14, -0.42, 0.12), (1, 0.2, -0.5))
def p_note(i): p_stand('none' if PRE in SLATE else 'ready'); turn('head', z=(i - 1) * 0.45, x=0.12 if PRE in SLATE else 0.0)     # looking about
def p_drill(ph): zero(J('root')); stride(ph, 0.8, 1.05, 0.0); turn('torso', x=-0.02); hold('ready')
def frames(armed):
    F = {'stand': (lambda: p_stand('ready')) if armed else (lambda: p_stand('none')), 'down': p_down}
    for i in range(8): F['w%d' % i] = (lambda i=i: p_walk(i / 8 * 2 * math.pi, 'ready', armed))
    if armed:
        F['aim'] = lambda: p_stand('aim'); F['kneel'] = p_kneel; F['hit'] = p_hit
        F['fire'] = p_fire; F['kfire'] = p_kfire; F['duck'] = p_duck; F['peek'] = lambda: p_duck(1.0)     # (GC 0.50)
        F['sit'] = p_sit     # (GC 0.72)
        F['throw0'] = lambda: p_throw(0); F['throw1'] = lambda: p_throw(1)
        F['hang'] = p_hang     # (GC 0.80) under a parachute
        for i in range(8): F['a%d' % i] = (lambda i=i: p_walk(i / 8 * 2 * math.pi, 'aim', True))
        for i in range(8): F['m%d' % i] = (lambda i=i: p_drill(i / 8 * 2 * math.pi))
    for i in range(8): F['r%d' % i] = (lambda i=i: p_run(i / 8 * 2 * math.pi, armed))
    F.update({'look': p_look, 'drink': p_drink, 'salute': p_salute, 'heart': p_heart, 'mourn': p_mourn})
    for i in range(4): F['k%d' % i] = (lambda i=i: p_work(i))
    for i in range(3): F['n%d' % i] = (lambda i=i: p_note(i))
    if not armed: F = {k: (lambda f=f, k=k: (f(), slate_at(k))) for k, f in F.items()}     # (GC 0.75) the slate goes where the hand is
    return F
# (GC 0.75, Ramzies: "people are holding onto something and it just floats above their hand") Where the slate is in each pose:
# read (the right hand under its lower edge, tilted up toward the eyes), hung from the left hand by its top edge along the thigh
# while the right hand salutes, drinks or lies on the heart, and put away while both hands work or the body lies on the ground.
def slate_at(nm):
    o = bpy.data.objects.get(PRE + 'slatej')
    if not o: return
    if nm == 'down' or nm[0] == 'k': o.scale = (0.001, 0.001, 0.001); return
    o.scale = (1, 1, 1); bpy.context.view_layer.update()
    sd = 'L' if nm in ('drink', 'salute', 'heart', 'mourn') else 'R'
    hand = J('elbow.' + sd).matrix_world @ Vector((0, 0, -L2)); inv = J('root').matrix_world.inverted()
    if sd == 'R': o.location = inv @ (hand + Vector((0, 0.0, -0.012))); o.rotation_euler = (math.radians(55), 0, 0)
    else: o.location = inv @ (hand + Vector((0.03, 0, 0.03))); o.rotation_euler = (math.pi, 0, -math.pi / 2)
ROOTS = []
for name, kind, pre in (('soldier', 'soldier', 'so_'), ('vanguard', 'vanguard', 'vg_'), ('citizen_a', 'a', 'ca_'), ('citizen_b', 'b', 'cb_'), ('citizen_c', 'c', 'cc_'),
                        ('engineer', 'e', 'en_'), ('inspector', 'i', 'in_'), ('medic', 'm', 'me_'), ('pilot', 'p', 'pi_'), ('crew', 'w', 'cw_')):
    PRE = pre; CUR = coll(name); r = person(kind); OUT[name] = export(name, CUR, frames(kind in ('soldier', 'vanguard')), {'fit': 1.95}); ROOTS.append((pre, r))
POSES = [p_salute, lambda: p_drill(0.4), lambda: p_walk(1.2, 'none', False), p_drink, lambda: p_stand('none'), lambda: p_work(1), lambda: p_note(2), p_heart, lambda: p_run(1.2, False), p_mourn]
for i, (pre, r) in enumerate(ROOTS): PRE = pre; POSES[i](); r.location = (i * 0.95 - 4.3, 0, 0)
bpy.context.view_layer.update()
PIC = [shot('people', dist=13.5, target=(0, 0, 0.95), az=14, el=10, res=(1600, 560)), shot('people_back', dist=13.5, target=(0, 0, 0.95), az=166, el=10, res=(1600, 560))]
