#!/usr/bin/env python3
"""Generate WebP images for Bristol Emergency Plumber website."""

import math
import os
import random

from PIL import Image, ImageDraw, ImageFont

# Site colour palette
PRIMARY = (26, 95, 122)       # #1a5f7a
PRIMARY_DARK = (19, 75, 97)   # #134b61
SECONDARY = (230, 57, 70)     # #e63946
ACCENT = (244, 162, 97)       # #f4a261
WHITE = (255, 255, 255)
LIGHT_BLUE = (79, 195, 247)   # #4fc3f7

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')


def lerp_color(c1, c2, t):
    """Linearly interpolate between two RGB colours."""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def draw_gradient(draw, width, height, color1, color2, angle=135):
    """Draw a diagonal gradient."""
    rad = math.radians(angle)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)
    max_d = abs(width * cos_a) + abs(height * sin_a)
    for y in range(height):
        for x in range(0, width, 2):
            d = x * cos_a + y * sin_a
            t = max(0, min(1, (d / max_d + 0.5)))
            color = lerp_color(color1, color2, t)
            draw.rectangle([x, y, x + 1, y], fill=color)


def draw_gradient_fast(img, color1, color2, angle=135):
    """Draw a gradient using numpy-like row operations for speed."""
    width, height = img.size
    draw = ImageDraw.Draw(img)
    rad = math.radians(angle)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)
    max_d = abs(width * cos_a) + abs(height * sin_a)
    for y in range(height):
        # Calculate colour at left and right edge of this row
        t_left = max(0, min(1, (0 * cos_a + y * sin_a) / max_d + 0.5))
        t_right = max(0, min(1, (width * cos_a + y * sin_a) / max_d + 0.5))
        c_left = lerp_color(color1, color2, t_left)
        c_right = lerp_color(color1, color2, t_right)
        # Draw horizontal gradient line
        for x in range(0, width, 4):
            t = x / width
            color = lerp_color(c_left, c_right, t)
            draw.rectangle([x, y, x + 3, y], fill=color)
    return draw


def draw_circle(draw, cx, cy, r, fill=None, outline=None, width=1):
    """Draw a circle centered at (cx, cy)."""
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=outline, width=width)


def draw_wrench(draw, x, y, scale=1.0, color=WHITE):
    """Draw a simplified wrench silhouette."""
    s = scale
    # Handle
    draw.rectangle([x, y, x + int(80 * s), y + int(16 * s)], fill=color)
    # Head (open jaw)
    draw.polygon([
        (x + int(80 * s), y - int(12 * s)),
        (x + int(110 * s), y - int(12 * s)),
        (x + int(110 * s), y + int(28 * s)),
        (x + int(80 * s), y + int(28 * s)),
    ], fill=color)
    # Jaw opening
    draw.rectangle([x + int(88 * s), y + int(2 * s), x + int(105 * s), y + int(14 * s)],
                   fill=lerp_color(PRIMARY_DARK, (0, 0, 0), 0.3))


