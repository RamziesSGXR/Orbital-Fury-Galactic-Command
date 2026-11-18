
# THE FLEET'S OWN PEOPLE: the soldier (the infantry), the Vanguard (the squad), three citizens. Run in Blender after gc_kit.py.
# Materials named uniform, uniform_dark, kit, helmet, armband and trim are dressed in the player's fleet colours by the game.
import math
wipe()
uni = mat('uniform', '#5d6a4a'); unid = mat('uniform_dark', '#49543a'); kit = mat('kit', '#3a422e'); helm = mat('helmet', '#4c5a3c'); band = mat('armband', '#e0b21c'); trim = mat('trim', '#2f8f9c')
boots = mat('c_boots', '#26262a'); gunm = mat('c_gun', '#1c1e20', metal=0.5, rough=0.45); wood = mat('c_wood', '#5a4630'); visor = mat('c_visor', '#12181c', metal=0.4, rough=0.25)
plate = mat('c_plate', '#3a4048', metal=0.45, rough=0.45); plated = mat('c_plate_dark', '#262b31', metal=0.4); lamp = mat('c_lamp', '#59e0ff', emit=2.5); strap = mat('c_strap', '#2e2a22'); eyem = mat('c_eye', '#1c1a1a')
SKIN = [mat('c_skin_a', '#c99670'), mat('c_skin_b', '#8d5a3c'), mat('c_skin_c', '#f0c8a4'), mat('c_skin_d', '#b97f58'), mat('c_skin_e', '#e0b48c')]
HAIR = [mat('c_hair_a', '#3a2a1c'), mat('c_hair_b', '#17120e'), mat('c_hair_c', '#b98a4a')]
# the citizens: colonists of a company fleet. A technician in a pale suit and headset, a dock hand in a harness and rebreather, a company officer in a long coat with a lit hem.
CLOTH = {'a': (mat('c_suit_a', '#d5dade'), mat('c_suit_a_legs', '#4a5562')), 'b': (mat('c_suit_b', '#56606b'), mat('c_suit_b_legs', '#3a424c')), 'c': (mat('c_coat_c', '#27324a'), mat('c_coat_c_legs', '#1c2334'))}
hivis = mat('c_hivis', '#e8a22a'); glow = mat('c_glow', '#7af6ff', emit=2.5); amberl = mat('c_amber', '#ffb040', emit=2.0); shellm = mat('c_shell', '#8a939c', metal=0.3, rough=0.5); sole = mat('c_sole', '#c8ced2'); lining = mat('c_lining', '#c9d2dc')
OUT = {}; L1, L2 = 0.29, 0.27; GRIP = (0, 0.0, -0.05); GUARD = (0, -0.2, -0.03)

