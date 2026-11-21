'use client';

import { useCallback, useEffect, useState } from 'react';
import { FolderTree, Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { AdminGuard } from '../../components/admin-guard';
import { ApiError, apiRequest } from '../../lib/api';
import { CategoryRow, useMenuRealtime } from '../../lib/menu';

interface FormState {
  name: string;
  nameRu: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { name: '', nameRu: '', icon: '', color: '#EA580C', sortOrder: 0, isActive: true };

function CategoriesView() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await apiRequest<CategoryRow[]>('/categories?includeInactive=true'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useMenuRealtime(load);

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3000);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sortOrder: rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 1 });
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEdit = (row: CategoryRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      nameRu: row.nameRu || '',
      icon: row.icon || '',
      color: row.color || '#EA580C',
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const body = {
      name: form.name.trim(),
      nameRu: form.nameRu.trim() || undefined,
      icon: form.icon.trim() || undefined,
      color: form.color,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editing) {
        await apiRequest(`/categories/${editing.id}`, { method: 'PATCH', body: { ...body, isActive: form.isActive } });
        flash('Kategoriya yangilandi');
      } else {
        await apiRequest('/categories', { method: 'POST', body });
        flash('Kategoriya qo\'shildi');
      }
      setIsFormOpen(false);
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: CategoryRow) => {
    try {
      await apiRequest(`/categories/${row.id}`, { method: 'PATCH', body: { isActive: !row.isActive } });
      flash(row.isActive ? 'Kategoriya POS dan yashirildi' : 'Kategoriya POS da ko\'rinadi');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const remove = async (row: CategoryRow) => {
    if (!confirm(`"${row.name}" kategoriyasini o'chirasizmi?`)) return;
    try {
      await apiRequest(`/categories/${row.id}`, { method: 'DELETE' });
      flash('Kategoriya o\'chirildi');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'O\'chirib bo\'lmadi');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-orange-500" /> Kategoriyalar
          </h1>
          <p className="text-sm text-slate-500 mt-1">Menyu bo&apos;limlari — POS kassada tartib bo&apos;yicha ko&apos;rinadi</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Yangi kategoriya
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold px-4 py-3 rounded-xl flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Yopish">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-4 py-3 rounded-xl">{notice}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Tartib</th>
              <th className="text-left px-4 py-3 font-semibold">Kategoriya</th>
              <th className="text-left px-4 py-3 font-semibold">Ruscha</th>
              <th className="text-right px-4 py-3 font-semibold">Taomlar</th>
              <th className="text-left px-4 py-3 font-semibold">Holat</th>
              <th className="text-right px-4 py-3 font-semibold">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Yuklanmoqda…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Hali kategoriya yo&apos;q</td>
              </tr>
            ) : (
              rows.map((row) => {
                const count = row._count?.menuItems ?? 0;
                return (
                  <tr key={row.id} className={row.isActive ? '' : 'bg-slate-50/70 text-slate-400'}>
                    <td className="px-4 py-3 font-mono text-slate-500">{row.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-base border border-black/5"
                          style={{ backgroundColor: `${row.color || '#EA580C'}22` }}
                        >
                          {row.icon || <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color || '#EA580C' }} />}
                        </span>
                        <span className="font-semibold text-slate-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.nameRu || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">{count}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(row)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          row.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {row.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {row.isActive ? 'Faol' : 'Yashirin'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(row)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Tahrirlash"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(row)}
                          disabled={count > 0}
                          className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={count > 0 ? 'Avval taomlarni boshqa kategoriyaga o\'tkazing' : 'O\'chirish'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={save} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}</h2>
              <button type="button" onClick={() => setIsFormOpen(false)} aria-label="Yopish">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <Field label="Nomi (o'zbekcha) *">
              <input
                required
                maxLength={80}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Nomi (ruscha)">
              <input maxLength={80} value={form.nameRu} onChange={(e) => setForm({ ...form, nameRu: e.target.value })} className="input" />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Belgi (emoji)">
                <input maxLength={8} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="input" placeholder="🍲" />
              </Field>
              <Field label="Rang">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full h-[38px] rounded-lg border border-slate-300 p-1"
                />
              </Field>
              <Field label="Tartib">
                <input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="input"
                />
              </Field>
            </div>
            {editing && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                POS kassada ko&apos;rsatish (faol)
              </label>
            )}

            {formError && (
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">{formError}</div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg">
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60 rounded-lg"
              >
                {saving ? 'Saqlanmoqda…' : 'Saqlash'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export default function CategoriesPage() {
  return (
    <AdminGuard>
      <CategoriesView />
    </AdminGuard>
  );
}
