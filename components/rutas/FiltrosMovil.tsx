// components/rutas/FiltrosMovil.tsx
// Botón "Filtros" + panel deslizante para móvil. En escritorio los filtros
// van fijos en la barra lateral (ver app/rutas/page.tsx); este componente
// solo se muestra por debajo del breakpoint `lg`.
'use client'

import { useState } from 'react'
import type { Facetas } from '@/lib/rutas'
import type { FiltrosRutas } from '@/lib/filtrosRutas'
import { contarFiltrosActivos } from '@/lib/filtrosRutas'
import PanelFiltros from './PanelFiltros'

export default function FiltrosMovil({ facetas, filtros }: { facetas: Facetas; filtros: FiltrosRutas }) {
  const [abierto, setAbierto] = useState(false)
  const activos = contarFiltrosActivos(filtros)

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800"
      >
        Filtros
        {activos > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs text-white">
            {activos}
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <button
            type="button"
            aria-label="Cerrar filtros"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <h2 className="text-base font-bold text-gray-900">Filtros</h2>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PanelFiltros facetas={facetas} filtros={filtros} />
            </div>
            <div className="border-t border-gray-100 p-4">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="w-full rounded-full bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Ver resultados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
