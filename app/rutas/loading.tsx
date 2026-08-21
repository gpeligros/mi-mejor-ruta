// app/rutas/loading.tsx
// Next.js lo muestra automáticamente mientras se resuelve app/rutas/page.tsx
// (la primera carga y cada navegación con parámetros nuevos).
function TarjetaEsqueleto() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-md">
      <div className="h-48 bg-gray-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
        <div className="h-3 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  )
}

export default function CargandoRutas() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 h-9 w-56 animate-pulse rounded bg-gray-200" />
      <div className="mb-6 h-12 w-full animate-pulse rounded-full bg-gray-100 lg:max-w-xl" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <TarjetaEsqueleto key={i} />
        ))}
      </div>
    </main>
  )
}
