# Páginas Web Informativa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir las tres páginas públicas de Fase 1 (home, listado, detalle) con mapa Leaflet, perfil de elevación GPX y SEO básico.

**Architecture:** Server Components para todas las páginas; `use client` solo para `MapaRuta` (Leaflet) y `PerfilElevacion` (recharts). La capa de datos se centraliza en `lib/rutas.ts` con el cliente Supabase anon. El GPX se parsea server-side y se pasan los puntos como props a los componentes cliente.

**Tech Stack:** Next.js 14 App Router, TypeScript strict + noUncheckedIndexedAccess, Tailwind CSS v3, react-leaflet, recharts, fast-xml-parser (ya instalado), @supabase/supabase-js

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `package.json` | Modificar | Añadir recharts, react-leaflet, @types/leaflet |
| `public/images/rutas/` | Crear | Imágenes de rutas (nombradas por slug) |
| `lib/rutas.ts` | Crear | Tipos RutaResumen/RutaDetalle y funciones Supabase |
| `components/ui/Navbar.tsx` | Crear | Barra de navegación |
| `components/ui/Footer.tsx` | Crear | Pie de página |
| `app/layout.tsx` | Modificar | Añadir Navbar, Footer e import Leaflet CSS |
| `components/rutas/RutaCard.tsx` | Crear | Card de ruta (use client, imagen con fallback) |
| `components/rutas/Paginacion.tsx` | Crear | Controles de paginación SSR-friendly |
| `components/rutas/DatosTecnicos.tsx` | Crear | Grid de métricas de la ruta |
| `components/rutas/MapaRuta.tsx` | Crear | Mapa Leaflet (use client, ssr:false en parent) |
| `components/rutas/PerfilElevacion.tsx` | Crear | Gráfico recharts de elevación (use client) |
| `app/page.tsx` | Modificar | Hero + 6 rutas destacadas |
| `app/rutas/page.tsx` | Crear | Listado paginado |
| `app/rutas/[slug]/page.tsx` | Crear | Detalle con GPX y mapa |
| `app/sitemap.ts` | Crear | Sitemap dinámico |
| `app/robots.ts` | Crear | robots.txt |

---

## Task 1: Dependencias e imágenes

**Files:**
- Modificar: `package.json`
- Crear: `public/images/rutas/`

- [ ] **Paso 1: Instalar dependencias**

```powershell
Set-Location "C:\Users\ccash\Documents\Claude\Projects\RutasEspaña"
npm install recharts react-leaflet @types/leaflet
```

Resultado esperado: `added N packages` sin errores.

