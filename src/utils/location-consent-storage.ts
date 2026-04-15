import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, set } from '../hooks/use-storage';
import { buildLocationConsent, DEFAULT_LOCATION_CONSENT, LocationConsentSettings } from './location-consent';

export const LOCATION_CONSENT_SETTINGS_KEY = 'LOCATION_CONSENT_SETTINGS';
export const LEGACY_LOCATION_CONSENT_STORAGE_KEY = 'location_consent';

export function loadLocationConsentSettings(): LocationConsentSettings {
    const stored = get(LOCATION_CONSENT_SETTINGS_KEY);
    return stored ?? DEFAULT_LOCATION_CONSENT;
}

export function saveLocationConsentSettings(settings: LocationConsentSettings) {
    set(LOCATION_CONSENT_SETTINGS_KEY, settings);
    return settings;
}

const mapLegacyConsentStatus = (legacyStatus: string): LocationConsentSettings => {
    if (legacyStatus === 'granted') {
        return buildLocationConsent(true, 'precise');
    }

    return buildLocationConsent(false, 'off');
};

export async function migrateLegacyLocationConsentIfNeeded() {
    const existingSettings = get(LOCATION_CONSENT_SETTINGS_KEY);
    if (existingSettings) {
        return existingSettings as LocationConsentSettings;
    }

    const legacyStatus = await AsyncStorage.getItem(LEGACY_LOCATION_CONSENT_STORAGE_KEY);
    if (!legacyStatus) {
        return null;
    }

    const migrated = mapLegacyConsentStatus(legacyStatus);
    saveLocationConsentSettings(migrated);
    await AsyncStorage.removeItem(LEGACY_LOCATION_CONSENT_STORAGE_KEY);
    return migrated;
}
