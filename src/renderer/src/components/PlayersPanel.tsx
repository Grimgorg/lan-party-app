import { useEffect, useRef, useState } from 'react'
import { GAME_MODES } from '../../../shared/modes'
import type { AppConfig, PlayerSnapshot, SearchResult, WatchedPlayer } from '../../../shared/types'

interface Props {
  config: AppConfig
  snaps: Record<number, PlayerSnapshot>
  onChange: (patch: Partial<AppConfig>) => Promise<void>
  onClose: () => void
}

const REFRESH_OPTIONS = [0, 1, 2, 5, 10, 15, 30, 60]

export function PlayersPanel({ config, snaps, onChange, onClose }: Props) {
  const watched = new Set(config.players.map((p) => p.profileId))

  const addPlayer = (r: SearchResult) => {
    if (watched.has(r.profileId)) return
    void onChange({ players: [...config.players, { profileId: r.profileId, addedAt: Date.now() }] })
  }
  const updatePlayer = (id: number, patch: Partial<WatchedPlayer>) =>
    onChange({ players: config.players.map((p) => (p.profileId === id ? { ...p, ...patch } : p)) })
  const removePlayer = (id: number) => onChange({ players: config.players.filter((p) => p.profileId !== id) })
  const movePlayer = (id: number, dir: -1 | 1) => {
    const list = [...config.players]
    const i = list.findIndex((p) => p.profileId === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    void onChange({ players: list })
  }

  const toggleMode = (id: number) => {
    const on = config.visibleModes.includes(id)
    const next = on ? config.visibleModes.filter((m) => m !== id) : [...config.visibleModes, id]
    // Keep the canonical order so columns don't jump around.
    const order = GAME_MODES.map((m) => m.id)
    void onChange({ visibleModes: next.sort((a, b) => order.indexOf(a) - order.indexOf(b)) })
  }

  return (
    <aside className="panel" role="dialog" aria-label="Players and settings">
      <header className="panel-head">
        <h2>Players &amp; settings</h2>
        <button className="icon-btn" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
      </header>

      <section>
        <h3>Add a player</h3>
        <PlayerSearch watched={watched} onAdd={addPlayer} />
      </section>

      <section>
        <h3>
          Watched players <span className="count">{config.players.length}</span>
        </h3>
        {config.players.length === 0 && <p className="muted">Nobody yet. Search above to add your group.</p>}
        <ul className="watch-list">
          {config.players.map((p, i) => (
            <WatchedItem
              key={p.profileId}
              player={p}
              alias={snaps[p.profileId]?.alias}
              first={i === 0}
              last={i === config.players.length - 1}
              onNickname={(nickname) => updatePlayer(p.profileId, { nickname })}
              onRemove={() => removePlayer(p.profileId)}
              onMove={(d) => movePlayer(p.profileId, d)}
            />
          ))}
        </ul>
      </section>

      <section>
        <h3>Game modes shown</h3>
        <div className="mode-grid">
          {GAME_MODES.map((m) => (
            <label key={m.id} className="check">
              <input type="checkbox" checked={config.visibleModes.includes(m.id)} onChange={() => toggleMode(m.id)} />
              <span>{m.name}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3>Auto refresh</h3>
        <select
          value={config.autoRefreshMinutes}
          onChange={(e) => void onChange({ autoRefreshMinutes: Number(e.target.value) })}
        >
          {REFRESH_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? 'Off' : `Every ${n} minute${n === 1 ? '' : 's'}`}
            </option>
          ))}
        </select>
      </section>

      <footer className="panel-foot muted">
        Stats from the official AoE II DE servers. Player search by aoe2companion.com.
      </footer>
    </aside>
  )
}

function PlayerSearch({ watched, onAdd }: { watched: Set<number>; onAdd: (r: SearchResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  const seq = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setState('idle')
      return
    }
    const id = ++seq.current
    setState('loading')
    const timer = setTimeout(() => {
      window.api
        .searchPlayers(q)
        .then((r) => {
          if (id !== seq.current) return
          setResults(r)
          setState('done')
        })
        .catch(() => id === seq.current && setState('error'))
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="search">
      <input
        type="search"
        placeholder="In-game name, profile ID or aoe2companion link"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {state === 'loading' && <p className="muted small">Searching…</p>}
      {state === 'error' && <p className="error small">Search failed. Check your internet connection.</p>}
      {state === 'done' && results.length === 0 && <p className="muted small">No players found.</p>}
      {results.length > 0 && (
        <ul className="results">
          {results.map((r) => {
            const added = watched.has(r.profileId)
            return (
              <li key={r.profileId}>
                <div className="result-main">
                  <span className="result-name">
                    {r.clan && <span className="clan">[{r.clan}]</span>} {r.name}
                  </span>
                  <span className="sub">
                    {r.country ? `${r.country.toUpperCase()} · ` : ''}
                    {r.games != null ? `${r.games.toLocaleString()} games · ` : ''}ID {r.profileId}
                  </span>
                </div>
                <button className="btn small" disabled={added} onClick={() => onAdd(r)}>
                  {added ? 'Added' : 'Add'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function WatchedItem(props: {
  player: WatchedPlayer
  alias: string | undefined
  first: boolean
  last: boolean
  onNickname: (nickname: string) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const { player } = props
  const [nick, setNick] = useState(player.nickname ?? '')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => setNick(player.nickname ?? ''), [player.nickname])

  const commit = () => {
    if (nick.trim() !== (player.nickname ?? '')) props.onNickname(nick.trim())
  }

  return (
    <li className="watch-item">
      <div className="reorder">
        <button className="icon-btn tiny" disabled={props.first} onClick={() => props.onMove(-1)} title="Move up">
          ▲
        </button>
        <button className="icon-btn tiny" disabled={props.last} onClick={() => props.onMove(1)} title="Move down">
          ▼
        </button>
      </div>
      <div className="watch-main">
        <input
          className="nick"
          value={nick}
          placeholder={props.alias ? `${props.alias} (set nickname…)` : 'Set nickname…'}
          maxLength={40}
          title="LAN party nickname (optional)"
          onChange={(e) => setNick(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <span className="sub">
          {props.alias ?? 'loading…'} · ID {player.profileId}
        </span>
      </div>
      {confirm ? (
        <div className="confirm">
          <button className="btn small danger" onClick={props.onRemove}>
            Remove
          </button>
          <button className="btn small ghost" onClick={() => setConfirm(false)}>
            Keep
          </button>
        </div>
      ) : (
        <button className="icon-btn" onClick={() => setConfirm(true)} title="Remove player">
          🗑
        </button>
      )}
    </li>
  )
}
