import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Text, YStack } from 'tamagui';
import TestScreen from './TestScreen';
import { LOCATION_CONSENT_STORAGE_KEY, shouldShowMapFallback } from '../services/onboarding';

const ExploreMapScreen = ({ navigation }) => {
    const [showFallback, setShowFallback] = useState(false);

    useEffect(() => {
        const loadConsent = async () => {
            const consent = await AsyncStorage.getItem(LOCATION_CONSENT_STORAGE_KEY);
            setShowFallback(shouldShowMapFallback(consent));
        };

        loadConsent();
    }, []);

    if (!showFallback) {
        return <TestScreen navigation={navigation} />;
    }

    return (
        <YStack flex={1} justifyContent='center' px='$5' space='$3'>
            <Text fontSize={20} fontWeight='700'>
                Map preview unavailable
            </Text>
            <Text color='$textSecondary'>Location sharing was skipped. You can still browse communities and enable location later in settings.</Text>
            <Button onPress={() => navigation.navigate('You')}>Go to Profile</Button>
        </YStack>
    );
};

export default ExploreMapScreen;
