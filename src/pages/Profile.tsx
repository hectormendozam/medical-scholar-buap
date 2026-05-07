import { useEffect, useState } from 'react';
import { Mail, MapPin, Calendar, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const navigate = useNavigate();
  const { userId, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState<string>('');
  const [institution, setInstitution] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [profileKeys, setProfileKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setEmail(profile.email ?? '');
      setAvatarUrl((profile as any).avatar_url ?? null);
      setSpecialty((profile as any).specialty ?? '');
      setInstitution((profile as any).institution ?? '');
      setLevel((profile as any).level ?? '');
      setProfileKeys(Object.keys(profile));
    }
  }, [profile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const saveProfile = async () => {
    if (!userId) return;
    setLoading(true);
    setSaveError(null);
    const updates: any = {
      id: userId,
      full_name: fullName,
      email,
      updated_at: new Date().toISOString(),
    };

    // Only include optional fields if the fetched profile already contains those columns
    // This avoids DB errors when the column doesn't exist in the current schema.
    if (profileKeys.includes('specialty')) updates.specialty = specialty;
    if (profileKeys.includes('institution')) updates.institution = institution;
    if (profileKeys.includes('level')) updates.level = level;
  if (profileKeys.includes('avatar_url')) updates.avatar_url = avatarUrl;

    let data: any = null;
    let error: any = null;

    try {
      if (profile && (profile as any).id) {
        // profile exists: perform update (avoids insert/upsert path which can be blocked by RLS)
  const res = await (supabase.from as any)('profiles').update(updates).eq('id', userId).select().single();
        data = res.data;
        error = res.error;
      } else {
        // fallback to upsert if no profile row present
  const res = await (supabase.from as any)('profiles').upsert(updates).select().single();
        data = res.data;
        error = res.error;
      }
    } catch (err) {
      console.error('saveProfile unexpected error', err);
      setSaveError(String(err));
      setLoading(false);
      return;
    }

    setLoading(false);
    if (error) {
      console.error('update profile error', error);
      // show detailed message
      const msg = error.message || JSON.stringify(error);
      setSaveError(msg);
      alert('Error al guardar el perfil: ' + msg);
      return;
    }
    // refresh context
    await refreshProfile();
    setEditing(false);
  };

  const uploadAvatar = async (file: File | null) => {
    if (!file || !userId) return null;
    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${ext}`;
      // bucket name configurable via env; default to 'avatars'
      const bucket = import.meta.env.VITE_AVATAR_BUCKET || 'avatars';
      const { data, error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
      if (uploadError) {
        console.error('upload error', uploadError);
        alert(`Error subiendo avatar: ${uploadError.message || JSON.stringify(uploadError)}`);
        return null;
      }
      // get public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      let publicUrl = urlData?.publicUrl ?? null;
      // If publicUrl is null (private bucket), try creating a signed URL for short-lived access
      if (!publicUrl) {
        try {
          const { data: signedData, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(fileName, 60);
          if (signedError) {
            console.warn('createSignedUrl error', signedError);
          } else {
            publicUrl = signedData?.signedUrl ?? null;
          }
        } catch (err) {
          console.warn('signed url error', err);
        }
      }
      if (!publicUrl) {
        alert('Imagen subida, pero no se pudo generar una URL pública. Revisa permisos del bucket `avatars` en Supabase.');
        return null;
      }
      setAvatarUrl(publicUrl);
      return publicUrl;
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header / Cover */}
      <div className="relative h-48 bg-gradient-to-r from-primary/20 to-primary-container/40 rounded-3xl overflow-hidden ghost-border">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
      </div>

      {/* Profile Info Card */}
      <div className="relative -mt-24 px-8">
        <div className="bg-surface p-8 rounded-3xl ghost-border shadow-xl flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl bg-primary-container flex items-center justify-center border-4 border-surface shadow-lg overflow-hidden">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="text-white font-bold">{fullName ? fullName[0] : 'U'}</div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-xl shadow-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <label className="block text-[11px] mt-2 text-stone-400">Subir avatar</label>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) return;
                const url = await uploadAvatar(file);
                if (url) setAvatarUrl(url);
              }}
              className="mt-2 text-xs"
            />
            {uploading && <div className="text-xs text-stone-400 mt-1">Subiendo...</div>}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h1 className="text-3xl font-headline font-bold text-on-surface">{fullName || 'Usuario'}</h1>
                <p className="text-stone-500 font-medium">{(profile as any)?.role ?? ''}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-2 items-center">
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <MapPin className="w-4 h-4" />
                {institution || 'Puebla, México'}
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Calendar className="w-4 h-4" />
                Miembro desde {(profile as any)?.created_at ? new Date((profile as any).created_at).getFullYear() : ''}
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Mail className="w-4 h-4" />
                {email}
              </div>
              {level && (
                <span className="ml-4 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest">{level}</span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setEditing((s) => !s)}
              className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-2xl transition-all text-stone-400 hover:text-primary"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-error/10 text-error hover:bg-error hover:text-white rounded-2xl font-bold text-sm transition-all flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4">
        <div className="space-y-8">
          <section className="bg-surface p-6 rounded-2xl ghost-border space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 font-label">Editar Perfil</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400">Nombre completo</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full mt-2 p-3 rounded-xl bg-surface-container-low outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400">Correo</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-2 p-3 rounded-xl bg-surface-container-low outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400">Avatar URL</label>
                <input value={avatarUrl ?? ''} onChange={(e) => setAvatarUrl(e.target.value)} className="w-full mt-2 p-3 rounded-xl bg-surface-container-low outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400">Especialidad / Carrera</label>
                <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full mt-2 p-3 rounded-xl bg-surface-container-low outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400">Nivel (Estudiante / Residente / Instructor)</label>
                <input value={level} onChange={(e) => setLevel(e.target.value)} className="w-full mt-2 p-3 rounded-xl bg-surface-container-low outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400">Institución (Universidad / Hospital)</label>
                <input value={institution} onChange={(e) => setInstitution(e.target.value)} className="w-full mt-2 p-3 rounded-xl bg-surface-container-low outline-none" />
              </div>
              {!profileKeys.includes('specialty') && !profileKeys.includes('institution') && !profileKeys.includes('level') && (
                <p className="text-xs text-stone-400">Nota: tu esquema actual de `profiles` no parece tener columnas para especialidad/nivel/institución. Si quieres guardar estos campos en la base de datos, puedo añadir instrucciones SQL para crear las columnas `specialty`, `level`, `institution` en `public.profiles`.</p>
              )}
              <div className="flex gap-3">
                <button onClick={saveProfile} disabled={loading} className="px-4 py-2 bg-primary text-white rounded-2xl font-bold">{loading ? 'Guardando...' : 'Guardar'}</button>
                <button onClick={() => setEditing(false)} className="px-4 py-2 bg-surface-container-low rounded-2xl">Cancelar</button>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <section className="bg-surface p-8 rounded-2xl ghost-border space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-headline font-bold">Actividad Reciente</h3>
              <button className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">Ver todo</button>
            </div>

            <div className="space-y-4">
              {/* Placeholder recent activity */}
              <div className="p-4 bg-surface-container-low rounded-xl">No hay actividad reciente.</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
