import type { Metadata } from 'next'
import { getRutas } from '@/lib/rutas'
import RutaCard from '@/components/rutas/RutaCard'
import Paginacion from '@/components/rutas/Paginacion'

export const metadata: Metadata = {
  title: 'Todas las Rutas',
  description:
    'Explora más de 1.200 rutas de senderismo, bici, moto y 4x4 por toda España.',
}

const PER_PAGE = 12

export default async function RutasPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)
  const { rutas, total } = await getRutas(page, PER_PAGE)
  const totalPaginas = Math.ceil(total / PER_PAGE)

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Todas las Rutas</h1>
        <p className="text-gray-500 mt-1">{total.toLocaleString('es-ES')} rutas disponibles</p>
      </div>

      {rutas.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rutas.map((ruta) => (
            <RutaCard key={ruta.id} ruta={ruta} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No se encontraron rutas.</p>
      )}

      <Paginacion paginaActual={page} totalPaginas={totalPaginas} />
    </main>
  )
}
