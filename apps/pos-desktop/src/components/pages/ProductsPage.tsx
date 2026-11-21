import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Dish, Category } from '../../types/pos';
import { formatCurrency } from '@oshxona/shared';
import { DishImage } from '../common/DishImage';
import { UNIT_LABELS } from '../../lib/menu';

interface ProductsPageProps {
  dishes: Dish[];
  categories: Category[];
  onToggleAvailability: (dishId: string) => void;
  onAddProduct: (dish: Dish) => void;
  onUpdateProduct: (dish: Dish) => void;
  /** Taom qo'shish/tahrirlash faqat ADMIN uchun (server ham tekshiradi) */
  canManageMenu?: boolean;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  dishes,
  categories,
  onToggleAvailability,
  onAddProduct,
  onUpdateProduct,
  canManageMenu = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(25000);
  const [categoryId, setCategoryId] = useState(categories[1]?.id || 'cat-1');
  const [unit, setUnit] = useState('PORTION');

  const filtered = useMemo(() => {
    return dishes.filter((d) => {
      const matchCat = selectedCat === 'ALL' || d.categoryId === selectedCat;
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [dishes, selectedCat, search]);

  const handleOpenAdd = () => {
    setEditingDish(null);
    setName('');
    setPrice(30000);
    setCategoryId(categories[1]?.id || 'cat-1');
    setUnit('PORTION');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dish: Dish) => {
    setEditingDish(dish);
    setName(dish.name);
    setPrice(dish.price);
    setCategoryId(dish.categoryId);
    setUnit(dish.unit);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Iltimos, taom nomini kiriting');
      return;
    }

    if (editingDish) {
      onUpdateProduct({
        ...editingDish,
        name,
        price,
        categoryId,
        unit,
      });
    } else {
      const newDish: Dish = {
        id: `d-${Date.now()}`,
        name,
        price,
        categoryId,
        unit,
        isAvailable: true,
        isFavorite: false,
      };
      onAddProduct(newDish);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 select-none overflow-y-auto max-h-[calc(100vh-64px)] custom-scrollbar">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
            Mahsulotlar &amp; Menyu Boshqaruvi
          </h1>
          <p className="text-xs text-slate-500">Restoran taomlari narxi, kategoriyasi va mavjudligini sozlash</p>
        </div>

        {canManageMenu && (
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 touch-press"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Taom Qo&apos;shish</span>
        </button>
        )}
      </div>

      {/* 2. Search & Category Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 w-full sm:w-auto custom-scrollbar">
          <button
            onClick={() => setSelectedCat('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              selectedCat === 'ALL' ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Barchasi ({dishes.length})
          </button>
          {categories.filter((c) => c.id !== 'fav' && c.id !== 'cat-all').map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                selectedCat === cat.id ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Taom nomini qidirish..."
            className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
        </div>
      </div>

      {/* 3. Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-bold">Rasm</th>
                <th className="py-3 px-4 font-bold">Taom Nomi</th>
                <th className="py-3 px-4 font-bold">Kategoriya</th>
                <th className="py-3 px-4 font-bold">Birlik</th>
                <th className="py-3 px-4 font-bold">Narxi</th>
                <th className="py-3 px-4 font-bold">Mavjudlik</th>
                <th className="py-3 px-4 font-bold text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((dish) => {
                const catObj = categories.find((c) => c.id === dish.categoryId);
                return (
                  <tr key={dish.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                        <DishImage type={dish.image ?? ''} imageUrl={dish.imageUrl} alt={dish.name} className="w-full h-full" />
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{dish.name}</td>
                    <td className="py-2.5 px-4 text-slate-500">{catObj?.name || 'Umumiy'}</td>
                    <td className="py-2.5 px-4 text-slate-500">{UNIT_LABELS[dish.unit] || dish.unit}</td>
                    <td className="py-2.5 px-4 font-mono font-black text-slate-900">
                      {formatCurrency(dish.price)}
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => onToggleAvailability(dish.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                          dish.isAvailable
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {dish.isAvailable ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Mavjud</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Tugagan</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {canManageMenu && (
                      <button
                        onClick={() => handleOpenEdit(dish)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900">
              {editingDish ? 'Taomni Tahrirlash' : 'Yangi Taom Qo\'shish'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Taom nomi</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Qozon Kabob"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Narxi (so&apos;m)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategoriya</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
                >
                  {categories.filter((c) => c.id !== 'fav' && c.id !== 'cat-all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                Taom rasmi, tavsifi va tannarxi Admin paneldagi &quot;Menyu va Narxlar&quot; bo&apos;limida boshqariladi.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
