import { cn } from '../lib/utils';
import { 
  LayoutDashboard as DashboardIcon, 
  Stethoscope as MedicalIcon, 
  FolderHeart as FolderIcon, 
  Settings as SettingsIcon, 
  Plus as PlusIcon,
  LayoutGrid,
  Bell as BellIcon
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { icon: DashboardIcon, label: 'Dashboard', path: '/dashboard' },
  { icon: MedicalIcon, label: 'Casos Clínicos', path: '/casos' },
  { icon: FolderIcon, label: 'Expedientes', path: '/expedientes' },
  { icon: LayoutGrid, label: 'Revisiones', path: '/revisiones' },
  { icon: BellIcon, label: 'Notificaciones', path: '/notificaciones' },
  { icon: SettingsIcon, label: 'Configuración', path: '/configuracion' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-stone-100 dark:bg-surface border-r border-outline-variant flex flex-col p-4 z-40">
      <div className="mb-8 px-4 py-2">
        <h1 className="font-headline font-black text-primary text-xl">BUAP Medicina</h1>
        <p className="text-stone-500 dark:text-stone-400 text-[10px] font-label uppercase tracking-widest mt-1">Gestión Académica</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => {
  const isActive = location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out font-medium text-sm",
                isActive 
                  ? "text-primary bg-stone-200 dark:bg-surface-container-high border-r-4 border-primary" 
                  : "text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-surface-container-low hover:text-primary"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pb-4">
        <Link 
          to="/casos/nuevo"
          className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Nuevo Caso</span>
        </Link>
      </div>
    </aside>
  );
}
