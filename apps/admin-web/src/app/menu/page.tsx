'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  FolderPlus,
  Eye,
  EyeOff,
  History,
  Tag,
  Barcode,
  Package,
  Clock,
  Flame,
  Star,
  Check,
  X,
  Layers,
  ArrowUpDown,
  Percent,
} from 'lucide-react';

// --- TIPIZATSIYA ---
export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export interface PriceHistoryRecord {
  id: string;
  oldPrice: number;
  newPrice: number;
  oldCostPrice?: number;
  newCostPrice?: number;
  changedBy: string;
  changeDate: string;
  reason: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  costPrice: number;
  discountPrice?: number;
  sku: string;
  barcode: string;
  unit: 'PORSIYA' | 'DONA' | 'KG' | 'GRAMM' | 'LITR' | 'KOMBO';
  stockQty: number;
  minStock: number;
  prepTime: number; // daqiqa
  isAvailable: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  imageUrl?: string;
  images?: string[];
  priceHistories?: PriceHistoryRecord[];
  createdAt?: string;
}

// Boshlang'ich Kategoriyalar
const initialCategories: CategoryItem[] = [
  { id: 'cat-1', name: 'Milliy Taomlar', icon: '🍲', sortOrder: 1, isActive: true },
  { id: 'cat-2', name: 'Shashliklar', icon: '🥩', sortOrder: 2, isActive: true },
  { id: 'cat-3', name: 'Fast Food & Non', icon: '🥪', sortOrder: 3, isActive: true },
  { id: 'cat-4', name: 'Ichimliklar', icon: '🥤', sortOrder: 4, isActive: true },
  { id: 'cat-5', name: 'Salatlar', icon: '🥗', sortOrder: 5, isActive: true },
  { id: 'cat-6', name: 'Shirinliklar', icon: '🍰', sortOrder: 6, isActive: true },
];

// Boshlang'ich Taomlar (Professional o'zbek oshxonasi menyusi)
const initialMenuItems: MenuItem[] = [
  {
    id: 'd-1',
    name: "Tandir Go'shtli Somsa",
    description: "Qo'y go'shti, dumba va piyoz bilan tandirda an'anaviy pishirilgan",
    categoryId: 'cat-3',
    price: 12000,
    costPrice: 7000,
    sku: 'SOM-001',
    barcode: '478001001001',
    unit: 'DONA',
    stockQty: 48,
    minStock: 15,
    prepTime: 10,
    isAvailable: true,
    isFeatured: true,
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=600&q=80'],
    priceHistories: [
      { id: 'ph-1', oldPrice: 10000, newPrice: 12000, changedBy: 'Admin (Rustam)', changeDate: '15.11.2026', reason: "Go'sht narxi oshgani sababli" }
    ]
  },
  {
    id: 'd-2',
    name: "Toshkent To'y Oshi",
    description: "Lazer guruch, mayin lahm go'sht, dumba, noxot, mayiz va qazi bilan",
    categoryId: 'cat-1',
    price: 38000,
    costPrice: 22000,
    discountPrice: 35000,
    sku: 'OSH-001',
    barcode: '478001001002',
    unit: 'PORSIYA',
    stockQty: 85,
    minStock: 20,
    prepTime: 5,
    isAvailable: true,
    isFeatured: true,
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80'],
    priceHistories: [
      { id: 'ph-2', oldPrice: 35000, newPrice: 38000, changedBy: 'Admin (Rustam)', changeDate: '01.11.2026', reason: 'Yangi mavsum lazer guruch' }
    ]
  },
  {
    id: 'd-3',
    name: "Qo'y Go'shti Shashlik (Kuskovoy)",
    description: "Sarxil qo'y go'shti va dumba bo'laklari, maxsus ziravorlar bilan",
    categoryId: 'cat-2',
    price: 24000,
    costPrice: 14500,
    sku: 'SHASH-001',
    barcode: '478001001003',
    unit: 'DONA',
    stockQty: 60,
    minStock: 10,
    prepTime: 15,
    isAvailable: true,
    isFeatured: true,
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80'],
    priceHistories: []
  },
  {
    id: 'd-4',
    name: "Qiyma Shashlik (Lyulya)",
    description: "Mayin mol va qo'y go'shti qiymasi, piyozli garnir bilan",
    categoryId: 'cat-2',
    price: 19000,
    costPrice: 11000,
    sku: 'SHASH-002',
    barcode: '478001001004',
    unit: 'DONA',
    stockQty: 50,
    minStock: 10,
    prepTime: 12,
    isAvailable: true,
    isFeatured: false,
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'],
    priceHistories: []
  },
  {
    id: 'd-5',
    name: "Ko'za Sho'rva",
    description: "Maxsus sopol ko'zada uzoq qaynatilgan qo'y go'shti va sabzavotlar",
    categoryId: 'cat-1',
    price: 32000,
    costPrice: 18000,
    sku: 'SHOR-001',
    barcode: '478001001005',
    unit: 'PORSIYA',
    stockQty: 18,
    minStock: 8,
    prepTime: 5,
    isAvailable: true,
    isFeatured: false,
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80'],
    priceHistories: []
  },
  {
    id: 'd-6',
    name: "Achchiq-chuchuk (Shakarob)",
    description: "Yupqa to'g'ralgan pomidor, piyoz, rayhon va qalampir",
    categoryId: 'cat-5',
    price: 12000,
    costPrice: 4000,
    sku: 'SAL-001',
    barcode: '478001001006',
    unit: 'PORSIYA',
    stockQty: 30,
    minStock: 10,
    prepTime: 5,
    isAvailable: true,
    isFeatured: false,
    isPopular: false,
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'],
    priceHistories: []
  },
  {
    id: 'd-7',
    name: "Apelsin Fresh Sharbati",
    description: "Yangi siqilgan 100% tabiiy apelsin meva sharbati",
    categoryId: 'cat-4',
    price: 22000,
    costPrice: 11000,
    sku: 'DRK-001',
    barcode: '478001001007',
    unit: 'DONA',
    stockQty: 5,
    minStock: 10, // Oz qoldi!
    prepTime: 3,
    isAvailable: true,
    isFeatured: false,
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80'],
    priceHistories: []
  },
  {
    id: 'd-8',
    name: "Coca-Cola 0.5L Muzdek",
    description: "Gazlangan salqin ichimlik shisha idishda",
    categoryId: 'cat-4',
    price: 9000,
    costPrice: 6200,
    sku: 'DRK-002',
    barcode: '5449000000996',
    unit: 'DONA',
    stockQty: 0,
    minStock: 20, // Tugagan!
    prepTime: 1,
    isAvailable: false,
    isFeatured: false,
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    images: ['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80'],
    priceHistories: []
  },
];

