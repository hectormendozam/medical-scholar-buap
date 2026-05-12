import React, { useEffect, useState } from 'react';
import { Megaphone, GraduationCap, Clock, User, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CasoClinico } from '../types';

const notifications = [
  { id: 1, text: "Nueva retroalimentación disponible: Caso #492", time: "Hace 15 min", author: "Dr. Méndez", type: "primary" },
  { id: 2, text: "Actualización de Protocolo: Pediatría General", time: "Hace 2 horas", author: "Coordinación Médica", type: "tertiary" },
];



export function Dashboard() {
  const navigate = useNavigate();
  const { isTeacher } = useAuth();
  const { userId } = useAuth();
  const [assignedCases, setAssignedCases] = useState<CasoClinico[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [gradedCount, setGradedCount] = useState(0);
  const [passRate, setPassRate] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState({ percent: 0, resolved: 0, target: 10 });
  const [profileName, setProfileName] = useState<string | null>(null);
  const [quickNotes, setQuickNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [targetType, setTargetType] = useState<'global'|'case'|'course'>('global');
  const [casesList, setCasesList] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCases() {
      let res = await supabase.from('casos_clinicos').select('*').limit(4);
      if (!res.data || res.error) {
        res = await supabase.from('clinical_cases').select('*').limit(4);
      }

      if (res.data) {
        const normalized = (res.data as any[]).map((r) => ({
          id: r.id != null ? String(r.id) : '',
          titulo: r.titulo ?? r.title ?? '',
          categoria: r.categoria ?? r.category ?? null,
          nombre_paciente: r.nombre_paciente ?? null,
          estatus: r.estatus ?? r.status ?? 'borrador',
          created_at: r.created_at ?? r.published_at ?? null,
          __raw: r,
        }));
        setAssignedCases(normalized as unknown as CasoClinico[]);
      }
    }
    fetchCases();
  // fetch metrics and notifications
    (async () => {
      try {
        if (!userId) return;

        if (isTeacher) {
          // get cases created by teacher
          const { data: casesData } = await (supabase.from as any)('clinical_cases').select('id').eq('created_by', userId);
          const caseIds = (casesData || []).map((c: any) => c.id);

          // total submissions for those cases
          const { count: total } = await (supabase.from as any)('resoluciones').select('id', { count: 'exact', head: true }).in('case_id', caseIds.length ? caseIds : [-1]);
          const { count: graded } = await (supabase.from as any)('evaluaciones').select('id', { count: 'exact', head: true }).eq('instructor_id', userId);
          const passing = await (supabase.from as any)('evaluaciones').select('id', { count: 'exact', head: true }).eq('instructor_id', userId).gte('calificacion', 6);
          const passingCount = passing.count ?? 0;

          const totalNum = total ?? 0;
          const gradedNum = graded ?? 0;
          setTotalSubmissions(totalNum);
          setGradedCount(gradedNum);
          setPendingCount(Math.max(0, totalNum - gradedNum));
          setPassRate(gradedNum > 0 ? Math.round((passingCount / gradedNum) * 100) : 0);

          // weekly: evaluations by this instructor in last 7 days
          const { count: weekly } = await (supabase.from as any)('evaluaciones').select('id', { count: 'exact', head: true }).eq('instructor_id', userId).gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());
          const weeklyNum = weekly ?? 0;
          const target = 10;
          setWeeklyProgress({ percent: Math.min(100, Math.round((weeklyNum / target) * 100)), resolved: weeklyNum, target });
        } else {
          // student metrics
          const { count: total } = await (supabase.from as any)('resoluciones').select('id', { count: 'exact', head: true }).eq('estudiante_id', userId);
          const { data: evals } = await (supabase.from as any)('resoluciones').select('*, evaluaciones ( calificacion )').eq('estudiante_id', userId);
          const totalNum = total ?? 0;
          const gradedNum = (evals || []).filter((r: any) => r.evaluaciones && r.evaluaciones.length > 0).length;
          const passingCount = (evals || []).filter((r: any) => r.evaluaciones && r.evaluaciones[0]?.calificacion >= 6).length;
          setTotalSubmissions(totalNum);
          setGradedCount(gradedNum);
          setPendingCount(Math.max(0, totalNum - gradedNum));
          setPassRate(gradedNum > 0 ? Math.round((passingCount / gradedNum) * 100) : 0);

          // weekly: evaluations for student's submissions in last 7 days
          const { count: weekly } = await (supabase.from as any)('evaluaciones').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());
          const weeklyNum = weekly ?? 0;
          const target = 5;
          setWeeklyProgress({ percent: Math.min(100, Math.round((weeklyNum / target) * 100)), resolved: weeklyNum, target });
        }

  // notifications for current user
  const { data: notes } = await (supabase.from as any)('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
        setQuickNotes((notes as any[]) ?? []);

        // fetch cases list for targeting (regardless of teacher/student)
        const { data: c } = await (supabase.from as any)('clinical_cases').select('id, title').limit(100);
        setCasesList((c as any[]) ?? []);
        // fetch courses list
        const tablesForCourses = ['courses', 'grupos', 'clinical_groups', 'course_groups'];
        for (const t of tablesForCourses) {
          try {
            const { data: cr, error: cre } = await (supabase.from as any)(t).select('id, name, nombre').limit(100);
            if (!cre && cr && (cr as any[]).length > 0) {
              setCoursesList((cr as any[]).map((x: any) => ({ id: x.id, name: x.name ?? x.nombre ?? String(x.id) })));
              break;
            }
          } catch { /* try next */ }
        }
      } catch (err) {
        console.warn('dashboard metrics error', err);
      }
    })();
    // fetch profile name for greeting
    (async () => {
      try {
        if (!userId) return;
        const { data } = await (supabase.from as any)('profiles').select('full_name').eq('id', userId).single();
        if (data && data.full_name) setProfileName(data.full_name);
      } catch (err) {
        console.warn('profile fetch error', err);
      }
    })();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await (supabase.from as any)('notifications').update({ is_read: true }).eq('id', id);
      setQuickNotes((qs) => qs.map((q) => q.id === id ? { ...q, is_read: true } : q));
    } catch (err) {
      console.warn('mark read error', err);
    }
  };

  const createQuickNote = async () => {
    if (!newNote || !userId) return;
    try {
      let recipients: string[] = [];

      if (targetType === 'global') {
        // Try role_id = 3 first (most common schema), fallback to role text
        let studentsData: any[] = [];
        const { data: byRoleId } = await (supabase.from as any)('profiles').select('id').eq('role_id', 3).neq('id', userId);
        if (byRoleId && (byRoleId as any[]).length > 0) {
          studentsData = byRoleId as any[];
        } else {
          const { data: byRole } = await (supabase.from as any)('profiles').select('id').in('role', ['student', 'estudiante']).neq('id', userId);
          studentsData = (byRole as any[]) ?? [];
        }
        // If still empty, just get all profiles that are not the current user
        if (studentsData.length === 0) {
          const { data: allProfiles } = await (supabase.from as any)('profiles').select('id').neq('id', userId).limit(500);
          studentsData = (allProfiles as any[]) ?? [];
        }
        recipients = studentsData.map((s: any) => s.id).filter(Boolean);
      } else if (targetType === 'case' && selectedCase) {
        // Send to all students assigned to this case
        const { data: assignments } = await (supabase.from as any)('case_assignments')
          .select('user_id')
          .eq('case_id', selectedCase);
        const fromAssignments = (assignments as any[] ?? []).map((a: any) => a.user_id);
        // Also anyone who used an invite
        const { data: inviteUsers } = await (supabase.from as any)('case_invites')
          .select('used_by')
          .eq('case_id', selectedCase)
          .not('used_by', 'is', null);
        const fromInvites = (inviteUsers as any[] ?? []).map((i: any) => i.used_by);
        recipients = [...new Set([...fromAssignments, ...fromInvites])].filter((id) => id && id !== userId);
      } else if (targetType === 'course' && selectedCourse) {
        // Send to all members of the course
        const { data: members } = await (supabase.from as any)('course_members')
          .select('user_id')
          .eq('course_id', selectedCourse);
        recipients = (members as any[] ?? []).map((m: any) => m.user_id).filter((id: string) => id !== userId);
      }

      if (recipients.length === 0) {
        alert('No se encontraron destinatarios para esta notificación.');
        return;
      }

      const payloads = recipients.map((rid: string) => ({
        user_id: rid,
        title: 'Nota rápida',
        message: newNote,
        is_read: false,
        ...(targetType === 'case' && selectedCase ? { case_id: selectedCase } : {}),
        ...(targetType === 'course' && selectedCourse ? { course_id: selectedCourse } : {}),
      }));

      const { error } = await (supabase.from as any)('notifications').insert(payloads);
      if (error) throw error;

      // Also add to teacher's own feed for reference
      await (supabase.from as any)('notifications').insert({
        user_id: userId,
        title: `Nota rápida enviada (${recipients.length} destinatarios)`,
        message: newNote,
        is_read: false,
      });

      // Refresh
      const { data: fresh } = await (supabase.from as any)('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
      setQuickNotes((fresh as any[]) ?? []);
      setNewNote('');
      alert(`✅ Notificación enviada a ${recipients.length} estudiante(s).`);
    } catch (err: any) {
      console.warn('create note error', err);
      alert('Error creando notificación: ' + (err?.message ?? String(err)));
    }
  };

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-serif font-bold text-on-background tracking-tight">{isTeacher ? 'Panel del Maestro' : 'Panel del Estudiante'}</h1>
              <p className="text-secondary mt-2 flex items-center gap-2">
                <GraduationCap size={18} className="text-primary" />
                {profileName ? `Bienvenido, ${profileName}. Revisa tus asignaciones clínicas de hoy.` : 'Bienvenido. Revisa tus asignaciones clínicas de hoy.'}
              </p>
          </div>
          {isTeacher && (
            <button onClick={() => navigate('/casos/nuevo')} className="px-4 py-2 bg-primary text-white rounded-xl shadow">
              + Nuevo Caso
            </button>
          )}
        </div>
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
            {/* Only teachers can send quick notifications */}
            {isTeacher && (
              <div className="flex gap-2 items-center flex-wrap">
                <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Escribe una nota rápida..." className="flex-1 p-3 rounded-lg bg-surface-container-low outline-none min-w-[180px]" />
                <select value={targetType} onChange={(e) => setTargetType(e.target.value as any)} className="p-2 border rounded">
                  <option value="global">Todos los estudiantes</option>
                  <option value="case">Por Caso</option>
                  <option value="course">Por Grupo/Curso</option>
                </select>
                {targetType === 'case' && (
                  <select value={selectedCase ?? ''} onChange={(e) => setSelectedCase(e.target.value ? Number(e.target.value) : null)} className="p-2 border rounded">
                    <option value="">Selecciona caso</option>
                    {casesList.map((c) => (
                      <option key={c.id} value={c.id}>{c.title ?? c.titulo ?? c.name}</option>
                    ))}
                  </select>
                )}
                {targetType === 'course' && (
                  <select value={selectedCourse ?? ''} onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : null)} className="p-2 border rounded">
                    <option value="">Selecciona grupo</option>
                    {coursesList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                <button onClick={createQuickNote} className="px-4 py-2 bg-primary text-white rounded-lg">Enviar</button>
              </div>
            )}
            {quickNotes.length === 0 ? (
              <p className="text-sm text-secondary text-center py-4">Sin notificaciones recientes.</p>
            ) : quickNotes.map((n) => (
              <div key={n.id} className="flex gap-4 items-start p-4 hover:bg-surface-container-low rounded-xl transition-all cursor-pointer group">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0",
                  n.is_read ? "bg-surface-container-high" : "bg-primary"
                )} />
                <div className="flex-1">
                  <p className="font-semibold text-on-background group-hover:text-primary transition-colors">{n.title}: {n.message}</p>
                  <p className="text-xs text-secondary mt-1 flex items-center gap-2">
                    <Clock size={12} />
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {!n.is_read && <button onClick={() => markAsRead(n.id)} className="text-xs text-primary underline">Marcar leído</button>}
                  <ChevronRight size={16} className="text-outline my-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-primary bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-2xl p-8 shadow-xl shadow-primary/20 flex flex-col justify-between">
          <div>
            <h3 className="font-label text-xs uppercase tracking-widest font-bold opacity-80 mb-6">Progreso Semanal</h3>
            <div className="text-6xl font-serif font-bold tabular-nums">{weeklyProgress.percent}%</div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between text-xs font-label font-bold uppercase tracking-wider">
              <span>Casos Resueltos</span>
              <span className="opacity-80">{weeklyProgress.resolved} / {weeklyProgress.target}</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden backdrop-blur-sm">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${weeklyProgress.percent}%` }}
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
