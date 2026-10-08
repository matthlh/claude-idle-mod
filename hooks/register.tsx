import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Fx, GenId, Prefs, Save, ToolId } from '../types'

// ── State ────────────────────────────────────────────────────────────────

const PANE = 'token-tycoon'

export const FRESH: Save = {
  tokens: 0,
  earned: 0,
  lifetime: 0,
  level: 0,
  hp: 10,
  clicks: 0,
  cleared: 0,
  owned: { agent: 0, subagent: 0, robot: 0, swarm: 0 },
  model: 0,
  infra: 0,
  tools: { read: false, edit: false, bash: false, grep: false, web: false },
  points: 0,
  trained: 0,
  bonusHits: 0,
  played: 0,
  savedAt: 0,
}

export const save = atom({ plugin: 'token-tycoon', key: 'save' } as const, { ...FRESH } as Save)
export const fx = atom({ plugin: 'token-tycoon', key: 'fx' } as const, { at: 0, dmg: 0, isCrit: false, cleared: null, reward: 0 } as Fx)
const isHidden = atom({ plugin: 'token-tycoon', key: 'isHidden' } as const, false)
const prefs = atom({ plugin: 'token-tycoon', key: 'prefs' } as const, { popups: true } as Prefs)

// ── The game ─────────────────────────────────────────────────────────────

export const TASKS = [
  'Fix a typo',
  'Fix the flaky test',
  'Add unit tests',
  'Update the README',
  'Rename a variable',
  'Refactor auth',
  'Fix the N+1 query',
  'Resolve merge conflicts',
  'Upgrade dependencies',
  'Add dark mode',
  'Migrate the database',
  'Write the API docs',
  'Delete node_modules',
  'Debug prod at 3am',
  'Ship v2',
  'Rewrite it in Rust',
  'Fix the CSS',
  'Make the tests pass',
  'Add a cache',
  'Remove the cache',
  'Scale to 1M users',
  'Pass the security audit',
  'Train a bigger model',
  'Achieve AGI',
]

export type Gen = { id: GenId; label: string; dps: number; cost: number; hotkey: string }
export const GENS: Gen[] = [
  { id: 'agent', label: 'Agent', dps: 0.4, cost: 20, hotkey: '1' },
  { id: 'subagent', label: 'Subagent', dps: 4, cost: 250, hotkey: '2' },
  { id: 'robot', label: 'Robot', dps: 30, cost: 3500, hotkey: '3' },
  { id: 'swarm', label: 'Agent swarm', dps: 250, cost: 50000, hotkey: '4' },
]

export type Tier = { label: string; mult: number; cost: number }
export const MODELS: Tier[] = [
  { label: 'Haiku', mult: 1, cost: 0 },
  { label: 'Sonnet', mult: 3, cost: 100 },
  { label: 'Opus', mult: 10, cost: 2000 },
  { label: 'Fable', mult: 30, cost: 40000 },
  { label: 'Mythos', mult: 100, cost: 800000 },
]
export const INFRA: Tier[] = [
  { label: 'Laptop', mult: 1, cost: 0 },
  { label: 'GPU', mult: 2, cost: 600 },
  { label: 'Rack', mult: 4, cost: 10000 },
  { label: 'Data center', mult: 8, cost: 150000 },
  { label: 'Cluster', mult: 16, cost: 2500000 },
]

export type Tool = { id: ToolId; label: string; cost: number; desc: string; hotkey: string }
export const TOOLS: Tool[] = [
  { id: 'read', label: 'Read', cost: 200, desc: 'agents +25%', hotkey: 'r' },
  { id: 'edit', label: 'Edit', cost: 900, desc: 'prompts +50%', hotkey: 'e' },
  { id: 'bash', label: 'Bash', cost: 5000, desc: '20% double hit', hotkey: 'b' },
  { id: 'grep', label: 'Grep', cost: 20000, desc: 'crit 5% → 15%', hotkey: 'g' },
  { id: 'web', label: 'WebSearch', cost: 80000, desc: 'offline 2× longer', hotkey: 'w' },
]

export function modelAt(i: number): Tier {
  return MODELS[Math.max(0, Math.min(MODELS.length - 1, i))] as Tier
}
export function infraAt(i: number): Tier {
  return INFRA[Math.max(0, Math.min(INFRA.length - 1, i))] as Tier
}

export const CRIT_MULT = 10
export const POINT_EVERY = 250000
// Owning this many of one agent doubles that agent, each time.
export const MILESTONES = [10, 25, 50, 100, 200, 400]
export const SPRINT = 10
export const OFFLINE_RATE = 0.5
export const OFFLINE_CAP_H = 4

