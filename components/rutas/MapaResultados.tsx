// components/rutas/MapaResultados.tsx
'use client'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
// Estilos de los "globos" de agrupación (clusters) — ver documentación de
// licencias/atribuciones al final de este prompt.
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import L from 'leaflet'
import Link from 'next/link'
import type { PuntoMapa } from '@/lib/rutas'
import { DIFICULTAD_LABELS } from '@/lib/filtrosRutas'
import { crearIcono, firmaPuntos } from '@/lib/mapaUtils'

function FitBounds({ puntos }: { puntos: PuntoMapa[] }) {
  const map = useMap()
  // El encuadre solo se recalcula cuando cambian los resultados (nuevos
  // filtros/página), nunca al resaltar un marcador al pasar el cursor por
  // una tarjeta — así se evitan los saltos molestos que pide el Prompt 6.
  const firma = useMemo(() => firmaPuntos(puntos), [puntos])

  useEffect(() => {
    if (puntos.length > 1) {
      const bounds = puntos.map((p) => [p.lat, p.lng]) as L.LatLngBoundsExpression
      map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6 })
    } else if (puntos.length === 1 && puntos[0]) {
      map.flyTo([puntos[0].lat, puntos[0].lng], 11, { duration: 0.6 })
    }
    // Se recalcula solo cuando cambia `firma`, no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])

  return null
}

type Props = {
  // Todas las rutas que cumplen los filtros activos y tienen coordenadas
  // reales — no solo la página actual, para que el mapa se pueda explorar
  // con independencia de la paginación de la lista.
  puntos: PuntoMapa[]
  // Ruta resaltada por sincronización con la tarjeta correspondiente.
  activaId?: number | null
  onHoverMarker?: (id: number | null) => void
}

export default function MapaResultados({ puntos, activaId = null, onHoverMarker }: Props) {
  const [erroresTiles, setErroresTiles] = useState(0)
  const centro: [number, number] = puntos[0] ? [puntos[0].lat, puntos[0].lng] : [40.4, -3.7]

  if (puntos.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-6 text-center text-sm text-gray-500">
        Ninguna de las rutas que coinciden con estos filtros tiene una ubicación registrada
        todavía. Puedes seguir viéndolas en la lista.
      </div>
    )
  }

  return (
    <div className="relative h-[32rem] overflow-hidden rounded-2xl border border-gray-200">
      {erroresTiles > 4 && (
        <div className="absolute inset-x-0 top-0 z-[1000] border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-center text-xs text-amber-800">
          Algunos mapas no se han podido cargar. Comprueba tu conexión e inténtalo de nuevo.
        </div>
      )}
      <MapContainer center={centro} zoom={6} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{ tileerror: () => setErroresTiles((n) => n + 1) }}
        />
        <FitBounds puntos={puntos} />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={55}>
          {puntos.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={crearIcono(p.id === activaId)}
              eventHandlers={{
                mouseover: () => onHoverMarker?.(p.id),
                mouseout: () => onHoverMarker?.(null),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="mb-0.5 font-semibold">{p.titulo}</p>
                  <p className="mb-1 text-gray-600">
                    {DIFICULTAD_LABELS[p.dificultad] ?? p.dificultad}
                    {p.distancia !== null ? ` · ${p.distancia} km` : ''}
                  </p>
                  <Link href={`/rutas/${p.slug}`} className="text-orange-600 underline">
                    Ver ruta →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  )
}
