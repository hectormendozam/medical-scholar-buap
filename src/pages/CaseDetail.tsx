import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft, Stethoscope, Activity, History, Send, Lightbulb,
  Clock, Tag, BookOpen, ClipboardList, Image as ImageIcon, FileText,
  Copy, RefreshCw, Check, ChevronDown, ChevronUp, Users, Pencil, Star, Lock,
  CheckCircle2, Trophy, Upload, Trash2, Paperclip
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CaseChat } from '../components/CaseChat';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: badge colour for estatus/status
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toLowerCase();
  const color =
    s.includes('activo') || s.includes('publicado') ? 'bg-green-100 text-green-700' :
    s.includes('proceso') ? 'bg-blue-100 text-blue-700' :
    s.includes('pendiente') ? 'bg-yellow-100 text-yellow-700' :
    'bg-stone-100 text-stone-500';
  return (
    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${color}`}>
      {status ?? 'Sin estado'}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invite-code panel (teacher-only)
// ─────────────────────────────────────────────────────────────────────────────
function InvitePanel({ caseId }: { caseId: any }) {
  const [invites, setInvites] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  const generateRandomCode = (len = 8) => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };

  useEffect(() => {
    if (!caseId) return;
    (async () => {
      try {
        const { data, error } = await (supabase.from as any)('case_invites')
          .select('id, code, used_by, used_at, created_at')
          .eq('case_id', caseId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) {
          setDbError('La tabla case_invites no existe aún. Ejecuta la migración en Supabase (db/2026_05_11_create_case_invites.sql).');
        } else {
          setInvites((data as any[]) ?? []);
          setDbError(null);
        }
      } catch (e: any) {
        setDbError('Error al cargar códigos: ' + (e?.message ?? String(e)));
      }
    })();
  }, [caseId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setDbError(null);
    const code = generateRandomCode(8);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = (userData as any)?.user?.id ?? null;
      const { data: inserted, error } = await (supabase.from as any)('case_invites')
        .insert({ case_id: caseId, code, created_by: userId })
        .select()
        .maybeSingle();
      if (error) {
        // Insert failed — code was NOT saved in DB; show error so teacher knows
        setDbError(`⚠️ El código "${code}" NO se guardó en la base de datos (${error.message ?? 'error desconocido'}). El alumno no podrá usarlo hasta que la tabla exista y tenga permisos de escritura.`);
      } else if (inserted) {
        setInvites((prev) => [inserted, ...prev]);
        handleCopy(code);
      }
    } catch (e: any) {
      setDbError(`⚠️ Error al guardar el código: ${e?.message ?? String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (code: string) => {
    try { navigator.clipboard.writeText(code); } catch { /* ignore */ }
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
      <div className="bg-secondary/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-secondary uppercase tracking-widest">
          <Users size={16} /> Códigos de Invitación
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Generando...' : 'Nuevo código'}
        </button>
      </div>

      {dbError && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-relaxed">
          {dbError}
        </div>
      )}

      <div className="divide-y divide-outline-variant/10 max-h-48 overflow-y-auto">
        {invites.length === 0 && !dbError ? (
          <p className="p-4 text-sm text-stone-400 text-center">No hay códigos generados aún. Genera uno para compartir con tus alumnos.</p>
        ) : invites.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="font-mono text-base tracking-widest font-bold">{inv.code}</span>
              {inv.used_by && (
                <span className="ml-3 text-[10px] font-bold bg-green-100 text-green-700 rounded-full px-2 py-0.5 uppercase">Usado</span>
              )}
            </div>
            <button
              onClick={() => handleCopy(inv.code)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              {copied === inv.code ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              {copied === inv.code ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        ))}
      </div>
      <div className="p-3 bg-surface-container-low text-[10px] text-stone-400 text-center">
        Los alumnos pueden usar estos códigos en la página <strong>/unirse</strong> para acceder al caso.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CourseMembersPanel — alumnos inscritos al curso (solo docente)
// ─────────────────────────────────────────────────────────────────────────────
function CourseMembersPanel({ courseId }: { courseId: number | string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingMembers(true);
      try {
        const { data, error } = await (supabase.from as any)('course_members')
          .select('id, joined_at, profiles ( id, full_name, email, avatar_url )')
          .eq('course_id', courseId)
          .order('joined_at', { ascending: true });
        if (!error) setMembers((data as any[]) ?? []);
      } catch { /* ignore */ }
      setLoadingMembers(false);
    })();
  }, [courseId]);

  return (
    <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-outline-variant/10">
        <Users size={15} className="text-primary" />
        <h3 className="text-sm font-bold text-on-background">Alumnos inscritos</h3>
        <span className="ml-auto text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {members.length}
        </span>
      </div>
      {loadingMembers ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-secondary text-center py-6 px-5">
          Aún no hay alumnos inscritos en este curso.
        </p>
      ) : (
        <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant/10">
          {members.map((m) => {
            const p = m.profiles;
            const initials = (p?.full_name ?? p?.email ?? '?').slice(0, 2).toUpperCase();
            return (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt={p.full_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-background truncate">{p?.full_name ?? '—'}</p>
                  <p className="text-[11px] text-secondary truncate">{p?.email ?? ''}</p>
                </div>
                <span className="text-[10px] text-outline shrink-0">
                  {new Date(m.joined_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isTeacher } = useAuth();

  const [caso, setCaso] = useState<any | null>(null);
  const [caseFiles, setCaseFiles] = useState<any[]>([]);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishingStatus, setPublishingStatus] = useState(false);
  const [diagnostico, setDiagnostico] = useState('');
  const [planTerapeutico, setPlanTerapeutico] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canParticipate, setCanParticipate] = useState(false);
  const [showAntecedentes, setShowAntecedentes] = useState(false);
  // Submission state
  const [existingResolution, setExistingResolution] = useState<any | null>(null);
  const [existingGrade, setExistingGrade] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // Veredicto final
  const [veredicto, setVeredicto] = useState('');
  const [savingVeredicto, setSavingVeredicto] = useState(false);
  const [veredictoSaved, setVeredictoSaved] = useState(false);
  // Case files upload (teacher)
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
  const fileUploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Try spanish table then english fallback
        let fetchError: any = null;
        let { data, error: err1 }: any = await (supabase.from as any)('casos_clinicos')
          .select('*').eq('id', id).limit(1).maybeSingle();
        if (!data) {
          const r: any = await (supabase.from as any)('clinical_cases')
            .select('*').eq('id', id).limit(1).maybeSingle();
          data = r?.data ?? null;
          if (!data) fetchError = err1 ?? r?.error ?? null;
        }
        if (!mounted) return;
        // Log so the teacher can debug in console
        if (!data) {
          console.warn('[CaseDetail] Case not found. id=', id, 'error=', fetchError);
          if (fetchError?.code === 'PGRST301' || String(fetchError?.message ?? '').includes('policy')) {
            console.warn('[CaseDetail] RLS is blocking read. Run db/2026_05_11_rls_cases_read.sql in Supabase.');
          }
        }
        setCaso(data ?? null);
        if (data?.veredicto_final) setVeredicto(data.veredicto_final);

        // fetch creator name
        if (data) {
          const creatorId = data.instructor_id ?? data.created_by ?? null;
          if (creatorId) {
            try {
              const { data: prof } = await (supabase.from as any)('profiles').select('full_name, email').eq('id', creatorId).limit(1).maybeSingle();
              if (prof) setCreatorName(prof.full_name ?? prof.email ?? null);
            } catch { /* ignore */ }
          }
        }

        // fetch case files
        if (data?.id) {
          try {
            const { data: files } = await (supabase.from as any)('case_files')
              .select('*').eq('case_id', data.id).limit(20);
            setCaseFiles((files as any[]) ?? []);
          } catch { /* ignore */ }
        }

        // compute canParticipate
        const { data: userData } = await supabase.auth.getUser();
        const userId = (userData as any)?.user?.id ?? null;
        if (mounted) setUserId(userId);

        if (isTeacher) {
          setCanParticipate(true);
        } else if (userId && data) {
          const creatorId = data.instructor_id ?? data.created_by ?? data.user_id ?? null;
          if (creatorId === userId) {
            setCanParticipate(true);
          } else {
            try {
              const { data: assignment } = await (supabase.from as any)('case_assignments')
                .select('id').eq('case_id', data.id).eq('user_id', userId).limit(1).maybeSingle();
              if (assignment) {
                setCanParticipate(true);
              } else {
                const { data: invite } = await (supabase.from as any)('case_invites')
                  .select('id').eq('case_id', data.id).eq('used_by', userId).limit(1).maybeSingle();
                if (invite) setCanParticipate(true);
              }
            } catch { /* ignore */ }
          }
        }

        // Check for existing submission (separated queries to avoid join errors)
        if (userId && data?.id && !isTeacher) {
          let existing: any = null;
          let evalRow: any = null;

          // 1. Try case_resolutions (no join)
          try {
            const { data: cr, error: crErr } = await (supabase.from as any)('case_resolutions')
              .select('*')
              .eq('case_id', data.id).eq('resolved_by', userId).limit(1).maybeSingle();
            if (!crErr && cr) {
              existing = { ...cr, _table: 'case_resolutions' };
              // Try to fetch evaluation separately
              try {
                const { data: ev } = await (supabase.from as any)('evaluations')
                  .select('id, total_score, feedback')
                  .eq('case_resolution_id', cr.id).limit(1).maybeSingle();
                if (ev) evalRow = ev;
              } catch { /* evaluations table may not exist */ }
            }
          } catch { /* ignore */ }

          // 2. Try resoluciones if nothing found yet
          if (!existing) {
            try {
              const { data: res, error: resErr } = await (supabase.from as any)('resoluciones')
                .select('*')
                .eq('caso_id', data.id).eq('estudiante_id', userId).limit(1).maybeSingle();
              if (!resErr && res) {
                existing = { ...res, _table: 'resoluciones' };
                // Try to fetch evaluacion separately
                try {
                  const { data: ev } = await (supabase.from as any)('evaluaciones')
                    .select('id, calificacion, retroalimentacion')
                    .eq('resolucion_id', res.id).limit(1).maybeSingle();
                  if (ev) evalRow = ev;
                } catch { /* evaluaciones table may not exist */ }
              }
            } catch { /* ignore */ }
          }

          if (mounted) {
            setExistingResolution(existing);
            setExistingGrade(evalRow);
            if (existing) {
              setDiagnostico(existing.diagnostico ?? existing.resolution ?? '');
              setPlanTerapeutico(existing.plan_terapeutico ?? '');
              setJustificacion(existing.justificacion ?? existing.conclusion ?? '');
            }
          }
        }
      } catch (err) {
        console.warn('fetch case error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, isTeacher]);

  const changeStatus = async (newStatus: string) => {
    if (!caso) return;
    setPublishingStatus(true);
    try {
      const table = caso.titulo !== undefined ? 'casos_clinicos' : 'clinical_cases';
      const statusField = table === 'casos_clinicos' ? 'estatus' : 'status';
      const extraFields = table === 'clinical_cases' && newStatus === 'publicado'
        ? { published_at: new Date().toISOString() } : {};
      const { error } = await (supabase.from as any)(table)
        .update({ [statusField]: newStatus, ...extraFields })
        .eq('id', caso.id);
      if (error) throw error;
      setCaso((prev: any) => ({ ...prev, estatus: newStatus, status: newStatus }));
    } catch (err: any) {
      alert('Error cambiando estatus: ' + (err?.message ?? String(err)));
    } finally {
      setPublishingStatus(false);
    }
  };

  const submitResolution = async () => {    if (!caso) return;
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = (userData as any)?.user?.id ?? userId ?? null;

      // Si ya existe una entrega → UPDATE en lugar de DELETE+INSERT
      // Así conservamos el ID original y las evaluaciones previas siguen apuntando a él.
      if (isEditing && existingResolution) {
        const updatedFields = existingResolution._table === 'case_resolutions'
          ? { resolution: diagnostico + (planTerapeutico ? '\n\nPlan:\n' + planTerapeutico : ''), conclusion: justificacion }
          : { diagnostico, plan_terapeutico: planTerapeutico, justificacion, estatus: 'En Revisión' };

        const { error: upErr } = await (supabase.from as any)(existingResolution._table)
          .update(updatedFields)
          .eq('id', existingResolution.id);

        if (upErr) {
          alert('Error al actualizar: ' + upErr.message);
        } else {
          // Actualizar el estado local para que la vista de solo-lectura muestre los nuevos valores
          const updatedResolution = {
            ...existingResolution,
            ...(existingResolution._table === 'case_resolutions'
              ? { resolution: diagnostico + (planTerapeutico ? '\n\nPlan:\n' + planTerapeutico : ''), conclusion: justificacion }
              : { diagnostico, plan_terapeutico: planTerapeutico, justificacion }),
          };
          setExistingResolution(updatedResolution);
          setIsEditing(false);
          alert('¡Resolución actualizada correctamente!');
        }
        return;
      }

      // Primera vez enviando: INSERT
      let res: any = await (supabase.from as any)('resoluciones').insert({
        estudiante_id: uid,
        caso_id: caso.id,
        diagnostico,
        plan_terapeutico: planTerapeutico,
        justificacion,
        estatus: 'En Revisión'
      }).select();

      if (res.error) {
        console.warn('[submitResolution] resoluciones failed:', res.error.message, '— trying case_resolutions...');
        res = await (supabase.from as any)('case_resolutions').insert({
          case_id: caso.id,
          resolved_by: uid,
          resolution: diagnostico + (planTerapeutico ? '\n\nPlan:\n' + planTerapeutico : ''),
          conclusion: justificacion
        }).select();
        console.log('[submitResolution] case_resolutions result:', res.data, res.error);
      } else {
        console.log('[submitResolution] resoluciones OK:', res.data);
      }

      if (res.error) {
        alert('Error al enviar: ' + (res.error.message ?? String(res.error)));
      } else {
        const inserted = Array.isArray(res.data) ? res.data[0] : res.data;
        const table = inserted?.caso_id !== undefined ? 'resoluciones' : 'case_resolutions';
        setExistingResolution(inserted ? { ...inserted, _table: table } : null);
        alert('¡Resolución enviada correctamente!');
      }
    } catch (err: any) {
      alert('Error al enviar: ' + (err.message ?? String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveVeredicto = async () => {
    if (!caso || !veredicto.trim()) return;
    setSavingVeredicto(true);
    try {
      const table = caso.titulo !== undefined ? 'clinical_cases' : 'clinical_cases';
      const { error } = await (supabase.from as any)(table)
        .update({ veredicto_final: veredicto.trim() })
        .eq('id', caso.id);
      if (error) throw error;
      setCaso((prev: any) => ({ ...prev, veredicto_final: veredicto.trim() }));
      setVeredictoSaved(true);
      setTimeout(() => setVeredictoSaved(false), 3000);
    } catch (err: any) {
      alert('Error guardando veredicto: ' + (err?.message ?? String(err)));
    } finally {
      setSavingVeredicto(false);
    }
  };

  const uploadCaseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!caso?.id || !e.target.files?.length) return;
    setUploadingFile(true);
    const bucket = import.meta.env.VITE_CASE_FILES_BUCKET || 'case-files';
    const { data: userData } = await supabase.auth.getUser();
    const uid = (userData as any)?.user?.id ?? null;
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      const ext = file.name.split('.').pop();
      const path = `cases/${caso.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      try {
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
        if (upErr) { console.warn('upload error', upErr); continue; }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        const publicUrl = urlData?.publicUrl ?? '';
        const { data: inserted, error: dbErr } = await (supabase.from as any)('case_files')
          .insert({ case_id: caso.id, uploaded_by: uid, file_name: file.name, file_url: publicUrl, mime: file.type, size: file.size })
          .select().single();
        if (!dbErr && inserted) setCaseFiles(prev => [...prev, inserted]);
      } catch (err) { console.warn('uploadCaseFile unexpected', err); }
    }
    setUploadingFile(false);
    if (fileUploadRef.current) fileUploadRef.current.value = '';
  };

  const deleteCaseFile = async (fileId: number, fileUrl: string) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    setDeletingFileId(fileId);
    try {
      // Extract storage path from URL
      const bucket = import.meta.env.VITE_CASE_FILES_BUCKET || 'case-files';
      const urlParts = fileUrl.split(`/${bucket}/`);
      if (urlParts[1]) await supabase.storage.from(bucket).remove([urlParts[1]]);
      await (supabase.from as any)('case_files').delete().eq('id', fileId);
      setCaseFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) { console.warn('deleteCaseFile', err); }
    setDeletingFileId(null);
  };

  // ── derived display values ──────────────────────────────────────────────────
  const titulo = caso?.titulo ?? caso?.title ?? 'Caso clínico';
  const categoria = caso?.categoria ?? caso?.category ?? '';
  const nivel = caso?.nivel ?? caso?.level ?? '';
  const estatus = caso?.estatus ?? caso?.status ?? '';
  const tiempoEstimado = caso?.tiempo_estimado ?? (caso?.estimated_minutes ? `${caso.estimated_minutes} min` : null);
  const expireAt = caso?.expire_at ?? null;
  const isExpired = expireAt != null && new Date(expireAt) < new Date();
  const sintomas = caso?.sintomas ?? caso?.symptoms ?? caso?.description ?? caso?.initial_information ?? '';
  const antecedentes = caso?.antecedentes ?? caso?.clinical_history ?? '';
  const consejoMentor = caso?.consejo_mentor ?? '';
  const veredictoFinal = caso?.veredicto_final ?? '';
  const etiquetas: string[] = Array.isArray(caso?.etiquetas) ? caso.etiquetas
    : Array.isArray(caso?.tags) ? caso.tags
    : typeof caso?.etiquetas === 'string' ? caso.etiquetas.split(',').map((t: string) => t.trim()).filter(Boolean)
    : typeof caso?.tags === 'string' ? caso.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : [];
  const rawCaseId = caso?.id ?? id;

  const imageFiles = caseFiles.filter(f => f.mime?.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)$/i.test(f.file_name ?? ''));
  const pdfFiles = caseFiles.filter(f => f.mime === 'application/pdf' || /\.pdf$/i.test(f.file_name ?? ''));

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center space-y-3">
        <p className="text-lg font-bold text-on-surface">Caso no encontrado</p>
        <p className="text-sm text-secondary max-w-md mx-auto">
          El caso no existe o tu cuenta no tiene permisos para verlo todavía.
          Si acabas de unirte con un código, intenta recargar la página.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">Recargar</button>
          <button onClick={() => navigate('/casos')} className="px-4 py-2 border rounded-xl text-sm">Ver casos</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="mt-1 p-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-headline font-bold text-on-surface truncate">{titulo}</h1>
            <StatusBadge status={estatus} />
            {isTeacher && (estatus.toLowerCase().includes('borrador') || estatus.toLowerCase().includes('pendiente')) && (
              <button
                onClick={() => changeStatus(caso?.titulo !== undefined ? 'Publicado' : 'publicado')}
                disabled={publishingStatus}
                className="flex items-center gap-1.5 px-3 py-1 bg-green-600 text-white text-[11px] font-bold rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {publishingStatus ? 'Publicando...' : '▶ Publicar caso'}
              </button>
            )}
            {isTeacher && (estatus.toLowerCase().includes('publicado') || estatus.toLowerCase().includes('activo')) && (
              <button
                onClick={() => changeStatus(caso?.titulo !== undefined ? 'Borrador' : 'borrador')}
                disabled={publishingStatus}
                className="flex items-center gap-1.5 px-3 py-1 bg-stone-400 text-white text-[11px] font-bold rounded-full hover:bg-stone-500 transition-colors disabled:opacity-50"
              >
                {publishingStatus ? '...' : '⏸ Despublicar'}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-secondary">
            {categoria && (
              <span className="flex items-center gap-1.5 font-medium">
                <BookOpen size={13} /> {categoria}
              </span>
            )}
            {nivel && (
              <span className="flex items-center gap-1.5">
                <ClipboardList size={13} /> {nivel}
              </span>
            )}
            {tiempoEstimado && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} /> {tiempoEstimado}
              </span>
            )}
            {expireAt && (
              <span className={`flex items-center gap-1.5 ${isExpired ? 'text-red-600 font-bold' : 'text-orange-500'}`}>
                <Clock size={13} /> {isExpired ? 'Cerrado: ' : 'Vence: '}{new Date(expireAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {creatorName && (
              <span className="flex items-center gap-1.5 text-stone-400">
                <Users size={13} /> Por: {creatorName}
              </span>
            )}
          </div>
          {etiquetas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {etiquetas.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase tracking-widest">
                  <Tag size={9} /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Body grid ───────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-7 space-y-5">
          {/* Resumen clínico */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10">
            <h2 className="flex items-center gap-2 text-base font-bold mb-3">
              <Stethoscope size={16} className="text-primary" /> Resumen del Cuadro Clínico
            </h2>
            {sintomas ? (
              <p className="text-sm text-on-surface/80 leading-relaxed whitespace-pre-wrap">{sintomas}</p>
            ) : (
              <p className="text-sm text-secondary italic">Sin resumen disponible.</p>
            )}
          </div>

          {/* Antecedentes (collapsible) */}
          {antecedentes ? (
            <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-bold hover:bg-surface-container/50 transition-colors"
                onClick={() => setShowAntecedentes((v) => !v)}
              >
                <span className="flex items-center gap-2">
                  <ClipboardList size={15} className="text-primary" /> Antecedentes de Importancia
                </span>
                {showAntecedentes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showAntecedentes && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-on-surface/80 leading-relaxed whitespace-pre-wrap">{antecedentes}</p>
                </div>
              )}
            </div>
          ) : null}

          {/* Imágenes diagnósticas */}
          {imageFiles.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
              <h3 className="flex items-center gap-2 text-sm font-bold mb-3">
                <ImageIcon size={15} className="text-primary" /> Imágenes Diagnósticas
              </h3>
              <div className="flex flex-wrap gap-3">
                {imageFiles.map((f) => (
                  <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer"
                    className="w-24 h-24 rounded-xl overflow-hidden border border-outline-variant/20 hover:ring-2 hover:ring-primary transition-all">
                    <img src={f.file_url} alt={f.file_name} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Laboratorios / PDFs */}
          {pdfFiles.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
              <h3 className="flex items-center gap-2 text-sm font-bold mb-3">
                <FileText size={15} className="text-primary" /> Laboratorios y Documentos
              </h3>
              <div className="space-y-2">
                {pdfFiles.map((f) => (
                  <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between px-4 py-3 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors text-sm">
                    <span className="flex items-center gap-2 truncate"><FileText size={14} className="text-secondary shrink-0" />{f.file_name}</span>
                    <span className="text-primary font-bold text-xs ml-3 shrink-0">Abrir →</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Gestión de Archivos (docente) ─────────────────────────────── */}
          {isTeacher && (
            <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
                <h3 className="flex items-center gap-2 text-sm font-bold text-on-background">
                  <Paperclip size={15} className="text-primary" /> Archivos del Caso
                </h3>
                <label className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all
                  ${uploadingFile ? 'bg-stone-100 text-stone-400' : 'bg-primary text-white hover:brightness-110'}`}>
                  {uploadingFile
                    ? <><div className="w-3 h-3 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin" /> Subiendo...</>
                    : <><Upload size={13} /> Subir archivo</>}
                  <input ref={fileUploadRef} type="file" multiple className="hidden" disabled={uploadingFile} onChange={uploadCaseFile} />
                </label>
              </div>
              {caseFiles.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-secondary">
                  No hay archivos adjuntos. Sube imágenes, PDFs u otros documentos para enriquecer el caso.
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/10">
                  {caseFiles.map((f) => {
                    const isImg = f.mime?.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg)$/i.test(f.file_name ?? '');
                    const isPdf = f.mime === 'application/pdf' || /\.pdf$/i.test(f.file_name ?? '');
                    return (
                      <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                        {isImg ? (
                          <img src={f.file_url} alt={f.file_name} className="w-10 h-10 rounded-lg object-cover border border-outline-variant/20 shrink-0" />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isPdf ? 'bg-red-50 text-red-500' : 'bg-stone-100 text-stone-500'}`}>
                            <FileText size={18} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-background truncate">{f.file_name}</p>
                          <p className="text-[11px] text-secondary">
                            {f.size ? `${(f.size / 1024).toFixed(0)} KB` : ''} {f.mime ?? ''}
                          </p>
                        </div>
                        <a href={f.file_url} target="_blank" rel="noreferrer"
                          className="text-xs text-primary font-bold hover:underline mr-2 shrink-0">Ver</a>
                        <button
                          onClick={() => deleteCaseFile(f.id, f.file_url)}
                          disabled={deletingFileId === f.id}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Mentor hint */}
          {(consejoMentor || true) && (
            <div className="bg-tertiary/10 border-l-4 border-tertiary p-5 rounded-2xl flex gap-4 text-tertiary shadow-sm">
              <Lightbulb size={22} className="shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Sugerencia del Mentor</span>
                <p className="text-xs leading-relaxed font-medium">
                  {consejoMentor || 'Analiza cuidadosamente los datos clínicos antes de emitir tu diagnóstico diferencial.'}
                </p>
              </div>
            </div>
          )}

          {/* ── Veredicto Final ─────────────────────────────────────────── */}
          {isExpired && (
            isTeacher ? (
              /* Teacher: editable panel */
              <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-sm overflow-hidden">
                <div className="bg-primary/5 px-6 py-4 flex items-center gap-3 border-b border-primary/10">
                  <Trophy size={18} className="text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-black text-primary uppercase tracking-widest">Veredicto Final</p>
                    <p className="text-[10px] text-secondary mt-0.5">Publica la solución correcta del caso — visible para todos los estudiantes.</p>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <textarea
                    value={veredicto}
                    onChange={(e) => setVeredicto(e.target.value)}
                    rows={6}
                    placeholder="Escribe el diagnóstico correcto, el plan terapéutico ideal y la justificación clínica esperada..."
                    className="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                  />
                  <button
                    onClick={saveVeredicto}
                    disabled={savingVeredicto || !veredicto.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {savingVeredicto ? (
                      <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Guardando...</>
                    ) : veredictoSaved ? (
                      <><CheckCircle2 size={15} /> ¡Guardado!</>
                    ) : (
                      <><Check size={15} /> Publicar veredicto</>
                    )}
                  </button>
                </div>
              </div>
            ) : veredictoFinal ? (
              /* Student: read-only panel */
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border-2 border-primary/20 shadow-sm overflow-hidden">
                <div className="px-6 py-4 flex items-center gap-3 border-b border-primary/10">
                  <Trophy size={18} className="text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-black text-primary uppercase tracking-widest">Veredicto Final del Docente</p>
                    <p className="text-[10px] text-secondary mt-0.5">Esta es la solución correcta del caso.</p>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{veredictoFinal}</p>
                </div>
              </div>
            ) : null
          )}
        </div>

        {/* Right column */}
        <aside className="lg:col-span-5 space-y-5">
          {/* Chat */}
          <div className="bg-white rounded-2xl p-4 border border-outline-variant/10 shadow-sm">
            {isExpired && !isTeacher ? (
              <div className="flex items-center gap-3 py-4 px-2 text-red-600">
                <Lock size={16} className="shrink-0" />
                <p className="text-sm font-bold">El chat está cerrado — este caso ha vencido.</p>
              </div>
            ) : (
              <CaseChat caseId={String(rawCaseId)} />
            )}
          </div>

          {/* Invite codes — teachers only */}
          {isTeacher && <InvitePanel caseId={rawCaseId} />}

          {/* Course members — teachers only */}
          {isTeacher && caso?.course_id && <CourseMembersPanel courseId={caso.course_id} />}

          {/* Decision panel */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden">
            <div className="bg-primary text-on-primary p-5 flex justify-between items-center">
              <h3 className="text-lg font-serif font-black tracking-tight">Registro de Decisión</h3>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Máx: 100 pts</span>
            </div>

            {/* ── Grade badge if already graded ───────────────────────────── */}
            {existingGrade && (
              <div className="flex items-center gap-4 px-6 py-4 bg-green-50 border-b border-green-100">
                <Star size={18} className="text-amber-500 fill-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-black text-green-700 uppercase tracking-widest">Calificación recibida</p>
                  <p className="text-2xl font-serif font-black text-green-700">
                    {existingGrade.total_score ?? existingGrade.calificacion ?? '—'}
                    <span className="text-sm font-normal text-green-400">/100</span>
                  </p>
                  {(existingGrade.feedback ?? existingGrade.retroalimentacion) && (
                    <p className="text-xs text-green-700 mt-1 italic">"{existingGrade.feedback ?? existingGrade.retroalimentacion}"</p>
                  )}
                </div>
              </div>
            )}

            {isTeacher || canParticipate ? (
              <>
                {/* ── Case expired — students cannot submit ────────────────── */}
                {isExpired && !isTeacher ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                      <Lock size={24} className="text-red-600" />
                    </div>
                    <h3 className="text-base font-bold text-red-700">Caso cerrado</h3>
                    <p className="text-sm text-secondary">Este caso venció el {new Date(expireAt!).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. Ya no se aceptan nuevas decisiones.</p>
                  </div>
                ) : (
                  <>
                {/* ── Already submitted + not editing ──────────────────────── */}
                {existingResolution && !isEditing ? (
                  <div className="p-6 space-y-5">
                    <div className="flex items-center gap-2 text-amber-600 text-sm font-bold">
                      <Lock size={14} /> Decisión enviada — solo lectura
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1 mb-1"><Stethoscope size={10} /> Diagnóstico</p>
                        <p className="text-sm bg-surface-container-low rounded-2xl p-4 whitespace-pre-wrap">{existingResolution.diagnostico ?? existingResolution.resolution ?? '—'}</p>
                      </div>
                      {(existingResolution.plan_terapeutico) && (
                        <div>
                          <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1 mb-1"><Activity size={10} /> Plan Terapéutico</p>
                          <p className="text-sm bg-surface-container-low rounded-2xl p-4 whitespace-pre-wrap">{existingResolution.plan_terapeutico}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1 mb-1"><History size={10} /> Justificación</p>
                        <p className="text-sm bg-surface-container-low rounded-2xl p-4 whitespace-pre-wrap">{existingResolution.justificacion ?? existingResolution.conclusion ?? '—'}</p>
                      </div>
                    </div>
                    {!existingGrade && (
                      <button
                        onClick={() => {
                          // Rellenar formulario con los valores actuales antes de editar
                          if (existingResolution) {
                            setDiagnostico(existingResolution.diagnostico ?? existingResolution.resolution ?? '');
                            setPlanTerapeutico((existingResolution as any).plan_terapeutico ?? '');
                            setJustificacion(existingResolution.justificacion ?? existingResolution.conclusion ?? '');
                          }
                          setIsEditing(true);
                        }}
                        className="w-full py-3 border-2 border-primary text-primary font-black rounded-2xl hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <Pencil size={15} /> Editar decisión
                      </button>
                    )}
                    {existingGrade && (
                      <p className="text-center text-[10px] text-outline uppercase tracking-wider">Ya fue calificada, no se puede editar.</p>
                    )}
                  </div>
                ) : (
                  /* ── Form (new submission or editing) ───────────────────── */
                  <form className="p-6 space-y-5" onSubmit={(e) => { e.preventDefault(); submitResolution(); }}>
                    {isEditing && (
                      <div className="flex items-center justify-between text-sm text-amber-600 font-bold bg-amber-50 px-4 py-2 rounded-xl">
                        <span className="flex items-center gap-1"><Pencil size={13} /> Editando tu decisión anterior</span>
                        <button type="button" onClick={() => setIsEditing(false)} className="text-xs underline">Cancelar</button>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-black text-secondary uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                        <Stethoscope size={13} className="text-primary" /> Diagnóstico Diferencial
                      </label>
                      <textarea
                        value={diagnostico}
                        onChange={(e) => setDiagnostico(e.target.value)}
                        required
                        className="w-full h-28 bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary transition-all outline-none resize-none font-serif"
                        placeholder="Liste al menos 3 diagnósticos probables..."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-secondary uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                        <Activity size={13} className="text-primary" /> Plan Terapéutico
                      </label>
                      <textarea
                        value={planTerapeutico}
                        onChange={(e) => setPlanTerapeutico(e.target.value)}
                        required
                        className="w-full h-28 bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary transition-all outline-none resize-none font-serif"
                        placeholder="Describa el plan terapéutico a seguir..."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-secondary uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                        <History size={13} className="text-primary" /> Justificación Clínica
                      </label>
                      <textarea
                        value={justificacion}
                        onChange={(e) => setJustificacion(e.target.value)}
                        required
                        className="w-full h-32 bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary transition-all outline-none resize-none"
                        placeholder="Fundamente su decisión basándose en las guías de práctica clínica..."
                      />
                      <p className="text-[10px] text-outline italic text-right mt-1 px-1">Mínimo 200 caracteres</p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-black rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-50"
                    >
                      <span>{isSubmitting ? 'Enviando...' : isEditing ? 'Guardar cambios' : 'Enviar Solución'}</span>
                      <Send size={18} />
                    </button>
                    <p className="text-center text-[10px] text-outline uppercase tracking-wider">
                      Tu respuesta será evaluada por el cuerpo docente.
                    </p>
                  </form>
                )}
                  </>
                )}
              </>
            ) : (
              <div className="p-8 text-center">
                <Lightbulb size={32} className="mx-auto text-stone-300 mb-3" />
                <h3 className="text-base font-bold mb-2">Participación restringida</h3>
                <p className="text-sm text-secondary mb-5">Necesitas un código de invitación para enviar resoluciones en este caso.</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => navigate('/unirse')} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold">Unirse con código</button>
                  <button onClick={() => navigate('/casos')} className="px-4 py-2 rounded-xl border text-sm">Ver casos</button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
