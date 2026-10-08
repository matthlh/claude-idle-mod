import sys, os
from PIL import Image
SIZE = int(sys.argv[2]); COLORS = int(sys.argv[3])
def paths(img):
    img = img.convert('RGBA').resize((SIZE, SIZE), Image.LANCZOS)
    alpha = img.getchannel('A')
    q = img.convert('RGB').quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=0).convert('RGB')
    px = q.load(); ap = alpha.load()
    runs = {}
    for y in range(SIZE):
        x = 0
        while x < SIZE:
            if ap[x, y] < 100: x += 1; continue
            c = px[x, y]; w = 1
            while x + w < SIZE and ap[x + w, y] >= 100 and px[x + w, y] == c: w += 1
            runs.setdefault(c, []).append((x, y, w))
            x += w
    out = []
    for c, rs in runs.items():
        d = ''.join(f'M{x} {y}h{w}v1h-{w}z' for x, y, w in rs)
        out.append(f'<path fill="#{c[0]:02x}{c[1]:02x}{c[2]:02x}" d="{d}"/>')
    return ''.join(out)
names = ['idle', 'eyesClosed', 'lookUp', 'blink', 'typing', 'thinking', 'sleep1', 'sleep2', 'oops', 'cheer1', 'cheer2', 'overclock1', 'overclock2', 'hit']
out = ['// The character frames as SVG paths (one per colour), %dx%d, sliced from' % (SIZE, SIZE),
       '// docs/sheet.webp by docs/slice.py and vectorised by docs/vec.py.',
       '// Index order: ' + ', '.join(f'{i} {n}' for i, n in enumerate(names)),
       'export const FRAME_SIZE = %d' % SIZE, 'export const FRAMES: string[] = [']
first = None
for i in range(14):
    ps = paths(Image.open(os.path.join(sys.argv[1], f'f{i:02d}.png')))
    if first is None: first = ps
    out.append("  '" + ps.replace("'", "\\'") + "',")
out.append(']')
open(sys.argv[4], 'w').write('\n'.join(out) + '\n')
print('frames.ts chars', sum(len(l) for l in out))
open(sys.argv[5], 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" viewBox="0 0 {SIZE} {SIZE}" width="{SIZE*6}" height="{SIZE*6}"><rect width="100%" height="100%" fill="#2a2a2e"/>{first}</svg>')
