jest.mock('../src/services/blackstar-gateway', () => ({
    claimGatewayJob: jest.fn(async () => ({ id: 'claim_1' })),
}));

jest.mock('../src/services/conversion-analytics', () => ({
    trackConversionEvent: jest.fn(),
}));

jest.mock('../src/services/feature-flags', () => ({
    isCoalitionActionRouterEnabled: jest.fn(() => true),
}));

import { executeEcosystemAction } from '../src/services/action-router';
import { trackConversionEvent } from '../src/services/conversion-analytics';

describe('action tracking', () => {
    test('tracks successful routed action', async () => {
        const navigate = jest.fn();
        await executeEcosystemAction({ type: 'SHOP_ITEM' }, { navigate });
        expect(trackConversionEvent).toHaveBeenCalledWith('action_routed', expect.objectContaining({ action: 'SHOP_ITEM' }));
    });

    test('tracks failed action when adapter missing', async () => {
        const navigate = jest.fn();
        await executeEcosystemAction({ type: 'JOIN_ROOM', payload: { roomId: '#room:matrix.org' } }, { navigate });
        expect(trackConversionEvent).toHaveBeenCalledWith('action_failed', expect.objectContaining({ action: 'JOIN_ROOM' }));
    });
});
