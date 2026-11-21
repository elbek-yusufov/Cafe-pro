/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Lokal server manzili, masalan http://192.168.1.10:4000 (bo'sh bo'lsa avtomatik aniqlanadi) */
  readonly VITE_API_URL?: string;
  /** Lokal server porti (VITE_API_URL berilmaganda ishlatiladi). Default: 4000 */
  readonly VITE_API_PORT?: string;
  /** Ushbu kassa qurilmasining IDsi (devices jadvalidagi id) */
  readonly VITE_DEVICE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Electron preload orqali berilgan API (brauzerda — undefined) */
interface PosDesktopApi {
  isElectron: true;
  config: { apiUrl: string; deviceId: string; printerName: string };
  setApiUrl: (apiUrl: string) => Promise<{ ok: boolean; error?: string }>;
  secureGet: () => string | null;
  secureSet: (value: string | null) => boolean;
  getPrinters: () => Promise<{ name: string; isDefault: boolean }[]>;
  printReceipt: (text: string, paperWidth?: number, deviceName?: string) => Promise<{ success: boolean; error?: string }>;
}

interface Window {
  posApi?: PosDesktopApi;
}
