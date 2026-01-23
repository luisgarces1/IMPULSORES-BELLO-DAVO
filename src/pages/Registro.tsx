import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Vote, ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { LUGARES_VOTACION, MUNICIPIOS_ANTIOQUIA } from '@/constants/locations';
import { SearchableSelect } from '@/components/SearchableSelect';

export default function Registro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    cedula: '',
    nombre: '',
    telefono: '',
    email: '',
    lugarVotacion: 'Antioquia',
    municipio: 'Bello',
  });
  const [liderId, setLiderId] = useState<string | null>(null);
  const [liderNombre, setLiderNombre] = useState<string | null>(null);

  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const identifier = params.get('lider');

    if (identifier) {
      const fetchLider = async (val: string) => {
        // Try to find by name first (as requested)
        const { data: byName } = await supabase
          .from('personas')
          .select('cedula, nombre_completo')
          .eq('nombre_completo', val)
          .eq('rol', 'lider')
          .maybeSingle();

        if (byName) {
          setLiderId(byName.cedula);
          setLiderNombre(byName.nombre_completo);
        } else {
          // Fallback: try to find by ID just in case old links are still out there
          const { data: byId } = await supabase
            .from('personas')
            .select('cedula, nombre_completo')
            .eq('cedula', val)
            .eq('rol', 'lider')
            .maybeSingle();

          if (byId) {
            setLiderId(byId.cedula);
            setLiderNombre(byId.nombre_completo);
          }
        }
      };
      fetchLider(identifier);
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cedula || !formData.nombre || !formData.lugarVotacion) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if cedula already exists
      const { data: existing } = await supabase
        .from('personas')
        .select('cedula')
        .eq('cedula', formData.cedula.trim())
        .single();

      if (existing) {
        setError('Esta cédula ya está registrada en el sistema');
        setLoading(false);
        return;
      }

      // Insert new person
      const isAsociado = !!liderId;
      const { error: insertError } = await supabase.from('personas').insert({
        cedula: formData.cedula.trim(),
        nombre_completo: formData.nombre.trim(),
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        rol: isAsociado ? 'asociado' : 'lider',
        cedula_lider: isAsociado ? liderId : formData.cedula.trim(),
        lugar_votacion: formData.lugarVotacion,
        municipio_votacion: formData.municipio,
        vota_en_bello: formData.municipio === 'Bello',
        estado: 'PENDIENTE',
        registrado_por: isAsociado ? liderId : formData.cedula.trim(),
      });

      if (insertError) throw insertError;

      setSuccess(true);
      if (!liderId) {
        toast.success('¡Registro exitoso! Ahora puedes iniciar sesión.');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Error al registrar. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">¡Registro Exitoso!</h1>
          <p className="text-muted-foreground mb-8">
            {liderId
              ? `Te has registrado correctamente en el equipo de ${liderNombre || 'tu líder'}.`
              : 'Tu solicitud ha sido enviada. Un administrador revisará tu registro.'}
          </p>
          {liderId ? (
            <button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  cedula: '',
                  nombre: '',
                  telefono: '',
                  email: '',
                  lugarVotacion: 'Antioquia',
                  municipio: 'Bello',
                });
              }}
              className="btn-primary"
            >
              Inscribir más asociados
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              Ir a Iniciar Sesión
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Vote className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold">CRM Electoral</h1>
              <p className="text-xs text-muted-foreground">
                {liderId ? 'Registro de Asociado' : 'Registro de Líder'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-display font-bold mb-2">
            {liderId ? 'Registrarse como Asociado' : 'Registrarse como Líder'}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            {liderId
              ? `Completa el formulario para unirte al equipo de ${liderNombre || 'tu líder'}.`
              : 'Completa el formulario para registrarte como líder electoral. Tu solicitud será revisada por un administrador.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="cedula" className="block text-sm font-medium mb-2">
              Número de Cédula <span className="text-destructive">*</span>
            </label>
            <input
              id="cedula"
              name="cedula"
              type="text"
              value={formData.cedula}
              onChange={handleChange}
              placeholder="Ej: 1234567890"
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="nombre" className="block text-sm font-medium mb-2">
              Nombre Completo <span className="text-destructive">*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez García"
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-medium mb-2">
              WhatsApp
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="Ej: 3001234567"
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Correo Electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Ej: juan@ejemplo.com"
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="municipio" className="block text-sm font-medium mb-2">
              Municipio de Votación <span className="text-destructive">*</span>
            </label>
            <select
              id="municipio"
              name="municipio"
              value={formData.municipio}
              onChange={handleChange}
              className="input-field"
              required
            >
              {MUNICIPIOS_ANTIOQUIA.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lugarVotacion" className="block text-sm font-medium mb-2">
              Departamento donde vota <span className="text-destructive">*</span>
            </label>
            <select
              id="lugarVotacion"
              name="lugarVotacion"
              value={formData.lugarVotacion}
              onChange={handleChange}
              className="input-field"
              required
            >
              <option value="Antioquia">Antioquia</option>
              <option value="Otro departamento">Otro departamento</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
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
                Registrando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Registrarse
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
