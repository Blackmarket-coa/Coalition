import { createHmac } from 'node:crypto';

export interface PluginManifestInput {
    id: string;
    version: string;
    name: string;
    description: string;
    entry: string;
    integrity_sha256: string;
    permissions: string[];
    hooks: string[];
    emoji_pack?: { shortcodes: Record<string, string> };
    meme_pack?: { urls: string[] };
}

export interface SignedManifest extends PluginManifestInput {
    signed_at: string;
    signature: string;
}

export interface ManifestDeliveryConfig {
    signingSecret: string;
}

export const loadManifestConfig = (): ManifestDeliveryConfig => {
    const signingSecret = process.env.BAZAAR_MANIFEST_SIGNING_SECRET;
    if (!signingSecret) {
        throw new Error('BAZAAR_MANIFEST_SIGNING_SECRET is required for manifest delivery');
    }
    return { signingSecret };
};

const canonicalize = (manifest: PluginManifestInput, signedAt: string): string => {
    const payload = {
        id: manifest.id,
        version: manifest.version,
        entry: manifest.entry,
        integrity_sha256: manifest.integrity_sha256,
        permissions: [...manifest.permissions].sort(),
        hooks: [...manifest.hooks].sort(),
        signed_at: signedAt,
    };
    return JSON.stringify(payload);
};

export const signManifest = (manifest: PluginManifestInput, config: ManifestDeliveryConfig = loadManifestConfig()): SignedManifest => {
    const signedAt = new Date().toISOString();
    const canonical = canonicalize(manifest, signedAt);
    const signature = createHmac('sha256', config.signingSecret).update(canonical).digest('base64url');

    return {
        ...manifest,
        signed_at: signedAt,
        signature,
    };
};

export const verifyManifest = (manifest: SignedManifest, config: ManifestDeliveryConfig = loadManifestConfig()): boolean => {
    const canonical = canonicalize(manifest, manifest.signed_at);
    const expected = createHmac('sha256', config.signingSecret).update(canonical).digest('base64url');
    return expected === manifest.signature;
};
