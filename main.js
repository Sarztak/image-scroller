const { app, BrowserWindow, ipcMain, dialog } = require("electron")


function createWindow() {
  const win = new BrowserWindow({
    width: 2000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  win.loadFile('index.html')
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

