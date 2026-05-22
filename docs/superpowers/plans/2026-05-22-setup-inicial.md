# Setup Inicial — Rutas de España

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inicializar el proyecto Next.js 14 de Rutas de España con TypeScript strict, Tailwind CSS v3, Prisma ORM y la estructura de carpetas completa definida en CLAUDE.md, listo para recibir la migración de datos y las páginas de UI.

**Architecture:** Setup manual (sin create-next-app). Todos los archivos de configuración se crean explícitamente. Prisma se configura con el schema completo pero sin `db push` (DATABASE_URL pendiente de que el usuario configure Supabase). La app arranca en modo desarrollo con una página de placeholder.

**Tech Stack:** Next.js 14.2.x, TypeScript 5.x (strict + noUncheckedIndexedAccess), Tailwind CSS 3.x, Prisma 5.x, @supabase/supabase-js + @supabase/ssr, clsx + tailwind-merge, Leaflet 1.9.x

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `package.json` | Crear | Dependencias y scripts del proyecto |
| `tsconfig.json` | Crear | TypeScript strict con path aliases |
| `next.config.mjs` | Crear | Config Next.js (imágenes remotas) |
| `tailwind.config.ts` | Crear | Config Tailwind CSS v3 |
| `postcss.config.js` | Crear | PostCSS con Tailwind y Autoprefixer |
| `.gitignore` | Crear | Excluir node_modules, .env.local, .next |
| `.env.local.example` | Crear | Template de variables de entorno |
| `prisma/schema.prisma` | Crear | Schema completo: Ruta, ImagenRuta, PuntoInteres, Valoracion |
| `lib/utils.ts` | Crear | Función `cn()` con clsx + tailwind-merge |
| `lib/prisma.ts` | Crear | Singleton del cliente Prisma |
| `lib/supabase.ts` | Crear | Clientes Supabase (browser + server) |
| `types/ruta.ts` | Crear | Tipos de dominio TypeScript |
| `app/globals.css` | Crear | Directivas Tailwind |
| `app/layout.tsx` | Crear | Layout raíz de la app |
| `app/page.tsx` | Crear | Página home (placeholder) |
| `public/gpx/.gitkeep` | Crear | Reservar carpeta para archivos GPX |
| `components/ui/.gitkeep` | Crear | Reservar carpeta de componentes UI |
| `components/mapa/.gitkeep` | Crear | Reservar carpeta de componentes mapa |
| `components/rutas/.gitkeep` | Crear | Reservar carpeta de componentes rutas |

> Nota: `next-env.d.ts` se genera automáticamente al ejecutar `next dev`. No crearlo a mano.

---

## Task 1: package.json

**Files:**
- Crear: `package.json`

- [ ] **Paso 1: Crear package.json con todas las dependencias**

Crear el archivo `package.json` en la raíz del proyecto con este contenido exacto:

```json
{
  "name": "rutas-espana",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.47.0",
    "clsx": "^2.1.1",
    "leaflet": "^1.9.4",
    "next": "14.2.29",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.14",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "prisma": "^5.22.0",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Paso 2: Verificar que el archivo existe y es JSON válido**

```powershell
Get-Content package.json | ConvertFrom-Json | Select-Object name, version
```

Resultado esperado:
```
name          version
----          -------
rutas-espana  0.1.0
```

---

## Task 2: tsconfig.json

**Files:**
- Crear: `tsconfig.json`

- [ ] **Paso 1: Crear tsconfig.json con modo strict**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Task 3: next.config.mjs

**Files:**
- Crear: `next.config.mjs`

> Nota: Next.js 14 no soporta `.ts` para la config. Se usa `.mjs` (ESM).

- [ ] **Paso 1: Crear next.config.mjs**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'www.dropbox.com',
      },
    ],
  },
}

export default nextConfig
```

---

## Task 4: Tailwind CSS y PostCSS

**Files:**
- Crear: `tailwind.config.ts`
- Crear: `postcss.config.js`

- [ ] **Paso 1: Crear tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

- [ ] **Paso 2: Crear postcss.config.js**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

## Task 5: .gitignore y .env.local.example

**Files:**
- Crear: `.gitignore`
- Crear: `.env.local.example`

- [ ] **Paso 1: Crear .gitignore**

```
# dependencias
/node_modules
/.pnp
.pnp.js

# next.js
/.next/
/out/

# producción
/build

# entorno (nunca subir credenciales reales)
.env
.env.local
.env*.local

# vercel
.vercel

# typescript (se genera automáticamente)
*.tsbuildinfo
next-env.d.ts

# sistema
.DS_Store
*.pem
Thumbs.db

# IDE
.vscode/
.idea/

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

- [ ] **Paso 2: Crear .env.local.example**

```bash
# Supabase — obtener en https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Prisma — Connection string de Supabase (modo Transaction Pooler, puerto 6543)
DATABASE_URL=postgresql://postgres.tu-proyecto:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres

