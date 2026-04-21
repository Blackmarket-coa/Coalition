import { Hono } from 'hono';
import { z } from 'zod';
import { computePlatformFee } from '../services/platform-fee';
import { createStripeClient } from '../services/stripe-client';

const lineSchema = z.object({
    product_id: z.string().min(1),
    variant_id: z.string().optional(),
    seller_id: z.string().min(1),
    seller_connect_account_id: z.string().min(1),
    quantity: z.number().int().min(1).default(1),
    unit_price_cents: z.number().int().min(0),
    currency_code: z.string().length(3),
    kind: z.enum(['digital', 'physical']),
    pricing_mode: z.enum(['one_off', 'subscription', 'tip']),
    stripe_price_id: z.string().optional(),
    tip_amount_cents: z.number().int().min(0).optional(),
});

const oneOffSchema = z.object({
    user_id: z.string().min(1),
    customer_email: z.string().email().optional(),
    stripe_customer_id: z.string().optional(),
    return_url: z.string().url().optional(),
    line: lineSchema.refine((line) => line.pricing_mode === 'one_off', { message: 'line.pricing_mode must be one_off' }),
});

const subscriptionSchema = z.object({
    user_id: z.string().min(1),
    stripe_customer_id: z.string().min(1),
    line: lineSchema.refine((line) => line.pricing_mode === 'subscription' && !!line.stripe_price_id, {
        message: 'subscription requires pricing_mode=subscription and stripe_price_id',
    }),
});

const tipSchema = z.object({
    user_id: z.string().min(1),
    customer_email: z.string().email().optional(),
    stripe_customer_id: z.string().optional(),
    line: lineSchema.refine((line) => line.pricing_mode === 'tip' && (line.tip_amount_cents ?? 0) > 0, {
        message: 'tip requires pricing_mode=tip and tip_amount_cents > 0',
    }),
});

const buildMetadata = (userId: string, line: z.infer<typeof lineSchema>, extra: Record<string, string | number | undefined> = {}) => {
    const metadata: Record<string, string> = {
        user_id: userId,
        product_id: line.product_id,
        seller_id: line.seller_id,
        kind: line.kind,
        pricing_mode: line.pricing_mode,
    };
    if (line.variant_id) metadata.variant_id = line.variant_id;
    for (const [key, value] of Object.entries(extra)) {
        if (value !== undefined && value !== null) {
            metadata[key] = String(value);
        }
    }
    return metadata;
};

export const createCheckoutRouter = () => {
    const router = new Hono();

    router.post('/api/v1/bazaar/checkout/one-off', async (c) => {
        try {
            const parsed = oneOffSchema.parse(await c.req.json());
            const stripe = createStripeClient();

            const subtotal = parsed.line.unit_price_cents * parsed.line.quantity;
            const fee = computePlatformFee({ subtotal_cents: subtotal });

            const intent = await stripe.paymentIntents.create({
                amount: fee.total_cents,
                currency: parsed.line.currency_code.toLowerCase(),
                customer: parsed.stripe_customer_id,
                receipt_email: parsed.customer_email,
                application_fee_amount: fee.platform_fee_cents,
                transfer_data: { destination: parsed.line.seller_connect_account_id },
                metadata: buildMetadata(parsed.user_id, parsed.line, { source: 'one_off', quantity: parsed.line.quantity }),
                automatic_payment_methods: { enabled: true },
            });

            return c.json({ ok: true, payment_intent_id: intent.id, client_secret: intent.client_secret, fee }, 201);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Checkout failed';
            return c.json({ ok: false, error: message }, 400);
        }
    });

    router.post('/api/v1/bazaar/checkout/subscription', async (c) => {
        try {
            const parsed = subscriptionSchema.parse(await c.req.json());
            const stripe = createStripeClient();

            const feeBps = Number.parseInt(process.env.COALITION_PLATFORM_FEE_BPS ?? '1000', 10);
            const applicationFeePercent = Number.isFinite(feeBps) && feeBps >= 0 && feeBps <= 10_000 ? feeBps / 100 : 10;

            const subscription = await stripe.subscriptions.create({
                customer: parsed.stripe_customer_id,
                items: [{ price: parsed.line.stripe_price_id!, quantity: parsed.line.quantity }],
                application_fee_percent: applicationFeePercent,
                transfer_data: { destination: parsed.line.seller_connect_account_id },
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
                metadata: buildMetadata(parsed.user_id, parsed.line, { source: 'subscription' }),
            });

            const latestInvoice = subscription.latest_invoice as null | { payment_intent?: { client_secret?: string | null; id?: string } };
            const intent = latestInvoice && typeof latestInvoice === 'object' ? latestInvoice.payment_intent : undefined;

            return c.json(
                {
                    ok: true,
                    subscription_id: subscription.id,
                    client_secret: intent?.client_secret ?? null,
                    payment_intent_id: intent?.id ?? null,
                    application_fee_percent: applicationFeePercent,
                },
                201
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Subscription checkout failed';
            return c.json({ ok: false, error: message }, 400);
        }
    });

    router.post('/api/v1/bazaar/checkout/tip', async (c) => {
        try {
            const parsed = tipSchema.parse(await c.req.json());
            const stripe = createStripeClient();

            const tip = parsed.line.tip_amount_cents!;
            const intent = await stripe.paymentIntents.create({
                amount: tip,
                currency: parsed.line.currency_code.toLowerCase(),
                customer: parsed.stripe_customer_id,
                receipt_email: parsed.customer_email,
                application_fee_amount: 0,
                transfer_data: { destination: parsed.line.seller_connect_account_id },
                metadata: buildMetadata(parsed.user_id, parsed.line, { source: 'tip', tip_amount_cents: tip }),
                automatic_payment_methods: { enabled: true },
            });

            return c.json({ ok: true, payment_intent_id: intent.id, client_secret: intent.client_secret, tip_amount_cents: tip }, 201);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Tip checkout failed';
            return c.json({ ok: false, error: message }, 400);
        }
    });

    return router;
};
