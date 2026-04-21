import { Hono } from 'hono';
import { EntitlementClient } from '../services/entitlement-client';
import { BazaarService } from '../services/bazaar-service';
import { dispatchDelivery, type DeliveryContext } from '../services/digital-delivery';
import type { PluginManifestInput } from '../services/digital-delivery/manifest-delivery';

const toPluginManifest = (raw: Record<string, unknown> | undefined, productId: string): PluginManifestInput | undefined => {
    if (!raw) return undefined;
    const requiredStrings = ['version', 'name', 'description', 'entry', 'integrity_sha256'] as const;
    for (const key of requiredStrings) {
        if (typeof raw[key] !== 'string') return undefined;
    }
    const permissions = Array.isArray(raw.permissions) ? (raw.permissions as string[]) : [];
    const hooks = Array.isArray(raw.hooks) ? (raw.hooks as string[]) : [];
    return {
        id: typeof raw.id === 'string' ? (raw.id as string) : productId,
        version: raw.version as string,
        name: raw.name as string,
        description: raw.description as string,
        entry: raw.entry as string,
        integrity_sha256: raw.integrity_sha256 as string,
        permissions,
        hooks,
    };
};

export const createBazaarDeliveryRouter = () => {
    const router = new Hono();

    const medusaBackendUrl = process.env.MEDUSA_BACKEND_URL;
    if (!medusaBackendUrl) {
        throw new Error('MEDUSA_BACKEND_URL is required for /api/v1/bazaar/entitlements/:id/download');
    }

    const entitlements = new EntitlementClient(medusaBackendUrl, process.env.MEDUSA_PUBLISHABLE_KEY, process.env.MEDUSA_ADMIN_TOKEN);
    const bazaar = new BazaarService(medusaBackendUrl, process.env.MEDUSA_PUBLISHABLE_KEY);

    router.get('/api/v1/bazaar/entitlements/:id/download', async (c) => {
        const id = c.req.param('id');
        const userId = c.req.header('x-user-id') ?? c.req.query('user_id');
        if (!userId) {
            return c.json({ error: 'user_id is required (header x-user-id or query ?user_id)' }, 400);
        }

        try {
            const entitlement = await entitlements.getByIdForUser(id, userId);
            if (!entitlement) {
                return c.json({ error: 'Entitlement not found' }, 404);
            }

            const status = (entitlement as { status?: string }).status;
            if (status && status !== 'active') {
                return c.json({ error: `Entitlement is ${status}` }, 403);
            }

            const expiresAt = (entitlement as { expires_at?: string | null }).expires_at;
            if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
                return c.json({ error: 'Entitlement is expired' }, 403);
            }

            const productId = (entitlement as { product_id?: string }).product_id;
            if (!productId) {
                return c.json({ error: 'Entitlement is missing product_id' }, 500);
            }

            const product = await bazaar.getDigitalProduct(productId);
            if (!product) {
                return c.json({ error: 'Digital product not found' }, 404);
            }
            if (product.moderation_state === 'quarantined') {
                return c.json({ error: 'Product has been quarantined' }, 451);
            }

            const ctx: DeliveryContext = {
                entitlementId: id,
                userId,
                productId,
                deliveryType: product.delivery_type,
                assetRef: product.asset_ref,
                matrixUserId: c.req.header('x-matrix-user-id') ?? undefined,
                packId: product.matrix_pack_id,
                shortcodes: product.matrix_shortcodes,
                displayName: product.matrix_display_name,
                manifest: toPluginManifest(product.manifest, productId),
            };

            const result = await dispatchDelivery(ctx);
            return c.json(result, 200);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Delivery failed';
            return c.json({ error: message }, 500);
        }
    });

    return router;
};
