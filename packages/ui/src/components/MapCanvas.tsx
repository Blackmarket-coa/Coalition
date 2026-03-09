import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Text, YStack } from 'tamagui';

export type SpatialLayer = 'market' | 'jobs' | 'govern' | 'aid';

export interface MapCanvasFeatureProperties {
    layer: SpatialLayer;
    entity_type: string;
    id: string;
    name: string;
    status: string;
    icon: string;
    preview?: {
        image_url?: string | null;
        tagline?: string | null;
        rating?: number | null;
    };
}

export interface GeoJSONPointFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
    properties: MapCanvasFeatureProperties;
}

export interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONPointFeature[];
}

export interface MapCanvasRef {
    flyTo: (coordinates: [number, number], zoom?: number) => void;
}

interface MapCanvasProps {
    features: GeoJSONFeatureCollection;
    onEntitySelect: (feature: GeoJSONPointFeature) => void;
    locationPermissionGranted?: boolean;
    isLocationAvailable?: boolean;
    locationUnavailableMessage?: string;
    initialZoom?: number;
    initialCenter?: [number, number];
    style?: object;
}

const DEFAULT_TILE_URL = 'https://tiles.example.com';

const getMartinTileUrl = () => {
    const envUrl = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.MARTIN_TILE_URL ?? DEFAULT_TILE_URL;

    return envUrl.replace(/\/$/, '');
};

const createMapStyle = (tileUrl: string) => ({
    version: 8,
    sources: {
        martin: {
            type: 'vector',
            tiles: [`${tileUrl}/{z}/{x}/{y}.pbf`],
            minzoom: 0,
            maxzoom: 22,
        },
    },
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0b1220' } }],
});

