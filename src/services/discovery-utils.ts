import { isCoalitionFeedRankingEnabled } from './feature-flags';
import { EcosystemAction } from './action-router';

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
a
export function getFeedInterestsFromOnboarding(onboardingPayload, fallback = ['Mutual Aid', 'Community Safety']) {
    const interests = onboardingPayload?.interests;
    if (Array.isArray(interests) && interests.length > 0) {
        return interests;
    }

    return fallback;
}

export function resolveFeedItemAction(item): EcosystemAction {
    if (item?.actionHint) {
        if (item.actionHint === 'APPLY_JOB') {
            return { type: 'APPLY_JOB', payload: { jobId: item.id, providerId: 'provider_demo' } };
        }

        if (item.actionHint === 'REQUEST_AID') {
            return { type: 'REQUEST_AID', payload: { aidType: 'mutual-aid' } };
        }

        if (item.actionHint === 'SHOP_ITEM' || item.actionHint === 'POST_OFFERING') {
            return { type: 'SHOP_ITEM', payload: { itemId: item.id } };
        }

        if (item.actionHint === 'JOIN_ROOM') {
            return { type: 'JOIN_ROOM', payload: { roomId: item.roomId } };
        }

        return { type: 'OPEN_PROPOSAL', payload: { proposalId: item.id } };
    }

    const text = `${item?.caption ?? ''} ${item?.creatorHandle ?? ''}`.toLowerCase();
    if (text.includes('job') || text.includes('work') || text.includes('gig')) {
        return { type: 'APPLY_JOB', payload: { jobId: item.id, providerId: 'provider_demo' } };
    }
    if (text.includes('aid') || text.includes('mutual')) {
        return { type: 'REQUEST_AID', payload: { aidType: 'mutual-aid' } };
    }
    if (text.includes('shop') || text.includes('sell') || text.includes('market')) {
        return { type: 'SHOP_ITEM', payload: { itemId: item.id } };
    }
    if (item?.roomId) {
        return { type: 'JOIN_ROOM', payload: { roomId: item.roomId } };
    }

    return { type: 'OPEN_PROPOSAL', payload: { proposalId: item?.id } };
}
