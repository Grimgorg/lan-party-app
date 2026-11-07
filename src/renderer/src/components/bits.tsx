import type { ReactNode } from 'react'
import type { Row } from '../format'
import type { SortDir } from '../useSort'

export function Streak({ value, label }: { value: number | null | undefined; label?: string }) {
  if (!value) return <span className="muted">—</span>
  const win = value > 0
  const n = Math.abs(value)
  const icon = win && n >= 3 ? ' 🔥' : !win && n >= 3 ? ' 💀' : ''
  return (
    <span className={`streak ${win ? 'win' : 'loss'}`} title={`${n} ${win ? 'win' : 'loss'}${n === 1 ? '' : win ? 's' : 'es'} in a row`}>
      {win ? 'W' : 'L'}
      {n}
      {icon}
      {label && <span className="streak-label">{label}</span>}
    </span>
  )
}

export function PlayerCell({ row, onOpen }: { row: Row; onOpen: (id: number) => void }) {
  return (
    <div className="player-cell">
      {row.snap?.country && <span className="country">{row.snap.country.toUpperCase()}</span>}
      <div className="player-names">
        <button className="link" onClick={() => onOpen(row.player.profileId)} title="Open profile on aoe2companion">
          {row.name}
        </button>
        {row.subName && <span className="sub">{row.subName}</span>}
        {!row.snap && <span className="sub warn">no ranked data</span>}
      </div>
    </div>
  )
}

export function SortHeader(props: {
  id: string
  label: ReactNode
  sortKey: string
  sortDir: SortDir
  onSort: (id: string, text?: boolean) => void
  text?: boolean
  title?: string
  className?: string
}) {
  const active = props.sortKey === props.id
  return (
    <th
      className={`sortable ${active ? 'active' : ''} ${props.className ?? ''}`}
      title={props.title}
      onClick={() => props.onSort(props.id, props.text)}
      aria-sort={active ? (props.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {props.label}
      <span className="sort-arrow">{active ? (props.sortDir === 'asc' ? '▲' : '▼') : ''}</span>
    </th>
  )
}
