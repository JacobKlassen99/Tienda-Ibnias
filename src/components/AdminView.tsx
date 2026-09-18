import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Eye,
  EyeOff,
  Shield,
  UserCheck,
} from 'lucide-react';
import { UserRole } from '../types';
import { changePassword, login } from '../api';

interface AdminViewProps {
  token: string;
  role: UserRole | null;
  onElevateAdmin: (adminToken: string) => void;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
  onSessionExpired: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  token,
  role,
  onElevateAdmin,
  onSuccessToast,
  onErrorToast,
  onSessionExpired,
}) => {
  // Elevation form if role !== 'admin'
  const [adminPass, setAdminPass] = useState('');
  const [elevationLoading, setElevationLoading] = useState(false);
  const [elevationError, setElevationError] = useState<string | null>(null);

  // User Password Change Form
  const [userNewPass, setUserNewPass] = useState('');
  const [userConfirmPass, setUserConfirmPass] = useState('');
  const [showUserPass, setShowUserPass] = useState(false);
  const [userLoading, setUserLoading] = useState(false);

  // Admin Password Change Form
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminConfirmPass, setAdminConfirmPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  // Handle Elevate To Admin
  const handleElevate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPass.trim()) {
      setElevationError('Ingrese la contraseña de administrador.');
      return;
    }

    setElevationLoading(true);
    setElevationError(null);
    try {
      const res = await login(adminPass.trim());
      if (res.success && res.token && res.role === 'admin') {
        onElevateAdmin(res.token);
        setAdminPass('');
        onSuccessToast('Sesión de Administrador activada.');
      } else {
        setElevationError('Contraseña incorrecta.');
      }
    } catch (err: unknown) {
      setElevationError(err instanceof Error ? err.message : 'Error al verificar');
    } finally {
      setElevationLoading(false);
    }
  };

  // Handle Change User Password
  const handleChangeUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userNewPass.length < 3) {
      onErrorToast('La contraseña debe tener al menos 3 caracteres.');
      return;
    }
    if (userNewPass !== userConfirmPass) {
      onErrorToast('Las contraseñas no coinciden.');
      return;
    }

    setUserLoading(true);
    try {
      const res = await changePassword(token, 'usuario', userNewPass.trim());
      if (res.success) {
        onSuccessToast('Contraseña de acceso cambiada exitosamente.');
        setUserNewPass('');
        setUserConfirmPass('');
      } else {
        if (res.error?.includes('Sesión') || res.error?.includes('token')) {
          onSessionExpired();
        } else {
          onErrorToast(res.error || 'Error al cambiar contraseña.');
        }
      }
    } catch (err: unknown) {
      onErrorToast(err instanceof Error ? err.message : 'Error al cambiar contraseña');
    } finally {
      setUserLoading(false);
    }
  };

  // Handle Change Admin Password
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminNewPass.length < 3) {
      onErrorToast('La contraseña debe tener al menos 3 caracteres.');
      return;
    }
    if (adminNewPass !== adminConfirmPass) {
      onErrorToast('Las contraseñas no coinciden.');
      return;
    }

    setAdminLoading(true);
    try {
      const res = await changePassword(token, 'admin', adminNewPass.trim());
      if (res.success) {
        onSuccessToast('Contraseña de administrador actualizada.');
        setAdminNewPass('');
        setAdminConfirmPass('');
      } else {
        if (res.error?.includes('Sesión') || res.error?.includes('token')) {
          onSessionExpired();
        } else {
          onErrorToast(res.error || 'Error al cambiar contraseña de administrador.');
        }
      }
    } catch (err: unknown) {
      onErrorToast(err instanceof Error ? err.message : 'Error de comunicación');
    } finally {
      setAdminLoading(false);
    }
  };

  // If not admin, show login / unlock screen
  if (role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Administración Protegida
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
            Esta sección permite cambiar contraseñas y administrar registros. Ingrese la contraseña de administrador para desbloquear.
          </p>

          {elevationError && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-left">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{elevationError}</span>
            </div>
          )}

          <form onSubmit={handleElevate} className="mt-5 space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Contraseña de Administrador
              </label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="••••••••"
                autoFocus
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
              />
            </div>

            <button
              id="unlock-admin-btn"
              type="submit"
              disabled={elevationLoading}
              className="w-full h-12 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-sm shadow-md shadow-teal-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {elevationLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <span>Desbloquear Administración</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin view
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Admin Status Banner */}
      <div className="bg-emerald-900 text-white p-5 rounded-3xl shadow-lg border border-emerald-700/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Panel de Administración Activo
            </h2>
            <p className="text-xs text-emerald-200">
              Usted tiene permisos de administrador para modificar contraseñas y registros.
            </p>
          </div>
        </div>
      </div>

      {/* 1. CAMBIAR CONTRASEÑA DE ACCESO (USUARIO) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-200">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Cambiar Contraseña de Acceso General
            </h3>
            <p className="text-xs text-slate-500">
              Esta contraseña es la que usan los usuarios para ingresar a la app y registrar datos.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangeUserPassword} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showUserPass ? 'text' : 'password'}
                  value={userNewPass}
                  onChange={(e) => setUserNewPass(e.target.value)}
                  placeholder="Nueva contraseña"
                  required
                  className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 pr-10 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowUserPass(!showUserPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showUserPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirmar Contraseña
              </label>
              <input
                type={showUserPass ? 'text' : 'password'}
                value={userConfirmPass}
                onChange={(e) => setUserConfirmPass(e.target.value)}
                placeholder="Repita la nueva contraseña"
                required
                className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            id="btn-cambiar-pass-usuario"
            type="submit"
            disabled={userLoading}
            className="w-full h-11 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {userLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Actualizando en Google Sheets...</span>
              </>
            ) : (
              <span>Actualizar Contraseña de Acceso</span>
            )}
          </button>
        </form>
      </div>

      {/* 2. CAMBIAR CONTRASEÑA DE ADMINISTRADOR */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-200">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Cambiar Contraseña de Administrador
            </h3>
            <p className="text-xs text-slate-500">
              Protege el acceso a este panel y a las funciones de editar y eliminar registros.
            </p>
          </div>
        </div>

        <form onSubmit={handleChangeAdminPassword} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nueva Contraseña de Administrador
              </label>
              <div className="relative">
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  value={adminNewPass}
                  onChange={(e) => setAdminNewPass(e.target.value)}
                  placeholder="Nueva clave admin"
                  required
                  className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 pr-10 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPass(!showAdminPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirmar Contraseña
              </label>
              <input
                type={showAdminPass ? 'text' : 'password'}
                value={adminConfirmPass}
                onChange={(e) => setAdminConfirmPass(e.target.value)}
                placeholder="Repita la clave admin"
                required
                className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            id="btn-cambiar-pass-admin"
            type="submit"
            disabled={adminLoading}
            className="w-full h-11 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {adminLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Actualizando en Google Sheets...</span>
              </>
            ) : (
              <span>Actualizar Contraseña de Administrador</span>
            )}
          </button>
        </form>
      </div>

      {/* 3. GOOGLE SHEETS & SYSTEM STATUS */}
      <div className="bg-slate-100 rounded-3xl p-5 border border-slate-200 text-xs text-slate-600 space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <Database className="h-4 w-4 text-teal-700" />
          <span>Estructura de Google Sheets Conectada</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700 block">Retiro de inventario</span>
            <span className="text-[10px] text-slate-400">Fecha, Cant., Producto, Detalle, Precio, Total</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700 block">Gastos Caja & Banco</span>
            <span className="text-[10px] text-slate-400">Fecha, Producto, Detalle, Precio</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700 block">Vencidos</span>
            <span className="text-[10px] text-slate-400">Fecha, Cant., Producto, Compra, Venta, Pérdida</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700 block">Compra y Construcción</span>
            <span className="text-[10px] text-slate-400">Fecha, Producto, Detalle, Precio</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 col-span-2">
            <span className="font-semibold text-slate-700 block">Bonificaciones</span>
            <span className="text-[10px] text-slate-400">Fecha, Detalle, Monto</span>
          </div>
        </div>
      </div>
    </div>
  );
};
