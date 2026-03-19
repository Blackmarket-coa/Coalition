import React, { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

const passthrough = (name: string) => {
    const Component = forwardRef<any, React.PropsWithChildren<Record<string, unknown>>>(({ children, ...props }, ref) => {
        useImperativeHandle(ref, () => ({
            setCamera: () => {},
            flyTo: () => {},
            fitBounds: () => {},
            zoomTo: () => {},
        }));

        return (
            <View accessibilityLabel={name} {...props}>
                {children}
            </View>
        );
    });

    Component.displayName = `MapLibreStub${name}`;
    return Component;
};

const MapLibreGL = {
    MapView: passthrough('MapView'),
    Camera: passthrough('Camera'),
    ShapeSource: passthrough('ShapeSource'),
    SymbolLayer: passthrough('SymbolLayer'),
    CircleLayer: passthrough('CircleLayer'),
    LineLayer: passthrough('LineLayer'),
    UserLocation: passthrough('UserLocation'),
};

export default MapLibreGL;