export function taskName(level: number): string {
  const n = TASKS.length
  const round = Math.floor(level / n)
  return (TASKS[level % n] ?? '') + (round > 0 ? ` v${round + 1}` : '')
}
export function taskHp(level: number): number {
  return Math.floor(10 * Math.pow(1.33, level))
}
export function taskReward(level: number): number {
  return Math.floor(4 + taskHp(level) * 0.45)
}
export function prestigeMult(points: number): number {
  return 1 + 0.5 * points
}
export function pointsFor(earned: number): number {
  return Math.floor(Math.sqrt(earned / POINT_EVERY))
}
export function power(s: Save): number {
  return modelAt(s.model).mult * (s.tools.edit ? 1.5 : 1) * prestigeMult(s.points)
}
export function critChance(s: Save): number {
  return s.tools.grep ? 0.15 : 0.05
}
export function milestoneMult(owned: number): number {
  return Math.pow(2, MILESTONES.filter(n => owned >= n).length)
}
export function nextMilestone(owned: number): number | null {
  return MILESTONES.find(n => owned < n) ?? null
}
export function genDps(s: Save, g: Gen): number {
  const n = s.owned[g.id] ?? 0
  return g.dps * milestoneMult(n) * infraAt(s.infra).mult * (s.tools.read ? 1.25 : 1) * prestigeMult(s.points)
}
export function sprintOf(level: number): number {
  return Math.floor(level / SPRINT) + 1
}
export function dps(s: Save): number {
  const raw = GENS.reduce((sum, g) => sum + g.dps * milestoneMult(s.owned[g.id] ?? 0) * (s.owned[g.id] ?? 0), 0)
  return raw * infraAt(s.infra).mult * (s.tools.read ? 1.25 : 1) * prestigeMult(s.points)
}
export function genCost(g: Gen, owned: number): number {
  return Math.ceil(g.cost * Math.pow(1.17, owned))
}
export function offlineCapMs(s: Save): number {
  return OFFLINE_CAP_H * (s.tools.web ? 2 : 1) * 3600_000
}

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '∞'
  const abs = Math.abs(n)
  if (abs < 10) return (Math.round(n * 10) / 10).toString()
  if (abs < 1000) return Math.round(n).toString()
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi']
  let v = abs
  let i = -1
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000
    i++
  }
  const digits = v < 10 ? 2 : v < 100 ? 1 : 0
  return (n < 0 ? '-' : '') + v.toFixed(digits) + units[i]
}

// Deals damage to the current task, rolling over into the next ones.
export function damage(s: Save, amount: number): { s: Save; cleared: number; reward: number; last: string | null } {
  let hp = s.hp - amount
  let level = s.level
  let tokens = s.tokens
  let earned = s.earned
  let lifetime = s.lifetime
  let cleared = 0
  let reward = 0
  let last: string | null = null
  while (hp <= 0 && cleared < 5000) {
    const r = taskReward(level)
    tokens += r
    earned += r
    lifetime += r
    reward += r
    last = taskName(level)
    cleared++
    level++
    hp += taskHp(level)
  }
  if (hp <= 0) hp = taskHp(level)
  return { s: { ...s, hp, level, tokens, earned, lifetime, cleared: s.cleared + cleared }, cleared, reward, last }
}

export function nextTier(list: Tier[], at: number): Tier | null {
  return at + 1 < list.length ? (list[at + 1] as Tier) : null
}

// ── Art ──────────────────────────────────────────────────────────────────
// Letter grids: '.' is transparent. The bot has two frames; the block cracks
// as its HP drops and changes color with each task.

