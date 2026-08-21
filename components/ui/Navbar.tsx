import Image from 'next/image'
import Link from 'next/link'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.jpg"
              alt="Mi Mejor Ruta"
              width={36}
              height={36}
              className="rounded-md"
              priority
            />
            <span className="text-xl font-bold text-orange-500 tracking-tight">
              Mi Mejor Ruta
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-600 hover:text-orange-500 font-medium transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/rutas"
              className="text-gray-600 hover:text-orange-500 font-medium transition-colors"
            >
              Rutas
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
