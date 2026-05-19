import React from 'react';
import { Save, CheckCircle2, ArrowLeft, Eye, Stethoscope, Activity, History, BookOpen, Plus, Trash2, ClipboardList } from 'lucide-react';
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
  rubricId?: number | null;
  _table: 'resoluciones' | 'case_resolutions';
}

interface RubricCriterion {
  id?: number;
  name: string;
  description?: string;
  max_score: number;
  sort_order?: number;
}

interface Rubric {
  id: number;
  case_id: number;
  title: string;
  description?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
async function fetchAllResolutions(): Promise<Resolution[]> {
  let combined: Resolution[] = [];

  // case_resolutions — única tabla de entregas
  try {
    const { data, error } = await (supabase.from as any)('case_resolutions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      combined = (data as any[]).map((r: any) => {
        // resolution = "diagnostico\n\nPlan:\nplanTerapeutico"
        const raw = r.resolution ?? '';
        const planMatch = raw.match(/\n\nPlan:\n([\s\S]*)$/);
        const diagText = planMatch ? raw.replace(/\n\nPlan:\n[\s\S]*$/, '') : raw;
        const planText = planMatch ? planMatch[1] : '';
        return {
          id: String(r.id),
          caseId: r.case_id,
          userId: r.resolved_by ?? '',
          userName: '',
          fechaEntrega: r.created_at,
          diagnostico: diagText,
          planTerapeutico: planText,
          justificacion: r.conclusion ?? '',
          calificacion: null,
          retroalimentacion: null,
          evaluacionId: null,
          _table: 'case_resolutions' as const,
        };
      });

      // Enrich with evaluaciones
      try {
        const ids = (data as any[]).map((r: any) => String(r.id));
        if (ids.length > 0) {
          const { data: evals } = await (supabase.from as any)('evaluaciones')
            .select('id, case_resolution_id, calificacion, retroalimentacion')
            .in('case_resolution_id', ids);
          const evalMap: Record<string, any> = {};
          ((evals as any[]) ?? []).forEach((e: any) => { evalMap[String(e.case_resolution_id)] = e; });
          combined = combined.map((r) => {
            const ev = evalMap[r.id];
            return ev ? { ...r, calificacion: ev.calificacion ?? null, retroalimentacion: ev.retroalimentacion ?? null, evaluacionId: String(ev.id) } : r;
          });
        }
      } catch { /* ok */ }
    }
  } catch (e) {
    console.warn('[ReviewPanel] case_resolutions:', e);
  }

  return combined.sort((a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime());
}

