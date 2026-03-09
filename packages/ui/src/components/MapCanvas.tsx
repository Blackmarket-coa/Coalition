import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import Config from 'react-native-config';
import { Text, YStack } from 'tamagui';
import ProposalSheet, { GovernanceProposalFeature } from './ProposalSheet';

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
    governanceEndpoint?: string;
}

const DEFAULT_TILE_URL = 'https://tiles.example.com';
const MARTIN_TILE_URL = String(Config.MARTIN_TILE_URL || DEFAULT_TILE_URL).replace(/\/$/, '');
const MARTIN_SPRITE_URL = String(Config.MARTIN_SPRITE_URL || `${MARTIN_TILE_URL}/sprites/dark-solarpunk`);
const MARTIN_GLYPHS_URL = String(Config.MARTIN_GLYPHS_URL || `${MARTIN_TILE_URL}/fonts/{fontstack}/{range}.pbf`);

const createMapStyle = () => ({
    version: 8,
    name: 'MapCanvasStyle',
    sprite: MARTIN_SPRITE_URL,
    glyphs: MARTIN_GLYPHS_URL,
    sources: {
        martin: {
            type: 'vector',
            tiles: [`${MARTIN_TILE_URL}/{z}/{x}/{y}.pbf`],
            minzoom: 0,
            maxzoom: 22,
        },
    },
    layers: [
        {
            id: 'bg',
            type: 'background',
            paint: {
                'background-color': '#0b1220',
            },
        },
    ],
});

const getDominantLayerColorExpression = () =>
    [
        'case',
        ['all', ['>=', ['get', 'market_count'], ['get', 'jobs_count']], ['>=', ['get', 'market_count'], ['get', 'govern_count']], ['>=', ['get', 'market_count'], ['get', 'aid_count']]],
        '#22c55e',
        ['all', ['>=', ['get', 'jobs_count'], ['get', 'market_count']], ['>=', ['get', 'jobs_count'], ['get', 'govern_count']], ['>=', ['get', 'jobs_count'], ['get', 'aid_count']]],
        '#f59e0b',
        ['all', ['>=', ['get', 'govern_count'], ['get', 'market_count']], ['>=', ['get', 'govern_count'], ['get', 'jobs_count']], ['>=', ['get', 'govern_count'], ['get', 'aid_count']]],
        '#a855f7',
        '#06b6d4',
    ] as any;

const boundsFromCoordinates = (coordinates: [number, number][]) => {
    if (!coordinates.length) {
        return null;
    }

    let minLng = coordinates[0][0];
    let maxLng = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];

    for (const [lng, lat] of coordinates) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }

    return {
        ne: [maxLng, maxLat] as [number, number],
        sw: [minLng, minLat] as [number, number],
    };
};

