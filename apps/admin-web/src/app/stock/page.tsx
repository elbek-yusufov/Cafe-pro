'use client';

import { useState } from 'react';
import { Package, Plus, ArrowDownToLine, Trash2, ClipboardCheck, BookOpen } from 'lucide-react';
import { AdminGuard } from '../../components/admin-guard';
import { apiRequest } from '../../lib/api';
import { Banner, Card, Empty, Field, Modal, PageHeader, btn, dt, som, useApi } from '../../components/ui';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentQty: string | number;
  minQty: string | number;
  avgCost: number;
}
interface Movement {
  id: string;
  type: string;
  quantity: string | number;
  unitCost?: number;
  totalCost?: number;
  reason?: string | null;
  createdAt: string;
  ingredient?: { name: string; unit: string } | null;
}
interface MenuItem {
  id: string;
  name: string;
}
interface Recipe {
  id: string;
  items: { ingredientId: string; quantity: string | number; ingredient: { name: string; unit: string } }[];
}

const UNITS = ['KG', 'GRAM', 'LITRE', 'ML', 'PIECE', 'PORTION'];
const UNIT_LABEL: Record<string, string> = { KG: 'kg', GRAM: 'g', LITRE: 'l', ML: 'ml', PIECE: 'dona', PORTION: 'porsiya' };
const MOVE_LABEL: Record<string, string> = { IN: 'Kirim', OUT_SALE: 'Sotuv', WASTE: 'Isrof', ADJUST: 'Inventarizatsiya', RETURN: 'Qaytarish' };

type Action = { kind: 'in' | 'waste' | 'count' | 'new'; ingredient?: Ingredient } | null;

