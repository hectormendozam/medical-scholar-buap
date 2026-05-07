import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Gestion() {
  const navigate = useNavigate();
  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Gestión</h1>
          <p className="text-secondary mt-1">Área de gestión administrativa y creación de contenido.</p>
        </div>
        <div>
          <button onClick={() => navigate('/casos/nuevo')} className="px-4 py-2 bg-primary text-white rounded-lg">+ Nuevo Caso</button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border"> 
        <p className="text-sm text-secondary">Aquí aparecerán las herramientas de gestión (cursos, usuarios, asignaciones). Página placeholder.</p>
      </div>
    </div>
  );
}
