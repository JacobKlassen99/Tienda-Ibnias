import {
  BackendOptions,
  ReportGastosResponse,
  ReportBonificacionesResponse,
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
 * Obtener opciones de detalles para los formularios desde la API
 */
export async function getOptions(token: string): Promise<BackendOptions> {
  try {
    const res = await fetch(`${API_URL}?action=options&token=${encodeURIComponent(token)}`);
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
 * Consultar Reporte de Gastos (Retiro inventario + Caja y Banco)
 */
export async function getGastosReport(
  token: string,
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
    token,
  });

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
export async function getBonificacionesReport(token: string): Promise<ReportBonificacionesResponse> {
  const res = await fetch(`${API_URL}?action=report&tipo=bonificaciones&token=${encodeURIComponent(token)}`);
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
