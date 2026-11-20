import { Category, Dish, TableItem, OrderRecord, InventoryItem, Employee, RestaurantSettings, DailyReport } from '../types/pos';

export const initialCategories: Category[] = [
  { id: 'fav', name: 'Sevimlilar', icon: '⭐', isFavorite: true },
  { id: 'cat-1', name: 'Milliy Taomlar', icon: '🍲' },
  { id: 'cat-2', name: 'Shashliklar', icon: '🥩' },
  { id: 'cat-3', name: 'Fast Food & Non', icon: '🥪' },
  { id: 'cat-4', name: 'Ichimliklar', icon: '🥤' },
  { id: 'cat-5', name: 'Salatlar', icon: '🥗' },
  { id: 'cat-all', name: 'Barchasi', icon: '📋' },
];

export const initialDishes: Dish[] = [
  {
    id: 'd-1',
    name: 'Tandir Go\'shtli Somsa',
    price: 12000,
    categoryId: 'cat-3',
    unit: 'DONA',
    isAvailable: true,
    isFavorite: true,
    image: 'somsa',
    description: 'Qo\'y go\'shti va dumba bilan tandirda pishirilgan'
  },
  {
    id: 'd-2',
    name: 'Meva Sharbat (Yovvoyi olcha)',
    price: 15000,
    categoryId: 'cat-4',
    unit: 'DONA',
    isAvailable: true,
    isFavorite: true,
    image: 'cherry_juice',
    description: 'Tabiiy meva sharbati shisha idishda'
  },
  {
    id: 'd-3',
    name: 'Klab Sendvich & Chips',
    price: 28000,
    categoryId: 'cat-3',
    unit: 'PORSIYA',
    isAvailable: true,
    isFavorite: true,
    image: 'sandwich',
    description: 'Tovuq filesi, pishloq va pomidor bilan'
  },
  {
    id: 'd-4',
    name: 'Apelsin Fresh Sharbati',
    price: 22000,
    categoryId: 'cat-4',
    unit: 'DONA',
    isAvailable: true,
    isFavorite: true,
    image: 'orange_fresh',
    description: 'Yangi siqilgan tabiiy apelsin sharbati'
  },
  {
    id: 'd-5',
    name: 'Kofe Kapuchino (Katta)',
    price: 18000,
    categoryId: 'cat-4',
    unit: 'DONA',
    isAvailable: true,
    isFavorite: true,
    image: 'coffee_cup',
    description: 'Arabica qahva donalaridan sutli kapuchino'
  },
  {
    id: 'd-6',
    name: 'Tushlik Kambo Paketi (Takeaway)',
    price: 45000,
    categoryId: 'cat-3',
    unit: 'KOMBO',
    isAvailable: true,
    isFavorite: true,
    image: 'takeaway_bag',
    description: 'Osh + Salat + Ichimlik + Non maxsus qadoqda'
  },
  {
    id: 'd-7',
    name: 'Toshkent To\'y Oshi',
    price: 38000,
    categoryId: 'cat-1',
    unit: 'PORSIYA',
    isAvailable: true,
    isFavorite: true,
    image: 'osh',
    description: 'Lazer guruch, mayiz, noxot va qazi bilan'
  },
  {
    id: 'd-8',
    name: 'Coca-Cola 0.5L Gazli',
    price: 9000,
    categoryId: 'cat-4',
    unit: 'DONA',
    isAvailable: true,
    isFavorite: true,
    image: 'cola_can',
    description: 'Muzdek gazlangan ichimlik'
  },
  {
    id: 'd-9',
    name: 'Qozon Kabob (Mol go\'shti)',
    price: 55000,
    categoryId: 'cat-1',
    unit: 'PORSIYA',
    isAvailable: true,
    isFavorite: true,
    image: 'qozon_kabob',
    description: 'Qovurilgan kartoshka va yumshoq mol go\'shti'
  },
  {
    id: 'd-10',
    name: 'Kuskovoy Shashlik (Qo\'y)',
    price: 18000,
    categoryId: 'cat-2',
    unit: 'SIX',
    isAvailable: true,
    isFavorite: false,
    image: 'shashlik',
    description: 'Sarxil qo\'y go\'shti dumba bo\'laklari bilan'
  },
  {
    id: 'd-11',
    name: 'Qiyma Shashlik',
    price: 16000,
    categoryId: 'cat-2',
    unit: 'SIX',
    isAvailable: true,
    isFavorite: false,
    image: 'shashlik',
    description: 'Klassik toshkentcha qiyma shashlik'
  },
  {
    id: 'd-12',
    name: 'Achichuk Salati',
    price: 12000,
    categoryId: 'cat-5',
    unit: 'PORSIYA',
    isAvailable: true,
    isFavorite: false,
    image: 'achichuk',
    description: 'Yangi yupqa to\'g\'ralgan pomidor va piyoz'
  },
  {
    id: 'd-13',
    name: 'Uyg\'ur Lag\'moni',
    price: 42000,
    categoryId: 'cat-1',
    unit: 'PORSIYA',
    isAvailable: true,
    isFavorite: false,
    image: 'lagmon',
    description: 'Cho\'zma xamir, sarxil sabzavotlar va go\'sht qaylasi'
  },
  {
    id: 'd-14',
    name: 'Ko\'k Choy 95 Choynak',
    price: 6000,
    categoryId: 'cat-4',
    unit: 'CHOYNAK',
    isAvailable: true,
    isFavorite: false,
    image: 'tea_pot',
    description: 'Limon va novvot bilan'
  },
  {
    id: 'd-15',
    name: 'Manti Go\'shtli (4 dona)',
    price: 36000,
    categoryId: 'cat-1',
    unit: 'PORSIYA',
    isAvailable: true,
    isFavorite: false,
    image: 'manti',
    description: 'Yupqa xamirli, mayin mol go\'shti va piyoz'
  }
];

