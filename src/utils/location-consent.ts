export type LocationPrecisionMode = 'precise' | 'approximate' | 'off';

export interface LocationConsentSettings {
    granted: boolean;
    precision: LocationPrecisionMode;
    updatedAt: string;
}

export const toApproximateCoordinate = (value: number, precision = 2): number => {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
};

export const toApproximateLocation = (coords: { latitude: number; longitude: number }, precision = 2) => ({
    latitude: toApproximateCoordinate(coords.latitude, precision),
    longitude: toApproximateCoordinate(coords.longitude, precision),
    precision,
});

export const buildLocationConsent = (granted: boolean, precision: LocationPrecisionMode): LocationConsentSettings => ({
    granted,
    precision,
    updatedAt: new Date().toISOString(),
});

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
