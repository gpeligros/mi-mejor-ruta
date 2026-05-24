// app/rutas/[slug]/page.tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { XMLParser } from 'fast-xml-parser'
import { getRutaBySlug, getPublishedSlugs } from '@/lib/rutas'
import DatosTecnicos from '@/components/rutas/DatosTecnicos'
import PerfilElevacion from '@/components/rutas/PerfilElevacion'

const MapaRuta = dynamic(() => import('@/components/rutas/MapaRuta'), { ssr: false })

// ─── GPX ─────────────────────────────────────────────────────────────────────

type GpxData = {
  gpxPoints: [number, number][]
  elevationPoints: { distancia: number; altitud: number }[]
}

const EMPTY_GPX: GpxData = { gpxPoints: [], elevationPoints: [] }

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function parseGpx(url: string): Promise<GpxData> {
  try {
    const downloadUrl = url.includes('dl=0') ? url.replace('dl=0', 'dl=1') : url
    const res = await fetch(downloadUrl, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return EMPTY_GPX
    const text = await res.text()

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      isArray: (name) => name === 'trkpt',
    })
    const parsed = parser.parse(text) as {
      gpx?: { trk?: { trkseg?: { trkpt?: unknown[] } } }
    }

    type TrkPt = { lat: string; lon: string; ele?: string | number }
    const rawPts = parsed?.gpx?.trk?.trkseg?.trkpt ?? []
    const points = (rawPts as TrkPt[]).filter(
      (p) => p.lat != null && p.lon != null
    )
    if (points.length === 0) return EMPTY_GPX

    const gpxPoints: [number, number][] = points.map((p) => [
      parseFloat(p.lat),
      parseFloat(p.lon),
    ])

    let cumDist = 0
    const elevationPoints = points.map((p, i) => {
      if (i > 0) {
        const prev = points[i - 1]!
        cumDist += haversineKm(
          parseFloat(prev.lat),
          parseFloat(prev.lon),
          parseFloat(p.lat),
          parseFloat(p.lon)
        )
      }
      return {
        distancia: Math.round(cumDist * 100) / 100,
        altitud:
          p.ele !== undefined ? Math.round(parseFloat(String(p.ele))) : 0,
      }
    })

    return { gpxPoints, elevationPoints }
  } catch {
    return EMPTY_GPX
  }
}

// ─── Static params ────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs()
  return slugs.map(({ slug }) => ({ slug }))
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const ruta = await getRutaBySlug(params.slug)
  if (!ruta) return { title: 'Ruta no encontrada' }
  return {
    title: ruta.titulo,
    description:
      ruta.descripcion?.substring(0, 160) ??
      `Ruta de ${ruta.modalidad} en ${ruta.provincia}. ${ruta.distancia ?? ''} km.`,
  }
}

// ─── Página ───────────────────────────────────────────────────────────────────

function Badge({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 text-sm">
      <span>{icon}</span>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-medium text-gray-900 line-clamp-2">{value}</div>
      </div>
    </div>
  )
}

export default async function RutaPage({ params }: { params: { slug: string } }) {
  const ruta = await getRutaBySlug(params.slug)
  if (!ruta) notFound()

  const { gpxPoints, elevationPoints } = ruta.archivo_gpx
    ? await parseGpx(ruta.archivo_gpx)
    : EMPTY_GPX

  const tieneValoracion =
    ruta.total_valoraciones !== null && ruta.total_valoraciones > 0

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1">
        <Link href="/" className="hover:text-orange-500">Inicio</Link>
        <span>›</span>
        <Link href="/rutas" className="hover:text-orange-500">Rutas</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium truncate">{ruta.titulo}</span>
      </nav>

      {/* Cabecera */}
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{ruta.titulo}</h1>

      {tieneValoracion && (
        <div className="flex items-center gap-2 mb-8 text-sm text-gray-600">
          <span className="text-yellow-400 text-lg leading-none">
            {'★'.repeat(Math.min(5, Math.round(ruta.valoracion ?? 0)))}
            {'☆'.repeat(Math.max(0, 5 - Math.round(ruta.valoracion ?? 0)))}
          </span>
          <span className="font-medium">{ruta.valoracion?.toFixed(1)}</span>
          <span>({ruta.total_valoraciones} valoraciones)</span>
        </div>
      )}

      {/* Datos técnicos */}
      <DatosTecnicos ruta={ruta} />

      {/* Descripción */}
      {!!ruta.descripcion && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Sobre la Ruta</h2>
          <p className="text-gray-700 leading-relaxed">{ruta.descripcion}</p>
        </section>
      )}

      {/* Badges informativos */}
      {!!(ruta.ecosistema || ruta.puntos_agua || ruta.puntos_interes) && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ruta.ecosistema !== null && (
            <Badge label="Ecosistema" value={ruta.ecosistema} icon="🌿" />
          )}
          {ruta.puntos_agua !== null && (
            <Badge label="Puntos de agua" value={ruta.puntos_agua} icon="💧" />
          )}
          {ruta.puntos_interes !== null && (
            <Badge label="Puntos de interés" value={ruta.puntos_interes} icon="📍" />
          )}
        </div>
      )}

      {/* Mapa */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mapa de la Ruta</h2>
        <MapaRuta coordenadas={ruta.coordenadas_parking} gpxPoints={gpxPoints} />
      </section>

      {/* Perfil de elevación */}
      {elevationPoints.length > 0 && (
        <section className="mt-8">
          <PerfilElevacion puntos={elevationPoints} />
        </section>
      )}
    </main>
  )
}
