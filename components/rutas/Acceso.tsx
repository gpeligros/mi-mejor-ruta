// components/rutas/Acceso.tsx
import type { RutaDetalle } from '@/lib/rutas'
import { parsearCoordenadas } from '@/lib/filtrosRutas'
import BloqueInfoRuta from './BloqueInfoRuta'

type Item = { label: string; value: string }

// "Parking" no es un campo de texto propio — el dato real es
// `coordenadas_parking` (lat,lng). Cuando parsea a una ubicación válida se
// muestra como enlace al mapa de la ficha; si no parsea (formato raro o
// vacío — solo 1 de 65 rutas reales tiene coordenadas parseables hoy) no
// se muestra nada, nunca se inventa una posición.
export function construirItemsAcceso(ruta: RutaDetalle): Item[] {
  const tieneParkingUbicado = parsearCoordenadas(ruta.coordenadas_parking) !== null

  const candidatos: (Item | false)[] = [
    !!ruta.punto_inicio && { label: 'Punto de inicio', value: ruta.punto_inicio },
    !!ruta.como_llegar && { label: 'Cómo llegar', value: ruta.como_llegar },
    tieneParkingUbicado && { label: 'Parking', value: 'Ver ubicación en el mapa ↓' },
    !!ruta.transporte_publico && { label: 'Transporte público', value: ruta.transporte_publico },
  ]
  return candidatos.filter((i): i is Item => i !== false)
}

export default function Acceso({ ruta }: { ruta: RutaDetalle }) {
  return (
    <BloqueInfoRuta id="acceso" titulo="Cómo llegar" icono="🚗" items={construirItemsAcceso(ruta)} />
  )
}
