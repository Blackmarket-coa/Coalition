import { z } from 'zod';
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import type EntitlementModuleService from '../../../../services/entitlement';

const refreshSchema = z.object({
    stripe_subscription_id: z.string().min(1),
    expires_at: z.string().datetime().nullable().optional(),
    status: z.enum(['active', 'expired', 'revoked']).default('active'),
});

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const service = req.scope.resolve<EntitlementModuleService>('entitlement');
    const parsed = refreshSchema.parse(req.body);

    const result = await service.refreshExpiration(
        parsed.stripe_subscription_id,
        parsed.expires_at ? new Date(parsed.expires_at) : null,
        parsed.status
    );

    return res.status(200).json(result);
}
