import { filterVisibleFeedItems } from '../packages/ui/src/components/vertical-feed-utils';

describe('feed visibility filtering', () => {
    test('filters blocked and high-report items', () => {
        const items = [
            { id: '1', visibility: 'public', reportCount: 0 },
            { id: '2', visibility: 'blocked', reportCount: 0 },
            { id: '3', visibility: 'public', reportCount: 8 },
            { id: '4', visibility: 'private', reportCount: 1 },
        ];

        const visible = filterVisibleFeedItems(items, { hideReportedThreshold: 5 });
        expect(visible.map((item) => item.id)).toEqual(['1', '4']);
    });
});
