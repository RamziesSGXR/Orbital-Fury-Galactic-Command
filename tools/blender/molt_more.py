
# MORE OF THE MOLT: the Leaper, the Shellback (special) and the Elder Husk (boss). Run straight after molt.py, in the same session.
acid = mat('molt_acid', '#b9e04a', emit=2.0); husk = mat('molt_husk', '#cbb089'); husk2 = mat('molt_husk_dark', '#8f7650'); wing = mat('molt_wing', '#f0deb0')

# ---------------- Leaper: long hind legs, wing cases; it jumps the last stretch
PRE = 'lp_'; CUR = coll('molt_leaper')
root = joint('root'); body = joint('body', (0, 0, 0.5), root)
loft('lp_thorax', [((0, -0.28, 0.0), 0.08, 0.07), ((0, -0.14, 0.03), 0.17, 0.13), ((0, 0.06, 0.04), 0.19, 0.15), ((0, 0.24, 0.02), 0.11, 0.1)], sides=8, m=[shell, pale], seg_mats=[0, 1, 0], parent=body)
abd = joint('abd', (0, 0.22, 0.02), body)
loft('lp_abdomen', [((0, 0.0, 0.0), 0.1, 0.09), ((0, 0.2, 0.02), 0.17, 0.15), ((0, 0.5, 0.0), 0.15, 0.13), ((0, 0.8, -0.03), 0.08, 0.07), ((0, 0.98, -0.02), 0.004, 0.004)], sides=8, m=[pale, dark, hot], seg_mats=[0, 1, 0, 2], parent=abd)
head = joint('head', (0, -0.28, 0.0), body)
loft('lp_skull', [((0, 0.04, 0.0), 0.09, 0.08), ((0, -0.08, 0.0), 0.14, 0.11), ((0, -0.2, -0.04), 0.08, 0.06)], sides=7, m=dark, parent=head)
for s in (1, -1):
    blob('lp_eye', 0.06, (1, 1, 1), (s * 0.11, -0.1, 0.06), sub=1, m=eye, parent=head); spike('lp_feeler', (s * 0.04, -0.1, 0.08), (s * 0.3, -0.5, 0.42), 0.012, sides=4, m=dark, parent=head)
    spike('lp_fang', (s * 0.05, -0.2, -0.05), (s * 0.02, -0.34, -0.1), 0.025, sides=4, m=pale, parent=head)
for i, (y, rz) in enumerate(((-0.16, -0.6), (0.0, 0.1))):
    leg(str(i), body, (0.13, y, -0.03), rz, 0.3, 0.16, 0.5 - 0.03 + 0.16, 0.035, shell, dark)
hop = joint('hop.L', (0.14, 0.16, 0.0), body)
loft('lp_femur.L', [((0, 0, 0), 0.085, 0.085), ((0.06, 0.14, 0.24), 0.09, 0.08), ((0.1, 0.3, 0.46), 0.045, 0.045)], sides=6, m=[shell, pale], seg_mats=[0, 1], parent=hop)
hk = joint('hopk.L', (0.1, 0.3, 0.46), hop)
loft('lp_tibia.L', [((0, 0, 0), 0.045, 0.045), ((0.05, 0.06, -0.5), 0.03, 0.03), ((0.08, -0.02, -0.96), 0.004, 0.004)], sides=5, m=dark, parent=hk)
mirror_x(hop)
wg = joint('wing.L', (0.05, 0.02, 0.17), body)
loft('lp_case.L', [((0, 0, 0), 0.05, 0.02), ((0.09, 0.3, 0.03), 0.13, 0.025), ((0.07, 0.72, 0.0), 0.06, 0.015), ((0.04, 0.9, -0.02), 0.004, 0.004)], sides=5, m=[shell, shell2], seg_mats=[0, 1, 0], parent=wg)
loft('lp_veil.L', [((0.02, 0.06, -0.03), 0.04, 0.008), ((0.1, 0.4, -0.03), 0.12, 0.008), ((0.06, 0.84, -0.04), 0.004, 0.004)], sides=4, m=wing, parent=wg)
mirror_x(wg)
rest(root)
def lp_walk(ph):
    zero(J('root')); walk(ph, 2, 0.34, 0.2); turn('hop.L', x=0.14 * math.sin(ph)); turn('hop.R', x=0.14 * math.sin(ph + math.pi)); turn('abd', z=0.08 * math.sin(ph)); turn('head', z=-0.06 * math.sin(ph))
def lp_jump():
    zero(J('root')); turn('body', x=0.3); turn('hop.L', x=1.1); turn('hop.R', x=1.1); turn('hopk.L', x=0.5); turn('hopk.R', x=0.5); turn('wing.L', z=0.8, y=-0.5); turn('wing.R', z=-0.8, y=0.5)
    for i in range(2):
        for s, sd in ((1, 'L'), (-1, 'R')): turn('hip%d.%s' % (i, sd), y=-s * 0.5, z=-s * 0.4)
