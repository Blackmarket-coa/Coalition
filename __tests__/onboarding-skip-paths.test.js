jest.mock('../src/utils', () => ({
    config: jest.fn(() => ''),
}));

jest.mock('../src/hooks/use-storage', () => ({
    get: jest.fn(() => null),
    set: jest.fn(),
}));

import { shouldShowMapFallback } from '../src/services/onboarding';

describe('onboarding skip paths', () => {
    test('allows onboarding completion when location consent is skipped', () => {
        expect(shouldShowMapFallback('skipped')).toBe(true);
    });

    test('does not force fallback when consent is granted', () => {
        expect(shouldShowMapFallback('granted')).toBe(false);
    });
});
