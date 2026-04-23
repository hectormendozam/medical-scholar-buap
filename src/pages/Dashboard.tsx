import React, { useEffect, useState } from 'react';
import { Megaphone, GraduationCap, Clock, User, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CasoClinico } from '../types';

const notifications = [
  { id: 1, text: "Nueva retroalimentación disponible: Caso #492", time: "Hace 15 min", author: "Dr. Méndez", type: "primary" },
  { id: 2, text: "Actualización de Protocolo: Pediatría General", time: "Hace 2 horas", author: "Coordinación Médica", type: "tertiary" },
];



export function Dashboard() {
  const navigate = useNavigate();
  const [assignedCases, setAssignedCases] = useState<CasoClinico[]>([]);

  useEffect(() => {
    async function fetchCases() {
      const { data } = await supabase.from('casos_clinicos').select('*').limit(4);
      if (data) setAssignedCases(data);
    }
    fetchCases();
  }, []);

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <section>
        <h1 className="text-4xl font-serif font-bold text-on-background tracking-tight">Panel del Estudiante</h1>
        <p className="text-secondary mt-2 flex items-center gap-2">
          <GraduationCap size={18} className="text-primary" />
          Bienvenido, Dr. Alejandro Ortiz. Revisa tus asignaciones clínicas de hoy.
        </p>
      </section>

      {/* Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Notifications Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between border-b border-surface-container pb-4 mb-6">
            <h3 className="text-lg font-serif font-bold text-primary flex items-center gap-2">
              <Megaphone size={20} />
              Notificaciones Rápidas
            </h3>
            <span className="text-[10px] font-label text-secondary uppercase tracking-widest font-semibold">Últimas 24h</span>
          </div>
          
          <div className="space-y-4">
            {notifications.map((n) => (
              <div key={n.id} className="flex gap-4 items-start p-4 hover:bg-surface-container-low rounded-xl transition-all cursor-pointer group">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 animate-pulse",
                  n.type === 'primary' ? "bg-primary" : "bg-tertiary"
                )} />
                <div className="flex-1">
                  <p className="font-semibold text-on-background group-hover:text-primary transition-colors">{n.text}</p>
                  <p className="text-xs text-secondary mt-1 flex items-center gap-2">
                    <Clock size={12} />
                    {n.time} • {n.author}
                  </p>
                </div>
                <ChevronRight size={16} className="text-outline my-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-primary bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-2xl p-8 shadow-xl shadow-primary/20 flex flex-col justify-between">
          <div>
            <h3 className="font-label text-xs uppercase tracking-widest font-bold opacity-80 mb-6">Progreso Semanal</h3>
            <div className="text-6xl font-serif font-bold tabular-nums">84%</div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between text-xs font-label font-bold uppercase tracking-wider">
              <span>Casos Resueltos</span>
              <span className="opacity-80">12 / 15</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '84%' }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="bg-white h-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cases Section */}
      <section className="space-y-8">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl font-serif font-bold text-on-background tracking-tight">Mis Casos Asignados</h2>
          <button className="text-xs font-label font-bold text-primary underline underline-offset-8 hover:text-primary-container transition-colors uppercase tracking-widest">
            Ver Histórico
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {assignedCases.map((c) => (
            <motion.div 
              key={c.id}
              whileHover={{ y: -8 }}
              onClick={() => navigate(`/casos/${c.id}`)}
              className={cn(
                "group bg-white rounded-2xl overflow-hidden border border-outline-variant/10 hover:shadow-2xl transition-all duration-300 cursor-pointer",
                c.estatus === 'Completado' && "opacity-75 bg-surface-container-low"
              )}
            >
              <div className="h-40 relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=1000" 
                  alt={c.titulo}
                  className="w-full h-full object-cover grayscale-[0.2] transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-label font-bold text-primary uppercase tracking-widest border border-white/20">
                  {c.categoria || 'General'}
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="min-h-[64px]">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="text-lg font-serif font-bold text-on-background leading-tight group-hover:text-primary transition-colors">
                      {c.titulo}
                    </h3>
                  </div>
                  <span className={cn(
                    "inline-block px-2 py-1 rounded-md text-[10px] font-bold font-label uppercase tracking-wider",
                    c.estatus === 'Pendiente' ? "bg-red-50 text-red-700" : 
                    c.estatus === 'En Proceso' ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                  )}>
                    {c.estatus || 'Sin estatus'}
                  </span>
                </div>

                <div className="space-y-2 border-t border-surface-container pt-4">
                  <div className="flex items-center gap-2 text-secondary text-xs">
                    <Calendar size={14} className="text-outline" />
                    <span>Límite: No definido</span>
                  </div>
                  <div className="flex items-center gap-2 text-secondary text-xs">
                    {c.estatus === 'Completado' ? (
                      <CheckCircle2 size={14} className="text-green-600" />
                    ) : (
                      <User size={14} className="text-outline" />
                    )}
                    <span>Paciente: {c.nombre_paciente || 'No especificado'}</span>
                  </div>
                </div>

                <button className={cn(
                  "w-full py-3 rounded-xl font-bold text-sm transition-all",
                  c.estatus === 'En Proceso' 
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20" 
                    : "bg-surface-container-high text-primary hover:bg-primary hover:text-on-primary"
                )}>
                  {c.estatus === 'En Proceso' ? "Continuar Caso" : c.estatus === 'Completado' ? "Ver Resumen" : "Ver Caso"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
