import { Hono } from 'hono';
import { z } from 'zod';
import { BlackstarApiClient, type FreeBlackMarketOrderPayload } from '../services/blackstar-api-client';

const webhookSchema = z.object({
    order_id: z.string().optional(),
    source_order_ref: z.string().optional(),
    created_at: z.string().optional(),
    claim_policy: z.enum(['first_claim', 'bid']).optional(),
    required_category: z.string().optional(),
    required_transport_capabilities: z.array(z.string()).optional(),
    pickup: z
        .object({
            latitude: z.number(),
            longitude: z.number(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
        })
        .optional(),
    dropoff: z
        .object({
            latitude: z.number(),
            longitude: z.number(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
        })
        .optional(),
    origin: z
        .object({
            latitude: z.number(),
            longitude: z.number(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
        })
        .optional(),
    destination: z
        .object({
            latitude: z.number(),
            longitude: z.number(),
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
        })
        .optional(),
});

export const createFreeBlackMarketWebhookRouter = () => {
    const router = new Hono();

    const blackstarUrl = process.env.BLACKSTAR_API_URL;
    const blackstarToken = process.env.BLACKSTAR_API_TOKEN;

    if (!blackstarUrl || !blackstarToken) {
        throw new Error('BLACKSTAR_API_URL and BLACKSTAR_API_TOKEN are required for FBM webhook integration');
    }

    const blackstar = new BlackstarApiClient(blackstarUrl, blackstarToken);

    router.post('/api/v1/webhooks/free-black-market/order-placed', async (c) => {
        try {
            const payload = webhookSchema.parse(await c.req.json());
            const listing = await blackstar.createListingFromFreeBlackMarketWebhook(payload as FreeBlackMarketOrderPayload);
            return c.json({ ok: true, listing }, 201);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Webhook processing failed';
            return c.json({ ok: false, error: message }, 400);
        }
    });

    return router;
};
