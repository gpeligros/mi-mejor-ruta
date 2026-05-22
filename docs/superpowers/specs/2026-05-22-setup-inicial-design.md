# Spec: Setup Inicial — Rutas de España

**Fecha:** 2026-05-22  
**Fase:** 1 — Web informativa (Paso 1: Setup)  
**Alcance:** Inicialización manual del proyecto Next.js 14 con TypeScript strict, Tailwind CSS, Prisma y estructura de carpetas completa.

---

## Contexto

Migración de 1.225 rutas desde WordPress (exportación XML con campos custom de Pods) a un stack moderno. Esta sesión cubre únicamente el setup inicial, sin migración de datos ni páginas de UI.

**Fuente de datos:** `rutasespaa.WordPress.2026-05-22.xml` (1.225 rutas, 4 modalidades, 50 provincias)  
**Sin imágenes disponibles:** la galería se implementa con modelo de datos pero sin URLs reales.  
**GPX:** se guarda la URL de Dropbox tal como está en el XML; migración a `/public/gpx/` en fase posterior.  
**Estado actual:** nada creado, setup desde cero en esta carpeta.

---

## Arquitectura

### Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js App Router | 14.x |
| Lenguaje | TypeScript | 5.x, strict mode |
| Estilos | Tailwind CSS | 3.x |
| Base de datos | Supabase (PostgreSQL) | — |
| ORM | Prisma | 5.x |
| Auth (fase 3) | Supabase Auth | — |
| Pagos (fase 4) | Stripe | — |
| Despliegue | Vercel | — |

### Enfoque de setup: manual (sin create-next-app)

Se crean todos los archivos de configuración a mano para tener control total sobre cada decisión. No se usa create-next-app ni t3-stack.

---

## Estructura de carpetas

```
RutasEspaña/
├── app/
│   ├── (public)/
│   │   ├── rutas/
│   │   ├── provincia/
│   │   └── modalidad/
│   ├── (auth)/
│   ├── api/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   ├── mapa/
│   └── rutas/
├── lib/
│   ├── supabase.ts
│   ├── prisma.ts
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── types/
│   └── ruta.ts
├── public/
│   └── gpx/
├── docs/
│   └── superpowers/specs/
├── .env.local.example
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── package.json
```

---

## Archivos de configuración

### `package.json`

Dependencias de producción:
- `next@14`, `react@18`, `react-dom@18`
- `@prisma/client`
- `@supabase/supabase-js`, `@supabase/ssr` (requerido para App Router)
- `clsx`, `tailwind-merge` (para `lib/utils.ts` → función `cn()`)
- `leaflet` (preparación fase 1; se importa solo en cliente con `dynamic` + `ssr: false`)

Dependencias de desarrollo:
- `typescript`, `@types/react`, `@types/node`, `@types/react-dom`
- `prisma`
- `tailwindcss@3`, `autoprefixer`, `postcss`
- `@types/leaflet`

### `tsconfig.json`

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `moduleResolution: "bundler"`
- Path alias `@/*` → `./*`

### `tailwind.config.ts`

- Content: `./app/**/*.{ts,tsx}`, `./components/**/*.{ts,tsx}`
- Sin tema custom por ahora (se añade cuando se tengan las capturas del diseño original)

### `next.config.ts`

- `images.remotePatterns`: Supabase Storage y Dropbox (para GPX links)
- Sin configuración adicional compleja

---

## Prisma Schema

### Enums

```prisma
enum Modalidad {
  senderismo
  bici
  moto
  cuatro_por_cuatro @map("4x4")
}

enum Dificultad {
  facil
  moderada
  dificil
  muy_dificil
}
```

### Modelo `Ruta`

Campos comunes a todas las modalidades + campos específicos por modalidad como columnas nullable en la misma tabla (estrategia tabla única, más simple que herencia de tablas para este volumen de datos).

