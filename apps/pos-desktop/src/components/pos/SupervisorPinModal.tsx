import React, { useState } from 'react';
import { Delete, ShieldCheck } from 'lucide-react';

interface SupervisorPinModalProps {
  message: string;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
}

/**
 * Admin tasdig'i uchun PIN (sensorli ekran klaviaturasi). PIN faqat serverga yuboriladi, saqlanmaydi.
 * (Electron `window.prompt` ni qo'llab-quvvatlamaydi — shuning uchun alohida oyna.)
 */
export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({ message, onSubmit, onCancel }) => {
  const [pin, setPin] = useState('');

  const press = (d: string) => {
    if (pin.length >= 6) return;
    setPin(pin + d);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 select-none touch-screen">
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 flex flex-col items-center">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-black text-slate-800">Admin tasdig&apos;i kerak</h3>
        <p className="text-[11px] text-slate-500 text-center mt-1">{message}</p>

        <div className="flex gap-2.5 my-4" aria-label="Kiritilgan raqamlar soni">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span key={i} className={`w-3.5 h-3.5 rounded-full border-2 ${pin.length > i ? 'bg-teal-600 border-teal-600' : 'bg-slate-100 border-slate-300'}`} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} onClick={() => press(d)} className="h-12 rounded-2xl bg-slate-50 border border-slate-200 text-base font-bold font-mono active:scale-95 touch-press">
              {d}
            </button>
          ))}
          <button onClick={() => setPin('')} className="h-12 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-500">
            Tozalash
          </button>
          <button onClick={() => press('0')} className="h-12 rounded-2xl bg-slate-50 border border-slate-200 text-base font-bold font-mono active:scale-95 touch-press">
            0
          </button>
          <button onClick={() => setPin(pin.slice(0, -1))} className="h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center" aria-label="O'chirish">
            <Delete className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 w-full mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
            Bekor qilish
          </button>
          <button
            onClick={() => onSubmit(pin)}
            disabled={pin.length < 4}
            className="flex-1 py-2.5 rounded-xl bg-teal-600 disabled:opacity-40 text-white text-xs font-black"
          >
            Tasdiqlash
          </button>
        </div>
      </div>
    </div>
  );
};
