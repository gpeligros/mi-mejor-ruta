export type Modalidad = 'senderismo' | 'bici' | 'moto' | '4x4'

export type Dificultad = 'facil' | 'moderada' | 'dificil' | 'muy-dificil'

export type TipoRecorrido = 'circular' | 'lineal' | 'ida-vuelta'

export type RutaBase = {
  titulo: string
  slug: string
  descripcion: string
  provincia: string
  modalidad: Modalidad
  dificultad: Dificultad

  distancia: number
  duracion: string
  duracion_horas: number
  duracion_minutos: number
  desnivel_positivo: number
  desnivel_negativo: number
  altitud_maxima: number
  altitud_minima: number
  tipo_recorrido: TipoRecorrido

  punto_inicio: string
  coordenadas_parking: string
  como_llegar: string
  transporte_publico: string

  mejor_epoca: string
  mejor_momento_dia: string
  equipamiento: string
  puntos_agua: string
  puntos_interes: string
  servicios_cercanos: string
  alojamiento_cercano: string
  zonas_camping: string

  archivo_gpx: string
  galeria: string[]

  valoracion: number
  total_valoraciones: number

  rank_math_seo_score: number
}

export type CamposSenderismo = {
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

export type CamposBici = {
  tipo_bici: string
  nivel_tecnico_bici: string
  tipo_terreno_bici: string
  talleres_bici: string
  puntos_de_avituallamiento: string
}

export type CamposMoto = {
  tipo_de_carretera: string
  estado_asfalto: string
  puertos_montana: string
  peajes: string
  gasolineras_ruta: string
  puntos_moteros: string
  zonas_descanso_moto: string
}

export type Campos4x4 = {
  tipo_terreno_4x4: string
  traccion_necesaria: string
  estado_firme: string
  vado_rios: string
  dificultad_tecnica: string
  parking_coste: string
  parking_descripcion: string
  puntos_repostaje_4x4: string
}

export type RutaCompleta = RutaBase &
  Partial<CamposSenderismo> &
  Partial<CamposBici> &
  Partial<CamposMoto> &
  Partial<Campos4x4>
