import { app, BrowserWindow, Menu, ipcMain, dialog, protocol } from 'electron'
import { autoUpdater } from 'electron-updater'
import Store from 'electron-store'
import * as path from 'path'
import * as fs from 'fs'

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

// Portable-only storage - data folder next to executable
let dataDir: string
let store: Store

try {
  // Portable directory (next to executable) - ONLY option
  if (app.isPackaged) {
    dataDir = path.join(path.dirname(process.execPath), 'data')
  } else {
    dataDir = path.join(__dirname, '../data')
  }

  // Ensure the data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // Initialize store with the data directory
  store = new Store({
    name: 'bybit-dashboard-config',
    encryptionKey: 'bybit-dashboard-secure-key-2024',
    cwd: dataDir,
  })

  console.log('Portable data directory initialized:', dataDir)
} catch (error) {
  console.error('Failed to initialize data directory:', error)
  // Fallback to local data folder
  dataDir = path.join(__dirname, '../data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  store = new Store({
    name: 'bybit-dashboard-config',
    encryptionKey: 'bybit-dashboard-secure-key-2024',
    cwd: dataDir,
  })
}

let mainWindow: BrowserWindow | null = null

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'default',
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()

    // Open dev tools in development OR if ELECTRON_DEBUG is set
    if (isDev || process.env.ELECTRON_DEBUG) {
      mainWindow?.webContents.openDevTools()
    }
  })

  if (isDev) {
    // Try common Vite dev server ports
    const tryPort = async (port: number): Promise<boolean> => {
      try {
        await mainWindow!.loadURL(`http://localhost:${port}`)
        return true
      } catch {
        return false
      }
    }

    // Try ports in order: 8081, 8080, 5173, 8082, 8083, 8084
    const ports = [8081, 8080, 5173, 8082, 8083, 8084]
    let connected = false

    for (const port of ports) {
      if (await tryPort(port)) {
        connected = true
        console.log(`Connected to Vite dev server on port ${port}`)
        break
      }
    }

    if (!connected) {
      console.error('Could not connect to Vite dev server on any port')
      mainWindow.loadURL('data:text/html,<h1>Vite dev server not found</h1>')
    }
  } else {
    // Production mode - load the built HTML file
    const htmlPath = path.join(__dirname, 'renderer', 'index.html')
    console.log('Loading HTML from:', htmlPath)

    // Check if file exists
    if (fs.existsSync(htmlPath)) {
      mainWindow.loadFile(htmlPath)
    } else {
      console.error('HTML file not found at:', htmlPath)
      // Try alternative path
      const altPath = path.join(__dirname, '../dist/renderer/index.html')
      console.log('Trying alternative path:', altPath)
      if (fs.existsSync(altPath)) {
        mainWindow.loadFile(altPath)
      } else {
        console.error('Alternative HTML file not found at:', altPath)
        mainWindow.loadURL('data:text/html,<h1>Error: Could not load application files</h1>')
      }
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  // Register protocol for serving renderer files
  if (!isDev) {
    protocol.registerBufferProtocol('app', (request, callback) => {
      const url = request.url.substr(6) // Remove 'app://' prefix
      let filePath: string

      // Determine the correct base path for renderer files
      let rendererBasePath: string
      const isPackaged = !process.defaultApp && !process.argv.includes('--no-packed')

      console.log('Environment detection:')
      console.log('- process.defaultApp:', process.defaultApp)
      console.log('- process.execPath:', process.execPath)
      console.log('- process.resourcesPath:', process.resourcesPath)
      console.log('- __dirname:', __dirname)
      console.log('- isPackaged:', isPackaged)

      if (isPackaged) {
        // Production mode - files are in extraFiles renderer directory
        rendererBasePath = path.join(process.resourcesPath, 'renderer')
        console.log('Using packaged path:', rendererBasePath)
      } else {
        // Development mode - files are in dist/renderer relative to current directory
        rendererBasePath = path.join(__dirname, 'renderer')
        console.log('Using development path:', rendererBasePath)
      }

      if (url === 'index.html' || url === '') {
        filePath = path.join(rendererBasePath, 'index.html')
      } else if (url.startsWith('assets/')) {
        filePath = path.join(rendererBasePath, url)
      } else {
        filePath = path.join(rendererBasePath, url)
      }

      console.log('Protocol request:', request.url, '-> File path:', filePath)

      // Read file and serve with proper MIME type
      const fs = require('fs')
      try {
        const data = fs.readFileSync(filePath)
        let mimeType = 'text/html'

        if (filePath.endsWith('.js')) {
          mimeType = 'application/javascript'
        } else if (filePath.endsWith('.css')) {
          mimeType = 'text/css'
        }

        callback({
          mimeType,
          data: data
        })
      } catch (error) {
        console.error('Failed to load file:', filePath, error)
        callback({ error: -6 }) // ERR_FILE_NOT_FOUND
      }
    })
  }

  await createWindow()

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('store-get', (_, key: string) => {
  return store.get(key)
})

ipcMain.handle('store-set', (_, key: string, value: any) => {
  store.set(key, value)
})

ipcMain.handle('store-delete', (_, key: string) => {
  store.delete(key)
})

ipcMain.handle('store-clear', () => {
  store.clear()
})

ipcMain.handle('show-save-dialog', async (_, options) => {
  if (mainWindow) {
    const result = await dialog.showSaveDialog(mainWindow, options)
    return result
  }
  return { canceled: true }
})

ipcMain.handle('show-open-dialog', async (_, options) => {
  if (mainWindow) {
    const result = await dialog.showOpenDialog(mainWindow, options)
    return result
  }
  return { canceled: true }
})

ipcMain.handle('get-user-data-path', () => {
  return dataDir
})


ipcMain.handle('export-user-data', async () => {
  try {
    const configFile = path.join(dataDir, 'bybit-dashboard-config.json')
    if (fs.existsSync(configFile)) {
      const data = fs.readFileSync(configFile, 'utf8')
      return { success: true, data }
    }
    return { success: false, error: 'No user data found' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
})

ipcMain.handle('import-user-data', async (_, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist' }
    }

    const data = fs.readFileSync(filePath, 'utf8')
    const configFile = path.join(dataDir, 'bybit-dashboard-config.json')

    // Backup existing data
    if (fs.existsSync(configFile)) {
      const backupFile = path.join(dataDir, `bybit-dashboard-config.backup.${Date.now()}.json`)
      fs.copyFileSync(configFile, backupFile)
    }

    // Import new data
    fs.writeFileSync(configFile, data, 'utf8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
})


ipcMain.handle('get-app-version', () => {
  return '1.4.8' // Our app version, not Electron version
})

autoUpdater.on('update-available', () => {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'Update available',
    message: 'A new version is available. It will be downloaded in the background.',
    buttons: ['OK']
  })
})

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'Update ready',
    message: 'Update downloaded. The application will restart to apply the update.',
    buttons: ['Restart', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })
})

if (!isDev) {
  Menu.setApplicationMenu(null)
}