export const initialTables: TableItem[] = [
  {
    id: 'T-1',
    name: 'Stol 1',
    capacity: 4,
    hall: 'Asosiy zal',
    status: 'OCCUPIED',
    occupiedSince: '12:45',
    totalAmount: 103400,
    waiterName: 'Azizbek Waiter',
    activeOrderId: 'ord-101',
    activeOrder: {
      orderNumber: 'K1-0842',
      startedAt: '12:45',
      waiter: 'Azizbek Waiter',
      items: [
        { name: 'Toshkent To\'y Oshi', quantity: 2, price: 38000 },
        { name: 'Achichuk Salati', quantity: 1, price: 12000 },
        { name: 'Ko\'k Choy 95 Choynak', quantity: 1, price: 6000 },
      ],
      total: 103400
    }
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
    totalAmount: 84700,
    waiterName: 'Rustambek',
    activeOrderId: 'ord-103',
    activeOrder: {
      orderNumber: 'K1-0844',
      startedAt: '13:10',
      waiter: 'Rustambek',
      items: [
        { name: 'Qozon Kabob (Mol go\'shti)', quantity: 1, price: 55000 },
        { name: 'Apelsin Fresh Sharbati', quantity: 1, price: 22000 },
      ],
      total: 84700
    }
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
        { name: 'Uyg\'ur Lag\'moni', quantity: 1, price: 42000 },
        { name: 'Ko\'k Choy', quantity: 1, price: 6000 },
      ],
      total: 48000
    }
  },
  { id: 'T-9', name: 'Stol 9', capacity: 4, hall: 'Yozgi ayvon', status: 'MAINTENANCE' },
  { id: 'VIP-1', name: 'VIP Zal 1', capacity: 12, hall: 'VIP Kabina', status: 'AVAILABLE' },
  { id: 'VIP-2', name: 'VIP Zal 2', capacity: 10, hall: 'VIP Kabina', status: 'RESERVED', waiterName: 'Azizbek Waiter' },
  { id: 'VIP-3', name: 'VIP Zal 3', capacity: 8, hall: 'VIP Kabina', status: 'AVAILABLE' },
];

export const initialOrders: OrderRecord[] = [
  {
    id: 'ord-101',
    orderNumber: 'K1-0842',
    table: 'Stol 1',
    type: 'DINE_IN',
    status: 'PREPARING',
    createdAt: '13:15',
    items: [
      { dishId: 'd-7', name: 'Toshkent To\'y Oshi', price: 38000, quantity: 2 },
      { dishId: 'd-12', name: 'Achichuk Salati', price: 12000, quantity: 1 },
      { dishId: 'd-14', name: 'Ko\'k Choy 95 Choynak', price: 6000, quantity: 1 },
    ],
    subtotal: 94000,
    tax: 9400,
    discount: 0,
    total: 103400,
    paymentMethod: 'CASH',
    cashierName: 'Dilshod Qosimov'
  },
  {
    id: 'ord-102',
    orderNumber: 'K1-0843',
    table: 'Olib ketish',
    type: 'TAKEAWAY',
    status: 'READY',
    createdAt: '13:22',
    items: [
      { dishId: 'd-1', name: 'Tandir Go\'shtli Somsa', price: 12000, quantity: 4 },
      { dishId: 'd-8', name: 'Coca-Cola 0.5L Gazli', price: 9000, quantity: 2 },
    ],
    subtotal: 66000,
    tax: 0,
    discount: 0,
    total: 66000,
    paymentMethod: 'QRIS',
    cashierName: 'Dilshod Qosimov'
  },
  {
    id: 'ord-103',
    orderNumber: 'K1-0844',
    table: 'Stol 4',
    type: 'DINE_IN',
    status: 'NEW',
    createdAt: '13:35',
    items: [
      { dishId: 'd-9', name: 'Qozon Kabob (Mol go\'shti)', price: 55000, quantity: 1 },
      { dishId: 'd-4', name: 'Apelsin Fresh Sharbati', price: 22000, quantity: 1 },
    ],
    subtotal: 77000,
    tax: 7700,
    discount: 0,
    total: 84700,
    cashierName: 'Dilshod Qosimov'
  },
  {
    id: 'ord-104',
    orderNumber: 'K1-0840',
    table: 'Stol 3',
    type: 'DINE_IN',
    status: 'PAID',
    createdAt: '12:50',
    items: [
      { dishId: 'd-13', name: 'Uyg\'ur Lag\'moni', price: 42000, quantity: 2 },
      { dishId: 'd-1', name: 'Tandir Go\'shtli Somsa', price: 12000, quantity: 2 },
    ],
    subtotal: 108000,
    tax: 10800,
    discount: 5000,
    total: 113800,
    paymentMethod: 'CARD',
    cashierName: 'Dilshod Qosimov'
  }
];

