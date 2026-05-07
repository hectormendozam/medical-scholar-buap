import { Search, Bell, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function TopBar() {
  const { userId } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { count } = await (supabase.from as any)('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
        setUnread(count ?? 0);
      } catch (err) {
        console.warn('unread count error', err);
      }
    })();
  }, [userId]);

  return (
    <header className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-xl border-b border-outline-variant px-6 py-3 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold font-headline text-primary tracking-tight">BUAP Medical Scholar</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar casos..." 
            className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 w-64 transition-all outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Link to="/notificaciones" className="relative p-2 text-stone-500 hover:bg-surface-container-high rounded-full transition-colors active:scale-95">
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
            )}
          </Link>
          <Link 
            to="/configuracion"
            className="p-2 text-stone-500 hover:bg-surface-container-high rounded-full transition-colors active:scale-95"
          >
            <UserCircle className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </header>
  );
}
