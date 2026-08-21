# Inventario de WordPress — punto de partida de la migración

*Solo lectura. No se ha tocado nada de WordPress para hacer este inventario — todo sale de leer el fichero de exportación (`rutasespaa.WordPress.2026-05-22.xml`) y, en un punto muy concreto, de mirar directamente la carpeta de archivos subidos. 21 de agosto de 2026.*

Este documento es el "mapa del terreno" antes de mover nada: qué hay exactamente en WordPress hoy, contado de verdad (no estimado), para que el resto de la migración parta de hechos y no de suposiciones.

---

## 1. Qué contiene el export de WordPress

| Tipo de contenido | Cuántos hay |
|---|---|
| Rutas (`post_type = ruta`) | 1.225 |
| Archivos adjuntos (imágenes, GPX subidos como adjunto) | 75 |
| Páginas normales | 8 |
| Elementos de menú | 8 |
| Otros (estilos globales, CSS personalizado, navegación) | 4 |

De las 1.225 rutas, **solo 65 están publicadas** (`status = publish`); las otras 1.160 son borradores (`status = draft`) — en su mayoría plantillas repetidas sin desarrollar, como ya se detectó en la auditoría de datos (Prompt 2: 284 títulos duplicados). Esta cifra de 65 es la que ya se veía en la web en producción, y coincide exactamente con lo que hoy muestra `mi-mejor-ruta.vercel.app`.

## 2. Estructura de una ruta en WordPress

**Tipo de contenido:** `ruta` (Custom Post Type, vía el plugin Pods)

**Taxonomías (categorías) usadas:** exactamente 3 — `modalidad`, `dificultad`, `provincia`. No hay ninguna taxonomía más colgando de una ruta.

**Campos personalizados (Pods):** 57 campos distintos, agrupados así:

- *Datos generales:* `sobre_ruta` (descripción), `distancia`, `duracion`, `duracion_horas`, `duracion_minutos`, `desnivel_positivo`, `desnivel_negativo`, `altitud_maxima`, `altitud_minima`, `tipo_recorrido`, `tipo_ruta`
- *Ubicación y logística:* `punto_inicio`, `coordenadas_parking`, `como_llegar`, `transporte_publico`, `mejor_epoca`, `mejor_momento_dia`, `equipamiento`, `puntos_agua`, `puntos_interes`, `servicios_cercanos`, `alojamiento_cercano`, `zonas_camping`
- *Multimedia y valoración:* `galeria`, `archivo_gpx`, `valoracion`, `rank_math_seo_score`
- *Específicos de senderismo:* `ecosistema`, `flora`, `fauna`, `nivel_experiencia`, `forma_fisica`, `puntos_de_avituallamiento`, `avisos_seguridad`, `restricciones_permisos`, `permisos_especiales`, `permisos_necesarios`, `epoca_nieve`
- *Específicos de bici:* `tipo_bici`, `nivel_tecnico_bici`, `tipo_terreno_bici`, `talleres_bici`
- *Específicos de moto:* `tipo_de_carretera`, `estado_asfalto`, `puertos_montana`, `peajes`, `gasolineras_ruta`, `puntos_moteros`, `zonas_descanso_moto`
- *Específicos de 4x4:* `tipo_terreno_4x4`, `traccion_necesaria`, `estado_firme`, `vado_rios`, `dificultad_tecnica`, `parking_coste`, `parking_descripcion`, `puntos_repostaje_4x4`

No existe ningún campo para "autocaravanas" — confirma lo que ya sabíamos: es una modalidad nueva que WordPress nunca tuvo.

## 3. Autoría

Las 1.225 rutas comparten un único autor: **`admin`**. No hay varios redactores ni información de quién escribió cada ruta — es un dato que no existe en origen, no algo que se pierda en la migración.

## 4. Imágenes

El campo `galeria` guarda IDs de adjuntos de WordPress (no URLs directas). Hay 75 adjuntos en total en el export. Comprobado con un caso real: el ID de galería "200" de Ruta del Cares **sí** corresponde a un fichero que existe de verdad en el servidor (`cares_5.jpg`). No se ha comprobado adjunto por adjunto (74 restantes) porque no era necesario para validar que el mecanismo de referencia funciona — se hará al detalle en el momento de migrar imágenes.

## 5. Archivos GPX — hallazgo importante

El campo `archivo_gpx` de las 65 rutas publicadas se ha comprobado uno a uno:

| Estado | Cuántas rutas |
|---|---|
| URL válida y utilizable | 1 (Ruta del Cares) |
| Vacío (nunca se rellenó) | 2 |
| Valor roto (referencia interna de WordPress, no una URL) | **62** |

Los 62 casos rotos tienen un valor con esta forma: `a:1:{i:0;s:3:"547";}` — es un formato interno de PHP que en realidad es el ID de un adjunto (aquí, el 547), no un archivo. Se comprobó si ese adjunto existe de verdad: **sí existe un registro en WordPress con ese ID**, con una URL del tipo `.../uploads/2026/01/gr1.gpx` — pero al mirar directamente la carpeta real de archivos subidos en el servidor, **ese fichero no está ahí**. La carpeta solo contiene 3 imágenes de logo (y sus variantes .webp) y un archivo con nombre genérico que, al abrirlo, resultó ser una copia mal etiquetada del GPX de Ruta del Cares — no un GPX nuevo.

**Conclusión, comprobada de forma directa y no supuesta:** estos 62 archivos GPX no se pueden recuperar de nada que exista hoy en el servidor de WordPress. No es un problema de cómo se lee el dato — es que el archivo físico nunca llegó a subirse (o se subió y se borró después). Habrá que conseguirlos de nuevo, ruta a ruta, de una fuente externa (Wikiloca, la fuente original, o grabación propia).

## 6. Relaciones entre contenidos

No hay relaciones tipo "esta ruta pertenece a esta otra" en WordPress — no existe hoy nada parecido a las "colecciones temáticas" o los "senderos de varias etapas" que se han diseñado para la base de datos nueva. Eso es contenido completamente nuevo a crear a mano, no algo que migrar.

## 7. Slugs (URLs)

Cada ruta publicada tiene su propio `post_name` (el slug que forma la URL, ej. `ruta-del-cares`). Estos 65 slugs son los que hay que conservar tal cual en la base de datos nueva para que ninguna URL existente se rompa.

---

**Nada de esto ha movido ni cambiado nada en WordPress.** Es una foto fija de lo que hay, tomada leyendo el export y, en el caso del GPX, mirando también los archivos reales del servidor.