def person(kind):
    armed = kind in ('soldier', 'vanguard'); van = kind == 'vanguard'; cz = kind[-1] if not armed else ''
    top, legs = (plate, plated) if van else (uni, unid) if armed else CLOTH[cz]
    skin = SKIN[{'soldier': 0, 'vanguard': 3, 'a': 4, 'b': 1, 'c': 2}[kind if armed else cz]]
    k = 1.1 if van else 1.0
    root = joint('root'); pel = joint('pelvis', (0, 0, 1.0), root)
    loft(PRE + 'hips', [((0, 0, 0.07), 0.165 * k, 0.115 * k), ((0, 0, -0.1), 0.155 * k, 0.11 * k)], sides=8, m=legs, parent=pel)
    bleg(pel, (0.095, 0, -0.07), 0.42, 0.42, 0.085 * k, legs, legs, (0.11, 0.27, 0.09), boots, sides=7, kneecap=(0.115, 0.05, 0.13) if (armed or cz == 'b') else None, m_knee=trim if van else hivis if cz == 'b' else kit)
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
            loft(PRE + 'coat', [((0, 0, 0.08), 0.175, 0.125), ((0, 0.01, -0.3), 0.23, 0.17), ((0, 0.02, -0.66), 0.29, 0.21)], sides=10, m=top, parent=pel, cap=False)
            loft(PRE + 'hem', [((0, 0.02, -0.64), 0.295, 0.215), ((0, 0.02, -0.68), 0.295, 0.215)], sides=10, m=glow, parent=pel, cap=False)
            box(PRE + 'coatfront', (0.07, 0.02, 0.6), (0.05, -0.19, -0.3), m=lining, parent=pel, rot=(0.115, 0, 0))
            box(PRE + 'chestfront', (0.07, 0.02, 0.4), (0.05, -0.128, 0.22), m=lining, parent=tor)
            loft(PRE + 'mantle', [((0, 0.01, 0.3), 0.26, 0.17), ((0, 0.01, 0.4), 0.235, 0.15), ((0, 0.005, 0.46), 0.17, 0.115)], sides=9, m=trim, parent=tor, cap=False)
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
        hair = HAIR[{'a': 0, 'b': 1, 'c': 2}[cz]]
        loft(PRE + 'hair', [((0, 0.02, 0.15), 0.112, 0.125), ((0, 0.025, 0.22), 0.105, 0.115), ((0, 0.03, 0.275), 0.04, 0.045)], sides=8, m=hair, parent=head)
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
    sho = joint('sho.L', (0.2 * k, 0, 0.43), tor)
    blob(PRE + 'shoulder.L', 0.075 * k, (1, 1, 0.9), (0, 0, 0), sub=1, m=top, parent=sho)
    loft(PRE + 'upper.L', [((0, 0, 0), 0.058 * k, 0.058 * k), ((0, 0, -L1), 0.048 * k, 0.048 * k)], sides=7, m=top, parent=sho)
    if armed and not van: loft(PRE + 'band.L', [((0, 0, -0.1), 0.064, 0.064), ((0, 0, -0.16), 0.062, 0.062)], sides=7, m=band, parent=sho, cap=False)
    if van: blob(PRE + 'pauldron.L', 0.125, (1.05, 1.15, 0.72), (0.02, 0, 0.04), sub=1, m=trim, parent=sho)
    elb = joint('elbow.L', (0, 0, -L1), sho)
    loft(PRE + 'fore.L', [((0, 0, 0), 0.05 * k, 0.05 * k), ((0, 0, -L2 + 0.03), 0.04 * k, 0.04 * k)], sides=7, m=plate if van else top, parent=elb)
    blob(PRE + 'hand.L', 0.045, (1, 1, 1.1), (0, 0, -L2), sub=1, m=boots if (armed or cz == 'b') else skin, parent=elb)
    if not armed: loft(PRE + 'cuff.L', [((0, 0, -L2 + 0.1), 0.05, 0.05), ((0, 0, -L2 + 0.04), 0.047, 0.047)], sides=7, m=legs if cz != 'c' else lining, parent=elb, cap=False)
    mirror_x(sho)
    if not armed:     # a lit band on the left wrist; the officer carries a slate
        box(PRE + 'wristband', (0.07, 0.06, 0.05), (0, -0.02, -L2 + 0.11), m=shellm, parent=J('elbow.L'), bevel=0.012); box(PRE + 'wristface', (0.04, 0.012, 0.03), (0, -0.055, -L2 + 0.11), m=glow, parent=J('elbow.L'))
        if cz == 'c': box(PRE + 'slate', (0.16, 0.015, 0.22), (0.0, -0.06, -L2 + 0.02), m=legs, parent=J('elbow.R'), bevel=0.006); box(PRE + 'slateface', (0.13, 0.008, 0.18), (0.0, -0.071, -L2 + 0.02), m=glow, parent=J('elbow.R'))
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
    else: at('gun', (-0.1, -0.2, 0.2), (0.42, 0, 0.6))
    reach(J('sho.R'), J('elbow.R'), wpt('gun', GRIP), L1, L2, pole=(-0.7, 0.5, -0.6)); reach(J('sho.L'), J('elbow.L'), wpt('gun', GUARD), L1, L2, pole=(0.5, 0.2, -1))
