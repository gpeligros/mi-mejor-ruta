// components/mapa/MapaRuta.tsx
'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix iconos de Leaflet rotos en Next.js (webpack no encuentra los assets)
function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

// Inicializa iconos una sola vez al cargar el módulo (seguro: 'use client' + dynamic ssr:false)
fixLeafletIcons()

type Props = {
  coordenadas?: string | null
  gpxPoints?: [number, number][]
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [40, 40] })
    }
  }, [map, points])
  return null
}

export default function MapaRuta({ coordenadas, gpxPoints = [] }: Props) {

  const center: [number, number] = [40.4, -3.7]

  const parkingCoords = ((): [number, number] | null => {
    if (!coordenadas) return null
    const parts = coordenadas.split(',').map((s) => parseFloat(s.trim()))
    const lat = parts[0]
    const lng = parts[1]
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return null
    return [lat, lng]
  })()

  return (
    <div className="h-96 rounded-2xl overflow-hidden border border-gray-200">
      <MapContainer center={center} zoom={6} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {gpxPoints.length > 1 && (
          <>
            <Polyline positions={gpxPoints} color="#f97316" weight={3} opacity={0.9} />
            <FitBounds points={gpxPoints} />
          </>
        )}
        {parkingCoords !== null && (
          <Marker position={parkingCoords}>
            <Popup>Punto de inicio / parking</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
