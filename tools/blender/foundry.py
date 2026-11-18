
# THE FOUNDRY: Drudge (light), Enforcer (medium), Crusher (heavy). Run in Blender after gc_kit.py.
import math
wipe()
iron = mat('fd_iron', '#7a2e26', metal=0.3, rough=0.6); iron2 = mat('fd_iron_lit', '#9a3c30', metal=0.3, rough=0.6); dark = mat('fd_dark', '#2a1512', metal=0.4); steel = mat('fd_steel', '#6e6e74', metal=0.6, rough=0.45)
steel2 = mat('fd_steel_lit', '#96969c', metal=0.6, rough=0.4); hot = mat('fd_hot', '#ff5a3a', emit=2.5); amber = mat('fd_amber', '#ffb040', emit=2.0); black = mat('fd_black', '#17171b', metal=0.3)
OUT = {}; Q = math.pi / 4

# ---------------- Drudge: a gaunt worker put in the line, one eye, a gun where a hand was
PRE = 'dr_'; CUR = coll('foundry_L_drudge')
root = joint('root'); pel = joint('pelvis', (0, 0, 0.98), root)
box('dr_pelvis', (0.34, 0.2, 0.16), (0, 0, 0), m=dark, parent=pel, bevel=0.03)
bleg(pel, (0.13, 0, -0.05), 0.44, 0.42, 0.06, steel, dark, (0.13, 0.26, 0.07), black, sides=4, roll=Q, kneecap=(0.1, 0.05, 0.12), m_knee=iron)
cyl('dr_spine', (0, 0.02, 0.06), (0, 0.02, 0.28), 0.05, m=steel, parent=pel, sides=6)
tor = joint('torso', (0, 0, 0.27), pel)
box('dr_chest', (0.44, 0.27, 0.44), (0, 0, 0.24), m=iron, parent=tor, bevel=0.035, taper=1.22)
box('dr_plate', (0.3, 0.04, 0.22), (0, -0.155, 0.3), m=iron2, parent=tor, bevel=0.012)
box('dr_vent', (0.16, 0.02, 0.05), (0, -0.18, 0.2), m=amber, parent=tor)
cyl('dr_stack', (0.12, 0.15, 0.3), (0.14, 0.22, 0.74), 0.045, m=dark, parent=tor, sides=6); cyl('dr_stack_tip', (0.14, 0.22, 0.74), (0.14, 0.225, 0.78), 0.05, m=hot, parent=tor, sides=6)
box('dr_pack', (0.3, 0.12, 0.3), (0, 0.18, 0.24), m=dark, parent=tor, bevel=0.02)
head = joint('head', (0, -0.01, 0.5), tor)
cyl('dr_neck', (0, 0, -0.04), (0, 0, 0.04), 0.045, m=steel, parent=head, sides=6)
box('dr_skull', (0.2, 0.22, 0.19), (0, 0, 0.12), m=dark, parent=head, bevel=0.035, taper=0.82)
box('dr_eye', (0.13, 0.02, 0.035), (0, -0.112, 0.13), m=hot, parent=head)
spike('dr_aerial', (0.07, 0.06, 0.2), (0.09, 0.1, 0.5), 0.012, sides=4, m=steel, parent=head)
sho = joint('sho.L', (0.3, 0, 0.4), tor)
blob('dr_cap.L', 0.1, (1, 1, 0.9), (0, 0, 0.02), sub=1, m=iron2, parent=sho)
loft('dr_upper.L', [((0, 0, 0), 0.05, 0.05, Q), ((0, 0, -0.32), 0.04, 0.04, Q)], sides=4, m=steel, parent=sho)
elb = joint('elbow.L', (0, 0, -0.32), sho)
loft('dr_fore.L', [((0, 0, 0), 0.05, 0.05, Q), ((0, 0, -0.28), 0.045, 0.045, Q)], sides=4, m=dark, parent=elb)
mirror_x(sho)
box('dr_hand', (0.1, 0.1, 0.13), (0, 0, -0.33), m=steel, parent=J('elbow.L'), bevel=0.02)
cyl('dr_gun', (0, 0, -0.26), (0, 0, -0.66), 0.05, m=black, parent=J('elbow.R'), sides=6, r2=0.035); cyl('dr_muzzle', (0, 0, -0.66), (0, 0, -0.69), 0.045, m=hot, parent=J('elbow.R'), sides=6)
box('dr_drum', (0.12, 0.12, 0.12), (0, 0.07, -0.3), m=iron, parent=J('elbow.R'), bevel=0.02)
J('elbow.R').rotation_euler = (-1.35, 0, 0); J('sho.R').rotation_euler = (-0.12, 0, 0); J('elbow.L').rotation_euler = (-0.25, 0, 0); J('torso').rotation_euler = (0.08, 0, 0)
rest(root)
def dr_walk(ph):
    zero(J('root')); stride(ph, 0.5, 0.75, 0.0); turn('sho.L', x=0.45 * math.sin(ph)); turn('sho.R', x=0.06 * math.sin(ph + math.pi))
    shift('pelvis', z=0.02 * abs(math.sin(ph)) - 0.02); turn('torso', z=0.07 * math.sin(ph)); turn('head', z=-0.07 * math.sin(ph))
