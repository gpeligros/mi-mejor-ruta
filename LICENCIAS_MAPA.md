# Licencias y atribuciones — mapa interactivo (Prompt 6)

Este documento recoge todo lo que hay que atribuir o respetar por usar mapas
(teselas, librerías de mapeo y agrupación de marcadores) en Mi Mejor Ruta:
tanto en el mapa de resultados de `/rutas` como en el mapa de la ficha
individual de cada ruta.

## 1. Teselas del mapa — OpenStreetMap

Las teselas (las imágenes que forman el mapa) se cargan desde
`tile.openstreetmap.org`, el servidor de teselas estándar de OpenStreetMap.
**No se usa OpenTopoMap** en ningún mapa de la aplicación, así que no hay
atribución pendiente hacia ese proveedor.

- **Atribución obligatoria**: "© OpenStreetMap contributors" (o el enlace a
  `https://www.openstreetmap.org/copyright`), visible en el propio mapa. Ya
  está implementada en el `TileLayer` de `MapaResultados.tsx` y
  `MapaRuta.tsx` — Leaflet la muestra siempre en la esquina del mapa, no se
  puede quitar.
- **Datos**: © colaboradores de OpenStreetMap, bajo licencia
  [ODbL (Open Database License)](https://opendatacommons.org/licenses/odbl/).
- **Uso del servidor de teselas**: `tile.openstreetmap.org` es un servicio
  gratuito mantenido por voluntarios, sujeto a la
  [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
  de la OSM Foundation — pensada para uso ligero/de pruebas, no para tráfico
  de producción alto. Con pocos usuarios no hay problema, pero si el sitio
  crece en visitas conviene pasar a un proveedor de teselas dedicado (p.ej.
  MapTiler, Mapbox, Stadia Maps, o un servidor propio con
  [OpenMapTiles](https://openmaptiles.org/)) para no sobrecargar el servicio
  gratuito ni arriesgarse a que bloqueen las peticiones del sitio.

## 2. Librerías de mapeo

| Paquete | Versión | Licencia | Uso en el proyecto |
|---|---|---|---|
| `leaflet` | 1.9.x | BSD-2-Clause | Motor del mapa (base de todo lo demás) |
| `react-leaflet` | 4.2.x | Hippocratic License 2.1 | Componentes React sobre Leaflet |
| `react-leaflet-cluster` | 3.1.x | MIT | Agrupación (clustering) de marcadores |
| `leaflet.markercluster` | 1.5.x | MIT | Motor de clustering usado por el paquete anterior |

Todas son de código abierto y no exigen mostrar un aviso visible en la
aplicación (a diferencia de las teselas de OpenStreetMap) — el requisito de
las licencias MIT y BSD es conservar el aviso de copyright en el código
fuente, cosa que ya se cumple al no eliminar los ficheros `LICENSE` de cada
paquete dentro de `node_modules`.

La única que merece una nota aparte es **react-leaflet**: usa la
[Hippocratic License 2.1](https://firstdonoharm.dev/), una licencia de
código abierto "ético" — funciona como una MIT normal (uso, copia,
modificación y distribución libres) pero añade una cláusula pidiendo que el
software no se use de forma incompatible con los derechos humanos
reconocidos por Naciones Unidas. Para el uso que le da este proyecto (un
sitio de rutas de senderismo) no supone ninguna restricción práctica; se
menciona aquí solo para que quede constancia, ya que no es una licencia tan
habitual como MIT o BSD.

## 3. Estilos CSS incluidos

Los "globos" de agrupación (el círculo con el número de rutas que se ve al
alejar el zoom) usan las hojas de estilo que trae `leaflet.markercluster`:

```
leaflet.markercluster/dist/MarkerCluster.css
leaflet.markercluster/dist/MarkerCluster.Default.css
```

Se importan directamente en `MapaResultados.tsx`; van incluidas en el
propio paquete npm y comparten su licencia MIT.

## 4. Datos de las rutas

Las coordenadas, tracks GPX y demás datos de cada ruta son contenido propio
de Mi Mejor Ruta (migrado desde el WordPress original) y no proceden de
OpenStreetMap ni de ningún proveedor externo — no hay atribución adicional
que dar por esa parte.
