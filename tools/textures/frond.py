# (GC 0.91) A fir's frond, for the pine the game builds from cards (js/scans.js): a twig along the picture from left to right
# with side twigs, every one set with short needles both ways, darker inside, lighter at the tips; transparent between.
# python3 tools/textures/frond.py -> assets/scans/models/pine_frond.png (512 x 256, RGBA)
import numpy as np, os
from PIL import Image, ImageDraw
W, H, SS = 1024, 512, 1
rng = np.random.default_rng(31)
im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
def needles(x0, y0, ang, length, spread, density, scale, shade):
    n = int(length * density)
    for i in range(n):
        t = i / max(1, n - 1); px = x0 + np.cos(ang) * length * t; py = y0 + np.sin(ang) * length * t
        for side in (-1, 1):
            a = ang + side * (spread + rng.normal(0, 0.18)); L = scale * (0.55 + 0.45 * (1 - t) ** 0.6) * (0.8 + 0.4 * rng.random())
            g = shade * (0.75 + 0.5 * rng.random()); tip = min(1.0, g * 1.35)
            col = (int(34 * g), int(70 * g + 10), int(32 * g), 255); col2 = (int(60 * tip), int(104 * tip + 10), int(48 * tip), 255)
            ex, ey = px + np.cos(a) * L, py + np.sin(a) * L; mx, my = (px + ex) / 2, (py + ey) / 2
            d.line([(px, py), (mx, my)], fill=col, width=3); d.line([(mx, my), (ex, ey)], fill=col2, width=2)
# the main twig and its side twigs, then the needles over them
main = (30, H / 2, -0.03, W - 70)
twigs = [main]
for i in range(9):
    t = 0.12 + i * 0.09; x = main[0] + main[3] * t; y = H / 2 - main[3] * t * 0.03
    for side in (-1, 1):
        if rng.random() < 0.85: twigs.append((x, y, side * (0.75 + 0.25 * rng.random()) - 0.03, (1 - t) * 260 + 40))
for (x, y, a, L) in twigs:
    d.line([(x, y), (x + np.cos(a) * L, y + np.sin(a) * L)], fill=(70, 48, 30, 255), width=5 if L > 400 else 3)
for (x, y, a, L) in twigs[1:]: needles(x, y, a, L, 0.95, 0.55, 34, 0.85)
needles(*main[:3], main[3], 1.05, 0.45, 42, 1.0)
im = im.resize((512, 256), Image.LANCZOS)
a = np.array(im).astype(np.float32); al = a[..., 3:4] / 255.0
rgb = np.where(al > 0.02, a[..., :3] / np.maximum(al, 1e-3), 0)     # (un-premultiplied: no dark fringe where it is cut out)
out = np.concatenate([np.clip(rgb, 0, 255), a[..., 3:4]], -1).astype(np.uint8)
p = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'scans', 'models', 'pine_frond.png'); Image.fromarray(out, 'RGBA').save(p, optimize=True); print(p, os.path.getsize(p))
