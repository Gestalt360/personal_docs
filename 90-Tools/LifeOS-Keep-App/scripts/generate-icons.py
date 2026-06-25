"""
Generate PWA icons for LifeOS Keep App.
Produces 192x192 and 512x512 PNGs in public/assets/.
"""
import os
from PIL import Image, ImageDraw

OUT_DIR = os.path.join(
    os.path.expanduser("~"),
    "source/personal_docs/90-Tools/LifeOS-Keep-App/public/assets"
)
os.makedirs(OUT_DIR, exist_ok=True)

def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded green square base
    margin = size // 12
    r = size // 6
    base_color = (80, 180, 120, 255)  # #50b478
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=r,
        fill=base_color
    )

    # White note paper shape (inner rectangle)
    inner_margin = size // 5
    paper_color = (255, 255, 255, 230)
    draw.rounded_rectangle(
        [inner_margin, inner_margin, size - inner_margin, size - inner_margin],
        radius=r // 2,
        fill=paper_color
    )

    # Checkmark in green
    check_color = (80, 180, 120, 255)
    cx, cy = size // 2, size // 2 - size // 16
    check_size = size // 8
    # Draw a simple checkmark
    draw.line(
        [(cx - check_size, cy), (cx - check_size//4, cy + check_size//2),
         (cx + check_size, cy - check_size//2)],
        fill=check_color, width=max(size // 32, 3)
    )

    # Decorative horizontal lines (text lines)
    line_color = (180, 180, 180, 180)
    line_y1 = cy + check_size // 2 + size // 10
    line_w = size // 3
    for i in range(3):
        y = line_y1 + i * (size // 16)
        draw.line(
            [(cx - line_w//2, y), (cx + line_w//2, y)],
            fill=line_color, width=max(size // 48, 2)
        )
    return img

# Generate both sizes
for sz in [192, 512]:
    img = make_icon(sz)
    path = os.path.join(OUT_DIR, f"icon-{sz}.png")
    img.save(path, "PNG")
    print(f"✅ Created {path} ({sz}x{sz})")
