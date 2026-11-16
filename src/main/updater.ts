import { app, shell, type WebContents } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { autoUpdater } from 'electron-updater'
import type { AvailableUpdate } from '../shared/types'
import { getConfig, setConfig } from './store'

/**
 * Self-update from GitHub releases (electron-updater). Release builds check once per start; the UI asks before
 * anything is downloaded. Where to look comes from the `publish` setting in package.json, which electron-builder
 * writes into the app as app-update.yml; the release workflow uploads the latest*.yml files it reads.
 * Runs from source (`npm run dev`) never check.
 */

const RELEASES_PAGE = 'https://github.com/Grimgorg/lan-party-app/releases/latest'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false
autoUpdater.logger = console

function canInstall(): boolean {
  if (process.platform === 'win32') return !process.env['PORTABLE_EXECUTABLE_DIR']
  // electron-builder writes resources/package-type into .deb (and .rpm) installs; an AppImage sets $APPIMAGE.
  if (process.platform === 'linux') {
    return Boolean(process.env['APPIMAGE']) || existsSync(join(process.resourcesPath, 'package-type'))
  }
  // macOS refuses to swap in an update for an unsigned app.
  return false
}

let check: Promise<AvailableUpdate | null> | null = null
let install: Promise<void> | null = null

async function runCheck(): Promise<AvailableUpdate | null> {
  if (!app.isPackaged) return null
  try {
    const result = await autoUpdater.checkForUpdates()
    if (!result?.isUpdateAvailable) return null
    return { version: result.updateInfo.version, currentVersion: app.getVersion(), canInstall: canInstall() }
  } catch (err) {
    // Usually no internet (common at a LAN party): just try again at the next start.
    console.error('Update check failed', err)
    return null
  }
}

export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  check ??= runCheck()
  const update = await check
  return update && update.version !== getConfig().skippedUpdateVersion ? update : null
}

export function installUpdate(sender: WebContents): Promise<void> {
  install ??= (async () => {
    const update = await checkForUpdate()
    if (!update?.canInstall) throw new Error('This build can’t install updates itself')
    const onProgress = ({ percent }: { percent: number }) => {
      if (!sender.isDestroyed()) sender.send('update:progress', percent)
    }
    autoUpdater.on('download-progress', onProgress)
    try {
      await autoUpdater.downloadUpdate()
    } finally {
      autoUpdater.off('download-progress', onProgress)
    }
    // Let the IPC reply reach the window first. Silent install, then start the new version.
    setImmediate(() => autoUpdater.quitAndInstall(true, true))
  })().catch((err: unknown) => {
    install = null
    throw err
  })
  return install
}

export async function skipUpdate(): Promise<void> {
  const update = await checkForUpdate()
  if (update) setConfig({ skippedUpdateVersion: update.version })
}

export async function openReleasePage(): Promise<void> {
  await shell.openExternal(RELEASES_PAGE)
}
