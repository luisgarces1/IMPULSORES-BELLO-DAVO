// Authentication context for CRM Electoral
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'lider' | 'admin' | null;

interface AuthState {
  cedula: string | null;
  nombre: string | null;
  rol: UserRole;
  isAdmin: boolean;
  isLoggedIn: boolean;
  login: (cedula: string, nombre: string, rol: UserRole, isAdmin?: boolean) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      cedula: null,
      nombre: null,
      rol: null,
      isAdmin: false,
      isLoggedIn: false,
      login: (cedula, nombre, rol, isAdmin = false) =>
        set({ cedula, nombre, rol, isAdmin, isLoggedIn: true }),
      logout: () =>
        set({ cedula: null, nombre: null, rol: null, isAdmin: false, isLoggedIn: false }),
    }),
    {
      name: 'chimbolandia-auth',
    }
  )
);
