/**
 * Rollar ierarxiyasi (yagona manba).
 *
 *   OWNER   ⊇ ADMIN ⊇ MANAGER ⊇ CASHIER
 *   WAITER  — zal (buyurtma, stol)
 *   KITCHEN — faqat oshxona ekrani (KDS)
 *
 * `@Roles(ADMIN)` bilan belgilangan endpointga OWNER ham kiradi; `@Roles(CASHIER)` ga MANAGER ham.
 * Bu yerda ro'yxatdan tashqari rol hech narsaga kira olmaydi.
 */
export type AppRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'KITCHEN';

export const ALL_ROLES: AppRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'];

const INHERITS: Record<AppRole, AppRole[]> = {
  OWNER: ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'],
  ADMIN: ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'],
  MANAGER: ['MANAGER', 'CASHIER', 'WAITER'],
  CASHIER: ['CASHIER'],
  WAITER: ['WAITER'],
  KITCHEN: ['KITCHEN'],
};

/** Foydalanuvchi roli qaysi rollar huquqiga ega */
export function effectiveRoles(role?: string | null): AppRole[] {
  return role && role in INHERITS ? INHERITS[role as AppRole] : [];
}

export function hasRole(role: string | null | undefined, required: string): boolean {
  return effectiveRoles(role).includes(required as AppRole);
}

/** Tizim boshqaruvi (xodimlar, sozlamalar, tannarx) */
export const isAdminLike = (role?: string | null) => hasRole(role, 'ADMIN');
/** Tasdiqlash (bekor qilish, qaytarish, katta chegirma) va moliyaviy ma'lumot */
export const isSupervisor = (role?: string | null) => hasRole(role, 'MANAGER');
