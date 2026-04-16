import React, { useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';
import TestScreen from './TestScreen';
import useLocationConsent from '../hooks/use-location-consent';
import { shouldShowExploreFallback } from '../services/discovery-utils';
import { SPATIAL_LAYER_DEFINITIONS, type SpatialLayerKey } from '../services/spatial-taxonomy';

const layers = SPATIAL_LAYER_DEFINITIONS.map((definition) => ({ key: definition.key, label: definition.label }));
const defaultActiveLayers = layers.reduce<Record<SpatialLayerKey, boolean>>((state, layer) => {
    state[layer.key] = true;
    return state;
}, {} as Record<SpatialLayerKey, boolean>);

const ExploreMapScreen = ({ navigation }) => {
    const { locationConsent } = useLocationConsent();
    const [activeLayers, setActiveLayers] = useState<Record<SpatialLayerKey, boolean>>(defaultActiveLayers);
    const showFallback = shouldShowExploreFallback(locationConsent);

    return (
        <YStack flex={1}>
            <YStack px='$4' py='$3' space='$2'>
                <Text fontWeight='700'>Explore Layers</Text>
                <XStack flexWrap='wrap' gap='$2'>
                    {layers.map((layer) => (
                        <Button key={layer.key} size='$3' variant={activeLayers[layer.key] ? undefined : 'outlined'} onPress={() => setActiveLayers((current) => ({ ...current, [layer.key]: !current[layer.key] }))}>
                            {layer.label}
                        </Button>
                    ))}
                </XStack>
            </YStack>

            {showFallback ? (
                <YStack flex={1} justifyContent='center' px='$5' space='$3'>
                    <Text fontSize={20} fontWeight='700'>
                        Nearby map is limited
                    </Text>
                    <Text color='$textSecondary'>
                        Location is currently off. Explore still works for global content, and you can enable approximate location in Privacy Settings anytime.
                    </Text>
                    <Button onPress={() => navigation.navigate('You', { screen: 'PrivacySettings' })}>Open Privacy Settings</Button>
                </YStack>
            ) : (
                <TestScreen navigation={navigation} />
            )}
        </YStack>
    );
};

export default ExploreMapScreen;
