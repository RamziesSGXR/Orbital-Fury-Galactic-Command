# THE ENEMY'S CRAFT (GC 0.50): what brings their reinforcements down. Run in Blender after gc_kit.py:
#   exec(open(ROOT + r'\gc_kit.py').read()); exec(open(ROOT + r'\scripts\craft.py').read())
#   drop_foundry   the Foundry's dropship: a slab of red iron on four swivelling engines, the troop bay hung under it
#   drop_talon     the Talon's war barge: a hull of bone with horns at the prow, shields and lanterns along its sides, fins
#                  to ride the air on, and the crystal that sends its riders down slung under the keel
# Both face -Y (the game's forward) and are sized by the game (fitted to their longest side). They wear their faction's
# own colours (the same material names as its creatures). Two frames each:
#   stand   under way: the Foundry's engines swung back to push, its doors shut; the barge's claws closed on its crystal
#   hover   over the drop: engines straight down and the bay doors lifted; the claws spread and the crystal bared
import math
from mathutils import Vector
R = math.radians; TAU = math.pi * 2
wipe()
iron = mat('fd_iron', '#7a2e26', metal=0.3, rough=0.6); iron2 = mat('fd_iron_lit', '#9a3c30', metal=0.3, rough=0.6); dark = mat('fd_dark', '#2a1512', metal=0.4); steel = mat('fd_steel', '#6e6e74', metal=0.6, rough=0.45)
hot = mat('fd_hot', '#ff5a3a', emit=2.5); amber = mat('fd_amber', '#ffb040', emit=2.0); black = mat('fd_black', '#17171b', metal=0.3)
hide = mat('tl_hide', '#8a52c8'); hide2 = mat('tl_hide_lit', '#a878dc'); tdark = mat('tl_dark', '#3a2060'); bone = mat('tl_bone', '#efe6cf'); belly = mat('tl_belly', '#c9b4e6')
lime = mat('tl_crystal', '#c8ff6a', emit=2.5); cyan = mat('tl_cyan', '#7af6ff', emit=2.5); leather = mat('tl_leather', '#6a4630'); wood = mat('tl_wood', '#4a3424'); scale = mat('tl_scale', '#3f8a72'); tblack = mat('tl_black', '#1c1226')

MADE = []
def start(name, pre):
    global CUR, PRE
    CUR = coll(name); PRE = pre; MADE.append(name); return joint('root')
def yl(name, secs, sides=8, m=None, parent=None):
    """A hull skinned along Y (nose at the low end). secs: [(y, half-width, half-height, z)]."""
    return loft(name, [((0, s[0], s[3]), s[1], s[2]) for s in secs], sides=sides, m=m, parent=parent)

