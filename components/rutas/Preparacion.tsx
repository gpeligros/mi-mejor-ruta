// components/rutas/Preparacion.tsx
import type { RutaDetalle } from '@/lib/rutas'
import BloqueInfoRuta from './BloqueInfoRuta'

type Item = { label: string; value: string }

// Cobertura real comprobada contra las 65 rutas publicadas: forma_fisica,
// equipamiento, puntos_agua, mejor_momento_dia y avisos_seguridad están
// rellenos en la inmensa mayoría (63/65). nivel_experiencia, en cambio,
// solo existe en 1 de 65 — aparecerá casi siempre vacío, pero se deja
// preparado por si se rellena en el futuro (nunca se inventa un valor).
// Exportada para poder probarla directamente sin renderizar JSX.
export function construirItemsPreparacion(ruta: RutaDetalle): Item[] {
  const candidatos: (Item | false)[] = [
    !!ruta.forma_fisica && { label: 'Forma física recomendada', value: ruta.forma_fisica },
    !!ruta.nivel_experiencia && { label: 'Experiencia recomendada', value: ruta.nivel_experiencia },
    !!ruta.equipamiento && { label: 'Equipamiento', value: ruta.equipamiento },
    !!ruta.puntos_agua && { label: 'Agua', value: ruta.puntos_agua },
    !!ruta.mejor_momento_dia && { label: 'Mejor momento del día', value: ruta.mejor_momento_dia },
    !!ruta.avisos_seguridad && { label: 'Avisos de seguridad', value: ruta.avisos_seguridad },
  ]
  return candidatos.filter((i): i is Item => i !== false)
}

export default function Preparacion({ ruta }: { ruta: RutaDetalle }) {
  return (
    <BloqueInfoRuta
      id="preparacion"
      titulo="Prepara la salida"
      icono="🎒"
      items={construirItemsPreparacion(ruta)}
    />
  )
}
