import React, { useMemo } from 'react';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { spriteIcons } from '../maps/style';

const LocationMarker = ({ id = 'location-marker', coordinate, iconImage = spriteIcons.location, iconSize = 0.7 }) => {
    const shape = useMemo(
        () => ({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id,
                    properties: { icon: iconImage },
                    geometry: { type: 'Point', coordinates: [coordinate.longitude, coordinate.latitude] },
                },
            ],
        }),
        [id, iconImage, coordinate.longitude, coordinate.latitude]
    );

    return (
        <MapLibreGL.ShapeSource id={`${id}-source`} shape={shape as any}>
            <MapLibreGL.SymbolLayer
                id={`${id}-symbol`}
                style={{
                    iconImage: ['get', 'icon'],
                    iconSize,
                    iconAllowOverlap: true,
                    iconIgnorePlacement: true,
                }}
            />
        </MapLibreGL.ShapeSource>
    );
};

export default LocationMarker;
