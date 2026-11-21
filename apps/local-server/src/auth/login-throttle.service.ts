import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface AttemptState {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
}

/**
 * PIN kodga brute-force hujumidan himoya (4 xonali PIN = atigi 10 000 kombinatsiya).
 *
 * Har bir foydalanuvchi uchun WINDOW_MS ichida MAX_FAILURES marta xato kiritilsa,
 * hisob LOCK_MS muddatga vaqtincha bloklanadi. Holat xotirada saqlanadi
 * (lokal server bitta jarayon sifatida ishlaydi).
 */
@Injectable()
export class LoginThrottleService {
  static readonly MAX_FAILURES = 5;
  static readonly WINDOW_MS = 15 * 60 * 1000;
  static readonly LOCK_MS = 5 * 60 * 1000;

  private readonly attempts = new Map<string, AttemptState>();

  assertNotLocked(key: string): void {
    const state = this.attempts.get(key);
    if (!state) return;

    const now = Date.now();
    if (state.lockedUntil > now) {
      const seconds = Math.ceil((state.lockedUntil - now) / 1000);
      throw new HttpException(
        `Juda ko'p noto'g'ri urinish. ${seconds} soniyadan keyin qayta urinib ko'ring.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** @returns true agar shu xatodan keyin hisob bloklangan bo'lsa */
  registerFailure(key: string): boolean {
    const now = Date.now();
    let state = this.attempts.get(key);

    if (!state || now - state.firstFailureAt > LoginThrottleService.WINDOW_MS) {
      state = { failures: 0, firstFailureAt: now, lockedUntil: 0 };
    }

    state.failures += 1;
    if (state.failures >= LoginThrottleService.MAX_FAILURES) {
      state.lockedUntil = now + LoginThrottleService.LOCK_MS;
      state.failures = 0;
      state.firstFailureAt = now;
      this.attempts.set(key, state);
      return true;
    }

    this.attempts.set(key, state);
    return false;
  }

  registerSuccess(key: string): void {
    this.attempts.delete(key);
  }
}
