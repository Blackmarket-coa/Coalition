import React, { useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import TrackingMarker from './TrackingMarker';
import useSocketClusterClient from '@blackstar/core/src/hooks/use-socket-cluster-client';
import useEventBuffer from '@blackstar/core/src/hooks/use-event-buffer';
import { getCoordinates } from '@blackstar/core/src/utils/location';
import { spriteIcons } from '../maps/style';

const VehicleMarker = ({ vehicle, onPositionChange, onHeadingChange, onMovement, ...props }) => {
    const markerRef = useRef<any>();
    const listenerRef = useRef<any>();

    const handleEvent = useCallback((data) => {
        let movementData: any = { data };

        if (data.location && data.location.coordinates) {
            const [latitude, longitude] = data.location.coordinates;
            markerRef.current?.move(latitude, longitude);

            if (typeof onPositionChange === 'function') {
                onPositionChange({ latitude, longitude });
            }

            movementData = { ...movementData, coordinates: { latitude, longitude } };
        }

        if (typeof data.heading === 'number') {
            markerRef.current?.rotate(data.heading);

            if (typeof onHeadingChange === 'function') {
                onHeadingChange(data.heading);
            }

            movementData = { ...movementData, heading: data.heading };
        }

        if (typeof onMovement === 'function') {
            onMovement(movementData);
        }
    }, [onHeadingChange, onMovement, onPositionChange]);

    const { listen } = useSocketClusterClient();
    const { addEvent, clearEvents } = useEventBuffer(handleEvent);

    useFocusEffect(
        useCallback(() => {
            const trackVehicleMovement = async () => {
                const listener = await listen(`vehicle.${vehicle.id}`, (event) => addEvent(event));
                if (listener) {
                    listenerRef.current = listener;
                }
            };

            trackVehicleMovement();

            return () => {
                listenerRef.current?.stop?.();
                clearEvents();
            };
        }, [listen, vehicle.id, addEvent, clearEvents])
    );

    const [latitude, longitude] = getCoordinates(vehicle);

    return <TrackingMarker ref={markerRef} id={`vehicle-${vehicle.id}`} coordinate={{ latitude, longitude }} iconImage={spriteIcons.vehicle} {...props} />;
};

export default VehicleMarker;
