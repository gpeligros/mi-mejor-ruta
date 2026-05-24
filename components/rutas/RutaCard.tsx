// components/rutas/RutaCard.tsx
'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { RutaResumen } from '@/lib/rutas'

const MODALIDAD_COLORS: Record<string, string> = {
  senderismo: 'bg-green-600',
  bici: 'bg-orange-500',
  moto: 'bg-blue-600',
  '4x4': 'bg-amber-500',
}

const MODALIDAD_GRADIENTS: Record<string, string> = {
  senderismo: 'from-green-700 to-green-900',
  bici: 'from-orange-500 to-orange-800',
  moto: 'from-blue-600 to-blue-900',
  '4x4': 'from-amber-500 to-amber-800',
}

const MODALIDAD_LABELS: Record<string, string> = {
  senderismo: 'Senderismo',
  bici: 'Bici',
  moto: 'Moto',
  '4x4': '4x4',
}

const DIFICULTAD_COLORS: Record<string, string> = {
  facil: 'bg-green-100 text-green-800',
  moderada: 'bg-yellow-100 text-yellow-800',
  dificil: 'bg-orange-100 text-orange-800',
  muy_dificil: 'bg-red-100 text-red-800',
}

const DIFICULTAD_LABELS: Record<string, string> = {
  facil: 'Fácil',
  moderada: 'Moderada',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
}

export default function RutaCard({ ruta }: { ruta: RutaResumen }) {
  const [imgError, setImgError] = useState(false)

  const gradient = MODALIDAD_GRADIENTS[ruta.modalidad] ?? 'from-gray-600 to-gray-900'
  const modalidadColor = MODALIDAD_COLORS[ruta.modalidad] ?? 'bg-gray-500'
  const dificultadColor = DIFICULTAD_COLORS[ruta.dificultad] ?? 'bg-gray-100 text-gray-800'

  return (
    <Link
      href={`/rutas/${ruta.slug}`}
      className="group block rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow bg-white"
    >
      {/* Imagen o gradiente */}
      <div className="relative h-48">
        {!imgError ? (
          <Image
            src={`/images/rutas/${ruta.slug}_1.jpg`}
            alt={ruta.titulo}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
        )}

        {/* Badge modalidad */}
        <span
          className={`absolute top-3 left-3 ${modalidadColor} text-white text-xs font-semibold px-2 py-1 rounded-full`}
        >
          {MODALIDAD_LABELS[ruta.modalidad] ?? ruta.modalidad}
        </span>

        {/* Badge dificultad */}
        <span
          className={`absolute top-3 right-3 ${dificultadColor} text-xs font-semibold px-2 py-1 rounded-full`}
        >
          {DIFICULTAD_LABELS[ruta.dificultad] ?? ruta.dificultad}
        </span>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 line-clamp-2 mb-1 leading-snug">
          {ruta.titulo}
        </h3>
        <p className="text-sm text-gray-500 mb-3 capitalize">{ruta.provincia}</p>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
          {ruta.distancia !== null && <span>{ruta.distancia} km</span>}
          {ruta.desnivel_positivo !== null && <span>+{ruta.desnivel_positivo} m</span>}
          {ruta.duracion !== null && <span>{ruta.duracion}</span>}
        </div>

        {/* Valoración */}
        {ruta.total_valoraciones !== null && ruta.total_valoraciones > 0 && (
          <div className="flex items-center gap-1 text-sm mb-3">
            <span className="text-yellow-400">★</span>
            <span className="font-medium">{ruta.valoracion?.toFixed(1)}</span>
            <span className="text-gray-400">({ruta.total_valoraciones})</span>
          </div>
        )}

        <span className="inline-block bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-full group-hover:bg-orange-600 transition-colors">
          Ver Ruta →
        </span>
      </div>
    </Link>
  )
}
