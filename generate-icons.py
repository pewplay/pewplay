#!/usr/bin/env python3
"""Genera tutte le icone da favicon.png (richiede Pillow: pip install Pillow)"""
from PIL import Image

src = Image.open("favicon.png").convert("RGBA")

for name, s in {"icon-32.png": 32, "icon-192.png": 192, "icon-512.png": 512}.items():
    src.resize((s, s), Image.LANCZOS).save(name, "PNG")
    print(f"✅ {name} ({s}x{s})")

for s in [192, 512]:
    canvas = Image.new("RGBA", (s, s), (108, 92, 231, 255))
    pad = int(s * 0.1)
    inner = src.resize((s - 2*pad, s - 2*pad), Image.LANCZOS)
    canvas.paste(inner, (pad, pad), inner)
    canvas.save(f"icon-maskable-{s}.png", "PNG")
    print(f"✅ icon-maskable-{s}.png")

img32 = src.resize((32, 32), Image.LANCZOS)
img32.save("favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)])
print("✅ favicon.ico")
