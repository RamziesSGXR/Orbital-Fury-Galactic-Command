
# THE MOLT: Skitter (light), Mauler (medium), Shellback (heavy). Run in Blender after gc_kit.py.
import math
wipe()
shell = mat('molt_shell', '#b4652a'); shell2 = mat('molt_shell_lit', '#d58c3a'); dark = mat('molt_dark', '#4a2810'); pale = mat('molt_bone', '#e3c48c')
hot = mat('molt_hot', '#ffb060', emit=1.5); eye = mat('molt_eye', '#fff2a8', emit=2.5); deep = mat('molt_deep', '#7a3a18'); black = mat('molt_black', '#2a1608')
OUT = {}

def walk(ph, pairs, amp, lift, body_bob=0.012):
    for i in range(pairs):
        for s, sd in ((1, 'L'), (-1, 'R')):
            a = ph + (0 if (i + (0 if s > 0 else 1)) % 2 == 0 else math.pi)
            turn('hip%d.%s' % (i, sd), y=-s * lift * max(0.0, math.cos(a)), z=-s * amp * math.sin(a))
    shift('body', z=body_bob * math.sin(2 * ph))

# ---------------- Skitter: small, fast, all legs and jaws
PRE = 'sk_'; CUR = coll('molt_L_skitter')
root = joint('root'); body = joint('body', (0, 0, 0.42), root)
loft('sk_thorax', [((0, -0.30, 0.00), 0.09, 0.07), ((0, -0.18, 0.03), 0.20, 0.13), ((0, 0.02, 0.05), 0.23, 0.16), ((0, 0.20, 0.03), 0.15, 0.11), ((0, 0.28, 0.02), 0.09, 0.08)], sides=8, m=[shell, shell2], seg_mats=[0, 1, 0, 0], parent=body)
abd = joint('abd', (0, 0.26, 0.03), body)
loft('sk_abdomen', [((0, 0.00, 0.00), 0.09, 0.08), ((0, 0.14, 0.05), 0.22, 0.18), ((0, 0.32, 0.09), 0.27, 0.22), ((0, 0.50, 0.10), 0.24, 0.20), ((0, 0.66, 0.08), 0.17, 0.14), ((0, 0.78, 0.05), 0.09, 0.08), ((0, 0.92, 0.10), 0.004, 0.004)],
     sides=8, m=[shell, dark, hot], seg_mats=[0, 1, 0, 1, 0, 2], parent=abd, rough=0.12, seed=3)
for i, y in enumerate((0.2, 0.4, 0.58)): spike('sk_spine%d' % i, (0, y, 0.24 - i * 0.02), (0, y + 0.12, 0.44 - i * 0.06), 0.035, m=dark, parent=abd)
head = joint('head', (0, -0.30, 0.0), body)
loft('sk_skull', [((0, 0.04, 0.0), 0.10, 0.08), ((0, -0.08, 0.01), 0.16, 0.11), ((0, -0.20, -0.01), 0.13, 0.08), ((0, -0.28, -0.03), 0.06, 0.04)], sides=7, m=dark, parent=head)
for s in (1, -1):
    blob('sk_eye', 0.045, (1, 1, 1), (s * 0.11, -0.14, 0.07), sub=1, m=eye, parent=head)
    spike('sk_feeler', (s * 0.05, -0.10, 0.09), (s * 0.22, -0.42, 0.30), 0.014, sides=4, m=dark, parent=head)
jaw = joint('jaw.L', (0.07, -0.24, -0.04), head)
loft('sk_mandible.L', [((0, 0, 0), 0.045, 0.03), ((0.07, -0.12, 0), 0.04, 0.025), ((0.06, -0.24, 0), 0.028, 0.02), ((-0.02, -0.33, 0), 0.004, 0.004)], sides=5, m=pale, parent=jaw)
mirror_x(jaw)
for i, (y, rz, reach) in enumerate(((-0.17, -0.62, 1.0), (0.0, 0.05, 1.08), (0.17, 0.66, 1.15))):
    leg(str(i), body, (0.15, y, -0.03), rz, 0.32 * reach, 0.22, 0.61, 0.04, shell, dark, reach2=0.75)
rest(root)
def sk_walk(ph):
    zero(J('root')); walk(ph, 3, 0.34, 0.22)
    turn('abd', z=0.09 * math.sin(ph), x=0.04 * math.sin(2 * ph)); turn('head', z=-0.06 * math.sin(ph)); turn('jaw.L', z=0.12 + 0.1 * math.sin(2 * ph)); turn('jaw.R', z=-0.12 - 0.1 * math.sin(2 * ph))
def sk_atk(): zero(J('root')); turn('jaw.L', z=0.55); turn('jaw.R', z=-0.55); turn('head', x=-0.25); turn('abd', x=0.3); shift('body', y=-0.06)
F = {'stand': lambda: zero(J('root')), 'atk': sk_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: sk_walk(i / 8 * 2 * math.pi))
OUT['molt_L'] = export('molt_L', CUR, F); zero(root); R1 = root

