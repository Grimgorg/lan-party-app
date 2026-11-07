import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import type { AppConfig, StatsCache } from '../shared/types'
import { fetchStats, searchPlayers } from './aoe-api'
import { getCache, getConfig, setCache, setConfig } from './store'
import appIcon from '../../build/icon-256.png?asset'

let mainWindow: BrowserWindow | null = null
let refreshInFlight: Promise<StatsCache> | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: 'LAN Party App',
    backgroundColor: '#15120e',
    autoHideMenuBar: true,
    // macOS takes the icon from the app bundle; Windows/Linux windows need it set.
    ...(process.platform !== 'darwin' ? { icon: appIcon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // Never open new Electron windows; send http(s) links to the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow?.webContents.getURL()) event.preventDefault()
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devUrl) {
    void mainWindow.loadURL(devUrl)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  mainWindow.on('closed', () => (mainWindow = null))
}

async function refreshStats(): Promise<StatsCache> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const ids = getConfig().players.map((p) => p.profileId)
    const players = ids.length ? await fetchStats(ids) : {}
    const cache: StatsCache = { fetchedAt: Date.now(), players }
    setCache(cache)
    return cache
  })()
  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

function registerIpc(): void {
  ipcMain.handle('config:get', () => getConfig())
  ipcMain.handle('config:set', (_e, patch: Partial<AppConfig>) => setConfig(patch ?? {}))
  ipcMain.handle('stats:cached', () => getCache())
  ipcMain.handle('stats:refresh', () => refreshStats())
  ipcMain.handle('players:search', (_e, query: unknown) =>
    typeof query === 'string' ? searchPlayers(query.slice(0, 200)) : []
  )
  ipcMain.handle('profile:open', async (_e, profileId: unknown) => {
    const id = Number(profileId)
    if (Number.isInteger(id) && id > 0) {
      await shell.openExternal(`https://www.aoe2companion.com/profile/${id}`)
    }
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  void app.whenReady().then(() => {
    registerIpc()
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
