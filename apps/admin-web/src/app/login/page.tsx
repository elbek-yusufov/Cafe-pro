'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import { ApiError, AuthTokens, NetworkError, apiRequest, getApiBaseUrl, saveSession, clearSession } from '../../lib/api';

/** Admin bo'lmagan rollar faqat shu sahifalarga kira oladi (server ham rolni tekshiradi). */
const NON_ADMIN_ALLOWED_PATHS = ['/kds'];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const tokens = await apiRequest<AuthTokens>('/auth/login', {
        method: 'POST',
        auth: false,
        body: { username, password },
      });

      const target = next.startsWith('/') && !next.startsWith('//') ? next : '/';
      if (tokens.user.role !== 'ADMIN' && !NON_ADMIN_ALLOWED_PATHS.some((p) => target.startsWith(p))) {
        clearSession();
        setError('Admin panelga faqat ADMIN roli kira oladi.');
        return;
      }

      saveSession(tokens);
      router.replace(target);
    } catch (err) {
      if (err instanceof NetworkError) setError(`Lokal server bilan aloqa yo'q (${getApiBaseUrl()})`);
      else if (err instanceof ApiError) setError(err.message);
      else setError('Kutilmagan xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-slate-900">Tizimga kirish</h1>
          <p className="text-xs text-slate-500">OshxonaPOS Admin Boshqaruv</p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-slate-600">Login</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-slate-600">Parol</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          minLength={6}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </label>

      {error && (
        <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold transition"
      >
        {loading ? 'Tekshirilmoqda…' : 'Kirish'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
