# Conectar la app a Supabase

Este archivo resume cómo conectar este proyecto a la base de datos que ya creaste en Supabase (según `bd_superbase`). Incluye mapping, variables de entorno y pasos para verificar la integración.

1) Variables de entorno

En la raíz del proyecto crea un archivo `.env` con:

```
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-public-key>
# Para operaciones administrativas (migrations/seeds) puedes usar SERVICE_ROLE (no lo pongas en el frontend)
```

2) Mapping clave de tablas

Este frontend fue escrito originalmente para tablas en español (`casos_clinicos`, `archivos_apoyo`, `resoluciones`, `evaluaciones`, `profiles`). Tu SQL usa tablas en inglés (`clinical_cases`, `case_files`, `case_resolutions`, `evaluations`, `profiles`) y además configura `profiles.id` para referenciar `auth.users(id)`.

Para que la app funcione sin reescribir la base de datos, el frontend ahora intenta primero las tablas en español y si no existen hace fallback a las tablas en inglés y normaliza los campos. Los mapeos principales son:

- `casos_clinicos` ↔ `clinical_cases`
  - `titulo` ↔ `title`
  - `descripcion_inicial` ↔ `description` / `initial_information`
  - `antecedentes` ↔ `clinical_history`
  - `sintomas` ↔ `symptoms`
  - `estatus` ↔ `status`
  - `created_at` ↔ `published_at`

- `resoluciones` ↔ `case_resolutions`
  - `estudiante_id` ↔ `resolved_by` (note: semantics differ; we store resolution author)
  - `caso_id` ↔ `case_id`
  - combined `resolution` and `conclusion` fields used for display

- `archivos_apoyo` ↔ `case_files`

3) Storage Buckets

Tu script ya crea dos buckets en `storage.buckets`: `case-files` y `message-attachments`. Asegúrate en el panel de Supabase > Storage que existen y su política de privacidad (public/private) según tus necesidades.

4) RLS y Auth

Tu SQL activó RLS y políticas específicas. Para desarrollo local puedes usar la ANON key pero muchas operaciones de escritura requieren un usuario autenticado con permisos (role in profiles). Si pruebas endpoints con `curl`, agrega el header `Authorization: Bearer <anon_or_service_key>` y `apikey: <anon_or_service_key>`.

5) Verificación rápida

Con la app corriendo (`npm run dev`) y `.env` configurado:

- Abre http://localhost:3000 y ve a Dashboard/Casos. Si ves datos, la integración está OK.
- Si la página aparece en blanco: revisa DevTools → Console y Network. Pega errores aquí y te ayudo.

6) Siguientes pasos recomendados

- Revisa que los triggers que crean `profiles` al registrarse funcionen (revisa `auth.users` cuando crees un usuario).
- Si quieres que `profiles.id` no dependa de `auth.users` o prefieres otra estructura, dime y lo adaptamos.

---

Si quieres que cree automáticamente alguna fila de ejemplo en las tablas en inglés (seed), lo hago ahora y te muestro cómo verificar con queries.
