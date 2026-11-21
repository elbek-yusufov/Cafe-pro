'use client';

import { useEffect, useState } from 'react';
import { AdminUser, ApiError, NetworkError, apiRequest, clearSession, getAccessToken, redirectToLogin } from '../lib/api';

/**
 * Admin sahifalarini himoyalash: token bo'lmasa yoki rol ADMIN bo'lmasa — /login.
 * Bu faqat UI darajasi; haqiqiy ruxsat serverda (RolesGuard) tekshiriladi.
 */
/** Admin panelga kira oladigan rollar (har bir endpoint serverda alohida tekshiriladi) */
export const PANEL_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'ok' | 'offline'>('checking');

  useEffect(() => {
    if (!getAccessToken()) {
      redirectToLogin();
      return;
    }
    apiRequest<AdminUser>('/auth/me')
      .then((me) => {
        if (!PANEL_ROLES.includes(me.role)) {
          clearSession();
          redirectToLogin();
          return;
        }
        setState('ok');
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          clearSession();
          redirectToLogin();
        } else if (e instanceof NetworkError) {
          setState('offline');
        } else {
          redirectToLogin();
        }
      });
  }, []);

  if (state === 'checking') {
    return <div className="p-8 text-sm text-slate-500">Tekshirilmoqda…</div>;
  }
  if (state === 'offline') {
    return (
      <div className="p-8">
        <div className="max-w-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold px-4 py-3 rounded-xl">
          Lokal server bilan aloqa yo&apos;q. Server ishga tushganini tekshiring va sahifani yangilang.
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