# ---------------- Mauler: reared up, two great scythes, four legs
PRE = 'ma_'; CUR = coll('molt_M_mauler')
root = joint('root'); body = joint('body', (0, 0, 0.66), root)
loft('ma_thorax', [((0, -0.24, 0.02), 0.15, 0.13), ((0, -0.08, 0.03), 0.26, 0.21), ((0, 0.12, 0.02), 0.25, 0.2), ((0, 0.26, 0.0), 0.14, 0.12)], sides=8, m=[shell, shell2], seg_mats=[0, 1, 0], parent=body, rough=0.08, seed=5)
abd = joint('abd', (0, 0.24, 0.0), body)
loft('ma_abdomen', [((0, 0.0, 0.0), 0.13, 0.11), ((0, 0.18, 0.02), 0.27, 0.22), ((0, 0.42, 0.03), 0.33, 0.26), ((0, 0.68, 0.0), 0.28, 0.22), ((0, 0.9, -0.05), 0.17, 0.14), ((0, 1.08, -0.1), 0.07, 0.06), ((0, 1.26, -0.02), 0.004, 0.004)],
     sides=8, m=[deep, dark, hot], seg_mats=[0, 1, 0, 1, 0, 2], parent=abd, rough=0.1, seed=9)
for i, y in enumerate((0.25, 0.5, 0.75)): spike('ma_spine%d' % i, (0, y, 0.25 - i * 0.03), (0, y + 0.16, 0.5 - i * 0.07), 0.045, m=black, parent=abd)
chest = joint('chest', (0, -0.2, 0.04), body)
loft('ma_chest', [((0, 0.06, -0.03), 0.17, 0.15), ((0, -0.12, 0.14), 0.2, 0.17), ((0, -0.3, 0.34), 0.17, 0.14), ((0, -0.42, 0.5), 0.11, 0.1)], sides=8, m=[shell, shell2], seg_mats=[0, 1, 0], parent=chest)
for i in range(2): spike('ma_ridge%d' % i, (0, -0.1 - i * 0.16, 0.3 + i * 0.18), (0, 0.02 - i * 0.16, 0.56 + i * 0.2), 0.04, m=black, parent=chest)
head = joint('head', (0, -0.42, 0.5), chest)
loft('ma_skull', [((0, 0.06, 0.02), 0.1, 0.09), ((0, -0.06, 0.02), 0.19, 0.12), ((0, -0.2, -0.04), 0.13, 0.08), ((0, -0.3, -0.1), 0.05, 0.04)], sides=7, m=dark, parent=head)
spike('ma_horn', (0, -0.02, 0.1), (0, 0.16, 0.42), 0.05, m=pale, parent=head)
for s in (1, -1):
    blob('ma_eye', 0.06, (1, 1.3, 1), (s * 0.15, -0.1, 0.07), sub=1, m=eye, parent=head)
    spike('ma_fang', (s * 0.06, -0.26, -0.1), (s * 0.02, -0.4, -0.2), 0.03, sides=4, m=pale, parent=head)
# the scythes: an upper arm, then a long flat blade from the elbow
arm = joint('arm.L', (0.17, -0.3, 0.3), chest)
loft('ma_upper.L', [((0, 0, 0), 0.07, 0.07), ((0.1, -0.12, 0.12), 0.06, 0.06), ((0.16, -0.2, 0.3), 0.055, 0.055)], sides=5, m=shell, parent=arm)
elb = joint('elbow.L', (0.16, -0.2, 0.3), arm)
loft('ma_blade.L', [((0, 0, 0), 0.07, 0.05), ((0.0, -0.2, 0.06), 0.085, 0.03), ((-0.02, -0.5, -0.02), 0.06, 0.022), ((-0.05, -0.78, -0.22), 0.004, 0.004)], sides=5, m=[pale, dark], seg_mats=[1, 0, 0], parent=elb)
mirror_x(arm)
for i, (y, rz) in enumerate(((-0.06, -0.3), (0.14, 0.75))):
    leg(str(i), body, (0.2, y, -0.05), rz, 0.46, 0.3, 0.66 - 0.05 + 0.3, 0.055, shell, dark, reach2=0.7)
rest(root)
def ma_walk(ph):
    zero(J('root')); walk(ph, 2, 0.36, 0.22, 0.02)
    turn('abd', z=0.1 * math.sin(ph)); turn('chest', z=-0.05 * math.sin(ph), x=0.03 * math.sin(2 * ph)); turn('head', z=-0.08 * math.sin(ph))
    turn('arm.L', x=0.12 * math.sin(ph)); turn('arm.R', x=-0.12 * math.sin(ph))
def ma_atk():
    zero(J('root')); turn('chest', x=0.3); turn('arm.L', x=0.9, z=0.25); turn('arm.R', x=0.9, z=-0.25); turn('elbow.L', x=0.5); turn('elbow.R', x=0.5); turn('head', x=0.2); shift('body', y=-0.12)