# Stripe — obtener en https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=https://tudominio.es
```

---

## Task 6: Estructura de carpetas y archivos placeholder

**Files:**
- Crear: `public/gpx/.gitkeep`
- Crear: `components/ui/.gitkeep`
- Crear: `components/mapa/.gitkeep`
- Crear: `components/rutas/.gitkeep`
- Crear: `app/(public)/rutas/.gitkeep`
- Crear: `app/(public)/provincia/.gitkeep`
- Crear: `app/(public)/modalidad/.gitkeep`
- Crear: `app/(auth)/.gitkeep`
- Crear: `app/api/.gitkeep`

- [ ] **Paso 1: Crear carpetas con archivos .gitkeep vacíos**

Crear cada archivo `.gitkeep` vacío en las rutas indicadas. Esto preserva la estructura de carpetas en git aunque estén vacías.

Los archivos `.gitkeep` son archivos vacíos (0 bytes). Se crean así en PowerShell:

```powershell
$paths = @(
  "public/gpx/.gitkeep",
  "components/ui/.gitkeep",
  "components/mapa/.gitkeep",
  "components/rutas/.gitkeep",
  "app/(public)/rutas/.gitkeep",
  "app/(public)/provincia/.gitkeep",
  "app/(public)/modalidad/.gitkeep",
  "app/(auth)/.gitkeep",
  "app/api/.gitkeep"
)
foreach ($path in $paths) {
  $dir = Split-Path $path -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  New-Item -ItemType File -Path $path -Force | Out-Null
}
Write-Output "Carpetas creadas"
```

- [ ] **Paso 2: Verificar estructura**

```powershell
Get-ChildItem -Recurse -Filter ".gitkeep" | Select-Object FullName
```

Resultado esperado: 9 archivos `.gitkeep` listados.

---

## Task 7: Instalar dependencias

**Files:** ninguno nuevo (popula `node_modules/`)

- [ ] **Paso 1: Instalar dependencias con npm**

```powershell
npm install
```

Resultado esperado: `added N packages` sin errores. La carpeta `node_modules/` aparece.

- [ ] **Paso 2: Verificar instalación de los paquetes clave**

```powershell
npm list next prisma tailwindcss typescript --depth=0
```

Resultado esperado: 4 paquetes listados con sus versiones sin errores.

---

## Task 8: prisma/schema.prisma

**Files:**
- Crear: `prisma/schema.prisma`

- [ ] **Paso 1: Crear el schema completo de Prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

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

// ─── Modelo principal ────────────────────────────────────────────────────────

model Ruta {
  id        Int      @id @default(autoincrement())
  slug      String   @unique
  titulo    String
  publicada Boolean  @default(false)

  // Clasificación
  modalidad  Modalidad
  dificultad Dificultad
  provincia  String

  // Descripción
  descripcion String?

  // Métricas
  distancia         Float?
  duracion          String?
  duracion_horas    Int?
  duracion_minutos  Int?
  desnivel_positivo Int?
  desnivel_negativo Int?
  altitud_maxima    Int?
  altitud_minima    Int?
  tipo_recorrido    String?

  // Localización
  punto_inicio        String?
  coordenadas_parking String?
  como_llegar         String?
  transporte_publico  String?

  // Logística
  mejor_epoca       String?
  mejor_momento_dia String?
  equipamiento      String?
  puntos_agua       String?
  puntos_interes    String?
  servicios_cercanos  String?
  alojamiento_cercano String?
  zonas_camping       String?

  // Archivos
  archivo_gpx String?

  // Valoración
  valoracion         Float? @default(0)
  total_valoraciones Int?   @default(0)

  // SEO
  rank_math_seo_score Int?

  // ── Campos exclusivos Senderismo ──────────────────────────────────────────
  ecosistema                String?
  flora                     String?
  fauna                     String?
  nivel_experiencia         String?
  forma_fisica              String?
  puntos_de_avituallamiento String?
  avisos_seguridad          String?
  restricciones_permisos    String?
  permisos_especiales       String?
  permisos_necesarios       String?
  epoca_nieve               String?

  // ── Campos exclusivos Bici ────────────────────────────────────────────────
  tipo_bici          String?
  nivel_tecnico_bici String?
  tipo_terreno_bici  String?
  talleres_bici      String?

  // ── Campos exclusivos Moto ────────────────────────────────────────────────
  tipo_de_carretera  String?
  estado_asfalto     String?
  puertos_montana    String?
  peajes             String?
  gasolineras_ruta   String?
  puntos_moteros     String?
  zonas_descanso_moto String?

  // ── Campos exclusivos 4x4 ─────────────────────────────────────────────────
  tipo_terreno_4x4    String?
  traccion_necesaria  String?
  estado_firme        String?
  vado_rios           String?
  dificultad_tecnica  String?
  parking_coste       String?
  parking_descripcion String?
  puntos_repostaje_4x4 String?

  // Meta
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones
  imagenes     ImagenRuta[]
  puntosRuta   PuntoInteres[]
  valoraciones Valoracion[]

  @@index([provincia])
  @@index([modalidad])
  @@index([dificultad])
  @@index([publicada])
}

// ─── Modelos relacionados ─────────────────────────────────────────────────────

model ImagenRuta {
  id     Int     @id @default(autoincrement())
  rutaId Int
  url    String?
  orden  Int     @default(0)
  alt    String?

  ruta Ruta @relation(fields: [rutaId], references: [id], onDelete: Cascade)

  @@index([rutaId])
}

model PuntoInteres {
  id          Int     @id @default(autoincrement())
  rutaId      Int
  nombre      String
  descripcion String?
  coordenadas String?

  ruta Ruta @relation(fields: [rutaId], references: [id], onDelete: Cascade)

  @@index([rutaId])
}

model Valoracion {
  id         Int      @id @default(autoincrement())
  rutaId     Int
  puntuacion Int
  comentario String?
  createdAt  DateTime @default(now())

  ruta Ruta @relation(fields: [rutaId], references: [id], onDelete: Cascade)

  @@index([rutaId])
}
```

