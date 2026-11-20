import React, { useState, useMemo } from 'react';
import {
  Banknote,
  CreditCard,
  QrCode,
  X,
  CheckCircle2,
  Printer,
  Smartphone,
  Coins,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '@oshxona/shared';

interface PaymentModalProps {
  orderTotal: number;
  orderNumber: string;
  tableName: string;
  onClose: () => void;
  onSuccess: (paymentDetails: {
    method: 'CASH' | 'CARD' | 'QRIS' | 'MIXED';
    receivedAmount: number;
    changeAmount: number;
  }) => void;
  initialMethod?: 'CASH' | 'CARD' | 'QRIS' | 'MIXED';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  orderTotal,
  orderNumber,
  tableName,
  onClose,
  onSuccess,
  initialMethod = 'CASH',
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'CARD' | 'QRIS' | 'MIXED'>(initialMethod);
  const [receivedAmount, setReceivedAmount] = useState<number>(orderTotal);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Qaytim
  const changeAmount = useMemo(() => {
    if (selectedMethod !== 'CASH') return 0;
    return Math.max(0, receivedAmount - orderTotal);
  }, [selectedMethod, receivedAmount, orderTotal]);

  const isExactOrMore = receivedAmount >= orderTotal;

  const handleFastCash = (denom: number) => {
    setReceivedAmount((prev) => prev + denom);
  };

  const handleSetExact = () => {
    setReceivedAmount(orderTotal);
  };

  const handleCheckout = () => {
    if (selectedMethod === 'CASH' && !isExactOrMore) {
      alert('Qabul qilingan summa buyurtma summasidan kam bo\'lmasligi kerak!');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess({
        method: selectedMethod,
        receivedAmount: selectedMethod === 'CASH' ? receivedAmount : orderTotal,
        changeAmount,
      });
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none touch-screen animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-800">To&apos;lovni Qabul Qilish</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold">
                  {orderNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500">{tableName} buyurtmasi</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Total display */}
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-teal-800 font-medium">To&apos;lov summasi:</p>
              <p className="text-2xl font-black text-teal-700 font-mono">
                {formatCurrency(orderTotal)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-600 text-white">
                Kassaga qabul
              </span>
            </div>
          </div>

          {/* Payment Method Switcher (Teal buttons) */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'CASH', label: 'Naqd pul', icon: Banknote },
              { id: 'CARD', label: 'Karta', icon: CreditCard },
              { id: 'QRIS', label: 'Click/Payme', icon: QrCode },
              { id: 'MIXED', label: 'Aralash', icon: Coins },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMethod(m.id as any);
                    if (m.id !== 'CASH') setReceivedAmount(orderTotal);
                  }}
                  className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition touch-press ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-bold">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* CASH Specific Input & Denominations */}
          {selectedMethod === 'CASH' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Mijozdan olingan summa:</label>
                <button
                  onClick={handleSetExact}
                  className="text-xs font-bold text-teal-700 hover:underline"
                >
                  Aniq summa
                </button>
              </div>

              <div className="relative">
                <input
                  type="number"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-lg font-black font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Fast Cash Buttons */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[10000, 20000, 50000, 100000].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleFastCash(val)}
                    className="py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-teal-50 hover:text-teal-700 text-xs font-mono font-bold transition shadow-xs"
                  >
                    +{val / 1000}k
                  </button>
                ))}
              </div>

              {/* Change calculation */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Qaytim (Mijozga beriladi):</span>
                <span className="font-mono text-sm font-black text-emerald-600">
                  {formatCurrency(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* QRIS / CLICK / PAYME QR Code */}
          {selectedMethod === 'QRIS' && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-36 h-36 bg-slate-900 rounded-lg p-2 flex flex-col justify-between items-center text-white">
                  <div className="grid grid-cols-5 gap-1 w-full h-full p-1">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-xs ${
                          (i % 2 === 0 || i % 3 === 0 || i === 0 || i === 4 || i === 20 || i === 24)
                            ? 'bg-white'
                            : 'bg-teal-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Click &amp; Payme QR skaner qiling</p>
                <p className="text-[11px] text-slate-500">Mijoz mobil ilovasi orqali to&apos;laydi</p>
              </div>
            </div>
          )}

          {/* CARD Notice */}
          {selectedMethod === 'CARD' && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Bank terminaliga ulandi</p>
                <p className="text-[11px] text-slate-500">
                  Uzcard, Humo, Visa yoki Mastercard kartasini terminalga tekkizing
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
          >
            Bekor qilish
          </button>

          <button
            onClick={handleCheckout}
            disabled={isProcessing || (selectedMethod === 'CASH' && !isExactOrMore)}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isProcessing ? 'Yakunlanmoqda...' : 'To\'lovni Tasdiqlash'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
