/**
 * Ranked leaderboards of AoE II DE, as reported by the official
 * worldsedgelink API (GetAvailableLeaderboards?title=age2).
 */
export interface GameMode {
  id: number
  short: string
  name: string
}

export const GAME_MODES: GameMode[] = [
  { id: 3, short: 'RM 1v1', name: 'Random Map 1v1' },
  { id: 4, short: 'RM Team', name: 'Random Map Team' },
  { id: 13, short: 'EW 1v1', name: 'Empire Wars 1v1' },
  { id: 14, short: 'EW Team', name: 'Empire Wars Team' },
  { id: 1, short: 'DM 1v1', name: 'Death Match 1v1' },
  { id: 2, short: 'DM Team', name: 'Death Match Team' },
  { id: 5, short: 'BR', name: 'Battle Royale' },
  { id: 15, short: 'RM 1v1 Console', name: 'Random Map 1v1 (Console)' },
  { id: 16, short: 'RM Team Console', name: 'Random Map Team (Console)' },
  { id: 17, short: 'EW 1v1 Console', name: 'Empire Wars 1v1 (Console)' },
  { id: 18, short: 'EW Team Console', name: 'Empire Wars Team (Console)' }
]

export const DEFAULT_VISIBLE_MODES = [3, 4, 13, 14]

const byId = new Map(GAME_MODES.map((m) => [m.id, m]))

export function modeById(id: number): GameMode {
  return byId.get(id) ?? { id, short: `LB ${id}`, name: `Leaderboard ${id}` }
}

export function isKnownMode(id: number): boolean {
  return byId.has(id)
}
