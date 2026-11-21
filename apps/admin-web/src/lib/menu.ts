'use client';

import { useEffect, useRef } from 'react';
import { createRealtimeSocket } from './socket';

export interface CategoryRow {
  id: string;
  name: string;
  nameRu?: string | null;
  color?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { menuItems: number };
}

export interface MenuItemRow {
  id: string;
  name: string;
  nameRu?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  costPrice: number;
  unit: UnitType;
  categoryId: string;
  kitchenStationId?: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  marginPercent?: number;
  category?: { id: string; name: string; color?: string | null };
}

export interface PriceHistoryRow {
  id: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  reason?: string | null;
  createdAt: string;
}

export type UnitType = 'PORTION' | 'KG' | 'GRAM' | 'LITRE' | 'ML' | 'PIECE';

export const UNIT_LABELS: Record<UnitType, string> = {
  PORTION: 'Porsiya',
  KG: 'kg',
  GRAM: 'gramm',
  LITRE: 'litr',
  ML: 'ml',
  PIECE: 'dona',
};

export function formatSom(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} so'm`;
}

/**
 * Menyu o'zgarganda (boshqa admin, POS "Tugadi" tugmasi va h.k.) ro'yxatni qayta yuklash.
 * Bir nechta hodisa ketma-ket kelsa, bitta yuklashga birlashtiriladi.
 */
export function useMenuRealtime(onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    const socket = createRealtimeSocket();
    let timer: ReturnType<typeof setTimeout> | null = null;
    socket.on('menu:updated', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 250);
    });
    return () => {
      if (timer) clearTimeout(timer);
      socket.disconnect();
    };
  }, []);
}