# ---------------------------------------------------------------- the Foundry's dropship
def drop_foundry():
    root = start('drop_foundry', 'df_')
    yl('hull', [(-2.55, 0.4, 0.24, 1.52), (-2.0, 0.82, 0.44, 1.52), (-0.6, 0.98, 0.52, 1.54), (1.3, 0.92, 0.5, 1.54), (2.35, 0.56, 0.3, 1.62)], 8, iron, root)
    box('brow', (1.3, 0.7, 0.3), (0, -2.05, 1.86), m=dark, parent=root, bevel=0.05, rot=(R(-14), 0, 0)); box('eye', (0.8, 0.05, 0.11), (0, -2.5, 1.56), m=amber, parent=root)
    box('spine', (0.62, 3.3, 0.24), (0, 0.15, 2.04), m=dark, parent=root, bevel=0.04); box('plate', (1.5, 1.5, 0.1), (0, -0.4, 1.98), m=iron2, parent=root, bevel=0.03)
    box('bay', (1.5, 2.7, 0.8), (0, 0.2, 0.86), m=dark, parent=root, bevel=0.06); box('bayfloor', (1.3, 2.5, 0.06), (0, 0.2, 0.46), m=black, parent=root)
    box('baylight', (1.1, 2.2, 0.04), (0, 0.2, 1.22), m=amber, parent=root)
    cyl('gun', (0, -2.1, 1.16), (0, -3.0, 1.08), 0.07, m=black, parent=root, sides=6); box('gunbox', (0.36, 0.5, 0.26), (0, -2.0, 1.16), m=steel, parent=root, bevel=0.03)
    box('burn', (0.7, 0.05, 0.22), (0, 2.42, 1.62), m=hot, parent=root)
    for s in (-1, 1):
        box('strip', (0.04, 2.3, 0.09), (s * 0.99, 0.2, 1.6), m=amber, parent=root); box('rib', (0.12, 0.3, 0.9), (s * 0.82, -1.0, 1.0), m=iron, parent=root, bevel=0.02); box('rib', (0.12, 0.3, 0.9), (s * 0.82, 1.4, 1.0), m=iron, parent=root, bevel=0.02)
        box('fin', (0.09, 0.8, 0.7), (s * 0.5, 2.05, 2.2), m=iron2, parent=root, bevel=0.02, taper=0.55, rot=(0, s * R(16), 0))
        cyl('stack', (s * 0.24, 1.5, 2.1), (s * 0.24, 1.5, 2.62), 0.1, m=black, parent=root, sides=7); cyl('stackhot', (s * 0.24, 1.5, 2.62), (s * 0.24, 1.5, 2.66), 0.07, m=hot, parent=root, sides=7)
        blob('lamp', r=0.07, loc=(s * 0.7, -2.3, 1.5), sub=1, m=hot, parent=root)
        for y in (-0.85, 1.25): spike('claw', (s * 0.6, y, 0.5), (s * 0.72, y - 0.12, 0.0), 0.07, m=steel, parent=root)
        # the bay door: hung from its top edge, lifted out and up to let them jump
        d = joint('door.' + ('L' if s > 0 else 'R'), (s * 0.77, 0.2, 1.24), root)
        box('door', (0.07, 2.4, 0.74), (0, 0, -0.38), m=iron2, parent=d, bevel=0.02); box('doorband', (0.03, 2.0, 0.1), (s * 0.04, 0, -0.5), m=amber, parent=d)
        # four engines on stub arms: each swings about its arm
        for tag, y in (('F', -1.25), ('B', 1.45)):
            box('arm', (1.0, 0.36, 0.2), (s * 1.38, y, 1.6), m=steel, parent=root, bevel=0.03)
            p = joint('pod.' + tag + ('L' if s > 0 else 'R'), (s * 2.02, y, 1.6), root)
            cyl('nacelle', (0, 0, 0.46), (0, 0, -0.42), 0.42, m=dark, parent=p, sides=10, r2=0.35); cyl('band', (0, 0, 0.12), (0, 0, -0.04), 0.44, m=iron2, parent=p, sides=10)
            cyl('intake', (0, 0, 0.46), (0, 0, 0.5), 0.34, m=black, parent=p, sides=10); cyl('fire', (0, 0, -0.42), (0, 0, -0.47), 0.29, m=hot, parent=p, sides=10)
    rest(root); return root
def df_pose(hover):
    zero(J('root'))
    for sd, s in (('L', 1), ('R', -1)):
        turn('door.' + sd, y=s * (-1.25 if hover else 0.0))
        for tag in 'FB': turn('pod.' + tag + sd, x=0.0 if hover else R(62))

