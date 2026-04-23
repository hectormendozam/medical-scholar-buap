import React, { useEffect, useState } from 'react';
import { FileText, Download, Eye, Search, Filter, FileImage, FileCode, Loader2, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ArchivoApoyo } from '../types';

export default function Files() {
  const [archivos, setArchivos] = useState<ArchivoApoyo[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function fetchArchivos() {
      setCargando(true);
      const { data } = await supabase
        .from('archivos_apoyo')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setArchivos(data);
      setCargando(false);
    }
    fetchArchivos();
  }, []);

  const archivosFiltrados = archivos.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (a.categoria ?? '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const iconoPorTipo = (tipo: string | null) => {
    if (!tipo) return <FileText className="w-5 h-5" />;
    if (tipo.includes('image')) return <FileImage className="w-5 h-5" />;
    if (tipo.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <FileCode className="w-5 h-5" />;
  };

  const clasePorTipo = (tipo: string | null) => {
    if (!tipo) return 'bg-stone-100 text-stone-500';
    if (tipo.includes('image')) return 'bg-tertiary/10 text-tertiary';
    if (tipo.includes('pdf')) return 'bg-red-50 text-red-600';
    return 'bg-primary/10 text-primary';
  };

  const formatFecha = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-headline font-bold text-on-surface">Expedientes y Archivos</h1>
          <p className="text-stone-500 mt-2">Repositorio central de archivos de apoyo a los casos clínicos.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar archivos..."
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-surface border border-stone-200 dark:border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
        </div>
      </header>

      <div className="bg-white dark:bg-surface rounded-2xl overflow-hidden ghost-border shadow-sm">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-24 text-stone-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm font-medium">Cargando archivos...</p>
          </div>
        ) : archivosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-stone-400">
            <Upload className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-semibold">No hay archivos disponibles</p>
            <p className="text-sm mt-1">Los archivos se añaden desde el detalle de un caso clínico.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-stone-50 dark:bg-surface-container-low">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase font-label tracking-widest">Nombre del Archivo</th>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase font-label tracking-widest">Categoría</th>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase font-label tracking-widest">Tamaño</th>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase font-label tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase font-label tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-outline-variant">
              {archivosFiltrados.map((archivo) => (
                <tr key={archivo.id} className="hover:bg-stone-50 dark:hover:bg-surface-container-high transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${clasePorTipo(archivo.tipo)}`}>
                        {iconoPorTipo(archivo.tipo)}
                      </div>
                      <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                        {archivo.nombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-stone-500">{archivo.categoria || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-stone-400">{archivo.tamano || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-stone-400">{formatFecha(archivo.created_at)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        href={archivo.url_archivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-stone-400 hover:text-primary transition-colors"
                        title="Vista Previa"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <a
                        href={archivo.url_archivo}
                        download={archivo.nombre}
                        className="p-2 text-stone-400 hover:text-primary transition-colors"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
