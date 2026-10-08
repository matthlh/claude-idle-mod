import math, json, sys
W, H = 44, 56
g = [['.'] * W for _ in range(H)]
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: g[y][x] = c
def get(x, y):
    return g[y][x] if 0 <= x < W and 0 <= y < H else '.'
def inside_ellipse(x, y, cx, cy, rx, ry):
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1

# ---- jacket / shoulders (drawn first, hood and head go over it) ----
for y in range(36, H):
    half = min(22, 13 + (y - 36) * 1.3)
    for x in range(W):
        if abs(x - 21.5) <= half:
            put(x, y, 'J')
# shoulder seams / dark edges
for y in range(36, H):
    half = min(22, 13 + (y - 36) * 1.3)
    for x in range(W):
        if abs(abs(x - 21.5) - half) < 1.0 and y < 50:
            put(x, y, 'j')
# chest panel (lighter) with a zip line
for y in range(44, H):
    for x in range(15, 29):
        put(x, y, 'K')
for y in range(44, H):
    put(22, y, 'j')
# small emblem lines on the left chest
for x in range(10, 14):
    put(x, 47, 'j'); put(x, 49, 'j')

# ---- collar (white) ----
for y in range(37, 45):
    for x in range(W):
        half = 12 + (y - 37) * 0.5
        v = abs(x - 21.5) < (y - 36) * 1.1   # the V opening
        if abs(x - 21.5) <= half and not v:
            put(x, y, 'C')
for y in range(37, 45):
    for x in range(W):
        if get(x, y) == 'C' and (get(x, y + 1) in 'JK' or get(x + 1, y) in 'JKj' or get(x - 1, y) in 'JKj'):
            put(x, y, 'c')

# ---- hood (big rounded shape) ----
for y in range(0, 40):
    if y < 22:
        half = 21 * math.sqrt(max(0, 1 - ((y - 22) / 22) ** 2))
    else:
        half = 21 + (y - 22) * 0.15
    for x in range(W):
        if abs(x - 21.5) <= half:
            put(x, y, 'G')
# hood drapes down the sides over the shoulders
for y in range(40, 50):
    for x in range(W):
        d = abs(x - 21.5)
        if 15 + (y - 40) * 0.6 <= d <= 21 + (y - 22) * 0.15 - (y - 40) * 0.4:
            put(x, y, 'G')
# hood opening (dark shadow ring then the inside)
for y in range(H):
    for x in range(W):
        if inside_ellipse(x, y, 21.5, 24, 14.5, 17):
            put(x, y, 'S')  # shadow inside the hood
# light on the upper-left of the hood
for y in range(2, 20):
    for x in range(4, 20):
        if get(x, y) == 'G' and inside_ellipse(x, y, 14, 12, 12, 11):
            put(x, y, 'g')
# hood outline
outline = []
for y in range(H):
    for x in range(W):
        if get(x, y) in 'Gg' and any(get(x + dx, y + dy) == '.' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            outline.append((x, y))
for x, y in outline: put(x, y, 'O')
# inner rim of the hood
for y in range(H):
    for x in range(W):
        if get(x, y) in 'Gg' and any(get(x + dx, y + dy) == 'S' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            put(x, y, 'O')

# ---- hair (orange) fills the top of the opening ----
for y in range(H):
    for x in range(W):
        if get(x, y) == 'S' and inside_ellipse(x, y, 21.5, 22, 13.5, 15) and y < 40:
            put(x, y, 'H')
# hair volume: darker at the sides/back, lighter streaks on top
for y in range(H):
    for x in range(W):
        if get(x, y) == 'H':
            if abs(x - 21.5) > 9 and y > 16: put(x, y, 'h')
            elif y < 12 and (x + y) % 5 == 0: put(x, y, 'i')

# ---- face ----
face = lambda x, y: inside_ellipse(x, y, 21.5, 26, 9.5, 11)
for y in range(H):
    for x in range(W):
        if face(x, y) and y >= 17:
            put(x, y, 'F')
# chin/neck shading
for y in range(31, 37):
    for x in range(W):
        if get(x, y) == 'F' and (y >= 34 or abs(x - 21.5) > 7):
            put(x, y, 'f')
# neck
for y in range(35, 40):
    for x in range(17, 27):
        if get(x, y) in 'SJCcHh.':
            put(x, y, 'f' if y > 37 or abs(x - 21.5) > 3 else 'F')

# ---- bangs over the forehead, with pointed strands ----
strands = [0, 3, 1, 4, 0, 2, 5, 1, 3, 0, 4, 2, 0, 3, 1, 4, 0, 2, 1]
for i, x in enumerate(range(12, 31)):
    bottom = 19 + strands[i % len(strands)]
    for y in range(14, bottom + 1):
        if face(x, y) or get(x, y) in 'FS':
            put(x, y, 'H' if (x + y) % 7 else 'i')
# side locks framing the face
for y in range(18, 36):
    for x in (11, 12, 31, 32):
        if get(x, y) in 'FfS': put(x, y, 'h')
for y in range(18, 33):
    for x in (13, 30):
        if get(x, y) in 'Ff' and y < 30: put(x, y, 'h')

# ---- eyes (anime: tall, with lid and highlight) ----
def eye(x0, y0):
    for y in range(y0, y0 + 5):
        for x in range(x0, x0 + 5):
            if get(x, y) == 'F': put(x, y, 'E')
    for x in range(x0, x0 + 5): put(x, y0 - 1, 'L')     # upper lid
    put(x0 + 1, y0 + 1, 'W'); put(x0 + 1, y0 + 2, 'W')     # highlight
    put(x0 + 3, y0 + 3, 'e'); put(x0 + 2, y0 + 4, 'e')     # lower iris light
eye(13, 24); eye(25, 24)
# brows (thin, under the bangs)
for x in range(13, 18): 
    if get(x, 21) == 'F': put(x, 21, 'h')
for x in range(25, 30):
    if get(x, 21) == 'F': put(x, 21, 'h')
# nose and mouth
put(22, 29, 'f')
for x in range(20, 24): put(x, 32, 'M')
# blush
for x in (14, 15, 28, 29): 
    if get(x, 30) == 'F': put(x, 30, 'B')

# ---- headphones / cable detail on the hood like the reference ----
for (x, y) in [(33, 6), (34, 6), (35, 7), (36, 8), (36, 9), (36, 10), (35, 11)]:
    put(x, y, 'O')
for (x, y) in [(32, 5), (33, 5), (34, 5)]:
    put(x, y, 'g')

frameA = [''.join(r) for r in g]
# frame B: eyes closed
g2 = [list(r) for r in frameA]
for y in range(23, 29):
    for x in range(W):
        if g2[y][x] in 'EWeL': g2[y][x] = 'F'
for x in range(13, 18): g2[26][x] = 'L'
for x in range(25, 30): g2[26][x] = 'L'
frameB = [''.join(r) for r in g2]
json.dump({'A': frameA, 'B': frameB}, open(sys.argv[1], 'w'))
print('\n'.join(frameA))
