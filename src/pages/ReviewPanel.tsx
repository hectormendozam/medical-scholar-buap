import React from 'react';
import { Save, CheckCircle2, ArrowLeft, Eye, Stethoscope, Activity, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────
interface CaseRow {
  id: number;
  title: string;
  status: string;
  totalSubmissions: number;
  pendingCount: number;
}

interface Resolution {
  id: string;
  caseId: number | string;
  userId: string;
  userName: string;
  fechaEntrega: string;
  diagnostico: string;
  planTerapeutico: string;
  justificacion: string;
  calificacion?: number | null;
  retroalimentacion?: string | null;
  evaluacionId?: string | null;
  _table: 'resoluciones' | 'case_resolutions';
}

// ─── helpers ─────────────────────────────────────────────────────────────────
async function fetchAllResolutions(): Promise<Resolution[]> {
  let combined: Resolution[] = [];

  // 1. case_resolutions (sin join para evitar error si evaluations no existe)
  try {
    const { data, error } = await (supabase.from as any)('case_resolutions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      combined = [
        ...combined,
        ...(data as any[]).map((r: any) => ({
          id: String(r.id),
          caseId: r.case_id,
          userId: r.resolved_by ?? '',
          userName: '',
          fechaEntrega: r.created_at,
          diagnostico: r.resolution ?? '',
          planTerapeutico: '',
          justificacion: r.conclusion ?? '',
          calificacion: null,
          retroalimentacion: null,
          evaluacionId: null,
          _table: 'case_resolutions' as const,
        })),
      ];
      // Try to enrich with evaluations (may not exist)
      try {
        const ids = (data as any[]).map((r: any) => r.id);
        if (ids.length > 0) {
          const { data: evals } = await (supabase.from as any)('evaluations')
            .select('id, case_resolution_id, total_score, feedback')
            .in('case_resolution_id', ids);
          const evalMap: Record<string, any> = {};
          ((evals as any[]) ?? []).forEach((e: any) => { evalMap[String(e.case_resolution_id)] = e; });
          combined = combined.map((r) => {
            const ev = evalMap[r.id];
            return ev ? { ...r, calificacion: ev.total_score ?? null, retroalimentacion: ev.feedback ?? null, evaluacionId: String(ev.id) } : r;
          });
        }
      } catch { /* evaluations table may not exist */ }
    }
  } catch (e) {
    console.warn('[ReviewPanel] case_resolutions:', e);
  }

  // 2. resoluciones (sin join)
  try {
    const { data, error } = await (supabase.from as any)('resoluciones')
      .select('*')
      .order('fecha_entrega', { ascending: false });
    if (!error && data) {
      const resolRows: Resolution[] = (data as any[]).map((r: any) => ({
        id: String(r.id),
        caseId: r.caso_id ?? r.case_id,
        userId: r.estudiante_id ?? r.resolved_by ?? '',
        userName: '',
        fechaEntrega: r.fecha_entrega ?? r.created_at,
        diagnostico: r.diagnostico ?? r.resolution ?? '',
        planTerapeutico: r.plan_terapeutico ?? '',
        justificacion: r.justificacion ?? r.conclusion ?? '',
        calificacion: null,
        retroalimentacion: null,
        evaluacionId: null,
        _table: 'resoluciones' as const,
      }));
      // Try evaluaciones separately
      try {
        const ids = (data as any[]).map((r: any) => r.id);
        if (ids.length > 0) {
          const { data: evals } = await (supabase.from as any)('evaluaciones')
            .select('id, resolucion_id, calificacion, retroalimentacion')
            .in('resolucion_id', ids);
          const evalMap: Record<string, any> = {};
          ((evals as any[]) ?? []).forEach((e: any) => { evalMap[String(e.resolucion_id)] = e; });
          combined = [
            ...combined,
            ...resolRows.map((r) => {
              const ev = evalMap[r.id];
              return ev ? { ...r, calificacion: ev.calificacion ?? null, retroalimentacion: ev.retroalimentacion ?? null, evaluacionId: String(ev.id) } : r;
            }),
          ];
        } else {
          combined = [...combined, ...resolRows];
        }
      } catch {
        combined = [...combined, ...resolRows];
      }
    }
  } catch (e) {
    console.warn('[ReviewPanel] resoluciones:', e);
  }

  return combined.sort((a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime());
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ReviewPanel() {
  const navigate = useNavigate();

  const [view, setView] = React.useState<'cases' | 'submissions'>('cases');
  const [cases, setCases] = React.useState<CaseRow[]>([]);
  const [selectedCase, setSelectedCase] = React.useState<CaseRow | null>(null);
  const [allResolutions, setAllResolutions] = React.useState<Resolution[]>([]);
  const [caseResolutions, setCaseResolutions] = React.useState<Resolution[]>([]);
  const [selectedRes, setSelectedRes] = React.useState<Resolution | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [grade, setGrade] = React.useState<number | ''>('');
  const [feedback, setFeedback] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      setUserId((ud as any)?.user?.id ?? null);

      const resolutions = await fetchAllResolutions();

      // Fetch profile names
      const uids = [...new Set(resolutions.map((r) => r.userId).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (uids.length > 0) {
        const { data: profs } = await (supabase.from as any)('profiles').select('id, full_name, email').in('id', uids);
        ((profs as any[]) ?? []).forEach((p: any) => {
          profileMap[p.id] = p.full_name ?? p.email ?? p.id.substring(0, 8);
        });
      }
      const withNames = resolutions.map((r) => ({
        ...r,
        userName: profileMap[r.userId] ?? r.userId?.substring(0, 8) ?? 'Estudiante',
      }));
      setAllResolutions(withNames);

      // Fetch cases
      const { data: casesData } = await (supabase.from as any)('clinical_cases')
        .select('id, title, status')
        .order('created_at', { ascending: false });
      const casesArr = ((casesData as any[]) ?? []).map((c: any) => {
        const subs = withNames.filter((r) => String(r.caseId) === String(c.id));
        return {
          id: c.id,
          title: c.title ?? c.titulo ?? `Caso #${c.id}`,
          status: c.status ?? c.estatus ?? '',
          totalSubmissions: subs.length,
          pendingCount: subs.filter((r) => r.calificacion == null).length,
        } as CaseRow;
      });
      setCases(casesArr);
      setLoading(false);
    })();
  }, []);

  const openCase = (c: CaseRow) => {
    setSelectedCase(c);
    const subs = allResolutions.filter((r) => String(r.caseId) === String(c.id));
    setCaseResolutions(subs);
    const first = subs[0] ?? null;
    setSelectedRes(first);
    setGrade(first?.calificacion ?? '');
    setFeedback(first?.retroalimentacion ?? '');
    setView('submissions');
  };

  const selectRes = (r: Resolution) => {
    setSelectedRes(r);
    setGrade(r.calificacion ?? '');
    setFeedback(r.retroalimentacion ?? '');
  };

  const saveGrade = async () => {
    if (!selectedRes || !userId) return;
    setSaving(true);
    try {
      const numGrade = typeof grade === 'number' ? grade : null;

      if (selectedRes._table === 'case_resolutions') {
        const payload: any = { case_resolution_id: selectedRes.id, total_score: numGrade, feedback, graded_by: userId };
        let res: any;
        if (selectedRes.evaluacionId) {
          res = await (supabase.from as any)('evaluations').update(payload).eq('id', selectedRes.evaluacionId);
        } else {
          res = await (supabase.from as any)('evaluations').insert(payload).select().single();
        }
        if (res.error) throw res.error;
      } else {
        const payload: any = { resolucion_id: selectedRes.id, instructor_id: userId, calificacion: numGrade, retroalimentacion: feedback, created_at: new Date().toISOString() };
        let res: any;
        if (selectedRes.evaluacionId) {
          res = await (supabase.from as any)('evaluaciones').update(payload).eq('id', selectedRes.evaluacionId);
        } else {
          res = await (supabase.from as any)('evaluaciones').insert(payload).select().single();
        }
        if (res.error) throw res.error;
      }

      const updated: Resolution = { ...selectedRes, calificacion: numGrade, retroalimentacion: feedback };
      setAllResolutions((prev) => prev.map((r) => (r.id === selectedRes.id ? updated : r)));
      setCaseResolutions((prev) => prev.map((r) => (r.id === selectedRes.id ? updated : r)));
      // also update case pending count
      setCases((prev) => prev.map((c) => {
        if (c.id !== selectedCase?.id) return c;
        const subs = allResolutions.map((r) => r.id === selectedRes.id ? updated : r).filter((r) => String(r.caseId) === String(c.id));
        return { ...c, pendingCount: subs.filter((r) => r.calificacion == null).length };
      }));
      setSelectedRes(updated);
      alert('✅ Calificación guardada');
    } catch (err: any) {
      alert('Error guardando: ' + (err?.message ?? String(err)));
    } finally {
      setSaving(false);
    }
  };

  // Global stats
  const totalSubs = allResolutions.length;
  const gradedSubs = allResolutions.filter((r) => r.calificacion != null).length;
  const pendingSubs = totalSubs - gradedSubs;
  const passCount = allResolutions.filter((r) => (r.calificacion ?? 0) >= 60).length;
  const passRate = gradedSubs > 0 ? Math.round((passCount / gradedSubs) * 100) : 0;

  // Case stats
  const caseTotalSubs = caseResolutions.length;
  const caseGraded = caseResolutions.filter((r) => r.calificacion != null).length;
  const casePending = caseTotalSubs - caseGraded;
  const casePassRate =
    caseGraded > 0
      ? Math.round((caseResolutions.filter((r) => (r.calificacion ?? 0) >= 60).length / caseGraded) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  // ── CASES LIST VIEW ────────────────────────────────────────────────────────
  if (view === 'cases') {
    const stats = [
      { label: 'Total Entregas', value: totalSubs, color: 'primary', prog: totalSubs > 0 ? 100 : 0 },
      { label: 'Pendientes', value: pendingSubs, color: 'red', prog: totalSubs > 0 ? Math.round((pendingSubs / totalSubs) * 100) : 0 },
      { label: 'Calificadas', value: gradedSubs, color: 'primary', prog: totalSubs > 0 ? Math.round((gradedSubs / totalSubs) * 100) : 0 },
      { label: 'Tasa de Aprobación', value: `${passRate}%`, color: 'amber', prog: passRate },
    ];
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-serif font-black text-on-background tracking-tight">Zona de Calificaciones</h1>
          <p className="text-secondary mt-2">Selecciona un caso para ver y calificar las decisiones enviadas.</p>
        </header>

        <div className="grid grid-cols-4 gap-5">
          {stats.map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-3">
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest">{s.label}</span>
              <span className={cn('text-3xl font-serif font-black block', s.color === 'red' ? 'text-red-600' : s.color === 'amber' ? 'text-amber-600' : 'text-on-background')}>{s.value}</span>
              <div className="h-1 bg-surface-container rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', s.color === 'red' ? 'bg-red-500' : s.color === 'amber' ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${s.prog}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
          <div className="px-6 py-4 border-b border-surface-container bg-surface-container-low">
            <h2 className="text-sm font-black uppercase tracking-widest text-secondary">Casos Clínicos</h2>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 py-3 text-[10px] font-black text-secondary uppercase tracking-widest">Caso</th>
                <th className="px-6 py-3 text-[10px] font-black text-secondary uppercase tracking-widest">Estado</th>
                <th className="px-6 py-3 text-[10px] font-black text-secondary uppercase tracking-widest text-center">Entregas</th>
                <th className="px-6 py-3 text-[10px] font-black text-secondary uppercase tracking-widest text-center">Pendientes</th>
                <th className="px-6 py-3 text-[10px] font-black text-secondary uppercase tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {cases.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-secondary text-sm">No hay casos disponibles.</td></tr>
              ) : cases.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-on-background">{c.title}</p>
                    <p className="text-[10px] text-outline">ID: {c.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      c.status.toLowerCase().includes('public') ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                    )}>{c.status || 'borrador'}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn('text-sm font-black', c.totalSubmissions > 0 ? 'text-primary' : 'text-outline')}>{c.totalSubmissions}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {c.pendingCount > 0
                      ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">{c.pendingCount} pendiente{c.pendingCount > 1 ? 's' : ''}</span>
                      : <span className="text-[10px] text-outline">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openCase(c)}
                      disabled={c.totalSubmissions === 0}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {c.totalSubmissions === 0 ? 'Sin entregas' : 'Ver entregas'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── SUBMISSIONS VIEW ───────────────────────────────────────────────────────
  const caseStats = [
    { label: 'Total', value: caseTotalSubs, color: 'primary' },
    { label: 'Pendientes', value: casePending, color: 'red' },
    { label: 'Calificadas', value: caseGraded, color: 'primary' },
    { label: 'Aprobación', value: `${casePassRate}%`, color: 'amber' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setView('cases')} className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-serif font-black text-on-background">{selectedCase?.title}</h1>
          <p className="text-secondary text-sm mt-0.5">{caseTotalSubs} entrega{caseTotalSubs !== 1 ? 's' : ''} recibida{caseTotalSubs !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate(`/casos/${selectedCase?.id}`)}
          className="ml-auto flex items-center gap-2 px-3 py-2 border rounded-xl text-sm hover:bg-surface-container transition-colors"
        >
          <Eye size={14} /> Ver caso
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {caseStats.map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm">
            <span className="text-[10px] font-black text-secondary uppercase tracking-widest block mb-1">{s.label}</span>
            <span className={cn('text-2xl font-serif font-black', s.color === 'red' ? 'text-red-600' : s.color === 'amber' ? 'text-amber-600' : 'text-on-background')}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-6 items-start">
        {/* Left: submissions list */}
        <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-5 py-3 text-[10px] font-black text-secondary uppercase tracking-widest">Estudiante</th>
                <th className="px-5 py-3 text-[10px] font-black text-secondary uppercase tracking-widest">Fecha</th>
                <th className="px-5 py-3 text-[10px] font-black text-secondary uppercase tracking-widest">Estado</th>
                <th className="px-5 py-3 text-[10px] font-black text-secondary uppercase tracking-widest text-center">Calificación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {caseResolutions.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-secondary text-sm">No hay entregas para este caso.</td></tr>
              ) : caseResolutions.map((r) => {
                const isActive = selectedRes?.id === r.id;
                return (
                  <tr key={r.id} onClick={() => selectRes(r)} className={cn('cursor-pointer transition-colors', isActive ? 'bg-primary/5' : 'hover:bg-surface-container-low')}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold uppercase', isActive ? 'bg-primary text-white' : 'bg-surface-container-high text-secondary')}>
                          {r.userName.substring(0, 2)}
                        </div>
                        <p className="text-sm font-bold text-on-background">{r.userName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-secondary">{new Date(r.fechaEntrega).toLocaleDateString('es-MX')}</td>
                    <td className="px-5 py-4">
                      <span className={cn('px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                        r.calificacion != null ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {r.calificacion != null ? 'Calificado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-black text-sm">
                      {r.calificacion != null
                        ? <span className="text-primary">{r.calificacion}<span className="text-outline font-normal text-xs">/100</span></span>
                        : <span className="text-outline">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right: grading panel */}
        <div className="w-[420px] shrink-0 bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
          {selectedRes ? (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                  {selectedRes.userName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-on-background">{selectedRes.userName}</p>
                  <p className="text-[10px] text-outline uppercase tracking-widest">{new Date(selectedRes.fechaEntrega).toLocaleString('es-MX')}</p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedRes.diagnostico && (
                  <div>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1 mb-1"><Stethoscope size={10} /> Diagnóstico</p>
                    <p className="text-sm bg-white rounded-xl p-3 whitespace-pre-wrap max-h-28 overflow-y-auto">{selectedRes.diagnostico}</p>
                  </div>
                )}
                {selectedRes.planTerapeutico && (
                  <div>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1 mb-1"><Activity size={10} /> Plan Terapéutico</p>
                    <p className="text-sm bg-white rounded-xl p-3 whitespace-pre-wrap max-h-24 overflow-y-auto">{selectedRes.planTerapeutico}</p>
                  </div>
                )}
                {selectedRes.justificacion && (
                  <div>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1 mb-1"><History size={10} /> Justificación</p>
                    <p className="text-sm bg-white rounded-xl p-3 whitespace-pre-wrap max-h-24 overflow-y-auto">{selectedRes.justificacion}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-outline-variant/10 pt-4 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-2 block">Calificación (0–100)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min={0} max={100} step={1}
                      value={grade}
                      onChange={(e) => setGrade(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-28 bg-white border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 text-center text-2xl font-serif font-black focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                    <span className="text-xl font-serif text-outline/50">/ 100</span>
                    {selectedRes.calificacion != null && (
                      <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} /> Ya calificado
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-2 block">Retroalimentación</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    className="w-full bg-white border-0 ring-1 ring-outline-variant/30 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                    placeholder="Escribe tus observaciones..."
                  />
                </div>
                <button
                  onClick={saveGrade}
                  disabled={saving}
                  className="w-full py-4 bg-primary text-white font-black rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} /> {saving ? 'Guardando...' : selectedRes.calificacion != null ? 'Actualizar calificación' : 'Publicar calificación'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-secondary text-sm">
              Selecciona una entrega de la lista para calificarla.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
