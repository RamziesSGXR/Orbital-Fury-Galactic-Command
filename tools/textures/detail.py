# THE DETAIL TEXTURES (GC 0.90, Ramzies: "texture updates in general for all the games"). One small picture that every lit 3D
# surface in every mode samples (js/surface.js): a layer for each thing a surface can be made of, in the order of surface.js's
# KIND (plain, fabric, hard, organic, skin, none, stone, wood), then the world's own (GC 0.90): soil, rock, bark, foliage, sand,
# snow, grass, regolith and water, which the land, the trees and rocks and the sea wear. Each layer tiles seamlessly and carries:
#   R  how light or dark the surface is there (0.5 leaves it as it is): stains, grime, mottling, the grain
#   G  how high it is (0.5 is the surface): pores, cracks, dents, scratches, the weave, scales. The game lights it as bumps
#   B  wear: where paint is scratched or chipped to bare metal, where concrete is spalled, where cloth is rubbed pale
# Made here with numpy, so it can be made again: python3 tools/textures/detail.py  ->  assets/textures/detail.png
# (the layers stacked top to bottom, 256 a side). Everything is periodic (noise from the spectrum, cells and lines on a torus).
import numpy as np, os, sys
from PIL import Image

S = 256
rng = np.random.default_rng(90)
yy, xx = np.mgrid[0:S, 0:S] / S

def fbm(beta=2.0, lo=1, hi=None, seed=None, aniso=(1.0, 1.0)):
    """Periodic noise with a 1/f^beta spectrum between frequencies lo and hi (cycles across the tile); aniso stretches it."""
    r = np.random.default_rng(seed) if seed is not None else rng
    w = r.standard_normal((S, S)); F = np.fft.fft2(w)
    fy = np.fft.fftfreq(S) * S * aniso[1]; fx = np.fft.fftfreq(S) * S * aniso[0]
    f = np.sqrt(fy[:, None] ** 2 + fx[None, :] ** 2); f[0, 0] = 1
    amp = 1 / f ** (beta / 2); amp[(f < lo)] = 0; amp[0, 0] = 0
    if hi: amp *= np.exp(-(f / hi) ** 2)
    n = np.real(np.fft.ifft2(F * amp)); return (n - n.mean()) / (n.std() + 1e-9)

def cells(n, seed=0, jitter=1.0, sy=1.0):
    """Points on the torus; for every pixel its nearest and second nearest distance (in tile units) and the nearest's index."""
    r = np.random.default_rng(seed); g = int(np.ceil(np.sqrt(n)))
    pts = np.array([((i + 0.5 + (r.random() - 0.5) * jitter) / g, (j + 0.5 + (r.random() - 0.5) * jitter) / g) for i in range(g) for j in range(g)])
    d1 = np.full((S, S), 9.0); d2 = np.full((S, S), 9.0); idx = np.zeros((S, S), int)
    for k, (px, py) in enumerate(pts):
        dx = np.abs(xx - px); dx = np.minimum(dx, 1 - dx); dy = np.abs(yy - py); dy = np.minimum(dy, 1 - dy) * sy; d = np.sqrt(dx * dx + dy * dy)
        closer = d < d1; d2 = np.where(closer, d1, np.minimum(d2, d)); idx = np.where(closer, k, idx); d1 = np.where(closer, d, d1)
    return d1, d2, idx, len(pts)

def lines(n, seed, length=(0.03, 0.25), width=0.0025, curve=0.0):
    """Thin scratches on the torus: a mask, 1 on a line, falling off across it."""
    r = np.random.default_rng(seed); m = np.zeros((S, S))
    for _ in range(n):
        x0, y0 = r.random(), r.random(); a = r.random() * np.pi; L = length[0] + r.random() * (length[1] - length[0]); w = width * (0.6 + r.random())
        ca, sa = np.cos(a), np.sin(a)
        dx = (xx - x0 + 0.5) % 1 - 0.5; dy = (yy - y0 + 0.5) % 1 - 0.5
        t = dx * ca + dy * sa; d = np.abs(-dx * sa + dy * ca - curve * t * t)
        m = np.maximum(m, np.clip(1 - d / w, 0, 1) * (np.abs(t) < L / 2) * (0.5 + 0.5 * r.random()))
    return m