export const initialInventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Lazer Guruch (Sarxil)', currentStock: 45, minStock: 20, unit: 'kg', costPerUnit: 24000, category: 'Don mahsulotlari', lastUpdated: 'Bugun, 09:00' },
  { id: 'inv-2', name: 'Mol Go\'shti (Laqm)', currentStock: 32, minStock: 15, unit: 'kg', costPerUnit: 95000, category: 'Go\'sht', lastUpdated: 'Bugun, 08:30' },
  { id: 'inv-3', name: 'Qo\'y Go\'shti (Dumba bilan)', currentStock: 18, minStock: 10, unit: 'kg', costPerUnit: 105000, category: 'Go\'sht', lastUpdated: 'Bugun, 08:30' },
  { id: 'inv-4', name: 'Sariq Sabzi (Osh uchun)', currentStock: 8, minStock: 15, unit: 'kg', costPerUnit: 6000, category: 'Sabzavot', lastUpdated: 'Bugun, 09:15' }, // Kam qolgan
  { id: 'inv-5', name: 'Kungaboqar Yog\'i', currentStock: 35, minStock: 15, unit: 'litr', costPerUnit: 18000, category: 'Yog\'lar', lastUpdated: 'Kecha, 18:00' },
  { id: 'inv-6', name: 'Un (Oliy nav)', currentStock: 6, minStock: 25, unit: 'kg', costPerUnit: 8000, category: 'Xamir', lastUpdated: 'Bugun, 10:00' }, // Kam qolgan
  { id: 'inv-7', name: 'Arabica Kofe Donasi', currentStock: 12, minStock: 5, unit: 'kg', costPerUnit: 180000, category: 'Barchasi', lastUpdated: '18 Noyabr' },
  { id: 'inv-8', name: 'Apelsin (Fresh uchun)', currentStock: 22, minStock: 10, unit: 'kg', costPerUnit: 25000, category: 'Meva', lastUpdated: 'Bugun, 09:00' },
];

export const initialEmployees: Employee[] = [
  { id: 'emp-1', name: 'Dilshod Qosimov', role: 'CASHIER', phone: '+998 90 123 45 67', pin: '1111', isActive: true, branch: 'Markaziy Filial', currentShift: '08:00 - 20:00' },
  { id: 'emp-2', name: 'Jasur Aliyev', role: 'CASHIER', phone: '+998 93 234 56 78', pin: '2222', isActive: false, branch: 'Markaziy Filial' },
  { id: 'emp-3', name: 'Rustam Oshpaz', role: 'CHEF', phone: '+998 97 345 67 89', pin: '3333', isActive: true, branch: 'Markaziy Filial', currentShift: '07:30 - 19:30' },
  { id: 'emp-4', name: 'Azizbek Waiter', role: 'WAITER', phone: '+998 91 456 78 90', pin: '4444', isActive: true, branch: 'Markaziy Filial', currentShift: '09:00 - 21:00' },
  { id: 'emp-5', name: 'Bosh Boshqaruvchi', role: 'ADMIN', phone: '+998 99 999 00 00', pin: '0000', isActive: true, branch: 'Bosh Idora' },
];

export const initialDailyReport: DailyReport = {
  todaySales: 3838800,
  orderCount: 42,
  cashPayments: 1980000,
  cardPayments: 1420000,
  qrPayments: 438800,
  averageCheck: 91400,
  hourlySales: [
    { hour: '09:00', amount: 120000 },
    { hour: '10:00', amount: 280000 },
    { hour: '11:00', amount: 490000 },
    { hour: '12:00', amount: 950000 },
    { hour: '13:00', amount: 1120000 },
    { hour: '14:00', amount: 620000 },
    { hour: '15:00', amount: 260000 },
  ]
};

export const defaultSettings: RestaurantSettings = {
  name: 'Rayhon Milliy Taomlar',
  phone: '+998 71 200 00 11',
  address: 'Toshkent sh., Navoiy shoh ko\'chasi, 24-uy',
  taxNumber: '304 921 845',
  receiptHeader: 'Tashrifingiz uchun rahmat!',
  receiptFooter: 'Bizni tanlaganingizdan mamnunmiz! Yoqimli ishtaha!',
  serviceFeePercent: 10,
  currency: 'so\'m',
  autoPrintReceipt: true,
  printerType: 'USB',
  paperWidth: '80mm',
  enabledPayments: {
    cash: true,
    card: true,
    qris: true,
    mixed: true
  }
};
