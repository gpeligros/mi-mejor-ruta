// lib/mapaUtils.ts
// Lógica pura del mapa de resultados (Prompt 6), separada de
// components/rutas/MapaResultados.tsx para poder probarla sin necesidad de
// montar un mapa real ni cargar los estilos de clustering — este fichero
// solo depende de `leaflet` para construir el icono (L.divIcon no toca el
// DOM hasta que el icono se añade a un mapa).
import L from 'leaflet'
import type { PuntoMapa } from './rutas'

// Los marcadores se dibujan como círculos CSS (divIcon) en vez del icono por
// defecto de Leaflet: así no dependemos de las imágenes del paquete (rotas
// bajo webpack/Next sin configuración extra) ni de ningún CDN externo, y
// podemos cambiar de color/tamaño para reflejar el resaltado sin cargar
// icono alguno.
export function crearIcono(activo: boolean) {
  const tamano = activo ? 26 : 18
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:${tamano}px;height:${tamano}px;border-radius:9999px;background:${
      activo ? '#f97316' : '#1d4ed8'
    };border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>`,
    iconSize: [tamano, tamano],
    iconAnchor: [tamano / 2, tamano / 2],
    popupAnchor: [0, -(tamano / 2) - 2],
  })
}

// Firma estable del CONJUNTO de coordenadas: al resaltar un marcador no le
// cambian ni el id ni la posición, así que la firma no varía y no se
// dispara un nuevo encuadre del mapa — solo cambia cuando cambian de verdad
// los resultados (nuevos filtros/página). Evita los saltos molestos que
// pide el Prompt 6.
export function firmaPuntos(puntos: PuntoMapa[]): string {
  return puntos
    .map((p) => `${p.id}:${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
    .sort()
    .join('|')
}
