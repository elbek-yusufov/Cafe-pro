import React, { useState, useMemo } from 'react';
import {
  Armchair,
  Users,
  Clock,
  Check,
  Plus,
  ShoppingBag,
  Search,
  Filter,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Sun,
  Moon,
  ChefHat,
  Receipt,
  UserCheck,
  Building2,
  RefreshCw
} from 'lucide-react';
import { TableItem } from '../../types/pos';
import { formatCurrency } from '@oshxona/shared';

interface TablesPageProps {
  tables: TableItem[];
  onSelectTableForPos: (tableName: string) => void;
  onUpdateTableStatus: (tableId: string, status: TableItem['status']) => void;
  onAddTable?: (newTable: TableItem) => void;
  onUpdateTable?: (table: TableItem) => void;
  onDeleteTable?: (tableId: string) => void;
}

export const TablesPage: React.FC<TablesPageProps> = ({
  tables,
  onSelectTableForPos,
  onUpdateTableStatus,
  onAddTable,
  onUpdateTable,
  onDeleteTable,
}) => {
  // Theme state: Linear-style Light / Dark theme toggle
  const [isDark, setIsDark] = useState<boolean>(false);

  // View Mode: Grid (Visual Map) or List (Data Table)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHall, setSelectedHall] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Slide-over Detail Panel
  const [selectedTableForDetail, setSelectedTableForDetail] = useState<TableItem | null>(null);

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState<boolean>(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);

  // Delete Confirmation Modal
  const [tableToDelete, setTableToDelete] = useState<TableItem | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formCapacity, setFormCapacity] = useState<number>(4);
  const [formHall, setFormHall] = useState<string>('Asosiy zal');
  const [formStatus, setFormStatus] = useState<TableItem['status']>('AVAILABLE');

  // Available Halls
  const halls = ['ALL', 'Asosiy zal', '2-qavat', 'VIP Kabina', 'Yozgi ayvon'];

  // Summary Metrics
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

  // Filtered Tables
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

  // Open Create Modal
  const handleOpenAdd = () => {
    setEditingTable(null);
    setFormName(`Stol ${tables.length + 1}`);
    setFormCapacity(4);
    setFormHall('Asosiy zal');
    setFormStatus('AVAILABLE');
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (table: TableItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTable(table);
    setFormName(table.name);
    setFormCapacity(table.capacity);
    setFormHall(table.hall || 'Asosiy zal');
    setFormStatus(table.status);
    setIsAddEditModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Iltimos, stol raqami yoki nomini kiriting!');
      return;
    }

    if (editingTable) {
      const updated: TableItem = {
        ...editingTable,
        name: formName,
        capacity: Number(formCapacity),
        hall: formHall,
        status: formStatus,
      };
      if (onUpdateTable) onUpdateTable(updated);
      if (selectedTableForDetail?.id === updated.id) {
        setSelectedTableForDetail(updated);
      }
    } else {
      const newTable: TableItem = {
        id: `T-${Date.now()}`,
        name: formName,
        capacity: Number(formCapacity),
        hall: formHall,
        status: formStatus,
      };
      if (onAddTable) onAddTable(newTable);
    }

    setIsAddEditModalOpen(false);
  };

  // Delete Request with Validation
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
    if (onDeleteTable) onDeleteTable(tableToDelete.id);
    if (selectedTableForDetail?.id === tableToDelete.id) {
      setSelectedTableForDetail(null);
    }
    setTableToDelete(null);
  };

  // Helper for Status Badge
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
    <div
      className={`min-h-[calc(100vh-64px)] p-4 lg:p-6 transition-colors duration-200 select-none overflow-y-auto custom-scrollbar ${
        isDark ? 'bg-[#0b0f19] text-slate-100' : 'bg-[#f4f7f6] text-slate-800'
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & TOP TOOLBAR (Linear / Stripe SaaS style)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                isDark ? 'bg-teal-950 text-teal-400 border border-teal-800' : 'bg-teal-50 text-teal-700 border border-teal-200'
              }`}
            >
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight leading-tight">
                Stollar Boshqaruvi
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Restoran zallari, interaktiv stol xaritasi va faol buyurtmalar nazorati
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2.5 rounded-xl border transition active:scale-95 flex items-center gap-1.5 text-xs font-bold ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Mavzuni almashtirish"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDark ? 'Kunduzgi' : 'Tungi'}</span>
          </button>

          {/* View Mode Switcher: Grid vs Table */}
          <div
            className={`flex items-center p-1 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === 'grid'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xarita (Grid) ko'rinishi"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Xarita</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === 'table'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Jadval ko'rinishi"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Jadval</span>
            </button>
          </div>

          {/* Add Table Button */}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 touch-press"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Stol Qo&apos;shish</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SUMMARY KPI STATS CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4 mb-6">
        {/* Total Tables */}
        <div
          className={`p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Jami Stollar
            </span>
            <Building2 className="w-4 h-4 text-teal-500" />
          </div>
          <div>
            <p className="text-2xl font-black font-mono">{metrics.total}</p>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {metrics.maintenance > 0
                ? `${metrics.available} bo'sh, ${metrics.occupied} band, ${metrics.reserved} bron, ${metrics.maintenance} ta'mirda`
                : "Barcha zallar bo'yicha"}
            </p>
          </div>
        </div>

        {/* Available Tables */}
        <div
          className={`p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Bo&apos;sh Stollar
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-emerald-600">{metrics.available}</p>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Mijoz qabul qilishga tayyor
            </p>
          </div>
        </div>

        {/* Occupied Tables */}
        <div
          className={`p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Band Stollar
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-amber-500">{metrics.occupied}</p>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Hozirda ovqatlanayotganlar
            </p>
          </div>
        </div>

        {/* Reserved Tables */}
        <div
          className={`p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
              Bron Qilingan
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-blue-500">{metrics.reserved}</p>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Oldindan buyurtma qilingan
            </p>
          </div>
        </div>

        {/* Active Accumulating Revenue */}
        <div
          className={`col-span-2 md:col-span-3 xl:col-span-1 p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
              Faol Cheklar Summasi
            </span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <p className="text-xl font-black font-mono text-teal-600">
              {formatCurrency(metrics.activeRevenue)}
            </p>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Zaldagi joriy buyurtmalar
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. FILTERS & SEARCH ROW
      ───────────────────────────────────────────────────────────── */}
      <div
        className={`p-3.5 rounded-2xl border mb-5 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-xs ${
          isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Hall & Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 custom-scrollbar">
          {halls.map((h) => {
            const isSelected = selectedHall === h;
            return (
              <button
                key={h}
                onClick={() => setSelectedHall(h)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition touch-press ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-xs'
                    : isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {h === 'ALL' ? 'Barcha Zallar' : h}
              </button>
            );
          })}

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

          {/* Quick Status Pill */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">Barcha Holatlar</option>
            <option value="AVAILABLE">Faqat Bo&apos;sh stollar</option>
            <option value="OCCUPIED">Faqat Band stollar</option>
            <option value="RESERVED">Faqat Bron qilingan</option>
            <option value="MAINTENANCE">Xizmatdan tashqari</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Stol raqami, zal yoki ofitsiant..."
            className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-xs transition ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MAIN VIEW (GRID OR DATA TABLE)
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'grid' ? (
        /* ── GRID / VISUAL MAP ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
          {filteredTables.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs">
              Qidiruv bo&apos;yicha hech qanday stol topilmadi
            </div>
          ) : (
            filteredTables.map((table) => {
              const badge = getStatusBadge(table.status);
              const isOccupied = table.status === 'OCCUPIED';

              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTableForDetail(table)}
                  className={`group relative rounded-3xl p-4 border transition-all cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md hover:border-teal-500/80 active:scale-[0.98] ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 hover:bg-slate-850'
                      : 'bg-white border-slate-200/90 hover:bg-slate-50/50'
                  }`}
                >
                  {/* Top Bar */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-black tracking-tight leading-snug">
                            {table.name}
                          </h3>
                        </div>
                        <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {table.hall}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {/* Capacity & Waiter */}
                    <div className="flex items-center gap-3 text-xs mb-3">
                      <span className={`flex items-center gap-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Users className="w-3.5 h-3.5" />
                        {table.capacity} kishilik
                      </span>

                      {table.waiterName && (
                        <span className={`flex items-center gap-1 text-[11px] truncate ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                          <UserCheck className="w-3.5 h-3.5" />
                          {table.waiterName}
                        </span>
                      )}
                    </div>

                    {/* Active Order Summary (if occupied) */}
                    {isOccupied && (
                      <div
                        className={`p-2.5 rounded-2xl border mb-2 text-xs ${
                          isDark ? 'bg-amber-950/20 border-amber-900/50' : 'bg-amber-50/70 border-amber-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {table.occupiedSince || '12:00'} dan beri
                          </span>
                          {table.activeOrder?.orderNumber && (
                            <span className="font-mono text-[10px] font-bold text-slate-500">
                              #{table.activeOrder.orderNumber}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Jami hisob:
                          </span>
                          <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                            {formatCurrency(table.totalAmount || table.activeOrder?.total || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                    {/* POS Cashier Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTableForPos(table.name);
                      }}
                      className="flex-1 py-1.5 px-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
                      title="Kassada buyurtma ochish"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Kassa</span>
                    </button>

                    {/* Quick Status Action */}
                    {table.status === 'AVAILABLE' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateTableStatus(table.id, 'OCCUPIED');
                        }}
                        className={`px-2 py-1.5 rounded-xl text-xs font-bold border transition ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Band qilish"
                      >
                        Band
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateTableStatus(table.id, 'AVAILABLE');
                        }}
                        className="px-2 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition"
                        title="Stolni bo'shatish"
                      >
                        Bo&apos;sh
                      </button>
                    )}

                    {/* Edit button */}
                    <button
                      onClick={(e) => handleOpenEdit(table, e)}
                      className={`p-1.5 rounded-xl border transition ${
                        isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
                      }`}
                      title="Tahrirlash"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleRequestDelete(table, e)}
                      className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── DATA TABLE / LIST VIEW ── */
        <div
          className={`rounded-3xl border shadow-xs overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className={`border-b ${isDark ? 'bg-slate-850 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <tr>
                  <th className="py-3 px-4 font-bold">Stol Nomi</th>
                  <th className="py-3 px-4 font-bold">Zal / Hudud</th>
                  <th className="py-3 px-4 font-bold">Sig&apos;imi</th>
                  <th className="py-3 px-4 font-bold">Holat</th>
                  <th className="py-3 px-4 font-bold">Ofitsiant</th>
                  <th className="py-3 px-4 font-bold">Buyurtma Vaqti</th>
                  <th className="py-3 px-4 font-bold">Joriy Summa</th>
                  <th className="py-3 px-4 font-bold text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                {filteredTables.map((table) => {
                  const badge = getStatusBadge(table.status);
                  return (
                    <tr
                      key={table.id}
                      onClick={() => setSelectedTableForDetail(table)}
                      className={`cursor-pointer transition ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-3 px-4 font-black text-sm">{table.name}</td>
                      <td className="py-3 px-4">{table.hall}</td>
                      <td className="py-3 px-4 font-mono">{table.capacity} kishilik</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">{table.waiterName || '—'}</td>
                      <td className="py-3 px-4 font-mono">{table.occupiedSince ? `${table.occupiedSince} dan` : '—'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {table.totalAmount ? formatCurrency(table.totalAmount) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectTableForPos(table.name)}
                            className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>Kassa</span>
                          </button>
                          <button
                            onClick={(e) => handleOpenEdit(table, e)}
                            className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800"
                            title="Tahrirlash"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleRequestDelete(table, e)}
                            className="p-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                            title="O'chirish"
                          >
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
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. TABLE DETAIL SLIDE-OVER PANEL (Linear style)
      ───────────────────────────────────────────────────────────── */}
      {selectedTableForDetail && (
        <div className="fixed inset-0 z-50 flex justify-end select-none animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedTableForDetail(null)}
          />

          {/* Slide-over Container */}
          <div
            className={`relative w-full max-w-md h-full shadow-2xl border-l flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div>
              {/* Slide-over Header */}
              <div
                className={`p-5 border-b flex items-center justify-between ${
                  isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black">
                    <Armchair className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">{selectedTableForDetail.name}</h2>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {selectedTableForDetail.hall} • {selectedTableForDetail.capacity} kishilik
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTableForDetail(null)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                    isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Slide-over Body */}
              <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-170px)] custom-scrollbar">
                {/* Status Switcher Box */}
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Stol Holatini O&apos;zgartirish
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { status: 'AVAILABLE', label: "Bo'sh", color: 'hover:border-emerald-500' },
                      { status: 'OCCUPIED', label: 'Band', color: 'hover:border-amber-500' },
                      { status: 'RESERVED', label: 'Bron', color: 'hover:border-blue-500' },
                      { status: 'MAINTENANCE', label: 'Ta\'mirlash', color: 'hover:border-slate-500' },
                    ].map((st) => {
                      const isActive = selectedTableForDetail.status === st.status;
                      return (
                        <button
                          key={st.status}
                          onClick={() => {
                            onUpdateTableStatus(selectedTableForDetail.id, st.status as any);
                            setSelectedTableForDetail({
                              ...selectedTableForDetail,
                              status: st.status as any,
                            });
                          }}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                            isActive
                              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                              : isDark
                              ? 'bg-slate-900 border-slate-700 text-slate-300'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Order Details */}
                {selectedTableForDetail.activeOrder || selectedTableForDetail.status === 'OCCUPIED' ? (
                  <div
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b pb-2 dark:border-slate-700 border-slate-100">
                      <div>
                        <span className="font-mono text-sm font-black">
                          #{selectedTableForDetail.activeOrder?.orderNumber || 'K1-0842'}
                        </span>
                        <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Boshlangan: {selectedTableForDetail.occupiedSince || '12:45'}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900">
                        Tayyorlanmoqda
                      </span>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-1.5 text-xs">
                      {(selectedTableForDetail.activeOrder?.items || [
                        { name: "Toshkent To'y Oshi", quantity: 2, price: 38000 },
                        { name: 'Achichuk Salati', quantity: 2, price: 12000 },
                        { name: "Ko'k Choy 95 Choynak", quantity: 1, price: 6000 },
                      ]).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-dashed border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="font-semibold">{item.name}</span>
                            <span className={`block text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {item.quantity} x {formatCurrency(item.price)}
                            </span>
                          </div>
                          <span className="font-mono font-bold">
                            {formatCurrency(item.quantity * item.price)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Grand Total */}
                    <div className="pt-2 flex justify-between items-center border-t dark:border-slate-700 border-slate-100">
                      <span className="font-bold text-xs">Jami summa:</span>
                      <span className="font-mono text-base font-black text-teal-600 dark:text-teal-400">
                        {formatCurrency(
                          selectedTableForDetail.totalAmount || selectedTableForDetail.activeOrder?.total || 114000
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={`p-6 rounded-2xl border text-center text-xs ${isDark ? 'bg-slate-800/30 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    <Armchair className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>Ushbu stolda hozircha faol buyurtma yo&apos;q</p>
                    <p className="text-[10px] mt-1">Kassa orqali yangi buyurtma biriktirishingiz mumkin</p>
                  </div>
                )}
              </div>
            </div>

            {/* Slide-over Footer Actions */}
            <div
              className={`p-4 border-t flex items-center gap-2 ${
                isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <button
                onClick={() => {
                  onSelectTableForPos(selectedTableForDetail.name);
                  setSelectedTableForDetail(null);
                }}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 touch-press"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Kassaga O&apos;tish &amp; Hisoblash</span>
              </button>

              <button
                onClick={(e) => handleOpenEdit(selectedTableForDetail, e)}
                className={`p-3 rounded-xl border transition ${
                  isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                }`}
                title="Tahrirlash"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. ADD / EDIT TABLE MODAL
      ───────────────────────────────────────────────────────────── */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border space-y-4 animate-in fade-in duration-150 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800 border-slate-100">
              <h3 className="text-base font-black">
                {editingTable ? 'Stol Ma\'lumotlarini Tahrirlash' : 'Yangi Stol Qo\'shish'}
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTable} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold block mb-1">Stol Nomi yoki Raqami</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Masalan: Stol 12 yoki VIP Kabina 3"
                  className={`w-full px-3 py-2 border rounded-xl focus:ring-1 focus:ring-teal-500 focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Sig&apos;imi (Kishi)</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value) || 1)}
                    className={`w-full px-3 py-2 border rounded-xl font-mono focus:ring-1 focus:ring-teal-500 focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Zal / Hudud</label>
                  <select
                    value={formHall}
                    onChange={(e) => setFormHall(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl focus:ring-1 focus:ring-teal-500 focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Asosiy zal">Asosiy zal</option>
                    <option value="2-qavat">2-qavat</option>
                    <option value="VIP Kabina">VIP Kabina</option>
                    <option value="Yozgi ayvon">Yozgi ayvon</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Boshlang&apos;ich Holati</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-xl focus:ring-1 focus:ring-teal-500 focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="AVAILABLE">Bo&apos;sh (AVAILABLE)</option>
                  <option value="OCCUPIED">Band (OCCUPIED)</option>
                  <option value="RESERVED">Bron qilingan (RESERVED)</option>
                  <option value="MAINTENANCE">Xizmatdan tashqari (MAINTENANCE)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t dark:border-slate-800 border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-bold border transition ${
                    isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. DELETE CONFIRMATION DIALOG (With Safety Validation)
      ───────────────────────────────────────────────────────────── */}
      {tableToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border space-y-4 animate-in fade-in duration-150 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">Stolni O&apos;chirish</h3>
                <p className="text-[11px] text-slate-500">
                  Haqiqatan ham &quot;{tableToDelete.name}&quot; stolini o&apos;chirmoqchimisiz?
                </p>
              </div>
            </div>

            {/* Error Message if occupied */}
            {deleteErrorMessage ? (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {deleteErrorMessage}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Ushbu amalni ortga qaytarib bo&apos;lmaydi. Ushbu stol restoranning zal xaritasidan olib tashlanadi.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800 border-slate-100">
              <button
                onClick={() => setTableToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  isDark ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'
                }`}
              >
                Yopish
              </button>

              {!deleteErrorMessage && (
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition"
                >
                  O&apos;chirishni Tasdiqlash
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
