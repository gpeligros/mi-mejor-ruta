// components/rutas/ToggleVistaListaMapa.tsx
// Son dos enlaces normales — no necesita JavaScript de cliente.
import Link from 'next/link'
import type { FiltrosRutas } from '@/lib/filtrosRutas'
import { construirQueryString } from '@/lib/filtrosRutas'

export default function ToggleVistaListaMapa({ filtros }: { filtros: FiltrosRutas }) {
  const base = 'rounded-full px-4 py-2 text-sm font-semibold transition-colors'
  return (
    <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
      <Link
        href={`/rutas${construirQueryString(filtros, { vista: 'lista' })}`}
        className={`${base} ${filtros.vista === 'lista' ? 'bg-orange-500 text-white' : 'text-gray-600'}`}
        aria-current={filtros.vista === 'lista'}
      >
        Lista
      </Link>
      <Link
        href={`/rutas${construirQueryString(filtros, { vista: 'mapa' })}`}
        className={`${base} ${filtros.vista === 'mapa' ? 'bg-orange-500 text-white' : 'text-gray-600'}`}
        aria-current={filtros.vista === 'mapa'}
      >
        Mapa
      </Link>
    </div>
  )
}
