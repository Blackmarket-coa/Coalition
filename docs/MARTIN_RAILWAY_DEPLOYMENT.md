# Martin on Railway (Medusa Postgres)

This guide deploys a Martin tile server to Railway using your existing Medusa PostgreSQL connection string format:

`postgresql://user:pass@host:port/dbname`

## 1) Enable PostGIS on your existing database

Run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS osm;
```

If extension privileges are restricted, ask your DB admin/provider to enable `postgis` for your database.

## 2) Import Sacramento OSM data with osm2pgsql flex

Prereqs on your import machine/runner:
- `psql`
- `osm2pgsql` (v1.8+)
- `osmium-tool`
- `curl`

Run:

```bash
export DATABASE_URL='postgresql://user:pass@host:port/dbname'
./infra/martin/scripts/import-sacramento.sh
```

What it does:
- downloads California Geofabrik extract
- clips to Sacramento metro bbox (`-122.9,38.2,-120.9,39.4`)
- imports using `infra/martin/osm-sacramento.flex.lua`
- builds GIST indexes for tile performance

## 3) Configure Martin for OSM + your Medusa tables

`infra/martin/martin.yaml` publishes:
- OSM tables in `osm` schema (`osm_point`, `osm_line`, `osm_polygon`, `osm_roads`)
- app tables in `public` schema (`vendor_locations`, `garden_plots`, `delivery_zones`)

> Ensure your custom tables have geometry columns (`geom`) in SRID 4326 or 3857 as configured.

## 4) Deploy to Railway

Files:
- Dockerfile: `infra/martin/Dockerfile`
- Railway config: `infra/martin/railway.json`

Railway env vars to set:
- `DATABASE_URL=postgresql://user:pass@host:port/dbname`
- optional `PORT` (Railway usually injects)

Deploy steps:
1. Create a new Railway service from this repo.
2. Point root/service to `infra/martin` (or keep repo root with provided `railway.json`).
3. Add `DATABASE_URL` environment variable.
4. Deploy.
5. Verify:
   - `/health`
   - `/catalog`

## 5) Generate Sacramento PMTiles archive (offline)

Prereqs:
- running Martin endpoint
- `martin-cp`
- `pmtiles` CLI (`go-pmtiles`)

Run:

```bash
export MARTIN_URL='https://<your-railway-martin-url>'
./infra/martin/scripts/generate-sacramento-pmtiles.sh
```

Output:
- `infra/martin/output/sacramento.pmtiles`

## Suggested SQL for custom app layer compatibility

If your custom tables currently store lat/lng without geometry columns:

```sql
ALTER TABLE public.vendor_locations
  ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

UPDATE public.vendor_locations
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE geom IS NULL AND longitude IS NOT NULL AND latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS vendor_locations_geom_gix
  ON public.vendor_locations USING GIST (geom);
```

Repeat similarly for `garden_plots`/`delivery_zones` with appropriate geometry types.