# ---------------------------------------------------------------- the Talon's war barge
def drop_talon():
    root = start('drop_talon', 'dt_')
    # a hull of bone, sharp at the prow and high at the stern, decked in hide
    yl('hull', [(-3.1, 0.06, 0.06, 1.74), (-2.3, 0.72, 0.3, 1.52), (-0.9, 1.5, 0.5, 1.36), (0.9, 1.62, 0.55, 1.36), (2.2, 1.12, 0.46, 1.52), (3.0, 0.42, 0.26, 1.84)], 10, bone, root)
    yl('deck', [(-2.5, 0.4, 0.07, 1.78), (-0.9, 1.22, 0.1, 1.8), (0.9, 1.32, 0.1, 1.84), (2.3, 0.8, 0.09, 1.94), (2.9, 0.3, 0.06, 2.06)], 8, hide, root)
    yl('keel', [(-2.6, 0.1, 0.12, 1.26), (-0.6, 0.3, 0.22, 0.98), (1.2, 0.3, 0.22, 0.98), (2.6, 0.1, 0.12, 1.34)], 6, tdark, root)
    box('howdah', (1.1, 1.3, 0.5), (0, 0.6, 2.14), m=leather, parent=root, bevel=0.04, taper=0.8); box('roof', (1.4, 1.6, 0.09), (0, 0.6, 2.46), m=wood, parent=root, bevel=0.02); box('roofcap', (0.7, 0.8, 0.1), (0, 0.6, 2.56), m=hide2, parent=root, bevel=0.03, taper=0.6)
    cyl('pole', (0, 1.2, 2.5), (0, 1.2, 3.5), 0.035, m=wood, parent=root, sides=4); box('pennant', (0.03, 0.7, 0.4), (0, 1.58, 3.26), m=lime, parent=root, taper=0.3)
    spike('stern', (0, 2.6, 1.9), (0, 3.9, 2.9), 0.26, m=tdark, parent=root, flat=0.5); spike('ram', (0, -2.6, 1.5), (0, -4.0, 1.34), 0.2, m=bone, parent=root, flat=0.7)
    for s in (-1, 1):
        # the horns: out from the bows, forward and up
        loft('horn', [((s * 0.75, -2.0, 1.66), 0.22, 0.2), ((s * 1.25, -2.8, 1.9), 0.17, 0.15), ((s * 1.15, -3.6, 2.3), 0.1, 0.09), ((s * 0.8, -4.1, 2.75), 0.01, 0.01)], sides=6, m=bone, parent=root)
        # the fins it rides the air on: out from the sides and swept back
        spike('sail', (s * 1.5, 0.2, 1.5), (s * 3.3, 1.7, 1.86), 0.42, m=hide2, parent=root, flat=0.16); spike('sailb', (s * 1.4, 1.3, 1.5), (s * 2.5, 2.7, 1.74), 0.3, m=tdark, parent=root, flat=0.18)
        spike('sternfin', (s * 0.4, 2.5, 1.9), (s * 1.1, 3.5, 2.3), 0.14, m=bone, parent=root, flat=0.3)
        for i, y in enumerate((-1.5, -0.7, 0.1, 0.9, 1.7)):     # shields hung along the gunwale, a lantern under every other one
            x = s * (1.62 - 0.36 * abs(y - 0.2) ** 1.6 / 2.2)
            box('shield', (0.08, 0.66, 0.56), (x, y, 1.72), m=scale, parent=root, bevel=0.03, taper=0.7, rot=(0, s * R(-16), 0)); box('boss', (0.06, 0.2, 0.2), (x + s * 0.05, y, 1.74), m=bone, parent=root, bevel=0.03)
            if i % 2 == 0: cyl('chain', (x, y, 1.46), (x, y, 1.16), 0.02, m=tblack, parent=root, sides=4); blob('lantern', r=0.15, loc=(x, y, 1.06), sub=1, m=lime, parent=root)
    blob('lantern', r=0.17, loc=(0, -2.9, 1.42), sub=1, m=lime, parent=root); blob('lantern', r=0.17, loc=(0, 2.9, 1.62), sub=1, m=lime, parent=root)
    # the crystal that sends its riders down, slung under the keel in four claws
    cyl('socket', (0, 0.1, 1.02), (0, 0.1, 0.8), 0.66, m=tblack, parent=root, sides=10, r2=0.52); blob('core', r=0.5, scale=(1, 1, 0.9), loc=(0, 0.1, 0.62), sub=1, m=cyan, parent=root)
    for i in range(4):     # they hold it shut under way, and spread to let it work
        a = i * TAU / 4 + TAU / 8; c = joint('claw%d' % i, (math.sin(a) * 0.62, 0.1 - math.cos(a) * 0.62, 0.9), root); c.rotation_euler = (0, 0, a)
        spike('clawp', (0, 0, 0), (0, 0.44, -0.78), 0.13, m=bone, parent=c, flat=0.6)
    rest(root); return root
def dt_pose(hover):
    zero(J('root'))
    for i in range(4): turn('claw%d' % i, x=-1.0 if hover else 0.0)

OUT = {}; ROOTS = []
for name, make, pose in (('drop_foundry', drop_foundry, df_pose), ('drop_talon', drop_talon, dt_pose)):
    r = make(); bpy.context.view_layer.update()
    OUT[name] = export(name, CUR, {'stand': (lambda p=pose: p(False)), 'hover': (lambda p=pose: p(True))}, lod=0)
    ROOTS.append((PRE, r, pose))
# side by side for the picture: the dropship hovering, the barge under way
for i, (pre, r, pose) in enumerate(ROOTS): PRE = pre; pose(i == 0); r.location = (i * 8.4 - 4.2, 0, 0)
PIC = [shot('craft', dist=27, target=(0, 0, 1.4), az=30, el=26, res=(1700, 800)), shot('craft_back', dist=27, target=(0, 0, 1.4), az=150, el=34, res=(1700, 800))]
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'craft.blend'))