export default function ProductManagementPage() {
  // --- HOLATLAR (STATE) ---
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_categories');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* fallback */ }
      }
    }
    return initialCategories;
  });

  const [dishes, setDishes] = useState<MenuItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_dishes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Mavjud dish strukturasini MenuItem formatiga moslash
            return parsed.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description || '',
              categoryId: item.categoryId || 'cat-1',
              price: Number(item.price) || 0,
              costPrice: Number(item.costPrice) || Math.round(Number(item.price) * 0.6) || 0,
              discountPrice: item.discountPrice ? Number(item.discountPrice) : undefined,
              sku: item.sku || `SKU-${item.id}`,
              barcode: item.barcode || `47800100${item.id}`,
              unit: item.unit || 'PORSIYA',
              stockQty: item.stockQty !== undefined ? Number(item.stockQty) : 40,
              minStock: item.minStock !== undefined ? Number(item.minStock) : 10,
              prepTime: item.prepTime || 10,
              isAvailable: item.isAvailable !== false,
              isFeatured: !!item.isFeatured,
              isPopular: !!item.isPopular,
              imageUrl: item.imageUrl || item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
              images: item.images || [item.imageUrl || item.image],
              priceHistories: item.priceHistories || [],
            }));
          }
        } catch (e) { /* fallback */ }
      }
    }
    return initialMenuItems;
  });

  // Filtr va qidiruv holatlari
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'out_of_stock' | 'low_stock'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Ommaviy tanlash (Bulk selection)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modallar
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceEditingProduct, setPriceEditingProduct] = useState<MenuItem | null>(null);
  const [newSellingPrice, setNewSellingPrice] = useState<number>(0);
  const [newCostPrice, setNewCostPrice] = useState<number>(0);
  const [priceChangeReason, setPriceChangeReason] = useState<string>('');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('🍽️');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Xabarnoma (Toast notification)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- PERSISTENCE & SYNC ---
  const saveAndBroadcast = (updatedDishes: MenuItem[], updatedCategories?: CategoryItem[]) => {
    setDishes(updatedDishes);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pos_dishes', JSON.stringify(updatedDishes));
      } catch (err) {
        console.warn('localStorage quota reached, storing lightweight dishes cache', err);
        try {
          const lightweight = updatedDishes.map(d => ({
            ...d,
            images: d.images?.filter(img => !img.startsWith('data:image')) || [],
            imageUrl: d.imageUrl?.startsWith('data:image') ? '' : d.imageUrl,
          }));
          localStorage.setItem('pos_dishes', JSON.stringify(lightweight));
        } catch (e) {
          console.error('Failed to save to localStorage', e);
        }
      }
      if (updatedCategories) {
        try {
          localStorage.setItem('pos_categories', JSON.stringify(updatedCategories));
        } catch (e) {}
      }
      // POS Kassa terminali va boshqa oynalarga signal
      window.dispatchEvent(new CustomEvent('pos_menu_updated', {
        detail: { dishes: updatedDishes, categories: updatedCategories || categories }
      }));
    }
  };

  // Backend API dan yuklab ko'rish (agar NestJS server ishlayotgan bo'lsa)
  useEffect(() => {
    async function fetchFromBackend() {
      try {
        const res = await fetch('http://localhost:4000/menu-items');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Backend formatini MenuItem ga moslash
            const mapped: MenuItem[] = data.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description || '',
              categoryId: item.categoryId,
              price: Number(item.price),
              costPrice: Number(item.costPrice || 0),
              discountPrice: item.discountPrice ? Number(item.discountPrice) : undefined,
              sku: item.sku || `SKU-${item.id.slice(0, 5)}`,
              barcode: item.barcode || '',
              unit: item.unit || 'PORSIYA',
              stockQty: Number(item.stockQty || 0),
              minStock: Number(item.minStock || 5),
              prepTime: item.prepTime || 10,
              isAvailable: item.isAvailable,
              isFeatured: item.isFeatured,
              isPopular: item.isPopular,
              imageUrl: item.imageUrl || '',
              images: item.images || (item.imageUrl ? [item.imageUrl] : []),
              priceHistories: item.priceHistories || [],
            }));
            setDishes(mapped);
            if (typeof window !== 'undefined') {
              localStorage.setItem('pos_dishes', JSON.stringify(mapped));
            }
          }
        }
      } catch (err) {
        // Lokal rejimda davom etaveradi
      }
    }
    fetchFromBackend();
  }, []);

  // --- STATISTIKA HISOBLASH ---
  const stats = useMemo(() => {
    const total = dishes.length;
    const available = dishes.filter(d => d.isAvailable && d.stockQty > 0).length;
    const outOfStock = dishes.filter(d => !d.isAvailable || d.stockQty <= 0).length;
    const lowStock = dishes.filter(d => d.stockQty > 0 && d.stockQty <= d.minStock).length;
    const popular = dishes.filter(d => d.isPopular || d.isFeatured).length;

    // O'rtacha marja
    let totalMarginPercent = 0;
    let countedDishes = 0;
    dishes.forEach(d => {
      if (d.price > 0 && d.costPrice > 0) {
        const margin = ((d.price - d.costPrice) / d.price) * 100;
        totalMarginPercent += margin;
        countedDishes++;
      }
    });
    const avgMargin = countedDishes > 0 ? Math.round(totalMarginPercent / countedDishes) : 40;

    return { total, available, outOfStock, lowStock, popular, avgMargin };
  }, [dishes]);

  // --- FILTRLANGAN TAOMLAR ---
  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      // Qidiruv (nomi, SKU yoki barcode bo'yicha)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        dish.name.toLowerCase().includes(q) ||
        dish.sku.toLowerCase().includes(q) ||
        dish.barcode.toLowerCase().includes(q) ||
        dish.description.toLowerCase().includes(q);

      // Kategoriya
      const matchesCategory = selectedCategory === 'all' || dish.categoryId === selectedCategory;

      // Mavjudlik
      let matchesAvailability = true;
      if (availabilityFilter === 'available') {
        matchesAvailability = dish.isAvailable && dish.stockQty > 0;
      } else if (availabilityFilter === 'out_of_stock') {
        matchesAvailability = !dish.isAvailable || dish.stockQty <= 0;
      } else if (availabilityFilter === 'low_stock') {
        matchesAvailability = dish.stockQty > 0 && dish.stockQty <= dish.minStock;
      }

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [dishes, searchQuery, selectedCategory, availabilityFilter]);

  // --- HOLATNI O'ZGARTIRISH (TOGGLE AVAILABILITY) ---
  const handleToggleAvailability = (dishId: string) => {
    const updated = dishes.map(d => {
      if (d.id === dishId) {
        const nextState = !d.isAvailable;
        showToast(
          `"${d.name}" ${nextState ? 'sotuvga chiqarildi' : 'stop-listga olindi (sotuv to\'xtatildi)'}`,
          nextState ? 'success' : 'warning'
        );
        return { ...d, isAvailable: nextState };
      }
      return d;
    });
    saveAndBroadcast(updated);
  };

  // --- OMMAVIY AMALLAR (BULK ACTIONS) ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredDishes.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkAvailability = (makeAvailable: boolean) => {
    if (selectedIds.length === 0) return;
    const updated = dishes.map(d => {
      if (selectedIds.includes(d.id)) {
        return { ...d, isAvailable: makeAvailable };
      }
      return d;
    });
    saveAndBroadcast(updated);
    showToast(`${selectedIds.length} ta taom holati "${makeAvailable ? 'Sotuvda' : 'Stop-list'}" qilib belgilandi!`);
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const updated = dishes.filter(d => !selectedIds.includes(d.id));
    saveAndBroadcast(updated);
    showToast(`${selectedIds.length} ta taom o'chirildi (arxivlandi)`, 'warning');
    setSelectedIds([]);
  };

  // --- NARX O'ZGARTIRISH MODALI ---
  const openPriceModal = (dish: MenuItem) => {
    setPriceEditingProduct(dish);
    setNewSellingPrice(dish.price);
    setNewCostPrice(dish.costPrice);
    setPriceChangeReason('');
    setIsPriceModalOpen(true);
  };

  const handleSavePriceChange = () => {
    if (!priceEditingProduct) return;
    if (newSellingPrice <= 0) {
      showToast("Sotuv narxi 0 dan katta bo'lishi kerak!", "error");
      return;
    }

    const historyRecord: PriceHistoryRecord = {
      id: `ph-${Date.now()}`,
      oldPrice: priceEditingProduct.price,
      newPrice: newSellingPrice,
      oldCostPrice: priceEditingProduct.costPrice,
      newCostPrice: newCostPrice,
      changedBy: 'Admin (Kassa boshqaruvchi)',
      changeDate: new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      reason: priceChangeReason.trim() || "Mavsumiy narx korreksiyasi",
    };

    const updated = dishes.map(d => {
      if (d.id === priceEditingProduct.id) {
        return {
          ...d,
          price: newSellingPrice,
          costPrice: newCostPrice,
          priceHistories: [historyRecord, ...(d.priceHistories || [])],
        };
      }
      return d;
    });

    saveAndBroadcast(updated);
    showToast(`"${priceEditingProduct.name}" narxi ${newSellingPrice.toLocaleString()} so'mga yangilandi!`);
    setIsPriceModalOpen(false);
  };

  // --- TAOMNI O'CHIRISH (SOFT DELETE) ---
  const confirmDelete = (dishId: string) => {
    setDeletingProductId(dishId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteProduct = () => {
    if (!deletingProductId) return;
    const dishToDelete = dishes.find(d => d.id === deletingProductId);
    const updated = dishes.filter(d => d.id !== deletingProductId);
    saveAndBroadcast(updated);
    showToast(`"${dishToDelete?.name || 'Taom'}" muvaffaqiyatli o'chirildi!`, 'warning');
    setIsDeleteModalOpen(false);
    setDeletingProductId(null);
  };

  // --- TAOM QO'SHISH / TAHRIRLASH FORMASI ---
  const openAddProductModal = () => {
    setEditingProduct({
      id: `d-${Date.now()}`,
      name: '',
      description: '',
      categoryId: categories[0]?.id || 'cat-1',
      price: 25000,
      costPrice: 15000,
      discountPrice: undefined,
      sku: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      barcode: `47800100${Math.floor(1000 + Math.random() * 9000)}`,
      unit: 'PORSIYA',
      stockQty: 50,
      minStock: 10,
      prepTime: 10,
      isAvailable: true,
      isFeatured: false,
      isPopular: false,
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'],
      priceHistories: [],
    });
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (dish: MenuItem) => {
    setEditingProduct({ ...dish, images: dish.images || (dish.imageUrl ? [dish.imageUrl] : []) });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (product: MenuItem) => {
    if (!product.name.trim()) {
      showToast("Mahsulot nomi kiritilishi shart!", "error");
      return;
    }
    if (product.price <= 0) {
      showToast("Sotuv narxi 0 dan katta bo'lishi kerak!", "error");
      return;
    }

    const existingIndex = dishes.findIndex(d => d.id === product.id);
    let updated: MenuItem[];

    if (existingIndex >= 0) {
      // Agar narxi o'zgargan bo'lsa avtomatik narx tarixiga yozish
      const old = dishes[existingIndex];
      let histories = old.priceHistories || [];
      if (old.price !== product.price) {
        histories = [
          {
            id: `ph-${Date.now()}`,
            oldPrice: old.price,
            newPrice: product.price,
            oldCostPrice: old.costPrice,
            newCostPrice: product.costPrice,
            changedBy: 'Admin (Tahrirlash formasi)',
            changeDate: new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            reason: "Mahsulot kartasi tahrirlandi",
          },
          ...histories
        ];
      }

      const updatedItem = {
        ...product,
        imageUrl: product.images?.[0] || product.imageUrl,
        priceHistories: histories,
      };

      updated = [...dishes];
      updated[existingIndex] = updatedItem;
      showToast(`"${product.name}" ma'lumotlari yangilandi!`);
    } else {
      // Yangi qo'shish
      const newItem = {
        ...product,
        imageUrl: product.images?.[0] || product.imageUrl,
        priceHistories: [
          {
            id: `ph-${Date.now()}`,
            oldPrice: 0,
            newPrice: product.price,
            oldCostPrice: 0,
            newCostPrice: product.costPrice,
            changedBy: 'Admin',
            changeDate: new Date().toLocaleDateString('uz-UZ'),
            reason: "Dastlabki yaratilish",
          }
        ],
      };
      updated = [newItem, ...dishes];
      showToast(`Yangi taom "${product.name}" menyuga qo'shildi!`);
    }

    saveAndBroadcast(updated);
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // --- KATEGORIYA QO'SHISH / BOSHQARISH ---
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      showToast("Kategoriya nomi bo'sh bo'lishi mumkin emas!", "error");
      return;
    }
    const newCat: CategoryItem = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      icon: newCategoryIcon || '🍽️',
      sortOrder: categories.length + 1,
      isActive: true,
    };
    const updatedCats = [...categories, newCat];
    setCategories(updatedCats);
    saveAndBroadcast(dishes, updatedCats);
    setNewCategoryName('');
    showToast(`"${newCat.name}" kategoriyasi yaratildi!`);
  };

  const handleDeleteCategory = (catId: string) => {
    const hasDishes = dishes.some(d => d.categoryId === catId);
    if (hasDishes) {
      showToast("Bu kategoriyada taomlar mavjud! Avval taomlarni boshqa kategoriyaga ko'chiring.", "error");
      return;
    }
    const updatedCats = categories.filter(c => c.id !== catId);
    setCategories(updatedCats);
    saveAndBroadcast(dishes, updatedCats);
    showToast("Kategoriya o'chirildi!");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* --- TOAST XABARNOMA --- */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold transition-all transform animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toast.type === 'warning'
              ? 'bg-amber-500 text-white border-amber-400'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* --- 1. HEADER (SARLAVHA VA ASOSIY TUGMALAR) --- */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-orange-100 text-orange-600">
              <UtensilsCrossed className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Menyu va Mahsulotlar Boshqaruvi
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Taomlar katalogi, narxlar tahriri, ombor qoldiqlari va POS kassa sinxronizatsiyasi
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition border border-slate-200"
          >
            <FolderPlus className="w-4 h-4 text-slate-500" />
            <span>Kategoriyalar</span>
          </button>

          <button
            onClick={openAddProductModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-sm font-bold shadow-md shadow-orange-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Taom Qo'shish</span>
          </button>
        </div>
      </div>

      {/* --- 2. STATISTIKA KARTALARI (KPI CARDS) --- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Jami Mahsulotlar</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total} <span className="text-xs font-normal text-slate-400">ta</span></div>
          <p className="text-[11px] text-slate-500 mt-1">{categories.length} ta kategoriya bo'yicha</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Sotuvda Mavjud</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.available} <span className="text-xs font-normal text-slate-400">ta</span></div>
          <p className="text-[11px] text-slate-500 mt-1">Kassada buyurtma olinmoqda</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Stop-List (Tugagan)</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-600">{stats.outOfStock} <span className="text-xs font-normal text-slate-400">ta</span></div>
          <p className="text-[11px] text-slate-500 mt-1">Sotuv to'xtatilgan</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Kam Qolgan Ombor</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.lowStock} <span className="text-xs font-normal text-slate-400">ta</span></div>
          <p className="text-[11px] text-slate-500 mt-1">Min. qoldiqdan past</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-blue-600 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">O'rtacha Rentabellik</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-600">~{stats.avgMargin}% <span className="text-xs font-normal text-slate-400">marja</span></div>
          <p className="text-[11px] text-slate-500 mt-1">Sotuv va tannarx nisbati</p>
        </div>
      </div>

      {/* --- 3. QIDIRUV VA KO'P BOSQICHLI FILTRLAR PANELI --- */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Qidiruv input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Mahsulot nomi, SKU kodi yoki shtrix-kod bo'yicha qidiring..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mavjudlik holati filtri */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setAvailabilityFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                availabilityFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Barchasi ({dishes.length})
            </button>
            <button
              onClick={() => setAvailabilityFilter('available')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                availabilityFilter === 'available'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Sotuvda ({stats.available})
            </button>
            <button
              onClick={() => setAvailabilityFilter('out_of_stock')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                availabilityFilter === 'out_of_stock'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              Stop-List ({stats.outOfStock})
            </button>
            <button
              onClick={() => setAvailabilityFilter('low_stock')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                availabilityFilter === 'low_stock'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Kam qolgan ({stats.lowStock})
            </button>

            {/* Ko'rinish rejimi: Jadval vs Grid */}
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                title="Jadval ko'rinishi"
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Kartochkalar ko'rinishi"
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Kategoriyalar tabs (Gorizontal scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📋 Barcha Kategoriyalar
          </button>
          {categories.map((cat) => {
            const count = dishes.filter(d => d.categoryId === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- OMMAVIY AMALLAR SUZUVCHI PANELI (BULK FLOATING BAR) --- */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-30 flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-600 text-xs font-black">
              {selectedIds.length}
            </span>
            <span className="text-sm font-semibold">ta mahsulot tanlandi</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAvailability(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sotuvga chiqarish</span>
            </button>
            <button
              onClick={() => handleBulkAvailability(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold transition"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Stop-listga olish</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-rose-300 border border-slate-700 text-xs font-bold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>O'chirish</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Tanlovni bekor qilish"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- 4. MAHSULOTLAR RO'YXATI: JADVAL (TABLE) YOKI KARTALAR (GRID) --- */}
      {filteredDishes.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto text-2xl">
            🍽️
          </div>
          <h3 className="text-lg font-bold text-slate-800">Hech qanday mahsulot topilmadi</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Qidiruv so'rovi yoki filtr parametrlarini o'zgartirib ko'ring yoki yangi taom qo'shing.
          </p>
          <button
            onClick={openAddProductModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold shadow hover:bg-orange-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Taom Qo'shish</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* --- JADVAL KO'RINISHI (TABLE VIEW) --- */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredDishes.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                  </th>
                  <th className="p-4">Mahsulot & Kod</th>
                  <th className="p-4">Kategoriya</th>
                  <th className="p-4">Sotuv Narxi</th>
                  <th className="p-4">Tannarx & Marja</th>
                  <th className="p-4">Ombor Qoldig'i</th>
                  <th className="p-4">Holati</th>
                  <th className="p-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDishes.map((dish) => {
                  const category = categories.find(c => c.id === dish.categoryId);
                  const isLow = dish.stockQty > 0 && dish.stockQty <= dish.minStock;
                  const isOut = !dish.isAvailable || dish.stockQty <= 0;
                  const profit = dish.price - dish.costPrice;
                  const marginPercent = dish.price > 0 ? Math.round((profit / dish.price) * 100) : 0;
                  const isSelected = selectedIds.includes(dish.id);

                  return (
                    <tr
                      key={dish.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-orange-50/40' : ''
                      } ${!dish.isAvailable ? 'opacity-70 bg-slate-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(dish.id)}
                          className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                      </td>

                      {/* Mahsulot (Rasm, Nomi, SKU, Badge) */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                            <img
                              src={dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80'}
                              alt={dish.name}
                              className="w-full h-full object-cover"
                            />
                            {dish.isPopular && (
                              <span className="absolute top-0.5 right-0.5 p-0.5 bg-amber-500 text-white rounded-full text-[9px]" title="Ommabop / Xit">
                                <Flame className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{dish.name}</span>
                              {dish.isFeatured && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Tavsiya
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span className="font-mono text-slate-400">{dish.sku}</span>
                              {dish.barcode && (
                                <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                                  <Barcode className="w-3 h-3" /> {dish.barcode}
                                </span>
                              )}
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-0.5 text-slate-400">
                                <Clock className="w-3 h-3" /> {dish.prepTime} daq
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kategoriya */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700">
                          <span>{category?.icon || '🍽️'}</span>
                          <span>{category?.name || 'Kategoriyasiz'}</span>
                        </span>
                      </td>

                      {/* Sotuv narxi */}
                      <td className="p-4">
                        <div className="font-black text-slate-900">
                          {dish.price.toLocaleString()} so'm
                        </div>
                        {dish.discountPrice && (
                          <div className="text-xs text-rose-500 line-through">
                            {dish.discountPrice.toLocaleString()} so'm
                          </div>
                        )}
                      </td>

                      {/* Tannarx & Marja */}
                      <td className="p-4">
                        <div className="text-xs text-slate-600">
                          Tannarx: <span className="font-semibold">{dish.costPrice.toLocaleString()} so'm</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs mt-0.5">
                          <span className={`font-bold ${marginPercent >= 40 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            +{profit.toLocaleString()} so'm
                          </span>
                          <span className="text-[11px] text-slate-400">({marginPercent}%)</span>
                        </div>
                      </td>

                      {/* Ombor Qoldig'i */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${
                            dish.stockQty <= 0
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-slate-900'
                          }`}>
                            {dish.stockQty} {dish.unit.toLowerCase()}
                          </span>
                        </div>
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                            <AlertTriangle className="w-3 h-3" /> Kam qoldi
                          </span>
                        )}
                        {dish.stockQty <= 0 && (
                          <span className="text-[11px] text-rose-600 font-semibold">Tugagan</span>
                        )}
                      </td>

                      {/* Holati (Interactive Switch) */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleAvailability(dish.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            dish.isAvailable ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                          title={dish.isAvailable ? "Sotuvda faol (Bosib to'xtatish)" : "Stop-listda (Bosib faollashtirish)"}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                              dish.isAvailable ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`block text-[11px] font-semibold mt-1 ${
                          dish.isAvailable ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {dish.isAvailable ? 'Sotuvda' : 'Stop-List'}
                        </span>
                      </td>

                      {/* Amallar */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tezkor narx o'zgartirish */}
                          <button
                            onClick={() => openPriceModal(dish)}
                            className="p-2 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition"
                            title="Narxni o'zgartirish va tarixini ko'rish"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>

                          {/* Tahrirlash */}
                          <button
                            onClick={() => openEditProductModal(dish)}
                            className="p-2 rounded-xl text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition"
                            title="Taomni to'liq tahrirlash"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* O'chirish */}
                          <button
                            onClick={() => confirmDelete(dish.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Taomni o'chirish (Soft delete)"
                          >
                            <Trash2 className="w-4 h-4" />
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
      ) : (
        /* --- KARTALAR KO'RINISHI (GRID VIEW) --- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredDishes.map((dish) => {
            const category = categories.find(c => c.id === dish.categoryId);
            const isLow = dish.stockQty > 0 && dish.stockQty <= dish.minStock;
            const profit = dish.price - dish.costPrice;
            const marginPercent = dish.price > 0 ? Math.round((profit / dish.price) * 100) : 0;
            const isSelected = selectedIds.includes(dish.id);

            return (
              <div
                key={dish.id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  isSelected ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200/80'
                } ${!dish.isAvailable ? 'opacity-75' : ''}`}
              >
                <div>
                  {/* Rasm va Badjlar */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'}
                      alt={dish.name}
                      className="w-full h-full object-cover"
                    />

                    {/* Checkbox */}
                    <div className="absolute top-3 left-3 z-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(dish.id)}
                        className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 bg-white/90 shadow"
                      />
                    </div>

                    {/* Kategoriya badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold">
                      <span>{category?.icon}</span>
                      <span>{category?.name}</span>
                    </div>

                    {/* Xit / Tavsiya badge */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                      {dish.isPopular && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[10px] font-black shadow">
                          <Flame className="w-3 h-3" /> XIT
                        </span>
                      )}
                      {dish.isFeatured && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black shadow">
                          <Star className="w-3 h-3 fill-white" /> TAVSIYA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kontent */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-slate-900 truncate" title={dish.name}>{dish.name}</h4>
                        <span className="text-xs font-mono text-slate-400 shrink-0">{dish.sku}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]">
                        {dish.description || 'Tavsif kiritilmagan'}
                      </p>
                    </div>

                    {/* Narx va Marja */}
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Sotuv narxi:</span>
                        <span className="font-black text-slate-900 text-base">{dish.price.toLocaleString()} so'm</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Tannarx: {dish.costPrice.toLocaleString()} so'm</span>
                        <span className="font-bold text-emerald-600">Marja: {marginPercent}%</span>
                      </div>
                    </div>

                    {/* Ombor va Tayyorlanish */}
                    <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        Qoldiq: <b className={isLow ? 'text-amber-600' : 'text-slate-800'}>{dish.stockQty} {dish.unit.toLowerCase()}</b>
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {dish.prepTime} daqiqa
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pastki amallar */}
                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAvailability(dish.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        dish.isAvailable ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          dish.isAvailable ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {dish.isAvailable ? 'Faol' : 'Stop'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openPriceModal(dish)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                      title="Narx o'zgartirish"
                    >
                      <DollarSign className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditProductModal(dish)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition"
                      title="Tahrirlash"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirmDelete(dish.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          MODAL 1: YANDI TAOM QO'SHISH / TAHRIRLASH MODALI
          ======================================================== */}
      {isProductModalOpen && editingProduct && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onClose={() => setIsProductModalOpen(false)}
          onSave={handleSaveProduct}
        />
      )}

      {/* ========================================================
          MODAL 2: TEZKOR NARX O'ZGARTIRISH VA TARIX MODALI
          ======================================================== */}
      {isPriceModalOpen && priceEditingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Narxni O'zgartirish</h3>
                  <p className="text-xs text-slate-500">{priceEditingProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPriceModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Hozirgi Sotuv Narxi
                  </label>
                  <div className="p-3 bg-slate-100 rounded-xl font-bold text-slate-500 text-sm">
                    {priceEditingProduct.price.toLocaleString()} so'm
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Yangi Sotuv Narxi (so'm) *
                  </label>
                  <input
                    type="number"
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Hozirgi Tannarx
                  </label>
                  <div className="p-3 bg-slate-100 rounded-xl font-bold text-slate-500 text-sm">
                    {priceEditingProduct.costPrice.toLocaleString()} so'm
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Yangi Tannarx (so'm)
                  </label>
                  <input
                    type="number"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Marja hisoboti */}
              {newSellingPrice > 0 && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/60 flex items-center justify-between text-xs">
                  <span className="text-emerald-800 font-semibold">Yangi sof marja:</span>
                  <span className="text-emerald-700 font-black text-sm">
                    +{(newSellingPrice - newCostPrice).toLocaleString()} so'm (
                    {Math.round(((newSellingPrice - newCostPrice) / newSellingPrice) * 100)}%)
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Narx o'zgarish sababi (Audit logga yoziladi) *
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Go'sht narxi ko'tarildi / Yangi xomashyo"
                  value={priceChangeReason}
                  onChange={(e) => setPriceChangeReason(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Oldingi narxlar tarixi */}
              {priceEditingProduct.priceHistories && priceEditingProduct.priceHistories.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    Oldingi Narx O'zgarishlari Tarixi
                  </h4>
                  <div className="max-h-36 overflow-y-auto space-y-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                    {priceEditingProduct.priceHistories.map((h) => (
                      <div key={h.id} className="p-2 bg-white rounded-lg border border-slate-200 text-xs space-y-0.5">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-slate-500">{h.changeDate}</span>
                          <span className="text-slate-900">
                            {h.oldPrice.toLocaleString()} → <b className="text-emerald-600">{h.newPrice.toLocaleString()} so'm</b>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{h.reason}</span>
                          <span>{h.changedBy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsPriceModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSavePriceChange}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
              >
                Narxni Saqlash & Sinxronlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: KATEGORIYALARNI BOSHQARISH MODALI
          ======================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Kategoriyalarni Boshqarish</h3>
                  <p className="text-xs text-slate-500">Menyu guruhlari va tartibi</p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Yangi kategoriya qo'shish formasi */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-xs font-bold text-slate-700">Yangi Kategoriya Qo'shish</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ikonka (emoji, masalan 🥗)"
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  className="w-16 p-2.5 rounded-xl border border-slate-300 text-center text-lg"
                />
                <input
                  type="text"
                  placeholder="Kategoriya nomi (masalan: Desertlar)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Qo'shish</span>
                </button>
              </div>
            </div>

            {/* Mavjud kategoriyalar ro'yxati */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const count = dishes.filter(d => d.categoryId === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{cat.name}</div>
                        <div className="text-xs text-slate-400">{count} ta taom biriktirilgan</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Kategoriyani o'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: O'CHIRISHNI TASDIQLASH (SOFT DELETE MODAL)
          ======================================================== */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg text-slate-900">Taomni o'chirishni tasdiqlaysizmi?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ushbu mahsulot menyu va kassa ekranidan olib tashlanadi.
                <br />
                <b>Xavfsizlik:</b> Tarixiy buyurtmalar, cheklar va hisobotlar buzilmaydi (Soft delete).
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition"
              >
                Ha, O'chirilsin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================================
// YORDAMCHI KOMPONENT: YANDI TAOM YARATISH / TAHRIRLASH MODALI
// ====================================================================
function ProductFormModal({
  product,
  categories,
  onClose,
  onSave,
}: {
  product: MenuItem;
  categories: CategoryItem[];
  onClose: () => void;
  onSave: (product: MenuItem) => void;
}) {
  const [activeTab, setActiveTab] = useState<'main' | 'images' | 'pricing' | 'stock'>('main');

  // Form maydonlari
  const [formData, setFormData] = useState<MenuItem>({ ...product });
  const [newImageInput, setNewImageInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fayl yuklash (Kompyuterdan rasm tanlash)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Hajm tekshiruvi (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} hajmi 5MB dan katta!`);
        return;
      }
      // Format tekshiruvi
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert(`${file.name} faqat JPEG, PNG yoki WebP formatida bo'lishi kerak!`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const base64Url = loadEvent.target?.result as string;
        if (base64Url) {
          setFormData((prev) => {
            const currentImages = prev.images || [];
            return {
              ...prev,
              imageUrl: prev.imageUrl || base64Url,
              images: [...currentImages, base64Url],
            };
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Rasm URL qo'shish
  const handleAddImageUrl = () => {
    if (!newImageInput.trim()) return;
    setFormData((prev) => {
      const currentImages = prev.images || [];
      return {
        ...prev,
        imageUrl: prev.imageUrl || newImageInput.trim(),
        images: [...currentImages, newImageInput.trim()],
      };
    });
    setNewImageInput('');
  };

  // Rasmni o'chirish
  const handleRemoveImage = (index: number) => {
    setFormData((prev) => {
      const newImages = (prev.images || []).filter((_, i) => i !== index);
      return {
        ...prev,
        imageUrl: newImages[0] || '',
        images: newImages,
      };
    });
  };

  // Asosiy rasm qilib belgilash
  const handleSetPrimaryImage = (index: number) => {
    setFormData((prev) => {
      const images = prev.images || [];
      const selected = images[index];
      const rest = images.filter((_, i) => i !== index);
      return {
        ...prev,
        imageUrl: selected,
        images: [selected, ...rest],
      };
    });
  };

  // Dinamik marja hisoblash
  const profit = formData.price - formData.costPrice;
  const marginPercent = formData.price > 0 ? Math.round((profit / formData.price) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {product.name ? `Tahrirlash: ${product.name}` : "Yangi Mahsulot Qo'shish"}
              </h3>
              <p className="text-xs text-slate-500">Restoran kassa menyusiga yangi taom kiritish</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tablar */}
        <div className="flex items-center gap-2 border-b border-slate-100 py-3">
          <button
            onClick={() => setActiveTab('main')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'main' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>1. Asosiy Ma'lumotlar</span>
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'images' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>2. Rasmlar ({formData.images?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'pricing' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>3. Narx & Moliya</span>
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'stock' ? 'bg-orange-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>4. Ombor & Kodlar</span>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-5 px-1 space-y-4">
          {/* TAB 1: ASOSIY MA'LUMOTLAR */}
          {activeTab === 'main' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mahsulot Nomi *
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Samarqandcha Maxsus Palov"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategoriya *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tayyorlanish Vaqti (daqiqa)
                  </label>
                  <input
                    type="number"
                    value={formData.prepTime}
                    onChange={(e) => setFormData({ ...formData, prepTime: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mahsulot Tavsifi (Retsept / Tarkib)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tarkibi, masalliqlari va o'ziga xos ta'mi haqida..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Belgilar (Toggles) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">Mahsulot Maxsus Belgilari</span>

                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAvailable}
                      onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-xs font-bold text-slate-800">Sotuvda mavjud (Faol)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500" /> Ommabop / Xit
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" /> Tavsiya etiladi
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RASMLAR BOSHQARUVI */}
          {activeTab === 'images' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Kompyuterdan yuklash (Drag & drop zone) */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-orange-50/20 transition group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-800">Kompyuterdan rasm yuklash uchun bosing</h4>
                <p className="text-xs text-slate-500 mt-1">JPEG, PNG yoki WebP formatida (Maksimal 5MB)</p>
              </div>

              {/* Rasm URL bo'yicha kiritish */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Yoki to'g'ridan-to'g'ri rasm havolasini (URL) kiriting..."
                  value={newImageInput}
                  onChange={(e) => setNewImageInput(e.target.value)}
                  className="flex-1 p-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
                >
                  Qo'shish
                </button>
              </div>

              {/* Yuklangan rasmlar galereyasi */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Yuklangan Rasmlar ({formData.images?.length || 0})
                </span>

                {(!formData.images || formData.images.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">Hozircha hech qanday rasm yuklanmagan.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {formData.images.map((imgUrl, idx) => {
                      const isPrimary = imgUrl === formData.imageUrl || idx === 0;
                      return (
                        <div
                          key={idx}
                          className={`relative rounded-xl overflow-hidden border-2 group aspect-square bg-slate-100 ${
                            isPrimary ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200'
                          }`}
                        >
                          <img src={imgUrl} alt="Mahsulot rasmi" className="w-full h-full object-cover" />

                          {isPrimary && (
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-orange-600 text-white text-[9px] font-black shadow">
                              ASOSIY
                            </span>
                          )}

                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {!isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(idx)}
                                title="Asosiy rasm qilish"
                                className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-orange-50 text-xs font-bold shadow"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-500" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              title="O'chirish"
                              className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-xs font-bold shadow"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NARX VA MOLIYA */}
          {activeTab === 'pricing' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sotuv Narxi (so'm) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm font-black text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tannarx (so'm) *
                  </label>
                  <input
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm font-black text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chegirma / Aksiya Narxi (ixtiyoriy, so'm)
                </label>
                <input
                  type="number"
                  placeholder="Agar chegirmada bo'lmasa bo'sh qoldiring"
                  value={formData.discountPrice || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    discountPrice: e.target.value ? Number(e.target.value) : undefined
                  })}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Dinamik Foyda va Rentabellik Kalkulyatori */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 space-y-2">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Kutilayotgan Sof Foyda va Rentabellik (Marja):
                </span>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs text-emerald-700 block">1 ta porsiyadan sof foyda:</span>
                    <span className="text-xl font-black text-emerald-700">
                      +{profit.toLocaleString()} so'm
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-700 block">Rentabellik marjasi:</span>
                    <span className="text-xl font-black text-emerald-700">
                      {marginPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OMBOR VA SHTRIX-KOD */}
          {activeTab === 'stock' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mahsulot Kodi (SKU) *
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shtrix-Kod (Barcode)
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    O'lchov Birligi *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white"
                  >
                    <option value="PORSIYA">PORSIYA</option>
                    <option value="DONA">DONA</option>
                    <option value="KG">KG (Kilogramm)</option>
                    <option value="GRAMM">GRAMM</option>
                    <option value="LITR">LITR</option>
                    <option value="KOMBO">KOMBO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ombordagi Miqdor
                  </label>
                  <input
                    type="number"
                    value={formData.stockQty}
                    onChange={(e) => setFormData({ ...formData, stockQty: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minimal Qoldiq (Ogohlantirish)
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition"
          >
            Bekor qilish
          </button>

          <button
            type="button"
            onClick={() => onSave(formData)}
            className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition active:scale-95"
          >
            {product.name ? "O'zgarishlarni Saqlash" : "Yangi Taomni Yaratish"}
          </button>
        </div>
      </div>
    </div>
  );
}
