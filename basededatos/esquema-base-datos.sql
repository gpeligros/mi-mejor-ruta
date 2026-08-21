-- =====================================================================
-- Mi Mejor Ruta — Esquema de base de datos definitivo (propuesta)
-- PostgreSQL 15+ / Supabase — TODO en castellano (sin tildes en los
-- identificadores técnicos para evitar tener que entrecomillarlos).
--
-- IMPORTANTE: este esquema NO sustituye a la tabla "Ruta" existente.
-- Convive con ella hasta validar la migración (ver Prompt 4).
-- No se borra ninguna estructura existente al ejecutar este fichero.
-- =====================================================================

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- =====================================================================
-- 1. CATALOGOS CONTROLADOS
-- =====================================================================

create table comunidades_autonomas (
  id    smallint generated always as identity primary key,
  slug  text not null unique,
  nombre text not null
);

create table provincias (
  id                      smallint generated always as identity primary key,
  slug                    text not null unique,
  nombre                  text not null,
  comunidad_autonoma_id   smallint not null references comunidades_autonomas(id)
);

create table municipios (
  id            integer generated always as identity primary key,
  nombre        text not null,
  provincia_id  smallint not null references provincias(id),
  ubicacion     geography(Point, 4326),
  unique (nombre, provincia_id)
);

-- senderismo | bici | moto | 4x4 | autocaravanas
create table actividades (
  id    smallint generated always as identity primary key,
  slug  text not null unique,
  nombre text not null
);

-- Catalogo compartido para dificultad_general, dificultad_fisica y
-- dificultad_tecnica (mismo catalogo, distinto significado por columna).
create table niveles_dificultad (
  id          smallint generated always as identity primary key,
  slug        text not null unique,  -- facil | moderada | dificil | muy_dificil
  nombre      text not null,
  orden       smallint not null unique
);

-- Un "sendero" es el itinerario en si (GR-249 completo, Camino Frances
-- completo...). Una o varias filas de "rutas" pueden ser sus etapas.
-- "sistema" admite tanto los codigos oficiales (GR/PR/SL) como itinerarios
-- sin codigo pero con nombre propio (ej. Camino de Santiago), que se
-- guardan como sistema = 'CAMINO' o 'OTRO'.
create table senderos (
  id                    integer generated always as identity primary key,
  sistema               text not null check (sistema in ('GR','PR','SL','CAMINO','OTRO')),
  codigo                text,  -- ej. "GR-249"; puede ser NULL si no tiene codigo oficial
  nombre                text not null,
  estado_homologacion   text not null default 'no_verificado'
                        check (estado_homologacion in ('homologado','no_homologado','no_verificado')),
  federacion            text,
  distancia_total_km    numeric(6,1),
  numero_etapas         smallint,
  unique (sistema, codigo, nombre)
);

create table fuentes (
  id              integer generated always as identity primary key,
  tipo_fuente     text not null default 'desconocido',
  nombre_fuente   text,
  url_fuente      text,
  licencia        text,
  fecha_fuente    date,
  verificado      boolean not null default false,
  ultima_revision date
);

-- agua, cascada, bosque, lago, rio, mirador, ninos, perros, parking,
-- transporte_publico, refugio, accesibilidad, sombra, castillo,
-- monasterio, patrimonio... (busqueda por puntos de interes, fase simple)
create table caracteristicas (
  id        smallint generated always as identity primary key,
  slug      text not null unique,
  nombre    text not null,
  categoria text
);

-- "Coleccion tematica": agrupa rutas ya existentes bajo un cartel editorial
-- (ej. "Rutas de Castillos"), sin ser un sendero fisico continuo. Una ruta
-- puede estar en varias colecciones a la vez (relacion N:M via coleccion_rutas).
create table colecciones (
  id           integer generated always as identity primary key,
  slug         text not null unique,
  nombre       text not null,
  descripcion  text,
  imagen_portada text,
  publicada    boolean not null default false
);

-- =====================================================================
-- 2. TABLA PRINCIPAL: rutas
-- =====================================================================

