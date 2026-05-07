import React from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function MyGrades() {
  const { userId } = useAuth();
  const [grades, setGrades] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      // join resoluciones + evaluaciones where estudiante_id = userId
      const { data: fallback, error } = await (supabase.from as any)('resoluciones').select(`*, evaluaciones ( calificacion, retroalimentacion, instructor_id )`).eq('estudiante_id', userId);
      if (fallback) setGrades((fallback as any[]) ?? []);
      setLoading(false);
    })();
  }, [userId]);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Mis Calificaciones</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : grades.length === 0 ? (
        <p>No hay calificaciones aún.</p>
      ) : (
        <div className="space-y-4">
          {grades.map((g: any) => (
            <div key={g.id || g.resolucion_id} className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
              <div>
                <div className="text-sm font-bold">{g.title || g.titulo || `Entrega ${g.resolucion_id ?? g.id}`}</div>
                <div className="text-xs text-secondary">{g.instructor_name ?? ''}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black">{g.evaluaciones?.[0]?.calificacion ?? g.calificacion ?? '-' } / 10</div>
                <div className="text-xs text-secondary">{g.evaluaciones?.[0]?.retroalimentacion ?? ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
