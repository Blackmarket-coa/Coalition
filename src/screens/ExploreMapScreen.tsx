import React, { useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';
import TestScreen from './TestScreen';
import useLocationConsent from '../hooks/use-location-consent';

const layers = ['marketplace', 'jobs', 'mutual aid', 'governance', 'infrastructure'];

const ExploreMapScreen = ({ navigation }) => {
    const { locationConsent } = useLocationConsent();
    const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
        marketplace: true,
        jobs: true,
        'mutual aid': true,
        governance: true,
        infrastructure: true,
    });
    const showFallback = locationConsent.precision === 'off' || !locationConsent.granted;

    return (
        <YStack flex={1}>
            <YStack px='$4' py='$3' space='$2'>
                <Text fontWeight='700'>Explore Layers</Text>
                <XStack flexWrap='wrap' gap='$2'>
                    {layers.map((layer) => (
                        <Button key={layer} size='$3' variant={activeLayers[layer] ? undefined : 'outlined'} onPress={() => setActiveLayers((current) => ({ ...current, [layer]: !current[layer] }))}>
                            {layer}
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
