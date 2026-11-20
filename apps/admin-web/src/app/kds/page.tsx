'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  Flame,
  ChefHat,
  Bell,
  RefreshCw,
  Filter,
  CheckCheck,
  AlertTriangle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface KitchenItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  status: 'PENDING' | 'COOKING' | 'READY' | 'SERVED';
  notes?: string | null;
  modifiers?: Array<{ name: string; price: number }>;
  menuItem?: {
    id: string;
    kitchenStationId?: string | null;
  };
}

interface KitchenOrder {
  id: string;
  orderNumber: string;
  type: string;
  createdAt: string;
  status: string;
  notes?: string | null;
  table?: {
    name: string;
  } | null;
  items: KitchenItem[];
}

// Bepul sintetik audio signali (Oshxonada yangi buyurtma kelganda yoki kechikganda)
function playBeep(frequency = 750, durationMs = 250) {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch (e) {
    // Brauzer audio bloklagan bo'lsa
  }
}

export default function KdsPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedStation, setSelectedStation] = useState<string>('ALL');
  const [now, setNow] = useState<number>(Date.now());
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);

  // Vaqtni har 10 soniyada yangilab turish (taymerlar uchun)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // API dan ochiq oshxona buyurtmalarini olish
  const fetchKitchenOrders = async () => {
    try {
      setLoading(true);
      // Demo yoki serverdan olish
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch('http://localhost:3000/orders/kitchen/tickets', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        // Agar kds uchun demo ma'lumotlar kerak bo'lsa
        loadFallbackOrders();
      }
    } catch (err) {
      loadFallbackOrders();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackOrders = () => {
    const initialDemo: KitchenOrder[] = [
      {
        id: 'ord-101',
        orderNumber: 'K1-1120-0012',
        type: 'DINE_IN',
        createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
        status: 'COOKING',
        notes: 'Piyozsiz bo\'lsin',
        table: { name: 'T-3 (Asosiy zal)' },
        items: [
          { id: 'item-1', name: 'Toshkent To\'y Oshi (1 porsiya)', quantity: 2, unitPrice: 38000, status: 'COOKING', notes: 'Zirasi ko\'proq' },
          { id: 'item-2', name: 'Achichuk salati', quantity: 1, unitPrice: 12000, status: 'READY' },
          { id: 'item-3', name: 'Tandir non', quantity: 2, unitPrice: 5000, status: 'READY' },
        ],
      },
      {
        id: 'ord-102',
        orderNumber: 'K1-1120-0014',
        type: 'TAKEAWAY',
        createdAt: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
        status: 'COOKING',
        notes: 'Olib ketish uchun zich o\'rashing',
        table: null,
        items: [
          { id: 'item-4', name: 'Qozon kabob (mol go\'shti)', quantity: 3, unitPrice: 55000, status: 'COOKING', notes: 'Go\'shti qovurilganroq bo\'lsin' },
          { id: 'item-5', name: 'Qo\'y go\'shtli shashlik', quantity: 4, unitPrice: 18000, status: 'PENDING' },
          { id: 'item-6', name: 'Suzma ko\'katli', quantity: 2, unitPrice: 8000, status: 'READY' },
        ],
      },
      {
        id: 'ord-103',
        orderNumber: 'K1-1120-0015',
        type: 'DINE_IN',
        createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        status: 'SENT',
        table: { name: 'VIP-2 (Terrasa)' },
        items: [
          { id: 'item-7', name: 'Uyg\'ur Lag\'moni', quantity: 2, unitPrice: 42000, status: 'COOKING' },
          { id: 'item-8', name: 'Qovurma Chuchvara', quantity: 1, unitPrice: 32000, status: 'PENDING' },
        ],
      },
    ];
    setOrders(initialDemo);
  };

  // Socket.IO ulanishi
  useEffect(() => {
    fetchKitchenOrders();

    const socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Yangi chek yuborilganda
    socket.on('kitchen:new-ticket', () => {
      if (soundEnabled) playBeep(880, 400);
      fetchKitchenOrders();
    });

    // Taom holati o'zgarganda
    socket.on('kds:item-status', (payload: { itemId: string; status: any }) => {
      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: order.items.map((it) => (it.id === payload.itemId ? { ...it, status: payload.status } : it)),
        }))
      );
    });

    socket.on('order:updated', () => {
      fetchKitchenOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, [soundEnabled]);

  // Taom holatini bitta tugma bilan o'zgartirish (COOKING -> READY -> SERVED)
  const handleItemStatusToggle = async (orderId: string, itemId: string, currentStatus: string) => {
    let nextStatus: 'PENDING' | 'COOKING' | 'READY' | 'SERVED' = 'COOKING';
    if (currentStatus === 'PENDING') nextStatus = 'COOKING';
    else if (currentStatus === 'COOKING') nextStatus = 'READY';
    else if (currentStatus === 'READY') nextStatus = 'SERVED';
    else if (currentStatus === 'SERVED') nextStatus = 'READY';

    // Local state tezkor yangilanish
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          items: ord.items.map((it) => (it.id === itemId ? { ...it, status: nextStatus } : it)),
        };
      })
    );

    if (soundEnabled && nextStatus === 'READY') {
      playBeep(1040, 200);
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      await fetch(`http://localhost:3000/orders/items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (e) {
      // serverga ulanish offline bo'lsa ham UI ishlab turadi
    }
  };

  // Butun chekdagi barcha taomlarni "TAYYOR" deb belgilash
  const handleMarkAllReady = async (order: KitchenOrder) => {
    const updatedItems = order.items.map((it) => ({
      ...it,
      status: 'READY' as const,
    }));

    setOrders((prev) =>
      prev.map((ord) => (ord.id === order.id ? { ...ord, items: updatedItems } : ord))
    );

    if (soundEnabled) playBeep(1200, 300);

    for (const it of order.items) {
      if (it.status !== 'READY' && it.status !== 'SERVED') {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          await fetch(`http://localhost:3000/orders/items/${it.id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ status: 'READY' }),
          });
        } catch (e) {}
      }
    }
  };

  // Faol buyurtmalar hisob-kitobi
  const stats = useMemo(() => {
    let pendingCount = 0;
    let cookingCount = 0;
    let readyCount = 0;

    orders.forEach((ord) => {
      ord.items.forEach((it) => {
        if (it.status === 'PENDING') pendingCount += it.quantity;
        if (it.status === 'COOKING') cookingCount += it.quantity;
        if (it.status === 'READY') readyCount += it.quantity;
      });
    });

    return {
      totalTickets: orders.length,
      pendingCount,
      cookingCount,
      readyCount,
    };
  }, [orders]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* KDS Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Oshxona KDS Ekran
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
                title={isConnected ? 'Serverga ulangan (Online)' : 'Aloqa yo\'q'}
              />
            </h1>
            <p className="text-xs text-slate-400">Jonli buyurtmalar va taom tayyorlash paneli</p>
          </div>
        </div>

        {/* Tezkor Statistika */}
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Kutilmoqda: <strong className="text-amber-400 text-sm font-mono">{stats.pendingCount}</strong></span>
          </div>
          <div className="bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Qozonda/Mangalda: <strong className="text-orange-400 text-sm font-mono">{stats.cookingCount}</strong></span>
          </div>
          <div className="bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Tayyor: <strong className="text-emerald-400 text-sm font-mono">{stats.readyCount}</strong></span>
          </div>
        </div>

        {/* Boshqaruv tugmalari */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Ovozli signal"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Ovoz: Yoqiq' : 'Ovoz: O\'chiq'}</span>
          </button>

          <button
            onClick={fetchKitchenOrders}
            className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 transition"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Sex (Station) Filter Tabs */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'ALL', label: 'Barcha taomlar' },
          { id: 'HOT', label: '🍲 Qozon & Issiq sex' },
          { id: 'MANGAL', label: '🥩 Shashlik & Mangal' },
          { id: 'SALAD', label: '🥗 Salatlar & Sovuq' },
          { id: 'BAR', label: '☕ Choy & Bar' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStation(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedStation === tab.id
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Buyurtmalar Grid Maydoni */}
      <main className="flex-1 p-6 overflow-y-auto">
        {orders.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-500">
            <CheckCheck className="w-16 h-16 text-emerald-500/40 mb-3" />
            <h3 className="text-xl font-semibold text-slate-300">Barcha buyurtmalar tayyor!</h3>
            <p className="text-sm mt-1">Hozirda oshxonada faol kutayotgan taomlar yo&apos;q.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {orders.map((order) => {
              const elapsedMinutes = Math.floor(
                (now - new Date(order.createdAt).getTime()) / (1000 * 60)
              );
              const isUrgent = elapsedMinutes >= 15;
              const isWarning = elapsedMinutes >= 10 && elapsedMinutes < 15;

              const allReady = order.items.every((it) => it.status === 'READY' || it.status === 'SERVED');

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl flex flex-col justify-between overflow-hidden border transition-all duration-300 shadow-xl ${
                    allReady
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : isUrgent
                      ? 'bg-rose-950/30 border-rose-500/60 ring-2 ring-rose-500/40 animate-pulse'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-500/50'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className={`px-4 py-3 border-b flex items-center justify-between ${
                      allReady
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : isUrgent
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                        : isWarning
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black tracking-wide text-white">
                          #{order.orderNumber}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-300">
                          {order.table?.name || 'Olib ketish'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleTimeString('uz-UZ', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Elapsed Time Badge */}
                    <div
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black flex items-center gap-1.5 shadow ${
                        allReady
                          ? 'bg-emerald-500 text-slate-950'
                          : isUrgent
                          ? 'bg-rose-600 text-white animate-bounce'
                          : isWarning
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isUrgent && <AlertTriangle className="w-3.5 h-3.5" />}
                      <Clock className="w-3.5 h-3.5" />
                      <span>{elapsedMinutes} daq</span>
                    </div>
                  </div>

                  {/* Card Body — Items List */}
                  <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-[360px]">
                    {order.notes && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-3 py-2 rounded-lg font-medium">
                        📌 Eslatma: {order.notes}
                      </div>
                    )}

                    {order.items.map((item) => {
                      const isItemReady = item.status === 'READY';
                      const isItemCooking = item.status === 'COOKING';
                      const isItemServed = item.status === 'SERVED';

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleItemStatusToggle(order.id, item.id, item.status)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer select-none transition active:scale-[0.98] ${
                            isItemReady
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                              : isItemCooking
                              ? 'bg-orange-950/30 border-orange-500/40 text-orange-200'
                              : isItemServed
                              ? 'bg-slate-800/40 border-slate-700 text-slate-500 line-through'
                              : 'bg-slate-800/80 border-slate-700/80 text-white hover:border-slate-600'
                          }`}
                        >
                          <div className="flex-1 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                {item.quantity}x
                              </span>
                              <span className="font-semibold text-sm leading-snug">
                                {item.name}
                              </span>
                            </div>

                            {item.notes && (
                              <p className="text-[11px] text-amber-300/90 italic mt-1 ml-8">
                                • {item.notes}
                              </p>
                            )}
                          </div>

                          {/* Holat belgisi / Tugmasi */}
                          <div className="shrink-0">
                            {isItemReady && (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-1 shadow">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                TAYYOR
                              </span>
                            )}
                            {isItemCooking && (
                              <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-bold flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5" />
                                QOZONDA
                              </span>
                            )}
                            {item.status === 'PENDING' && (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                KUTILMOQDA
                              </span>
                            )}
                            {isItemServed && (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px] font-semibold">
                                BERILDI
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card Footer — Mark All Ready */}
                  <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleMarkAllReady(order)}
                      disabled={allReady}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                        allReady
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                      }`}
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>{allReady ? 'Barchasi tayyorlandi' : 'Barchasini tayyor deb belgilash'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
