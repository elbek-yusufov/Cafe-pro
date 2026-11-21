import Link from 'next/link';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Package,
  BarChart3,
  Users,
  Settings,
  RefreshCw,
  Receipt,
  ChefHat,
  QrCode,
  Armchair,
  FolderTree,
} from 'lucide-react';

export function Sidebar() {
  const menu = [
    { name: 'Bosh sahifa (Dashboard)', href: '/', icon: LayoutDashboard },
    { name: 'Stollar Boshqaruvi', href: '/tables', icon: Armchair },
    { name: 'Oshxona KDS Ekran', href: '/kds', icon: ChefHat },
    { name: 'Mijoz QR Menyu', href: '/qr-menu', icon: QrCode },
    { name: 'Menyu va Narxlar', href: '/menu', icon: UtensilsCrossed },
    { name: 'Kategoriyalar', href: '/categories', icon: FolderTree },
    { name: 'Ombor va Xomashyo', href: '/stock', icon: Package },
    { name: 'Hisobotlar va Tahlil', href: '/reports', icon: BarChart3 },
    { name: 'Sotuvlar & Cheklar', href: '/sales', icon: Receipt },
    { name: 'Xodimlar', href: '/staff', icon: Users },
    { name: 'Sinxronizatsiya', href: '/sync', icon: RefreshCw },
    { name: 'Sozlamalar', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-xl font-bold shadow-lg">
            🍽️
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">OshxonaPOS</h1>
            <p className="text-xs text-slate-400">Admin Boshqaruv</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menu.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
              >
                <Icon className="w-4 h-4 text-orange-400" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Sinxron Holati:</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Online
          </span>
        </div>
        <p className="text-[11px] text-slate-400">So'nggi sinxron: hozirgina</p>
      </div>
    </aside>
  );
}
