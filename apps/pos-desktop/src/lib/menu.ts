import { useCallback, useEffect, useRef, useState } from 'react';
import { Category, Dish } from '../types/pos';
import { apiRequest, getApiBaseUrl } from './api';
import { acquireRealtimeSocket, releaseRealtimeSocket } from './socket';

/**
 * POS menyusi — lokal server (PostgreSQL) dan olinadi. Mock ma'lumot ishlatilmaydi.
 * Admin taom qo'shsa / narxni o'zgartirsa / sotuvdan olsa, server `menu:updated`
 * hodisasini yuboradi va menyu qayta yuklanadi.
 */

interface ApiCategory {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  sortOrder: number;
}

interface ApiMenuItem {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  unit: string;
  categoryId: string;
  isAvailable: boolean;
  isFeatured: boolean;
}

/** UI dagi virtual kategoriyalar (serverda yo'q) */
export const FAVORITES_CATEGORY_ID = 'fav';
export const ALL_CATEGORY_ID = 'cat-all';

export const UNIT_LABELS: Record<string, string> = {
  PORTION: 'Porsiya',
  KG: 'kg',
  GRAM: 'gramm',
  LITRE: 'litr',
  ML: 'ml',
  PIECE: 'dona',
};

export function resolveAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith('/') ? `${getApiBaseUrl()}${url}` : url;
}

function toDish(item: ApiMenuItem): Dish {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    categoryId: item.categoryId,
    unit: item.unit,
    isAvailable: item.isAvailable,
    // Rasm bo'lmasa — stok foto EMAS, neytral belgi ko'rsatiladi (demo rasm haqiqiy taomdek ko'rinmasligi uchun)
    image: '',
    imageUrl: resolveAssetUrl(item.imageUrl),
    isFavorite: item.isFeatured,
    description: item.description || undefined,
  };
}

function toCategories(rows: ApiCategory[]): Category[] {
  return [
    { id: FAVORITES_CATEGORY_ID, name: 'Sevimlilar', icon: '⭐', isFavorite: true },
    ...rows.map((c) => ({ id: c.id, name: c.name, icon: c.icon || undefined })),
    { id: ALL_CATEGORY_ID, name: 'Barchasi', icon: '📋' },
  ];
}

export async function fetchMenu(): Promise<{ categories: Category[]; dishes: Dish[] }> {
  const [cats, items] = await Promise.all([
    apiRequest<ApiCategory[]>('/categories'),
    apiRequest<ApiMenuItem[]>('/menu-items'),
  ]);
  return { categories: toCategories(cats), dishes: items.map(toDish) };
}

export interface MenuState {
  categories: Category[];
  dishes: Dish[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Server javobidan keyin bitta taomni lokal yangilash (masalan "Tugadi" tugmasi) */
  patchDish: (id: string, patch: Partial<Dish>) => void;
}

/**
 * @param enabled foydalanuvchi tizimga kirgandan keyingina true
 * @param onMenuChanged menyu serverdan qayta yuklanganda (savatni moslashtirish uchun)
 */
export function useServerMenu(enabled: boolean, onMenuChanged?: (dishes: Dish[]) => void): MenuState {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const changedRef = useRef(onMenuChanged);
  changedRef.current = onMenuChanged;

  const reload = useCallback(async () => {
    try {
      const menu = await fetchMenu();
      setCategories(menu.categories);
      setDishes(menu.dishes);
      setError(null);
      changedRef.current?.(menu.dishes);
    } catch (e) {
      // Oldingi (serverdan olingan) menyu saqlanib qoladi; mock ma'lumotga o'tilmaydi
      setError((e as Error).message || 'Menyuni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    reload();

    const socket = acquireRealtimeSocket();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(reload, 200);
    };
    socket.on('menu:updated', schedule);
    // Aloqa tiklanganda o'tkazib yuborilgan o'zgarishlarni olish
    socket.io.on('reconnect', schedule);
    return () => {
      if (timer) clearTimeout(timer);
      socket.off('menu:updated', schedule);
      socket.io.off('reconnect', schedule);
      releaseRealtimeSocket();
    };
  }, [enabled, reload]);

  const patchDish = useCallback((id: string, patch: Partial<Dish>) => {
    setDishes((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  return { categories, dishes, loading, error, reload, patchDish };
}
