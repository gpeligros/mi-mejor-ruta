# Migración controlada: WordPress → nueva arquitectura

*Informe final del Prompt 4. Todo lo que describe este documento se ha probado de verdad (no es una descripción de lo que "debería" pasar) contra una base de datos PostgreSQL local de prueba, con los datos reales de tu WordPress. 21 de agosto de 2026.*

**Lo primero y más importante: WordPress no se ha tocado.** No se ha desactivado, no se ha borrado nada, no se ha cambiado ninguna URL. Todo lo que sigue trabaja a partir de una copia de lectura (el fichero de exportación XML) y de tres scripts nuevos que, hasta ahora, solo se han ejecutado contra una base de datos de pruebas desechable, nunca contra Supabase de producción.

---

## 1. Inventario

Documento aparte: **`inventario-wordpress.md`**. Resumen: 1.225 rutas en WordPress, de las cuales 65 están publicadas (el resto son borradores/plantillas ya detectados en el Prompt 2); 57 campos personalizados por ruta; 75 archivos adjuntos; un único autor (`admin`); y un hallazgo comprobado a fondo — 62 de los 65 archivos GPX referenciados no existen físicamente en el servidor y no son recuperables de nada que haya hoy en WordPress.

## 2. Mapeo WordPress → base de datos nueva

Documento aparte: **`mapeo-wordpress-nueva-base-datos.md`**. Tabla campo a campo: de dónde viene cada dato, a qué tabla/columna va, y qué transformación se le aplica (normalización de provincia/dificultad, conversión de tipos, descarte de GPX rotos, etc.).

## 3. Exportador (paso 1 de 3)

**Fichero:** `scripts/exportar-rutas.ts`

Lee el XML de WordPress y saca **todas** las rutas (publicadas y borradores) a un fichero JSON intermedio, sin transformar ni decidir nada todavía — solo copia lo que hay. Esto es a propósito: así el paso de validación siempre parte de los mismos datos de origen, y si algún día cambia una regla de validación, no hace falta volver a tocar WordPress ni re-exportar.

Ejecutado de verdad contra tu XML real:

```
Total items en el XML: 1321
  post_type=ruta: 1225
  post_type=attachment: 75
Exportado: 1225 rutas -> exportacion-wordpress-rutas.json
```

## 4. Validador previo a la importación (paso 2 de 3)

**Fichero:** `scripts/validar-rutas.ts`

Revisa ruta a ruta y decide si está lista para importar, si hay que omitirla (con motivo) o si tiene un error. Reglas aplicadas: solo se importan rutas publicadas; slugs repetidos se marcan como duplicados (se queda la primera); faltan datos obligatorios (título, modalidad) → inválida; datos numéricos imposibles (distancia negativa, altitud máxima por debajo de la mínima) → inválida; GPX que no es una URL real → advertencia, no invalida la ruta (se importa sin GPX, pendiente de revisión); provincia no reconocida → advertencia, se importa igual sin inventar una provincia.

Ejecutado de verdad contra las 1.225 rutas exportadas:

```
Válidas:    65
Omitidas:   1160  (no publicadas en WordPress)
Inválidas:  0
Duplicadas: 0
Válidas con advertencias: 62   (el GPX roto ya detectado en el inventario)
```

## 5. Importador (paso 3 de 3) — repetible, idempotente y con registro

**Fichero:** `scripts/importar-rutas.ts`

Coge las rutas ya validadas y las escribe en la base de datos nueva. Cada ruta se identifica por su `slug` (único): si no existe, se crea; si ya existe y no ha cambiado nada, se deja tal cual; si ya existe y algún dato es distinto, se actualiza. **Nunca crea una fila duplicada**, sin importar cuántas veces se ejecute.

### Prueba real de idempotencia

Se ejecutó dos veces seguidas, con el mismo fichero de entrada, contra una base de datos PostgreSQL local limpia (con el esquema `esquema-base-datos.sql` ya cargado):

**Ejecución 1:**
```
Importadas (nuevas):   65
Actualizadas:          0
Sin cambios:           0
Omitidas:              0
Errores:               0
```

**Ejecución 2 (mismos datos, otra vez):**
```
Importadas (nuevas):   0
Actualizadas:          0
Sin cambios:           65
Omitidas:              0
Errores:               0
```

Comprobación directa en la base de datos tras las dos ejecuciones: `select slug, count(*) from rutas group by slug having count(*) > 1` → **0 filas**. Ninguna ruta duplicada.

## 6. Imágenes

