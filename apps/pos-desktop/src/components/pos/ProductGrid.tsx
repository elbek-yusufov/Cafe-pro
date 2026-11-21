import React, { useState, useMemo } from 'react';
import { Search, Star, X } from 'lucide-react';
import { Category, Dish } from '../../types/pos';
import { formatCurrency } from '@oshxona/shared';
import { DishImage } from '../common/DishImage';

interface ProductGridProps {
  categories: Category[];
  dishes: Dish[];
  selectedCategoryId: string;
  onSelectCategory: (catId: string) => void;
  onAddDish: (dish: Dish) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  categories,
  dishes,
  selectedCategoryId,
  onSelectCategory,
  onAddDish,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      // Category filter
      let matchesCat = true;
      if (selectedCategoryId === 'fav') {
        matchesCat = !!dish.isFavorite;
      } else if (selectedCategoryId !== 'cat-all') {
        matchesCat = dish.categoryId === selectedCategoryId;
      }

      // Search filter
      const matchesSearch =
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dish.description && dish.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCat && matchesSearch;
    });
  }, [dishes, selectedCategoryId, searchQuery]);

  return (
    <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-200/90 shadow-xs flex flex-col h-full overflow-hidden select-none">
      {/* 1. Header: Product Grid Title & Search Bar (matches reference image) */}
      <div className="flex items-center justify-between gap-3 mb-3.5 shrink-0">
        <div>
          <h2 className="text-base lg:text-lg font-black tracking-tight text-slate-800">
            Mahsulotlar
          </h2>
          <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
            {filteredDishes.length} ta taom mavjud
          </p>
        </div>

        <div className="relative w-44 sm:w-60">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Taom qidirish..."
            className="w-full pl-8 pr-8 py-1.5 bg-slate-100 hover:bg-slate-50 border border-slate-200/90 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 focus:bg-white transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="w-4 h-4 rounded-full bg-slate-300 text-slate-600 hover:bg-slate-400 flex items-center justify-center absolute right-2.5 top-2 transition"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Category Filter Pills (matches reference image horizontal tabs) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 shrink-0 custom-scrollbar">
        {categories.map((cat) => {
          const isActive = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all touch-press ${
                isActive
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/90 hover:text-slate-800'
              }`}
            >
              {cat.id === 'fav' && <span className="mr-1 text-amber-300">★</span>}
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* 3. Product Cards Grid (3-column responsive grid matching reference image) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5">
        {filteredDishes.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-xs">
            <Search className="w-8 h-8 text-slate-300 mb-2 stroke-1" />
            <p className="font-semibold">Bunday taom topilmadi</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Boshqa so&apos;z bilan qidirib ko&apos;ring</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 lg:gap-3">
            {filteredDishes.map((dish) => (
              <div
                key={dish.id}
                onClick={() => onAddDish(dish)}
                aria-disabled={!dish.isAvailable}
                className={`group relative bg-white rounded-2xl p-2.5 border border-slate-200/80 transition-all flex flex-col justify-between touch-press ${
                  dish.isAvailable
                    ? 'hover:border-teal-500/80 hover:shadow-md active:scale-95 cursor-pointer'
                    : 'cursor-not-allowed'
                }`}
              >
                {/* Sotuvdan olingan (admin yoki kassir "Tugadi" belgilagan) */}
                {!dish.isAvailable && (
                  <span className="absolute top-3.5 left-3.5 z-10 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs pointer-events-none">
                    Tugagan
                  </span>
                )}
                {/* Favorite Star Badge */}
                {dish.isFavorite && (
                  <span className="absolute top-3.5 right-3.5 z-10 bg-amber-400/95 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5 pointer-events-none">
                    ★
                  </span>
                )}

                {/* Professional Food Photography Container */}
                <div className={`w-full aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-slate-100 relative ${dish.isAvailable ? '' : 'grayscale opacity-50'}`}>
                  <DishImage
                    type={dish.image ?? ''}
                    imageUrl={dish.imageUrl}
                    alt={dish.name}
                    className="w-full h-full"
                  />
                </div>

                {/* Details & Price Bar */}
                <div className={`space-y-1 ${dish.isAvailable ? '' : 'opacity-50'}`}>
                  <h4 className="text-xs lg:text-[13px] font-bold text-slate-800 leading-tight line-clamp-1 group-hover:text-teal-700 transition-colors">
                    {dish.name}
                  </h4>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-xs font-black text-teal-800 font-mono">
                      {formatCurrency(dish.price)}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center text-xs font-bold transition-all">
                      +
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
