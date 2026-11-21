import React, { useCallback, useEffect, useState } from 'react';
import { Delete, RefreshCw } from 'lucide-react';
import {
  ApiError,
  AuthTokens,
  NetworkError,
  SessionUser,
  apiRequest,
  getApiBaseUrl,
  getDeviceId,
  saveSession,
  setApiBaseUrlOverride,
} from '../lib/api';

interface PinLoginProps {
  onSuccess: (user: { id: string; name: string; username: string; role: string }) => void;
}

interface StaffMember {
  id: string;
  name: string;
  username?: string;
  role: string;
}

const LAST_USER_KEY = 'pos_last_user_id';
const PIN_LENGTH = 4;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  CASHIER: 'Kassir',
  WAITER: 'Ofitsiant',
};

export const PinLogin: React.FC<PinLoginProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState<boolean>(true);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>(() => getApiBaseUrl());

  const selectedUser = staff.find((s) => s.id === selectedUserId) || null;

  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      const list = await apiRequest<StaffMember[]>('/auth/staff', { auth: false });
      setStaff(list);
      let lastId: string | null = null;
      try {
        lastId = localStorage.getItem(LAST_USER_KEY);
      } catch {
        /* storage bloklangan */
      }
      if (lastId && list.some((s) => s.id === lastId)) setSelectedUserId(lastId);
      else if (list.length === 1) setSelectedUserId(list[0].id);
    } catch (e) {
      setStaffError(
        e instanceof NetworkError
          ? `Lokal server bilan aloqa yo'q (${getApiBaseUrl()})`
          : (e as Error).message || 'Xodimlar ro\'yxatini yuklab bo\'lmadi',
      );
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleSelectUser = (id: string) => {
    setSelectedUserId(id);
    setPin('');
    setError(null);
  };

  const handleKeyPress = (num: string) => {
    if (loading) return;
    if (!selectedUser) {
      setError('Avval xodimni tanlang');
      return;
    }
    if (pin.length < PIN_LENGTH) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === PIN_LENGTH) {
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
    if (!selectedUser) return;
    setLoading(true);
    try {
      const tokens = await apiRequest<AuthTokens>('/auth/pin-login', {
        method: 'POST',
        auth: false,
        body: { userIdentifier: selectedUser.id, pin: enteredPin, deviceId: getDeviceId() },
      });
      saveSession(tokens);
      try {
        localStorage.setItem(LAST_USER_KEY, tokens.user.id);
      } catch {
        /* storage bloklangan */
      }
      const user: SessionUser = tokens.user;
      onSuccess({ id: user.id, name: user.name, username: user.username, role: user.role });
    } catch (e) {
      // Demo/offline kirish yo'q: server tasdiqlamasa kirish taqiqlanadi.
      if (e instanceof NetworkError) setError(`Lokal server bilan aloqa yo'q (${getApiBaseUrl()})`);
      else if (e instanceof ApiError) setError(e.message);
      else setError('Kirishda kutilmagan xatolik');
      setPin('');
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
        <p className="text-xs text-slate-500 mt-0.5 text-center">
          {selectedUser ? (
            <>
              <span className="font-bold text-teal-700">{selectedUser.name}</span> — 4 xonali shaxsiy PIN kodni kiriting
            </>
          ) : (
            'Xodimni tanlang, so\'ng 4 xonali PIN kodni kiriting'
          )}
        </p>

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

        {/* Xodimni tanlash (GET /auth/staff) */}
        <div className="w-full pt-5 mt-5 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider mb-2">
            Xodimni Tanlash
          </p>
          {staffLoading ? (
            <p className="text-[11px] text-slate-400 text-center py-2">Yuklanmoqda…</p>
          ) : staffError ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-[11px] font-bold text-rose-600 text-center">{staffError}</p>
              <button
                onClick={loadStaff}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-xl text-[11px] font-bold text-slate-700 border border-slate-200 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Qayta urinish
              </button>
              {/* Lokal server manzili (masalan server kompyuterning LAN IPsi) */}
              <form
                className="flex gap-1.5 w-full mt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = serverUrl.trim();
                  if (!/^https?:\/\/[^\s/]+(:\d+)?\/?$/.test(v)) {
                    setStaffError('Manzil http://192.168.1.10:4000 ko\'rinishida bo\'lishi kerak');
                    return;
                  }
                  setApiBaseUrlOverride(v);
                  loadStaff();
                }}
              >
                <input
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://192.168.1.10:4000"
                  aria-label="Lokal server manzili"
                  className="flex-1 min-w-0 px-2 py-1.5 border border-slate-200 rounded-xl text-[11px] font-mono"
                />
                <button type="submit" className="px-2.5 py-1.5 bg-teal-600 text-white rounded-xl text-[11px] font-bold">
                  Saqlash
                </button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {staff.map((member) => {
                const isSelected = member.id === selectedUserId;
                return (
                  <button
                    key={member.id}
                    onClick={() => handleSelectUser(member.id)}
                    title={member.name}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition truncate ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 border-slate-200'
                    }`}
                  >
                    {member.name.split(' ')[0]} ({ROLE_LABELS[member.role] || member.role})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