- [ ] **Paso 2: Validar el schema**

```powershell
npx prisma validate
```

Resultado esperado:
```
The schema at prisma/schema.prisma is valid 🚀
```

---

## Task 9: Generar cliente Prisma

**Files:** ninguno nuevo (popula `.prisma/client/`)

> El cliente Prisma se genera a partir del schema. No necesita DATABASE_URL para generarse.

- [ ] **Paso 1: Generar el cliente Prisma**

```powershell
npx prisma generate
```

Resultado esperado:
```
✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in Xms
```

---

## Task 10: lib/utils.ts

**Files:**
- Crear: `lib/utils.ts`

- [ ] **Paso 1: Crear lib/utils.ts con la función cn()**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Paso 2: Verificar que TypeScript acepta el archivo**

```powershell
npx tsc --noEmit --project tsconfig.json 2>&1 | Select-String "utils"
```

Resultado esperado: sin líneas de error relacionadas con `utils`.

---

## Task 11: lib/prisma.ts

**Files:**
- Crear: `lib/prisma.ts`

- [ ] **Paso 1: Crear el singleton del cliente Prisma**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

> El singleton evita crear múltiples instancias del cliente Prisma en modo desarrollo (hot reload de Next.js crearía una nueva instancia en cada cambio de archivo sin este patrón).

---

## Task 12: lib/supabase.ts

**Files:**
- Crear: `lib/supabase.ts`

- [ ] **Paso 1: Crear lib/supabase.ts con clientes browser y servidor**

> En Next.js 14, `cookies()` es **síncrono** (no usar `await`). Cambió a asíncrono en Next.js 15.
> El `try/catch` en `setAll` es necesario porque los Server Components no pueden escribir cookies directamente.

```typescript
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Llamado desde Server Component — las cookies se refrescan en el middleware
          }
        },
      },
    }
  )
}
```

---

## Task 13: types/ruta.ts

**Files:**
- Crear: `types/ruta.ts`

- [ ] **Paso 1: Crear tipos de dominio TypeScript**

```typescript
export type Modalidad = 'senderismo' | 'bici' | 'moto' | '4x4'

export type Dificultad = 'facil' | 'moderada' | 'dificil' | 'muy-dificil'

export type TipoRecorrido = 'circular' | 'lineal' | 'ida-vuelta'

export type RutaBase = {
  titulo: string
  slug: string
  descripcion: string
  provincia: string
  modalidad: Modalidad
  dificultad: Dificultad

  distancia: number
  duracion: string
  duracion_horas: number
  duracion_minutos: number
  desnivel_positivo: number
  desnivel_negativo: number
  altitud_maxima: number
  altitud_minima: number
  tipo_recorrido: TipoRecorrido

  punto_inicio: string
  coordenadas_parking: string
  como_llegar: string
  transporte_publico: string

  mejor_epoca: string
  mejor_momento_dia: string
  equipamiento: string
  puntos_agua: string
  puntos_interes: string
  servicios_cercanos: string
  alojamiento_cercano: string
  zonas_camping: string

  archivo_gpx: string
  galeria: string[]

  valoracion: number
  total_valoraciones: number

  rank_math_seo_score: number
}

export type CamposSenderismo = {
  ecosistema: string
  flora: string
  fauna: string
  nivel_experiencia: string
  forma_fisica: string
  puntos_de_avituallamiento: string
  avisos_seguridad: string
  restricciones_permisos: string
  permisos_especiales: string
  permisos_necesarios: string
  epoca_nieve: string
}

export type CamposBici = {
  tipo_bici: string
  nivel_tecnico_bici: string
  tipo_terreno_bici: string
  talleres_bici: string
  puntos_de_avituallamiento: string
}

export type CamposMoto = {
  tipo_de_carretera: string
  estado_asfalto: string
  puertos_montana: string
  peajes: string
  gasolineras_ruta: string
  puntos_moteros: string
  zonas_descanso_moto: string
}

export type Campos4x4 = {
  tipo_terreno_4x4: string
  traccion_necesaria: string
  estado_firme: string
  vado_rios: string
  dificultad_tecnica: string
  parking_coste: string
  parking_descripcion: string
  puntos_repostaje_4x4: string
}

export type RutaCompleta = RutaBase &
  Partial<CamposSenderismo> &
  Partial<CamposBici> &
  Partial<CamposMoto> &
  Partial<Campos4x4>
```

