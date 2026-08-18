# Spec: Script de Migración XML — Rutas de España

**Fecha:** 2026-05-22
**Fase:** 1 — Web informativa (Paso 2: Migración de datos)
**Alcance:** Script TypeScript de una sola pasada que lee el XML de WordPress y puebla la tabla `Ruta` en Supabase con las 1.225 rutas (publicadas + borradores).

---

## Contexto

El XML de exportación de WordPress (`rutasespaa.WordPress.2026-05-22.xml`, 2.82 MB) contiene 1.225 ítems de tipo `ruta` con campos custom creados con Pods. Las tablas en Supabase ya están creadas. La conexión directa PostgreSQL no es accesible desde local, por lo que se usa el cliente `@supabase/supabase-js` con la `SERVICE_ROLE_KEY` para saltarse Row Level Security.

---

## Arquitectura

### Fichero

```
scripts/
  migrate-xml.ts
```

### Dependencias nuevas (dev)

- `tsx` — ejecutar TypeScript directamente sin compilar
- `fast-xml-parser` — parsear XML eficientemente

### Flujo de ejecución

```
XML (2.82 MB)
  → fast-xml-parser → Array<WpItem>
  → filter(post_type === 'ruta')
  → transform(WpItem → RutaInsert)
  → chunk(50)
  → supabase.from('Ruta').insert(batch)
  → log(resultado)
```

---

## Transformaciones

### Campos de identificación

| WordPress | Supabase | Regla |
|---|---|---|
| `<title>` | `titulo` | Texto plano |
| `<wp:post_name>` | `slug` | Usar tal cual |
| `<wp:status>` | `publicada` | `publish` → `true`, resto → `false` |
| `<content:encoded>` | — | **IGNORADO** (Elementor HTML) |

### Taxonomías (elementos `<category>`)

| domain | Supabase | Normalización |
|---|---|---|
| `provincia` | `provincia` | Mapa de slugs oficiales (ver abajo) |
| `modalidad` | `modalidad` | WP `4x4` → enum `cuatro_por_cuatro`; resto igual |
| `dificultad` | `dificultad` | `facil` / `moderada` / `dificil` / `muy_dificil` |

### Custom fields (elementos `<wp:postmeta>`)

El campo `<wp:meta_key>` determina el nombre; `<wp:meta_value>` el valor.
Campos con prefijo `_` o que empiezan por `elementor` se **ignoran**.

Mapeo notable:
- `sobre_ruta` → `descripcion` (limpiar HTML básico con regex)
- `galeria` → **ignorado** (son IDs de attachments de WordPress sin acceso a archivos)
- `archivo_gpx` → `archivo_gpx` (URL de Dropbox, guardar tal cual)
- `ecosistema` (aparece duplicado en WP) → tomar el primer valor no vacío

Campos numéricos que parsear con `parseFloat` / `parseInt`:
`distancia`, `duracion_horas`, `duracion_minutos`, `desnivel_positivo`, `desnivel_negativo`, `altitud_maxima`, `altitud_minima`, `valoracion`, `total_valoraciones`, `rank_math_seo_score`

---

## Normalización de provincias

Mapa explícito de slugs no canónicos → slugs oficiales del CLAUDE.md:

```typescript
const PROVINCIA_MAP: Record<string, string> = {
  'gerona-girona': 'girona',
  'gerona':        'girona',
  // añadir otros si el XML los tiene
}
```

Si el slug de la provincia no está en el mapa y tampoco en la lista oficial de 50 provincias, la ruta se inserta con `provincia: 'desconocida'` y se loguea como advertencia.

---

## Gestión de errores

- Error de inserción individual (ej: slug duplicado, campo inválido): se loguea el slug y el motivo, se continúa con la siguiente ruta.
- Error de tanda completa: reintento único con las rutas de esa tanda individualmente para aislar cuál falla.
- Al final: resumen `N insertadas | M errores` con lista de slugs fallidos.

---

## Ejecución

```bash
# Instalar dependencias nuevas primero:
npm install --save-dev tsx fast-xml-parser

# Ejecutar migración:
npx tsx scripts/migrate-xml.ts
```

---

## Fuera de alcance

- Imágenes (sin acceso a los archivos de WordPress)
- PuntoInteres y Valoracion (tablas relacionadas) — se migran en fase posterior
- ImagenRuta — sin datos disponibles
- Reinserción inteligente (upsert) — la primera ejecución asume tabla vacía

---

## Éxito

El script termina con `>= 1.100 rutas insertadas` (margen para rutas con datos incompletos o inválidos) y 0 crashes no controlados.
