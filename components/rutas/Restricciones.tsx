// components/rutas/Restricciones.tsx
import type { RutaDetalle } from '@/lib/rutas'
import BloqueInfoRuta from './BloqueInfoRuta'

type Item = { label: string; value: string }

// No existe en la tabla Ruta un campo separado para "cierres" — el dato
// real disponible es `restricciones_permisos` (texto libre, bien relleno:
// 63/65 rutas reales), que en la práctica ya recoge permisos, espacios
// protegidos y ese tipo de avisos juntos. `permisos_necesarios` es un campo
// más específico pero casi vacío en los datos reales (1/65) — se muestra
// igualmente cuando existe, sin inventar contenido para el resto.
export function construirItemsRestricciones(ruta: RutaDetalle): Item[] {
  const candidatos: (Item | false)[] = [
    !!ruta.restricciones_permisos && {
      label: 'Permisos y restricciones',
      value: ruta.restricciones_permisos,
    },
    !!ruta.permisos_necesarios && { label: 'Permisos necesarios', value: ruta.permisos_necesarios },
  ]
  return candidatos.filter((i): i is Item => i !== false)
}

export default function Restricciones({ ruta }: { ruta: RutaDetalle }) {
  return (
    <BloqueInfoRuta
      id="restricciones"
      titulo="Restricciones y permisos"
      icono="⚠️"
      items={construirItemsRestricciones(ruta)}
    />
  )
}
