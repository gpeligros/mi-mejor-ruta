// lib/rutas.ts
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { compararTexto, normalizarTexto, puntuarRelevancia } from './busqueda'
import {
  DIFICULTAD_LABELS,
  DIFICULTAD_ORDEN,
  MODALIDAD_LABELS,
  PROVINCIA_LABELS,
  PER_PAGE,
  calcularFacetaGenerica,
  calcularFacetaMeses,
  calcularRango,
  distanciaKm,
  parsearCoordenadas,
  type FiltrosRutas,
  type OpcionFaceta,
  type OrdenRutas,
} from './filtrosRutas'

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
    .eq('publicada', true)
    .order('valoracion', { ascending: false, nullsFirst: false })
    .range(from, to)
  if (error) throw new Error(error.message)
  return { rutas: data ?? [], total: count ?? 0 }
}

export const getRutaBySlug = cache(async (slug: string): Promise<RutaDetalle | null> => {
  const { data, error } = await supabase
    .from('Ruta')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data as RutaDetalle
})

export async function getPublishedSlugs(): Promise<{ slug: string }[]> {
  const { data, error } = await supabase
    .from('Ruta')
    .select('slug')
    .eq('publicada', true)
  if (error) throw new Error(error.message)
  return data ?? []
}

// ═════════════════════════════════════════════════════════════════════════
// BUSCADOR Y FILTROS (Prompt 5)
// ═════════════════════════════════════════════════════════════════════════
//
// Solo se construyen filtros y facetas sobre columnas que existen de verdad
// hoy en la tabla "Ruta" de producción. No hay "municipio", "parque" ni
// código GR/PR/SL en esta tabla (ver docs/mapeo-wordpress-nueva-base-datos.md),
// así que ni el buscador ni los filtros pueden ofrecerlos todavía. Tampoco
// hay características en forma de etiqueta (agua/perros/cascadas...) — son
// campos de texto libre, no un booleano por ruta — así que los "filtros P2"
// se quedan sin ninguna opción disponible por ahora (ver PanelFiltros.tsx).

export type RutaResumenBusqueda = RutaResumen & {
  tipo_recorrido: string | null
  mejor_epoca: string | null
  coordenadas_parking: string | null
  duracion_horas: number | null
  duracion_minutos: number | null
}

export type Facetas = {
  modalidad: OpcionFaceta[]
  provincia: OpcionFaceta[]
  dificultad: OpcionFaceta[]
  tipoRecorrido: OpcionFaceta[]
  mejorEpoca: OpcionFaceta[]
  rangoDistancia: [number, number] | null
  rangoDuracionMinutos: [number, number] | null
  rangoDesnivel: [number, number] | null
  totalPublicadas: number
}

type FilaFaceta = {
  modalidad: string | null
  provincia: string | null
  dificultad: string | null
  tipo_recorrido: string | null
  mejor_epoca: string | null
  distancia: number | null
  duracion_horas: number | null
  duracion_minutos: number | null
  desnivel_positivo: number | null
}

const FACETAS_FIELDS =
  'modalidad,provincia,dificultad,tipo_recorrido,mejor_epoca,distancia,duracion_horas,duracion_minutos,desnivel_positivo'

// Los valores crudos reales (p.ej. "Lineal" con mayúscula) que hay que usar
// para filtrar en la base de datos por cada opción de tipo de recorrido, se
// calculan junto con la faceta pero no se exponen al cliente — se guardan
// aparte en memoria del proceso porque unstable_cache solo puede devolver
// datos serializables sencillos y esto solo se usa en el servidor.
let ultimoTipoRecorridoValoresCrudos: Record<string, string[]> = {}

