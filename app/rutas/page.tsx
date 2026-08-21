import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { buscarRutas } from '@/lib/rutas'
import { parsearFiltros, debeSerNoIndexable, PER_PAGE, type BusquedaSearchParams } from '@/lib/filtrosRutas'
import RutaCard from '@/components/rutas/RutaCard'
import Paginacion from '@/components/rutas/Paginacion'
import BarraBusqueda from '@/components/rutas/BarraBusqueda'
import PanelFiltros from '@/components/rutas/PanelFiltros'
import FiltrosMovil from '@/components/rutas/FiltrosMovil'
import ChipsActivos from '@/components/rutas/ChipsActivos'
import SelectorOrden from '@/components/rutas/SelectorOrden'
import ToggleVistaListaMapa from '@/components/rutas/ToggleVistaListaMapa'
import EstadoVacio from '@/components/rutas/EstadoVacio'

// El mapa usa Leaflet, que necesita el DOM del navegador — se carga solo en cliente.
const MapaResultados = dynamic(() => import('@/components/rutas/MapaResultados'), { ssr: false })

type Props = { searchParams: BusquedaSearchParams }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filtros = parsearFiltros(searchParams)
  return {
    title: 'Todas las Rutas',
    description:
      'Encuentra tu ruta de senderismo, bici, moto o 4x4 por toda España, filtrando por provincia, dificultad, distancia y mucho más.',
    // Las combinaciones de filtros no se indexan para no generar miles de
    // páginas casi idénticas ante los buscadores; el listado base y los
    // filtros de una sola modalidad o provincia sí se indexan.
    robots: debeSerNoIndexable(filtros) ? { index: false, follow: true } : { index: true, follow: true },
  }
}

export default async function RutasPage({ searchParams }: Props) {
  const filtros = parsearFiltros(searchParams)
  const { rutas, total, facetas } = await buscarRutas(filtros)
  const totalPaginas = Math.ceil(total / PER_PAGE)

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-gray-900">Todas las Rutas</h1>
        <p className="text-gray-500">
          {facetas.totalPublicadas.toLocaleString('es-ES')} rutas publicadas
        </p>
      </div>

      <BarraBusqueda filtros={filtros} className="mb-6 lg:max-w-xl" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filtros: fijos en escritorio, en panel deslizante en móvil */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-gray-100 p-4">
            <h2 className="mb-2 text-sm font-bold text-gray-900">Filtros</h2>
            <PanelFiltros facetas={facetas} filtros={filtros} />
          </div>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FiltrosMovil facetas={facetas} filtros={filtros} />
              <p className="text-sm text-gray-500">
                {total.toLocaleString('es-ES')} {total === 1 ? 'resultado' : 'resultados'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ToggleVistaListaMapa filtros={filtros} />
              <SelectorOrden filtros={filtros} />
            </div>
          </div>

          <ChipsActivos filtros={filtros} facetas={facetas} />

          {rutas.length === 0 ? (
            <EstadoVacio filtros={filtros} />
          ) : filtros.vista === 'mapa' ? (
            <MapaResultados rutas={rutas} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {rutas.map((ruta) => (
                <RutaCard key={ruta.id} ruta={ruta} />
              ))}
            </div>
          )}

          <Paginacion filtros={filtros} totalPaginas={totalPaginas} />
        </div>
      </div>
    </main>
  )
}
