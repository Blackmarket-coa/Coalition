import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { YStack } from 'tamagui';
import { restoreFleetbasePlace, getCoordinates } from '@blackstar/core/src/utils/location';
import useFleetbase from '@blackstar/core/src/hooks/use-fleetbase';
import { darkSolarpunkStyle, spriteIcons } from '../maps/style';

const PlaceMapView = ({ place: _place, width = '100%', height = 200, zoom = 14, onPress, mapViewProps = {}, ...props }) => {
    const { adapter } = useFleetbase();
    const place = restoreFleetbasePlace(_place, adapter);
    const [latitude, longitude] = getCoordinates(place);

    const feature = useMemo(
        () => ({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id: place?.id ?? 'place',
                    properties: { icon: spriteIcons.location },
                    geometry: { type: 'Point', coordinates: [longitude, latitude] },
                },
            ],
        }),
        [place?.id, longitude, latitude]
    );

    return (
        <Pressable onPress={onPress} style={{ flex: 1, width, height }}>
            <YStack position='relative' overflow='hidden' borderRadius='$4' width={width} height={height} {...props}>
                <MapLibreGL.MapView mapStyle={darkSolarpunkStyle as any} style={StyleSheet.absoluteFill} compassEnabled={false} logoEnabled={false} attributionEnabled={false} {...mapViewProps}>
                    <MapLibreGL.Camera centerCoordinate={[longitude, latitude]} zoomLevel={zoom} animationMode='easeTo' animationDuration={500} />
                    <MapLibreGL.ShapeSource id='place-source' shape={feature as any}>
                        <MapLibreGL.SymbolLayer
                            id='place-symbol-layer'
                            style={{
                                iconImage: ['get', 'icon'],
                                iconSize: 0.7,
                                iconAllowOverlap: true,
                                iconIgnorePlacement: true,
                            }}
                        />
                    </MapLibreGL.ShapeSource>
                </MapLibreGL.MapView>
            </YStack>
        </Pressable>
    );
};

export default PlaceMapView;
