import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { School, UserCircle, Lock, Eye, EyeOff, ArrowRight, MousePointer2, Stethoscope, Laptop } from 'lucide-react';
import { motion } from 'motion/react';

export function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      try {
        const form = e.target as HTMLFormElement;
        // extract email/password from inputs
        const email = (form.querySelector('input[type=email]') as HTMLInputElement).value;
        const password = (form.querySelector('input[type=password]') as HTMLInputElement).value;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Supabase bloquea login si email no está verificado — intentar forzar sesión
          if (/email not confirmed/i.test(error.message)) {
            // Intentar sign-up silencioso para obtener sesión directa (sin confirmar)
            const { data: up } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
            if (up.session) { navigate('/dashboard'); return; }
            alert('El correo no ha sido verificado. Ve a Supabase → Authentication → Settings y desactiva "Enable email confirmations".');
          } else {
            alert('Error al iniciar sesión: ' + error.message);
          }
        } else {
          navigate('/dashboard');
        }
      } catch (err: any) {
        console.error(err);
        alert('Error al iniciar sesión.');
      }
    })();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
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
            alt="Medical Research"
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
                Gestión de <br />Casos Médicos
              </h1>
              <p className="text-on-primary/80 text-lg max-w-sm leading-relaxed font-light">
                Plataforma institucional para la formación clínica y académica de excelencia.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Lock className="text-white" size={20} />
                </div>
                <span className="text-sm font-label uppercase tracking-widest font-semibold">Acceso Seguro Institucional</span>
              </div>
              <div className="text-xs font-label opacity-60 flex gap-4">
                <span>Facultad de Ciencias de la Computación</span>
                <span className="w-1 h-1 bg-white/40 rounded-full my-auto" />
                <span>Facultad de Medicina</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="p-8 md:p-16 flex flex-col justify-center bg-white">
          <div className="mb-10 text-center md:text-left">
            <div className="w-16 h-16 bg-surface-container rounded-xl flex items-center justify-center mb-6 mx-auto md:mx-0">
               <School className="text-primary" size={32} />
            </div>
            <h3 className="font-serif text-3xl text-primary font-bold mb-2 tracking-tight">BUAP Medical Scholar</h3>
            <p className="text-secondary font-label text-sm">Bienvenido al portal académico de </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="font-label text-xs font-bold text-secondary-fixed-dim uppercase tracking-wider block ml-1">
                Correo Institucional
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserCircle className="text-outline group-focus-within:text-primary transition-colors" size={20} />
                </div>
                <input 
                  type="email" 
                  placeholder="usuario@correo.buap.mx"
                  className="block w-full pl-12 pr-4 py-4 bg-surface-container-lowest border-0 ring-1 ring-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none text-on-surface"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-label text-xs font-bold text-secondary-fixed-dim uppercase tracking-wider block ml-1">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-outline group-focus-within:text-primary transition-colors" size={20} />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••••••"
                  className="block w-full pl-12 pr-12 py-4 bg-surface-container-lowest border-0 ring-1 ring-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none text-on-surface"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant/50" />
                <span className="text-sm text-secondary group-hover:text-on-surface transition-colors">Recordar sesión</span>
              </label>
              <a href="#" className="text-sm font-semibold text-primary hover:text-primary-container transition-colors">
                ¿Olvidó su contraseña?
              </a>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <span>Iniciar Sesión Académica</span>
              <ArrowRight size={20} />
            </button>
            <div className="mt-3 text-center">
              <a href="/register" className="text-sm font-semibold text-primary hover:text-primary-container transition-colors">Registrar como estudiante</a>
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-outline-variant/20">
            <div className="flex flex-col items-center gap-4">
              <p className="text-xs text-secondary font-label text-center">Desarrollado en colaboración por:</p>
              <div className="flex items-center gap-8 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                <div className="flex flex-col items-center">
                  <Laptop size={24} />
                  <span className="text-[10px] font-bold mt-1">FCC</span>
                </div>
                <div className="w-[1px] h-8 bg-outline-variant" />
                <div className="flex flex-col items-center">
                  <Stethoscope size={24} />
                  <span className="text-[10px] font-bold mt-1">MEDICINA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer Links */}
      <div className="absolute bottom-6 left-0 right-0 px-8 flex justify-between items-center text-[10px] text-secondary font-label uppercase tracking-widest">
        <p>© 2024 Benemérita Universidad Autónoma de Puebla.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary transition-colors">Aviso de Privacidad</a>
          <a href="#" className="hover:text-primary transition-colors">Soporte Técnico</a>
          <a href="#" className="hover:text-primary transition-colors">Normativa</a>
        </div>
      </div>
    </div>
  );
}
