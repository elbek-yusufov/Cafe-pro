import React, { useState, useEffect, useMemo } from 'react';
import {
  Category,
  Dish,
  CartItem,
  TableItem,
  OrderRecord,
  InventoryItem,
  Employee,
  RestaurantSettings,
  DailyReport,
  SyncState,
  ActiveTab,
} from './types/pos';
import {
  initialTables,
  initialOrders,
  initialInventory,
  initialEmployees,
  initialDailyReport,
  defaultSettings,
} from './data/mockData';
import { Header } from './components/Header';
import { NavigationDrawer } from './components/NavigationDrawer';
import { ProductGrid } from './components/pos/ProductGrid';
import { ShoppingCart } from './components/pos/ShoppingCart';
import { ReceiptPreview } from './components/pos/ReceiptPreview';
import { PaymentModal } from './components/pos/PaymentModal';
import { PinLogin } from './components/PinLogin';

// Pages
import { DashboardPage } from './components/pages/DashboardPage';
import { OrdersPage } from './components/pages/OrdersPage';
import { TablesPage } from './components/pages/TablesPage';
import { KitchenPage } from './components/pages/KitchenPage';
import { ProductsPage } from './components/pages/ProductsPage';
import { InventoryPage } from './components/pages/InventoryPage';
import { FinancePage } from './components/pages/FinancePage';
import { EmployeesPage } from './components/pages/EmployeesPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { ApiError, NetworkError, SESSION_EXPIRED_EVENT, apiRequest, clearSession, getAccessToken } from './lib/api';
import { useServerMenu } from './lib/menu';

interface UserSession {
  id: string;
  name: string;
  username: string;
  role: string;
}

