import { resolveAuthenticatedNavigator } from '../src/navigation/coalition-config';

describe('authenticated navigator resolution', () => {
    test('defaults to coalition navigator when feature flag is enabled', () => {
        expect(resolveAuthenticatedNavigator({ coalitionNavEnabled: true, isDriver: false })).toBe('CoalitionNavigator');
    });

    test('routes drivers to legacy driver navigator for role-gated compatibility', () => {
        expect(resolveAuthenticatedNavigator({ coalitionNavEnabled: true, isDriver: true })).toBe('DriverNavigator');
    });

    test('falls back to legacy driver navigator when feature flag is disabled', () => {
        expect(resolveAuthenticatedNavigator({ coalitionNavEnabled: false, isDriver: false })).toBe('DriverNavigator');
    });
});