- [ ] **Paso 2: Mover imágenes a public/**

```powershell
New-Item -ItemType Directory -Force "public\images\rutas"
# Copiar las imágenes del cares renombradas al slug correcto
Copy-Item "img_rutas\cares_1.jpg" "public\images\rutas\ruta-del-cares_1.jpg"
Copy-Item "img_rutas\cares_2.jpg" "public\images\rutas\ruta-del-cares_2.jpg"
Copy-Item "img_rutas\cares_3.jpg" "public\images\rutas\ruta-del-cares_3.jpg"
Copy-Item "img_rutas\cares_4.jpg" "public\images\rutas\ruta-del-cares_4.jpg"
Copy-Item "img_rutas\cares_5.jpg" "public\images\rutas\ruta-del-cares_5.jpg"
# Para guadarrama_bici: busca su slug en Supabase Table Editor
# y renómbrala como [slug]_1.jpg. Por ahora la copiamos con nombre original:
Copy-Item "img_rutas\guadarrama_bici_1.jpg" "public\images\rutas\guadarrama_bici_1.jpg"
Get-ChildItem "public\images\rutas\"
```

Resultado esperado: 6 archivos `.jpg` en `public/images/rutas/`.

- [ ] **Paso 3: Verificar instalación**

```powershell
npm list recharts react-leaflet --depth=0
```

Resultado esperado: `recharts@x.x.x` y `react-leaflet@x.x.x` listados.

- [ ] **Paso 4: Commit**

```powershell
git add package.json package-lock.json public/images/rutas/
git commit -m "Instala recharts y react-leaflet, añade imagenes de rutas"
```

---

## Task 2: lib/rutas.ts — tipos y funciones Supabase

**Files:**
- Crear: `lib/rutas.ts`

- [ ] **Paso 1: Crear el archivo**

```typescript
// lib/rutas.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type RutaResumen = {
  id: number
  slug: string
  titulo: string
  provincia: string
  modalidad: string
  dificultad: string
  distancia: number | null
  duracion: string | null
  desnivel_positivo: number | null
  valoracion: number | null
  total_valoraciones: number | null
  publicada: boolean
}

export type RutaDetalle = RutaResumen & {
  descripcion: string | null
  tipo_recorrido: string | null
  duracion_horas: number | null
  duracion_minutos: number | null
  desnivel_negativo: number | null
  altitud_maxima: number | null
  altitud_minima: number | null
  mejor_epoca: string | null
  punto_inicio: string | null
  coordenadas_parking: string | null
  como_llegar: string | null
  equipamiento: string | null
  puntos_agua: string | null
  puntos_interes: string | null
  ecosistema: string | null
  archivo_gpx: string | null
}

const RESUMEN_FIELDS =
  'id,slug,titulo,provincia,modalidad,dificultad,distancia,duracion,desnivel_positivo,valoracion,total_valoraciones,publicada'

export async function getRutasDestacadas(): Promise<RutaResumen[]> {
  const { data, error } = await supabase
    .from('Ruta')
    .select(RESUMEN_FIELDS)
    .eq('publicada', true)
    .order('valoracion', { ascending: false })
    .limit(6)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getRutas(
  page: number,
  perPage = 12
): Promise<{ rutas: RutaResumen[]; total: number }> {
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  const { data, error, count } = await supabase
    .from('Ruta')
    .select(RESUMEN_FIELDS, { count: 'exact' })
    .order('valoracion', { ascending: false, nullsFirst: false })
    .range(from, to)
  if (error) throw new Error(error.message)
  return { rutas: data ?? [], total: count ?? 0 }
}

export async function getRutaBySlug(slug: string): Promise<RutaDetalle | null> {
  const { data, error } = await supabase
    .from('Ruta')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data as RutaDetalle
}

export async function getPublishedSlugs(): Promise<{ slug: string }[]> {
  const { data } = await supabase
    .from('Ruta')
    .select('slug')
    .eq('publicada', true)
  return data ?? []
}
```

- [ ] **Paso 2: Verificar tipos**

```powershell
npx tsc --noEmit
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Paso 3: Commit**

```powershell
git add lib/rutas.ts
git commit -m "Añade capa de datos lib/rutas.ts con tipos y funciones Supabase"
```

---

## Task 3: Navbar, Footer y layout

**Files:**
- Crear: `components/ui/Navbar.tsx`
- Crear: `components/ui/Footer.tsx`
- Modificar: `app/layout.tsx`

- [ ] **Paso 1: Crear Navbar**

```typescript
// components/ui/Navbar.tsx
import Link from 'next/link'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-orange-500 tracking-tight">
            Rutas de España
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-600 hover:text-orange-500 font-medium transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/rutas"
              className="text-gray-600 hover:text-orange-500 font-medium transition-colors"
            >
              Rutas
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Paso 2: Crear Footer**

```typescript
// components/ui/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
        © 2026 Rutas de España
      </div>
    </footer>
  )
}
```

- [ ] **Paso 3: Actualizar app/layout.tsx**

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import Navbar from '@/components/ui/Navbar'
import Footer from '@/components/ui/Footer'

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
      <body className="flex flex-col min-h-screen bg-white">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Paso 4: Verificar**

```powershell
npx tsc --noEmit
```

- [ ] **Paso 5: Commit**

```powershell
git add components/ui/Navbar.tsx components/ui/Footer.tsx app/layout.tsx
git commit -m "Añade Navbar, Footer y actualiza layout raiz"
```

---

## Task 4: RutaCard

**Files:**
- Crear: `components/rutas/RutaCard.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
// components/rutas/RutaCard.tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { RutaResumen } from '@/lib/rutas'

const MODALIDAD_COLORS: Record<string, string> = {
  senderismo: 'bg-green-600',
  bici: 'bg-orange-500',
  moto: 'bg-blue-600',
  '4x4': 'bg-amber-500',
}

const MODALIDAD_GRADIENTS: Record<string, string> = {
  senderismo: 'from-green-700 to-green-900',
  bici: 'from-orange-500 to-orange-800',
  moto: 'from-blue-600 to-blue-900',
  '4x4': 'from-amber-500 to-amber-800',
}

const MODALIDAD_LABELS: Record<string, string> = {
  senderismo: 'Senderismo',
  bici: 'Bici',
  moto: 'Moto',
  '4x4': '4x4',
}

const DIFICULTAD_COLORS: Record<string, string> = {
  facil: 'bg-green-100 text-green-800',
  moderada: 'bg-yellow-100 text-yellow-800',
  dificil: 'bg-orange-100 text-orange-800',
  muy_dificil: 'bg-red-100 text-red-800',
}

const DIFICULTAD_LABELS: Record<string, string> = {
  facil: 'Fácil',
  moderada: 'Moderada',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
}

export default function RutaCard({ ruta }: { ruta: RutaResumen }) {
  const [imgError, setImgError] = useState(false)

  const gradient = MODALIDAD_GRADIENTS[ruta.modalidad] ?? 'from-gray-600 to-gray-900'
  const modalidadColor = MODALIDAD_COLORS[ruta.modalidad] ?? 'bg-gray-500'
  const dificultadColor = DIFICULTAD_COLORS[ruta.dificultad] ?? 'bg-gray-100 text-gray-800'

  return (
    <Link
      href={`/rutas/${ruta.slug}`}
      className="group block rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow bg-white"
    >
      {/* Imagen o gradiente */}
      <div className="relative h-48">
        {!imgError ? (
          <Image
            src={`/images/rutas/${ruta.slug}_1.jpg`}
            alt={ruta.titulo}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
        )}

        {/* Badge modalidad */}
        <span
          className={`absolute top-3 left-3 ${modalidadColor} text-white text-xs font-semibold px-2 py-1 rounded-full`}
        >
          {MODALIDAD_LABELS[ruta.modalidad] ?? ruta.modalidad}
        </span>

        {/* Badge dificultad */}
        <span
          className={`absolute top-3 right-3 ${dificultadColor} text-xs font-semibold px-2 py-1 rounded-full`}
        >
          {DIFICULTAD_LABELS[ruta.dificultad] ?? ruta.dificultad}
        </span>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 line-clamp-2 mb-1 leading-snug">
          {ruta.titulo}
        </h3>
        <p className="text-sm text-gray-500 mb-3 capitalize">{ruta.provincia}</p>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
          {ruta.distancia !== null && <span>{ruta.distancia} km</span>}
          {ruta.desnivel_positivo !== null && <span>+{ruta.desnivel_positivo} m</span>}
          {ruta.duracion !== null && <span>{ruta.duracion}</span>}
        </div>

        {/* Valoración */}
        {ruta.total_valoraciones !== null && ruta.total_valoraciones > 0 && (
          <div className="flex items-center gap-1 text-sm mb-3">
            <span className="text-yellow-400">★</span>
            <span className="font-medium">{ruta.valoracion?.toFixed(1)}</span>
            <span className="text-gray-400">({ruta.total_valoraciones})</span>
          </div>
        )}

        <span className="inline-block bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-full group-hover:bg-orange-600 transition-colors">
          Ver Ruta →
        </span>
      </div>
    </Link>
  )
}
```

- [ ] **Paso 2: Verificar tipos**

```powershell
npx tsc --noEmit
```

- [ ] **Paso 3: Commit**

```powershell
git add components/rutas/RutaCard.tsx
git commit -m "Añade componente RutaCard con imagen y gradiente de fallback"
```

---

## Task 5: Paginacion

**Files:**
- Crear: `components/rutas/Paginacion.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
// components/rutas/Paginacion.tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Props = {
  paginaActual: number
  totalPaginas: number
}

