import { buildFunnelDashboardPayload } from '../src/services/conversion-analytics';
import { logErrorCategory } from '../src/services/error-logging';

describe('dashboard payloads and logging hooks', () => {
    test('builds funnel dashboard payload format', () => {
        const payload = buildFunnelDashboardPayload('user_1', 'session_1', [{ step: 'home_viewed', ts: '2026-01-01T00:00:00.000Z', status: 'viewed' }]);
        expect(payload.funnel_id).toBe('coalition_social_discovery_v1');
        expect(payload.steps.length).toBe(1);
    });

    test('returns categorized error payload', () => {
        const errorPayload = logErrorCategory('feed_load_error', 'Unable to fetch feed', { requestId: 'abc' });
        expect(errorPayload.category).toBe('feed_load_error');
        expect(errorPayload.dashboard).toBe('coalition_errors_v1');
    });
});
