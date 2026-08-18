# Migración XML WordPress → Supabase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear un script TypeScript que lea el XML de WordPress (1.225 rutas) y las inserte en la tabla `Ruta` de Supabase usando el cliente `@supabase/supabase-js`.

**Architecture:** Script de una sola pasada: parse XML con `fast-xml-parser` → transform → insert en lotes de 50 vía Supabase JS con `SERVICE_ROLE_KEY`. Las variables de entorno se cargan desde `.env.local` con `dotenv`. Modo `--dry` para verificar el parsing sin insertar.

**Tech Stack:** `tsx` (ejecutar TS), `fast-xml-parser` (parsear XML), `dotenv` (cargar .env.local), `@supabase/supabase-js` (insertar datos)

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `package.json` | Modificar | Añadir `tsx`, `fast-xml-parser`, `dotenv` a devDependencies |
| `scripts/migrate-xml.ts` | Crear | Script completo de migración |

---

## Task 1: Instalar dependencias

**Files:**
- Modificar: `package.json`

- [ ] **Paso 1: Instalar dependencias de dev**

```powershell
Set-Location "C:\Users\ccash\Documents\Claude\Projects\RutasEspaña"
npm install --save-dev tsx fast-xml-parser dotenv @types/dotenv
```

Resultado esperado: `added N packages` sin errores.

- [ ] **Paso 2: Verificar instalación**

```powershell
npm list tsx fast-xml-parser dotenv --depth=0
```

Resultado esperado: los 3 paquetes listados con sus versiones.

---

## Task 2: Crear scripts/migrate-xml.ts

**Files:**
- Crear: `scripts/migrate-xml.ts`

> Este es el script completo de migración. Léelo en su totalidad antes de crear el archivo.

- [ ] **Paso 1: Crear el archivo con el siguiente contenido completo**

