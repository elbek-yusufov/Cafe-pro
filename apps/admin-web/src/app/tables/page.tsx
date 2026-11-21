'use client';

import { useEffect, useState } from 'react';
import { Armchair, Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminGuard } from '../../components/admin-guard';
import { apiRequest } from '../../lib/api';
import { createRealtimeSocket } from '../../lib/socket';
import { Banner, Card, Empty, Field, Modal, PageHeader, btn, som, useApi } from '../../components/ui';

interface Hall {
  id: string;
  name: string;
  sortOrder: number;
  tables: { id: string; name: string; capacity: number; status: string }[];
}
interface OpenOrder {
  id: string;
  orderNumber: string;
  tableId?: string | null;
  total: number;
  createdAt: string;
  cashier?: { name: string } | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: 'Bo\'sh', cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  OCCUPIED: { label: 'Band', cls: 'bg-orange-50 border-orange-200 text-orange-800' },
  PAYMENT_PENDING: { label: 'To\'lov kutilmoqda', cls: 'bg-amber-50 border-amber-200 text-amber-800' },
  RESERVED: { label: 'Bron', cls: 'bg-sky-50 border-sky-200 text-sky-800' },
};

type Edit =
  | { kind: 'table'; hallId: string; table?: Hall['tables'][number] }
  | { kind: 'hall'; hall?: Hall }
  | null;

function TablesView() {
  const halls = useApi<Hall[]>('/tables/halls');
  const open = useApi<{ items: OpenOrder[] }>('/orders?isOpenOnly=true&take=200');
  const [edit, setEdit] = useState<Edit>(null);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [hallId, setHallId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reloadAll = () => {
    halls.reload();
    open.reload();
  };

  useEffect(() => {
    const socket = createRealtimeSocket();
    let t: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (t) clearTimeout(t);
      t = setTimeout(reloadAll, 300);
    };
    ['table:status', 'order:created', 'order:updated'].forEach((e) => socket.on(e, schedule));
    return () => {
      if (t) clearTimeout(t);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byTable = new Map((open.data?.items ?? []).filter((o) => o.tableId).map((o) => [o.tableId!, o]));
  const all = (halls.data ?? []).flatMap((h) => h.tables);
  const occupied = all.filter((t) => byTable.has(t.id)).length;

  const startEdit = (e: NonNullable<Edit>) => {
    setEdit(e);
    setError(null);
    if (e.kind === 'table') {
      setName(e.table?.name ?? '');
      setCapacity(e.table?.capacity ?? 4);
      setHallId(e.hallId);
    } else {
      setName(e.hall?.name ?? '');
    }
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!edit) return;
    setBusy(true);
    setError(null);
    try {
      if (edit.kind === 'hall') {
        if (edit.hall) await apiRequest(`/tables/halls/${edit.hall.id}`, { method: 'PATCH', body: { name } });
        else await apiRequest('/tables/halls', { method: 'POST', body: { name, sortOrder: (halls.data?.length ?? 0) + 1 } });
      } else if (edit.table) {
        await apiRequest(`/tables/${edit.table.id}`, { method: 'PATCH', body: { name, capacity: Number(capacity), hallId } });
      } else {
        await apiRequest('/tables', { method: 'POST', body: { name, capacity: Number(capacity), hallId } });
      }
      setEdit(null);
      setNotice('Saqlandi');
      reloadAll();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: Hall['tables'][number]) => {
    if (!confirm(`"${t.name}" stolini o'chirasizmi?`)) return;
    try {
      await apiRequest(`/tables/${t.id}`, { method: 'DELETE' });
      setNotice('Stol o\'chirildi');
      reloadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        icon={<Armchair className="w-6 h-6 text-orange-500" />}
        title="Stollar va zallar"
        subtitle={`${all.length} ta stol · ${occupied} tasi band · real vaqtda yangilanadi`}
        actions={
          <button onClick={() => startEdit({ kind: 'hall' })} className={`${btn.primary} flex items-center gap-2`}>
            <Plus className="w-4 h-4" /> Yangi zal
          </button>
        }
      />
      {(halls.error || open.error) && <Banner>{halls.error || open.error}</Banner>}
      {notice && <Banner kind="success" onClose={() => setNotice(null)}>{notice}</Banner>}
      {error && !edit && <Banner onClose={() => setError(null)}>{error}</Banner>}

      {halls.loading && !halls.data ? (
        <Empty>Yuklanmoqda…</Empty>
      ) : !halls.data?.length ? (
        <Empty>Zallar yo&apos;q — &quot;Yangi zal&quot; tugmasini bosing</Empty>
      ) : (
        halls.data.map((h) => (
          <Card
            key={h.id}
            title={`${h.name} · ${h.tables.length} ta stol`}
            right={
              <div className="flex gap-2">
                <button onClick={() => startEdit({ kind: 'hall', hall: h })} className={`${btn.ghost} !px-2 !py-1 text-xs`}>Nomini o&apos;zgartirish</button>
                <button onClick={() => startEdit({ kind: 'table', hallId: h.id })} className={`${btn.ghost} !px-2 !py-1 text-xs flex items-center gap-1`}><Plus className="w-3.5 h-3.5" /> Stol</button>
              </div>
            }
          >
            {h.tables.length === 0 ? (
              <Empty>Bu zalda stol yo&apos;q</Empty>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {h.tables.map((t) => {
                  const o = byTable.get(t.id);
                  const st = STATUS[o ? 'OCCUPIED' : t.status] ?? STATUS.AVAILABLE;
                  return (
                    <div key={t.id} className={`border rounded-xl p-3 ${st.cls}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-bold">{t.name}</div>
                          <div className="text-xs opacity-80">{t.capacity} kishi · {st.label}</div>
                        </div>
                        <div className="flex gap-0.5">
                          <button aria-label="Tahrirlash" title="Tahrirlash" onClick={() => startEdit({ kind: 'table', hallId: h.id, table: t })} className="p-1 rounded hover:bg-white/60"><Pencil className="w-3.5 h-3.5" /></button>
                          <button aria-label="O'chirish" title="O'chirish" disabled={!!o} onClick={() => remove(t)} className="p-1 rounded hover:bg-white/60 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      {o && (
                        <div className="mt-2 text-xs">
                          <div className="font-mono">#{o.orderNumber}</div>
                          <div className="font-semibold">{som(o.total)}</div>
                          <div className="opacity-70">{o.cashier?.name} · {new Date(o.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))
      )}

      {edit && (
        <Modal title={edit.kind === 'hall' ? (edit.hall ? 'Zalni tahrirlash' : 'Yangi zal') : edit.table ? 'Stolni tahrirlash' : 'Yangi stol'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Nomi *"><input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
            {edit.kind === 'table' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="O'rinlar soni"><input type="number" min={1} max={50} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="input" /></Field>
                <Field label="Zal">
                  <select value={hallId} onChange={(e) => setHallId(e.target.value)} className="input">
                    {(halls.data ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </Field>
              </div>
            )}
            {error && <Banner>{error}</Banner>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEdit(null)} className={btn.ghost}>Bekor qilish</button>
              <button type="submit" disabled={busy} className={btn.primary}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function TablesPage() {
  return (
    <AdminGuard>
      <TablesView />
    </AdminGuard>
  );
}
