import React, { useEffect, useState } from 'react';
import { Button, Text, YStack } from 'tamagui';
import { mapGoalsToEcosystemActions, trackOnboardingEvent } from '../../services/onboarding';

const goals = ['buy', 'sell', 'find work', 'provide service', 'discuss', 'organize', 'vote'];

const EcosystemIntentOnboardingScreen = ({ navigation, route }) => {
    const [selectedGoals, setSelectedGoals] = useState<string[]>(route?.params?.payload?.ecosystemGoals ?? []);

    useEffect(() => {
        trackOnboardingEvent('onboarding_step_viewed', { step: 'EcosystemIntent' });
    }, []);

    return (
        <YStack flex={1} px='$5' py='$5' space='$3'>
            <Text>What do you want to do first?</Text>
            {goals.map((goal) => {
                const active = selectedGoals.includes(goal);
                return (
                    <Button
                        key={goal}
                        variant={active ? undefined : 'outlined'}
                        onPress={() => setSelectedGoals(active ? selectedGoals.filter((item) => item !== goal) : [...selectedGoals, goal])}
                    >
                        {goal}
                    </Button>
                );
            })}
            <Button
                mt='$3'
                onPress={() => {
                    const ecosystemActions = mapGoalsToEcosystemActions(selectedGoals);
                    trackOnboardingEvent('onboarding_step_completed', { step: 'EcosystemIntent', ecosystemActions });
                    navigation.navigate('Consent', {
                        payload: { ...(route?.params?.payload ?? {}), ecosystemGoals: selectedGoals, ecosystemActions },
                    });
                }}
            >
                Continue
            </Button>
        </YStack>
    );
};

export default EcosystemIntentOnboardingScreen;
