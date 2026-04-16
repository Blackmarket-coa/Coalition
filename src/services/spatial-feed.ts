import { deriveSpatialEventStatus, type SpatialEventStatus } from './event-timeline';
import { config } from '../utils';

export const SPATIAL_LAYER_KEYS = ['vendors', 'jobs', 'gardens', 'votes', 'aid', 'infra'] as const;
export type SpatialLayerKey = (typeof SPATIAL_LAYER_KEYS)[number];
export type SpatialVisibility = 'public' | 'community' | 'private';
export type SpatialEventType =
    | 'arson'
    | 'wildfire'
    | 'farm'
    | 'community_event'
    | 'mass_shooting'
    | 'infrastructure'
    | 'aid'
    | 'jobs'
    | 'other';

export interface SpatialEncryptedEnvelope {
    v: 1;
    alg: string;
    kid: string;
    ciphertext: string;
    nonce: string;
    tag?: string;
    scope: 'role' | 'user' | 'cohort';
}

export interface SpatialFeedItem {
    id: string;
    layer: SpatialLayerKey;
    title: string;
    latitude: number;
    longitude: number;
    visibility: SpatialVisibility;
    eventType: SpatialEventType;
    startsAt: string;
    endsAt?: string;
    status: SpatialEventStatus;
    severity?: 'low' | 'moderate' | 'high' | 'critical';
    confidence?: number;
    source?: 'gateway' | 'medusa' | 'blackstar' | 'blackout';
    meta?: Record<string, unknown>;
    encrypted?: SpatialEncryptedEnvelope;
}

export type SpatialDecryptResult = { ok: true; plaintext: string } | { ok: false; reason: 'capability_missing' | 'key_missing' | 'decrypt_error' };

export interface SpatialDecryptContext {
    hasEncryptedFeedCapability: boolean;
    resolveKey: (keyId: string) => Promise<string | null>;
    decryptWithKey: (params: { envelope: SpatialEncryptedEnvelope; keyMaterial: string }) => Promise<string>;
    onTelemetry?: (event: { status: 'success' | 'failure'; reason?: SpatialDecryptResult['reason']; keyId: string }) => void;
}

type SpatialFeedPayloadItem = Omit<SpatialFeedItem, 'status'> & { status?: SpatialEventStatus };

const normalizeSpatialFeedItem = (item: SpatialFeedPayloadItem): SpatialFeedItem => ({
    ...item,
    status: item.status ?? deriveSpatialEventStatus({ startsAt: item.startsAt, endsAt: item.endsAt }),
});

export const maybeDecryptSpatialEnvelope = async (envelope: SpatialEncryptedEnvelope | undefined, context: SpatialDecryptContext): Promise<SpatialDecryptResult> => {
    if (!envelope) {
        return { ok: false, reason: 'decrypt_error' };
    }

    if (!context.hasEncryptedFeedCapability) {
        context.onTelemetry?.({ status: 'failure', reason: 'capability_missing', keyId: envelope.kid });
        return { ok: false, reason: 'capability_missing' };
    }

    const keyMaterial = await context.resolveKey(envelope.kid);
    if (!keyMaterial) {
        context.onTelemetry?.({ status: 'failure', reason: 'key_missing', keyId: envelope.kid });
        return { ok: false, reason: 'key_missing' };
    }

    try {
        const plaintext = await context.decryptWithKey({ envelope, keyMaterial });
        context.onTelemetry?.({ status: 'success', keyId: envelope.kid });
        return { ok: true, plaintext };
    } catch {
        context.onTelemetry?.({ status: 'failure', reason: 'decrypt_error', keyId: envelope.kid });
        return { ok: false, reason: 'decrypt_error' };
    }
};

export interface SpatialFeedResponse {
    generatedAt: string;
    bbox?: [number, number, number, number];
    items: SpatialFeedItem[];
}

export interface UnifiedSpatialFeedRequestOptions {
    encryptedKeyId?: string;
    enableEncryptedLayer?: boolean;
}

