const LEGACY_RUNTIME_BASE_PATH = '../../../legacy/runtime';

/**
 * Approved boundary for accessing legacy runtime modules.
 *
 * New app code must import from this adapter layer instead of importing
 * from legacy/runtime modules directly.
 */
export const legacyRuntimeModules = {
    config: () => import('../../../legacy/runtime/config'),
    services: () => import('../../../legacy/runtime/services'),
    hooks: () => import('../../../legacy/runtime/hooks'),
    components: () => import('../../../legacy/runtime/components'),
    utils: () => import('../../../legacy/runtime/utils'),
};

export const legacyRuntimeInfo = {
    basePath: LEGACY_RUNTIME_BASE_PATH,
    deprecationOwner: 'coalition-mobile-platform',
};
