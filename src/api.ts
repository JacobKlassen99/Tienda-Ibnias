import {
  BackendOptions,
  ReportGastosResponse,
  ReportBonificacionesResponse,
  RegistroItem,
  RegistroOrigen,
  UserRole
} from './types';

export const API_URL =
  'https://script.google.com/macros/s/AKfycbylpYv9EFutRv_kmbo0sohrmlMOXYZE7idpyMtLOT1QfEyfrE7iVcgQG5YGnklvxlyx/exec';

// Default options fallback if network fails
export const DEFAULT_OPTIONS: BackendOptions = {
  inventario: [
    'Para Clientes',
    'Material de Limpieza',
    'Uso propio',
    'Refrigerio',
    'Gastos Administrativos',
    'Mantenimiento Jardin',
    'Decoracion y Eventos',
    'Regalos',
    'Otros',
  ],
  caja: [
    'Para Clientes',
    'Material de Limpieza',
    'Uso propio',
    'CRE',
    'Gastos Administrativos',
    'Fletes',
    'Mantenimiento Jardin',
    'Decoracion y Eventos',
    'Regalos',
    'Otros',
  ],
  compra: ['Compra de Bienes', 'Construccion'],
};

export const SHEETS_CONFIG: {
  hoja: string;
  origen: RegistroOrigen;
}[] = [
  { hoja: 'Retiro de inventario', origen: 'Inventario' },
  { hoja: 'Gastos de Caja y Banco', origen: 'Efectivo y Banco' },
  { hoja: 'Vencidos', origen: 'Vencidos' },
  { hoja: 'Compra bienes y Construccion', origen: 'Compra bienes y Construccion' },
  { hoja: 'Bonificaciones', origen: 'Bonificaciones' },
];

export interface SheetRowResponse {
  row: number;
  valores: (string | number)[];
}

/**
 * Transforma una fila de Google Sheets en un RegistroItem tipado y estructurado
 */
