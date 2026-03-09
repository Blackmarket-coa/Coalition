import React, { useMemo } from 'react';
import { Alert } from 'react-native';
import { VerticalVideoFeed } from '@blackstar/ui';
import { useChat } from '../contexts/ChatContext';
import { useLanguage } from '../contexts/LanguageContext';
import useStorage from '../hooks/use-storage';
import { LOCATION_CONSENT_STORAGE_KEY } from '../services/onboarding';

const SocialFeedScreen = ({ navigation }) => {
    const { channels } = useChat();
    const { locale } = useLanguage();
    const [consentStatus] = useStorage<string>(LOCATION_CONSENT_STORAGE_KEY, 'unknown');

    const requestParams = useMemo(
        () => ({
            interests: ['Mutual Aid', 'Community Safety'],
            consented_location_precision: consentStatus === 'granted' ? 'city' : 'none',
            joined_rooms: (channels ?? []).map((channel) => channel.id).filter(Boolean),
            language: locale ?? 'en',
        }),
        [channels, locale, consentStatus]
    );

    return (
        <VerticalVideoFeed
            requestParams={requestParams}
            onMissingRoom={() => Alert.alert('Room unavailable', 'Comments are unavailable for this video right now.')}
            onOpenCta={(module) => {
                if (module === 'shop') {
                    navigation.navigate('PostTab');
                    return;
                }

                if (module === 'jobs') {
                    navigation.navigate('Home');
                    return;
                }

                if (module === 'aid') {
                    navigation.navigate('Explore');
                    return;
                }

                navigation.navigate('Messages');
            }}
        />
    );
};

export default SocialFeedScreen;
