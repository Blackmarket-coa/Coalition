import React, { useMemo } from 'react';
import { Alert } from 'react-native';
import { VerticalVideoFeed } from '@blackstar/ui';
import { useChat } from '../contexts/ChatContext';
import { useLanguage } from '../contexts/LanguageContext';
import useLocationConsent from '../hooks/use-location-consent';
import { executeEcosystemAction, EcosystemAction } from '../services/action-router';

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

    const ctaToAction = (module: 'shop' | 'jobs' | 'aid' | 'governance'): EcosystemAction => {
        if (module === 'shop') return { type: 'SHOP_ITEM' };
        if (module === 'jobs') return { type: 'APPLY_JOB', payload: { jobId: 'job_101', providerId: 'provider_demo' } };
        if (module === 'aid') return { type: 'REQUEST_AID' };
        return { type: 'OPEN_PROPOSAL' };
    };

    return (
        <VerticalVideoFeed
            requestParams={requestParams}
            onMissingRoom={() => Alert.alert('Room unavailable', 'Comments are unavailable for this video right now.')}
            onOpenCta={async (module) => {
                const result = await executeEcosystemAction(ctaToAction(module), {
                    navigate: navigation.navigate,
                    onUnhandled: (_action, reason) => Alert.alert('Action unavailable', reason),
                });

                if (!result.ok) {
                    Alert.alert('Action unavailable', 'This ecosystem action is not available right now.');
                }
            }}
        />
    );
};

export default SocialFeedScreen;
