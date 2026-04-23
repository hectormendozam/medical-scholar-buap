import React from 'react';
import { Search, Bell, UserCircle } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function TopNav() {
  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-background/80 backdrop-blur-xl border-b border-outline-variant/15 flex items-center justify-between px-8 z-30">
      <div className="flex items-center gap-8">
        <h2 className="text-lg font-serif font-bold text-primary tracking-tight">BUAP Medical Scholar</h2>
        
        <nav className="hidden lg:flex items-center gap-6">
          <NavLink to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">Dashboard</NavLink>
          <NavLink to="/cases" className="text-sm font-medium text-secondary hover:text-primary transition-colors">Casos Clínicos</NavLink>
          <NavLink to="/files" className="text-sm font-medium text-secondary hover:text-primary transition-colors">Expedientes</NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
          <input 
            type="text" 
            placeholder="Buscar casos..." 
            className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 w-64 transition-all outline-none"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2 text-secondary hover:bg-surface-container-high rounded-full transition-all">
            <Bell size={20} />
          </button>
          <button className="p-2 text-secondary hover:bg-surface-container-high rounded-full transition-all">
            <UserCircle size={24} />
          </button>
        </div>
      </div>
    </header>
  );
}