export const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(function MapCanvas(
    {
        features,
        onEntitySelect,
        locationPermissionGranted = false,
        isLocationAvailable = true,
        locationUnavailableMessage = 'Location access is disabled. Enable approximate location to view map markers.',
        initialZoom = 11,
        initialCenter = [-121.4944, 38.5816],
        style,
        governanceEndpoint = `${String(Config.BLACKSTAR_GATEWAY_HOST || '').replace(/\/$/, '')}/api/v1/spatial/governance`,
    },
    ref
) {
    const mapStyle = useMemo(() => createMapStyle(), []);
    const cameraRef = useRef<any>(null);
    const shapeSourceRef = useRef<any>(null);
    const webMapRef = useRef<any>(null);
    const webMapContainerRef = useRef<View | null>(null);
    const governanceSourceRef = useRef<any>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [governanceFeatures, setGovernanceFeatures] = useState<GovernanceProposalFeature[]>([]);
    const [selectedProposal, setSelectedProposal] = useState<GovernanceProposalFeature | null>(null);
    const [pulseOn, setPulseOn] = useState(true);

    const governanceFeatureCollection = useMemo(
        () => ({ type: 'FeatureCollection', features: governanceFeatures }) as const,
        [governanceFeatures]
    );

    useEffect(() => {
        const timer = setInterval(() => setPulseOn((curr) => !curr), 900);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const fetchGovernance = async () => {
            if (!governanceEndpoint || governanceEndpoint === '/api/v1/spatial/governance') {
                return;
            }

            try {
                const response = await fetch(governanceEndpoint, { headers: { Accept: 'application/json' } });
                if (!response.ok) return;
                const payload = await response.json();
                const nextFeatures = Array.isArray(payload?.features) ? payload.features : [];
                if (!cancelled) {
                    setGovernanceFeatures(nextFeatures);
                }
            } catch (error) {
                console.warn('Unable to fetch governance proposals:', error);
            }
        };

        fetchGovernance();
        const interval = setInterval(fetchGovernance, 30000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [governanceEndpoint]);

    const zoomToNativeClusterBounds = useCallback(async (clusterFeature: any) => {
        const clusterId = clusterFeature?.properties?.cluster_id;
        if (!clusterId) {
            return;
        }

        try {
            const leaves = await shapeSourceRef.current?.getClusterLeaves(clusterId, 100, 0);
            const coords = (leaves ?? []).map((leaf: any) => leaf?.geometry?.coordinates).filter((coord: unknown): coord is [number, number] => Array.isArray(coord) && coord.length === 2);

            const bounds = boundsFromCoordinates(coords);
            if (bounds && cameraRef.current?.fitBounds) {
                cameraRef.current.fitBounds(bounds.ne, bounds.sw, 60, 500);
                return;
            }
        } catch (error) {
            console.warn('Unable to compute cluster bounds from leaves:', error);
        }

        const center = clusterFeature?.geometry?.coordinates;
        if (!Array.isArray(center)) {
            return;
        }

        const expansionZoom = await shapeSourceRef.current?.getClusterExpansionZoom?.(clusterId);
        cameraRef.current?.setCamera?.({
            centerCoordinate: center,
            zoomLevel: expansionZoom ?? 15,
            animationDuration: 400,
        });
    }, []);

    const handleNativeShapePress = useCallback(
        async (event: { features?: any[] }) => {
            const tapped = event.features?.[0];
            if (!tapped) {
                return;
            }

            if (tapped.properties?.cluster) {
                await zoomToNativeClusterBounds(tapped);
                return;
            }

            onEntitySelect(tapped as GeoJSONPointFeature);
        },
        [onEntitySelect, zoomToNativeClusterBounds]
    );

    useImperativeHandle(ref, () => ({
        flyTo: (coordinates, zoom = 14) => {
            if (Platform.OS === 'web' && webMapRef.current) {
                webMapRef.current.flyTo({ center: coordinates, zoom, essential: true });
                return;
            }

            cameraRef.current?.setCamera?.({
                centerCoordinate: coordinates,
                zoomLevel: zoom,
                animationDuration: 450,
            });
        },
    }));

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
                    clusterProperties: {
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
                    },
                } as any);

                map.addSource('governance-proposals', { type: 'geojson', data: governanceFeatureCollection as any });

                map.addLayer({
                    id: 'clusters',
                    type: 'circle',
                    source: 'spatial-feed',
                    filter: ['has', 'point_count'],
                    paint: {
                        'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 1, 16, 100, 30, 1000, 44],
                        'circle-color': getDominantLayerColorExpression(),
                        'circle-opacity': 0.86,
                        'circle-stroke-color': '#0f172a',
                        'circle-stroke-width': 2,
                    },
                } as any);

                map.addLayer({
                    id: 'governance-closing-pulse',
                    type: 'circle',
                    source: 'governance-proposals',
                    paint: {
                        'circle-radius': ['case', ['==', ['get', 'is_closing_soon'], true], pulseOn ? 18 : 10, 0],
                        'circle-color': '#f59e0b',
                        'circle-opacity': ['case', ['==', ['get', 'is_closing_soon'], true], pulseOn ? 0.3 : 0.12, 0],
                    },
                } as any);

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
                } as any);

                map.addLayer({
                    id: 'governance-votes',
                    type: 'symbol',
                    source: 'governance-proposals',
                    layout: {
                        'text-field': '🗳',
                        'text-size': 18,
                        'text-allow-overlap': true,
                    },
                    paint: {
                        'text-color': '#f8fafc',
                        'text-halo-color': '#0f172a',
                        'text-halo-width': 1,
                    },
                } as any);

                map.on('click', 'points', (e: any) => {
                    const hit = e.features?.[0];
                    if (hit) {
                        onEntitySelect(hit as GeoJSONPointFeature);
                    }
                });

                map.on('click', 'governance-votes', (e: any) => {
                    const hit = e.features?.[0];
                    if (hit) {
                        setSelectedProposal(hit as GovernanceProposalFeature);
                    }
                });

                map.on('click', 'clusters', (e: any) => {
                    const hit = e.features?.[0];
                    if (!hit) {
                        return;
                    }

                    map.getSource('spatial-feed')
                        // @ts-expect-error web cluster source api
                        .getClusterLeaves(hit.properties.cluster_id, 100, 0, (_err: unknown, leaves: any[]) => {
                            const coords = (leaves ?? [])
                                .map((leaf: any) => leaf?.geometry?.coordinates)
                                .filter((coord: unknown): coord is [number, number] => Array.isArray(coord) && coord.length === 2);

                            const bounds = boundsFromCoordinates(coords);
                            if (!bounds) {
                                return;
                            }

                            map.fitBounds([bounds.sw, bounds.ne], { padding: 60, duration: 500 });
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
    }, [features, governanceFeatureCollection, initialCenter, initialZoom, mapStyle, onEntitySelect]);

    useEffect(() => {
        if (Platform.OS !== 'web' || !webMapRef.current) {
            return;
        }

        const map = webMapRef.current;
        map.getSource('spatial-feed')?.setData?.(features as any);
        map.getSource('governance-proposals')?.setData?.(governanceFeatureCollection as any);
    }, [features, governanceFeatureCollection]);

    useEffect(() => {
        if (Platform.OS !== 'web' || !webMapRef.current) {
            return;
        }

        const map = webMapRef.current;
        map.setPaintProperty?.('governance-closing-pulse', 'circle-radius', ['case', ['==', ['get', 'is_closing_soon'], true], pulseOn ? 18 : 10, 0]);
        map.setPaintProperty?.('governance-closing-pulse', 'circle-opacity', ['case', ['==', ['get', 'is_closing_soon'], true], pulseOn ? 0.3 : 0.12, 0]);
    }, [pulseOn]);

    if (!isLocationAvailable) {
        return (
            <YStack position='relative' style={style} justifyContent='center' alignItems='center' bg='$background'>
                <Text textAlign='center' color='$color11' maxWidth={280}>
                    {locationUnavailableMessage}
                </Text>
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
            {Platform.OS === 'web' ? <View ref={webMapContainerRef} style={styles.map} /> : null}

            {Platform.OS !== 'web' ? (
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
                                circleColor: getDominantLayerColorExpression(),
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

                    <MapLibreGL.ShapeSource id='governance-source' ref={governanceSourceRef} shape={governanceFeatureCollection as any} onPress={(e) => setSelectedProposal(e.features?.[0] as GovernanceProposalFeature)}>
                        <MapLibreGL.CircleLayer
                            id='governance-closing-pulse-native'
                            style={{
                                circleRadius: ['case', ['==', ['get', 'is_closing_soon'], true], pulseOn ? 18 : 10, 0],
                                circleColor: '#f59e0b',
                                circleOpacity: ['case', ['==', ['get', 'is_closing_soon'], true], pulseOn ? 0.3 : 0.12, 0],
                            }}
                        />
                        <MapLibreGL.SymbolLayer
                            id='governance-vote-symbols'
                            style={{
                                textField: '🗳',
                                textSize: 18,
                                textAllowOverlap: true,
                                textColor: '#f8fafc',
                                textHaloColor: '#0f172a',
                                textHaloWidth: 1,
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
                                    circleRadius: ['interpolate', ['linear'], ['zoom'], 0, 8, 20, 16],
                                    circleOpacity: 0.22,
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
            ) : null}

            <YStack position='absolute' top={10} left={10} backgroundColor='$backgroundStrong' borderRadius='$3' padding='$2'>
                <Text fontSize={12}>Features: {features.features.length} · Proposals: {governanceFeatures.length}</Text>
            </YStack>

            <ProposalSheet proposal={selectedProposal} visible={Boolean(selectedProposal)} onClose={() => setSelectedProposal(null)} />
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
