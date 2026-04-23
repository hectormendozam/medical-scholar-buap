# BUAP Medical Scholar — Plataforma de Gestión de Casos Clínicos

> **Proyecto académico** desarrollado para la Facultad de Medicina de la Benemérita Universidad Autónoma de Puebla (BUAP) en el contexto del curso *Desarrollo Basado en Modelos*.

---

## Índice

1. [Descripción del Proyecto](#-descripción-del-proyecto)
2. [Problemática que Resuelve](#-problemática-que-resuelve)
3. [Arquitectura General](#-arquitectura-general)
4. [Modelo de Base de Datos](#-modelo-de-base-de-datos)
5. [Módulos del Sistema](#-módulos-del-sistema)
6. [Tecnologías Utilizadas](#-tecnologías-utilizadas)
7. [Estructura del Proyecto](#-estructura-del-proyecto)
8. [Instalación y Configuración](#-instalación-y-configuración)
9. [Variables de Entorno](#-variables-de-entorno)
10. [Roles de Usuario](#-roles-de-usuario)
11. [Flujo de Uso](#-flujo-de-uso)
12. [Guía de Contribución](#-guía-de-contribución)

---

## 📋 Descripción del Proyecto

**BUAP Medical Scholar** es una plataforma web de gestión académica para estudiantes de medicina e instructores clínicos de la BUAP. Permite a los instructores publicar casos clínicos reales de pacientes (con datos anonimizados), adjuntar archivos de apoyo (laboratorios, radiografías, EKG, etc.), y a los estudiantes resolver esos casos escribiendo su diagnóstico diferencial, plan terapéutico y justificación clínica.

Los instructores pueden después evaluar cada resolución con una calificación numérica y retroalimentación textual, creando un ciclo completo de aprendizaje basado en casos clínicos reales.

---

## 🎯 Problemática que Resuelve

El modelo de enseñanza médica tradicional en México enfrenta los siguientes retos:

- **Falta de exposición clínica sistemática**: Los estudiantes de pregrado y los residentes solo ven los casos que llegan durante su turno, lo que limita la diversidad de patologías a las que están expuestos.
- **Retroalimentación tardía o ausente**: El feedback de los instructores sobre el razonamiento clínico del estudiante suele ser verbal, informal y no queda documentado.
- **Dispersión del material de apoyo**: Las guías de práctica clínica, laboratorios y estudios de imagen se comparten por WhatsApp, correo o en papel, lo que dificulta su consulta posterior.
- **Sin trazabilidad del progreso**: No existe un registro formal del desempeño del estudiante a lo largo de su rotación.

**BUAP Medical Scholar** resuelve estos problemas proveyendo un entorno digital centralizado donde:
- Los instructores *crean y publican* casos clínicos con toda la evidencia diagnóstica adjunta.
- Los estudiantes *resuelven* los casos con su propio razonamiento clínico.
- Los instructores *califican* y *retroalimentan* cada resolución de manera documentada.
- Todos los actores pueden *consultar* el historial y el progreso en cualquier momento.

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                   BUAP Medical Scholar                       │
│                                                             │
│  ┌──────────────┐        ┌───────────────────────────────┐  │
│  │   Frontend   │ ◄────► │         Supabase BaaS         │  │
│  │  React + TS  │        │                               │  │
│  │  Vite + TW   │        │  ┌─────────────────────────┐  │  │
│  └──────────────┘        │  │   PostgreSQL Database    │  │  │
│                           │  │  - casos_clinicos        │  │  │
│  ┌──────────────┐        │  │  - resoluciones           │  │  │
│  │  Supabase    │        │  │  - evaluaciones           │  │  │
│  │   Auth       │        │  │  - archivos_apoyo         │  │  │
│  │  (JWT)       │        │  │  - profiles               │  │  │
│  └──────────────┘        │  └─────────────────────────┘  │  │
│                           │                               │  │
│                           │  ┌─────────────────────────┐  │  │
│                           │  │    Storage (Archivos)    │  │  │
│                           │  │  PDFs, Imágenes, ZIPs    │  │  │
│                           │  └─────────────────────────┘  │  │
│                           └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

El frontend se comunica directamente con Supabase mediante el SDK oficial `@supabase/supabase-js`. No hay un servidor backend propio; Supabase provee autenticación, base de datos PostgreSQL con Row Level Security (RLS), y almacenamiento de archivos.

---

## 🗃️ Modelo de Base de Datos

### Diagrama Entidad-Relación (simplificado)

```
profiles ──────────────────────────────────────────────────────────────
  │ id (PK)                                                             │
  │ email                                                               │
  │ full_name                                                           │
  │ role ('estudiante' | 'instructor')                                  │
  │ avatar_url                                                          │
  └── created_at                                                        │
        │                                                               │
        │ instructor_id                                                 │
        ▼                                                               │
casos_clinicos ─────────────────────────────────────────────────────── │
  │ id (PK)                                                             │
  │ titulo                                                              │
  │ descripcion_inicial                                                 │
  │ antecedentes                                                        │
  │ sintomas                                                            │
  │ nombre_paciente                                                     │
  │ nivel ('Básico' | 'Intermedio' | 'Avanzado')                       │
  │ tiempo_estimado                                                     │
  │ categoria                                                           │
  │ etiquetas (text[])                                                  │
  │ consejo_mentor                                                      │
  │ estatus ('Pendiente' | 'En Proceso' | 'Completado')                │
  └── created_at                                                        │
        │                                                               │
        │ caso_id              caso_id                                  │
        ▼                        ▼                                      │
archivos_apoyo            resoluciones ──────────────────────          │
  id (PK)                   id (PK)                          │          │
  nombre                    estudiante_id ────────────────► profiles   │
  url_archivo               diagnostico                      │
  tipo (MIME)               plan_terapeutico                 │
  categoria                 justificacion                    │ resolucion_id
  tamano                    estatus                          ▼
  created_at                fecha_entrega               evaluaciones
                                                          id (PK)
                                                          instructor_id
                                                          calificacion
                                                          retroalimentacion
                                                          rubrica_detalle (jsonb)
                                                          created_at
```

### Descripción de Tablas

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Extiende la tabla `auth.users` de Supabase. Almacena el nombre, rol y foto de perfil de cada usuario. |
| `casos_clinicos` | El núcleo del sistema. Cada registro representa un caso clínico publicado por un instructor, con toda la información del paciente (anonimizada) y el contexto clínico. |
| `archivos_apoyo` | Archivos multimedia asociados a un caso: imágenes diagnósticas, PDFs de laboratorio, EKGs, etc. Cada archivo tiene una URL pública en Supabase Storage. |
| `resoluciones` | La respuesta de un estudiante a un caso clínico. Contiene el diagnóstico diferencial, plan terapéutico y justificación clínica escritos por el estudiante. |
| `evaluaciones` | La calificación y retroalimentación que un instructor da a una resolución específica. Incluye un campo `rubrica_detalle` en formato JSON para criterios de evaluación detallados. |

---

## 🧩 Módulos del Sistema

### 1. Dashboard (`/dashboard`)
Panel principal del usuario. Muestra:
- **Casos asignados**: los casos clínicos que el estudiante debe resolver (conectados a `casos_clinicos`).
- **Progreso semanal**: porcentaje de casos completados vs. pendientes.
- **Notificaciones rápidas**: resumen de los últimos eventos relevantes.
- **Acceso rápido** a continuar un caso en progreso.

### 2. Casos Clínicos (`/casos`)
Listado de todos los casos clínicos disponibles en el sistema. Permite:
- **Buscar** casos por diagnóstico o título.
- **Filtrar** por nivel de dificultad, categoría o estatus.
- **Ver el estatus** de cada caso (Pendiente, En Proceso, Completado).
- **Navegar** al detalle de cualquier caso.

Datos: conectado a la tabla `casos_clinicos`.

### 3. Detalle de Caso (`/casos/:id`)
Vista completa de un caso clínico específico. Contiene:
- **Resumen clínico**: nombre del paciente, motivo de consulta, síntomas y antecedentes, todos tomados directamente de la base de datos.
- **Archivos de evidencia**: radiografías, laboratorios y otros archivos adjuntos (tabla `archivos_apoyo`).
- **Panel de decisión**: formulario donde el estudiante escribe su diagnóstico diferencial, plan terapéutico y justificación. Al enviar, se crea un registro en `resoluciones`.
- **Consejo del mentor**: el campo `consejo_mentor` del caso, visible para orientar al estudiante.

### 4. Nuevo Caso (`/casos/nuevo`)
Formulario exclusivo para instructores. Permite crear un nuevo caso clínico con:
- Título, categoría, nivel de dificultad y etiquetas.
- Descripción clínica: síntomas y antecedentes (cada línea del campo antecedentes se renderiza como un bullet en el detalle del caso).
- Al guardar, se inserta un registro en `casos_clinicos`.

### 5. Expedientes / Archivos (`/expedientes`)
Repositorio de todos los archivos de apoyo registrados en el sistema (tabla `archivos_apoyo`). Permite:
- **Buscar** por nombre o categoría.
- **Previsualizar** archivos en una nueva pestaña (enlace directo a la URL de Supabase Storage).
- **Descargar** archivos.
- Muestra estado de carga y estado vacío si no hay registros.

### 6. Revisiones (`/revisiones`)
Panel para instructores. Muestra:
- Estadísticas de entregas: total, pendientes, calificadas, tasa de aprobación.
- Tabla de resoluciones con el estatus de cada estudiante.
- Panel lateral para ingresar calificación y retroalimentación textual.
- La calificación se guarda en la tabla `evaluaciones`.

### 7. Notificaciones (`/notificaciones`)
Centro de notificaciones del usuario. Permite:
- Ver todas las notificaciones con su tipo (info, alerta, éxito, recordatorio).
- Marcar notificaciones como leídas individualmente o todas a la vez.
- Ver el contador de notificaciones sin leer.

> **Nota**: actualmente las notificaciones son locales (estado React). La integración completa con Supabase Realtime para notificaciones en tiempo real es una mejora prevista.

### 8. Configuración / Perfil (`/configuracion`)
Perfil del usuario con:
- Información personal (nombre, correo, especialidad).
- Estadísticas académicas (casos resueltos, promedio general).
- Logros y reconocimientos.
- Actividad reciente con calificaciones.
- Botón de cerrar sesión.

---

## 🛠️ Tecnologías Utilizadas

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | ^19.0.0 | Framework de interfaz de usuario |
| **TypeScript** | ~5.8.2 | Tipado estático |
| **Vite** | ^6.2.0 | Empaquetador y servidor de desarrollo |
| **Tailwind CSS** | ^4.1.14 | Estilos utilitarios |
| **React Router DOM** | ^7.14.2 | Enrutamiento del lado del cliente |
| **Supabase JS** | ^2.x | Cliente para PostgreSQL + Auth + Storage |
| **Lucide React** | ^0.546.0 | Iconografía |
| **Motion** | ^12.23.24 | Animaciones |

---

## 📁 Estructura del Proyecto

```
buap-medical-scholar/
├── src/
│   ├── App.tsx                    # Definición de rutas de la aplicación
│   ├── main.tsx                   # Punto de entrada de React
│   ├── index.css                  # Estilos globales y design tokens
│   ├── vite-env.d.ts              # Tipos de variables de entorno Vite
│   │
│   ├── components/
│   │   ├── Sidebar.tsx            # Barra lateral de navegación
│   │   └── layout/
│   │       └── Layout.tsx         # Layout base con sidebar + outlet
│   │
│   ├── lib/
│   │   ├── supabase.ts            # Inicialización del cliente de Supabase
│   │   └── utils.ts               # Utilidades (clsx + tailwind-merge)
│   │
│   ├── types/
│   │   ├── database.types.ts      # Tipos TypeScript del esquema de Supabase
│   │   └── index.ts               # Re-exports de tipos de dominio
│   │
│   ├── context/
│   │   └── ThemeContext.tsx       # Contexto de modo oscuro/claro
│   │
│   └── pages/
│       ├── Login.tsx              # Página de inicio de sesión
│       ├── Dashboard.tsx          # Panel principal del estudiante
│       ├── ClinicalCases.tsx      # Listado de casos clínicos
│       ├── CaseDetail.tsx         # Detalle y resolución de un caso
│       ├── NewCase.tsx            # Formulario para crear un nuevo caso
│       ├── Files.tsx              # Repositorio de archivos de apoyo
│       ├── ReviewPanel.tsx        # Panel de revisión para instructores
│       ├── CaseReview.tsx         # Vista alternativa de revisión
│       ├── Notificaciones.tsx     # Centro de notificaciones
│       └── Profile.tsx            # Perfil y configuración del usuario
│
├── .env                           # Variables de entorno (NO commitear)
├── .env.example                   # Plantilla de variables de entorno
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## ⚙️ Instalación y Configuración

### Prerrequisitos
- **Node.js** v18+ y **npm** v9+
- Una cuenta y proyecto activo en [Supabase](https://supabase.com)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/buap-medical-scholar.git
cd buap-medical-scholar

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase (ver sección siguiente)

# 4. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

---

## 🔑 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
VITE_SUPABASE_URL=https://tu-proyecto-id.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

Puedes encontrar estos valores en tu proyecto de Supabase bajo:  
**Settings → API → Project URL** y **Project API Keys → `anon public`**.

> ⚠️ **Importante**: Nunca publiques tu clave de servicio (`service_role`) en el frontend. Solo usa la clave `anon`.

---

## 👥 Roles de Usuario

El sistema maneja dos roles definidos en la columna `role` de la tabla `profiles`:

| Rol | Permisos |
|-----|----------|
| `estudiante` | Ver casos clínicos, enviar resoluciones, ver sus propias calificaciones, consultar expedientes. |
| `instructor` | Todo lo anterior + crear nuevos casos clínicos, ver todas las resoluciones, calificar y retroalimentar. |

> **Estado actual**: El control de acceso basado en roles está pendiente de implementación completa con Supabase RLS. Actualmente la aplicación usa un flujo de autenticación simplificado que redirige al dashboard tras el login.

---

## 🔄 Flujo de Uso

```
 INSTRUCTOR                              ESTUDIANTE
     │                                       │
     ▼                                       │
 Crea caso clínico                           │
 /casos/nuevo                                │
     │                                       │
     ▼                                       ▼
 Adjunta archivos            Consulta el listado de casos
 (archivos_apoyo)            /casos
     │                                       │
     │                                       ▼
     │                             Selecciona un caso
     │                             /casos/:id
     │                                       │
     │                                       ▼
     │                          Llena el formulario de
     │                          decisión clínica y envía
     │                          → INSERT en resoluciones
     │                                       │
     ▼                                       │
 Revisa resoluciones                         │
 /revisiones                                 │
     │                                       │
     ▼                                       │
 Califica y escribe                          │
 retroalimentación                           │
 → INSERT en evaluaciones                    │
     │                                       │
     │                                       ▼
     │                          Estudiante ve su calificación
     └───────────────────────── en el perfil y notificaciones
```

---

## 🤝 Guía de Contribución

1. Haz un fork del repositorio.
2. Crea una rama: `git checkout -b feature/nombre-de-la-feature`.
3. Realiza tus cambios y asegúrate de que `npm run lint` no reporte errores.
4. Haz commit con mensajes descriptivos: `git commit -m "feat: agregar filtro por nivel en lista de casos"`.
5. Abre un Pull Request describiendo el cambio y su propósito.

### Convenciones de código
- Nombres de variables y props de componentes: **camelCase en inglés** para variables técnicas, **español** para las que mapean directamente a la base de datos (e.g., `caso.titulo`).
- Componentes de página: exportaciones default. Componentes compartidos: exportaciones nombradas.
- Siempre usar las tipificaciones de `src/types/database.types.ts` al interactuar con Supabase.

---

*Proyecto desarrollado como parte del programa académico de la Facultad de Medicina BUAP — Primavera 2026.*
