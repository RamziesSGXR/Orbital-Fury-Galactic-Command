
# MORE OF THE TALON: the Bombardier (a mortar), the Herd Beast (special: it soaks up fire) and the Thunder Lizard (boss: shielded, a great beam).
# ---------------- Bombardier: a heavy-set lizard with a bone mortar on its shoulder and a satchel of crystal shells
PRE = 'bm_'; CUR = coll('talon_bombardier')
root = joint('root'); pel = joint('pelvis', (0, 0, 0.8), root)
loft('bm_hips', [((0, -0.1, 0.02), 0.17, 0.14), ((0, 0.12, 0.0), 0.18, 0.15)], sides=7, m=hide, parent=pel)
box('bm_cloth', (0.26, 0.03, 0.3), (0, -0.17, -0.14), m=leather, parent=pel, taper=0.7)
bleg(pel, (0.14, 0, -0.02), 0.38, 0.4, 0.085, hide, dark, (0.14, 0.34, 0.07), bone)
for sd in ('L', 'R'): J('hip.' + sd).rotation_euler = (-0.5, 0, 0); J('knee.' + sd).rotation_euler = (0.95, 0, 0)
tail(pel, (0, 0.12, 0.02), (0.32, 0.32, 0.3), (0.13, 0.1, 0.06, 0.004), [hide, dark], droop=0.06); J('tail0').rotation_euler = (-0.2, 0, 0)
tor = joint('torso', (0, -0.02, 0.1), pel); tor.rotation_euler = (0.4, 0, 0)
loft('bm_chest', [((0, 0, 0), 0.18, 0.15), ((0, 0, 0.24), 0.26, 0.19), ((0, 0, 0.46), 0.22, 0.16), ((0, 0, 0.53), 0.1, 0.09)], sides=8, m=[hide, hide2], seg_mats=[0, 1, 0], parent=tor)
box('bm_breast', (0.34, 0.05, 0.26), (0, -0.19, 0.28), m=bone, parent=tor, bevel=0.015, taper=0.75); box('bm_belt', (0.44, 0.34, 0.07), (0, 0, 0.06), m=leather, parent=tor, bevel=0.02)
box('bm_satchel', (0.22, 0.14, 0.24), (-0.26, 0.02, 0.02), m=leather, parent=tor, bevel=0.03)
for i in range(3): spike('bm_shell%d' % i, (-0.32 + i * 0.06, 0.0, 0.12), (-0.32 + i * 0.06, 0.0, 0.3), 0.03, sides=4, m=cyan, parent=tor)
neck = joint('neck', (0, -0.02, 0.53), tor); neck.rotation_euler = (-0.35, 0, 0)
loft('bm_neck', [((0, 0, -0.03), 0.09, 0.09), ((0, -0.02, 0.1), 0.085, 0.085)], sides=6, m=hide, parent=neck)
hd = lizard_head(neck, (0, -0.03, 0.14), 1.15, crest=4)
tube = joint('tube', (0.24, 0.05, 0.5), tor); tube.rotation_euler = (-0.95, 0, 0)
cyl('bm_mortar', (0, 0.45, 0), (0, -0.75, 0), 0.1, m=bone, parent=tube, sides=8, r2=0.085); cyl('bm_bore', (0, -0.75, 0), (0, -0.79, 0), 0.07, m=black, parent=tube, sides=8)
for y in (-0.6, -0.2, 0.2): loft('bm_bind', [((0, y, 0), 0.115, 0.115), ((0, y + 0.07, 0), 0.115, 0.115)], sides=8, m=leather, parent=tube, cap=False)
blob('bm_breech', 0.13, (1, 1, 1), (0, 0.5, 0), sub=1, m=cyan, parent=tube)
sho = joint('sho.L', (0.26, 0, 0.42), tor)
blob('bm_shoulder.L', 0.1, (1, 1, 0.9), (0, 0, 0.02), sub=1, m=bone, parent=sho); loft('bm_upper.L', [((0, 0, 0), 0.065, 0.065), ((0, 0, -0.28), 0.05, 0.05)], sides=6, m=hide, parent=sho)
elb = joint('elbow.L', (0, 0, -0.28), sho); loft('bm_fore.L', [((0, 0, 0), 0.055, 0.055), ((0, 0, -0.25), 0.045, 0.045)], sides=6, m=hide, parent=elb); blob('bm_hand.L', 0.055, (1, 1, 1), (0, 0, -0.28), sub=1, m=dark, parent=elb)
mirror_x(sho)
J('sho.L').rotation_euler = (-1.5, 0, -0.1); J('elbow.L').rotation_euler = (-1.1, 0, 0); J('sho.R').rotation_euler = (-0.3, 0, 0); J('elbow.R').rotation_euler = (-0.5, 0, 0)
rest(root)
def bm_walk(ph): zero(J('root')); stride(ph, 0.45, 0.5, 0.0); wag(3, ph, 0.18); shift('pelvis', z=0.02 * abs(math.sin(ph)) - 0.02); turn('torso', z=0.06 * math.sin(ph)); turn('neck', z=-0.06 * math.sin(ph)); turn('sho.R', x=0.3 * math.sin(ph))
def bm_atk(): zero(J('root')); turn('torso', x=0.2); turn('tube', x=0.25); shift('pelvis', z=-0.1); turn('hip.L', x=-0.25); turn('hip.R', x=-0.25); turn('knee.L', x=0.4); turn('knee.R', x=0.4); turn('jaw', x=0.4)
F = {'stand': lambda: zero(J('root')), 'atk': bm_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: bm_walk(i / 8 * 2 * math.pi))
OUT['talon_bombardier'] = export('talon_bombardier', CUR, F, {'fit': 2.2}); zero(root); R4 = root

