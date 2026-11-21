'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiRequest } from '../lib/api';

/** Admin sahifalari uchun umumiy, ixcham UI bo'laklari (mavjud slate/orange uslubida). */

export const som = (n: number | null | undefined) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(n ?? 0))} so'm`;
export const dt = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });

export function PageHeader({ icon, title, subtitle, actions }: { icon?: React.ReactNode; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          {icon}
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = '', right }: { title?: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {title && (
        <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {right}
        </div>
      )}
      <div className={title ? 'px-5 pb-5' : 'p-5'}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = 'slate' }: { label: string; value: string; hint?: string; tone?: 'slate' | 'emerald' | 'rose' | 'amber' | 'orange' }) {
  const tones: Record<string, string> = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    amber: 'text-amber-700',
    orange: 'text-orange-700',
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-black mt-1.5 ${tones[tone]}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

export function Banner({ kind = 'error', children, onClose }: { kind?: 'error' | 'success' | 'info'; children: React.ReactNode; onClose?: () => void }) {
  const cls =
    kind === 'error'
      ? 'bg-rose-50 border-rose-200 text-rose-700'
      : kind === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-sky-50 border-sky-200 text-sky-800';
  return (
    <div className={`border text-sm font-semibold px-4 py-3 rounded-xl flex justify-between gap-3 ${cls}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Yopish">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-sm text-slate-400">{children}</div>;
}

export function Bar({ value, max, color = '#ea580c' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'} bg-white rounded-2xl shadow-xl p-6 space-y-4 my-8`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Yopish">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export const btn = {
  primary: 'px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition',
  ghost: 'px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50',
  danger: 'px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200 bg-rose-50 rounded-lg hover:bg-rose-100 disabled:opacity-50',
};

/** GET so'rov holati (yuklanmoqda / xato / ma'lumot) + qayta yuklash */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await apiRequest<T>(path));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

/** Sana oralig'i tanlash (bugun / 7 kun / 30 kun / ixtiyoriy) */
export function useDateRange(initialDays = 1) {
  const startOf = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const [from, setFrom] = useState(() => {
    const d = startOf(new Date());
    d.setDate(d.getDate() - (initialDays - 1));
    return d;
  });
  const [to, setTo] = useState(() => {
    const d = startOf(new Date());
    d.setDate(d.getDate() + 1);
    return d;
  });
  const preset = (days: number) => {
    const t = startOf(new Date());
    t.setDate(t.getDate() + 1);
    const f = new Date(t);
    f.setDate(f.getDate() - days);
    setFrom(f);
    setTo(t);
  };
  const query = `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
  return { from, to, setFrom, setTo, preset, query };
}

export function DateRangePicker({ range }: { range: ReturnType<typeof useDateRange> }) {
  const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const end = new Date(range.to);
  end.setDate(end.getDate() - 1);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        [1, 'Bugun'],
        [7, '7 kun'],
        [30, '30 kun'],
      ].map(([d, l]) => (
        <button key={l} onClick={() => range.preset(d as number)} className={btn.ghost}>
          {l}
        </button>
      ))}
      <input
        type="date"
        aria-label="Boshlanish sanasi"
        value={toInput(range.from)}
        onChange={(e) => e.target.value && range.setFrom(new Date(`${e.target.value}T00:00:00`))}
        className="input w-auto"
      />
      <span className="text-slate-400">—</span>
      <input
        type="date"
        aria-label="Tugash sanasi"
        value={toInput(end)}
        onChange={(e) => {
          if (!e.target.value) return;
          const d = new Date(`${e.target.value}T00:00:00`);
          d.setDate(d.getDate() + 1);
          range.setTo(d);
        }}
        className="input w-auto"
      />
    </div>
  );
}

/** Massivni CSV faylga yuklab olish (Excel uchun UTF-8 BOM bilan) */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    // CSV/formula injection'dan himoya: = + - @ bilan boshlanuvchi matnga ' qo'shiladi
    const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
    return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const METHOD_LABELS: Record<string, string> = {
  CASH: 'Naqd',
  CARD: 'Karta',
  CLICK: 'Click',
  PAYME: 'Payme',
  DEBT: 'Nasiya',
};

export const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Ochiq',
  SENT: 'Oshxonada',
  PAID: 'To\'langan',
  CANCELLED: 'Bekor qilingan',
  REFUNDED: 'Qaytarilgan',
};

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Egasi',
  ADMIN: 'Administrator',
  MANAGER: 'Menejer',
  CASHIER: 'Kassir',
  WAITER: 'Ofitsiant',
  KITCHEN: 'Oshxona',
};
