'use client';

import { useState } from 'react';
import { Users, Plus, Pencil, History } from 'lucide-react';
import { AdminGuard } from '../../components/admin-guard';
import { apiRequest } from '../../lib/api';
import { Banner, Card, Empty, Field, Modal, PageHeader, ROLE_LABELS, btn, dt, useApi } from '../../components/ui';

interface StaffRow {
  id: string;
  name: string;
  username: string;
  role: string;
  discountLimit: number;
  isActive: boolean;
  hasPassword: boolean;
  createdAt: string;
}

interface LoginRow {
  id: string;
  action: string;
  ipAddress?: string | null;
  deviceId?: string | null;
  createdAt: string;
  user?: { name: string } | null;
  details?: { username?: string; userIdentifier?: string; reason?: string; locked?: boolean } | null;
}

const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'];
const NEEDS_PASSWORD = ['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN'];

interface FormState {
  name: string;
  username: string;
  role: string;
  pin: string;
  password: string;
  discountLimit: number;
  isActive: boolean;
}

function StaffView() {
  const { data, error, loading, reload } = useApi<StaffRow[]>('/users');
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: '', username: '', role: 'CASHIER', pin: '', password: '', discountLimit: 10, isActive: true });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<StaffRow | null>(null);
  const history = useApi<LoginRow[]>(historyFor ? `/users/logins?userId=${historyFor.id}&take=50` : '/users/logins?take=50');
  const [showAllLogins, setShowAllLogins] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', username: '', role: 'CASHIER', pin: '', password: '', discountLimit: 10, isActive: true });
    setFormError(null);
    setIsOpen(true);
  };
  const openEdit = (u: StaffRow) => {
    setEditing(u);
    setForm({ name: u.name, username: u.username, role: u.role, pin: '', password: '', discountLimit: u.discountLimit, isActive: u.isActive });
    setFormError(null);
    setIsOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const body: Record<string, unknown> = { name: form.name, role: form.role, discountLimit: Number(form.discountLimit), isActive: form.isActive };
        if (form.pin) body.pin = form.pin;
        if (form.password) body.password = form.password;
        await apiRequest(`/users/${editing.id}`, { method: 'PATCH', body });
        setNotice('Xodim yangilandi');
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: {
            name: form.name,
            username: form.username,
            role: form.role,
            pin: form.pin,
            ...(form.password ? { password: form.password } : {}),
            discountLimit: Number(form.discountLimit),
          },
        });
        setNotice('Xodim qo\'shildi');
      }
      setIsOpen(false);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const LOGIN_LABELS: Record<string, string> = {
    AUTH_LOGIN_PIN: 'PIN bilan kirdi',
    AUTH_LOGIN_PASSWORD: 'Parol bilan kirdi',
    AUTH_LOGIN_PIN_FAILED: 'Xato PIN',
    AUTH_LOGIN_PASSWORD_FAILED: 'Xato parol',
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        icon={<Users className="w-6 h-6 text-orange-500" />}
        title="Xodimlar va rollar"
        subtitle="Kassirlar PIN bilan, admin/menejer/oshxona parol bilan kiradi"
        actions={
          <button onClick={openCreate} className={`${btn.primary} flex items-center gap-2`}>
            <Plus className="w-4 h-4" /> Yangi xodim
          </button>
        }
      />
      {error && <Banner>{error}</Banner>}
      {notice && <Banner kind="success" onClose={() => setNotice(null)}>{notice}</Banner>}

      <Card>
        {loading && !data ? (
          <Empty>Yuklanmoqda…</Empty>
        ) : !data?.length ? (
          <Empty>Xodimlar yo&apos;q</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left py-2">Ism</th>
                <th className="text-left py-2">Login</th>
                <th className="text-left py-2">Rol</th>
                <th className="text-right py-2">Chegirma limiti</th>
                <th className="text-left py-2">Kirish</th>
                <th className="text-left py-2">Holat</th>
                <th className="text-right py-2">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((u) => (
                <tr key={u.id} className={u.isActive ? '' : 'text-slate-400'}>
                  <td className="py-2 font-semibold">{u.name}</td>
                  <td className="py-2 font-mono text-xs">{u.username}</td>
                  <td className="py-2">{ROLE_LABELS[u.role] || u.role}</td>
                  <td className="py-2 text-right">{u.discountLimit}%</td>
                  <td className="py-2 text-xs">PIN{u.hasPassword ? ' + parol' : ''}</td>
                  <td className="py-2 text-xs">{u.isActive ? <span className="text-emerald-700">Faol</span> : 'O\'chirilgan'}</td>
                  <td className="py-2">
                    <div className="flex justify-end gap-1">
                      <button title="Kirishlar tarixi" aria-label="Kirishlar tarixi" onClick={() => { setHistoryFor(u); setShowAllLogins(true); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                        <History className="w-4 h-4" />
                      </button>
                      <button title="Tahrirlash" aria-label="Tahrirlash" onClick={() => openEdit(u)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card
        title={historyFor ? `Kirishlar tarixi — ${historyFor.name}` : 'So\'nggi kirishlar'}
        right={historyFor ? <button onClick={() => setHistoryFor(null)} className="text-xs text-orange-600 font-semibold">Barchasi</button> : undefined}
      >
        {history.error ? (
          <Banner>{history.error}</Banner>
        ) : !history.data?.length ? (
          <Empty>Ma&apos;lumot yo&apos;q</Empty>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {history.data.slice(0, showAllLogins ? 50 : 10).map((l) => (
                <tr key={l.id}>
                  <td className="py-1.5 text-xs text-slate-500">{dt(l.createdAt)}</td>
                  <td className="py-1.5">{l.user?.name || l.details?.username || l.details?.userIdentifier || '—'}</td>
                  <td className={`py-1.5 text-xs ${l.action.endsWith('FAILED') ? 'text-rose-600 font-semibold' : 'text-emerald-700'}`}>
                    {LOGIN_LABELS[l.action] || l.action}
                    {l.details?.locked ? ' · bloklandi' : ''}
                  </td>
                  <td className="py-1.5 text-xs text-slate-400 font-mono">{l.deviceId || l.ipAddress || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {isOpen && (
        <Modal title={editing ? `Tahrirlash — ${editing.name}` : 'Yangi xodim'} onClose={() => setIsOpen(false)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Ism familiya *">
              <input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </Field>
            {!editing && (
              <Field label="Login *">
                <input required pattern="[a-zA-Z0-9_.\-]{3,32}" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input" />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rol">
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Chegirma limiti (%)">
                <input type="number" min={0} max={100} value={form.discountLimit} onChange={(e) => setForm({ ...form, discountLimit: Number(e.target.value) })} className="input" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={editing ? 'Yangi PIN (bo\'sh — o\'zgarmaydi)' : 'PIN (4–6 raqam) *'}>
                <input
                  required={!editing}
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  type="password"
                  autoComplete="new-password"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="input"
                />
              </Field>
              <Field label={NEEDS_PASSWORD.includes(form.role) && !editing ? 'Parol (≥ 8) *' : 'Parol (ixtiyoriy)'}>
                <input
                  required={NEEDS_PASSWORD.includes(form.role) && !editing}
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input"
                />
              </Field>
            </div>
            <p className="text-[11px] text-slate-400">Oddiy PINlar (1111, 1234 kabi) server tomonidan rad etiladi.</p>
            {editing && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Faol (tizimga kira oladi)
              </label>
            )}
            {formError && <Banner>{formError}</Banner>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsOpen(false)} className={btn.ghost}>Bekor qilish</button>
              <button type="submit" disabled={saving} className={btn.primary}>{saving ? 'Saqlanmoqda…' : 'Saqlash'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function StaffPage() {
  return (
    <AdminGuard>
      <StaffView />
    </AdminGuard>
  );
}
