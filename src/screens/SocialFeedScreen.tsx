import React, { useMemo, useRef } from 'react';
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
import { config } from '../utils';

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

const MIN_RATING = 1;
const MAX_RATING = 5;
const clampRating = (value) => Math.max(MIN_RATING, Math.min(MAX_RATING, Math.round(Number(value) || 0)));

const resolveGatewayConfig = () => {
    const host = String(config('BLACKSTAR_GATEWAY_HOST', '')).replace(/\/$/, '');
    const apiKey = config('BLACKSTAR_GATEWAY_KEY', '');
    return { host, apiKey };
};

const SocialFeedScreen = ({ navigation }) => {
    const { channels } = useChat();
    const { locale } = useLanguage();
    const { locationConsent } = useLocationConsent();
    const { driver } = useAuth();

    const onboardingPayload = useMemo(() => loadOnboardingPayload(String(driver?.id ?? 'anon')) ?? {}, [driver]);
    const rankingSignalParams = useMemo(() => buildRankingSignalParams(onboardingPayload), [onboardingPayload]);
    const ratingLifecycleId = useMemo(
        () => `rating:${String(driver?.id ?? 'anon')}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
        [driver?.id]
    );
    const ratingStateRef = useRef<Record<string, { value: number; updates: number }>>({});

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

    const persistRating = async (item, dimension: 'importance' | 'impact', rawRating: number) => {
        const boundedRating = clampRating(rawRating);
        const userId = String(driver?.id ?? 'anon');
        const ratingKey = `${userId}:${item.id}:${dimension}`;
        const state = ratingStateRef.current[ratingKey];

        // Abuse guard: one active rating per user/content/dimension lifecycle; update only when value changes.
        if (state?.value === boundedRating) {
            trackConversionEvent('feed_rating_ignored', { reason: 'duplicate_value', feed_item_id: item.id, dimension, value: boundedRating });
            return;
        }

        const updates = (state?.updates ?? 0) + 1;
        ratingStateRef.current[ratingKey] = { value: boundedRating, updates };

        const payload = {
            content_id: item.id,
            room_id: item.roomId,
            dimension,
            rating_value: boundedRating,
            user_id: userId,
            rating_key: ratingKey,
            lifecycle_id: ratingLifecycleId,
            update_index: updates,
            sent_at: new Date().toISOString(),
        };
        const { host, apiKey } = resolveGatewayConfig();

        if (!host) {
            trackConversionEvent('feed_rating_failed', { reason: 'gateway_unconfigured', feed_item_id: item.id, dimension, value: boundedRating });
            return;
        }

        const endpoints = ['/api/v1/feed/ratings', '/v1/feed/ratings'];
        let persisted = false;
        for (const path of endpoints) {
            try {
                const response = await fetch(`${host}${path}`, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                    },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    continue;
                }
                persisted = true;
                break;
            } catch (_error) {
                // Try the next endpoint variant.
            }
        }

        if (!persisted) {
            trackConversionEvent('feed_rating_failed', { reason: 'gateway_rejected', feed_item_id: item.id, dimension, value: boundedRating });
            return;
        }

        trackConversionEvent('feed_rating_submitted', {
            feed_item_id: item.id,
            room_id: item.roomId,
            dimension,
            value: boundedRating,
            lifecycle_id: ratingLifecycleId,
            update_index: updates,
        });
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
            onRateImportance={(item, rating) => {
                void persistRating(item, 'importance', rating);
            }}
            onRateImpact={(item, rating) => {
                void persistRating(item, 'impact', rating);
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
