# Martin Map Styles

Map styles for the Martin vector tile server used by Blackstar Navigator.

## Dark Solarpunk Style

**File:** `dark-solarpunk.style.json`

A minimal, organic dark map theme designed for logistics and neighborhood context. Used as the default map style across the Blackstar Navigator mobile and web apps.

### Features
- Dark background (`#0a1a0f`) with organic green and gold accents
- OSM-based layers: parks, water, buildings, roads, place labels
- Application data layers: vendor locations, garden plots, delivery zones
- Intentionally omits highway shields and transit symbols for a clean look
- Optional contour line support (renders if a `contour` source-layer exists in tiles)

### Tile Sources

The style expects vector tiles served by Martin from the following sources (configured in `martin.yaml`):

| Source Layer | Schema | Description | Zoom Range |
|---|---|---|---|
| `osm_point` | osm | Points of interest from OpenStreetMap | 12-22 |
| `osm_line` | osm | Linear features (paths, rivers, etc.) | 8-22 |
| `osm_polygon` | osm | Area features (parks, buildings, etc.) | 6-22 |
| `osm_roads` | osm | Road network | 6-22 |
| `vendor_locations` | public | Marketplace seller/vendor locations | 10-22 |
| `garden_plots` | public | Community garden locations | 12-22 |
| `delivery_zones` | public | Delivery service coverage areas | 8-22 |

### Placeholder Variables

Replace `{martin_url}` with your Martin base URL (e.g., `https://tiles.freeblackmarket.com`):

| Endpoint | Pattern |
|---|---|
| Tiles | `{martin_url}/tiles/{z}/{x}/{y}.pbf` |
| Sprites | `{martin_url}/sprites/solarpunk` |
| Glyphs | `{martin_url}/fonts/{fontstack}/{range}.pbf` |

### Usage

To use this style in a MapLibre client:

```js
import style from './dark-solarpunk.style.json';

// Replace placeholder with your Martin URL
const styleUrl = JSON.parse(
  JSON.stringify(style).replace(/{martin_url}/g, 'https://tiles.freeblackmarket.com')
);
```

### Deployment

The Martin tile server is deployed via Docker on Railway. See the parent directory for:
- `Dockerfile` - Martin v0.14.2 container
- `martin.yaml` - Tile source configuration
- `railway.json` - Railway deployment settings
