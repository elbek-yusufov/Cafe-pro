import React, { useState } from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, Plus, Calendar } from 'lucide-react';
import { formatCurrency } from '@oshxona/shared';

export const FinancePage: React.FC = () => {
  const [transactions, setTransactions] = useState([
    { id: 'tx-1', type: 'IN', title: 'Savdo tushumi (Kassa №1)', amount: 1980000, time: '13:30', category: 'Sotuv' },
    { id: 'tx-2', type: 'OUT', title: 'Go\'sht xaridi (Omborga)', amount: 450000, time: '11:15', category: 'Xomashyo' },
    { id: 'tx-3', type: 'OUT', title: 'Sabzavot va ko\'katlar', amount: 120000, time: '10:00', category: 'Bozor' },
    { id: 'tx-4', type: 'IN', title: 'Kassa boshlang\'ich qoldig\'i', amount: 500000, time: '08:00', category: 'Kassa' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(50000);
  const [expenseCategory, setExpenseCategory] = useState('Xo\'jalik');

  const totalIn = transactions.filter((t) => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = transactions.filter((t) => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIn - totalOut;

  const handleAddExpense = () => {
    if (!expenseTitle.trim()) return;
    setTransactions([
      {
        id: `tx-${Date.now()}`,
        type: 'OUT',
        title: expenseTitle,
        amount: expenseAmount,
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        category: expenseCategory,
      },
      ...transactions,
    ]);
    setIsModalOpen(false);
    setExpenseTitle('');
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 select-none overflow-y-auto max-h-[calc(100vh-64px)] custom-scrollbar">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
            Moliya &amp; Kassa Harakati
          </h1>
          <p className="text-xs text-slate-500">Kunlik tushum, xarajatlar va kassa balansi</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 touch-press"
        >
          <Plus className="w-4 h-4" />
          <span>Xarajat Qo&apos;shish</span>
        </button>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total In */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowUpCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Jami Kirim (Tushum)</p>
            <p className="text-xl font-black text-slate-900 font-mono">{formatCurrency(totalIn)}</p>
          </div>
        </div>

        {/* Total Out */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Jami Chiqim (Xarajatlar)</p>
            <p className="text-xl font-black text-rose-600 font-mono">-{formatCurrency(totalOut)}</p>
          </div>
        </div>

        {/* Balance */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Kassadagi Sof Balans</p>
            <p className="text-xl font-black text-teal-700 font-mono">{formatCurrency(netBalance)}</p>
          </div>
        </div>
      </div>

      {/* 3. Transaction History */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5">
        <h3 className="font-extrabold text-sm text-slate-800 mb-4">Kunlik Kassa Operatsiyalari</h3>

        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    tx.type === 'IN'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {tx.type === 'IN' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{tx.title}</p>
                  <p className="text-[10px] text-slate-500">{tx.time} • {tx.category}</p>
                </div>
              </div>

              <span
                className={`font-mono font-black text-xs ${
                  tx.type === 'IN' ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {tx.type === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900">Kassadan Chiqim Qilish</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Xarajat maqsadi</label>
                <input
                  type="text"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="Masalan: Bozor xarajati"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Summa (so&apos;m)</label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategoriya</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-teal-500"
                >
                  <option value="Xomashyo">Xomashyo &amp; Bozor</option>
                  <option value="Xo'jalik">Xo&apos;jalik mollari</option>
                  <option value="Kommuna">Kommunal &amp; Ijara</option>
                  <option value="Boshqa">Boshqa xarajat</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleAddExpense}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                Chiqimni saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
