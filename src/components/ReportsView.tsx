import React, { useState, useEffect, useMemo, useTransition } from 'react';
import {
  BarChart3,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Layers,
  Trash2,
  Edit3,
  Loader2,
  X,
  Check,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  GastoRecord,
  BonificacionRecord,
  UserRole,
} from '../types';
import {
  getGastosReport,
  getBonificacionesReport,
  updateRecord,
  deleteRecord,
} from '../api';
import { AdminElevationModal } from './AdminElevationModal';

interface ReportsViewProps {
  token: string;
  role: UserRole | null;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
  onSessionExpired: () => void;
  onElevateAdmin: (adminToken: string) => void;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  token,
  role,
  onSuccessToast,
  onErrorToast,
  onSessionExpired,
  onElevateAdmin,
}) => {
  const [reportType, setReportType] = useState<'gastos' | 'bonificaciones'>('gastos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Raw data from server
  const [gastos, setGastos] = useState<GastoRecord[]>([]);
  const [bonificaciones, setBonificaciones] = useState<BonificacionRecord[]>([]);

  // Filters
  const [periodo, setPeriodo] = useState<'todo' | 'mes' | 'anio'>('todo');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDetalle, setSelectedDetalle] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Elevation Modal
  const [showAdminElevation, setShowAdminElevation] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);

  // Edit State
  const [editingItem, setEditingItem] = useState<{
    record: GastoRecord | BonificacionRecord;
    type: 'gasto' | 'bonificacion';
  } | null>(null);
  const [editForm, setEditForm] = useState<{
    fecha: string;
    producto: string;
    detalle: string;
    cantidad: number | string;
    precio: number | string;
    monto: number | string;
  }>({
    fecha: '',
    producto: '',
    detalle: '',
    cantidad: 1,
    precio: 0,
    monto: 0,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete State
  const [deletingItem, setDeletingItem] = useState<{
    record: GastoRecord | BonificacionRecord;
    label: string;
  } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Load Data
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      if (reportType === 'gastos') {
        const res = await getGastosReport(token, {
          periodo,
          anio: periodo !== 'todo' ? selectedYear : undefined,
          mes: periodo === 'mes' ? selectedMonth : undefined,
          detalle: selectedDetalle !== 'todos' ? selectedDetalle : undefined,
        });

        if (res.success && Array.isArray(res.registros)) {
          // Filter out header row if present in Google Sheets data
          const cleaned = res.registros.filter(
            (r) =>
              r.producto !== 'PRODUCTO' &&
              r.detalle !== 'DETALLE' &&
              r.fecha !== '31/12/1969'
          );
          setGastos(cleaned);
        } else {
          if (res.error?.includes('Sesión') || res.error?.includes('token')) {
            onSessionExpired();
          } else {
            onErrorToast(res.error || 'Error al obtener gastos');
          }
        }
      } else {
        const res = await getBonificacionesReport(token);
        if (res.success && Array.isArray(res.registros)) {
          const cleaned = res.registros.filter(
            (r) =>
              r.detalle !== 'DETALLE' &&
              r.fecha !== '31/12/1969'
          );
          setBonificaciones(cleaned);
        } else {
          if (res.error?.includes('Sesión') || res.error?.includes('token')) {
            onSessionExpired();
          } else {
            onErrorToast(res.error || 'Error al obtener bonificaciones');
          }
        }
      }
    } catch (err: unknown) {
      onErrorToast(err instanceof Error ? err.message : 'Error al cargar reporte');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reportType, periodo, selectedYear, selectedMonth, selectedDetalle]);

  // Unique details for filter
  const availableDetalles = useMemo(() => {
    if (reportType === 'gastos') {
      const set = new Set<string>();
      gastos.forEach((g) => {
        if (g.detalle) set.add(g.detalle);
      });
      return Array.from(set).sort();
    } else {
      const set = new Set<string>();
      bonificaciones.forEach((b) => {
        if (b.detalle) set.add(b.detalle);
      });
      return Array.from(set).sort();
    }
  }, [reportType, gastos, bonificaciones]);

  // Client-side search and detail filtering for fast responsive typing
  const filteredGastos = useMemo(() => {
    let result = gastos;
    if (selectedDetalle !== 'todos') {
      result = result.filter((g) => g.detalle === selectedDetalle);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.producto?.toLowerCase().includes(q) ||
          g.detalle?.toLowerCase().includes(q) ||
          g.origen?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [gastos, selectedDetalle, searchQuery]);

  const filteredBonificaciones = useMemo(() => {
    let result = bonificaciones;
    if (selectedDetalle !== 'todos') {
      result = result.filter((b) => b.detalle === selectedDetalle);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.detalle?.toLowerCase().includes(q) ||
          b.producto?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [bonificaciones, selectedDetalle, searchQuery]);

  // Calculate Totals
  const { totalInventario, totalCaja, totalGastos } = useMemo(() => {
    let inv = 0;
    let caja = 0;
    filteredGastos.forEach((g) => {
      const m = Number(g.monto) || 0;
      if (g.origen === 'Inventario') {
        inv += m;
      } else {
        caja += m;
      }
    });
    return {
      totalInventario: inv,
      totalCaja: caja,
      totalGastos: inv + caja,
    };
  }, [filteredGastos]);

  const totalBonificaciones = useMemo(() => {
    return filteredBonificaciones.reduce((acc, b) => acc + (Number(b.monto) || 0), 0);
  }, [filteredBonificaciones]);

  // Admin Guard Wrapper
  const executeAdminAction = (action: () => void) => {
    if (role === 'admin') {
      action();
    } else {
      setPendingAdminAction(() => action);
      setShowAdminElevation(true);
    }
  };

  // Open Edit Modal
  const handleStartEdit = (record: GastoRecord | BonificacionRecord, type: 'gasto' | 'bonificacion') => {
    executeAdminAction(() => {
      setEditingItem({ record, type });
      setEditForm({
        fecha: record.fecha || '',
        producto: record.producto || '',
        detalle: record.detalle || '',
        cantidad: (record as GastoRecord).cantidad ?? 1,
        precio: (record as GastoRecord).precio ?? record.monto,
        monto: record.monto,
      });
    });
  };

  // Open Delete Modal
  const handleStartDelete = (record: GastoRecord | BonificacionRecord) => {
    executeAdminAction(() => {
      const label = record.producto
        ? `${record.producto} - Bs ${Number(record.monto).toFixed(2)} (${record.fecha})`
        : `${record.detalle} - Bs ${Number(record.monto).toFixed(2)} (${record.fecha})`;
      setDeletingItem({ record, label });
    });
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setEditSubmitting(true);
    try {
      const { record, type } = editingItem;
      let valores: (string | number)[] = [];

      if (record.hoja === 'Retiro de inventario') {
        const cant = Number(editForm.cantidad) || 1;
        const prec = Number(editForm.precio) || 0;
        const tot = cant * prec;
        valores = [editForm.fecha, cant, editForm.producto, editForm.detalle, prec, tot];
      } else if (record.hoja === 'Gastos de Caja y Banco') {
        valores = [editForm.fecha, editForm.producto, editForm.detalle, Number(editForm.precio) || 0];
      } else if (record.hoja === 'Bonificaciones') {
        valores = [editForm.fecha, editForm.detalle, Number(editForm.monto) || 0];
      } else {
        valores = [editForm.fecha, editForm.producto, editForm.detalle, Number(editForm.precio) || 0];
      }

      const res = await updateRecord(token, record.hoja, record.row, valores);
      if (res.success) {
        onSuccessToast('Registro actualizado correctamente en Google Sheets.');
        setEditingItem(null);
        loadData(true);
      } else {
        onErrorToast(res.error || 'Error al actualizar registro.');
      }
    } catch (err: unknown) {
      onErrorToast(err instanceof Error ? err.message : 'Error de actualización');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    setDeleteSubmitting(true);
    try {
      const res = await deleteRecord(token, deletingItem.record.hoja, deletingItem.record.row);
      if (res.success) {
        onSuccessToast('Registro eliminado de Google Sheets.');
        setDeletingItem(null);
        loadData(true);
      } else {
        onErrorToast(res.error || 'Error al eliminar el registro.');
      }
    } catch (err: unknown) {
      onErrorToast(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Toggle between Gastos and Bonificaciones */}
        <div className="flex p-1 bg-slate-200/90 rounded-2xl w-full sm:w-auto">
          <button
            id="report-tab-gastos"
            onClick={() => setReportType('gastos')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
              reportType === 'gastos'
                ? 'bg-white text-teal-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="h-4 w-4 text-teal-600" />
            <span>Gastos</span>
          </button>
          <button
            id="report-tab-bonificaciones"
            onClick={() => setReportType('bonificaciones')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
              reportType === 'bonificaciones'
                ? 'bg-white text-teal-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>Bonificaciones</span>
          </button>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => loadData(true)}
          disabled={loading || refreshing}
          className="flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs hover:bg-slate-50 active:scale-95 transition"
          title="Actualizar datos desde Google Sheets"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-teal-700 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* METRICS SUMMARY CARDS */}
      {reportType === 'gastos' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Main Total Gastos Card */}
          <div className="sm:col-span-3 bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white p-5 rounded-3xl shadow-xl border border-teal-700/50">
            <div className="flex items-center justify-between text-teal-200 text-xs font-bold uppercase tracking-wider">
              <span>Total Gastos ({filteredGastos.length} registros)</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-100 border border-teal-400/30">
                Inventario + Caja
              </span>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              Bs {totalGastos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-4 pt-3 border-t border-teal-700/60 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-teal-300 font-semibold block">Total Inventario</span>
                <span className="text-lg font-bold font-mono text-emerald-300">
                  Bs {totalInventario.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-teal-300 font-semibold block">Total Caja & Banco</span>
                <span className="text-lg font-bold font-mono text-sky-300">
                  Bs {totalCaja.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-3xl shadow-xl border border-emerald-700/50">
          <div className="flex items-center justify-between text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>Total Bonificaciones ({filteredBonificaciones.length} registros)</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-100 border border-emerald-400/30">
              Ingresos Adicionales
            </span>
          </div>
          <div className="mt-2 text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-300">
            Bs {totalBonificaciones.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      )}

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-3xl shadow-md border border-slate-200/80 space-y-3">
        {/* Period Filter (Todo, Mes, Año) */}
        {reportType === 'gastos' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-teal-600" /> Período
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setPeriodo('todo')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  periodo === 'todo'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todo
              </button>
              <button
                onClick={() => setPeriodo('mes')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  periodo === 'mes'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Mes
              </button>
              <button
                onClick={() => setPeriodo('anio')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  periodo === 'anio'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Año
              </button>
            </div>

            {/* Selectors for Month and Year */}
            {periodo !== 'todo' && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                {periodo === 'mes' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Mes</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={name} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={periodo === 'mes' ? '' : 'col-span-2'}>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Año</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
                  >
                    {[2027, 2026, 2025, 2024, 2023].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detalle Filter & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-slate-400" /> Detalle
            </label>
            <select
              value={selectedDetalle}
              onChange={(e) => setSelectedDetalle(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
            >
              <option value="todos">Todos los detalles</option>
              {availableDetalles.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Search className="h-3 w-3 text-slate-400" /> Buscar
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por producto..."
                className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none placeholder:text-slate-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RECORDS LIST CONTAINER */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Registros Encontrados (
            {reportType === 'gastos' ? filteredGastos.length : filteredBonificaciones.length})
          </h3>
          {role !== 'admin' && (
            <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
              Editar/eliminar requiere clave admin
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center bg-white rounded-3xl shadow-sm border border-slate-200">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto" />
            <p className="mt-3 text-sm text-slate-600 font-medium">
              Consultando Google Sheets...
            </p>
          </div>
        ) : reportType === 'gastos' ? (
          filteredGastos.length === 0 ? (
            <div className="py-14 text-center bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto" />
              <h4 className="mt-2 text-sm font-bold text-slate-700">No hay gastos para este filtro</h4>
              <p className="text-xs text-slate-400 mt-1">
                Pruebe cambiando los filtros de mes, año o detalle.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredGastos.map((item, index) => (
                <div
                  key={`gasto-${item.hoja}-${item.row}-${index}`}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-teal-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Left: Origin & Date */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                          item.origen === 'Inventario'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-sky-100 text-sky-800 border border-sky-200'
                        }`}
                      >
                        {item.origen}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">{item.fecha}</span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(item, 'gasto')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition"
                        title="Editar registro"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleStartDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
                        title="Eliminar registro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Product & Detail */}
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {item.producto || 'Sin descripción'}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.detalle}
                        </span>
                        {item.cantidad !== undefined && item.cantidad > 0 && (
                          <span className="text-xs text-slate-400">
                            ({item.cantidad} u. × Bs {Number(item.precio || 0).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount in Bs */}
                    <div className="text-right shrink-0">
                      <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                        Bs {Number(item.monto).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredBonificaciones.length === 0 ? (
          <div className="py-14 text-center bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <Sparkles className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="mt-2 text-sm font-bold text-slate-700">No hay bonificaciones registradas</h4>
            <p className="text-xs text-slate-400 mt-1">
              Registre ingresos adicionales desde la pestaña Registrar &gt; Bonificaciones.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredBonificaciones.map((item, index) => (
              <div
                key={`bon-${item.row}-${index}`}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-emerald-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Bonificación
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{item.fecha}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(item, 'bonificacion')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition"
                      title="Editar registro"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleStartDelete(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
                      title="Eliminar registro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {item.detalle}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                      + Bs {Number(item.monto).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-teal-600" />
                Editar Registro ({editingItem.record.hoja})
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editForm.fecha}
                  onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                  required
                  className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>

              {editingItem.type === 'gasto' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Producto</label>
                  <input
                    type="text"
                    value={editForm.producto}
                    onChange={(e) => setEditForm({ ...editForm, producto: e.target.value })}
                    required
                    className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Detalle</label>
                <input
                  type="text"
                  value={editForm.detalle}
                  onChange={(e) => setEditForm({ ...editForm, detalle: e.target.value })}
                  required
                  className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>

              {editingItem.record.hoja === 'Retiro de inventario' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={editForm.cantidad}
                      onChange={(e) => setEditForm({ ...editForm, cantidad: e.target.value })}
                      required
                      className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Precio Unitario (Bs)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.precio}
                      onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })}
                      required
                      className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {editingItem.record.hoja === 'Gastos de Caja y Banco' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Precio (Bs)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.precio}
                    onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })}
                    required
                    className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                  />
                </div>
              )}

              {editingItem.type === 'bonificacion' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monto (Bs)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={editForm.monto}
                    onChange={(e) => setEditForm({ ...editForm, monto: e.target.value })}
                    required
                    className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5"
                >
                  {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">¿Eliminar este registro?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Esta acción eliminará la fila permanentemente de la hoja{' '}
              <strong>{deletingItem.record.hoja}</strong> en Google Sheets:
            </p>
            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
              {deletingItem.label}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5"
              >
                {deleteSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ELEVATION MODAL */}
      <AdminElevationModal
        isOpen={showAdminElevation}
        onClose={() => {
          setShowAdminElevation(false);
          setPendingAdminAction(null);
        }}
        onElevated={(adminToken) => {
          onElevateAdmin(adminToken);
          if (pendingAdminAction) {
            pendingAdminAction();
            setPendingAdminAction(null);
          }
        }}
        title="Acceso de Administrador Requerido"
        description="Las funciones de edición y eliminación requieren privilegios de administrador. Ingrese la contraseña para continuar."
      />
    </div>
  );
};
