#!/usr/bin/env bash
set -euo pipefail

# Required: DATABASE_URL=postgresql://user:pass@host:port/dbname
# Optional: PBF_URL to override source
PBF_URL="${PBF_URL:-https://download.geofabrik.de/north-america/us/california-latest.osm.pbf}"
BBOX_WEST="-122.9"
BBOX_SOUTH="38.2"
BBOX_EAST="-120.9"
BBOX_NORTH="39.4"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

echo "==> Enabling PostGIS extension"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS osm;
SQL

echo "==> Downloading California OSM extract"
mkdir -p /tmp/martin-osm
curl -L "$PBF_URL" -o /tmp/martin-osm/california-latest.osm.pbf

echo "==> Clipping to Sacramento metro bbox"
osmium extract \
  -b "$BBOX_WEST,$BBOX_SOUTH,$BBOX_EAST,$BBOX_NORTH" \
  -o /tmp/martin-osm/sacramento.osm.pbf \
  /tmp/martin-osm/california-latest.osm.pbf

echo "==> Importing with osm2pgsql flex"
osm2pgsql \
  --database "$DATABASE_URL" \
  --output flex \
  --style infra/martin/osm-sacramento.flex.lua \
  --create \
  --slim \
  --cache 3000 \
  --number-processes 4 \
  /tmp/martin-osm/sacramento.osm.pbf

echo "==> Creating spatial indexes"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE INDEX IF NOT EXISTS osm_point_geom_gix ON osm.osm_point USING GIST (geom);
CREATE INDEX IF NOT EXISTS osm_line_geom_gix ON osm.osm_line USING GIST (geom);
CREATE INDEX IF NOT EXISTS osm_polygon_geom_gix ON osm.osm_polygon USING GIST (geom);
CREATE INDEX IF NOT EXISTS osm_roads_geom_gix ON osm.osm_roads USING GIST (geom);
ANALYZE osm.osm_point;
ANALYZE osm.osm_line;
ANALYZE osm.osm_polygon;
ANALYZE osm.osm_roads;
SQL

echo "Done. OSM layers imported for Sacramento metro."
