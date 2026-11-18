
# THE TALON: Skirmisher (light), Raptor Rider (medium), War Beast (heavy). Primal but advanced: hide and bone, living crystal.
import math
wipe()
hide = mat('tl_hide', '#8a52c8'); hide2 = mat('tl_hide_lit', '#a878dc'); dark = mat('tl_dark', '#3a2060'); bone = mat('tl_bone', '#efe6cf'); belly = mat('tl_belly', '#c9b4e6')
lime = mat('tl_crystal', '#c8ff6a', emit=2.5); cyan = mat('tl_cyan', '#7af6ff', emit=2.5); leather = mat('tl_leather', '#6a4630'); wood = mat('tl_wood', '#4a3424')
scale = mat('tl_scale', '#3f8a72'); scale2 = mat('tl_scale_dark', '#255646'); black = mat('tl_black', '#1c1226')
OUT = {}

def lizard_head(parent, at, k=1.0, pre='', crest=3):
    """A long-snouted head with a jaw that opens, lit eyes and a crest of bone. Returns its joint."""
    h = joint(pre + 'head', at, parent)
    loft(PRE + pre + 'skull', [((0, 0.09 * k, 0.03 * k), 0.08 * k, 0.08 * k), ((0, -0.03 * k, 0.05 * k), 0.12 * k, 0.1 * k), ((0, -0.2 * k, 0.03 * k), 0.09 * k, 0.065 * k), ((0, -0.38 * k, 0.0), 0.05 * k, 0.035 * k)], sides=7, m=[hide, hide2], seg_mats=[0, 1, 0], parent=h)
    j = joint(pre + 'jaw', (0, -0.04 * k, -0.03 * k), h)
    loft(PRE + pre + 'jawbone', [((0, 0.02 * k, 0), 0.085 * k, 0.035 * k), ((0, -0.16 * k, -0.02 * k), 0.07 * k, 0.03 * k), ((0, -0.32 * k, -0.02 * k), 0.035 * k, 0.02 * k)], sides=6, m=belly, parent=j)
    for s in (1, -1):
        blob(PRE + pre + 'eye', 0.03 * k, (1, 1.3, 1), (s * 0.095 * k, -0.08 * k, 0.09 * k), sub=1, m=cyan, parent=h)
        for i in range(2): spike(PRE + pre + 'tooth', (s * 0.05 * k, (-0.22 - i * 0.08) * k, 0.0), (s * 0.05 * k, (-0.23 - i * 0.08) * k, -0.06 * k), 0.014 * k, sides=4, m=bone, parent=h)
    for i in range(crest): spike(PRE + pre + 'crest%d' % i, (0, (0.0 + i * 0.05) * k, (0.12 - i * 0.01) * k), (0, (0.12 + i * 0.1) * k, (0.34 - i * 0.05) * k), 0.03 * k, sides=4, m=bone, parent=h, flat=0.5)
    return h

