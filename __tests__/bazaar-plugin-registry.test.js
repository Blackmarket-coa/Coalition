import { PluginRegistry, PluginRegistryError, validateManifest } from '../packages/core/src/services/plugin-registry';

const buildManifest = (overrides = {}) => ({
    id: 'plugin.test',
    version: '0.1.0',
    name: 'Test Plugin',
    description: 'For testing',
    entry: 'https://plugins.test.local/test/entry.js',
    integrity_sha256: 'abc123',
    permissions: ['read:feed'],
    hooks: ['feed.card'],
    signed_at: new Date().toISOString(),
    signature: 'fakesig',
    ...overrides,
});

describe('validateManifest', () => {
    test('accepts a valid manifest', () => {
        const manifest = buildManifest();
        expect(validateManifest(manifest).id).toBe('plugin.test');
    });

    test('rejects unknown permissions', () => {
        expect(() => validateManifest(buildManifest({ permissions: ['write:root'] }))).toThrow(PluginRegistryError);
    });

    test('rejects unknown hooks', () => {
        expect(() => validateManifest(buildManifest({ hooks: ['arbitrary.code'] }))).toThrow(PluginRegistryError);
    });

    test('rejects missing required fields', () => {
        const manifest = buildManifest();
        delete manifest.entry;
        expect(() => validateManifest(manifest)).toThrow(PluginRegistryError);
    });
});

describe('PluginRegistry', () => {
    test('register + hooksFor returns matching plugins', () => {
        const registry = new PluginRegistry();
        registry.register(buildManifest({ id: 'plugin.a', hooks: ['feed.card'] }), 'entitlement');
        registry.register(buildManifest({ id: 'plugin.b', hooks: ['profile.section'] }), 'entitlement');

        const cards = registry.hooksFor('feed.card');
        expect(cards.map((p) => p.id)).toEqual(['plugin.a']);

        const profile = registry.hooksFor('profile.section');
        expect(profile.map((p) => p.id)).toEqual(['plugin.b']);
    });

    test('unregister removes a plugin', () => {
        const registry = new PluginRegistry();
        registry.register(buildManifest({ id: 'plugin.remove' }), 'entitlement');
        expect(registry.get('plugin.remove')).toBeDefined();
        registry.unregister('plugin.remove');
        expect(registry.get('plugin.remove')).toBeUndefined();
    });

    test('rejects an invalid manifest on register', () => {
        const registry = new PluginRegistry();
        expect(() => registry.register(buildManifest({ hooks: ['bad.hook'] }), 'entitlement')).toThrow(PluginRegistryError);
    });
});
