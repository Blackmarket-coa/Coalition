import { get, set } from '../hooks/use-storage';
import { DEFAULT_LOCATION_CONSENT, LocationConsentSettings } from './location-consent';

export const LOCATION_CONSENT_SETTINGS_KEY = 'LOCATION_CONSENT_SETTINGS';

export function loadLocationConsentSettings(): LocationConsentSettings {
    const stored = get(LOCATION_CONSENT_SETTINGS_KEY);
    return stored ?? DEFAULT_LOCATION_CONSENT;
}

export function saveLocationConsentSettings(settings: LocationConsentSettings) {
    set(LOCATION_CONSENT_SETTINGS_KEY, settings);
    return settings;
}
