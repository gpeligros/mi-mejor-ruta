// Paso 1 de la migración: EXPORTAR.
// Lee el XML de WordPress (WXR) y saca TODAS las rutas (post_type=ruta),
// publicadas o no, tal cual están en origen, a un JSON intermedio.
//
// No transforma, no valida, no decide nada todavía — solo copia lo que hay,
// para que el paso de validación (validar-rutas.ts) trabaje siempre sobre
// los mismos datos de partida y el proceso sea repetible.
//
// WordPress NO se toca en ningún momento: esto es una lectura del fichero
// de exportación, no una conexión a la base de datos de WordPress.

import { XMLParser } from 'fast-xml-parser'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

type WpCategory = { domain: string; nicename: string; '#text': string }
type WpMeta = { meta_key: string; meta_value: string }
type WpItem = {
  title: unknown
  post_name: string
  status: string
  post_type: string
  post_id?: unknown
  creator?: unknown
  category?: WpCategory[]
  postmeta?: WpMeta[]
  encoded?: unknown
}

function toStr(val: unknown): string {
  if (val === undefined || val === null) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') return String((val as Record<string, unknown>)['#text'] ?? '')
  return String(val)
}

function getEncoded(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.find((v) => typeof v === 'string' && v.trim()) ?? ''
  if (typeof val === 'object') return String((val as Record<string, unknown>)['#text'] ?? '')
  return String(val)
}

function getMetas(postmeta: WpMeta[]): Record<string, string> {
  const result: Record<string, string> = {}
  const SKIP_PREFIXES = ['_', 'elementor', 'ast-', 'site-', 'rank_math_facebook', 'rank_math_twitter']
  for (const m of postmeta) {
    const key = m.meta_key
    if (!key) continue
    if (SKIP_PREFIXES.some((p) => key.startsWith(p))) continue
    if (key in result) continue
    result[key] = String(m.meta_value ?? '')
  }
  return result
}

function getTaxonomias(categories: WpCategory[]) {
  const map: Record<string, string> = {}
  for (const cat of categories) {
    if (cat.domain && cat.nicename) map[cat.domain] = cat.nicename
  }
  return {
    modalidad: map['modalidad'] ?? null,
    dificultad: map['dificultad'] ?? null,
    provincia: map['provincia'] ?? null,
  }
}

async function main(): Promise<void> {
  const xmlPath = process.argv[2] ?? join(process.cwd(), 'rutasespaa.WordPress.2026-05-22.xml')
  const salidaPath = process.argv[3] ?? join(process.cwd(), 'exportacion-wordpress-rutas.json')

  console.log('Paso 1/3 — Exportar')
  console.log('='.repeat(50))
  process.stdout.write(`Leyendo ${xmlPath} ... `)
  const xml = readFileSync(xmlPath, 'utf-8')
  console.log('ok')

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    isArray: (name) => ['category', 'postmeta', 'item'].includes(name),
  })

  const parsed = parser.parse(xml) as { rss: { channel: { item: WpItem[] } } }
  const items = parsed.rss.channel.item ?? []
  const rutas = items.filter((i) => i.post_type === 'ruta')
  const adjuntos = items.filter((i) => i.post_type === 'attachment')

  console.log(`Total items en el XML: ${items.length}`)
  console.log(`  post_type=ruta: ${rutas.length}`)
  console.log(`  post_type=attachment: ${adjuntos.length}`)

  const exportadas = rutas.map((item) => {
    const taxonomias = getTaxonomias(item.category ?? [])
    const meta = getMetas(item.postmeta ?? [])
    return {
      wp_post_id: toStr(item.post_id) || null,
      wp_post_name: item.post_name || null,
      wp_status: item.status || null,
      wp_creator: toStr(item.creator) || null,
      titulo: toStr(item.title) || null,
      taxonomias,
      meta,
      contenido_html: getEncoded(item.encoded) || null,
    }
  })

  writeFileSync(salidaPath, JSON.stringify(exportadas, null, 2), 'utf-8')
  console.log(`\nExportado: ${exportadas.length} rutas -> ${salidaPath}`)
  console.log('WordPress no ha sido modificado (solo lectura del fichero de exportacion).')
}

main().catch((err: unknown) => {
  console.error('Error fatal en exportar-rutas:', err)
  process.exit(1)
})
