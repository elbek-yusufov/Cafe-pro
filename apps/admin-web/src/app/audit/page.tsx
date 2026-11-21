'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AdminGuard } from '../../components/admin-guard';
import { Banner, Card, DateRangePicker, Empty, PageHeader, ROLE_LABELS, btn, dt, useApi, useDateRange } from '../../components/ui';

interface AuditRow {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress?: string | null;
  deviceId?: string | null;
  createdAt: string;
  user?: { id: string; name: string; role: string } | null;
}

const ACTIONS = [
  '',
  'PAYMENT_CREATE',
  'PAYMENT_REFUND',
  'CANCEL_ORDER',
  'ORDER_DISCOUNT',
  'ORDER_ITEM_REMOVE',
  'MENU_ITEM_PRICE_CHANGE',
  'MENU_ITEM_CREATE',
  'MENU_ITEM_DELETE',
  'MENU_ITEM_AVAILABILITY',
  'STAFF_CREATE',
  'STAFF_UPDATE',
  'SETTINGS_UPDATE',
  'AUTH_LOGIN_PIN_FAILED',
  'AUTH_LOGIN_PASSWORD_FAILED',
];

const PAGE = 100;

function AuditView() {
  const range = useDateRange(7);
  const [action, setAction] = useState('');
  const [skip, setSkip] = useState(0);
  const { data, error, loading } = useApi<{ items: AuditRow[]; total: number }>(
    `/users/audit?${range.query}&take=${PAGE}&skip=${skip}${action ? `&action=${action}` : ''}`,
  );

  return (
    <div className="p-8 space-y-6">
      <PageHeader icon={<ShieldCheck className="w-6 h-6 text-orange-500" />} title="Audit jurnali" subtitle="Muhim amallar: to'lov, qaytarish, bekor qilish, chegirma, narx, xodim, sozlama" />
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <DateRangePicker range={range} />
        <select value={action} onChange={(e) => { setAction(e.target.value); setSkip(0); }} className="input lg:w-64" aria-label="Amal turi">
          {ACTIONS.map((a) => <option key={a} value={a}>{a || 'Barcha amallar'}</option>)}
        </select>
      </div>
      {error && <Banner>{error}</Banner>}
      <Card>
        {loading && !data ? (
          <Empty>Yuklanmoqda…</Empty>
        ) : !data?.items.length ? (
          <Empty>Yozuv yo&apos;q</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-xs text-slate-500 uppercase">
                <tr>
                  <th className="text-left py-2">Vaqt</th>
                  <th className="text-left py-2">Xodim</th>
                  <th className="text-left py-2">Amal</th>
                  <th className="text-left py-2">Tafsilot</th>
                  <th className="text-left py-2">Qurilma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {data.items.map((a) => (
                  <tr key={a.id}>
                    <td className="py-1.5 text-xs text-slate-500 whitespace-nowrap">{dt(a.createdAt)}</td>
                    <td className="py-1.5">{a.user ? `${a.user.name} (${ROLE_LABELS[a.user.role] || a.user.role})` : '—'}</td>
                    <td className={`py-1.5 font-mono text-xs ${a.action.includes('FAILED') || a.action.includes('REFUND') || a.action.includes('CANCEL') ? 'text-rose-600' : ''}`}>{a.action}</td>
                    <td className="py-1.5 text-xs text-slate-600 max-w-[380px] break-words">{a.details ? JSON.stringify(a.details) : ''}</td>
                    <td className="py-1.5 text-xs font-mono text-slate-400">{a.deviceId || a.ipAddress || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > PAGE && (
          <div className="flex justify-end gap-2 pt-4">
            <button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE))} className={btn.ghost}>← Oldingi</button>
            <button disabled={skip + PAGE >= data.total} onClick={() => setSkip(skip + PAGE)} className={btn.ghost}>Keyingi →</button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function AuditPage() {
  return (
    <AdminGuard>
      <AuditView />
    </AdminGuard>
  );
}
