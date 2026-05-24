// app/page.tsx
import Image from 'next/image'
import Link from 'next/link'
import { getRutasDestacadas } from '@/lib/rutas'
import RutaCard from '@/components/rutas/RutaCard'

export default async function HomePage() {
  const rutasDestacadas = await getRutasDestacadas()

  return (
    <main>
      {/* Hero */}
      <section className="relative h-[85vh] min-h-[500px]">
        <Image
          src="/images/rutas/ruta-del-cares_1.jpg"
          alt="Ruta del Cares — Picos de Europa"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white text-center px-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
            Descubre España a tu ritmo
          </h1>
          <p className="text-lg sm:text-xl text-gray-200 mb-8 max-w-xl">
            1.225 rutas de senderismo, bici, moto y 4x4 por toda España
          </p>
          <Link
            href="/rutas"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-colors"
          >
            Ver todas las rutas
          </Link>
        </div>
      </section>

      {/* Rutas destacadas */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Rutas destacadas</h2>
        {rutasDestacadas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rutasDestacadas.map((ruta) => (
              <RutaCard key={ruta.id} ruta={ruta} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No hay rutas publicadas todavía.</p>
        )}
        <div className="mt-10 text-center">
          <Link
            href="/rutas"
            className="inline-block border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-semibold py-2 px-8 rounded-full transition-colors"
          >
            Ver todas las rutas →
          </Link>
        </div>
      </section>
    </main>
  )
}