async function calcularFacetasSinCache(): Promise<Facetas> {
  const { data, error } = await supabase
    .from('Ruta')
    .select(FACETAS_FIELDS)
    .eq('publicada', true)
  if (error) throw new Error(error.message)
  const filas = (data ?? []) as FilaFaceta[]

  const modalidad = calcularFacetaGenerica(filas.map((f) => f.modalidad), MODALIDAD_LABELS)
  const provincia = calcularFacetaGenerica(filas.map((f) => f.provincia), PROVINCIA_LABELS)
  const dificultad = calcularFacetaGenerica(filas.map((f) => f.dificultad), DIFICULTAD_LABELS)
  const tipoRecorrido = calcularFacetaGenerica(filas.map((f) => f.tipo_recorrido))
  ultimoTipoRecorridoValoresCrudos = tipoRecorrido.valoresCrudosPorSlug

  const mejorEpoca = calcularFacetaMeses(filas.map((f) => f.mejor_epoca))
  const rangoDistancia = calcularRango(filas.map((f) => f.distancia))
  const rangoDuracionMinutos = calcularRango(
    filas.map((f) =>
      f.duracion_horas !== null && f.duracion_minutos !== null
        ? f.duracion_horas * 60 + f.duracion_minutos
        : null
    )
  )
  const rangoDesnivel = calcularRango(filas.map((f) => f.desnivel_positivo))

  return {
    modalidad: modalidad.opciones,
    provincia: provincia.opciones,
    dificultad: dificultad.opciones,
    tipoRecorrido: tipoRecorrido.opciones,
    mejorEpoca,
    rangoDistancia,
    rangoDuracionMinutos,
    rangoDesnivel,
    totalPublicadas: filas.length,
  }
}

// Facetas cacheadas 5 minutos: evita recalcularlas en cada visita, pero se
// mantienen razonablemente al día. A este volumen de datos (unas pocas
// decenas de rutas publicadas) el coste de recalcularlas es mínimo.
export const obtenerFacetas = unstable_cache(calcularFacetasSinCache, ['facetas-rutas'], {
  revalidate: 300,
})

function totalMinutos(r: { duracion_horas: number | null; duracion_minutos: number | null }): number | null {
  if (r.duracion_horas === null && r.duracion_minutos === null) return null
  return (r.duracion_horas ?? 0) * 60 + (r.duracion_minutos ?? 0)
}

function aplicarOrdenEnMemoria(
  rutas: RutaResumenBusqueda[],
  orden: OrdenRutas,
  lat: number | null,
  lng: number | null
): RutaResumenBusqueda[] {
  const copia = [...rutas]
  switch (orden) {
    case 'distancia_asc':
      return copia.sort((a, b) => (a.distancia ?? Infinity) - (b.distancia ?? Infinity))
    case 'distancia_desc':
      return copia.sort((a, b) => (b.distancia ?? -Infinity) - (a.distancia ?? -Infinity))
    case 'duracion_asc':
      return copia.sort((a, b) => (totalMinutos(a) ?? Infinity) - (totalMinutos(b) ?? Infinity))
    case 'duracion_desc':
      return copia.sort((a, b) => (totalMinutos(b) ?? -Infinity) - (totalMinutos(a) ?? -Infinity))
    case 'dificultad_asc':
      return copia.sort(
        (a, b) => (DIFICULTAD_ORDEN[a.dificultad] ?? 99) - (DIFICULTAD_ORDEN[b.dificultad] ?? 99)
      )
    case 'dificultad_desc':
      return copia.sort(
        (a, b) => (DIFICULTAD_ORDEN[b.dificultad] ?? -1) - (DIFICULTAD_ORDEN[a.dificultad] ?? -1)
      )
    case 'valoracion_desc':
      return copia.sort((a, b) => (b.valoracion ?? -1) - (a.valoracion ?? -1))
    case 'cercania': {
      if (lat === null || lng === null) return copia
      return copia.sort((a, b) => {
        const ca = parsearCoordenadas(a.coordenadas_parking)
        const cb = parsearCoordenadas(b.coordenadas_parking)
        const da = ca ? distanciaKm(lat, lng, ca[0], ca[1]) : Infinity
        const db = cb ? distanciaKm(lat, lng, cb[0], cb[1]) : Infinity
        return da - db
      })
    }
    case 'relevancia':
    default:
      return copia.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))
  }
}

export type ResultadoBusqueda = {
  rutas: RutaResumenBusqueda[]
  total: number
  facetas: Facetas
}

const RESUMEN_FIELDS_BUSQUEDA =
  'id,slug,titulo,provincia,modalidad,dificultad,distancia,duracion,desnivel_positivo,valoracion,total_valoraciones,publicada,tipo_recorrido,mejor_epoca,coordenadas_parking,duracion_horas,duracion_minutos'

// Por encima de este número de filas candidatas, se deja de intentar
// filtrar/ordenar en memoria (ver nota de escala en lib/busqueda.ts) — hoy
// no se llega ni de lejos a este límite.
const LIMITE_CANDIDATAS_EN_MEMORIA = 2000