const BOT_A = [
  '..t....kk....t..',
  '...t...kk...t...',
  '....hhhhhhhh....',
  '...hhhhhhhhhh...',
  '..hhEEhhhhEEhh..',
  '..hhEehhhhEehh..',
  '..hhEEhhhhEEhh..',
  '..hhhhhhhhhhhh..',
  '...hhhhVVhhhh...',
  '....hhhhhhhh....',
  '......dddd......',
  '...wwbbccbbww...',
  '..w.bbbccbbb.w..',
  '..w.bbbbbbbb.w..',
  '....ssssssss....',
  '.....ll..ll.....',
  '.....ll..ll.....',
  '....lll..lll....',
]
const BOT_B = [
  '..t....kk....t.T',
  '...t...kk...t.T.',
  '....hhhhhhhh..T.',
  '...hhhhhhhhhh.w.',
  '..hhEEhhhhEEhhw.',
  '..hhEehhhhEehww.',
  '..hhEEhhhhEEhw..',
  '..hhhhhhhhhhhw..',
  '...hhhhVVhhhhw..',
  '....hhhhhhhhw...',
  '......dddd.w....',
  '...wwbbccbbw....',
  '..w.bbbccbbb....',
  '..w.bbbbbbbb....',
  '....ssssssss....',
  '.....ll..ll.....',
  '.....ll..ll.....',
  '....lll..lll....',
]
// Four shapes, one per task in turn: an ore rock, a crystal, a chip, a bug.
// F face, L lit edge, D dark edge, H highlight, X texture.
const SHAPES: string[][] = [
  [
    '........LLLLLLLL........',
    '.....LLLFFFFFFFFLL......',
    '...LLFFHHFFFFFFFFFLL....',
    '..LFFHHFFFFXXFFFFFFFD...',
    '.LFFHFFFFFFFFFFFFFFFFD..',
    '.LFFFFFFXXFFFFFFFXXFFD..',
    'LFFFFFFFXXFFFFFFFFFFFFD.',
    'LFFXXFFFFFFFFFFFFFFFFDD.',
    'LFFXXFFFFFFFXXFFFFFFDDD.',
    'LFFFFFFFFFFFXXFFFFFDDDD.',
    'LFFFFFFXXFFFFFFFFFDDDDD.',
    '.DFFFFFXXFFFFFFXXFDDDDD.',
    '.DFFFFFFFFFFFFFXXDDDDDD.',
    '..DFFFFFFFXXFFFFDDDDDD..',
    '...DDFFFFFXXFFDDDDDDD...',
    '....DDDFFFFFDDDDDDD.....',
    '......DDDDDDDDDDD.......',
    '........DDDDDDD.........',
  ],
  [
    '..........LLLL..........',
    '.........LHHHHL.........',
    '........LHHHFFFL........',
    '.......LHHFFFFFFL.......',
    '......LHHFFFFFFFFL......',
    '.....LHFFFFFXFFFFFD.....',
    '....LHFFFFFFXXFFFFFD....',
    '...LHFFFFFFFFFFFFFFFD...',
    '..LFFFFFXXFFFFFFFFFFFD..',
    '.LFFFFFFXXFFFFFFFXFFFFD.',
    'LFFFFFFFFFFFFFFFFXXFFFFD',
    '.DFFFFFFFFFFXXFFFFFFFFD.',
    '..DFFFFFFFFFXXFFFFFFFD..',
    '...DFFFFFFFFFFFFFFFFD...',
    '....DFFFFFXXFFFFFFFD....',
    '.....DFFFFXXFFFFFFD.....',
    '......DDFFFFFFFFDD......',
    '........DDDDDDDD........',
  ],
  [
    '..D..D..D..D..D..D..D...',
    '..D..D..D..D..D..D..D...',
    'LLLLLLLLLLLLLLLLLLLLLL..',
    'LFFFFFFFFFFFFFFFFFFFFD..',
    'LFFXXFFFFXXFFFFXXFFFFD..',
    'LFFXXFFFFXXFFFFXXFFFFD..',
    'LFFFFFFFFFFFFFFFFFFFFD..',
    'LFFFFFHHHHHHHHHHFFFFFD..',
    'LFFXXFHFFFFFFFFHFXXFFD..',
    'LFFXXFHFFFFFFFFHFXXFFD..',
    'LFFFFFHHHHHHHHHHFFFFFD..',
    'LFFFFFFFFFFFFFFFFFFFFD..',
    'LFFXXFFFFXXFFFFXXFFFFD..',
    'LFFXXFFFFXXFFFFXXFFFFD..',
    'LFFFFFFFFFFFFFFFFFFFFD..',
    'DDDDDDDDDDDDDDDDDDDDDD..',
    '..D..D..D..D..D..D..D...',
    '..D..D..D..D..D..D..D...',
  ],
  [
    '....L..............L....',
    '.....L............L.....',
    '......D..........D......',
    '.......LLLLLLLLLL.......',
    '......LLHHFFFFFFLL......',
    '.....LFHHFFFFFFFFFD.....',
    '....LFFFFFFXXFFFFFFD....',
    '...LFFFFFFFXXFFFFFFFD...',
    '..LFFFFFXXFFFFXXFFFFFD..',
    '..LFFFFFXXFFFFXXFFFFFD..',
    '.LFFFFFFFFFXXFFFFFFFFFD.',
    '.LFFFFFFFFFXXFFFFFFFFFD.',
    '..DFFFFFXXFFFFXXFFFFFD..',
    '..DFFFFFXXFFFFXXFFFFD...',
    '...DFFFFFFFFFFFFFFFD....',
    '....DDFFFFFFFFFFFDD.....',
    '......DDDDDDDDDDD.......',
    '...D....D....D....D.....',
  ],
]
// Crack pixels [x, y] added at each stage of damage.
const CRACKS: [number, number][][] = [
  [[11, 2], [11, 3], [12, 4], [12, 5], [13, 6]],
  [[13, 7], [14, 8], [13, 9], [8, 5], [7, 6], [6, 7]],
  [[14, 10], [15, 11], [16, 12], [5, 8], [4, 9], [9, 10], [10, 11], [10, 12], [19, 5], [19, 6]],
  [[17, 13], [17, 14], [3, 10], [3, 11], [11, 13], [11, 14], [12, 15], [20, 7], [21, 8], [6, 12], [5, 13], [16, 3], [17, 2]],
]
export type Palette = Record<string, number>
const BOT_PAL: Palette = { k: 0xd97757, t: 0xffd54a, T: 0xffd54a, h: 0xeeeae2, d: 0x9c978e, V: 0x3a3a46, E: 0x3fb8f0, e: 0xffffff, b: 0xd97757, s: 0xa8553a, c: 0x7ff0ff, w: 0x8a8580, l: 0x6f6a64 }
// One block color per task, cycling: [face, light, dark].
const BLOCK_COLORS: [number, number, number][] = [
  [0xd97757, 0xf0a284, 0x9a4d33], // Claude orange
  [0x5b8def, 0x8fb3ff, 0x3457a8], // blue
  [0x5cb85c, 0x8fe08f, 0x357a35], // green
  [0xa06cd5, 0xc79cf2, 0x6a3f99], // purple
  [0xe05a5a, 0xf59090, 0x9c3434], // red
  [0xe0b43c, 0xf5d57a, 0x9c7a1f], // gold
]
const SPARK = 0xffe66d
const CRACK = 0x2b2622

export function crackStage(hp: number, max: number): number {
  const lost = 1 - hp / Math.max(1, max)
  return lost >= 0.8 ? 4 : lost >= 0.6 ? 3 : lost >= 0.4 ? 2 : lost >= 0.2 ? 1 : 0
}

function blockRows(level: number, stage: number): string[] {
  const shape = SHAPES[level % SHAPES.length] ?? SHAPES[0]!
  const rows = shape.map(r => r.split(''))
  for (let i = 0; i < stage; i++)
    for (const [x, y] of CRACKS[i] ?? []) {
      const row = rows[y]
      if (row && row[x] !== undefined && row[x] !== '.') row[x] = 'C'
    }
  return rows.map(r => r.join(''))
}

