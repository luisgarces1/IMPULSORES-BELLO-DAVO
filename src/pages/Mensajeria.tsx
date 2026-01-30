import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import {
    Send,
    Users,
    UserCheck,
    MessageSquare,
    Clock,
    Settings,
    CheckCircle2,
    AlertCircle,
    Play,
    Square,
    RefreshCcw,
    Calendar,
    Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Contact {
    cedula: string;
    nombre_completo: string;
    telefono: string;
    rol: 'lider' | 'asociado';
}

interface SendingQueueItem {
    contact: Contact;
    status: 'pending' | 'sending' | 'sent' | 'error';
    error?: string;
}

export default function Mensajeria() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState<'all' | 'lider' | 'asociado'>('all');
    const [delay, setDelay] = useState(30); // segundos por defecto
    const [includeDateTime, setIncludeDateTime] = useState(true);

    const [queue, setQueue] = useState<SendingQueueItem[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('personas')
                .select('cedula, nombre_completo, telefono, rol')
                .not('telefono', 'is', null);

            if (error) throw error;
            setContacts(data as Contact[] || []);
        } catch (err) {
            console.error('Error fetching contacts:', err);
            toast.error('Error al cargar contactos');
        } finally {
            setLoading(false);
        }
    };

    const filteredContacts = contacts.filter(c => {
        if (target === 'all') return true;
        return c.rol === target;
    });

    const prepareQueue = () => {
        if (!message.trim()) {
            toast.error('Por favor escribe un mensaje');
            return;
        }

        const newQueue: SendingQueueItem[] = filteredContacts.map(c => ({
            contact: c,
            status: 'pending'
        }));

        setQueue(newQueue);
        setCurrentIndex(0);
        setProgress(0);
        toast.success(`Cola preparada con ${newQueue.length} mensajes`);
    };

    const startSending = async () => {
        if (queue.length === 0) {
            toast.error('Prepara la cola primero');
            return;
        }
        setIsSending(true);
    };

    const stopSending = () => {
        setIsSending(false);
        toast.info('Envío pausado');
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (isSending && currentIndex < queue.length) {
            const processMessage = async () => {
                const item = queue[currentIndex];

                // Actualizar estado a "enviando"
                const updatedQueue = [...queue];
                updatedQueue[currentIndex].status = 'sending';
                setQueue(updatedQueue);

                try {
                    // Generar mensaje personalizado
                    const now = new Date();
                    const dateStr = now.toLocaleDateString();
                    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    let personalizedMsg = message
                        .replace('{nombre}', item.contact.nombre_completo)
                        .replace('{cedula}', item.contact.cedula);

                    if (includeDateTime) {
                        personalizedMsg += `\n\n_Enviado el ${dateStr} a las ${timeStr}_`;
                    }

                    // Formatear teléfono (Asegurar código de país 57 para Colombia si tiene 10 dígitos)
                    let phone = item.contact.telefono.replace(/\+|-|\s/g, '');
                    if (phone.length === 10) {
                        phone = '57' + phone;
                    }

                    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(personalizedMsg)}`;

                    // Detectar si es móvil
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

                    if (isMobile) {
                        // En móvil es mejor ir directo para evitar bloqueos de popups
                        window.location.href = waUrl;
                        // For mobile, we assume it opens and mark as sent immediately.
                        updatedQueue[currentIndex].status = 'sent';
                        setQueue(updatedQueue);

                        const nextIndex = currentIndex + 1;
                        setCurrentIndex(nextIndex);
                        setProgress(Math.round((nextIndex / queue.length) * 100));

                        if (nextIndex >= queue.length) {
                            setIsSending(false);
                            toast.success('¡Envío masivo completado!');
                        }
                    } else {
                        const newWin = window.open(waUrl, '_blank');
                        if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
                            updatedQueue[currentIndex].status = 'error';
                            updatedQueue[currentIndex].error = 'Pop-up bloqueado';
                            setQueue(updatedQueue);
                            setIsSending(false);
                            toast.error('Permite los pop-ups para el envío automático');
                        } else {
                            // ... resto de la lógica para PC
                            updatedQueue[currentIndex].status = 'sent';
                            setQueue(updatedQueue);
                            const nextIndex = currentIndex + 1;
                            setCurrentIndex(nextIndex);
                            setProgress(Math.round((nextIndex / queue.length) * 100));
                            if (nextIndex >= queue.length) {
                                setIsSending(false);
                                toast.success('¡Envío masivo completado!');
                            }
                        }
                    }
                } catch (err) {
                    updatedQueue[currentIndex].status = 'error';
                    updatedQueue[currentIndex].error = 'Error de conexión';
                    setQueue(updatedQueue);
                    setIsSending(false);
                }
            };

            // Intervalo aleatorio para parecer humano (delay +/- 5 segundos)
            const randomDelay = (delay * 1000) + (Math.random() * 10000 - 5000);
            timer = setTimeout(processMessage, currentIndex === 0 ? 0 : randomDelay);
        }

        return () => clearTimeout(timer);
    }, [isSending, currentIndex, queue, message, delay, includeDateTime]);

    return (
        <Layout>
            <div className="p-4 md:p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-primary" />
                        Centro de Mensajería WhatsApp
                    </h1>
                    <p className="text-muted-foreground">
                        Envía comunicaciones automatizadas y escalonadas para evitar bloqueos.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Configuración */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="glass-panel border-none shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-xl">Redactar Mensaje</CardTitle>
                                <CardDescription>
                                    Usa <code className="bg-muted px-1 rounded">{"{nombre}"}</code> para personalizar.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <textarea
                                    className="input-field min-h-[200px] resize-none text-base p-4"
                                    placeholder="Hola {nombre}, este es un mensaje de prueba de parte de Impulsores Electorales..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={isSending}
                                />

                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2 bg-success/10 text-success px-3 py-1.5 rounded-full text-xs font-bold border border-success/20">
                                        <Calendar className="w-3 h-3" />
                                        {"{fecha}"} automática
                                    </div>
                                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold border border-primary/20">
                                        <Clock className="w-3 h-3" />
                                        {"{hora}"} automática
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
                                        <input
                                            type="checkbox"
                                            checked={includeDateTime}
                                            onChange={(e) => setIncludeDateTime(e.target.checked)}
                                            className="w-4 h-4 rounded text-primary"
                                        />
                                        <span className="text-sm font-medium">Incluir pie de fecha/hora</span>
                                    </label>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-panel border-none shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-xl">Destinatarios y Retraso</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                            Enviar a:
                                        </label>
                                        <div className="flex gap-2 p-1 bg-muted rounded-xl">
                                            <button
                                                onClick={() => setTarget('all')}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${target === 'all' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-background'}`}
                                            >
                                                Todos ({contacts.length})
                                            </button>
                                            <button
                                                onClick={() => setTarget('lider')}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${target === 'lider' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-background'}`}
                                            >
                                                Líderes ({contacts.filter(c => c.rol === 'lider').length})
                                            </button>
                                            <button
                                                onClick={() => setTarget('asociado')}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${target === 'asociado' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-background'}`}
                                            >
                                                Asociados ({contacts.filter(c => c.rol === 'asociado').length})
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                            Intervalo entre mensajes:
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="10"
                                                max="120"
                                                step="5"
                                                value={delay}
                                                onChange={(e) => setDelay(parseInt(e.target.value))}
                                                className="flex-1 accent-primary"
                                                disabled={isSending}
                                            />
                                            <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold min-w-[70px] text-center">
                                                {delay}s
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic">
                                            Recomendado: +45s para envíos masivos grandes.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/30 pt-6">
                                <button
                                    onClick={prepareQueue}
                                    className="w-full btn-secondary h-12 text-lg"
                                    disabled={isSending || !message.trim()}
                                >
                                    <RefreshCcw className="w-5 h-5" />
                                    Preparar Cola de Envío
                                </button>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Estado de la Cola */}
                    <div className="space-y-6">
                        <Card className="glass-panel border-none shadow-xl sticky top-8">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl">Cola de Envío</CardTitle>
                                    {queue.length > 0 && (
                                        <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full uppercase">
                                            {currentIndex}/{queue.length}
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {queue.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                                        <Smartphone className="w-12 h-12 opacity-20" />
                                        <p className="text-sm">No hay mensajes en cola.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                                                <span>Progreso de envío</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <Progress value={progress} className="h-2" />
                                        </div>

                                        <div className="flex gap-3">
                                            {!isSending ? (
                                                <button
                                                    onClick={startSending}
                                                    className="flex-1 btn-primary h-12 shadow-lg shadow-primary/25"
                                                >
                                                    <Play className="w-5 h-5 fill-current" />
                                                    Iniciar Envío
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={stopSending}
                                                    className="flex-1 bg-destructive text-destructive-foreground font-bold rounded-xl flex items-center justify-center gap-2 h-12 hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/25"
                                                >
                                                    <Square className="w-5 h-5 fill-current" />
                                                    Pausar
                                                </button>
                                            )}
                                        </div>

                                        <div className="border rounded-xl max-h-[400px] overflow-y-auto bg-muted/20">
                                            {queue.map((item, idx) => (
                                                <div
                                                    key={item.contact.cedula + idx}
                                                    className={`flex items-center gap-3 p-3 border-b border-border/50 text-xs ${idx === currentIndex && isSending ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'sent' ? 'bg-success' :
                                                        item.status === 'sending' ? 'bg-primary animate-pulse' :
                                                            item.status === 'error' ? 'bg-destructive' : 'bg-muted-foreground/30'
                                                        }`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold truncate text-foreground">{item.contact.nombre_completo}</p>
                                                        <p className="text-[10px] opacity-60 flex items-center gap-1 italic">
                                                            {item.contact.telefono} • {item.contact.rol}
                                                        </p>
                                                    </div>

                                                    {/* Botones de acción individual */}
                                                    <div className="flex gap-1">
                                                        {(item.status === 'pending' || item.status === 'error') && (
                                                            <button
                                                                onClick={() => {
                                                                    const now = new Date();
                                                                    const dateStr = now.toLocaleDateString();
                                                                    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                                    let pMsg = message.replace('{nombre}', item.contact.nombre_completo).replace('{cedula}', item.contact.cedula);
                                                                    if (includeDateTime) pMsg += `\n\n_Enviado el ${dateStr} a las ${timeStr}_`;

                                                                    let phone = item.contact.telefono.replace(/\+|-|\s/g, '');
                                                                    if (phone.length === 10) phone = '57' + phone;

                                                                    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(pMsg)}`;
                                                                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

                                                                    if (isMobile) {
                                                                        window.location.href = waUrl;
                                                                    } else {
                                                                        window.open(waUrl, '_blank');
                                                                    }

                                                                    const updatedQueue = [...queue];
                                                                    updatedQueue[idx].status = 'sent';
                                                                    setQueue(updatedQueue);
                                                                }}
                                                                className="p-2 bg-success/10 hover:bg-success/20 text-success rounded-lg transition-colors"
                                                                title="Enviar manualmente"
                                                            >
                                                                <Send className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {item.status === 'sent' && <CheckCircle2 className="w-4 h-4 text-success" />}
                                                        {item.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive" title={item.error} />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                            <CardFooter className="text-[10px] text-muted-foreground leading-tight p-4 bg-muted/10 rounded-b-xl border-t border-border/50">
                                <div className="flex gap-2">
                                    <AlertCircle className="w-3 h-3 shrink-0 text-warning" />
                                    <p>
                                        <strong>Importante:</strong> Se abrirá una pestaña por persona. Asegúrate de tener activa la opción de "Permitir pop-ups" en tu navegador para este sitio. El sistema esperará el intervalo configurado entre cada apertura.
                                    </p>
                                </div>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
