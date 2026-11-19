
# MORE OF THE FOUNDRY: the Rocketeer, the Foreman (special: it jams) and the Siege Walker (boss: it drops fresh machines). Run straight after foundry.py.
# ---------------- Rocketeer: two racks of rockets on its shoulders; it stands and fires a barrage
PRE = 'rk_'; CUR = coll('foundry_rocketeer')
root = joint('root'); pel = joint('pelvis', (0, 0, 1.12), root)
box('rk_pelvis', (0.56, 0.4, 0.24), (0, 0, 0), m=dark, parent=pel, bevel=0.05)
bleg(pel, (0.22, 0, -0.07), 0.47, 0.47, 0.1, steel, dark, (0.3, 0.5, 0.12), black, sides=6, kneecap=(0.2, 0.08, 0.2), m_knee=iron)
cyl('rk_waist', (0, 0, 0.1), (0, 0, 0.28), 0.14, m=steel, parent=pel, sides=8)
tor = joint('torso', (0, 0, 0.26), pel)
box('rk_chest', (0.78, 0.54, 0.58), (0, 0, 0.3), m=iron, parent=tor, bevel=0.06, taper=1.1)
box('rk_drum', (0.5, 0.3, 0.5), (0, 0.38, 0.3), m=dark, parent=tor, bevel=0.06); box('rk_plate', (0.46, 0.05, 0.3), (0, -0.3, 0.34), m=iron2, parent=tor, bevel=0.02)
head = joint('head', (0, -0.1, 0.64), tor)
box('rk_skull', (0.24, 0.26, 0.2), (0, 0, 0.08), m=dark, parent=head, bevel=0.04, taper=0.8); blob('rk_eye', 0.07, (1, 0.5, 1), (0, -0.14, 0.09), sub=1, m=amber, parent=head)
cyl('rk_scope', (0.1, -0.05, 0.16), (0.1, -0.26, 0.16), 0.035, m=steel, parent=head, sides=6)
pod = joint('pod.L', (0.5, 0.02, 0.62), tor); pod.rotation_euler = (0.38, 0, 0)
box('rk_rack.L', (0.44, 0.7, 0.34), (0.06, 0, 0.14), m=dark, parent=pod, bevel=0.04)
for i in range(3):
    for k in range(2): cyl('rk_tube', (-0.08 + i * 0.14, -0.3, 0.06 + k * 0.16), (-0.08 + i * 0.14, -0.38, 0.06 + k * 0.16), 0.05, m=hot, parent=pod, sides=6)
box('rk_bracket.L', (0.16, 0.2, 0.2), (0.0, 0.0, -0.04), m=steel, parent=pod, bevel=0.03)
mirror_x(pod)
sho = joint('sho.L', (0.48, 0, 0.42), tor)
cyl('rk_upper.L', (0, 0, 0), (0.04, 0, -0.36), 0.075, m=steel, parent=sho, sides=6)
elb = joint('elbow.L', (0.04, 0, -0.36), sho)
cyl('rk_fore.L', (0, 0, 0), (0, 0, -0.3), 0.07, m=dark, parent=elb, sides=6)
for k in (-1, 1): spike('rk_claw.L', (k * 0.04, 0, -0.28), (k * 0.09, -0.04, -0.5), 0.04, sides=4, m=steel2, parent=elb, flat=0.6)
mirror_x(sho)
J('torso').rotation_euler = (0.1, 0, 0); J('elbow.L').rotation_euler = (-0.5, 0, 0); J('elbow.R').rotation_euler = (-0.5, 0, 0)
rest(root)
def rk_walk(ph): zero(J('root')); stride(ph, 0.4, 0.6, 0.2); shift('pelvis', z=0.03 * abs(math.sin(ph)) - 0.03); turn('torso', z=0.05 * math.sin(ph)); turn('head', z=-0.05 * math.sin(ph))
def rk_atk(): zero(J('root')); turn('torso', x=-0.18); turn('pod.L', x=0.2); turn('pod.R', x=0.2); turn('hip.L', x=0.15); turn('hip.R', x=-0.2); turn('knee.R', x=0.3)
F = {'stand': lambda: zero(J('root')), 'atk': rk_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: rk_walk(i / 8 * 2 * math.pi))
F['dead'] = dead('pelvis', seed=17); OUT['foundry_rocketeer'] = export('foundry_rocketeer', CUR, F); zero(root); R4 = root

