import { z } from 'zod';
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import type EntitlementModuleService from '../../../services/entitlement';

const querySchema = z.object({
    user_id: z.string().min(1),
    status: z.enum(['active', 'expired', 'revoked']).optional(),
});

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = req.scope.resolve<EntitlementModuleService>('entitlement');
    const parsed = querySchema.parse(req.query);

    const rows = await service.listForUser({ user_id: parsed.user_id, status: parsed.status });

    return res.status(200).json({ entitlements: rows });
}
