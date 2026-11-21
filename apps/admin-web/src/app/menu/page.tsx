'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Star,
  History,
  ImagePlus,
  ImageOff,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { AdminGuard } from '../../components/admin-guard';
import { apiRequest, apiUpload, resolveAssetUrl } from '../../lib/api';
import {
  CategoryRow,
  MenuItemRow,
  PriceHistoryRow,
  UNIT_LABELS,
  UnitType,
  formatSom,
  useMenuRealtime,
} from '../../lib/menu';

interface FormState {
  name: string;
  nameRu: string;
  description: string;
  categoryId: string;
  unit: UnitType;
  price: number;
  costPrice: number;
  kitchenStationId: string;
  isFeatured: boolean;
  isAvailable: boolean;
  imageUrl: string;
  priceReason: string;
}

const emptyForm = (categoryId = ''): FormState => ({
  name: '',
  nameRu: '',
  description: '',
  categoryId,
  unit: 'PORTION',
  price: 0,
  costPrice: 0,
  kitchenStationId: '',
  isFeatured: false,
  isAvailable: true,
  imageUrl: '',
  priceReason: '',
});

function MenuView() {
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [availFilter, setAvailFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItemRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [historyFor, setHistoryFor] = useState<MenuItemRow | null>(null);
  const [history, setHistory] = useState<PriceHistoryRow[]>([]);

  const load = useCallback(async () => {
    try {
      const [menu, cats] = await Promise.all([
        apiRequest<MenuItemRow[]>('/menu-items?includeInactive=true'),
        apiRequest<CategoryRow[]>('/categories?includeInactive=true'),
      ]);
      setItems(menu);
      setCategories(cats);
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

  const stations = useMemo(
    () => [...new Set(items.map((i) => i.kitchenStationId).filter(Boolean) as string[])].sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (catFilter !== 'ALL' && i.categoryId !== catFilter) return false;
      if (availFilter === 'AVAILABLE' && !i.isAvailable) return false;
      if (availFilter === 'UNAVAILABLE' && i.isAvailable) return false;
      if (q && !i.name.toLowerCase().includes(q) && !(i.nameRu || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, catFilter, availFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(catFilter !== 'ALL' ? catFilter : categories.find((c) => c.isActive)?.id || ''));
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEdit = (item: MenuItemRow) => {
    setEditing(item);
    setForm({
      name: item.name,
      nameRu: item.nameRu || '',
      description: item.description || '',
      categoryId: item.categoryId,
      unit: item.unit,
      price: item.price,
      costPrice: item.costPrice,
      kitchenStationId: item.kitchenStationId || '',
      isFeatured: item.isFeatured,
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || '',
      priceReason: '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const { url } = await apiUpload('/uploads/menu-image', file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId) {
      setFormError('Kategoriyani tanlang');
      return;
    }
    setSaving(true);
    setFormError(null);

    const base = {
      name: form.name.trim(),
      nameRu: form.nameRu.trim() || undefined,
      description: form.description.trim() || undefined,
      categoryId: form.categoryId,
      unit: form.unit,
      kitchenStationId: form.kitchenStationId.trim() || undefined,
      isFeatured: form.isFeatured,
      isAvailable: form.isAvailable,
      imageUrl: form.imageUrl,
    };

    try {
      if (editing) {
        // Narx alohida endpoint orqali — sabab bilan narx tarixiga yoziladi
        if (form.price !== editing.price || form.costPrice !== editing.costPrice) {
          await apiRequest(`/menu-items/${editing.id}/price`, {
            method: 'PATCH',
            body: {
              newPrice: Number(form.price),
              newCostPrice: Number(form.costPrice),
              reason: form.priceReason.trim() || undefined,
            },
          });
        }
        await apiRequest(`/menu-items/${editing.id}`, { method: 'PATCH', body: base });
        flash('Taom yangilandi — POS kassalarda darhol ko\'rinadi');
      } else {
        await apiRequest('/menu-items', {
          method: 'POST',
          body: { ...base, imageUrl: form.imageUrl || undefined, price: Number(form.price), costPrice: Number(form.costPrice) },
        });
        flash('Taom qo\'shildi — POS kassalarda darhol ko\'rinadi');
      }
      setIsFormOpen(false);
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItemRow) => {
    try {
      await apiRequest(`/menu-items/${item.id}/availability`, { method: 'PATCH', body: { isAvailable: !item.isAvailable } });
      flash(item.isAvailable ? `"${item.name}" sotuvdan olindi` : `"${item.name}" yana sotuvda`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggleFeatured = async (item: MenuItemRow) => {
    try {
      await apiRequest(`/menu-items/${item.id}`, { method: 'PATCH', body: { isFeatured: !item.isFeatured } });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (item: MenuItemRow) => {
    if (!confirm(`"${item.name}" taomini menyudan o'chirasizmi? Eski buyurtmalardagi tarix saqlanadi.`)) return;
    try {
      await apiRequest(`/menu-items/${item.id}`, { method: 'DELETE' });
      flash('Taom o\'chirildi');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const openHistory = async (item: MenuItemRow) => {
    setHistoryFor(item);
    setHistory([]);
    try {
      setHistory(await apiRequest<PriceHistoryRow[]>(`/menu-items/${item.id}/price-history`));
    } catch (e) {
      setError((e as Error).message);
      setHistoryFor(null);
    }
  };

  const priceChanged = editing && (form.price !== editing.price || form.costPrice !== editing.costPrice);
  const margin = form.price > 0 ? Math.round(((form.price - form.costPrice) / form.price) * 100) : 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-orange-500" /> Menyu va Narxlar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {items.length} ta taom · {items.filter((i) => !i.isAvailable).length} tasi sotuvda yo&apos;q
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={categories.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Yangi taom
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

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Taom qidirish…" className="input pl-9" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input md:w-56">
          <option value="ALL">Barcha kategoriyalar</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ''}
              {c.name}
              {c.isActive ? '' : ' (yashirin)'}
            </option>
          ))}
        </select>
        <select value={availFilter} onChange={(e) => setAvailFilter(e.target.value as typeof availFilter)} className="input md:w-44">
          <option value="ALL">Hammasi</option>
          <option value="AVAILABLE">Sotuvda</option>
          <option value="UNAVAILABLE">Tugagan</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Taom</th>
              <th className="text-left px-4 py-3 font-semibold">Kategoriya</th>
              <th className="text-left px-4 py-3 font-semibold">Sex</th>
              <th className="text-right px-4 py-3 font-semibold">Narx</th>
              <th className="text-right px-4 py-3 font-semibold">Tannarx / Marja</th>
              <th className="text-left px-4 py-3 font-semibold">Holat</th>
              <th className="text-right px-4 py-3 font-semibold">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Yuklanmoqda…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Taom topilmadi</td>
              </tr>
            ) : (
              filtered.map((item) => {
                const img = resolveAssetUrl(item.imageUrl);
                return (
                  <tr key={item.id} className={item.isAvailable ? '' : 'bg-slate-50/70'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageOff className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {item.name}
                            {item.isFeatured && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.nameRu || ''} {item.nameRu ? '·' : ''} {UNIT_LABELS[item.unit] || item.unit}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold"
                        style={{ backgroundColor: `${item.category?.color || '#64748b'}1a`, color: item.category?.color || '#475569' }}
                      >
                        {item.category?.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.kitchenStationId || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">{formatSom(item.price)}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      <div className="font-mono">{formatSom(item.costPrice)}</div>
                      <div className={item.marginPercent !== undefined && item.marginPercent < 30 ? 'text-rose-600' : 'text-emerald-600'}>
                        {item.marginPercent ?? 0}% marja
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAvailability(item)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          item.isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                        title="Sotuvga qo'yish / olib tashlash"
                      >
                        {item.isAvailable ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {item.isAvailable ? 'Sotuvda' : 'Tugagan'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <IconButton title={item.isFeatured ? 'Sevimlilardan olish' : 'Sevimlilarga qo\'shish'} onClick={() => toggleFeatured(item)}>
                          <Star className={`w-4 h-4 ${item.isFeatured ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </IconButton>
                        <IconButton title="Narx tarixi" onClick={() => openHistory(item)}>
                          <History className="w-4 h-4" />
                        </IconButton>
                        <IconButton title="Tahrirlash" onClick={() => openEdit(item)}>
                          <Pencil className="w-4 h-4" />
                        </IconButton>
                        <IconButton title="O'chirish" onClick={() => remove(item)} danger>
                          <Trash2 className="w-4 h-4" />
                        </IconButton>
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
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={save} className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Taomni tahrirlash' : 'Yangi taom'}</h2>
              <button type="button" onClick={() => setIsFormOpen(false)} aria-label="Yopish">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-5">
              <div className="space-y-2">
                <div className="w-40 h-40 rounded-xl bg-slate-100 border border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveAssetUrl(form.imageUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-400 text-center px-3">Rasm yo&apos;q</span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="w-40 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60"
                >
                  <ImagePlus className="w-3.5 h-3.5" /> {uploading ? 'Yuklanmoqda…' : 'Rasm yuklash'}
                </button>
                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, imageUrl: '' })}
                    className="w-40 text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Rasmni olib tashlash
                  </button>
                )}
                <p className="w-40 text-[11px] text-slate-400">JPG, PNG yoki WEBP · 2 MB gacha</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nomi (o'zbekcha) *">
                    <input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
                  </Field>
                  <Field label="Nomi (ruscha)">
                    <input maxLength={120} value={form.nameRu} onChange={(e) => setForm({ ...form, nameRu: e.target.value })} className="input" />
                  </Field>
                </div>
                <Field label="Tavsif">
                  <textarea
                    maxLength={1000}
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="input"
                  />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Kategoriya *">
                    <select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="input">
                      <option value="" disabled>
                        Tanlang
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.isActive ? '' : ' (yashirin)'}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="O'lchov birligi">
                    <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as UnitType })} className="input">
                      {(Object.keys(UNIT_LABELS) as UnitType[]).map((u) => (
                        <option key={u} value={u}>
                          {UNIT_LABELS[u]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Oshxona sexi">
                    <input
                      list="stations"
                      maxLength={60}
                      value={form.kitchenStationId}
                      onChange={(e) => setForm({ ...form, kitchenStationId: e.target.value })}
                      className="input"
                      placeholder="Issiq sex"
                    />
                    <datalist id="stations">
                      {stations.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Sotuv narxi (so'm) *">
                    <input
                      required
                      type="number"
                      min={0}
                      step={500}
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      className="input font-mono"
                    />
                  </Field>
                  <Field label="Tannarx (so'm)">
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={form.costPrice}
                      onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                      className="input font-mono"
                    />
                  </Field>
                  <Field label="Marja">
                    <div className={`px-3 py-2 text-sm font-semibold ${margin < 30 ? 'text-rose-600' : 'text-emerald-600'}`}>{margin}%</div>
                  </Field>
                </div>
                {priceChanged && (
                  <Field label="Narx o'zgarish sababi (narx tarixiga yoziladi)">
                    <input
                      maxLength={200}
                      value={form.priceReason}
                      onChange={(e) => setForm({ ...form, priceReason: e.target.value })}
                      className="input"
                      placeholder="Masalan: go'sht narxi oshdi"
                    />
                  </Field>
                )}
                <div className="flex gap-5 pt-1">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
                    Sotuvda
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                    Sevimlilar (POS birinchi sahifa)
                  </label>
                </div>
              </div>
            </div>

            {formError && (
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">{formError}</div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg">
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="px-5 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60 rounded-lg"
              >
                {saving ? 'Saqlanmoqda…' : 'Saqlash'}
              </button>
            </div>
          </form>
        </div>
      )}

      {historyFor && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Narx tarixi — {historyFor.name}</h2>
              <button onClick={() => setHistoryFor(null)} aria-label="Yopish">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-sm">
              {history.length === 0 ? (
                <p className="py-4 text-center text-slate-400">Yuklanmoqda…</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono font-semibold text-slate-900">
                        {formatSom(h.oldPrice)} → {formatSom(h.newPrice)}
                      </div>
                      <div className="text-xs text-slate-500">{h.reason || '—'}</div>
                    </div>
                    <div className="text-right text-xs text-slate-400 shrink-0">
                      <div>{new Date(h.createdAt).toLocaleString('uz-UZ')}</div>
                      <div>{h.changedBy}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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

function IconButton({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`p-2 rounded-lg text-slate-500 transition ${danger ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-slate-100 hover:text-slate-900'}`}
    >
      {children}
    </button>
  );
}

export default function MenuPage() {
  return (
    <AdminGuard>
      <MenuView />
    </AdminGuard>
  );
}