// Deduplicar entregas: por cada (caseId, userId) conservar solo la más reciente.
// Si el usuario re-editó y volvió a enviar, solo se muestra/califica esa última entrega.
function deduplicateByUser(resolutions: Resolution[]): Resolution[] {
  const map = new Map<string, Resolution>();
  // El array ya está ordenado desc por fecha, así que el primero que encontramos es el más reciente
  for (const r of resolutions) {
    const key = `${r.caseId}__${r.userId}`;
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values());
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

  // ── Rubric state ──────────────────────────────────────────────────────────
  const [rubric, setRubric] = React.useState<Rubric | null>(null);
  const [rubricCriteria, setRubricCriteria] = React.useState<RubricCriterion[]>([]);
  const [criteriaScores, setCriteriaScores] = React.useState<Record<number, number>>({});
  const [gradingMode, setGradingMode] = React.useState<'rubric' | 'direct'>('direct');
  const [savingRubric, setSavingRubric] = React.useState(false);
  // New rubric form
  const [newRubricTitle, setNewRubricTitle] = React.useState('');
  const [newCriteria, setNewCriteria] = React.useState<{ name: string; max_score: number }[]>([
    { name: '', max_score: 10 },
  ]);
  const [showCreateRubric, setShowCreateRubric] = React.useState(false);

  const loadAllData = React.useCallback(async (currentSelectedCaseId?: number | string | null) => {
    const { data: ud } = await supabase.auth.getUser();
    setUserId((ud as any)?.user?.id ?? null);

    const resolutions = await fetchAllResolutions();

    // Deduplicar: por cada (caseId, userId) solo la entrega más reciente
    const deduplicated = deduplicateByUser(resolutions);

    // Fetch profile names for all resolutions
    const uids = [...new Set(deduplicated.map((r) => r.userId).filter(Boolean))];
    let profileMap: Record<string, string> = {};
    if (uids.length > 0) {
      const { data: profs } = await (supabase.from as any)('profiles')
        .select('id, full_name, email, username')
        .in('id', uids);
      ((profs as any[]) ?? []).forEach((p: any) => {
        const name = [p.full_name, p.username, p.email?.split('@')[0]]
          .filter(Boolean)
          .find((s: string) => s?.trim());
        if (name) profileMap[p.id] = name as string;
      });
    }
    const withNames = deduplicated.map((r) => ({
      ...r,
      userName: r.userName || profileMap[r.userId] || (r.userId ? `Estudiante (${r.userId.substring(0, 6)})` : 'Desconocido'),
    }));
    // Fetch cases — solo los creados por el maestro actual
    const currentUserId = (ud as any)?.user?.id;
    const { data: casesData } = await (supabase.from as any)('clinical_cases')
      .select('id, title, status')
      .eq('created_by', currentUserId)
      .order('created_at', { ascending: false });

    // Filtrar entregas solo de los casos del maestro
    const myCaseIds = new Set(((casesData as any[]) ?? []).map((c: any) => String(c.id)));
    const myResolutions = withNames.filter((r) => myCaseIds.has(String(r.caseId)));
    setAllResolutions(myResolutions);

    const casesArr = ((casesData as any[]) ?? []).map((c: any) => {
      const subs = myResolutions.filter((r) => String(r.caseId) === String(c.id));
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

    // Si hay un caso abierto, refrescar sus entregas y la seleccionada
    if (currentSelectedCaseId != null) {
      const updatedSubs = myResolutions.filter((r) => String(r.caseId) === String(currentSelectedCaseId));
      setCaseResolutions(updatedSubs);
      setSelectedRes((prev) => {
        if (!prev) return updatedSubs[0] ?? null;
        const refreshed = updatedSubs.find((r) => r.id === prev.id) ?? prev;
        setGrade(refreshed.calificacion ?? '');
        setFeedback(refreshed.retroalimentacion ?? '');
        return refreshed;
      });
    }
  }, []);

  React.useEffect(() => {
    loadAllData(null);

    // Suscripción realtime: refrescar cuando un estudiante actualice su entrega
    const channel = supabase
      .channel('review-panel-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'case_resolutions' }, () => {
        setSelectedCase((sc) => { loadAllData(sc?.id ?? null); return sc; });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resoluciones' }, () => {
        setSelectedCase((sc) => { loadAllData(sc?.id ?? null); return sc; });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAllData]);

  const openCase = (c: CaseRow) => {
    setSelectedCase(c);
    const subs = allResolutions.filter((r) => String(r.caseId) === String(c.id));
    setCaseResolutions(subs);
    const first = subs[0] ?? null;
    setSelectedRes(first);
    setGrade(first?.calificacion ?? '');
    setFeedback(first?.retroalimentacion ?? '');
    setView('submissions');
    loadRubric(c.id);
    // Forzar recarga fresca al abrir un caso
    loadAllData(c.id);
  };

  const loadRubric = async (caseId: number) => {
    setRubric(null);
    setRubricCriteria([]);
    setCriteriaScores({});
    setGradingMode('direct');
    setShowCreateRubric(false);
    try {
      const { data: rData } = await (supabase.from as any)('rubrics')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle();
      if (rData) {
        setRubric(rData);
        const { data: cData } = await (supabase.from as any)('rubric_criteria')
          .select('*')
          .eq('rubric_id', rData.id);
        const criteria: RubricCriterion[] = (cData as any[]) ?? [];
        setRubricCriteria(criteria);
        if (criteria.length > 0) setGradingMode('rubric');
      }
    } catch (e) {
      console.warn('[ReviewPanel] loadRubric:', e);
    }
  };

  const selectRes = (r: Resolution) => {
    setSelectedRes(r);
    setGrade(r.calificacion ?? '');
    setFeedback(r.retroalimentacion ?? '');
    // Reset criteria scores (will be repopulated if rubrica_detalle exists on the evaluacion)
    setCriteriaScores({});
  };

  const saveGrade = async () => {
    if (!selectedRes || !userId) return;
    setSaving(true);
    try {
      const numGrade = typeof grade === 'number' ? grade : null;

      // Build rubric detail if in rubric mode
      const rubricaDetalle =
        gradingMode === 'rubric' && rubricCriteria.length > 0
          ? rubricCriteria.map((c) => ({
              criterion_id: c.id,
              name: c.name,
              max_score: c.max_score,
              score: criteriaScores[c.id!] ?? 0,
            }))
          : null;

      const payload: any = {
        instructor_id: userId,
        calificacion: numGrade,
        retroalimentacion: feedback,
        rubric_id: rubric?.id ?? null,
        rubrica_detalle: rubricaDetalle ? JSON.stringify(rubricaDetalle) : null,
        created_at: new Date().toISOString(),
      };

      if (selectedRes._table === 'case_resolutions') {
        payload.case_resolution_id = selectedRes.id;
      } else {
        payload.resolucion_id = selectedRes.id;
      }

      let res: any;
      if (selectedRes.evaluacionId) {
        res = await (supabase.from as any)('evaluaciones')
          .update({
            calificacion: numGrade,
            retroalimentacion: feedback,
            rubric_id: rubric?.id ?? null,
            rubrica_detalle: rubricaDetalle ? JSON.stringify(rubricaDetalle) : null,
          })
          .eq('id', selectedRes.evaluacionId);
      } else {
        res = await (supabase.from as any)('evaluaciones').insert(payload).select().single();
      }

      if (res.error) throw res.error;

      const updated: Resolution = { ...selectedRes, calificacion: numGrade, retroalimentacion: feedback };
      setAllResolutions((prev) => prev.map((r) => (r.id === selectedRes.id ? updated : r)));
      setCaseResolutions((prev) => prev.map((r) => (r.id === selectedRes.id ? updated : r)));
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

  // ── Rubric helpers ─────────────────────────────────────────────────────────
  const rubricTotal = rubricCriteria.reduce((sum, c) => sum + (criteriaScores[c.id!] ?? 0), 0);
  const rubricMax = rubricCriteria.reduce((sum, c) => sum + c.max_score, 0);
  const rubricGrade = rubricMax > 0 ? Math.round((rubricTotal / rubricMax) * 100) : 0;

  const createRubric = async () => {
    if (!selectedCase || !newRubricTitle.trim()) return;
    const validCriteria = newCriteria.filter((c) => c.name.trim());
    if (validCriteria.length === 0) return;
    setSavingRubric(true);
    try {
      const { data: rData, error: rErr } = await (supabase.from as any)('rubrics')
        .insert({ case_id: selectedCase.id, title: newRubricTitle.trim(), created_by: userId })
        .select()
        .single();
      if (rErr) throw rErr;
      const criteriaPayload = validCriteria.map((c) => ({
        rubric_id: rData.id,
        name: c.name.trim(),
        max_score: c.max_score,
      }));
      const { data: cData, error: cErr } = await (supabase.from as any)('rubric_criteria')
        .insert(criteriaPayload)
        .select();
      if (cErr) throw cErr;
      setRubric(rData);
      setRubricCriteria(cData as RubricCriterion[]);
      setGradingMode('rubric');
      setShowCreateRubric(false);
      setNewRubricTitle('');
      setNewCriteria([{ name: '', max_score: 10 }]);
    } catch (e: any) {
      alert('Error creando rúbrica: ' + (e?.message ?? String(e)));
    } finally {
      setSavingRubric(false);
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
                          {r.userName.split(' ').map(w => w[0]).slice(0, 2).join('') || '?'}
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
        <div className="w-[440px] shrink-0 bg-surface-container-low rounded-2xl border border-outline-variant/10 shadow-sm overflow-y-auto max-h-[calc(100vh-220px)]">
          {selectedRes ? (
            <div className="p-6 space-y-5">
              {/* Student header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                  {selectedRes.userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-black text-on-background">{selectedRes.userName}</p>
                  <p className="text-[10px] text-outline uppercase tracking-widest">{new Date(selectedRes.fechaEntrega).toLocaleString('es-MX')}</p>
                </div>
              </div>

              {/* Resolution content */}
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

              {/* ── Grading section ── */}
              <div className="border-t border-outline-variant/10 pt-4 space-y-4">

                {/* Mode tabs */}
                <div className="flex rounded-xl overflow-hidden border border-outline-variant/20 bg-white">
                  <button
                    onClick={() => setGradingMode('direct')}
                    className={cn('flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors',
                      gradingMode === 'direct' ? 'bg-primary text-white' : 'text-secondary hover:bg-surface-container')}
                  >
                    <Save size={12} /> Nota directa
                  </button>
                  <button
                    onClick={() => setGradingMode('rubric')}
                    className={cn('flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors',
                      gradingMode === 'rubric' ? 'bg-primary text-white' : 'text-secondary hover:bg-surface-container')}
                  >
                    <ClipboardList size={12} /> Rúbrica
                  </button>
                </div>

                {/* ── RUBRIC MODE ── */}
                {gradingMode === 'rubric' && (
                  <div className="space-y-3">
                    {rubric ? (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-on-background flex items-center gap-1.5">
                            <BookOpen size={13} className="text-primary" /> {rubric.title}
                          </p>
                          <span className="text-xs text-secondary">{rubricTotal} / {rubricMax} pts</span>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {rubricCriteria.map((c) => (
                            <div key={c.id} className="bg-white rounded-xl p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-on-background">{c.name}</span>
                                <span className="text-xs text-secondary">
                                  <input
                                    type="number"
                                    min={0}
                                    max={c.max_score}
                                    step={0.5}
                                    value={criteriaScores[c.id!] ?? 0}
                                    onChange={(e) => {
                                      const v = Math.min(c.max_score, Math.max(0, parseFloat(e.target.value) || 0));
                                      setCriteriaScores((prev) => ({ ...prev, [c.id!]: v }));
                                      if (gradingMode === 'rubric') {
                                        const updated = { ...criteriaScores, [c.id!]: v };
                                        const tot = rubricCriteria.reduce((s, cr) => s + (updated[cr.id!] ?? 0), 0);
                                        const max = rubricCriteria.reduce((s, cr) => s + cr.max_score, 0);
                                        setGrade(max > 0 ? Math.round((tot / max) * 100) : 0);
                                      }
                                    }}
                                    className="w-16 text-center text-xs font-black border border-outline-variant/20 rounded-lg py-1 outline-none focus:ring-1 focus:ring-primary"
                                  />
                                  <span className="text-outline ml-1">/ {c.max_score}</span>
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={c.max_score}
                                step={0.5}
                                value={criteriaScores[c.id!] ?? 0}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setCriteriaScores((prev) => ({ ...prev, [c.id!]: v }));
                                  const updated = { ...criteriaScores, [c.id!]: v };
                                  const tot = rubricCriteria.reduce((s, cr) => s + (updated[cr.id!] ?? 0), 0);
                                  const max = rubricCriteria.reduce((s, cr) => s + cr.max_score, 0);
                                  setGrade(max > 0 ? Math.round((tot / max) * 100) : 0);
                                }}
                                className="w-full accent-primary"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-2.5">
                          <span className="text-xs font-black text-primary uppercase tracking-widest">Nota calculada</span>
                          <span className="text-2xl font-serif font-black text-primary">{rubricGrade}<span className="text-sm font-normal text-outline">/100</span></span>
                        </div>
                      </>
                    ) : (
                      /* No rubric yet */
                      <div className="space-y-3">
                        <p className="text-xs text-secondary text-center">Este caso no tiene rúbrica. Puedes crear una.</p>
                        {!showCreateRubric ? (
                          <button
                            onClick={() => setShowCreateRubric(true)}
                            className="w-full py-2.5 border border-dashed border-primary/40 text-primary text-xs font-bold rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus size={13} /> Crear rúbrica para este caso
                          </button>
                        ) : (
                          <div className="space-y-3 bg-white rounded-xl p-4">
                            <input
                              value={newRubricTitle}
                              onChange={(e) => setNewRubricTitle(e.target.value)}
                              placeholder="Título de la rúbrica"
                              className={cn(
                                'w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary',
                                !newRubricTitle.trim() ? 'border-red-300 focus:ring-red-400' : 'border-outline-variant/30'
                              )}
                            />
                            {!newRubricTitle.trim() && (
                              <p className="text-[10px] text-red-500 -mt-1">El título es obligatorio</p>
                            )}
                            <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Criterios</p>
                            {newCriteria.map((nc, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <input
                                  value={nc.name}
                                  onChange={(e) => setNewCriteria((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                  placeholder={`Criterio ${i + 1}`}
                                  className="flex-1 border border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                                />
                                <input
                                  type="number"
                                  min={1}
                                  value={nc.max_score}
                                  onChange={(e) => setNewCriteria((prev) => prev.map((x, j) => j === i ? { ...x, max_score: parseInt(e.target.value) || 1 } : x))}
                                  className="w-14 text-center border border-outline-variant/30 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                                />
                                <button onClick={() => setNewCriteria((prev) => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => setNewCriteria((prev) => [...prev, { name: '', max_score: 10 }])}
                              className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
                            >
                              <Plus size={12} /> Agregar criterio
                            </button>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => setShowCreateRubric(false)}
                                className="flex-1 py-2 text-xs font-bold border rounded-xl hover:bg-surface-container transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={createRubric}
                                disabled={savingRubric || !newRubricTitle.trim() || newCriteria.filter(c => c.name.trim()).length === 0}
                                title={!newRubricTitle.trim() ? 'Escribe un título para la rúbrica' : ''}
                                className="flex-1 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {savingRubric ? 'Guardando...' : 'Crear rúbrica'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── DIRECT MODE ── */}
                {gradingMode === 'direct' && (
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
                )}

                {/* Feedback */}
                <div>
                  <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-2 block">Retroalimentación</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
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
