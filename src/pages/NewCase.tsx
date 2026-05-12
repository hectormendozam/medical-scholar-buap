import React, { useState, useRef, useEffect } from 'react';
import { 
  Stethoscope, 
  FileText, 
  Image as ImageIcon, 
  Plus, 
  X, 
  Save, 
  ArrowLeft,
  Info
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function NewCase() {
  const navigate = useNavigate();
  const { isTeacher, loading } = useAuth();
  const [tags, setTags] = useState<string[]>(['Medicina Interna', 'Urgencias']);
  const [newTag, setNewTag] = useState('');
  
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('Medicina Interna');
  const [nivel, setNivel] = useState('Básico (Estudiante)');
  const [sintomas, setSintomas] = useState('');
  const [antecedentes, setAntecedentes] = useState('');
  // file upload states
  const [images, setImages] = useState<Array<any>>([]);
  const [pdfs, setPdfs] = useState<Array<any>>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  // estimated duration (minutes) and notify option
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(45);
  const [notifyNow, setNotifyNow] = useState<boolean>(false);
  // optional longer expiry as datetime-local
  const [expireDateTime, setExpireDateTime] = useState<string>('');
  // course select
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState<boolean>(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteModalCode, setInviteModalCode] = useState<string | null>(null);
  const [preGeneratedInviteCode, setPreGeneratedInviteCode] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Try several table names for groups/courses
      const tablesToTry = [
        { name: 'courses', labelCol: 'name' },
        { name: 'grupos', labelCol: 'nombre' },
        { name: 'clinical_groups', labelCol: 'name' },
        { name: 'course_groups', labelCol: 'name' },
      ];
      for (const t of tablesToTry) {
        try {
          const { data: cr, error } = await (supabase.from as any)(t.name).select(`id, ${t.labelCol}`).limit(200);
          if (!error && cr && (cr as any[]).length > 0) {
            setCoursesList((cr as any[]).map((c: any) => ({ id: c.id, name: c[t.labelCol] ?? c.name ?? c.nombre ?? String(c.id) })));
            break;
          }
        } catch (err) {
          // table not found, try next
        }
      }
    })();
  }, []);

  const generateRandomCode = (len = 8) => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };

  const generateInviteCode = async () => {
    if (!selectedCourse) return alert('Selecciona primero un curso para generar el código.');
    setGeneratingInvite(true);
    setInviteCode(null);
    const code = generateRandomCode(8);
    // try to persist in course_invites table; if the table doesn't exist, silently keep the code client-side
    try {
      const { error } = await (supabase.from as any)('course_invites').insert({ course_id: selectedCourse, code, expires_at: null }).select();
      if (error) {
        console.warn('course_invites insert failed (maybe table missing):', error.message || error);
        setInviteCode(code);
      } else {
        setInviteCode(code);
      }
    } catch (err) {
      console.warn('generateInviteCode unexpected', err);
      setInviteCode(code);
    }
    setGeneratingInvite(false);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use authenticated user id if available
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    // Try insert into Spanish table, fallback to English-named table used in your Supabase schema
    // compute expire_at: prefer explicit datetime input, otherwise use estimatedMinutes
    let expireAt: string | null = null;
    if (expireDateTime) {
      try {
        const dt = new Date(expireDateTime);
        expireAt = isNaN(dt.getTime()) ? null : dt.toISOString();
      } catch (err) {
        expireAt = null;
      }
    } else {
      expireAt = estimatedMinutes > 0 ? new Date(Date.now() + estimatedMinutes * 60000).toISOString() : null;
    }

    // helper: insert payload dropping any unknown columns detected by the error message
    const safeInsert = async (tableName: string, payload: any) => {
      let currentPayload = { ...payload };

      for (let attempt = 0; attempt < 10; attempt++) {
        const res: any = await (supabase.from as any)(tableName).insert(currentPayload).select();
        if (!res.error) return res;

        // Check if error is about an unknown column — strip it and retry
        const msg: string = res.error?.message ?? '';
        const match = msg.match(/Could not find the '(\w+)' column/);
        if (match) {
          const badCol = match[1];
          console.warn(`[safeInsert] Dropping unknown column "${badCol}" from ${tableName}`);
          const { [badCol]: _dropped, ...rest } = currentPayload;
          currentPayload = rest;
          continue;
        }

        // Any other error — return as-is
        return res;
      }

      return { error: { message: 'Could not insert after stripping unknown columns' } };
    };

    let insertRes = await safeInsert('casos_clinicos', {
      titulo,
      categoria,
      nivel,
      etiquetas: tags,
      sintomas,
      antecedentes,
      instructor_id: userId,
      estatus: 'Publicado',
      tiempo_estimado: `${estimatedMinutes} min`,
      expire_at: expireAt,
      course_id: selectedCourse ?? null
    } as any);

    if (insertRes.error) {
      // map to english table columns
      insertRes = await safeInsert('clinical_cases', {
        title: titulo,
        description: sintomas ?? null,
        initial_information: sintomas ?? null,
        clinical_history: antecedentes ?? null,
        symptoms: sintomas ?? null,
        tags: tags,
        category: categoria,
        level: nivel,
        status: 'publicado',
        created_by: userId,
        published_at: new Date().toISOString(),
        estimated_minutes: estimatedMinutes,
        expire_at: expireAt,
        course_id: selectedCourse ?? null
      } as any);
    }

    const error = insertRes.error;

    if (!error) {
      // try to notify students immediately if requested
      try {
        const inserted = (insertRes.data && (Array.isArray(insertRes.data) ? insertRes.data[0] : insertRes.data)) as any;
        const caseId = inserted?.id ?? inserted?.case_id ?? null;
        // generate a case-specific invite code so students can join the case directly
        try {
          const code = preGeneratedInviteCode ?? generateRandomCode(8);
          const { error: inviteErr } = await (supabase.from as any)('case_invites').insert({ case_id: caseId, code, created_by: userId }).select();
          setInviteModalCode(code);
          setInviteModalOpen(true);
          // clear pre-generated after persisting
          setPreGeneratedInviteCode(null);
          if (!inviteErr) {
            try { navigator.clipboard.writeText(code); } catch (e) { /* ignore */ }
          }
        } catch (err) {
          console.warn('case invite creation failed', err);
          // fallback: show the generated code even if insert failed
          const code = preGeneratedInviteCode ?? generateRandomCode(8);
          setInviteModalCode(code);
          setInviteModalOpen(true);
          setPreGeneratedInviteCode(null);
          try { navigator.clipboard.writeText(code); } catch (e) { /* ignore */ }
        }
  if (notifyNow && caseId) {
          // if a course was selected, notify only its members; otherwise notify all students
          if (selectedCourse) {
            const { data: members, error: membersErr } = await (supabase.from as any)('course_members').select('user_id').eq('course_id', selectedCourse);
            if (!membersErr && Array.isArray(members) && members.length > 0) {
              const payloads = members.map((m: any) => ({
                user_id: m.user_id,
                title: `Nuevo caso en tu grupo: ${titulo}`,
                body: sintomas?.slice(0, 240) || 'Nuevo caso clínico disponible en tu grupo',
                case_id: caseId,
                read: false
              }));
              const { error: notifErr } = await (supabase.from as any)('notifications').insert(payloads);
              if (notifErr) console.warn('notifyNow course insert error', notifErr);
            }
              // store uploaded files in normalized case_files table
              try {
                const filesToInsert = [...images, ...pdfs].map((f: any) => ({
                  case_id: caseId,
                  file_name: f.name,
                  file_url: f.url,
                  mime: f.mime,
                  size: f.size,
                  uploaded_by: userId
                }));
                if (filesToInsert.length > 0) {
                  const { error: filesErr } = await (supabase.from as any)('case_files').insert(filesToInsert);
                  if (filesErr) console.warn('case_files insert error', filesErr);
                }
              } catch (err) {
                console.warn('case_files unexpected', err);
              }
          } else {
            const { data: students, error: studentsErr } = await (supabase.from as any)('profiles').select('id').eq('role', 'student');
            if (!studentsErr && Array.isArray(students) && students.length > 0) {
              const payloads = students.map((s: any) => ({
                user_id: s.id,
                title: `Nuevo caso: ${titulo}`,
                body: sintomas?.slice(0, 240) || 'Nuevo caso clínico disponible',
                case_id: caseId,
                read: false
              }));
              const { error: notifErr } = await (supabase.from as any)('notifications').insert(payloads);
              if (notifErr) console.warn('notifyNow insert error', notifErr);
            }
          }
        }
      } catch (notifyErr) {
        console.warn('notifyNow unexpected', notifyErr);
      }

      navigate('/casos');
    } else {
      // Show detailed error for easier debugging (logged in console and alerted)
      console.error('Error guardando caso:', error);
      const msg = error?.message || JSON.stringify(error);
      alert('Error al guardar el caso clínico: ' + msg);
    }
  };

  // file upload helpers
  const uploadFiles = async (files: FileList | null, folder = 'uploads') => {
    if (!files || files.length === 0) return [];
    const bucket = import.meta.env.VITE_CASE_FILES_BUCKET || 'case-files';
    const uploaded: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
      try {
        const { data, error } = await supabase.storage.from(bucket).upload(`${folder}/${fileName}`, file, { upsert: false });
        if (error) {
          console.warn('uploadFiles error', error);
          continue;
        }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(`${folder}/${fileName}`);
        let publicUrl = urlData?.publicUrl ?? null;
        if (!publicUrl) {
          try {
            const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(`${folder}/${fileName}`, 60 * 60 * 24);
            publicUrl = signedData?.signedUrl ?? null;
          } catch (err) {
            console.warn('createSignedUrl failed', err);
          }
        }
        uploaded.push({ name: file.name, url: publicUrl, size: file.size, mime: file.type });
      } catch (err) {
        console.warn('uploadFiles unexpected', err);
      }
    }
    return uploaded;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const up = await uploadFiles(files, 'images');
    if (up.length) setImages(prev => [...prev, ...up]);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const up = await uploadFiles(files, 'pdfs');
    if (up.length) setPdfs(prev => [...prev, ...up]);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {loading ? (
        <div className="p-12 text-center">Cargando perfil...</div>
      ) : !isTeacher ? (
        <div className="p-12 bg-white rounded-2xl shadow text-center">
          <h2 className="text-2xl font-bold mb-4">Acceso restringido</h2>
          <p className="mb-6">Solo el personal docente puede crear nuevos casos clínicos.</p>
          <div className="flex justify-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 rounded-xl bg-primary text-white">Volver</button>
          </div>
        </div>
      ) : (
        <>
      <header className="flex items-center justify-between">
        <div>
          <Link to="/casos" className="flex items-center gap-2 text-stone-400 hover:text-primary transition-colors text-sm mb-2">
            <ArrowLeft className="w-4 h-4" />
            Volver a Casos
          </Link>
          <h1 className="text-4xl font-headline font-bold text-on-surface">Registrar Nuevo Caso</h1>
          <p className="text-stone-500 mt-2">Crea un nuevo desafío clínico para la comunidad académica.</p>
        </div>
      </header>

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Basic Information */}
        <section className="bg-surface p-8 rounded-2xl ghost-border shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
            <Info className="text-primary w-5 h-5" />
            <h2 className="text-xl font-headline font-bold">Información General</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Título del Caso</label>
              <input 
                type="text" 
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej: Insuficiencia Cardíaca Congestiva Agudizada"
                className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Especialidad Principal</label>
              <select 
                value={categoria} 
                onChange={e => setCategoria(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
              >
                <option>Medicina Interna</option>
                <option>Pediatría</option>
                <option>Ginecología y Obstetricia</option>
                <option>Cirugía General</option>
                <option>Urgencias</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Asignar a Grupo/Curso (opcional)</label>
              <select value={selectedCourse ?? ''} onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : null)} className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all appearance-none">
                <option value="">(No asignar)</option>
                {coursesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {selectedCourse && (
                <div className="mt-3 flex items-center gap-3">
                  <button type="button" onClick={() => { const c = generateRandomCode(8); setPreGeneratedInviteCode(c); try { navigator.clipboard.writeText(c); } catch(e){} }} className="px-3 py-2 rounded-xl bg-primary text-white text-sm">
                    Generar código (pre)
                  </button>
                  <button type="button" onClick={generateInviteCode} disabled={generatingInvite} className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm">
                    {generatingInvite ? 'Generando...' : 'Persistir código en curso'}
                  </button>
                  {inviteCode && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="px-3 py-2 bg-surface-container-low rounded-md font-mono tracking-wide">{inviteCode}</div>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(inviteCode); }} className="text-primary underline">Copiar</button>
                    </div>
                  )}
                  {preGeneratedInviteCode && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="px-3 py-2 bg-surface-container-low rounded-md font-mono tracking-wide">{preGeneratedInviteCode}</div>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(preGeneratedInviteCode); }} className="text-primary underline">Copiar</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Nivel de Dificultad</label>
              <select 
                value={nivel} 
                onChange={e => setNivel(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
              >
                <option>Básico (Estudiante)</option>
                <option>Intermedio (Internado)</option>
                <option>Avanzado (Residente)</option>
                <option>Especialista</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Etiquetas / Tags</label>
            <div className="flex flex-wrap gap-2 p-3 bg-surface-container-low rounded-xl min-h-[56px]">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary-container">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input 
                type="text" 
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Presiona Enter para añadir..."
                className="flex-1 bg-transparent border-none text-sm outline-none min-w-[150px]"
              />
            </div>
          </div>
        </section>

        {/* Clinical Content */}
        <section className="bg-surface p-8 rounded-2xl ghost-border shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
            <Stethoscope className="text-primary w-5 h-5" />
            <h2 className="text-xl font-headline font-bold">Contenido Clínico</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Resumen del Cuadro Clínico</label>
            <textarea 
              value={sintomas}
              onChange={e => setSintomas(e.target.value)}
              placeholder="Describa el motivo de consulta, síntomas y signos vitales iniciales..."
              className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all h-32"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Tiempo estimado (minutos)</label>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={e => setEstimatedMinutes(Number(e.target.value))}
                min={0}
                className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
              />
              <p className="text-xs text-stone-400">Si defines un tiempo, al vencimiento se notificará a los estudiantes (requiere activar el job en la DB).</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Fecha/Hora de Vencimiento (opcional)</label>
              <input
                type="datetime-local"
                value={expireDateTime}
                onChange={e => setExpireDateTime(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
              />
              <p className="text-xs text-stone-400">Si completas una fecha, esta tendrá prioridad sobre el tiempo estimado. Por defecto sugiere +7 días si no se indica.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Notificar ahora</label>
              <div className="flex items-center gap-3">
                <input id="notifyNow" type="checkbox" checked={notifyNow} onChange={e => setNotifyNow(e.target.checked)} />
                <label htmlFor="notifyNow" className="text-sm text-stone-500">Enviar notificación inmediata a estudiantes</label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Antecedentes de Importancia</label>
            <textarea 
              value={antecedentes}
              onChange={e => setAntecedentes(e.target.value)}
              placeholder="Antecedentes heredofamiliares, personales patológicos y no patológicos..."
              className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all h-24"
            />
          </div>
        </section>

        {/* Multimedia & Evidence */}
        <section className="bg-surface p-8 rounded-2xl ghost-border shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
            <ImageIcon className="text-primary w-5 h-5" />
            <h2 className="text-xl font-headline font-bold">Evidencias y Multimedia</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-outline-variant rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors group">
              <div className="p-4 bg-surface-container-low rounded-full group-hover:bg-primary/10 transition-colors">
                <Plus className="w-8 h-8 text-stone-400 group-hover:text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">Subir Imágenes Diagnósticas</p>
                <p className="text-xs text-stone-500 mt-1">RX, TAC, EKG, etc. (Máx 5MB)</p>
                <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="mt-2 text-xs" />
              </div>
              {images.length > 0 && (
                <div className="w-full mt-3 flex gap-2 overflow-x-auto">
                  {images.map((f, i) => (
                    <div key={i} className="w-20 h-20 bg-surface-container-low rounded-md overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-2 border-dashed border-outline-variant rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors group">
              <div className="p-4 bg-surface-container-low rounded-full group-hover:bg-primary/10 transition-colors">
                <FileText className="w-8 h-8 text-stone-400 group-hover:text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">Adjuntar Laboratorios (PDF)</p>
                <p className="text-xs text-stone-500 mt-1">Resultados clínicos completos</p>
                <input ref={pdfInputRef} type="file" accept="application/pdf" multiple onChange={handlePdfSelect} className="mt-2 text-xs" />
              </div>
              {pdfs.length > 0 && (
                <div className="w-full mt-3 space-y-2 text-xs text-stone-500">
                  {pdfs.map((f, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="truncate">{f.name}</div>
                      <a className="text-primary underline" href={f.url} target="_blank" rel="noreferrer">Abrir</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-4 pt-4">
          <button 
            type="button" 
            onClick={() => navigate('/casos')}
            className="px-8 py-4 rounded-xl font-bold text-sm text-stone-400 hover:bg-surface-container-low transition-all"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-12 py-4 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Publicar Caso Clínico
          </button>
  </div>
  </form>
  </>
      )}
    </div>
  );
}

// Invite Code Modal component: appended to page file-level to keep code local
function InviteModal({ open, code, onClose }: { open: boolean; code: string | null; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[520px] p-6 transform transition-all duration-200 scale-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Código de acceso al caso</h3>
            <p className="text-sm text-secondary mt-1">Comparte este código con tus estudiantes para que se unan al caso.</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>

        <div className="mt-6 bg-surface-container-low p-4 rounded-md flex items-center justify-between">
          <div className="font-mono text-xl tracking-widest">{code}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => { try { navigator.clipboard.writeText(code ?? ''); alert('Copiado'); } catch (e) { alert('Copia manual: ' + code); } }} className="px-3 py-2 bg-primary text-white rounded-md">Copiar</button>
            <button onClick={onClose} className="px-3 py-2 border rounded-md">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

