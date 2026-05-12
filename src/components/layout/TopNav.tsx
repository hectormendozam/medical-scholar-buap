import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, UserCircle, X, LogOut, Edit, LogIn } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type NotificationRow = {
  id: number;
  title: string;
  message: string;
  case_id: number | null;
  is_read: boolean;
  created_at: string;
};

export function TopNav({ setMobileOpen }: { setMobileOpen?: (v: boolean) => void }) {
  const { isTeacher, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) setOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // load notifications only for current user when available
        const { data: userData } = await supabase.auth.getUser();
        const userId = (userData as any)?.user?.id ?? null;
        if (userId) {
          const { data } = await (supabase as any)
            .from('notifications')
            .select('*')
            .or(`user_id.eq.${userId},course_id.is.not.null`)
            .order('created_at', { ascending: false })
            .limit(10);
          if (data) setNotifications(data as NotificationRow[]);
        }
      } catch (err) {
        console.warn('notif load err', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    // subscribe to realtime notifications for the user
    const sub = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload) => {
        // only push notifications that affect the current user
        const { data: userData } = await supabase.auth.getUser();
        const userId = (userData as any)?.user?.id ?? null;
        const row = payload.new as any;
        if (!userId) return;
        if (row.user_id === userId || row.course_id != null) {
          setNotifications((prev) => [row as NotificationRow, ...prev].slice(0, 10));
        }
      })
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, []);

  const markAsRead = async (id: number, caseId?: number | null) => {
    try {
  await (supabase as any).from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      if (caseId) return navigate(`/casos/${caseId}`);
    } catch (err) {
      console.warn('mark read err', err);
    }
  };
  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-background/80 backdrop-blur-xl border-b border-outline-variant/15 flex items-center justify-between px-8 z-30">
      <div className="flex items-center gap-8">
        <button onClick={() => setMobileOpen?.(true)} className="lg:hidden p-2 rounded-md bg-surface-container-low">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <h2 className="text-lg font-serif font-bold text-primary tracking-tight">BUAP Medical Scholar</h2>
        
        <nav className="hidden lg:flex items-center gap-6">
          <NavLink to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Dashboard</NavLink>
          <NavLink to="/casos" className="text-sm font-medium text-secondary hover:text-primary transition-colors">Casos Clínicos</NavLink>
          <NavLink to="/files" className="text-sm font-medium text-secondary hover:text-primary transition-colors">Expedientes</NavLink>
          {isTeacher && (
            <NavLink to="/gestion" className="text-sm font-medium text-secondary hover:text-primary transition-colors">Gestión</NavLink>
          )}
        </nav>
      </div>

        <div className="flex items-center gap-6">
          <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
          <input 
            type="text" 
            placeholder="Buscar casos..." 
            className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 w-64 transition-all outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = (e.target as HTMLInputElement).value;
                  if (q) navigate(`/casos?q=${encodeURIComponent(q)}`);
                }
              }}
          />
        </div>
        
        <div className="flex items-center gap-3 relative">
          {!isTeacher && (
            <button onClick={() => navigate('/unirse')} className="inline-flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-full text-sm hover:bg-primary/20 transition-colors">
              <LogIn size={16} />
              <span>Unirse</span>
            </button>
          )}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setOpen((o) => !o)} className="p-2 text-secondary hover:bg-surface-container-high rounded-full transition-all relative">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-lg border border-outline-variant overflow-hidden z-50">
                <div className="p-3 border-b border-surface-container-low flex items-center justify-between">
                  <strong>Notificaciones</strong>
                  <button onClick={() => setOpen(false)} className="p-1 rounded-full text-stone-500 hover:bg-surface-container-low"><X size={14} /></button>
                </div>
                <div className="max-h-80 overflow-auto">
                  {loading && <div className="p-4 text-center">Cargando...</div>}
                  {!loading && notifications.length === 0 && <div className="p-4 text-center text-sm text-secondary">No hay notificaciones recientes.</div>}
                  {notifications.map((n) => (
                    <div key={n.id} className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-surface-container-low ${n.is_read ? 'opacity-70' : ''}`} onClick={() => {
                      // decide navigation: case -> course -> generic notifications page
                      if (n.case_id) return markAsRead(n.id, n.case_id);
                      if ((n as any).course_id) return (async () => { await (supabase as any).from('notifications').update({ is_read: true }).eq('id', n.id); navigate(`/grupos/${(n as any).course_id}`); })();
                      markAsRead(n.id, null);
                    }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-sm">{n.title} {(n.case_id || (n as any).course_id) ? <span className="text-xs text-secondary ml-2">{n.case_id ? `(Caso ${n.case_id})` : `(Grupo ${(n as any).course_id})`}</span> : null}</div>
                          <div className="text-xs text-secondary mt-1">{n.message}</div>
                        </div>
                        <div className="text-[10px] text-stone-400">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button onClick={() => setProfileOpen(p => !p)} className="flex items-center gap-2 p-2 text-secondary hover:bg-surface-container-high rounded-full transition-all">
              {/* avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-low flex items-center justify-center">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt={profile?.full_name ?? 'U'} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle size={20} />
                )}
              </div>
            </button>

            <div className={`absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-outline-variant overflow-hidden z-50 transform transition-all duration-150 origin-top-right ${profileOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}>
              <div className="p-3 border-b border-surface-container-low flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-low flex items-center justify-center">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatar_url} alt={profile?.full_name ?? 'U'} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle size={20} />
                  )}
                </div>
                <div className="flex-1 text-sm">
                  <div className="font-semibold">{profile?.full_name ?? profile?.email ?? 'Usuario'}</div>
                  <div className="text-xs text-secondary truncate">{profile?.email ?? ''}</div>
                </div>
              </div>
              <button onClick={() => { setProfileOpen(false); navigate('/configuracion'); }} className="w-full text-left p-3 hover:bg-surface-container-low flex items-center gap-3">
                <Edit size={16} />
                <span>Editar perfil</span>
              </button>
              <div className="border-t" />
              <button onClick={async () => { try { await supabase.auth.signOut(); setProfileOpen(false); navigate('/login'); } catch (err) { console.warn('signout err', err); alert('Error cerrando sesión'); } }} className="w-full text-left p-3 hover:bg-surface-container-low flex items-center gap-3 text-rose-600">
                <LogOut size={16} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
