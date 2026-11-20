'use client';

import React, { useState, useMemo } from 'react';
import {
  Armchair,
  Users,
  Clock,
  Plus,
  Search,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  TrendingUp,
  Sun,
  Moon,
  UserCheck,
  Building2,
  ShoppingBag,
} from 'lucide-react';

interface TableItem {
  id: string;
  name: string;
  capacity: number;
  hall: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  occupiedSince?: string;
  totalAmount?: number;
  waiterName?: string;
  activeOrder?: {
    orderNumber: string;
    startedAt: string;
    waiter: string;
    items: { name: string; quantity: number; price: number }[];
    total: number;
  };
}

const initialTables: TableItem[] = [
  {
    id: 'T-1',
    name: 'Stol 1',
    capacity: 4,
    hall: 'Asosiy zal',
    status: 'OCCUPIED',
    occupiedSince: '12:45',
    totalAmount: 114000,
    waiterName: 'Azizbek Waiter',
    activeOrder: {
      orderNumber: 'K1-0842',
      startedAt: '12:45',
      waiter: 'Azizbek Waiter',
      items: [
        { name: "Toshkent To'y Oshi", quantity: 2, price: 38000 },
        { name: 'Achichuk Salati', quantity: 2, price: 12000 },
        { name: "Ko'k Choy 95 Choynak", quantity: 1, price: 6000 },
        { name: 'Samarqand Patir Noni', quantity: 1, price: 8000 },
      ],
      total: 114000,
    },
  },
  { id: 'T-2', name: 'Stol 2', capacity: 2, hall: 'Asosiy zal', status: 'AVAILABLE' },
  { id: 'T-3', name: 'Stol 3', capacity: 6, hall: 'Asosiy zal', status: 'AVAILABLE' },
  {
    id: 'T-4',
    name: 'Stol 4',
    capacity: 4,
    hall: 'Asosiy zal',
    status: 'OCCUPIED',
    occupiedSince: '13:10',
    totalAmount: 85000,
    waiterName: 'Rustambek',
    activeOrder: {
      orderNumber: 'K1-0844',
      startedAt: '13:10',
      waiter: 'Rustambek',
      items: [
        { name: "Qozon Kabob (Mol go'shti)", quantity: 1, price: 55000 },
        { name: 'Apelsin Fresh Sharbati', quantity: 1, price: 22000 },
        { name: "Tandir Go'shtli Somsa", quantity: 1, price: 8000 },
      ],
      total: 85000,
    },
  },
  { id: 'T-5', name: 'Stol 5', capacity: 4, hall: 'Asosiy zal', status: 'RESERVED', waiterName: 'Azizbek Waiter' },
  { id: 'T-6', name: 'Stol 6', capacity: 8, hall: '2-qavat', status: 'AVAILABLE' },
  { id: 'T-7', name: 'Stol 7', capacity: 4, hall: '2-qavat', status: 'AVAILABLE' },
  {
    id: 'T-8',
    name: 'Stol 8',
    capacity: 2,
    hall: '2-qavat',
    status: 'OCCUPIED',
    occupiedSince: '13:30',
    totalAmount: 48000,
    waiterName: 'Sardor',
    activeOrder: {
      orderNumber: 'K1-0850',
      startedAt: '13:30',
      waiter: 'Sardor',
      items: [
        { name: "Uyg'ur Lag'moni", quantity: 1, price: 42000 },
        { name: "Ko'k Choy", quantity: 1, price: 6000 },
      ],
      total: 48000,
    },
  },
  { id: 'T-9', name: 'Stol 9', capacity: 4, hall: 'Yozgi ayvon', status: 'MAINTENANCE' },
  { id: 'VIP-1', name: 'VIP Zal 1', capacity: 12, hall: 'VIP Kabina', status: 'AVAILABLE' },
  { id: 'VIP-2', name: 'VIP Zal 2', capacity: 10, hall: 'VIP Kabina', status: 'RESERVED', waiterName: 'Azizbek Waiter' },
  { id: 'VIP-3', name: 'VIP Zal 3', capacity: 8, hall: 'VIP Kabina', status: 'AVAILABLE' },
];

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('uz-UZ').format(num) + " so'm";
}

