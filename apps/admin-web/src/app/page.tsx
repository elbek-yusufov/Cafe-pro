'use client';

import { useEffect } from 'react';
import { LayoutDashboard, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { AdminGuard } from '../components/admin-guard';
import { Banner, Bar, Card, Empty, METHOD_LABELS, PageHeader, STATUS_LABELS, Stat, btn, dt, som, useApi } from '../components/ui';
import { createRealtimeSocket } from '../lib/socket';

export interface Summary {
  range: { from: string; to: string };
  revenue: number;
  ordersCount: number;
  averageCheck: number;
  subtotal: number;
  discounts: number;
  serviceFees: number;
  refunds: { count: number; amount: number };
  cancelledCount: number;
  payments: { method: string; amount: number; count: number }[];
  topProducts: { menuItemId: string; name: string; category: string; quantity: number; revenue: number; cost: number }[];
  byCategory: { categoryId: string; name: string; quantity: number; revenue: number }[];
  byCashier: { cashierId: string; name: string; orders: number; revenue: number }[];
  daily: { date: string; revenue: number; orders: number }[];
  hourly: { hour: number; revenue: number; orders: number }[];
  cost: number;
  costCoverage: number;
  grossProfit: number;
  expenses: { count: number; amount: number };
  netAfterExpenses: number;
  lowStock: { id: string; name: string; currentQty: number; minQty: number; unit: string }[];
  activeTables: { count: number; openTotal: number };
  recentOrders: { id: string; orderNumber: string; status: string; type: string; total: number; createdAt: string; table?: { name: string } | null; cashier?: { name: string } | null }[];
  shifts: { id: string; openedAt: string; closedAt: string | null; startingCash: number; expectedCash: number; actualCash: number; cashDifference: number; totalSales: number; user: { name: string } }[];
}

function todayQuery() {
  const f = new Date();
  f.setHours(0, 0, 0, 0);
  const t = new Date(f);
  t.setDate(t.getDate() + 1);
  return `from=${encodeURIComponent(f.toISOString())}&to=${encodeURIComponent(t.toISOString())}`;
}

function DashboardView() {
  const { data: s, error, loading, reload } = useApi<Summary>(`/reports/summary?${todayQuery()}`);

  // Yangi buyurtma / to'lov bo'lganda real-vaqtda yangilash
  useEffect(() => {
    const socket = createRealtimeSocket();
    let t: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (t) clearTimeout(t);
      t = setTimeout(reload, 500);
    };
    socket.on('order:created', schedule);
    socket.on('order:updated', schedule);
    socket.on('stock:low', schedule);
    return () => {
      if (t) clearTimeout(t);
      socket.disconnect();
    };
  }, [reload]);

  const maxHour = Math.max(0, ...(s?.hourly.map((h) => h.revenue) ?? [0]));
  const maxProduct = Math.max(0, ...(s?.topProducts.map((p) => p.revenue) ?? [0]));
  const payTotal = s?.payments.reduce((a, p) => a + p.amount, 0) ?? 0;

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        icon={<LayoutDashboard className="w-6 h-6 text-orange-500" />}
        title="Bosh sahifa"
        subtitle={`Bugungi ko'rsatkichlar · ${new Date().toLocaleDateString('uz-UZ', { dateStyle: 'long' })}`}
        actions={
          <button onClick={reload} className={`${btn.ghost} flex items-center gap-2`}>
            <RefreshCw className="w-4 h-4" /> Yangilash
          </button>
        }
      />
      {error && <Banner>{error}</Banner>}
      {loading && !s ? (
        <Empty>Yuklanmoqda…</Empty>
      ) : s ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Bugungi tushum" value={som(s.revenue)} hint={`${s.ordersCount} ta to'langan buyurtma`} tone="emerald" />
            <Stat label="O'rtacha chek" value={som(s.averageCheck)} hint={`Chegirmalar: ${som(s.discounts)}`} />
            <Stat label="Band stollar" value={`${s.activeTables.count} ta`} hint={`Ochiq hisob: ${som(s.activeTables.openTotal)}`} tone="orange" />
            <Stat
              label="Ombor ogohlantirishi"
              value={`${s.lowStock.length} ta`}
              hint={s.lowStock.slice(0, 2).map((l) => l.name).join(', ') || 'Hammasi yetarli'}
              tone={s.lowStock.length ? 'amber' : 'slate'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card title="Soatlar bo'yicha tushum" className="lg:col-span-2">
              {s.ordersCount === 0 ? (
                <Empty>Bugun hali to&apos;langan buyurtma yo&apos;q</Empty>
              ) : (
                <div className="flex items-end gap-1 h-40" role="img" aria-label="Soatlik tushum diagrammasi">
                  {s.hourly.map((h) => (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group" title={`${h.hour}:00 — ${som(h.revenue)} (${h.orders} ta)`}>
                      <div
                        className="w-full rounded-t bg-orange-500/80 group-hover:bg-orange-600"
                        style={{ height: `${maxHour ? Math.max(h.revenue ? 4 : 0, (h.revenue / maxHour) * 130) : 0}px` }}
                      />
                      <span className="text-[9px] text-slate-400">{h.hour % 3 === 0 ? h.hour : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="To'lov turlari">
              {s.payments.length === 0 ? (
                <Empty>To&apos;lovlar yo&apos;q</Empty>
              ) : (
                <ul className="space-y-3">
                  {s.payments.map((p) => (
                    <li key={p.method} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-700">
                          {METHOD_LABELS[p.method] || p.method} <span className="text-slate-400 font-normal">· {p.count} ta</span>
                        </span>
                        <span className="font-mono font-semibold">{som(p.amount)}</span>
                      </div>
                      <Bar value={p.amount} max={payTotal} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card title="Eng ko'p sotilgan taomlar" className="lg:col-span-2">
              {s.topProducts.length === 0 ? (
                <Empty>Ma&apos;lumot yo&apos;q</Empty>
              ) : (
                <ul className="space-y-3">
                  {s.topProducts.slice(0, 7).map((p) => (
                    <li key={p.menuItemId} className="space-y-1">
                      <div className="flex justify-between text-sm gap-3">
                        <span className="font-semibold text-slate-800 truncate">
                          {p.name} <span className="text-slate-400 font-normal">· {p.quantity} ta</span>
                        </span>
                        <span className="font-mono font-semibold shrink-0">{som(p.revenue)}</span>
                      </div>
                      <Bar value={p.revenue} max={maxProduct} color="#0d9488" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Kassirlar">
              {s.byCashier.length === 0 ? (
                <Empty>Ma&apos;lumot yo&apos;q</Empty>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {s.byCashier.map((c) => (
                    <li key={c.cashierId} className="py-2 flex justify-between">
                      <span>
                        {c.name} <span className="text-slate-400">· {c.orders} ta</span>
                      </span>
                      <span className="font-mono font-semibold">{som(c.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {(s.refunds.count > 0 || s.cancelledCount > 0) && (
                <p className="text-xs text-rose-600 mt-3">
                  Qaytarilgan: {s.refunds.count} ta ({som(s.refunds.amount)}) · Bekor qilingan: {s.cancelledCount} ta
                </p>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card
              title="So'nggi buyurtmalar"
              className="lg:col-span-2"
              right={
                <Link href="/sales" className="text-xs font-semibold text-orange-600 hover:underline">
                  Barchasi →
                </Link>
              }
            >
              {s.recentOrders.length === 0 ? (
                <Empty>Bugun buyurtma yo&apos;q</Empty>
              ) : (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {s.recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="py-2 font-mono text-xs text-slate-600">#{o.orderNumber}</td>
                        <td className="py-2">{o.table?.name || (o.type === 'DINE_IN' ? '—' : 'Olib ketish')}</td>
                        <td className="py-2 text-slate-500">{o.cashier?.name}</td>
                        <td className="py-2 text-xs text-slate-500">{dt(o.createdAt)}</td>
                        <td className="py-2 text-xs">{STATUS_LABELS[o.status] || o.status}</td>
                        <td className="py-2 text-right font-mono font-semibold">{som(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card
              title="Kam qolgan xomashyo"
              right={
                <Link href="/stock" className="text-xs font-semibold text-orange-600 hover:underline">
                  Ombor →
                </Link>
              }
            >
              {s.lowStock.length === 0 ? (
                <Empty>Barcha xomashyo yetarli</Empty>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {s.lowStock.map((l) => (
                    <li key={l.id} className="py-2 flex justify-between gap-2">
                      <span className="text-slate-800">{l.name}</span>
                      <span className="font-mono text-amber-700">
                        {l.currentQty} / {l.minQty} {l.unit.toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AdminGuard>
      <DashboardView />
    </AdminGuard>
  );
}
