// lib/filtrosRutas.ts
//
// Todo lo relacionado con los filtros y el buscador de /rutas: tipos,
// parseo de la URL, cálculo de qué opciones de filtro tienen datos reales
// (facetas), y las utilidades de ordenación (incluida "cercanía").
//
// Principio seguido en todo este fichero: nunca se ofrece un filtro cuyo
// valor no exista de verdad en los datos publicados — las opciones de cada
// filtro se calculan en vivo a partir de lo que hay hoy en la tabla "Ruta",
// nunca de una lista fija adivinada.

import { normalizarTexto } from './busqueda'

// ─── Catálogos de apoyo (solo para mostrar etiquetas bonitas; nunca para decidir qué existe) ──

export const MODALIDAD_LABELS: Record<string, string> = {
  senderismo: 'Senderismo',
  bici: 'Bici',
  moto: 'Moto',
  '4x4': '4x4',
  autocaravanas: 'Autocaravanas',
}

export const DIFICULTAD_LABELS: Record<string, string> = {
  facil: 'Fácil',
  moderada: 'Moderada',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
}

export const DIFICULTAD_ORDEN: Record<string, number> = {
  facil: 0,
  moderada: 1,
  dificil: 2,
  muy_dificil: 3,
}

// Reutiliza los mismos slugs/nombres reales de provincia que
// basededatos/semilla-catalogos.sql (Prompt 4) — no se inventan aquí de nuevo.
export const PROVINCIA_LABELS: Record<string, string> = {
  almeria: 'Almería', cadiz: 'Cádiz', cordoba: 'Córdoba', granada: 'Granada',
  huelva: 'Huelva', jaen: 'Jaén', malaga: 'Málaga', sevilla: 'Sevilla',
  huesca: 'Huesca', teruel: 'Teruel', zaragoza: 'Zaragoza', asturias: 'Asturias',
  'illes-balears': 'Illes Balears', 'las-palmas': 'Las Palmas',
  'santa-cruz-de-tenerife': 'Santa Cruz de Tenerife', cantabria: 'Cantabria',
  albacete: 'Albacete', 'ciudad-real': 'Ciudad Real', cuenca: 'Cuenca',
  guadalajara: 'Guadalajara', toledo: 'Toledo', avila: 'Ávila', burgos: 'Burgos',
  leon: 'León', palencia: 'Palencia', salamanca: 'Salamanca', segovia: 'Segovia',
  soria: 'Soria', valladolid: 'Valladolid', zamora: 'Zamora', barcelona: 'Barcelona',
  girona: 'Girona', lleida: 'Lleida', tarragona: 'Tarragona', badajoz: 'Badajoz',
  caceres: 'Cáceres', 'la-coruna': 'A Coruña', lugo: 'Lugo', ourense: 'Ourense',
  pontevedra: 'Pontevedra', madrid: 'Madrid', murcia: 'Murcia', navarra: 'Navarra',
  alava: 'Álava', gipuzkoa: 'Gipuzkoa', vizcaya: 'Vizcaya', 'la-rioja': 'La Rioja',
  alicante: 'Alicante', castellon: 'Castellón', valencia: 'Valencia',
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type OrdenRutas =
  | 'relevancia'
  | 'distancia_asc'
  | 'distancia_desc'
  | 'duracion_asc'
  | 'duracion_desc'
  | 'dificultad_asc'
  | 'dificultad_desc'
  | 'valoracion_desc'
  | 'cercania'

export const ORDENES_VALIDOS: OrdenRutas[] = [
  'relevancia', 'distancia_asc', 'distancia_desc', 'duracion_asc', 'duracion_desc',
  'dificultad_asc', 'dificultad_desc', 'valoracion_desc', 'cercania',
]

export const ORDEN_LABELS: Record<OrdenRutas, string> = {
  relevancia: 'Relevancia',
  distancia_asc: 'Distancia (menor a mayor)',
  distancia_desc: 'Distancia (mayor a menor)',
  duracion_asc: 'Duración (menor a mayor)',
  duracion_desc: 'Duración (mayor a menor)',
  dificultad_asc: 'Dificultad (fácil a difícil)',
  dificultad_desc: 'Dificultad (difícil a fácil)',
  valoracion_desc: 'Mejor valoradas',
  cercania: 'Más cercanas',
}

export type FiltrosRutas = {
  q: string | null
  modalidad: string[]
  provincia: string[]
  dificultad: string[]
  tipoRecorrido: string[]
  mejorEpoca: string[]
  distanciaMin: number | null
  distanciaMax: number | null
  duracionMin: number | null // minutos totales
  duracionMax: number | null
  desnivelMin: number | null
  desnivelMax: number | null
  orden: OrdenRutas
  lat: number | null
  lng: number | null
  vista: 'lista' | 'mapa'
  page: number
}

export type BusquedaSearchParams = Record<string, string | string[] | undefined>

function comoLista(valor: string | string[] | undefined): string[] {
  if (!valor) return []
  return Array.isArray(valor) ? valor.filter(Boolean) : [valor]
}

function comoNumero(valor: string | string[] | undefined): number | null {
  const v = Array.isArray(valor) ? valor[0] : valor
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const PER_PAGE = 12

/** Convierte los searchParams de Next.js en un objeto de filtros ya validado. */
export function parsearFiltros(sp: BusquedaSearchParams): FiltrosRutas {
  const ordenBruto = Array.isArray(sp.orden) ? sp.orden[0] : sp.orden
  const orden = (ORDENES_VALIDOS as string[]).includes(ordenBruto ?? '')
    ? (ordenBruto as OrdenRutas)
    : 'relevancia'

  const vistaBruta = Array.isArray(sp.vista) ? sp.vista[0] : sp.vista
  const vista = vistaBruta === 'mapa' ? 'mapa' : 'lista'

  const pageBruta = comoNumero(sp.page)
  const page = pageBruta && pageBruta > 0 ? Math.floor(pageBruta) : 1

  const qBruto = Array.isArray(sp.q) ? sp.q[0] : sp.q
  const q = qBruto?.trim() ? qBruto.trim() : null

  return {
    q,
    modalidad: comoLista(sp.modalidad),
    provincia: comoLista(sp.provincia),
    dificultad: comoLista(sp.dificultad),
    tipoRecorrido: comoLista(sp.tipo),
    mejorEpoca: comoLista(sp.epoca),
    distanciaMin: comoNumero(sp.dist_min),
    distanciaMax: comoNumero(sp.dist_max),
    duracionMin: comoNumero(sp.dur_min),
    duracionMax: comoNumero(sp.dur_max),
    desnivelMin: comoNumero(sp.desnivel_min),
    desnivelMax: comoNumero(sp.desnivel_max),
    orden,
    lat: comoNumero(sp.lat),
    lng: comoNumero(sp.lng),
    vista,
    page,
  }
}

/**
 * Construye la query string a partir de unos filtros, aplicando cambios
 * puntuales encima (p.ej. cambiar de página, quitar un filtro). Se usa para
 * que los chips, el selector de orden y la paginación mantengan siempre el
 * resto de filtros activos — la URL es compartible.
 */
export function construirQueryString(
  filtros: FiltrosRutas,
  cambios: Partial<FiltrosRutas> = {}
): string {
  const f = { ...filtros, ...cambios }
  const params = new URLSearchParams()

  if (f.q) params.set('q', f.q)
  f.modalidad.forEach((v) => params.append('modalidad', v))
  f.provincia.forEach((v) => params.append('provincia', v))
  f.dificultad.forEach((v) => params.append('dificultad', v))
  f.tipoRecorrido.forEach((v) => params.append('tipo', v))
  f.mejorEpoca.forEach((v) => params.append('epoca', v))
  if (f.distanciaMin !== null) params.set('dist_min', String(f.distanciaMin))
  if (f.distanciaMax !== null) params.set('dist_max', String(f.distanciaMax))
  if (f.duracionMin !== null) params.set('dur_min', String(f.duracionMin))
  if (f.duracionMax !== null) params.set('dur_max', String(f.duracionMax))
  if (f.desnivelMin !== null) params.set('desnivel_min', String(f.desnivelMin))
  if (f.desnivelMax !== null) params.set('desnivel_max', String(f.desnivelMax))
  if (f.orden !== 'relevancia') params.set('orden', f.orden)
  if (f.orden === 'cercania' && f.lat !== null && f.lng !== null) {
    params.set('lat', String(f.lat))
    params.set('lng', String(f.lng))
  }
  if (f.vista !== 'lista') params.set('vista', f.vista)
  if (f.page > 1) params.set('page', String(f.page))

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function contarFiltrosActivos(f: FiltrosRutas): number {
  let n = 0
  if (f.q) n++
  n += f.modalidad.length
  n += f.provincia.length
  n += f.dificultad.length
  n += f.tipoRecorrido.length
  n += f.mejorEpoca.length
  if (f.distanciaMin !== null || f.distanciaMax !== null) n++
  if (f.duracionMin !== null || f.duracionMax !== null) n++
  if (f.desnivelMin !== null || f.desnivelMax !== null) n++
  return n
}

export function hayFiltrosActivos(f: FiltrosRutas): boolean {
  return !!(
    f.q ||
    f.modalidad.length ||
    f.provincia.length ||
    f.dificultad.length ||
    f.tipoRecorrido.length ||
    f.mejorEpoca.length ||
    f.distanciaMin !== null ||
    f.distanciaMax !== null ||
    f.duracionMin !== null ||
    f.duracionMax !== null ||
    f.desnivelMin !== null ||
    f.desnivelMax !== null
  )
}

/**
 * Si hay filtros "no curados" activos (cualquier cosa salvo, como mucho, un
 * único filtro de modalidad o provincia), la página no debe indexarse — para
 * no generar miles de combinaciones indexables. Las páginas de listado base,
 * o filtradas solo por una modalidad o solo por una provincia, sí se indexan.
 */
export function debeSerNoIndexable(f: FiltrosRutas): boolean {
  const filtrosCurados =
    (f.modalidad.length <= 1 && f.provincia.length === 0) ||
    (f.provincia.length <= 1 && f.modalidad.length === 0)
  const otrosFiltros =
    !!f.q ||
    f.dificultad.length > 0 ||
    f.tipoRecorrido.length > 0 ||
    f.mejorEpoca.length > 0 ||
    f.distanciaMin !== null ||
    f.distanciaMax !== null ||
    f.duracionMin !== null ||
    f.duracionMax !== null ||
    f.desnivelMin !== null ||
    f.desnivelMax !== null ||
    f.page > 1
  return otrosFiltros || !filtrosCurados
}

// ─── Distancia entre coordenadas (para orden "cercanía") ─────────────────────

export function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Parsea "lat,lng" de forma tolerante. Si no es válido, devuelve null (nunca se inventa una ubicación). */
export function parsearCoordenadas(texto: string | null | undefined): [number, number] | null {
  if (!texto) return null
  const partes = texto.split(',').map((s) => parseFloat(s.trim()))
  const lat = partes[0]
  const lng = partes[1]
  if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return [lat, lng]
}

// ─── Faceta genérica: qué valores existen de verdad para un campo con valores "sueltos" ──

export type OpcionFaceta = { valor: string; etiqueta: string; total: number }

/**
 * A partir de los valores crudos de un campo (tal cual están en la tabla,
 * con las inconsistencias de mayúsculas que traiga WordPress), agrupa por
 * valor normalizado y cuenta cuántas rutas publicadas tienen cada uno.
 * Devuelve también, por cada opción, la lista de valores crudos reales que
 * hay que usar para filtrar en la base de datos (para no fallar por un
 * "Lineal" con mayúscula cuando se busca "lineal").
 */
export function calcularFacetaGenerica(
  valoresCrudos: (string | null)[],
  etiquetas: Record<string, string> = {}
): { opciones: OpcionFaceta[]; valoresCrudosPorSlug: Record<string, string[]> } {
  const conteos = new Map<string, number>()
  const crudosPorSlug = new Map<string, Set<string>>()
  const primeraAparicion = new Map<string, string>()

  for (const crudo of valoresCrudos) {
    if (!crudo || !crudo.trim()) continue
    const slug = normalizarTexto(crudo).replace(/\s+/g, '_')
    conteos.set(slug, (conteos.get(slug) ?? 0) + 1)
    if (!crudosPorSlug.has(slug)) crudosPorSlug.set(slug, new Set())
    crudosPorSlug.get(slug)!.add(crudo)
    if (!primeraAparicion.has(slug)) primeraAparicion.set(slug, crudo)
  }

  const opciones: OpcionFaceta[] = Array.from(conteos.entries())
    .map(([slug, total]) => ({
      valor: slug,
      etiqueta: etiquetas[slug] ?? tituloCase(primeraAparicion.get(slug) ?? slug),
      total,
    }))
    .sort((a, b) => b.total - a.total)

  const valoresCrudosPorSlug: Record<string, string[]> = {}
  for (const [slug, set] of Array.from(crudosPorSlug.entries())) {
    valoresCrudosPorSlug[slug] = Array.from(set)
  }

  return { opciones, valoresCrudosPorSlug }
}

function tituloCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Faceta de "mejor época": cuenta cuántas rutas mencionan cada mes en su texto libre. */
export function calcularFacetaMeses(textos: (string | null)[]): OpcionFaceta[] {
  const conteos = new Map<string, number>()
  for (const texto of textos) {
    if (!texto) continue
    const normalizado = normalizarTexto(texto)
    for (const mes of MESES) {
      if (normalizado.includes(mes)) {
        conteos.set(mes, (conteos.get(mes) ?? 0) + 1)
      }
    }
  }
  return MESES.filter((m) => conteos.has(m)).map((mes) => ({
    valor: mes,
    etiqueta: tituloCase(mes),
    total: conteos.get(mes)!,
  }))
}

export function calcularRango(valores: (number | null)[]): [number, number] | null {
  const numeros = valores.filter((v): v is number => v !== null && Number.isFinite(v))
  if (numeros.length === 0) return null
  return [Math.min(...numeros), Math.max(...numeros)]
}