function blockPal(level: number): Palette {
  const [F, L, D] = BLOCK_COLORS[level % BLOCK_COLORS.length] ?? [0xd97757, 0xf0a284, 0x9a4d33]
  return { F, L, D, C: CRACK, H: mix(L, 0xffffff, 0.45), X: mix(F, D, 0.55) }
}

export const SCENE_W = 56
export const SCENE_H = 20
const BOT_X = 3
const BLOCK_X = 30
const PX = 2

type Pixels = (number | undefined)[]
function plot(pixels: Pixels, rows: string[], x0: number, y0: number, pal: Palette) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = pal[row[x] ?? '.']
      const px = x0 + x
      const py = y0 + y
      if (c !== undefined && px >= 0 && px < SCENE_W && py >= 0 && py < SCENE_H) pixels[py * SCENE_W + px] = c
    }
  })
}

// The scene as pixels: the bot, the block, and a spark while a hit lands.
export function scenePixels(s: Save, f: Fx, now: number, frame: 0 | 1): Pixels {
  const pixels: Pixels = new Array(SCENE_W * SCENE_H)
  const hitting = now - f.at < 400
  plot(pixels, frame ? BOT_B : BOT_A, BOT_X, 1, BOT_PAL)
  plot(pixels, blockRows(s.level, crackStage(s.hp, taskHp(s.level))), BLOCK_X, 1, blockPal(s.level))
  if (hitting) {
    const sp = { S: SPARK }
    plot(pixels, ['SS..', '.SS.', '..SS', '.SS.', 'SS..'], BLOCK_X - 6, 5, sp)
    if (f.isCrit) plot(pixels, ['..SS', '.SS.', 'SS..', '.SS.', '..SS'], BLOCK_X - 8, 11, sp)
  }
  return pixels
}

// Blends two 0xRRGGBB colors, t of the way from a to b.
function mix(a: number, b: number, t: number): number {
  const ch = (sh: number) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t)
  return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0')

// The desktop scene is two SVGs side by side: the bot, whose source never
// changes (so its animation never restarts), and the block, redrawn on hits.
export const SPLIT_X = 22
const BOT_W = SPLIT_X * PX
const BLOCK_W = (SCENE_W - SPLIT_X) * PX
const SCENE_PX_H = SCENE_H * PX

function rects(pix: Pixels, x0: number, x1: number, dx: number): string {
  let out = ''
  for (let y = 0; y < SCENE_H; y++)
    for (let x = x0; x < x1; x++) {
      const c = pix[y * SCENE_W + x]
      if (c !== undefined) out += `<rect x="${(x - dx) * PX}" y="${y * PX}" width="${PX}" height="${PX}" fill="${hex(c)}"/>`
    }
  return out
}

const CARD = '#17171b'
const svgOpen = (w: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${SCENE_PX_H}" width="${w}" height="${SCENE_PX_H}" shape-rendering="crispEdges" overflow="visible" style="background:transparent">`
// A dark card behind the art, rounded on the outer corners only, so the two
// halves meet without a seam.
const card = (w: number, side: 'left' | 'right' | 'both') => {
  const h = SCENE_PX_H
  const r = 6
  const tl = side !== 'right' ? r : 0
  const tr = side !== 'left' ? r : 0
  return `<path fill="${CARD}" d="M${tl},0 H${w - tr} ${tr ? `A${r},${r} 0 0 1 ${w},${r}` : ''} V${h - tr} ${tr ? `A${r},${r} 0 0 1 ${w - tr},${h}` : ''} H${tl} ${tl ? `A${r},${r} 0 0 1 0,${h - tl}` : ''} V${tl} ${tl ? `A${r},${r} 0 0 1 ${tl},0` : ''} Z"/>`
}

function botBody(dx: number): string {
  const f: Fx = { at: 0, dmg: 0, isCrit: false, cleared: null, reward: 0 }
  const a = scenePixels(FRESH, f, 0, 0)
  const b = scenePixels(FRESH, f, 0, 1)
  return (
    `<g>${rects(a, 0, SPLIT_X, dx)}<animate attributeName="opacity" values="1;0" dur="0.8s" calcMode="discrete" repeatCount="indefinite"/></g>` +
    `<g>${rects(b, 0, SPLIT_X, dx)}<animate attributeName="opacity" values="0;1" dur="0.8s" calcMode="discrete" repeatCount="indefinite"/></g>`
  )
}

function blockBody(s: Save, f: Fx, now: number, dx: number): string {
  const hitting = now - f.at < 400
  const justCleared = f.cleared && now - f.at < 1500
  const pix = scenePixels(s, f, now, 0)
  const shake = hitting
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;${f.isCrit ? 3 : 2} 0;-1 0;0 0" dur="0.25s" begin="0s" repeatCount="1"/>`
    : ''
  const tx = (BLOCK_X + 5 - dx) * PX
  const float = (text: string, fill: string, dur: string) =>
    `<text x="${tx}" y="${3 * PX}" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle" fill="${fill}" stroke="#000" stroke-width="2" paint-order="stroke">${text}<animate attributeName="y" from="${3 * PX}" to="${-2 * PX}" dur="${dur}" begin="0s" fill="freeze"/><animate attributeName="opacity" from="1" to="0" dur="${dur}" begin="0s" fill="freeze"/></text>`
  const pop = hitting
    ? float(`-${fmt(f.dmg)}${f.isCrit ? '!' : ''}`, f.isCrit ? '#ffe66d' : '#ffffff', '0.9s')
    : justCleared ? float(`+${fmt(f.reward)}`, '#8fe08f', '1.4s') : ''
  return `<g>${rects(pix, SPLIT_X, SCENE_W, dx)}${shake}</g>${pop}`
}

let botCache: string | null = null
export function botSvg(): string {
  if (!botCache) botCache = svgOpen(BOT_W) + card(BOT_W, 'left') + botBody(0) + '</svg>'
  return botCache
}
export function blockSvg(s: Save, f: Fx, now: number): string {
  return svgOpen(BLOCK_W) + card(BLOCK_W, 'right') + blockBody(s, f, now, SPLIT_X) + '</svg>'
}
// The whole scene in one SVG, for docs and tests.
export function sceneSvg(s: Save, f: Fx, now: number): string {
  return svgOpen(SCENE_W * PX) + card(SCENE_W * PX, 'both') + botBody(0) + blockBody(s, f, now, 0) + '</svg>'
}

// Terminal: the scene as a Raster of half blocks, two pixels per cell.
const DEFAULT = 0x01000000
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0, b = bytes[i + 1] ?? 0, c = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | c
    out += B64.charAt((n >> 18) & 63) + B64.charAt((n >> 12) & 63)
    out += i + 1 < bytes.length ? B64.charAt((n >> 6) & 63) : '='
    out += i + 2 < bytes.length ? B64.charAt(n & 63) : '='
  }
  return out
}

