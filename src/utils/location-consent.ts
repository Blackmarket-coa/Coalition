export type LocationPrecisionMode = 'precise' | 'approximate' | 'off';
export type LocationConsentStatus = 'granted' | 'declined';

export const LOCATION_CONSENT_POLICY_TEXT_ID = 'privacy-location-v1';

export interface LocationConsentSettings {
    granted: boolean;
    precision: LocationPrecisionMode;
    status: LocationConsentStatus;
    policyTextId: string;
    updatedAt: string;
}

export const DEFAULT_LOCATION_CONSENT: LocationConsentSettings = {
    granted: false,
    precision: 'off',
    status: 'declined',
    policyTextId: LOCATION_CONSENT_POLICY_TEXT_ID,
    updatedAt: new Date(0).toISOString(),
};

export const toApproximateCoordinate = (value: number, precision = 2): number => {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
};

export const toApproximateLocation = (coords: { latitude: number; longitude: number }, precision = 2) => ({
    latitude: toApproximateCoordinate(coords.latitude, precision),
    longitude: toApproximateCoordinate(coords.longitude, precision),
    precision,
});

export const buildLocationConsent = (
    granted: boolean,
    precision: LocationPrecisionMode,
    policyTextId = LOCATION_CONSENT_POLICY_TEXT_ID
): LocationConsentSettings => ({
    granted,
    precision,
    status: granted ? 'granted' : 'declined',
    policyTextId,
    updatedAt: new Date().toISOString(),
});

export const transitionLocationConsent = (previous: LocationConsentSettings, next: Partial<LocationConsentSettings> = {}): LocationConsentSettings => {
    const granted = next.granted ?? previous.granted;
    const precision = next.precision ?? previous.precision;

    return {
        ...previous,
        ...next,
        granted,
        precision,
        status: granted ? 'granted' : 'declined',
        policyTextId: next.policyTextId ?? previous.policyTextId ?? LOCATION_CONSENT_POLICY_TEXT_ID,
        updatedAt: new Date().toISOString(),
    };
};

export const fuzzLocationWithinRadiusMiles = (coords: { latitude: number; longitude: number }, miles = 0.2) => {
    const radiusMeters = miles * 1609.344;
    const randomDistance = Math.random() * radiusMeters;
    const randomBearing = Math.random() * Math.PI * 2;

    const deltaLat = (randomDistance * Math.cos(randomBearing)) / 111_320;
    const deltaLng = (randomDistance * Math.sin(randomBearing)) / (111_320 * Math.max(Math.cos((coords.latitude * Math.PI) / 180), 0.01));

    return {
        latitude: coords.latitude + deltaLat,
        longitude: coords.longitude + deltaLng,
        radius_miles: miles,
    };
};