export function parseSheetRow(
  hoja: string,
  origen: RegistroOrigen,
  row: number,
  valores: (string | number)[]
): RegistroItem | null {
  if (!valores || valores.length === 0) return null;
  const col0 = String(valores[0] || '').trim();
  // Filtrar fila de encabezados si viene presente en los datos
  if (col0.toUpperCase() === 'FECHA' || col0 === '31/12/1969' || col0.toUpperCase() === 'TOTAL' || col0.toUpperCase() === 'SUMA') return null;

  const fecha = col0;
  let producto = '';
  let detalle = '';
  let cantidad: number | undefined;
  let precio: number | undefined;
  let precioCompra: number | undefined;
  let precioVenta: number | undefined;
  let monto = 0;

  if (hoja === 'Retiro de inventario') {
    const val1 = valores[1];
    const val2 = valores[2];
    const isVal1Num = val1 !== undefined && val1 !== '' && !isNaN(Number(val1));
    const isVal2Num = val2 !== undefined && val2 !== '' && !isNaN(Number(val2));

    if (isVal1Num && !isVal2Num) {
      cantidad = Number(val1) || 1;
      producto = String(val2 || '').trim();
    } else if (!isVal1Num && isVal2Num) {
      producto = String(val1 || '').trim();
      cantidad = Number(val2) || 1;
    } else {
      cantidad = Number(val1) || 1;
      producto = String(val2 || '').trim();
    }
    detalle = String(valores[3] || '').trim();
    precio = Number(valores[4]) || 0;
    monto = valores[5] !== undefined && valores[5] !== '' && !isNaN(Number(valores[5])) ? Number(valores[5]) || 0 : cantidad * precio;
  } else if (hoja === 'Gastos de Caja y Banco' || hoja === 'Compra bienes y Construccion') {
    producto = String(valores[1] || '').trim();
    detalle = String(valores[2] || '').trim();
    precio = Number(valores[3]) || Number(valores[2]) || 0;
    monto = Number(valores[3]) !== 0 && !isNaN(Number(valores[3])) ? Number(valores[3]) : (Number(valores[2]) || 0);
    if (!producto && detalle) {
      producto = detalle;
    }
  } else if (hoja === 'Vencidos') {
    const val1 = valores[1];
    const val2 = valores[2];
    const val3 = valores[3];
    const val4 = valores[4];
    const val5 = valores[5];

    const isVal1Num = val1 !== undefined && val1 !== '' && !isNaN(Number(val1));
    const isVal2Num = val2 !== undefined && val2 !== '' && !isNaN(Number(val2));

    if (isVal1Num && !isVal2Num) {
      cantidad = Number(val1) || 1;
      producto = String(val2 || '').trim();
      precioCompra = Number(val3) || 0;
      precioVenta = Number(val4) || 0;
    } else if (!isVal1Num && isVal2Num) {
      producto = String(val1 || '').trim();
      cantidad = Number(val2) || 1;
      precioCompra = Number(val3) || 0;
      precioVenta = Number(val4) || 0;
    } else if (!isVal1Num && !isVal2Num) {
      producto = String(val1 || val2 || '').trim();
      cantidad = Number(val2) || 1;
      precioCompra = Number(val3) || 0;
      precioVenta = Number(val4) || 0;
    } else {
      cantidad = Number(val1) || 1;
      producto = String(val2 || '').trim();
      precioCompra = Number(val3) || 0;
      precioVenta = Number(val4) || 0;
    }

    detalle = 'Vencido';
    const computedPerdida = Math.abs((precioCompra - precioVenta) * cantidad);

    if (val5 !== undefined && val5 !== '' && !isNaN(Number(val5))) {
      monto = Math.abs(Number(val5));
    } else if (val3 !== undefined && val3 !== '' && !isNaN(Number(val3)) && (val4 === undefined || val4 === '')) {
      monto = Math.abs(Number(val3));
    } else {
      monto = computedPerdida !== 0 ? computedPerdida : Math.abs(Number(val3) || 0);
    }
    if (monto === 0 && val3 !== undefined && !isNaN(Number(val3))) {
      monto = Math.abs(Number(val3) || 0);
    }
  } else if (hoja === 'Bonificaciones') {
    producto = String(valores[1] || '').trim();
    detalle = String(valores[1] || '').trim();
    monto = Number(valores[2]) || Number(valores[1]) || 0;
  } else {
    producto = String(valores[1] || '').trim();
    detalle = String(valores[2] || '').trim();
    monto = Number(valores[3]) || 0;
  }

  if (!producto) {
    producto = hoja === 'Vencidos' ? 'Vencido' : (hoja === 'Bonificaciones' ? (detalle || 'Bonificación') : 'Sin descripción');
  }

  // Filtrar filas totalmente vacías
  if (!fecha && !producto && monto === 0) return null;

  return {
    id: `${hoja}-${row}`,
    hoja,
    origen,
    row,
    fecha,
    producto,
    detalle,
    cantidad,
    precio,
    precioCompra,
    precioVenta,
    monto,
    rawValores: valores,
  };
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  token?: string;
  role?: UserRole;
  data?: T;
  row?: number;
  total?: number;
  perdida?: number;
  [key: string]: unknown;
}

/**
 * Petición GET con parámetros URL hacia Google Apps Script (evita preflight CORS / OPTIONS)
 */
async function sendGetRequest<T = unknown>(paramsData: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(paramsData)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          query.set(key, JSON.stringify(value));
        } else {
          query.set(key, String(value));
        }
      }
    }

    const res = await fetch(`${API_URL}?${query.toString()}`);

    if (!res.ok) {
      throw new Error(`Error en el servidor: HTTP ${res.status}`);
    }

    const data = (await res.json()) as ApiResponse<T>;
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido al conectar con el servidor';
    return {
      success: false,
      error: message,
    };
  }
}

// Alias de compatibilidad hacia atrás
const postRequest = sendGetRequest;

/**
 * Iniciar sesión con credenciales
 */