// Estos filtros no se pueden expresar como una comparación simple de una
// columna (texto libre, dos columnas partidas, orden que no es alfabético)
// — se resuelven trayendo un conjunto acotado de candidatas y
// filtrando/ordenando en el servidor de Next.js. Ver nota de escala.
function necesitaMemoria(filtros: FiltrosRutas): boolean {
  return (
    !!filtros.q ||
    filtros.tipoRecorrido.length > 0 ||
    filtros.mejorEpoca.length > 0 ||
    filtros.duracionMin !== null ||
    filtros.duracionMax !== null ||
    filtros.orden === 'cercania' ||
    filtros.orden === 'dificultad_asc' ||
    filtros.orden === 'dificultad_desc'
  )
}

// Filtros que sí son una comparación directa de columna — comunes a
// buscarRutas() y a obtenerCoordenadasFiltradas(), para que el mapa refleje
// EXACTAMENTE los mismos filtros que la lista, sin duplicar la lógica.
// El tipo exacto del query builder de Supabase (PostgrestFilterBuilder con
// sus genéricos encadenados) es engorroso de expresar aquí sin aportar
// seguridad real, ya que esta función solo encadena .eq/.in/.gte/.lte de
// forma condicional — se usa `any` deliberadamente, acotado a esta función.
function aplicarFiltrosDeColumna(query: any, filtros: FiltrosRutas) {
  let q = query.eq('publicada', true)
  if (filtros.modalidad.length) q = q.in('modalidad', filtros.modalidad)
  if (filtros.provincia.length) q = q.in('provincia', filtros.provincia)
  if (filtros.dificultad.length) q = q.in('dificultad', filtros.dificultad)
  if (filtros.distanciaMin !== null) q = q.gte('distancia', filtros.distanciaMin)
  if (filtros.distanciaMax !== null) q = q.lte('distancia', filtros.distanciaMax)
  if (filtros.desnivelMin !== null) q = q.gte('desnivel_positivo', filtros.desnivelMin)
  if (filtros.desnivelMax !== null) q = q.lte('desnivel_positivo', filtros.desnivelMax)
  return q
}

// Filtros que no son una comparación directa de columna (texto libre, tipo
// de recorrido con mayúsculas inconsistentes, duración partida en dos
// columnas) — se aplican en memoria, sobre lo que ya haya devuelto la
// consulta anterior. También compartido entre buscarRutas() y
// obtenerCoordenadasFiltradas().
function aplicarFiltrosEnMemoria<T extends {
  tipo_recorrido: string | null
  mejor_epoca: string | null
  duracion_horas: number | null
  duracion_minutos: number | null
  titulo: string
  provincia: string
}>(candidatas: T[], filtros: FiltrosRutas): T[] {
  let resultado = candidatas

  if (filtros.tipoRecorrido.length) {
    const crudosValidos = new Set(
      filtros.tipoRecorrido.flatMap((slug) => ultimoTipoRecorridoValoresCrudos[slug] ?? [])
    )
    resultado = resultado.filter((r) => r.tipo_recorrido !== null && crudosValidos.has(r.tipo_recorrido))
  }

  if (filtros.mejorEpoca.length) {
    resultado = resultado.filter((r) => {
      if (!r.mejor_epoca) return false
      const normalizado = normalizarTexto(r.mejor_epoca)
      return filtros.mejorEpoca.some((mes) => normalizado.includes(mes))
    })
  }

  if (filtros.duracionMin !== null || filtros.duracionMax !== null) {
    resultado = resultado.filter((r) => {
      const minutos = totalMinutos(r)
      if (minutos === null) return false
      if (filtros.duracionMin !== null && minutos < filtros.duracionMin) return false
      if (filtros.duracionMax !== null && minutos > filtros.duracionMax) return false
      return true
    })
  }

  if (filtros.q) {
    const termino = filtros.q
    resultado = resultado
      .map((r) => {
        const provinciaEtiqueta = PROVINCIA_LABELS[r.provincia] ?? r.provincia
        const relevancia = Math.min(
          puntuarRelevancia(compararTexto(termino, r.titulo)),
          puntuarRelevancia(compararTexto(termino, provinciaEtiqueta))
        )
        return { r, relevancia }
      })
      .filter((x) => x.relevancia !== Infinity)
      .sort((a, b) => a.relevancia - b.relevancia)
      .map((x) => x.r)
  }

  return resultado
}