```typescript
import { config } from 'dotenv'
config({ path: '.env.local' })

import { XMLParser } from 'fast-xml-parser'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { join } from 'path'

// ─── Tipos internos ───────────────────────────────────────────────────────────

type WpCategory = {
  domain: string
  nicename: string
  '#text': string
}

type WpMeta = {
  meta_key: string
  meta_value: string
}

type WpItem = {
  title: unknown
  post_name: string
  status: string
  post_type: string
  category: WpCategory[]
  postmeta: WpMeta[]
}

type RutaInsert = Record<string, unknown>

// ─── Constantes ───────────────────────────────────────────────────────────────

const BATCH_SIZE = 50

const PROVINCIA_ALIAS: Record<string, string> = {
  'gerona-girona': 'girona',
  'gerona': 'girona',
  'baleares': 'illes-balears',
  'islas-baleares': 'illes-balears',
  'las-palmas-de-gran-canaria': 'las-palmas',
  'sta-cruz-de-tenerife': 'santa-cruz-de-tenerife',
  'la-coruna': 'la-coruna',
  'a-coruna': 'la-coruna',
}

const PROVINCIAS_VALIDAS = new Set([
  'alava', 'albacete', 'alicante', 'almeria', 'asturias', 'avila',
  'badajoz', 'barcelona', 'burgos', 'caceres', 'cadiz', 'cantabria',
  'castellon', 'ciudad-real', 'cordoba', 'cuenca', 'girona', 'granada',
  'guadalajara', 'gipuzkoa', 'huelva', 'huesca', 'illes-balears', 'jaen',
  'la-coruna', 'la-rioja', 'las-palmas', 'leon', 'lleida', 'lugo',
  'madrid', 'malaga', 'murcia', 'navarra', 'ourense', 'palencia',
  'pontevedra', 'salamanca', 'santa-cruz-de-tenerife', 'segovia',
  'sevilla', 'soria', 'tarragona', 'teruel', 'toledo', 'valencia',
  'valladolid', 'vizcaya', 'zamora', 'zaragoza',
])

// ─── Utilidades ───────────────────────────────────────────────────────────────

function stripHtml(html: string | undefined): string | null {
  if (!html) return null
  const stripped = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return stripped || null
}

function toFloat(val: string | undefined): number | null {
  if (!val) return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function toInt(val: string | undefined): number | null {
  if (!val) return null
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

function toStr(val: unknown): string | null {
  if (val === undefined || val === null || val === '') return null
  return String(val)
}

// ─── Extracción de datos del XML ─────────────────────────────────────────────

function getMetas(postmeta: WpMeta[]): Record<string, string> {
  const result: Record<string, string> = {}
  const SKIP_PREFIXES = ['_', 'elementor', 'ast-', 'site-', 'rank_math_facebook', 'rank_math_twitter']
  for (const m of postmeta) {
    const key = m.meta_key
    if (!key) continue
    if (SKIP_PREFIXES.some((p) => key.startsWith(p))) continue
    if (key in result) continue // primer valor gana
    result[key] = String(m.meta_value ?? '')
  }
  return result
}

function getTaxonomies(categories: WpCategory[]): {
  modalidad: string | undefined
  dificultad: string | undefined
  provincia: string | undefined
} {
  const map: Record<string, string> = {}
  for (const cat of categories) {
    if (cat.domain && cat.nicename) {
      map[cat.domain] = cat.nicename
    }
  }
  return {
    modalidad: map['modalidad'],
    dificultad: map['dificultad'],
    provincia: map['provincia'],
  }
}

// ─── Normalización ────────────────────────────────────────────────────────────

function normalizeModalidad(slug: string | undefined): string | null {
  switch (slug?.toLowerCase()) {
    case 'senderismo': return 'senderismo'
    case 'bici':       return 'bici'
    case 'moto':       return 'moto'
    case '4x4':        return 'cuatro_por_cuatro'
    default:           return null
  }
}

function normalizeDificultad(slug: string | undefined): string | null {
  switch (slug?.toLowerCase()) {
    case 'facil':      return 'facil'
    case 'moderada':   return 'moderada'
    case 'dificil':    return 'dificil'
    case 'muy-dificil':
    case 'muy_dificil':
    case 'muy-difícil': return 'muy_dificil'
    default:           return null
  }
}

function normalizeProvincia(slug: string | undefined): string {
  if (!slug) return 'desconocida'
  const aliased = PROVINCIA_ALIAS[slug] ?? slug
  return PROVINCIAS_VALIDAS.has(aliased) ? aliased : 'desconocida'
}

// ─── Transformación WP → Supabase ─────────────────────────────────────────────

function transform(item: WpItem, warnings: string[]): RutaInsert | null {
  const slug = item.post_name
  if (!slug) return null

  const titulo = toStr(item.title) ?? 'Sin título'
  const publicada = item.status === 'publish'

  const { modalidad: mSlug, dificultad: dSlug, provincia: pSlug } = getTaxonomies(
    item.category ?? []
  )

  const modalidad = normalizeModalidad(mSlug)
  const dificultad = normalizeDificultad(dSlug)

  if (!modalidad || !dificultad) {
    warnings.push(`${slug}: sin modalidad (${mSlug}) o dificultad (${dSlug})`)
    return null
  }

  const provincia = normalizeProvincia(pSlug)
  if (provincia === 'desconocida') {
    warnings.push(`${slug}: provincia desconocida (${pSlug}), se guarda como 'desconocida'`)
  }

  const meta = getMetas(item.postmeta ?? [])

  return {
    slug,
    titulo,
    publicada,
    modalidad,
    dificultad,
    provincia,
    descripcion: stripHtml(meta['sobre_ruta']),
    distancia: toFloat(meta['distancia']),
    duracion: toStr(meta['duracion']),
    duracion_horas: toInt(meta['duracion_horas']),
    duracion_minutos: toInt(meta['duracion_minutos']),
    desnivel_positivo: toInt(meta['desnivel_positivo']),
    desnivel_negativo: toInt(meta['desnivel_negativo']),
    altitud_maxima: toInt(meta['altitud_maxima']),
    altitud_minima: toInt(meta['altitud_minima']),
    tipo_recorrido: toStr(meta['tipo_recorrido']),
    punto_inicio: toStr(meta['punto_inicio']),
    coordenadas_parking: toStr(meta['coordenadas_parking']),
    como_llegar: toStr(meta['como_llegar']),
    transporte_publico: toStr(meta['transporte_publico']),
    mejor_epoca: toStr(meta['mejor_epoca']),
    mejor_momento_dia: toStr(meta['mejor_momento_dia']),
    equipamiento: toStr(meta['equipamiento']),
    puntos_agua: toStr(meta['puntos_agua']),
    puntos_interes: toStr(meta['puntos_interes']),
    servicios_cercanos: toStr(meta['servicios_cercanos']),
    alojamiento_cercano: toStr(meta['alojamiento_cercano']),
    zonas_camping: toStr(meta['zonas_camping']),
    archivo_gpx: toStr(meta['archivo_gpx']),
    valoracion: toFloat(meta['valoracion']),
    total_valoraciones: toInt(meta['total_valoraciones']),
    rank_math_seo_score: toInt(meta['rank_math_seo_score']),
    // Senderismo
    ecosistema: toStr(meta['ecosistema']),
    flora: toStr(meta['flora']),
    fauna: toStr(meta['fauna']),
    nivel_experiencia: toStr(meta['nivel_experiencia']),
    forma_fisica: toStr(meta['forma_fisica']),
    puntos_de_avituallamiento: toStr(meta['puntos_de_avituallamiento']),
    avisos_seguridad: toStr(meta['avisos_seguridad']),
    restricciones_permisos: toStr(meta['restricciones_permisos']),
    permisos_especiales: toStr(meta['permisos_especiales']),
    permisos_necesarios: toStr(meta['permisos_necesarios']),
    epoca_nieve: toStr(meta['epoca_nieve']),
    // Bici
    tipo_bici: toStr(meta['tipo_bici']),
    nivel_tecnico_bici: toStr(meta['nivel_tecnico_bici']),
    tipo_terreno_bici: toStr(meta['tipo_terreno_bici']),
    talleres_bici: toStr(meta['talleres_bici']),
    // Moto
    tipo_de_carretera: toStr(meta['tipo_de_carretera']),
    estado_asfalto: toStr(meta['estado_asfalto']),
    puertos_montana: toStr(meta['puertos_montana']),
    peajes: toStr(meta['peajes']),
    gasolineras_ruta: toStr(meta['gasolineras_ruta']),
    puntos_moteros: toStr(meta['puntos_moteros']),
    zonas_descanso_moto: toStr(meta['zonas_descanso_moto']),
    // 4x4
    tipo_terreno_4x4: toStr(meta['tipo_terreno_4x4']),
    traccion_necesaria: toStr(meta['traccion_necesaria']),
    estado_firme: toStr(meta['estado_firme']),
    vado_rios: toStr(meta['vado_rios']),
    dificultad_tecnica: toStr(meta['dificultad_tecnica']),
    parking_coste: toStr(meta['parking_coste']),
    parking_descripcion: toStr(meta['parking_descripcion']),
    puntos_repostaje_4x4: toStr(meta['puntos_repostaje_4x4']),
    updatedAt: new Date().toISOString(),
  }
}

// ─── Inserción en lotes ───────────────────────────────────────────────────────

async function insertBatch(
  supabase: ReturnType<typeof createClient>,
  batch: RutaInsert[]
): Promise<{ ok: number; failed: string[] }> {
  const { error } = await supabase.from('Ruta').insert(batch)
  if (!error) return { ok: batch.length, failed: [] }

  // Reintento individual para aislar el error
  let ok = 0
  const failed: string[] = []
  for (const ruta of batch) {
    const { error: singleErr } = await supabase.from('Ruta').insert([ruta])
    if (singleErr) {
      failed.push(`${ruta['slug']}: ${singleErr.message}`)
    } else {
      ok++
    }
  }
  return { ok, failed }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry')

  console.log('\nRutas de España — Migración WordPress → Supabase')
  console.log('='.repeat(50))
  if (isDryRun) console.log('🔍 MODO DRY RUN (sin inserción)\n')

  // Supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Faltan variables de entorno. Asegúrate de tener .env.local con:\n' +
        '  NEXT_PUBLIC_SUPABASE_URL\n' +
        '  SUPABASE_SERVICE_ROLE_KEY'
    )
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  })

  // Parse XML
  process.stdout.write('📂 Leyendo XML... ')
  const xmlPath = join(process.cwd(), 'rutasespaa.WordPress.2026-05-22.xml')
  const xml = readFileSync(xmlPath, 'utf-8')

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    isArray: (name) => ['category', 'postmeta'].includes(name),
  })

  const parsed = parser.parse(xml) as {
    rss: { channel: { item: WpItem[] } }
  }
  const items = parsed.rss.channel.item ?? []
  const rutas = items.filter((i) => i.post_type === 'ruta')
  console.log(`${rutas.length} rutas encontradas`)

  // Transform
  const warnings: string[] = []
  const registros = rutas
    .map((item) => transform(item, warnings))
    .filter((r): r is RutaInsert => r !== null)

  const saltadas = rutas.length - registros.length
  if (saltadas > 0) {
    console.log(`⚠️  ${saltadas} rutas saltadas (sin modalidad o dificultad válidos)`)
  }

  if (isDryRun) {
    console.log(`\n✅ ${registros.length} rutas listas para insertar`)
    console.log('\nEjemplo — primera ruta transformada:')
    console.log(JSON.stringify(registros[0], null, 2))
    if (warnings.length > 0) {
      console.log(`\nAdvertencias (${warnings.length}):`)
      warnings.slice(0, 10).forEach((w) => console.log(`  - ${w}`))
      if (warnings.length > 10) console.log(`  ... y ${warnings.length - 10} más`)
    }
    return
  }

  // Insert
  let totalOk = 0
  const totalFailed: string[] = []

  console.log(`🔄 Insertando ${registros.length} rutas en lotes de ${BATCH_SIZE}...`)

  for (let i = 0; i < registros.length; i += BATCH_SIZE) {
    const batch = registros.slice(i, i + BATCH_SIZE)
    const { ok, failed } = await insertBatch(supabase, batch)
    totalOk += ok
    totalFailed.push(...failed)

    const pct = Math.min(100, Math.round(((i + batch.length) / registros.length) * 100))
    process.stdout.write(
      `\r   ${pct}% — ${Math.min(i + BATCH_SIZE, registros.length)}/${registros.length} procesadas`
    )
  }

  console.log('\n')
  console.log(`✅ Completado: ${totalOk} insertadas | ${totalFailed.length} errores`)

  if (warnings.length > 0) {
    console.log(`\n⚠️  Advertencias (${warnings.length}):`)
    warnings.forEach((w) => console.log(`  - ${w}`))
  }

  if (totalFailed.length > 0) {
    console.log(`\n❌ Errores (${totalFailed.length}):`)
    totalFailed.forEach((e) => console.log(`  - ${e}`))
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error('\n❌ Error fatal:', err)
  process.exit(1)
})
```

