import { signManifest, verifyManifest } from '../apps/gateway/src/services/digital-delivery/manifest-delivery';

const config = { signingSecret: 'test-secret-manifest' };

const baseManifest = {
    id: 'plugin.ledger-insights',
    version: '1.0.0',
    name: 'Ledger Insights',
    description: 'Visualize ledger flows',
    entry: 'https://plugins.test.local/ledger-insights/entry.js',
    integrity_sha256: 'abc123',
    permissions: ['read:feed', 'read:profile'],
    hooks: ['feed.card', 'profile.section'],
};

describe('manifest signing', () => {
    test('signs and verifies a manifest', () => {
        const signed = signManifest(baseManifest, config);
        expect(signed.signature).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(signed.signed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(verifyManifest(signed, config)).toBe(true);
    });

    test('rejects tampered fields', () => {
        const signed = signManifest(baseManifest, config);
        const tampered = { ...signed, entry: 'https://plugins.test.local/evil.js' };
        expect(verifyManifest(tampered, config)).toBe(false);
    });

    test('permission order does not affect verification', () => {
        const signed = signManifest(baseManifest, config);
        const reordered = { ...signed, permissions: [...baseManifest.permissions].reverse() };
        expect(verifyManifest(reordered, config)).toBe(true);
    });

    test('different secret fails verification', () => {
        const signed = signManifest(baseManifest, config);
        expect(verifyManifest(signed, { signingSecret: 'other-secret' })).toBe(false);
    });
});
