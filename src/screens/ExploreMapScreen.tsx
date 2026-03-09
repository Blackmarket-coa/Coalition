import React from 'react';
import { Button, Text, YStack } from 'tamagui';
import TestScreen from './TestScreen';
import useLocationConsent from '../hooks/use-location-consent';

const ExploreMapScreen = ({ navigation }) => {
    const { locationConsent } = useLocationConsent();
    const showFallback = locationConsent.precision === 'off' || !locationConsent.granted;

    if (!showFallback) {
        return <TestScreen navigation={navigation} />;
    }

    return (
        <YStack flex={1} justifyContent='center' px='$5' space='$3'>
            <Text fontSize={20} fontWeight='700'>
                Nearby map is limited
            </Text>
            <Text color='$textSecondary'>
                Location is currently off. Explore still works for global content, and you can enable approximate location in Privacy Settings anytime.
            </Text>
            <Button onPress={() => navigation.navigate('You', { screen: 'PrivacySettings' })}>Open Privacy Settings</Button>
        </YStack>
    );
};

export default ExploreMapScreen;
