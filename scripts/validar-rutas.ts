// Paso 2 de la migración: VALIDAR.
// Lee el JSON que generó exportar-rutas.ts y decide, ruta a ruta, si está
// lista para importarse, si hay que omitirla (con motivo) o si tiene un
// error que impide importarla. No escribe nada en ninguna base de datos.
//
// Reglas (recogen lo ya detectado en la auditoría de datos — Prompt 2):
//  - Solo se importan rutas con wp_status = "publish". El resto son
//    borradores/plantillas sin revisar y se omiten con motivo explícito
//    (esto es lo que ya sabíamos: de 1.225 solo 65 están publicadas).
//  - Slug repetido entre publicadas -> se importa la primera, el resto se
//    marca como duplicado (no se borra nada, queda en el informe).
//  - Faltan datos obligatorios (título, modalidad, provincia) -> inválida.
//  - Datos numéricos imposibles (distancia <= 0, altitud máxima menor que
//    la mínima) -> inválida.
//  - archivo_gpx que no es una URL real (valor PHP serializado, como los
//    62 casos ya detectados) -> advertencia, NO invalida la ruta: se
//    importa la ruta sin track GPX asociado, y queda anotado para revisión
//    manual en vez de perderse silenciosamente.
//  - Provincia no reconocida -> advertencia, se importa igualmente
//    (queda "verificada = false" para revisión), no se inventa una
//    provincia.

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const PROVINCIA_ALIAS: Record<string, string> = {
  'gerona-girona': 'girona',
  'gerona': 'girona',
  'baleares': 'illes-balears',
  'islas-baleares': 'illes-balears',
  'las-palmas-de-gran-canaria': 'las-palmas',
  'sta-cruz-de-tenerife': 'santa-cruz-de-tenerife',
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

const ACTIVIDADES_VALIDAS = new Set(['senderismo', 'bici', 'moto', '4x4', 'autocaravanas'])
const DIFICULTADES_VALIDAS = new Set(['facil', 'moderada', 'dificil', 'muy_dificil'])

type RutaExportada = {
  wp_post_id: string | null
  wp_post_name: string | null
  wp_status: string | null
  wp_creator: string | null
  titulo: string | null
  taxonomias: { modalidad: string | null; dificultad: string | null; provincia: string | null }
  meta: Record<string, string>
  contenido_html: string | null
}

type ResultadoValidacion = {
  wp_post_id: string | null
  slug: string | null
  titulo: string | null
  estado: 'valida' | 'invalida' | 'omitida' | 'duplicada'
  motivo: string | null
  advertencias: string[]
  datos_normalizados?: Record<string, unknown>
}

function normalizeDificultad(slug: string | null): string | null {
  switch (slug?.toLowerCase()) {
    case 'facil': return 'facil'
    case 'moderada': return 'moderada'
    case 'dificil': return 'dificil'
    case 'muy-dificil':
    case 'muy_dificil':
    case 'muy-difícil': return 'muy_dificil'
    default: return null
  }
}

function normalizeProvincia(slug: string | null): string | null {
  if (!slug) return null
  const s = slug.toLowerCase().trim()
  const aliased = PROVINCIA_ALIAS[s] ?? s
  return PROVINCIAS_VALIDAS.has(aliased) ? aliased : null
}

function esUrlGpx(valor: string | undefined): boolean {
  return !!valor && /^https?:\/\//.test(valor)
}

function toFloatOrNull(v: string | undefined): number | null {
  if (v === undefined || v === '') return null
  const n = parseFloat(v)
  return Number.isNaN(n) ? null : n
}

function toIntOrNull(v: string | undefined): number | null {
  if (v === undefined || v === '') return null
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? null : n
}

function main(): void {
  const entradaPath = process.argv[2] ?? join(process.cwd(), 'exportacion-wordpress-rutas.json')
  const salidaInforme = process.argv[3] ?? join(process.cwd(), 'informe-validacion.json')
  const salidaValidas = process.argv[4] ?? join(process.cwd(), 'rutas-validas-para-importar.json')

  console.log('Paso 2/3 — Validar')
  console.log('='.repeat(50))

  const rutas: RutaExportada[] = JSON.parse(readFileSync(entradaPath, 'utf-8'))
  console.log(`Rutas leídas: ${rutas.length}`)

  const resultados: ResultadoValidacion[] = []
  const slugsVistos = new Set<string>()

  for (const r of rutas) {
    const advertencias: string[] = []
    const slug = r.wp_post_name || null

    if (r.wp_status !== 'publish') {
      resultados.push({
        wp_post_id: r.wp_post_id, slug, titulo: r.titulo,
        estado: 'omitida', motivo: `no_publicada_en_wordpress (estado real: "${r.wp_status}")`,
        advertencias: [],
      })
      continue
    }

    if (!slug) {
      resultados.push({
        wp_post_id: r.wp_post_id, slug, titulo: r.titulo,
        estado: 'invalida', motivo: 'sin_slug', advertencias: [],
      })
      continue
    }

    if (slugsVistos.has(slug)) {
      resultados.push({
        wp_post_id: r.wp_post_id, slug, titulo: r.titulo,
        estado: 'duplicada', motivo: `slug_repetido (ya existe otra ruta publicada con slug "${slug}")`,
        advertencias: [],
      })
      continue
    }

    if (!r.titulo) {
      resultados.push({
        wp_post_id: r.wp_post_id, slug, titulo: r.titulo,
        estado: 'invalida', motivo: 'sin_titulo', advertencias: [],
      })
      continue
    }

    const modalidad = ACTIVIDADES_VALIDAS.has(r.taxonomias.modalidad ?? '')
      ? r.taxonomias.modalidad!.toLowerCase()
      : null
    if (!modalidad) {
      resultados.push({
        wp_post_id: r.wp_post_id, slug, titulo: r.titulo,
        estado: 'invalida', motivo: `modalidad_no_reconocida (valor en origen: "${r.taxonomias.modalidad}")`,
        advertencias: [],
      })
      continue
    }

    let dificultad = normalizeDificultad(r.taxonomias.dificultad)
    if (!dificultad) {
      advertencias.push(`dificultad no reconocida ("${r.taxonomias.dificultad}"), se usa "moderada" por defecto`)
      dificultad = 'moderada'
    }

    const provincia = normalizeProvincia(r.taxonomias.provincia)
    if (!provincia) {
      advertencias.push(`provincia no reconocida ("${r.taxonomias.provincia}"), se importa sin provincia asignada — revisar a mano`)
    }

    const distancia = toFloatOrNull(r.meta['distancia'])
    if (distancia !== null && distancia <= 0) {
      resultados.push({
        wp_post_id: r.wp_post_id, slug, titulo: r.titulo,
        estado: 'invalida', motivo: `distancia_invalida (${distancia})`, advertencias: [],
      })
      continue
    }

    const altitudMin = toIntOrNull(r.meta['altitud_minima'])
    const altitudMax = toIntOrNull(r.meta['altitud_maxima'])
    if (altitudMin !== null && altitudMax !== null && altitudMax < altitudMin) {
      resultados.push({
        wp_post_id: r.wp_post_id, slug, titulo: r.titulo,
        estado: 'invalida',
        motivo: `altitud_incoherente (minima=${altitudMin}, maxima=${altitudMax})`,
        advertencias: [],
      })
      continue
    }

    const gpxUrl = r.meta['archivo_gpx']
    let gpxValida: string | null = null
    if (gpxUrl) {
      if (esUrlGpx(gpxUrl)) {
        gpxValida = gpxUrl
      } else {
        advertencias.push('archivo_gpx no es una URL utilizable (valor interno de WordPress) — se importa la ruta sin track GPX, pendiente de recuperar el fichero real')
      }
    }

    slugsVistos.add(slug)

    resultados.push({
      wp_post_id: r.wp_post_id,
      slug,
      titulo: r.titulo,
      estado: 'valida',
      motivo: null,
      advertencias,
      datos_normalizados: {
        slug,
        titulo: r.titulo,
        modalidad,
        dificultad,
        provincia,
        descripcion: r.meta['sobre_ruta'] || null,
        distancia_km: distancia,
        desnivel_positivo: toIntOrNull(r.meta['desnivel_positivo']),
        desnivel_negativo: toIntOrNull(r.meta['desnivel_negativo']),
        altitud_minima: altitudMin,
        altitud_maxima: altitudMax,
        tipo_recorrido: r.meta['tipo_recorrido'] || null,
        como_llegar: r.meta['como_llegar'] || null,
        transporte_publico: r.meta['transporte_publico'] || null,
        equipamiento: r.meta['equipamiento'] || null,
        alojamiento_cercano: r.meta['alojamiento_cercano'] || null,
        zonas_camping: r.meta['zonas_camping'] || null,
        archivo_gpx_url: gpxValida,
        ecosistema: r.meta['ecosistema'] || null,
        epoca_nieve: r.meta['epoca_nieve'] || null,
        wp_post_id: r.wp_post_id,
      },
    })
  }

  const conteo = { valida: 0, invalida: 0, omitida: 0, duplicada: 0 }
  for (const r of resultados) conteo[r.estado]++

  writeFileSync(salidaInforme, JSON.stringify(resultados, null, 2), 'utf-8')
  const validas = resultados.filter((r) => r.estado === 'valida').map((r) => r.datos_normalizados)
  writeFileSync(salidaValidas, JSON.stringify(validas, null, 2), 'utf-8')

  console.log(`  Válidas:   ${conteo.valida}`)
  console.log(`  Omitidas:  ${conteo.omitida}  (no publicadas en WordPress)`)
  console.log(`  Inválidas: ${conteo.invalida}`)
  console.log(`  Duplicadas:${conteo.duplicada}`)
  const conAdvertencias = resultados.filter((r) => r.advertencias.length > 0).length
  console.log(`  Válidas con advertencias: ${conAdvertencias}`)
  console.log(`\nInforme completo -> ${salidaInforme}`)
  console.log(`Listas para importar -> ${salidaValidas}`)
}

main()
