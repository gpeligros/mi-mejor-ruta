// components/rutas/Galeria.tsx
import { existsSync } from 'fs'
import { join } from 'path'
import Image from 'next/image'

// No hay ninguna tabla ni campo que diga "esta ruta tiene N fotos" — las
// imágenes son ficheros sueltos en /public con el patrón {slug}_{n}.jpg
// (1, 2, 3...). En vez de inventar un número fijo, se comprueba en el
// servidor cuáles existen de verdad y se para en el primer hueco.
const MAX_IMAGENES_A_COMPROBAR = 20

export function listarImagenesReales(slug: string): string[] {
  const encontradas: string[] = []
  for (let i = 1; i <= MAX_IMAGENES_A_COMPROBAR; i++) {
    const nombre = `${slug}_${i}.jpg`
    const existe = (() => {
      try {
        return existsSync(join(process.cwd(), 'public', 'images', 'rutas', nombre))
      } catch {
        return false
      }
    })()
    if (!existe) break
    encontradas.push(`/images/rutas/${nombre}`)
  }
  return encontradas
}

export default function Galeria({ slug, titulo }: { slug: string; titulo: string }) {
  const imagenes = listarImagenesReales(slug)
  // La primera foto (_1.jpg) ya se usa como portada en la cabecera de la
  // ficha — aquí solo tiene sentido mostrar el resto, y solo si hay más de
  // una.
  const resto = imagenes.slice(1)
  if (resto.length === 0) return null

  return (
    <section id="galeria" className="mt-8">
      <h2 className="mb-3 text-xl font-bold text-gray-900">
        <span aria-hidden>📷</span> Galería
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {resto.map((src) => (
          <div key={src} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
            <Image src={src} alt={titulo} fill className="object-cover" sizes="(min-width: 640px) 33vw, 50vw" />
          </div>
        ))}
      </div>
      {/*
        Autor, licencia y pie de foto: el Prompt 7 los pide, pero hoy no
        existe ningún campo en la base de datos ni convención de fichero
        que los guarde — mostrarlos ahora sería inventarlos. En cuanto haya
        una fuente real (p.ej. una tabla `imagenes_ruta` con esos campos),
        añadir aquí un <figcaption> por imagen, condicionado a que el dato
        exista, igual que el resto de la ficha.
      */}
    </section>
  )
}
