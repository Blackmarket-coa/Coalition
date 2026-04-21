import { Hono } from 'hono';
import { z } from 'zod';
import { BazaarService } from '../services/bazaar-service';
import { FbmOutboundClient, buildCorrelationId } from '../services/fbm-outbound-client';

const bodySchema = z.object({
    event: z.enum(['product.created', 'product.updated', 'product.deleted']),
    product_id: z.string().min(1),
});

export const createFbmSyncRouter = () => {
    const router = new Hono();

    const medusaBackendUrl = process.env.MEDUSA_BACKEND_URL;
    if (!medusaBackendUrl) {
        throw new Error('MEDUSA_BACKEND_URL is required for FBM outbound sync');
    }

    const adminToken = process.env.MEDUSA_FBM_SYNC_TOKEN;

    const bazaar = new BazaarService(medusaBackendUrl, process.env.MEDUSA_PUBLISHABLE_KEY);
    let client: FbmOutboundClient | null = null;
    const getClient = (): FbmOutboundClient => {
        if (!client) client = new FbmOutboundClient();
        return client;
    };

    router.post('/api/v1/bazaar/fbm-sync', async (c) => {
        if (adminToken) {
            const auth = c.req.header('authorization');
            if (!auth || auth !== `Bearer ${adminToken}`) {
                return c.json({ error: 'Unauthorized' }, 401);
            }
        }

        let parsed: z.infer<typeof bodySchema>;
        try {
            parsed = bodySchema.parse(await c.req.json());
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid request';
            return c.json({ error: message }, 400);
        }

        try {
            if (parsed.event === 'product.deleted') {
                const result = await getClient().syncCatalog({
                    correlation_id: buildCorrelationId(parsed.product_id),
                    action: 'delete',
                    product: {
                        id: parsed.product_id,
                        title: parsed.product_id,
                        description: null,
                        handle: null,
                        thumbnail: null,
                        seller_id: null,
                        seller_handle: null,
                        price_cents: null,
                        currency_code: null,
                        digital_kind: 'other',
                        delivery_type: 'file',
                        license: 'standard',
                        rating: null,
                    },
                });
                return c.json(result, result.ok ? 200 : 202);
            }

            const product = await bazaar.getDigitalProduct(parsed.product_id);
            if (!product) {
                return c.json({ skipped: true, reason: 'Product is not digital or not found' }, 200);
            }
            if (product.moderation_state === 'quarantined') {
                return c.json({ skipped: true, reason: 'Product is quarantined' }, 200);
            }

            const result = await getClient().syncCatalog({
                correlation_id: buildCorrelationId(product.id),
                action: 'upsert',
                product: { ...product, asset_ref: product.asset_ref },
            });
            return c.json(result, result.ok ? 200 : 202);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'FBM sync failed';
            return c.json({ error: message }, 500);
        }
    });

    router.post('/api/v1/bazaar/fbm-sync/drain', async (c) => {
        if (adminToken) {
            const auth = c.req.header('authorization');
            if (!auth || auth !== `Bearer ${adminToken}`) {
                return c.json({ error: 'Unauthorized' }, 401);
            }
        }
        try {
            const results = await getClient().drainQueue();
            return c.json({ drained: results.length, results }, 200);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Drain failed';
            return c.json({ error: message }, 500);
        }
    });

    return router;
};