export default function App() {
  // 1. Auth State
  const [user, setUser] = useState<UserSession | null>(() => {
    // Sessiya faqat server bergan token bilan birga haqiqiy (eski demo sessiyalar bekor qilinadi)
    const saved = localStorage.getItem('pos_user');
    if (!saved || !getAccessToken()) {
      clearSession();
      return null;
    }
    try {
      return JSON.parse(saved);
    } catch {
      clearSession();
      return null;
    }
  });

  // 2. Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('kassa');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [mobilePosTab, setMobilePosTab] = useState<'grid' | 'cart' | 'receipt'>('grid');

  // 3. POS Kassa State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('fav');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Menyu (kategoriya + taomlar) — lokal server / PostgreSQL dan, real-time yangilanadi.
  // Menyu o'zgarganda savatdagi narxlar yangilanadi, sotuvdan olingan taomlar olib tashlanadi.
  const menu = useServerMenu(!!user, (freshDishes) => {
    // Callback har renderda yangilanadi, shuning uchun `cart` — joriy savat
    const byId = new Map(freshDishes.map((d) => [d.id, d]));
    const removed = cart.filter((item) => !byId.get(item.dishId)?.isAvailable).map((item) => item.name);
    setCart((prev) =>
      prev.flatMap((item) => {
        const dish = byId.get(item.dishId);
        if (!dish || !dish.isAvailable) return [];
        return [{ ...item, name: dish.name, price: dish.price }];
      }),
    );
    if (removed.length) {
      showNotification(`Sotuvda yo'q, savatdan olindi: ${removed.join(', ')}`, 'info');
    }
  });
  const categories: Category[] = menu.categories;
  const dishes: Dish[] = menu.dishes;
  const [selectedTable, setSelectedTable] = useState<string>('Stol 1');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // 4. Payment Modal & Order Number
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState<'CASH' | 'CARD' | 'QRIS' | 'MIXED'>('CASH');
  const [currentOrderNumber, setCurrentOrderNumber] = useState<string>(() => `K1-${Math.floor(1000 + Math.random() * 9000)}`);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // 5. App Data
  const [tables, setTables] = useState<TableItem[]>(initialTables);
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [settings, setSettings] = useState<RestaurantSettings>(() => {
    const saved = localStorage.getItem('pos_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [report, setReport] = useState<DailyReport>(initialDailyReport);

  // 6. Network & Offline Sync State
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    pendingCount: 0,
    lastSyncTime: '17:15',
    hasError: false,
  });

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => {
      setSyncState((prev) => ({
        ...prev,
        isOnline: true,
        lastSyncTime: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      }));
      showNotification('Tarmoqqa ulandi. Ma\'lumotlar yangilanmoqda...', 'info');
    };

    const handleOffline = () => {
      setSyncState((prev) => ({ ...prev, isOnline: false }));
      showNotification('Oflayn rejimga o\'tildi. Barcha buyurtmalar qurilma xotirasida saqlanadi.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Eski versiyadagi lokal (mock) menyu nusxasini tozalash — menyu endi faqat serverdan
  useEffect(() => {
    try {
      localStorage.removeItem('pos_dishes');
    } catch {
      /* storage bloklangan */
    }
  }, []);

  // Refresh token ham yaroqsiz bo'lsa — PIN ekraniga qaytish
  useEffect(() => {
    const onExpired = () => {
      setCart([]);
      setUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // Notification helper
  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Add Dish to Cart
  const handleAddDish = (dish: Dish) => {
    if (!dish.isAvailable) {
      showNotification(`"${dish.name}" hozir sotuvda yo'q`, 'info');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.dishId === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.dishId === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          dishId: dish.id,
          name: dish.name,
          price: dish.price,
          quantity: 1,
        },
      ];
    });
  };

  // Update Cart Quantity
  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove Item
  const handleRemoveItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  // Clear Cart
  const handleClearCart = () => {
    if (cart.length > 0 && confirm('Savatni tozalashni tasdiqlaysizmi?')) {
      setCart([]);
      setDiscountPercent(0);
    }
  };

  // Calculate Totals
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const serviceFee = useMemo(() => {
    if (orderType === 'TAKEAWAY') return 0;
    return Math.round((subtotal * settings.serviceFeePercent) / 100);
  }, [subtotal, settings.serviceFeePercent, orderType]);

  const discountAmount = useMemo(() => {
    return Math.round((subtotal * discountPercent) / 100);
  }, [subtotal, discountPercent]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal + serviceFee - discountAmount);
  }, [subtotal, serviceFee, discountAmount]);

  // Open Payment with specific method
  const handleSelectPayment = (method: 'CASH' | 'CARD' | 'QRIS' | 'MIXED') => {
    if (cart.length === 0) return;
    setActivePaymentMethod(method);
    setIsPaymentOpen(true);
  };

  // Complete Payment
  const handlePaymentSuccess = (paymentDetails: {
    method: 'CASH' | 'CARD' | 'QRIS' | 'MIXED';
    receivedAmount: number;
    changeAmount: number;
  }) => {
    setIsPaymentOpen(false);

    // Create completed order record
    const newOrder: OrderRecord = {
      id: `ord-${Date.now()}`,
      orderNumber: currentOrderNumber,
      table: orderType === 'DINE_IN' ? selectedTable : 'Olib ketish',
      type: orderType,
      status: 'PAID',
      createdAt: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      items: cart.map((c) => ({
        dishId: c.dishId,
        name: c.name,
        price: c.price,
        quantity: c.quantity,
      })),
      subtotal,
      tax: serviceFee,
      discount: discountAmount,
      total: grandTotal,
      paymentMethod: paymentDetails.method,
      cashierName: user?.name || 'Kassir',
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Update Daily Stats
    setReport((prev) => {
      const newTodaySales = prev.todaySales + grandTotal;
      const newOrderCount = prev.orderCount + 1;
      return {
        ...prev,
        todaySales: newTodaySales,
        orderCount: newOrderCount,
        averageCheck: Math.round(newTodaySales / newOrderCount),
        cashPayments: paymentDetails.method === 'CASH' ? prev.cashPayments + grandTotal : prev.cashPayments,
        cardPayments: paymentDetails.method === 'CARD' ? prev.cardPayments + grandTotal : prev.cardPayments,
        qrPayments: paymentDetails.method === 'QRIS' ? prev.qrPayments + grandTotal : prev.qrPayments,
      };
    });

    // Reset Cart & Generate Next Order Number
    setCart([]);
    setDiscountPercent(0);
    setCurrentOrderNumber(`K1-${Math.floor(1000 + Math.random() * 9000)}`);

    showNotification(`To'lov qabul qilindi (${paymentDetails.method}). Chek chiqarildi!`);
  };

  // Print Receipt Button Action
  const handlePrintReceipt = () => {
    if (cart.length === 0) return;
    try {
      window.print();
    } catch {
      // headless or non-browser environment fallback
    }
    showNotification(`Chek printerga yuborildi (#${currentOrderNumber})`, 'success');
  };

  // Sync Trigger
  const handleTriggerSync = () => {
    showNotification('Sinxronizatsiya amalga oshirildi!', 'success');
    setSyncState((prev) => ({
      ...prev,
      pendingCount: 0,
      lastSyncTime: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    }));
  };

  // Status updates
  const handleUpdateOrderStatus = (orderId: string, status: OrderRecord['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    showNotification('Buyurtma holati yangilandi!');
  };

  const handleUpdateTableStatus = (tableId: string, status: TableItem['status']) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status } : t))
    );
    showNotification('Stol holati yangilandi!');
  };

  const handleAddTable = (newTable: TableItem) => {
    setTables((prev) => [...prev, newTable]);
    showNotification(`Yangi "${newTable.name}" muvaffaqiyatli qo'shildi!`);
  };

  const handleUpdateTable = (updatedTable: TableItem) => {
    setTables((prev) => prev.map((t) => (t.id === updatedTable.id ? updatedTable : t)));
    showNotification(`"${updatedTable.name}" ma'lumotlari yangilandi!`);
  };

  const handleDeleteTable = (tableId: string) => {
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    showNotification('Stol restorandan o\'chirildi!');
  };

  const handleSelectTableForPos = (tableName: string) => {
    setSelectedTable(tableName);
    setOrderType('DINE_IN');
    setActiveTab('kassa');
  };

  const apiErrorText = (e: unknown) =>
    e instanceof NetworkError ? 'Lokal server bilan aloqa yo\'q' : e instanceof ApiError ? e.message : 'Kutilmagan xatolik';

  // "Tugadi" / "Mavjud" — serverda saqlanadi (ADMIN va CASHIER ruxsati bor)
  const handleToggleProductAvailability = async (dishId: string) => {
    const dish = dishes.find((d) => d.id === dishId);
    if (!dish) return;
    try {
      await apiRequest(`/menu-items/${dishId}/availability`, {
        method: 'PATCH',
        body: { isAvailable: !dish.isAvailable },
      });
      menu.patchDish(dishId, { isAvailable: !dish.isAvailable });
      showNotification(dish.isAvailable ? `"${dish.name}" sotuvdan olindi` : `"${dish.name}" yana sotuvda`);
    } catch (e) {
      showNotification(apiErrorText(e), 'info');
    }
  };

  // Taom qo'shish/tahrirlash — faqat ADMIN (server 403 qaytaradi). Natija socket orqali hamma kassaga tarqaladi.
  const handleAddProduct = async (newDish: Dish) => {
    try {
      await apiRequest('/menu-items', {
        method: 'POST',
        body: { name: newDish.name, price: newDish.price, categoryId: newDish.categoryId, unit: newDish.unit },
      });
      await menu.reload();
      showNotification('Yangi taom muvaffaqiyatli qo\'shildi!');
    } catch (e) {
      showNotification(apiErrorText(e), 'info');
    }
  };

  const handleUpdateProduct = async (updated: Dish) => {
    const current = dishes.find((d) => d.id === updated.id);
    try {
      if (current && current.price !== updated.price) {
        await apiRequest(`/menu-items/${updated.id}/price`, {
          method: 'PATCH',
          body: { newPrice: updated.price, reason: 'POS kassadan o\'zgartirildi' },
        });
      }
      await apiRequest(`/menu-items/${updated.id}`, {
        method: 'PATCH',
        body: { name: updated.name, categoryId: updated.categoryId, unit: updated.unit },
      });
      await menu.reload();
      showNotification('Taom ma\'lumotlari yangilandi!');
    } catch (e) {
      showNotification(apiErrorText(e), 'info');
    }
  };

  const handleAdjustStock = (itemId: string, newAmount: number) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, currentStock: newAmount } : item))
    );
    showNotification('Ombor qoldig\'i yangilandi!');
  };

  const handleToggleEmployeeStatus = (empId: string) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === empId ? { ...e, isActive: !e.isActive } : e))
    );
  };

  const handleSaveSettings = (newSettings: RestaurantSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pos_settings', JSON.stringify(newSettings));
    showNotification('Sozlamalar saqlandi!');
  };

  // If cashier is not logged in
  if (!user) {
    return <PinLogin onSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#f3f6f8] text-slate-800 font-sans select-none overflow-hidden touch-screen">
      {/* 1. Header (POS Logo, Order Type / Table, Tab pills, Online Status, Action Icons) */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        syncState={syncState}
        onTriggerSync={handleTriggerSync}
        cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
        userName={user.name}
        userRole={user.role}
        onLogout={() => {
          clearSession();
          setCart([]);
          setUser(null);
        }}
        onToggleNav={() => setIsNavOpen(true)}
        selectedTable={selectedTable}
        orderType={orderType}
        onSelectTable={setSelectedTable}
        onSelectOrderType={setOrderType}
      />

      {/* Slide-out Navigation Drawer for quick page switches */}
      <NavigationDrawer
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        syncState={syncState}
      />

      {/* Floating Notification */}
      {notification && (
        <div className="fixed top-18 right-6 z-50 bg-teal-700 text-white font-bold text-xs py-2.5 px-4 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* 2. Main Body Content */}
      <main className="flex-1 overflow-hidden">
        {/* TAB 1: KASSA (Main POS 3-Column Screen matching reference image) */}
        {activeTab === 'kassa' && (
          <div className="h-full p-3 lg:p-4 flex flex-col overflow-hidden">
            {/* Tablet/Mobile View Mode Switcher (shows on smaller displays) */}
            <div className="lg:hidden flex items-center justify-between mb-2 bg-white p-1 rounded-2xl border border-slate-200 shrink-0">
              <button
                onClick={() => setMobilePosTab('grid')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                  mobilePosTab === 'grid' ? 'bg-teal-600 text-white' : 'text-slate-600'
                }`}
              >
                Mahsulotlar
              </button>
              <button
                onClick={() => setMobilePosTab('cart')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition relative ${
                  mobilePosTab === 'cart' ? 'bg-teal-600 text-white' : 'text-slate-600'
                }`}
              >
                Savat ({cart.reduce((s, i) => s + i.quantity, 0)})
              </button>
              <button
                onClick={() => setMobilePosTab('receipt')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                  mobilePosTab === 'receipt' ? 'bg-teal-600 text-white' : 'text-slate-600'
                }`}
              >
                Chek
              </button>
            </div>

            {menu.error && (
              <div className="mb-2 flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-xl">
                <span>Menyuni serverdan yangilab bo&apos;lmadi: {menu.error}</span>
                <button onClick={menu.reload} className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg">
                  Qayta urinish
                </button>
              </div>
            )}

            {/* 3-Column Grid on Desktop / Wide Tablet (42% - 33% - 25% matching reference image) */}
            <div className="flex-1 flex gap-3 lg:gap-4 overflow-hidden">
              {/* Left Column: Product Grid (~42%) */}
              <div
                className={`w-full lg:w-[42%] h-full ${
                  mobilePosTab === 'grid' ? 'block' : 'hidden lg:block'
                }`}
              >
                <ProductGrid
                  categories={categories}
                  dishes={dishes}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={setSelectedCategoryId}
                  onAddDish={handleAddDish}
                />
              </div>

              {/* Center Column: Shopping Cart & Payment Options (~33%) */}
              <div
                className={`w-full lg:w-[33%] h-full ${
                  mobilePosTab === 'cart' ? 'block' : 'hidden lg:block'
                }`}
              >
                <ShoppingCart
                  cart={cart}
                  subtotal={subtotal}
                  serviceFee={serviceFee}
                  serviceFeePercent={settings.serviceFeePercent}
                  discountAmount={discountAmount}
                  discountPercent={discountPercent}
                  grandTotal={grandTotal}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  onClearCart={handleClearCart}
                  onSelectPayment={handleSelectPayment}
                  onSetDiscountPercent={setDiscountPercent}
                />
              </div>

              {/* Right Column: Receipt Preview (~25%) */}
              <div
                className={`w-full lg:w-[25%] h-full ${
                  mobilePosTab === 'receipt' ? 'block' : 'hidden lg:block'
                }`}
              >
                <ReceiptPreview
                  cart={cart}
                  subtotal={subtotal}
                  serviceFee={serviceFee}
                  discountAmount={discountAmount}
                  grandTotal={grandTotal}
                  orderNumber={currentOrderNumber}
                  tableName={selectedTable}
                  orderType={orderType}
                  cashierName={user.name}
                  settings={settings}
                  onPrintReceipt={handlePrintReceipt}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BUYURTMALAR (Orders) */}
        {activeTab === 'buyurtmalar' && (
          <OrdersPage
            orders={orders}
            onOpenOrder={(ord) => {
              showNotification(`Buyurtma tanlandi: ${ord.orderNumber}`);
            }}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        )}

        {/* TAB 3: STOLLAR (Tables) */}
        {activeTab === 'stollar' && (
          <TablesPage
            tables={tables}
            onSelectTableForPos={handleSelectTableForPos}
            onUpdateTableStatus={handleUpdateTableStatus}
            onAddTable={handleAddTable}
            onUpdateTable={handleUpdateTable}
            onDeleteTable={handleDeleteTable}
          />
        )}

        {/* TAB 4: OSHXONA (Kitchen KDS) */}
        {activeTab === 'oshxona' && (
          <KitchenPage orders={orders} onUpdateStatus={handleUpdateOrderStatus} />
        )}

        {/* TAB 5: MAHSULOTLAR (Products & Menu) */}
        {activeTab === 'mahsulotlar' && (
          <ProductsPage
            dishes={dishes}
            categories={categories}
            onToggleAvailability={handleToggleProductAvailability}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            canManageMenu={user.role === 'ADMIN'}
          />
        )}

        {/* TAB 6: OMBOR (Inventory) */}
        {activeTab === 'ombor' && (
          <InventoryPage inventory={inventory} onAdjustStock={handleAdjustStock} />
        )}

        {/* TAB 7: HISOBOTLAR (Dashboard & Analytics) */}
        {activeTab === 'hisobotlar' && (
          <DashboardPage
            report={report}
            recentOrders={orders.slice(0, 5)}
            onOpenOrder={(ord) => showNotification(`Chek #${ord.orderNumber}`)}
          />
        )}

        {/* TAB 8: XODIMLAR (Employees) */}
        {activeTab === 'xodimlar' && (
          <EmployeesPage employees={employees} onToggleStatus={handleToggleEmployeeStatus} />
        )}

        {/* TAB 9: SOZLAMALAR (Settings) */}
        {activeTab === 'sozlamalar' && (
          <SettingsPage settings={settings} onSaveSettings={handleSaveSettings} />
        )}
      </main>

      {/* 3. Payment Modal */}
      {isPaymentOpen && (
        <PaymentModal
          orderTotal={grandTotal}
          orderNumber={currentOrderNumber}
          tableName={orderType === 'DINE_IN' ? selectedTable : 'Olib ketish'}
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={handlePaymentSuccess}
          initialMethod={activePaymentMethod}
        />
      )}
    </div>
  );
}
