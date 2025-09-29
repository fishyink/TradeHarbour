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
    showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  },
  fileSystem: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs-read-file', filePath),
    writeFile: (filePath: string, data: string) => ipcRenderer.invoke('fs-write-file', filePath, data),
    deleteFile: (filePath: string) => ipcRenderer.invoke('fs-delete-file', filePath),
    createDirectory: (dirPath: string) => ipcRenderer.invoke('fs-create-directory', dirPath),
    deleteDirectory: (dirPath: string) => ipcRenderer.invoke('fs-delete-directory', dirPath),
    moveFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs-move-file', oldPath, newPath),
    fileExists: (filePath: string) => ipcRenderer.invoke('fs-file-exists', filePath),
  },
  backup: {
    exportUserData: () => ipcRenderer.invoke('export-user-data'),
    importUserData: (filePath: string) => ipcRenderer.invoke('import-user-data', filePath),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell-open-external', url),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI