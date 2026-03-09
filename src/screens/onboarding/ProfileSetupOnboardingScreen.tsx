import React, { useEffect, useState } from 'react';
import { Button, Input, Text, YStack } from 'tamagui';
import { trackOnboardingEvent } from '../../services/onboarding';

const ProfileSetupOnboardingScreen = ({ navigation, route }) => {
    const initial = route?.params?.payload?.profile ?? {};
    const [displayName, setDisplayName] = useState(initial.displayName ?? '');
    const [bio, setBio] = useState(initial.bio ?? '');

    useEffect(() => {
        trackOnboardingEvent('onboarding_step_viewed', { step: 'ProfileSetup' });
    }, []);

    return (
        <YStack flex={1} px='$5' py='$6' space='$4'>
            <Text>Display Name</Text>
            <Input value={displayName} onChangeText={setDisplayName} placeholder='Your name' />
            <Text>Bio</Text>
            <Input value={bio} onChangeText={setBio} placeholder='What are you here for?' />
            <Button
                mt='$4'
                onPress={() => {
                    trackOnboardingEvent('onboarding_step_completed', { step: 'ProfileSetup' });
                    navigation.navigate('InterestPicker', { payload: { ...(route?.params?.payload ?? {}), profile: { displayName, bio } } });
                }}
            >
                Continue
            </Button>
        </YStack>
    );
};

export default ProfileSetupOnboardingScreen;
