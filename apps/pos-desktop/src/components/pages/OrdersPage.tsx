import React, { useState, useMemo } from 'react';
import { Search, Filter, Eye, Printer, CheckCircle2, Clock } from 'lucide-react';
import { OrderRecord } from '../../types/pos';
import { formatCurrency } from '@oshxona/shared';

interface OrdersPageProps {
  orders: OrderRecord[];
  onOpenOrder: (order: OrderRecord) => void;
  onUpdateStatus: (orderId: string, status: OrderRecord['status']) => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({
  orders,
  onOpenOrder,
  onUpdateStatus,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesFilter = filterStatus === 'ALL' || o.status === filterStatus;
      const matchesSearch =
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.table.toLowerCase().includes(search.toLowerCase()) ||
        o.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [orders, filterStatus, search]);

  return (
    <div className="p-4 lg:p-6 space-y-4 select-none overflow-y-auto max-h-[calc(100vh-64px)] custom-scrollbar">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
            Buyurtmalar Ro&apos;yxati
          </h1>
          <p className="text-xs text-slate-500">Barcha faol, tayyorlanayotgan va to&apos;langan buyurtmalar</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buyurtma raqami yoki stol..."
            className="w-full pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* 2. Status Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'ALL', label: 'Barchasi' },
          { id: 'NEW', label: 'Yangi' },
          { id: 'PREPARING', label: 'Tayyorlanmoqda' },
          { id: 'READY', label: 'Tayyor' },
          { id: 'PAID', label: 'To\'langan' },
        ].map((f) => {
          const isActive = filterStatus === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all touch-press ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 3. Orders Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            Hech qanday buyurtma topilmadi
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const isPaid = ord.status === 'PAID';
            return (
              <div
                key={ord.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-teal-500/70 transition"
              >
                <div>
                  {/* Top line */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        {ord.orderNumber}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {ord.table}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        ord.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'READY'
                          ? 'bg-teal-100 text-teal-800'
                          : ord.status === 'PREPARING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ord.status === 'PAID' ? 'To\'langan' : ord.status === 'READY' ? 'Tayyor' : ord.status === 'PREPARING' ? 'Tayyorlanmoqda' : 'Yangi'}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="py-3 space-y-1 text-xs">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span className="truncate pr-2 font-medium">
                          {item.name} <strong className="text-slate-900 font-mono">x{item.quantity}</strong>
                        </span>
                        <span className="font-mono text-slate-500 font-bold shrink-0">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer with totals & action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Jami summa:</span>
                    <span className="font-mono text-sm font-black text-teal-700">
                      {formatCurrency(ord.total)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {ord.status === 'NEW' && (
                      <button
                        onClick={() => onUpdateStatus(ord.id, 'PREPARING')}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition"
                      >
                        Boshlash
                      </button>
                    )}
                    {ord.status === 'PREPARING' && (
                      <button
                        onClick={() => onUpdateStatus(ord.id, 'READY')}
                        className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition"
                      >
                        Tayyor bo&apos;ldi
                      </button>
                    )}
                    <button
                      onClick={() => onOpenOrder(ord)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition"
                      title="Ko'rish"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