def lp_atk(): zero(J('root')); turn('head', x=-0.3); turn('body', x=-0.12); shift('body', y=-0.08); turn('wing.L', z=0.3); turn('wing.R', z=-0.3)
F = {'stand': lambda: zero(J('root')), 'atk': lp_atk, 'jump': lp_jump}
for i in range(8): F['w%d' % i] = (lambda i=i: lp_walk(i / 8 * 2 * math.pi))
OUT['molt_leaper'] = export('molt_leaper', CUR, F, {'fit': 1.9}); zero(root); R4 = root

# ---------------- Shellback: a low bug behind a wall of plates, the plates edged pale so its front reads from above
PRE = 'sh_'; CUR = coll('molt_shellback')
root = joint('root'); body = joint('body', (0, 0, 0.5), root)
loft('sh_trunk', [((0, -0.3, 0.0), 0.3, 0.2), ((0, 0.1, 0.08), 0.5, 0.34), ((0, 0.6, 0.06), 0.46, 0.3), ((0, 0.95, 0.0), 0.2, 0.14)], sides=9, m=[deep, dark], seg_mats=[0, 1, 0], parent=body, rough=0.08, seed=6)
for s in (1, -1): blob('sh_sac', 0.1, (1, 1.2, 0.9), (s * 0.36, 0.72, 0.1), sub=1, m=hot, parent=body)
shd = joint('shield', (0, -0.25, 0.0), body)
def arc(R, a0, a1, n, z, y0=0.0): return [(math.sin(a0 + (a1 - a0) * i / (n - 1)) * R, y0 - math.cos(a0 + (a1 - a0) * i / (n - 1)) * R + R * 0.45, z) for i in range(n)]
for k, (R, z, hh, mm) in enumerate(((0.95, -0.12, 0.3, shell), (0.86, 0.3, 0.26, shell2), (0.7, 0.66, 0.2, shell))):
    pts = arc(R, -1.25, 1.25, 7, z, -0.02 * k)
    loft('sh_plate%d' % k, [(p, 0.06, hh * (0.55 if i in (0, 6) else 1.0)) for i, p in enumerate(pts)], sides=6, m=mm, parent=shd)
    loft('sh_edge%d' % k, [((p[0], p[1], p[2] + hh), 0.07, 0.035) for p in pts], sides=4, m=pale, parent=shd)
for a in (-0.7, 0.0, 0.7): spike('sh_boss', (math.sin(a) * 0.9, -math.cos(a) * 0.9 + 0.4, 0.0), (math.sin(a) * 1.3, -math.cos(a) * 1.3 + 0.4, 0.1), 0.08, sides=5, m=black, parent=shd)
head = joint('head', (0, -0.3, -0.08), body)
loft('sh_skull', [((0, 0.06, 0.0), 0.16, 0.12), ((0, -0.1, 0.0), 0.2, 0.13), ((0, -0.24, -0.04), 0.1, 0.07)], sides=7, m=dark, parent=head)
for s in (1, -1): blob('sh_eye', 0.045, (1, 1, 1), (s * 0.15, -0.14, 0.08), sub=1, m=eye, parent=head)
for i, (y, rz) in enumerate(((-0.05, -0.4), (0.3, 0.1), (0.65, 0.55))):
    leg(str(i), body, (0.4, y, -0.12), rz, 0.34, 0.12, 0.5 - 0.12 + 0.12, 0.075, deep, black, sides=5, reach2=0.6)
rest(root)
def sh_walk(ph): zero(J('root')); walk(ph, 3, 0.26, 0.16, 0.015); turn('shield', z=0.04 * math.sin(ph)); turn('body', y=0.03 * math.sin(ph))
def sh_atk(): zero(J('root')); shift('body', y=-0.2); turn('body', x=0.08); turn('shield', x=0.12)
F = {'stand': lambda: zero(J('root')), 'atk': sh_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: sh_walk(i / 8 * 2 * math.pi))
OUT['molt_shellback'] = export('molt_shellback', CUR, F); zero(root); R5 = root

# ---------------- Elder Husk: old, towering, a sack of acid swinging under it; it spits from far off and stamps on what comes close
PRE = 'eh_'; CUR = coll('molt_elder')
root = joint('root'); body = joint('body', (0, 0, 2.5), root)
loft('eh_thorax', [((0, -1.0, -0.05), 0.4, 0.36), ((0, -0.5, 0.15), 0.75, 0.6), ((0, 0.2, 0.25), 0.85, 0.66), ((0, 0.9, 0.12), 0.6, 0.46), ((0, 1.3, 0.0), 0.3, 0.24)], sides=10, m=[husk, husk2, dark], seg_mats=[0, 1, 0, 2], parent=body, rough=0.14, seed=11)
for i, y in enumerate((-0.6, -0.2, 0.25, 0.7, 1.05)): spike('eh_spine%d' % i, (0, y, 0.72 - abs(i - 2) * 0.08), (0, y + 0.3, 1.5 - abs(i - 2) * 0.22), 0.11, m=black, parent=body)
for s in (1, -1):
    for i, y in enumerate((-0.3, 0.35)): loft('eh_plate', [((s * 0.6, y - 0.3, 0.32), 0.12, 0.3), ((s * 0.84, y, 0.3), 0.14, 0.34), ((s * 0.62, y + 0.34, 0.26), 0.1, 0.24)], sides=5, m=husk, parent=body)
    blob('eh_growth', 0.22, (1, 1, 0.7), (s * 0.5, 0.75, 0.42), sub=1, m=acid, parent=body, rough=0.2, seed=s + 3)
