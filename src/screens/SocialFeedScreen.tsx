import React, { useMemo } from 'react';
import { Alert } from 'react-native';
import { VerticalVideoFeed } from '@blackstar/ui';
import { useChat } from '../contexts/ChatContext';
import { useLanguage } from '../contexts/LanguageContext';
import useLocationConsent from '../hooks/use-location-consent';

const SocialFeedScreen = ({ navigation }) => {
    const { channels } = useChat();
    const { locale } = useLanguage();
    const { locationConsent } = useLocationConsent();

    const requestParams = useMemo(
        () => ({
            interests: ['Mutual Aid', 'Community Safety'],
            consented_location_precision: locationConsent.granted ? locationConsent.precision : 'none',
            joined_rooms: (channels ?? []).map((channel) => channel.id).filter(Boolean),
            language: locale ?? 'en',
        }),
        [channels, locale, locationConsent]
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
