import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Star, 
  FileText, 
  SearchIcon, 
  Download, 
  Stethoscope, 
  Activity, 
  History, 
  Send, 
  Lightbulb,
  FileBadge,
  CheckCircle2,
  FileCheck2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CasoClinico } from '../types';

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caso, setCaso] = useState<CasoClinico | null>(null);

  useEffect(() => {
    async function fetchCase() {
      if (!id) return;
      const { data } = await supabase.from('casos_clinicos').select('*').eq('id', id).single();
      if (data) setCaso(data);
    }
    fetchCase();
  }, [id]);

  if (!caso) return <div className="flex justify-center p-20">Cargando caso...</div>;

  return (
    <div className="max-w-[1400px] mx-auto pb-20">
      {/* Header Area */}
      <header className="mb-10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm font-label text-secondary hover:text-primary transition-colors mb-4 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Volver a Casos</span>
          <span className="mx-1 text-outline">/</span>
          <span className="text-primary font-bold">Caso #{caso.id.substring(0,4)} - {caso.categoria || 'Sin categoría'}</span>
        </button>
        
        <h1 className="text-5xl font-serif font-black text-on-background tracking-tight leading-tight">
          {caso.titulo}
        </h1>
        
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2 bg-tertiary/10 text-tertiary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <Star size={14} fill="currentColor" />
            Nivel: {caso.nivel || 'Básico'}
          </div>
          <div className="text-secondary text-sm font-medium flex items-center gap-2">
            <Activity size={16} className="text-outline" />
            Tiempo Estimado: {caso.tiempo_estimado || 'No especificado'}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Clinical Info */}
        <div className="lg:col-span-7 space-y-10">
          {/* Main Case Card */}
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-outline-variant/10">
            <div className="flex items-center gap-4 border-b border-surface-container pb-6 mb-8">
              <div className="p-3 bg-primary/10 rounded-xl">
                <FileText className="text-primary" size={24} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-on-background">Resumen Clínico</h2>
            </div>

            <div className="grid grid-cols-2 gap-10 mb-10">
              <div>
                <label className="text-[10px] font-label font-black text-outline uppercase tracking-[0.2em] mb-2 block">Paciente</label>
                <p className="text-xl font-serif font-bold text-on-background">{caso.nombre_paciente || 'No especificado'}</p>
              </div>
              <div>
                <label className="text-[10px] font-label font-black text-outline uppercase tracking-[0.2em] mb-2 block">Motivo de consulta</label>
                <p className="text-xl font-serif font-bold text-on-background">{caso.descripcion_inicial || 'No especificado'}</p>
              </div>
            </div>

            <div className="space-y-6 text-on-background/80 leading-relaxed">
              <div className="bg-surface-container-low p-6 rounded-2xl">
                <h3 className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest mb-4">
                   <Activity size={14} /> Sintomatología
                </h3>
                <p>
                  {caso.sintomas || 'No hay síntomas registrados.'}
                </p>
              </div>

              <div className="bg-surface-container-low p-6 rounded-2xl">
                <h3 className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest mb-4">
                  <History size={14} /> Antecedentes
                </h3>
                <ul className="space-y-3 list-none">
                  {(caso.antecedentes || 'Sin antecedentes').split('\n').filter(item => item.trim() !== '').map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Evidence Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Image Evidence */}
            <div className="group bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10 hover:shadow-xl transition-all cursor-zoom-in">
              <div className="aspect-[4/3] rounded-xl overflow-hidden mb-4 relative">
                <img 
                  src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=1000" 
                  alt="X-ray"
                  className="w-full h-full object-cover grayscale transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/5" />
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                  RX Tórax - PA
                </div>
              </div>
              <div className="flex justify-between items-center px-2">
                <span className="text-sm font-bold font-serif">Radiografía de Tórax</span>
                <SearchIcon size={16} className="text-outline" />
              </div>
            </div>

            {/* Document Evidence */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant/10 flex flex-col justify-between hover:bg-surface-container-low transition-colors group cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <FileBadge size={28} />
                </div>
                <div className="flex flex-col items-end gap-1">
                   <div className="bg-green-50 text-green-600 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={10} /> Cargado
                   </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold font-serif mb-1 group-hover:text-primary transition-colors">Laboratorios_Completos.pdf</h4>
                <p className="text-[10px] text-secondary font-label font-bold uppercase tracking-wider">Biometría, Química, NT-proBNP</p>
              </div>
            </div>

            {/* EKG Section */}
            <div className="col-span-2 bg-white rounded-2xl p-8 shadow-sm border-l-4 border-primary border-t border-r border-b border-outline-variant/10 flex items-center gap-8">
              <div className="w-40 h-20 bg-surface-container rounded-xl overflow-hidden hidden sm:block">
                <img 
                  src="https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&q=80&w=600" 
                  alt="EKG"
                  className="w-full h-full object-cover opacity-30 grayscale"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest mb-2">
                  <Stethoscope size={16} /> Interpretación EKG
                </div>
                <p className="text-sm font-serif italic text-on-background/80">"Ritmo sinusal, 88 lpm, Criterios de Sokolow-Lyon positivos para HVI."</p>
              </div>
              <button className="p-3 bg-surface-container-high rounded-full text-secondary hover:bg-primary hover:text-white transition-all">
                <Download size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Decision Panel */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden sticky top-24">
            <div className="bg-primary text-on-primary p-6 flex justify-between items-center">
              <h3 className="text-xl font-serif font-black tracking-tight">Registro de Decisión</h3>
              <div className="text-[10px] font-label font-bold uppercase tracking-widest opacity-70">
                Puntuación Máx: 100
              </div>
            </div>

            <form className="p-8 space-y-8" onSubmit={(e) => e.preventDefault()}>
              {/* Diagnóstico */}
              <div className="space-y-3">
                <label className="text-xs font-black text-secondary uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <Stethoscope size={14} className="text-primary" /> Diagnóstico Diferencial
                </label>
                <textarea 
                  className="w-full h-32 bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none resize-none font-serif"
                  placeholder="Liste al menos 3 diagnósticos probables..."
                />
              </div>

              {/* Plan Terapéutico */}
              <div className="space-y-4">
                <label className="text-xs font-black text-secondary uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <Activity size={14} className="text-primary" /> Plan Terapéutico
                </label>
                <div className="space-y-3">
                  {[
                    "Furosemida IV (Bolo inicial)",
                    "Nitroglicerina en Infusión",
                    "Ventilación Mecánica No Invasiva"
                  ].map((option, i) => (
                    <label key={i} className="flex items-center gap-4 p-4 rounded-xl border border-outline-variant/20 hover:bg-surface-container-low transition-colors cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 rounded-md text-primary focus:ring-primary border-outline-variant/50 cursor-pointer" />
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Justificación */}
              <div className="space-y-3">
                <label className="text-xs font-black text-secondary uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                  <History size={14} className="text-primary" /> Justificación Clínica
                </label>
                <textarea 
                  className="w-full h-40 bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary focus:bg-white transition-all outline-none resize-none"
                  placeholder="Fundamente su decisión basándose en las guías de práctica clínica..."
                />
                <p className="text-[10px] text-outline italic text-right px-2 font-medium">Mínimo 200 caracteres para análisis profundo</p>
              </div>

              {/* CTA */}
              <button 
                type="submit"
                className="w-full py-5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-black rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
              >
                <span>Enviar Solución</span>
                <Send size={20} />
              </button>
              
              <p className="text-center text-[10px] font-label font-bold text-outline uppercase tracking-wider">
                Al enviar, su respuesta será evaluada por el cuerpo docente.
              </p>
            </form>
          </div>

          {/* Hint Card */}
          <div className="bg-tertiary/10 border-l-4 border-tertiary p-6 rounded-2xl flex gap-4 text-tertiary shadow-sm animate-pulse">
            <Lightbulb className="flex-shrink-0" size={24} />
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest">Sugerencia del Mentor</span>
              <p className="text-xs leading-relaxed font-medium">
                {caso.consejo_mentor || 'Analiza cuidadosamente los datos clínicos para formular tu decisión.'}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
