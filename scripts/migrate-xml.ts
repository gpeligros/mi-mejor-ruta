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
  encoded?: unknown // content:encoded tras removeNSPrefix
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
  'guipuzcoa': 'gipuzkoa',
  'lerida': 'lleida',
  'orense': 'ourense',
  'region-de-murcia': 'murcia',
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

function getEncoded(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.find((v) => typeof v === 'string' && v.trim()) ?? ''
  if (typeof val === 'object') return String((val as Record<string, unknown>)['#text'] ?? '')
  return String(val)
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200)
}

function slugifyProvincia(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
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
    case '4x4':        return '4x4'
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

// ─── Extracción de borradores (desde content:encoded) ────────────────────────

function extractModalidadFromContent(content: string): string | null {
  const lower = content.toLowerCase()
  if (lower.includes('ruta en moto')) return 'moto'
  if (lower.includes('ruta en bici')) return 'bici'
  if (lower.includes('senderismo') || lower.includes('ruta de senderismo')) return 'senderismo'
  if (lower.includes('4x4') || lower.includes('todoterreno')) return '4x4'
  return null
}

function extractProvinciaSlugFromContent(content: string): string | null {
  const match = content.match(/en la provincia de ([^.,\n]+)[.,\n]/i)
  if (!match?.[1]) return null
  return slugifyProvincia(match[1].trim())
}

function extractProvinciaSlugFromTitle(title: string): string | null {
  const parts = title.split(' - ')
  if (parts.length < 2) return null
  const last = parts[parts.length - 1]
  return last ? slugifyProvincia(last.trim()) : null
}

// ─── Transformación WP → Supabase ─────────────────────────────────────────────

function transform(
  item: WpItem,
  warnings: string[],
  seenSlugs: Set<string>
): RutaInsert | null {
  const titulo = toStr(item.title) ?? 'Sin titulo'
  const publicada = item.status === 'publish'

  const { modalidad: mSlug, dificultad: dSlug, provincia: pSlug } = getTaxonomies(
    item.category ?? []
  )

  let modalidad = normalizeModalidad(mSlug)
  let dificultad = normalizeDificultad(dSlug)
  let provinciaSlug = pSlug

  let slug = item.post_name

  if (!slug) {
    // Borrador sin slug: extraer datos de content:encoded
    const contentText = getEncoded(item.encoded)
    if (!contentText) return null

    if (!modalidad) {
      modalidad = extractModalidadFromContent(contentText)
    }
    if (!modalidad) {
      warnings.push(`"${titulo}": no se pudo extraer modalidad del contenido`)
      return null
    }

    if (!dificultad) {
      dificultad = 'moderada'
    }

    if (!provinciaSlug) {
      const fromContent = extractProvinciaSlugFromContent(contentText)
      const fromTitle = extractProvinciaSlugFromTitle(titulo)
      provinciaSlug = fromContent ?? fromTitle ?? undefined
    }

    slug = slugifyTitle(titulo)
    if (!slug) return null

    // Deduplicar slug
    if (seenSlugs.has(slug)) {
      let counter = 2
      while (seenSlugs.has(`${slug}-${counter}`)) counter++
      slug = `${slug}-${counter}`
    }
  }

  seenSlugs.add(slug)

  if (!modalidad || !dificultad) {
    warnings.push(`${slug}: sin modalidad (${mSlug}) o dificultad (${dSlug})`)
    return null
  }

  const provincia = normalizeProvincia(provinciaSlug)
  if (provincia === 'desconocida') {
    warnings.push(`${slug}: provincia desconocida (${provinciaSlug}), se guarda como 'desconocida'`)
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

  console.log('\nMi Mejor Ruta - Migracion WordPress -> Supabase')
  console.log('='.repeat(50))
  if (isDryRun) console.log('MODO DRY RUN (sin insercion)\n')

  // Supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Faltan variables de entorno. Asegurate de tener .env.local con:\n' +
        '  NEXT_PUBLIC_SUPABASE_URL\n' +
        '  SUPABASE_SERVICE_ROLE_KEY'
    )
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  })

  // Parse XML
  process.stdout.write('Leyendo XML... ')
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
  const seenSlugs = new Set<string>()
  const registros = rutas
    .map((item) => transform(item, warnings, seenSlugs))
    .filter((r): r is RutaInsert => r !== null)

  const saltadas = rutas.length - registros.length
  if (saltadas > 0) {
    console.log(`  ${saltadas} rutas saltadas (sin datos suficientes)`)
  }
  console.log(`  ${registros.length} rutas listas para insertar`)

  if (isDryRun) {
    console.log('\nEjemplo - primera ruta transformada:')
    console.log(JSON.stringify(registros[0], null, 2))
    if (warnings.length > 0) {
      console.log(`\nAdvertencias (${warnings.length}):`)
      warnings.slice(0, 20).forEach((w) => console.log(`  - ${w}`))
      if (warnings.length > 20) console.log(`  ... y ${warnings.length - 20} mas`)
    }
    return
  }

  // Insert
  let totalOk = 0
  const totalFailed: string[] = []

  console.log(`\nInsertando ${registros.length} rutas en lotes de ${BATCH_SIZE}...`)

  for (let i = 0; i < registros.length; i += BATCH_SIZE) {
    const batch = registros.slice(i, i + BATCH_SIZE)
    const { ok, failed } = await insertBatch(supabase, batch)
    totalOk += ok
    totalFailed.push(...failed)

    const pct = Math.min(100, Math.round(((i + batch.length) / registros.length) * 100))
    process.stdout.write(
      `\r   ${pct}% - ${Math.min(i + BATCH_SIZE, registros.length)}/${registros.length} procesadas`
    )
  }

  console.log('\n')
  console.log(`Completado: ${totalOk} insertadas | ${totalFailed.length} errores`)

  if (warnings.length > 0) {
    console.log(`\nAdvertencias (${warnings.length}):`)
    warnings.forEach((w) => console.log(`  - ${w}`))
  }

  if (totalFailed.length > 0) {
    console.log(`\nErrores (${totalFailed.length}):`)
    totalFailed.forEach((e) => console.log(`  - ${e}`))
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error('\nError fatal:', err)
  process.exit(1)
})