export default function Paginacion({ paginaActual, totalPaginas }: Props) {
  if (totalPaginas <= 1) return null

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPaginas; i++) {
    if (
      i === 1 ||
      i === totalPaginas ||
      (i >= paginaActual - 2 && i <= paginaActual + 2)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  const btnBase =
    'flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-sm font-medium transition-colors'

  return (
    <nav className="flex items-center justify-center gap-1 mt-12" aria-label="Paginación">
      {paginaActual > 1 ? (
        <Link href={`/rutas?page=${paginaActual - 1}`} className={cn(btnBase, 'hover:bg-gray-50')}>
          ←
        </Link>
      ) : (
        <span className={cn(btnBase, 'opacity-40 cursor-not-allowed')}>←</span>
      )}

      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`dots-${i}`} className="w-9 text-center text-gray-400">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={`/rutas?page=${page}`}
            className={cn(
              btnBase,
              page === paginaActual
                ? 'bg-orange-500 text-white border-orange-500'
                : 'hover:bg-gray-50'
            )}
          >
            {page}
          </Link>
        )
      )}

      {paginaActual < totalPaginas ? (
        <Link href={`/rutas?page=${paginaActual + 1}`} className={cn(btnBase, 'hover:bg-gray-50')}>
          →
        </Link>
      ) : (
        <span className={cn(btnBase, 'opacity-40 cursor-not-allowed')}>→</span>
      )}
    </nav>
  )
}
```

- [ ] **Paso 2: Verificar tipos**

```powershell
npx tsc --noEmit
```

- [ ] **Paso 3: Commit**

```powershell
git add components/rutas/Paginacion.tsx
git commit -m "Añade componente Paginacion SSR-friendly"
```

---

## Task 6: DatosTecnicos

**Files:**
- Crear: `components/rutas/DatosTecnicos.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
// components/rutas/DatosTecnicos.tsx
import type { RutaDetalle } from '@/lib/rutas'

