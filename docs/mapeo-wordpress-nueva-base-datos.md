# Mapeo de campos — de WordPress a la base de datos nueva

*Tabla de correspondencias: de dónde viene cada dato en WordPress y a dónde va en la base de datos nueva (`esquema-base-datos.sql`), y qué transformación se le aplica por el camino. Esta es la "receta" exacta que sigue `importar-rutas.ts`. 21 de agosto de 2026.*

## Cómo leer esta tabla

- **Origen**: el campo en WordPress (taxonomía o campo Pods).
- **Destino**: tabla y columna en la base de datos nueva.
- **Transformación**: qué se le hace al dato por el camino (limpieza, normalización, o "se copia tal cual").

## Campos generales

| Origen (WordPress) | Destino (`rutas`) | Transformación |
|---|---|---|
| `post_name` (slug) | `slug` | Se copia tal cual — es la clave para no duplicar en importaciones repetidas |
| `title` | `nombre` | Se copia tal cual |
| `sobre_ruta` | `descripcion` | Se copia tal cual (ya viene sin etiquetas HTML sueltas) |
| taxonomía `modalidad` | `actividad_id` | Se busca el id en la tabla `actividades` por su slug (`senderismo`, `bici`, `moto`, `4x4`) |
| taxonomía `provincia` | `provincia_id` | Se normaliza con la tabla de alias ya usada en `migrate-xml.ts` (ej. `gerona` → `girona`, `orense` → `ourense`) y se busca el id en `provincias`. Si no se reconoce, la ruta se importa igualmente pero sin provincia, marcada para revisión — nunca se inventa una provincia |
| taxonomía `dificultad` | `dificultad_general_id` | Se normaliza (`muy-dificil` / `muy_dificil` → `muy_dificil`) y se busca el id en `niveles_dificultad`. Si no se reconoce, se usa `moderada` por defecto y se anota como advertencia |
| `tipo_recorrido` | `tipo_recorrido` | Se pasa a minúsculas y se ajusta al formato de la base nueva (`Lineal` → `lineal`, `Circular` → `circular`, `Ida y vuelta` → `ida_vuelta`) |
| `distancia` | `distancia_km` | Se convierte a número |
| `desnivel_positivo` / `desnivel_negativo` | `desnivel_positivo` / `desnivel_negativo` | Se convierte a número entero |
| `altitud_minima` / `altitud_maxima` | `altitud_minima` / `altitud_maxima` | Se convierte a número entero. Si la máxima queda por debajo de la mínima, la ruta se descarta como inválida (no se importa un dato imposible) |
| `como_llegar` | `como_llegar` | Se copia tal cual |
| `transporte_publico` | `transporte_publico` | Se copia tal cual |
| `equipamiento` | `equipamiento` | Se copia tal cual |
| `alojamiento_cercano` | `alojamiento_cercano` | Se copia tal cual |
| `zonas_camping` | `zonas_camping` | Se copia tal cual |

## Campos específicos de senderismo → tabla `rutas_senderismo`

| Origen | Destino | Transformación |
|---|---|---|
| `ecosistema` | `rutas_senderismo.ecosistema` | Se copia tal cual |
| `epoca_nieve` | `rutas_senderismo.epoca_nieve` | Se copia tal cual |

*(El resto de campos de senderismo — `flora`, `fauna`, `avisos_seguridad`, `permisos_especiales`, etc. — están mapeados en el esquema pero no se han incluido todavía en el importador porque las 63 rutas de senderismo publicadas los tienen prácticamente vacíos; se añaden en cuanto haya datos reales que migrar, para no crear columnas rellenas de nada.)*

## Archivos GPX → tabla `tracks_gpx`

| Origen | Destino | Transformación |
|---|---|---|
| `archivo_gpx` | `tracks_gpx.url_archivo` | **Solo si el valor es una URL real** (`http://` o `https://`). Los valores rotos (formato interno de WordPress, ver inventario) se descartan y quedan anotados como advertencia — la ruta se importa igualmente, sin track asociado, pendiente de recuperar el GPX real |

## Lo que NO se migra automáticamente (todavía)

| Dato de WordPress | Por qué no se migra ya |
|---|---|
| `galeria` (imágenes) | Requiere decidir si se descargan y se re-alojan las imágenes o se enlazan tal cual, y verificar autoría/licencia de cada una primero — no se migra sin ese criterio para no "redistribuir sin permiso verificado" |
| Campos de bici/moto/4x4 no usados por ninguna de las 65 rutas publicadas | No hay datos reales que migrar todavía; el mapeo ya existe en el esquema (`rutas_bici`, `rutas_moto`, `rutas_4x4`) para cuando se publiquen rutas de esas modalidades |
| `rank_math_seo_score`, `valoracion`, `total_valoraciones` | Son datos derivados/de terceros (plugin SEO, valoraciones de usuarios) que no tienen todavía una columna equivalente decidida — se dejan fuera hasta decidir cómo se recalculan en el sitio nuevo |

## Nuevos conceptos sin origen en WordPress

Estas tablas no reciben nada de WordPress porque son funcionalidad nueva, decidida en el análisis previo a construir la base de datos:

- `senderos` / `numero_etapa` en `rutas` — para itinerarios de varias etapas (Camino de Santiago, GR completos)
- `colecciones` / `coleccion_rutas` — agrupaciones temáticas editoriales
- `caracteristicas` / `ruta_caracteristicas` — etiquetas para búsqueda por puntos de interés (cascada, castillo, monasterio...)

Se rellenarán a mano, no por migración automática.
