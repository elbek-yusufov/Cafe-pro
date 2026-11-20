import React, { useState } from 'react';
import { Package, AlertTriangle, Plus, Search, CheckCircle, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { InventoryItem } from '../../types/pos';
import { formatCurrency } from '@oshxona/shared';

interface InventoryPageProps {
  inventory: InventoryItem[];
  onAdjustStock: (itemId: string, newAmount: number) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  inventory,
  onAdjustStock,
}) => {
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = inventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = inventory.filter((i) => i.currentStock <= i.minStock).length;

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustmentAmount(5);
    setIsModalOpen(true);
  };

  const handleSaveAdjustment = (type: 'ADD' | 'SUBTRACT') => {
    if (!selectedItem) return;
    const delta = type === 'ADD' ? adjustmentAmount : -adjustmentAmount;
    const updated = Math.max(0, selectedItem.currentStock + delta);
    onAdjustStock(selectedItem.id, updated);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 select-none overflow-y-auto max-h-[calc(100vh-64px)] custom-scrollbar">
      {/* 1. Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
            Ombor &amp; Xomashyo Qoldiqlari
          </h1>
          <p className="text-xs text-slate-500">Restorandagi masalliqlar, go&apos;sht, guruch va sabzavotlar nazorati</p>
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{lowStockCount} ta mahsulot kam qoldi!</span>
          </div>
        )}
      </div>

      {/* 2. Search Bar */}
      <div className="relative w-full sm:w-72">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Xomashyo nomini qidirish..."
          className="w-full pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
      </div>

      {/* 3. Inventory Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-bold">Masalliq Nomi</th>
                <th className="py-3 px-4 font-bold">Kategoriya</th>
                <th className="py-3 px-4 font-bold">Hozirgi Qoldiq</th>
                <th className="py-3 px-4 font-bold">Minimal Qoldiq</th>
                <th className="py-3 px-4 font-bold">Holat</th>
                <th className="py-3 px-4 font-bold">Tan Narxi</th>
                <th className="py-3 px-4 font-bold text-right">Kirim / Chiqim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((item) => {
                const isLow = item.currentStock <= item.minStock;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3 px-4 text-slate-500">{item.category}</td>
                    <td className="py-3 px-4 font-mono font-black text-sm text-slate-900">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="py-3 px-4">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-500" /> Kam qoldi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Yetarli
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {formatCurrency(item.costPerUnit)} / {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenAdjust(item)}
                        className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition border border-teal-200"
                      >
                        O&apos;zgartirish
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Adjust Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900">
              Qoldiqni O&apos;zgartirish: {selectedItem.name}
            </h3>

            <p className="text-xs text-slate-500">
              Hozirgi qoldiq: <strong className="font-mono text-slate-900">{selectedItem.currentStock} {selectedItem.unit}</strong>
            </p>

            <div>
              <label className="font-bold text-slate-700 block text-xs mb-1">
                Miqdor ({selectedItem.unit}):
              </label>
              <input
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleSaveAdjustment('SUBTRACT')}
                className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center justify-center gap-1"
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Chiqim qilish</span>
              </button>
              <button
                onClick={() => handleSaveAdjustment('ADD')}
                className="py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-xs"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Kirim qilish</span>
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-600"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