def dr_atk(): zero(J('root')); turn('sho.R', x=-0.2); turn('elbow.R', x=-0.12); turn('torso', x=-0.06, z=0.12); turn('sho.L', x=0.3)
F = {'stand': lambda: zero(J('root')), 'atk': dr_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: dr_walk(i / 8 * 2 * math.pi))
OUT['foundry_L'] = export('foundry_L', CUR, F); zero(root); R1 = root

# ---------------- Enforcer: a wall on two legs, a shield on one arm and a cannon for the other
PRE = 'en_'; CUR = coll('foundry_M_enforcer')
root = joint('root'); pel = joint('pelvis', (0, 0, 1.2), root)
box('en_pelvis', (0.62, 0.42, 0.26), (0, 0, 0), m=dark, parent=pel, bevel=0.05)
bleg(pel, (0.25, 0, -0.08), 0.5, 0.5, 0.12, iron, dark, (0.28, 0.46, 0.12), black, sides=6, kneecap=(0.22, 0.08, 0.2), m_knee=steel)
for sd in ('L', 'R'): box('en_shin_plate', (0.2, 0.06, 0.36), (0, -0.12, -0.26), m=iron2, parent=J('knee.' + sd), bevel=0.02)
cyl('en_waist', (0, 0, 0.1), (0, 0, 0.3), 0.16, m=steel, parent=pel, sides=8)
tor = joint('torso', (0, 0, 0.28), pel)
box('en_chest', (0.98, 0.62, 0.7), (0, 0, 0.36), m=iron, parent=tor, bevel=0.07, taper=1.18)
box('en_plate', (0.62, 0.06, 0.4), (0, -0.36, 0.42), m=iron2, parent=tor, bevel=0.03)
blob('en_core', 0.13, (1, 0.6, 1), (0, -0.4, 0.42), sub=1, m=amber, parent=tor)
box('en_collar', (0.6, 0.5, 0.14), (0, 0.02, 0.76), m=dark, parent=tor, bevel=0.04)
for s in (1, -1):
    cyl('en_stack', (s * 0.26, 0.3, 0.5), (s * 0.3, 0.42, 1.12), 0.08, m=dark, parent=tor, sides=6); cyl('en_stack_tip', (s * 0.3, 0.42, 1.12), (s * 0.3, 0.425, 1.17), 0.09, m=hot, parent=tor, sides=6)
