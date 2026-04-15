import React, { useMemo } from 'react';
import { Alert } from 'react-native';
import { VerticalVideoFeed } from '@blackstar/ui';
import { useChat } from '../contexts/ChatContext';
import { useLanguage } from '../contexts/LanguageContext';
import useLocationConsent from '../hooks/use-location-consent';
import { executeEcosystemAction, EcosystemAction } from '../services/action-router';
import { trackConversionEvent } from '../services/conversion-analytics';
import { buildFeedRankingParams, getFeedInterestsFromOnboarding, resolveFeedItemAction } from '../services/discovery-utils';
import { logErrorCategory } from '../services/error-logging';
import { createFeedPerformanceSample } from '../services/feed-performance';
import { useAuth } from '../contexts/AuthContext';
import { loadOnboardingPayload } from '../services/onboarding';

const toFiniteNumber = (value) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const buildRankingSignalParams = (onboardingPayload) => {
    const persistedRatings = onboardingPayload?.ratings ?? onboardingPayload?.feed_ratings ?? {};
    const userRatings = persistedRatings?.user ?? onboardingPayload?.user_ratings ?? {};
    const communityRatings = persistedRatings?.community ?? onboardingPayload?.community_ratings ?? {};

    return {
        importance_score: toFiniteNumber(userRatings?.importance_score ?? userRatings?.importance ?? onboardingPayload?.importance_score),
        social_impact_score: toFiniteNumber(
            communityRatings?.social_impact_score ??
                communityRatings?.impact_score ??
                communityRatings?.social_impact ??
                onboardingPayload?.social_impact_score
        ),
        ranking_confidence: toFiniteNumber(
            userRatings?.confidence ?? communityRatings?.confidence ?? persistedRatings?.confidence ?? onboardingPayload?.ranking_confidence
        ),
        ratings_count: toFiniteNumber(userRatings?.count ?? persistedRatings?.ratings_count ?? onboardingPayload?.ratings_count),
        community_ratings_count: toFiniteNumber(
            communityRatings?.count ?? persistedRatings?.community_ratings_count ?? onboardingPayload?.community_ratings_count
        ),
    };
};

const SocialFeedScreen = ({ navigation }) => {
    const { channels } = useChat();
    const { locale } = useLanguage();
    const { locationConsent } = useLocationConsent();
    const { driver } = useAuth();

    const onboardingPayload = useMemo(() => loadOnboardingPayload(String(driver?.id ?? 'anon')) ?? {}, [driver]);
    const rankingSignalParams = useMemo(() => buildRankingSignalParams(onboardingPayload), [onboardingPayload]);

    const requestParams = useMemo(
        () =>
            buildFeedRankingParams({
                interests: getFeedInterestsFromOnboarding(onboardingPayload),
                consented_location_precision: locationConsent.granted ? locationConsent.precision : 'none',
                joined_rooms: (channels ?? []).map((channel) => channel.id).filter(Boolean),
                language: locale ?? 'en',
            }, rankingSignalParams),
        [channels, locale, locationConsent, onboardingPayload, rankingSignalParams]
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
            onErrorCategory={(message, context) => logErrorCategory('feed_load_error', message, context)}
            onPerformanceSample={(sample) => {
                const check = createFeedPerformanceSample(sample.mediaStartLatencyMs, sample.scrollFrameDrops);
                if (check.warning) {
                    logErrorCategory('feed_load_error', 'Feed performance warning', check);
                }
            }}
            onReport={(item) => {
                trackConversionEvent('abuse_report_submitted', { feed_item_id: item.id, room_id: item.roomId });
                Alert.alert('Report submitted', 'Thanks for helping keep Coalition safe.');
            }}
            onTakeAction={async (item) => {
                const action = resolveFeedItemAction(item);
                trackConversionEvent('take_action_clicked', { source: 'feed_item', feed_item_id: item.id, room_id: item.roomId, action: action.type });
                const result = await executeEcosystemAction(action, {
                    navigate: navigation.navigate,
                    onUnhandled: (_action, reason) => Alert.alert('Action unavailable', reason),
                });
                if (!result.ok) {
                    Alert.alert('Action unavailable', 'Unable to open action for this post.');
                }
            }}
            onOpenCta={async (module) => {
                trackConversionEvent('take_action_clicked', { source: 'feed_cta', module });
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
