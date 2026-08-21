import type { RutaDetalle } from '@/lib/rutas'

const DIFICULTAD_LABELS: Record<string, string> = {
  facil: 'Fácil',
  moderada: 'Moderada',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
}

const MODALIDAD_LABELS: Record<string, string> = {
  senderismo: 'Senderismo',
  bici: 'Bici',
  moto: 'Moto',
  '4x4': '4x4',
}

type Dato = { label: string; value: string; icon: string }

export function buildDatos(ruta: RutaDetalle): Dato[] {
  const duracion =
    ruta.duracion_horas !== null && ruta.duracion_minutos !== null
      ? `${ruta.duracion_horas}h ${ruta.duracion_minutos}min`
      : ruta.duracion ?? null

  const candidates: (Dato | false)[] = [
    ruta.distancia !== null && {
      label: 'Distancia',
      value: `${ruta.distancia} km`,
      icon: '📏',
    },
    {
      label: 'Dificultad',
      value: DIFICULTAD_LABELS[ruta.dificultad] ?? ruta.dificultad,
      icon: '⚡',
    },
    {
      label: 'Modalidad',
      value: MODALIDAD_LABELS[ruta.modalidad] ?? ruta.modalidad,
      icon: '🥾',
    },
    !!ruta.tipo_recorrido && { label: 'Tipo', value: ruta.tipo_recorrido, icon: '🔄' },
    !!duracion && { label: 'Duración', value: duracion, icon: '⏱' },
    ruta.desnivel_positivo !== null && {
      label: 'Desnivel +',
      value: `${ruta.desnivel_positivo} m`,
      icon: '⬆️',
    },
    ruta.desnivel_negativo !== null && {
      label: 'Desnivel −',
      value: `${ruta.desnivel_negativo} m`,
      icon: '⬇️',
    },
    ruta.altitud_maxima !== null && {
      label: 'Alt. máx.',
      value: `${ruta.altitud_maxima} m`,
      icon: '🏔',
    },
    ruta.altitud_minima !== null && {
      label: 'Alt. mín.',
      value: `${ruta.altitud_minima} m`,
      icon: '🏕',
    },
    !!ruta.mejor_epoca && { label: 'Mejor época', value: ruta.mejor_epoca, icon: '📅' },
  ]

  return candidates.filter((d): d is Dato => d !== false)
}

export default function DatosTecnicos({ ruta }: { ruta: RutaDetalle }) {
  const datos = buildDatos(ruta)

  return (
    <div className="bg-gray-50 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Datos Técnicos</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {datos.map(({ label, value, icon }) => (
          <div key={label} className="text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-sm font-semibold text-gray-900">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
