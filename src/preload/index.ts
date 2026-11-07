import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '../shared/types'

const api: Api = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (patch) => ipcRenderer.invoke('config:set', patch),
  getCachedStats: () => ipcRenderer.invoke('stats:cached'),
  refreshStats: () => ipcRenderer.invoke('stats:refresh'),
  searchPlayers: (query) => ipcRenderer.invoke('players:search', query),
  openProfile: (profileId) => ipcRenderer.invoke('profile:open', profileId)
}

contextBridge.exposeInMainWorld('api', api)