export const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(function MapCanvas(
    {
        features,
        onEntitySelect,
        locationPermissionGranted = false,
        isLocationAvailable = true,
        locationUnavailableMessage = 'Location access is off. Enable approximate location to view nearby markers.',
        initialZoom = 11,
        initialCenter = [-121.4944, 38.5816],
        style,
    },
    ref
) {
    const tileUrl = useMemo(() => getMartinTileUrl(), []);
    const mapStyle = useMemo(() => createMapStyle(tileUrl), [tileUrl]);
    const cameraRef = useRef<any>(null);
    const shapeSourceRef = useRef<any>(null);
    const webMapRef = useRef<any>(null);
    const webMapContainerRef = useRef<View | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    const centerOnCluster = useCallback(async (feature: any) => {
        const clusterId = feature?.properties?.cluster_id;
        const center = feature?.geometry?.coordinates;
        if (!clusterId || !Array.isArray(center)) {
            return;
        }

        try {
            const expansionZoom = await shapeSourceRef.current?.getClusterExpansionZoom(clusterId);
            if (cameraRef.current?.setCamera) {
                cameraRef.current.setCamera({
                    centerCoordinate: center,
                    zoomLevel: expansionZoom ?? 15,
                    animationDuration: 400,
                });
            }
        } catch {
            if (cameraRef.current?.setCamera) {
                cameraRef.current.setCamera({
                    centerCoordinate: center,
                    zoomLevel: 15,
                    animationDuration: 400,
                });
            }
        }
    }, []);

    const handleNativeShapePress = useCallback(
        async (event: { features?: any[] }) => {
            const tapped = event.features?.[0];
            if (!tapped) {
                return;
            }

            const isCluster = Boolean(tapped.properties?.cluster);
            if (isCluster) {
                await centerOnCluster(tapped);
                return;
            }

            onEntitySelect(tapped as GeoJSONPointFeature);
        },
        [centerOnCluster, onEntitySelect]
    );

    useImperativeHandle(
        ref,
        () => ({
            flyTo: (coordinates, zoom = 14) => {
                if (Platform.OS === 'web' && webMapRef.current) {
                    webMapRef.current.flyTo({ center: coordinates, zoom, essential: true });
                    return;
                }

                if (cameraRef.current?.setCamera) {
                    cameraRef.current.setCamera({
                        centerCoordinate: coordinates,
                        zoomLevel: zoom,
                        animationDuration: 450,
                    });
                }
            },
        }),
        []
    );

    useEffect(() => {
        if (!locationPermissionGranted || Platform.OS !== 'web') {
            return;
        }

        const watcher = navigator.geolocation.watchPosition((position) => {
            setUserLocation([position.coords.longitude, position.coords.latitude]);
        });

        return () => navigator.geolocation.clearWatch(watcher);
    }, [locationPermissionGranted]);

    useEffect(() => {
        if (Platform.OS !== 'web' || !webMapContainerRef.current) {
            return;
        }

        let cancelled = false;

        (async () => {
            const maplibregl = await import('maplibre-gl');
            if (cancelled) {
                return;
            }

            const map = new maplibregl.Map({
                container: webMapContainerRef.current as unknown as HTMLElement,
                style: mapStyle as any,
                center: initialCenter,
                zoom: initialZoom,
            });

            map.on('load', () => {
                map.addSource('spatial-feed', {
                    type: 'geojson',
                    data: features as any,
                    cluster: true,
                    clusterMaxZoom: 14,
                    clusterRadius: 50,
                });

                map.addLayer({
                    id: 'clusters',
                    type: 'circle',
                    source: 'spatial-feed',
                    filter: ['has', 'point_count'],
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 1, 18, 100, 36, 1000, 50],
                        'circle-color': '#22c55e',
                        'circle-opacity': 0.85,
                    },
                });

                map.addLayer({
                    id: 'points',
                    type: 'symbol',
                    source: 'spatial-feed',
                    filter: ['!', ['has', 'point_count']],
                    layout: {
                        'icon-image': ['get', 'icon'],
                        'icon-size': 0.8,
                        'icon-allow-overlap': true,
                    },
                });

                map.on('click', 'points', (e: any) => {
                    const hit = e.features?.[0];
                    if (hit) {
                        onEntitySelect(hit as GeoJSONPointFeature);
                    }
                });

                map.on('click', 'clusters', (e: any) => {
                    const hit = e.features?.[0];
                    if (!hit) {
                        return;
                    }

                    map.getSource('spatial-feed')
                        // @ts-expect-error web source api
                        .getClusterExpansionZoom(hit.properties.cluster_id, (_error: unknown, zoom: number) => {
                            map.easeTo({ center: hit.geometry.coordinates, zoom });
                        });
                });

                webMapRef.current = map;
            });
        })();

        return () => {
            cancelled = true;
            webMapRef.current?.remove?.();
            webMapRef.current = null;
        };
    }, [features, initialCenter, initialZoom, mapStyle, onEntitySelect]);

    if (!isLocationAvailable) {
        return (
            <YStack position='relative' style={style} justifyContent='center' alignItems='center' bg='$background'>
                <Text textAlign='center' color='$color11' maxWidth={280}>
                    {locationUnavailableMessage}
                </Text>
            </YStack>
        );
    }
    if (Platform.OS === 'web') {
        return (
            <YStack position='relative' style={style}>
                <View ref={webMapContainerRef} style={styles.map} />
                <YStack position='absolute' top={10} left={10} backgroundColor='$backgroundStrong' borderRadius='$3' padding='$2'>
                    <Text fontSize={12}>Features: {features.features.length}</Text>
                </YStack>
            </YStack>
        );
    }

    const userLocationShape = userLocation
        ? ({
              type: 'FeatureCollection',
              features: [
                  {
                      type: 'Feature',
                      geometry: { type: 'Point', coordinates: userLocation },
                      properties: {},
                  },
              ],
          } as const)
        : null;

    return (
        <YStack position='relative' style={style}>
            <MapLibreGL.MapView style={styles.map} mapStyle={mapStyle as any} attributionEnabled={false} logoEnabled={false}>
                <MapLibreGL.Camera ref={cameraRef} centerCoordinate={initialCenter} zoomLevel={initialZoom} />

                <MapLibreGL.ShapeSource
                    id='spatial-feed-source'
                    ref={shapeSourceRef}
                    shape={features as any}
                    cluster
                    clusterMaxZoomLevel={14}
                    clusterRadius={50}
                    clusterProperties={{
                        market_count: [
                            ['+', ['accumulated'], ['case', ['==', ['get', 'layer'], 'market'], 1, 0]],
                            ['case', ['==', ['get', 'layer'], 'market'], 1, 0],
                        ],
                        jobs_count: [
                            ['+', ['accumulated'], ['case', ['==', ['get', 'layer'], 'jobs'], 1, 0]],
                            ['case', ['==', ['get', 'layer'], 'jobs'], 1, 0],
                        ],
                        govern_count: [
                            ['+', ['accumulated'], ['case', ['==', ['get', 'layer'], 'govern'], 1, 0]],
                            ['case', ['==', ['get', 'layer'], 'govern'], 1, 0],
                        ],
                        aid_count: [
                            ['+', ['accumulated'], ['case', ['==', ['get', 'layer'], 'aid'], 1, 0]],
                            ['case', ['==', ['get', 'layer'], 'aid'], 1, 0],
                        ],
                    }}
                    onPress={handleNativeShapePress}
                >
                    <MapLibreGL.CircleLayer
                        id='clustered-circles'
                        filter={['has', 'point_count']}
                        style={{
                            circleRadius: ['interpolate', ['linear'], ['get', 'point_count'], 1, 16, 100, 30, 1000, 44],
                            circleColor: [
                                'case',
                                ['>=', ['get', 'market_count'], ['get', 'aid_count']],
                                ['>=', ['get', 'market_count'], ['get', 'govern_count']],
                                ['>=', ['get', 'market_count'], ['get', 'jobs_count']],
                                '#22c55e',
                                ['>=', ['get', 'aid_count'], ['get', 'govern_count']],
                                ['>=', ['get', 'aid_count'], ['get', 'jobs_count']],
                                '#06b6d4',
                                ['>=', ['get', 'govern_count'], ['get', 'jobs_count']],
                                '#a855f7',
                                '#f59e0b',
                            ] as any,
                            circleOpacity: 0.86,
                            circleStrokeColor: '#0f172a',
                            circleStrokeWidth: 2,
                        }}
                    />

                    <MapLibreGL.SymbolLayer
                        id='unclustered-symbols'
                        filter={['!', ['has', 'point_count']]}
                        style={{
                            iconImage: ['get', 'icon'],
                            iconSize: 0.8,
                            iconAllowOverlap: true,
                            iconIgnorePlacement: true,
                        }}
                    />
                </MapLibreGL.ShapeSource>

                {locationPermissionGranted && <MapLibreGL.UserLocation visible showsUserHeadingIndicator />}

                {locationPermissionGranted && userLocationShape ? (
                    <MapLibreGL.ShapeSource id='user-location-source' shape={userLocationShape as any}>
                        <MapLibreGL.CircleLayer
                            id='user-location-pulse'
                            style={{
                                circleColor: '#22c55e',
                                circleRadius: 14,
                                circleOpacity: 0.25,
                            }}
                        />
                        <MapLibreGL.CircleLayer
                            id='user-location-dot'
                            style={{
                                circleColor: '#22c55e',
                                circleRadius: 6,
                                circleStrokeWidth: 2,
                                circleStrokeColor: '#ecfdf5',
                            }}
                        />
                    </MapLibreGL.ShapeSource>
                ) : null}
            </MapLibreGL.MapView>

            <YStack position='absolute' top={10} left={10} backgroundColor='$backgroundStrong' borderRadius='$3' padding='$2'>
                <Text fontSize={12}>Features: {features.features.length}</Text>
            </YStack>
        </YStack>
    );
});

const styles = StyleSheet.create({
    map: {
        width: '100%',
        height: '100%',
        minHeight: 240,
    },
});

export default MapCanvas;
