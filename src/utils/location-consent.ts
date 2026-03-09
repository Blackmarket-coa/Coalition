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
