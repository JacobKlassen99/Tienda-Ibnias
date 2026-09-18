export type UserRole = 'user' | 'admin';

export interface SessionState {
  token: string | null;
  role: UserRole | null;
  authenticated: boolean;
}

export interface BackendOptions {
  inventario: string[];
  caja: string[];
  compra: string[];
}

export interface GastoRecord {
  fecha: string;
  producto: string;
  detalle: string;
  origen: 'Inventario' | 'Caja & Banco' | 'Bonificaciones' | string;
  monto: number;
  cantidad?: number;
  precio?: number;
  hoja: string;
  row: number;
}

export interface BonificacionRecord {
  fecha: string;
  producto?: string;
  detalle: string;
  origen?: string;
  monto: number;
  hoja: string;
  row: number;
}

export interface ReportGastosResponse {
  success: boolean;
  tipo: 'gastos';
  periodo: string;
  anio: number | null;
  mes: number | null;
  total: number;
  cantidad: number;
  registros: GastoRecord[];
  error?: string;
}

export interface ReportBonificacionesResponse {
  success: boolean;
  tipo: 'bonificaciones';
  periodo?: string;
  total: number;
  cantidad: number;
  registros: BonificacionRecord[];
  error?: string;
}

export type ActiveTab = 'registrar' | 'reportes' | 'admin';

export type RegisterFormType =
  | 'inventario'
  | 'caja_banco'
  | 'vencidos'
  | 'compra'
  | 'bonificaciones';
