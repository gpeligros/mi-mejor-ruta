// components/rutas/BotonGuardarRuta.tsx
'use client'
import { useEffect, useState } from 'react'

// Guarda favoritos en localStorage del navegador — todavía no hay sistema
// de usuarios ni login (Fase 3 de CONTEXTO.md, pendiente), así que esto es
// un "guardado" solo para este navegador, no una cuenta. El día que exista
// login, migrar es sencillo: cambiar leerGuardadas()/guardar() por una
// llamada a Supabase con el id del usuario, manteniendo el mismo botón.
const CLAVE_LOCALSTORAGE = 'mi-mejor-ruta:rutas-guardadas'

function leerGuardadas(): string[] {
  try {
    const raw = localStorage.getItem(CLAVE_LOCALSTORAGE)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    // localStorage puede fallar (navegación privada, cuota superada...) —
    // se degrada a "no guardado" en vez de romper la página.
    return []
  }
}

function escribirGuardadas(slugs: string[]) {
  try {
    localStorage.setItem(CLAVE_LOCALSTORAGE, JSON.stringify(slugs))
  } catch {
    // Si no se puede escribir, el botón simplemente no persiste — no es un
    // error que deba interrumpir al usuario.
  }
}

export default function BotonGuardarRuta({ slug }: { slug: string }) {
  const [guardada, setGuardada] = useState(false)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    setGuardada(leerGuardadas().includes(slug))
    setListo(true)
  }, [slug])

  function alternar() {
    const actuales = leerGuardadas()
    const yaEstaba = actuales.includes(slug)
    const nuevas = yaEstaba ? actuales.filter((s) => s !== slug) : [...actuales, slug]
    escribirGuardadas(nuevas)
    setGuardada(!yaEstaba)
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={guardada}
      // Antes de montar en el cliente no sabemos aún si está guardada (evita
      // parpadeo al hidratar); una vez listo, refleja el estado real.
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        listo && guardada
          ? 'border-orange-500 bg-orange-50 text-orange-600'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
      }`}
    >
      <span aria-hidden>{listo && guardada ? '★' : '☆'}</span>
      {listo && guardada ? 'Guardada' : 'Guardar'}
    </button>
  )
}
