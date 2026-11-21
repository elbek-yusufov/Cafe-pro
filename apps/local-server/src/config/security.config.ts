/**
 * Markazlashgan xavfsizlik konfiguratsiyasi.
 *
 * - JWT kalitlari hech qachon kodga yozilgan "demo" qiymatga tushib qolmaydi:
 *   o'rnatilmagan yoki zaif bo'lsa server ishga tushmaydi (fail-closed).
 * - CORS faqat ruxsat etilgan originlarga ochiladi.
 */

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_PATTERN = /change[-_]?in[-_]?prod|change[-_]?me|example|placeholder/i;

function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `[config] ${name} o'rnatilmagan yoki juda qisqa (kamida ${MIN_SECRET_LENGTH} belgi). ` +
        `Yaratish: openssl rand -hex 48`,
    );
  }
  if (PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(`[config] ${name} namunaviy (placeholder) qiymatga teng. Haqiqiy tasodifiy kalit o'rnating.`);
  }
  return value;
}

export function getJwtAccessSecret(): string {
  return requireSecret('JWT_ACCESS_SECRET');
}

export function getJwtRefreshSecret(): string {
  const refresh = requireSecret('JWT_REFRESH_SECRET');
  if (refresh === process.env.JWT_ACCESS_SECRET) {
    throw new Error('[config] JWT_REFRESH_SECRET va JWT_ACCESS_SECRET bir xil bo\'lmasligi kerak.');
  }
  return refresh;
}

export function getJwtAccessExpiration(): string {
  return process.env.JWT_ACCESS_EXPIRATION || '15m';
}

export function getJwtRefreshExpiration(): string {
  return process.env.JWT_REFRESH_EXPIRATION || '7d';
}

/** Ishga tushishda barcha majburiy sozlamalarni tekshirish. */
export function assertSecurityConfig(): void {
  getJwtAccessSecret();
  getJwtRefreshSecret();
  if (!process.env.DATABASE_URL) {
    throw new Error('[config] DATABASE_URL o\'rnatilmagan.');
  }
}

// --------------------------------------------------------
// CORS
// --------------------------------------------------------

/** Lokal tarmoq (RFC1918) va loopback manzillari. */
const PRIVATE_LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d{1,5})?$/;

function parseList(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function isOriginAllowed(origin: string | undefined): boolean {
  // Origin sarlavhasiz so'rovlar (curl, server-server, Electron main process) — brauzer CORS emas.
  if (!origin) return true;

  // Electron file:// sahifalari "null" origin yuboradi — faqat aniq ruxsat bilan.
  if (origin === 'null') return process.env.CORS_ALLOW_NULL_ORIGIN === 'true';

  const normalized = origin.replace(/\/$/, '');
  if (parseList(process.env.CORS_ORIGINS).includes(normalized)) return true;

  if (process.env.CORS_ALLOW_PRIVATE_LAN === 'true' && PRIVATE_LAN_ORIGIN.test(normalized)) return true;

  return false;
}

/** Express (enableCors) va Socket.IO uchun umumiy origin tekshiruvchi. */
export function corsOriginCallback(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  callback(null, isOriginAllowed(origin));
}