---

## Task 3: Dry run — verificar parsing sin insertar

**Files:** ninguno nuevo

- [ ] **Paso 1: Ejecutar en modo dry run**

```powershell
Set-Location "C:\Users\ccash\Documents\Claude\Projects\RutasEspaña"
npx tsx scripts/migrate-xml.ts --dry
```

Resultado esperado:
```
Rutas de España — Migración WordPress → Supabase
==================================================
🔍 MODO DRY RUN (sin inserción)

📂 Leyendo XML... 1225 rutas encontradas
✅ 1225 rutas listas para insertar

Ejemplo — primera ruta transformada:
{
  "slug": "ruta-del-cares",
  "titulo": "Ruta del Cares",
  "publicada": true,
  "modalidad": "senderismo",
  ...
}
```

Si hay errores de TypeScript o de parsing, corregirlos antes de continuar.

---

## Task 4: Migración completa

**Files:** ninguno nuevo

> Ejecutar SOLO si el dry run fue exitoso (>= 1.000 rutas encontradas y primera ruta con datos correctos).

- [ ] **Paso 1: Ejecutar la migración completa**

```powershell
Set-Location "C:\Users\ccash\Documents\Claude\Projects\RutasEspaña"
npx tsx scripts/migrate-xml.ts
```

Resultado esperado (puede tardar 2-3 minutos):
```
Rutas de España — Migración WordPress → Supabase
==================================================
📂 Leyendo XML... 1225 rutas encontradas
🔄 Insertando 1225 rutas en lotes de 50...
   100% — 1225/1225 procesadas

✅ Completado: XXXX insertadas | YY errores
```

Si hay errores individuales (slugs duplicados, etc.), son esperables en pequeña cantidad y se listan al final.

- [ ] **Paso 2: Verificar en Supabase Table Editor**

En el panel de Supabase → **Table Editor** → tabla `Ruta` → verificar que hay filas y que los campos se ven correctos.

---

## Task 5: Commit

**Files:** scripts/migrate-xml.ts, package.json, package-lock.json

- [ ] **Paso 1: Añadir archivos y commitear**

```powershell
Set-Location "C:\Users\ccash\Documents\Claude\Projects\RutasEspaña"
git add scripts/migrate-xml.ts package.json package-lock.json
git commit -m "Añade script de migración WordPress XML → Supabase (1.225 rutas)"
```

Resultado esperado: commit creado con los 3 archivos.