export default function TablesAdminPage() {
  const [tables, setTables] = useState<TableItem[]>(initialTables);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHall, setSelectedHall] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [selectedTableForDetail, setSelectedTableForDetail] = useState<TableItem | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [tableToDelete, setTableToDelete] = useState<TableItem | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  const [formName, setFormName] = useState<string>('');
  const [formCapacity, setFormCapacity] = useState<number>(4);
  const [formHall, setFormHall] = useState<string>('Asosiy zal');
  const [formStatus, setFormStatus] = useState<TableItem['status']>('AVAILABLE');

  const halls = ['ALL', 'Asosiy zal', '2-qavat', 'VIP Kabina', 'Yozgi ayvon'];

  const metrics = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === 'AVAILABLE').length;
    const occupied = tables.filter((t) => t.status === 'OCCUPIED').length;
    const reserved = tables.filter((t) => t.status === 'RESERVED').length;
    const maintenance = tables.filter((t) => t.status === 'MAINTENANCE').length;
    const activeRevenue = tables
      .filter((t) => t.status === 'OCCUPIED')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    return { total, available, occupied, reserved, maintenance, activeRevenue };
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchSearch =
        table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        table.hall.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (table.waiterName && table.waiterName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchHall = selectedHall === 'ALL' || table.hall === selectedHall;
      const matchStatus = selectedStatus === 'ALL' || table.status === selectedStatus;

      return matchSearch && matchHall && matchStatus;
    });
  }, [tables, searchQuery, selectedHall, selectedStatus]);

  const handleOpenAdd = () => {
    setEditingTable(null);
    setFormName(`Stol ${tables.length + 1}`);
    setFormCapacity(4);
    setFormHall('Asosiy zal');
    setFormStatus('AVAILABLE');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (table: TableItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTable(table);
    setFormName(table.name);
    setFormCapacity(table.capacity);
    setFormHall(table.hall || 'Asosiy zal');
    setFormStatus(table.status);
    setIsAddEditModalOpen(true);
  };

  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Iltimos, stol raqami yoki nomini kiriting!');
      return;
    }

    if (editingTable) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === editingTable.id
            ? { ...t, name: formName, capacity: Number(formCapacity), hall: formHall, status: formStatus }
            : t
        )
      );
    } else {
      const newTable: TableItem = {
        id: `T-${Date.now()}`,
        name: formName,
        capacity: Number(formCapacity),
        hall: formHall,
        status: formStatus,
      };
      setTables((prev) => [...prev, newTable]);
    }

    setIsAddEditModalOpen(false);
  };

  const handleRequestDelete = (table: TableItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (table.status === 'OCCUPIED' || (table.totalAmount && table.totalAmount > 0)) {
      setDeleteErrorMessage(
        `"${table.name}" stolida faol buyurtma (${formatCurrency(table.totalAmount || 0)}) mavjud! Faol buyurtmasi bor stolni o'chirib bo'lmaydi.`
      );
      setTableToDelete(table);
      return;
    }
    setDeleteErrorMessage(null);
    setTableToDelete(table);
  };

  const handleConfirmDelete = () => {
    if (!tableToDelete) return;
    if (tableToDelete.status === 'OCCUPIED') return;
    setTables((prev) => prev.filter((t) => t.id !== tableToDelete.id));
    if (selectedTableForDetail?.id === tableToDelete.id) {
      setSelectedTableForDetail(null);
    }
    setTableToDelete(null);
  };

  const handleUpdateStatus = (tableId: string, newStatus: TableItem['status']) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t))
    );
  };

  const getStatusBadge = (status: TableItem['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          label: "Bo'sh",
          bg: isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'OCCUPIED':
        return {
          label: 'Band',
          bg: isDark ? 'bg-amber-950/60 text-amber-400 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500 animate-pulse',
        };
      case 'RESERVED':
        return {
          label: 'Bron qilingan',
          bg: isDark ? 'bg-blue-950/60 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'MAINTENANCE':
      default:
        return {
          label: 'Xizmatdan tashqari',
          bg: isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  return (
    <div className={`p-6 space-y-6 min-h-screen transition-colors ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-600 border border-orange-500/20 flex items-center justify-center font-bold">
            <Armchair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Stollar Boshqaruvi</h1>
            <p className="text-xs text-slate-500">Restoran zallari, interaktiv stol xaritasi va buyurtmalar nazorati</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
              isDark ? 'bg-slate-900 border-slate-800 text-amber-300' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{isDark ? 'Kunduzgi' : 'Tungi'}</span>
          </button>

          <div className={`flex items-center p-1 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                viewMode === 'grid' ? 'bg-orange-600 text-white' : 'text-slate-500'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Xarita</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                viewMode === 'table' ? 'bg-orange-600 text-white' : 'text-slate-500'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Jadval</span>
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Stol Qo&apos;shish</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-2">
            <span>Jami Stollar</span>
            <Building2 className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-black font-mono">{metrics.total}</p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center text-xs font-bold text-emerald-600 mb-2">
            <span>Bo&apos;sh Stollar</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600">{metrics.available}</p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center text-xs font-bold text-amber-500 mb-2">
            <span>Band Stollar</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-500">{metrics.occupied}</p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center text-xs font-bold text-blue-500 mb-2">
            <span>Bron Qilingan</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <p className="text-2xl font-black font-mono text-blue-500">{metrics.reserved}</p>
        </div>

        <div className={`col-span-2 md:col-span-3 xl:col-span-1 p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center text-xs font-bold text-orange-600 mb-2">
            <span>Faol Cheklar</span>
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-xl font-black font-mono text-orange-600">{formatCurrency(metrics.activeRevenue)}</p>
        </div>
      </div>

      {/* 3. Filters & Search */}
      <div className={`p-3.5 rounded-2xl border flex flex-col lg:flex-row items-center justify-between gap-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto">
          {halls.map((h) => (
            <button
              key={h}
              onClick={() => setSelectedHall(h)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedHall === h
                  ? 'bg-orange-600 text-white'
                  : isDark
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {h === 'ALL' ? 'Barcha Zallar' : h}
            </button>
          ))}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
          >
            <option value="ALL">Barcha Holatlar</option>
            <option value="AVAILABLE">Bo&apos;sh stollar</option>
            <option value="OCCUPIED">Band stollar</option>
            <option value="RESERVED">Bron qilingan</option>
            <option value="MAINTENANCE">Xizmatdan tashqari</option>
          </select>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Stol raqami, zal yoki ofitsiant..."
            className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
          />
        </div>
      </div>

      {/* 4. Grid / Table View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredTables.map((table) => {
            const badge = getStatusBadge(table.status);
            return (
              <div
                key={table.id}
                onClick={() => setSelectedTableForDetail(table)}
                className={`rounded-3xl p-4 border transition cursor-pointer flex flex-col justify-between hover:shadow-lg ${
                  isDark ? 'bg-slate-900 border-slate-800 hover:border-orange-500' : 'bg-white border-slate-200 hover:border-orange-500'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-base font-black">{table.name}</h3>
                      <p className="text-[11px] text-slate-500">{table.hall}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5" />
                      {table.capacity} kishi
                    </span>
                    {table.waiterName && (
                      <span className="flex items-center gap-1 truncate text-orange-600 font-semibold">
                        <UserCheck className="w-3.5 h-3.5" />
                        {table.waiterName}
                      </span>
                    )}
                  </div>

                  {table.status === 'OCCUPIED' && (
                    <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs mb-2">
                      <div className="flex justify-between text-[11px] text-amber-500 mb-1">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {table.occupiedSince} dan</span>
                        <span>#{table.activeOrder?.orderNumber || '0842'}</span>
                      </div>
                      <div className="flex justify-between font-black text-amber-600">
                        <span>Summa:</span>
                        <span>{formatCurrency(table.totalAmount || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                  {table.status === 'AVAILABLE' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(table.id, 'OCCUPIED');
                      }}
                      className="flex-1 py-1.5 px-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      Band qilish
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(table.id, 'AVAILABLE');
                      }}
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      Bo&apos;shatish
                    </button>
                  )}

                  <button
                    onClick={(e) => handleOpenEdit(table, e)}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900"
                    title="Tahrirlash"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleRequestDelete(table, e)}
                    className="p-1.5 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50"
                    title="O'chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <table className="w-full text-xs text-left">
            <thead className={`border-b ${isDark ? 'bg-slate-850 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <tr>
                <th className="py-3 px-4 font-bold">Stol</th>
                <th className="py-3 px-4 font-bold">Zal</th>
                <th className="py-3 px-4 font-bold">Sig&apos;imi</th>
                <th className="py-3 px-4 font-bold">Holat</th>
                <th className="py-3 px-4 font-bold">Ofitsiant</th>
                <th className="py-3 px-4 font-bold">Joriy hisob</th>
                <th className="py-3 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTables.map((table) => {
                const badge = getStatusBadge(table.status);
                return (
                  <tr key={table.id} onClick={() => setSelectedTableForDetail(table)} className="cursor-pointer hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-black">{table.name}</td>
                    <td className="py-3 px-4">{table.hall}</td>
                    <td className="py-3 px-4 font-mono">{table.capacity} kishi</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">{table.waiterName || '—'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-orange-600">
                      {table.totalAmount ? formatCurrency(table.totalAmount) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => handleOpenEdit(table, e)} className="p-1 rounded-lg border border-slate-200">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => handleRequestDelete(table, e)} className="p-1 rounded-lg border border-rose-200 text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Slide-over Detail Panel */}
      {selectedTableForDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setSelectedTableForDetail(null)} />
          <div className={`relative w-full max-w-md h-full shadow-2xl flex flex-col justify-between z-10 ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
            <div>
              <div className="p-5 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-bold">
                    <Armchair className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black">{selectedTableForDetail.name}</h2>
                    <p className="text-xs text-slate-500">{selectedTableForDetail.hall} • {selectedTableForDetail.capacity} kishilik</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTableForDetail(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-500">Holatni O&apos;zgartirish:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { status: 'AVAILABLE', label: "Bo'sh" },
                      { status: 'OCCUPIED', label: 'Band' },
                      { status: 'RESERVED', label: 'Bron' },
                      { status: 'MAINTENANCE', label: 'Ta\'mirlash' },
                    ].map((st) => (
                      <button
                        key={st.status}
                        onClick={() => {
                          handleUpdateStatus(selectedTableForDetail.id, st.status as any);
                          setSelectedTableForDetail({ ...selectedTableForDetail, status: st.status as any });
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                          selectedTableForDetail.status === st.status
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTableForDetail.activeOrder ? (
                  <div className="p-4 rounded-2xl border space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-mono text-sm font-black">#{selectedTableForDetail.activeOrder.orderNumber}</span>
                      <span className="text-xs font-bold text-amber-500">Faol buyurtma</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {selectedTableForDetail.activeOrder.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-dashed border-slate-100 dark:border-slate-800">
                          <span>{i.name} (x{i.quantity})</span>
                          <span className="font-mono font-bold">{formatCurrency(i.price * i.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 flex justify-between font-black text-base border-t">
                      <span>Jami:</span>
                      <span className="text-orange-600 font-mono">{formatCurrency(selectedTableForDetail.activeOrder.total)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-400 py-8">Hozirda faol buyurtma yo&apos;q</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex gap-2">
              <button
                onClick={() => setSelectedTableForDetail(null)}
                className="w-full py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add/Edit Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
            <h3 className="text-base font-black">{editingTable ? 'Stolni Tahrirlash' : 'Yangi Stol'}</h3>
            <form onSubmit={handleSaveTable} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Stol Nomi</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Sig&apos;imi</label>
                  <input
                    type="number"
                    min={1}
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Zal</label>
                  <select value={formHall} onChange={(e) => setFormHall(e.target.value)} className="w-full px-3 py-2 border rounded-xl">
                    <option value="Asosiy zal">Asosiy zal</option>
                    <option value="2-qavat">2-qavat</option>
                    <option value="VIP Kabina">VIP Kabina</option>
                    <option value="Yozgi ayvon">Yozgi ayvon</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsAddEditModalOpen(false)} className="px-4 py-2 border rounded-xl">
                  Bekor qilish
                </button>
                <button type="submit" className="px-5 py-2 bg-orange-600 text-white rounded-xl font-bold">
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Dialog */}
      {tableToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Stolni O&apos;chirish</h3>
                <p className="text-xs text-slate-500">&quot;{tableToDelete.name}&quot; stolini o&apos;chirmoqchimisiz?</p>
              </div>
            </div>

            {deleteErrorMessage ? (
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                {deleteErrorMessage}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Ushbu stol zaldan o&apos;chiriladi.</p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setTableToDelete(null)} className="px-4 py-2 border rounded-xl text-xs font-bold">
                Yopish
              </button>
              {!deleteErrorMessage && (
                <button onClick={handleConfirmDelete} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">
                  O&apos;chirish
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
