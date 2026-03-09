import React, { useEffect, useMemo } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';
import { useAuth } from '../contexts/AuthContext';
import { useMatrix } from '../contexts/MatrixContext';
import useLocationConsent from '../hooks/use-location-consent';
import useStorage from '../hooks/use-storage';
import { loadOnboardingPayload } from '../services/onboarding';
import { executeEcosystemAction } from '../services/action-router';
import { createHomeRecommendations } from '../services/home-recommendations';
import { buildFunnelDashboardPayload, trackConversionEvent } from '../services/conversion-analytics';
import { shouldShowNearbyRail } from '../services/discovery-utils';

const RECENT_BEHAVIOR_KEY = 'coalition_recent_behavior';

const nearbyRail = [
    { id: 'person-1', type: 'person', name: 'Maya R.', subtitle: '0.8 mi · Mutual Aid' },
    { id: 'group-1', type: 'group', name: 'Downtown Garden Circle', subtitle: '1.2 mi · Community Garden' },
    { id: 'person-2', type: 'person', name: 'Luis T.', subtitle: '1.7 mi · Logistics' },
];

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


    useEffect(() => {
        trackConversionEvent('discovery_viewed', { screen: 'home' });
        const payload = buildFunnelDashboardPayload(String(driver?.id ?? 'anon'), 'session-home', [
            { step: 'home_viewed', ts: new Date().toISOString(), status: 'viewed' },
        ]);
        console.log('[funnel]', payload);
    }, [driver]);

    const trackRecentBehavior = (entry: string) => {
        const next = [entry, ...(recentBehavior ?? [])].slice(0, 20);
        setRecentBehavior(next);
    };

    const showNearbyRail = shouldShowNearbyRail(locationConsent);

    return (
        <YStack flex={1} p='$5' space='$3'>
            <Text fontSize='$8' fontWeight='700'>
                Recommended next actions
            </Text>

            {showNearbyRail ? (
                <YStack>
                    <Text fontSize='$6' fontWeight='700' mb='$2'>
                        Nearby people & groups
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <XStack gap='$2'>
                            {nearbyRail.map((entry) => (
                                <YStack key={entry.id} width={220} borderWidth={1} borderColor='$borderColorWithShadow' borderRadius='$4' p='$3'>
                                    <Text fontWeight='700'>{entry.name}</Text>
                                    <Text color='$textSecondary'>{entry.subtitle}</Text>
                                    <Button
                                        mt='$2'
                                        size='$3'
                                        onPress={() => {
                                            trackConversionEvent('home_nearby_visible', { target: entry.id, targetType: entry.type });
                                            navigation.navigate('Messages', { screen: 'ChatHome' });
                                        }}
                                    >
                                        Connect
                                    </Button>
                                </YStack>
                            ))}
                        </XStack>
                    </ScrollView>
                </YStack>
            ) : null}

            {recommendations.map((recommendation) => (
                <YStack key={recommendation.id} borderWidth={1} borderColor='$borderColorWithShadow' p='$3' borderRadius='$4' space='$2'>
                    <Text fontWeight='700'>{recommendation.title}</Text>
                    <Text color='$textSecondary'>{recommendation.reason}</Text>
                    <Button
                        onPress={async () => {
                            trackConversionEvent('take_action_clicked', { source: 'home_recommendation', action: recommendation.action.type });
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
