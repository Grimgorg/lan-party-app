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
  /** Release the user chose to skip; the app doesn't offer this version again. */
  skippedUpdateVersion?: string
}

/** A newer release found by the update check at startup. */
export interface AvailableUpdate {
  version: string
  currentVersion: string
  /**
   * True when this build can install the update itself: the Windows installer build, the AppImage and the .deb.
   * The macOS app (unsigned) and the Windows portable .exe can't, so they offer the download page instead.
   */
  canInstall: boolean
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
  /** Version of the running app, e.g. "0.3.0". */
  getAppVersion(): Promise<string>
  getConfig(): Promise<AppConfig>
  setConfig(patch: Partial<AppConfig>): Promise<AppConfig>
  getCachedStats(): Promise<StatsCache | null>
  refreshStats(): Promise<StatsCache>
  searchPlayers(query: string): Promise<SearchResult[]>
  openProfile(profileId: number): Promise<void>
  /** Null when there's no newer release, the user skipped it, the check failed, or this isn't a release build. */
  checkForUpdate(): Promise<AvailableUpdate | null>
  /** Downloads the update, then quits, installs it and starts the new version. */
  installUpdate(): Promise<void>
  /** Download progress of installUpdate, in percent. Returns a function that stops listening. */
  onUpdateProgress(listener: (percent: number) => void): () => void
  skipUpdate(): Promise<void>
  openReleasePage(): Promise<void>
}
