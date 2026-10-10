import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Layers,
  Trash2,
  Edit3,
  Loader2,
  X,
  AlertTriangle,
  FileSpreadsheet,
  PackageMinus,
  Wallet,
  CalendarX,
  Hammer,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import {
  RegistroItem,
  RegistroOrigen,
  UserRole,
} from '../types';
import {
  getAllSheetRecords,
  updateRecord,
  deleteRecord,
} from '../api';
import { AdminElevationModal } from './AdminElevationModal';

interface ReportsViewProps {
  token: string | null;
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

const ORIGEN_FILTERS: { id: 'todos' | RegistroOrigen; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'todos', label: 'Todos', icon: ClipboardList },
  { id: 'Inventario', label: 'Inventario', icon: PackageMinus },
  { id: 'Efectivo y Banco', label: 'Efectivo y Banco', icon: Wallet },
  { id: 'Vencidos', label: 'Vencidos', icon: CalendarX },
  { id: 'Compra bienes y Construccion', label: 'Compra y Construcción', icon: Hammer },
  { id: 'Bonificaciones', label: 'Bonificaciones', icon: Sparkles },
];

function parseRecordDate(fechaStr: string | number): { year: number; month: number; day: number } | null {
  if (fechaStr === undefined || fechaStr === null || fechaStr === '') return null;
  const trimmed = String(fechaStr).trim();

  // Excel serial date (numeric string or number)
  if (/^\d{4,6}$/.test(trimmed)) {
    const serial = parseInt(trimmed, 10);
    if (!isNaN(serial) && serial > 30000) {
      const d = new Date(1899, 11, 30);
      d.setDate(d.getDate() + serial);
      if (!isNaN(d.getTime())) {
        return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
      }
    }
  }

  const cleanStr = trimmed.split('T')[0].split(' ')[0];
  const parts = cleanStr.split(/[-/.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return { year: p0, month: p1, day: p2 };
      } else if (parts[2].length === 4) {
        // DD/MM/YYYY vs MM/DD/YYYY
        if (p0 > 12 && p1 <= 12) {
          // p0 cannot be month (>12), so p0 is day, p1 is month -> DD/MM/YYYY
          return { year: p2, month: p1, day: p0 };
        } else if (p1 > 12 && p0 <= 12) {
          // p1 cannot be month (>12), so p1 is day, p0 is month -> MM/DD/YYYY
          return { year: p2, month: p0, day: p1 };
        } else {
          // Default to DD/MM/YYYY in Bolivia/LatAm
          return { year: p2, month: p1, day: p0 };
        }
      } else if (parts[2].length === 2) {
        // YY format
        const fullYear = p2 < 50 ? 2000 + p2 : 1900 + p2;
        return { year: fullYear, month: p1, day: p0 };
      }
    }
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() < 2100) {
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }

  return null;
}

/**
 * Obtiene la marca de tiempo (timestamp) en milisegundos para comparar y ordenar fechas
 */
