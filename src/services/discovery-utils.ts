import { isCoalitionFeedRankingEnabled } from './feature-flags';

export function shouldShowNearbyRail(locationConsent) {
    return Boolean(locationConsent?.granted) && locationConsent?.precision !== 'off';
}

export function shouldShowExploreFallback(locationConsent) {
    return !locationConsent?.granted || locationConsent?.precision === 'off';
}

export function buildFeedRankingParams(baseParams = {}) {
    if (!isCoalitionFeedRankingEnabled()) {
        return baseParams;
    }

    return {
        ...baseParams,
        ranking_model: 'coalition_social_v1',
    };
}
