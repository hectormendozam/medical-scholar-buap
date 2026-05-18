import React from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, CheckCircle2, AlertCircle, ChevronRight, Stethoscope, Activity, History, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

interface GradeItem {
  id: string;
  caseId: string | number;
  caseTitle: string;
  diagnostico: string;
  planTerapeutico: string;
  justificacion: string;
  fechaEntrega: string;
  calificacion: number | null;
  retroalimentacion: string | null;
  instructorName: string | null;
  _table: 'resoluciones' | 'case_resolutions';
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
        <Clock size={11} /> En revisión
      </span>
    );
  }
  const color = score >= 90 ? 'text-green-700 bg-green-50 border-green-200'
    : score >= 70 ? 'text-blue-700 bg-blue-50 border-blue-200'
    : score >= 60 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-red-700 bg-red-50 border-red-200';
  const icon = score >= 60 ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />;
  return (
    <span className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border', color)}>
      {icon} {score}/100
    </span>
  );
}

export default function MyGrades() {
  const { userId } = useAuth() as any;
  const navigate = useNavigate();
  const [items, setItems] = React.useState<GradeItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      let combined: GradeItem[] = [];

      // 1. case_resolutions
      try {
        const { data, error } = await (supabase.from as any)('case_resolutions')
          .select('*, clinical_cases ( id, title )')
          .eq('resolved_by', userId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          const rows = (data as any[]).map((r: any) => ({
            id: String(r.id),
            caseId: r.case_id,
            caseTitle: r.clinical_cases?.title ?? r.clinical_cases?.titulo ?? `Caso #${r.case_id}`,
            diagnostico: r.resolution ?? '',
            planTerapeutico: '',
            justificacion: r.conclusion ?? '',
            fechaEntrega: r.created_at,
            calificacion: null as number | null,
            retroalimentacion: null as string | null,
            instructorName: null as string | null,
            _table: 'case_resolutions' as const,
          }));
          // Enrich with evaluaciones
          try {
            const ids = rows.map((r) => r.id);
            if (ids.length > 0) {
              const { data: evals } = await (supabase.from as any)('evaluaciones')
                .select('case_resolution_id, calificacion, retroalimentacion, instructor_id')
                .in('case_resolution_id', ids);
              const evalMap: Record<string, any> = {};
              ((evals as any[]) ?? []).forEach((e: any) => { evalMap[String(e.case_resolution_id)] = e; });
              // Fetch instructor names
              const iids = [...new Set(Object.values(evalMap).map((e: any) => e.instructor_id).filter(Boolean))];
              const instrMap: Record<string, string> = {};
              if (iids.length > 0) {
                const { data: instructors } = await (supabase.from as any)('profiles').select('id, full_name, email').in('id', iids);
                ((instructors as any[]) ?? []).forEach((p: any) => { instrMap[p.id] = p.full_name ?? p.email ?? ''; });
              }
              combined = [
                ...combined,
                ...rows.map((r) => {
                  const ev = evalMap[r.id];
                  return ev
                    ? { ...r, calificacion: ev.calificacion ?? null, retroalimentacion: ev.retroalimentacion ?? null, instructorName: instrMap[ev.instructor_id] ?? null }
                    : r;
                }),
              ];
            } else {
              combined = [...combined, ...rows];
            }
          } catch {
            combined = [...combined, ...rows];
          }
        }
      } catch { /* ignore */ }

      // 2. resoluciones
      try {
        const { data, error } = await (supabase.from as any)('resoluciones')
          .select('*, clinical_cases ( id, title )')
          .eq('estudiante_id', userId)
          .order('fecha_entrega', { ascending: false });
        if (!error && data) {
          const rows = (data as any[]).map((r: any) => ({
            id: String(r.id),
            caseId: r.caso_id ?? r.case_id,
            caseTitle: r.clinical_cases?.title ?? r.clinical_cases?.titulo ?? `Caso #${r.caso_id ?? r.case_id}`,
            diagnostico: r.diagnostico ?? '',
            planTerapeutico: r.plan_terapeutico ?? '',
            justificacion: r.justificacion ?? '',
            fechaEntrega: r.fecha_entrega ?? r.created_at,
            calificacion: null as number | null,
            retroalimentacion: null as string | null,
            instructorName: null as string | null,
            _table: 'resoluciones' as const,
          }));
          try {
            const ids = rows.map((r) => r.id);
            if (ids.length > 0) {
              const { data: evals } = await (supabase.from as any)('evaluaciones')
                .select('resolucion_id, calificacion, retroalimentacion, instructor_id')
                .in('resolucion_id', ids);
              const evalMap: Record<string, any> = {};
              ((evals as any[]) ?? []).forEach((e: any) => { evalMap[String(e.resolucion_id)] = e; });
              const iids = [...new Set(Object.values(evalMap).map((e: any) => e.instructor_id).filter(Boolean))];
              const instrMap: Record<string, string> = {};
              if (iids.length > 0) {
                const { data: instructors } = await (supabase.from as any)('profiles').select('id, full_name, email').in('id', iids);
                ((instructors as any[]) ?? []).forEach((p: any) => { instrMap[p.id] = p.full_name ?? p.email ?? ''; });
              }
              combined = [
                ...combined,
                ...rows.map((r) => {
                  const ev = evalMap[r.id];
                  return ev
                    ? { ...r, calificacion: ev.calificacion ?? null, retroalimentacion: ev.retroalimentacion ?? null, instructorName: instrMap[ev.instructor_id] ?? null }
                    : r;
                }),
              ];
            } else {
              combined = [...combined, ...rows];
            }
          } catch {
            combined = [...combined, ...rows];
          }
        }
      } catch { /* ignore */ }

      combined.sort((a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime());
      setItems(combined);
      setLoading(false);
    })();
  }, [userId]);

  // Computed stats
  const total = items.length;
  const graded = items.filter((i) => i.calificacion != null).length;
  const pending = total - graded;
  const avg = graded > 0 ? Math.round(items.filter((i) => i.calificacion != null).reduce((s, i) => s + (i.calificacion ?? 0), 0) / graded) : null;
  const passed = items.filter((i) => (i.calificacion ?? 0) >= 60).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-serif font-black text-on-background tracking-tight">Mis Calificaciones</h1>
        <p className="text-secondary mt-1 text-sm">Historial de tus decisiones clínicas y retroalimentación docente.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Enviadas', value: total, color: 'text-on-background' },
          { label: 'Revisadas', value: graded, color: 'text-primary' },
          { label: 'Pendientes', value: pending, color: 'text-amber-600' },
          { label: 'Promedio', value: avg != null ? `${avg}` : '—', color: avg != null && avg >= 60 ? 'text-green-700' : 'text-red-600', sub: avg != null ? '/100' : '' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-outline-variant/10 shadow-sm">
            <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">{s.label}</p>
            <p className={cn('text-3xl font-serif font-black', s.color)}>
              {s.value}<span className="text-sm font-normal text-outline">{s.sub}</span>
            </p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-outline-variant/10 shadow-sm">
          <Star size={40} className="mx-auto text-stone-300 mb-4" />
          <h3 className="text-lg font-bold text-on-background mb-1">Aún no has enviado ninguna decisión</h3>
          <p className="text-sm text-secondary mb-6">Explora los casos clínicos disponibles y envía tu primera resolución.</p>
          <button onClick={() => navigate('/casos')} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:brightness-110 transition-all">
            Ver casos clínicos
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isOpen = expanded === item.id;
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-container-low/50 transition-colors text-left"
                >
                  {/* Score circle */}
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-sm font-serif font-black shrink-0',
                    item.calificacion == null ? 'bg-amber-100 text-amber-700'
                      : item.calificacion >= 90 ? 'bg-green-100 text-green-700'
                      : item.calificacion >= 60 ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                  )}>
                    {item.calificacion ?? '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-on-background truncate">{item.caseTitle}</p>
                    <p className="text-[11px] text-outline mt-0.5">
                      Enviado el {new Date(item.fechaEntrega).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {item.instructorName && <span className="ml-2">· Revisado por {item.instructorName}</span>}
                    </p>
                  </div>

                  <ScoreBadge score={item.calificacion} />

                  <ChevronRight size={16} className={cn('text-outline shrink-0 transition-transform', isOpen && 'rotate-90')} />
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-outline-variant/10 px-6 py-5 space-y-4 bg-surface-container-low/40">
                    {/* Submission detail */}
                    <div className="grid gap-3">
                      {item.diagnostico && (
                        <div>
                          <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1 mb-1.5"><Stethoscope size={10} /> Diagnóstico diferencial</p>
                          <p className="text-sm bg-white rounded-xl p-3 whitespace-pre-wrap border border-outline-variant/10">{item.diagnostico}</p>
                        </div>
                      )}
                      {item.planTerapeutico && (
                        <div>
                          <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1 mb-1.5"><Activity size={10} /> Plan terapéutico</p>
                          <p className="text-sm bg-white rounded-xl p-3 whitespace-pre-wrap border border-outline-variant/10">{item.planTerapeutico}</p>
                        </div>
                      )}
                      {item.justificacion && (
                        <div>
                          <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1 mb-1.5"><History size={10} /> Justificación clínica</p>
                          <p className="text-sm bg-white rounded-xl p-3 whitespace-pre-wrap border border-outline-variant/10">{item.justificacion}</p>
                        </div>
                      )}
                    </div>

                    {/* Grade & Feedback */}
                    {item.calificacion != null ? (
                      <div className={cn(
                        'rounded-2xl p-4 border',
                        item.calificacion >= 90 ? 'bg-green-50 border-green-200'
                          : item.calificacion >= 60 ? 'bg-blue-50 border-blue-200'
                          : 'bg-red-50 border-red-200'
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Star size={10} className="fill-current" /> Calificación final
                          </p>
                          <span className={cn(
                            'text-2xl font-serif font-black',
                            item.calificacion >= 90 ? 'text-green-700'
                              : item.calificacion >= 60 ? 'text-blue-700'
                              : 'text-red-700'
                          )}>
                            {item.calificacion}<span className="text-sm font-normal opacity-60">/100</span>
                          </span>
                        </div>
                        {item.retroalimentacion && (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mb-1"><MessageSquare size={10} /> Retroalimentación del docente</p>
                            <p className="text-sm italic opacity-80">"{item.retroalimentacion}"</p>
                          </div>
                        )}
                        {item.instructorName && (
                          <p className="text-[10px] text-right opacity-60 mt-2">— {item.instructorName}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                        <Clock size={16} className="text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-700 font-medium">Tu decisión está siendo revisada por el cuerpo docente.</p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={() => navigate(`/casos/${item.caseId}`)}
                        className="flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                      >
                        Ver caso completo <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
