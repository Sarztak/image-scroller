const { app, BrowserWindow, ipcMain, dialog } = require("electron")

try {
  require('electron-reloader')(module)
} catch { }

function createWindow() {
  const win = new BrowserWindow({
    // width: 2000,
    // height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  win.maximize() // open the app in maximized window
  win.show()
  win.loadFile('index.html')
  win.webContents.openDevTools()
}

app.whenReady().then(() => {
  ipcMain.handle('open-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })
  createWindow()
})

