// lib/rutas.ts
import { createClient } from '@supabase/supabase-js'

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
    .order('valoracion', { ascending: false, nullsFirst: false })
    .range(from, to)
  if (error) throw new Error(error.message)
  return { rutas: data ?? [], total: count ?? 0 }
}

export async function getRutaBySlug(slug: string): Promise<RutaDetalle | null> {
  const { data, error } = await supabase
    .from('Ruta')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data as RutaDetalle
}

export async function getPublishedSlugs(): Promise<{ slug: string }[]> {
  const { data } = await supabase
    .from('Ruta')
    .select('slug')
    .eq('publicada', true)
  return data ?? []
}
