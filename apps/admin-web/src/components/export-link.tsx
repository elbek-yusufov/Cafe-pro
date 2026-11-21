'use client';

import { useState } from 'react';
import { ApiError, apiDownload, redirectToLogin } from '../lib/api';

/**
 * Autentifikatsiyali eksport tugmasi. Oddiy <a href> Bearer tokenni yubormaydi,
 * shuning uchun fayl fetch orqali yuklab olinadi. Tashqi ko'rinish chaqiruvchi className orqali saqlanadi.
 */
export function ExportLink({
  path,
  filename,
  className,
  children,
}: {
  path: string;
  filename: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      await apiDownload(path, filename);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) redirectToLogin();
      else alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={busy} className={className} aria-busy={busy}>
      {children}
    </button>
  );
}
