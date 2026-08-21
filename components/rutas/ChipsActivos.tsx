// components/rutas/ChipsActivos.tsx
// Componente de servidor: son enlaces normales, no hace falta JS de cliente.
import Link from 'next/link'
import type { FiltrosRutas } from '@/lib/filtrosRutas'
import {
  construirQueryString,
  hayFiltrosActivos,
  MODALIDAD_LABELS,
  DIFICULTAD_LABELS,
  PROVINCIA_LABELS,
} from '@/lib/filtrosRutas'
import type { Facetas } from '@/lib/rutas'

type Chip = { etiqueta: string; href: string }

function construirChips(filtros: FiltrosRutas, facetas: Facetas): Chip[] {
  const chips: Chip[] = []

  const etiquetaFaceta = (lista: { valor: string; etiqueta: string }[], valor: string) =>
    lista.find((o) => o.valor === valor)?.etiqueta ?? valor

  filtros.modalidad.forEach((v) => {
    chips.push({
      etiqueta: MODALIDAD_LABELS[v] ?? v,
      href: construirQueryString(filtros, { modalidad: filtros.modalidad.filter((x) => x !== v), page: 1 }),
    })
  })
  filtros.provincia.forEach((v) => {
    chips.push({
      etiqueta: PROVINCIA_LABELS[v] ?? v,
      href: construirQueryString(filtros, { provincia: filtros.provincia.filter((x) => x !== v), page: 1 }),
    })
  })
  filtros.dificultad.forEach((v) => {
    chips.push({
      etiqueta: DIFICULTAD_LABELS[v] ?? v,
      href: construirQueryString(filtros, { dificultad: filtros.dificultad.filter((x) => x !== v), page: 1 }),
    })
  })
  filtros.tipoRecorrido.forEach((v) => {
    chips.push({
      etiqueta: etiquetaFaceta(facetas.tipoRecorrido, v),
      href: construirQueryString(filtros, { tipoRecorrido: filtros.tipoRecorrido.filter((x) => x !== v), page: 1 }),
    })
  })
  filtros.mejorEpoca.forEach((v) => {
    chips.push({
      etiqueta: etiquetaFaceta(facetas.mejorEpoca, v),
      href: construirQueryString(filtros, { mejorEpoca: filtros.mejorEpoca.filter((x) => x !== v), page: 1 }),
    })
  })
  if (filtros.distanciaMin !== null || filtros.distanciaMax !== null) {
    chips.push({
      etiqueta: `Distancia ${filtros.distanciaMin ?? '…'}–${filtros.distanciaMax ?? '…'} km`,
      href: construirQueryString(filtros, { distanciaMin: null, distanciaMax: null, page: 1 }),
    })
  }
  if (filtros.duracionMin !== null || filtros.duracionMax !== null) {
    chips.push({
      etiqueta: `Duración ${filtros.duracionMin ?? '…'}–${filtros.duracionMax ?? '…'} min`,
      href: construirQueryString(filtros, { duracionMin: null, duracionMax: null, page: 1 }),
    })
  }
  if (filtros.desnivelMin !== null || filtros.desnivelMax !== null) {
    chips.push({
      etiqueta: `Desnivel ${filtros.desnivelMin ?? '…'}–${filtros.desnivelMax ?? '…'} m`,
      href: construirQueryString(filtros, { desnivelMin: null, desnivelMax: null, page: 1 }),
    })
  }
  if (filtros.q) {
    chips.push({
      etiqueta: `“${filtros.q}”`,
      href: construirQueryString(filtros, { q: null, page: 1 }),
    })
  }

  return chips
}

export default function ChipsActivos({ filtros, facetas }: { filtros: FiltrosRutas; facetas: Facetas }) {
  if (!hayFiltrosActivos(filtros)) return null
  const chips = construirChips(filtros, facetas)
  if (chips.length === 0) return null

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {chips.map((chip, i) => (
        <Link
          key={`${chip.etiqueta}-${i}`}
          href={`/rutas${chip.href}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
        >
          {chip.etiqueta}
          <span aria-hidden>✕</span>
        </Link>
      ))}
      <Link
        href="/rutas"
        className="text-xs font-semibold text-orange-600 underline-offset-2 hover:underline"
      >
        Limpiar filtros
      </Link>
    </div>
  )
}