# ---------------- Herd Beast: a slow mass of hide and bone that takes what is thrown at it
PRE = 'hb_'; CUR = coll('talon_herd')
root = joint('root'); body = joint('body', (0, 0, 1.12), root)
loft('hb_barrel', [((0, -0.9, 0.0), 0.36, 0.4), ((0, -0.55, 0.22), 0.66, 0.78), ((0, 0.0, 0.12), 0.7, 0.72), ((0, 0.6, 0.0), 0.56, 0.56), ((0, 1.0, -0.06), 0.28, 0.28)], sides=10, m=[hide, hide2, dark], seg_mats=[0, 1, 0, 2], parent=body, rough=0.1, seed=5)
loft('hb_belly', [((0, -0.6, -0.42), 0.36, 0.18), ((0, 0.1, -0.5), 0.46, 0.2), ((0, 0.8, -0.38), 0.3, 0.14)], sides=8, m=belly, parent=body)
for i, y in enumerate((-0.7, -0.45, -0.2, 0.08)):
    for s in (1, -1): loft('hb_scute', [((s * 0.24, y, 0.86 - i * 0.08), 0.2, 0.06), ((s * 0.5, y + 0.05, 0.66 - i * 0.08), 0.18, 0.06), ((s * 0.72, y + 0.1, 0.3 - i * 0.05), 0.1, 0.05)], sides=4, m=bone, parent=body)
    spike('hb_hump%d' % i, (0, y, 0.92 - i * 0.1), (0, y + 0.12, 1.24 - i * 0.16), 0.09, sides=4, m=bone, parent=body, flat=0.5)
for tg, hp in (('F', (0.42, -0.52, -0.3)), ('B', (0.4, 0.62, -0.28))):
    bleg(body, hp, 0.36, 0.36, 0.17, hide, dark, (0.32, 0.36, 0.1), black, sides=7, tag=tg)
    for sd in ('L', 'R'):
        for i in range(3): spike('hb_toe', ((i - 1) * 0.1, -0.18, -0.42), ((i - 1) * 0.11, -0.3, -0.45), 0.04, sides=4, m=bone, parent=J('knee%s.%s' % (tg, sd)))
tail(body, (0, 0.96, -0.05), (0.34, 0.3), (0.22, 0.13, 0.03), [hide, dark], sides=7, droop=0.25)
head = joint('head', (0, -0.9, -0.1), body); head.rotation_euler = (0.25, 0, 0)
loft('hb_skull', [((0, 0.1, 0.02), 0.34, 0.34), ((0, -0.2, 0.0), 0.36, 0.3), ((0, -0.5, -0.08), 0.26, 0.2), ((0, -0.72, -0.14), 0.14, 0.11)], sides=8, m=[hide, hide2, dark], seg_mats=[0, 1, 2], parent=head)
box('hb_boss', (0.56, 0.3, 0.2), (0, -0.14, 0.3), m=bone, parent=head, bevel=0.06)
for s in (1, -1):
    loft('hb_horn', [((s * 0.26, -0.14, 0.3), 0.11, 0.11), ((s * 0.62, -0.16, 0.36), 0.1, 0.1), ((s * 0.86, -0.4, 0.28), 0.07, 0.07), ((s * 0.84, -0.7, 0.4), 0.004, 0.004)], sides=5, m=bone, parent=head)
    blob('hb_eye', 0.04, (1, 1.2, 1), (s * 0.3, -0.36, 0.06), sub=1, m=cyan, parent=head)
