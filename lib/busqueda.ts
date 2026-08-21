// lib/busqueda.ts
//
// Utilidades de texto para el buscador de /rutas: quitar acentos, comparar
// de forma tolerante a mayúsculas/minúsculas y a errores de escritura
// comunes (una letra de más, de menos o cambiada).
//
// Nota sobre escala: hoy esto compara en memoria (JavaScript) contra un
// índice ligero de rutas — funciona bien mientras el catálogo se mida en
// cientos. Cuando el catálogo crezca a miles (ver CONTEXTO.md, regla 13),
// esto debe sustituirse por búsqueda de texto completo en PostgreSQL
// (extensiones "unaccent" + "pg_trgm"), que no se ha activado todavía
// porque requiere una migración sobre Supabase de producción que no se ha
// ejecutado. Ver docs/migracion-wordpress-nueva-arquitectura.md.

/** Pasa a minúsculas y quita acentos/diacríticos: "León" -> "leon". */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Distancia de edición (Levenshtein) entre dos cadenas ya normalizadas.
 * Sirve para tolerar errores de escritura comunes (una letra cambiada,
 * de más o de menos). No se usa en cadenas largas por coste.
 */
export function distanciaEdicion(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let fila: number[] = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    const nuevaFila: number[] = [i]
    for (let j = 1; j <= b.length; j++) {
      const costeSustitucion = a[i - 1] === b[j - 1] ? 0 : 1
      nuevaFila.push(
        Math.min(
          (nuevaFila[j - 1] ?? Infinity) + 1, // inserción
          (fila[j] ?? Infinity) + 1, // borrado
          (fila[j - 1] ?? Infinity) + costeSustitucion // sustitución
        )
      )
    }
    fila = nuevaFila
  }

  return fila[b.length] ?? Math.max(a.length, b.length)
}

/** Cuántos errores de escritura se toleran según la longitud del término buscado. */
function tolerancia(longitud: number): number {
  if (longitud <= 3) return 0
  if (longitud <= 6) return 1
  return 2
}

export type NivelCoincidencia = 'exacta' | 'empieza_por' | 'contiene' | 'aproximada' | null

/**
 * Compara un término de búsqueda (tal cual lo escribe el usuario) contra un
 * texto candidato (p.ej. el nombre de una ruta) y devuelve el nivel de
 * coincidencia, tolerando mayúsculas/minúsculas, acentos y errores comunes.
 * Sirve tanto para decidir si hay coincidencia como para ordenar por
 * relevancia (exacta > empieza_por > contiene > aproximada).
 */
export function compararTexto(termino: string, candidato: string): NivelCoincidencia {
  const t = normalizarTexto(termino)
  const c = normalizarTexto(candidato)
  if (!t) return null

  if (c === t) return 'exacta'
  if (c.startsWith(t)) return 'empieza_por'
  if (c.includes(t)) return 'contiene'

  // Comparación aproximada palabra a palabra (para nombres compuestos,
  // ej. buscar "cares" o "carres" debe encontrar "Ruta del Cares").
  const palabras = c.split(/\s+/)
  const tol = tolerancia(t.length)
  for (const palabra of palabras) {
    if (distanciaEdicion(t, palabra) <= tol) return 'aproximada'
  }
  // También como subcadena aproximada dentro del texto completo, para
  // términos de dos o más palabras.
  if (t.includes(' ') && distanciaEdicion(t, c.slice(0, t.length)) <= tol) return 'aproximada'

  return null
}

const RELEVANCIA_ORDEN: Record<Exclude<NivelCoincidencia, null>, number> = {
  exacta: 0,
  empieza_por: 1,
  contiene: 2,
  aproximada: 3,
}

export function puntuarRelevancia(nivel: NivelCoincidencia): number {
  if (nivel === null) return Infinity
  return RELEVANCIA_ORDEN[nivel]
}
