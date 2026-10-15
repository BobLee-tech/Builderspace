"""Generate Paper liquid-metal input once, with Pillow + NumPy.

After `pnpm build`, run:
  python scripts/generate-works-metal.py
Optional first argument: the self-hosted Unbounded variable .woff2 file.
Matches Paper Shaders 0.0.81's red/black SOR (40 passes, omega=1.9):
R = Poisson edge gradient; G = original text alpha; B = 255; A = 255.
No font processing or Poisson solve runs in the browser.
"""
from pathlib import Path
import re
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
# The last headline line in src/components/hero-headline.tsx.
WORD = 'work.'
if len(sys.argv) > 1:
    font_path = Path(sys.argv[1])
else:
    font_path = None
    for css in (root / '.next/static/chunks').glob('*.css'):
        for face in re.findall(r'@font-face\{[^}]+\}', css.read_text()):
            if 'font-family:Unbounded;' in face and ('U+??' in face or 'U+0000-00FF' in face):
                url = re.search(r'src:url\(([^)]+)\)', face).group(1)
                font_path = (css.parent / url).resolve()
                break
        if font_path:
            break
    if not font_path:
        raise SystemExit('Run pnpm build, or pass the Unbounded woff2 path.')

size = 400
font = ImageFont.truetype(str(font_path), size)
font.set_variation_by_axes([800])
spacing = -0.06 * size
width = round(font.getlength(WORD) + len(WORD) * spacing)
height = round(size * .84)
px, py = round(size * .06), round(size * .22)
alpha = Image.new('L', (width + 2 * px, height + 2 * py))
g = ImageDraw.Draw(alpha)
# Centre the visual glyph box, like the prototype's canvas text mask.
bbox = font.getbbox(WORD, anchor='ls')
baseline = py + (height - bbox[1] - bbox[3]) / 2
x = px
for letter in WORD:
    g.text((x, baseline), letter, fill=255, font=font, anchor='ls')
    x += font.getlength(letter) + spacing

original = np.array(alpha)
mask = original > 0
padded = np.pad(mask, 1)
interior = mask.copy()
for dy in range(3):
    for dx in range(3):
        interior &= padded[dy:dy + mask.shape[0], dx:dx + mask.shape[1]]
y, x = np.indices(mask.shape)
red = interior & ((x + y) % 2 == 0)
black = interior & ((x + y) % 2 == 1)
u = np.zeros(mask.shape, dtype=np.float32)
for _ in range(40):
    for colour in (red, black):
        padded_u = np.pad(u, 1)
        neighbours = padded_u[:-2, 1:-1] + padded_u[2:, 1:-1] + padded_u[1:-1, :-2] + padded_u[1:-1, 2:]
        u[colour] = 1.9 * (.01 + neighbours[colour]) / 4 - .9 * u[colour]
gradient = np.clip(np.rint(255 * (1 - u / u.max())), 0, 255).astype(np.uint8)
rgba = np.stack([gradient, original, np.full_like(original, 255), np.full_like(original, 255)], axis=-1)
out = root / 'public/works-metal.png'
Image.fromarray(rgba).save(out, optimize=True)
print(f'{out}: {alpha.width} x {alpha.height}, {out.stat().st_size} bytes')