blob('hb_gem', 0.07, (1, 0.6, 1.2), (0, -0.31, 0.3), sub=1, m=lime, parent=head)
rest(root)
def hb_walk(ph):
    zero(J('root'))
    for tg, off in (('F', 0.0), ('B', math.pi)):
        for s, sd in ((1, 'L'), (-1, 'R')):
            a = ph + off + (0 if s > 0 else math.pi); turn('hip%s.%s' % (tg, sd), x=-0.36 * math.sin(a)); turn('knee%s.%s' % (tg, sd), x=0.45 * max(0.0, math.cos(a)) + 0.05)
    shift('body', z=0.025 * math.sin(2 * ph)); turn('body', y=0.04 * math.sin(ph)); wag(2, ph, 0.2, 0.7); turn('head', z=-0.07 * math.sin(ph), x=0.05 * math.sin(2 * ph))
def hb_atk(): zero(J('root')); turn('head', x=0.35); shift('body', y=-0.2); turn('body', x=0.1)
F = {'stand': lambda: zero(J('root')), 'atk': hb_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: hb_walk(i / 8 * 2 * math.pi))
OUT['talon_herd'] = export('talon_herd', CUR, F); zero(root); R5 = root

# ---------------- Thunder Lizard: a living hill with a fortress on its back; pylons hold its shield, the great crystal throws the beam
PRE = 'th_'; CUR = coll('talon_thunder')
root = joint('root'); body = joint('body', (0, 0, 4.0), root)
loft('th_barrel', [((0, -2.6, 0.2), 0.8, 0.9), ((0, -1.6, 0.25), 1.6, 1.7), ((0, 0.0, 0.3), 1.9, 1.95), ((0, 1.8, 0.1), 1.5, 1.5), ((0, 3.0, -0.2), 0.8, 0.8)], sides=12, m=[hide, hide2, dark], seg_mats=[0, 1, 0, 2], parent=body, rough=0.06, seed=3)
loft('th_belly', [((0, -2.0, -1.0), 0.8, 0.4), ((0, 0.0, -1.25), 1.2, 0.5), ((0, 2.2, -0.9), 0.7, 0.3)], sides=8, m=belly, parent=body)
for tg, hp in (('F', (1.1, -1.5, -0.9)), ('B', (1.15, 1.7, -0.8))):
    bleg(body, hp, 1.4, 1.4, 0.46, hide, dark, (0.9, 1.0, 0.3), black, sides=8, tag=tg, kneecap=(0.6, 0.2, 0.6), m_knee=bone)
    for sd in ('L', 'R'):
        for i in range(3): spike('th_toe', ((i - 1) * 0.28, -0.5, -1.6), ((i - 1) * 0.3, -0.85, -1.68), 0.11, sides=4, m=bone, parent=J('knee%s.%s' % (tg, sd)))
