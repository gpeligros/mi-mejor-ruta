// components/rutas/EstadoVacio.tsx
import Link from 'next/link'
import type { FiltrosRutas } from '@/lib/filtrosRutas'
import { hayFiltrosActivos } from '@/lib/filtrosRutas'

export default function EstadoVacio({ filtros }: { filtros: FiltrosRutas }) {
  const conFiltros = hayFiltrosActivos(filtros)
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
      <span className="mb-3 text-4xl" aria-hidden>
        🧭
      </span>
      <h2 className="text-lg font-bold text-gray-900">
        {conFiltros ? 'Sin coincidencias' : 'Todavía no hay rutas aquí'}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        {conFiltros
          ? 'Ninguna ruta publicada cumple esta combinación de búsqueda y filtros. Prueba a quitar alguno.'
          : 'Vuelve pronto — el catálogo de rutas está creciendo.'}
      </p>
      {conFiltros && (
        <Link
          href="/rutas"
          className="mt-4 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Limpiar filtros
        </Link>
      )}
    </div>
  )
}
