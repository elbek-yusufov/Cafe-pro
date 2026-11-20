import React from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Banknote,
  CreditCard,
  QrCode,
  ArrowUpRight,
  Clock,
  UserCheck
} from 'lucide-react';
import { DailyReport, OrderRecord } from '../../types/pos';
import { formatCurrency } from '@oshxona/shared';

interface DashboardPageProps {
  report: DailyReport;
  recentOrders: OrderRecord[];
  onOpenOrder: (order: OrderRecord) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  report,
  recentOrders,
  onOpenOrder,
}) => {
  const maxSale = Math.max(...report.hourlySales.map((h) => h.amount), 1);

  return (
    <div className="p-4 lg:p-6 space-y-5 select-none overflow-y-auto max-h-[calc(100vh-64px)] custom-scrollbar">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight">
            Boshqaruv Paneli (Dashboard)
          </h1>
          <p className="text-xs text-slate-500">Bugungi umumiy savdo va kassa ko&apos;rsatkichlari</p>
        </div>
        <div className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
          Bugun: {new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* 2. Top Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Today Sales */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Bugungi Savdo</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg lg:text-xl font-black text-slate-900 font-mono">
              {formatCurrency(report.todaySales)}
            </p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +14.2% kechagiga nisbatan
            </p>
          </div>
        </div>

        {/* Order Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Buyurtmalar Soni</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg lg:text-xl font-black text-slate-900 font-mono">
              {report.orderCount} ta
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              O&apos;rtacha chek: {formatCurrency(report.orderCount > 0 ? Math.round(report.todaySales / report.orderCount) : 0)}
            </p>
          </div>
        </div>

        {/* Cash Payments */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Naqd Pulda</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg lg:text-xl font-black text-slate-900 font-mono">
              {formatCurrency(report.cashPayments)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Kassada mavjud</p>
          </div>
        </div>

        {/* Card Payments */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">Karta &amp; QR To&apos;lov</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg lg:text-xl font-black text-slate-900 font-mono">
              {formatCurrency(report.cardPayments + report.qrPayments)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Bank hisobiga tushgan</p>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Sales Chart & Payment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-sm text-slate-800">Soatlik Savdo Dinamikasi</h3>
            <span className="text-xs text-slate-500">Bugungi kun tartibida</span>
          </div>

          {/* Bar Chart */}
          <div className="h-48 flex items-end gap-3 pt-6 pb-2">
            {report.hourlySales.map((item) => {
              const heightPercent = Math.round((item.amount / maxSale) * 100);
              return (
                <div key={item.hour} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {Math.round(item.amount / 1000)}k
                  </span>
                  <div
                    style={{ height: `${Math.max(12, heightPercent)}%` }}
                    className="w-full rounded-t-xl bg-teal-500 group-hover:bg-teal-600 transition-all shadow-xs"
                  />
                  <span className="text-[10px] font-bold text-slate-500">{item.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Breakdown Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 mb-4">To&apos;lov Turlari Taqsimoti</h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1 text-slate-600">
                  <span className="font-bold flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-teal-600" /> Naqd pul (52%)
                  </span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(report.cashPayments)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full" style={{ width: '52%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-slate-600">
                  <span className="font-bold flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-teal-600" /> Bank kartasi (37%)
                  </span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(report.cardPayments)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: '37%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-slate-600">
                  <span className="font-bold flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-teal-600" /> QR To&apos;lov (11%)
                  </span>
                  <span className="font-mono font-bold text-slate-800">{formatCurrency(report.qrPayments)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-teal-400 rounded-full" style={{ width: '11%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            Kassa navbati soat 20:00 da yopiladi.
          </div>
        </div>
      </div>

      {/* 4. Recent Orders Table */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-sm text-slate-800">Oxirgi Buyurtmalar</h3>
          <span className="text-xs text-teal-700 font-bold">Barchasini ko&apos;rish</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-2.5 font-bold">Chek №</th>
                <th className="pb-2.5 font-bold">Stol / Xizmat</th>
                <th className="pb-2.5 font-bold">Vaqt</th>
                <th className="pb-2.5 font-bold">Mahsulotlar</th>
                <th className="pb-2.5 font-bold">Holat</th>
                <th className="pb-2.5 font-bold text-right">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentOrders.map((ord) => (
                <tr
                  key={ord.id}
                  onClick={() => onOpenOrder(ord)}
                  className="hover:bg-slate-50 transition cursor-pointer"
                >
                  <td className="py-3 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                  <td className="py-3 font-medium">{ord.table}</td>
                  <td className="py-3 text-slate-500">{ord.createdAt}</td>
                  <td className="py-3">
                    <span className="truncate block max-w-xs text-slate-600">
                      {ord.items.map((i) => `${i.name} (${i.quantity})`).join(', ')}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        ord.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'READY'
                          ? 'bg-teal-100 text-teal-800'
                          : ord.status === 'PREPARING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ord.status === 'PAID' ? 'To\'langan' : ord.status === 'READY' ? 'Tayyor' : ord.status === 'PREPARING' ? 'Tayyorlanmoqda' : 'Yangi'}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(ord.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