// The terminal gets the scene at half size: each cell holds a 2×2 block of
// pixels on top and another below, so the band stays five rows tall.
export const CELL_W = SCENE_W / 2
export const SCENE_ROWS = SCENE_H / 4
export function sceneCells(s: Save, f: Fx, now: number): string {
  const pix = scenePixels(s, f, now, (Math.floor(now / 800) % 2) as 0 | 1)
  const at = (x: number, y: number): number | undefined => {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      const c = pix[(y * 2 + dy) * SCENE_W + x * 2 + dx]
      if (c !== undefined) return c
    }
    return undefined
  }
  const grid = new Uint32Array(CELL_W * SCENE_ROWS * 3)
  for (let row = 0; row < SCENE_ROWS; row++)
    for (let x = 0; x < CELL_W; x++) {
      const top = at(x, row * 2)
      const bottom = at(x, row * 2 + 1)
      const i = (row * CELL_W + x) * 3
      const [ch, fg, bg]: [number, number, number] =
        top === undefined && bottom === undefined ? [0x20, DEFAULT, DEFAULT]
        : top === undefined ? [0x2584, bottom as number, DEFAULT]
        : [0x2580, top, bottom ?? DEFAULT]
      grid[i] = ch
      grid[i + 1] = fg
      grid[i + 2] = bg
    }
  return base64(new Uint8Array(grid.buffer))
}

export function bar(frac: number, width: number): string {
  const n = Math.round(Math.max(0, Math.min(1, frac)) * width)
  return '█'.repeat(n) + '░'.repeat(width - n)
}

// ── Helpers that take the engine ─────────────────────────────────────────
// Top-level declarations so a press never depends on one drawing's closure.

function ignorePress() {}

let dirty = false
// Seconds played since the last save, folded in by persist.
let playedAcc = 0

