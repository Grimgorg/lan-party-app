import { useCallback, useEffect, useMemo, useState } from 'react'
import { modeById } from '../../shared/modes'
import type { AppConfig, StatsCache } from '../../shared/types'
import { ModeTable } from './components/ModeTable'
import { OverviewTable } from './components/OverviewTable'
import { PlayersPanel } from './components/PlayersPanel'
import { UpdateDialog } from './components/UpdateDialog'
import { buildRows } from './format'
import logoUrl from '../../../build/icon.svg'

const TAB_KEY = 'lanparty.activeTab'
type Tab = 'overview' | number

function loadTab(): Tab {
  try {
    const v = localStorage.getItem(TAB_KEY)
    return v && v !== 'overview' && Number.isFinite(Number(v)) ? Number(v) : 'overview'
  } catch {
    return 'overview'
  }
}

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [cache, setCache] = useState<StatsCache | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [tab, setTabState] = useState<Tab>(loadTab)
  const [, setTick] = useState(0)

  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      localStorage.setItem(TAB_KEY, String(t))
    } catch {
      /* ignore */
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setCache(await window.api.refreshStats())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load: show cached stats instantly, then fetch fresh ones.
  useEffect(() => {
    void (async () => {
      const [cfg, cached, ver] = await Promise.all([
        window.api.getConfig(),
        window.api.getCachedStats(),
        window.api.getAppVersion()
      ])
      setVersion(ver)
      setConfig(cfg)
      setCache(cached)
      if (cfg.players.length === 0) setPanelOpen(true)
      void refresh()
    })()
  }, [refresh])

  // Auto refresh.
  const minutes = config?.autoRefreshMinutes ?? 0
  useEffect(() => {
    if (!minutes) return
    const timer = setInterval(() => void refresh(), minutes * 60_000)
    return () => clearInterval(timer)
  }, [minutes, refresh])

  // Re-render every 30s so "x minutes ago" labels stay current.
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false)
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
        e.preventDefault()
        void refresh()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [refresh])

  const updateConfig = useCallback(
    async (patch: Partial<AppConfig>) => {
      const prevIds = new Set(config?.players.map((p) => p.profileId))
      const next = await window.api.setConfig(patch)
      setConfig(next)
      if (next.players.some((p) => !prevIds.has(p.profileId))) void refresh()
    },
    [config, refresh]
  )

  const rows = useMemo(() => (config ? buildRows(config.players, cache?.players ?? {}) : []), [config, cache])

  if (!config) return <div className="boot">Loading…</div>

  const activeTab: Tab = typeof tab === 'number' && config.visibleModes.includes(tab) ? tab : 'overview'
  const openProfile = (id: number) => void window.api.openProfile(id)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="logo" src={logoUrl} alt="" />
          <div>
            <h1>LAN Party</h1>
            <span className="sub">
              Age of Empires II: DE ranking{version && <span className="version"> · v{version}</span>}
            </span>
          </div>
        </div>
        <div className="top-actions">
          <span className="muted small" title={cache ? new Date(cache.fetchedAt).toLocaleString() : undefined}>
            {loading ? 'Refreshing…' : cache ? `Updated ${new Date(cache.fetchedAt).toLocaleTimeString()}` : 'Not loaded yet'}
          </span>
          <button className="btn" onClick={() => void refresh()} disabled={loading} title="Refresh (F5)">
            <span className={loading ? 'spin' : ''}>↻</span> Refresh
          </button>
          <button className="btn primary" onClick={() => setPanelOpen((o) => !o)}>
            Players &amp; settings
          </button>
        </div>
      </header>

      {error && (
        <div className="banner">
          Couldn&apos;t load fresh stats ({error}).
          {cache ? ` Showing data from ${new Date(cache.fetchedAt).toLocaleString()}.` : ''}
          <button className="btn small" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      <nav className="tabs">
        <button className={activeTab === 'overview' ? 'tab active' : 'tab'} onClick={() => setTab('overview')}>
          Overview
        </button>
        {config.visibleModes.map((id) => (
          <button key={id} className={activeTab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)} title={modeById(id).name}>
            {modeById(id).short}
          </button>
        ))}
      </nav>

      <main className="content">
        {rows.length === 0 ? (
          <div className="empty">
            <h2>No players yet</h2>
            <p className="muted">Add your LAN party crew to see how everyone ranks.</p>
            <button className="btn primary" onClick={() => setPanelOpen(true)}>
              Add players
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            {activeTab === 'overview' ? (
              <OverviewTable rows={rows} modes={config.visibleModes} onOpen={openProfile} />
            ) : (
              <ModeTable rows={rows} modeId={activeTab} onOpen={openProfile} />
            )}
          </div>
        )}
      </main>

      {panelOpen && (
        <>
          <div className="scrim" onClick={() => setPanelOpen(false)} />
          <PlayersPanel config={config} snaps={cache?.players ?? {}} onChange={updateConfig} onClose={() => setPanelOpen(false)} />
        </>
      )}

      <UpdateDialog />
    </div>
  )
}