# ---------------- Skirmisher: on foot, spear and hide shield
PRE = 'sm_'; CUR = coll('talon_L_skirmisher')
root = joint('root'); pel = joint('pelvis', (0, 0, 0.76), root)
loft('sm_hips', [((0, -0.08, 0.02), 0.13, 0.11), ((0, 0.1, 0.0), 0.14, 0.12)], sides=7, m=hide, parent=pel)
box('sm_cloth', (0.2, 0.03, 0.26), (0, -0.14, -0.12), m=leather, parent=pel, taper=0.7)
bleg(pel, (0.11, 0, -0.02), 0.36, 0.38, 0.065, hide, dark, (0.11, 0.3, 0.06), bone)
for sd in ('L', 'R'): J('hip.' + sd).rotation_euler = (-0.5, 0, 0); J('knee.' + sd).rotation_euler = (0.95, 0, 0)
tail(pel, (0, 0.1, 0.02), (0.3, 0.3, 0.34), (0.1, 0.075, 0.045, 0.004), [hide, dark], droop=0.06)
J('tail0').rotation_euler = (-0.25, 0, 0)
tor = joint('torso', (0, -0.02, 0.08), pel); tor.rotation_euler = (0.45, 0, 0)
loft('sm_chest', [((0, 0, 0), 0.14, 0.12), ((0, 0, 0.22), 0.2, 0.15), ((0, 0, 0.44), 0.17, 0.12), ((0, 0, 0.5), 0.09, 0.08)], sides=8, m=[hide, hide2], seg_mats=[0, 1, 0], parent=tor)
box('sm_breast', (0.24, 0.04, 0.2), (0, -0.15, 0.28), m=bone, parent=tor, bevel=0.012, taper=0.75); blob('sm_gem', 0.045, (1, 0.6, 1.3), (0, -0.18, 0.3), sub=1, m=lime, parent=tor)
for i in range(3): spike('sm_back%d' % i, (0, 0.13, 0.14 + i * 0.13), (0, 0.3, 0.2 + i * 0.14), 0.03, sides=4, m=bone, parent=tor, flat=0.5)
neck = joint('neck', (0, -0.02, 0.5), tor); neck.rotation_euler = (-0.4, 0, 0)
loft('sm_neck', [((0, 0, -0.03), 0.075, 0.075), ((0, -0.02, 0.1), 0.07, 0.07)], sides=6, m=hide, parent=neck)
lizard_head(neck, (0, -0.03, 0.14), 1.0)
sho = joint('sho.L', (0.2, 0, 0.4), tor)
blob('sm_shoulder.L', 0.07, (1, 1, 1), (0, 0, 0), sub=1, m=hide2, parent=sho)
loft('sm_upper.L', [((0, 0, 0), 0.05, 0.05), ((0, 0, -0.27), 0.04, 0.04)], sides=6, m=hide, parent=sho)
elb = joint('elbow.L', (0, 0, -0.27), sho)
loft('sm_fore.L', [((0, 0, 0), 0.045, 0.045), ((0, 0, -0.24), 0.035, 0.035)], sides=6, m=hide, parent=elb)
loft('sm_bracer.L', [((0, 0, -0.06), 0.055, 0.055), ((0, 0, -0.18), 0.05, 0.05)], sides=6, m=bone, parent=elb, cap=False)
blob('sm_hand.L', 0.045, (1, 1, 1), (0, 0, -0.27), sub=1, m=dark, parent=elb)
mirror_x(sho)
blob('sm_shield', 0.26, (0.22, 1, 1), (0.09, 0, -0.16), sub=2, m=leather, parent=J('elbow.L')); blob('sm_shield_boss', 0.08, (0.4, 1, 1), (0.15, 0, -0.16), sub=1, m=bone, parent=J('elbow.L'))
d = (0, -0.85, -0.52); H = (0, 0, -0.27); P = lambda t: (H[0] + d[0] * t, H[1] + d[1] * t, H[2] + d[2] * t)
cyl('sm_spear', P(-0.7), P(1.15), 0.016, m=wood, parent=J('elbow.R'), sides=5); spike('sm_spearhead', P(1.1), P(1.5), 0.05, sides=4, m=lime, parent=J('elbow.R'), flat=0.45)
loft('sm_binding', [(P(1.02), 0.03, 0.03), (P(1.12), 0.03, 0.03)], sides=5, m=bone, parent=J('elbow.R'), cap=False)
J('sho.R').rotation_euler = (-0.5, 0, 0); J('elbow.R').rotation_euler = (-0.7, 0, 0); J('sho.L').rotation_euler = (-0.2, 0, 0.25); J('elbow.L').rotation_euler = (-0.7, 0, 0)
rest(root)
def sm_walk(ph):
    zero(J('root')); stride(ph, 0.55, 0.55, 0.0); wag(3, ph, 0.2); shift('pelvis', z=0.025 * abs(math.sin(ph)) - 0.02)
    turn('torso', z=0.08 * math.sin(ph), x=0.03 * math.sin(2 * ph)); turn('neck', z=-0.08 * math.sin(ph)); turn('sho.L', x=0.3 * math.sin(ph)); turn('sho.R', x=0.08 * math.sin(ph + math.pi))
def sm_atk(): zero(J('root')); turn('sho.R', x=-0.85); turn('elbow.R', x=0.45); turn('torso', x=0.18, z=0.2); turn('jaw', x=0.4); turn('sho.L', x=-0.5); wag(3, 1.0, 0.3)
F = {'stand': lambda: zero(J('root')), 'atk': sm_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: sm_walk(i / 8 * 2 * math.pi))
# fit: the measure that is sized to the unit in the game; without it a long spear would shrink the one who carries it
OUT['talon_L'] = export('talon_L', CUR, F, {'fit': 2.0}); zero(root); R1 = root

