// Database types for CRM Electoral
export type UserRole = 'lider' | 'asociado' | 'admin';
export type EstadoRegistro = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface Persona {
  cedula: string;
  nombre_completo: string;
  telefono: string | null;
  rol: UserRole;
  cedula_lider: string | null;
  lugar_votacion: string | null;
  municipio_votacion: string | null;
  vota_en_bello: boolean;
  estado: EstadoRegistro;
  fecha_registro: string;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiderWithStats extends Persona {
  total_asociados: number;
  votan_bello: number;
  no_votan_bello: number;
}

export interface DashboardStats {
  totalLideres: number;
  totalAsociados: number;
  votanEnBello: number;
  noVotanBello: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
}
