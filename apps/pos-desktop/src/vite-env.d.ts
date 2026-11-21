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
