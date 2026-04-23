import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Stethoscope, 
  FolderOpen, 
  Bell, 
  Settings, 
  Plus 
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: Stethoscope, label: 'Casos Clínicos', to: '/cases' },
  { icon: FolderOpen, label: 'Expedientes', to: '/files' },
  { icon: Bell, label: 'Notificaciones', to: '/notifications' },
  { icon: Settings, label: 'Configuración', to: '/settings' },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container flex flex-col p-4 border-r-0 antialiased z-40 transition-all">
      <div className="mb-10 px-4 py-2">
        <h1 className="font-serif font-black text-primary text-xl leading-none">BUAP Medicina</h1>
        <p className="text-secondary text-[10px] font-label uppercase tracking-widest mt-1">Gestión Académica</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => (
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
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-2 pb-4">
        <button className="w-full py-4 px-4 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">
          <Plus size={20} />
          <span className="text-sm">Nuevo Caso</span>
        </button>
      </div>
    </aside>
  );
}
