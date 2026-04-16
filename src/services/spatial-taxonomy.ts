export const SPATIAL_LAYER_DEFINITIONS = [
    { key: 'vendors', label: 'Marketplace', aliases: ['vendors', 'marketplace'] },
    { key: 'jobs', label: 'Jobs', aliases: ['jobs'] },
    { key: 'gardens', label: 'Gardens', aliases: ['gardens'] },
    { key: 'votes', label: 'Governance', aliases: ['votes', 'governance'] },
    { key: 'aid', label: 'Mutual Aid', aliases: ['aid', 'mutual aid'] },
    { key: 'infra', label: 'Infrastructure', aliases: ['infra', 'infrastructure'] },
] as const;

export const SPATIAL_LAYER_KEYS = SPATIAL_LAYER_DEFINITIONS.map((definition) => definition.key) as Array<(typeof SPATIAL_LAYER_DEFINITIONS)[number]['key']>;
export type SpatialLayerKey = (typeof SPATIAL_LAYER_DEFINITIONS)[number]['key'];
export type SpatialLayerLabel = (typeof SPATIAL_LAYER_DEFINITIONS)[number]['label'];

type SpatialLayerAlias = (typeof SPATIAL_LAYER_DEFINITIONS)[number]['aliases'][number];

const SPATIAL_LAYER_ALIAS_MAP = SPATIAL_LAYER_DEFINITIONS.reduce<Record<string, SpatialLayerKey>>((map, definition) => {
    definition.aliases.forEach((alias) => {
        map[alias] = definition.key;
    });

    return map;
}, {});

export const normalizeSpatialLayerKey = (layer: string): SpatialLayerKey | null => {
    const normalized = String(layer ?? '')
        .trim()
        .toLowerCase() as SpatialLayerAlias;
    return SPATIAL_LAYER_ALIAS_MAP[normalized] ?? null;
};

export const normalizeSpatialLayerKeys = (layers: string[]): SpatialLayerKey[] => {
    const unique = new Set<SpatialLayerKey>();
    layers.forEach((layer) => {
        const normalized = normalizeSpatialLayerKey(layer);
        if (normalized) {
            unique.add(normalized);
        }
    });
    return [...unique];
};

export const SPATIAL_EVENT_CATEGORIES = [
    { key: 'arson', label: 'Arson' },
    { key: 'wildfire', label: 'Wildfire' },
    { key: 'farm', label: 'Farms' },
    { key: 'community_event', label: 'Community Events' },
    { key: 'mass_shooting', label: 'Mass Shooting Alerts' },
] as const;
