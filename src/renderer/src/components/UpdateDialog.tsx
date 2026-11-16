import { useEffect, useState } from 'react'
import type { AvailableUpdate } from '../../../shared/types'

type Phase = { name: 'ask' } | { name: 'downloading'; percent: number } | { name: 'failed'; message: string }

/** Asks once per start whether to install a newer release, like the other apps of the group. */
export function UpdateDialog() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null)
  const [phase, setPhase] = useState<Phase>({ name: 'ask' })

  useEffect(() => {
    let active = true
    void window.api.checkForUpdate().then((u) => active && setUpdate(u))
    return () => {
      active = false
    }
  }, [])

  if (!update) return null

  const close = () => setUpdate(null)
  const downloading = phase.name === 'downloading'

  const install = async () => {
    setPhase({ name: 'downloading', percent: 0 })
    const stop = window.api.onUpdateProgress((percent) => setPhase({ name: 'downloading', percent }))
    try {
      // On success the app quits and the installer starts the new version.
      await window.api.installUpdate()
    } catch (err) {
      const message = err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(err)
      setPhase({ name: 'failed', message })
    } finally {
      stop()
    }
  }

  const skip = () => {
    void window.api.skipUpdate()
    close()
  }

  return (
    <>
      <div className="scrim" onClick={downloading ? undefined : close} />
      <div className="dialog" role="dialog" aria-label="Update available">
        <h2>LAN Party App {update.version} is available</h2>
        <p className="muted">
          You have {update.currentVersion}.{' '}
          {update.canInstall
            ? 'Update now? The app downloads the new version, closes and starts again.'
            : 'This copy of the app can’t update itself. Download the new version from the releases page.'}
        </p>

        {phase.name === 'downloading' && (
          <div className="progress" role="progressbar" aria-valuenow={Math.round(phase.percent)} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${phase.percent}%` }} />
          </div>
        )}
        {phase.name === 'failed' && (
          <p className="error">
            The update failed ({phase.message}). You can download it from the releases page instead.
          </p>
        )}

        <div className="dialog-actions">
          <button className="btn ghost" onClick={skip} disabled={downloading}>
            Skip this version
          </button>
          <button className="btn ghost" onClick={() => void window.api.openReleasePage()}>
            What’s new
          </button>
          <span className="spacer" />
          <button className="btn" onClick={close} disabled={downloading}>
            Later
          </button>
          {update.canInstall && phase.name !== 'failed' ? (
            <button className="btn primary" onClick={() => void install()} disabled={downloading}>
              {downloading ? `Downloading… ${Math.round(phase.percent)}%` : 'Update now'}
            </button>
          ) : (
            <button className="btn primary" onClick={() => void window.api.openReleasePage()}>
              Open download page
            </button>
          )}
        </div>
      </div>
    </>
  )
}
