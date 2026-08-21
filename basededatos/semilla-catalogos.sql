-- Semilla de catalogos base: comunidades autonomas + las 50 provincias,
-- actividades y niveles de dificultad. Datos reales de la division
-- territorial de España (no inventados). Idempotente: se puede ejecutar
-- mas de una vez sin duplicar filas (ON CONFLICT por slug).

insert into comunidades_autonomas (slug, nombre) values
  ('andalucia', 'Andalucía'),
  ('aragon', 'Aragón'),
  ('asturias', 'Principado de Asturias'),
  ('baleares', 'Illes Balears'),
  ('canarias', 'Canarias'),
  ('cantabria', 'Cantabria'),
  ('castilla-la-mancha', 'Castilla-La Mancha'),
  ('castilla-y-leon', 'Castilla y León'),
  ('cataluna', 'Cataluña'),
  ('extremadura', 'Extremadura'),
  ('galicia', 'Galicia'),
  ('madrid', 'Comunidad de Madrid'),
  ('murcia', 'Región de Murcia'),
  ('navarra', 'Comunidad Foral de Navarra'),
  ('pais-vasco', 'País Vasco'),
  ('la-rioja', 'La Rioja'),
  ('valencia', 'Comunidad Valenciana')
on conflict (slug) do nothing;

-- provincia -> comunidad autonoma (las 50 provincias que ya usa
-- scripts/migrate-xml.ts en PROVINCIAS_VALIDAS)
insert into provincias (slug, nombre, comunidad_autonoma_id)
select v.slug, v.nombre, ca.id
from (values
  ('almeria','Almería','andalucia'),
  ('cadiz','Cádiz','andalucia'),
  ('cordoba','Córdoba','andalucia'),
  ('granada','Granada','andalucia'),
  ('huelva','Huelva','andalucia'),
  ('jaen','Jaén','andalucia'),
  ('malaga','Málaga','andalucia'),
  ('sevilla','Sevilla','andalucia'),
  ('huesca','Huesca','aragon'),
  ('teruel','Teruel','aragon'),
  ('zaragoza','Zaragoza','aragon'),
  ('asturias','Asturias','asturias'),
  ('illes-balears','Illes Balears','baleares'),
  ('las-palmas','Las Palmas','canarias'),
  ('santa-cruz-de-tenerife','Santa Cruz de Tenerife','canarias'),
  ('cantabria','Cantabria','cantabria'),
  ('albacete','Albacete','castilla-la-mancha'),
  ('ciudad-real','Ciudad Real','castilla-la-mancha'),
  ('cuenca','Cuenca','castilla-la-mancha'),
  ('guadalajara','Guadalajara','castilla-la-mancha'),
  ('toledo','Toledo','castilla-la-mancha'),
  ('avila','Ávila','castilla-y-leon'),
  ('burgos','Burgos','castilla-y-leon'),
  ('leon','León','castilla-y-leon'),
  ('palencia','Palencia','castilla-y-leon'),
  ('salamanca','Salamanca','castilla-y-leon'),
  ('segovia','Segovia','castilla-y-leon'),
  ('soria','Soria','castilla-y-leon'),
  ('valladolid','Valladolid','castilla-y-leon'),
  ('zamora','Zamora','castilla-y-leon'),
  ('barcelona','Barcelona','cataluna'),
  ('girona','Girona','cataluna'),
  ('lleida','Lleida','cataluna'),
  ('tarragona','Tarragona','cataluna'),
  ('badajoz','Badajoz','extremadura'),
  ('caceres','Cáceres','extremadura'),
  ('la-coruna','A Coruña','galicia'),
  ('lugo','Lugo','galicia'),
  ('ourense','Ourense','galicia'),
  ('pontevedra','Pontevedra','galicia'),
  ('madrid','Madrid','madrid'),
  ('murcia','Murcia','murcia'),
  ('navarra','Navarra','navarra'),
  ('alava','Álava','pais-vasco'),
  ('gipuzkoa','Gipuzkoa','pais-vasco'),
  ('vizcaya','Vizcaya','pais-vasco'),
  ('la-rioja','La Rioja','la-rioja'),
  ('alicante','Alicante','valencia'),
  ('castellon','Castellón','valencia'),
  ('valencia','Valencia','valencia')
) as v(slug, nombre, ca_slug)
join comunidades_autonomas ca on ca.slug = v.ca_slug
on conflict (slug) do nothing;

insert into actividades (slug, nombre) values
  ('senderismo','Senderismo'),
  ('bici','Bici'),
  ('moto','Moto'),
  ('4x4','4x4'),
  ('autocaravanas','Autocaravanas')
on conflict (slug) do nothing;

insert into niveles_dificultad (slug, nombre, orden) values
  ('facil','Fácil',1),
  ('moderada','Moderada',2),
  ('dificil','Difícil',3),
  ('muy_dificil','Muy difícil',4)
on conflict (slug) do nothing;

-- Fuente generica para todo lo que entra por esta migracion, hasta que se
-- revise fuente a fuente (ver "NO VERIFICADO" en Prompt 2).
insert into fuentes (tipo_fuente, nombre_fuente, verificado)
select 'migracion_wordpress', 'Importado desde WordPress (sin verificar fuente original)', false
where not exists (
  select 1 from fuentes where tipo_fuente = 'migracion_wordpress'
);
