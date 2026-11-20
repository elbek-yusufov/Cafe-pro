import React from 'react';
import { ChefHat, Clock, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { OrderRecord } from '../../types/pos';

interface KitchenPageProps {
  orders: OrderRecord[];
  onUpdateStatus: (orderId: string, status: OrderRecord['status']) => void;
}

export const KitchenPage: React.FC<KitchenPageProps> = ({
  orders,
  onUpdateStatus,
}) => {
  const newOrders = orders.filter((o) => o.status === 'NEW');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  return (
    <div className="p-4 lg:p-6 space-y-4 select-none overflow-hidden h-[calc(100vh-64px)] flex flex-col">
      {/* 1. Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
              Oshxona Ekrani (KDS)
            </h1>
            <p className="text-xs text-slate-500">Oshpazlar uchun taomlarni pishirish navbati va nazorati</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
          <span className="flex items-center gap-1.5 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200">
            Yangi: {newOrders.length}
          </span>
          <span className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200">
            Qozonda: {preparingOrders.length}
          </span>
          <span className="flex items-center gap-1.5 bg-teal-50 text-teal-800 px-3 py-1.5 rounded-xl border border-teal-200">
            Tayyor: {readyOrders.length}
          </span>
        </div>
      </div>

      {/* 2. 3 Columns: Yangi, Tayyorlanmoqda, Tayyor */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
        {/* Column 1: Yangi */}
        <div className="bg-slate-100/70 rounded-3xl p-3.5 flex flex-col overflow-hidden border border-slate-200/80">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 shrink-0">
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-blue-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
              Yangi Buyurtmalar ({newOrders.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {newOrders.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                Yangi buyurtmalar yo&apos;q
              </div>
            ) : (
              newOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-base font-black text-slate-900 block">
                        {ord.orderNumber}
                      </span>
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                        {ord.table}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {ord.createdAt}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs border-y border-slate-100 py-2">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-800 font-semibold">
                        <span>{item.name}</span>
                        <span className="text-sm font-black font-mono bg-slate-100 px-2 py-0.5 rounded-md text-slate-900">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onUpdateStatus(ord.id, 'PREPARING')}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 touch-press"
                  >
                    <span>Tayyorlashni Boshlash</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Tayyorlanmoqda */}
        <div className="bg-amber-50/40 rounded-3xl p-3.5 flex flex-col overflow-hidden border border-amber-200/80">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-amber-200 shrink-0">
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-amber-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Tayyorlanmoqda ({preparingOrders.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {preparingOrders.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                Hozircha pishirilayotgan taom yo&apos;q
              </div>
            ) : (
              preparingOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl p-4 border border-amber-300 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-base font-black text-slate-900 block">
                        {ord.orderNumber}
                      </span>
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        {ord.table}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pishirilmoqda
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs border-y border-slate-100 py-2">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-800 font-semibold">
                        <span>{item.name}</span>
                        <span className="text-sm font-black font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onUpdateStatus(ord.id, 'READY')}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 touch-press"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Taom Tayyor Bo&apos;ldi</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Tayyor */}
        <div className="bg-teal-50/40 rounded-3xl p-3.5 flex flex-col overflow-hidden border border-teal-200/80">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-teal-200 shrink-0">
            <h2 className="font-extrabold text-xs uppercase tracking-wider text-teal-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              Tayyor (Ofitsiantga) ({readyOrders.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {readyOrders.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
                Tarqatishga tayyor taomlar yo&apos;q
              </div>
            ) : (
              readyOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl p-4 border border-teal-300 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-base font-black text-slate-900 block">
                        {ord.orderNumber}
                      </span>
                      <span className="text-xs font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                        {ord.table}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      Zalga berish
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs border-y border-slate-100 py-2">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-800 font-semibold">
                        <span>{item.name}</span>
                        <span className="text-sm font-black font-mono bg-teal-100 text-teal-900 px-2 py-0.5 rounded-md">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onUpdateStatus(ord.id, 'PAID')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition touch-press"
                  >
                    Mijozga Yetkazildi (Yopish)
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
