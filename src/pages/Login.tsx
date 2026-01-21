import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Vote, Shield, User, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import FaceLogin from '@/components/face-auth/FaceLogin';
import FaceRegistration from '@/components/face-auth/FaceRegistration';

type LoginMode = 'lider' | 'admin';

export default function Login() {
  const [mode, setMode] = useState<LoginMode>('lider');
  const [cedula, setCedula] = useState('');
  const [codigoAdmin, setCodigoAdmin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLiderLogin = async () => {
    if (!cedula.trim()) {
      setError('Por favor ingresa tu cédula');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: persona, error: fetchError } = await supabase
        .from('personas')
        .select('*')
        .eq('cedula', cedula.trim())
        .eq('rol', 'lider')
        .single();

      if (fetchError || !persona) {
        setError('No se encontró un líder con esta cédula');
        setLoading(false);
        return;
      }

      login(persona.cedula, persona.nombre_completo, 'lider', false);
      toast.success(`¡Bienvenido, ${persona.nombre_completo}!`);
      navigate('/registrar-asociado');
    } catch {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!codigoAdmin.trim()) {
      setError('Por favor ingresa el código de administrador');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: adminCode, error: fetchError } = await supabase
        .from('admin_codes')
        .select('*')
        .eq('codigo', codigoAdmin.trim())
        .eq('activo', true)
        .single();

      if (fetchError || !adminCode) {
        setError('Código de administrador inválido');
        setLoading(false);
        return;
      }

      login('admin', 'Administrador', 'admin', true);
      toast.success('¡Bienvenido, Administrador!');
      navigate('/dashboard');
    } catch {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'lider') {
      handleLiderLogin();
    } else {
      handleAdminLogin();
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div className="absolute inset-0 bg-primary/20" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
              <Vote className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-5xl font-display font-bold mb-4">
            CRM Electoral
          </h1>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-md">
            Sistema de gestión de testigos electorales para las elecciones de Bello 2026
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary-foreground/70">
              <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span>Registro de líderes y asociados</span>
            </div>
            <div className="flex items-center gap-3 text-primary-foreground/70">
              <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <span>Control de estados y validaciones</span>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Vote className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">CRM Electoral</h1>
              <p className="text-sm text-muted-foreground">Bello 2026</p>
            </div>
          </div>

          <h2 className="text-2xl font-display font-bold mb-2">Iniciar Sesión</h2>
          <p className="text-muted-foreground mb-8">
            Ingresa con tu cédula o código de administrador
          </p>

          {/* Mode Selector */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg mb-6">
            <button
              type="button"
              onClick={() => { setMode('lider'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${mode === 'lider'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <User className="w-4 h-4" />
              Líder
            </button>
            <button
              type="button"
              onClick={() => { setMode('admin'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-all ${mode === 'admin'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Shield className="w-4 h-4" />
              Administrador
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'lider' ? (
              <div>
                <label htmlFor="cedula" className="block text-sm font-medium mb-2">
                  Número de Cédula
                </label>
                <input
                  id="cedula"
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ingresa tu cédula"
                  className="input-field"
                  autoComplete="off"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="codigo" className="block text-sm font-medium mb-2">
                    Código de Administrador
                  </label>
                  <input
                    id="codigo"
                    type="password"
                    value={codigoAdmin}
                    onChange={(e) => setCodigoAdmin(e.target.value)}
                    placeholder="Ingresa el código maestro"
                    className="input-field"
                    autoComplete="off"
                  />
                </div>
                {/* Face Auth Components */}
                <div className="pt-2 border-t border-border">
                  <FaceLogin />
                  <FaceRegistration />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Ingresar
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            ¿No estás registrado?{' '}
            <a href="/registro" className="text-primary hover:underline font-medium">
              Registrarse como líder
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
