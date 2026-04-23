import React, { useState } from 'react';
import { 
  Stethoscope, 
  FileText, 
  Image as ImageIcon, 
  Plus, 
  X, 
  Save, 
  ArrowLeft,
  Info
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function NewCase() {
  const navigate = useNavigate();
  const [tags, setTags] = useState<string[]>(['Medicina Interna', 'Urgencias']);
  const [newTag, setNewTag] = useState('');
  
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState('Medicina Interna');
  const [nivel, setNivel] = useState('Básico (Estudiante)');
  const [sintomas, setSintomas] = useState('');
  const [antecedentes, setAntecedentes] = useState('');

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Using a dummy UUID for instructor_id since authentication isn't fully set up yet
    const dummyInstructorId = '00000000-0000-0000-0000-000000000000';
    
    const { error } = await supabase.from('casos_clinicos').insert({
      titulo,
      categoria,
      nivel,
      etiquetas: tags,
      sintomas,
      antecedentes,
      instructor_id: dummyInstructorId,
      estatus: 'Pendiente',
      tiempo_estimado: '45 min'
    } as any);

    if (!error) {
      navigate('/casos');
    } else {
      console.error('Error guardando caso:', error);
      alert('Error al guardar el caso clínico.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <Link to="/casos" className="flex items-center gap-2 text-stone-400 hover:text-primary transition-colors text-sm mb-2">
            <ArrowLeft className="w-4 h-4" />
            Volver a Casos
          </Link>
          <h1 className="text-4xl font-headline font-bold text-on-surface">Registrar Nuevo Caso</h1>
          <p className="text-stone-500 mt-2">Crea un nuevo desafío clínico para la comunidad académica.</p>
        </div>
      </header>

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Basic Information */}
        <section className="bg-surface p-8 rounded-2xl ghost-border shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
            <Info className="text-primary w-5 h-5" />
            <h2 className="text-xl font-headline font-bold">Información General</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Título del Caso</label>
              <input 
                type="text" 
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej: Insuficiencia Cardíaca Congestiva Agudizada"
                className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Especialidad Principal</label>
              <select 
                value={categoria} 
                onChange={e => setCategoria(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
              >
                <option>Medicina Interna</option>
                <option>Pediatría</option>
                <option>Ginecología y Obstetricia</option>
                <option>Cirugía General</option>
                <option>Urgencias</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Nivel de Dificultad</label>
              <select 
                value={nivel} 
                onChange={e => setNivel(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
              >
                <option>Básico (Estudiante)</option>
                <option>Intermedio (Internado)</option>
                <option>Avanzado (Residente)</option>
                <option>Especialista</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Etiquetas / Tags</label>
            <div className="flex flex-wrap gap-2 p-3 bg-surface-container-low rounded-xl min-h-[56px]">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-primary-container">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input 
                type="text" 
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Presiona Enter para añadir..."
                className="flex-1 bg-transparent border-none text-sm outline-none min-w-[150px]"
              />
            </div>
          </div>
        </section>

        {/* Clinical Content */}
        <section className="bg-surface p-8 rounded-2xl ghost-border shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
            <Stethoscope className="text-primary w-5 h-5" />
            <h2 className="text-xl font-headline font-bold">Contenido Clínico</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Resumen del Cuadro Clínico</label>
            <textarea 
              value={sintomas}
              onChange={e => setSintomas(e.target.value)}
              placeholder="Describa el motivo de consulta, síntomas y signos vitales iniciales..."
              className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all h-32"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Antecedentes de Importancia</label>
            <textarea 
              value={antecedentes}
              onChange={e => setAntecedentes(e.target.value)}
              placeholder="Antecedentes heredofamiliares, personales patológicos y no patológicos..."
              className="w-full bg-surface-container-low border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all h-24"
            />
          </div>
        </section>

        {/* Multimedia & Evidence */}
        <section className="bg-surface p-8 rounded-2xl ghost-border shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
            <ImageIcon className="text-primary w-5 h-5" />
            <h2 className="text-xl font-headline font-bold">Evidencias y Multimedia</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-outline-variant rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="p-4 bg-surface-container-low rounded-full group-hover:bg-primary/10 transition-colors">
                <Plus className="w-8 h-8 text-stone-400 group-hover:text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">Subir Imágenes Diagnósticas</p>
                <p className="text-xs text-stone-500 mt-1">RX, TAC, EKG, etc. (Máx 5MB)</p>
              </div>
            </div>

            <div className="border-2 border-dashed border-outline-variant rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="p-4 bg-surface-container-low rounded-full group-hover:bg-primary/10 transition-colors">
                <FileText className="w-8 h-8 text-stone-400 group-hover:text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">Adjuntar Laboratorios (PDF)</p>
                <p className="text-xs text-stone-500 mt-1">Resultados clínicos completos</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-4 pt-4">
          <button 
            type="button" 
            onClick={() => navigate('/casos')}
            className="px-8 py-4 rounded-xl font-bold text-sm text-stone-400 hover:bg-surface-container-low transition-all"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-12 py-4 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Publicar Caso Clínico
          </button>
        </div>
      </form>
    </div>
  );
}