export function fmtTime(ms: number): string {
  const m = Math.floor(ms / 60_000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

async function toast($: EngineInterface, text: string) {
  if ((await read($, prefs)).popups) $.ui.toast(text)
}

async function commit($: EngineInterface, s: Save) {
  await update($, save, () => s)
  dirty = true
}

async function persist($: EngineInterface) {
  const s = await read($, save)
  const stamped = { ...s, played: (s.played ?? 0) + playedAcc, savedAt: await $.clock.now() }
  playedAcc = 0
  await update($, save, () => stamped)
  await $.store.set('save', stamped)
  dirty = false
}

// One prompt hit: from the button, a real tool call (free) or a finished turn (crit).
async function hit($: EngineInterface, kind: 'click' | 'tool' | 'turn') {
  const s0 = await read($, save)
  const now = await $.clock.now()
  const isCrit = kind === 'turn' || Math.random() < critChance(s0)
  const twice = s0.tools.bash && Math.random() < 0.2
  const dmg = power(s0) * (isCrit ? CRIT_MULT : 1) * (twice ? 2 : 1)
  const r = damage(s0, dmg)
  const s = {
    ...r.s,
    clicks: s0.clicks + (kind === 'click' ? 1 : 0),
    bonusHits: s0.bonusHits + (kind === 'click' ? 0 : 1),
  }
  await commit($, s)
  await update($, fx, () => ({ at: now, dmg, isCrit, cleared: r.last, reward: r.reward }))
  if (r.cleared > 0 && s.level % SPRINT === 0) await toast($, `🏁 Sprint ${sprintOf(s.level) - 1} done! Sprint ${sprintOf(s.level)} begins`)
  if (r.cleared > 0 && kind !== 'click') {
    const what = r.cleared === 1 ? `"${r.last}"` : `${r.cleared} tasks`
    await toast($, `🤖 ${kind === 'turn' ? 'Turn crit' : 'Free hit'} cleared ${what} (+${fmt(r.reward)} ✦)`)
  }
}

async function buyGen($: EngineInterface, id: GenId) {
  const s = await read($, save)
  const g = GENS.find(x => x.id === id)!
  const cost = genCost(g, s.owned[id] ?? 0)
  if (s.tokens < cost) return
  const n = (s.owned[id] ?? 0) + 1
  await commit($, { ...s, tokens: s.tokens - cost, owned: { ...s.owned, [id]: n } })
  if (MILESTONES.includes(n)) await toast($, `🚀 ${n} ${g.label.toLowerCase()}s: they now work ×${milestoneMult(n)}`)
}

async function buyTier($: EngineInterface, which: 'model' | 'infra') {
  const s = await read($, save)
  const list = which === 'model' ? MODELS : INFRA
  const next = nextTier(list, s[which])
  if (!next || s.tokens < next.cost) return
  await commit($, { ...s, tokens: s.tokens - next.cost, [which]: s[which] + 1 })
  await toast($, which === 'model' ? `🧠 Upgraded to ${next.label}: prompts ×${next.mult}` : `🏭 ${next.label} online: agents ×${next.mult}`)
}

async function buyTool($: EngineInterface, id: ToolId) {
  const s = await read($, save)
  const t = TOOLS.find(x => x.id === id)!
  if (s.tools[id] || s.tokens < t.cost) return
  await commit($, { ...s, tokens: s.tokens - t.cost, tools: { ...s.tools, [id]: true } })
}

async function train($: EngineInterface) {
  const s = await read($, save)
  const gained = pointsFor(s.earned)
  if (gained < 1) return
  const points = s.points + gained
  await commit($, { ...FRESH, points, trained: s.trained + 1, lifetime: s.lifetime, savedAt: s.savedAt })
  await persist($)
  await toast($, `✨ Trained a new model! ${points} point${points === 1 ? '' : 's'}: everything ×${prestigeMult(points)}`)
}

function summary(s: Save): string[] {
  const max = taskHp(s.level)
  const pts = pointsFor(s.earned)
  return [
    `Task ${s.level + 1}: ${taskName(s.level)}  ${bar(1 - s.hp / max, 10)} ${Math.round((1 - s.hp / max) * 100)}%  (${fmt(s.hp)} / ${fmt(max)} HP)`,
    `✦ ${fmt(s.tokens)} tokens, +${fmt(dps(s))}/s, ⚡ ${fmt(power(s))} per prompt (${modelAt(s.model).label}, ${infraAt(s.infra).label}, crit ${Math.round(critChance(s) * 100)}%)`,
    `Agents: ${GENS.map(g => `${s.owned[g.id] ?? 0} ${g.label.toLowerCase()}`).join(', ')}`,
    `Tools: ${TOOLS.filter(t => s.tools[t.id]).map(t => t.label).join(', ') || 'none yet'}`,
    `Gathered ✦ ${fmt(s.lifetime)} over ${fmtTime((s.played ?? 0) + playedAcc)} · prompts ${fmt(s.clicks)}, free hits ${fmt(s.bonusHits)}, tasks cleared ${fmt(s.cleared)}`,
    `Models trained: ${s.trained} (${s.points} points, ×${prestigeMult(s.points)})${pts >= 1 ? `, ${pts} more ready to claim in the shop` : ''}`,
  ]
}

// ── Hooks ────────────────────────────────────────────────────────────────

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'idle', description: 'Open the Claude Idle shop (and show your progress)' })

    const stored = (await $.store.get('save')) as Partial<Save> | undefined
    const p = (await $.store.get('prefs')) as Partial<Prefs> | undefined
    if (p) await update($, prefs, x => ({ ...x, ...p }))
    const now = await $.clock.now()
    let s: Save = {
      ...FRESH,
      ...(stored ?? {}),
      owned: { ...FRESH.owned, ...(stored?.owned ?? {}) },
      tools: { ...FRESH.tools, ...(stored?.tools ?? {}) },
    }

    // Offline earnings: the agents kept working at half pace while you were away.
    const rate = dps(s)
    const away = s.savedAt ? Math.min(now - s.savedAt, offlineCapMs(s)) : 0
    if (rate > 0 && away >= 60_000) {
      const r = damage(s, rate * (away / 1000) * OFFLINE_RATE)
      s = r.s
      const mins = Math.round(away / 60_000)
      const when = mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`
      await toast($, `🤖 While you were away (${when}): ${r.cleared} task${r.cleared === 1 ? '' : 's'} cleared, +${fmt(r.reward)} ✦`)
    }
    await update($, save, () => s)
    await persist($)

    let ticks = 0
    $.clock.every(1000, async () => {
      ticks++
      playedAcc += 1000
      dirty = true
      const cur = await read($, save)
      const rate = dps(cur)
      if (rate > 0) {
        const r = damage(cur, rate)
        await commit($, r.s)
        if (r.cleared > 0) {
          const t = await $.clock.now()
          await update($, fx, () => ({ at: t - 400, dmg: 0, isCrit: false, cleared: r.last, reward: r.reward }))
        }
      }
      if (dirty && ticks % 15 === 0) await persist($)
    })

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    await hit($, 'tool').catch(() => {})
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.isAborted) await hit($, 'turn')
    await persist($)
    return next(e)
  })

  on('command.run', { command: 'idle' }, async $ => {
    await update($, isHidden, () => false)
    const opened = await $.ui.open({ id: PANE, title: 'Claude Idle' })
    const s = await read($, save)
    return {
      text: [opened.isPlaced ? 'Shop opened.' : 'Shop pane needs a wider window; here is where you stand:', ...summary(s)].join('\n'),
    }
  })

  on('ui.press', { plugin: 'token-tycoon', element: 'prompt' }, async $ => {
    await hit($, 'click')
    return { element: 'prompt' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'shop' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Claude Idle' })
    return { element: 'shop' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'hide' }, async $ => {
    await update($, isHidden, () => true)
    return { element: 'hide' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'buy-agent' }, async $ => {
    await buyGen($, 'agent')
    return { element: 'buy-agent' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'buy-subagent' }, async $ => {
    await buyGen($, 'subagent')
    return { element: 'buy-subagent' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'buy-robot' }, async $ => {
    await buyGen($, 'robot')
    return { element: 'buy-robot' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'buy-swarm' }, async $ => {
    await buyGen($, 'swarm')
    return { element: 'buy-swarm' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'buy-model' }, async $ => {
    await buyTier($, 'model')
    return { element: 'buy-model' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'buy-infra' }, async $ => {
    await buyTier($, 'infra')
    return { element: 'buy-infra' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'buy-read' }, async $ => {
    await buyTool($, 'read')
    return { element: 'buy-read' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'buy-edit' }, async $ => {
    await buyTool($, 'edit')
    return { element: 'buy-edit' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'buy-bash' }, async $ => {
    await buyTool($, 'bash')
    return { element: 'buy-bash' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'buy-grep' }, async $ => {
    await buyTool($, 'grep')
    return { element: 'buy-grep' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'buy-web' }, async $ => {
    await buyTool($, 'web')
    return { element: 'buy-web' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'train' }, async $ => {
    await train($)
    return { element: 'train' }
  })
  on('ui.press', { plugin: 'token-tycoon', element: 'popups' }, async $ => {
    await update($, prefs, p => ({ ...p, popups: !p.popups }))
    await $.store.set('prefs', await read($, prefs))
    return { element: 'popups' }
  })

  // ── The band above the prompt ──
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const { Box, Text, Button, Raster, Svg } = $.ui.resolve(e) as any
    const now = await $.clock.now()
    const s = await read($, save)
    const f = await read($, fx)
    const max = taskHp(s.level)
    const done = 1 - s.hp / max
    const columns = e.viewport?.columns ?? 80
    const narrow = columns < 70

    const art =
      e.surface === 'terminal' ? (
        <Raster key="scene" columns={CELL_W} rows={SCENE_ROWS} cells={sceneCells(s, f, now)} />
      ) : (
        <Box flexDirection="row" flexShrink={0}>
          <Svg source={botSvg()} alt="a little bot" width={BOT_W} height={SCENE_PX_H} isInteractive />
          <Svg source={blockSvg(s, f, now)} alt={`${taskName(s.level)} at ${Math.round(done * 100)}%`} width={BLOCK_W} height={SCENE_PX_H} isInteractive />
        </Box>
      )
    const justCleared = f.cleared && now - f.at < 1500
    const barColor = done >= 0.8 ? 'green' : done >= 0.4 ? 'yellow' : 'cyan'
    // Three stat columns, together as wide as the bar and its percent.
    const COL = narrow ? 9 : 12
    const BAR = COL * 3 - 5
    const col = (icon: string, value: string, label: string, color?: string) => (
      <Box width={COL} flexGrow={1} flexShrink={1}>
        <Text wrap="truncate">
          <Text color={color} bold={color === 'yellow'}>{`${icon}${value}`}</Text>
          <Text dimColor>{label}</Text>
        </Text>
      </Box>
    )

    return (
      <Box flexDirection="column" paddingX={1} rowGap={1}>
        <Box flexDirection="row" alignItems="flex-start" columnGap={3}>
          {art}
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            <Text wrap="truncate-end">
              <Text bold color={justCleared ? 'green' : undefined}>{justCleared ? `✓ ${f.cleared}` : taskName(s.level)}</Text>
              <Text dimColor>{justCleared ? `   +${fmt(f.reward)} ✦` : `   task ${s.level + 1} · sprint ${sprintOf(s.level)}`}</Text>
            </Text>
            <Text wrap="truncate-end">
              <Text color={barColor}>{bar(done, BAR)}</Text>
              <Text dimColor>{` ${String(Math.round(done * 100)).padStart(3)}%`}</Text>
            </Text>
            <Box flexDirection="row">
              {col('✦ ', fmt(s.tokens), ' tokens', 'yellow')}
              {col('+', fmt(dps(s)), '/sec', 'green')}
              {col('⚡ ', fmt(power(s)), '/prompt')}
            </Box>
          </Box>
          <Box flexShrink={0} alignSelf="flex-start">
            <Button key="hide" label="hide" plain dimColor onPress={ignorePress} />
          </Box>
        </Box>
        <Box flexDirection="row" justifyContent="space-between">
          <Button key="prompt" label="Prompt ⚡" variant="primary" hotkey="p" onPress={ignorePress} />
          <Button key="shop" label="Shop 🛒" onPress={ignorePress} />
        </Box>
      </Box>
    )
  })

  // ── The shop pane ──
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e) as any
    const s = await read($, save)
    const p = await read($, prefs)
    const max = taskHp(s.level)
    const done = 1 - s.hp / max
    const nextModel = nextTier(MODELS, s.model)
    const nextInfra = nextTier(INFRA, s.infra)
    const pts = pointsFor(s.earned)
    const nextPointAt = POINT_EVERY * (pts + 1) * (pts + 1)
    const columns = e.viewport?.columns ?? 80
    const barColor = done >= 0.8 ? 'green' : done >= 0.4 ? 'yellow' : 'cyan'

    const section = (title: string, children: any) => (
      <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        <Text bold>{title}</Text>
        {children}
      </Box>
    )
    // One shop row: a button with its price, and what it does beneath.
    const row = (key: string, label: string, hotkey: string, cost: number, detail: string) => {
      const can = s.tokens >= cost
      return (
        <Box flexDirection="column" paddingBottom={1}>
          <Box flexDirection="row" columnGap={2} alignItems="center">
            <Button key={key} label={label} hotkey={hotkey} dimColor={!can} onPress={ignorePress} />
            {can
              ? <Text color="yellow">{`${fmt(cost)} ✦`}</Text>
              : <Text dimColor>{`${fmt(cost)} ✦ · need ${fmt(cost - s.tokens)} more`}</Text>}
          </Box>
          <Text dimColor wrap="wrap">{`  ${detail}`}</Text>
        </Box>
      )
    }
    const owned = (label: string, detail: string) => (
      <Box flexDirection="column" paddingBottom={1}>
        <Text color="green">{`✓ ${label}`}<Text dimColor>{'  owned'}</Text></Text>
        <Text dimColor wrap="wrap">{`  ${detail}`}</Text>
      </Box>
    )
    const stat = (icon: string, value: string, label: string, color?: string) => (
      <Box flexDirection="column" flexGrow={1}>
        <Text>
          <Text color={color} bold>{`${icon} ${value}`}</Text>
        </Text>
        <Text dimColor>{label}</Text>
      </Box>
    )

    return (
      <Box flexDirection="column" paddingX={1} rowGap={1}>
        <Box flexDirection="column">
          <Text wrap="truncate-end">
            <Text bold>{taskName(s.level)}</Text>
            <Text dimColor>{`   task ${s.level + 1} · sprint ${sprintOf(s.level)} · pays ${fmt(taskReward(s.level))} ✦`}</Text>
          </Text>
          <Text wrap="truncate-end">
            <Text color={barColor}>{bar(done, Math.max(10, Math.min(40, columns - 20)))}</Text>
            <Text dimColor>{` ${Math.round(done * 100)}%`}</Text>
          </Text>
          <Box flexDirection="row" paddingTop={1} columnGap={2}>
            {stat('✦', fmt(s.tokens), 'tokens', 'yellow')}
            {stat('▲', `${fmt(dps(s))}`, '/sec', 'green')}
            {stat('⚡', fmt(power(s)), '/prompt')}
            {stat('✧', `${Math.round(critChance(s) * 100)}%`, `crit ×${CRIT_MULT}`)}
          </Box>
          <Box flexDirection="row" columnGap={1} paddingTop={1}>
            <Button key="prompt" label="Prompt ⚡" variant="primary" hotkey="p" onPress={ignorePress} />
            <Text dimColor wrap="wrap">keys while the pane is focused: p prompt · 1-4 agents · m model · i infra · r e b g w tools · t train</Text>
          </Box>
        </Box>

        {section('Agents', GENS.map(g => {
          const n = s.owned[g.id] ?? 0
          const nm = nextMilestone(n)
          const each = `+${fmt(genDps(s, g))}/sec each`
          return row(`buy-${g.id}`, n ? `${g.label} ×${n}` : g.label, g.hotkey, genCost(g, n), nm ? `${each} · ×2 at ${nm}` : each)
        }))}

        {section('Upgrades', [
          nextModel
            ? row('buy-model', `Model → ${nextModel.label}`, 'm', nextModel.cost, `prompts ×${nextModel.mult} (now ×${modelAt(s.model).mult})`)
            : owned(`Model: ${modelAt(s.model).label}`, `prompts ×${modelAt(s.model).mult}, the best there is`),
          nextInfra
            ? row('buy-infra', `Infra → ${nextInfra.label}`, 'i', nextInfra.cost, `agents ×${nextInfra.mult} (now ×${infraAt(s.infra).mult})`)
            : owned(`Infra: ${infraAt(s.infra).label}`, `agents ×${infraAt(s.infra).mult}, the best there is`),
        ])}

        {section('Tools', TOOLS.map(t => (s.tools[t.id] ? owned(t.label, t.desc) : row(`buy-${t.id}`, t.label, t.hotkey, t.cost, t.desc))))}

        {section('Train a new model', [
          pts >= 1 ? (
            <Box flexDirection="row" columnGap={2} alignItems="center">
              <Button key="train" label={`Train (+${pts})`} hotkey="t" variant="primary" onPress={ignorePress} />
              <Text dimColor wrap="wrap">{`reset run · ×${prestigeMult(s.points + pts)} forever`}</Text>
            </Box>
          ) : (
            <Text dimColor wrap="wrap">{`${fmt(s.earned)} / ${fmt(nextPointAt)} ✦ this run`}</Text>
          ),
          <Text dimColor>{`${s.trained} trained · ${s.points} pts · ×${prestigeMult(s.points)}`}</Text>,
        ])}

        {section('Stats', [
          <Box flexDirection="row" columnGap={2}>
            {stat('✦', fmt(s.lifetime), 'gathered', 'yellow')}
            {stat('◷', fmtTime((s.played ?? 0) + playedAcc), 'played')}
            {stat('⚡', fmt(s.clicks), 'prompts')}
            {stat('✓', fmt(s.cleared), 'cleared')}
          </Box>,
          <Text dimColor wrap="wrap">{`${fmt(s.bonusHits)} free hits from real work`}</Text>,
          <Text dimColor wrap="wrap">{`tool call = free hit · turn = crit · offline ½ pace, ${OFFLINE_CAP_H * (s.tools.web ? 2 : 1)}h max`}</Text>,
          <Box paddingTop={1}>
            <Button key="popups" label={`Popups: ${p.popups ? 'On' : 'Off'}`} onPress={ignorePress} />
          </Box>,
        ])}
      </Box>
    )
  })
}
