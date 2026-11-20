'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Utensils,
  Bell,
  Receipt,
  Search,
  Plus,
  Minus,
  Clock,
  Sparkles,
  ShoppingBag,
  CheckCircle,
  X,
  PhoneCall,
  Info,
} from 'lucide-react';
import { formatCurrency } from '@oshxona/shared';

interface MenuItemVariant {
  id: string;
  name: string;
  price: number;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  unit: string;
  prepTimeMinutes?: number | null;
  variants: MenuItemVariant[];
}

interface MenuCategory {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  items: MenuItem[];
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variantName?: string;
}

function QrMenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table') || 'T-1';
  const hallParam = searchParams.get('hall') || 'Asosiy zal';

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Taomnoma ma'lumotlarini yuklash
  useEffect(() => {
    async function loadMenu() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:3000/guest/menu');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        } else {
          loadFallbackMenu();
        }
      } catch (e) {
        loadFallbackMenu();
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, []);

  const loadFallbackMenu = () => {
    const fallback: MenuCategory[] = [
      {
        id: 'cat-1',
        name: 'Milliy Taomlar',
        items: [
          {
            id: 'm-1',
            name: 'Toshkent To\'y Oshi',
            description: 'Devzira guruch, barra qo\'y go\'shti, sariq sabzi, bedana tuxum, noxot va mayiz bilan',
            price: 38000,
            isAvailable: true,
            unit: 'PORTION',
            prepTimeMinutes: 10,
            variants: [
              { id: 'v-1', name: '1 porsiya', price: 38000 },
              { id: 'v-2', name: '0.7 porsiya', price: 28000 },
            ],
          },
          {
            id: 'm-2',
            name: 'Qozon Kabob',
            description: 'Sarxil mol go\'shti va qovurilgan qarsildoq kartoshka, maxsus ziravorlar bilan',
            price: 55000,
            isAvailable: true,
            unit: 'PORTION',
            prepTimeMinutes: 20,
            variants: [],
          },
          {
            id: 'm-3',
            name: 'Uyg\'urcha Cho\'zma Lag\'mon',
            description: 'Qo\'lda cho\'zilgan xamir, barra go\'sht, jando va sabzavotli sous bilan',
            price: 42000,
            isAvailable: true,
            unit: 'PORTION',
            prepTimeMinutes: 15,
            variants: [],
          },
        ],
      },
      {
        id: 'cat-2',
        name: 'Shashliklar',
        items: [
          {
            id: 'm-4',
            name: 'Qo\'y go\'shtli Shashlik (Kuskovoy)',
            description: 'Gissar qo\'yi go\'shti va dumba bilan shirali pishirilgan',
            price: 18000,
            isAvailable: true,
            unit: 'PIECE',
            prepTimeMinutes: 15,
            variants: [],
          },
          {
            id: 'm-5',
            name: 'Qiyma Shashlik',
            description: 'Yumshoq qiymalangan barra mol va qo\'y go\'shti',
            price: 16000,
            isAvailable: true,
            unit: 'PIECE',
            prepTimeMinutes: 12,
            variants: [],
          },
        ],
      },
      {
        id: 'cat-3',
        name: 'Salatlar',
        items: [
          {
            id: 'm-6',
            name: 'Achichuk salati',
            description: 'Yozgi qizil pomidor, archilgan achchiq piyoz va rayhon',
            price: 12000,
            isAvailable: true,
            unit: 'PORTION',
            prepTimeMinutes: 5,
            variants: [],
          },
          {
            id: 'm-7',
            name: 'Bahor salati (Suzmali)',
            description: 'Bodring, rediska, ko\'katlar va sarxil suzma',
            price: 15000,
            isAvailable: true,
            unit: 'PORTION',
            prepTimeMinutes: 5,
            variants: [],
          },
        ],
      },
      {
        id: 'cat-4',
        name: 'Ichimliklar & Non',
        items: [
          {
            id: 'm-8',
            name: 'Ko\'k Choy (95)',
            description: 'Chin ko\'k choy, limon yoki novvot bilan',
            price: 6000,
            isAvailable: true,
            unit: 'PIECE',
            prepTimeMinutes: 3,
            variants: [],
          },
          {
            id: 'm-9',
            name: 'Issiq Patir Non',
            description: 'Tandirda qizargan sariyog\'li samarqandcha patir',
            price: 8000,
            isAvailable: true,
            unit: 'PIECE',
            prepTimeMinutes: 2,
            variants: [],
          },
        ],
      },
    ];
    setCategories(fallback);
  };

  // Ofitsiant chaqirish yoki hisob so'rash
  const handleCallStaff = async (type: 'WAITER' | 'BILL') => {
    const actionText = type === 'BILL' ? 'Hisob so\'rovi' : 'Ofitsiant chaqiruvi';
    setActionMessage(`${actionText} qabul qilindi. Xodimlarimiz yaqin orada kelishadi!`);

    setTimeout(() => {
      setActionMessage(null);
    }, 4500);

    try {
      await fetch('http://localhost:3000/guest/call-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: `${tableParam} (${hallParam})`,
          type,
        }),
      });
    } catch (e) {
      // Offline fallback
    }
  };

  // Savatga qo'shish
  const addToCart = (item: MenuItem, variant?: MenuItemVariant) => {
    const key = variant ? `${item.id}-${variant.id}` : item.id;
    const name = variant ? `${item.name} (${variant.name})` : item.name;
    const price = variant ? variant.price : item.price;

    setCart((prev) => {
      const existing = prev.find((i) => i.id === key);
      if (existing) {
        return prev.map((i) => (i.id === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: key, name, price, quantity: 1, variantName: variant?.name }];
    });
  };

  // Savatdan kamaytirish
  const removeFromCart = (key: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === key ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  // Filtrlar
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        if (selectedCatId !== 'ALL' && cat.id !== selectedCatId) return null;

        const filteredItems = cat.items.filter((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        if (filteredItems.length === 0) return null;
        return { ...cat, items: filteredItems };
      })
      .filter(Boolean) as MenuCategory[];
  }, [categories, selectedCatId, searchQuery]);

  const totalCartSum = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans pb-28 max-w-md mx-auto shadow-2xl relative">
      {/* Restoran Muqovasi (Hero Header) */}
      <div className="relative bg-gradient-to-b from-amber-600 to-amber-800 px-5 pt-8 pb-6 rounded-b-3xl text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-200 border border-white/30 shadow-inner">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">Rayhon Oshxonasi</h1>
              <p className="text-xs text-amber-100 font-medium mt-1">An&apos;anaviy Milliy Taomlar</p>
            </div>
          </div>

          <div className="bg-neutral-950/40 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full text-right shadow">
            <span className="text-[10px] text-amber-200 block font-semibold uppercase">Stol</span>
            <span className="text-sm font-black font-mono text-white">{tableParam}</span>
          </div>
        </div>

        {/* Tezkor chaqiruv tugmalari */}
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button
            onClick={() => handleCallStaff('WAITER')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/30 text-xs font-bold transition shadow-sm"
          >
            <Bell className="w-4 h-4 text-amber-200 animate-bounce" />
            <span>Ofitsiantni chaqirish</span>
          </button>
          <button
            onClick={() => handleCallStaff('BILL')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/30 text-xs font-bold transition shadow-sm"
          >
            <Receipt className="w-4 h-4 text-emerald-200" />
            <span>Hisobni so&apos;rash</span>
          </button>
        </div>
      </div>

      {/* Bildirishnoma Toasti */}
      {actionMessage && (
        <div className="mx-4 mt-3 p-3.5 bg-emerald-500 text-slate-950 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in font-bold text-xs">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Qidiruv Satri */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Taom yoki ichimlik qidirish..."
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700/80 rounded-2xl text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
      </div>

      {/* Kategoriya Pill Tabs */}
      <div className="px-4 mt-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedCatId('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            selectedCatId === 'ALL'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          Barchasi
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCatId === cat.id
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Taomlar Ro'yxati */}
      <main className="px-4 mt-4 space-y-6">
        {filteredCategories.map((cat) => (
          <div key={cat.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
              <h2 className="text-sm font-extrabold tracking-wide uppercase text-neutral-300">
                {cat.name}
              </h2>
            </div>

            <div className="space-y-3">
              {cat.items.map((item) => {
                const inCartItem = cart.find((i) => i.id === item.id);

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-neutral-800/90 border border-neutral-700/70 rounded-2xl flex flex-col justify-between transition shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-white leading-tight">
                          {item.name}
                        </h3>
                        <span className="font-mono text-sm font-black text-amber-400 shrink-0">
                          {formatCurrency(item.price)}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {item.prepTimeMinutes && (
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-2 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Tayyorlanishi: ~{item.prepTimeMinutes} daqiqa</span>
                        </div>
                      )}
                    </div>

                    {/* Variantlar yoki Oddiy Qo'shish */}
                    <div className="mt-3 pt-3 border-t border-neutral-700/60 flex items-center justify-between gap-2">
                      {item.variants.length > 0 ? (
                        <div className="flex flex-wrap gap-2 w-full">
                          {item.variants.map((v) => {
                            const vKey = `${item.id}-${v.id}`;
                            const vInCart = cart.find((i) => i.id === vKey);

                            return (
                              <button
                                key={v.id}
                                onClick={() => addToCart(item, v)}
                                className={`flex-1 py-1.5 px-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-between transition ${
                                  vInCart
                                    ? 'bg-amber-500 text-black border-amber-500'
                                    : 'bg-neutral-900 border-neutral-700 text-neutral-200 hover:border-amber-500'
                                }`}
                              >
                                <span>{v.name}</span>
                                <span className="font-mono text-xs">{formatCurrency(v.price)}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs text-neutral-400">1 {item.unit.toLowerCase()}</span>

                          {inCartItem ? (
                            <div className="flex items-center gap-2 bg-neutral-900 px-2 py-1 rounded-xl border border-neutral-700">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-400 active:scale-90"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono font-bold text-xs px-1 text-white">
                                {inCartItem.quantity}
                              </span>
                              <button
                                onClick={() => addToCart(item)}
                                className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-black active:scale-90 font-bold"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="py-1.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 active:scale-95 transition shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Qo&apos;shish</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {/* Floating Savat Bari (Pastda qotirilgan) */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
          <div
            onClick={() => setIsCartOpen(true)}
            className="p-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition font-bold"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black text-amber-400 flex items-center justify-center text-xs font-black font-mono shadow">
                {totalCartCount}
              </div>
              <div className="text-left">
                <span className="text-[11px] uppercase tracking-wider block opacity-90 leading-none">Tanlangan taomlar</span>
                <span className="text-sm font-black font-mono">{formatCurrency(totalCartSum)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-extrabold pr-1">
              <span>Ko&apos;rish</span>
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Savat Modali */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end">
          <div className="bg-neutral-900 border-t border-neutral-700 rounded-t-3xl p-5 max-w-md mx-auto w-full max-h-[85vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base text-white">Siz tanlagan taomlar</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-neutral-800/80 rounded-xl border border-neutral-700/60 flex items-center justify-between"
                >
                  <div className="pr-2">
                    <h4 className="font-bold text-xs text-white leading-tight">{item.name}</h4>
                    <span className="font-mono text-xs text-amber-400">
                      {formatCurrency(item.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-neutral-900 px-2 py-1 rounded-xl border border-neutral-700">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center text-amber-400"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold text-xs text-white">{item.quantity}</span>
                    <button
                      onClick={() =>
                        setCart((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
                        )
                      }
                      className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-medium">Jami summa:</span>
                <span className="font-mono text-lg font-black text-amber-400">
                  {formatCurrency(totalCartSum)}
                </span>
              </div>

              <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-700/60 text-xs text-neutral-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Ushbu ro&apos;yxatni ofitsiantga ko&apos;rsatishingiz yoki quyidagi tugma orqali ofitsiantni chaqirishingiz mumkin.
                </p>
              </div>

              <button
                onClick={() => {
                  handleCallStaff('WAITER');
                  setIsCartOpen(false);
                }}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-[0.98] transition"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Ofitsiantni chaqirish va buyurtma berish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QrMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-amber-400 font-mono">
          Taomnoma yuklanmoqda...
        </div>
      }
    >
      <QrMenuContent />
    </Suspense>
  );
}
