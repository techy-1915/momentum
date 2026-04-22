"""Generate PWA icons (192x192 and 512x512 PNG) using Python stdlib only."""
import struct, zlib, os, math

def make_png(size: int) -> bytes:
    """Create a purple rounded icon with a white lightning bolt."""
    r_bg, g_bg, b_bg = 124, 58, 237   # #7C3AED purple
    r_w, g_w, b_w   = 255, 255, 255   # white

    # Build pixel grid (RGB tuples)
    img = [[(r_bg, g_bg, b_bg)] * size for _ in range(size)]

    # Rounded rectangle mask — zero-out pixels outside the rounded square
    radius = size // 6
    cx = cy = size / 2
    for y in range(size):
        for x in range(size):
            # corner circles
            near_corner = False
            for (ox, oy) in [(radius, radius), (size-radius, radius),
                             (radius, size-radius), (size-radius, size-radius)]:
                if abs(x - ox) > radius or abs(y - oy) > radius:
                    continue
                dist = math.hypot(x - ox, y - oy)
                if dist > radius:
                    near_corner = True
                    break
            # outside any edge
            if (x < radius and y < radius and math.hypot(x - radius, y - radius) > radius) or \
               (x > size-radius and y < radius and math.hypot(x-(size-radius), y-radius) > radius) or \
               (x < radius and y > size-radius and math.hypot(x-radius, y-(size-radius)) > radius) or \
               (x > size-radius and y > size-radius and math.hypot(x-(size-radius), y-(size-radius)) > radius):
                img[y][x] = None  # transparent → bg color boundary (use bg to avoid issues)

    # Draw lightning bolt as a filled polygon (scaled to icon size)
    s = size / 512.0
    # Bolt points (from SVG path, scaled)
    bolt_poly = [
        (300*s, 60*s),
        (170*s, 290*s),
        (246*s, 290*s),
        (180*s, 452*s),
        (380*s, 222*s),
        (296*s, 222*s),
        (360*s, 60*s),
    ]

    def point_in_poly(px, py, poly):
        n = len(poly)
        inside = False
        j = n - 1
        for i in range(n):
            xi, yi = poly[i]
            xj, yj = poly[j]
            if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi + 1e-10) + xi):
                inside = not inside
            j = i
        return inside

    for y in range(size):
        for x in range(size):
            if img[y][x] is not None and point_in_poly(x + 0.5, y + 0.5, bolt_poly):
                img[y][x] = (r_w, g_w, b_w)

    # Encode as PNG
    raw = b''
    for row in img:
        raw += b'\x00'
        for px in row:
            if px is None:
                raw += bytes([r_bg, g_bg, b_bg])
            else:
                raw += bytes(px)

    compressed = zlib.compress(raw, 9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')
    return b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend


out_dir = os.path.join(os.path.dirname(__file__), 'public')
os.makedirs(out_dir, exist_ok=True)

for size in [192, 512]:
    path = os.path.join(out_dir, f'icon-{size}.png')
    print(f'  Generating {path}...')
    with open(path, 'wb') as f:
        f.write(make_png(size))

print('  ✅ Icons generated.')
