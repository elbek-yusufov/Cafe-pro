import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    fullscreen: false, // haqiqiy POS terminalda true qo'yiladi
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devUrl = 'http://localhost:5173';
  const prodUrl = `file://${path.join(__dirname, '../dist/index.html')}`;

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadURL(prodUrl);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ESC/POS to'g'ridan-to'g'ri printerga chop etish IPC hodisasi
ipcMain.handle('print-receipt', async (_, receiptText: string) => {
  console.log('Chop etilayotgan chek:', receiptText);
  return { success: true };
});
