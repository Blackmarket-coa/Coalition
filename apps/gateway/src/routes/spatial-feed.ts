import { Hono } from 'hono';
import { z } from 'zod';
import Redis from 'ioredis';
import { Pool } from 'pg';
import type { BBox, EntityType, QueryParams, SpatialEncryptedEnvelope, SpatialFeature, SpatialFeatureCollection, SpatialLayer } from '../lib/types';
import { MedusaSpatialService } from '../services/medusa-spatial-service';
import { SpatialRepository } from '../services/spatial-repository';

const allowedLayers = ['market', 'jobs', 'govern', 'aid'] as const;
const querySchema = z.object({
    bbox: z.string().min(1),
    layers: z.string().default('market,jobs,govern,aid'),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
});

const parseBbox = (raw: string): BBox => {
    const parts = raw.split(',').map((v) => Number(v.trim()));
    if (parts.length !== 4 || parts.some((v) => Number.isNaN(v))) {
        throw new Error('Invalid bbox. Expected west,south,east,north');
    }

    const [west, south, east, north] = parts;
    if (west >= east || south >= north) {
        throw new Error('Invalid bbox bounds ordering');
    }

    return { west, south, east, north };
};

const parseLayers = (raw: string): SpatialLayer[] => {
    const requested = raw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

    const unique = [...new Set(requested)] as string[];
    const valid = unique.filter((layer): layer is SpatialLayer => (allowedLayers as readonly string[]).includes(layer));
    return valid.length > 0 ? valid : ['market', 'jobs', 'govern', 'aid'];
};

const layerToEntityTypes: Record<SpatialLayer, EntityType[]> = {
    market: ['seller', 'product', 'kitchen', 'producer'],
    jobs: [],
    govern: [],
    aid: ['garden'],
};

const toFeatureCollection = (items: SpatialFeature[]): SpatialFeatureCollection => ({
    type: 'FeatureCollection',
    features: items,
});

const getAuthorizedEncryptedScopes = (raw = ''): Set<string> => {
    const entries = raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

    return new Set(entries);
};

const canIncludeEncryptedLayer = (params: { authorizationHeader?: string; capabilityHeader?: string; keyIdHeader?: string; layer: SpatialLayer }): boolean => {
    const encryptionEnabled = process.env.COALITION_FEED_ENCRYPTED_LAYER_ENABLED === 'true';
    if (!encryptionEnabled) {
        return false;
    }

    const hasAuth = typeof params.authorizationHeader === 'string' && params.authorizationHeader.startsWith('Bearer ');
    const hasCapability = (params.capabilityHeader ?? '').split(',').map((value) => value.trim()).includes('feed:encrypted');
    const hasKeyId = typeof params.keyIdHeader === 'string' && params.keyIdHeader.trim().length > 0;

    const allowedScopes = getAuthorizedEncryptedScopes(process.env.COALITION_FEED_ENCRYPTED_LAYERS ?? 'jobs,govern,aid');
    const layerAllowed = allowedScopes.has(params.layer);

    return hasAuth && hasCapability && hasKeyId && layerAllowed;
};

const createEncryptedEnvelope = (params: { featureId: string; layer: SpatialLayer; keyId: string }): SpatialEncryptedEnvelope => ({
    v: 1,
    alg: process.env.COALITION_FEED_ENCRYPTED_ALG ?? 'A256GCM',
    kid: params.keyId,
    // Placeholder ciphertext envelope. Real encryption should be delegated to KMS-backed service in WS8.
    ciphertext: Buffer.from(`v1:${params.layer}:${params.featureId}`).toString('base64url'),
    nonce: Buffer.from(`${params.featureId}:${Date.now()}`).toString('base64url').slice(0, 24),
    scope: 'role',
});

const logEncryptedLayerTelemetry = (params: { totalFeatures: number; encryptedFeatures: number; cacheHit: boolean }) => {
    console.info('[spatial-feed][encrypted-layer]', {
        total_features: params.totalFeatures,
        encrypted_features: params.encryptedFeatures,
        decryptable_ratio: params.totalFeatures > 0 ? params.encryptedFeatures / params.totalFeatures : 0,
        cache_hit: params.cacheHit,
    });
};

