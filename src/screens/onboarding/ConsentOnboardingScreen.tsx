import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Text, YStack } from 'tamagui';
import { LOCATION_CONSENT_STORAGE_KEY, trackOnboardingEvent } from '../../services/onboarding';

const ConsentOnboardingScreen = ({ navigation, route }) => {
    useEffect(() => {
        trackOnboardingEvent('onboarding_step_viewed', { step: 'Consent' });
    }, []);

    const continueWithConsent = async (status: 'granted' | 'declined' | 'skipped') => {
        await AsyncStorage.setItem(LOCATION_CONSENT_STORAGE_KEY, status);
        trackOnboardingEvent(status === 'granted' ? 'consent_granted' : 'consent_declined', { status });
        trackOnboardingEvent('onboarding_step_completed', { step: 'Consent', status });
        navigation.navigate('SuggestedCommunities', { payload: { ...(route?.params?.payload ?? {}), consent: { location: status } } });
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
