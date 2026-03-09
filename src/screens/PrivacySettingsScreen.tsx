import React from 'react';
import { Button, Text, YStack } from 'tamagui';
import useLocationConsent from '../hooks/use-location-consent';
import { transitionLocationConsent } from '../utils/location-consent';

const PrivacySettingsScreen = () => {
    const { locationConsent, setLocationConsent } = useLocationConsent();

    return (
        <YStack flex={1} p='$5' space='$3'>
            <Text fontSize='$8' fontWeight='700'>
                Privacy Settings
            </Text>
            <Text color='$textSecondary'>
                Control how location is shared for nearby Explore content, map layers, and local modules.
            </Text>

            <YStack borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' p='$3' space='$2'>
                <Text>Current access: {locationConsent.precision}</Text>
                <Text color='$textSecondary'>Last updated: {locationConsent.updatedAt}</Text>
                <Text color='$textSecondary'>Policy text ID: {locationConsent.policyTextId}</Text>
            </YStack>

            <Button onPress={() => setLocationConsent(transitionLocationConsent(locationConsent, { granted: true, precision: 'approximate' }))}>Use Approximate Location</Button>
            <Button variant='outlined' onPress={() => setLocationConsent(transitionLocationConsent(locationConsent, { granted: true, precision: 'precise' }))}>
                Use Precise Location
            </Button>
            <Button variant='ghost' onPress={() => setLocationConsent(transitionLocationConsent(locationConsent, { granted: false, precision: 'off' }))}>
                Turn Location Off
            </Button>
        </YStack>
    );
};

export default PrivacySettingsScreen;
