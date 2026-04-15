import React, { useEffect } from 'react';
import { Button, Text, YStack } from 'tamagui';
import { trackOnboardingEvent } from '../../services/onboarding';
import { buildLocationConsent, LocationConsentSettings } from '../../utils/location-consent';
import { saveLocationConsentSettings } from '../../utils/location-consent-storage';

const mapActionToConsentSettings = (action: 'granted' | 'declined' | 'skipped'): LocationConsentSettings => {
    if (action === 'granted') {
        return buildLocationConsent(true, 'precise');
    }

    return buildLocationConsent(false, 'off');
};

const ConsentOnboardingScreen = ({ navigation, route }) => {
    useEffect(() => {
        trackOnboardingEvent('onboarding_step_viewed', { step: 'Consent' });
    }, []);

    const continueWithConsent = (status: 'granted' | 'declined' | 'skipped') => {
        const consentSettings = mapActionToConsentSettings(status);
        saveLocationConsentSettings(consentSettings);
        trackOnboardingEvent(status === 'granted' ? 'consent_granted' : 'consent_declined', { status });
        trackOnboardingEvent('onboarding_step_completed', { step: 'Consent', status, consentSettings });
        navigation.navigate('SuggestedCommunities', {
            payload: {
                ...(route?.params?.payload ?? {}),
                consent: {
                    location: status,
                    locationSettings: consentSettings,
                },
            },
        });
    };

    return (
        <YStack flex={1} px='$5' py='$5' space='$3'>
            <Text fontWeight='700'>Location Consent</Text>
            <Text color='$textSecondary'>Share your location to discover nearby communities and map activity.</Text>
            <Button onPress={() => continueWithConsent('granted')}>Allow Location</Button>
            <Button variant='outlined' onPress={() => continueWithConsent('declined')}>
                Decline
            </Button>
            <Button chromeless onPress={() => continueWithConsent('skipped')}>
                Skip for now
            </Button>
        </YStack>
    );
};

export default ConsentOnboardingScreen;
