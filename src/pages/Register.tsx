import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  // Start a cooldown countdown when cooldownSeconds is set
  React.useEffect(() => {
    if (cooldownSeconds === null) return;
    if (cooldownSeconds <= 0) {
      setCooldownSeconds(null);
      return;
    }
    const t = setTimeout(() => setCooldownSeconds((s) => (s ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // prevent submission during cooldown
    if (cooldownSeconds && cooldownSeconds > 0) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      // detect Supabase rate-limit style messages and set a cooldown
      const msg = error.message || String(error);
      // common rate limit phrasing may include 'rate limit' or 'too many requests'
      const isRateLimit = /rate limit|too many requests/i.test(msg);

      if (isRateLimit) {
        // set a 60 second cooldown by default
        setCooldownSeconds(60);
        alert('Demasiados intentos. Espera 60 segundos antes de volver a intentar.');
      } else {
        alert('Error al registrar: ' + msg);
      }
      console.warn('Register error', error);
    } else {
      alert('Usuario registrado. Revisa tu correo para verificar (si aplica).');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Crear cuenta</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Correo institucional" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded" required />
          <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded" required />
          <button
            type="submit"
            className="w-full py-3 bg-primary text-white rounded disabled:opacity-60"
            disabled={loading || (cooldownSeconds !== null && cooldownSeconds > 0)}
          >
            {loading ? 'Registrando...' : cooldownSeconds ? `Espera ${cooldownSeconds}s` : 'Registrarse'}
          </button>
        </form>
        <p className="text-sm mt-4">¿Ya tienes cuenta? <Link to="/login" className="text-primary">Inicia sesión</Link></p>
      </div>
    </div>
  );
}
