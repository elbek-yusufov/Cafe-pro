'use client';

import { BarChart3, Download } from 'lucide-react';
import { AdminGuard } from '../../components/admin-guard';
import {
  Banner,
  Bar,
  Card,
  DateRangePicker,
  Empty,
  METHOD_LABELS,
  PageHeader,
  Stat,
  btn,
  downloadCsv,
  dt,
  som,
  useApi,
  useDateRange,
} from '../../components/ui';
import type { Summary } from '../page';

function ReportsView() {
  const range = useDateRange(7);
  const { data: s, error, loading } = useApi<Summary>(`/reports/summary?${range.query}`);

  const exportCsv = () => {
    if (!s) return;
    const from = s.range.from.slice(0, 10);
    const rows: (string | number)[][] = [
      ['Hisobot', `${from} — ${s.range.to.slice(0, 10)}`],
      [],
      ['Ko\'rsatkich', 'Qiymat (so\'m)'],
      ['Tushum', s.revenue],
      ['Buyurtmalar soni', s.ordersCount],
      ['O\'rtacha chek', s.averageCheck],
      ['Chegirmalar', s.discounts],
      ['Xizmat haqi', s.serviceFees],
      ['Qaytarilgan', s.refunds.amount],
      ['Tannarx', s.cost],
      ['Yalpi foyda', s.grossProfit],
      ['Xarajatlar', s.expenses.amount],
      [],
      ['Kun', 'Buyurtmalar', 'Tushum'],
      ...s.daily.map((d) => [d.date, d.orders, d.revenue]),
      [],
      ['Taom', 'Kategoriya', 'Miqdor', 'Tushum', 'Tannarx'],
      ...s.topProducts.map((p) => [p.name, p.category, p.quantity, p.revenue, p.cost]),
      [],
      ['To\'lov turi', 'Soni', 'Summa'],
      ...s.payments.map((p) => [METHOD_LABELS[p.method] || p.method, p.count, p.amount]),
      [],
      ['Kassir', 'Buyurtmalar', 'Tushum'],
      ...s.byCashier.map((c) => [c.name, c.orders, c.revenue]),
    ];
    downloadCsv(`hisobot_${from}.csv`, rows);
  };

  const maxDay = Math.max(0, ...(s?.daily.map((d) => d.revenue) ?? [0]));
  const maxCat = Math.max(0, ...(s?.byCategory.map((c) => c.revenue) ?? [0]));

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        icon={<BarChart3 className="w-6 h-6 text-orange-500" />}
        title="Hisobotlar va moliya"
        subtitle="Barcha summalar serverda to'langan buyurtmalar asosida hisoblanadi"
        actions={
          <button onClick={exportCsv} disabled={!s} className={`${btn.primary} flex items-center gap-2`}>
            <Download className="w-4 h-4" /> CSV (Excel)
          </button>
        }
      />
      <DateRangePicker range={range} />
      {error && <Banner>{error}</Banner>}
      {loading && !s ? (
        <Empty>Yuklanmoqda…</Empty>
      ) : s ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Tushum" value={som(s.revenue)} hint={`${s.ordersCount} ta buyurtma · o'rtacha ${som(s.averageCheck)}`} tone="emerald" />
            <Stat label="Chegirmalar" value={som(s.discounts)} hint={`Xizmat haqi: ${som(s.serviceFees)}`} />
            <Stat label="Qaytarilgan" value={som(s.refunds.amount)} hint={`${s.refunds.count} ta · bekor: ${s.cancelledCount} ta`} tone="rose" />
            <Stat
              label="Yalpi foyda"
              value={som(s.grossProfit)}
              hint={s.costCoverage < 100 ? `Taxminiy: tannarx ${s.costCoverage}% taomlarda kiritilgan` : `Tannarx: ${som(s.cost)}`}
              tone={s.costCoverage < 100 ? 'amber' : 'emerald'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card title="Kunlar bo'yicha tushum" className="lg:col-span-2">
              {s.daily.length === 0 ? (
                <Empty>Tanlangan davrda sotuv yo&apos;q</Empty>
              ) : (
                <ul className="space-y-2">
                  {s.daily.map((d) => (
                    <li key={d.date} className="grid grid-cols-[90px_1fr_150px] items-center gap-3 text-sm">
                      <span className="text-slate-500 font-mono text-xs">{d.date}</span>
                      <Bar value={d.revenue} max={maxDay} />
                      <span className="text-right font-mono font-semibold">
                        {som(d.revenue)} <span className="text-slate-400 font-normal">({d.orders})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Xarajat va sof natija">
              <dl className="text-sm space-y-2">
                {[
                  ['Taomlar savdosi', som(s.subtotal - s.discounts)],
                  ['Tannarx', `− ${som(s.cost)}`],
                  ['Yalpi foyda', som(s.grossProfit)],
                  [`Xarajatlar (${s.expenses.count})`, `− ${som(s.expenses.amount)}`],
                  ['Xarajatdan keyin', som(s.netAfterExpenses)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-mono font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-[11px] text-slate-400 mt-3">Xizmat haqi foydaga kiritilmagan. Xarajatlar — kassa smenalaridagi &quot;xarajat&quot; harakatlari.</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Kategoriyalar">
              {s.byCategory.length === 0 ? (
                <Empty>Ma&apos;lumot yo&apos;q</Empty>
              ) : (
                <ul className="space-y-3">
                  {s.byCategory.map((c) => (
                    <li key={c.categoryId} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-700">
                          {c.name} <span className="text-slate-400 font-normal">· {c.quantity} ta</span>
                        </span>
                        <span className="font-mono">{som(c.revenue)}</span>
                      </div>
                      <Bar value={c.revenue} max={maxCat} color="#0d9488" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="To'lov turlari va kassirlar">
              <table className="w-full text-sm mb-4">
                <tbody className="divide-y divide-slate-100">
                  {s.payments.map((p) => (
                    <tr key={p.method}>
                      <td className="py-1.5">{METHOD_LABELS[p.method] || p.method}</td>
                      <td className="py-1.5 text-slate-400">{p.count} ta</td>
                      <td className="py-1.5 text-right font-mono font-semibold">{som(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {s.byCashier.map((c) => (
                    <tr key={c.cashierId}>
                      <td className="py-1.5">{c.name}</td>
                      <td className="py-1.5 text-slate-400">{c.orders} ta</td>
                      <td className="py-1.5 text-right font-mono font-semibold">{som(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Card title="Taomlar bo'yicha sotuv">
            {s.topProducts.length === 0 ? (
              <Empty>Ma&apos;lumot yo&apos;q</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="text-left py-2">Taom</th>
                    <th className="text-left py-2">Kategoriya</th>
                    <th className="text-right py-2">Miqdor</th>
                    <th className="text-right py-2">Tushum</th>
                    <th className="text-right py-2">Tannarx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {s.topProducts.map((p) => (
                    <tr key={p.menuItemId}>
                      <td className="py-2 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-2 text-slate-500">{p.category}</td>
                      <td className="py-2 text-right font-mono">{p.quantity}</td>
                      <td className="py-2 text-right font-mono font-semibold">{som(p.revenue)}</td>
                      <td className="py-2 text-right font-mono text-slate-500">{som(p.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Kassa smenalari">
            {s.shifts.length === 0 ? (
              <Empty>Tanlangan davrda smena yo&apos;q</Empty>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="text-left py-2">Kassir</th>
                    <th className="text-left py-2">Ochilgan</th>
                    <th className="text-left py-2">Yopilgan</th>
                    <th className="text-right py-2">Boshlang&apos;ich</th>
                    <th className="text-right py-2">Kutilgan</th>
                    <th className="text-right py-2">Haqiqiy</th>
                    <th className="text-right py-2">Farq</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {s.shifts.map((sh) => (
                    <tr key={sh.id}>
                      <td className="py-2">{sh.user.name}</td>
                      <td className="py-2 text-xs">{dt(sh.openedAt)}</td>
                      <td className="py-2 text-xs">{sh.closedAt ? dt(sh.closedAt) : <span className="text-emerald-600 font-semibold">ochiq</span>}</td>
                      <td className="py-2 text-right font-mono">{som(sh.startingCash)}</td>
                      <td className="py-2 text-right font-mono">{sh.closedAt ? som(sh.expectedCash) : '—'}</td>
                      <td className="py-2 text-right font-mono">{sh.closedAt ? som(sh.actualCash) : '—'}</td>
                      <td className={`py-2 text-right font-mono font-semibold ${sh.cashDifference < 0 ? 'text-rose-600' : sh.cashDifference > 0 ? 'text-amber-600' : ''}`}>
                        {sh.closedAt ? som(sh.cashDifference) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AdminGuard>
      <ReportsView />
    </AdminGuard>
  );
}