# ---------------- Foreman: stands behind the line under a mast and a dish; nothing can be called down near it
PRE = 'fm_'; CUR = coll('foundry_foreman')
root = joint('root'); pel = joint('pelvis', (0, 0, 1.22), root)
box('fm_pelvis', (0.46, 0.34, 0.2), (0, 0, 0), m=dark, parent=pel, bevel=0.04)
bleg(pel, (0.16, 0, -0.06), 0.52, 0.52, 0.075, steel, dark, (0.18, 0.36, 0.1), black, sides=4, roll=Q, kneecap=(0.14, 0.06, 0.16), m_knee=iron)
loft('fm_coat', [((0, 0.02, 0.06), 0.3, 0.24), ((0, 0.06, -0.3), 0.4, 0.32), ((0, 0.1, -0.62), 0.46, 0.36)], sides=8, m=[iron2, iron], seg_mats=[0, 1], parent=pel, cap=False)
tor = joint('torso', (0, 0, 0.1), pel)
box('fm_chest', (0.6, 0.4, 0.62), (0, 0, 0.34), m=iron, parent=tor, bevel=0.05, taper=1.15)
for s in (1, -1):
    box('fm_board', (0.3, 0.3, 0.06), (s * 0.4, 0, 0.66), m=dark, parent=tor, bevel=0.02); blob('fm_lamp', 0.05, (1, 1, 1), (s * 0.5, -0.1, 0.71), sub=1, m=amber, parent=tor)
    for k in range(3): box('fm_medal', (0.05, 0.02, 0.07), (s * 0.12 + (k - 1) * 0.07 * s, -0.215, 0.5), m=amber if k == 1 else steel2, parent=tor)
head = joint('head', (0, -0.02, 0.7), tor)
cyl('fm_neck', (0, 0, -0.04), (0, 0, 0.05), 0.06, m=steel, parent=head, sides=6)
box('fm_skull', (0.22, 0.24, 0.2), (0, 0, 0.14), m=dark, parent=head, bevel=0.04); box('fm_visor', (0.2, 0.03, 0.045), (0, -0.125, 0.15), m=hot, parent=head)
box('fm_cap', (0.28, 0.3, 0.07), (0, 0, 0.27), m=iron2, parent=head, bevel=0.02); box('fm_peak', (0.26, 0.14, 0.025), (0, -0.2, 0.24), m=black, parent=head); box('fm_crown', (0.3, 0.3, 0.06), (0, 0.02, 0.33), m=iron, parent=head, bevel=0.02, taper=1.15)
mast = joint('mast', (0, 0.24, 0.5), tor)
box('fm_pack', (0.44, 0.2, 0.5), (0, 0, -0.1), m=dark, parent=mast, bevel=0.04); cyl('fm_pole', (0, 0, 0.1), (0, 0.06, 1.5), 0.035, m=steel, parent=mast, sides=6)
dish = joint('dish', (0, 0.06, 1.2), mast); dish.rotation_euler = (0.9, 0, 0)
loft('fm_dish', [((0, 0, 0), 0.05, 0.05), ((0, 0, 0.1), 0.34, 0.34), ((0, 0, 0.14), 0.42, 0.42)], sides=9, m=steel2, parent=dish, cap=False); spike('fm_feed', (0, 0, 0.02), (0, 0, 0.36), 0.03, sides=4, m=amber, parent=dish)
for i, (x, hh) in enumerate(((-0.16, 1.1), (0.16, 1.3), (0.0, 1.75))): spike('fm_aerial%d' % i, (x, 0.02, 0.1), (x * 1.6, 0.1, hh), 0.014, sides=4, m=steel, parent=mast)
blob('fm_beacon', 0.07, (1, 1, 1), (0, 0.06, 1.55), sub=1, m=hot, parent=mast)
sho = joint('sho.L', (0.38, 0, 0.56), tor)
blob('fm_cap.L', 0.1, (1, 1, 0.9), (0, 0, 0), sub=1, m=iron2, parent=sho); cyl('fm_upper.L', (0, 0, 0), (0, 0, -0.36), 0.055, m=steel, parent=sho, sides=6)
elb = joint('elbow.L', (0, 0, -0.36), sho); cyl('fm_fore.L', (0, 0, 0), (0, 0, -0.32), 0.05, m=dark, parent=elb, sides=6); box('fm_hand.L', (0.1, 0.1, 0.12), (0, 0, -0.36), m=steel, parent=elb, bevel=0.02)
mirror_x(sho)
cyl('fm_baton', (0, -0.02, -0.36), (0, -0.5, -0.4), 0.025, m=black, parent=J('elbow.R'), sides=5); blob('fm_baton_tip', 0.05, (1, 1, 1), (0, -0.52, -0.4), sub=1, m=amber, parent=J('elbow.R'))
J('sho.R').rotation_euler = (-0.5, 0, 0); J('elbow.R').rotation_euler = (-0.6, 0, 0); J('elbow.L').rotation_euler = (-0.2, 0, 0); J('sho.L').rotation_euler = (0.25, 0, 0)
rest(root)
def fm_walk(ph): zero(J('root')); stride(ph, 0.36, 0.55, 0.0); shift('pelvis', z=0.02 * abs(math.sin(ph)) - 0.02); turn('torso', z=0.04 * math.sin(ph)); turn('dish', z=ph * 0.5); turn('sho.R', x=0.06 * math.sin(ph))
def fm_atk(): zero(J('root')); turn('sho.R', x=-1.2); turn('elbow.R', x=0.5); turn('torso', x=-0.05, z=0.15); turn('dish', x=-0.4)
F = {'stand': lambda: zero(J('root')), 'atk': fm_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: fm_walk(i / 8 * 2 * math.pi))
F['dead'] = dead('pelvis', seed=15); OUT['foundry_foreman'] = export('foundry_foreman', CUR, F, {'fit': 2.6}); zero(root); R5 = root

