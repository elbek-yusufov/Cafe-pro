import {
  TrendingUp,
  ShoppingBag,
  Users,
  AlertTriangle,
  CreditCard,
  Banknote,
  Smartphone,
  BookOpen,
} from 'lucide-react';

export default function DashboardPage() {
  const kpis = [
    { title: 'Bugungi Tushum', value: '4 850 000 so\'m', change: '+14% kechagiga nisbatan', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { title: 'Buyurtmalar Soni', value: '54 ta', change: 'O\'rtacha 90 000 so\'m/chek', icon: ShoppingBag, color: 'text-orange-600 bg-orange-50' },
    { title: 'Band Stollar', value: '8 / 12', change: '67% zal bandligi', icon: Users, color: 'text-blue-600 bg-blue-50' },
    { title: 'Ombor Ogohlantirishi', value: '2 ta mahsulot', change: 'Guruch va Sabzi oz qoldi', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  ];

  const topDishes = [
    { name: 'Choyxona palov (Osh)', category: 'Ikkinchi taomlar', quantity: 38, revenue: '1 330 000 so\'m' },
    { name: 'Go\'shtli shashlik (kuskovoy)', category: 'Shashliklar', quantity: 32, revenue: '608 000 so\'m' },
    { name: 'Tandir somsa (go\'shtli)', category: 'Non va pishiriqlar', quantity: 28, revenue: '336 000 so\'m' },
    { name: 'Ko\'za sho\'rva', category: 'Birinchi taomlar', quantity: 18, revenue: '576 000 so\'m' },
    { name: 'Achchiq-chuchuk (Shakarob)', category: 'Salatlar', quantity: 24, revenue: '240 000 so\'m' },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Yuqori qism */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">🍽️ Boshqaruv Paneli (Dashboard)</h1>
          <p className="text-sm text-slate-500 mt-1">
            "Rayhon Milliy Taomlar" — Samarqand filiali real-vaqt ko'rsatkichlari
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Sana: 20-Noyabr, 2026</span>
          <button className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg shadow-sm transition">
            🔄 Yangilash
          </button>
        </div>
      </div>

      {/* KPI Kartochkalari */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.title}</span>
                <div className={`p-2 rounded-xl ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{kpi.value}</div>
              <p className="text-xs text-slate-500 mt-1.5">{kpi.change}</p>
            </div>
          );
        })}
      </div>

      {/* To'lov turlari va Savdo Grafigi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* To'lov turlari taqsimoti */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">💳 To'lov Usullari Taqsimoti</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">Naqd pul (CASH)</span>
              </div>
              <span className="text-sm font-bold text-slate-900">2 850 000 so'm (59%)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">Uzcard / Humo</span>
              </div>
              <span className="text-sm font-bold text-slate-900">1 420 000 so'm (29%)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">Click / Payme</span>
              </div>
              <span className="text-sm font-bold text-slate-900">380 000 so'm (8%)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-slate-700">Nasiya (Qarz)</span>
              </div>
              <span className="text-sm font-bold text-slate-900">200 000 so'm (4%)</span>
            </div>
          </div>
        </div>

        {/* TOP-5 Taomlar */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">🔥 Eng Ko'p Sotilgan Taomlar (TOP-5)</h2>
            <a href="/reports" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
              Barchasini ko'rish →
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Taom</th>
                  <th className="py-2.5 px-3">Kategoriya</th>
                  <th className="py-2.5 px-3">Sotildi</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-right">Jami Tushum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topDishes.map((dish, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900">{dish.name}</td>
                    <td className="py-3 px-3 text-slate-500 text-xs">{dish.category}</td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-bold rounded-md">
                        {dish.quantity} ta
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{dish.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
