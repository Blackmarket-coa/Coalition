import { z } from 'zod';
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import type EntitlementModuleService from '../../../services/entitlement';

const grantSchema = z.object({
    user_id: z.string().min(1),
    product_id: z.string().min(1),
    seller_id: z.string().optional(),
    source: z.enum(['one_off', 'subscription', 'tip', 'free']),
    source_payment_id: z.string().optional(),
    stripe_subscription_id: z.string().optional(),
    expires_at: z.string().datetime().optional(),
    currency_code: z.string().optional(),
    amount_cents: z.number().int().nonnegative().optional(),
});

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const service = req.scope.resolve<EntitlementModuleService>('entitlement');
    const parsed = grantSchema.parse(req.body);

    const entitlement = await service.grant({
        user_id: parsed.user_id,
        product_id: parsed.product_id,
        seller_id: parsed.seller_id ?? null,
        source: parsed.source,
        source_payment_id: parsed.source_payment_id ?? null,
        stripe_subscription_id: parsed.stripe_subscription_id ?? null,
        expires_at: parsed.expires_at ? new Date(parsed.expires_at) : null,
        currency_code: parsed.currency_code ?? null,
        amount_cents: parsed.amount_cents ?? null,
    });

    return res.status(201).json({ entitlement });
}