export const createSpatialFeedRouter = () => {
    const router = new Hono();

    const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const spatialRepo = new SpatialRepository(pool);

    const medusaBackendUrl = process.env.MEDUSA_BACKEND_URL;
    if (!medusaBackendUrl) {
        throw new Error('MEDUSA_BACKEND_URL is required for /api/v1/spatial/feed');
    }

    const medusa = new MedusaSpatialService(medusaBackendUrl, process.env.MEDUSA_PUBLISHABLE_KEY);

    router.get('/api/v1/spatial/feed', async (c) => {
        try {
            const authorizationHeader = c.req.header('authorization');
            const capabilityHeader = c.req.header('x-coalition-capabilities');
            const keyIdHeader = c.req.header('x-coalition-key-id');

            const parsed = querySchema.parse({
                bbox: c.req.query('bbox'),
                layers: c.req.query('layers') ?? undefined,
                limit: c.req.query('limit') ?? undefined,
                offset: c.req.query('offset') ?? undefined,
            });

            const query: QueryParams = {
                bbox: parseBbox(parsed.bbox),
                layers: parseLayers(parsed.layers),
                limit: parsed.limit,
                offset: parsed.offset,
            };

            const cacheKey = `spatial:feed:${query.bbox.west},${query.bbox.south},${query.bbox.east},${query.bbox.north}:${query.layers.join(',')}:${query.limit}:${query.offset}`;
            let cached: string | null = null;
            try {
                cached = await redis.get(cacheKey);
            } catch (error) {
                console.warn('Redis read failed for spatial feed cache:', error);
            }

            if (cached) {
                const cachedPayload = JSON.parse(cached) as SpatialFeatureCollection;
                logEncryptedLayerTelemetry({
                    totalFeatures: Array.isArray(cachedPayload?.features) ? cachedPayload.features.length : 0,
                    encryptedFeatures: Array.isArray(cachedPayload?.features)
                        ? cachedPayload.features.filter((feature) => Boolean(feature?.properties?.encrypted)).length
                        : 0,
                    cacheHit: true,
                });
                return c.json(cachedPayload, 200);
            }

            const entityTypes = [...new Set(query.layers.flatMap((layer) => layerToEntityTypes[layer]))];
            if (entityTypes.length === 0) {
                const emptyPayload = toFeatureCollection([]);
                return c.json(emptyPayload, 200);
            }

            const [entities, locations] = await Promise.all([
                medusa.getEntities(entityTypes, query.limit, query.offset),
                spatialRepo.getLocationsInBbox(entityTypes, query.bbox, query.limit, query.offset),
            ]);

            const locationIndex = new Map<string, { latitude: number; longitude: number }>();
            for (const row of locations) {
                locationIndex.set(`${row.entity_type}:${row.entity_id}`, {
                    latitude: Number(row.latitude),
                    longitude: Number(row.longitude),
                });
            }

            const features: SpatialFeature[] = entities
                .filter((entity) => query.layers.includes(entity.layer))
                .map((entity) => {
                    const key = `${entity.entityType}:${entity.id}`;
                    const point = locationIndex.get(key);
                    if (!point) {
                        return null;
                    }

                    const encrypted = canIncludeEncryptedLayer({
                        authorizationHeader,
                        capabilityHeader,
                        keyIdHeader,
                        layer: entity.layer,
                    })
                        ? createEncryptedEnvelope({
                              featureId: entity.id,
                              layer: entity.layer,
                              keyId: keyIdHeader!.trim(),
                          })
                        : undefined;

                    return {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [point.longitude, point.latitude],
                        },
                        properties: {
                            layer: entity.layer,
                            entity_type: entity.entityType,
                            id: entity.id,
                            name: entity.name,
                            status: entity.status,
                            icon: entity.icon,
                            preview: {
                                image_url: entity.imageUrl,
                                tagline: entity.tagline,
                                rating: entity.rating,
                            },
                            ...(encrypted ? { encrypted } : {}),
                        },
                    } satisfies SpatialFeature;
                })
                .filter((feature): feature is SpatialFeature => feature !== null);

            const payload = toFeatureCollection(features);
            logEncryptedLayerTelemetry({
                totalFeatures: payload.features.length,
                encryptedFeatures: payload.features.filter((feature) => Boolean(feature.properties.encrypted)).length,
                cacheHit: false,
            });
            try {
                await redis.setex(cacheKey, 60, JSON.stringify(payload));
            } catch (error) {
                console.warn('Redis write failed for spatial feed cache:', error);
            }

            return c.json(payload, 200);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unexpected error';
            return c.json({ error: message }, 400);
        }
    });

    return router;
};