No se migran imágenes todavía (ver tabla "Lo que NO se migra automáticamente" en el documento de mapeo). El campo `galeria` de WordPress apunta a adjuntos reales — se comprobó con Ruta del Cares que el mecanismo funciona (el ID 200 corresponde a un archivo real, `cares_5.jpg`) — pero antes de traer las imágenes hay que decidir si se re-alojan o se enlazan, y verificar autor/licencia de cada una. No se va a descargar ni redistribuir ninguna imagen sin ese criterio resuelto.

## 7. Archivos GPX

Se migra automáticamente **1 solo track real** (Ruta del Cares, que tenía una URL válida). Los otros 64 (62 rotos + 2 vacíos) se importan sin GPX asociado, y quedan anotados en el informe de validación como pendientes — no se pierden silenciosamente, están documentados uno a uno.

## 8. Registro (logs) de cada importación

Cada ejecución de `importar-rutas.ts` escribe un fichero `registro-importacion-<fecha>.json` con el resultado fila a fila (importada / actualizada / sin_cambios / omitida / error), y además dos tablas nuevas en la base de datos guardan el histórico permanente:

- `lotes_importacion`: una fila por cada vez que se ejecuta el importador (cuándo, cuántas filas, cuántas se importaron, cuántas se omitieron)
- `importacion_borrador`: una fila por cada ruta procesada, con el dato de WordPress **sin transformar** guardado tal cual (en formato JSON), para poder auditar o deshacer sin tener que adivinar de dónde salió cada dato

En la prueba real: 2 lotes registrados (una fila en `lotes_importacion` por cada una de las dos ejecuciones).

## 9. Comprobación antes/después

Se comparó el recuento por modalidad y por provincia entre el origen (WordPress, rutas publicadas) y el destino (base de datos nueva, tras importar) — y coinciden exactamente:

| | Origen (WordPress) | Destino (base nueva) |
|---|---|---|
| Total rutas | 65 | 65 |
| Senderismo | 63 | 63 |
| Bici | 1 | 1 |
| Moto | 1 | 1 |
| Slugs únicos | 65 | 65 |
| Tracks GPX reales | 1 | 1 |

Sin diferencias. Provincia a provincia también coincide (ej. Madrid: 4 y 4, Girona: 4 y 4, Granada: 3 y 3 — comprobado con los diez casos más numerosos).

## 10. Resultado final

**Scripts creados** (en `scripts/`): `exportar-rutas.ts`, `validar-rutas.ts`, `importar-rutas.ts`.

**Base de datos y semilla de catálogos** (en `basededatos/`): `esquema-base-datos.sql` (ya probado en el Prompt 3/análisis previo) y `semilla-catalogos.sql`, nuevo — carga las 17 comunidades autónomas, las 50 provincias (con su comunidad autónoma correcta), las 5 actividades, los 4 niveles de dificultad y una fuente genérica de importación. Sin esta semilla, el importador no tiene dónde enganchar cada ruta por provincia/actividad.

**Rutas migradas (en la prueba local):** 65 de 65 publicadas, sin errores, sin duplicados.

**Errores:** 0.

**Datos omitidos:** 1.160 rutas (todos los borradores/plantillas no publicados — se omiten a propósito, no por fallo).

**Datos dudosos, marcados para revisión manual:** 62 rutas con GPX no recuperable de WordPress; ninguna ruta con provincia irreconocible en esta prueba (las 65 publicadas tenían provincia válida).

**Plan de reversión (rollback):** No hace falta deshacer nada en WordPress porque no se ha tocado. En el lado de la base de datos nueva, si algo saliera mal, revertir es tan simple como vaciar las tablas nuevas (`truncate rutas cascade;` y las tablas relacionadas) o, si se hizo en una base de datos de pruebas, borrarla entera — la tabla `Ruta` original que usa hoy la web en Vercel no se toca en ningún paso de este proceso, así que el sitio en producción sigue funcionando exactamente igual mientras tanto.

**Importante — qué NO se ha hecho todavía:** estos scripts se han probado contra una base de datos PostgreSQL de prueba en este entorno, no contra el Supabase de producción. Para ejecutarlos de verdad ahí hace falta que tú apuntes la variable `DATABASE_URL` (en `.env.local`) a la base de datos real y los ejecutes tú mismo, cuando decidas que es el momento — no se ha usado ni se ha pedido la clave de Supabase en ningún momento de este proceso.

---

**WordPress no se ha retirado.** Sigue siendo la copia de referencia hasta que decidas, más adelante, que la migración está completa y validada también en producción.