def draw_water_drop(draw, cx, cy, size=30, color=LIGHT_BLUE):
    """Draw a water droplet shape."""
    # Teardrop: circle at bottom, triangle at top
    r = size // 2
    draw_circle(draw, cx, cy + r // 2, r, fill=color)
    draw.polygon([
        (cx, cy - size),
        (cx - r, cy + r // 2),
        (cx + r, cy + r // 2),
    ], fill=color)


def draw_pipe_horizontal(draw, x, y, length, thickness=20, color=None):
    """Draw a horizontal pipe segment."""
    if color is None:
        color = lerp_color(PRIMARY, WHITE, 0.15)
    draw.rectangle([x, y, x + length, y + thickness], fill=color)
    # Highlights
    highlight = lerp_color(color, WHITE, 0.3)
    draw.rectangle([x, y + 2, x + length, y + 5], fill=highlight)


def draw_pipe_vertical(draw, x, y, length, thickness=20, color=None):
    """Draw a vertical pipe segment."""
    if color is None:
        color = lerp_color(PRIMARY, WHITE, 0.15)
    draw.rectangle([x, y, x + thickness, y + length], fill=color)
    highlight = lerp_color(color, WHITE, 0.3)
    draw.rectangle([x + 2, y, x + 5, y + length], fill=highlight)


def draw_pipe_elbow(draw, x, y, thickness=20, direction='tr', color=None):
    """Draw a pipe elbow joint."""
    if color is None:
        color = lerp_color(PRIMARY, WHITE, 0.15)
    joint_color = lerp_color(color, WHITE, 0.1)
    draw.ellipse([x - thickness // 2, y - thickness // 2,
                  x + thickness + thickness // 2, y + thickness + thickness // 2],
                 fill=joint_color)


def draw_building_silhouette(draw, x, base_y, width, height, color, windows=True):
    """Draw a building silhouette with optional windows."""
    draw.rectangle([x, base_y - height, x + width, base_y], fill=color)
    # Roof
    roof_h = height // 6
    draw.polygon([
        (x - 3, base_y - height),
        (x + width // 2, base_y - height - roof_h),
        (x + width + 3, base_y - height),
    ], fill=color)
    if windows and width > 20:
        win_color = lerp_color(color, ACCENT, 0.4)
        win_w = max(4, width // 6)
        win_h = max(6, height // 8)
        cols = max(1, (width - 10) // (win_w + 6))
        rows = max(1, (height - 20) // (win_h + 8))
        x_start = x + (width - cols * (win_w + 6)) // 2
        for row in range(rows):
            for col in range(cols):
                wx = x_start + col * (win_w + 6)
                wy = base_y - height + 15 + row * (win_h + 8)
                if wy + win_h < base_y - 5:
                    draw.rectangle([wx, wy, wx + win_w, wy + win_h], fill=win_color)


def draw_map_pin(draw, cx, cy, size=40, color=SECONDARY):
    """Draw a map/location pin."""
    r = size // 2
    # Circle head
    draw_circle(draw, cx, cy, r, fill=color)
    # Pin point
    draw.polygon([
        (cx - r + 5, cy + r // 2),
        (cx, cy + size + r // 2),
        (cx + r - 5, cy + r // 2),
    ], fill=color)
    # Inner dot
    draw_circle(draw, cx, cy, r // 3, fill=WHITE)


def draw_compass_indicator(draw, cx, cy, direction, size=60, color=ACCENT):
    """Draw a compass direction indicator."""
    r = size // 2
    # Outer ring
    draw_circle(draw, cx, cy, r, outline=color, width=3)
    # Direction arrow
    arrow_len = r - 8
    angles = {'N': -90, 'S': 90, 'E': 0, 'W': 180}
    angle = math.radians(angles.get(direction, 0))
    tip_x = cx + int(arrow_len * math.cos(angle))
    tip_y = cy + int(arrow_len * math.sin(angle))
    draw.line([(cx, cy), (tip_x, tip_y)], fill=color, width=3)
    # Arrow head
    draw_circle(draw, tip_x, tip_y, 5, fill=color)
    # Centre dot
    draw_circle(draw, cx, cy, 4, fill=color)


def generate_hero_home(filepath):
    """Generate home page hero image — plumbing themed."""
    w, h = 1920, 800
    img = Image.new('RGB', (w, h))
    draw = draw_gradient_fast(img, PRIMARY, PRIMARY_DARK, angle=135)

    # Semi-transparent overlay shapes for depth
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)

    # Pipe network across the background
    pipe_color = (*lerp_color(PRIMARY, WHITE, 0.08), 60)

    # Horizontal pipes
    for y_pos in [120, 280, 480, 650]:
        odraw.rectangle([0, y_pos, w, y_pos + 24], fill=pipe_color)
        # Highlight
        odraw.rectangle([0, y_pos + 3, w, y_pos + 6], fill=(*WHITE, 15))

    # Vertical pipes
    for x_pos in [200, 500, 900, 1300, 1700]:
        odraw.rectangle([x_pos, 0, x_pos + 24, h], fill=pipe_color)
        odraw.rectangle([x_pos + 3, 0, x_pos + 6, h], fill=(*WHITE, 15))

    # Elbow joints at intersections
    for x_pos in [200, 500, 900, 1300, 1700]:
        for y_pos in [120, 280, 480, 650]:
            odraw.ellipse([x_pos - 8, y_pos - 8, x_pos + 32, y_pos + 32],
                         fill=(*lerp_color(PRIMARY, WHITE, 0.12), 70))

    # Water droplets scattered
    random.seed(42)
    for _ in range(25):
        dx = random.randint(50, w - 50)
        dy = random.randint(50, h - 50)
        ds = random.randint(15, 35)
        drop_color = (*LIGHT_BLUE, random.randint(30, 70))
        r = ds // 2
        odraw.ellipse([dx - r, dy, dx + r, dy + ds], fill=drop_color)
        odraw.polygon([(dx, dy - ds // 2), (dx - r, dy + r // 2), (dx + r, dy + r // 2)],
                     fill=drop_color)

    # Wrench silhouettes
    wrench_color = (*WHITE, 25)
    for wx, wy, ws, wr in [(150, 350, 2.5, 15), (1400, 150, 3.0, -20), (800, 550, 2.0, 30)]:
        # Rotated wrench using rectangles as approximation
        odraw.rectangle([wx, wy, wx + int(100 * ws), wy + int(18 * ws)], fill=wrench_color)
        odraw.rectangle([wx + int(85 * ws), wy - int(14 * ws),
                        wx + int(120 * ws), wy + int(32 * ws)], fill=wrench_color)
        odraw.rectangle([wx + int(92 * ws), wy + int(2 * ws),
                        wx + int(112 * ws), wy + int(16 * ws)],
                       fill=(*PRIMARY_DARK, 40))

    # Large decorative circles
    for cx, cy, cr in [(1600, 200, 180), (300, 600, 150), (1000, 100, 120)]:
        odraw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr],
                     outline=(*LIGHT_BLUE, 30), width=2)
        odraw.ellipse([cx - cr + 20, cy - cr + 20, cx + cr - 20, cy + cr - 20],
                     outline=(*WHITE, 20), width=1)

    # Subtle diagonal lines for texture
    for i in range(-h, w + h, 80):
        odraw.line([(i, 0), (i + h, h)], fill=(*WHITE, 8), width=1)

    img.paste(Image.alpha_composite(Image.new('RGBA', (w, h), (0, 0, 0, 0)), overlay).convert('RGB'),
              mask=overlay.split()[3])

    img.save(filepath, 'WEBP', quality=80)
    print(f"  Created: {filepath} ({os.path.getsize(filepath)} bytes)")


def generate_hero_locations(filepath):
    """Generate locations page hero image — cityscape/map themed."""
    w, h = 1920, 600
    img = Image.new('RGB', (w, h))
    draw = draw_gradient_fast(img, lerp_color(PRIMARY, PRIMARY_DARK, 0.3),
                               lerp_color(PRIMARY_DARK, (10, 40, 60), 0.5), angle=150)

    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)

    # Grid lines (map-like)
    grid_color = (*WHITE, 12)
    for x in range(0, w, 60):
        odraw.line([(x, 0), (x, h)], fill=grid_color, width=1)
    for y in range(0, h, 60):
        odraw.line([(0, y), (w, y)], fill=grid_color, width=1)

    # Bristol skyline silhouette at bottom
    base_y = h - 20
    buildings = [
        (50, 120), (110, 90), (160, 150), (230, 80), (290, 130),
        (350, 170), (430, 100), (490, 140), (560, 110), (620, 160),
        (700, 95), (760, 180), (840, 120), (900, 85), (960, 145),
        (1030, 130), (1100, 170), (1180, 100), (1240, 155), (1320, 90),
        (1380, 140), (1450, 115), (1520, 165), (1600, 95), (1680, 130),
        (1750, 110), (1830, 145),
    ]
    silhouette_color = (*lerp_color(PRIMARY_DARK, (0, 0, 0), 0.3), 50)
    for bx, bh in buildings:
        bw = random.randint(40, 65)
        odraw.rectangle([bx, base_y - bh, bx + bw, base_y], fill=silhouette_color)
        # Peaked roof for some
        if bh > 120:
            odraw.polygon([
                (bx - 2, base_y - bh),
                (bx + bw // 2, base_y - bh - 20),
                (bx + bw + 2, base_y - bh),
            ], fill=silhouette_color)

    # Clifton Suspension Bridge silhouette (iconic Bristol)
    bridge_color = (*lerp_color(PRIMARY, WHITE, 0.15), 45)
    # Towers
    odraw.rectangle([750, base_y - 220, 770, base_y - 80], fill=bridge_color)
    odraw.rectangle([1150, base_y - 220, 1170, base_y - 80], fill=bridge_color)
    # Deck
    odraw.rectangle([770, base_y - 100, 1150, base_y - 90], fill=bridge_color)
    # Cables (catenary approximation)
    for offset in range(0, 380, 30):
        cx = 770 + offset
        sag = int(40 * math.sin(math.pi * offset / 380))
        odraw.line([(cx, base_y - 220 + sag), (cx, base_y - 95)], fill=bridge_color, width=1)
    # Main cable
    for x in range(770, 1150, 3):
        t = (x - 770) / 380
        sag = int(40 * math.sin(math.pi * t))
        odraw.rectangle([x, base_y - 220 + sag, x + 2, base_y - 218 + sag], fill=bridge_color)

    # Map pins scattered
    pin_positions = [(300, 180), (600, 250), (960, 150), (1300, 200), (1650, 170)]
    for px, py in pin_positions:
        pin_size = 30
        pr = pin_size // 2
        pin_color = (*SECONDARY, 80)
        odraw.ellipse([px - pr, py - pr, px + pr, py + pr], fill=pin_color)
        odraw.polygon([(px - pr + 5, py + pr // 2), (px, py + pin_size + pr // 2),
                       (px + pr - 5, py + pr // 2)], fill=pin_color)
        odraw.ellipse([px - pr // 3, py - pr // 3, px + pr // 3, py + pr // 3],
                     fill=(*WHITE, 80))

    # Decorative circles (compass rose feel)
    for cx, cy, cr in [(960, 300, 200), (960, 300, 160), (960, 300, 120)]:
        odraw.ellipse([cx - cr, cy - cr, cx + cr, cy + cr],
                     outline=(*ACCENT, 20), width=1)

    # Diagonal texture
    for i in range(-h, w + h, 100):
        odraw.line([(i, 0), (i + h, h)], fill=(*WHITE, 6), width=1)

    img.paste(Image.alpha_composite(Image.new('RGBA', (w, h), (0, 0, 0, 0)), overlay).convert('RGB'),
              mask=overlay.split()[3])

    img.save(filepath, 'WEBP', quality=80)
    print(f"  Created: {filepath} ({os.path.getsize(filepath)} bytes)")


def generate_location_card(filepath, direction, tint_offset, buildings_config):
    """Generate a location card image."""
    w, h = 600, 400
    # Unique tint per card
    base1 = lerp_color(PRIMARY, tint_offset, 0.15)
    base2 = lerp_color(PRIMARY_DARK, tint_offset, 0.1)

    img = Image.new('RGB', (w, h))
    draw = draw_gradient_fast(img, base1, base2, angle=140)

    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)

    # Subtle grid
    grid_color = (*WHITE, 10)
    for x in range(0, w, 40):
        odraw.line([(x, 0), (x, h)], fill=grid_color, width=1)
    for y in range(0, h, 40):
        odraw.line([(0, y), (w, y)], fill=grid_color, width=1)

    # Building silhouettes along the bottom
    base_y = h - 15
    bldg_color = (*lerp_color(PRIMARY_DARK, (0, 0, 0), 0.4), 60)
    for bx, bw, bh, has_roof in buildings_config:
        odraw.rectangle([bx, base_y - bh, bx + bw, base_y], fill=bldg_color)
        if has_roof:
            odraw.polygon([
                (bx - 2, base_y - bh),
                (bx + bw // 2, base_y - bh - 15),
                (bx + bw + 2, base_y - bh),
            ], fill=bldg_color)
        # Windows
        win_c = (*ACCENT, 35)
        for wy in range(base_y - bh + 15, base_y - 10, 25):
            for wx in range(bx + 8, bx + bw - 8, 18):
                if wx + 8 < bx + bw - 5:
                    odraw.rectangle([wx, wy, wx + 8, wy + 12], fill=win_c)

    # Compass indicator in upper area
    cx, cy = 480, 100
    r = 45
    compass_color = (*ACCENT, 100)
    odraw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=compass_color, width=2)
    odraw.ellipse([cx - r + 8, cy - r + 8, cx + r - 8, cy + r - 8], outline=(*WHITE, 40), width=1)
    # Direction arrow
    angles = {'N': -90, 'S': 90, 'E': 0, 'W': 180}
    angle = math.radians(angles.get(direction, 0))
    arrow_len = r - 12
    tip_x = cx + int(arrow_len * math.cos(angle))
    tip_y = cy + int(arrow_len * math.sin(angle))
    odraw.line([(cx, cy), (tip_x, tip_y)], fill=compass_color, width=3)
    odraw.ellipse([tip_x - 5, tip_y - 5, tip_x + 5, tip_y + 5], fill=compass_color)
    odraw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=compass_color)
    # Cardinal marks
    for label, a in [('N', -90), ('S', 90), ('E', 0), ('W', 180)]:
        ar = math.radians(a)
        mark_x = cx + int((r + 12) * math.cos(ar))
        mark_y = cy + int((r + 12) * math.sin(ar))
        mark_c = (*ACCENT, 120) if label == direction else (*WHITE, 50)
        odraw.ellipse([mark_x - 3, mark_y - 3, mark_x + 3, mark_y + 3], fill=mark_c)

    # Decorative elements
    # Large faded circle
    odraw.ellipse([100 - 80, 80 - 80, 100 + 80, 80 + 80], outline=(*LIGHT_BLUE, 25), width=2)
    # Diagonal texture
    for i in range(-h, w + h, 60):
        odraw.line([(i, 0), (i + h, h)], fill=(*WHITE, 5), width=1)

    # Map pin
    px, py = 150, 200
    pin_size = 25
    pr = pin_size // 2
    pin_color = (*SECONDARY, 90)
    odraw.ellipse([px - pr, py - pr, px + pr, py + pr], fill=pin_color)
    odraw.polygon([(px - pr + 4, py + pr // 2), (px, py + pin_size + pr // 2),
                   (px + pr - 4, py + pr // 2)], fill=pin_color)
    odraw.ellipse([px - pr // 3, py - pr // 3, px + pr // 3, py + pr // 3], fill=(*WHITE, 90))

    img.paste(Image.alpha_composite(Image.new('RGBA', (w, h), (0, 0, 0, 0)), overlay).convert('RGB'),
              mask=overlay.split()[3])

    img.save(filepath, 'WEBP', quality=80)
    print(f"  Created: {filepath} ({os.path.getsize(filepath)} bytes)")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    random.seed(42)

    print("Generating hero images...")
    generate_hero_home(os.path.join(OUTPUT_DIR, 'hero-emergency-plumber-bristol.webp'))
    generate_hero_locations(os.path.join(OUTPUT_DIR, 'hero-locations-bristol.webp'))

    print("Generating location card images...")

    # North Bristol — semi-detached, modern
    generate_location_card(
        os.path.join(OUTPUT_DIR, 'location-north-bristol.webp'),
        direction='N',
        tint_offset=(40, 120, 160),
        buildings_config=[
            (20, 55, 100, True), (90, 50, 80, True), (155, 60, 120, False),
            (230, 45, 70, True), (290, 55, 95, True), (360, 65, 110, False),
            (440, 50, 85, True), (505, 55, 100, True),
        ]
    )

    # South Bristol — Victorian terraces (narrower, taller, more uniform)
    generate_location_card(
        os.path.join(OUTPUT_DIR, 'location-south-bristol.webp'),
        direction='S',
        tint_offset=(80, 90, 130),
        buildings_config=[
            (15, 35, 110, True), (60, 35, 115, True), (105, 35, 108, True),
            (150, 35, 112, True), (195, 35, 118, True), (240, 35, 105, True),
            (285, 35, 110, True), (330, 35, 115, True), (375, 35, 108, True),
            (420, 35, 112, True), (465, 35, 118, True), (510, 35, 105, True),
            (555, 35, 110, True),
        ]
    )

    # East Bristol — diverse housing mix
    generate_location_card(
        os.path.join(OUTPUT_DIR, 'location-east-bristol.webp'),
        direction='E',
        tint_offset=(50, 100, 140),
        buildings_config=[
            (10, 60, 90, True), (85, 40, 130, False), (140, 55, 80, True),
            (210, 70, 110, False), (295, 45, 95, True), (355, 55, 140, False),
            (425, 50, 75, True), (490, 65, 105, True), (555, 40, 85, False),
        ]
    )

    # West Bristol — Georgian/period (wider, elegant proportions)
    generate_location_card(
        os.path.join(OUTPUT_DIR, 'location-west-bristol.webp'),
        direction='W',
        tint_offset=(30, 80, 120),
        buildings_config=[
            (20, 80, 130, True), (115, 75, 125, True), (205, 85, 135, True),
            (305, 70, 120, True), (390, 80, 130, True), (485, 75, 125, True),
        ]
    )

    # Central Bristol — mixed commercial/residential (varied heights)
    generate_location_card(
        os.path.join(OUTPUT_DIR, 'location-central-bristol.webp'),
        direction='C',
        tint_offset=(60, 85, 110),
        buildings_config=[
            (10, 50, 160, False), (75, 65, 100, True), (155, 45, 180, False),
            (215, 70, 90, True), (300, 55, 150, False), (370, 60, 120, True),
            (445, 80, 170, False), (540, 50, 95, True),
        ]
    )

    print("\nAll images generated successfully!")
    # List files
    for f in sorted(os.listdir(OUTPUT_DIR)):
        if f.endswith('.webp'):
            fpath = os.path.join(OUTPUT_DIR, f)
            print(f"  {f}: {os.path.getsize(fpath):,} bytes")


if __name__ == '__main__':
    main()