head = joint('head', (0, -0.14, 0.8), tor)
box('en_skull', (0.28, 0.3, 0.22), (0, 0, 0.06), m=dark, parent=head, bevel=0.05, taper=0.8)
box('en_visor', (0.2, 0.03, 0.05), (0, -0.155, 0.07), m=hot, parent=head)
sho = joint('sho.L', (0.62, 0, 0.6), tor)
blob('en_pauldron.L', 0.27, (1.05, 1.2, 0.85), (0.03, 0, 0.06), sub=1, m=iron2, parent=sho)
spike('en_stud.L', (0.12, 0, 0.24), (0.22, 0, 0.5), 0.06, sides=4, m=steel, parent=sho)
cyl('en_upper.L', (0, 0, 0), (0, 0, -0.42), 0.1, m=steel, parent=sho, sides=6, r2=0.085)
elb = joint('elbow.L', (0, 0, -0.42), sho)
cyl('en_fore.L', (0, 0, 0), (0, 0, -0.36), 0.1, m=dark, parent=elb, sides=6)
mirror_x(sho)
box('en_fist', (0.2, 0.2, 0.2), (0, 0, -0.42), m=steel, parent=J('elbow.L'), bevel=0.04)
box('en_shield', (0.07, 0.62, 0.9), (0.14, -0.05, -0.3), m=iron, parent=J('elbow.L'), bevel=0.03, taper=0.8); box('en_shield_boss', (0.05, 0.3, 0.42), (0.19, -0.05, -0.3), m=iron2, parent=J('elbow.L'), bevel=0.02)
cyl('en_cannon', (0, 0, -0.2), (0, 0, -0.92), 0.14, m=black, parent=J('elbow.R'), sides=8, r2=0.11); cyl('en_muzzle', (0, 0, -0.92), (0, 0, -0.97), 0.12, m=hot, parent=J('elbow.R'), sides=8)
box('en_breech', (0.3, 0.3, 0.26), (0, 0.02, -0.3), m=iron, parent=J('elbow.R'), bevel=0.04)
J('elbow.R').rotation_euler = (-1.3, 0, 0); J('sho.R').rotation_euler = (-0.1, 0, 0); J('elbow.L').rotation_euler = (-0.5, 0, 0); J('sho.L').rotation_euler = (-0.15, 0, 0); J('torso').rotation_euler = (0.13, 0, 0)
rest(root)
def en_walk(ph):
    zero(J('root')); stride(ph, 0.4, 0.6, 0.0); turn('sho.L', x=0.14 * math.sin(ph)); turn('sho.R', x=0.05 * math.sin(ph + math.pi))
    shift('pelvis', z=0.03 * abs(math.sin(ph)) - 0.03); turn('pelvis', y=0.04 * math.sin(ph)); turn('torso', z=0.06 * math.sin(ph)); turn('head', z=-0.06 * math.sin(ph))
def en_atk(): zero(J('root')); turn('sho.R', x=-0.22); turn('elbow.R', x=-0.1); turn('torso', x=-0.08, z=0.1); turn('sho.L', x=-0.5)
F = {'stand': lambda: zero(J('root')), 'atk': en_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: en_walk(i / 8 * 2 * math.pi))
OUT['foundry_M'] = export('foundry_M', CUR, F); zero(root); R2 = root

# ---------------- Crusher: a furnace on four legs, claws out front, stacks smoking
PRE = 'cr_'; CUR = coll('foundry_H_crusher')
root = joint('root'); body = joint('body', (0, 0, 1.3), root)
box('cr_hull', (1.5, 2.1, 0.9), (0, 0, 0), m=iron, parent=body, bevel=0.1, taper=0.86)
box('cr_deck', (1.1, 1.3, 0.22), (0, 0.15, 0.52), m=dark, parent=body, bevel=0.05)
box('cr_brow', (1.3, 0.3, 0.2), (0, -1.0, 0.3), m=iron2, parent=body, bevel=0.05)
box('cr_furnace', (0.9, 0.06, 0.42), (0, -1.06, -0.06), m=hot, parent=body)
for i in range(4): box('cr_bar%d' % i, (0.07, 0.1, 0.5), (-0.33 + i * 0.22, -1.08, -0.06), m=black, parent=body)
for s in (1, -1):
    box('cr_skirt', (0.1, 1.5, 0.5), (s * 0.78, 0.05, -0.1), m=iron2, parent=body, bevel=0.03)
    cyl('cr_stack', (s * 0.34, 0.62, 0.6), (s * 0.36, 0.7, 1.5), 0.15, m=dark, parent=body, sides=8, r2=0.12); cyl('cr_stack_tip', (s * 0.36, 0.7, 1.5), (s * 0.36, 0.705, 1.57), 0.15, m=hot, parent=body, sides=8)
    blob('cr_lamp', 0.08, (1, 0.6, 1), (s * 0.55, -1.07, 0.3), sub=1, m=amber, parent=body)