const DIFICULTAD_LABELS: Record<string, string> = {
  facil: 'Fácil',
  moderada: 'Moderada',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
}

const MODALIDAD_LABELS: Record<string, string> = {
  senderismo: 'Senderismo',
  bici: 'Bici',
  moto: 'Moto',
  '4x4': '4x4',
}

type Dato = { label: string; value: string; icon: string }

function buildDatos(ruta: RutaDetalle): Dato[] {
  const duracion =
    ruta.duracion_horas !== null && ruta.duracion_minutos !== null
      ? `${ruta.duracion_horas}h ${ruta.duracion_minutos}min`
      : ruta.duracion ?? null

  const candidates: (Dato | false)[] = [
    ruta.distancia !== null && {
      label: 'Distancia',
      value: `${ruta.distancia} km`,
      icon: '📏',
    },
    {
      label: 'Dificultad',
      value: DIFICULTAD_LABELS[ruta.dificultad] ?? ruta.dificultad,
      icon: '⚡',
    },
    {
      label: 'Modalidad',
      value: MODALIDAD_LABELS[ruta.modalidad] ?? ruta.modalidad,
      icon: '🥾',
    },
    !!ruta.tipo_recorrido && { label: 'Tipo', value: ruta.tipo_recorrido, icon: '🔄' },
    !!duracion && { label: 'Duración', value: duracion, icon: '⏱' },
    ruta.desnivel_positivo !== null && {
      label: 'Desnivel +',
      value: `${ruta.desnivel_positivo} m`,
      icon: '⬆️',
    },
    ruta.desnivel_negativo !== null && {
      label: 'Desnivel −',
      value: `${ruta.desnivel_negativo} m`,
      icon: '⬇️',
    },
    ruta.altitud_maxima !== null && {
      label: 'Alt. máx.',
      value: `${ruta.altitud_maxima} m`,
      icon: '🏔',
    },
    ruta.altitud_minima !== null && {
      label: 'Alt. mín.',
      value: `${ruta.altitud_minima} m`,
      icon: '🏕',
    },
    !!ruta.mejor_epoca && { label: 'Mejor época', value: ruta.mejor_epoca, icon: '📅' },
  ]

  return candidates.filter((d): d is Dato => d !== false)
}

