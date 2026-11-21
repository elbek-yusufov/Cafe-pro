/**
 * Markazlashgan API konfiguratsiyasi (POS kassa → lokal server).
 *
 * Server manzilini aniqlash tartibi:
 *  1. localStorage `pos_api_url` — kassa sozlamalarida qo'lda o'rnatilgan manzil (qayta build qilmasdan)
 *  2. VITE_API_URL — build vaqtida berilgan manzil
 *  3. Sahifa http(s) orqali ochilgan bo'lsa — o'sha host + VITE_API_PORT (default 4000).
 *     Masalan, boshqa kassa http://192.168.1.10:5173 ni ochsa → API http://192.168.1.10:4000
 *     (o'zining localhost'i emas, serverning LAN manzili).
 *  4. Electron file:// — http://localhost:4000 (server shu kompyuterda bo'lsa)
 */

const API_URL_STORAGE_KEY = 'pos_api_url';
const TOKEN_KEY = 'pos_token';
const REFRESH_TOKEN_KEY = 'pos_refresh_token';
const USER_KEY = 'pos_user';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage bloklangan */
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage bloklangan */
  }
}

const trimSlash = (url: string) => url.replace(/\/+$/, '');

export function getApiBaseUrl(): string {
  const override = safeGet(API_URL_STORAGE_KEY);
  if (override) return trimSlash(override);

  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return trimSlash(fromEnv);

  const port = import.meta.env.VITE_API_PORT || '4000';
  if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol) && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  return `http://localhost:${port}`;
}

/** Kassa sozlamalaridan server manzilini o'zgartirish (bo'sh qiymat — avtomatik aniqlashga qaytish). */
export function setApiBaseUrlOverride(url: string | null): void {
  if (url && url.trim()) safeSet(API_URL_STORAGE_KEY, trimSlash(url.trim()));
  else safeRemove(API_URL_STORAGE_KEY);
}

export function getDeviceId(): string | undefined {
  return import.meta.env.VITE_DEVICE_ID || undefined;
}

// --------------------------------------------------------
// Sessiya (token) saqlash
// --------------------------------------------------------

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: string;
  discountLimit?: number;
  branchId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
}

export function saveSession(tokens: AuthTokens): void {
  safeSet(TOKEN_KEY, tokens.accessToken);
  safeSet(REFRESH_TOKEN_KEY, tokens.refreshToken);
  safeSet(USER_KEY, JSON.stringify(tokens.user));
}

export function clearSession(): void {
  safeRemove(TOKEN_KEY);
  safeRemove(REFRESH_TOKEN_KEY);
  safeRemove(USER_KEY);
}

export function getAccessToken(): string | null {
  return safeGet(TOKEN_KEY);
}

// --------------------------------------------------------
// HTTP so'rov
// --------------------------------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Server bilan umuman aloqa bo'lmaganda (tarmoq xatosi) */
export class NetworkError extends Error {
  constructor(message = 'Lokal server bilan aloqa yo\'q') {
    super(message);
    this.name = 'NetworkError';
  }
}

function extractMessage(body: any, fallback: string): string {
  const msg = body?.message ?? body?.error?.message ?? body?.error;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg) return msg;
  return fallback;
}

export const SESSION_EXPIRED_EVENT = 'pos:session-expired';

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Refresh token bilan yangi access token olish. Muvaffaqiyatsiz bo'lsa sessiya tozalanadi
 * va `pos:session-expired` hodisasi yuboriladi (App PIN ekraniga qaytaradi).
 */
export function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = safeGet(REFRESH_TOKEN_KEY);
    if (!refreshToken) return expire();
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.status === 401) return expire();
      if (!res.ok) return false; // server xatosi — sessiyani saqlab qolamiz
      const json = await res.json();
      saveSession(json.data as AuthTokens);
      return true;
    } catch {
      return false; // tarmoq yo'q — keyinroq qayta urinish
    } finally {
      setTimeout(() => (refreshInFlight = null), 0);
    }
  })();
  return refreshInFlight;
}

function expire(): false {
  clearSession();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  return false;
}

async function doFetch(path: string, init: RequestInit, auth: boolean, timeoutMs: number): Promise<Response> {
  const headers = new Headers(init.headers);
  if (auth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers, signal: controller.signal });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lokal serverga so'rov. Server javobi `{ success, data, timestamp }` ko'rinishida o'raladi —
 * bu funksiya `data` ni qaytaradi. 401 bo'lsa bir marta token yangilab qayta urinadi.
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true, timeoutMs = 10000 } = options;
  const init: RequestInit = {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let res = await doFetch(path, init, auth, timeoutMs);
  if (res.status === 401 && auth && (await refreshSession())) {
    res = await doFetch(path, init, auth, timeoutMs);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* bo'sh javob */
  }

  if (!res.ok) {
    throw new ApiError(extractMessage(json, `Server xatosi (${res.status})`), res.status);
  }

  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}
