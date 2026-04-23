import React from 'react';
import { 
  ChevronRight, 
  Search, 
  ExternalLink, 
  Eye, 
  FileText, 
  LayoutPanelLeft, 
  Save, 
  CheckCircle2, 
  Clock, 
  BarChart3,
  Users,
  CheckCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type Resolucion = Database['public']['Tables']['resoluciones']['Row'] & {
  perfiles?: { full_name: string } | null;
  evaluaciones?: { calificacion: number }[] | null;
};

const stats = [
  { label: 'Total Entregas', value: '42', progress: 100, color: 'primary' },
  { label: 'Pendientes', value: '12', progress: 28, color: 'red' },
  { label: 'Calificadas', value: '30', progress: 72, color: 'primary' },
  { label: 'Tasa de Aprobación', value: '92%', progress: 92, color: 'amber' },
];

export function ReviewPanel() {
  const [entregas, setEntregas] = React.useState<Resolucion[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchEntregas() {
      // Intentamos traer las resoluciones y sus perfiles relacionados si existen
      const { data, error } = await supabase
        .from('resoluciones')
        .select(`
          *,
          evaluaciones ( calificacion )
        `)
        .order('fecha_entrega', { ascending: false });

      if (data) {
        setEntregas(data as Resolucion[]);
      }
      setLoading(false);
    }
    fetchEntregas();
  }, []);
  return (
    <div className="flex-1 flex flex-col gap-10">
      <div className="flex-1 flex gap-10">
        {/* Main Content Area */}
        <section className="flex-1 space-y-10">
          <header className="flex justify-between items-end">
            <div>
              <nav className="flex items-center gap-2 text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-4">
                <span>Académico</span>
                <ChevronRight size={10} />
                <span>Medicina Interna IV</span>
                <ChevronRight size={10} />
                <span className="text-primary">Revisiones</span>
              </nav>
              <h1 className="text-4xl font-serif font-black text-on-background tracking-tight">
                Panel de Revisión: Caso 042-B
              </h1>
              <p className="text-secondary mt-2 font-medium">Diagnóstico Diferencial en Insuficiencia Cardíaca Congestiva</p>
            </div>
            
            <div className="bg-tertiary/10 px-6 py-3 rounded-2xl flex items-center gap-4 border border-tertiary/10">
              <BarChart3 className="text-tertiary" size={24} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-tertiary">Promedio de Calificaciones</p>
                <p className="text-lg font-serif font-black text-on-background">8.4 / 10</p>
              </div>
            </div>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col gap-4">
                <span className="text-[10px] font-label font-black text-secondary uppercase tracking-widest">{s.label}</span>
                <span className={cn(
                  "text-3xl font-serif font-black",
                  s.color === 'red' ? "text-red-600" : s.color === 'amber' ? "text-amber-600" : "text-on-background"
                )}>{s.value}</span>
                <div className="h-1 bg-surface-container rounded-full overflow-hidden">
                   <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      s.color === 'red' ? "bg-red-600" : s.color === 'amber' ? "bg-amber-600" : "bg-primary"
                    )} 
                    style={{ width: `${s.progress}%` }} 
                   />
                </div>
              </div>
            ))}
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest">Estudiante</th>
                  <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest">Fecha de Entrega</th>
                  <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest">Calificación</th>
                  <th className="px-6 py-4 text-[10px] font-black text-secondary uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-secondary">Cargando entregas...</td></tr>
                ) : entregas.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-secondary">No hay entregas pendientes.</td></tr>
                ) : entregas.map((entrega, i) => {
                  const nombre = entrega.perfiles?.full_name || 'Estudiante ' + entrega.estudiante_id.substring(0,4);
                  const calificacion = entrega.evaluaciones?.[0]?.calificacion;
                  const isActive = i === 0; // Solo para mostrar uno seleccionado en UI
                  
                  return (
                  <tr key={entrega.id} className={cn("transition-colors", isActive ? "bg-primary/5" : "hover:bg-surface-container-low")}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase",
                           isActive ? "bg-primary text-white" : "bg-surface-container-high text-secondary"
                         )}>
                           {nombre.substring(0,2)}
                         </div>
                         <div>
                            <p className="text-sm font-bold text-on-background">{nombre}</p>
                            <p className="text-[10px] text-outline font-medium tracking-wider">ID: {entrega.id.substring(0,8)}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-secondary font-medium tracking-tight">
                      {new Date(entrega.fecha_entrega).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                        entrega.estatus === 'En Revisión' ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                      )}>
                        {entrega.estatus || 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {calificacion ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="text-primary" size={16} />
                          <span className="font-bold text-primary">{calificacion} / 10</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-secondary flex items-center gap-2">
                          <Clock size={14} /> Por Evaluar
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-2 text-secondary hover:text-primary hover:bg-surface-container rounded-lg transition-colors inline-flex">
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                )})}

              </tbody>
            </table>
            
            <div className="p-6 bg-surface-container-low flex justify-between items-center border-t border-surface-container">
               <span className="text-[10px] font-black text-outline uppercase tracking-wider">Mostrando 4 de 42 entregas</span>
               <div className="flex gap-6">
                  <button className="text-[10px] font-black uppercase tracking-widest text-outline hover:text-primary transition-colors flex items-center gap-2">
                     <Users size={12} /> Anterior
                  </button>
                  <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary-container transition-colors flex items-center gap-2">
                     Siguiente <Users size={12} />
                  </button>
               </div>
            </div>
          </div>
        </section>

        {/* Right Panel: Grading */}
        <aside className="w-[450px] bg-surface-container-low rounded-2xl flex flex-col overflow-hidden border border-outline-variant/10 shadow-lg">
          <div className="p-10 flex-1 flex flex-col gap-10">
            <header className="flex justify-between items-start">
               <h3 className="text-2xl font-serif font-black tracking-tight">Revisión Actual</h3>
               <button className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-outline">
                 <LayoutPanelLeft size={20} />
               </button>
            </header>

            <div className="bg-white p-6 rounded-2xl shadow-sm space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">RM</div>
                 <div>
                    <h4 className="text-lg font-serif font-black text-on-background">Mariana Ramírez</h4>
                    <p className="text-[10px] font-black text-outline uppercase tracking-widest">Medicina Clínica · Internado</p>
                 </div>
              </div>
              <button className="w-full py-4 bg-surface-container hover:bg-primary/5 text-primary border border-primary/10 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all">
                <FileText size={18} /> Ver Documento PDF
              </button>
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Evaluación por Rúbrica</span>
                 <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">Configurar Rúbrica</button>
               </div>
               <button className="w-full bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-primary/20 transition-all text-left flex items-center justify-between group">
                 <div>
                    <span className="text-sm font-bold block mb-1">Abrir Rúbrica Digital</span>
                    <span className="text-[10px] text-outline font-medium tracking-wider">5 criterios de evaluación definidos</span>
                 </div>
                 <div className="p-2 bg-surface-container rounded-lg text-outline group-hover:text-primary transition-colors">
                   <ChevronRight size={20} />
                 </div>
               </button>
            </div>

            <form className="flex-1 flex flex-col gap-8" onSubmit={(e) => e.preventDefault()}>
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] ml-1">Calificación Final</label>
                  <div className="flex items-center gap-4">
                     <input 
                      type="number" 
                      placeholder="0.0" 
                      step="0.1" 
                      max="10"
                      className="w-32 bg-white border-0 ring-1 ring-outline-variant/30 rounded-2xl py-4 text-center text-3xl font-serif font-black focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all"
                     />
                     <span className="text-2xl font-serif text-outline/50">/ 10.0</span>
                  </div>
               </div>

               <div className="space-y-4 flex-1">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] ml-1">Retroalimentación Textual</label>
                  <textarea 
                    className="w-full h-full min-h-[160px] bg-white border-0 ring-1 ring-outline-variant/30 rounded-2xl p-6 text-sm focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                    placeholder="Escribe tus observaciones aquí..."
                  />
               </div>

               <div className="pt-6 border-t border-outline-variant/10 space-y-4">
                  <button className="w-full py-5 bg-primary text-on-primary font-black rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest">
                    <Save size={20} /> Publicar Calificación
                  </button>
                  <button className="w-full py-4 text-outline font-bold text-xs uppercase tracking-widest hover:bg-surface-container-highest rounded-xl transition-colors">
                    Guardar como Borrador
                  </button>
               </div>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