# ---------------- Raptor Rider: a lancer on a running lizard
PRE = 'rr_'; CUR = coll('talon_M_raptor_rider')
root = joint('root'); body = joint('body', (0, 0, 1.05), root)
loft('rr_trunk', [((0, -0.52, 0.1), 0.13, 0.16), ((0, -0.3, 0.06), 0.24, 0.28), ((0, 0.05, 0.0), 0.27, 0.3), ((0, 0.4, 0.0), 0.2, 0.22), ((0, 0.55, 0.02), 0.14, 0.15)], sides=8, m=[scale, scale2], seg_mats=[0, 1, 0, 1], parent=body, rough=0.06, seed=2)
bleg(body, (0.21, 0.2, -0.1), 0.5, 0.5, 0.11, scale, scale2, (0.16, 0.44, 0.08), black)
for sd in ('L', 'R'):
    J('hip.' + sd).rotation_euler = (-0.55, 0, 0); J('knee.' + sd).rotation_euler = (1.05, 0, 0)
    for i in range(3): spike('rr_claw', ((i - 1) * 0.05, -0.2, -0.52), ((i - 1) * 0.06, -0.36, -0.56), 0.025, sides=4, m=bone, parent=J('knee.' + sd))
tail(body, (0, 0.52, 0.02), (0.45, 0.45, 0.5), (0.15, 0.11, 0.065, 0.004), [scale, scale2], droop=-0.05)
J('tail0').rotation_euler = (0.12, 0, 0)
for s in (1, -1): spike('rr_forearm', (s * 0.18, -0.42, -0.02), (s * 0.2, -0.62, -0.26), 0.035, sides=4, m=scale2, parent=body)
neck = joint('neck', (0, -0.5, 0.12), body)
loft('rr_neck', [((0, 0.04, -0.04), 0.14, 0.16), ((0, -0.12, 0.22), 0.11, 0.12), ((0, -0.16, 0.48), 0.09, 0.09)], sides=7, m=[scale, scale2], seg_mats=[0, 1], parent=neck)
hd = lizard_head(neck, (0, -0.18, 0.52), 1.5, pre='r', crest=2)
for o in hd.children_recursive:
    if o.type == 'MESH' and o.data.materials and o.data.materials[0].name in ('tl_hide',): o.data.materials[0] = scale; 
    if o.type == 'MESH' and len(o.data.materials) > 1: o.data.materials[1] = scale2
# the saddle and the one in it
box('rr_saddle', (0.42, 0.5, 0.1), (0, 0.02, 0.32), m=leather, parent=body, bevel=0.03); box('rr_girth', (0.6, 0.1, 0.5), (0, -0.05, 0.05), m=leather, parent=body, bevel=0.02)
rider = joint('rider', (0, 0.04, 0.36), body); rider.rotation_euler = (0.3, 0, 0)
loft('rr_rchest', [((0, 0, 0), 0.13, 0.11), ((0, 0, 0.2), 0.17, 0.13), ((0, 0, 0.4), 0.14, 0.1), ((0, 0, 0.45), 0.08, 0.07)], sides=7, m=[hide, hide2], seg_mats=[0, 1, 0], parent=rider)
box('rr_rbreast', (0.2, 0.04, 0.18), (0, -0.13, 0.26), m=bone, parent=rider, bevel=0.01, taper=0.75); blob('rr_rgem', 0.04, (1, 0.6, 1.3), (0, -0.16, 0.28), sub=1, m=lime, parent=rider)
for s in (1, -1): loft('rr_rleg', [((s * 0.12, 0, 0.02), 0.07, 0.07), ((s * 0.3, -0.12, -0.2), 0.055, 0.055), ((s * 0.3, 0.02, -0.5), 0.04, 0.04)], sides=5, m=hide, parent=body)
rn = joint('rneck', (0, -0.02, 0.45), rider); rn.rotation_euler = (-0.3, 0, 0)
lizard_head(rn, (0, -0.02, 0.1), 0.85, pre='m')
arm = joint('sho.L', (0.17, 0, 0.36), rider)
loft('rr_rupper.L', [((0, 0, 0), 0.05, 0.05), ((0, 0, -0.24), 0.04, 0.04)], sides=5, m=hide, parent=arm)
el = joint('elbow.L', (0, 0, -0.24), arm); loft('rr_rfore.L', [((0, 0, 0), 0.045, 0.045), ((0, 0, -0.22), 0.035, 0.035)], sides=5, m=bone, parent=el)
mirror_x(arm)
J('sho.L').rotation_euler = (-0.9, 0, 0.2); J('elbow.L').rotation_euler = (-0.5, 0, 0); J('sho.R').rotation_euler = (-0.5, 0, 0); J('elbow.R').rotation_euler = (-0.9, 0, 0)
lance = joint('lance', (-0.27, -0.1, 0.52), body); lance.rotation_euler = (0.1, 0, 0)
cyl('rr_lance', (0, 0.7, 0), (0, -1.5, 0), 0.022, m=wood, parent=lance, sides=5); spike('rr_lancehead', (0, -1.45, 0), (0, -1.95, 0), 0.06, sides=4, m=lime, parent=lance, flat=0.45)
loft('rr_lancebind', [((0, -1.36, 0), 0.04, 0.04), ((0, -1.46, 0), 0.04, 0.04)], sides=5, m=bone, parent=lance, cap=False)
box('rr_pennon', (0.012, 0.36, 0.2), (0, -1.12, -0.12), m=hide, parent=lance, taper=0.5)
cyl('rr_rein', (0.0, -0.1, 0.5), (0, -0.62, 0.62), 0.008, m=leather, parent=body, sides=4)
rest(root)
def rr_walk(ph):
    zero(J('root')); stride(ph, 0.6, 0.6, 0.0); wag(3, ph, 0.16, up=0.05); shift('body', z=0.04 * abs(math.sin(ph)) - 0.03); turn('body', x=0.04 * math.sin(2 * ph), y=0.03 * math.sin(ph))
    turn('neck', x=0.07 * math.sin(2 * ph + 0.6), z=-0.06 * math.sin(ph)); turn('rider', x=0.05 * math.sin(2 * ph + 1)); turn('lance', x=0.03 * math.sin(2 * ph)); turn('rjaw', x=0.1 + 0.1 * math.sin(2 * ph))