def blobs(n, seed, r0=0.01, r1=0.04):
    r = np.random.default_rng(seed); m = np.zeros((S, S))
    for _ in range(n):
        x0, y0, rr = r.random(), r.random(), r0 + r.random() * (r1 - r0)
        dx = (xx - x0 + 0.5) % 1 - 0.5; dy = (yy - y0 + 0.5) % 1 - 0.5; d = np.sqrt(dx * dx + dy * dy) / rr
        m = np.maximum(m, np.clip(1.2 - d - 0.25 * fbm_small[(np.clip(y0 * S, 0, S - 1)).astype(int), (np.clip(x0 * S, 0, S - 1)).astype(int)], 0, 1))
    return m
fbm_small = fbm(1.5, 4, 40, seed=7)

def norm01(a, lo=None, hi=None):
    lo = a.min() if lo is None else lo; hi = a.max() if hi is None else hi; return np.clip((a - lo) / (hi - lo + 1e-9), 0, 1)
def layer(R, G, B):
    """R and G about 0.5 on average (so far off, mipped down, a surface is as it was); B 0..1."""
    R = 0.5 + (R - R.mean()); G = 0.5 + (G - G.mean())
    return np.stack([np.clip(R, 0, 1), np.clip(G, 0, 1), np.clip(B, 0, 1)], -1)

L = {}
# 0 plain: a little grime and speckle
g = fbm(2.2, 3, 60, seed=1); sp = fbm(1.0, 30, 128, seed=2)
L[0] = layer(0.06 * g + 0.025 * sp, 0.03 * fbm(2.0, 2, 80, seed=3) + 0.02 * sp, np.zeros((S, S)))

# 1 fabric: a weave, wrinkles, mottling, rubbed pale where it creases
k = 40; weave = (np.sin(2 * np.pi * k * xx) * np.sin(2 * np.pi * k * yy)) * 0.5
wr = fbm(2.6, 2, 14, seed=11, aniso=(1.0, 0.35)); rid = 1 - np.abs(fbm(2.4, 2, 20, seed=12))
mot = fbm(2.0, 3, 50, seed=13)
L[1] = layer(0.07 * mot - 0.03 * weave + 0.04 * norm01(rid), 0.06 * weave + 0.18 * norm01(wr) + 0.1 * norm01(rid), 0.45 * np.clip(norm01(wr) - 0.72, 0, 1) / 0.28)

# 2 hard (painted metal, plastic): orange peel, a few dents, scratches, chips; grime in patches
peel = fbm(1.2, 40, 128, seed=21); dent = fbm(3.2, 1, 6, seed=22)
scr = lines(22, 23, (0.02, 0.12), 0.0018); scr2 = lines(6, 24, (0.1, 0.35), 0.0014, curve=0.6)
chip = (fbm(1.8, 6, 90, seed=25) > 2.6).astype(float); chip = np.maximum(chip, np.roll(chip, 1, 0) * 0.6)
grime = fbm(2.4, 3, 30, seed=26)
L[2] = layer(0.09 * grime - 0.05 * np.maximum(scr, scr2) + 0.03 * peel, 0.025 * peel + 0.14 * dent - 0.18 * np.maximum(scr, scr2) - 0.12 * chip, 0.6 * np.maximum(scr, scr2) + 0.85 * chip)

# 3 organic (hide, chitin, leaves): scales, each a little different, ridged between
d1, d2, idx, n = cells(110, 31); edge = norm01(d2 - d1, 0, 0.03); per = np.random.default_rng(32).random(n)[idx]
L[3] = layer(0.16 * (per - 0.5) + 0.08 * fbm(2.0, 3, 60, seed=33) - 0.08 * (1 - edge), 0.22 * edge + 0.08 * per + 0.04 * fbm(1.4, 20, 120, seed=34), 0.2 * (1 - edge))

# 4 skin: hardly anything, fine pores
L[4] = layer(0.02 * fbm(2.0, 3, 40, seed=41), 0.03 * fbm(1.0, 60, 128, seed=42), np.zeros((S, S)))

# 5 none (lights, glass): left as it is
L[5] = np.stack([np.full((S, S), 0.5), np.full((S, S), 0.5), np.zeros((S, S))], -1)

# 6 stone, concrete, earth: pores, aggregate, hairline cracks, stains, spalling
low = fbm(2.6, 3, 20, seed=61); hf = fbm(0.8, 40, 128, seed=62)
pores = np.clip((-hf - 2.3) / 0.7, 0, 1)
d1, d2, idx, n = cells(60, 63); agg = norm01(d1, 0, 0.06); aggv = np.random.default_rng(64).random(n)[idx]
c1, c2, _, _ = cells(14, 65); crack = np.clip(1 - (c2 - c1) / 0.004, 0, 1) * (fbm(2.0, 2, 12, seed=66) > 0.3)
spall = np.clip((fbm(2.2, 3, 50, seed=67) - 1.7) / 0.5, 0, 1)
stain = fbm(2.6, 3, 14, seed=68)
L[6] = layer(0.06 * stain + 0.05 * (aggv - 0.5) - 0.12 * pores - 0.16 * crack + 0.025 * hf,
             0.1 * low + 0.04 * (1 - agg) - 0.25 * pores - 0.25 * crack - 0.2 * spall + 0.03 * hf, 0.7 * spall)

