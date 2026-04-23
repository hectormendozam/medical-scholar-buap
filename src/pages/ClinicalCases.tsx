import { Stethoscope, Filter, Search, ChevronRight, Clock, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CasoClinico } from '../types';

export default function ClinicalCases() {
  const [cases, setCases] = useState<CasoClinico[]>([]);

  useEffect(() => {
    async function fetchCases() {
      const { data, error } = await supabase.from('casos_clinicos').select('*');
      if (data) setCases(data);
    }
    fetchCases();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-headline font-bold text-on-surface">Casos Clínicos</h1>
          <p className="text-stone-500 mt-2">Explora y resuelve desafíos clínicos reales para tu formación.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por diagnóstico..." 
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-surface border border-stone-200 dark:border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 dark:bg-surface-container-low rounded-xl text-sm font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-200 transition-colors">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {cases.map((c) => (
          <Link 
            key={c.id} 
            to={`/casos/${c.id}`}
            className="group bg-white dark:bg-surface p-6 rounded-2xl ghost-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-6">
              <div className="p-4 bg-primary/5 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">{c.titulo}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-stone-100 dark:bg-surface-container-high text-stone-500 rounded-full uppercase tracking-widest">{c.categoria}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-stone-400">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {c.nivel}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.tiempo_estimado}</span>
                  <span className="font-bold uppercase tracking-widest text-[10px]">ID: #{c.id.substring(0, 4)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                  c.estatus === 'Completado' ? 'bg-green-100 text-green-700' :
                  c.estatus === 'En Proceso' ? 'bg-primary/10 text-primary' :
                  'bg-stone-100 text-stone-500'
                }`}>
                  {c.estatus}
                </span>
              </div>
              <ChevronRight className="text-stone-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
