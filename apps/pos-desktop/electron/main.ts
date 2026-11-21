import { app, BrowserWindow, ipcMain, net, protocol, safeStorage, shell, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

/**
 * OshxonaPOS kassa — Electron (Windows) ilovasi.
 *
 * - UI `oshxona://pos/` maxsus sxemasi orqali yuklanadi (file:// emas) — lokal server CORS ro'yxatiga
 *   `oshxona://pos` qo'shiladi, "null" origin ochilmaydi.
 * - Server manzili va qurilma IDsi: %APPDATA%/OshxonaPOS Kassa/pos-config.json (o'rnatishdan keyin tahrirlanadi).
 * - Refresh token Windows DPAPI (safeStorage) bilan shifrlanib saqlanadi.
 * - Chek: tizimdagi printer drayveri orqali jim (silent) chop etish. To'g'ridan-to'g'ri ESC/POS (USB/LAN raw) — keyingi bosqich.
 */

const SCHEME = 'oshxona';
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

interface PosConfig {
  apiUrl: string; // masalan http://192.168.1.10:4000
  deviceId: string; // devices jadvalidagi id
  fullscreen: boolean; // kassa terminalida kiosk rejim
  printerName?: string; // bo'sh — tizimning standart printeri
}

const DEFAULT_CONFIG: PosConfig = { apiUrl: 'http://localhost:4000', deviceId: 'kassa-pos-01', fullscreen: false };

const configPath = () => path.join(app.getPath('userData'), 'pos-config.json');
const tokenPath = () => path.join(app.getPath('userData'), 'session.bin');

function loadConfig(): PosConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    const cfg = { ...DEFAULT_CONFIG, ...raw };
    // Faqat http(s) manzil — boshqa sxemalar qabul qilinmaydi
    if (!/^https?:\/\/[^\s/]+(:\d+)?\/?$/.test(cfg.apiUrl)) cfg.apiUrl = DEFAULT_CONFIG.apiUrl;
    return cfg;
  } catch {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }
}

let config: PosConfig = DEFAULT_CONFIG;
let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged && process.env.POS_ELECTRON_DEV === '1';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    fullscreen: config.fullscreen,
    kiosk: config.fullscreen,
    autoHideMenuBar: true,
    backgroundColor: '#f3f6f8',
    title: 'OshxonaPOS Kassa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
    },
  });
  mainWindow.removeMenu();

  // Tashqi havolalar ilova ichida ochilmaydi
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const allowed = isDev ? url.startsWith('http://localhost:5173') : url.startsWith(`${SCHEME}://pos/`);
    if (!allowed) e.preventDefault();
  });

  mainWindow.loadURL(isDev ? 'http://localhost:5173' : `${SCHEME}://pos/index.html`);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Bitta nusxa — ikkinchi marta ochilsa mavjud oyna oldinga chiqadi
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    config = loadConfig();

    // dist/ ichidagi fayllarni oshxona://pos/... orqali berish (yo'l dist dan chiqmasligi tekshiriladi)
    const distDir = path.join(__dirname, '..', 'dist');
    protocol.handle(SCHEME, (request) => {
      const { pathname } = new URL(request.url);
      const rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
      const target = path.normalize(path.join(distDir, rel));
      if (!target.startsWith(distDir)) return new Response('Forbidden', { status: 403 });
      const file = fs.existsSync(target) ? target : path.join(distDir, 'index.html');
      return net.fetch(pathToFileURL(file).toString());
    });

    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ------------------------------------------------------------------ IPC

ipcMain.on('pos:get-config', (e) => {
  e.returnValue = { apiUrl: config.apiUrl, deviceId: config.deviceId, printerName: config.printerName ?? '' };
});

ipcMain.handle('pos:set-api-url', (_e, apiUrl: string) => {
  if (typeof apiUrl !== 'string' || !/^https?:\/\/[^\s/]+(:\d+)?\/?$/.test(apiUrl)) {
    return { ok: false, error: 'Manzil http://IP:port ko\'rinishida bo\'lishi kerak' };
  }
  config = { ...config, apiUrl: apiUrl.replace(/\/+$/, '') };
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
  return { ok: true };
});

// Refresh token — OS darajasida shifrlangan (Windows: DPAPI)
ipcMain.on('pos:secure-get', (e) => {
  try {
    if (!safeStorage.isEncryptionAvailable() || !fs.existsSync(tokenPath())) {
      e.returnValue = null;
      return;
    }
    e.returnValue = safeStorage.decryptString(fs.readFileSync(tokenPath()));
  } catch {
    e.returnValue = null;
  }
});
ipcMain.on('pos:secure-set', (e, value: string | null) => {
  try {
    if (value === null) {
      if (fs.existsSync(tokenPath())) fs.unlinkSync(tokenPath());
    } else if (safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(tokenPath(), safeStorage.encryptString(String(value)));
    }
    e.returnValue = true;
  } catch {
    e.returnValue = false;
  }
});

ipcMain.handle('pos:get-printers', async () => {
  if (!mainWindow) return [];
  const printers = await mainWindow.webContents.getPrintersAsync();
  return printers.map((p) => ({ name: p.name, isDefault: p.isDefault }));
});

/** Chek matnini printer drayveri orqali jim chop etish (58/80 mm) */
ipcMain.handle('pos:print-receipt', async (_e, payload: { text: string; paperWidth?: number; deviceName?: string }) => {
  const text = typeof payload?.text === 'string' ? payload.text.slice(0, 20000) : '';
  if (!text) return { success: false, error: 'Chek matni bo\'sh' };
  const width = payload.paperWidth === 58 ? 58 : 80;
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  const html = `<!doctype html><meta charset="utf-8"><style>@page{size:${width}mm auto;margin:2mm}body{margin:0}pre{font:${width === 58 ? 10 : 12}px/1.25 'Courier New',monospace;white-space:pre-wrap;margin:0}</style><pre>${esc(text)}</pre>`;
  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const deviceName = payload.deviceName || config.printerName || undefined;
    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      win.webContents.print(
        { silent: true, printBackground: false, deviceName, margins: { marginType: 'none' } },
        (success, failureReason) => resolve({ success, error: success ? undefined : failureReason }),
      );
    });
    return result;
  } catch (err) {
    return { success: false, error: (err as Error).message };
  } finally {
    win.destroy();
  }
});

process.on('uncaughtException', (err) => {
  dialog.showErrorBox('OshxonaPOS xatosi', err.message);
});
