// components/rutas/DescripcionRuta.tsx
import type { RutaDetalle } from '@/lib/rutas'

type Bloque = { titulo: string; texto: string }

// "Qué encontrarás" no tiene una columna propia en la tabla Ruta — el campo
// real más cercano es `ecosistema` (texto libre sobre el entorno: fauna,
// flora, tipo de paisaje...), así que se reutiliza con esa etiqueta en vez
// de inventar una sección sin datos detrás.
export function construirBloques(ruta: RutaDetalle): Bloque[] {
  const bloques: (Bloque | false)[] = [
    !!ruta.descripcion && { titulo: 'Sobre la ruta', texto: ruta.descripcion },
    !!ruta.ecosistema && { titulo: 'Qué encontrarás', texto: ruta.ecosistema },
    !!ruta.puntos_interes && { titulo: 'Puntos de interés', texto: ruta.puntos_interes },
  ]
  return bloques.filter((b): b is Bloque => b !== false)
}

export default function DescripcionRuta({ ruta }: { ruta: RutaDetalle }) {
  const bloques = construirBloques(ruta)
  if (bloques.length === 0) return null

  return (
    <section className="mt-8 space-y-6">
      {bloques.map((b) => (
        <div key={b.titulo}>
          <h2 className="mb-2 text-xl font-bold text-gray-900">{b.titulo}</h2>
          <p className="leading-relaxed text-gray-700">{b.texto}</p>
        </div>
      ))}
    </section>
  )
}
