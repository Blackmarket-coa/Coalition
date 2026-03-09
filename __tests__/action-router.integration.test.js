jest.mock('../src/services/blackstar-gateway', () => ({
    claimGatewayJob: jest.fn(async (jobId, providerId) => ({ id: `claim_${jobId}`, jobId, providerId })),
}));

jest.mock('../src/services/feature-flags', () => ({
    isCoalitionActionRouterEnabled: jest.fn(() => true),
}));

import { executeEcosystemAction } from '../src/services/action-router';

describe('ActionRouter integration', () => {
    test('routes SHOP_ITEM to marketplace flow', async () => {
        const navigate = jest.fn();
        const result = await executeEcosystemAction({ type: 'SHOP_ITEM' }, { navigate });

        expect(result.ok).toBe(true);
        expect(navigate).toHaveBeenCalledWith('Feed', { screen: 'PostTab', params: { action: 'shop', itemId: undefined } });
    });

    test('routes APPLY_JOB to Blackstar claim flow and home handoff', async () => {
        const navigate = jest.fn();
        const result = await executeEcosystemAction({ type: 'APPLY_JOB', payload: { jobId: 'job_101', providerId: 'provider_5' } }, { navigate });

        expect(result.ok).toBe(true);
        expect(navigate).toHaveBeenCalledWith('Home', { screen: 'DriverOrderManagement' });
    });

    test('routes JOIN_ROOM to matrix join and messages handoff', async () => {
        const navigate = jest.fn();
        const joinRoom = jest.fn(async () => {});

        const result = await executeEcosystemAction({ type: 'JOIN_ROOM', payload: { roomId: '#coalition:matrix.org' } }, { navigate, joinRoom });

        expect(result.ok).toBe(true);
        expect(joinRoom).toHaveBeenCalledWith('#coalition:matrix.org');
        expect(navigate).toHaveBeenCalledWith('Messages', { screen: 'ChatHome' });
    });

    test('returns meaningful fallback for unresolved adapters', async () => {
        const navigate = jest.fn();
        const onUnhandled = jest.fn();

        const result = await executeEcosystemAction({ type: 'JOIN_ROOM', payload: { roomId: '#coalition:matrix.org' } }, { navigate, onUnhandled });

        expect(result.ok).toBe(false);
        expect(result.reason).toBe('MATRIX_UNAVAILABLE');
        expect(onUnhandled).toHaveBeenCalled();
    });
});
