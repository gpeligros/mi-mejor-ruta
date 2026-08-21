// app/rutas/error.tsx
// Los error.tsx de Next.js son obligatoriamente de cliente.
'use client'

import { useEffect } from 'react'

export default function ErrorRutas({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error al cargar /rutas:', error)
  }, [error])

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <span className="mb-3 text-4xl" aria-hidden>
          ⚠️
        </span>
        <h1 className="text-lg font-bold text-gray-900">No hemos podido cargar las rutas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ha habido un problema al conectar con la base de datos. No es culpa tuya — puedes
          intentarlo de nuevo.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Reintentar
        </button>
      </div>
    </main>
  )
}
