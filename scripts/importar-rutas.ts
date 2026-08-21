// Paso 3 de la migración: IMPORTAR.
// Lee las rutas ya validadas (rutas-validas-para-importar.json) y las
// inserta en la base de datos NUEVA (la del esquema en castellano). No
// toca WordPress en ningún momento — WordPress ni se conecta ni se lee
// aquí, solo se usa el JSON generado en el paso 1.
//
// Es repetible e idempotente: se puede ejecutar tantas veces como se
// quiera con el mismo fichero de entrada y NUNCA crea filas duplicadas.
// Cada ruta se identifica por su slug (único). Si la ruta ya existe:
//   - si los datos no han cambiado -> se registra como "sin_cambios"
//   - si algún dato ha cambiado    -> se actualiza y se registra como "actualizada"
// Si la ruta no existe todavía -> se crea y se registra como "importada".
// Cualquier fila que falle (p.ej. no encuentra la provincia) se registra
// como "error" y NO detiene el resto de la importación.
//
// Cada ejecución queda registrada en la tabla lotes_importacion, y cada
// fila procesada en importacion_borrador, con el dato original (JSON) tal
// cual llegó, para poder auditar o deshacer sin adivinar nada.

import { config } from 'dotenv'
config({ path: '.env.local' })

import { Client } from 'pg'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

type RutaValidada = {
  slug: string
  titulo: string
  modalidad: string
  dificultad: string
  provincia: string | null
  descripcion: string | null
  distancia_km: number | null
  desnivel_positivo: number | null
  desnivel_negativo: number | null
  altitud_minima: number | null
  altitud_maxima: number | null
  tipo_recorrido: string | null
  como_llegar: string | null
  transporte_publico: string | null
  equipamiento: string | null
  alojamiento_cercano: string | null
  zonas_camping: string | null
  archivo_gpx_url: string | null
  ecosistema: string | null
  epoca_nieve: string | null
  wp_post_id: string | null
}

type LogFila = {
  slug: string
  resultado: 'importada' | 'actualizada' | 'sin_cambios' | 'omitida' | 'error' | 'duplicada'
  detalle: string
}

function valoresIguales(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined) return b === null || b === undefined || b === ''
  if (b === null || b === undefined) return a === null || a === undefined || a === ''
  const na = Number(a)
  const nb = Number(b)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== '' && String(b).trim() !== '') {
    return na === nb
  }
  return String(a).trim() === String(b).trim()
}

const TIPO_RECORRIDO_MAP: Record<string, string> = {
  circular: 'circular', lineal: 'lineal', 'ida y vuelta': 'ida_vuelta', 'ida_vuelta': 'ida_vuelta',
}