def rr_atk(): zero(J('root')); turn('lance', x=0.16); shift('lance', y=-0.35); turn('neck', x=0.45); turn('rjaw', x=0.5); turn('rider', x=0.22); wag(3, 1.2, 0.25)
F = {'stand': lambda: zero(J('root')), 'atk': rr_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: rr_walk(i / 8 * 2 * math.pi))
OUT['talon_M'] = export('talon_M', CUR, F, {'fit': 3.0}); zero(root); R2 = root

# ---------------- War Beast: horns, a bone frill, a crystal on its back that throws the beam
PRE = 'wb_'; CUR = coll('talon_H_war_beast')
root = joint('root'); body = joint('body', (0, 0, 1.56), root)
loft('wb_barrel', [((0, -1.15, 0.0), 0.42, 0.46), ((0, -0.7, 0.05), 0.78, 0.82), ((0, 0.1, 0.08), 0.88, 0.9), ((0, 0.9, 0.02), 0.68, 0.7), ((0, 1.35, -0.05), 0.34, 0.34)], sides=10, m=[hide, dark, hide2], seg_mats=[0, 2, 1, 0], parent=body, rough=0.06, seed=7)
loft('wb_underside', [((0, -0.9, -0.5), 0.4, 0.2), ((0, 0.1, -0.6), 0.55, 0.26), ((0, 1.0, -0.45), 0.36, 0.18)], sides=8, m=belly, parent=body)
for tg, hp in (('F', (0.5, -0.72, -0.42)), ('B', (0.52, 0.82, -0.4))):
    bleg(body, hp, 0.5, 0.5, 0.2, hide, dark, (0.38, 0.44, 0.14), black, sides=7, tag=tg)
    for sd in ('L', 'R'):
        for i in range(3): spike('wb_toe', ((i - 1) * 0.12, -0.22, -0.6), ((i - 1) * 0.13, -0.36, -0.63), 0.05, sides=4, m=bone, parent=J('knee%s.%s' % (tg, sd)))
tail(body, (0, 1.3, -0.04), (0.5, 0.5, 0.45), (0.3, 0.2, 0.12, 0.07), [hide, dark], sides=7, droop=0.1)
blob('wb_club', 0.2, (1, 1.2, 0.9), (0, 0.5, 0), sub=1, m=bone, parent=J('tail2'))
for s in (1, -1): spike('wb_clubspike', (s * 0.12, 0.5, 0.02), (s * 0.44, 0.58, 0.06), 0.07, sides=4, m=bone, parent=J('tail2'))
for i, y in enumerate((-0.75, -0.35, 0.05, 0.45, 0.85)): loft('wb_plate%d' % i, [((0, y, 0.82 - abs(i - 2) * 0.05), 0.1, 0.17), ((0, y + 0.08, 1.12 - abs(i - 2) * 0.08), 0.07, 0.11), ((0, y + 0.16, 1.34 - abs(i - 2) * 0.12), 0.004, 0.004)], sides=4, m=bone, parent=body)
# the howdah: a bone frame, a crystal that throws the beam
box('wb_deck', (0.9, 0.9, 0.1), (0, 0.15, 0.98), m=leather, parent=body, bevel=0.03)
for s in (1, -1):
    box('wb_strap', (0.08, 0.1, 1.5), (s * 0.5, 0.15, 0.25), m=leather, parent=body)
    for y in (-0.22, 0.52): cyl('wb_post', (s * 0.4, y, 1.0), (s * 0.12, 0.15, 1.75), 0.035, m=bone, parent=body, sides=5)
