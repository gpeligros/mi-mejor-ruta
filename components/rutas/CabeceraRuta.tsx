// components/rutas/CabeceraRuta.tsx
import { existsSync } from 'fs'
import { join } from 'path'
import Image from 'next/image'
import type { RutaDetalle } from '@/lib/rutas'
import { MODALIDAD_LABELS, DIFICULTAD_LABELS, PROVINCIA_LABELS } from '@/lib/filtrosRutas'
import BotonGuardarRuta from './BotonGuardarRuta'

// Este es un componente de servidor: comprobamos si el fichero de imagen
// existe de verdad en /public antes de intentar pintarlo, en vez de
// arriesgarnos a una imagen rota (Next/Image con `fill` no reintenta ni
// muestra un estado de error bonito por sí solo).
export function tieneFotoPortada(slug: string): boolean {
  try {
    return existsSync(join(process.cwd(), 'public', 'images', 'rutas', `${slug}_1.jpg`))
  } catch {
    return false
  }
}

const DIFICULTAD_COLORS: Record<string, string> = {
  facil: 'bg-green-100 text-green-800',
  moderada: 'bg-yellow-100 text-yellow-800',
  dificil: 'bg-orange-100 text-orange-800',
  muy_dificil: 'bg-red-100 text-red-800',
}

export function formatearDuracion(ruta: RutaDetalle): string | null {
  if (ruta.duracion_horas !== null && ruta.duracion_minutos !== null) {
    return `${ruta.duracion_horas}h ${ruta.duracion_minutos}min`
  }
  return ruta.duracion
}

type Props = {
  ruta: RutaDetalle
  // Resuelto en la página (server) tras intentar parsear el GPX de verdad
  // — nunca se decide solo mirando si el campo archivo_gpx existe, porque
  // el enlace puede estar roto (ver Prompt 6/auditoría: 62 de 65 archivos
  // referenciados en WordPress no existen de verdad en el servidor).
  gpxDescargable: { url: string } | null
}

export default function CabeceraRuta({ ruta, gpxDescargable }: Props) {
  const duracion = formatearDuracion(ruta)
  const dificultadColor = DIFICULTAD_COLORS[ruta.dificultad] ?? 'bg-gray-100 text-gray-800'
  const provinciaLabel = PROVINCIA_LABELS[ruta.provincia] ?? ruta.provincia.replace(/-/g, ' ')
  const tieneFoto = tieneFotoPortada(ruta.slug)

  return (
    <header className="mb-8">
      {/* Foto de cabecera — mismo criterio que RutaCard: si no existe la
          imagen, degrada a un fondo de color en vez de romper el layout
          (aquí, comprobado en el servidor antes de renderizar). */}
      <div className="relative mb-5 h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-600 to-gray-900 sm:h-72">
        {tieneFoto && (
          <Image
            src={`/images/rutas/${ruta.slug}_1.jpg`}
            alt={ruta.titulo}
            fill
            priority
            className="object-cover"
          />
        )}
      </div>

      {/* Ubicación + modalidad + dificultad, de un vistazo, antes incluso
          del propio título — es lo primero que se lee al llegar. */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-gray-500">📍 {provinciaLabel}</span>
        <span className="text-gray-300">·</span>
        <span className="font-medium text-gray-500">
          {MODALIDAD_LABELS[ruta.modalidad] ?? ruta.modalidad}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${dificultadColor}`}>
          {DIFICULTAD_LABELS[ruta.dificultad] ?? ruta.dificultad}
        </span>
      </div>

      {/* H1 único de la página. */}
      <h1 className="mb-2 text-3xl font-bold text-gray-900 sm:text-4xl">{ruta.titulo}</h1>

      {ruta.total_valoraciones !== null && ruta.total_valoraciones > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <span className="text-lg leading-none text-yellow-400" aria-hidden>
            {'★'.repeat(Math.min(5, Math.round(ruta.valoracion ?? 0)))}
            {'☆'.repeat(Math.max(0, 5 - Math.round(ruta.valoracion ?? 0)))}
          </span>
          <span className="font-medium">{ruta.valoracion?.toFixed(1)}</span>
          <span>({ruta.total_valoraciones} valoraciones)</span>
        </div>
      )}

      {/* Cifras clave para decidir de un vistazo si interesa, sin tener que
          bajar hasta Datos Técnicos. */}
      <div className="mb-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-700">
        {ruta.distancia !== null && (
          <span>
            <strong className="font-semibold text-gray-900">{ruta.distancia} km</strong> de
            distancia
          </span>
        )}
        {duracion !== null && (
          <span>
            <strong className="font-semibold text-gray-900">{duracion}</strong> de duración
          </span>
        )}
        {ruta.desnivel_positivo !== null && (
          <span>
            <strong className="font-semibold text-gray-900">+{ruta.desnivel_positivo} m</strong> de
            desnivel
          </span>
        )}
        {!!ruta.tipo_recorrido && (
          <span>
            Recorrido <strong className="font-semibold text-gray-900">{ruta.tipo_recorrido}</strong>
          </span>
        )}
      </div>

      {/* CTAs principales. */}
      <div className="flex flex-wrap gap-3">
        <a
          href="#mapa-ruta"
          className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          🗺️ Ver mapa
        </a>
        {gpxDescargable !== null && (
          <a
            href={gpxDescargable.url}
            download
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
          >
            ⬇️ Descargar GPX
          </a>
        )}
        <BotonGuardarRuta slug={ruta.slug} />
      </div>
    </header>
  )
}
