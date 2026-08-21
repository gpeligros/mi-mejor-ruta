// components/rutas/BarraBusqueda.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { FiltrosRutas } from '@/lib/filtrosRutas'
import { construirQueryString } from '@/lib/filtrosRutas'

type Props = {
  filtros: FiltrosRutas
  className?: string
}

const DEBOUNCE_MS = 350

export default function BarraBusqueda({ filtros, className }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [valor, setValor] = useState(filtros.q ?? '')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Si el usuario navega (atrás/adelante, o quita el filtro desde un chip),
  // el campo debe reflejar el valor real de la URL.
  useEffect(() => {
    setValor(filtros.q ?? '')
  }, [filtros.q])

  function buscar(texto: string) {
    const qs = construirQueryString(filtros, { q: texto.trim() || null, page: 1 })
    router.push(`${pathname}${qs}`)
  }

  function onChange(nuevoValor: string) {
    setValor(nuevoValor)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => buscar(nuevoValor), DEBOUNCE_MS)
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        buscar(valor)
      }}
      className={className}
    >
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
          🔍
        </span>
        <input
          type="search"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Busca por nombre o provincia…"
          className="w-full rounded-full border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          aria-label="Buscar rutas"
        />
      </div>
    </form>
  )
}
