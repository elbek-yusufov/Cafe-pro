'use client';

import { useState } from 'react';
import { Receipt, Search } from 'lucide-react';
import { AdminGuard } from '../../components/admin-guard';
import { apiRequest } from '../../lib/api';
import {
  Banner,
  Card,
  DateRangePicker,
  Empty,
  Field,
  METHOD_LABELS,
  Modal,
  PageHeader,
  STATUS_LABELS,
  btn,
  dt,
  som,
  useApi,
  useDateRange,
} from '../../components/ui';

interface OrderRow {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  subtotal: number;
  serviceFee: number;
  discount: number;
  total: number;
  createdAt: string;
  table?: { name: string } | null;
  cashier?: { name: string } | null;
  items: { id: string; name: string; quantity: string | number; unitPrice: number; totalPrice: number; status: string; notes?: string | null }[];
  payments: { id: string; method: string; amount: number; change: number; createdAt: string }[];
  receipts: { id: string; receiptNo: string }[];
}

const PAGE = 50;

function SalesView() {
  const range = useDateRange(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const q = `${range.query}&take=${PAGE}&skip=${skip}${status ? `&status=${status}` : ''}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`;
  const { data, error, loading, reload } = useApi<{ items: OrderRow[]; total: number }>(`/orders?${q}`);

  const [open, setOpen] = useState<OrderRow | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showReceipt = async (o: OrderRow) => {
    setActionError(null);
    try {
      const r = await apiRequest<{ content: string }>(`/receipts/${o.receipts[0].id}`);
      setReceipt(r.content);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const refund = async () => {
    if (!open) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiRequest(`/orders/${open.id}/refund`, { method: 'POST', body: { reason: refundReason.trim() } });
      setNotice(`#${open.orderNumber} qaytarildi`);
      setOpen(null);
      setRefundReason('');
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader icon={<Receipt className="w-6 h-6 text-orange-500" />} title="Sotuvlar va cheklar" subtitle={data ? `${data.total} ta buyurtma` : undefined} />
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <DateRangePicker range={range} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setSkip(0); }} className="input lg:w-48" aria-label="Holat">
          <option value="">Barcha holatlar</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="relative lg:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setSkip(0); }} placeholder="Buyurtma raqami…" className="input pl-9" />
        </div>
      </div>
      {error && <Banner>{error}</Banner>}
      {notice && <Banner kind="success" onClose={() => setNotice(null)}>{notice}</Banner>}

      <Card>
        {loading && !data ? (
          <Empty>Yuklanmoqda…</Empty>
        ) : !data?.items.length ? (
          <Empty>Buyurtma topilmadi</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-xs text-slate-500 uppercase">
                <tr>
                  <th className="text-left py-2">Raqam</th>
                  <th className="text-left py-2">Vaqt</th>
                  <th className="text-left py-2">Stol / tur</th>
                  <th className="text-left py-2">Kassir</th>
                  <th className="text-left py-2">To&apos;lov</th>
                  <th className="text-left py-2">Holat</th>
                  <th className="text-right py-2">Summa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setOpen(o); setReceipt(null); setActionError(null); }}>
                    <td className="py-2 font-mono text-xs">#{o.orderNumber}</td>
                    <td className="py-2 text-xs text-slate-500">{dt(o.createdAt)}</td>
                    <td className="py-2">{o.table?.name || (o.type === 'DELIVERY' ? 'Yetkazish' : 'Olib ketish')}</td>
                    <td className="py-2 text-slate-600">{o.cashier?.name}</td>
                    <td className="py-2 text-xs">{[...new Set(o.payments.map((p) => METHOD_LABELS[p.method] || p.method))].join(' + ') || '—'}</td>
                    <td className="py-2 text-xs">
                      <span className={o.status === 'PAID' ? 'text-emerald-700' : o.status === 'REFUNDED' || o.status === 'CANCELLED' ? 'text-rose-600' : 'text-amber-700'}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono font-semibold">{som(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > PAGE && (
          <div className="flex justify-between items-center pt-4 text-sm">
            <span className="text-slate-500">
              {skip + 1}–{Math.min(skip + PAGE, data.total)} / {data.total}
            </span>
            <div className="flex gap-2">
              <button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE))} className={btn.ghost}>← Oldingi</button>
              <button disabled={skip + PAGE >= data.total} onClick={() => setSkip(skip + PAGE)} className={btn.ghost}>Keyingi →</button>
            </div>
          </div>
        )}
      </Card>

      {open && (
        <Modal title={`Buyurtma #${open.orderNumber}`} onClose={() => setOpen(null)} wide>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <div className="space-y-3">
              <div className="text-slate-500">
                {dt(open.createdAt)} · {open.table?.name || 'Olib ketish'} · {open.cashier?.name} · <b>{STATUS_LABELS[open.status]}</b>
              </div>
              <table className="w-full">
                <tbody className="divide-y divide-slate-100">
                  {open.items.map((i) => (
                    <tr key={i.id} className={i.status === 'CANCELLED' ? 'line-through text-slate-400' : ''}>
                      <td className="py-1.5">{i.name}{i.notes ? <span className="text-xs text-slate-400"> · {i.notes}</span> : null}</td>
                      <td className="py-1.5 text-right font-mono">{Number(i.quantity)} × {som(i.unitPrice)}</td>
                      <td className="py-1.5 text-right font-mono font-semibold">{som(i.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="space-y-1">
                {[
                  ['Oraliq', som(open.subtotal)],
                  ['Chegirma', `− ${som(open.discount)}`],
                  ['Xizmat haqi', som(open.serviceFee)],
                  ['Jami', som(open.total)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className="font-mono font-semibold">{v}</dd></div>
                ))}
              </dl>
              {open.payments.length > 0 && (
                <div className="text-xs text-slate-500">
                  {open.payments.map((p) => `${METHOD_LABELS[p.method] || p.method}: ${som(p.amount)}${p.change ? ` (qaytim ${som(p.change)})` : ''}`).join(' · ')}
                </div>
              )}
            </div>
            <div className="space-y-3">
              {open.receipts.length > 0 && (
                <button onClick={() => showReceipt(open)} className={btn.ghost}>Chekni ko&apos;rish</button>
              )}
              {receipt && <pre className="text-[11px] leading-tight bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto max-h-72">{receipt}</pre>}
              {open.status === 'PAID' && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <Field label="Qaytarish sababi">
                    <input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} maxLength={300} className="input" placeholder="Masalan: mijoz noroziligi" />
                  </Field>
                  <button onClick={refund} disabled={busy || refundReason.trim().length < 3} className={btn.danger}>
                    {busy ? 'Qaytarilmoqda…' : 'To\'lovni qaytarish (refund)'}
                  </button>
                </div>
              )}
              {actionError && <Banner onClose={() => setActionError(null)}>{actionError}</Banner>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function SalesPage() {
  return (
    <AdminGuard>
      <SalesView />
    </AdminGuard>
  );
}
