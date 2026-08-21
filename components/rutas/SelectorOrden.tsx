// components/rutas/SelectorOrden.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import type { FiltrosRutas } from '@/lib/filtrosRutas'
import { construirQueryString, ORDEN_LABELS, ORDENES_VALIDOS, type OrdenRutas } from '@/lib/filtrosRutas'

export default function SelectorOrden({ filtros }: { filtros: FiltrosRutas }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pidiendoUbicacion, setPidiendoUbicacion] = useState(false)
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null)

  function irA(orden: OrdenRutas, lat: number | null = null, lng: number | null = null) {
    const qs = construirQueryString(filtros, { orden, lat, lng, page: 1 })
    router.push(`${pathname}${qs}`)
  }

  function onChange(valor: string) {
    const orden = valor as OrdenRutas
    if (orden === 'cercania') {
      if (filtros.lat !== null && filtros.lng !== null) {
        irA('cercania', filtros.lat, filtros.lng)
        return
      }
      if (!('geolocation' in navigator)) {
        setErrorUbicacion('Tu navegador no permite compartir la ubicación.')
        return
      }
      setPidiendoUbicacion(true)
      setErrorUbicacion(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPidiendoUbicacion(false)
          irA('cercania', pos.coords.latitude, pos.coords.longitude)
        },
        () => {
          setPidiendoUbicacion(false)
          setErrorUbicacion('No se pudo obtener tu ubicación. Prueba otro criterio de orden.')
        },
        { timeout: 8000 }
      )
      return
    }
    irA(orden)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Ordenar por</span>
        <select
          value={filtros.orden}
          onChange={(e) => onChange(e.target.value)}
          disabled={pidiendoUbicacion}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:border-orange-500 focus:outline-none disabled:opacity-50"
        >
          {ORDENES_VALIDOS.map((o) => (
            <option key={o} value={o}>
              {pidiendoUbicacion && o === 'cercania' ? 'Localizando…' : ORDEN_LABELS[o]}
            </option>
          ))}
        </select>
      </label>
      {errorUbicacion && <span className="text-xs text-red-600">{errorUbicacion}</span>}
    </div>
  )
}
