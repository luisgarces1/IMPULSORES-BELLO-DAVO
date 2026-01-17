import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { LUGARES_VOTACION } from '@/constants/locations';
import { SearchableSelect } from '@/components/SearchableSelect';



export default function RegistrarAsociado() {
  const { cedula: cedulaLider } = useAuth();
  const [loading, setLoading] = useState(false);
  const [countAsociados, setCountAsociados] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    cedula: '',
    nombre: '',
    lugarVotacion: '',
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

    // Check max 4 asociados
    if (countAsociados !== null && countAsociados >= 4) {
      setError('Ya tienes el máximo de 4 asociados registrados');
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
        lugarVotacion: '',
        municipio: 'Bello',
      });
    } catch {
      setError('Error al registrar. Por favor intenta de nuevo.');
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
            Agrega un nuevo integrante a tu equipo de testigos electorales
          </p>
        </div>

        {/* Counter */}
        <div className="glass-panel p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Asociados registrados</p>
              <p className="text-lg font-bold font-display">
                {countAsociados !== null ? `${countAsociados} / 4` : 'Cargando...'}
              </p>
            </div>
          </div>
          {countAsociados !== null && countAsociados >= 4 && (
            <span className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm font-medium">
              Límite alcanzado
            </span>
          )}
        </div>

        {/* Form */}
        <div className="glass-panel p-8 max-w-xl">
          {countAsociados !== null && countAsociados >= 4 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-warning" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2">Límite Alcanzado</h3>
              <p className="text-muted-foreground">
                Ya tienes registrados 4 asociados, que es el máximo permitido.
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
                <label htmlFor="lugarVotacion" className="block text-sm font-medium mb-2">
                  Lugar de Votación <span className="text-destructive">*</span>
                </label>
                <SearchableSelect
                  options={LUGARES_VOTACION}
                  value={formData.lugarVotacion}
                  onChange={(value) => setFormData({ ...formData, lugarVotacion: value })}
                  placeholder="Selecciona un lugar..."
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
                  <option value="Bello">Bello</option>
                  <option value="Otro">Otro municipio</option>
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
