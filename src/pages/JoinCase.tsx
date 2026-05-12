import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function JoinCase() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { userId } = useAuth() as any;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return setError('Introduce un código válido.');
    setLoading(true);
    try {
      // Look up the code — use maybeSingle() to avoid errors when not found
      const { data: inviteData, error: inviteErr } = await (supabase.from as any)('case_invites')
        .select('*')
        .eq('code', normalizedCode)
        .maybeSingle();

      if (inviteErr) {
        // Likely the table doesn't exist or RLS blocks SELECT
        console.error('case_invites select error:', inviteErr);
        setError(
          `Error al buscar el código (${inviteErr.message ?? inviteErr.code ?? 'desconocido'}). ` +
          'Asegúrate de que la migración "create_case_invites.sql" ha sido ejecutada en Supabase y que la política RLS permite SELECT.'
        );
        return;
      }

      if (!inviteData) {
        setError('Código no encontrado. Verifica que lo hayas copiado correctamente (sin espacios).');
        return;
      }

      // Check if already used by someone else (optional: allow reuse per your policy)
      if (inviteData.used_by && inviteData.used_by !== userId) {
        setError('Este código ya fue usado por otro estudiante.');
        return;
      }

      const caseId = inviteData.case_id;

      // Mark invite as used by this user (even if already used by same user)
      try {
        await (supabase.from as any)('case_invites')
          .update({ used_by: userId, used_at: new Date().toISOString() })
          .eq('id', inviteData.id);
      } catch (err) {
        console.warn('could not mark invite used', err);
      }

      // Try to insert a case_assignment so canParticipate resolves to true
      try {
        const { error: insErr } = await (supabase.from as any)('case_assignments')
          .insert({ case_id: caseId, user_id: userId, assigned_by: userId })
          .select();
        if (insErr) console.warn('case_assignments insert failed', insErr);
      } catch (err) {
        console.warn('case_assignments unexpected', err);
      }

      navigate(`/casos/${caseId}`);
    } catch (err: any) {
      console.error('join case failed', err);
      setError('Error inesperado: ' + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 mt-8">
      <h1 className="text-2xl font-bold mb-1">Unirse a un Caso</h1>
      <p className="text-sm text-secondary mb-6">Introduce el código que te compartió tu docente para acceder al caso.</p>

      <form onSubmit={handleJoin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-1">Código de acceso</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ej: ABC12345"
            className="w-full p-3 rounded-xl border bg-surface-container-low font-mono tracking-widest text-lg uppercase outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 leading-relaxed">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? 'Verificando...' : 'Unirse'}
        </button>
      </form>
    </div>
  );
}