export async function login(
  password: string,
  username?: string
): Promise<{ success: boolean; token?: string; role?: UserRole; error?: string }> {
  try {
    const params = new URLSearchParams({
      action: 'login',
      password: password.trim(),
    });
    if (username && username.trim()) {
      params.set('username', username.trim());
    }
    const res = await fetch(`${API_URL}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || 'Credenciales incorrectas.' };
    }
    return {
      success: true,
      token: data.token,
      role: data.role as UserRole,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al conectar con el servidor';
    return {
      success: false,
      error: `No se pudo iniciar sesión (${message}). Verifique su conexión.`,
    };
  }
}

/**
 * Obtener opciones de detalles para los formularios desde la API (no requiere sesión)
 */
export async function getOptions(token?: string | null): Promise<BackendOptions> {
  try {
    const url = token
      ? `${API_URL}?action=options&token=${encodeURIComponent(token)}`
      : `${API_URL}?action=options`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.inventario && data.caja) {
        return {
          inventario: data.inventario,
          caja: data.caja,
          compra: data.compra || DEFAULT_OPTIONS.compra,
        };
      }
    }
  } catch (err) {
    console.warn('Error al cargar opciones remotas, usando predeterminadas:', err);
  }
  return DEFAULT_OPTIONS;
}

/**
 * Guardar Retiro de Inventario
 */
export async function addInventory(
  token: string,
  data: {
    fecha: string;
    producto: string;
    detalle: string;
    cantidad: number;
    precio: number;
  }
) {
  return sendGetRequest({
    action: 'addInventory',
    token,
    fecha: data.fecha,
    producto: data.producto.trim(),
    detalle: data.detalle,
    cantidad: Number(data.cantidad),
    precio: Number(data.precio),
  });
}

/**
 * Guardar Gastos de Caja & Banco
 */
export async function addCashExpense(
  token: string,
  data: {
    fecha: string;
    producto: string;
    detalle: string;
    precio: number;
  }
) {
  return sendGetRequest({
    action: 'addCashExpense',
    token,
    fecha: data.fecha,
    producto: data.producto.trim(),
    detalle: data.detalle,
    precio: Number(data.precio),
  });
}

/**
 * Guardar Vencidos
 */
export async function addExpired(
  token: string,
  data: {
    fecha: string;
    producto: string;
    cantidad: number;
    precioCompra: number;
    precioVenta: number;
  }
) {
  return sendGetRequest({
    action: 'addExpired',
    token,
    fecha: data.fecha,
    producto: data.producto.trim(),
    cantidad: Number(data.cantidad),
    precioCompra: Number(data.precioCompra),
    precioVenta: Number(data.precioVenta),
  });
}

/**
 * Guardar Compra de Bienes y Construcción
 */
export async function addPurchase(
  token: string,
  data: {
    fecha: string;
    producto: string;
    detalle: string;
    precio: number;
  }
) {
  return sendGetRequest({
    action: 'addPurchase',
    token,
    fecha: data.fecha,
    producto: data.producto.trim(),
    detalle: data.detalle,
    precio: Number(data.precio),
  });
}

/**
 * Guardar Bonificaciones
 */
export async function addBonus(
  token: string,
  data: {
    fecha: string;
    detalle: string;
    monto: number;
  }
) {
  return sendGetRequest({
    action: 'addBonus',
    token,
    fecha: data.fecha,
    detalle: data.detalle.trim(),
    monto: Number(data.monto),
  });
}

/**
 * Consultar registros de una hoja específica de Google Sheets (no requiere sesión)
 */
export async function getSheetRecords(
  hoja: string,
  token?: string | null
): Promise<{ success: boolean; hoja?: string; registros?: SheetRowResponse[]; error?: string }> {
  try {
    const params = new URLSearchParams({
      action: 'records',
      hoja,
    });
    if (token) {
      params.set('token', token);
    }
    const res = await fetch(`${API_URL}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al conectar con el servidor';
    return { success: false, error: message };
  }
}

/**
 * Carga todos los registros de las 5 hojas de Google Sheets de Tienda Ibnias
 */
export async function getAllSheetRecords(token?: string | null): Promise<{
  success: boolean;
  registros: RegistroItem[];
  errors: Record<string, string>;
}> {
  const allItems: RegistroItem[] = [];
  const errors: Record<string, string> = {};
  const seenSheetRows = new Set<string>();

  const pushItem = (item: RegistroItem) => {
    if (item.row && item.row > 0) {
      const rowKey = `${item.hoja}-${item.row}`;
      if (!seenSheetRows.has(rowKey)) {
        seenSheetRows.add(rowKey);
        allItems.push(item);
      }
    } else {
      allItems.push(item);
    }
  };

  const sheetPromises = SHEETS_CONFIG.map(async ({ hoja, origen }) => {
    try {
      const res = await getSheetRecords(hoja, token);
      const rawList =
        (res && typeof res === 'object' && 'registros' in res && Array.isArray((res as any).registros)) ? (res as any).registros :
        (res && typeof res === 'object' && 'data' in res && Array.isArray((res as any).data)) ? (res as any).data :
        (res && typeof res === 'object' && 'rows' in res && Array.isArray((res as any).rows)) ? (res as any).rows :
        (Array.isArray(res) ? res : []);

      if (rawList.length > 0) {
        rawList.forEach((r: any, idx: number) => {
          const rowNum = Number(r?.row ?? r?.rowIndex ?? r?.[0] ?? (idx + 1));
          const valores = Array.isArray(r) ? r : (r?.valores || r?.values || r?.data || Object.values(r));
          if (Array.isArray(valores) && valores.length > 0) {
            const item = parseSheetRow(hoja, origen, rowNum, valores);
            if (item) {
              pushItem(item);
            }
          }
        });
      } else if (res && typeof res === 'object' && (res as any).error) {
        errors[hoja] = (res as any).error;
      }
    } catch (e: unknown) {
      errors[hoja] = e instanceof Error ? e.message : 'Error de red';
    }
  });

  await Promise.allSettled(sheetPromises);

  return {
    success: allItems.length > 0 || Object.keys(errors).length === 0,
    registros: allItems,
    errors,
  };
}

/**
 * Consultar Reporte de Gastos (Retiro inventario + Caja y Banco)
 */
export async function getGastosReport(
  token?: string | null,
  filters?: {
    periodo?: 'todo' | 'mes' | 'anio';
    anio?: number;
    mes?: number;
    detalle?: string;
  }
): Promise<ReportGastosResponse> {
  const query = new URLSearchParams({
    action: 'report',
    tipo: 'gastos',
  });

  if (token) {
    query.set('token', token);
  }
  if (filters?.periodo && filters.periodo !== 'todo') {
    query.set('periodo', filters.periodo);
  }
  if (filters?.anio) {
    query.set('anio', String(filters.anio));
  }
  if (filters?.mes) {
    query.set('mes', String(filters.mes));
  }
  if (filters?.detalle && filters.detalle !== 'todos') {
    query.set('detalle', filters.detalle);
  }

  const res = await fetch(`${API_URL}?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as ReportGastosResponse;
}

/**
 * Consultar Reporte de Bonificaciones
 */
export async function getBonificacionesReport(token?: string | null): Promise<ReportBonificacionesResponse> {
  const url = token
    ? `${API_URL}?action=report&tipo=bonificaciones&token=${encodeURIComponent(token)}`
    : `${API_URL}?action=report&tipo=bonificaciones`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as ReportBonificacionesResponse;
}

/**
 * Actualizar registro (requiere rol admin)
 */
export async function updateRecord(
  token: string,
  hoja: string,
  row: number,
  valores: (string | number)[]
) {
  return sendGetRequest({
    action: 'updateRecord',
    token,
    hoja,
    row,
    valores,
  });
}

/**
 * Eliminar registro (requiere rol admin)
 */
export async function deleteRecord(token: string, hoja: string, row: number) {
  return sendGetRequest({
    action: 'deleteRecord',
    token,
    hoja,
    row,
  });
}

/**
 * Cambiar contraseña de acceso (usuario) o de administrador (admin)
 */
export async function changePassword(
  token: string,
  tipo: 'usuario' | 'admin',
  nuevaPassword: string
) {
  return sendGetRequest({
    action: 'changePassword',
    token,
    tipo,
    nuevaPassword,
  });
}
