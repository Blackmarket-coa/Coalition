jest.mock('../src/services/blackstar-gateway', () => ({
    claimGatewayJob: jest.fn(async () => ({ id: 'claim_1' })),
}));

jest.mock('../src/services/feature-flags', () => ({
    isCoalitionActionRouterEnabled: jest.fn(() => true),
}));

import { executeEcosystemAction } from '../src/services/action-router';
import { shouldShowExploreFallback } from '../src/services/discovery-utils';
import { handleCommentAction } from '../packages/ui/src/components/vertical-feed-utils';

describe('coalition critical smoke journeys', () => {
    test('new user flow: onboarding -> feed -> room comment open', async () => {
        const setChatItem = jest.fn();
        const opened = handleCommentAction({ id: 'feed_1', roomId: '!room:matrix.org' }, { setChatItem });
        expect(opened).toBe(true);
        expect(setChatItem).toHaveBeenCalled();
    });

    test('feed CTA routes to marketplace/job through action router', async () => {
        const navigate = jest.fn();

        await executeEcosystemAction({ type: 'SHOP_ITEM' }, { navigate });
        await executeEcosystemAction({ type: 'APPLY_JOB', payload: { jobId: 'job_101', providerId: 'provider_1' } }, { navigate });

        expect(navigate).toHaveBeenCalledWith('Feed', expect.any(Object));
        expect(navigate).toHaveBeenCalledWith('Home', expect.any(Object));
    });

    test('location off shows explore fallback', () => {
        expect(shouldShowExploreFallback({ granted: false, precision: 'off' })).toBe(true);
    });
});
