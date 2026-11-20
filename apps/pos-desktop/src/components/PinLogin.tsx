import React, { useState } from 'react';
import { Delete, Lock, ShieldCheck, UserCheck } from 'lucide-react';

interface PinLoginProps {
  onSuccess: (user: { id: string; name: string; username: string; role: string }) => void;
}

export const PinLogin: React.FC<PinLoginProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const verifyPin = async (enteredPin: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: enteredPin }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('pos_token', data.accessToken);
        localStorage.setItem('pos_user', JSON.stringify(data.user));
        onSuccess(data.user);
      } else {
        const errJson = await res.json();
        setError(errJson.message || 'PIN kod noto\'g\'ri');
        setPin('');
      }
    } catch (e) {
      // Offline fallback: demo accounts
      if (enteredPin === '1111') {
        const user = { id: 'usr-kassir1', name: 'Dilshod Qosimov', username: 'kassir1', role: 'CASHIER' };
        localStorage.setItem('pos_user', JSON.stringify(user));
        onSuccess(user);
      } else if (enteredPin === '2222') {
        const user = { id: 'usr-kassir2', name: 'Jasur Aliyev', username: 'kassir2', role: 'CASHIER' };
        localStorage.setItem('pos_user', JSON.stringify(user));
        onSuccess(user);
      } else if (enteredPin === '0000') {
        const user = { id: 'usr-admin', name: 'Bosh Boshqaruvchi', username: 'admin', role: 'ADMIN' };
        localStorage.setItem('pos_user', JSON.stringify(user));
        onSuccess(user);
      } else {
        setError('PIN kod noto\'g\'ri! (Kassir 1: 1111, Kassir 2: 2222, Admin: 0000)');
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f3f6f8] flex items-center justify-center p-4 select-none touch-screen">
      <div className="w-full max-w-sm bg-white border border-slate-200/90 rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col items-center">
        {/* POS Logo matching reference image */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-teal-600" stroke="none">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
            </svg>
          </div>
          <span className="text-3xl font-black tracking-tight text-teal-700">POS</span>
        </div>

        <h2 className="text-lg font-black text-slate-800 tracking-tight mt-1">Kassaga Kirish</h2>
        <p className="text-xs text-slate-500 mt-0.5">4 xonali shaxsiy PIN kodni kiriting</p>

        {/* PIN Indicators */}
        <div className="flex items-center gap-4 my-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > idx
                  ? 'bg-teal-600 border-teal-600 scale-110 shadow-sm'
                  : 'bg-slate-100 border-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl mb-4 text-center animate-shake">
            {error}
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 active:scale-95 border border-slate-200/90 text-lg font-bold font-mono text-slate-800 transition shadow-xs touch-press"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 text-xs font-bold text-slate-500 transition touch-press"
          >
            Tozalash
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 active:scale-95 border border-slate-200/90 text-lg font-bold font-mono text-slate-800 transition shadow-xs touch-press"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-rose-50 hover:text-rose-600 active:scale-95 border border-slate-200 text-slate-600 flex items-center justify-center transition touch-press"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Fast Demo Accounts */}
        <div className="w-full pt-5 mt-5 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider mb-2">
            Tezkor Kassir Tanlash (Demo)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => verifyPin('1111')}
              className="py-1.5 px-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-xl text-[11px] font-bold text-slate-700 border border-slate-200 transition"
            >
              Kassir 1 (1111)
            </button>
            <button
              onClick={() => verifyPin('2222')}
              className="py-1.5 px-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-xl text-[11px] font-bold text-slate-700 border border-slate-200 transition"
            >
              Kassir 2 (2222)
            </button>
            <button
              onClick={() => verifyPin('0000')}
              className="py-1.5 px-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-xl text-[11px] font-bold text-slate-700 border border-slate-200 transition"
            >
              Admin (0000)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
