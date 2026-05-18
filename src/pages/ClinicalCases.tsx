import { Stethoscope, Filter, Search, ChevronRight, Clock, Star, KeyRound } from 'lucide-react';
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
      __raw: r,
    }));
    setCases(normalized as unknown as CasoClinico[]);
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

  const filtered = cases.filter((c) =>
    !search || c.titulo.toLowerCase().includes(search.toLowerCase()) || (c.categoria ?? '').toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/casos/${c.id}`}
              className="group bg-white dark:bg-surface p-6 rounded-2xl ghost-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className="p-4 bg-primary/5 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">{c.titulo}</h3>
                    {c.categoria && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 dark:bg-surface-container-high text-stone-500 rounded-full uppercase tracking-widest">{c.categoria}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-stone-400">
                    {c.nivel && <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {c.nivel}</span>}
                    {c.tiempo_estimado && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.tiempo_estimado}</span>}
                    <span className="font-bold uppercase tracking-widest text-[10px]">ID: #{c.id}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
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
          ))}
        </div>
      )}
    </div>
  );
}
