// components/rutas/ExploradorRutas.tsx
'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { RutaResumenBusqueda, PuntoMapa } from '@/lib/rutas'
import type { FiltrosRutas } from '@/lib/filtrosRutas'
import RutaCard from './RutaCard'

// El mapa usa Leaflet, que necesita el DOM del navegador — se carga solo en
// cliente, nunca en el servidor.
const MapaResultados = dynamic(() => import('./MapaResultados'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[32rem] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
      Cargando mapa…
    </div>
  ),
})

type Props = {
  rutas: RutaResumenBusqueda[]
  puntosMapa: PuntoMapa[]
  filtros: FiltrosRutas
}

// Coordina la lista y el mapa: en escritorio se muestran uno junto al otro,
// siempre sincronizados (resaltar una tarjeta resalta su marcador y
// viceversa); en móvil se alternan como pestañas mediante el parámetro
// `vista` de la URL (lo gestiona ToggleVistaListaMapa, sin JS adicional) —
// el mapa nunca es la única forma de llegar a los resultados.
export default function ExploradorRutas({ rutas, puntosMapa, filtros }: Props) {
  const [activaId, setActivaId] = useState<number | null>(null)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className={filtros.vista === 'mapa' ? 'hidden lg:block' : 'block'}>
        {/* Solo dos columnas como máximo: en escritorio esta mitad de la
            pantalla comparte espacio con el mapa. */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {rutas.map((ruta) => (
            <RutaCard
              key={ruta.id}
              ruta={ruta}
              resaltada={ruta.id === activaId}
              onHoverStart={() => setActivaId(ruta.id)}
              onHoverEnd={() => setActivaId(null)}
            />
          ))}
        </div>
      </div>

      <div
        className={`${
          filtros.vista === 'lista' ? 'hidden lg:block' : 'block'
        } lg:sticky lg:top-24 lg:self-start`}
      >
        <MapaResultados puntos={puntosMapa} activaId={activaId} onHoverMarker={setActivaId} />
      </div>
    </div>
  )
}
