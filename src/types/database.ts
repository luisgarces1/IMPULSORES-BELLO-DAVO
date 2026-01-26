// Database types for CRM Electoral
export type UserRole = 'lider' | 'asociado' | 'admin';
export type EstadoRegistro = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface Persona {
  cedula: string;
  nombre_completo: string;
  telefono: string | null;
  email?: string | null;
  rol: UserRole;
  cedula_lider: string | null;
  lider?: {
    nombre_completo: string;
  };
  lugar_votacion: string | null;
  municipio_votacion: string | null;
  municipio_puesto: string | null;
  puesto_votacion: string | null;
  mesa_votacion: string | null;
  estado: EstadoRegistro;
  fecha_registro: string;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiderWithStats extends Persona {
  total_asociados: number;
  votan_antioquia: number;
  no_votan_antioquia: number;
}

export interface DashboardStats {
  totalLideres: number;
  totalAsociados: number;
  votanEnAntioquia: number;
  noVotanAntioquia: number;
  lideres: {
    pendientes: number;
    aprobados: number;
    rechazados: number;
  };
  asociados: {
    pendientes: number;
    aprobados: number;
    rechazados: number;
  };
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender_nombre?: string;
}