function StockView() {
  const ings = useApi<Ingredient[]>('/ingredients');
  const moves = useApi<Movement[] | { items: Movement[] }>('/stock/movements');
  const menu = useApi<MenuItem[]>('/menu-items');
  const [action, setAction] = useState<Action>(null);
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [reason, setReason] = useState('');
  const [newIng, setNewIng] = useState({ name: '', unit: 'KG', minQty: '0', initialQty: '0', avgCost: '0' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recipeFor, setRecipeFor] = useState('');
  const recipe = useApi<Recipe | null>(recipeFor ? `/recipes/${recipeFor}` : null);
  const [recipeDraft, setRecipeDraft] = useState<{ ingredientId: string; quantity: string }[]>([]);

  const list = ings.data ?? [];
  const movementList = Array.isArray(moves.data) ? moves.data : moves.data?.items ?? [];
  const low = list.filter((i) => Number(i.currentQty) <= Number(i.minQty));
  const stockValue = list.reduce((s, i) => s + Math.max(0, Number(i.currentQty)) * i.avgCost, 0);

  const open = (kind: NonNullable<Action>['kind'], ingredient?: Ingredient) => {
    setAction({ kind, ingredient });
    setQty(kind === 'count' && ingredient ? String(Number(ingredient.currentQty)) : '');
    setCost(ingredient ? String(ingredient.avgCost) : '');
    setReason('');
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      const ing = action.ingredient;
      if (action.kind === 'in') {
        await apiRequest('/stock/in', { method: 'POST', body: { ingredientId: ing!.id, quantity: Number(qty), unitCost: Number(cost), reason: reason || undefined } });
      } else if (action.kind === 'waste') {
        await apiRequest('/stock/waste', { method: 'POST', body: { ingredientId: ing!.id, quantity: Number(qty), reason } });
      } else if (action.kind === 'count') {
        await apiRequest('/stock/inventory', { method: 'POST', body: { items: [{ ingredientId: ing!.id, actualQty: Number(qty) }], reason: reason || 'Inventarizatsiya' } });
      } else {
        await apiRequest('/ingredients', {
          method: 'POST',
          body: { name: newIng.name, unit: newIng.unit, minQty: Number(newIng.minQty), initialQty: Number(newIng.initialQty), avgCost: Number(newIng.avgCost) },
        });
      }
      setNotice('Saqlandi');
      setAction(null);
      ings.reload();
      moves.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const loadRecipe = (menuItemId: string) => {
    setRecipeFor(menuItemId);
    setRecipeDraft([]);
  };

  const saveRecipe = async () => {
    setBusy(true);
    setError(null);
    try {
      const items = recipeDraft.filter((r) => r.ingredientId && Number(r.quantity) > 0).map((r) => ({ ingredientId: r.ingredientId, quantity: Number(r.quantity) }));
      await apiRequest('/recipes', { method: 'POST', body: { menuItemId: recipeFor, items } });
      setNotice('Retsept saqlandi — keyingi sotuvlarda ombordan shu bo\'yicha chiqariladi');
      recipe.reload();
      setRecipeDraft([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        icon={<Package className="w-6 h-6 text-orange-500" />}
        title="Ombor va xomashyo"
        subtitle={`${list.length} ta xomashyo · ${low.length} tasi minimal qoldiqda · ombor qiymati ${som(stockValue)}`}
        actions={
          <button onClick={() => open('new')} className={`${btn.primary} flex items-center gap-2`}>
            <Plus className="w-4 h-4" /> Yangi xomashyo
          </button>
        }
      />
      {(ings.error || moves.error) && <Banner>{ings.error || moves.error}</Banner>}
      {notice && <Banner kind="success" onClose={() => setNotice(null)}>{notice}</Banner>}
      {error && !action && <Banner onClose={() => setError(null)}>{error}</Banner>}

      <Card title="Qoldiqlar">
        {ings.loading && !ings.data ? (
          <Empty>Yuklanmoqda…</Empty>
        ) : !list.length ? (
          <Empty>Xomashyo yo&apos;q</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="text-xs text-slate-500 uppercase">
                <tr>
                  <th className="text-left py-2">Xomashyo</th>
                  <th className="text-right py-2">Qoldiq</th>
                  <th className="text-right py-2">Minimal</th>
                  <th className="text-right py-2">O&apos;rtacha narx</th>
                  <th className="text-right py-2">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((i) => {
                  const isLow = Number(i.currentQty) <= Number(i.minQty);
                  return (
                    <tr key={i.id} className={isLow ? 'bg-amber-50/60' : ''}>
                      <td className="py-2 font-semibold">{i.name}</td>
                      <td className={`py-2 text-right font-mono ${Number(i.currentQty) < 0 ? 'text-rose-600 font-bold' : isLow ? 'text-amber-700 font-semibold' : ''}`}>
                        {Number(i.currentQty)} {UNIT_LABEL[i.unit] || i.unit}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-500">{Number(i.minQty)}</td>
                      <td className="py-2 text-right font-mono">{som(i.avgCost)}</td>
                      <td className="py-2">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => open('in', i)} className={`${btn.ghost} !px-2 !py-1 text-xs flex items-center gap-1`}><ArrowDownToLine className="w-3.5 h-3.5" /> Kirim</button>
                          <button onClick={() => open('waste', i)} className={`${btn.ghost} !px-2 !py-1 text-xs flex items-center gap-1`}><Trash2 className="w-3.5 h-3.5" /> Isrof</button>
                          <button onClick={() => open('count', i)} className={`${btn.ghost} !px-2 !py-1 text-xs flex items-center gap-1`}><ClipboardCheck className="w-3.5 h-3.5" /> Sanash</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Retseptlar (taom → xomashyo)" right={<BookOpen className="w-4 h-4 text-slate-400" />}>
          <Field label="Taom">
            <select value={recipeFor} onChange={(e) => loadRecipe(e.target.value)} className="input">
              <option value="">Tanlang…</option>
              {(menu.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </Field>
          {recipeFor && (
            <div className="mt-4 space-y-3 text-sm">
              {recipe.data?.items?.length ? (
                <ul className="divide-y divide-slate-100">
                  {recipe.data.items.map((r) => (
                    <li key={r.ingredientId} className="py-1.5 flex justify-between">
                      <span>{r.ingredient.name}</span>
                      <span className="font-mono">{Number(r.quantity)} {UNIT_LABEL[r.ingredient.unit] || r.ingredient.unit}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">Retsept yo&apos;q — sotuvda ombordan hech narsa chiqarilmaydi.</p>
              )}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">Yangi retsept (eskisi almashtiriladi) — 1 porsiya uchun:</p>
                {recipeDraft.map((r, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select value={r.ingredientId} onChange={(e) => setRecipeDraft(recipeDraft.map((x, j) => (j === idx ? { ...x, ingredientId: e.target.value } : x)))} className="input">
                      <option value="">Xomashyo…</option>
                      {list.map((i) => (
                        <option key={i.id} value={i.id}>{i.name} ({UNIT_LABEL[i.unit] || i.unit})</option>
                      ))}
                    </select>
                    <input type="number" step="0.001" min="0" placeholder="Miqdor" value={r.quantity} onChange={(e) => setRecipeDraft(recipeDraft.map((x, j) => (j === idx ? { ...x, quantity: e.target.value } : x)))} className="input w-32" />
                  </div>
                ))}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRecipeDraft([...recipeDraft, { ingredientId: '', quantity: '' }])} className={btn.ghost}>+ Qator</button>
                  <button type="button" disabled={busy || !recipeDraft.some((r) => r.ingredientId && Number(r.quantity) > 0)} onClick={saveRecipe} className={btn.primary}>Retseptni saqlash</button>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card title="So'nggi ombor harakatlari">
          {!movementList.length ? (
            <Empty>Harakatlar yo&apos;q</Empty>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm max-h-96 overflow-y-auto">
              {movementList.slice(0, 60).map((m) => (
                <li key={m.id} className="py-2 flex justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-800">
                      {MOVE_LABEL[m.type] || m.type} · {m.ingredient?.name}
                    </div>
                    <div className="text-xs text-slate-500">{m.reason || '—'} · {dt(m.createdAt)}</div>
                  </div>
                  <span className={`font-mono shrink-0 ${m.type === 'IN' ? 'text-emerald-700' : m.type === 'ADJUST' ? 'text-sky-700' : 'text-rose-600'}`}>
                    {m.type === 'IN' ? '+' : m.type === 'ADJUST' ? '±' : '−'}
                    {Number(m.quantity)} {m.ingredient ? UNIT_LABEL[m.ingredient.unit] || m.ingredient.unit : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {action && (
        <Modal
          title={
            action.kind === 'new'
              ? 'Yangi xomashyo'
              : `${action.kind === 'in' ? 'Kirim' : action.kind === 'waste' ? 'Isrof (hisobdan chiqarish)' : 'Inventarizatsiya'} — ${action.ingredient?.name}`
          }
          onClose={() => setAction(null)}
        >
          <form onSubmit={submit} className="space-y-3">
            {action.kind === 'new' ? (
              <>
                <Field label="Nomi *"><input required maxLength={80} value={newIng.name} onChange={(e) => setNewIng({ ...newIng, name: e.target.value })} className="input" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="O'lchov birligi">
                    <select value={newIng.unit} onChange={(e) => setNewIng({ ...newIng, unit: e.target.value })} className="input">
                      {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
                    </select>
                  </Field>
                  <Field label="Minimal qoldiq"><input type="number" step="0.001" min="0" value={newIng.minQty} onChange={(e) => setNewIng({ ...newIng, minQty: e.target.value })} className="input" /></Field>
                  <Field label="Boshlang'ich qoldiq"><input type="number" step="0.001" min="0" value={newIng.initialQty} onChange={(e) => setNewIng({ ...newIng, initialQty: e.target.value })} className="input" /></Field>
                  <Field label="1 birlik narxi (so'm)"><input type="number" min="0" value={newIng.avgCost} onChange={(e) => setNewIng({ ...newIng, avgCost: e.target.value })} className="input" /></Field>
                </div>
              </>
            ) : (
              <>
                <Field label={action.kind === 'count' ? `Haqiqiy qoldiq (${UNIT_LABEL[action.ingredient!.unit]})` : `Miqdor (${UNIT_LABEL[action.ingredient!.unit]})`}>
                  <input required type="number" step="0.001" min="0" value={qty} onChange={(e) => setQty(e.target.value)} className="input" />
                </Field>
                {action.kind === 'in' && (
                  <Field label="1 birlik xarid narxi (so'm)"><input required type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} className="input" /></Field>
                )}
                <Field label={action.kind === 'waste' ? 'Sabab *' : 'Izoh'}>
                  <input required={action.kind === 'waste'} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} className="input" />
                </Field>
              </>
            )}
            {error && <Banner>{error}</Banner>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAction(null)} className={btn.ghost}>Bekor qilish</button>
              <button type="submit" disabled={busy} className={btn.primary}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function StockPage() {
  return (
    <AdminGuard>
      <StockView />
    </AdminGuard>
  );
}