# ---------------- Siege Walker: a works on four legs, a hatch under it that opens on fresh machines
PRE = 'sw_'; CUR = coll('foundry_siege')
root = joint('root'); body = joint('body', (0, 0, 4.4), root)
box('sw_hull', (3.2, 4.2, 1.8), (0, 0, 0), m=iron, parent=body, bevel=0.2, taper=0.88)
box('sw_band', (3.3, 4.3, 0.24), (0, 0, -0.5), m=dark, parent=body, bevel=0.05)
box('sw_bay', (2.2, 2.6, 0.7), (0, 0.1, -1.15), m=dark, parent=body, bevel=0.1); box('sw_hatch', (1.5, 1.9, 0.08), (0, 0.1, -1.52), m=hot, parent=body)
for i in range(4): box('sw_hatchbar', (1.6, 0.1, 0.12), (0, -0.62 + i * 0.48, -1.54), m=black, parent=body)
box('sw_furnace', (1.8, 0.1, 0.8), (0, -2.1, -0.2), m=hot, parent=body)
for i in range(6): box('sw_bar', (0.12, 0.16, 0.9), (-0.75 + i * 0.3, -2.14, -0.2), m=black, parent=body)
box('sw_brow', (2.4, 0.5, 0.36), (0, -2.0, 0.42), m=iron2, parent=body, bevel=0.08)
bridge = joint('bridge', (0, -1.2, 0.9), body)
box('sw_tower', (1.5, 1.3, 1.0), (0, 0, 0.5), m=iron2, parent=bridge, bevel=0.12, taper=0.8); box('sw_eye', (1.0, 0.06, 0.16), (0, -0.6, 0.6), m=hot, parent=bridge); box('sw_cap', (1.3, 1.1, 0.14), (0, 0, 1.06), m=dark, parent=bridge, bevel=0.04)
spike('sw_aerial', (0.4, 0.3, 1.1), (0.5, 0.4, 2.3), 0.04, sides=4, m=steel, parent=bridge)
for i, (x, y, hh) in enumerate(((-0.9, 1.2, 2.3), (0.0, 1.5, 2.9), (0.9, 1.2, 2.3))):
    cyl('sw_stack%d' % i, (x, y, 0.8), (x, y + 0.12, 0.8 + hh), 0.34, m=dark, parent=body, sides=8, r2=0.26); cyl('sw_stack_tip%d' % i, (x, y + 0.12, 0.8 + hh), (x, y + 0.125, 0.92 + hh), 0.32, m=hot, parent=body, sides=8)