const sampleFeed: SpatialFeedItem[] = [
    {
        id: 'vendor-1',
        layer: 'vendors',
        title: 'Sunrise Farm Stand Pop-up',
        latitude: 40.7128,
        longitude: -74.006,
        visibility: 'public',
        eventType: 'farm',
        startsAt: '2027-05-03T13:00:00Z',
        endsAt: '2027-05-03T18:00:00Z',
        status: deriveSpatialEventStatus({ startsAt: '2027-05-03T13:00:00Z', endsAt: '2027-05-03T18:00:00Z' }),
        source: 'medusa',
    },
    {
        id: 'job-1',
        layer: 'jobs',
        title: 'Storm Recovery Cleanup Shift',
        latitude: 40.717,
        longitude: -74.001,
        visibility: 'community',
        eventType: 'jobs',
        startsAt: '2026-03-30T08:00:00Z',
        endsAt: '2026-12-31T22:00:00Z',
        status: deriveSpatialEventStatus({ startsAt: '2026-03-30T08:00:00Z', endsAt: '2026-12-31T22:00:00Z' }),
        source: 'blackstar',
    },
    {
        id: 'garden-1',
        layer: 'gardens',
        title: 'Neighborhood Wildfire Preparedness Briefing',
        latitude: 40.7103,
        longitude: -74.009,
        visibility: 'public',
        eventType: 'wildfire',
        startsAt: '2025-09-11T18:30:00Z',
        endsAt: '2025-09-11T20:00:00Z',
        status: deriveSpatialEventStatus({ startsAt: '2025-09-11T18:30:00Z', endsAt: '2025-09-11T20:00:00Z' }),
        severity: 'moderate',
        confidence: 0.72,
    },
    {
        id: 'vote-1',
        layer: 'votes',
        title: 'Community Safety Town Hall',
        latitude: 40.7146,
        longitude: -74.0112,
        visibility: 'community',
        eventType: 'community_event',
        startsAt: '2026-04-01T00:00:00Z',
        endsAt: '2026-10-01T00:00:00Z',
        status: deriveSpatialEventStatus({ startsAt: '2026-04-01T00:00:00Z', endsAt: '2026-10-01T00:00:00Z' }),
        source: 'blackout',
    },
    {
        id: 'aid-1',
        layer: 'aid',
        title: 'Mutual Aid Distribution for Displaced Residents',
        latitude: 40.7195,
        longitude: -74.0075,
        visibility: 'public',
        eventType: 'aid',
        startsAt: '2026-02-15T09:00:00Z',
        endsAt: '2026-11-15T18:00:00Z',
        status: deriveSpatialEventStatus({ startsAt: '2026-02-15T09:00:00Z', endsAt: '2026-11-15T18:00:00Z' }),
    },
    {
        id: 'infra-1',
        layer: 'infra',
        title: 'Substation Fire Disruption',
        latitude: 40.7091,
        longitude: -74.0034,
        visibility: 'public',
        eventType: 'infrastructure',
        startsAt: '2025-12-01T03:15:00Z',
        endsAt: '2025-12-01T09:30:00Z',
        status: deriveSpatialEventStatus({ startsAt: '2025-12-01T03:15:00Z', endsAt: '2025-12-01T09:30:00Z' }),
        severity: 'high',
        confidence: 0.91,
    },
];

const optimisticSpatialItems = new Map<string, SpatialFeedItem>();
const optimisticListeners = new Set<(items: SpatialFeedItem[]) => void>();

const emitOptimisticSpatialItems = () => {
    const items = [...optimisticSpatialItems.values()];
    optimisticListeners.forEach((listener) => listener(items));
};

export const addOptimisticSpatialFeedItem = (item: SpatialFeedItem) => {
    optimisticSpatialItems.set(item.id, item);
    emitOptimisticSpatialItems();
};

export const subscribeOptimisticSpatialFeed = (listener: (items: SpatialFeedItem[]) => void) => {
    optimisticListeners.add(listener);
    listener([...optimisticSpatialItems.values()]);
    return () => {
        optimisticListeners.delete(listener);
    };
};

const mergeWithOptimisticSpatialItems = (items: SpatialFeedItem[]): SpatialFeedItem[] => {
    const merged = [...optimisticSpatialItems.values()];
    items.forEach((item) => {
        if (!optimisticSpatialItems.has(item.id)) {
            merged.push(item);
        }
    });
    return merged;
};

export const buildUnifiedSpatialFeedPath = (layers: SpatialLayerKey[]): string => {
    const layerQuery = layers.length > 0 ? layers.join(',') : SPATIAL_LAYER_KEYS.join(',');
    return `/v1/spatial/feed?layers=${encodeURIComponent(layerQuery)}`;
};

export const getUnifiedSpatialFeed = async (
    host: string,
    apiKey?: string,
    layers: SpatialLayerKey[] = [...SPATIAL_LAYER_KEYS],
    options: UnifiedSpatialFeedRequestOptions = {}
): Promise<SpatialFeedResponse> => {
    if (!host) {
        return { generatedAt: new Date().toISOString(), items: mergeWithOptimisticSpatialItems(sampleFeed) };
    }

    const normalizedHost = host.replace(/\/$/, '');
    const endpoint = `${normalizedHost}${buildUnifiedSpatialFeedPath(layers)}`;

    try {
        const response = await fetch(endpoint, {
            headers: {
                Accept: 'application/json',
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
                ...(options.enableEncryptedLayer ? { 'X-Coalition-Capabilities': 'feed:encrypted' } : {}),
                ...(options.enableEncryptedLayer && options.encryptedKeyId ? { 'X-Coalition-Key-Id': options.encryptedKeyId } : {}),
            },
        });

        if (!response.ok) {
            throw new Error(`Spatial feed request failed with ${response.status}`);
        }

        const payload = (await response.json()) as SpatialFeedResponse & { items?: SpatialFeedPayloadItem[] };
        return {
            generatedAt: payload.generatedAt ?? new Date().toISOString(),
            bbox: payload.bbox,
            items: mergeWithOptimisticSpatialItems(Array.isArray(payload.items) ? payload.items.map(normalizeSpatialFeedItem) : []),
        };
    } catch (error) {
        console.warn('Falling back to local unified spatial feed sample:', error);
        return { generatedAt: new Date().toISOString(), items: mergeWithOptimisticSpatialItems(sampleFeed) };
    }
};

export const getGatewayFeedConfig = () => ({
    host: config('BLACKSTAR_GATEWAY_HOST', ''),
    apiKey: config('BLACKSTAR_GATEWAY_KEY', ''),
    encryptedKeyId: config('COALITION_FEED_ENCRYPTED_KEY_ID', ''),
    encryptedLayerEnabled: config('COALITION_FEED_ENCRYPTED_LAYER_ENABLED', false),
});
