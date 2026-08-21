// app/rutas/[slug]/page.tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { XMLParser } from 'fast-xml-parser'
import { getRutaBySlug, getPublishedSlugs } from '@/lib/rutas'
import CabeceraRuta from '@/components/rutas/CabeceraRuta'
import DatosTecnicos from '@/components/rutas/DatosTecnicos'
import DescripcionRuta from '@/components/rutas/DescripcionRuta'
import Preparacion from '@/components/rutas/Preparacion'
import Restricciones from '@/components/rutas/Restricciones'
import Acceso from '@/components/rutas/Acceso'
import Galeria from '@/components/rutas/Galeria'
import Servicios from '@/components/rutas/Servicios'
import PerfilElevacion from '@/components/rutas/PerfilElevacion'

const MapaRuta = dynamic(() => import('@/components/mapa/MapaRuta'), { ssr: false })

// ─── GPX ─────────────────────────────────────────────────────────────────────

type GpxData = {
  gpxPoints: [number, number][]
  elevationPoints: { distancia: number; altitud: number }[]
}

const EMPTY_GPX: GpxData = { gpxPoints: [], elevationPoints: [] }

// Convierte un enlace de Dropbox "para ver" (dl=0) en uno "para descargar"
// (dl=1) — se usa tanto para el fetch de parseGpx() como para el propio
// enlace del CTA "Descargar GPX", así los dos coinciden siempre.
function urlDescargaGpx(url: string): string {
  return url.includes('dl=0') ? url.replace('dl=0', 'dl=1') : url
}

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
    const res = await fetch(urlDescargaGpx(url), {
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

export default async function RutaPage({ params }: { params: { slug: string } }) {
  const ruta = await getRutaBySlug(params.slug)
  if (!ruta) notFound()

  // El CTA "Descargar GPX" solo aparece si el archivo se ha podido
  // descargar y parsear de verdad (no basta con que el campo archivo_gpx
  // tenga un valor: la auditoría del Prompt 4 encontró que 62 de 65
  // enlaces reales de WordPress apuntan a ficheros que ya no existen).
  const { gpxPoints, elevationPoints } = ruta.archivo_gpx
    ? await parseGpx(ruta.archivo_gpx)
    : EMPTY_GPX
  const gpxDescargable =
    gpxPoints.length > 1 && ruta.archivo_gpx ? { url: urlDescargaGpx(ruta.archivo_gpx) } : null

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb — HTML plano, indexable, sin JS necesario. */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1">
        <Link href="/" className="hover:text-orange-500">Inicio</Link>
        <span>›</span>
        <Link href="/rutas" className="hover:text-orange-500">Rutas</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium truncate">{ruta.titulo}</span>
      </nav>

      {/*
        Orden pensado mobile-first, de lo más crítico a lo más secundario:
        1) Cabecera — decidir si interesa (foto, cifras clave, CTAs de
           mapa/GPX/guardar ya disponibles sin bajar más).
        2) Datos técnicos — entender la dificultad en detalle.
        3) Descripción — de qué va la ruta.
        4) Preparación — cómo prepararse antes de salir.
        5) Restricciones — permisos y avisos, antes de comprometerse.
        6) Acceso — cómo llegar, una vez decidido ir.
        7) Mapa + perfil de elevación — consulta visual detallada.
        8) Galería — material adicional, no crítico.
        9) Servicios — información de apoyo, lo último que hace falta.
      */}
      <CabeceraRuta ruta={ruta} gpxDescargable={gpxDescargable} />

      <DatosTecnicos ruta={ruta} />

      <DescripcionRuta ruta={ruta} />

      <Preparacion ruta={ruta} />

      <Restricciones ruta={ruta} />

      <Acceso ruta={ruta} />

      <section id="mapa-ruta" className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mapa de la Ruta</h2>
        <MapaRuta coordenadas={ruta.coordenadas_parking} gpxPoints={gpxPoints} />
      </section>

      {elevationPoints.length > 0 && (
        <section className="mt-8">
          <PerfilElevacion puntos={elevationPoints} />
        </section>
      )}

      <Galeria slug={ruta.slug} titulo={ruta.titulo} />

      <Servicios ruta={ruta} />
    </main>
  )
}
