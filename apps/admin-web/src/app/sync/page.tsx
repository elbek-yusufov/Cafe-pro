'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Server, Cloud, AlertTriangle } from 'lucide-react';
import { AdminGuard } from '../../components/admin-guard';
import { apiRequest, getApiBaseUrl } from '../../lib/api';
import { createRealtimeSocket } from '../../lib/socket';
import { Banner, Card, Empty, PageHeader, Stat, btn, dt, useApi } from '../../components/ui';

interface SyncStatus {
  state: 'ONLINE' | 'SYNCING' | 'OFFLINE';
  isOnline: boolean;
  cloudConfigured?: boolean;
  pendingCount: number;
  failedCount?: number;
  lastSyncedAt?: string | null;
  lastError?: string | null;
}
interface QueueRow {
  id: string;
  entity: string;
  entityId: string;
  operation: string;
  status: string;
  attempts: number;
  lastError?: string | null;
  createdAt: string;
}

function SyncView() {
  const status = useApi<SyncStatus>('/sync/status');
  const queue = useApi<QueueRow[]>('/sync/queue');
  const health = useApi<{ status: string; database: string; uptime: number }>('/health');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = createRealtimeSocket();
    socket.on('sync:status', (s: SyncStatus) => status.setData(s));
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trigger = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/sync/trigger', { method: 'POST' });
      status.reload();
      queue.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const s = status.data;
  const stateLabel = !s ? '…' : !s.cloudConfigured ? 'Faqat lokal (LAN)' : s.state === 'ONLINE' ? 'Sinxron' : s.state === 'SYNCING' ? 'Sinxronlanmoqda' : 'Bulut bilan aloqa yo\'q';

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        icon={<RefreshCw className="w-6 h-6 text-orange-500" />}
        title="Sinxronizatsiya va tarmoq"
        subtitle="Kassalar lokal server orqali LAN da ishlaydi; bulut — ixtiyoriy zaxira/markaz"
        actions={
          <button onClick={trigger} disabled={busy || !s?.cloudConfigured} className={`${btn.primary} flex items-center gap-2`}>
            <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> Hozir sinxronlash
          </button>
        }
      />
      {(status.error || health.error) && <Banner>{status.error || health.error}</Banner>}
      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat
          label="Lokal server (LAN)"
          value={health.data?.status === 'ok' ? 'Ishlayapti' : health.data ? 'Muammo' : '…'}
          hint={`${getApiBaseUrl()} · baza: ${health.data?.database ?? '—'}`}
          tone={health.data?.status === 'ok' ? 'emerald' : 'rose'}
        />
        <Stat
          label="Bulut sinxronizatsiyasi"
          value={stateLabel}
          hint={s?.lastSyncedAt ? `Oxirgi: ${dt(s.lastSyncedAt)}` : s?.cloudConfigured ? 'Hali sinxronlanmagan' : '.env: CLOUD_API_URL va CLOUD_SYNC_API_KEY'}
          tone={!s?.cloudConfigured ? 'slate' : s.state === 'OFFLINE' ? 'amber' : 'emerald'}
        />
        <Stat
          label="Navbatdagi yozuvlar"
          value={`${s?.pendingCount ?? 0} ta`}
          hint={`Xatolik bilan: ${s?.failedCount ?? 0} ta · hech biri o'chirilmaydi`}
          tone={(s?.failedCount ?? 0) > 0 ? 'rose' : 'slate'}
        />
      </div>

      {s?.lastError && (
        <Banner>
          <span className="inline-flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Oxirgi xato: {s.lastError}</span>
        </Banner>
      )}

      <Card title="Qanday ishlaydi">
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li className="flex-none"><Server className="w-4 h-4 inline mr-1 text-slate-400" />Barcha buyurtma, to&apos;lov va ombor harakatlari avval <b>lokal serverdagi PostgreSQL</b> ga yoziladi — internet shart emas.</li>
          <li><Cloud className="w-4 h-4 inline mr-1 text-slate-400" />Har bir o&apos;zgarish &quot;outbox&quot; navbatiga tushadi va bulut sozlangan bo&apos;lsa, qayta urinish bilan yuboriladi; takroriy yuborish ID bo&apos;yicha birlashtiriladi.</li>
          <li>Kassa (POS) lokal serverga LAN orqali ulanadi. Lokal server o&apos;chsa — POS yangi buyurtma qabul qilmaydi va bu haqda ogohlantiradi.</li>
        </ul>
      </Card>

      <Card title="Navbat (oxirgi 50 ta)">
        {!queue.data?.length ? (
          <Empty>Navbat bo&apos;sh</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left py-2">Vaqt</th>
                <th className="text-left py-2">Obyekt</th>
                <th className="text-left py-2">Amal</th>
                <th className="text-left py-2">Holat</th>
                <th className="text-right py-2">Urinish</th>
                <th className="text-left py-2">Xato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.data.map((q) => (
                <tr key={q.id}>
                  <td className="py-1.5 text-xs text-slate-500">{dt(q.createdAt)}</td>
                  <td className="py-1.5 font-mono text-xs">{q.entity}</td>
                  <td className="py-1.5 text-xs">{q.operation}</td>
                  <td className={`py-1.5 text-xs ${q.status === 'FAILED' ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>{q.status}</td>
                  <td className="py-1.5 text-right">{q.attempts}</td>
                  <td className="py-1.5 text-xs text-rose-600 truncate max-w-[220px]">{q.lastError || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export default function SyncPage() {
  return (
    <AdminGuard>
      <SyncView />
    </AdminGuard>
  );
}
