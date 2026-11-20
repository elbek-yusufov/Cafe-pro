import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('posApi', {
  printReceipt: (receiptText: string) => ipcRenderer.invoke('print-receipt', receiptText),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
});
