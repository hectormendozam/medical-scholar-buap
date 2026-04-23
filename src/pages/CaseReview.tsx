import { 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Bell, 
  UserCircle, 
  BarChart3, 
  Eye, 
  ExternalLink, 
  FileText, 
  LayoutGrid, 
  Save, 
  X 
} from 'lucide-react';
import { cn } from '../lib/utils';

const entregas = [
  { id: '20214569', nombre_estudiante: 'Ramírez, Mariana', fecha_entrega: '22 May, 2024 · 14:30', estatus: 'Pendiente', calificacion: null, active: true },
  { id: '20213021', nombre_estudiante: 'Hernández, Luis', fecha_entrega: '21 May, 2024 · 09:12', estatus: 'Calificado', calificacion: '9.5 / 10', avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCY3HMhbOtIiUxoH0-gz8w5Zj8GLyomrnYDqoNZuTH_6E9IEKEBN_lUF7plGNxHqgkj7PnL4WZgb1moT6NW47ev45hItwI1xPVjoP5dObDoJoro4P57R11s2cZYWSs_epFFXzYpg2dnqWEoHAkjB84yzH-sVBdNCFUSzO9Co8g7VWWz1WDARRaL1PgimJbFsNTnWndGjT4PBMVVF4HxxgpCtLOCTf0T1IJu2z2rnvQGRz8JDmLSanIfqHwjlmt6EcB1oMQIVbDYWS1u' },
  { id: '20210088', nombre_estudiante: 'Castillo, Pedro', fecha_entrega: '20 May, 2024 · 18:45', estatus: 'Calificado', calificacion: '8.0 / 10' },
  { id: '20224192', nombre_estudiante: 'Arriaga, Gloria', fecha_entrega: '22 May, 2024 · 11:20', estatus: 'Pendiente', calificacion: null },
];

export default function CaseReview() {
  return (
    <div className="flex-1 flex overflow-hidden -m-8 h-[calc(100vh-64px)]">
      {/* Content Area: Review Panel */}
      <section className="flex-1 p-8 overflow-y-auto bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <nav className="flex items-center gap-2 text-[10px] text-stone-400 mb-2 uppercase tracking-widest font-bold font-label">
                <span>Académico</span>
                <ChevronRight className="w-3 h-3" />
                <span>Medicina Interna IV</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-primary">Revisiones</span>
              </nav>
              <h2 className="text-3xl font-headline font-bold text-on-surface">Panel de Revisión: Caso 042-B</h2>
              <p className="text-stone-500 mt-1">Diagnóstico Diferencial en Insuficiencia Cardíaca Congestiva</p>
            </div>
            
            <div className="bg-tertiary/5 px-4 py-2 rounded-xl flex items-center gap-3 border border-tertiary/10">
              <BarChart3 className="text-tertiary w-5 h-5" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-tertiary tracking-widest">Promedio</span>
                <span className="text-sm font-bold text-on-surface">8.4 / 10</span>
              </div>
            </div>
          </div>

          {/* Bento Grid Stats */}
          <div className="grid grid-cols-4 gap-6 mb-10">
            {[
              { label: 'Total Entregas', value: '42', color: 'primary', progress: 100 },
              { label: 'Pendientes', value: '12', color: 'error', progress: 33 },
              { label: 'Calificadas', value: '30', color: 'primary', progress: 70 },
              { label: 'Tasa de Aprobación', value: '92%', color: 'tertiary', progress: 92 },
            ].map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-surface p-5 rounded-2xl flex flex-col gap-2 ghost-border shadow-sm">
                <span className="text-stone-400 dark:text-stone-500 text-[10px] font-bold font-label uppercase tracking-widest">{stat.label}</span>
                <span className={cn(
                  "text-2xl font-bold font-headline",
                  stat.color === 'error' ? 'text-error' : stat.color === 'tertiary' ? 'text-tertiary' : 'text-on-surface'
                )}>{stat.value}</span>
                <div className="h-1 bg-stone-100 dark:bg-surface-container-low rounded-full overflow-hidden mt-2">
                  <div className={cn(
                    "h-full transition-all duration-1000",
                    stat.color === 'error' ? 'bg-error' : stat.color === 'tertiary' ? 'bg-tertiary' : 'bg-primary'
                  )} style={{ width: `${stat.progress}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-surface rounded-2xl overflow-hidden ghost-border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-stone-50 dark:bg-surface-container-low">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase font-label tracking-widest">Estudiante</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase font-label tracking-widest">Fecha de Entrega</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase font-label tracking-widest">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase font-label tracking-widest">Calificación</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase font-label tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-outline-variant">
                {entregas.map((entrega) => (
                  <tr key={entrega.id} className={cn(
                    "transition-colors",
                    entrega.active ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-stone-50 dark:hover:bg-surface-container-low"
                  )}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {entrega.avatar_url ? (
                          <img src={entrega.avatar_url} className="w-8 h-8 rounded-full object-cover" alt={entrega.nombre_estudiante} referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-surface-container-high flex items-center justify-center text-stone-500 font-bold text-[10px]">
                            {entrega.nombre_estudiante.split(', ')[1]?.[0] || 'A'}{entrega.nombre_estudiante[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-on-surface">{entrega.nombre_estudiante}</div>
                          <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">ID: {entrega.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600 dark:text-stone-400">{entrega.fecha_entrega}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest",
                        entrega.estatus === 'Pendiente' ? "bg-error-container text-on-error-container" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      )}>
                        {entrega.estatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-on-surface">
                      {entrega.calificacion || <span className="text-stone-300 dark:text-stone-600">— / 10</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {entrega.estatus === 'Pendiente' ? (
                        <button className="text-primary hover:underline text-xs font-bold uppercase tracking-widest flex items-center gap-1 justify-end ml-auto">
                          Revisar <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button className="text-stone-400 hover:text-primary transition-colors">
                          <Eye className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 bg-stone-50 dark:bg-surface-container-low flex items-center justify-between text-[10px] font-bold text-stone-400 uppercase tracking-widest font-label">
              <span>Mostrando 4 de 42 entregas</span>
              <div className="flex gap-6">
                <button className="hover:text-primary flex items-center gap-1 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <button className="hover:text-primary flex items-center gap-1 transition-colors">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Side Form: Grading & Feedback */}
      <aside className="w-96 bg-stone-50 dark:bg-surface-dim border-l border-stone-200 dark:border-outline-variant p-6 flex flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-headline text-on-surface">Revisión Actual</h3>
            <button className="text-stone-400 hover:text-on-surface transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-white dark:bg-surface p-4 rounded-2xl ghost-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">RM</div>
              <div>
                <h4 className="text-sm font-bold text-on-surface">Mariana Ramírez</h4>
                <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest font-label">Medicina Clínica · Internado</p>
              </div>
            </div>
            <button className="w-full py-2.5 bg-stone-50 dark:bg-surface-container-low text-primary font-bold text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 border border-primary/10 hover:bg-primary/5 transition-all">
              <FileText className="w-4 h-4" />
              Ver Documento PDF
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase font-label text-stone-400 tracking-widest">Evaluación por Rúbrica</span>
            <button className="text-primary text-[10px] font-black uppercase hover:underline tracking-widest">Configurar</button>
          </div>
          <button className="w-full py-4 bg-white dark:bg-surface rounded-2xl shadow-sm ghost-border hover:border-primary/20 transition-all flex items-center justify-between px-4 text-left group">
            <div>
              <span className="text-sm font-bold block group-hover:text-primary transition-colors text-on-surface">Abrir Rúbrica Digital</span>
              <span className="text-[10px] text-stone-400 font-medium">5 criterios de evaluación definidos</span>
            </div>
            <LayoutGrid className="text-primary w-5 h-5" />
          </button>
        </div>

        <form className="flex-1 flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase font-label text-stone-400 tracking-widest">Calificación Final</label>
            <div className="flex items-center gap-3">
              <input 
                type="number" 
                className="w-24 bg-white dark:bg-surface border-none rounded-xl py-3 text-center text-xl font-bold focus:ring-2 focus:ring-primary shadow-sm outline-none text-on-surface" 
                placeholder="0.0" 
                step="0.1" 
                max="10"
              />
              <span className="text-lg font-headline text-stone-300 dark:text-stone-600">/ 10.0</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <label className="text-[10px] font-bold uppercase font-label text-stone-400 tracking-widest">Retroalimentación Textual</label>
            <textarea 
              className="flex-1 w-full bg-white dark:bg-surface border-none rounded-2xl p-4 text-sm resize-none focus:ring-2 focus:ring-primary shadow-sm outline-none font-body text-on-surface" 
              placeholder="Escribe tus observaciones aquí..."
            />
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-stone-100 dark:border-outline-variant">
            <button 
              type="submit"
              className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all"
            >
              <Save className="w-5 h-5" />
              Publicar Calificación
            </button>
            <button type="button" className="w-full bg-transparent text-stone-400 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-stone-100 dark:hover:bg-surface-container-low transition-all">
              Guardar como Borrador
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
