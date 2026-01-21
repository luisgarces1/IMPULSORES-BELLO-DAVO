import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage } from '@/types/database';
import { Send, Loader2, MessageSquare, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Chat() {
    const { cedula, nombre, isAdmin } = useAuth();
    const location = useLocation();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeConversations, setActiveConversations] = useState<{ cedula: string, nombre: string, hasUnread: boolean }[]>([]);
    const [selectedLeader, setSelectedLeader] = useState<{ cedula: string, nombre: string } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Handle initial state and query params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const liderId = params.get('lider');
        const liderNombre = params.get('nombre');

        if (isAdmin) {
            if (liderId && liderNombre) {
                setSelectedLeader({ cedula: liderId, nombre: liderNombre });
            }
            fetchActiveConversations();
        } else {
            setSelectedLeader({ cedula: 'admin', nombre: 'Administrador' });
        }
    }, [isAdmin, location.search]);

    // Load messages
    useEffect(() => {
        if (selectedLeader) {
            fetchMessages();
            // Subscribe to real-time changes
            const channel = (supabase as any)
                .channel('chat_messages')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages'
                }, (payload: any) => {
                    const newMsg = payload.new as ChatMessage;
                    const myId = isAdmin ? 'admin' : cedula;

                    if (
                        (newMsg.sender_id === selectedLeader.cedula && newMsg.receiver_id === myId) ||
                        (newMsg.sender_id === myId && newMsg.receiver_id === selectedLeader.cedula)
                    ) {
                        setMessages((prev) => [...prev, newMsg]);
                    }
                    if (isAdmin) fetchActiveConversations();
                })
                .subscribe();

            return () => {
                (supabase as any).removeChannel(channel);
            };
        }
    }, [selectedLeader, cedula]);

    // Mark as read when messages change and I'm the receiver
    useEffect(() => {
        const myId = isAdmin ? 'admin' : cedula;
        const unreadMessages = messages.filter(m => m.receiver_id === myId && !m.is_read);

        if (unreadMessages.length > 0 && selectedLeader) {
            markAsRead(selectedLeader.cedula);
        }
    }, [messages, selectedLeader, cedula, isAdmin]);

    const markAsRead = async (senderId: string) => {
        const myId = isAdmin ? 'admin' : cedula;
        try {
            await (supabase as any)
                .from('chat_messages')
                .update({ is_read: true })
                .eq('sender_id', senderId)
                .eq('receiver_id', myId)
                .eq('is_read', false);

            // Optimization: Update local state so UI reflects change immediately
            setMessages(prev => prev.map(m =>
                (m.sender_id === senderId && m.receiver_id === myId)
                    ? { ...m, is_read: true }
                    : m
            ));

            // Also update the unread status in activeConversations list for Admin
            if (isAdmin) {
                setActiveConversations(prev => prev.map(conv =>
                    conv.cedula === senderId ? { ...conv, hasUnread: false } : conv
                ));
            }
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchActiveConversations = async () => {
        try {
            // Get all messages where I'm involved to determine active conversations and unread status
            const { data: allMessages, error: msgError } = await (supabase as any)
                .from('chat_messages')
                .select('sender_id, receiver_id, is_read')
                .or('sender_id.eq.admin,receiver_id.eq.admin');

            if (msgError) throw msgError;

            const leaderIds = new Set<string>();
            const unreadMap: Record<string, boolean> = {};

            (allMessages as any[]).forEach(m => {
                const partnerId = m.sender_id === 'admin' ? m.receiver_id : m.sender_id;
                if (partnerId !== 'admin') {
                    leaderIds.add(partnerId);
                    if (m.receiver_id === 'admin' && !m.is_read) {
                        unreadMap[partnerId] = true;
                    }
                }
            });

            if (leaderIds.size > 0) {
                const { data: leaders, error: leaderError } = await (supabase as any)
                    .from('personas')
                    .select('cedula, nombre_completo')
                    .in('cedula', Array.from(leaderIds));

                if (leaderError) throw leaderError;

                setActiveConversations((leaders as any[]).map(l => ({
                    cedula: l.cedula,
                    nombre: l.nombre_completo,
                    hasUnread: !!unreadMap[l.cedula]
                })));
            }
        } catch (err) {
            console.error('Error fetching conversations:', err);
        }
    };

    const fetchMessages = async () => {
        if (!selectedLeader) return;
        setLoading(true);
        try {
            const myId = isAdmin ? 'admin' : cedula;
            const { data, error } = await (supabase as any)
                .from('chat_messages')
                .select('*')
                .or(`and(sender_id.eq.${myId},receiver_id.eq.${selectedLeader.cedula}),and(sender_id.eq.${selectedLeader.cedula},receiver_id.eq.${myId})`)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages((data as any[]) || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedLeader) return;

        const myId = isAdmin ? 'admin' : cedula;
        const msgContent = newMessage.trim();
        setNewMessage('');

        try {
            const { error } = await (supabase as any).from('chat_messages').insert({
                sender_id: myId,
                receiver_id: selectedLeader.cedula,
                content: msgContent,
            });

            if (error) throw error;

            // Automatic response for leaders (only on the VERY FIRST message ever)
            if (!isAdmin && messages.length === 0) {
                console.log(`ENVIANDO EMAIL A polisneo734@gmail.com: El líder ${nombre} ha iniciado un chat.`);

                setTimeout(async () => {
                    await (supabase as any).from('chat_messages').insert({
                        sender_id: 'admin',
                        receiver_id: cedula,
                        content: 'Ya enviamos una alerta al administrador para que se ponga en contacto contigo.',
                    });
                }, 1000);
            }
        } catch (err) {
            console.error('Error sending message:', err);
            toast.error('Error al enviar mensaje');
        }
    };

    return (
        <Layout>
            <div className="p-4 md:p-8 h-[calc(100vh-120px)] flex flex-col">
                <div className="mb-6">
                    <h1 className="text-2xl font-display font-bold flex items-center gap-2">
                        <MessageSquare className="text-primary" />
                        Chat de Soporte
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {isAdmin ? 'Gestiona las inquietudes de los líderes' : 'Comunícate con el administrador'}
                    </p>
                </div>

                <div className="flex-1 flex gap-6 overflow-hidden relative">
                    {isAdmin && (
                        <div className={`w-full md:w-64 bg-card rounded-2xl border border-border overflow-y-auto ${selectedLeader ? 'hidden md:block' : 'block'}`}>
                            <div className="p-4 border-b border-border font-bold text-sm">Conversaciones</div>
                            {activeConversations.length === 0 ? (
                                <div className="p-8 text-center text-xs text-muted-foreground">No hay chats activos</div>
                            ) : (
                                activeConversations.map((conv) => (
                                    <button
                                        key={conv.cedula}
                                        onClick={() => setSelectedLeader({ cedula: conv.cedula, nombre: conv.nombre })}
                                        className={`w-full p-4 text-left hover:bg-muted transition-colors flex items-center gap-3 border-b border-border/50 ${selectedLeader?.cedula === conv.cedula ? 'bg-primary/10 border-r-4 border-r-primary' : ''}`}
                                    >
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                                {conv.nombre.charAt(0)}
                                            </div>
                                            {conv.hasUnread && (
                                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm truncate ${conv.hasUnread ? 'font-black text-foreground' : 'font-medium text-muted-foreground'}`}>
                                                {conv.nombre}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">Líder</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    <div className={`flex-1 flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden relative ${!selectedLeader && isAdmin ? 'hidden md:flex' : 'flex'}`}>
                        {!selectedLeader && isAdmin ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 animate-fade-in">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <MessageSquare className="w-8 h-8" />
                                </div>
                                <p className="font-medium">Selecciona una conversación para responder</p>
                                <p className="text-xs">O puedes ir a la lista de líderes para iniciar un chat</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {isAdmin && (
                                            <button
                                                onClick={() => setSelectedLeader(null)}
                                                className="p-2 -ml-2 hover:bg-muted rounded-full md:hidden"
                                            >
                                                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                                            </button>
                                        )}
                                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                                            {selectedLeader?.nombre.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{selectedLeader?.nombre}</p>
                                            <p className="text-[10px] text-success flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                                En línea
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    ref={scrollRef}
                                    className="flex-1 p-4 overflow-y-auto space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
                                >
                                    {loading && messages.length === 0 ? (
                                        <div className="flex justify-center p-8">
                                            <Loader2 className="animate-spin text-primary" />
                                        </div>
                                    ) : (
                                        messages.map((msg, idx) => {
                                            const isMe = msg.sender_id === (isAdmin ? 'admin' : cedula);
                                            return (
                                                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-scale-in`}>
                                                    <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${isMe
                                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                        : 'bg-muted text-foreground rounded-tl-none border border-border'
                                                        }`}>
                                                        <p className="text-sm">{msg.content}</p>
                                                        <span className={`text-[9px] block mt-1 opacity-70 ${isMe ? 'text-right' : 'text-left'}`}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-background">
                                    <div className="relative flex items-center gap-2">
                                        <input
                                            type="text"
                                            className="input-field pr-12 text-sm"
                                            placeholder="Escribe un mensaje..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all font-bold"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
