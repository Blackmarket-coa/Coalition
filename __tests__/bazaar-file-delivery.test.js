import { issueFileDelivery, verifyFileDelivery } from '../apps/gateway/src/services/digital-delivery/file-delivery';

const config = {
    signingSecret: 'test-secret-bazaar-asset',
    cdnBaseUrl: 'https://cdn.test.local/bazaar',
    ttlSeconds: 900,
};

describe('file delivery signing', () => {
    test('issues a signed URL that verifies', () => {
        const result = issueFileDelivery({ entitlementId: 'ent_1', assetRef: 'assets/plugin-1.zip' }, config);
        expect(result.type).toBe('file');
        expect(result.download_url).toContain('https://cdn.test.local/bazaar/ent_1?');
        const url = new URL(result.download_url);
        const exp = Number(url.searchParams.get('exp'));
        const nonce = url.searchParams.get('nonce');
        const sig = url.searchParams.get('sig');
        const verified = verifyFileDelivery(
            { entitlementId: 'ent_1', assetRef: 'assets/plugin-1.zip', expiresAtSeconds: exp, nonce: nonce, signature: sig },
            config
        );
        expect(verified).toEqual({ ok: true });
    });

    test('rejects expired URLs', () => {
        const verified = verifyFileDelivery(
            {
                entitlementId: 'ent_1',
                assetRef: 'assets/plugin-1.zip',
                expiresAtSeconds: Math.floor(Date.now() / 1000) - 60,
                nonce: 'abc',
                signature: 'anything',
            },
            config
        );
        expect(verified).toEqual({ ok: false, reason: 'EXPIRED' });
    });

    test('rejects tampered signatures', () => {
        const result = issueFileDelivery({ entitlementId: 'ent_1', assetRef: 'assets/plugin-1.zip' }, config);
        const url = new URL(result.download_url);
        const exp = Number(url.searchParams.get('exp'));
        const nonce = url.searchParams.get('nonce');
        const verified = verifyFileDelivery(
            {
                entitlementId: 'ent_1',
                assetRef: 'assets/plugin-1.zip',
                expiresAtSeconds: exp,
                nonce,
                signature: 'deadbeef',
            },
            config
        );
        expect(verified).toEqual({ ok: false, reason: 'BAD_SIGNATURE' });
    });

    test('rejects asset-ref substitution', () => {
        const result = issueFileDelivery({ entitlementId: 'ent_1', assetRef: 'assets/original.zip' }, config);
        const url = new URL(result.download_url);
        const exp = Number(url.searchParams.get('exp'));
        const nonce = url.searchParams.get('nonce');
        const sig = url.searchParams.get('sig');
        const verified = verifyFileDelivery(
            { entitlementId: 'ent_1', assetRef: 'assets/malicious.zip', expiresAtSeconds: exp, nonce, signature: sig },
            config
        );
        expect(verified).toEqual({ ok: false, reason: 'BAD_SIGNATURE' });
    });
});
