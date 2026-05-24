// components/rutas/Paginacion.tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Props = {
  paginaActual: number
  totalPaginas: number
}

export default function Paginacion({ paginaActual, totalPaginas }: Props) {
  if (totalPaginas <= 1) return null

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPaginas; i++) {
    if (
      i === 1 ||
      i === totalPaginas ||
      (i >= paginaActual - 2 && i <= paginaActual + 2)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  const btnBase =
    'flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-sm font-medium transition-colors'

  return (
    <nav className="flex items-center justify-center gap-1 mt-12" aria-label="Paginación">
      {paginaActual > 1 ? (
        <Link href={`/rutas?page=${paginaActual - 1}`} className={cn(btnBase, 'hover:bg-gray-50')}>
          ←
        </Link>
      ) : (
        <span className={cn(btnBase, 'opacity-40 cursor-not-allowed')}>←</span>
      )}

      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`dots-${i}`} className="w-9 text-center text-gray-400">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={`/rutas?page=${page}`}
            className={cn(
              btnBase,
              page === paginaActual
                ? 'bg-orange-500 text-white border-orange-500'
                : 'hover:bg-gray-50'
            )}
          >
            {page}
          </Link>
        )
      )}

      {paginaActual < totalPaginas ? (
        <Link href={`/rutas?page=${paginaActual + 1}`} className={cn(btnBase, 'hover:bg-gray-50')}>
          →
        </Link>
      ) : (
        <span className={cn(btnBase, 'opacity-40 cursor-not-allowed')}>→</span>
      )}
    </nav>
  )
}
