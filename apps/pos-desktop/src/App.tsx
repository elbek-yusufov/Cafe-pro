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
import { defaultSettings } from './data/mockData';
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
import {
  ApprovalRequiredError,
  PaymentResult,
  ServerOrder,
  newClientOrderId,
  payOrder,
  printReceiptText,
  submitCart,
  useServerEmployees,
  useServerInventory,
  useServerOrders,
  useServerReport,
  useServerSettings,
  useServerTables,
} from './lib/pos-data';
import { SupervisorPinModal } from './components/pos/SupervisorPinModal';
import { enqueueOffline, flushOutbox, useConnectivity } from './lib/offline-queue';

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
  // Tanlangan stol — serverdagi stol IDsi
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // 4. Payment Modal & Order Number
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState<'CASH' | 'CARD' | 'QRIS' | 'MIXED'>('CASH');
  // Joriy (serverga yuborilgan, to'lanmagan) buyurtma va oxirgi chek
  const [checkoutOrder, setCheckoutOrder] = useState<ServerOrder | null>(null);
  const [lastReceipt, setLastReceipt] = useState<PaymentResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approvalFor, setApprovalFor] = useState<{ method: 'CASH' | 'CARD' | 'QRIS' | 'MIXED'; message: string } | null>(null);
  const clientOrderIdRef = React.useRef<string>(newClientOrderId());
  // Server mavjud bo'lmaganda: to'lov oynasi kassadagi (oldindan) summa bilan, natija oflayn navbatga
  const [offlineCheckout, setOfflineCheckout] = useState<{ id: string; total: number; cart: CartItem[] } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // 5. App Data
  // Stollar va buyurtmalar — lokal server (PostgreSQL), real-vaqt yangilanadi
  const serverTables = useServerTables(!!user);
  const tables: TableItem[] = serverTables.tables;
  const serverOrders = useServerOrders(!!user);
  const orders: OrderRecord[] = serverOrders.orders;
  // Ombor, xodimlar va hisobot — serverdan; rol ruxsat bermasa (403) ogohlantirish ko'rsatiladi
  const serverInventory = useServerInventory(!!user);
  const inventory: InventoryItem[] = serverInventory.data ?? [];
  const serverEmployees = useServerEmployees(!!user && ['OWNER', 'ADMIN'].includes(user?.role ?? ''));
  const employees: Employee[] = serverEmployees.data ?? [];
  // Qurilmaga xos sozlamalar (printer, avto-chop) — lokal; restoran/chek/xizmat haqi — serverdan
  const [localSettings, setSettings] = useState<RestaurantSettings>(() => {
    try {
      const saved = localStorage.getItem('pos_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });
  const serverSettings = useServerSettings(!!user, localSettings);
  const settings: RestaurantSettings = useMemo(() => {
    const r = serverSettings.raw;
    if (!Object.keys(r).length) return localSettings;
    return {
      ...localSettings,
      name: r.RESTAURANT_NAME || localSettings.name,
      address: r.RESTAURANT_ADDRESS ?? localSettings.address,
      phone: r.RESTAURANT_PHONE ?? localSettings.phone,
      taxNumber: r.RESTAURANT_TIN ?? localSettings.taxNumber,
      receiptHeader: r.RECEIPT_HEADER_NOTE ?? localSettings.receiptHeader,
      receiptFooter: r.RECEIPT_FOOTER_NOTE ?? localSettings.receiptFooter,
      serviceFeePercent: Number(r.SERVICE_FEE_PERCENT ?? 0) || 0,
      paperWidth: r.RECEIPT_PAPER_WIDTH === '58' ? '58mm' : '80mm',
    };
  }, [serverSettings.raw, localSettings]);

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const selectedTableName = selectedTable?.name || 'Stol tanlang';
  // Stollar yuklanganda birinchi bo'sh stolni tanlash
  useEffect(() => {
    if (!selectedTableId && tables.length) {
      setSelectedTableId((tables.find((t) => t.status === 'AVAILABLE') || tables[0]).id);
    }
  }, [tables, selectedTableId]);
  const serverReport = useServerReport(!!user && ['OWNER', 'ADMIN', 'MANAGER'].includes(user?.role ?? ''));
  const report: DailyReport = serverReport.data ?? {
    todaySales: 0,
    orderCount: 0,
    cashPayments: 0,
    cardPayments: 0,
    qrPayments: 0,
    averageCheck: 0,
    hourlySales: [],
  };

  // 6. Network & Offline Sync State
  // 6. Tarmoq holati: kassa LAN orqali LOKAL serverga bog'liq (internet emas) + oflayn navbat
  const connectivity = useConnectivity(!!user, (r) => {
    serverTables.reload();
    serverOrders.reload();
    if (r.sent) showNotification(`Oflayn saqlangan ${r.sent} ta buyurtma serverga yuborildi`);
    if (r.failed) showNotification(`${r.failed} ta oflayn buyurtma server tomonidan rad etildi — "Sinxron" tugmasini bosing`, 'info');
  });
  const outboxPending = connectivity.outbox.filter((e) => e.status === 'pending').length;
  const outboxFailed = connectivity.outbox.filter((e) => e.status === 'failed');
  const syncState: SyncState = {
    isOnline: connectivity.serverReachable,
    pendingCount: connectivity.outbox.length,
    lastSyncTime: connectivity.lastCheck
      ? new Date(connectivity.lastCheck).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
      : '—',
    hasError: outboxFailed.length > 0 || !connectivity.serverReachable,
    errorMessage: !connectivity.serverReachable
      ? 'Lokal server bilan aloqa yo\'q — yangi buyurtmalar qurilmada saqlanadi'
      : outboxFailed[0]?.error,
  };

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

  // Ko'rsatish uchun (serverdagi formula bilan bir xil: avval chegirma, keyin xizmat haqi).
  // Haqiqiy summa to'lovda SERVERDAN olinadi.
  const discountAmount = useMemo(() => {
    return Math.round((subtotal * discountPercent) / 100);
  }, [subtotal, discountPercent]);

  const serviceFee = useMemo(() => {
    if (orderType === 'TAKEAWAY') return 0;
    return Math.round(((subtotal - discountAmount) * settings.serviceFeePercent) / 100);
  }, [subtotal, discountAmount, settings.serviceFeePercent, orderType]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + serviceFee);
  }, [subtotal, serviceFee, discountAmount]);

  const errText = (e: unknown) =>
    e instanceof NetworkError ? 'Lokal server bilan aloqa yo\'q — buyurtma saqlanmadi' : e instanceof ApiError ? e.message : (e as Error)?.message || 'Kutilmagan xatolik';

  /**
   * To'lov tugmasi: savat serverga yuboriladi (yangi buyurtma yoki stolning ochiq buyurtmasiga qo'shiladi,
   * chegirma qo'llanadi, oshxonaga yuboriladi), so'ng SERVER hisoblagan summa bilan to'lov oynasi ochiladi.
   * Savat bo'sh bo'lsa-yu stolda ochiq buyurtma bo'lsa — o'sha stol hisobi to'lanadi.
   */
  const handleSelectPayment = async (method: 'CASH' | 'CARD' | 'QRIS' | 'MIXED', approverPin?: string) => {
    if (submitting) return;
    const existingOrderId = orderType === 'DINE_IN' ? selectedTable?.activeOrderId : undefined;
    if (cart.length === 0 && !existingOrderId) return;
    if (orderType === 'DINE_IN' && !selectedTable) {
      showNotification('Avval stolni tanlang', 'info');
      return;
    }
    setActivePaymentMethod(method);
    setSubmitting(true);
    try {
      const order =
        cart.length === 0 && existingOrderId
          ? await apiRequest<ServerOrder>(`/orders/${existingOrderId}`)
          : await submitCart({
              clientOrderId: clientOrderIdRef.current,
              cart,
              orderType,
              tableId: selectedTable?.id,
              existingOrderId,
              discountPercent,
              approverPin,
            });
      // Savatdagi taomlar endi serverda — savat tozalanadi (qayta yuborilmaydi)
      setCart([]);
      clientOrderIdRef.current = newClientOrderId();
      setCheckoutOrder(order);
      setIsPaymentOpen(true);
      serverTables.reload();
      serverOrders.reload();
    } catch (e) {
      if (e instanceof ApprovalRequiredError) {
        setApprovalFor({ method, message: e.message });
      } else if (e instanceof NetworkError && cart.length > 0) {
        // Lokal server yo'q — buyurtma qurilmada saqlanadi, server qaytganda avtomatik yuboriladi
        setOfflineCheckout({ id: clientOrderIdRef.current, total: grandTotal, cart });
        setIsPaymentOpen(true);
      } else if (e instanceof ApiError && e.status === 409) {
        // Stolda boshqa kassadan ochilgan buyurtma bor — yangilab, unga qo'shamiz
        await serverTables.reload();
        showNotification(`${e.message}. Qayta bosing — taomlar ochiq buyurtmaga qo'shiladi.`, 'info');
      } else {
        showNotification(errText(e), 'info');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const saveOffline = (payment?: { method: 'CASH' | 'CARD' | 'QRIS' | 'MIXED'; received: number }) => {
    if (!offlineCheckout) return;
    enqueueOffline({
      id: offlineCheckout.id,
      orderType,
      tableId: orderType === 'DINE_IN' ? selectedTable?.id : undefined,
      tableName: orderType === 'DINE_IN' ? selectedTable?.name : undefined,
      cart: offlineCheckout.cart,
      discountPercent,
      ...(payment ? { payment: { method: payment.method, received: payment.received, expectedTotal: offlineCheckout.total } } : {}),
    });
    setCart([]);
    setDiscountPercent(0);
    clientOrderIdRef.current = newClientOrderId();
    setOfflineCheckout(null);
    setIsPaymentOpen(false);
    showNotification('Server bilan aloqa yo\'q: buyurtma kassada saqlandi va aloqa tiklanganda avtomatik yuboriladi', 'info');
  };

  const handleClosePayment = () => {
    if (offlineCheckout) {
      saveOffline();
      return;
    }
    setIsPaymentOpen(false);
    if (checkoutOrder) {
      showNotification(`#${checkoutOrder.orderNumber} oshxonaga yuborildi — to'lov keyinroq (stol/buyurtmalar bo'limidan)`, 'info');
    }
    setCheckoutOrder(null);
  };

  // To'lovni serverda saqlash; xato bo'lsa PaymentModal ochiq qoladi va xabar ko'rsatadi
  const handlePaymentSuccess = async (paymentDetails: {
    method: 'CASH' | 'CARD' | 'QRIS' | 'MIXED';
    receivedAmount: number;
    changeAmount: number;
  }) => {
    if (offlineCheckout) {
      saveOffline({ method: paymentDetails.method, received: paymentDetails.receivedAmount });
      return;
    }
    if (!checkoutOrder) return;
    try {
      const result = await payOrder(checkoutOrder.id, paymentDetails.method, checkoutOrder.total, paymentDetails.receivedAmount);
      setLastReceipt(result);
      setIsPaymentOpen(false);
      setCheckoutOrder(null);
      setDiscountPercent(0);
      if (settings.autoPrintReceipt) {
        Promise.resolve(printReceiptText(result.receiptText, result.paperWidth)).then((r) => {
          if (r && !r.success) showNotification(`Chek chop etilmadi: ${r.error || 'printer xatosi'}`, 'info');
        });
      }
      showNotification(
        `To'lov qabul qilindi: #${result.orderNumber}${result.change > 0 ? ` · Qaytim ${result.change.toLocaleString('uz-UZ')} so'm` : ''}`,
      );
      serverTables.reload();
      serverOrders.reload();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const fresh = await apiRequest<ServerOrder>(`/orders/${checkoutOrder.id}`).catch(() => null);
        if (fresh?.status === 'PAID') {
          setIsPaymentOpen(false);
          setCheckoutOrder(null);
          showNotification(`#${fresh.orderNumber} allaqachon to'langan`, 'info');
          serverOrders.reload();
          return;
        }
        if (fresh) setCheckoutOrder(fresh); // summa o'zgargan — yangi summa ko'rsatiladi
      }
      throw new Error(errText(e));
    }
  };

  // Chek: oxirgi to'lov cheki (serverda yaratilgan matn) yoki savat bo'yicha oldindan hisob
  const handlePrintReceipt = () => {
    if (lastReceipt && cart.length === 0) {
      Promise.resolve(printReceiptText(lastReceipt.receiptText, lastReceipt.paperWidth)).then((r) => {
        if (r && !r.success) showNotification(`Chek chop etilmadi: ${r.error || 'printer xatosi'}`, 'info');
        else showNotification(`Chek chop etishga yuborildi (#${lastReceipt.orderNumber})`, 'success');
      });
      apiRequest(`/receipts/${lastReceipt.receiptId}/reprint`, { method: 'POST' }).catch(() => {});
      return;
    }
    if (cart.length === 0) return;
    try {
      window.print();
    } catch {
      // headless or non-browser environment fallback
    }
    showNotification('Oldindan hisob chop etishga yuborildi', 'success');
  };

  // Sync Trigger
  const handleTriggerSync = async () => {
    const r = await flushOutbox();
    await apiRequest('/sync/trigger', { method: 'POST' }).catch(() => undefined);
    await connectivity.check();
    serverTables.reload();
    serverOrders.reload();
    if (!connectivity.serverReachable) showNotification('Lokal server bilan aloqa yo\'q', 'info');
    else if (outboxFailed.length) showNotification(`Rad etilgan: ${outboxFailed.map((e) => e.error).join('; ')}`, 'info');
    else showNotification(r.sent ? `${r.sent} ta buyurtma yuborildi` : 'Hammasi sinxron', 'success');
  };

  // Status updates
  // Buyurtma holati: "Tayyorlanmoqda" = oshxonaga yuborish, "Tayyor" = oshxona taomlarini tayyor deb belgilash
  const handleUpdateOrderStatus = async (orderId: string, status: OrderRecord['status']) => {
    try {
      const order = await apiRequest<ServerOrder>(`/orders/${orderId}`);
      if (status === 'PREPARING') {
        await apiRequest(`/orders/${orderId}/send-kitchen`, { method: 'POST' });
      } else if (status === 'READY') {
        for (const it of order.items.filter((i) => i.status === 'COOKING')) {
          await apiRequest(`/orders/items/${it.id}/status`, { method: 'PATCH', body: { status: 'READY' } });
        }
      }
      serverOrders.reload();
      showNotification('Buyurtma holati yangilandi!');
    } catch (e) {
      showNotification(errText(e), 'info');
    }
  };

  // To'lanmagan buyurtmani ochish — to'lov oynasi server summasi bilan
  const handleOpenOrder = async (ord: OrderRecord) => {
    if (ord.status === 'PAID' || ord.status === 'CANCELLED') {
      showNotification(`#${ord.orderNumber}: ${ord.status === 'PAID' ? 'to\'langan' : 'bekor qilingan'}`, 'info');
      return;
    }
    try {
      const order = await apiRequest<ServerOrder>(`/orders/${ord.id}`);
      setOrderType(order.type === 'DINE_IN' ? 'DINE_IN' : 'TAKEAWAY');
      if (order.tableId) setSelectedTableId(order.tableId);
      setCheckoutOrder(order);
      setActiveTab('kassa');
      setIsPaymentOpen(true);
    } catch (e) {
      showNotification(errText(e), 'info');
    }
  };

  const handleUpdateTableStatus = async (tableId: string, status: TableItem['status']) => {
    try {
      await apiRequest(`/tables/${tableId}/status`, { method: 'PATCH', body: { status } });
      serverTables.reload();
    } catch (e) {
      showNotification(errText(e), 'info');
    }
  };

  const hallIdByName = (name: string) => serverTables.halls.find((h) => h.name === name)?.id || serverTables.halls[0]?.id;

  // Stol qo'shish/tahrirlash/o'chirish — faqat ADMIN (server tekshiradi)
  const handleAddTable = async (newTable: TableItem) => {
    try {
      await apiRequest('/tables', { method: 'POST', body: { name: newTable.name, capacity: newTable.capacity, hallId: hallIdByName(newTable.hall) } });
      serverTables.reload();
      showNotification('Yangi stol muvaffaqiyatli qo\'shildi!');
    } catch (e) {
      showNotification(errText(e), 'info');
    }
  };

  const handleUpdateTable = async (updatedTable: TableItem) => {
    try {
      await apiRequest(`/tables/${updatedTable.id}`, {
        method: 'PATCH',
        body: { name: updatedTable.name, capacity: updatedTable.capacity, hallId: hallIdByName(updatedTable.hall) },
      });
      serverTables.reload();
      showNotification('Stol ma\'lumotlari yangilandi!');
    } catch (e) {
      showNotification(errText(e), 'info');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    try {
      await apiRequest(`/tables/${tableId}`, { method: 'DELETE' });
      serverTables.reload();
      showNotification('Stol o\'chirildi');
    } catch (e) {
      showNotification(errText(e), 'info');
    }
  };

  const handleSelectTableForPos = (tableName: string) => {
    const t = tables.find((x) => x.name === tableName || x.id === tableName);
    if (t) setSelectedTableId(t.id);
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

  // Inventarizatsiya (haqiqiy qoldiqni kiritish) — server ADMIN/MANAGER ruxsatini tekshiradi
  const handleAdjustStock = async (itemId: string, newAmount: number) => {
    try {
      await apiRequest('/stock/inventory', {
        method: 'POST',
        body: { items: [{ ingredientId: itemId, actualQty: newAmount }], reason: 'POS dan inventarizatsiya' },
      });
      serverInventory.reload();
      showNotification('Ombor qoldig\'i yangilandi!');
    } catch (e) {
      showNotification(errText(e), 'info');
    }
  };

  const handleToggleEmployeeStatus = async (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    try {
      await apiRequest(`/users/${empId}`, { method: 'PATCH', body: { isActive: !emp.isActive } });
      serverEmployees.reload();
    } catch (e) {
      showNotification(errText(e), 'info');
    }
  };

  const restrictedNotice = (text: string) => (
    <div className="p-6">
      <div className="max-w-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold px-4 py-3 rounded-2xl">{text}</div>
    </div>
  );

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
        selectedTable={selectedTableId}
        tableOptions={tables.map((t) => ({ id: t.id, name: t.name, occupied: !!t.activeOrderId }))}
        orderType={orderType}
        onSelectTable={setSelectedTableId}
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
                  onSelectPayment={(m) => handleSelectPayment(m)}
                  onSetDiscountPercent={setDiscountPercent}
                  openTableTotal={orderType === 'DINE_IN' ? selectedTable?.totalAmount : undefined}
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
                  orderNumber={checkoutOrder?.orderNumber || (cart.length === 0 && lastReceipt ? lastReceipt.orderNumber : 'Yangi')}
                  tableName={selectedTableName}
                  orderType={orderType}
                  cashierName={user.name}
                  settings={settings}
                  onPrintReceipt={handlePrintReceipt}
                  canReprint={!!lastReceipt}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BUYURTMALAR (Orders) */}
        {activeTab === 'buyurtmalar' && (
          <OrdersPage
            orders={orders}
            onOpenOrder={handleOpenOrder}
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
          serverInventory.error ? restrictedNotice(`Omborni yuklab bo'lmadi: ${serverInventory.error}`) : (
            <InventoryPage inventory={inventory} onAdjustStock={handleAdjustStock} />
          )
        )}

        {/* TAB 7: HISOBOTLAR (Dashboard & Analytics) */}
        {activeTab === 'hisobotlar' && (
          !['OWNER', 'ADMIN', 'MANAGER'].includes(user.role) || serverReport.forbidden ? (
            restrictedNotice('Hisobotlar faqat menejer va administrator uchun. Admin paneldan ko\'ring.')
          ) : (
            <DashboardPage report={report} recentOrders={orders.slice(0, 5)} onOpenOrder={handleOpenOrder} />
          )
        )}

        {/* TAB 8: XODIMLAR (Employees) */}
        {activeTab === 'xodimlar' && (
          !['OWNER', 'ADMIN'].includes(user.role) || serverEmployees.forbidden ? (
            restrictedNotice('Xodimlarni boshqarish faqat administrator uchun (Admin panel → Xodimlar).')
          ) : (
            <EmployeesPage employees={employees} onToggleStatus={handleToggleEmployeeStatus} />
          )
        )}

        {/* TAB 9: SOZLAMALAR (Settings) */}
        {activeTab === 'sozlamalar' && (
          <SettingsPage settings={settings} onSaveSettings={handleSaveSettings} />
        )}
      </main>

      {/* 3. Payment Modal */}
      {isPaymentOpen && offlineCheckout && (
        <PaymentModal
          key={`offline-${offlineCheckout.id}`}
          orderTotal={offlineCheckout.total}
          orderNumber="OFLAYN"
          tableName={orderType === 'DINE_IN' ? selectedTableName : 'Olib ketish'}
          onClose={handleClosePayment}
          onSuccess={handlePaymentSuccess}
          initialMethod={activePaymentMethod}
        />
      )}

      {isPaymentOpen && checkoutOrder && (
        <PaymentModal
          key={`${checkoutOrder.id}-${checkoutOrder.total}`}
          orderTotal={checkoutOrder.total}
          orderNumber={checkoutOrder.orderNumber}
          tableName={checkoutOrder.table?.name || 'Olib ketish'}
          onClose={handleClosePayment}
          onSuccess={handlePaymentSuccess}
          initialMethod={activePaymentMethod}
        />
      )}

      {/* Kassir chegirma limitidan oshganda — admin PIN tasdig'i */}
      {approvalFor && (
        <SupervisorPinModal
          message={approvalFor.message}
          onCancel={() => setApprovalFor(null)}
          onSubmit={(pin) => {
            const method = approvalFor.method;
            setApprovalFor(null);
            handleSelectPayment(method, pin);
          }}
        />
      )}

      {submitting && (
        <div className="fixed inset-0 z-40 bg-white/40 flex items-center justify-center pointer-events-none">
          <div className="bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg">Buyurtma serverga yuborilmoqda…</div>
        </div>
      )}
    </div>
  );
}