async function main(): Promise<void> {
  const entradaPath = process.argv[2] ?? join(process.cwd(), 'rutas-validas-para-importar.json')
  const esSimulacro = process.argv.includes('--dry')

  console.log('Paso 3/3 — Importar')
  console.log('='.repeat(50))
  if (esSimulacro) console.log('MODO SIMULACRO (--dry): no se escribe nada en la base de datos\n')

  const rutas: RutaValidada[] = JSON.parse(readFileSync(entradaPath, 'utf-8'))
  console.log(`Rutas a procesar: ${rutas.length}`)

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('Falta DATABASE_URL en el entorno (.env.local o variable de entorno)')
  }

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  const log: LogFila[] = []
  const inicio = new Date()

  let loteId: number | null = null
  if (!esSimulacro) {
    const { rows } = await client.query(
      `insert into lotes_importacion (formato_origen, fichero_origen, filas_totales)
       values ('wordpress_xml', $1, $2) returning id`,
      [entradaPath, rutas.length]
    )
    loteId = rows[0].id
  }

  const { rows: fuenteRows } = await client.query(
    `select id from fuentes where tipo_fuente = 'migracion_wordpress' limit 1`
  )
  const fuenteId: number | null = fuenteRows[0]?.id ?? null

  for (const r of rutas) {
    try {
      const { rows: actRows } = await client.query('select id from actividades where slug=$1', [r.modalidad])
      if (actRows.length === 0) {
        log.push({ slug: r.slug, resultado: 'error', detalle: `actividad "${r.modalidad}" no existe en el catálogo` })
        continue
      }
      const actividadId = actRows[0].id

      const { rows: difRows } = await client.query('select id from niveles_dificultad where slug=$1', [r.dificultad])
      if (difRows.length === 0) {
        log.push({ slug: r.slug, resultado: 'error', detalle: `dificultad "${r.dificultad}" no existe en el catálogo` })
        continue
      }
      const dificultadId = difRows[0].id

      let provinciaId: number | null = null
      if (r.provincia) {
        const { rows: provRows } = await client.query('select id from provincias where slug=$1', [r.provincia])
        provinciaId = provRows[0]?.id ?? null
      }
      if (!provinciaId) {
        log.push({ slug: r.slug, resultado: 'error', detalle: 'sin provincia reconocida — pendiente de revisión manual, no importada' })
        continue
      }

      const tipoRecorrido = r.tipo_recorrido ? TIPO_RECORRIDO_MAP[r.tipo_recorrido.toLowerCase()] ?? null : null

      const { rows: existentes } = await client.query('select * from rutas where slug=$1', [r.slug])
      const existente = existentes[0]

      const valoresNuevos = {
        nombre: r.titulo,
        descripcion: r.descripcion,
        actividad_id: actividadId,
        provincia_id: provinciaId,
        dificultad_general_id: dificultadId,
        tipo_recorrido: tipoRecorrido,
        distancia_km: r.distancia_km,
        desnivel_positivo: r.desnivel_positivo,
        desnivel_negativo: r.desnivel_negativo,
        altitud_minima: r.altitud_minima,
        altitud_maxima: r.altitud_maxima,
        como_llegar: r.como_llegar,
        transporte_publico: r.transporte_publico,
        equipamiento: r.equipamiento,
        alojamiento_cercano: r.alojamiento_cercano,
        zonas_camping: r.zonas_camping,
        fuente_id: fuenteId,
        publicada: true,
      }

      if (esSimulacro) {
        log.push({ slug: r.slug, resultado: existente ? 'actualizada' : 'importada', detalle: '(simulacro, sin escritura)' })
        continue
      }

      let rutaId: number
      if (!existente) {
        const columnas = Object.keys(valoresNuevos)
        const marcadores = columnas.map((_, i) => `$${i + 2}`)
        const { rows: insertadas } = await client.query(
          `insert into rutas (slug, ${columnas.join(', ')}) values ($1, ${marcadores.join(', ')}) returning id`,
          [r.slug, ...Object.values(valoresNuevos)]
        )
        rutaId = insertadas[0].id
        log.push({ slug: r.slug, resultado: 'importada', detalle: `ruta creada (id=${rutaId})` })
      } else {
        rutaId = existente.id
        const cambios = Object.entries(valoresNuevos).filter(
          ([campo, valor]) => !valoresIguales(existente[campo], valor)
        )
        if (cambios.length === 0) {
          log.push({ slug: r.slug, resultado: 'sin_cambios', detalle: `ruta ya importada (id=${rutaId}), sin diferencias` })
        } else {
          const asignaciones = cambios.map(([campo], i) => `${campo} = $${i + 2}`)
          await client.query(
            `update rutas set ${asignaciones.join(', ')} where id = $1`,
            [rutaId, ...cambios.map(([, v]) => v)]
          )
          log.push({
            slug: r.slug, resultado: 'actualizada',
            detalle: `campos cambiados: ${cambios.map(([c]) => c).join(', ')}`,
          })
        }
      }

      // Ecosistema/epoca_nieve -> extension senderismo (upsert 1:1)
      if (r.modalidad === 'senderismo' && (r.ecosistema || r.epoca_nieve)) {
        await client.query(
          `insert into rutas_senderismo (ruta_id, ecosistema, epoca_nieve)
           values ($1, $2, $3)
           on conflict (ruta_id) do update set ecosistema = excluded.ecosistema, epoca_nieve = excluded.epoca_nieve`,
          [rutaId, r.ecosistema, r.epoca_nieve]
        )
      }

      // GPX: solo si tenemos una URL real (los 62 valores rotos ya se
      // descartaron en la validación y quedaron como advertencia).
      if (r.archivo_gpx_url) {
        await client.query(
          `insert into tracks_gpx (ruta_id, url_archivo, version)
           values ($1, $2, 1)
           on conflict (ruta_id, version) do update set url_archivo = excluded.url_archivo`,
          [rutaId, r.archivo_gpx_url]
        )
      }

      // Trazabilidad: registro del dato origen sin transformar
      if (loteId) {
        await client.query(
          `insert into importacion_borrador (lote_importacion_id, datos_originales, ruta_asociada_id, estado_validacion)
           values ($1, $2, $3, 'importado')`,
          [loteId, JSON.stringify(r), rutaId]
        )
      }
    } catch (err) {
      log.push({ slug: r.slug, resultado: 'error', detalle: err instanceof Error ? err.message : String(err) })
    }
  }

  const resumen = { importada: 0, actualizada: 0, sin_cambios: 0, omitida: 0, error: 0, duplicada: 0 }
  for (const l of log) resumen[l.resultado]++

  if (!esSimulacro && loteId) {
    await client.query(
      `update lotes_importacion set finalizado_en = now(), filas_importadas = $2, filas_omitidas = $3 where id = $1`,
      [loteId, resumen.importada + resumen.actualizada + resumen.sin_cambios, resumen.omitida + resumen.error]
    )
  }

  const logPath = join(process.cwd(), `registro-importacion-${inicio.toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(logPath, JSON.stringify({ inicio, lote_id: loteId, resumen, detalle: log }, null, 2), 'utf-8')

  console.log('\nResumen:')
  console.log(`  Importadas (nuevas):   ${resumen.importada}`)
  console.log(`  Actualizadas:          ${resumen.actualizada}`)
  console.log(`  Sin cambios:           ${resumen.sin_cambios}`)
  console.log(`  Omitidas:              ${resumen.omitida}`)
  console.log(`  Errores:               ${resumen.error}`)
  console.log(`\nRegistro detallado -> ${logPath}`)

  await client.end()
}

main().catch((err: unknown) => {
  console.error('Error fatal en importar-rutas:', err)
  process.exit(1)
})
