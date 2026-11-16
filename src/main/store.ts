import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AppConfig, StatsCache, WatchedPlayer } from '../shared/types'
import { DEFAULT_VISIBLE_MODES, isKnownMode } from '../shared/modes'

const DEFAULT_CONFIG: AppConfig = {
  players: [],
  visibleModes: DEFAULT_VISIBLE_MODES,
  autoRefreshMinutes: 5
}

function dataDir(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

const configPath = (): string => join(dataDir(), 'config.json')
const cachePath = (): string => join(dataDir(), 'stats-cache.json')

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch (err) {
    console.error(`Could not parse ${path}, keeping a backup and starting fresh`, err)
    try {
      renameSync(path, `${path}.corrupt-${Date.now()}`)
    } catch {
      /* ignore */
    }
    return null
  }
}

/** Write via temp file + rename so a crash never leaves a half-written file. */
function writeJson(path: string, value: unknown): void {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  renameSync(tmp, path)
}

function sanitizePlayers(input: unknown): WatchedPlayer[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<number>()
  const out: WatchedPlayer[] = []
  for (const raw of input) {
    const id = Number(raw?.profileId)
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue
    seen.add(id)
    const nickname = typeof raw.nickname === 'string' ? raw.nickname.trim().slice(0, 40) : ''
    out.push({
      profileId: id,
      ...(nickname ? { nickname } : {}),
      addedAt: Number(raw.addedAt) || Date.now()
    })
  }
  return out
}

function sanitize(input: Partial<AppConfig>, base: AppConfig): AppConfig {
  const players = input.players !== undefined ? sanitizePlayers(input.players) : base.players
  let visibleModes = base.visibleModes
  if (Array.isArray(input.visibleModes)) {
    visibleModes = [...new Set(input.visibleModes.map(Number).filter(isKnownMode))]
  }
  let autoRefreshMinutes = base.autoRefreshMinutes
  if (input.autoRefreshMinutes !== undefined) {
    const n = Number(input.autoRefreshMinutes)
    autoRefreshMinutes = Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), 240) : base.autoRefreshMinutes
  }
  let skippedUpdateVersion = base.skippedUpdateVersion
  if (input.skippedUpdateVersion !== undefined) {
    const v = input.skippedUpdateVersion
    skippedUpdateVersion = typeof v === 'string' && /^[\w.+-]{1,40}$/.test(v) ? v : undefined
  }
  return { players, visibleModes, autoRefreshMinutes, ...(skippedUpdateVersion ? { skippedUpdateVersion } : {}) }
}

let config: AppConfig | null = null

export function getConfig(): AppConfig {
  if (!config) {
    const stored = readJson<Partial<AppConfig>>(configPath())
    config = stored ? sanitize(stored, DEFAULT_CONFIG) : { ...DEFAULT_CONFIG }
  }
  return config
}

export function setConfig(patch: Partial<AppConfig>): AppConfig {
  config = sanitize(patch, getConfig())
  writeJson(configPath(), config)
  return config
}

export function getCache(): StatsCache | null {
  const c = readJson<StatsCache>(cachePath())
  return c && typeof c.fetchedAt === 'number' && c.players ? c : null
}

export function setCache(cache: StatsCache): void {
  writeJson(cachePath(), cache)
}
