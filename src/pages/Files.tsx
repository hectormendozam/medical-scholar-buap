import { FileText, Download, Eye, Search, Filter, FileCode, FileImage } from 'lucide-react';

const files = [
  { name: 'Guia_Practica_Clinica_ICC.pdf', type: 'PDF', size: '2.4 MB', date: '12 Abr, 2024', category: 'Guías' },
  { name: 'Protocolo_Urgencias_BUAP.pdf', type: 'PDF', size: '1.1 MB', date: '10 Abr, 2024', category: 'Protocolos' },
  { name: 'Atlas_Radiologia_Torax.zip', type: 'ZIP', size: '45.8 MB', date: '08 Abr, 2024', category: 'Recursos' },
  { name: 'Formulario_Medicamentos_V2.xlsx', type: 'XLSX', size: '450 KB', date: '05 Abr, 2024', category: 'Herramientas' },
  { name: 'Infografia_Cetoacidosis.png', type: 'IMG', size: '3.2 MB', date: '01 Abr, 2024', category: 'Material Visual' },
];

export default function Files() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-headline font-bold text-on-surface">Expedientes y Archivos</h1>
          <p className="text-stone-500 mt-2">Repositorio central de documentos, guías y recursos académicos.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar archivos..." 
              className="pl-10 pr-4 py-2.5 bg-white dark:bg-surface border border-stone-200 dark:border-outline-variant rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 dark:bg-surface-container-low rounded-xl text-sm font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-200 transition-colors">
            <Filter className="w-4 h-4" />
            Categoría
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-surface rounded-2xl overflow-hidden ghost-border shadow-sm">
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
            {files.map((file) => (
              <tr key={file.name} className="hover:bg-stone-50 dark:hover:bg-surface-container-high transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      file.type === 'PDF' ? 'bg-error-container text-error' :
                      file.type === 'ZIP' ? 'bg-primary/10 text-primary' :
                      file.type === 'IMG' ? 'bg-tertiary/10 text-tertiary' :
                      'bg-stone-100 text-stone-500'
                    }`}>
                      {file.type === 'IMG' ? <FileImage className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">{file.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-stone-500">{file.category}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-stone-400">{file.size}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-stone-400">{file.date}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-2 text-stone-400 hover:text-primary transition-colors" title="Vista Previa">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-stone-400 hover:text-primary transition-colors" title="Descargar">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
