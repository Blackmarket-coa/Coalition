import React, { useMemo } from 'react';
import { Alert } from 'react-native';
import { Button, Text, YStack } from 'tamagui';
import { useAuth } from '../contexts/AuthContext';
import { useMatrix } from '../contexts/MatrixContext';
import useLocationConsent from '../hooks/use-location-consent';
import useStorage from '../hooks/use-storage';
import { loadOnboardingPayload } from '../services/onboarding';
import { executeEcosystemAction } from '../services/action-router';
import { createHomeRecommendations } from '../services/home-recommendations';

const RECENT_BEHAVIOR_KEY = 'coalition_recent_behavior';

const HomeRecommendationsScreen = ({ navigation }) => {
    const { driver } = useAuth();
    const { joinRoom } = useMatrix();
    const { locationConsent } = useLocationConsent();
    const [recentBehavior, setRecentBehavior] = useStorage<string[]>(`${driver?.id ?? 'anon'}_${RECENT_BEHAVIOR_KEY}`, []);

    const onboardingPayload = useMemo(() => loadOnboardingPayload(String(driver?.id ?? 'anon')) ?? {}, [driver]);
    const recommendations = useMemo(
        () =>
            createHomeRecommendations({
                interests: onboardingPayload.interests ?? [],
                consentedLocationPrecision: locationConsent.precision,
                recentBehavior: recentBehavior ?? [],
            }),
        [onboardingPayload, locationConsent, recentBehavior]
    );

    const trackRecentBehavior = (entry: string) => {
        const next = [entry, ...(recentBehavior ?? [])].slice(0, 20);
        setRecentBehavior(next);
    };

    return (
        <YStack flex={1} p='$5' space='$3'>
            <Text fontSize='$8' fontWeight='700'>
                Recommended next actions
            </Text>
            {recommendations.map((recommendation) => (
                <YStack key={recommendation.id} borderWidth={1} borderColor='$borderColorWithShadow' p='$3' borderRadius='$4' space='$2'>
                    <Text fontWeight='700'>{recommendation.title}</Text>
                    <Text color='$textSecondary'>{recommendation.reason}</Text>
                    <Button
                        onPress={async () => {
                            const result = await executeEcosystemAction(recommendation.action, {
                                navigate: navigation.navigate,
                                joinRoom,
                                trackRecentBehavior,
                                onUnhandled: (_action, reason) => Alert.alert('Action unavailable', reason),
                            });

                            if (!result.ok) {
                                Alert.alert('Action unavailable', 'This action is not available yet.');
                            }
                        }}
                    >
                        Open
                    </Button>
                </YStack>
            ))}
        </YStack>
    );
};

export default HomeRecommendationsScreen;
