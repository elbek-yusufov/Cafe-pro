import React from 'react';
import { Minus, Plus, X, Trash2, Banknote, QrCode, CreditCard, Layers } from 'lucide-react';
import { CartItem } from '../../types/pos';
import { formatCurrency } from '@oshxona/shared';

interface ShoppingCartProps {
  cart: CartItem[];
  subtotal: number;
  serviceFee: number;
  serviceFeePercent: number;
  discountAmount: number;
  discountPercent: number;
  grandTotal: number;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onSelectPayment: (method: 'CASH' | 'CARD' | 'QRIS' | 'MIXED') => void;
  onSetDiscountPercent: (percent: number) => void;
  /** Stolda ochiq (to'lanmagan) hisob summasi — savat bo'sh bo'lsa ham to'lash mumkin */
  openTableTotal?: number;
}

export const ShoppingCart: React.FC<ShoppingCartProps> = ({
  cart,
  subtotal,
  serviceFee,
  serviceFeePercent,
  discountAmount,
  discountPercent,
  grandTotal,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSelectPayment,
  onSetDiscountPercent,
  openTableTotal,
}) => {
  return (
    <div className="flex flex-col h-full gap-3 select-none">
      {/* 1. TOP CARD: Shopping Cart Items & Totals (matches reference image center card) */}
      <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-200/90 shadow-xs flex-1 flex flex-col justify-between overflow-hidden">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-base lg:text-lg font-black tracking-tight text-slate-800">
              Savat
            </h2>
            {cart.length > 0 && (
              <button
                onClick={onClearCart}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
                title="Savatni tozalash"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Table Header Bar (Teal bar matching reference image) */}
          <div className="bg-teal-600 text-white rounded-xl px-3 py-1.5 flex items-center justify-between text-xs font-bold mb-2 shrink-0">
            <span className="w-5/12 text-left">Mahsulot</span>
            <span className="w-4/12 text-center">Soni</span>
            <span className="w-3/12 text-right">Narxi</span>
          </div>

          {/* Items List */}
          <div className="overflow-y-auto max-h-[calc(100vh-390px)] min-h-[160px] custom-scrollbar space-y-2 pr-0.5">
            {cart.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs">
                <p>Savat bo&apos;sh</p>
                <p className="text-[10px] text-slate-400 mt-1">Mahsulotni qo&apos;shish uchun bosing</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="py-1.5 border-b border-slate-100 flex items-center justify-between text-xs"
                >
                  {/* Name & Note */}
                  <div className="w-5/12 pr-1">
                    <p className="font-bold text-slate-800 leading-snug line-clamp-1">{item.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  {/* Quantity Stepper (Minus, Qty, Teal Plus) */}
                  <div className="w-4/12 flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-xs font-bold active:scale-90 transition"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-slate-800 font-mono text-xs">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded-md bg-teal-600 text-white hover:bg-teal-700 flex items-center justify-center text-xs font-bold active:scale-90 transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Price & Remove */}
                  <div className="w-3/12 text-right">
                    <p className="font-black text-slate-800 font-mono">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Totals Section */}
        <div className="border-t border-slate-100 pt-3 mt-2 shrink-0 space-y-1.5 text-xs">
          {/* Quick Discount Pill Selector */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Chegirma:</span>
            <div className="flex items-center gap-1">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  onClick={() => onSetDiscountPercent(pct)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    discountPercent === pct
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-slate-500">
            <span>Oraliq summa:</span>
            <span className="font-mono font-bold text-slate-700">{formatCurrency(subtotal)}</span>
          </div>

          {serviceFee > 0 && (
            <div className="flex items-center justify-between text-slate-500">
              <span>Xizmat haqi ({serviceFeePercent}%):</span>
              <span className="font-mono font-bold text-slate-700">+{formatCurrency(serviceFee)}</span>
            </div>
          )}

          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-emerald-600">
              <span>Chegirma ({discountPercent}%):</span>
              <span className="font-mono font-bold">-{formatCurrency(discountAmount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-base font-black text-slate-800">Total:</span>
            <span className="text-xl font-black text-teal-600 font-mono">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. BOTTOM CARD: Payment Options (3 large teal buttons matching reference image) */}
      <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-200/90 shadow-xs shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            To&apos;lov Turlari
          </h3>
          {cart.length === 0 && !openTableTotal && (
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Savat bo&apos;sh
            </span>
          )}
          {cart.length === 0 && !!openTableTotal && (
            <span className="text-[10px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              Stol hisobi: {openTableTotal.toLocaleString('uz-UZ')} so&apos;m
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Cash Button */}
          <button
            onClick={() => onSelectPayment('CASH')}
            disabled={cart.length === 0 && !openTableTotal}
            className="h-20 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white flex flex-col items-center justify-center p-2 transition shadow-sm touch-press"
          >
            <Banknote className="w-6 h-6 mb-1.5" />
            <span className="text-xs font-black">Naqd pul</span>
          </button>

          {/* QRIS / QR Payment Button */}
          <button
            onClick={() => onSelectPayment('QRIS')}
            disabled={cart.length === 0 && !openTableTotal}
            className="h-20 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white flex flex-col items-center justify-center p-2 transition shadow-sm touch-press"
          >
            <QrCode className="w-6 h-6 mb-1.5" />
            <span className="text-xs font-black">QR To&apos;lov</span>
          </button>

          {/* Credit Card Button */}
          <button
            onClick={() => onSelectPayment('CARD')}
            disabled={cart.length === 0 && !openTableTotal}
            className="h-20 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white flex flex-col items-center justify-center p-2 transition shadow-sm touch-press"
          >
            <CreditCard className="w-6 h-6 mb-1.5" />
            <span className="text-xs font-black">Bank kartasi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
