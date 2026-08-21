// components/rutas/MapaResultados.tsx
'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'
import { parsearCoordenadas } from '@/lib/filtrosRutas'
import type { RutaResumenBusqueda } from '@/lib/rutas'

function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}
fixLeafletIcons()

function FitBounds({ puntos }: { puntos: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (puntos.length > 1) {
      map.fitBounds(puntos as L.LatLngBoundsExpression, { padding: [40, 40] })
    } else if (puntos.length === 1 && puntos[0]) {
      map.setView(puntos[0], 11)
    }
  }, [map, puntos])
  return null
}

export default function MapaResultados({ rutas }: { rutas: RutaResumenBusqueda[] }) {
  const conUbicacion = rutas
    .map((r) => ({ ruta: r, coords: parsearCoordenadas(r.coordenadas_parking) }))
    .filter((r): r is { ruta: RutaResumenBusqueda; coords: [number, number] } => r.coords !== null)

  const centro: [number, number] = conUbicacion[0]?.coords ?? [40.4, -3.7]

  if (conUbicacion.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
        Ninguna de las rutas de esta página tiene una ubicación registrada todavía.
      </div>
    )
  }

  return (
    <div className="h-[32rem] rounded-2xl overflow-hidden border border-gray-200">
      <MapContainer center={centro} zoom={6} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds puntos={conUbicacion.map((r) => r.coords)} />
        {conUbicacion.map(({ ruta, coords }) => (
          <Marker key={ruta.id} position={coords}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{ruta.titulo}</p>
                {ruta.distancia !== null && <p>{ruta.distancia} km</p>}
                <Link href={`/rutas/${ruta.slug}`} className="text-orange-600 underline">
                  Ver ruta →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
