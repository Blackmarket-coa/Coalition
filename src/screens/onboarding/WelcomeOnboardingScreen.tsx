import React, { useEffect } from 'react';
import { Button, Text, YStack } from 'tamagui';
import { trackOnboardingEvent } from '../../services/onboarding';

const WelcomeOnboardingScreen = ({ navigation, route }) => {
    useEffect(() => {
        trackOnboardingEvent('onboarding_step_viewed', { step: 'Welcome' });
    }, []);

    return (
        <YStack flex={1} px='$5' py='$6' justifyContent='center' space='$4'>
            <Text fontSize={28} fontWeight='700'>
                Welcome to Coalition
            </Text>
            <Text color='$textSecondary'>Build your social graph and discover communities tailored to your intent.</Text>
            <Button
                onPress={() => {
                    trackOnboardingEvent('onboarding_step_completed', { step: 'Welcome' });
                    navigation.navigate('ProfileSetup', { payload: { ...(route?.params?.payload ?? {}), welcomeSeen: true } });
                }}
            >
                Get Started
            </Button>
        </YStack>
    );
};

export default WelcomeOnboardingScreen;
