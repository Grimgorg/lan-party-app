import type { ModeStats, PlayerSnapshot, WatchedPlayer } from '../../shared/types'

export interface Row {
  player: WatchedPlayer
  snap: PlayerSnapshot | undefined
  name: string
  /** In-game name, shown under the nickname when one is set. */
  subName: string | null
}

export function buildRows(players: WatchedPlayer[], snaps: Record<number, PlayerSnapshot>): Row[] {
  return players.map((player) => {
    const snap = snaps[player.profileId]
    const alias = snap?.alias || `Profile ${player.profileId}`
    const name = player.nickname || alias
    return { player, snap, name, subName: player.nickname && snap?.alias ? snap.alias : null }
  })
}

export const fmtInt = (n: number): string => n.toLocaleString()

export function winRate(wins: number, losses: number): number | null {
  const games = wins + losses
  return games > 0 ? wins / games : null
}

export const fmtPct = (r: number | null): string => (r === null ? '—' : `${(r * 100).toFixed(1)}%`)

export function fmtAgo(unixSeconds: number | null, now = Date.now()): string {
  if (!unixSeconds) return '—'
  const s = Math.max(0, Math.round(now / 1000 - unixSeconds))
  if (s < 60) return 'just now'
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, 'y'],
    [60 * 60 * 24 * 30, 'mo'],
    [60 * 60 * 24 * 7, 'w'],
    [60 * 60 * 24, 'd'],
    [60 * 60, 'h'],
    [60, 'm']
  ]
  for (const [size, label] of units) {
    if (s >= size) return `${Math.floor(s / size)}${label} ago`
  }
  return 'just now'
}

export function fmtDate(unixSeconds: number | null): string {
  return unixSeconds ? new Date(unixSeconds * 1000).toLocaleString() : ''
}

/** Totals over the given modes. */
export function totals(snap: PlayerSnapshot | undefined, modeIds: number[]) {
  let wins = 0
  let losses = 0
  let best: ModeStats | null = null
  let worst: ModeStats | null = null
  for (const id of modeIds) {
    const m = snap?.modes[id]
    if (!m) continue
    wins += m.wins
    losses += m.losses
    if (m.streak > 0 && (!best || m.streak > best.streak)) best = m
    if (m.streak < 0 && (!worst || m.streak < worst.streak)) worst = m
  }
  return { wins, losses, games: wins + losses, rate: winRate(wins, losses), best, worst }
}

export function lastPlayed(snap: PlayerSnapshot | undefined): number | null {
  if (!snap) return null
  let last: number | null = null
  for (const m of Object.values(snap.modes)) {
    if (m.lastMatch && (!last || m.lastMatch > last)) last = m.lastMatch
  }
  return last
}
