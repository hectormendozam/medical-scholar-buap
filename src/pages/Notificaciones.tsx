import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Clock, Info, AlertTriangle, BookOpen } from 'lucide-react';

interface Notificacion {
  id: number;
  texto: string;
  tipo: 'info' | 'alerta' | 'exito' | 'recordatorio';
  tiempo: string;
  autor: string;
  leida: boolean;
}

const notificacionesIniciales: Notificacion[] = [
  { id: 1, texto: 'Nueva retroalimentación disponible en el Caso #4292 – Insuficiencia Cardíaca Congestiva', tipo: 'exito', tiempo: 'Hace 15 min', autor: 'Dr. Méndez García', leida: false },
  { id: 2, texto: 'Actualización de Protocolo: Pediatría General – Favor de revisar el nuevo documento adjunto', tipo: 'info', tiempo: 'Hace 2 horas', autor: 'Coordinación Médica', leida: false },
  { id: 3, texto: 'Tu resolución del Caso #4293 ha sido calificada con 8.5/10', tipo: 'exito', tiempo: 'Hace 5 horas', autor: 'Dr. Ramirez López', leida: true },
  { id: 4, texto: 'Plazo de entrega próximo: Caso #4296 – Crisis Hipertensiva vence mañana', tipo: 'alerta', tiempo: 'Hace 1 día', autor: 'Sistema Académico', leida: true },
  { id: 5, texto: 'Nuevo caso clínico asignado: Neumonía Adquirida en Comunidad', tipo: 'recordatorio', tiempo: 'Hace 2 días', autor: 'Dr. Fuentes Olvera', leida: true },
];

const tipoConfig = {
  info: { color: 'bg-blue-50 text-blue-700', icono: Info, border: 'border-blue-200' },
  alerta: { color: 'bg-amber-50 text-amber-700', icono: AlertTriangle, border: 'border-amber-200' },
  exito: { color: 'bg-green-50 text-green-700', icono: CheckCircle2, border: 'border-green-200' },
  recordatorio: { color: 'bg-primary/5 text-primary', icono: BookOpen, border: 'border-primary/20' },
};

export default function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(notificacionesIniciales);
  const sinLeer = notificaciones.filter(n => !n.leida).length;

  const marcarLeida = (id: number) => {
    setNotificaciones(prev =>
      prev.map(n => n.id === id ? { ...n, leida: true } : n)
    );
  };

  const marcarTodasLeidas = () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-headline font-bold text-on-surface">Notificaciones</h1>
          <p className="text-stone-500 mt-2">
            Tienes <span className="font-bold text-primary">{sinLeer}</span> notificación{sinLeer !== 1 ? 'es' : ''} sin leer.
          </p>
        </div>
        {sinLeer > 0 && (
          <button
            onClick={marcarTodasLeidas}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary hover:text-white transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Marcar todas como leídas
          </button>
        )}
      </header>

      <div className="space-y-3">
        {notificaciones.map((notif) => {
          const config = tipoConfig[notif.tipo];
          const Icono = config.icono;
          return (
            <div
              key={notif.id}
              onClick={() => marcarLeida(notif.id)}
              className={`group bg-white dark:bg-surface p-6 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                notif.leida
                  ? 'border-stone-100 dark:border-outline-variant opacity-70'
                  : 'border-primary/20 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${config.color}`}>
                  <Icono className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${notif.leida ? 'text-stone-500' : 'font-semibold text-on-surface'}`}>
                    {notif.texto}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notif.tiempo}
                    </span>
                    <span>•</span>
                    <span>{notif.autor}</span>
                  </div>
                </div>
                {!notif.leida && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1 animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {notificaciones.every(n => n.leida) && (
        <div className="text-center py-16 text-stone-400">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-semibold">Todo al día</p>
          <p className="text-sm mt-1">No tienes notificaciones pendientes.</p>
        </div>
      )}
    </div>
  );
}
