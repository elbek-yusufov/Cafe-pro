import React from 'react';
import {
  LayoutGrid,
  ShoppingBag,
  Armchair,
  ChefHat,
  UtensilsCrossed,
  Layers,
  Package,
  BarChart3,
  Users,
  Settings,
  X,
  CheckCircle2,
  Wifi
} from 'lucide-react';
import { ActiveTab, SyncState } from '../types/pos';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  syncState: SyncState;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  syncState,
}) => {
  if (!isOpen) return null;

  const menuItems: { id: ActiveTab; label: string; icon: any; desc: string }[] = [
    { id: 'kassa', label: 'Kassa (Asosiy POS)', icon: LayoutGrid, desc: 'Savdo, savat va chek chiqarish' },
    { id: 'buyurtmalar', label: 'Buyurtmalar', icon: ShoppingBag, desc: 'Barcha faol va to\'langan cheklar' },
    { id: 'stollar', label: 'Stollar xaritasi', icon: Armchair, desc: 'Zal stollari holati va bandlik' },
    { id: 'oshxona', label: 'Oshxona (KDS)', icon: ChefHat, desc: 'Oshpazlar uchun taom tayyorlash ekrani' },
    { id: 'mahsulotlar', label: 'Mahsulotlar & Menyu', icon: UtensilsCrossed, desc: 'Taomlar ro\'yxati, narx va mavjudlik' },
    { id: 'ombor', label: 'Ombor & Masalliqlar', icon: Package, desc: 'Xomashyo va mahsulot qoldiqlari' },
    { id: 'hisobotlar', label: 'Hisobotlar & Tahlil', icon: BarChart3, desc: 'Kunlik tushum va to\'lovlar statistikasi' },
    { id: 'xodimlar', label: 'Xodimlar & Smenalar', icon: Users, desc: 'Kassirlar, ofitsiantlar va ruxsatlar' },
    { id: 'sozlamalar', label: 'Sozlamalar', icon: Settings, desc: 'Printer, chek va restoran sozlamalari' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
        <div>
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Menyu Bo&apos;limlari</h3>
                <p className="text-[11px] text-slate-500">OshxonaPOS Boshqaruv</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="p-2.5 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-teal-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-tight">{item.label}</p>
                    <p className={`text-[10px] truncate ${isActive ? 'text-teal-100' : 'text-slate-500'}`}>
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span className="font-medium">Tizim holati:</span>
            <span className={`inline-flex items-center gap-1 font-bold ${syncState.isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
              <span className={`w-2 h-2 rounded-full ${syncState.isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {syncState.isOnline ? 'Onlayn (Sinxron)' : 'Oflayn (Lokal)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">So&apos;nggi sinxron: {syncState.lastSyncTime}</p>
        </div>
      </div>
    </div>
  );
};
