/** A player the group is watching. */
export interface WatchedPlayer {
  profileId: number
  /** Optional LAN-party nickname, shown instead of the in-game name. */
  nickname?: string
  addedAt: number
}

export interface AppConfig {
  players: WatchedPlayer[]
  /** Leaderboard IDs shown as columns/tabs, in display order. */
  visibleModes: number[]
  /** 0 = off */
  autoRefreshMinutes: number
}

/** Stats of one player on one leaderboard (game mode). */
export interface ModeStats {
  leaderboardId: number
  rating: number
  maxRating: number
  /** Global rank; null when the player has no current rank (e.g. inactive). */
  rank: number | null
  rankTotal: number | null
  wins: number
  losses: number
  /** >0 = current win streak, <0 = current lose streak. */
  streak: number
  drops: number
  /** Unix seconds */
  lastMatch: number | null
}

export interface PlayerSnapshot {
  profileId: number
  /** Current in-game name. */
  alias: string
  country: string | null
  /** Keyed by leaderboard ID. */
  modes: Record<number, ModeStats>
}

export interface StatsCache {
  /** ms epoch */
  fetchedAt: number
  players: Record<number, PlayerSnapshot>
}

export interface SearchResult {
  profileId: number
  name: string
  country: string | null
  games: number | null
  clan: string | null
}

export interface Api {
  getConfig(): Promise<AppConfig>
  setConfig(patch: Partial<AppConfig>): Promise<AppConfig>
  getCachedStats(): Promise<StatsCache | null>
  refreshStats(): Promise<StatsCache>
  searchPlayers(query: string): Promise<SearchResult[]>
  openProfile(profileId: number): Promise<void>
}
