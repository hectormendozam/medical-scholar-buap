import { Database } from './database.types';

export type ArchivoApoyo = Database['public']['Tables']['archivos_apoyo']['Row'];
export type CasoClinico = Database['public']['Tables']['casos_clinicos']['Row'];
export type Evaluacion = Database['public']['Tables']['evaluaciones']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Resolucion = Database['public']['Tables']['resoluciones']['Row'];

// Mapped Frontend type for Cases list to align with existing mock data structure
export interface FrontendCasoList {
  id: string;
  title: string;          // Maps to 'titulo'
  category: string;       // Maps to 'categoria'
  level: string;          // Maps to 'nivel'
  status: string;         // Maps to 'estatus'
  time: string;           // Maps to 'tiempo_estimado'
}
