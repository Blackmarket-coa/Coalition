import { buildMedusaSpatialMetadata, mergeMedusaSpatialMetadata } from '../src/services/medusa-location';

describe('medusa spatial helpers', () => {
    it('builds medusa spatial metadata', () => {
        const metadata = buildMedusaSpatialMetadata({ latitude: 1, longitude: 2, approximate: true }, { visibility: 'community', discoverable: true });

        expect(metadata.visibility.visibility).toBe('community');
        expect(metadata.location.approximate).toBe(true);
    });

    it('merges metadata safely', () => {
        const payload = mergeMedusaSpatialMetadata({ id: 'p1', metadata: { foo: 'bar' } }, { latitude: 1, longitude: 2 }, { visibility: 'public', discoverable: true });

        expect(payload.metadata.foo).toBe('bar');
        expect(payload.metadata.spatial.location.latitude).toBe(1);
    });
});
