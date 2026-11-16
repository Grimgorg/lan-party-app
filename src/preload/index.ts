import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Api } from '../shared/types'

const api: Api = {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (patch) => ipcRenderer.invoke('config:set', patch),
  getCachedStats: () => ipcRenderer.invoke('stats:cached'),
  refreshStats: () => ipcRenderer.invoke('stats:refresh'),
  searchPlayers: (query) => ipcRenderer.invoke('players:search', query),
  openProfile: (profileId) => ipcRenderer.invoke('profile:open', profileId),
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateProgress: (listener) => {
    const handler = (_e: IpcRendererEvent, percent: number) => listener(percent)
    ipcRenderer.on('update:progress', handler)
    return () => ipcRenderer.removeListener('update:progress', handler)
  },
  skipUpdate: () => ipcRenderer.invoke('update:skip'),
  openReleasePage: () => ipcRenderer.invoke('update:openPage')
}

contextBridge.exposeInMainWorld('api', api)
