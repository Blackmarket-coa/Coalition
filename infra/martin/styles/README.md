# Dark Solarpunk MapLibre Style

File: `dark-solarpunk.style.json`

## Placeholder variables
Replace `{martin_url}` with your Martin base URL (for example `https://tiles.freeblackmarket.com`).

- Tile endpoint pattern: `{martin_url}/tiles/{z}/{x}/{y}.pbf`
- Sprite endpoint pattern: `{martin_url}/sprites/solarpunk`
- Glyph endpoint pattern: `{martin_url}/fonts/{fontstack}/{range}.pbf`

## Notes
- This style intentionally omits highway shields and transit symbol layers for a minimal look.
- Contour lines are included as a subtle dashed stroke and will only render if a `contour` source-layer exists in your tiles.
