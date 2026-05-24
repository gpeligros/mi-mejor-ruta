# Spec: Páginas Web Informativa — Rutas de España

**Fecha:** 2026-05-24
**Fase:** 1 — Web informativa (Paso 3: Páginas públicas + SEO)
**Alcance:** Home con hero y rutas destacadas, listado paginado, detalle con mapa Leaflet y perfil de elevación GPX, SEO básico.

---

## Contexto

La base de datos Supabase tiene 1.225 rutas migradas desde WordPress. El proyecto Next.js 14 tiene solo la página placeholder. Las imágenes disponibles son 6 fotos para 2 rutas (cares, guadarrama_bici); el resto usa placeholder por modalidad. Los GPX están como URLs de Dropbox en el campo `archivo_gpx`.

---

## Arquitectura

### Páginas

| URL | Archivo | Descripción |
|---|---|---|
| `/` | `app/page.tsx` | Hero + 6 rutas destacadas |
| `/rutas` | `app/rutas/page.tsx` | Listado paginado |
| `/rutas/[slug]` | `app/rutas/[slug]/page.tsx` | Detalle de ruta |
| — | `app/sitemap.ts` | Sitemap dinámico |
| — | `app/robots.ts` | robots.txt |

Todas las páginas son **Server Components** salvo `MapaRuta` y `PerfilElevacion` que requieren `use client`.

### Estructura de archivos nuevos

```
app/
  page.tsx                          # Home (modificar)
  rutas/
    page.tsx                        # Listado
    [slug]/
      page.tsx                      # Detalle
  sitemap.ts                        # SEO sitemap
  robots.ts                         # SEO robots

components/
  ui/
    Navbar.tsx                      # Navegación
    Footer.tsx                      # Pie de página
  rutas/
    RutaCard.tsx                    # Card reutilizable
    Paginacion.tsx                  # Controles paginación
    DatosTecnicos.tsx               # Grid métricas detalle
    MapaRuta.tsx                    # Mapa Leaflet (use client)
    PerfilElevacion.tsx             # Gráfico elevación (use client)

lib/
  rutas.ts                          # Funciones de consulta Supabase

public/
  images/
    rutas/                          # Imágenes de rutas
      cares_1.jpg
      cares_2.jpg
      cares_3.jpg
      cares_4.jpg
      cares_5.jpg
      guadarrama_bici_1.jpg
```

---

## Capa de datos — `lib/rutas.ts`

Tres funciones que usan el cliente Supabase con `NEXT_PUBLIC_SUPABASE_ANON_KEY` (lectura pública):

```typescript
// 6 rutas publicadas con mayor valoracion
getRutasDestacadas(): Promise<RutaResumen[]>

// Listado paginado, ordenado por valoracion DESC
getRutas(page: number, perPage: number): Promise<{ rutas: RutaResumen[]; total: number }>

// Detalle completo por slug
getRutaBySlug(slug: string): Promise<RutaDetalle | null>
```

**Tipo `RutaResumen`** (campos para listado y card):
`id, slug, titulo, provincia, modalidad, dificultad, distancia, duracion, desnivel_positivo, valoracion, total_valoraciones, publicada`

**Tipo `RutaDetalle`** (todos los campos):
Todos los campos de `RutaResumen` más: `descripcion, tipo_recorrido, duracion_horas, duracion_minutos, desnivel_negativo, altitud_maxima, altitud_minima, mejor_epoca, punto_inicio, coordenadas_parking, como_llegar, equipamiento, puntos_agua, puntos_interes, ecosistema, archivo_gpx`

---

## Componentes

### `Navbar.tsx`

Barra de navegación fija en la parte superior:
- Logo "Rutas de España" (texto, enlace a `/`)
- Links: `Inicio` (`/`) · `Rutas` (`/rutas`)
- Responsive: en móvil, menú hamburger simple

### `Footer.tsx`

Footer simple:
- Texto "© 2026 Rutas de España"
- Sin links adicionales (Fase 1)

### `RutaCard.tsx`

Props: `ruta: RutaResumen`

Estructura:
- Imagen: busca `/images/rutas/[slug]_1.jpg` con `next/image`. Si no existe (error en `onError`), muestra `<div>` con gradiente de color por modalidad.
- Badge modalidad (top-left): pill con color de fondo por modalidad
- Badge dificultad (top-right): pill con color por dificultad
- Título de la ruta
- Provincia
- Stats en fila: distancia (km) · desnivel (+m) · duración
- Valoración: estrellas rellenas/vacías + nº valoraciones (si `total_valoraciones > 0`)
- Botón "Ver Ruta →" → `/rutas/[slug]`

**Colores de modalidad:**
- `senderismo`: verde (`bg-green-600`)
- `bici`: naranja (`bg-orange-500`)
- `moto`: azul (`bg-blue-600`)
- `4x4`: ámbar (`bg-amber-500`)

**Colores de dificultad:**
- `facil`: verde claro (`bg-green-100 text-green-800`)
- `moderada`: amarillo (`bg-yellow-100 text-yellow-800`)
- `dificil`: naranja (`bg-orange-100 text-orange-800`)
- `muy_dificil`: rojo (`bg-red-100 text-red-800`)

### `Paginacion.tsx`

Props: `paginaActual: number, totalPaginas: number`

- Botón ← (desactivado en página 1)
- Números de página: siempre muestra primera, última, y hasta 2 páginas alrededor de la actual; el resto con `...`
- Botón → (desactivado en última página)
- Navegación via `<Link href={`/rutas?page=${n}`}>` (sin JS, funciona con SSR)

### `DatosTecnicos.tsx`

Props: `ruta: RutaDetalle`

Grid de iconos con etiqueta y valor. Campos mostrados (solo si tienen valor):
`distancia`, `dificultad`, `modalidad`, `tipo_recorrido`, `duracion` (formateada como "Xh Ymin"), `desnivel_positivo`, `desnivel_negativo`, `altitud_maxima`, `altitud_minima`, `mejor_epoca`

### `MapaRuta.tsx` (use client)

Props: `coordenadas?: string, gpxPoints?: [number, number][]`

- Usa `react-leaflet` + `leaflet`
- Mapa centrado en España (`[40.4, -3.7]`, zoom 6) por defecto; si hay `gpxPoints`, centra el mapa en los puntos de la traza
- Si `coordenadas` existe (formato `"lat,lng"`), añade un marcador de parking en esas coordenadas
- Si `gpxPoints` existe y tiene puntos, dibuja un `Polyline` naranja sobre el mapa
- Altura fija: `h-96`

### `PerfilElevacion.tsx` (use client)

Props: `puntos: { distancia: number; altitud: number }[]`

- Usa `recharts` `AreaChart`
- Eje X: distancia acumulada en km
- Eje Y: altitud en metros
- Area con gradiente verde
- Solo se renderiza si `puntos.length > 0`

---

## Páginas

### Home (`app/page.tsx`)

1. **Hero:** div full-width con `next/image` de fondo (`/images/rutas/cares_1.jpg`), overlay `bg-black/50`, título `"Descubre España a tu ritmo"`, subtítulo `"1.225 rutas de senderismo, bici, moto y 4x4"`, botón naranja → `/rutas`
2. **Rutas destacadas:** llama a `getRutasDestacadas()`, renderiza grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` con 6 `RutaCard`

### Listado (`app/rutas/page.tsx`)

Props: `searchParams: { page?: string }`

1. Lee `page` de `searchParams` (default: 1)
2. Llama a `getRutas(page, 12)`
3. Renderiza: título "Todas las Rutas", contador "X rutas", grid 3 cols, `Paginacion`
4. `generateMetadata`: título "Rutas | Rutas de España", description fija

### Detalle (`app/rutas/[slug]/page.tsx`)

1. Llama a `getRutaBySlug(slug)` — si null, `notFound()`
2. Si `ruta.archivo_gpx` existe: fetch del GPX en el servidor (reemplaza `dl=0` → `dl=1`; si la URL no tiene ese parámetro, se usa tal cual), parsea con `fast-xml-parser`, extrae los `<trkpt>` con `lat`, `lon` y `<ele>`. Calcula distancia acumulada en km entre puntos consecutivos usando la fórmula de Haversine. Resultado: array `{ distancia: number, altitud: number }[]` para el gráfico y array `[lat, lon][]` para el mapa.
3. Renderiza: breadcrumb, título, valoración, `DatosTecnicos`, descripción, badges informativos, `MapaRuta`, `PerfilElevacion` (si hay puntos)
4. `generateMetadata`: título `"[titulo] | Rutas de España"`, description = `descripcion` truncada a 160 chars (o descripción genérica si null)
5. `generateStaticParams`: genera params para rutas `publicada=true` (SSG para las 65 rutas completas)

---

## SEO

### `app/sitemap.ts`

Consulta todas las rutas `publicada=true`, genera una `MetadataRoute.Sitemap` con URLs `/rutas/[slug]`. Prioridad 0.8, `changeFrequency: 'monthly'`.

### `app/robots.ts`

```
User-Agent: *
Allow: /
Sitemap: [NEXT_PUBLIC_APP_URL]/sitemap.xml
```

---

## Dependencias nuevas

- `recharts` — gráfico de elevación
- `react-leaflet` — mapa (leaflet ya está instalado)
- `@types/leaflet` — tipos TypeScript para Leaflet

---

## Manejo de errores

- Ruta no encontrada (`getRutaBySlug` → null): `notFound()` → Next.js muestra 404
- Fetch GPX falla (timeout, URL inválida, Dropbox error): se captura con try/catch, `puntos = []`, la sección de elevación no aparece
- Imagen de ruta no encontrada: `onError` en `next/image` muestra gradiente por modalidad
- Supabase error en consulta: propagado como error 500 de Next.js

---

## Éxito

- `/rutas` carga con >= 12 rutas y paginación funcional
- `/rutas/ruta-del-cares` muestra datos técnicos, mapa y perfil de elevación (tiene GPX en Dropbox)
- Sitemap accesible en `/sitemap.xml` con las rutas publicadas
- Sin errores de TypeScript en strict mode
