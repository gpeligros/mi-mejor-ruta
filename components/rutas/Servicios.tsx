// components/rutas/Servicios.tsx
import type { RutaDetalle } from '@/lib/rutas'
import BloqueInfoRuta from './BloqueInfoRuta'

type Item = { label: string; value: string }

// El Prompt 7 pide "restauración" como campo propio, pero no existe esa
// columna en la tabla Ruta — lo más cercano es `servicios_cercanos`, un
// texto libre genérico (p.ej. "Servicios básicos") que puede incluir o no
// restauración según la ruta. Se muestra tal cual, sin inventar una
// categoría "Restauración" separada que no está respaldada por un dato
// real. `zonas_camping` está en el esquema pero vacío en las 65 rutas
// reales (0/65) — se deja preparado por si se rellena más adelante.
export function construirItemsServicios(ruta: RutaDetalle): Item[] {
  const candidatos: (Item | false)[] = [
    !!ruta.alojamiento_cercano && { label: 'Alojamiento cercano', value: ruta.alojamiento_cercano },
    !!ruta.servicios_cercanos && { label: 'Servicios cercanos', value: ruta.servicios_cercanos },
    !!ruta.zonas_camping && { label: 'Zonas de camping', value: ruta.zonas_camping },
  ]
  return candidatos.filter((i): i is Item => i !== false)
}

export default function Servicios({ ruta }: { ruta: RutaDetalle }) {
  return (
    <BloqueInfoRuta
      id="servicios"
      titulo="Servicios cercanos"
      icono="🏨"
      items={construirItemsServicios(ruta)}
    />
  )
}
