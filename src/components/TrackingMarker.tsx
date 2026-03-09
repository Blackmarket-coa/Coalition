import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { spriteIcons } from '../maps/style';

const TrackingMarker = forwardRef(({ id = 'tracking-marker', coordinate, iconImage = spriteIcons.tracking, iconSize = 0.8, initialRotation = 0, baseRotation = 0, onPress }, ref) => {
    const [position, setPosition] = useState([coordinate.longitude, coordinate.latitude]);
    const [heading, setHeading] = useState(initialRotation);

    useImperativeHandle(ref, () => ({
        move: (latitude, longitude) => setPosition([longitude, latitude]),
        rotate: (newHeading) => setHeading(newHeading),
    }));

    const shape = useMemo(
        () => ({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id,
                    properties: {
                        icon: iconImage,
                        heading: heading + baseRotation,
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: position,
                    },
                },
            ],
        }),
        [id, iconImage, heading, baseRotation, position]
    );

    return (
        <MapLibreGL.ShapeSource id={`${id}-source`} shape={shape as any} onPress={onPress}>
            <MapLibreGL.SymbolLayer
                id={`${id}-symbol`}
                style={{
                    iconImage: ['get', 'icon'],
                    iconRotate: ['get', 'heading'],
                    iconRotationAlignment: 'map',
                    iconAllowOverlap: true,
                    iconIgnorePlacement: true,
                    iconSize,
                }}
            />
        </MapLibreGL.ShapeSource>
    );
});

export default TrackingMarker;
