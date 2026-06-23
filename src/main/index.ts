import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { ensureDataDirs } from './services/demo-data'
import { registerIpc } from './ipc'
import { initializeRuntime } from './services/runtime'

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL)

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 760,
    title: 'SkillPort',
    show: false,
    backgroundColor: '#f7f9fc',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  const dataDir = join(app.getPath('userData'), 'skillport')
  await ensureDataDirs(dataDir)
  const runtime = await initializeRuntime(dataDir)
  registerIpc(runtime)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
