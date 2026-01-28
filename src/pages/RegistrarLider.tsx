import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, ArrowRight, CheckCircle, AlertCircle, Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { LUGARES_VOTACION, MUNICIPIOS_ANTIOQUIA } from '@/constants/locations';
import { SearchableSelect } from '@/components/SearchableSelect';



export default function RegistrarLider() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    cedula: '',
    nombre: '',
    telefono: '',
    email: '',
    lugarVotacion: 'Antioquia',
    municipio: '',
    municipio_puesto: '',
    puesto_votacion: '',
    mesa_votacion: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess(false);
  };

  const [puestosOptions, setPuestosOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingPuestos, setLoadingPuestos] = useState(false);

  useEffect(() => {
    if (formData.municipio_puesto) {
      fetchPuestos(formData.municipio_puesto);
    } else {
      setPuestosOptions([]);
    }
  }, [formData.municipio_puesto]);

  const fetchPuestos = async (municipio: string) => {
    setLoadingPuestos(true);
    // Normalizar municipio para búsqueda (quitar tildes y a mayúsculas)
    const normalizedMin = municipio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    try {
      const { data, error } = await (supabase as any)
        .from('puestos_votacion')
        .select('puesto')
        .eq('municipio', normalizedMin)
        .order('puesto', { ascending: true });

      if (error) throw error;
      const options = (data || []).map(p => ({ value: p.puesto, label: p.puesto }));
      setPuestosOptions(options);
    } catch (error) {
      console.error("Error fetching puestos:", error);
      setPuestosOptions([]);
    } finally {
      setLoadingPuestos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cedula || !formData.nombre || !formData.lugarVotacion || !formData.municipio || !formData.telefono) {
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

      // Insert new leader
      // Calculate auto-status
      let calculateEstado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' = 'PENDIENTE';
      if (formData.municipio === 'No Se' || formData.municipio_puesto === 'No Se') {
        calculateEstado = 'PENDIENTE';
      } else if (formData.municipio === formData.municipio_puesto) {
        calculateEstado = 'APROBADO';
      } else {
        calculateEstado = 'RECHAZADO';
      }

      const { error: insertError } = await supabase.from('personas').insert({
        cedula: formData.cedula.trim(),
        nombre_completo: formData.nombre.trim(),
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        rol: 'lider',
        cedula_lider: formData.cedula.trim(),
        lugar_votacion: formData.lugarVotacion,
        municipio_votacion: formData.municipio,
        municipio_puesto: formData.municipio_puesto || null,
        puesto_votacion: formData.puesto_votacion || null,
        mesa_votacion: formData.mesa_votacion || null,
        vota_en_bello: formData.municipio_puesto === 'Bello',
        estado: calculateEstado,
        registrado_por: 'admin',
      });

      if (insertError) throw insertError;

      setSuccess(true);
      toast.success('¡Líder registrado exitosamente!');

      // Reset form
      setFormData({
        cedula: '',
        nombre: '',
        telefono: '',
        email: '',
        lugarVotacion: 'Antioquia',
        municipio: '',
        municipio_puesto: '',
        puesto_votacion: '',
        mesa_votacion: '',
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
            Registrar Nuevo Líder
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Agrega un nuevo líder electoral al sistema
          </p>
        </div>

        {/* Share Invitation Link Section */}
        <div className="glass-panel p-6 mb-8 border-primary/20 bg-primary/5 max-w-xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-display font-bold text-primary mb-2 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Invitar Nuevo Líder
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Envía este enlace para que un nuevo líder se registre él mismo en el sistema:
              </p>
              <div className="flex gap-2 p-3 bg-background border border-border rounded-xl font-mono text-xs overflow-x-auto mb-4">
                {`${window.location.origin}/registro`}
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  const baseUrl = window.location.origin;
                  const msg = `Hola haz sido escogido en un grupo selecto para ser parte de este equipo ganador, como líder podrás ingresar tus colaboradores para hacer crecer nuestro sueño. Regístrate aquí: ${baseUrl}/registro`;
                  navigator.clipboard.writeText(msg);
                  toast.success('¡Invitación copiada al portapapeles!');
                }}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
              >
                <Copy className="w-4 h-4" />
                Copiar Mensaje
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hola haz sido escogido en un grupo selecto para ser parte de este equipo ganador, como líder podrás ingresar tus colaboradores para hacer crecer nuestro sueño. Regístrate aquí: ${window.location.origin}/registro`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#25D366] text-white rounded-xl font-medium hover:bg-[#128C7E] transition-all shadow-lg shadow-green-500/20 whitespace-nowrap"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                Enviar a WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="glass-panel p-8 max-w-xl">
          <div className="flex items-center gap-3 mb-6 p-4 bg-primary/5 rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Registro de Administrador</p>
              <p className="text-sm text-muted-foreground">
                Los líderes registrados por admin quedan aprobados automáticamente
              </p>
            </div>
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
              <label htmlFor="telefono" className="flex items-center gap-2 text-sm font-medium mb-2">
                WhatsApp <span className="text-destructive">*</span>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-500 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Ej: 3001234567"
                className="input-field"
                required
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
                Municipio donde vive <span className="text-destructive">*</span>
              </label>
              <SearchableSelect
                options={MUNICIPIOS_ANTIOQUIA}
                value={formData.municipio}
                onChange={(val) => setFormData({ ...formData, municipio: val })}
                placeholder="Seleccionar municipio"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="municipio_puesto" className="block text-sm font-medium mb-2">
                  Municipio de Votación
                </label>
                <SearchableSelect
                  options={MUNICIPIOS_ANTIOQUIA}
                  value={formData.municipio_puesto}
                  onChange={(val) => {
                    const updates: any = { municipio_puesto: val };
                    if (val === 'No Se') {
                      updates.puesto_votacion = '';
                      updates.mesa_votacion = '';
                    }
                    setFormData({ ...formData, ...updates });
                  }}
                  placeholder="Seleccionar municipio"
                />
              </div>

              <div>
                <label htmlFor="puesto_votacion" className="block text-sm font-medium mb-2">
                  Puesto de Votación
                </label>
                <SearchableSelect
                  options={puestosOptions}
                  value={formData.puesto_votacion}
                  onChange={(val) => setFormData({ ...formData, puesto_votacion: val })}
                  placeholder={loadingPuestos ? "Cargando..." : "Seleccionar puesto"}
                  disabled={!formData.municipio_puesto}
                />
              </div>
            </div>

            <div>
              <label htmlFor="mesa_votacion" className="block text-sm font-medium mb-2">
                Mesa de Votación
              </label>
              <input
                id="mesa_votacion"
                name="mesa_votacion"
                type="text"
                value={formData.mesa_votacion}
                onChange={handleChange}
                placeholder="Ej: 5"
                className="input-field"
              />
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
                <span>¡Líder registrado exitosamente!</span>
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
                  Registrar Líder
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