export async function buscarRutas(filtros: FiltrosRutas): Promise<ResultadoBusqueda> {
  const facetas = await obtenerFacetas()
  // obtenerFacetas() ya ha rellenado ultimoTipoRecorridoValoresCrudos si
  // hizo falta recalcular; si vino de caché, sigue siendo válido porque solo
  // cambia cuando cambian los datos de origen.

  let query = aplicarFiltrosDeColumna(
    supabase.from('Ruta').select(RESUMEN_FIELDS_BUSQUEDA, { count: 'exact' }),
    filtros
  )

  if (!necesitaMemoria(filtros)) {
    switch (filtros.orden) {
      case 'distancia_asc':
        query = query.order('distancia', { ascending: true, nullsFirst: false })
        break
      case 'distancia_desc':
        query = query.order('distancia', { ascending: false, nullsFirst: false })
        break
      case 'duracion_asc':
        query = query
          .order('duracion_horas', { ascending: true, nullsFirst: false })
          .order('duracion_minutos', { ascending: true, nullsFirst: false })
        break
      case 'duracion_desc':
        query = query
          .order('duracion_horas', { ascending: false, nullsFirst: false })
          .order('duracion_minutos', { ascending: false, nullsFirst: false })
        break
      case 'valoracion_desc':
        query = query.order('valoracion', { ascending: false, nullsFirst: false })
        break
      case 'relevancia':
      default:
        query = query.order('titulo', { ascending: true })
    }

    const from = (filtros.page - 1) * PER_PAGE
    const to = from + PER_PAGE - 1
    const { data, error, count } = await query.range(from, to)
    if (error) throw new Error(error.message)
    return { rutas: (data ?? []) as RutaResumenBusqueda[], total: count ?? 0, facetas }
  }

  // Camino con filtrado/orden en memoria (búsqueda de texto, tipo de
  // recorrido, duración o cercanía activos).
  const { data, error } = await query.limit(LIMITE_CANDIDATAS_EN_MEMORIA)
  if (error) throw new Error(error.message)
  let candidatas = aplicarFiltrosEnMemoria((data ?? []) as RutaResumenBusqueda[], filtros)
  candidatas = aplicarOrdenEnMemoria(candidatas, filtros.orden, filtros.lat, filtros.lng)

  const total = candidatas.length
  const from = (filtros.page - 1) * PER_PAGE
  const pagina = candidatas.slice(from, from + PER_PAGE)

  return { rutas: pagina, total, facetas }
}

// ═════════════════════════════════════════════════════════════════════════
// MAPA (Prompt 6) — todas las coincidencias, no solo la página actual
// ═════════════════════════════════════════════════════════════════════════
//
// El mapa debe reflejar EXACTAMENTE los mismos filtros que la lista, pero
// sin paginar (si no, un mapa que solo mostrara los 12 resultados de la
// página actual sería confuso). Para no cargar de más, solo se piden las
// columnas que hacen falta para pintar un marcador — nunca el track GPX
// completo, que solo se carga en la ficha individual de cada ruta.

export type PuntoMapa = {
  id: number
  slug: string
  titulo: string
  dificultad: string
  distancia: number | null
  lat: number
  lng: number
}

const CAMPOS_MAPA =
  'id,slug,titulo,dificultad,provincia,distancia,tipo_recorrido,mejor_epoca,coordenadas_parking,duracion_horas,duracion_minutos'

type FilaMapa = {
  id: number
  slug: string
  titulo: string
  dificultad: string
  provincia: string
  distancia: number | null
  tipo_recorrido: string | null
  mejor_epoca: string | null
  coordenadas_parking: string | null
  duracion_horas: number | null
  duracion_minutos: number | null
}

export async function obtenerCoordenadasFiltradas(filtros: FiltrosRutas): Promise<PuntoMapa[]> {
  // Asegura que ultimoTipoRecorridoValoresCrudos está poblado antes de
  // filtrar en memoria, igual que en buscarRutas().
  await obtenerFacetas()

  const query = aplicarFiltrosDeColumna(supabase.from('Ruta').select(CAMPOS_MAPA), filtros).limit(
    LIMITE_CANDIDATAS_EN_MEMORIA
  )
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const filtradas = aplicarFiltrosEnMemoria((data ?? []) as FilaMapa[], filtros)

  // "NO INVENTES": si una ruta no tiene coordenadas reales y parseables, no
  // aparece en el mapa — sigue disponible en la lista, tal como pide el
  // requisito de accesibilidad.
  const puntos: PuntoMapa[] = []
  for (const r of filtradas) {
    const coords = parsearCoordenadas(r.coordenadas_parking)
    if (!coords) continue
    puntos.push({
      id: r.id,
      slug: r.slug,
      titulo: r.titulo,
      dificultad: r.dificultad,
      distancia: r.distancia,
      lat: coords[0],
      lng: coords[1],
    })
  }
  return puntos
}
