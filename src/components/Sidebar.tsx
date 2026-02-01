import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ClipboardList,
  LogOut,
  Shield,
  Vote,
  Menu,
  X,
  MessageSquare,
  Download,
  Map,
  UserCog,
  UserCheck
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Sidebar() {
  const { nombre, isAdmin, logout, cedula } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    const channel = (supabase as any)
      .channel('unread_chat_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages'
      }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [cedula, isAdmin]); // Remove location.pathname from here to rely on realtime and manual refresh

  const fetchUnreadCount = async () => {
    const myId = isAdmin ? 'admin' : cedula;
    if (!myId) return;

    try {
      const { count } = await (supabase as any)
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', myId)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error fetching unread:', err);
    }
  };

  // Force refresh when route changes to /chat
  useEffect(() => {
    fetchUnreadCount();
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/asociados', icon: ClipboardList, label: 'Asociados', show: true },
    { path: '/lideres', icon: Users, label: 'Líderes', show: isAdmin },
    { path: '/registrar-lider', icon: UserCog, label: 'Registrar Líder', show: isAdmin },
    { path: '/registrar-asociado', icon: UserCheck, label: 'Registrar Asociado', show: true },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', show: true },
    { path: '/territorio', icon: Map, label: 'Territorio Electoral', show: isAdmin },
    { path: '/chat', icon: MessageSquare, label: 'Chat', show: true },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Vote className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-sidebar-foreground text-lg">
              Impulsores Electorales
            </h1>

          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 mx-4 mt-4 rounded-xl bg-sidebar-accent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
            {isAdmin ? (
              <Shield className="w-5 h-5 text-sidebar-primary" />
            ) : (
              <span className="text-sm font-bold text-sidebar-primary">
                {nombre?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {isAdmin ? 'Administrador' : nombre}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {isAdmin ? 'Acceso completo' : `CC: ${cedula}`}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.filter(item => item.show).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setOpen(false)}
            className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.path === '/chat' && unreadCount > 0 && (
              <span className="w-2.5 h-2.5 bg-destructive rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" />
            )}
          </Link>
        ))}
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="sidebar-item w-full text-left bg-primary/10 text-primary hover:bg-primary/20 mt-4 md:hidden"
          >
            <Download className="w-5 h-5" />
            <span className="font-bold">Instalar aplicación</span>
          </button>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={logout}
          className="sidebar-item w-full text-left hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`bg-card shadow-md transition-all duration-300 ${unreadCount > 0 ? 'bg-destructive/10 border-destructive text-destructive animate-pulse' : ''}`}
            >
              <Menu className={`h-5 w-5 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border-2 border-background shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-none">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-sidebar flex-col border-r border-sidebar-border shadow-xl">
        <SidebarContent />
      </aside>
    </>
  );
}

