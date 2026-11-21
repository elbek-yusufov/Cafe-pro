'use client';

/**
 * Markazlashgan API konfiguratsiyasi (Admin Web / KDS / QR menyu → lokal server).
 *
 * Manzil aniqlash tartibi:
 *  1. NEXT_PUBLIC_API_URL (build vaqtida kiritiladi)
 *  2. Brauzerda: sahifa ochilgan host + NEXT_PUBLIC_API_PORT (default 4000).
 *     Masalan, KDS planshet http://192.168.1.10:3000/kds ni ochsa → API http://192.168.1.10:4000
 *     (planshetning o'z localhost'i emas).
 *  3. Aks holda http://localhost:4000
 */

const TOKEN_KEY = 'admin_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';
const USER_KEY = 'admin_user';

const trimSlash = (url: string) => url.replace(/\/+$/, '');

export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv) return trimSlash(fromEnv);

  const port = process.env.NEXT_PUBLIC_API_PORT || '4000';
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  return `http://localhost:${port}`;
}

// --------------------------------------------------------
// Sessiya
// --------------------------------------------------------

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AdminUser;
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function saveSession(tokens: AuthTokens): void {
  const s = storage();
  if (!s) return;
  s.setItem(TOKEN_KEY, tokens.accessToken);
  s.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  s.setItem(USER_KEY, JSON.stringify(tokens.user));
}

export function clearSession(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(TOKEN_KEY);
  s.removeItem(REFRESH_TOKEN_KEY);
  s.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function getSessionUser(): AdminUser | null {
  const raw = storage()?.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

// --------------------------------------------------------
// HTTP
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

export class NetworkError extends Error {
  constructor(message = 'Lokal server bilan aloqa yo\'q') {
    super(message);
    this.name = 'NetworkError';
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = storage()?.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const json = await res.json();
        saveSession(json.data as AuthTokens);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshInFlight = null), 0);
      }
    })();
  }
  return refreshInFlight;
}

async function rawRequest(path: string, init: RequestInit, auth: boolean): Promise<Response> {
  const headers = new Headers(init.headers);
  if (auth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  try {
    return await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
  } catch {
    throw new NetworkError();
  }
}

/**
 * Lokal serverga so'rov. Javob `{ success, data }` ko'rinishida — `data` qaytariladi.
 * 401 bo'lsa refresh token bilan bir marta qayta urinadi.
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const init: RequestInit = {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let res = await rawRequest(path, init, auth);
  if (res.status === 401 && auth && (await tryRefresh())) {
    res = await rawRequest(path, init, auth);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* bo'sh javob */
  }

  if (!res.ok) {
    const msg = json?.message;
    throw new ApiError(
      Array.isArray(msg) ? msg.join(', ') : typeof msg === 'string' && msg ? msg : `Server xatosi (${res.status})`,
      res.status,
    );
  }

  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

/** Autentifikatsiyali fayl yuklab olish (masalan, Excel hisobot eksporti). */
export async function apiDownload(path: string, fallbackFilename: string): Promise<void> {
  let res = await rawRequest(path, { method: 'GET' }, true);
  if (res.status === 401 && (await tryRefresh())) {
    res = await rawRequest(path, { method: 'GET' }, true);
  }
  if (!res.ok) {
    throw new ApiError(res.status === 401 || res.status === 403 ? 'Ruxsat yo\'q — admin sifatida kiring' : `Yuklab bo'lmadi (${res.status})`, res.status);
  }
  const disposition = res.headers.get('content-disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = match?.[1] || fallbackFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Server nisbiy yo'lini (/uploads/...) to'liq URL ga aylantirish. */
export function resolveAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith('/') ? `${getApiBaseUrl()}${url}` : url;
}

/** Rasm yuklash (multipart). Natija: { url: '/uploads/menu/…' } */
export async function apiUpload(path: string, file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  let res = await rawRequest(path, { method: 'POST', body: form }, true);
  if (res.status === 401 && (await tryRefresh())) {
    res = await rawRequest(path, { method: 'POST', body: form }, true);
  }
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* bo'sh */
  }
  if (!res.ok) {
    const msg = res.status === 413 ? 'Rasm hajmi 2 MB dan oshmasligi kerak' : json?.message;
    throw new ApiError(typeof msg === 'string' && msg ? msg : `Yuklab bo'lmadi (${res.status})`, res.status);
  }
  return json.data;
}

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?next=${next}`;
}