Campos incluidos (ver CLAUDE.md para lista completa):
- Identificación: `id`, `slug`, `titulo`, `descripcion`, `modalidad`, `dificultad`, `provincia`
- Métricas: `distancia`, `duracion`, `duracion_horas`, `duracion_minutos`, `desnivel_positivo/negativo`, `altitud_maxima/minima`, `tipo_recorrido`
- Localización: `punto_inicio`, `coordenadas_parking`, `como_llegar`, `transporte_publico`
- Logística: `mejor_epoca`, `mejor_momento_dia`, `equipamiento`, `puntos_agua`, `servicios_cercanos`, `alojamiento_cercano`, `zonas_camping`
- Archivos: `archivo_gpx`
- Valoración: `valoracion`, `total_valoraciones`
- Meta: `publicada`, `createdAt`, `updatedAt`
- Campos senderismo: `ecosistema`, `flora`, `fauna`, `nivel_experiencia`, `forma_fisica`, `puntos_de_avituallamiento`, `avisos_seguridad`, `restricciones_permisos`, `epoca_nieve`
- Campos bici: `tipo_bici`, `nivel_tecnico_bici`, `tipo_terreno_bici`, `talleres_bici`
- Campos moto: `tipo_de_carretera`, `estado_asfalto`, `puertos_montana`, `peajes`, `gasolineras_ruta`, `puntos_moteros`, `zonas_descanso_moto`
- Campos 4x4: `tipo_terreno_4x4`, `traccion_necesaria`, `estado_firme`, `vado_rios`, `dificultad_tecnica`, `parking_coste`, `parking_descripcion`, `puntos_repostaje_4x4`

Índices: `@@index([provincia])`, `@@index([modalidad])`, `@@index([dificultad])`

### Modelos relacionados

- `ImagenRuta`: `id`, `rutaId`, `url` (nullable), `orden`, `alt`
- `PuntoInteres`: `id`, `rutaId`, `nombre`, `descripcion`, `coordenadas`
- `Valoracion`: `id`, `rutaId`, `puntuacion`, `comentario`, `createdAt`

---

## Archivos de librería

### `lib/prisma.ts`
Singleton del cliente Prisma (patrón estándar para Next.js, evita múltiples conexiones en desarrollo).

### `lib/supabase.ts`
Cliente Supabase con las dos variantes: cliente de navegador (anon key) y cliente de servidor (service role).

### `lib/utils.ts`
Funciones auxiliares básicas: `cn()` para combinar clases Tailwind con `clsx` + `tailwind-merge`.

---

## Tipos TypeScript

### `types/ruta.ts`
Tipos derivados del schema de Prisma + tipos de dominio específicos del negocio:
- `RutaBase`, `CamposSenderismo`, `CamposBici`, `CamposMoto`, `Campos4x4`
- Tipo unión `RutaCompleta`

---

## Variables de entorno

Solo se crea `.env.local.example`. El usuario añade las credenciales reales cuando configure Supabase.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=https://tudominio.es
```

---

## Fuera de alcance (esta sesión)

- Migración de datos del XML a Supabase
- Páginas de UI (listado, detalle, provincia, modalidad)
- Auth, Stripe, mapas Leaflet
- Diseño visual (pendiente de capturas del WordPress original)
- `prisma db push` / `prisma migrate` (requiere Supabase configurado)

---

## Decisiones y justificaciones

| Decisión | Motivo |
|---|---|
| Tailwind v3 (no v4) | Más estable con Next.js 14; v4 tiene cambios breaking en config |
| Tabla única para todos los campos de modalidad | 1.225 rutas es un volumen manejable; evita JOINs innecesarios en consultas frecuentes |
| Sin `db push` en este setup | El usuario aún no tiene Supabase configurado |
| `noUncheckedIndexedAccess: true` | Refuerza TypeScript strict para accesos a arrays |
| Path alias `@/*` | Consistente con la convención de Next.js, evita imports relativos profundos |