sac = joint('sac', (0, 0.75, -0.25), body)
blob('eh_sac', 0.95, (1, 1.15, 1.05), (0, 0.5, -0.5), sub=2, m=acid, parent=sac, rough=0.1, seed=8)
for k in range(3): loft('eh_vein%d' % k, [((math.sin(a) * 0.98, 0.5 + (k - 1) * 0.45, -0.5 + math.cos(a) * 1.0 * -1), 0.05, 0.05) for a in (-1.5, -0.9, -0.3, 0.3, 0.9, 1.5)], sides=4, m=dark, parent=sac, cap=False)
loft('eh_stalk', [((0, 0.0, 0.1), 0.34, 0.3), ((0, 0.25, -0.1), 0.4, 0.36)], sides=8, m=husk2, parent=sac, cap=False)
neck = joint('neck', (0, -0.95, -0.05), body)
loft('eh_neck', [((0, 0.1, 0.0), 0.36, 0.32), ((0, -0.4, -0.2), 0.3, 0.27), ((0, -0.8, -0.55), 0.24, 0.22)], sides=8, m=[husk, husk2], seg_mats=[0, 1], parent=neck, rough=0.1, seed=2)
head = joint('head', (0, -0.8, -0.55), neck)
loft('eh_skull', [((0, 0.1, 0.0), 0.26, 0.24), ((0, -0.2, -0.02), 0.34, 0.26), ((0, -0.5, -0.1), 0.22, 0.16)], sides=8, m=dark, parent=head)
blob('eh_maw', 0.14, (1, 0.6, 1), (0, -0.5, -0.1), sub=1, m=acid, parent=head)
for s in (1, -1):
    for i in range(2): blob('eh_eye', 0.05, (1, 1, 1), (s * (0.2 + i * 0.07), -0.28 + i * 0.12, 0.16), sub=1, m=eye, parent=head)
jaw = joint('jaw.L', (0.16, -0.48, -0.12), head)
loft('eh_mandible.L', [((0, 0, 0), 0.08, 0.06), ((0.14, -0.26, -0.04), 0.07, 0.05), ((0.05, -0.56, -0.08), 0.004, 0.004)], sides=5, m=pale, parent=jaw); mirror_x(jaw)
jw2 = joint('fang.L', (0.08, -0.46, -0.22), head)
loft('eh_fang.L', [((0, 0, 0), 0.05, 0.05), ((0.04, -0.18, -0.12), 0.04, 0.04), ((0.0, -0.3, -0.3), 0.004, 0.004)], sides=4, m=pale, parent=jw2); mirror_x(jw2)
for i, (y, rz) in enumerate(((-0.6, -0.5), (0.1, 0.05), (0.85, 0.6))):
    leg(str(i), body, (0.62, y, -0.2), rz, 1.0, 0.75, 2.5 - 0.2 + 0.75, 0.15, husk2, black, sides=6, reach2=0.45, tip=0.3)
rest(root)
def eh_walk(ph):
    zero(J('root')); walk(ph, 3, 0.2, 0.14, 0.04); turn('sac', x=0.08 * math.sin(2 * ph), y=0.07 * math.sin(ph)); turn('neck', z=-0.07 * math.sin(ph), x=0.05 * math.sin(2 * ph)); turn('body', y=0.03 * math.sin(ph))
    turn('jaw.L', z=0.15 + 0.1 * math.sin(2 * ph)); turn('jaw.R', z=-0.15 - 0.1 * math.sin(2 * ph))
def eh_atk(): zero(J('root')); turn('neck', x=-0.5); turn('head', x=-0.25); turn('jaw.L', z=0.7); turn('jaw.R', z=-0.7); turn('fang.L', x=0.5); turn('fang.R', x=0.5); turn('body', x=-0.08); turn('sac', x=-0.15)
F = {'stand': lambda: zero(J('root')), 'atk': eh_atk}
for i in range(8): F['w%d' % i] = (lambda i=i: eh_walk(i / 8 * 2 * math.pi))
OUT['molt_elder'] = export('molt_elder', CUR, F); zero(root); R6 = root

PRE = 'lp_'; lp_jump(); PRE = 'sh_'; sh_walk(1.0); PRE = 'eh_'; eh_walk(0.8)
for r in (R1, R2, R3): r.location = (0, 60, 0)
PIC2 = [lineup('molt_more', [R4, R5, R6], [5, 12, 0], [5.5 / 1.9, 12 / max(OUT['molt_shellback']['size']), 30 / max(OUT['molt_elder']['size'])], dist=75, target=(11, 0, 6), az=28, el=16, res=(1280, 640))]
