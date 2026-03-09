import { config } from '../utils';

export const SPATIAL_LAYER_KEYS = ['vendors', 'jobs', 'gardens', 'votes', 'aid', 'infra'] as const;
export type SpatialLayerKey = (typeof SPATIAL_LAYER_KEYS)[number];
export type SpatialVisibility = 'public' | 'community' | 'private';

export interface SpatialFeedItem {
    id: string;
    layer: SpatialLayerKey;
    title: string;
    latitude: number;
    longitude: number;
    visibility: SpatialVisibility;
    source?: 'gateway' | 'medusa' | 'blackstar' | 'blackout';
    meta?: Record<string, unknown>;
}

export interface SpatialFeedResponse {
    generatedAt: string;
    bbox?: [number, number, number, number];
    items: SpatialFeedItem[];
}

const sampleFeed: SpatialFeedItem[] = [
    { id: 'vendor-1', layer: 'vendors', title: 'Co-op Market', latitude: 40.7128, longitude: -74.006, visibility: 'public', source: 'medusa' },
    { id: 'job-1', layer: 'jobs', title: 'Courier Shift', latitude: 40.717, longitude: -74.001, visibility: 'community', source: 'blackstar' },
    { id: 'garden-1', layer: 'gardens', title: 'Community Garden', latitude: 40.7103, longitude: -74.009, visibility: 'public' },
    { id: 'vote-1', layer: 'votes', title: 'Transit Proposal', latitude: 40.7146, longitude: -74.0112, visibility: 'community', source: 'blackout' },
    { id: 'aid-1', layer: 'aid', title: 'Food Mutual Aid', latitude: 40.7195, longitude: -74.0075, visibility: 'public' },
    { id: 'infra-1', layer: 'infra', title: 'Solar Microgrid', latitude: 40.7091, longitude: -74.0034, visibility: 'public' },
];

export const buildUnifiedSpatialFeedPath = (layers: SpatialLayerKey[]): string => {
    const layerQuery = layers.length > 0 ? layers.join(',') : SPATIAL_LAYER_KEYS.join(',');
    return `/v1/spatial/feed?layers=${encodeURIComponent(layerQuery)}`;
};

export const getUnifiedSpatialFeed = async (host: string, apiKey?: string, layers: SpatialLayerKey[] = [...SPATIAL_LAYER_KEYS]): Promise<SpatialFeedResponse> => {
    if (!host) {
        return { generatedAt: new Date().toISOString(), items: sampleFeed };
    }

    const normalizedHost = host.replace(/\/$/, '');
    const endpoint = `${normalizedHost}${buildUnifiedSpatialFeedPath(layers)}`;

    try {
        const response = await fetch(endpoint, {
            headers: {
                Accept: 'application/json',
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
        });

        if (!response.ok) {
            throw new Error(`Spatial feed request failed with ${response.status}`);
        }

        const payload = (await response.json()) as SpatialFeedResponse;
        return {
            generatedAt: payload.generatedAt ?? new Date().toISOString(),
            bbox: payload.bbox,
            items: Array.isArray(payload.items) ? payload.items : [],
        };
    } catch (error) {
        console.warn('Falling back to local unified spatial feed sample:', error);
        return { generatedAt: new Date().toISOString(), items: sampleFeed };
    }
};

export const getGatewayFeedConfig = () => ({
    host: config('BLACKSTAR_GATEWAY_HOST', ''),
    apiKey: config('BLACKSTAR_GATEWAY_KEY', ''),
});
