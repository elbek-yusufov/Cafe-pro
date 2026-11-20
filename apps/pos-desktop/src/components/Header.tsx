import React from 'react';
import {
  Menu,
  ShoppingCart,
  User,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { SyncState, ActiveTab } from '../types/pos';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  syncState: SyncState;
  onTriggerSync: () => void;
  cartCount: number;
  userName: string;
  userRole: string;
  onLogout: () => void;
  onToggleNav: () => void;
  selectedTable: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  onSelectTable: (table: string) => void;
  onSelectOrderType: (type: 'DINE_IN' | 'TAKEAWAY') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  syncState,
  onTriggerSync,
  cartCount,
  userName,
  userRole,
  onLogout,
  onToggleNav,
  selectedTable,
  orderType,
  onSelectTable,
  onSelectOrderType,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-4 lg:px-6 flex items-center justify-between shrink-0 shadow-sm z-30 select-none">
      {/* 1. Left: POS Brand Logo (matching reference image) */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onSelectTab('kassa')}
          className="flex items-center gap-2 group focus:outline-none"
        >
          {/* Leaf emblem */}
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 transition-transform group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-teal-600" stroke="none">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-teal-700">POS</span>
        </button>

        {/* Quick Order Type / Table selector in Kassa mode */}
        {activeTab === 'kassa' && (
          <div className="hidden sm:flex items-center gap-1.5 ml-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => onSelectOrderType('DINE_IN')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                orderType === 'DINE_IN'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Zal (Stol)
            </button>
            <button
              onClick={() => onSelectOrderType('TAKEAWAY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                orderType === 'TAKEAWAY'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Olib ketish
            </button>

            {orderType === 'DINE_IN' && (
              <select
                value={selectedTable}
                onChange={(e) => onSelectTable(e.target.value)}
                className="bg-white text-slate-800 border border-slate-200 font-medium rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {['Stol 1', 'Stol 2', 'Stol 3', 'Stol 4', 'Stol 5', 'Stol 6', 'VIP Zal 1', 'VIP Zal 2'].map((tbl) => (
                  <option key={tbl} value={tbl}>
                    {tbl}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* 2. Center: Quick Nav Pills */}
      <nav className="hidden xl:flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200/80">
        {[
          { id: 'kassa', label: 'Kassa' },
          { id: 'buyurtmalar', label: 'Buyurtmalar' },
          { id: 'stollar', label: 'Stollar' },
          { id: 'oshxona', label: 'Oshxona' },
          { id: 'mahsulotlar', label: 'Mahsulotlar' },
          { id: 'ombor', label: 'Ombor' },
          { id: 'hisobotlar', label: 'Hisobotlar' },
          { id: 'xodimlar', label: 'Xodimlar' },
          { id: 'sozlamalar', label: 'Sozlamalar' },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as ActiveTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* 3. Right: Status & Action Icons (matching reference image top-right icons) */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Offline / Online Status */}
        <div
          onClick={onTriggerSync}
          title={syncState.isOnline ? `Online (${syncState.lastSyncTime})` : 'Offline - Lokal xotirada'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition border ${
            syncState.isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
          }`}
        >
          {syncState.isOnline ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span className="text-[11px]">
            {syncState.isOnline ? 'Online' : 'Oflayn'}
          </span>
          {syncState.pendingCount > 0 && (
            <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {syncState.pendingCount}
            </span>
          )}
        </div>

        {/* Hamburger Menu Icon */}
        <button
          onClick={onToggleNav}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95"
          title="Menyu sahifalari"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Cart Icon with badge */}
        <button
          onClick={() => onSelectTab('kassa')}
          className="relative w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95"
          title="Savatga o'tish"
        >
          <ShoppingCart className="w-4 h-4" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-teal-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
              {cartCount}
            </span>
          )}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center border border-teal-200">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">{userName}</p>
            <p className="text-[10px] text-slate-500">{userRole === 'CASHIER' ? 'Kassir' : userRole}</p>
          </div>
        </div>

        {/* Settings Gear */}
        <button
          onClick={() => onSelectTab('sozlamalar')}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95"
          title="Sozlamalar"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition active:scale-95"
          title="Tizimdan chiqish"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
