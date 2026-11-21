'use client';

import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { AdminGuard } from '../../components/admin-guard';
import { apiRequest } from '../../lib/api';
import { Banner, Card, Empty, Field, PageHeader, btn, useApi } from '../../components/ui';

interface SchemaRow {
  key: string;
  label: string;
  default: string;
}

/** Tanlov ro'yxati bo'lgan sozlamalar (qolganlari — matn/son) */
const CHOICES: Record<string, { value: string; label: string }[]> = {
  RECEIPT_PAPER_WIDTH: [
    { value: '80', label: '80 mm' },
    { value: '58', label: '58 mm' },
  ],
  STOCK_ALLOW_NEGATIVE: [
    { value: 'true', label: 'Ruxsat (sotuv to\'xtamaydi, qoldiq manfiy bo\'lishi mumkin)' },
    { value: 'false', label: 'Taqiqlangan (xomashyo yetmasa to\'lov rad etiladi)' },
  ],
  CURRENCY: [{ value: 'UZS', label: 'UZS — so\'m' }],
};

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Restoran', keys: ['RESTAURANT_NAME', 'RESTAURANT_ADDRESS', 'RESTAURANT_PHONE', 'RESTAURANT_TIN'] },
  { title: 'Hisob-kitob', keys: ['CURRENCY', 'TIMEZONE', 'SERVICE_FEE_PERCENT'] },
  { title: 'Chek', keys: ['RECEIPT_HEADER_NOTE', 'RECEIPT_FOOTER_NOTE', 'RECEIPT_PAPER_WIDTH'] },
  { title: 'Ombor', keys: ['STOCK_ALLOW_NEGATIVE'] },
];

function SettingsView() {
  const schema = useApi<SchemaRow[]>('/settings/schema');
  const values = useApi<Record<string, string>>('/settings');
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (values.data) setForm(values.data);
  }, [values.data]);

  const changed = Object.fromEntries(Object.entries(form).filter(([k, v]) => values.data && values.data[k] !== v));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Object.keys(changed).length) return;
    setSaving(true);
    setError(null);
    try {
      const fresh = await apiRequest<Record<string, string>>('/settings', { method: 'PATCH', body: changed });
      values.setData(fresh);
      setNotice('Sozlamalar saqlandi — kassalar avtomatik yangilanadi');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const labelOf = (k: string) => schema.data?.find((s) => s.key === k)?.label || k;

  return (
    <div className="p-8 space-y-6">
      <PageHeader icon={<Settings className="w-6 h-6 text-orange-500" />} title="Sozlamalar" subtitle="Barcha qiymatlar serverda tekshiriladi" />
      {(schema.error || values.error) && <Banner>{schema.error || values.error}</Banner>}
      {notice && <Banner kind="success" onClose={() => setNotice(null)}>{notice}</Banner>}
      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}
      {!values.data ? (
        <Empty>Yuklanmoqda…</Empty>
      ) : (
        <form onSubmit={save} className="space-y-5 max-w-3xl">
          {GROUPS.map((g) => (
            <Card key={g.title} title={g.title}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {g.keys.map((k) => (
                  <Field key={k} label={labelOf(k)}>
                    {CHOICES[k] ? (
                      <select value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="input">
                        {CHOICES[k].map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={form[k] ?? ''}
                        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                        inputMode={k === 'SERVICE_FEE_PERCENT' || k === 'RESTAURANT_TIN' ? 'numeric' : undefined}
                        className="input"
                      />
                    )}
                  </Field>
                ))}
              </div>
            </Card>
          ))}
          <Card title="Qurilma va sinxronizatsiya">
            <p className="text-sm text-slate-500">
              Printer turi, qog&apos;oz kengligi va avtomatik chop etish har bir kassa qurilmasida (POS → Sozlamalar) saqlanadi. Bulut sinxronizatsiyasi manzili
              va kaliti xavfsizlik uchun faqat serverdagi <code>.env</code> faylida (CLOUD_API_URL, CLOUD_SYNC_API_KEY) sozlanadi.
            </p>
          </Card>
          <div className="flex justify-end gap-2">
            <button type="button" disabled={!Object.keys(changed).length} onClick={() => values.data && setForm(values.data)} className={btn.ghost}>
              Bekor qilish
            </button>
            <button type="submit" disabled={saving || !Object.keys(changed).length} className={btn.primary}>
              {saving ? 'Saqlanmoqda…' : `Saqlash${Object.keys(changed).length ? ` (${Object.keys(changed).length})` : ''}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AdminGuard>
      <SettingsView />
    </AdminGuard>
  );
}