loft('cr_boiler', [((0, -0.35, 0.78), 0.02, 0.02), ((0, -0.3, 0.78), 0.3, 0.3), ((0, 0.45, 0.78), 0.3, 0.3), ((0, 0.5, 0.78), 0.02, 0.02)], sides=8, m=steel, parent=body)
for i in range(3): loft('cr_band%d' % i, [((0, -0.2 + i * 0.28, 0.78), 0.32, 0.32), ((0, -0.14 + i * 0.28, 0.78), 0.32, 0.32)], sides=8, m=black, parent=body, cap=False)
tur = joint('turret', (0, -0.72, 0.56), body)
box('cr_sensor', (0.4, 0.4, 0.24), (0, 0, 0.1), m=dark, parent=tur, bevel=0.05, taper=0.75); box('cr_eye', (0.26, 0.03, 0.06), (0, -0.2, 0.1), m=hot, parent=tur)
arm = joint('claw.L', (0.52, -1.0, -0.2), body)
cyl('cr_arm.L', (0, 0, 0), (0.1, -0.7, -0.1), 0.13, m=steel, parent=arm, sides=6, r2=0.1)
wr = joint('wrist.L', (0.1, -0.7, -0.1), arm)
box('cr_knuckle.L', (0.3, 0.26, 0.26), (0, -0.05, 0), m=dark, parent=wr, bevel=0.05)
loft('cr_jaw_a.L', [((0.1, -0.1, 0), 0.07, 0.11), ((0.2, -0.45, 0), 0.06, 0.1), ((0.05, -0.8, 0), 0.01, 0.03)], sides=4, m=steel2, parent=wr)
loft('cr_jaw_b.L', [((-0.1, -0.1, 0), 0.07, 0.11), ((-0.2, -0.45, 0), 0.06, 0.1), ((-0.05, -0.8, 0), 0.01, 0.03)], sides=4, m=steel2, parent=wr)
mirror_x(arm)
for i, (y, rz) in enumerate(((-0.72, -0.35), (0.74, 0.35))):
    leg(str(i), body, (0.72, y, -0.2), rz, 0.62, 0.3, 1.3 - 0.2 + 0.3, 0.16, steel, dark, sides=4, roll=Q, reach2=0.45, tip=0.7, foot=(0.5, 0.6, 0.16), m_foot=black)
for sd in ('L', 'R'):
    for i in range(2): box('cr_kneeplate', (0.3, 0.3, 0.3), (0, 0, 0), m=iron2, parent=J('knee%d.%s' % (i, sd)), bevel=0.06)
rest(root)
def cr_walk(ph):
    zero(J('root'))
    for i in range(2):
        for s, sd in ((1, 'L'), (-1, 'R')):
            a = ph + (0 if (i + (0 if s > 0 else 1)) % 2 == 0 else math.pi)
            turn('hip%d.%s' % (i, sd), y=-s * 0.14 * max(0.0, math.cos(a)), z=-s * 0.2 * math.sin(a))
    shift('body', z=0.03 * math.sin(2 * ph)); turn('body', y=0.025 * math.sin(ph)); turn('turret', z=0.25 * math.sin(ph * 0.5 + 0.4))
    turn('claw.L', z=0.1 * math.sin(ph)); turn('claw.R', z=0.1 * math.sin(ph))
def cr_atk(): zero(J('root')); turn('claw.L', z=0.35, x=0.2); turn('claw.R', z=-0.35, x=0.2); turn('body', x=0.06); shift('body', y=-0.12)
F = {'stand': lambda: zero(J('root')), 'atk': cr_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: cr_walk(i / 8 * 2 * math.pi))
OUT['foundry_H'] = export('foundry_H', CUR, F); zero(root); R3 = root

PRE = 'dr_'; dr_walk(1.0); PRE = 'en_'; en_walk(2.4); PRE = 'cr_'; cr_walk(0.7)
sc = [5.5 / max(OUT['foundry_L']['size']), 10 / max(OUT['foundry_M']['size']), 17.5 / max(OUT['foundry_H']['size'])]
PIC = [lineup('foundry_lineup', [R1, R2, R3], [8, 16, 0], sc, dist=62, target=(12, 0.0, 4.0), az=24, el=18, res=(1280, 640)),
       shot('foundry_top', dist=70, target=(12, 0.0, 2.0), az=0, el=62, res=(1280, 640))]
