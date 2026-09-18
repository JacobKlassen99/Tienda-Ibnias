import React, { useState, useEffect } from 'react';
import {
  PackageMinus,
  Wallet,
  CalendarX,
  Hammer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { BackendOptions, RegisterFormType } from '../types';
import {
  addInventory,
  addCashExpense,
  addExpired,
  addPurchase,
  addBonus,
  getOptions,
} from '../api';

interface RegisterFormsProps {
  token: string;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
  onSessionExpired: () => void;
}

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const RegisterForms: React.FC<RegisterFormsProps> = ({
  token,
  onSuccessToast,
  onErrorToast,
  onSessionExpired,
}) => {
  const [activeForm, setActiveForm] = useState<RegisterFormType>('inventario');
  const [options, setOptions] = useState<BackendOptions>({
    inventario: [],
    caja: [],
    compra: [],
  });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ form: string; detail: string } | null>(null);

  // Form states
  // 1. Retiro de inventario
  const [invFecha, setInvFecha] = useState(getTodayString());
  const [invCantidad, setInvCantidad] = useState<number | string>(1);
  const [invProducto, setInvProducto] = useState('');
  const [invDetalle, setInvDetalle] = useState('');
  const [invPrecio, setInvPrecio] = useState<number | string>('');

  // 2. Gastos de Caja & Banco
  const [cajaFecha, setCajaFecha] = useState(getTodayString());
  const [cajaProducto, setCajaProducto] = useState('');
  const [cajaDetalle, setCajaDetalle] = useState('');
  const [cajaPrecio, setCajaPrecio] = useState<number | string>('');

  // 3. Vencidos
  const [vencFecha, setVencFecha] = useState(getTodayString());
  const [vencCantidad, setVencCantidad] = useState<number | string>(1);
  const [vencProducto, setVencProducto] = useState('');
  const [vencPrecioCompra, setVencPrecioCompra] = useState<number | string>('');
  const [vencPrecioVenta, setVencPrecioVenta] = useState<number | string>(0);

  // 4. Compra / Construcción
  const [compraFecha, setCompraFecha] = useState(getTodayString());
  const [compraProducto, setCompraProducto] = useState('');
  const [compraDetalle, setCompraDetalle] = useState('');
  const [compraPrecio, setCompraPrecio] = useState<number | string>('');

  // 5. Bonificaciones
  const [bonFecha, setBonFecha] = useState(getTodayString());
  const [bonDetalle, setBonDetalle] = useState('');
  const [bonMonto, setBonMonto] = useState<number | string>('');

  // Load options on mount
  useEffect(() => {
    let mounted = true;
    getOptions(token).then((opts) => {
      if (mounted) {
        setOptions(opts);
        if (opts.inventario.length > 0) setInvDetalle(opts.inventario[0]);
        if (opts.caja.length > 0) setCajaDetalle(opts.caja[0]);
        if (opts.compra.length > 0) setCompraDetalle(opts.compra[0]);
        setLoadingOptions(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [token]);

  // Calculations
  const invTotal = (Number(invCantidad) || 0) * (Number(invPrecio) || 0);
  const vencPerdida =
    ((Number(vencPrecioCompra) || 0) - (Number(vencPrecioVenta) || 0)) *
    (Number(vencCantidad) || 0);

  // Submit Handlers
  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invProducto.trim()) {
      onErrorToast('Por favor ingrese el nombre del producto.');
      return;
    }
    if (!invDetalle) {
      onErrorToast('Por favor seleccione un detalle.');
      return;
    }
    if (!invPrecio || Number(invPrecio) <= 0) {
      onErrorToast('Por favor ingrese un precio válido.');
      return;
    }

    setSubmitting(true);
    setLastSaved(null);
    try {
      const res = await addInventory(token, {
        fecha: invFecha,
        producto: invProducto,
        detalle: invDetalle,
        cantidad: Number(invCantidad) || 1,
        precio: Number(invPrecio),
      });

      if (res.success) {
        onSuccessToast('Retiro de inventario guardado correctamente en Google Sheets.');
        setLastSaved({
          form: 'Retiro de inventario',
          detail: `${invProducto} (${invCantidad} u. a Bs ${Number(invPrecio).toFixed(2)}) = Bs ${invTotal.toFixed(2)}`,
        });
        setInvProducto('');
        setInvPrecio('');
        setInvCantidad(1);
      } else {
        if (res.error?.includes('Sesión') || res.error?.includes('token')) {
          onSessionExpired();
        } else {
          onErrorToast(res.error || 'No se pudo guardar el registro.');
        }
      }
    } catch (err: unknown) {
      onErrorToast(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCajaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaProducto.trim()) {
      onErrorToast('Por favor ingrese el producto o concepto.');
      return;
    }
    if (!cajaDetalle) {
      onErrorToast('Por favor seleccione un detalle.');
      return;
    }
    if (!cajaPrecio || Number(cajaPrecio) <= 0) {
      onErrorToast('Por favor ingrese el precio/monto.');
      return;
    }

    setSubmitting(true);
    setLastSaved(null);
    try {
      const res = await addCashExpense(token, {
        fecha: cajaFecha,
        producto: cajaProducto,
        detalle: cajaDetalle,
        precio: Number(cajaPrecio),
      });

      if (res.success) {
        onSuccessToast('Gasto de Caja & Banco guardado correctamente.');
        setLastSaved({
          form: 'Gastos de Caja & Banco',
          detail: `${cajaProducto} - Bs ${Number(cajaPrecio).toFixed(2)} [${cajaDetalle}]`,
        });
        setCajaProducto('');
        setCajaPrecio('');
      } else {
        if (res.error?.includes('Sesión') || res.error?.includes('token')) {
          onSessionExpired();
        } else {
          onErrorToast(res.error || 'No se pudo guardar el registro.');
        }
      }
    } catch (err: unknown) {
      onErrorToast(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVencidosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vencProducto.trim()) {
      onErrorToast('Por favor ingrese el producto vencido.');
      return;
    }
    if (!vencPrecioCompra || Number(vencPrecioCompra) < 0) {
      onErrorToast('Por favor ingrese el precio de compra.');
      return;
    }

    setSubmitting(true);
    setLastSaved(null);
    try {
      const res = await addExpired(token, {
        fecha: vencFecha,
        producto: vencProducto,
        cantidad: Number(vencCantidad) || 1,
        precioCompra: Number(vencPrecioCompra),
        precioVenta: Number(vencPrecioVenta) || 0,
      });

      if (res.success) {
        onSuccessToast('Producto vencido registrado correctamente.');
        setLastSaved({
          form: 'Vencidos',
          detail: `${vencProducto} (${vencCantidad} u.) - Pérdida: Bs ${vencPerdida.toFixed(2)}`,
        });
        setVencProducto('');
        setVencCantidad(1);
        setVencPrecioCompra('');
        setVencPrecioVenta(0);
      } else {
        if (res.error?.includes('Sesión') || res.error?.includes('token')) {
          onSessionExpired();
        } else {
          onErrorToast(res.error || 'No se pudo guardar el registro.');
        }
      }
    } catch (err: unknown) {
      onErrorToast(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compraProducto.trim()) {
      onErrorToast('Por favor ingrese el producto o descripción.');
      return;
    }
    if (!compraDetalle) {
      onErrorToast('Por favor seleccione el detalle.');
      return;
    }
    if (!compraPrecio || Number(compraPrecio) <= 0) {
      onErrorToast('Por favor ingrese el precio.');
      return;
    }

    setSubmitting(true);
    setLastSaved(null);
    try {
      const res = await addPurchase(token, {
        fecha: compraFecha,
        producto: compraProducto,
        detalle: compraDetalle,
        precio: Number(compraPrecio),
      });

      if (res.success) {
        onSuccessToast('Compra / Construcción guardada correctamente.');
        setLastSaved({
          form: 'Compra / Construcción',
          detail: `${compraProducto} - Bs ${Number(compraPrecio).toFixed(2)} [${compraDetalle}]`,
        });
        setCompraProducto('');
        setCompraPrecio('');
      } else {
        if (res.error?.includes('Sesión') || res.error?.includes('token')) {
          onSessionExpired();
        } else {
          onErrorToast(res.error || 'No se pudo guardar el registro.');
        }
      }
    } catch (err: unknown) {
      onErrorToast(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBonificacionesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonDetalle.trim()) {
      onErrorToast('Por favor ingrese el detalle de la bonificación.');
      return;
    }
    if (!bonMonto || Number(bonMonto) <= 0) {
      onErrorToast('Por favor ingrese un monto válido.');
      return;
    }

    setSubmitting(true);
    setLastSaved(null);
    try {
      const res = await addBonus(token, {
        fecha: bonFecha,
        detalle: bonDetalle,
        monto: Number(bonMonto),
      });

      if (res.success) {
        onSuccessToast('Bonificación guardada correctamente.');
        setLastSaved({
          form: 'Bonificaciones',
          detail: `${bonDetalle} - Bs ${Number(bonMonto).toFixed(2)}`,
        });
        setBonDetalle('');
        setBonMonto('');
      } else {
        if (res.error?.includes('Sesión') || res.error?.includes('token')) {
          onSessionExpired();
        } else {
          onErrorToast(res.error || 'No se pudo guardar el registro.');
        }
      }
    } catch (err: unknown) {
      onErrorToast(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const formButtons: { id: RegisterFormType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'inventario', label: 'Retiro de inventario', icon: PackageMinus },
    { id: 'caja_banco', label: 'Gastos Caja & Banco', icon: Wallet },
    { id: 'vencidos', label: 'Vencidos', icon: CalendarX },
    { id: 'compra', label: 'Compra / Construcción', icon: Hammer },
    { id: 'bonificaciones', label: 'Bonificaciones', icon: Sparkles },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Category selector grid - High ergonomic contrast for Android mobile */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-teal-600" />
            Seleccione tipo de registro
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {formButtons.map((btn) => {
            const Icon = btn.icon;
            const isSelected = activeForm === btn.id;
            return (
              <button
                key={btn.id}
                id={`form-btn-${btn.id}`}
                onClick={() => {
                  setActiveForm(btn.id);
                  setLastSaved(null);
                }}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition touch-manipulation active:scale-[0.98] ${
                  isSelected
                    ? 'bg-teal-700 border-teal-700 text-white shadow-md shadow-teal-700/20'
                    : 'bg-white border-slate-200/90 text-slate-700 hover:border-teal-400 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold leading-tight line-clamp-2">
                  {btn.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmation of last saved record */}
      {lastSaved && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Guardado correctamente en Google Sheets
            </p>
            <p className="text-sm font-semibold text-emerald-950 mt-0.5">{lastSaved.detail}</p>
          </div>
        </div>
      )}

      {/* ACTIVE FORM CONTAINER */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-200/80">
        {/* Form Header */}
        <div className="pb-4 mb-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 capitalize">
              {formButtons.find((b) => b.id === activeForm)?.label}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Los datos se sincronizarán directamente con Google Sheets
            </p>
          </div>
        </div>

        {/* 1. RETIRO DE INVENTARIO */}
        {activeForm === 'inventario' && (
          <form onSubmit={handleInventorySubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Fecha
                </label>
                <input
                  type="date"
                  value={invFecha}
                  onChange={(e) => setInvFecha(e.target.value)}
                  required
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0.01"
                  step="any"
                  value={invCantidad}
                  onChange={(e) => setInvCantidad(e.target.value)}
                  placeholder="1"
                  required
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Producto
              </label>
              <input
                type="text"
                value={invProducto}
                onChange={(e) => setInvProducto(e.target.value)}
                placeholder="Ej. Detergente, Marcador, Cuaderno..."
                required
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detalle / Categoría
              </label>
              <select
                value={invDetalle}
                onChange={(e) => setInvDetalle(e.target.value)}
                required
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
              >
                {options.inventario.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Precio Unitario (Bs)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  Bs
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={invPrecio}
                  onChange={(e) => setInvPrecio(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Total display automatically calculated: Cantidad * Precio */}
            <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">
                  Total Calculado
                </span>
                <p className="text-[11px] text-teal-600">
                  {invCantidad || 0} × Bs {Number(invPrecio || 0).toFixed(2)}
                </p>
              </div>
              <div className="text-xl sm:text-2xl font-black text-teal-900 font-mono">
                Bs {invTotal.toFixed(2)}
              </div>
            </div>

            <button
              id="submit-retiro-btn"
              type="submit"
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white font-bold text-base shadow-lg shadow-teal-700/25 transition flex items-center justify-center gap-2 active:scale-[0.99] touch-manipulation cursor-pointer disabled:opacity-75"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Guardando en Google Sheets...</span>
                </>
              ) : (
                <>
                  <span>Guardar Retiro de Inventario</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. GASTOS DE CAJA & BANCO */}
        {activeForm === 'caja_banco' && (
          <form onSubmit={handleCajaSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> Fecha
              </label>
              <input
                type="date"
                value={cajaFecha}
                onChange={(e) => setCajaFecha(e.target.value)}
                required
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Producto / Concepto
              </label>
              <input
                type="text"
                value={cajaProducto}
                onChange={(e) => setCajaProducto(e.target.value)}
                placeholder="Ej. Pago de luz, Flete de mercadería..."
                required
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detalle
              </label>
              <select
                value={cajaDetalle}
                onChange={(e) => setCajaDetalle(e.target.value)}
                required
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
              >
                {options.caja.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Precio / Monto (Bs)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  Bs
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={cajaPrecio}
                  onChange={(e) => setCajaPrecio(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              id="submit-caja-btn"
              type="submit"
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white font-bold text-base shadow-lg shadow-teal-700/25 transition flex items-center justify-center gap-2 active:scale-[0.99] touch-manipulation cursor-pointer disabled:opacity-75"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Guardando en Google Sheets...</span>
                </>
              ) : (
                <>
                  <span>Guardar Gasto Caja & Banco</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 3. VENCIDOS */}
        {activeForm === 'vencidos' && (
          <form onSubmit={handleVencidosSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Fecha
                </label>
                <input
                  type="date"
                  value={vencFecha}
                  onChange={(e) => setVencFecha(e.target.value)}
                  required
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="any"
                  value={vencCantidad}
                  onChange={(e) => setVencCantidad(e.target.value)}
                  placeholder="1"
                  required
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-semibold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Producto
              </label>
              <input
                type="text"
                value={vencProducto}
                onChange={(e) => setVencProducto(e.target.value)}
                placeholder="Ej. Leche 1L, Galletas..."
                required
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Precio de Compra (Bs)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    Bs
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={vencPrecioCompra}
                    onChange={(e) => setVencPrecioCompra(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Precio de Venta (Bs)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    Bs
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={vencPrecioVenta}
                    onChange={(e) => setVencPrecioVenta(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Pérdida calculada automáticamente: (Precio compra - Precio venta) * Cantidad */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                  Pérdida Calculada
                </span>
                <p className="text-[11px] text-amber-600">
                  ({Number(vencPrecioCompra || 0).toFixed(2)} - {Number(vencPrecioVenta || 0).toFixed(2)}) × {vencCantidad || 0}
                </p>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono">
                Bs {vencPerdida.toFixed(2)}
              </div>
            </div>

            <button
              id="submit-vencidos-btn"
              type="submit"
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white font-bold text-base shadow-lg shadow-teal-700/25 transition flex items-center justify-center gap-2 active:scale-[0.99] touch-manipulation cursor-pointer disabled:opacity-75"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Guardando en Google Sheets...</span>
                </>
              ) : (
                <>
                  <span>Registrar Vencido</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 4. COMPRA / CONSTRUCCIÓN */}
        {activeForm === 'compra' && (
          <form onSubmit={handleCompraSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> Fecha
              </label>
              <input
                type="date"
                value={compraFecha}
                onChange={(e) => setCompraFecha(e.target.value)}
                required
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Producto / Descripción
              </label>
              <input
                type="text"
                value={compraProducto}
                onChange={(e) => setCompraProducto(e.target.value)}
                placeholder="Ej. Cemento, Estantería metálica..."
                required
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detalle
              </label>
              <select
                value={compraDetalle}
                onChange={(e) => setCompraDetalle(e.target.value)}
                required
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
              >
                {options.compra.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Precio / Inversión (Bs)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  Bs
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={compraPrecio}
                  onChange={(e) => setCompraPrecio(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              id="submit-compra-btn"
              type="submit"
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white font-bold text-base shadow-lg shadow-teal-700/25 transition flex items-center justify-center gap-2 active:scale-[0.99] touch-manipulation cursor-pointer disabled:opacity-75"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Guardando en Google Sheets...</span>
                </>
              ) : (
                <>
                  <span>Guardar Compra / Construcción</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 5. BONIFICACIONES */}
        {activeForm === 'bonificaciones' && (
          <form onSubmit={handleBonificacionesSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> Fecha
              </label>
              <input
                type="date"
                value={bonFecha}
                onChange={(e) => setBonFecha(e.target.value)}
                required
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detalle / Origen del Ingreso
              </label>
              <input
                type="text"
                value={bonDetalle}
                onChange={(e) => setBonDetalle(e.target.value)}
                placeholder="Ej. Bonificación por metas, Descuento proveedor..."
                required
                className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none placeholder:text-slate-400"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Las bonificaciones representan ingresos adicionales para la tienda.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Monto (Bs)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  Bs
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={bonMonto}
                  onChange={(e) => setBonMonto(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 text-base font-bold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              id="submit-bon-btn"
              type="submit"
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white font-bold text-base shadow-lg shadow-teal-700/25 transition flex items-center justify-center gap-2 active:scale-[0.99] touch-manipulation cursor-pointer disabled:opacity-75"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Guardando en Google Sheets...</span>
                </>
              ) : (
                <>
                  <span>Guardar Bonificación</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
