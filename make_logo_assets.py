#!/usr/bin/env python3
"""Generate the Dissensus logo asset system from dissensus-logo.png.
Crops the black frame, keys out the white field to transparency (min-channel,
un-fringed), then emits: transparent mark @ sizes, flat mono (wine/white),
favicons + .ico + apple-touch, and a 1200x630 OG card."""
import os, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = "logo-assets"
os.makedirs(OUT, exist_ok=True)
WINE = (192, 64, 85)
BURG = (128, 0, 32)
INK  = (5, 5, 5)
OFF  = (237, 237, 237)

# ── load + trim black frame ───────────────────────────────────────────────
a = np.asarray(Image.open("dissensus-logo.png").convert("RGB")).astype(np.int16)
bright = a.mean(axis=2)
row_ok = bright.mean(axis=1) > 40
col_ok = bright.mean(axis=0) > 40
ys, xs = np.where(row_ok)[0], np.where(col_ok)[0]
a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]     # white field + mark
print("after frame trim:", a.shape[1], "x", a.shape[0])

# ── key out white → alpha (min-channel ramp) + un-fringe ──────────────────
mn = a.min(axis=2)
lo, hi = 205, 245
alpha = np.clip((hi - mn) / (hi - lo), 0, 1)            # 0..1
af3 = alpha[..., None]
with np.errstate(divide="ignore", invalid="ignore"):
    un = (a.astype(np.float32) - (1 - af3) * 255) / np.where(af3 < 1e-3, 1, af3)
un = np.clip(un, 0, 255)
un[alpha < 1e-3] = 0                                     # clean fully-transparent px
rgba = np.dstack([un.astype(np.uint8), (alpha * 255).astype(np.uint8)])
mark = Image.fromarray(rgba, "RGBA")

# ── trim to alpha bbox ────────────────────────────────────────────────────
al = np.asarray(mark)[..., 3]
ys, xs = np.where(al > 8)
mark = mark.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
print("mark trimmed:", mark.size)
mark.save(f"{OUT}/dissensus-mark.png")

# ── helpers ───────────────────────────────────────────────────────────────
def square(img, size, bg=None):
    w, h = img.size; m = max(w, h)
    cv = Image.new("RGBA", (m, m), (0, 0, 0, 0) if bg is None else bg)
    cv.paste(img, ((m - w) // 2, (m - h) // 2), img)
    return cv.resize((size, size), Image.LANCZOS)

def mono(img, color):
    al = img.split()[3]
    s = Image.new("RGBA", img.size, color + (0,))
    s.putalpha(al)
    return s

# ── transparent mark @ sizes (aspect kept) ────────────────────────────────
for s in (512, 256, 192, 128, 96, 64, 48):
    h = round(s * mark.height / mark.width)
    mark.resize((s, h), Image.LANCZOS).save(f"{OUT}/dissensus-mark-{s}.png")

# ── flat mono (for small sizes / dark nav) ────────────────────────────────
mono(mark, WINE).save(f"{OUT}/dissensus-mark-mono-wine.png")
mono(mark, OFF).save(f"{OUT}/dissensus-mark-mono-white.png")
for s in (64, 32):
    square(mono(mark, WINE), s).save(f"{OUT}/mono-wine-{s}.png")

# ── favicons ──────────────────────────────────────────────────────────────
wine = mono(mark, WINE)
square(wine, 32).save(f"{OUT}/favicon-32.png")
square(wine, 16).save(f"{OUT}/favicon-16.png")
square(wine, 48).save(f"{OUT}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
appl = Image.new("RGBA", (180, 180), INK + (255,))
mk = square(mark, 138)
appl.paste(mk, (21, 21), mk)
appl.convert("RGB").save(f"{OUT}/apple-touch-icon-180.png")

# ── OG / social card 1200x630 ─────────────────────────────────────────────
def find_font(names, size):
    cands = []
    for n in names:
        cands += glob.glob(f"/usr/share/fonts/**/{n}", recursive=True)
    for p in cands:
        try: return ImageFont.truetype(p, size)
        except Exception: pass
    return ImageFont.load_default()

f_big  = find_font(["DejaVuSans-Bold.ttf", "*Sans*Bold.ttf", "Inter*Bold*.ttf"], 82)
f_mono = find_font(["DejaVuSansMono.ttf", "*Mono*.ttf", "IBMPlexMono*.ttf"], 26)
f_med  = find_font(["DejaVuSans.ttf", "*Sans*.ttf"], 34)

og = Image.new("RGB", (1200, 630), INK)
d = ImageDraw.Draw(og)
mk = square(mark, 300)
og.paste(mk, (86, 165), mk)
tx = 470
d.line([(tx + 3, 190), (tx + 70, 190)], fill=WINE, width=3)
d.text((tx, 205), "Dissensus", font=f_big, fill=OFF)
d.text((tx + 3, 312), "ADVERSARIAL SYSTEMS RESEARCH", font=f_mono, fill=WINE)
d.text((tx + 3, 366), "Agents, friction, and the cost", font=f_med, fill=(158, 158, 158))
d.text((tx + 3, 406), "of equilibria.", font=f_med, fill=(158, 158, 158))
og.save(f"{OUT}/og-image.png")

print("\nGENERATED:")
for f in sorted(os.listdir(OUT)):
    kb = os.path.getsize(f"{OUT}/{f}") / 1024
    print(f"  {f:34s} {kb:7.1f} KB")