for s in (1, -1):
    loft('sw_tank', [((s * 1.5, -0.9, 0.5), 0.03, 0.03), ((s * 1.5, -0.8, 0.5), 0.5, 0.5), ((s * 1.5, 1.0, 0.5), 0.5, 0.5), ((s * 1.5, 1.1, 0.5), 0.03, 0.03)], sides=8, m=steel, parent=body)
    for k in range(3): loft('sw_tankband', [((s * 1.5, -0.5 + k * 0.6, 0.5), 0.53, 0.53), ((s * 1.5, -0.4 + k * 0.6, 0.5), 0.53, 0.53)], sides=8, m=black, parent=body, cap=False)
    blob('sw_lamp', 0.16, (1, 0.6, 1), (s * 1.2, -2.12, 0.45), sub=1, m=amber, parent=body)
gun = joint('gun.L', (1.75, -1.1, -0.1), body)
box('sw_mount.L', (0.6, 0.8, 0.7), (0, 0, 0), m=iron2, parent=gun, bevel=0.1); cyl('sw_barrel.L', (0.05, -0.3, 0), (0.05, -2.3, 0.05), 0.24, m=black, parent=gun, sides=8, r2=0.19); cyl('sw_muzzle.L', (0.05, -2.3, 0.05), (0.05, -2.42, 0.05), 0.24, m=hot, parent=gun, sides=8)
mirror_x(gun)
crane = joint('crane', (0, 0.6, 0.9), body)
cyl('sw_jib', (0, 0, 0), (0, -1.6, 1.9), 0.12, m=steel, parent=crane, sides=6); cyl('sw_jib2', (0, -1.6, 1.9), (0, -3.4, 1.5), 0.09, m=steel, parent=crane, sides=6); cyl('sw_cable', (0, -3.4, 1.5), (0, -3.4, 0.4), 0.025, m=black, parent=crane, sides=4); spike('sw_hook', (0, -3.4, 0.4), (0.25, -3.4, 0.0), 0.08, sides=4, m=steel2, parent=crane)
for i, (y, rz) in enumerate(((-1.5, -0.4), (1.5, 0.4))):
    leg(str(i), body, (1.45, y, -0.45), rz, 1.7, 0.9, 4.4 - 0.45 + 0.9, 0.34, steel, dark, sides=4, roll=Q, reach2=0.35, tip=0.75, foot=(1.3, 1.5, 0.36), m_foot=black)
for sd in ('L', 'R'):
    for i in range(2): box('sw_kneeplate', (0.7, 0.7, 0.7), (0, 0, 0), m=iron2, parent=J('knee%d.%s' % (i, sd)), bevel=0.14); box('sw_hipplate', (0.6, 0.6, 0.6), (0, 0, 0), m=iron, parent=J('hip%d.%s' % (i, sd)), bevel=0.12)
rest(root)
def sw_walk(ph):
    zero(J('root'))
    for i in range(2):
        for s, sd in ((1, 'L'), (-1, 'R')):
            a = ph + (0 if (i + (0 if s > 0 else 1)) % 2 == 0 else math.pi)
            turn('hip%d.%s' % (i, sd), y=-s * 0.1 * max(0.0, math.cos(a)), z=-s * 0.16 * math.sin(a))
    shift('body', z=0.06 * math.sin(2 * ph)); turn('body', y=0.02 * math.sin(ph)); turn('bridge', z=0.2 * math.sin(ph * 0.5)); turn('crane', z=0.12 * math.sin(ph * 0.5 + 1))
def sw_atk(): zero(J('root')); shift('gun.L', y=0.35); shift('gun.R', y=0.35); turn('body', x=-0.03); shift('body', y=0.1)
F = {'stand': lambda: zero(J('root')), 'atk': sw_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: sw_walk(i / 8 * 2 * math.pi))
F['dead'] = dead('body', seed=13); OUT['foundry_siege'] = export('foundry_siege', CUR, F, {'fit': 8.0}); zero(root); R6 = root
