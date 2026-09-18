import React, { useState } from 'react';
import { Store, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { login } from '../api';
import { UserRole } from '../types';

interface LoginViewProps {
  onSuccess: (token: string, role: UserRole) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setErrorMessage('Por favor ingrese su usuario y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Primary authentication attempt with password and username
      let res = await login(p, u);

      // Graceful fallback in case credentials were entered in inverted fields
      if (!res.success && u !== p) {
        const fallbackRes = await login(u, p);
        if (fallbackRes.success) {
          res = fallbackRes;
        }
      }

      if (res.success && res.token && res.role) {
        setUsername('');
        setPassword('');
        onSuccess(res.token, res.role);
      } else {
        setErrorMessage(res.error || 'Usuario o contraseña incorrectos.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de comunicación con el servidor';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-900 via-teal-950 to-slate-950 flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/20 mb-4 ring-4 ring-teal-500/20">
            <Store className="h-11 w-11 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white uppercase font-sans">
            Tienda Ibnias
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-teal-200/80 font-medium">
            Registro de gastos, compras y bonificaciones
          </p>
        </div>

        {/* Access Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Lock className="h-5 w-5 text-teal-600" />
              Acceso al Sistema
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingrese sus credenciales de acceso para continuar
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm animate-shake">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Usuario */}
            <div>
              <label
                htmlFor="username-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Usuario
              </label>
              <div className="relative">
                <input
                  id="username-input"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Usuario"
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 pl-11 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15 transition"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <User className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Campo Contraseña (oculto en puntos/asteriscos) */}
            <div>
              <label
                htmlFor="password-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 pl-11 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15 transition tracking-widest"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Botón Ingresar */}
            <div className="pt-2">
              <button
                id="btn-ingresar"
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-base sm:text-lg shadow-lg shadow-teal-600/30 transition flex items-center justify-center gap-2 active:scale-[0.99] touch-manipulation disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <span>Ingresar</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-teal-300/60">
          Tienda Ibnias &bull; Google Sheets Cloud
        </div>
      </div>
    </div>
  );
};
