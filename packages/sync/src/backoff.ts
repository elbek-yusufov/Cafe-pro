/**
 * Eksponensial qayta urinish (Exponential Backoff with Jitter)
 */
export function getRetryDelay(attempts: number): number {
  const baseDelays = [5000, 15000, 60000, 300000]; // 5s, 15s, 1m, 5m
  const delay = attempts < baseDelays.length ? baseDelays[attempts] : 300000;
  // Jitter qo'shish (tarmoq tiqilinchini oldini olish uchun ±20%)
  const jitter = Math.floor(Math.random() * (delay * 0.2));
  return delay + jitter;
}
