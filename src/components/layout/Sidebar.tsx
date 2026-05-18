import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Stethoscope, 
  FolderOpen, 
  Bell, 
  Settings, 
  Plus,
  LayoutGrid,
  Users
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const navItems = [
  { icon: LayoutDashboard, label: 'Menú Principal', to: '/dashboard' },
  { icon: Stethoscope, label: 'Casos Clínicos', to: '/casos' },
  { icon: FolderOpen, label: 'Expedientes', to: '/expedientes' },
  { icon: LayoutGrid, label: 'Revisiones', to: '/revisiones', teacherOnly: true },
  { icon: Bell, label: 'Notificaciones', to: '/notificaciones' },
  { icon: Settings, label: 'Configuración', to: '/configuracion' },
];

export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const { isTeacher } = useAuth();
  const { userId } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { count } = await (supabase.from as any)('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
        setUnread(count ?? 0);
      } catch (err) {
        console.warn('sidebar unread', err);
      }
    })();
  }, [userId]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-surface-container flex flex-col p-4 border-r-0 antialiased z-40 transition-all">
      <div className="mb-10 px-4 py-2">
        <h1 className="font-serif font-black text-primary text-xl leading-none">BUAP Medicina</h1>
        <p className="text-secondary text-[10px] font-label uppercase tracking-widest mt-1">Gestión Académica</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.filter(item => !item.teacherOnly || isTeacher).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out font-medium text-sm",
                isActive 
                  ? "bg-surface-container-high text-primary border-r-4 border-primary font-bold" 
                  : "text-secondary hover:bg-surface-container-high hover:text-primary"
              )
            }
          >
            <item.icon size={20} />
            <span className="font-sans">{item.label}</span>
            {item.to === '/notificaciones' && unread > 0 && (
              <span className="ml-auto bg-error text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unread}</span>
            )}
          </NavLink>
        ))}

        {/* Role-specific quick links */}
        {isTeacher ? (
          <>
            <NavLink to="/gestion" className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out font-medium text-sm", isActive ? "bg-surface-container-high text-primary border-r-4 border-primary font-bold" : "text-secondary hover:bg-surface-container-high hover:text-primary") }>
              <Users size={20} />
              <span className="font-sans">Gestión</span>
            </NavLink>
          </>
        ) : (
          <NavLink to="/mis-calificaciones" className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out font-medium text-sm", isActive ? "bg-surface-container-high text-primary border-r-4 border-primary font-bold" : "text-secondary hover:bg-surface-container-high hover:text-primary") }>
            <LayoutGrid size={20} />
            <span className="font-sans">Mis Calificaciones</span>
          </NavLink>
        )}
      </nav>

      {isTeacher && (
        <div className="mt-auto px-2 pb-4">
          <NavLink to="/casos/nuevo" className="w-full py-4 px-4 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">
            <Plus size={20} />
            <span className="text-sm">Nuevo Caso</span>
          </NavLink>
        </div>
      )}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white p-4 shadow-xl overflow-auto">
            <div className="mb-6 px-2">
              <h1 className="font-serif font-black text-primary text-lg leading-none">BUAP Medicina</h1>
              <p className="text-secondary text-[10px] font-label uppercase tracking-widest mt-1">Gestión Académica</p>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.filter(item => !item.teacherOnly || isTeacher).map((item) => (
                <NavLink key={item.to} to={item.to} onClick={onClose} className={({ isActive }) => cn("flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ease-in-out font-medium text-sm", isActive ? "bg-surface-container-high text-primary border-r-4 border-primary font-bold" : "text-secondary hover:bg-surface-container-high hover:text-primary") }>
                  <item.icon size={20} />
                  <span className="font-sans">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {isTeacher && (
              <div className="mt-6 px-2">
                <NavLink to="/casos/nuevo" onClick={onClose} className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                  <Plus size={20} />
                  <span className="text-sm">Nuevo Caso</span>
                </NavLink>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
