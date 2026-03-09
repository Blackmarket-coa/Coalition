-- osm2pgsql flex style for Sacramento import
-- Usage: osm2pgsql -O flex -S osm-sacramento.flex.lua ...

local tables = {}

local srid = 3857

local common_columns = {
  { column = 'osm_id', type = 'int8' },
  { column = 'name', type = 'text' },
  { column = 'class', type = 'text' },
  { column = 'subclass', type = 'text' },
  { column = 'tags', type = 'jsonb' },
}

tables.point = osm2pgsql.define_table({
  name = 'osm_point',
  schema = 'osm',
  ids = { type = 'node', id_column = 'osm_id' },
  columns = {
    { column = 'geom', type = 'point', projection = srid, not_null = true },
    table.unpack(common_columns),
  },
})

tables.line = osm2pgsql.define_table({
  name = 'osm_line',
  schema = 'osm',
  ids = { type = 'way', id_column = 'osm_id' },
  columns = {
    { column = 'geom', type = 'linestring', projection = srid, not_null = true },
    table.unpack(common_columns),
  },
})

tables.polygon = osm2pgsql.define_table({
  name = 'osm_polygon',
  schema = 'osm',
  ids = { type = 'area', id_column = 'osm_id' },
  columns = {
    { column = 'geom', type = 'geometry', projection = srid, not_null = true },
    table.unpack(common_columns),
  },
})

tables.roads = osm2pgsql.define_table({
  name = 'osm_roads',
  schema = 'osm',
  ids = { type = 'way', id_column = 'osm_id' },
  columns = {
    { column = 'geom', type = 'linestring', projection = srid, not_null = true },
    { column = 'osm_id', type = 'int8' },
    { column = 'name', type = 'text' },
    { column = 'highway', type = 'text' },
    { column = 'surface', type = 'text' },
    { column = 'maxspeed', type = 'text' },
    { column = 'tags', type = 'jsonb' },
  },
})

function osm2pgsql.process_node(object)
  if object.tags and (object.tags.amenity or object.tags.shop or object.tags.tourism or object.tags.leisure) then
    tables.point:insert({
      geom = object:as_point(),
      osm_id = object.id,
      name = object.tags.name,
      class = object.tags.amenity or object.tags.shop or object.tags.tourism or object.tags.leisure,
      subclass = object.tags.cuisine or object.tags.brand,
      tags = object.tags,
    })
  end
end

function osm2pgsql.process_way(object)
  if not object.tags then
    return
  end

  local is_road = object.tags.highway ~= nil
  local has_polygon = object.is_closed and (
    object.tags.building or object.tags.landuse or object.tags.natural or object.tags.leisure
  )

  if is_road then
    tables.roads:insert({
      geom = object:as_linestring(),
      osm_id = object.id,
      name = object.tags.name,
      highway = object.tags.highway,
      surface = object.tags.surface,
      maxspeed = object.tags.maxspeed,
      tags = object.tags,
    })

    tables.line:insert({
      geom = object:as_linestring(),
      osm_id = object.id,
      name = object.tags.name,
      class = object.tags.highway,
      subclass = object.tags.surface,
      tags = object.tags,
    })
  end

  if has_polygon then
    tables.polygon:insert({
      geom = object:as_polygon(),
      osm_id = object.id,
      name = object.tags.name,
      class = object.tags.landuse or object.tags.building or object.tags.natural,
      subclass = object.tags.leisure,
      tags = object.tags,
    })
  elseif not is_road and object.tags.waterway then
    tables.line:insert({
      geom = object:as_linestring(),
      osm_id = object.id,
      name = object.tags.name,
      class = 'waterway',
      subclass = object.tags.waterway,
      tags = object.tags,
    })
  end
end

function osm2pgsql.process_relation(object)
  if not object.tags then
    return
  end

  if object.tags.type == 'multipolygon' and (object.tags.landuse or object.tags.natural or object.tags.leisure or object.tags.building) then
    tables.polygon:insert({
      geom = object:as_multipolygon(),
      osm_id = object.id,
      name = object.tags.name,
      class = object.tags.landuse or object.tags.building or object.tags.natural,
      subclass = object.tags.leisure,
      tags = object.tags,
    })
  end
end
