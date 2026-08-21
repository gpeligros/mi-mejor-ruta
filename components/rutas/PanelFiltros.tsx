// components/rutas/PanelFiltros.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import type { Facetas } from '@/lib/rutas'
import type { FiltrosRutas } from '@/lib/filtrosRutas'
import { construirQueryString } from '@/lib/filtrosRutas'

type Props = {
  facetas: Facetas
  filtros: FiltrosRutas
}

// ─── Filtros P2 "preparados" ────────────────────────────────────────────────
// Estos son los filtros que pide el Prompt 5 como "preparados": niños,
// perros, agua, sombra, parking, transporte público, refugio, cascadas,
// lagos, bosque, nieve, costa, patrimonio. Hoy NINGUNO tiene datos reales
// detrás — en la tabla "Ruta" son campos de texto libre (puntos_agua,
// servicios_cercanos...), no una etiqueta sí/no por ruta, así que no se
// puede filtrar por ellos de forma fiable. Por eso esta lista está vacía a
// propósito: en cuanto existan datos reales (la tabla "caracteristicas" del
// Prompt 4, una vez migrada a producción), se rellena con las opciones
// reales — el resto del panel ya está preparado para admitir una sección
// más sin cambios de diseño.
const OPCIONES_P2: { valor: string; etiqueta: string }[] = []

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [abierta, setAbierta] = useState(true)
  return (
    <div className="border-b border-gray-100 py-4 first:pt-0 last:border-b-0">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold text-gray-900"
      >
        {titulo}
        <span className="text-gray-400">{abierta ? '−' : '+'}</span>
      </button>
      {abierta && <div className="mt-3">{children}</div>}
    </div>
  )
}

function ChipsMultiSelect({
  opciones,
  seleccion,
  onToggle,
}: {
  opciones: { valor: string; etiqueta: string; total: number }[]
  seleccion: string[]
  onToggle: (valor: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((op) => {
        const activo = seleccion.includes(op.valor)
        return (
          <button
            key={op.valor}
            type="button"
            onClick={() => onToggle(op.valor)}
            aria-pressed={activo}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activo
                ? 'border-orange-500 bg-orange-500 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
            }`}
          >
            {op.etiqueta} <span className={activo ? 'text-orange-100' : 'text-gray-400'}>({op.total})</span>
          </button>
        )
      })}
    </div>
  )
}

function RangoNumerico({
  etiqueta,
  unidad,
  rango,
  min,
  max,
  onCambiar,
}: {
  etiqueta: string
  unidad: string
  rango: [number, number]
  min: number | null
  max: number | null
  onCambiar: (min: number | null, max: number | null) => void
}) {
  return (
    <div>
      <div className="mb-2 text-xs text-gray-500">
        {etiqueta} ({rango[0]}–{rango[1]} {unidad})
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          placeholder={`Mín (${rango[0]})`}
          defaultValue={min ?? ''}
          onBlur={(e) => onCambiar(e.target.value === '' ? null : Number(e.target.value), max)}
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
        />
        <span className="text-gray-300">–</span>
        <input
          type="number"
          inputMode="decimal"
          placeholder={`Máx (${rango[1]})`}
          defaultValue={max ?? ''}
          onBlur={(e) => onCambiar(min, e.target.value === '' ? null : Number(e.target.value))}
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
        />
      </div>
    </div>
  )
}

export default function PanelFiltros({ facetas, filtros }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function navegar(cambios: Partial<FiltrosRutas>) {
    const conPagina = { page: 1, ...cambios }
    router.push(`${pathname}${construirQueryString(filtros, conPagina)}`)
  }

  function toggleEnLista(campo: 'modalidad' | 'provincia' | 'dificultad' | 'tipoRecorrido' | 'mejorEpoca', valor: string) {
    const actual = filtros[campo]
    const nuevo = actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor]
    navegar({ [campo]: nuevo } as Partial<FiltrosRutas>)
  }

  return (
    <div className="divide-y divide-gray-100">
      {facetas.modalidad.length > 0 && (
        <Seccion titulo="Modalidad">
          <ChipsMultiSelect
            opciones={facetas.modalidad}
            seleccion={filtros.modalidad}
            onToggle={(v) => toggleEnLista('modalidad', v)}
          />
        </Seccion>
      )}

      {facetas.provincia.length > 0 && (
        <Seccion titulo="Provincia">
          <ChipsMultiSelect
            opciones={facetas.provincia}
            seleccion={filtros.provincia}
            onToggle={(v) => toggleEnLista('provincia', v)}
          />
        </Seccion>
      )}

      {facetas.dificultad.length > 0 && (
        <Seccion titulo="Dificultad">
          <ChipsMultiSelect
            opciones={facetas.dificultad}
            seleccion={filtros.dificultad}
            onToggle={(v) => toggleEnLista('dificultad', v)}
          />
        </Seccion>
      )}

      {facetas.rangoDistancia && (
        <Seccion titulo="Distancia">
          <RangoNumerico
            etiqueta="Distancia"
            unidad="km"
            rango={facetas.rangoDistancia}
            min={filtros.distanciaMin}
            max={filtros.distanciaMax}
            onCambiar={(min, max) => navegar({ distanciaMin: min, distanciaMax: max })}
          />
        </Seccion>
      )}

      {facetas.rangoDuracionMinutos && (
        <Seccion titulo="Duración">
          <RangoNumerico
            etiqueta="Duración"
            unidad="min"
            rango={facetas.rangoDuracionMinutos}
            min={filtros.duracionMin}
            max={filtros.duracionMax}
            onCambiar={(min, max) => navegar({ duracionMin: min, duracionMax: max })}
          />
        </Seccion>
      )}

      {facetas.rangoDesnivel && (
        <Seccion titulo="Desnivel positivo">
          <RangoNumerico
            etiqueta="Desnivel"
            unidad="m"
            rango={facetas.rangoDesnivel}
            min={filtros.desnivelMin}
            max={filtros.desnivelMax}
            onCambiar={(min, max) => navegar({ desnivelMin: min, desnivelMax: max })}
          />
        </Seccion>
      )}

      {facetas.tipoRecorrido.length > 0 && (
        <Seccion titulo="Tipo de recorrido">
          <ChipsMultiSelect
            opciones={facetas.tipoRecorrido}
            seleccion={filtros.tipoRecorrido}
            onToggle={(v) => toggleEnLista('tipoRecorrido', v)}
          />
        </Seccion>
      )}

      {facetas.mejorEpoca.length > 0 && (
        <Seccion titulo="Mejor época">
          <ChipsMultiSelect
            opciones={facetas.mejorEpoca}
            seleccion={filtros.mejorEpoca}
            onToggle={(v) => toggleEnLista('mejorEpoca', v)}
          />
        </Seccion>
      )}

      {/* Filtros P2 preparados: no se renderiza nada mientras OPCIONES_P2 esté
          vacío — ver comentario arriba del fichero. */}
      {OPCIONES_P2.length > 0 && (
        <Seccion titulo="Características">
          <ChipsMultiSelect
            opciones={OPCIONES_P2.map((o) => ({ ...o, total: 0 }))}
            seleccion={[]}
            onToggle={() => {}}
          />
        </Seccion>
      )}
    </div>
  )
}