# 7 wood: grain, growth lines, a knot or two
warp = fbm(2.8, 2, 6, seed=71, aniso=(0.5, 1.0))
grain = np.sin(2 * np.pi * (yy * 18 + 0.3 * warp)); fine = fbm(1.2, 20, 128, seed=72, aniso=(0.12, 1.0))
kd1, _, _, _ = cells(4, 73, 0.8); knot = np.clip(1 - kd1 / 0.035, 0, 1)
L[7] = layer(0.07 * grain + 0.06 * fine - 0.18 * knot, 0.06 * grain + 0.08 * fine + 0.1 * knot, np.zeros((S, S)))

# 8 soil (the land): grit, pebbles (some cells of a fine mosaic, domed, each its own shade), clods, a few dry cracks
grit = fbm(0.9, 50, 128, seed=81)
d1, d2, idx, n = cells(420, 82); per = np.random.default_rng(83).random(n)[idx]; peb = (per > 0.72).astype(float)
dome = np.clip(1 - d1 / 0.016, 0, 1) ** 0.6 * peb
clod = np.clip(fbm(2.2, 6, 60, seed=84), 0, None)
c1, c2, _, _ = cells(30, 85); dry = np.clip(1 - (c2 - c1) / 0.003, 0, 1) * (fbm(2.4, 3, 14, seed=86) > 0.6)
L[8] = layer(0.05 * grit + 0.1 * dome * (per - 0.86) * 4 + 0.04 * clod - 0.12 * dry - 0.04 * fbm(2.0, 3, 40, seed=87),
             0.04 * grit + 0.3 * dome + 0.1 * clod - 0.2 * dry, np.zeros((S, S)))

def stamp(acc_r, acc_g, n, seed, r0, r1, shape):
    """Things laid one over another (leaves, craters): shape(u, v, r) -> (shade, height or None) on a small wrapped window."""
    r = np.random.default_rng(seed)
    for _ in range(n):
        cx, cy, rr, a, sh = r.random() * S, r.random() * S, r0 + r.random() * (r1 - r0), r.random() * np.pi, r.random()
        R = int(rr * 1.6) + 2; ix = (np.arange(-R, R + 1) + int(cx)) % S; iy = (np.arange(-R, R + 1) + int(cy)) % S
        oy, ox = np.meshgrid(np.arange(-R, R + 1) + int(cy) - cy, np.arange(-R, R + 1) + int(cx) - cx, indexing='ij')
        u = ox * np.cos(a) + oy * np.sin(a); v = -ox * np.sin(a) + oy * np.cos(a)
        m, h = shape(u, v, rr, sh)
        sub_r = acc_r[np.ix_(iy, ix)]; sub_g = acc_g[np.ix_(iy, ix)]
        acc_r[np.ix_(iy, ix)] = np.where(m > 0, sub_r * (1 - m) + (sh - 0.5) * m, sub_r)
        if h is not None: acc_g[np.ix_(iy, ix)] = np.where(m > 0, np.maximum(sub_g * (1 - m * 0.5), h), sub_g) if h is not False else sub_g

# 9 rock (boulders, cliffs, standing stone): bedding planes warped through it, fractures, a rough grain, lichen in patches (B)
warp = fbm(2.6, 2, 8, seed=91)
bed = np.sin(2 * np.pi * (yy * 7 + 0.45 * warp)); bed = np.sign(bed) * np.abs(bed) ** 0.5
f1, f2, _, _ = cells(18, 92); frac = np.clip(1 - (f2 - f1) / 0.006, 0, 1) * (fbm(2.0, 2, 10, seed=93) > -0.2)
rough = fbm(1.1, 12, 128, seed=94); chunk = fbm(2.2, 3, 30, seed=95)
lichen = np.clip((fbm(1.6, 6, 90, seed=96) + 0.6 * fbm(2.4, 3, 12, seed=97) - 1.3) / 0.5, 0, 1)
L[9] = layer(0.05 * bed + 0.07 * chunk + 0.05 * rough - 0.22 * frac, 0.06 * bed + 0.14 * chunk + 0.05 * rough - 0.3 * frac, 0.85 * lichen)

