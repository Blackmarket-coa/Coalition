import Config from 'react-native-config';

const tileUrl = Config.MARTIN_TILE_URL || 'https://tiles.example.com';
const spriteUrl = Config.MARTIN_SPRITE_URL || `${tileUrl.replace(/\/$/, '')}/sprites/dark-solarpunk`;
const glyphsUrl = Config.MARTIN_GLYPHS_URL || `${tileUrl.replace(/\/$/, '')}/fonts/{fontstack}/{range}.pbf`;

export const darkSolarpunkStyle = {
    version: 8,
    name: 'Blackstar Dark Solarpunk',
    sprite: spriteUrl,
    glyphs: glyphsUrl,
    sources: {
        martin: {
            type: 'vector',
            tiles: [`${tileUrl.replace(/\/$/, '')}/{z}/{x}/{y}.pbf`],
            minzoom: 0,
            maxzoom: 22,
        },
    },
    layers: [
        {
            id: 'bg',
            type: 'background',
            paint: { 'background-color': '#091018' },
        },
        {
            id: 'land',
            type: 'fill',
            source: 'martin',
            'source-layer': 'landuse',
            paint: {
                'fill-color': '#0f1f1f',
                'fill-opacity': 0.95,
            },
        },
        {
            id: 'water',
            type: 'fill',
            source: 'martin',
            'source-layer': 'water',
            paint: {
                'fill-color': '#0a2d4a',
                'fill-opacity': 0.9,
            },
        },
        {
            id: 'roads',
            type: 'line',
            source: 'martin',
            'source-layer': 'transportation',
            paint: {
                'line-color': '#4ecdc4',
                'line-opacity': 0.55,
                'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 16, 3],
            },
        },
    ],
};

export const spriteIcons = {
    pickup: 'pickup-pin',
    dropoff: 'dropoff-pin',
    waypoint: 'waypoint-pin',
    driver: 'driver-marker',
    vehicle: 'vehicle-marker',
    tracking: 'tracking-marker',
    location: 'location-pin',
};
