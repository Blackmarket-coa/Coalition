jest.mock('../src/services/feature-flags', () => ({
    isCoalitionFeedRankingEnabled: jest.fn(() => true),
}));

import { getFeedInterestsFromOnboarding, resolveFeedItemAction } from '../src/services/discovery-utils';

describe('social feed relevance and action resolution', () => {
    test('uses onboarding interests for feed request relevance', () => {
        const interests = getFeedInterestsFromOnboarding({ interests: ['Housing Support', 'Tool Libraries'] });
        expect(interests).toEqual(['Housing Support', 'Tool Libraries']);
    });

    test('falls back to defaults when onboarding interests missing', () => {
        const interests = getFeedInterestsFromOnboarding({});
        expect(interests).toEqual(['Mutual Aid', 'Community Safety']);
    });

    test('resolves contextual action from actionHint first', () => {
        const action = resolveFeedItemAction({ id: 'job_1', roomId: '!room:matrix.org', actionHint: 'APPLY_JOB', caption: 'something' });
        expect(action.type).toBe('APPLY_JOB');
    });

    test('resolves contextual action from content cues', () => {
        expect(resolveFeedItemAction({ id: '1', roomId: '!r', caption: 'new community jobs posted' }).type).toBe('APPLY_JOB');
        expect(resolveFeedItemAction({ id: '2', roomId: '!r', caption: 'mutual aid delivery needed' }).type).toBe('REQUEST_AID');
        expect(resolveFeedItemAction({ id: '3', roomId: '!r', caption: 'shop local maker goods' }).type).toBe('SHOP_ITEM');
        expect(resolveFeedItemAction({ id: '4', roomId: '!r', caption: 'general update' }).type).toBe('JOIN_ROOM');
    });
});
