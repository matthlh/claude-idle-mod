import math, json, sys
W, H = 44, 56
def ell(x, y, cx, cy, rx, ry): return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1

def draw(sway):
    g = [['.'] * W for _ in range(H)]
    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H: g[y][x] = c
    def get(x, y): return g[y][x] if 0 <= x < W and 0 <= y < H else '.'

    # ---- hair at the back: head mass, then long falls down both sides ----
    for y in range(H):
        for x in range(W):
            if ell(x, y, 21.5, 17, 15.5, 15): put(x, y, 'H')
    for y in range(17, H):
        wave = int(round(math.sin((y - 17) / 6.0) * 1.2)) + (sway if y > 30 else 0)
        for x in range(W):
            d = abs(x - 21.5)
            inner = 9 + max(0, (y - 17)) * 0.05
            outer = 15.5 + min(5, (y - 17) * 0.35)
            if inner <= d + wave <= outer:
                put(x, y, 'H')
    # ---- shoulders / jacket (in front of the back hair) ----
    for y in range(40, H):
        half = min(21.5, 11 + (y - 40) * 1.6)
        for x in range(W):
            if abs(x - 21.5) <= half: put(x, y, 'J')
    for y in range(40, H):
        half = min(21.5, 11 + (y - 40) * 1.6)
        for x in range(W):
            if abs(abs(x - 21.5) - half) < 1.0 and y < 52: put(x, y, 'j')
    # shirt collar (V) and a zip line
    for y in range(40, 49):
        for x in range(W):
            d = abs(x - 21.5)
            if (y - 40) * 0.9 <= d <= (y - 40) * 0.9 + 2.2 and d < 9: put(x, y, 'C')
    for y in range(44, H): put(22, y, 'j')
    # ---- neck ----
    for y in range(33, 42):
        for x in range(17, 27):
            if ell(x, y, 21.5, 37, 4.5, 6): put(x, y, 'f' if y > 38 or abs(x - 21.5) > 3 else 'F')
    # ---- face: oval, narrowing to the chin ----
    for y in range(8, 37):
        rx = 10.5 if y <= 24 else max(3.5, 10.5 - (y - 24) * 0.58)
        for x in range(W):
            if abs(x - 21.5) <= rx and ell(x, y, 21.5, 21, 10.5, 15):
                put(x, y, 'F')
    # shading under the chin and along the jaw
    for y in range(28, 37):
        for x in range(W):
            if get(x, y) == 'F' and (y >= 35 or abs(x - 21.5) > (10.5 - (y - 24) * 0.58) - 1.5):
                put(x, y, 'f')
    # ---- front hair: bangs with long pointed strands, parted off-centre ----
    strands = [2, 5, 3, 7, 4, 2, 6, 3, 1, 4, 7, 3, 5, 2, 6, 4, 2, 5, 3, 6]
    for i, x in enumerate(range(11, 33)):
        bottom = 11 + strands[i % len(strands)]
        for y in range(3, bottom + 1):
            if get(x, y) in 'FfH': put(x, y, 'H')
    # side locks in front of the face and over the shoulders
    for y in range(12, 52):
        wave = int(round(math.sin((y - 12) / 7.0) * 1.0)) + (sway if y > 30 else 0)
        for dx in range(0, 4 if y < 36 else 5):
            put(10 - dx + wave, y, 'H'); put(33 + dx + wave, y, 'H')
    # hair shading: darker underneath and at the edges, light streaks on top
    for y in range(H):
        for x in range(W):
            if get(x, y) == 'H':
                near_edge = any(get(x + dx, y + dy) in '.Jj' for dx, dy in ((1, 0), (-1, 0), (0, 1)))
                if near_edge or (y > 30 and abs(x - 21.5) > 17): put(x, y, 'h')
    for y in range(4, 12):
        for x in range(12, 32):
            if get(x, y) == 'H' and (x - y) % 6 == 0: put(x, y, 'i')
    for y in range(20, 50):
        for x in range(W):
            if get(x, y) == 'H' and (x + y) % 9 == 0 and abs(x - 21.5) > 12: put(x, y, 'i')
    # ---- eyes: almond, slanted lash line, iris with highlight ----
    def eye(x0, y0, flip):
        for y in range(y0, y0 + 5):
            w = [4, 6, 6, 5, 3][y - y0]
            off = [1, 0, 0, 0, 1][y - y0]
            for x in range(x0 + off, x0 + off + w):
                if get(x, y) in 'Ff': put(x, y, 'E')
        for x in range(x0 + 1, x0 + 6): put(x, y0 - 1, 'L')      # lashes
        put(x0 + (6 if not flip else -1), y0, 'L')                 # outer corner flick
        put(x0 + 1, y0 + 1, 'W'); put(x0 + 2, y0 + 1, 'W')        # highlight
        put(x0 + 3, y0 + 3, 'e'); put(x0 + 4, y0 + 2, 'e')        # iris light
    eye(13, 22, True); eye(25, 22, False)
    for x in range(13, 18):
        if get(x, 18) in 'F': put(x, 18, 'h')
    for x in range(26, 31):
        if get(x, 18) in 'F': put(x, 18, 'h')
    put(23, 28, 'f'); put(23, 29, 'f')                          # nose
    for x in range(20, 24): put(x, 32, 'M')                       # mouth
    for x in (13, 14, 29, 30):
        if get(x, 29) in 'F': put(x, 29, 'B')                     # blush
    return [''.join(r) for r in g]

A = draw(0); B = draw(1)
C = [list(r) for r in A]
for y in range(21, 28):
    for x in range(W):
        if C[y][x] in 'EWeL': C[y][x] = 'F'
for x in range(13, 19): C[25][x] = 'L'
for x in range(25, 31): C[25][x] = 'L'
C = [''.join(r) for r in C]
json.dump({'A': A, 'B': B, 'C': C}, open(sys.argv[1], 'w'))
print('\n'.join(A))
