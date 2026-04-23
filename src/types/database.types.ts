export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      archivos_apoyo: {
        Row: {
          id: string
          caso_id: string
          nombre: string
          url_archivo: string
          tipo: string | null
          categoria: string | null
          tamano: string | null
          created_at: string
        }
        Insert: {
          id?: string
          caso_id: string
          nombre: string
          url_archivo: string
          tipo?: string | null
          categoria?: string | null
          tamano?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          caso_id?: string
          nombre?: string
          url_archivo?: string
          tipo?: string | null
          categoria?: string | null
          tamano?: string | null
          created_at?: string
        }
      }
      casos_clinicos: {
        Row: {
          id: string
          instructor_id: string
          titulo: string
          descripcion_inicial: string | null
          antecedentes: string | null
          sintomas: string | null
          nombre_paciente: string | null
          nivel: string | null
          tiempo_estimado: string | null
          categoria: string | null
          etiquetas: string[] | null
          consejo_mentor: string | null
          estatus: string | null
          created_at: string
        }
        Insert: {
          id?: string
          instructor_id: string
          titulo: string
          descripcion_inicial?: string | null
          antecedentes?: string | null
          sintomas?: string | null
          nombre_paciente?: string | null
          nivel?: string | null
          tiempo_estimado?: string | null
          categoria?: string | null
          etiquetas?: string[] | null
          consejo_mentor?: string | null
          estatus?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          instructor_id?: string
          titulo?: string
          descripcion_inicial?: string | null
          antecedentes?: string | null
          sintomas?: string | null
          nombre_paciente?: string | null
          nivel?: string | null
          tiempo_estimado?: string | null
          categoria?: string | null
          etiquetas?: string[] | null
          consejo_mentor?: string | null
          estatus?: string | null
          created_at?: string
        }
      }
      evaluaciones: {
        Row: {
          id: string
          resolucion_id: string
          instructor_id: string
          calificacion: number | null
          retroalimentacion: string | null
          rubrica_detalle: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          resolucion_id: string
          instructor_id: string
          calificacion?: number | null
          retroalimentacion?: string | null
          rubrica_detalle?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          resolucion_id?: string
          instructor_id?: string
          calificacion?: number | null
          retroalimentacion?: string | null
          rubrica_detalle?: Json | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
      resoluciones: {
        Row: {
          id: string
          estudiante_id: string
          caso_id: string
          diagnostico: string | null
          plan_terapeutico: string | null
          justificacion: string | null
          estatus: string | null
          fecha_entrega: string
        }
        Insert: {
          id?: string
          estudiante_id: string
          caso_id: string
          diagnostico?: string | null
          plan_terapeutico?: string | null
          justificacion?: string | null
          estatus?: string | null
          fecha_entrega?: string
        }
        Update: {
          id?: string
          estudiante_id?: string
          caso_id?: string
          diagnostico?: string | null
          plan_terapeutico?: string | null
          justificacion?: string | null
          estatus?: string | null
          fecha_entrega?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
