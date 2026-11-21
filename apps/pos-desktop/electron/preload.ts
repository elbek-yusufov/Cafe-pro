import { contextBridge, ipcRenderer } from 'electron';

/**
 * Renderer (React) uchun xavfsiz, cheklangan API. Node.js obyektlari to'g'ridan-to'g'ri berilmaydi.
 */
const config = ipcRenderer.sendSync('pos:get-config') as { apiUrl: string; deviceId: string; printerName: string };

contextBridge.exposeInMainWorld('posApi', {
  isElectron: true,
  config,
  setApiUrl: (apiUrl: string) => ipcRenderer.invoke('pos:set-api-url', apiUrl),
  secureGet: (): string | null => ipcRenderer.sendSync('pos:secure-get'),
  secureSet: (value: string | null): boolean => ipcRenderer.sendSync('pos:secure-set', value),
  getPrinters: () => ipcRenderer.invoke('pos:get-printers'),
  printReceipt: (text: string, paperWidth?: number, deviceName?: string) =>
    ipcRenderer.invoke('pos:print-receipt', { text, paperWidth, deviceName }),
});