emit = joint('emitter', (0, 0.15, 1.75), body)
loft('wb_crystal', [((0, 0, -0.1), 0.004, 0.004), ((0, 0, 0.12), 0.17, 0.17), ((0, 0, 0.42), 0.13, 0.13), ((0, 0, 0.78), 0.004, 0.004)], sides=5, m=lime, parent=emit)
for i in range(3): spike('wb_shard%d' % i, (math.cos(i * 2.1) * 0.12, math.sin(i * 2.1) * 0.12, 0.0), (math.cos(i * 2.1) * 0.3, math.sin(i * 2.1) * 0.3, 0.32), 0.05, sides=4, m=cyan, parent=emit)
head = joint('head', (0, -1.1, 0.02), body)
loft('wb_skull', [((0, 0.12, 0.02), 0.4, 0.4), ((0, -0.2, 0.0), 0.38, 0.34), ((0, -0.6, -0.1), 0.24, 0.2), ((0, -0.92, -0.2), 0.1, 0.1), ((0, -1.04, -0.3), 0.01, 0.01)], sides=8, m=[hide, hide2, dark], seg_mats=[0, 1, 2, 2], parent=head)
loft('wb_frill', [((0, 0.26, 0.0), 0.3, 0.3), ((0, 0.22, 0.25), 0.84, 0.72), ((0, 0.12, 0.42), 0.9, 0.78), ((0, 0.06, 0.44), 0.3, 0.3)], sides=9, m=bone, parent=head)
for i in range(5): a = (i - 2) * 0.62; blob('wb_stud%d' % i, 0.08, (1, 0.6, 1), (math.sin(a) * 0.72, 0.02, 0.44 + math.cos(a) * 0.6), sub=1, m=lime, parent=head)
for s in (1, -1):
    loft('wb_brow', [((s * 0.22, -0.2, 0.26), 0.09, 0.09), ((s * 0.3, -0.6, 0.5), 0.07, 0.07), ((s * 0.34, -1.05, 0.62), 0.04, 0.04), ((s * 0.32, -1.3, 0.8), 0.004, 0.004)], sides=5, m=bone, parent=head)
    blob('wb_eye', 0.05, (1, 1.2, 1), (s * 0.3, -0.36, 0.1), sub=1, m=cyan, parent=head)
spike('wb_nose', (0, -0.78, -0.06), (0, -0.98, 0.26), 0.08, sides=5, m=bone, parent=head)
jaw = joint('jaw', (0, -0.1, -0.26), head)
loft('wb_jawbone', [((0, 0.05, 0), 0.26, 0.1), ((0, -0.45, -0.02), 0.18, 0.08), ((0, -0.8, 0.0), 0.06, 0.05)], sides=6, m=belly, parent=jaw)
rest(root)
def wb_walk(ph):
    zero(J('root'))
    for tg, off in (('F', 0.0), ('B', math.pi)):
        for s, sd in ((1, 'L'), (-1, 'R')):
            a = ph + off + (0 if s > 0 else math.pi)
            turn('hip%s.%s' % (tg, sd), x=-0.38 * math.sin(a)); turn('knee%s.%s' % (tg, sd), x=0.5 * max(0.0, math.cos(a)) + 0.05)
    shift('body', z=0.03 * math.sin(2 * ph)); turn('body', y=0.03 * math.sin(ph)); wag(3, ph, 0.14, 0.7); turn('head', z=-0.06 * math.sin(ph), x=0.05 * math.sin(2 * ph)); turn('emitter', z=ph)
def wb_atk(): zero(J('root')); turn('head', x=0.4); turn('jaw', x=0.3); shift('body', y=-0.15); turn('body', x=0.06); wag(3, 1.4, 0.3)
F = {'stand': lambda: zero(J('root')), 'atk': wb_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: wb_walk(i / 8 * 2 * math.pi))
OUT['talon_H'] = export('talon_H', CUR, F, {'fit': 4.7}); zero(root); R3 = root

PRE = 'sm_'; sm_walk(1.0); PRE = 'rr_'; rr_walk(2.4); PRE = 'wb_'; wb_walk(0.7)
sc = [5.5 / 2.0, 10 / 3.0, 17.5 / 4.7]
PIC = [lineup('talon_lineup', [R1, R2, R3], [8, 17, 0], sc, dist=66, target=(13, 0.0, 4.0), az=26, el=16, res=(1280, 640))]
