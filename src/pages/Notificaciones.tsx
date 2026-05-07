import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Notificaciones() {
  const { loading } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const load = async () => {
      setLoadingPage(true);
      const { data } = await (supabase as any)
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * 20, page * 20 + 19);
      setNotifications(data || []);
      setLoadingPage(false);
    };
    load();
  }, [loading, page]);

  const markAllRead = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      if (!userId) return;
      await (supabase as any).from('notifications').update({ is_read: true }).eq('user_id', userId).is('is_read', false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn('markall err', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notificaciones</h1>
        <div className="flex gap-3">
          <button onClick={markAllRead} className="px-4 py-2 rounded-xl bg-primary text-white">Marcar todo como leído</button>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-4 py-2 rounded-xl bg-surface">Anterior</button>
          <button onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-xl bg-surface">Siguiente</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border">
        {loadingPage && <div className="p-4">Cargando...</div>}
        {!loadingPage && notifications.length === 0 && <div className="p-4 text-center text-sm text-secondary">No hay notificaciones</div>}
        {notifications.map((n) => (
          <div key={n.id} className={`p-4 border-b last:border-b-0 ${n.is_read ? 'opacity-80' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{n.title}</div>
                <div className="text-sm text-secondary">{n.message}</div>
              </div>
              <div className="text-xs text-stone-400">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            <div className="mt-2 flex gap-3">
              {n.case_id && <button onClick={() => navigate(`/casos/${n.case_id}`)} className="text-primary text-sm">Ver caso</button>}
              {(n as any).course_id && <button onClick={() => navigate(`/grupos/${(n as any).course_id}`)} className="text-primary text-sm">Ver grupo</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
