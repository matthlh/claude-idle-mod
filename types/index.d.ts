export type GenId = 'agent' | 'subagent' | 'robot' | 'swarm'
export type ToolId = 'read' | 'edit' | 'bash' | 'grep' | 'web'

export type Save = {
  tokens: number
  earned: number
  lifetime: number
  level: number
  hp: number
  clicks: number
  cleared: number
  owned: Record<GenId, number>
  model: number
  infra: number
  tools: Record<ToolId, boolean>
  points: number
  trained: number
  bonusHits: number
  played: number
  savedAt: number
}

export type Fx = {
  at: number
  dmg: number
  isCrit: boolean
  cleared: string | null
  reward: number
}

export type Prefs = { popups: boolean }
export type Mood = 'idle' | 'working' | 'sleep' | 'oops'

declare module 'claude-code' {
  interface PluginState {
    'token-tycoon': { save: Save; fx: Fx; isHidden: boolean; prefs: Prefs; mood: Mood }
  }
}
