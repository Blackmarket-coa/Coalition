import { createHmac, randomBytes } from 'node:crypto';

export interface FileDeliveryResult {
    type: 'file';
    download_url: string;
    expires_at: string;
    asset_ref: string;
    ttl_seconds: number;
}

export interface FileDeliveryConfig {
    signingSecret: string;
    cdnBaseUrl: string;
    ttlSeconds?: number;
}

const DEFAULT_TTL_SECONDS = 15 * 60;

export const loadFileDeliveryConfig = (): FileDeliveryConfig => {
    const signingSecret = process.env.BAZAAR_ASSET_SIGNING_SECRET;
    const cdnBaseUrl = process.env.BAZAAR_ASSET_CDN_URL;
    if (!signingSecret || !cdnBaseUrl) {
        throw new Error('BAZAAR_ASSET_SIGNING_SECRET and BAZAAR_ASSET_CDN_URL are required for file delivery');
    }
    const ttlRaw = process.env.BAZAAR_ASSET_TTL_SECONDS;
    const ttlSeconds = ttlRaw ? Math.max(60, Number.parseInt(ttlRaw, 10)) : DEFAULT_TTL_SECONDS;
    return { signingSecret, cdnBaseUrl: cdnBaseUrl.replace(/\/$/, ''), ttlSeconds };
};

export const signAssetPayload = (payload: string, secret: string): string => {
    return createHmac('sha256', secret).update(payload).digest('base64url');
};

export const issueFileDelivery = (
    params: { entitlementId: string; assetRef: string; nonce?: string },
    config: FileDeliveryConfig = loadFileDeliveryConfig()
): FileDeliveryResult => {
    const ttl = config.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + ttl;
    const nonce = params.nonce ?? randomBytes(12).toString('base64url');
    const payload = `${params.entitlementId}.${params.assetRef}.${expiresAtSeconds}.${nonce}`;
    const signature = signAssetPayload(payload, config.signingSecret);

    const query = new URLSearchParams({
        asset: params.assetRef,
        exp: String(expiresAtSeconds),
        nonce,
        sig: signature,
    });

    return {
        type: 'file',
        download_url: `${config.cdnBaseUrl}/${params.entitlementId}?${query.toString()}`,
        expires_at: new Date(expiresAtSeconds * 1000).toISOString(),
        asset_ref: params.assetRef,
        ttl_seconds: ttl,
    };
};

export const verifyFileDelivery = (
    params: { entitlementId: string; assetRef: string; expiresAtSeconds: number; nonce: string; signature: string },
    config: FileDeliveryConfig = loadFileDeliveryConfig()
): { ok: true } | { ok: false; reason: 'EXPIRED' | 'BAD_SIGNATURE' } => {
    if (params.expiresAtSeconds < Math.floor(Date.now() / 1000)) {
        return { ok: false, reason: 'EXPIRED' };
    }
    const payload = `${params.entitlementId}.${params.assetRef}.${params.expiresAtSeconds}.${params.nonce}`;
    const expected = signAssetPayload(payload, config.signingSecret);
    if (expected !== params.signature) {
        return { ok: false, reason: 'BAD_SIGNATURE' };
    }
    return { ok: true };
};
