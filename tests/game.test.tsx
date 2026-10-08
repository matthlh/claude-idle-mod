import { test, expect, mock } from 'claude-code/testing'
import { FRESH, damage, fmt, taskHp, taskReward, pointsFor, sceneSvg, sceneCells, crackStage } from '../hooks/register'

test('damage rolls over into the next tasks and pays for each', async () => {
  const s0 = { ...FRESH, hp: taskHp(0), level: 0 }
  const one = damage(s0, 3)
  expect(one.cleared).toBe(0)
  expect(one.s.hp).toBe(taskHp(0) - 3)
  const big = damage(s0, taskHp(0) + taskHp(1) + 1)
  expect(big.cleared).toBe(2)
  expect(big.s.level).toBe(2)
  expect(big.s.hp).toBe(taskHp(2) - 1)
  expect(big.reward).toBe(taskReward(0) + taskReward(1))
  expect(big.s.tokens).toBe(taskReward(0) + taskReward(1))
  expect(fmt(999)).toBe('999')
  expect(fmt(1234)).toBe('1.23K')
  expect(fmt(2_500_000)).toBe('2.50M')
  expect(pointsFor(49_999)).toBe(0)
  expect(pointsFor(50_000)).toBe(1)
  expect(pointsFor(200_000)).toBe(2)
  expect(crackStage(10, 10)).toBe(0)
  expect(crackStage(1, 10)).toBe(4)
})

test('the scene draws on both surfaces', async () => {
  const f = { at: 0, dmg: 0, isCrit: false, cleared: null, reward: 0 }
  const svg = sceneSvg({ ...FRESH, hp: 3 }, { ...f, at: 1000, dmg: 7, isCrit: true }, 1200)
  expect(svg).toContain('<animate')
  expect(svg).toContain('-7!')
  expect(sceneCells(FRESH, f, 0).length).toBeGreaterThan(100)
})

test('band draws, prompt hits the task, shop pane sells agents', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  const text = async (ui: any) => JSON.stringify(await ui.drawn())
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({
      plugin: 'token-tycoon',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false } as any,
      viewport: { columns: 120, rows: 40 },
    })
    expect(await ui.drawn()).toMatchObject({ type: 'Box' })
    expect(await ui.find({ type: surface === 'terminal' ? 'Raster' : 'Svg' })).toBeDefined()
    const before = await text(ui)
    await ui.press({ key: 'prompt' })
    const after = await text(ui)
    expect(after).not.toBe(before)
    await ui.unmount()
  }

  const pane = await $.ui.mount({
    plugin: 'token-tycoon',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'token-tycoon',
    props: { title: 'Claude Idle', isFocused: false } as any,
    viewport: { columns: 90, rows: 40 },
  })
  const agentLabel = async () => String((await pane.find({ key: 'buy-agent' }))?.props?.label)
  expect(await agentLabel()).toBe('Agent')
  // Too poor: nothing happens.
  await pane.press({ key: 'buy-agent' })
  expect(await agentLabel()).toBe('Agent')
  // Prompt until two tasks are cleared (10 + 12 HP at power 1), which pays 21 tokens.
  for (let i = 0; i < 40; i++) await pane.press({ key: 'prompt' })
  await pane.press({ key: 'buy-agent' })
  expect(await agentLabel()).toBe('Agent ×1')
  await pane.press({ key: 'buy-model' })
  expect(await text(pane)).toContain('Model → Sonnet')
  await pane.unmount()
})
