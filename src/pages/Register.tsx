import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { School, UserCircle, Lock, Eye, EyeOff, ArrowRight, Stethoscope, Laptop, Mail, BookOpen, Building2, User } from 'lucide-react';
import { motion } from 'motion/react';

const SPECIALTIES = [
  'Medicina General', 'Medicina Interna', 'Cirugía General', 'Pediatría',
  'Ginecología y Obstetricia', 'Cardiología', 'Neurología', 'Urgencias',
  'Radiología', 'Anatomía Patológica', 'Otra',
];

const LEVELS = ['Estudiante de Medicina', 'Interno', 'Residente', 'Médico General', 'Especialista'];

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  // Form fields
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [fullName, setFullName]     = useState('');
  const [specialty, setSpecialty]   = useState('');
  const [level, setLevel]           = useState('');
  const [institution, setInstitution] = useState('BUAP');

  React.useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) { setCooldownSeconds(null); return; }
    const t = setTimeout(() => setCooldownSeconds((s) => (s ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds && cooldownSeconds > 0) return;
    setLoading(true);

    // Sign up — emailRedirectTo tricks Supabase into not blocking login even without email confirmation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
          specialty,
          level,
          institution,
        },
      },
    });

    if (error) {
      const msg = error.message ?? String(error);
      if (/rate limit|too many requests/i.test(msg)) {
        setCooldownSeconds(60);
        alert('Demasiados intentos. Espera 60 segundos.');
      } else {
        alert('Error al registrar: ' + msg);
      }
      setLoading(false);
      return;
    }

    // Update profiles table with extra fields (el trigger handle_new_user ya crea el row)
    if (data.user?.id) {
      await (supabase.from as any)('profiles').update({
        full_name: fullName,
        specialty,
        level,
        institution,
        email,
      }).eq('id', data.user.id);
    }

    setLoading(false);

    // If session already exists (email confirm disabled in Supabase), go straight to dashboard
    if (data.session) {
      navigate('/dashboard');
    } else {
      // Show success but let them log in directly (we handle unverified in login too)
      alert('¡Cuenta creada! Puedes iniciar sesión ahora.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-tertiary/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden z-10 border border-outline-variant/15"
      >
        {/* Branding Side */}
        <div className="hidden md:block relative overflow-hidden bg-primary-container">
          <img
            src="https://images.unsplash.com/photo-1576091160550-217359f42f8c?auto=format&fit=crop&q=80&w=2070"
            alt="Medical"
            className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary-container/95 flex flex-col justify-between p-12 text-on-primary">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <School className="text-primary" size={28} />
                </div>
                <h2 className="font-serif text-2xl font-bold tracking-tight">BUAP</h2>
              </div>
              <h1 className="font-serif text-5xl font-bold leading-tight mb-6">
                Únete a la<br />plataforma
              </h1>
              <p className="text-on-primary/80 text-lg max-w-sm leading-relaxed font-light">
                Crea tu cuenta para acceder a casos clínicos, seguimiento académico y retroalimentación docente.
              </p>
            </div>
            <div className="space-y-4 text-xs font-label opacity-60 flex gap-4">
              <span>Facultad de Ciencias de la Computación</span>
              <span className="w-1 h-1 bg-white/40 rounded-full my-auto" />
              <span>Facultad de Medicina</span>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white overflow-y-auto max-h-screen">
          <div className="mb-8 text-center md:text-left">
            <div className="w-14 h-14 bg-surface-container rounded-xl flex items-center justify-center mb-4 mx-auto md:mx-0">
              <School className="text-primary" size={28} />
            </div>
            <h3 className="font-serif text-2xl text-primary font-bold mb-1 tracking-tight">Crear cuenta</h3>
            <p className="text-secondary text-sm">Completa tu perfil académico para comenzar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest block">Nombre completo *</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={16} />
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. / Lic. Nombre Apellido"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest ring-1 ring-outline-variant/30 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest block">Correo *</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={16} />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@correo.buap.mx"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest ring-1 ring-outline-variant/30 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest block">Contraseña *</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required minLength={6}
                  className="w-full pl-10 pr-12 py-3 bg-surface-container-lowest ring-1 ring-outline-variant/30 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Specialty + Level */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest block">Especialidad</label>
                <div className="relative group">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={14} />
                  <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 bg-surface-container-lowest ring-1 ring-outline-variant/30 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all appearance-none">
                    <option value="">Selecciona...</option>
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest block">Nivel</label>
                <div className="relative group">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={14} />
                  <select value={level} onChange={(e) => setLevel(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 bg-surface-container-lowest ring-1 ring-outline-variant/30 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all appearance-none">
                    <option value="">Selecciona...</option>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Institution */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest block">Institución</label>
              <div className="relative group">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={16} />
                <input
                  type="text" value={institution} onChange={(e) => setInstitution(e.target.value)}
                  placeholder="BUAP, UNAM, IMSS..."
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest ring-1 ring-outline-variant/30 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (cooldownSeconds !== null && cooldownSeconds > 0)}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : cooldownSeconds ? `Espera ${cooldownSeconds}s` : (<><span>Crear cuenta</span><ArrowRight size={18} /></>)}
            </button>

            <p className="text-center text-sm text-secondary">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">Inicia sesión</Link>
            </p>
          </form>

          <div className="mt-8 pt-6 border-t border-outline-variant/20 flex items-center justify-center gap-8 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <div className="flex flex-col items-center">
              <Laptop size={20} />
              <span className="text-[10px] font-bold mt-1">FCC</span>
            </div>
            <div className="w-[1px] h-6 bg-outline-variant" />
            <div className="flex flex-col items-center">
              <Stethoscope size={20} />
              <span className="text-[10px] font-bold mt-1">MEDICINA</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-6 left-0 right-0 px-8 flex justify-between items-center text-[10px] text-secondary font-label uppercase tracking-widest">
        <p>© 2026 Benemérita Universidad Autónoma de Puebla.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary transition-colors">Aviso de Privacidad</a>
          <a href="#" className="hover:text-primary transition-colors">Soporte Técnico</a>
        </div>
      </div>
    </div>
  );
}