function getRecordTimestamp(fechaStr: string): number {
  if (!fechaStr) return 0;
  const parsed = parseRecordDate(fechaStr);
  if (parsed) {
    return new Date(parsed.year, parsed.month - 1, parsed.day || 1).getTime();
  }
  const t = new Date(fechaStr).getTime();
  return isNaN(t) ? 0 : t;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  token,
  role,
  onSuccessToast,
  onErrorToast,
  onElevateAdmin,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<RegistroItem[]>([]);

  // Filter States
  const [selectedOrigen, setSelectedOrigen] = useState<'todos' | RegistroOrigen>('todos');
  const [periodo, setPeriodo] = useState<'todo' | 'mes' | 'anio'>('todo');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedDetalle, setSelectedDetalle] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Elevation Modal for Edit/Delete
  const [showAdminElevation, setShowAdminElevation] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);

  // Edit State
  const [editingItem, setEditingItem] = useState<RegistroItem | null>(null);
  const [editForm, setEditForm] = useState<{
    fecha: string;
    producto: string;
    detalle: string;
    cantidad: number | string;
    precio: number | string;
    precioCompra: number | string;
    precioVenta: number | string;
    monto: number | string;
  }>({
    fecha: '',
    producto: '',
    detalle: '',
    cantidad: 1,
    precio: 0,
    precioCompra: 0,
    precioVenta: 0,
    monto: 0,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete State
  const [deletingItem, setDeletingItem] = useState<{
    record: RegistroItem;
    label: string;
  } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Load All Records (No session dependency)
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await getAllSheetRecords(token);
      if (res.registros && res.registros.length > 0) {
        setRecords(res.registros);
      } else if (!res.success && Object.keys(res.errors).length > 0) {
        const firstErr = Object.values(res.errors)[0];
        // Never invalidate session or kick user out for consultation!
        console.warn('Advertencia al consultar hojas remotas:', firstErr);
        if (records.length === 0) {
          onErrorToast('No se pudieron obtener todos los registros de Google Sheets.');
        }
      }
    } catch (err: unknown) {
      console.warn('Error de red al consultar registros:', err);
      onErrorToast(err instanceof Error ? err.message : 'Error al consultar registros');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Detect available years from records
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    records.forEach((r) => {
      const parsed = parseRecordDate(r.fecha);
      if (parsed && parsed.year > 2000 && parsed.year < 2100) {
        years.add(parsed.year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [records]);

  // Unique details for filter based on current origen
  const availableDetalles = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (selectedOrigen === 'todos' || r.origen === selectedOrigen) {
        if (r.detalle && r.detalle !== 'DETALLE') {
          set.add(r.detalle.trim());
        }
      }
    });
    return Array.from(set).sort();
  }, [records, selectedOrigen]);

  // Filtered & Sorted Records: all categories mixed and sorted by date from newest to oldest
  const filteredRecords = useMemo(() => {
    const list = records.filter((r) => {
      // 1. Origen filter
      if (selectedOrigen !== 'todos' && r.origen !== selectedOrigen) {
        return false;
      }

      // 2. Periodo filter
      if (periodo !== 'todo') {
        const parsed = parseRecordDate(r.fecha);
        if (parsed) {
          if (parsed.year !== selectedYear) return false;
          if (periodo === 'mes' && parsed.month !== selectedMonth) return false;
        }
      }

      // 3. Detalle filter
      if (selectedDetalle !== 'todos') {
        if (r.detalle !== selectedDetalle) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesProd = r.producto ? r.producto.toLowerCase().includes(q) : false;
        const matchesDet = r.detalle ? r.detalle.toLowerCase().includes(q) : false;
        const matchesOrig = r.origen.toLowerCase().includes(q);
        const matchesDate = r.fecha.includes(q);
        if (!matchesProd && !matchesDet && !matchesOrig && !matchesDate) return false;
      }

      return true;
    });

    // Ordenar todos los registros mezclados por fecha real, del más reciente al más antiguo
    return list.sort((a, b) => {
      const timeA = getRecordTimestamp(a.fecha);
      const timeB = getRecordTimestamp(b.fecha);
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return 0;
    });
  }, [records, selectedOrigen, periodo, selectedYear, selectedMonth, selectedDetalle, searchQuery]);

  // Totals calculations
  const totals = useMemo(() => {
    let general = 0;
    let inv = 0;
    let caja = 0;
    let venc = 0;
    let compra = 0;
    let bon = 0;

    filteredRecords.forEach((r) => {
      const m = Number(r.monto) || 0;
      general += m;
      if (r.origen === 'Inventario') inv += m;
      else if (r.origen === 'Efectivo y Banco') caja += m;
      else if (r.origen === 'Vencidos') venc += m;
      else if (r.origen === 'Compra bienes y Construccion') compra += m;
      else if (r.origen === 'Bonificaciones') bon += m;
    });

    return {
      general,
      inventario: inv,
      cajaBanco: caja,
      vencidos: venc,
      compraConstruccion: compra,
      bonificaciones: bon,
    };
  }, [filteredRecords]);

  // Admin Guard Wrapper for Edit & Delete
  const executeAdminAction = (action: () => void) => {
    if (role === 'admin') {
      action();
    } else {
      setPendingAdminAction(() => action);
      setShowAdminElevation(true);
    }
  };

  // Start Edit
  const handleStartEdit = (record: RegistroItem) => {
    executeAdminAction(() => {
      setEditingItem(record);
      setEditForm({
        fecha: record.fecha || '',
        producto: record.producto || '',
        detalle: record.detalle || '',
        cantidad: record.cantidad ?? 1,
        precio: record.precio ?? record.monto,
        precioCompra: record.precioCompra ?? 0,
        precioVenta: record.precioVenta ?? 0,
        monto: record.monto,
      });
    });
  };

  // Start Delete
  const handleStartDelete = (record: RegistroItem) => {
    executeAdminAction(() => {
      const label = record.producto
        ? `${record.producto} - Bs ${Number(record.monto).toFixed(2)} (${record.fecha}) [${record.origen}]`
        : `${record.detalle} - Bs ${Number(record.monto).toFixed(2)} (${record.fecha}) [${record.origen}]`;
      setDeletingItem({ record, label });
    });
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setEditSubmitting(true);
    try {
      const { hoja, row } = editingItem;
      let valores: (string | number)[] = [];

      if (hoja === 'Retiro de inventario') {
        const cant = Number(editForm.cantidad) || 1;
        const prec = Number(editForm.precio) || 0;
        const tot = cant * prec;
        valores = [editForm.fecha, cant, editForm.producto.trim(), editForm.detalle.trim(), prec, tot];
      } else if (hoja === 'Gastos de Caja y Banco') {
        valores = [editForm.fecha, editForm.producto.trim(), editForm.detalle.trim(), Number(editForm.precio) || 0];
      } else if (hoja === 'Vencidos') {
        const cant = Number(editForm.cantidad) || 0;
        const pCompra = Number(editForm.precioCompra) || 0;
        const pVenta = Number(editForm.precioVenta) || 0;
        const perdida = (pCompra - pVenta) * cant;
        valores = [editForm.fecha, cant, editForm.producto.trim(), pCompra, pVenta, perdida];
      } else if (hoja === 'Compra bienes y Construccion') {
        valores = [editForm.fecha, editForm.producto.trim(), editForm.detalle.trim(), Number(editForm.precio) || 0];
      } else if (hoja === 'Bonificaciones') {
        valores = [editForm.fecha, editForm.detalle.trim(), Number(editForm.monto) || 0];
      } else {
        valores = [editForm.fecha, editForm.producto.trim(), editForm.detalle.trim(), Number(editForm.precio) || 0];
      }

      const res = await updateRecord(token || '', hoja, row, valores);
      if (res.success) {
        onSuccessToast('Registro actualizado en Google Sheets.');
        setEditingItem(null);
        loadData(true);
      } else {
        onErrorToast(res.error || 'Error al actualizar registro.');
      }
    } catch (err: unknown) {
      onErrorToast(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    setDeleteSubmitting(true);
    try {
      const res = await deleteRecord(token || '', deletingItem.record.hoja, deletingItem.record.row);
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

  // Badge styler for origen
  const getOrigenBadge = (origen: RegistroOrigen) => {
    switch (origen) {
      case 'Inventario':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Efectivo y Banco':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Vencidos':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Compra bienes y Construccion':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Bonificaciones':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-700" />
            Registros
          </h2>
          <p className="text-xs text-slate-500">
            Consulta general de todos los módulos sincronizados con Google Sheets
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={loading || refreshing}
          className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs hover:bg-slate-50 active:scale-95 transition cursor-pointer"
          title="Actualizar datos desde Google Sheets"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-teal-700 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Origen Filter Pills (Inventario, Efectivo y Banco, Vencidos, etc.) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {ORIGEN_FILTERS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedOrigen === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedOrigen(tab.id);
                setSelectedDetalle('todos');
              }}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold shrink-0 transition ${
                isSelected
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Total General */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-teal-900 to-slate-900 text-white p-3 rounded-2xl shadow-md border border-teal-800">
          <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">
            Total General ({filteredRecords.length})
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white mt-0.5">
            Bs {totals.general.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Inventario
          </span>
          <span className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5">
            Bs {totals.inventario.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-500 inline-block" /> Efectivo y Banco
          </span>
          <span className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5">
            Bs {totals.cajaBanco.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Vencidos (Pérdida)
          </span>
          <span className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5">
            Bs {totals.vencidos.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Extra totals if selected or in larger screens */}
        {(selectedOrigen === 'todos' || selectedOrigen === 'Compra bienes y Construccion' || selectedOrigen === 'Bonificaciones') && (
          <>
            <div className="col-span-1 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-500 inline-block" /> Compra / Constr.
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5">
                Bs {totals.compraConstruccion.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="col-span-1 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-teal-500 inline-block" /> Bonificaciones
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-slate-900 mt-0.5">
                Bs {totals.bonificaciones.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Filters & Search Row (Compact) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          {/* Period selector */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-teal-600" /> Período
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-xl">
              <button
                onClick={() => setPeriodo('todo')}
                className={`py-1 text-[11px] font-bold rounded-lg transition ${
                  periodo === 'todo' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todo
              </button>
              <button
                onClick={() => setPeriodo('mes')}
                className={`py-1 text-[11px] font-bold rounded-lg transition ${
                  periodo === 'mes' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Mes
              </button>
              <button
                onClick={() => setPeriodo('anio')}
                className={`py-1 text-[11px] font-bold rounded-lg transition ${
                  periodo === 'anio' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Año
              </button>
            </div>
          </div>

          {/* Month / Year dropdowns */}
          {periodo === 'mes' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mes</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full h-8 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodo !== 'todo' && (
            <div className={periodo === 'anio' ? 'sm:col-span-2' : ''}>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Año</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full h-8 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Detalle Filter & Text Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-slate-400" /> Detalle / Categoría
            </label>
            <select
              value={selectedDetalle}
              onChange={(e) => setSelectedDetalle(e.target.value)}
              className="w-full h-8 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none"
            >
              <option value="todos">Todos los detalles ({availableDetalles.length})</option>
              {availableDetalles.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Search className="h-3 w-3 text-slate-400" /> Buscar
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por producto, detalle o fecha..."
                className="w-full h-8 rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-7 text-xs font-medium text-slate-800 focus:bg-white focus:border-teal-600 focus:outline-none placeholder:text-slate-400"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COMPACT RECORDS LIST */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {filteredRecords.length} registros listados
          </span>
          {role !== 'admin' && (
            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
              Editar / eliminar solicita clave admin
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center bg-white rounded-2xl shadow-xs border border-slate-200">
            <Loader2 className="h-7 w-7 animate-spin text-teal-600 mx-auto" />
            <p className="mt-2 text-xs text-slate-600 font-semibold">
              Cargando registros desde Google Sheets...
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl shadow-xs border border-slate-200 p-4">
            <FileSpreadsheet className="h-9 w-9 text-slate-300 mx-auto" />
            <h4 className="mt-2 text-sm font-bold text-slate-700">No hay registros para este filtro</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Pruebe cambiando los filtros de período, detalle o módulo.
            </p>
          </div>
        ) : (
          /* Dense, compact list layout */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {filteredRecords.map((item) => (
              <div
                key={item.id}
                className="py-2 px-3 hover:bg-slate-50/90 transition flex items-center justify-between gap-2.5 text-xs"
              >
                {/* Left Section: Badge + Date + Product / Detail */}
                <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight border ${getOrigenBadge(
                        item.origen
                      )}`}
                    >
                      {item.origen}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                      {item.fecha}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 truncate">
                        {item.producto || item.detalle || 'Sin descripción'}
                      </span>
                      {item.detalle && item.producto && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium truncate">
                          {item.detalle}
                        </span>
                      )}
                    </div>

                    {/* Compact Sub-details: cantidad, precio unitario, precios vencidos */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap mt-0.5">
                      {item.cantidad !== undefined && item.cantidad > 0 && (
                        <span>
                          Cant: <strong className="text-slate-600 font-mono">{item.cantidad}</strong>
                        </span>
                      )}
                      {item.precio !== undefined && item.precio > 0 && (
                        <span>
                          P.U: <strong className="text-slate-600 font-mono">Bs {Number(item.precio).toFixed(2)}</strong>
                        </span>
                      )}
                      {item.precioCompra !== undefined && item.precioCompra > 0 && (
                        <span>
                          Compra: Bs {Number(item.precioCompra).toFixed(2)}
                          {item.precioVenta ? ` | Venta: Bs ${Number(item.precioVenta).toFixed(2)}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section: Monto + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-xs sm:text-sm font-black font-mono whitespace-nowrap ${
                        item.origen === 'Bonificaciones' ? 'text-teal-700' : 'text-slate-900'
                      }`}
                    >
                      {item.origen === 'Bonificaciones' ? '+' : ''} Bs{' '}
                      {Number(item.monto).toLocaleString('es-BO', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {/* Compact Action Buttons */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="p-1 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition"
                      title="Editar registro"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleStartDelete(item)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
                      title="Eliminar registro"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL (Sheet-aware) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-teal-600" />
                Editar Registro ({editingItem.origen})
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Fecha</label>
                <input
                  type="text"
                  value={editForm.fecha}
                  onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                  placeholder="DD/MM/YYYY o YYYY-MM-DD"
                  required
                  className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>

              {editingItem.origen !== 'Bonificaciones' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Producto</label>
                  <input
                    type="text"
                    value={editForm.producto}
                    onChange={(e) => setEditForm({ ...editForm, producto: e.target.value })}
                    required
                    className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Detalle / Categoría</label>
                <input
                  type="text"
                  value={editForm.detalle}
                  onChange={(e) => setEditForm({ ...editForm, detalle: e.target.value })}
                  required
                  className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                />
              </div>

              {/* Specific inputs for Retiro de Inventario */}
              {editingItem.hoja === 'Retiro de inventario' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Cantidad</label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={editForm.cantidad}
                      onChange={(e) => setEditForm({ ...editForm, cantidad: e.target.value })}
                      required
                      className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Precio Unitario (Bs)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editForm.precio}
                      onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })}
                      required
                      className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Specific inputs for Vencidos (Quantity + Decimal Support) */}
              {editingItem.hoja === 'Vencidos' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Cantidad</label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={editForm.cantidad}
                      onChange={(e) => setEditForm({ ...editForm, cantidad: e.target.value })}
                      required
                      className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">P. Compra</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editForm.precioCompra}
                      onChange={(e) => setEditForm({ ...editForm, precioCompra: e.target.value })}
                      required
                      className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">P. Venta</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editForm.precioVenta}
                      onChange={(e) => setEditForm({ ...editForm, precioVenta: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Gastos de Caja & Banco / Compra */}
              {(editingItem.hoja === 'Gastos de Caja y Banco' ||
                editingItem.hoja === 'Compra bienes y Construccion') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Precio (Bs)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editForm.precio}
                    onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })}
                    required
                    className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                  />
                </div>
              )}

              {/* Bonificaciones */}
              {editingItem.hoja === 'Bonificaciones' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Monto (Bs)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editForm.monto}
                    onChange={(e) => setEditForm({ ...editForm, monto: e.target.value })}
                    required
                    className="w-full h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="h-10 w-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">¿Eliminar este registro?</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Esta acción eliminará permanentemente la fila {deletingItem.record.row} de la hoja{' '}
              <strong>{deletingItem.record.hoja}</strong> en Google Sheets:
            </p>
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
              {deletingItem.label}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {deleteSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ELEVATION MODAL (Required for Edit and Delete) */}
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
        title="Código de Administrador Requerido"
        description="Las funciones de edición y eliminación están protegidas. Ingrese la contraseña de administrador para continuar."
      />
    </div>
  );
};
