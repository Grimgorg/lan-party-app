import { fmtAgo, fmtDate, fmtInt, fmtPct, winRate, type Row } from '../format'
import { useSort, type SortValue } from '../useSort'
import { PlayerCell, SortHeader, Streak } from './bits'

interface Props {
  rows: Row[]
  modeId: number
  onOpen: (profileId: number) => void
}

const MEDALS = ['🥇', '🥈', '🥉']

/** Detailed ranking of the group in a single game mode. */
export function ModeTable({ rows, modeId, onOpen }: Props) {
  const withStats = rows.map((row) => ({ row, m: row.snap?.modes[modeId] }))
  type E = (typeof withStats)[number]

  // Group position is always by rating, independent of the column you sort by.
  const groupRank = new Map<number, number>()
  withStats
    .filter((e) => e.m)
    .sort((a, b) => b.m!.rating - a.m!.rating)
    .forEach((e, i) => groupRank.set(e.row.player.profileId, i + 1))

  const accessors: Record<string, (e: E) => SortValue> = {
    pos: (e) => (groupRank.has(e.row.player.profileId) ? -groupRank.get(e.row.player.profileId)! : undefined),
    name: (e) => e.row.name,
    rating: (e) => e.m?.rating,
    peak: (e) => e.m?.maxRating,
    rank: (e) => (e.m?.rank ? -e.m.rank : undefined),
    wins: (e) => e.m?.wins,
    losses: (e) => e.m?.losses,
    games: (e) => (e.m ? e.m.wins + e.m.losses : undefined),
    rate: (e) => (e.m ? winRate(e.m.wins, e.m.losses) : undefined),
    streak: (e) => e.m?.streak,
    drops: (e) => e.m?.drops,
    last: (e) => e.m?.lastMatch
  }
  const { sorted, sortKey, sortDir, toggle } = useSort(withStats, accessors, 'rating')
  const h = { sortKey, sortDir, onSort: toggle }

  return (
    <table className="ranking">
      <thead>
        <tr>
          <SortHeader id="pos" label="#" className="num pos" title="Position within the group (by rating)" {...h} />
          <SortHeader id="name" label="Player" text {...h} />
          <SortHeader id="rating" label="Rating" className="num" {...h} />
          <SortHeader id="peak" label="Peak" className="num" title="Highest rating ever reached" {...h} />
          <SortHeader id="rank" label="Global rank" className="num" {...h} />
          <SortHeader id="wins" label="Wins" className="num" {...h} />
          <SortHeader id="losses" label="Losses" className="num" {...h} />
          <SortHeader id="games" label="Games" className="num" {...h} />
          <SortHeader id="rate" label="Win %" className="num" {...h} />
          <SortHeader id="streak" label="Streak" title="Current win (W) or lose (L) streak" {...h} />
          <SortHeader id="drops" label="Drops" className="num" title="Games left early / disconnected" {...h} />
          <SortHeader id="last" label="Last game" {...h} />
        </tr>
      </thead>
      <tbody>
        {sorted.map(({ row, m }) => {
          const pos = groupRank.get(row.player.profileId)
          return (
            <tr key={row.player.profileId} className={m ? '' : 'dim'}>
              <td className="num pos">{pos ? (MEDALS[pos - 1] ?? pos) : ''}</td>
              <td>
                <PlayerCell row={row} onOpen={onOpen} />
              </td>
              {m ? (
                <>
                  <td className="num rating">{m.rating}</td>
                  <td className="num">{m.maxRating}</td>
                  <td className="num" title={m.rankTotal ? `of ${fmtInt(m.rankTotal)} players` : undefined}>
                    {m.rank ? `#${fmtInt(m.rank)}` : <span className="muted" title="No current rank on this ladder (usually inactive)">unranked</span>}
                  </td>
                  <td className="num win-text">{fmtInt(m.wins)}</td>
                  <td className="num loss-text">{fmtInt(m.losses)}</td>
                  <td className="num">{fmtInt(m.wins + m.losses)}</td>
                  <td className="num">{fmtPct(winRate(m.wins, m.losses))}</td>
                  <td>
                    <Streak value={m.streak} />
                  </td>
                  <td className="num">{fmtInt(m.drops)}</td>
                  <td title={fmtDate(m.lastMatch)}>{fmtAgo(m.lastMatch)}</td>
                </>
              ) : (
                <td colSpan={10} className="muted">
                  Has not played this mode
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