# 10 bark: plates split by deep fissures running up the trunk, fine vertical fibre
b1, b2, bidx, bn = cells(70, 101, 1.0, sy=0.28); fis = np.clip((b2 - b1) / 0.02, 0, 1); plate = np.random.default_rng(102).random(bn)[bidx]
fib = fbm(1.2, 8, 128, seed=103, aniso=(1.0, 0.08))
L[10] = layer(0.08 * (plate - 0.5) + 0.05 * fib - 0.25 * (1 - fis), 0.32 * fis ** 0.7 + 0.05 * fib + 0.04 * plate, np.zeros((S, S)))

# 11 foliage: leaves laid over each other, each its own shade, a vein down it, the gaps between dark
fr = 0.5 + 0.0 * xx; fg = np.zeros((S, S))
def leaf(u, v, r, sh):
    e = (u / r) ** 2 + (v / (r * 0.45)) ** 2; m = np.clip((1 - e) * 4, 0, 1)
    vein = np.clip(1 - np.abs(v) / 0.8, 0, 1) * (np.abs(u) < r * 0.9)
    return m, np.where(m > 0, 0.55 + 0.35 * np.sqrt(np.clip(1 - e, 0, 1)) - 0.08 * vein + 0.1 * sh, 0)
stamp(fr, fg, 1500, 111, 5.0, 10.0, leaf)
gap = (fg < 0.05).astype(float)
L[11] = layer(fr * 0.6 - 0.18 * gap + 0.03 * fbm(2.0, 3, 40, seed=112), fg * 0.45 + 0.02 * fbm(1.0, 30, 128, seed=113), np.zeros((S, S)))

# 12 sand: wind ripples (a gentle slope up, a steep one down), a fine grain
sw = fbm(3.0, 1, 4, seed=121, aniso=(1.0, 0.5)); ph = (xx * 22 + yy * 2 + 0.55 * sw + 0.08 * fbm(2.0, 4, 30, seed=124)) % 1.0
rip = np.where(ph < 0.72, ph / 0.72, (1 - ph) / 0.28)
sgrain = fbm(0.6, 40, 128, seed=122)
L[12] = layer(0.04 * rip + 0.04 * sgrain + 0.03 * fbm(2.2, 3, 20, seed=123), 0.22 * rip + 0.03 * sgrain, np.zeros((S, S)))

# 13 snow: soft drifts and wind-cut ridges, a crust, glints (B)
drift = fbm(2.8, 2, 10, seed=131); sast = 1 - np.abs(fbm(2.4, 2, 24, seed=132, aniso=(0.35, 1.0)))
glint = (fbm(0.4, 60, 128, seed=133) > 2.6).astype(float)
L[13] = layer(0.03 * drift + 0.02 * sast + 0.015 * fbm(1.0, 30, 128, seed=134), 0.18 * drift + 0.12 * sast ** 2 + 0.01 * fbm(1.0, 40, 128, seed=135), glint)

# 14 grass, seen from above: thin blades every way, lighter at their tips, darker at their roots and between; bare patches (B)
gr = np.zeros((S, S)); gg = np.zeros((S, S))
def blade(u, v, r, sh):
    e = (u / r) ** 2 + (v / (r * 0.13)) ** 2; m = np.clip((1 - e) * 3, 0, 1)
    return m * (0.55 + 0.45 * np.clip(u / r * 0.5 + 0.5, 0, 1)), np.where(m > 0, 0.3 + 0.5 * np.clip(u / r * 0.5 + 0.5, 0, 1), 0)
stamp(gr, gg, 7000, 141, 5.0, 11.0, blade)
gr = gr * 0.9 + 0.0; bare = np.clip((fbm(2.2, 3, 20, seed=144) - 1.4) / 0.4, 0, 1)
L[14] = layer(0.35 * gr - 0.1 * (gg < 0.05) - 0.06 * bare + 0.04 * fbm(2.0, 3, 30, seed=145), 0.4 * gg - 0.1 * bare, 0.7 * bare)

# 15 regolith (airless and ash worlds): small craters, each a bowl in a raised rim, over fine grit
rr2 = 0.5 + 0.0 * xx; rg = 0.5 + 0.0 * xx
def crater(u, v, r, sh):
    d = np.sqrt(u * u + v * v) / r; m = np.clip((1.5 - d) * 3, 0, 1)
    h = np.where(d < 1, 0.5 - 0.35 * (1 - d * d), 0.5 + 0.2 * np.exp(-((d - 1.05) / 0.18) ** 2))
    return m * 0.0, None
