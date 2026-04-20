import { Hono } from 'hono';
import { z } from 'zod';
import Medusa from '@medusajs/js-sdk';
import { BlackstarApiClient } from '../services/blackstar-api-client';

const roleValues = ['Grower', 'Maker', 'Mover', 'Healer', 'Teacher', 'Builder', 'Organizer'] as const;

const digitalKindValues = ['plugin', 'emoji_pack', 'meme_pack', 'stego', 'software', 'other'] as const;
const digitalDeliveryValues = ['file', 'unlock', 'manifest'] as const;
const digitalLicenseValues = ['standard', 'extended', 'cc0'] as const;

const digitalMetadataSchema = z.object({
    is_digital: z.literal(true),
    digital_kind: z.enum(digitalKindValues),
    delivery: z.object({
        type: z.enum(digitalDeliveryValues),
        asset_ref: z.string().optional(),
    }),
    license: z.enum(digitalLicenseValues).default('standard'),
});

const offeringSchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    pricing_mode: z.enum(['price', 'time_bank', 'free', 'sliding_scale']),
    price: z.number().optional(),
    digital: digitalMetadataSchema.optional(),
});

const payloadSchema = z.object({
    user_id: z.string().min(1),
    roles: z.array(z.enum(roleValues)).min(1),
    profile: z.object({
        name: z.string().min(1),
        handle: z.string().min(1),
        bio: z.string().default(''),
        avatar_url: z.string().optional(),
    }),
    location: z.object({
        display_radius_miles: z.number().min(0.5).max(10),
    }),
    offerings: z.array(offeringSchema).default([]),
});

interface MedusaClientLike {
    client: {
        fetch<T = unknown>(path: string, init?: RequestInit): Promise<T>;
    };
}

export const createProviderProfileRouter = () => {
    const router = new Hono();

    const medusaBackendUrl = process.env.MEDUSA_BACKEND_URL;
    const blackstarUrl = process.env.BLACKSTAR_API_URL;
    const blackstarToken = process.env.BLACKSTAR_API_TOKEN;
    const matrixBaseUrl = process.env.BLACKOUT_HOMESERVER_URL;
    const matrixServiceToken = process.env.BLACKOUT_MATRIX_SERVICE_TOKEN;

    if (!medusaBackendUrl || !blackstarUrl || !blackstarToken || !matrixBaseUrl || !matrixServiceToken) {
        throw new Error('MEDUSA_BACKEND_URL, BLACKSTAR_API_URL, BLACKSTAR_API_TOKEN, BLACKOUT_HOMESERVER_URL and BLACKOUT_MATRIX_SERVICE_TOKEN are required');
    }

    const medusa = new Medusa({
        baseUrl: medusaBackendUrl,
        publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY,
        debug: false,
    }) as unknown as MedusaClientLike;

    const blackstar = new BlackstarApiClient(blackstarUrl, blackstarToken);

    router.post('/api/v1/providers/profile/create', async (c) => {
        try {
            const payload = payloadSchema.parse(await c.req.json());

            const seller = await medusa.client.fetch('/admin/sellers', {
                method: 'POST',
                body: JSON.stringify({
                    store_name: payload.profile.name,
                    handle: payload.profile.handle,
                    description: payload.profile.bio,
                    metadata: {
                        roles: payload.roles,
                        avatar_url: payload.profile.avatar_url,
                        offerings: payload.offerings,
                    },
                }),
                headers: {
                    Authorization: `Bearer ${process.env.MEDUSA_ADMIN_TOKEN ?? ''}`,
                },
            });

            let node: unknown = null;
            let driver: unknown = null;

            if (payload.roles.includes('Mover')) {
                node = await blackstar.createNode({
                    name: `${payload.profile.name} Node`,
                    capabilities: ['transport', 'delivery'],
                });

                driver = await blackstar.registerDriver({
                    user_ref: payload.user_id,
                    node_id: (node as { id?: string })?.id,
                    status: 'active',
                });
            }

            const roomRes = await fetch(`${matrixBaseUrl.replace(/\/$/, '')}/_matrix/client/v3/createRoom`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${matrixServiceToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: `${payload.profile.name} Feed`,
                    topic: `Provider feed for ${payload.profile.name}`,
                    visibility: 'private',
                    initial_state: [
                        {
                            type: 'm.room.create',
                            state_key: '',
                            content: {
                                creator_role: 'provider_feed',
                                bmc_provider_handle: payload.profile.handle,
                            },
                        },
                    ],
                }),
            });

            const room = await roomRes.json();

            const updatedRoles = Array.from(new Set(['provider', ...payload.roles.map((r) => r.toLowerCase())]));

            return c.json(
                {
                    ok: true,
                    seller,
                    blackstar: { node, driver },
                    matrix: room,
                    jwt: {
                        updated_roles: updatedRoles,
                        note: 'Auth service should mint a fresh JWT with these roles and return it to the client.',
                    },
                },
                201
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Provider profile workflow failed';
            return c.json({ ok: false, error: message }, 400);
        }
    });

    return router;
};