tail(body, (0, 2.9, -0.2), (1.3, 1.3, 1.3, 1.2), (0.75, 0.52, 0.34, 0.2, 0.05), [hide, dark], sides=8, droop=0.08)
for i in range(3): spike('th_tailspike%d' % i, (0, 0.5, 0.2), (0, 0.9, 0.9), 0.1, sides=4, m=bone, parent=J('tail%d' % i), flat=0.5)
neck = joint('neck', (0, -2.5, 0.4), body)
nk = [neck]; prev = neck
loft('th_neck0', [((0, 0.2, -0.1), 0.85, 0.9), ((0, -0.9, 0.7), 0.6, 0.62)], sides=9, m=hide, parent=neck)
n1 = joint('neck1', (0, -0.9, 0.7), neck); loft('th_neck1', [((0, 0.0, 0.0), 0.6, 0.62), ((0, -0.9, 0.9), 0.46, 0.46)], sides=9, m=hide2, parent=n1)
n2 = joint('neck2', (0, -0.9, 0.9), n1); loft('th_neck2', [((0, 0.0, 0.0), 0.46, 0.46), ((0, -0.9, 0.6), 0.36, 0.36)], sides=9, m=hide, parent=n2)
for i, j in enumerate((neck, n1, n2)): spike('th_neckplate%d' % i, (0, -0.4, 0.75 - i * 0.12), (0, -0.2, 1.4 - i * 0.2), 0.14, sides=4, m=bone, parent=j, flat=0.45)
hd = lizard_head(n2, (0, -0.95, 0.62), 2.6, pre='t', crest=4)
loft('th_frill', [((0, 0.42, 0.1), 0.2, 0.2), ((0, 0.36, 0.3), 0.66, 0.6), ((0, 0.26, 0.36), 0.2, 0.2)], sides=8, m=bone, parent=hd)
# the fortress: a deck, a wall of bone, four pylons that hold the shield, the great crystal
box('th_deck', (2.6, 3.2, 0.24), (0, 0.1, 2.2), m=leather, parent=body, bevel=0.06)
for s in (1, -1):
    box('th_girth', (0.2, 0.34, 3.6), (s * 1.75, -0.4, 0.5), m=leather, parent=body); box('th_girth2', (0.2, 0.34, 3.4), (s * 1.6, 1.2, 0.5), m=leather, parent=body)
    box('th_wall', (0.16, 3.0, 0.7), (s * 1.26, 0.1, 2.66), m=bone, parent=body, bevel=0.04); box('th_drape', (0.06, 1.6, 1.3), (s * 1.9, 0.1, 1.2), m=hide, parent=body, taper=0.7)
    for y in (-1.3, 1.5):
        cyl('th_pylon', (s * 1.2, y, 2.3), (s * 1.2, y, 3.9), 0.12, m=bone, parent=body, sides=6); loft('th_pylongem', [((s * 1.2, y, 3.8), 0.004, 0.004), ((s * 1.2, y, 4.1), 0.2, 0.2), ((s * 1.2, y, 4.7), 0.004, 0.004)], sides=5, m=cyan, parent=body)
for y in (-1.45, 1.65): box('th_endwall', (2.5, 0.16, 0.7), (0, y, 2.66), m=bone, parent=body, bevel=0.04)
emit = joint('emitter', (0, 0.1, 2.4), body)
for i in range(3): cyl('th_strut%d' % i, (math.cos(i * 2.1) * 0.9, math.sin(i * 2.1) * 0.9, 0), (math.cos(i * 2.1) * 0.2, math.sin(i * 2.1) * 0.2, 1.8), 0.08, m=bone, parent=emit, sides=5)
loft('th_crystal', [((0, 0, 1.4), 0.004, 0.004), ((0, 0, 1.9), 0.42, 0.42), ((0, 0, 2.7), 0.32, 0.32), ((0, 0, 3.6), 0.004, 0.004)], sides=6, m=lime, parent=emit)
for i in range(4): spike('th_shard%d' % i, (math.cos(i * 1.57) * 0.3, math.sin(i * 1.57) * 0.3, 1.7), (math.cos(i * 1.57) * 0.75, math.sin(i * 1.57) * 0.75, 2.5), 0.12, sides=4, m=cyan, parent=emit)
for i, y in enumerate((-2.0, 2.3)): spike('th_backplate%d' % i, (0, y, 1.9 - i * 0.3), (0, y + 0.4, 2.9 - i * 0.5), 0.3, sides=4, m=bone, parent=body, flat=0.4)
rest(root)
def th_walk(ph):
    zero(J('root'))
    for tg, off in (('F', 0.0), ('B', math.pi)):
        for s, sd in ((1, 'L'), (-1, 'R')):
            a = ph + off + (0 if s > 0 else math.pi); turn('hip%s.%s' % (tg, sd), x=-0.26 * math.sin(a)); turn('knee%s.%s' % (tg, sd), x=0.36 * max(0.0, math.cos(a)) + 0.04)
    shift('body', z=0.06 * math.sin(2 * ph)); turn('body', y=0.02 * math.sin(ph)); wag(4, ph, 0.12, 0.6)
    turn('neck', z=-0.05 * math.sin(ph)); turn('neck1', z=-0.06 * math.sin(ph - 0.5), x=0.03 * math.sin(2 * ph)); turn('neck2', z=-0.06 * math.sin(ph - 1.0)); turn('emitter', z=ph)
def th_atk(): zero(J('root')); turn('neck', x=-0.2); turn('neck1', x=-0.2); turn('neck2', x=0.3); turn('tjaw', x=0.5); shift('emitter', z=0.25); turn('body', x=-0.03)
F = {'stand': lambda: zero(J('root')), 'atk': th_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: th_walk(i / 8 * 2 * math.pi))
OUT['talon_thunder'] = export('talon_thunder', CUR, F, {'fit': 9.0}); zero(root); R6 = root
