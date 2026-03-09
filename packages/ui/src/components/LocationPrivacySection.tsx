import React from 'react';
import { Button, Paragraph, Text, YStack } from 'tamagui';
import { useLocationConsentContext } from '@blackstar/core/src/contexts/LocationConsentContext';

export const LocationPrivacySection = () => {
    const { consentStatus, revokeConsent, isLocationAvailable } = useLocationConsentContext();

    return (
        <YStack gap='$2' p='$3' borderWidth={1} borderColor='$borderColor' borderRadius='$4'>
            <Text fontSize={18} fontWeight='700'>
                Privacy
            </Text>
            <Paragraph color='$color11'>Revoke location sharing at any time. This immediately hides your shared seller location.</Paragraph>
            <Text>Status: {consentStatus}</Text>
            <Button onPress={revokeConsent} disabled={!isLocationAvailable} theme='red'>
                Revoke Location Consent
            </Button>
        </YStack>
    );
};

export default LocationPrivacySection;
