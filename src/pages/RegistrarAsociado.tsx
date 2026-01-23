import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { LUGARES_VOTACION, MUNICIPIOS_ANTIOQUIA } from '@/constants/locations';
import { SearchableSelect } from '@/components/SearchableSelect';



export default function RegistrarAsociado() {
  const { cedula: cedulaLider, nombre } = useAuth();
  const [loading, setLoading] = useState(false);
  const [countAsociados, setCountAsociados] = useState<number | null>(null);
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

  // Check how many asociados the leader has
  useState(() => {
    const checkCount = async () => {
      const { count } = await supabase
        .from('personas')
        .select('*', { count: 'exact', head: true })
        .eq('cedula_lider', cedulaLider)
        .eq('rol', 'asociado');

      setCountAsociados(count || 0);
    };
    checkCount();
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cedula || !formData.nombre || !formData.lugarVotacion) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    // Check max 60 asociados
    if (countAsociados !== null && countAsociados >= 60) {
      setError('Ya tienes el máximo de 60 asociados registrados');
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

      // Insert new asociado
      const { error: insertError } = await supabase.from('personas').insert({
        cedula: formData.cedula.trim(),
        nombre_completo: formData.nombre.trim(),
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        rol: 'asociado',
        cedula_lider: cedulaLider,
        lugar_votacion: formData.lugarVotacion,
        municipio_votacion: formData.municipio,
        vota_en_bello: formData.municipio === 'Bello',
        estado: 'PENDIENTE',
        registrado_por: cedulaLider,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setCountAsociados((prev) => (prev !== null ? prev + 1 : 1));
      toast.success('¡Asociado registrado exitosamente!');

      // Reset form
      setFormData({
        cedula: '',
        nombre: '',
        telefono: '',
        email: '',
        lugarVotacion: 'Antioquia',
        municipio: 'Bello',
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Error al registrar. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
            Registrar Asociado
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Agrega un nuevo asociado a tu equipo ganador
          </p>
        </div>

        {/* Counter */}
        <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm border border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Asociados registrados</p>
              <p className="text-2xl font-bold font-display text-foreground">
                {countAsociados !== null ? `${countAsociados} / 60` : '0 / 60'}
              </p>
            </div>
          </div>
          {countAsociados !== null && countAsociados >= 60 ? (
            <span className="px-4 py-1.5 bg-destructive/10 text-destructive rounded-full text-xs font-bold uppercase tracking-wider">
              Límite alcanzado
            </span>
          ) : (
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hola soy ${nombre}, te invito a ser parte de este grupo ganador, lo puedes hacer ingresando al link para inscribirte: ${window.location.origin}/registro?lider=${encodeURIComponent(nombre || '')}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success hover:bg-success/20 rounded-xl transition-all font-bold text-xs"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Enviar Invitación
            </a>
          )}
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl p-8 max-w-2xl shadow-sm border border-border">
          {countAsociados !== null && countAsociados >= 60 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-warning" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2">Límite Alcanzado</h3>
              <p className="text-muted-foreground">
                Ya tienes registrados 60 asociados, que es el máximo permitido.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="cedula" className="block text-sm font-medium mb-2">
                  Cédula del Asociado <span className="text-destructive">*</span>
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
                  placeholder="Ej: María Pérez García"
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
                  type="text"
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

              {success && (
                <div className="flex items-center gap-2 p-4 bg-success/10 text-success rounded-lg">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>¡Asociado registrado exitosamente!</span>
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
                    Registrar Asociado
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
