import React, { useEffect, useState } from 'react';
import { Button, Text, YStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { persistOnboardingPayload, syncOnboardingPayload, trackOnboardingEvent } from '../../services/onboarding';

const suggestedRooms = ['#mutual-aid:matrix.org', '#coalition-general:matrix.org', '#blackstar-jobs:matrix.org'];

const SuggestedCommunitiesOnboardingScreen = ({ navigation, route }) => {
    const { driver } = useAuth();
    const [joined, setJoined] = useState<string[]>([]);
    const payload = route?.params?.payload ?? {};

    useEffect(() => {
        trackOnboardingEvent('onboarding_step_viewed', { step: 'SuggestedCommunities' });
    }, []);

    const finishOnboarding = async () => {
        const completedPayload = {
            ...payload,
            suggestedCommunities: joined,
            completedAt: new Date().toISOString(),
        };
        const userId = String(driver?.id ?? 'anon');

        await persistOnboardingPayload(userId, completedPayload);
        try {
            await syncOnboardingPayload(completedPayload);
        } catch (error) {
            console.warn('Onboarding sync failed, local persistence preserved.', error);
        }

        trackOnboardingEvent('onboarding_step_completed', { step: 'SuggestedCommunities' });
        navigation.navigate('CoalitionNavigator');
    };

    return (
        <YStack flex={1} px='$5' py='$5' space='$3'>
            <Text fontWeight='700'>Suggested Communities</Text>
            {suggestedRooms.map((room) => {
                const isJoined = joined.includes(room);
                return (
                    <Button
                        key={room}
                        variant={isJoined ? undefined : 'outlined'}
                        onPress={() => {
                            const next = isJoined ? joined.filter((id) => id !== room) : [...joined, room];
                            setJoined(next);
                            if (!isJoined) {
                                trackOnboardingEvent('suggested_room_joined', { room });
                            }
                        }}
                    >
                        {isJoined ? 'Joined' : 'Join'} {room}
                    </Button>
                );
            })}
            <Button mt='$4' onPress={finishOnboarding}>
                Finish
            </Button>
        </YStack>
    );
};

export default SuggestedCommunitiesOnboardingScreen;
