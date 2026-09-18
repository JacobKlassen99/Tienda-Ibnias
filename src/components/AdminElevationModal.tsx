import React, { useState } from 'react';
import { ShieldAlert, X, Loader2, AlertCircle } from 'lucide-react';
import { login } from '../api';
import { UserRole } from '../types';

interface AdminElevationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onElevated: (adminToken: string) => void;
  title?: string;
  description?: string;
}

export const AdminElevationModal: React.FC<AdminElevationModalProps> = ({
  isOpen,
  onClose,
  onElevated,
  title = 'Autorización de Administrador',
  description = 'Esta acción requiere privilegios de administrador. Ingrese la contraseña de administrador para continuar.',
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor ingrese la contraseña de administrador.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await login(password.trim());
      if (res.success && res.token && res.role === 'admin') {
        setPassword('');
        onElevated(res.token);
        onClose();
      } else {
        setError('Contraseña de administrador incorrecta.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al verificar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">Sesión protegida</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {description}
        </p>

        {error && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contraseña de Administrador
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 font-semibold text-xs sm:text-sm text-slate-600 hover:bg-slate-50 active:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Autorizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