def swing(ph):
    turn('sho.L', x=0.45 * math.sin(ph)); turn('sho.R', x=-0.45 * math.sin(ph)); turn('elbow.L', x=-0.3 - 0.15 * math.sin(ph)); turn('elbow.R', x=-0.3 + 0.15 * math.sin(ph))
    if PRE == 'cc_': turn('sho.R', x=-0.25 + 0.45 * math.sin(ph) * 0.8); turn('elbow.R', x=-1.1 - 0.3 + 0.15 * math.sin(ph) * -1)     # the slate is carried up, not swung
def p_stand(mode='ready'):
    zero(J('root')); turn('elbow.L', x=-0.12); turn('elbow.R', x=-0.12); hold(mode)
    if PRE == 'cc_': turn('sho.R', x=-0.3); turn('elbow.R', x=-1.25); turn('head', x=0.18)     # reading the slate
def p_walk(ph, mode='ready', armed=True):
    zero(J('root')); stride(ph, 0.5, 0.8, 0.0); shift('pelvis', z=0.03 * abs(math.sin(ph)) - 0.03); turn('torso', z=0.07 * math.sin(ph) * (0.4 if mode == 'aim' else 1), x=0.05); turn('head', z=-0.06 * math.sin(ph))
    if armed: hold(mode)
    else: swing(ph)
def p_kneel(): zero(J('root')); shift('pelvis', z=-0.47); turn('hip.L', x=-1.45); turn('knee.L', x=1.45); turn('hip.R', x=0.12); turn('knee.R', x=1.5); turn('torso', x=0.1); hold('aim')
def p_down():
    zero(J('root')); turn('pelvis', x=-1.5708); shift('pelvis', z=-0.86); turn('sho.L', y=-1.1); turn('sho.R', y=1.2, x=0.3); turn('elbow.L', x=-0.5); turn('knee.L', x=0.6); turn('hip.L', x=-0.3, y=-0.15); turn('hip.R', y=0.12); turn('head', z=0.4); hold('gone')
def p_hit(): zero(J('root')); turn('torso', x=-0.3, z=0.25); turn('head', x=-0.25); turn('hip.L', x=0.2); turn('knee.L', x=0.3); shift('pelvis', y=0.06); hold('ready')

def frames(armed):
    F = {'stand': (lambda: p_stand('ready')) if armed else (lambda: p_stand('none')), 'down': p_down}
    for i in range(8): F['w%d' % i] = (lambda i=i: p_walk(i / 8 * 2 * math.pi, 'ready', armed))
    if armed:
        F['aim'] = lambda: p_stand('aim'); F['kneel'] = p_kneel; F['hit'] = p_hit
        for i in range(8): F['a%d' % i] = (lambda i=i: p_walk(i / 8 * 2 * math.pi, 'aim', True))
    return F
ROOTS = []
for name, kind, pre in (('soldier', 'soldier', 'so_'), ('vanguard', 'vanguard', 'vg_'), ('citizen_a', 'a', 'ca_'), ('citizen_b', 'b', 'cb_'), ('citizen_c', 'c', 'cc_')):
    PRE = pre; CUR = coll(name); r = person(kind); OUT[name] = export(name, CUR, frames(kind in ('soldier', 'vanguard')), {'fit': 1.95}); ROOTS.append((pre, r))
POSES = [lambda: p_stand('ready'), lambda: p_stand('aim'), lambda: p_walk(1.2, 'none', False), lambda: p_walk(4.0, 'none', False), lambda: p_stand('none')]
for i, (pre, r) in enumerate(ROOTS): PRE = pre; POSES[i](); r.location = (i * 0.95 - 1.9, 0, 0)
bpy.context.view_layer.update()
PIC = [shot('people', dist=8.2, target=(0, 0, 0.95), az=20, el=12, res=(1280, 640)), shot('people_side', dist=8.2, target=(0, 0, 0.95), az=75, el=10, res=(1280, 640))]
