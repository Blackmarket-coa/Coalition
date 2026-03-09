#!/usr/bin/env bash
set -euo pipefail

# Requires a running Martin endpoint and go-pmtiles tool in PATH.
# Example:
#   MARTIN_URL=https://my-martin.up.railway.app ./infra/martin/scripts/generate-sacramento-pmtiles.sh

MARTIN_URL="${MARTIN_URL:-http://localhost:3000}"
OUTPUT_DIR="${OUTPUT_DIR:-./infra/martin/output}"
MBTILES="$OUTPUT_DIR/sacramento.mbtiles"
PMTILES="$OUTPUT_DIR/sacramento.pmtiles"

# Sacramento bbox in WGS84
BBOX="-122.9,38.2,-120.9,39.4"
MIN_ZOOM="${MIN_ZOOM:-6}"
MAX_ZOOM="${MAX_ZOOM:-14}"

mkdir -p "$OUTPUT_DIR"

echo "==> Exporting MBTiles from Martin"
# martin-cp copies tilejson/vector sources into mbtiles
martin-cp \
  --source "$MARTIN_URL/catalog" \
  --bbox "$BBOX" \
  --minzoom "$MIN_ZOOM" \
  --maxzoom "$MAX_ZOOM" \
  --output "$MBTILES"

echo "==> Converting MBTiles to PMTiles"
pmtiles convert "$MBTILES" "$PMTILES"

echo "Created: $PMTILES"
