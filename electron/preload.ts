import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  store: {
    get: (key: string) => ipcRenderer.invoke('store-get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store-delete', key),
    clear: () => ipcRenderer.invoke('store-clear'),
  },
  dialog: {
    showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('get-app-version'),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell-open-external', url),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI