# CLAUDE.md — Mi Mejor Ruta

Este archivo es el contexto principal del proyecto. Léelo completo antes de cualquier acción.

---

## ¿Qué es este proyecto?

**Mi Mejor Ruta** es una aplicación web de rutas al aire libre y en vehículo por España.
Migrada desde WordPress (1.225 rutas exportadas) a un stack moderno.
El objetivo es escalar por fases: web informativa → directorio filtrable → app con usuarios → monetización.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 14+ |
| Lenguaje | TypeScript | strict mode |
| Base de datos | Supabase (PostgreSQL) | — |
| ORM | Prisma | — |
| Estilos | Tailwind CSS | — |
| Mapas | Leaflet.js | — |
| Auth | Supabase Auth | — |
| Pagos | Stripe | — |
| Despliegue | Vercel | — |
| Dominio | Webempresa (DNS apunta a Vercel) | — |

---

## Estructura de carpetas esperada

```
/
├── app/                    # App Router de Next.js
│   ├── (public)/           # Rutas públicas
│   │   ├── rutas/          # Listado y detalle de rutas
│   │   ├── provincia/      # Filtrado por provincia
│   │   └── modalidad/      # Filtrado por modalidad
│   ├── (auth)/             # Rutas con autenticación
│   └── api/                # API routes
├── components/
│   ├── ui/                 # Componentes base (Tailwind)
│   ├── mapa/               # Componentes Leaflet
│   └── rutas/              # Componentes específicos de rutas
├── lib/
│   ├── supabase.ts         # Cliente Supabase
│   ├── prisma.ts           # Cliente Prisma
│   └── utils.ts            # Utilidades generales
├── prisma/
│   └── schema.prisma       # Esquema de base de datos
├── types/
│   └── ruta.ts             # Tipos TypeScript del dominio
└── public/
    └── gpx/                # Archivos GPX de rutas
```

---

## Modelo de datos — Taxonomías

### Taxonomía: `modalidad` (4 valores)
```
senderismo | bici | moto | 4x4
```

### Taxonomía: `dificultad` (4 valores)
```
facil | moderada | dificil | muy-dificil
```

### Taxonomía: `provincia` (50 provincias de España)
```
alava, albacete, alicante, almeria, asturias, avila, badajoz, barcelona,
burgos, caceres, cadiz, cantabria, castellon, ciudad-real, cordoba, cuenca,
girona, granada, guadalajara, gipuzkoa, huelva, huesca, illes-balears,
jaen, la-coruna, la-rioja, las-palmas, leon, lleida, lugo, madrid, malaga,
murcia, navarra, ourense, palencia, pontevedra, salamanca, santa-cruz-de-tenerife,
segovia, sevilla, soria, tarragona, teruel, toledo, valencia, valladolid,
vizcaya, zamora, zaragoza
```

> ⚠️ IMPORTANTE: En WordPress existían entradas duplicadas de provincias con nombres bilingües
> (ej: "Girona" y "Gerona (Girona)"). En la nueva app usar SIEMPRE el slug oficial normalizado
> de la lista de arriba. No crear duplicados.

---

## Modelo de datos — Campos custom por ruta

### Campos comunes a todas las modalidades
```typescript
type RutaBase = {
  // Identificación
  titulo: string
  slug: string
  descripcion: string          // sobre_ruta en WP
  provincia: string            // slug de provincia
  modalidad: 'senderismo' | 'bici' | 'moto' | '4x4'
  dificultad: 'facil' | 'moderada' | 'dificil' | 'muy-dificil'

  // Métricas básicas
  distancia: number            // en km
  duracion: string             // ej: "4h 30min"
  duracion_horas: number
  duracion_minutos: number
  desnivel_positivo: number    // en metros
  desnivel_negativo: number
  altitud_maxima: number       // en metros
  altitud_minima: number       // en metros
  tipo_recorrido: 'circular' | 'lineal' | 'ida-vuelta'

  // Localización
  punto_inicio: string
  coordenadas_parking: string  // lat,lng
  como_llegar: string
  transporte_publico: string

  // Logística
  mejor_epoca: string
  mejor_momento_dia: string
  equipamiento: string
  puntos_agua: string
  puntos_interes: string
  servicios_cercanos: string
  alojamiento_cercano: string
  zonas_camping: string

  // Archivos
  archivo_gpx: string          // URL o path al GPX
  galeria: string[]            // Array de URLs de imágenes

  // Valoración
  valoracion: number           // promedio
  total_valoraciones: number

  // SEO
  rank_math_seo_score: number
}
```

### Campos exclusivos: Senderismo
```typescript
type CamposSenderismo = {
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
```

### Campos exclusivos: Bici
```typescript
type CamposBici = {
  tipo_bici: string            // MTB, gravel, carretera...
  nivel_tecnico_bici: string
  tipo_terreno_bici: string
  talleres_bici: string
  puntos_de_avituallamiento: string
}
```

### Campos exclusivos: Moto
```typescript
type CamposMoto = {
  tipo_de_carretera: string
  estado_asfalto: string
  puertos_montana: string
  peajes: string
  gasolineras_ruta: string
  puntos_moteros: string
  zonas_descanso_moto: string
}
```

### Campos exclusivos: 4x4
```typescript
type Campos4x4 = {
  tipo_terreno_4x4: string
  traccion_necesaria: string
  estado_firme: string
  vado_rios: string
  dificultad_tecnica: string
  parking_coste: string
  parking_descripcion: string
  puntos_repostaje_4x4: string
}
```

---

## Prisma Schema (referencia)

```prisma
model Ruta {
  id                  Int       @id @default(autoincrement())
  slug                String    @unique
  titulo              String
  descripcion         String?
  modalidad           Modalidad
  dificultad          Dificultad
  provincia           String
  distancia           Float?
  duracion            String?
  duracion_horas      Int?
  duracion_minutos    Int?
  desnivel_positivo   Int?
  desnivel_negativo   Int?
  altitud_maxima      Int?
  altitud_minima      Int?
  tipo_recorrido      String?
  punto_inicio        String?
  coordenadas_parking String?
  como_llegar         String?
  mejor_epoca         String?
  equipamiento        String?
  archivo_gpx         String?
  valoracion          Float?    @default(0)
  total_valoraciones  Int?      @default(0)
  publicada           Boolean   @default(false)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  // Campos específicos por modalidad (nullable)
  ecosistema          String?
  flora               String?
  fauna               String?
  tipo_bici           String?
  tipo_de_carretera   String?
  estado_asfalto      String?
  tipo_terreno_4x4    String?
  traccion_necesaria  String?

  // Relaciones
  imagenes            ImagenRuta[]
  puntos_interes      PuntoInteres[]
  valoraciones        Valoracion[]

  @@index([provincia])
  @@index([modalidad])
  @@index([dificultad])
}

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

---

## Reglas de desarrollo — LEE ESTO ANTES DE TOCAR CÓDIGO

1. **TypeScript strict**: No usar `any`. Si no sabes el tipo, usa `unknown` y acota.
2. **Componentes del servidor por defecto**: Solo añadir `'use client'` cuando sea estrictamente necesario (interactividad del navegador).
3. **Tailwind sin CSS custom**: Todo el estilo va en clases de Tailwind. No crear archivos `.css` salvo `globals.css`.
4. **No tocar el diseño existente**: Las clases de Tailwind del diseño original son intocables a menos que se indique explícitamente.
5. **Slugs únicos y normalizados**: Las provincias usan SIEMPRE los slugs de la lista oficial de este archivo.
6. **GPX**: Los archivos GPX se sirven desde `/public/gpx/[slug].gpx`. No incrustar datos GPX en la base de datos.
7. **Imágenes**: Usar `next/image` siempre. No `<img>` nativo.
8. **Variables de entorno**: Nunca hardcodear credenciales. Usar siempre `process.env.VARIABLE`.
9. **Commits**: Mensajes en español, en imperativo. Ej: `Añade filtro por provincia en listado de rutas`.
10. **Un componente = un archivo**: No mezclar componentes no relacionados en el mismo fichero.
11. **Idioma**: TODO en castellano — no solo los textos y comentarios, también los nombres técnicos: tablas, columnas, funciones, ficheros. Nada de nombrar cosas en inglés salvo palabras reservadas del lenguaje (`SELECT`, `CREATE TABLE`, tipos de dato como `text`/`integer`) o términos sin traducción razonable establecida.
12. **Nombres de fichero sin versiones**: nunca añadir sufijos de versión a un fichero (`_v2`, `_final`, `_bueno`, `_copia`, fechas, ni prefijos como "Prompt1_", "Prompt2_"...). Un fichero tiene un nombre descriptivo y estable; si se actualiza, se sobrescribe o se sustituye — nunca se acumula con un nombre nuevo al lado del viejo. Esto aplica tanto a ficheros ejecutables/código como a documentos y entregables.

---

## Variables de entorno necesarias (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Prisma
DATABASE_URL=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=https://tudominio.es
```

---

## Fases del proyecto

### Fase 1 — Web informativa *(en curso)*
- [ ] Setup inicial Next.js + TypeScript + Tailwind + Supabase + Prisma
- [ ] Migración de 1.225 rutas desde WordPress XML a Supabase
- [ ] Página de listado de rutas con paginación
- [ ] Página de detalle de ruta con mapa Leaflet + GPX
- [ ] SEO básico (metadata, sitemap, robots.txt)
- [ ] Despliegue en Vercel + dominio Webempresa

### Fase 2 — Directorio filtrable
- [ ] Filtros por modalidad, provincia, dificultad, distancia
- [ ] Búsqueda por texto libre
- [ ] Página por provincia (SEO)
- [ ] Página por modalidad (SEO)

### Fase 3 — App con usuarios
- [ ] Auth con Supabase (email + Google)
- [ ] Perfil de usuario
- [ ] Rutas favoritas
- [ ] Sistema de valoraciones
- [ ] Subida de rutas por usuarios

### Fase 4 — Monetización
- [ ] Planes free / pro con Stripe
- [ ] Rutas premium (solo pro)
- [ ] Descarga de GPX (solo pro)
- [ ] Dashboard de estadísticas para creadores

---

## Funcionalidades decididas — 21 agosto 2026

- **Rutas especiales / itinerarios de varias etapas** (ej. Camino de Santiago): se modelan
  ampliando el sistema de senderos ya diseñado (tabla `senderos`, antes "trails") para que
  admita itinerarios de varias etapas con o sin código oficial GR/PR/SL, **Y ADEMÁS** se añade un
  concepto nuevo de "colecciones temáticas" (tabla `colecciones`) que agrupa rutas ya existentes
  bajo un mismo cartel editorial (ej. "Rutas de Castillos"), sin que tengan que ser un sendero
  físico continuo. Las dos cosas conviven, son casos distintos.
- **Búsqueda de rutas por puntos de interés** (cascadas, monasterios, castillos...): se empieza
  simple, con etiquetas por ruta (tabla `caracteristicas`, antes "features"), pero el diseño deja
  preparado el camino para convertir más adelante los sitios más importantes en fichas propias
  (catálogo de sitios de interés) sin tener que rehacer la base de datos — la tabla `puntos_ruta`
  (antes "route_points") ya guarda cada punto con su ubicación exacta, así que "ascender" un punto
  a ficha propia el día de mañana es extender, no rehacer.

Ver el análisis completo en `analisis-nuevas-funcionalidades-rutas.md`.

---

## Fuente de datos original

- **Exportación WordPress**: `rutasespaa_WordPress_2026-05-22.xml`
- **Total rutas**: 1.225
- **CPT original**: `ruta`
- **Taxonomías originales**: `modalidad`, `provincia`, `dificultad`
- **Plugin de campos**: Pods (campos custom por modalidad)
- **Constructor**: Elementor (ignorar datos de Elementor en la migración)

---

## Tareas gestionadas desde Cowork (NO desde Claude Code)

Las siguientes tareas se delegan a Claude Cowork para no interrumpir el flujo de desarrollo:

| Tarea | Herramienta Cowork |
|---|---|
| Gestionar panel de Supabase (crear tablas, revisar datos) | Navegador |
| Configurar DNS en Webempresa | Navegador |
| Revisar dashboard de Vercel (deploys, logs) | Navegador |
| Gestionar panel de Stripe (productos, precios) | Navegador |
| Buscar documentación de librerías | Navegador |
| Organizar archivos GPX del proyecto | Sistema de archivos |
| Redactar textos SEO de provincias y modalidades | Documentos |
| Revisar competidores y webs de referencia | Navegador |

---

*Última actualización: 21 agosto 2026*
*Proyecto: Mi Mejor Ruta*