reg_h = np.zeros((S, S)); reg_r = np.zeros((S, S)); rng3 = np.random.default_rng(151)
for _ in range(70):
    cx, cy, r = rng3.random(), rng3.random(), (0.006 + rng3.random() ** 3 * 0.05)
    dx = (xx - cx + 0.5) % 1 - 0.5; dy = (yy - cy + 0.5) % 1 - 0.5; d = np.sqrt(dx * dx + dy * dy) / r
    reg_h += np.where(d < 1, -0.6 * (1 - d * d), 0.25 * np.exp(-((d - 1.05) / 0.2) ** 2))
    reg_r += np.where(d < 1, -0.05, 0.06 * np.exp(-((d - 1.1) / 0.35) ** 2))
L[15] = layer(reg_r + 0.04 * fbm(0.8, 30, 128, seed=152) + 0.04 * fbm(2.2, 3, 20, seed=153), 0.35 * reg_h + 0.05 * fbm(0.9, 30, 128, seed=154), np.zeros((S, S)))

# 16 water: ripples every way (the sea scrolls two copies of this across each other, so it never repeats the same way)
wv = np.zeros((S, S)); rw = np.random.default_rng(161)
for _ in range(14):
    kx, ky = rw.integers(-9, 10), rw.integers(-9, 10)
    if kx == 0 and ky == 0: continue
    wv += np.sin(2 * np.pi * (kx * xx + ky * yy) + rw.random() * 6.28) / np.sqrt(kx * kx + ky * ky)
wv = wv / wv.std() * 0.6 + 0.4 * fbm(2.0, 4, 40, seed=162)
L[16] = layer(np.zeros((S, S)), 0.12 * wv, np.zeros((S, S)))

# (GC 0.92, Ramzies: "GTA V, not PlayStation 2") the made-up cloth, painted metal, concrete, wood, rock and bark give way to real
# photoscans (Poly Haven CC0: hessian_230, rusty_painted_metal, concrete_wall_008, raw_plank_wall, lichen_rock, bark_brown_02;
# their pictures kept small in tools/textures/scan_src). Such a layer holds: R how light or dark (0.5 the scan's mean), G its
# relief (from the scan's own displacement), B how much warmer or cooler than its mean (rust, dirt, lichen): surface.js reads
# those layers so (GC_SCAN), and they carry their wear in them already.
SRC = os.path.join(os.path.dirname(__file__), 'scan_src')
for k, name in [(1, 'fabric'), (2, 'hard'), (6, 'stone'), (7, 'wood'), (9, 'rock'), (10, 'bark')]:
    f = os.path.join(SRC, name + '_diff.jpg')
    if not os.path.exists(f): continue
    c = np.asarray(Image.open(f).convert('RGB').resize((S, S), Image.LANCZOS), np.float32) / 255
    h = np.asarray(Image.open(os.path.join(SRC, name + '_disp.jpg')).convert('L').resize((S, S), Image.LANCZOS), np.float32) / 255
    lum = c @ np.array([0.3, 0.59, 0.11], np.float32); lr = lum / max(lum.mean(), 1e-3)
    warm = (c[..., 0] - c[..., 2]); warm = warm - warm.mean()
    R = 0.5 + np.clip((lr - 1) * 0.42, -0.5, 0.5); G = 0.5 + (h - h.mean()) / (h.std() + 1e-6) * 0.14; B = 0.5 + np.clip(warm * 1.6, -0.5, 0.5)
    L[k] = np.stack([np.clip(R, 0, 1), np.clip(G, 0, 1), np.clip(B, 0, 1)], -1)

out = np.concatenate([L[i] for i in range(17)], 0)
dst = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'textures'); os.makedirs(dst, exist_ok=True)
img = Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGB')
p = os.path.join(dst, 'detail.png'); img.save(p, optimize=True)
print(p, os.path.getsize(p), out.shape)
if len(sys.argv) > 1:     # a look: each layer's three channels side by side, and a lit preview of its bumps
    prev = []
    for i in range(17):
        a = L[i]; h = a[..., 1]; gx = np.roll(h, -1, 1) - np.roll(h, 1, 1); gy = np.roll(h, -1, 0) - np.roll(h, 1, 0)
        lit = np.clip(0.6 + 3.0 * (gx * 0.7 - gy * 0.7), 0, 1) * (0.5 + a[..., 0])
        prev.append(np.concatenate([a[..., 0], a[..., 1], a[..., 2], np.clip(lit, 0, 1)], 1))
    Image.fromarray((np.concatenate(prev, 0) * 255).astype(np.uint8), 'L').save(sys.argv[1]); print('preview', sys.argv[1])
