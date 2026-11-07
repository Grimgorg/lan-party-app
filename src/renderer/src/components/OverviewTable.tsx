import { modeById } from '../../../shared/modes'
import { fmtAgo, fmtDate, fmtInt, fmtPct, lastPlayed, totals, type Row } from '../format'
import { useSort, type SortValue } from '../useSort'
import { PlayerCell, SortHeader, Streak } from './bits'

interface Props {
  rows: Row[]
  modes: number[]
  onOpen: (profileId: number) => void
}

/** One row per player, the rating of every visible mode side by side plus totals. */
export function OverviewTable({ rows, modes, onOpen }: Props) {
  const enriched = rows.map((row) => ({ row, t: totals(row.snap, modes), last: lastPlayed(row.snap) }))
  type E = (typeof enriched)[number]

  const accessors: Record<string, (e: E) => SortValue> = {
    name: (e) => e.row.name,
    wins: (e) => e.t.wins,
    losses: (e) => e.t.losses,
    games: (e) => e.t.games,
    rate: (e) => e.t.rate,
    best: (e) => e.t.best?.streak,
    worst: (e) => (e.t.worst ? -e.t.worst.streak : undefined),
    last: (e) => e.last
  }
  for (const id of modes) accessors[`m${id}`] = (e) => e.row.snap?.modes[id]?.rating

  const { sorted, sortKey, sortDir, toggle } = useSort(enriched, accessors, modes.length ? `m${modes[0]}` : 'wins')
  const h = { sortKey, sortDir, onSort: toggle }

  return (
    <table className="ranking">
      <thead>
        <tr>
          <th className="num pos">#</th>
          <SortHeader id="name" label="Player" text {...h} />
          {modes.map((id) => (
            <SortHeader
              key={id}
              id={`m${id}`}
              label={modeById(id).short}
              title={`${modeById(id).name}: rating (global rank)`}
              className="num"
              {...h}
            />
          ))}
          <SortHeader id="wins" label="Wins" className="num" title="Total wins in the shown modes" {...h} />
          <SortHeader id="losses" label="Losses" className="num" title="Total losses in the shown modes" {...h} />
          <SortHeader id="rate" label="Win %" className="num" {...h} />
          <SortHeader id="best" label="Win streak" title="Longest current win streak across the shown modes" {...h} />
          <SortHeader id="worst" label="Lose streak" title="Longest current lose streak across the shown modes" {...h} />
          <SortHeader id="last" label="Last game" {...h} />
        </tr>
      </thead>
      <tbody>
        {sorted.map((e, i) => (
          <tr key={e.row.player.profileId}>
            <td className="num pos">{i + 1}</td>
            <td>
              <PlayerCell row={e.row} onOpen={onOpen} />
            </td>
            {modes.map((id) => {
              const m = e.row.snap?.modes[id]
              return (
                <td key={id} className="num">
                  {m ? (
                    <div className="rating-cell" title={`Peak ${m.maxRating} · ${m.wins}W / ${m.losses}L`}>
                      <span className="rating">{m.rating}</span>
                      <span className="sub">{m.rank ? `#${fmtInt(m.rank)}` : 'unranked'}</span>
                    </div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              )
            })}
            <td className="num win-text">{fmtInt(e.t.wins)}</td>
            <td className="num loss-text">{fmtInt(e.t.losses)}</td>
            <td className="num">{fmtPct(e.t.rate)}</td>
            <td>
              <Streak value={e.t.best?.streak} label={e.t.best ? modeById(e.t.best.leaderboardId).short : undefined} />
            </td>
            <td>
              <Streak value={e.t.worst?.streak} label={e.t.worst ? modeById(e.t.worst.leaderboardId).short : undefined} />
            </td>
            <td title={fmtDate(e.last)}>{fmtAgo(e.last)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
