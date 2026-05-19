import { Stethoscope, Filter, Search, ChevronRight, Clock, Star, KeyRound, AlertCircle, CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CasoClinico } from '../types';

export default function ClinicalCases() {
  const { isTeacher, userId } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CasoClinico[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ today: true, week: true, month: true, later: false, noDate: false });

  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (!userId) return;
    fetchCases();
  }, [userId, isTeacher]);

  async function fetchCases() {
    setLoading(true);
    try {
      if (isTeacher) {
        // Instructores: solo los casos que ellos crearon
        const { data } = await (supabase.from as any)('clinical_cases')
          .select('*')
          .eq('created_by', userId)
          .order('created_at', { ascending: false });
        normalize(data ?? []);
      } else {
        // Estudiantes: unión de 3 fuentes de acceso:
        // 1) case_assignments directas (código o asignación manual)
        // 2) casos cuyo course_id está en algún grupo del que es miembro (course_members)
        const [assignRes, memberRes] = await Promise.all([
          (supabase.from as any)('case_assignments').select('case_id').eq('user_id', userId),
          (supabase.from as any)('course_members').select('course_id').eq('user_id', userId),
        ]);

        const caseIdsFromAssign: number[] = (assignRes.data ?? []).map((a: any) => a.case_id);

        const courseIds: number[] = (memberRes.data ?? []).map((m: any) => m.course_id);
        let caseIdsFromCourse: number[] = [];
        if (courseIds.length > 0) {
          const { data: courseCases } = await (supabase.from as any)('clinical_cases')
            .select('id')
            .in('course_id', courseIds);
          caseIdsFromCourse = (courseCases ?? []).map((c: any) => c.id);
        }

        // Deduplicate
        const allCaseIds = [...new Set([...caseIdsFromAssign, ...caseIdsFromCourse])];

        if (allCaseIds.length === 0) {
          setCases([]);
          setLoading(false);
          return;
        }

        const { data } = await (supabase.from as any)('clinical_cases')
          .select('*')
          .in('id', allCaseIds)
          .order('created_at', { ascending: false });
        normalize(data ?? []);
      }
    } catch (e) {
      console.warn('fetchCases error:', e);
    }
    setLoading(false);
  }

  function normalize(raw: any[]) {
    const normalized = raw.map((r) => ({
      id: r.id != null ? String(r.id) : '',
      titulo: r.titulo ?? r.title ?? '',
      categoria: r.categoria ?? r.category ?? null,
      nivel: r.nivel ?? r.level ?? null,
      tiempo_estimado: r.tiempo_estimado ?? r.estimated_minutes ? `${r.estimated_minutes} min` : r.tiempo_estimado ?? null,
      estatus: r.estatus ?? r.status ?? 'borrador',
      created_at: r.created_at ?? r.published_at ?? null,
      expire_at: r.expire_at ?? null,
      __raw: r,
    }));
    setCases(normalized as unknown as CasoClinico[]);
  }

  // ── Expiry label helper ─────────────────────────────────────────────────────
  function expiryLabel(expire_at: string | null | undefined): { label: string; isToday: boolean; isExpired: boolean } | null {
    if (!expire_at) return null;
    const exp = new Date(expire_at);
    const now = new Date();
    const isExpired = exp < now;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const isToday = exp >= todayStart && exp < todayEnd;
    if (isToday) {
      const hhmm = exp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      return { label: `Vence hoy a las ${hhmm}`, isToday: true, isExpired: false };
    }
    if (isExpired) {
      const fecha = exp.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
      return { label: `Venció el ${fecha}`, isToday: false, isExpired: true };
    }
    const fecha = exp.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    return { label: `Vence el ${fecha}`, isToday: false, isExpired: false };
  }

  async function handleJoinCode() {
    if (!joinCode.trim() || !userId) return;
    setJoiningCode(true); setJoinError(null);
    try {
      // Buscar el código en case_invites
      const { data: invite, error } = await (supabase.from as any)('case_invites')
        .select('id, case_id, used_by, expires_at')
        .eq('code', joinCode.trim().toUpperCase())
        .maybeSingle();

      if (error || !invite) { setJoinError('Código inválido. Verifica e intenta de nuevo.'); return; }
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) { setJoinError('Este código ha expirado.'); return; }

      // Insertar en case_assignments si no existe
      const { error: assignErr } = await (supabase.from as any)('case_assignments')
        .insert({ case_id: invite.case_id, user_id: userId })
        .select();

      if (assignErr && assignErr.code !== '23505') { setJoinError('Error al unirse: ' + assignErr.message); return; }

      // Marcar código como usado
      await (supabase.from as any)('case_invites')
        .update({ used_by: userId, used_at: new Date().toISOString() })
        .eq('id', invite.id);

      setJoinCode(''); setShowJoinInput(false);
      await fetchCases();
      navigate(`/casos/${invite.case_id}`);
    } catch (e: any) { setJoinError('Error inesperado: ' + e?.message); }
    finally { setJoiningCode(false); }
  }

  // ── Group cases by expiry ─────────────────────────────────────────────────
  function groupCases(list: CasoClinico[]) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd    = new Date(todayStart.getTime() + 7  * 24 * 60 * 60 * 1000);
    const monthEnd   = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, todayStart.getDate());

    const today: CasoClinico[]    = [];
    const week: CasoClinico[]     = [];
    const month: CasoClinico[]    = [];
    const later: CasoClinico[]    = [];
    const noDate: CasoClinico[]   = [];

    for (const c of list) {
      const exp = (c as any).expire_at ? new Date((c as any).expire_at) : null;
      if (!exp) { noDate.push(c); continue; }
      if (exp >= todayStart && exp < todayEnd) today.push(c);
      else if (exp >= todayEnd && exp < weekEnd) week.push(c);
      else if (exp >= weekEnd && exp < monthEnd) month.push(c);
      else later.push(c);
    }
    return { today, week, month, later, noDate };
  }

  const filtered = cases.filter((c) =>
    !search || c.titulo.toLowerCase().includes(search.toLowerCase()) || (c.categoria ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const groups = groupCases(filtered);

  const groupDefs = [
    { key: 'today',  label: 'Vence hoy',          icon: <AlertCircle  size={15} />, color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',   items: groups.today  },
    { key: 'week',   label: 'Vence esta semana',   icon: <CalendarClock size={15}/>, color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',     items: groups.week   },
    { key: 'month',  label: 'Vence este mes',       icon: <CalendarClock size={15}/>, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', items: groups.month  },
    { key: 'later',  label: 'Vence más adelante',   icon: <CalendarClock size={15}/>, color: 'text-stone-500',  bg: 'bg-stone-50 border-stone-200',   items: groups.later  },
    { key: 'noDate', label: 'Sin fecha de vencimiento', icon: <Clock size={15}/>,   color: 'text-stone-400',  bg: 'bg-stone-50 border-stone-200',   items: groups.noDate },
  ].filter(g => g.items.length > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold text-on-surface">Casos Clínicos</h1>
          <p className="text-stone-500 mt-2">
            {isTeacher ? 'Casos clínicos que has creado.' : 'Casos asignados a tu cuenta.'}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {isTeacher && (
            <button onClick={() => navigate('/casos/nuevo')} className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all">
              + Nuevo Caso
            </button>
          )}
          {!isTeacher && (
            <div className="flex items-center gap-2">
              {showJoinInput ? (
                <>
                  <input
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinCode()}
                    placeholder="Código de acceso..."
                    maxLength={12}
                    className="border border-outline-variant/30 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary w-44 uppercase tracking-widest font-mono"
                    autoFocus
                  />
                  <button
                    onClick={handleJoinCode}
                    disabled={joiningCode || !joinCode.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-40 transition-all"
                  >
                    {joiningCode ? 'Ingresando...' : 'Ingresar'}
                  </button>
                  <button onClick={() => { setShowJoinInput(false); setJoinCode(''); setJoinError(null); }} className="text-secondary text-sm hover:text-on-background transition-colors">Cancelar</button>
                </>
              ) : (
                <button
                  onClick={() => setShowJoinInput(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors"
                >
                  <KeyRound size={15} /> Ingresar con código
                </button>
              )}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por diagnóstico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-surface border border-stone-200 dark:border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
        </div>
      </header>

      {/* Join error */}
      {joinError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm">
          {joinError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
          <Stethoscope className="w-10 h-10 text-stone-300" />
          <p className="text-stone-500 text-sm">
            {search ? 'Sin resultados para esa búsqueda.' : isTeacher ? 'No has creado ningún caso aún.' : 'No tienes casos asignados. Usa un código de acceso para unirte.'}
          </p>
          {!isTeacher && !showJoinInput && (
            <button onClick={() => setShowJoinInput(true)} className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
              <KeyRound size={14} /> Ingresar con código →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupDefs.map((group) => (
            <div key={group.key} className={`rounded-2xl border overflow-hidden ${group.bg}`}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:brightness-95 transition-all"
              >
                <span className={group.color}>{group.icon}</span>
                <span className={`font-bold text-sm ${group.color}`}>{group.label}</span>
                <span className={`ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 ${group.color}`}>{group.items.length}</span>
                <span className="ml-auto text-stone-400">
                  {openGroups[group.key] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </span>
              </button>

              {/* Group items */}
              {openGroups[group.key] && (
                <div className="bg-white divide-y divide-stone-100">
                  {group.items.map((c) => {
                    const expiry = expiryLabel((c as any).expire_at);
                    return (
                      <Link
                        key={c.id}
                        to={`/casos/${c.id}`}
                        className="group flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/5 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-0.5">
                              <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors">{c.titulo}</h3>
                              {c.categoria && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full uppercase tracking-widest">{c.categoria}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-stone-400">
                              {c.nivel && <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {c.nivel}</span>}
                              {c.tiempo_estimado && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.tiempo_estimado}</span>}
                              <span className="font-bold uppercase tracking-widest text-[10px]">ID: #{c.id}</span>
                              {expiry && (
                                <span className={`flex items-center gap-1 font-semibold ${
                                  expiry.isExpired ? 'text-stone-400' : expiry.isToday ? 'text-amber-600' : 'text-blue-500'
                                }`}>
                                  {expiry.isToday ? <AlertCircle className="w-3 h-3" /> : <CalendarClock className="w-3 h-3" />}
                                  {expiry.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                            c.estatus === 'publicado' ? 'bg-green-100 text-green-700' :
                            c.estatus === 'cerrado'   ? 'bg-stone-100 text-stone-500' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {c.estatus}
                          </span>
                          <ChevronRight className="text-stone-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
