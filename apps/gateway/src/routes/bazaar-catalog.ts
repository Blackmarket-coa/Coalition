import { Hono } from 'hono';
import { z } from 'zod';
import { BazaarService } from '../services/bazaar-service';

const digitalKindValues = ['plugin', 'emoji_pack', 'meme_pack', 'stego', 'software', 'other'] as const;
const digitalLicenseValues = ['standard', 'extended', 'cc0'] as const;

const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    kind: z.enum(digitalKindValues).optional(),
    license: z.enum(digitalLicenseValues).optional(),
    q: z.string().min(1).max(200).optional(),
});

export const createBazaarCatalogRouter = () => {
    const router = new Hono();

    const medusaBackendUrl = process.env.MEDUSA_BACKEND_URL;
    if (!medusaBackendUrl) {
        throw new Error('MEDUSA_BACKEND_URL is required for /api/v1/bazaar/catalog');
    }

    const bazaar = new BazaarService(medusaBackendUrl, process.env.MEDUSA_PUBLISHABLE_KEY);

    router.get('/api/v1/bazaar/catalog', async (c) => {
        try {
            const parsed = querySchema.parse({
                limit: c.req.query('limit') ?? undefined,
                offset: c.req.query('offset') ?? undefined,
                kind: c.req.query('kind') ?? undefined,
                license: c.req.query('license') ?? undefined,
                q: c.req.query('q') ?? undefined,
            });

            const items = await bazaar.listDigitalProducts(parsed);
            return c.json({ items, limit: parsed.limit, offset: parsed.offset }, 200);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unexpected error';
            return c.json({ error: message }, 400);
        }
    });

    return router;
};
