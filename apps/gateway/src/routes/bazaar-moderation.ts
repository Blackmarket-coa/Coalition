import { Hono } from 'hono';
import { z } from 'zod';
import Medusa from '@medusajs/js-sdk';

const reportReasonValues = ['spam', 'malware', 'illegal', 'stolen', 'other'] as const;

interface MedusaClientLike {
    client: {
        fetch<T = unknown>(path: string, init?: RequestInit): Promise<T>;
    };
}

const quarantineSchema = z.object({
    product_id: z.string().min(1),
    state: z.enum(['approved', 'pending', 'quarantined']),
});

const reportSchema = z.object({
    product_id: z.string().min(1),
    user_id: z.string().min(1),
    reason: z.enum(reportReasonValues),
    detail: z.string().max(2000).optional(),
});

export type ModerationReport = z.infer<typeof reportSchema> & {
    id: string;
    created_at: string;
};

const reports: ModerationReport[] = [];

const newReportId = (): string => `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const createBazaarModerationRouter = () => {
    const router = new Hono();

    router.post('/api/v1/bazaar/reports', async (c) => {
        let parsed: z.infer<typeof reportSchema>;
        try {
            parsed = reportSchema.parse(await c.req.json());
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid request';
            return c.json({ error: message }, 400);
        }

        const record: ModerationReport = {
            ...parsed,
            id: newReportId(),
            created_at: new Date().toISOString(),
        };
        reports.push(record);
        return c.json({ report: record }, 201);
    });

    router.post('/api/v1/bazaar/moderation/quarantine', async (c) => {
        const adminToken = process.env.COALITION_MODERATION_ADMIN_TOKEN;
        if (adminToken) {
            const auth = c.req.header('authorization');
            if (!auth || auth !== `Bearer ${adminToken}`) {
                return c.json({ error: 'Unauthorized' }, 401);
            }
        }

        let parsed: z.infer<typeof quarantineSchema>;
        try {
            parsed = quarantineSchema.parse(await c.req.json());
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid request';
            return c.json({ error: message }, 400);
        }

        const medusaBackendUrl = process.env.MEDUSA_BACKEND_URL;
        const medusaAdminToken = process.env.MEDUSA_ADMIN_TOKEN;
        if (!medusaBackendUrl) {
            return c.json({ error: 'MEDUSA_BACKEND_URL not configured' }, 500);
        }

        const medusa = new Medusa({
            baseUrl: medusaBackendUrl,
            publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY,
            debug: false,
        }) as unknown as MedusaClientLike;

        try {
            await medusa.client.fetch(`/admin/products/${encodeURIComponent(parsed.product_id)}`, {
                method: 'POST',
                body: JSON.stringify({ metadata: { moderation_state: parsed.state } }),
                headers: {
                    'Content-Type': 'application/json',
                    ...(medusaAdminToken ? { Authorization: `Bearer ${medusaAdminToken}` } : {}),
                },
            });
            return c.json({ ok: true, product_id: parsed.product_id, state: parsed.state }, 200);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update moderation state';
            return c.json({ error: message }, 500);
        }
    });

    router.get('/api/v1/bazaar/reports', async (c) => {
        const adminToken = process.env.COALITION_MODERATION_ADMIN_TOKEN;
        if (adminToken) {
            const auth = c.req.header('authorization');
            if (!auth || auth !== `Bearer ${adminToken}`) {
                return c.json({ error: 'Unauthorized' }, 401);
            }
        }
        const productId = c.req.query('product_id');
        const filtered = productId ? reports.filter((r) => r.product_id === productId) : reports;
        return c.json({ reports: filtered, count: filtered.length }, 200);
    });

    return router;
};

export const _testing = { reports };
