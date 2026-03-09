import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { YStack } from 'tamagui';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Driver, Place } from '@fleetbase/sdk';
import { useLocation } from '@blackstar/core/src/contexts/LocationContext';
import { restoreFleetbasePlace, getCoordinates } from '@blackstar/core/src/utils/location';
import { last, first } from '@blackstar/core/src/utils';
import DriverMarker from './DriverMarker';
import useFleetbase from '@blackstar/core/src/hooks/use-fleetbase';
import { darkSolarpunkStyle, spriteIcons } from '../maps/style';

const getPlaceCoords = (place) => {
    const [latitude, longitude] = getCoordinates(place);
    return { latitude, longitude };
};

const LiveOrderRoute = ({ order, width = '100%', height = '100%', zoom = 13, markerSize = 'sm', focusCurrentDestination = false, children, ...props }) => {
    const mapRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const { getDriverLocationAsPlace } = useLocation();
    const { adapter } = useFleetbase();
    const [driverPoint, setDriverPoint] = useState<any>(null);

    const pickup = order.getAttribute('payload.pickup');
    const dropoff = order.getAttribute('payload.dropoff');
    const waypoints = order.getAttribute('payload.waypoints', []) ?? [];

    const currentDestination = useMemo(() => {
        const currentWaypoint = order.getAttribute('payload.current_waypoint');
        const locations = [pickup, ...waypoints, dropoff].filter(Boolean);
        const destination = locations.find((place) => place?.id === currentWaypoint) ?? locations[0];
        return new Place(destination, adapter);
    }, [pickup, dropoff, waypoints, order, adapter]);

    const start = useMemo(() => {
        if (pickup) {
            return restoreFleetbasePlace(pickup, adapter);
        }

        const fallback = getDriverLocationAsPlace(order.getAttribute('driver'));
        return fallback ?? first(waypoints);
    }, [pickup, adapter, order, waypoints, getDriverLocationAsPlace]);

    const end = useMemo(() => restoreFleetbasePlace(dropoff ?? last(waypoints), adapter), [dropoff, waypoints, adapter]);

    const driverAssigned = useMemo(() => {
        const driver = order.getAttribute('driver');
        return driver ? new Driver(driver, adapter) : null;
    }, [order, adapter]);

    const points = useMemo(() => {
        const entries: any[] = [];
        if (start) {
            const c = getPlaceCoords(start);
            entries.push({ type: 'Feature', properties: { role: 'pickup', icon: spriteIcons.pickup }, geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] } });
        }

        waypoints.forEach((wp) => {
            const place = restoreFleetbasePlace(wp, adapter);
            const c = getPlaceCoords(place);
            entries.push({ type: 'Feature', properties: { role: 'waypoint', icon: spriteIcons.waypoint }, geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] } });
        });

        if (end) {
            const c = getPlaceCoords(end);
            entries.push({ type: 'Feature', properties: { role: 'dropoff', icon: spriteIcons.dropoff }, geometry: { type: 'Point', coordinates: [c.longitude, c.latitude] } });
        }

        return { type: 'FeatureCollection', features: entries };
    }, [start, waypoints, end, adapter]);

    const routeLine = useMemo(() => {
        const coords = points.features.map((f) => f.geometry.coordinates);
        return {
            type: 'FeatureCollection',
            features: coords.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }] : [],
        };
    }, [points]);

    useEffect(() => {
        if (!cameraRef.current || points.features.length === 0) return;
        const allCoords = points.features.map((f) => f.geometry.coordinates);
        if (focusCurrentDestination && currentDestination) {
            const c = getPlaceCoords(currentDestination);
            cameraRef.current.setCamera({ centerCoordinate: [c.longitude, c.latitude], zoomLevel: zoom, animationDuration: 600 });
            return;
        }

        if (allCoords.length === 1) {
            cameraRef.current.setCamera({ centerCoordinate: allCoords[0], zoomLevel: zoom, animationDuration: 600 });
            return;
        }

        const lng = allCoords.map((c) => c[0]);
        const lat = allCoords.map((c) => c[1]);
        cameraRef.current.fitBounds([Math.max(...lng), Math.max(...lat)], [Math.min(...lng), Math.min(...lat)], 60, 600);
    }, [points, focusCurrentDestination, currentDestination, zoom]);

    const onDriverMovement = useCallback((movement) => {
        if (!movement?.coordinates) return;
        setDriverPoint([movement.coordinates.longitude, movement.coordinates.latitude]);
    }, []);

    const clusterRadius = markerSize === 'lg' ? 70 : 50;

    return (
        <YStack width={width} height={height} overflow='hidden' borderRadius='$4' {...props}>
            <MapLibreGL.MapView ref={mapRef} style={StyleSheet.absoluteFill} mapStyle={darkSolarpunkStyle as any} logoEnabled={false} attributionEnabled={false} compassEnabled>
                <MapLibreGL.Camera ref={cameraRef} />

                <MapLibreGL.ShapeSource id='route-line-source' shape={routeLine as any}>
                    <MapLibreGL.LineLayer
                        id='route-line-layer'
                        style={{
                            lineColor: '#3b82f6',
                            lineWidth: 4,
                            lineOpacity: 0.9,
                            lineCap: 'round',
                            lineJoin: 'round',
                        }}
                    />
                </MapLibreGL.ShapeSource>

                <MapLibreGL.ShapeSource
                    id='route-points-source'
                    shape={points as any}
                    cluster
                    clusterRadius={clusterRadius}
                    clusterMaxZoomLevel={14}
                    clusterProperties={{
                        pickupCount: [['+', ['accumulated'], ['case', ['==', ['get', 'role'], 'pickup'], 1, 0]], ['get', 'pickupCount']],
                        dropoffCount: [['+', ['accumulated'], ['case', ['==', ['get', 'role'], 'dropoff'], 1, 0]], ['get', 'dropoffCount']],
                    }}
                >
                    <MapLibreGL.CircleLayer
                        id='route-points-cluster-circle'
                        filter={['has', 'point_count']}
                        style={{
                            circleColor: '#22d3ee',
                            circleRadius: ['step', ['get', 'point_count'], 16, 15, 20, 30, 26],
                            circleOpacity: 0.85,
                            circleStrokeWidth: 2,
                            circleStrokeColor: '#0f172a',
                        }}
                    />
                    <MapLibreGL.SymbolLayer
                        id='route-points-cluster-count'
                        filter={['has', 'point_count']}
                        style={{
                            textField: ['get', 'point_count_abbreviated'],
                            textSize: 12,
                            textColor: '#0b1120',
                            textAllowOverlap: true,
                        }}
                    />
                    <MapLibreGL.SymbolLayer
                        id='route-points-symbol'
                        filter={['!', ['has', 'point_count']]}
                        style={{
                            iconImage: ['get', 'icon'],
                            iconSize: 0.75,
                            iconAllowOverlap: true,
                            iconIgnorePlacement: true,
                        }}
                    />
                </MapLibreGL.ShapeSource>

                {driverAssigned && <DriverMarker driver={driverAssigned} onMovement={onDriverMovement} />}

                {driverPoint && (
                    <MapLibreGL.ShapeSource
                        id='driver-track-source'
                        shape={{
                            type: 'FeatureCollection',
                            features: [
                                { type: 'Feature', properties: { icon: spriteIcons.driver }, geometry: { type: 'Point', coordinates: driverPoint } },
                            ],
                        } as any}
                    >
                        <MapLibreGL.SymbolLayer
                            id='driver-track-symbol'
                            style={{ iconImage: ['get', 'icon'], iconSize: 0.8, iconAllowOverlap: true, iconIgnorePlacement: true }}
                        />
                    </MapLibreGL.ShapeSource>
                )}

                {children}
            </MapLibreGL.MapView>
        </YStack>
    );
};

export default LiveOrderRoute;
