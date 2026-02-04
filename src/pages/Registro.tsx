import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Vote, ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Copy, Share2 } from 'lucide-react';
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
    municipio: '',
    municipio_puesto: '',
    puesto_votacion: '',
    mesa_votacion: '',
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

  const [puestosOptions, setPuestosOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingPuestos, setLoadingPuestos] = useState(false);

  useState(() => {
    if (formData.municipio_puesto) {
      fetchPuestos(formData.municipio_puesto);
    }
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cedula || !formData.nombre || !formData.lugarVotacion || !formData.municipio || !formData.telefono || !formData.municipio_puesto) {
      setError('Por favor completa todos los campos requeridos (incluyendo Municipio de Votación)');
      return;
    }

    if (formData.telefono.trim().length !== 10) {
      setError('El número de WhatsApp debe tener exactamente 10 dígitos');
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

      // Calculate auto-status
      let calculateEstado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' = 'PENDIENTE';
      if (formData.municipio === 'No Se' || formData.municipio_puesto === 'No Se') {
        calculateEstado = 'PENDIENTE';
      } else if (formData.municipio === formData.municipio_puesto) {
        calculateEstado = 'APROBADO';
      } else {
        calculateEstado = 'RECHAZADO';
      }

      // Insert new person
      const isVotante = !!liderId;
      const { error: insertError } = await supabase.from('personas').insert({
        cedula: formData.cedula.trim(),
        nombre_completo: formData.nombre.trim(),
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        rol: isVotante ? 'Votante' : 'lider',
        cedula_lider: isVotante ? liderId : formData.cedula.trim(),
        lugar_votacion: formData.lugarVotacion,
        municipio_votacion: formData.municipio,
        municipio_puesto: formData.municipio_puesto || null,
        puesto_votacion: formData.puesto_votacion || null,
        mesa_votacion: formData.mesa_votacion || null,
        vota_en_bello: formData.municipio_puesto === 'Bello',
        estado: calculateEstado,
        registrado_por: isVotante ? liderId : formData.cedula.trim(),
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
    if (liderId) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">¡Registro Exitoso!</h1>
            <p className="text-muted-foreground mb-8">
              Te has registrado correctamente en el equipo de {liderNombre || 'tu líder'}.
            </p>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 text-left">
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">¡Ayúdanos a crecer!</h3>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Invita a más personas a unirse al equipo de <strong>{liderNombre}</strong> a través de este enlace:
              </p>

              <div className="bg-muted p-3 rounded-lg border border-border mb-6 font-mono text-xs break-all">
                {`${window.location.origin}/registro?lider=${encodeURIComponent(liderNombre || '')}`}
              </div>

              <button
                onClick={() => {
                  const text = `¡Hola! Soy ${formData.nombre}, te invito a unirte al equipo GANADOR de la campaña a la cámara XXXXX de parte del líder ${liderNombre}. Regístrate aquí: ${window.location.origin}/registro?lider=${encodeURIComponent(liderNombre || '')}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Invitar por WhatsApp
              </button>
            </div>

            <button
              onClick={() => {
                setSuccess(false);
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
              }}
              className="btn-secondary w-full"
            >
              Inscribir más Votantes
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    const registrationLink = `${window.location.origin}/registro?lider=${formData.cedula}`;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8">
        <div className="max-w-2xl w-full animate-scale-in space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Bienvenido, {formData.nombre}
            </h1>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Vote className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">¡Haz crecer tu equipo!</h3>
            </div>

            <p className="text-muted-foreground mb-6">
              Comparte este enlace con tus conocidos para que se registren directamente bajo tu liderazgo, o ingresa con tu cedula y teléfono para que tú los ingreses.
            </p>

            <div className="bg-muted p-3 rounded-lg border border-border mb-6 font-mono text-sm break-all">
              {registrationLink}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(registrationLink);
                  toast.success('Enlace copiado al portapapeles');
                }}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar Enlace
              </button>

              <button
                onClick={() => {
                  const text = `Únete a mi equipo GANADOR registrándote aquí: ${registrationLink}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Compartir en WhatsApp
              </button>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="btn-primary w-full sm:w-auto"
            >
              Ir a Iniciar Sesión
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
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
              <h1 className="font-display font-bold">Impulsores Electorales</h1>
              <p className="text-xs text-muted-foreground">
                {liderId ? 'Registro de Votante' : 'Registro de Líder'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-display font-bold mb-2">
            {liderId ? 'Registrarse como Votante' : 'Registrarse como Líder'}
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
                Municipio de Votación <span className="text-destructive">*</span>
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
