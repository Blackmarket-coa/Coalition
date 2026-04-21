export type PluginUIHook = 'feed.card' | 'composer.tile' | 'profile.section' | 'bazaar.badge';

export type PluginPermission = 'read:profile' | 'read:feed' | 'write:composer' | 'read:bazaar';

export interface PluginManifest {
    id: string;
    version: string;
    name: string;
    description: string;
    entry: string;
    integrity_sha256: string;
    permissions: PluginPermission[];
    hooks: PluginUIHook[];
    emoji_pack?: {
        shortcodes: Record<string, string>;
    };
    meme_pack?: {
        urls: string[];
    };
    signed_at: string;
    signature: string;
}

export interface PluginRegistryEntry {
    manifest: PluginManifest;
    source: 'entitlement' | 'preview';
    entitlement_id?: string;
}

const HOOK_ALLOWLIST: ReadonlySet<PluginUIHook> = new Set(['feed.card', 'composer.tile', 'profile.section', 'bazaar.badge']);
const PERMISSION_ALLOWLIST: ReadonlySet<PluginPermission> = new Set(['read:profile', 'read:feed', 'write:composer', 'read:bazaar']);

export class PluginRegistryError extends Error {
    constructor(
        message: string,
        public readonly code: 'INVALID_MANIFEST' | 'DISALLOWED_HOOK' | 'DISALLOWED_PERMISSION' | 'SIGNATURE_MISSING'
    ) {
        super(message);
        this.name = 'PluginRegistryError';
    }
}

export const validateManifest = (manifest: unknown): PluginManifest => {
    if (!manifest || typeof manifest !== 'object') {
        throw new PluginRegistryError('Manifest must be an object', 'INVALID_MANIFEST');
    }

    const m = manifest as Partial<PluginManifest>;
    const required: (keyof PluginManifest)[] = ['id', 'version', 'name', 'entry', 'integrity_sha256', 'signature'];
    for (const key of required) {
        if (typeof m[key] !== 'string' || !(m[key] as string).length) {
            throw new PluginRegistryError(`Manifest missing required field: ${key}`, 'INVALID_MANIFEST');
        }
    }

    if (!Array.isArray(m.hooks)) {
        throw new PluginRegistryError('Manifest.hooks must be an array', 'INVALID_MANIFEST');
    }
    for (const hook of m.hooks) {
        if (!HOOK_ALLOWLIST.has(hook)) {
            throw new PluginRegistryError(`Hook "${hook}" is not in the allowlist`, 'DISALLOWED_HOOK');
        }
    }

    if (!Array.isArray(m.permissions)) {
        throw new PluginRegistryError('Manifest.permissions must be an array', 'INVALID_MANIFEST');
    }
    for (const perm of m.permissions) {
        if (!PERMISSION_ALLOWLIST.has(perm)) {
            throw new PluginRegistryError(`Permission "${perm}" is not in the allowlist`, 'DISALLOWED_PERMISSION');
        }
    }

    if (!m.signature) {
        throw new PluginRegistryError('Manifest signature is required', 'SIGNATURE_MISSING');
    }

    return m as PluginManifest;
};

export class PluginRegistry {
    private readonly entries = new Map<string, PluginRegistryEntry>();

    register(manifest: unknown, source: 'entitlement' | 'preview', entitlementId?: string): PluginManifest {
        const validated = validateManifest(manifest);
        this.entries.set(validated.id, { manifest: validated, source, entitlement_id: entitlementId });
        return validated;
    }

    unregister(pluginId: string): boolean {
        return this.entries.delete(pluginId);
    }

    get(pluginId: string): PluginRegistryEntry | undefined {
        return this.entries.get(pluginId);
    }

    list(): PluginRegistryEntry[] {
        return Array.from(this.entries.values());
    }

    hooksFor(hook: PluginUIHook): PluginManifest[] {
        return this.list()
            .map((entry) => entry.manifest)
            .filter((manifest) => manifest.hooks.includes(hook));
    }

    clear(): void {
        this.entries.clear();
    }
}

export const pluginRegistry = new PluginRegistry();
