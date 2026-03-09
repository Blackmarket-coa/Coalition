import React, { useEffect, useMemo, useState } from 'react';
import { Button, Text, XStack, YStack } from 'tamagui';
import { seedInterests, trackOnboardingEvent } from '../../services/onboarding';

const InterestPickerOnboardingScreen = ({ navigation, route }) => {
    const [selected, setSelected] = useState<string[]>(route?.params?.payload?.interests ?? []);

    useEffect(() => {
        trackOnboardingEvent('onboarding_step_viewed', { step: 'InterestPicker' });
    }, []);

    const chips = useMemo(() => seedInterests, []);

    const toggleInterest = (interest: string) => {
        const next = selected.includes(interest) ? selected.filter((value) => value !== interest) : [...selected, interest];
        setSelected(next);
        trackOnboardingEvent('interest_selected', { interest, selected: !selected.includes(interest) });
    };

    return (
        <YStack flex={1} px='$5' py='$5' space='$4'>
            <Text>Select interests (multi-select)</Text>
            <XStack flexWrap='wrap' gap='$2'>
                {chips.map((interest) => {
                    const active = selected.includes(interest);
                    return (
                        <Button key={interest} size='$3' theme={active ? 'blue' : null} variant={active ? undefined : 'outlined'} onPress={() => toggleInterest(interest)}>
                            {interest}
                        </Button>
                    );
                })}
            </XStack>
            <Button
                mt='auto'
                onPress={() => {
                    trackOnboardingEvent('onboarding_step_completed', { step: 'InterestPicker', count: selected.length });
                    navigation.navigate('EcosystemIntent', { payload: { ...(route?.params?.payload ?? {}), interests: selected } });
                }}
            >
                Continue
            </Button>
        </YStack>
    );
};

export default InterestPickerOnboardingScreen;
