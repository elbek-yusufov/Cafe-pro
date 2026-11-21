import React from 'react';
import { Printer } from 'lucide-react';
import { CartItem, RestaurantSettings } from '../../types/pos';
import { formatCurrency } from '@oshxona/shared';

interface ReceiptPreviewProps {
  cart: CartItem[];
  subtotal: number;
  serviceFee: number;
  discountAmount: number;
  grandTotal: number;
  orderNumber: string;
  tableName: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  cashierName: string;
  settings: RestaurantSettings;
  onPrintReceipt: () => void;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  cart,
  subtotal,
  serviceFee,
  discountAmount,
  grandTotal,
  orderNumber,
  tableName,
  orderType,
  cashierName,
  settings,
  onPrintReceipt,
}) => {
  const currentDate = new Date().toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const currentTime = new Date().toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between h-full select-none">
      {/* Top Title */}
      <div>
        <h2 className="text-base lg:text-lg font-black tracking-tight text-slate-800 mb-3 shrink-0">
          Chek Ko&apos;rinishi
        </h2>

        {/* Paper Receipt Box */}
        <div id="printable-receipt" className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 font-mono text-xs text-slate-700 shadow-inner overflow-hidden">
          {/* Header Info */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
            <h3 className="font-extrabold text-sm text-slate-900 tracking-wider">
              {settings.name}
            </h3>
            <p className="text-[10px] text-slate-500">{settings.address}</p>
            <p className="text-[10px] text-slate-500">STIR: {settings.taxNumber}</p>

            <div className="pt-2 text-left text-[11px] space-y-0.5 text-slate-600">
              <div className="flex justify-between">
                <span>Chek №:</span>
                <span className="font-bold text-slate-900">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Vaqt:</span>
                <span>{currentDate} {currentTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Xizmat:</span>
                <span>{orderType === 'DINE_IN' ? tableName : 'Olib ketish'}</span>
              </div>
              <div className="flex justify-between">
                <span>Kassir:</span>
                <span>{cashierName}</span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="py-2.5 border-b border-dashed border-slate-300 max-h-48 overflow-y-auto custom-scrollbar space-y-1.5 text-[11px]">
            {cart.length === 0 ? (
              <p className="text-center text-slate-400 py-4 italic font-sans text-xs">
                Chekda mahsulotlar yo&apos;q
              </p>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start leading-tight">
                  <div className="flex-1 pr-1 truncate">
                    <span>{item.name}</span>
                    <span className="text-slate-400 block text-[9px]">
                      {item.quantity} x {formatCurrency(item.price)}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="pt-2.5 pb-2 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-500">
              <span>Oraliq jami:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {serviceFee > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Xizmat haqi ({settings.serviceFeePercent}%):</span>
                <span>+{formatCurrency(serviceFee)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Chegirma:</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-300">
              <span>JAMI:</span>
              <span className="text-teal-700">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-[9px] text-slate-400 pt-1">
            {settings.receiptFooter}
          </p>
        </div>
      </div>

      {/* Bottom Section: Print Receipt Button & Barcode (matches reference image) */}
      <div className="mt-3 shrink-0 space-y-3">
        {/* Large Teal PRINT RECEIPT Button */}
        <button
          onClick={onPrintReceipt}
          disabled={cart.length === 0}
          className="w-full py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition touch-press"
        >
          <Printer className="w-4 h-4" />
          <span>CHEK CHIQARISH</span>
        </button>

        {/* Realistic Barcode graphic matching reference image */}
        <div className="flex flex-col items-center justify-center pt-1 opacity-80">
          <svg viewBox="0 0 160 36" className="w-40 h-8">
            {/* Barcode stripes */}
            <rect x="0" y="0" width="3" height="30" fill="#1e293b" />
            <rect x="5" y="0" width="1.5" height="30" fill="#1e293b" />
            <rect x="9" y="0" width="4" height="30" fill="#1e293b" />
            <rect x="15" y="0" width="2" height="30" fill="#1e293b" />
            <rect x="19" y="0" width="5" height="30" fill="#1e293b" />
            <rect x="26" y="0" width="1" height="30" fill="#1e293b" />
            <rect x="30" y="0" width="3.5" height="30" fill="#1e293b" />
            <rect x="36" y="0" width="2" height="30" fill="#1e293b" />
            <rect x="40" y="0" width="4" height="30" fill="#1e293b" />
            <rect x="47" y="0" width="1" height="30" fill="#1e293b" />
            <rect x="50" y="0" width="3" height="30" fill="#1e293b" />
            <rect x="55" y="0" width="5" height="30" fill="#1e293b" />
            <rect x="62" y="0" width="2" height="30" fill="#1e293b" />
            <rect x="66" y="0" width="4" height="30" fill="#1e293b" />
            <rect x="73" y="0" width="1.5" height="30" fill="#1e293b" />
            <rect x="77" y="0" width="3" height="30" fill="#1e293b" />
            <rect x="83" y="0" width="2" height="30" fill="#1e293b" />
            <rect x="88" y="0" width="4" height="30" fill="#1e293b" />
            <rect x="94" y="0" width="2" height="30" fill="#1e293b" />
            <rect x="98" y="0" width="5" height="30" fill="#1e293b" />
            <rect x="105" y="0" width="1.5" height="30" fill="#1e293b" />
            <rect x="109" y="0" width="3" height="30" fill="#1e293b" />
            <rect x="114" y="0" width="2" height="30" fill="#1e293b" />
            <rect x="118" y="0" width="4" height="30" fill="#1e293b" />
            <rect x="125" y="0" width="1.5" height="30" fill="#1e293b" />
            <rect x="129" y="0" width="3" height="30" fill="#1e293b" />
            <rect x="135" y="0" width="2" height="30" fill="#1e293b" />
            <rect x="139" y="0" width="4.5" height="30" fill="#1e293b" />
            <rect x="146" y="0" width="2" height="30" fill="#1e293b" />
            <rect x="150" y="0" width="4" height="30" fill="#1e293b" />
            <rect x="156" y="0" width="2" height="30" fill="#1e293b" />
          </svg>
          <span className="font-mono text-[9px] text-slate-500 tracking-widest mt-0.5">
            {orderNumber || '0842-9901-2026'}
          </span>
        </div>
      </div>
    </div>
  );
};
