import { buildLocationConsent, LOCATION_CONSENT_POLICY_TEXT_ID, transitionLocationConsent } from '../src/utils/location-consent';

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

import { loadLocationConsentSettings, saveLocationConsentSettings } from '../src/utils/location-consent-storage';

describe('location consent model transitions and persistence', () => {
    test('builds structured consent with timestamp and policy id', () => {
        const consent = buildLocationConsent(true, 'approximate');
        expect(consent.policyTextId).toBe(LOCATION_CONSENT_POLICY_TEXT_ID);
        expect(consent.status).toBe('granted');
        expect(consent.updatedAt).toBeTruthy();
    });

    test('transitions to declined and updates precision/state', () => {
        const initial = buildLocationConsent(true, 'precise');
        const declined = transitionLocationConsent(initial, { granted: false, precision: 'off' });
        expect(declined.status).toBe('declined');
        expect(declined.precision).toBe('off');
    });

    test('persists and loads consent settings', () => {
        const consent = buildLocationConsent(true, 'approximate');
        saveLocationConsentSettings(consent);
        expect(loadLocationConsentSettings()).toEqual(consent);
    });
});
