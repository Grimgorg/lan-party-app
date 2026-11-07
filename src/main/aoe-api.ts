import type { ModeStats, PlayerSnapshot, SearchResult } from '../shared/types'

/** Official Relic/World's Edge community API (same data the game uses). */
const OFFICIAL_STATS = 'https://aoe-api.worldsedgelink.com/community/leaderboard/GetPersonalStat'
/** aoe2companion: used only for searching players by name. */
const COMPANION_SEARCH = 'https://data.aoe2companion.com/api/profiles'

const USER_AGENT = 'LAN-Party-App (AoE2 group ranking desktop app)'
const TIMEOUT_MS = 15_000
const BATCH_SIZE = 50

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`)
  return (await res.json()) as T
}

interface OfficialMember {
  profile_id: number
  alias: string
  personal_statgroup_id: number
  country?: string
}
interface OfficialLeaderboardStat {
  statgroup_id: number
  leaderboard_id: number
  wins: number
  losses: number
  streak: number
  drops: number
  rank: number
  ranktotal: number
  rating: number
  highestrating: number
  lastmatchdate: number
}
interface OfficialPersonalStat {
  result: { code: number; message: string }
  statGroups?: { id: number; members: OfficialMember[] }[]
  leaderboardStats?: OfficialLeaderboardStat[]
}

function toModeStats(s: OfficialLeaderboardStat): ModeStats {
  return {
    leaderboardId: s.leaderboard_id,
    rating: s.rating,
    maxRating: Math.max(s.highestrating ?? 0, s.rating),
    rank: s.rank > 0 ? s.rank : null,
    rankTotal: s.ranktotal > 0 ? s.ranktotal : null,
    wins: s.wins,
    losses: s.losses,
    streak: s.streak,
    drops: s.drops,
    lastMatch: s.lastmatchdate > 0 ? s.lastmatchdate : null
  }
}

/** Fetch ranked stats for the given profile IDs. Unknown IDs are simply absent. */
export async function fetchStats(profileIds: number[]): Promise<Record<number, PlayerSnapshot>> {
  const out: Record<number, PlayerSnapshot> = {}
  for (let i = 0; i < profileIds.length; i += BATCH_SIZE) {
    const batch = profileIds.slice(i, i + BATCH_SIZE)
    const url = `${OFFICIAL_STATS}?title=age2&profile_ids=${encodeURIComponent(JSON.stringify(batch))}`
    const data = await getJson<OfficialPersonalStat>(url)
    if (data.result?.code !== 0) {
      throw new Error(`AoE API error: ${data.result?.message ?? 'unknown'}`)
    }
    const byGroup = new Map<number, PlayerSnapshot>()
    for (const group of data.statGroups ?? []) {
      const member = group.members.find((m) => m.personal_statgroup_id === group.id)
      if (!member) continue
      const snap: PlayerSnapshot = {
        profileId: member.profile_id,
        alias: member.alias,
        country: member.country || null,
        modes: {}
      }
      byGroup.set(group.id, snap)
      out[member.profile_id] = snap
    }
    for (const stat of data.leaderboardStats ?? []) {
      const snap = byGroup.get(stat.statgroup_id)
      if (snap) snap.modes[stat.leaderboard_id] = toModeStats(stat)
    }
  }
  return out
}

interface CompanionProfile {
  profileId: number
  name: string
  country?: string | null
  games?: string | number | null
  clan?: string | null
}

/** Extract a profile ID from a plain number or an aoe2companion / aoe2insights / aoe2.net URL. */
export function parseProfileId(query: string): number | null {
  const q = query.trim()
  if (/^\d{1,12}$/.test(q)) return Number(q)
  const m = q.match(/(?:profile|user|profile_id=)[/=]?(\d{1,12})/i)
  return m ? Number(m[1]) : null
}

export async function searchPlayers(query: string): Promise<SearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const results: SearchResult[] = []

  const id = parseProfileId(q)
  if (id !== null) {
    const stats = await fetchStats([id]).catch(() => ({}) as Record<number, PlayerSnapshot>)
    const snap = stats[id]
    if (snap) {
      const games = Object.values(snap.modes).reduce((n, m) => n + m.wins + m.losses, 0)
      results.push({ profileId: id, name: snap.alias, country: snap.country, games, clan: null })
    }
    // A URL is never a name, so stop here.
    if (!/^\d+$/.test(q)) return results
  }

  const url = `${COMPANION_SEARCH}?search=${encodeURIComponent(q)}&page=1`
  const data = await getJson<{ profiles?: CompanionProfile[] }>(url)
  for (const p of data.profiles ?? []) {
    if (results.some((r) => r.profileId === p.profileId)) continue
    const games = p.games == null ? null : Number(p.games)
    results.push({
      profileId: p.profileId,
      name: p.name,
      country: p.country || null,
      games: Number.isFinite(games) ? games : null,
      clan: p.clan || null
    })
  }
  return results.slice(0, 25)
}