F = {'stand': lambda: zero(J('root')), 'atk': ma_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: ma_walk(i / 8 * 2 * math.pi))
OUT['molt_M'] = export('molt_M', CUR, F); zero(root); R2 = root

# ---------------- Shellback: a walking fortress under a domed shell, a forked horn out front
PRE = 'sb_'; CUR = coll('molt_H_shellback')
root = joint('root'); body = joint('body', (0, 0, 0.78), root)
loft('sb_shell', [((0, -0.98, -0.06), 0.24, 0.16), ((0, -0.7, 0.1), 0.66, 0.42), ((0, -0.2, 0.24), 0.95, 0.62), ((0, 0.4, 0.26), 1.0, 0.66), ((0, 0.9, 0.16), 0.8, 0.5), ((0, 1.2, 0.02), 0.42, 0.26), ((0, 1.36, -0.04), 0.12, 0.08)],
     sides=10, m=[shell, deep, shell2], seg_mats=[0, 2, 0, 1, 0, 1], parent=body, rough=0.07, seed=4)
loft('sb_belly', [((0, -0.8, -0.2), 0.3, 0.14), ((0, -0.2, -0.3), 0.6, 0.2), ((0, 0.6, -0.3), 0.6, 0.2), ((0, 1.1, -0.2), 0.3, 0.12)], sides=8, m=black, parent=body)
for i, y in enumerate((-0.45, -0.05, 0.4, 0.82)): spike('sb_ridge%d' % i, (0, y, 0.78 - abs(i - 1.5) * 0.08), (0, y + 0.2, 1.12 - abs(i - 1.5) * 0.12), 0.09, m=black, parent=body)
for s in (1, -1):
    for i, y in enumerate((-0.4, 0.1, 0.6)): blob('sb_sac', 0.13, (1, 1.3, 0.9), (s * 0.86, y, -0.08), sub=1, m=hot, parent=body)
    spike('sb_flank', (s * 0.9, -0.3, 0.2), (s * 1.3, -0.5, 0.36), 0.09, m=black, parent=body)
for i, x in enumerate((-0.2, 0, 0.2)): blob('sb_vent%d' % i, 0.1, (1, 1, 1), (x, 1.32, -0.02), sub=1, m=hot, parent=body)
head = joint('head', (0, -0.95, -0.12), body)
loft('sb_skull', [((0, 0.12, 0.02), 0.26, 0.2), ((0, -0.1, 0.0), 0.3, 0.2), ((0, -0.32, -0.06), 0.2, 0.13), ((0, -0.44, -0.1), 0.08, 0.06)], sides=8, m=dark, parent=head)
for s in (1, -1):
    blob('sb_eye', 0.055, (1, 1, 1), (s * 0.22, -0.2, 0.1), sub=1, m=eye, parent=head)
    loft('sb_horn', [((s * 0.08, -0.16, 0.12), 0.1, 0.09), ((s * 0.16, -0.5, 0.32), 0.075, 0.065), ((s * 0.3, -0.85, 0.42), 0.05, 0.045), ((s * 0.34, -1.08, 0.7), 0.004, 0.004)], sides=5, m=pale, parent=head)
jaw = joint('jaw.L', (0.12, -0.38, -0.12), head)
loft('sb_mandible.L', [((0, 0, 0), 0.07, 0.05), ((0.08, -0.16, 0), 0.06, 0.04), ((0.02, -0.34, 0), 0.004, 0.004)], sides=5, m=pale, parent=jaw)
mirror_x(jaw)
for i, (y, rz) in enumerate(((-0.55, -0.45), (0.05, 0.05), (0.65, 0.5))):
    leg(str(i), body, (0.62, y, -0.26), rz, 0.52, 0.16, 0.78 - 0.26 + 0.16, 0.12, deep, black, sides=6, reach2=0.55)
rest(root)
def sb_walk(ph):
    zero(J('root')); walk(ph, 3, 0.2, 0.16, 0.02)
    turn('body', y=0.03 * math.sin(ph)); turn('head', z=-0.05 * math.sin(ph), x=0.04 * math.sin(2 * ph))
def sb_atk(): zero(J('root')); turn('body', x=-0.16); turn('head', x=-0.35); turn('jaw.L', z=0.5); turn('jaw.R', z=-0.5)
F = {'stand': lambda: zero(J('root')), 'atk': sb_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: sb_walk(i / 8 * 2 * math.pi))
OUT['molt_H'] = export('molt_H', CUR, F); zero(root); R3 = root

PRE = 'sk_'; sk_walk(0.9); PRE = 'ma_'; ma_walk(2.2); PRE = 'sb_'; sb_walk(0.6)
PIC = [lineup('molt_lineup', [R1, R2, R3], [2.6, 4.6, 0], [0.9, 1.5, 2.3], dist=17, target=(3.6, 0.6, 1.0), az=28, el=24, res=(1280, 640)),
       shot('molt_top', dist=19, target=(3.6, 0.6, 0.5), az=0, el=62, res=(1280, 640))]
