import { buildLocationConsent, toApproximateCoordinate, toApproximateLocation } from '../src/utils/location-consent';

describe('location-consent utils', () => {
    it('rounds coordinates to expected precision', () => {
        expect(toApproximateCoordinate(40.71286, 2)).toBe(40.71);
        expect(toApproximateCoordinate(-74.00597, 3)).toBe(-74.006);
    });

    it('builds approximate location payload', () => {
        expect(toApproximateLocation({ latitude: 40.71286, longitude: -74.00597 }, 2)).toEqual({ latitude: 40.71, longitude: -74.01, precision: 2 });
    });

    it('builds consent object with timestamp', () => {
        const consent = buildLocationConsent(true, 'approximate');
        expect(consent.granted).toBe(true);
        expect(consent.precision).toBe('approximate');
        expect(typeof consent.updatedAt).toBe('string');
    });
});