export default function DatosTecnicos({ ruta }: { ruta: RutaDetalle }) {
  const datos = buildDatos(ruta)

  return (
    <div className="bg-gray-50 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Datos Técnicos</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {datos.map(({ label, value, icon }) => (
          <div key={label} className="text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-sm font-semibold text-gray-900">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Paso 2: Verificar tipos**

```powershell
npx tsc --noEmit
```

- [ ] **Paso 3: Commit**

```powershell
git add components/rutas/DatosTecnicos.tsx
git commit -m "Añade componente DatosTecnicos para la pagina de detalle"
```

---

## Task 7: MapaRuta (Leaflet)

**Files:**
- Crear: `components/rutas/MapaRuta.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
// components/rutas/MapaRuta.tsx
'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix iconos de Leaflet rotos en Next.js (webpack no encuentra los assets)
function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

type Props = {
  coordenadas?: string | null
  gpxPoints?: [number, number][]
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [40, 40] })
    }
  }, [map, points])
  return null
}

export default function MapaRuta({ coordenadas, gpxPoints = [] }: Props) {
  useEffect(() => {
    fixLeafletIcons()
  }, [])

  const center: [number, number] = [40.4, -3.7]

  const parkingCoords = ((): [number, number] | null => {
    if (!coordenadas) return null
    const parts = coordenadas.split(',').map((s) => parseFloat(s.trim()))
    const lat = parts[0]
    const lng = parts[1]
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return null
    return [lat, lng]
  })()

  return (
    <div className="h-96 rounded-2xl overflow-hidden border border-gray-200">
      <MapContainer center={center} zoom={6} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {gpxPoints.length > 1 && (
          <>
            <Polyline positions={gpxPoints} color="#f97316" weight={3} opacity={0.9} />
            <FitBounds points={gpxPoints} />
          </>
        )}
        {parkingCoords !== null && (
          <Marker position={parkingCoords}>
            <Popup>Punto de inicio / parking</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
```

- [ ] **Paso 2: Verificar tipos**

```powershell
npx tsc --noEmit
```

- [ ] **Paso 3: Commit**

```powershell
git add components/rutas/MapaRuta.tsx
git commit -m "Añade componente MapaRuta con Leaflet y traza GPX"
```

---

## Task 8: PerfilElevacion (recharts)

**Files:**
- Crear: `components/rutas/PerfilElevacion.tsx`

- [ ] **Paso 1: Crear el componente**

```typescript
// components/rutas/PerfilElevacion.tsx
'use client'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type Punto = { distancia: number; altitud: number }

export default function PerfilElevacion({ puntos }: { puntos: Punto[] }) {
  if (puntos.length === 0) return null

  return (
    <div className="bg-gray-50 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Perfil de Elevación</h2>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={puntos} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="altitudGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="distancia"
            tickFormatter={(v: number) => `${v} km`}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v: number) => `${v} m`}
            tick={{ fontSize: 12 }}
            width={60}
          />
          <Tooltip
            formatter={(value: number) => [`${value} m`, 'Altitud']}
            labelFormatter={(label: number) => `${label} km`}
          />
          <Area
            type="monotone"
            dataKey="altitud"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#altitudGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Paso 2: Verificar tipos**

```powershell
npx tsc --noEmit
```

- [ ] **Paso 3: Commit**

```powershell
git add components/rutas/PerfilElevacion.tsx
git commit -m "Añade componente PerfilElevacion con recharts AreaChart"
```

---

## Task 9: Home page

**Files:**
- Modificar: `app/page.tsx`

- [ ] **Paso 1: Reemplazar page.tsx**

```typescript
// app/page.tsx
import Image from 'next/image'
import Link from 'next/link'
import { getRutasDestacadas } from '@/lib/rutas'
import RutaCard from '@/components/rutas/RutaCard'

export default async function HomePage() {
  const rutasDestacadas = await getRutasDestacadas()

  return (
    <main>
      {/* Hero */}
      <section className="relative h-[85vh] min-h-[500px]">
        <Image
          src="/images/rutas/ruta-del-cares_1.jpg"
          alt="Ruta del Cares — Picos de Europa"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white text-center px-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
            Descubre España a tu ritmo
          </h1>
          <p className="text-lg sm:text-xl text-gray-200 mb-8 max-w-xl">
            1.225 rutas de senderismo, bici, moto y 4x4 por toda España
          </p>
          <Link
            href="/rutas"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-colors"
          >
            Ver todas las rutas
          </Link>
        </div>
      </section>

      {/* Rutas destacadas */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Rutas destacadas</h2>
        {rutasDestacadas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rutasDestacadas.map((ruta) => (
              <RutaCard key={ruta.id} ruta={ruta} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No hay rutas publicadas todavía.</p>
        )}
        <div className="mt-10 text-center">
          <Link
            href="/rutas"
            className="inline-block border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-semibold py-2 px-8 rounded-full transition-colors"
          >
            Ver todas las rutas →
          </Link>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Paso 2: Verificar tipos**

```powershell
npx tsc --noEmit
```

- [ ] **Paso 3: Arrancar dev server y verificar en el navegador**

```powershell
npm run dev
```

Abrir `http://localhost:3000`. Verificar:
- Hero con imagen de fondo y texto visible
- Sección "Rutas destacadas" con cards (o mensaje vacío si no hay publicadas)
- Navbar y Footer presentes
- Sin errores en consola

- [ ] **Paso 4: Commit**

```powershell
git add app/page.tsx
git commit -m "Implementa home page con hero y rutas destacadas"
```

---

## Task 10: Listado de rutas (/rutas)

**Files:**
- Crear: `app/rutas/page.tsx`

- [ ] **Paso 1: Crear la página**

```typescript
// app/rutas/page.tsx
import type { Metadata } from 'next'
import { getRutas } from '@/lib/rutas'
import RutaCard from '@/components/rutas/RutaCard'
import Paginacion from '@/components/rutas/Paginacion'

export const metadata: Metadata = {
  title: 'Todas las Rutas',
  description:
    'Explora más de 1.200 rutas de senderismo, bici, moto y 4x4 por toda España.',
}

const PER_PAGE = 12

export default async function RutasPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const { rutas, total } = await getRutas(page, PER_PAGE)
  const totalPaginas = Math.ceil(total / PER_PAGE)

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Todas las Rutas</h1>
        <p className="text-gray-500 mt-1">{total.toLocaleString('es-ES')} rutas disponibles</p>
      </div>

      {rutas.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rutas.map((ruta) => (
            <RutaCard key={ruta.id} ruta={ruta} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No se encontraron rutas.</p>
      )}

      <Paginacion paginaActual={page} totalPaginas={totalPaginas} />
    </main>
  )
}
```

- [ ] **Paso 2: Verificar tipos**

```powershell
npx tsc --noEmit
```

- [ ] **Paso 3: Verificar en navegador**

Con el dev server activo, abrir `http://localhost:3000/rutas`. Verificar:
- Grid de cards visible
- Paginación funciona con `?page=2`
- Contador de rutas correcto

- [ ] **Paso 4: Commit**

```powershell
git add app/rutas/page.tsx
git commit -m "Implementa listado de rutas con paginacion"
```

---

## Task 11: Página de detalle (/rutas/[slug])

**Files:**
- Crear: `app/rutas/[slug]/page.tsx`

- [ ] **Paso 1: Crear la página**

```typescript
// app/rutas/[slug]/page.tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { XMLParser } from 'fast-xml-parser'
import { getRutaBySlug, getPublishedSlugs } from '@/lib/rutas'
import DatosTecnicos from '@/components/rutas/DatosTecnicos'
import PerfilElevacion from '@/components/rutas/PerfilElevacion'

const MapaRuta = dynamic(() => import('@/components/rutas/MapaRuta'), { ssr: false })

// ─── GPX ─────────────────────────────────────────────────────────────────────

type GpxData = {
  gpxPoints: [number, number][]
  elevationPoints: { distancia: number; altitud: number }[]
}

const EMPTY_GPX: GpxData = { gpxPoints: [], elevationPoints: [] }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function parseGpx(url: string): Promise<GpxData> {
  try {
    const downloadUrl = url.includes('dl=0') ? url.replace('dl=0', 'dl=1') : url
    const res = await fetch(downloadUrl, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return EMPTY_GPX
    const text = await res.text()

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      isArray: (name) => name === 'trkpt',
    })
    const parsed = parser.parse(text) as {
      gpx?: { trk?: { trkseg?: { trkpt?: unknown[] } } }
    }

    type TrkPt = { lat: string; lon: string; ele?: string | number }
    const rawPts = parsed?.gpx?.trk?.trkseg?.trkpt ?? []
    const points = (rawPts as TrkPt[]).filter(
      (p) => typeof p.lat === 'string' && typeof p.lon === 'string'
    )
    if (points.length === 0) return EMPTY_GPX

    const gpxPoints: [number, number][] = points.map((p) => [
      parseFloat(p.lat),
      parseFloat(p.lon),
    ])

    let cumDist = 0
    const elevationPoints = points.map((p, i) => {
      if (i > 0) {
        const prev = points[i - 1]!
        cumDist += haversineKm(
          parseFloat(prev.lat),
          parseFloat(prev.lon),
          parseFloat(p.lat),
          parseFloat(p.lon)
        )
      }
      return {
        distancia: Math.round(cumDist * 100) / 100,
        altitud:
          p.ele !== undefined ? Math.round(parseFloat(String(p.ele))) : 0,
      }
    })

    return { gpxPoints, elevationPoints }
  } catch {
    return EMPTY_GPX
  }
}

// ─── Static params ────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs()
  return slugs.map(({ slug }) => ({ slug }))
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const ruta = await getRutaBySlug(params.slug)
  if (!ruta) return { title: 'Ruta no encontrada' }
  return {
    title: ruta.titulo,
    description:
      ruta.descripcion?.substring(0, 160) ??
      `Ruta de ${ruta.modalidad} en ${ruta.provincia}. ${ruta.distancia ?? ''} km.`,
  }
}

// ─── Página ───────────────────────────────────────────────────────────────────

function Badge({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 text-sm">
      <span>{icon}</span>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-medium text-gray-900 line-clamp-2">{value}</div>
      </div>
    </div>
  )
}

export default async function RutaPage({ params }: { params: { slug: string } }) {
  const ruta = await getRutaBySlug(params.slug)
  if (!ruta) notFound()

  const { gpxPoints, elevationPoints } = ruta.archivo_gpx
    ? await parseGpx(ruta.archivo_gpx)
    : EMPTY_GPX

  const tieneValoracion =
    ruta.total_valoraciones !== null && ruta.total_valoraciones > 0

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1">
        <Link href="/" className="hover:text-orange-500">Inicio</Link>
        <span>›</span>
        <Link href="/rutas" className="hover:text-orange-500">Rutas</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium truncate">{ruta.titulo}</span>
      </nav>

      {/* Cabecera */}
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{ruta.titulo}</h1>

      {tieneValoracion && (
        <div className="flex items-center gap-2 mb-8 text-sm text-gray-600">
          <span className="text-yellow-400 text-lg leading-none">
            {'★'.repeat(Math.min(5, Math.round(ruta.valoracion ?? 0)))}
            {'☆'.repeat(Math.max(0, 5 - Math.round(ruta.valoracion ?? 0)))}
          </span>
          <span className="font-medium">{ruta.valoracion?.toFixed(1)}</span>
          <span>({ruta.total_valoraciones} valoraciones)</span>
        </div>
      )}

      {/* Datos técnicos */}
      <DatosTecnicos ruta={ruta} />

      {/* Descripción */}
      {ruta.descripcion !== null && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Sobre la Ruta</h2>
          <p className="text-gray-700 leading-relaxed">{ruta.descripcion}</p>
        </section>
      )}

      {/* Badges informativos */}
      {(ruta.ecosistema ?? ruta.puntos_agua ?? ruta.puntos_interes) !== null && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ruta.ecosistema !== null && (
            <Badge label="Ecosistema" value={ruta.ecosistema} icon="🌿" />
          )}
          {ruta.puntos_agua !== null && (
            <Badge label="Puntos de agua" value={ruta.puntos_agua} icon="💧" />
          )}
          {ruta.puntos_interes !== null && (
            <Badge label="Puntos de interés" value={ruta.puntos_interes} icon="📍" />
          )}
        </div>
      )}

      {/* Mapa */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mapa de la Ruta</h2>
        <MapaRuta coordenadas={ruta.coordenadas_parking} gpxPoints={gpxPoints} />
      </section>

      {/* Perfil de elevación */}
      {elevationPoints.length > 0 && (
        <section className="mt-8">
          <PerfilElevacion puntos={elevationPoints} />
        </section>
      )}
    </main>
  )
}
```

- [ ] **Paso 2: Verificar tipos**

```powershell
npx tsc --noEmit
```

- [ ] **Paso 3: Verificar en navegador**

Abrir `http://localhost:3000/rutas/ruta-del-cares`. Verificar:
- Datos técnicos visibles
- Mapa Leaflet carga (puede tardar un momento)
- Perfil de elevación visible si la URL de GPX es accesible desde Dropbox
- Breadcrumb navegable

- [ ] **Paso 4: Commit**

```powershell
git add app/rutas/
git commit -m "Implementa pagina de detalle de ruta con mapa Leaflet y perfil GPX"
```

---

## Task 12: SEO — sitemap y robots

**Files:**
- Crear: `app/sitemap.ts`
- Crear: `app/robots.ts`

- [ ] **Paso 1: Crear sitemap.ts**

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { getPublishedSlugs } from '@/lib/rutas'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const slugs = await getPublishedSlugs()

  const rutas: MetadataRoute.Sitemap = slugs.map(({ slug }) => ({
    url: `${baseUrl}/rutas/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/rutas`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...rutas,
  ]
}
```

- [ ] **Paso 2: Crear robots.ts**

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
```

- [ ] **Paso 3: Verificar tipos**

```powershell
npx tsc --noEmit
```

- [ ] **Paso 4: Verificar en navegador**

Abrir `http://localhost:3000/sitemap.xml` y `http://localhost:3000/robots.txt`. Verificar que se generan correctamente.

- [ ] **Paso 5: Commit**

```powershell
git add app/sitemap.ts app/robots.ts
git commit -m "Añade sitemap dinamico y robots.txt para SEO"
```

---

## Task 13: Verificación final y commit de cierre

**Files:** ninguno nuevo

- [ ] **Paso 1: Build de producción**

```powershell
npm run build
```

Resultado esperado: build exitoso sin errores. Las páginas marcadas como `○` (static) y `ƒ` (dynamic) en el output.

- [ ] **Paso 2: Verificar las páginas clave**

Con `npm run dev`:
- `http://localhost:3000` — hero + rutas destacadas
- `http://localhost:3000/rutas` — listado con 12 rutas
- `http://localhost:3000/rutas?page=2` — segunda página
- `http://localhost:3000/rutas/ruta-del-cares` — detalle con mapa y elevación
- `http://localhost:3000/sitemap.xml` — sitemap generado
- `http://localhost:3000/robots.txt` — robots.txt

- [ ] **Paso 3: Commit final**

```powershell
git add -A
git commit -m "Completa Fase 1 Paso 3: paginas web informativa con mapa y SEO"
```
