// components/rutas/BloqueInfoRuta.tsx
// Bloque de sección reutilizado por Preparacion.tsx, Restricciones.tsx,
// Acceso.tsx y Servicios.tsx: título + lista de pares etiqueta/valor. No se
// renderiza nada si no hay ni un solo dato real que mostrar — así cada
// sección desaparece sola en las fichas incompletas en vez de dejar un
// hueco vacío.
type Item = { label: string; value: string }

type Props = {
  titulo: string
  icono: string
  items: Item[]
  id?: string
}

export default function BloqueInfoRuta({ titulo, icono, items, id }: Props) {
  if (items.length === 0) return null

  return (
    <section id={id} className="mt-8">
      <h2 className="mb-3 text-xl font-bold text-gray-900">
        <span aria-hidden>{icono}</span> {titulo}
      </h2>
      <dl className="grid grid-cols-1 gap-4 rounded-2xl bg-gray-50 p-5 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-xs font-medium text-gray-500">{item.label}</dt>
            <dd className="text-sm font-medium text-gray-900">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