create table rutas (
  id      bigint generated always as identity primary key,
  slug    text not null unique,
  nombre  text not null,
  descripcion text,

  actividad_id      smallint not null references actividades(id),
  provincia_id      smallint not null references provincias(id),
  municipio_id      integer references municipios(id),

  -- Tres dificultades separadas: general (la que se muestra por defecto),
  -- fisica (esfuerzo/resistencia) y tecnica (habilidad requerida).
  dificultad_general_id   smallint not null references niveles_dificultad(id),
  dificultad_fisica_id    smallint references niveles_dificultad(id),
  dificultad_tecnica_id   smallint references niveles_dificultad(id),

  tipo_recorrido text check (tipo_recorrido in ('circular','lineal','ida_vuelta')),

  distancia_km      numeric(6,2) check (distancia_km > 0),
  duracion_minutos  integer check (duracion_minutos > 0),
  desnivel_positivo integer check (desnivel_positivo >= 0),
  desnivel_negativo integer check (desnivel_negativo >= 0),
  altitud_minima    integer,
  altitud_maxima    integer,
  check (altitud_maxima is null or altitud_minima is null or altitud_maxima >= altitud_minima),

  -- PostGIS como fuente de verdad geografica; lat/lng planos derivados
  -- automaticamente para que el codigo actual (que espera numeros sueltos)
  -- no tenga que cambiar de inmediato.
  punto_inicio geography(Point, 4326),
  punto_final  geography(Point, 4326),
  latitud_inicio  double precision generated always as (ST_Y(punto_inicio::geometry)) stored,
  longitud_inicio double precision generated always as (ST_X(punto_inicio::geometry)) stored,
  latitud_final   double precision generated always as (ST_Y(punto_final::geometry)) stored,
  longitud_final  double precision generated always as (ST_X(punto_final::geometry)) stored,

  -- Meses recomendados como enteros 1-12 (no texto libre "Primavera-Otoño")
  mejores_meses smallint[],
  nivel_forma_fisica text check (nivel_forma_fisica in ('bajo','medio','alto')),

  -- Logistica comun a cualquier modalidad
  como_llegar           text,
  transporte_publico    text,
  equipamiento           text,
  alojamiento_cercano   text,
  zonas_camping          text,

  sendero_id     integer references senderos(id),
  numero_etapa   smallint,  -- nº de etapa si sendero_id es un GR/Camino de varias etapas

  fuente_id integer references fuentes(id),

  publicada      boolean not null default false,
  verificada     boolean not null default false,
  puntuacion_calidad smallint check (puntuacion_calidad between 0 and 100),

  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on column rutas.puntuacion_calidad is
  'Recalculada periodicamente con la formula del Prompt 2 (GPX 20 + coordenadas 10 + descripcion 10 + imagenes 10 + fuente fiable 20 + datos tecnicos 15 + revision reciente 15). No es una entrada manual.';

-- =====================================================================
-- 3. EXTENSIONES POR MODALIDAD (1:1 con rutas, solo cuando aplica)
-- =====================================================================

create table rutas_senderismo (
  ruta_id             bigint primary key references rutas(id) on delete cascade,
  ecosistema          text,
  flora               text,
  fauna               text,
  puntos_agua         text,
  puntos_avituallamiento text,
  avisos_seguridad    text,
  permisos_requeridos text,
  permisos_especiales text,
  epoca_nieve         text
);

create table rutas_bici (
  ruta_id           bigint primary key references rutas(id) on delete cascade,
  tipo_bici         text check (tipo_bici in ('mtb','gravel','carretera','electrica')),
  superficie        text,
  trafico           text,
  ciclabilidad      text,
  talleres_cercanos text
);

create table rutas_moto (
  ruta_id           bigint primary key references rutas(id) on delete cascade,
  tipo_carretera    text,
  estado_asfalto    text,
  puertos_montana   text,
  peajes            text,
  gasolineras       text,
  puntuacion_paisaje smallint check (puntuacion_paisaje between 1 and 10),
  zonas_descanso    text
);

create table rutas_4x4 (
  ruta_id              bigint primary key references rutas(id) on delete cascade,
  tipo_terreno         text,
  traccion_necesaria   text,
  estado_firme         text,
  vados_rios           text,
  permisos             text,
  restricciones_acceso text,
  coste_parking        text,
  descripcion_parking  text,
  gasolineras          text
);

create table rutas_autocaravanas (
  ruta_id                bigint primary key references rutas(id) on delete cascade,
  tipo_area              text,   -- area_autocaravanas | camping | pernocta_libre
  servicios_disponibles  text,   -- agua, electricidad, vaciado de aguas...
  longitud_maxima_m      numeric(4,1),
  pernocta_permitida     boolean,
  coste                  text
);

-- =====================================================================
-- 4. ENTIDADES RELACIONADAS
-- =====================================================================

create table puntos_ruta (
  id           bigint generated always as identity primary key,
  ruta_id      bigint not null references rutas(id) on delete cascade,
  tipo_punto   text not null check (tipo_punto in
               ('inicio','final','parking','agua','refugio','mirador','cruce','peligro','monumento')),
  nombre       text,
  descripcion  text,
  ubicacion    geography(Point, 4326) not null,
  orden        smallint not null default 0
);

create table tracks_gpx (
  id                    bigint generated always as identity primary key,
  ruta_id               bigint not null references rutas(id) on delete cascade,
  url_archivo           text not null,
  fuente_id             integer references fuentes(id),
  licencia              text,
  version               smallint not null default 1,
  numero_puntos         integer,
  distancia_calculada_km numeric(6,2),
  desnivel_calculado    integer,
  fecha_grabacion       date,
  creado_en             timestamptz not null default now(),
  unique (ruta_id, version)
);

create table imagenes_ruta (
  id       bigint generated always as identity primary key,
  ruta_id  bigint not null references rutas(id) on delete cascade,
  url      text not null,
  autor    text,
  licencia text,
  descripcion text,
  es_portada  boolean not null default false,
  orden       smallint not null default 0
);

-- Como mucho una portada por ruta
create unique index imagenes_ruta_una_portada on imagenes_ruta(ruta_id) where es_portada;

create table ruta_caracteristicas (
  ruta_id           bigint not null references rutas(id) on delete cascade,
  caracteristica_id smallint not null references caracteristicas(id),
  primary key (ruta_id, caracteristica_id)
);

create table coleccion_rutas (
  coleccion_id  integer not null references colecciones(id) on delete cascade,
  ruta_id       bigint not null references rutas(id) on delete cascade,
  orden         smallint not null default 0,
  primary key (coleccion_id, ruta_id)
);

-- Preparado para Fase 3 (favoritos). No se activa hasta tener autenticacion.
create table favoritos_usuario (
  usuario_id  uuid not null,  -- referencia logica a auth.users(id) en Supabase
  ruta_id     bigint not null references rutas(id) on delete cascade,
  creado_en   timestamptz not null default now(),
  primary key (usuario_id, ruta_id)
);

-- =====================================================================
-- 5. TRAZABILIDAD DE IMPORTACION (WordPress / CSV / JSON)
-- =====================================================================

create table lotes_importacion (
  id                bigint generated always as identity primary key,
  formato_origen    text not null check (formato_origen in ('wordpress_xml','csv','json')),
  fichero_origen    text not null,
  iniciado_en       timestamptz not null default now(),
  finalizado_en     timestamptz,
  filas_totales     integer,
  filas_importadas  integer,
  filas_omitidas    integer,
  notas             text
);

create table importacion_borrador (
  id                  bigint generated always as identity primary key,
  lote_importacion_id bigint not null references lotes_importacion(id),
  datos_originales    jsonb not null,  -- el registro de origen SIN transformar
  ruta_asociada_id    bigint references rutas(id),
  estado_validacion   text not null default 'pendiente'
                      check (estado_validacion in ('pendiente','valido','invalido','importado')),
  errores_validacion  text[]
);

-- =====================================================================
-- 6. INDICES
-- =====================================================================

create index rutas_provincia_idx    on rutas(provincia_id);
create index rutas_actividad_idx    on rutas(actividad_id);
create index rutas_dificultad_idx   on rutas(dificultad_general_id);
create index rutas_distancia_idx    on rutas(distancia_km);
create index rutas_duracion_idx     on rutas(duracion_minutos);
create index rutas_publicada_idx    on rutas(publicada) where publicada;
create index rutas_verificada_idx   on rutas(verificada) where verificada;
create index rutas_punto_inicio_gix on rutas using gist(punto_inicio);
create index rutas_mejores_meses_gin on rutas using gin(mejores_meses);
create index rutas_sendero_idx      on rutas(sendero_id);

-- Filtro publico mas habitual: listado publicado por actividad + provincia + dificultad
create index rutas_listado_publico_idx
  on rutas(actividad_id, provincia_id, dificultad_general_id)
  where publicada;

create index puntos_ruta_ruta_idx     on puntos_ruta(ruta_id);
create index puntos_ruta_ubicacion_gix on puntos_ruta using gist(ubicacion);
create index tracks_gpx_ruta_idx      on tracks_gpx(ruta_id);
create index imagenes_ruta_ruta_idx   on imagenes_ruta(ruta_id);
create index ruta_caracteristicas_caract_idx on ruta_caracteristicas(caracteristica_id);
create index coleccion_rutas_ruta_idx on coleccion_rutas(ruta_id);
create index importacion_borrador_lote_idx  on importacion_borrador(lote_importacion_id);
create index importacion_borrador_estado_idx on importacion_borrador(estado_validacion);

-- =====================================================================
-- 7. TRIGGER: mantener actualizado_en
-- =====================================================================

create or replace function actualizar_marca_de_tiempo()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger rutas_actualizar_marca_de_tiempo
  before update on rutas
  for each row execute function actualizar_marca_de_tiempo();
