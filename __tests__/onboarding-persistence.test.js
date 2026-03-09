jest.mock('../src/hooks/use-storage', () => {
    const memory = {};
    return {
        get: jest.fn((key) => memory[key]),
        set: jest.fn((key, value) => {
            memory[key] = value;
            return value;
        }),
    };
});

jest.mock('../src/utils', () => ({
    config: jest.fn(() => ''),
}));

import { loadOnboardingPayload, persistOnboardingPayload, mapGoalsToEcosystemActions } from '../src/services/onboarding';

describe('onboarding persistence', () => {
    test('persists and reloads onboarding payload from local storage', async () => {
        const payload = { profile: { displayName: 'Alex' }, interests: ['Mutual Aid'], completedAt: '2026-01-01T00:00:00.000Z' };
        await persistOnboardingPayload('user_1', payload);
        expect(loadOnboardingPayload('user_1')).toEqual(payload);
    });

    test('maps goals to expected ecosystem actions', () => {
        expect(mapGoalsToEcosystemActions(['buy', 'provide service', 'vote'])).toEqual(['free-black-market', 'Blackstar', 'Blackout Matrix rooms']);
    });
});