---

## Task 14: app/globals.css + app/layout.tsx + app/page.tsx

**Files:**
- Crear: `app/globals.css`
- Crear: `app/layout.tsx`
- Crear: `app/page.tsx`

- [ ] **Paso 1: Crear app/globals.css con directivas de Tailwind**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Paso 2: Crear app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Rutas de España',
    template: '%s | Rutas de España',
  },
  description: 'Descubre rutas de senderismo, bici, moto y 4x4 por toda España',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Paso 3: Crear app/page.tsx**

```typescript
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Rutas de España</h1>
      <p className="mt-4 text-lg text-gray-600">Próximamente...</p>
    </main>
  )
}
```

---

## Task 15: Verificar compilación TypeScript

**Files:** ninguno nuevo

- [ ] **Paso 1: Ejecutar verificación TypeScript en todos los archivos**

```powershell
npx tsc --noEmit
```

Resultado esperado: sin output (0 errores). Si hay errores, están relacionados con `next-env.d.ts` que no existe aún — se genera en el siguiente paso al arrancar el servidor.

---

## Task 16: Arrancar el servidor de desarrollo

**Files:** ninguno nuevo (se genera `next-env.d.ts` automáticamente)

- [ ] **Paso 1: Arrancar el servidor de desarrollo**

```powershell
npm run dev
```

Resultado esperado:
```
▲ Next.js 14.2.x
- Local: http://localhost:3000
✓ Starting...
✓ Ready in Xs
```

- [ ] **Paso 2: Verificar la página en el navegador**

Abrir `http://localhost:3000` en el navegador.

Resultado esperado: página con el texto "Rutas de España" y "Próximamente..." en el centro.

- [ ] **Paso 3: Parar el servidor**

`Ctrl + C` en la terminal.

---

## Task 17: Git init y primer commit

**Files:** ninguno nuevo

- [ ] **Paso 1: Inicializar el repositorio git**

```powershell
git init
```

Resultado esperado:
```
Initialized empty Git repository in .../RutasEspaña/.git/
```

- [ ] **Paso 2: Verificar que .gitignore excluye lo correcto**

```powershell
git status --short
```

Resultado esperado: NO deben aparecer `node_modules/`, `.next/`, ni archivos `.env.local`. Sí deben aparecer todos los `.ts`, `.tsx`, `.json`, `.prisma`, `.mjs`, `.css`, `.md` del proyecto.

- [ ] **Paso 3: Añadir todos los archivos al staging**

```powershell
git add .
```

- [ ] **Paso 4: Crear el primer commit**

```powershell
git commit -m "Inicializa proyecto Next.js 14 con TypeScript strict, Tailwind y Prisma"
```

Resultado esperado:
```
[main (root-commit) xxxxxxx] Inicializa proyecto Next.js 14 con TypeScript strict, Tailwind y Prisma
 N files changed, N insertions(+)
```

---

## Resumen post-setup

Al terminar todas las tareas, la estructura estará lista con:

- **Next.js 14** arrancando en `http://localhost:3000`
- **TypeScript strict** con `noUncheckedIndexedAccess`
- **Tailwind CSS v3** configurado
- **Prisma schema** validado con todos los campos de las 4 modalidades
- **Cliente Prisma generado** (sin conexión a BBDD aún)
- **Lib files**: `prisma.ts`, `supabase.ts`, `utils.ts`
- **Tipos de dominio**: `types/ruta.ts`
- **Git inicializado** con primer commit

### Próximos pasos (Fase 1, Paso 2)

1. Crear proyecto en Supabase → copiar credenciales a `.env.local`
2. Ejecutar `npx prisma db push` para crear las tablas en Supabase
3. Crear el script de migración del XML
4. Implementar páginas de listado y detalle de rutas
