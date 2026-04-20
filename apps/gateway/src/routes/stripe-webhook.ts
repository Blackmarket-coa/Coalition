import { Hono } from 'hono';
import type Stripe from 'stripe';
import { createStripeClient, loadStripeConfig } from '../services/stripe-client';
import { EntitlementClient, type EntitlementSource } from '../services/entitlement-client';

type SourceMetadata = 'one_off' | 'subscription' | 'tip' | 'free';

const toEntitlementSource = (value: string | undefined): EntitlementSource => {
    const allowed: SourceMetadata[] = ['one_off', 'subscription', 'tip', 'free'];
    return (allowed as string[]).includes(value ?? '') ? (value as EntitlementSource) : 'one_off';
};

const metadataString = (metadata: Stripe.Metadata | null | undefined, key: string): string | undefined => {
    if (!metadata) return undefined;
    const value = metadata[key];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const metadataNumber = (metadata: Stripe.Metadata | null | undefined, key: string): number | undefined => {
    const raw = metadataString(metadata, key);
    if (!raw) return undefined;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const handlePaymentIntentSucceeded = async (intent: Stripe.PaymentIntent, client: EntitlementClient) => {
    const userId = metadataString(intent.metadata, 'user_id');
    const productId = metadataString(intent.metadata, 'product_id');
    if (!userId || !productId) {
        console.warn('[bazaar][webhook] payment_intent.succeeded missing user_id/product_id metadata', { id: intent.id });
        return;
    }

    const source = toEntitlementSource(metadataString(intent.metadata, 'source'));

    await client.grant({
        user_id: userId,
        product_id: productId,
        seller_id: metadataString(intent.metadata, 'seller_id'),
        source,
        source_payment_id: intent.id,
        currency_code: intent.currency?.toUpperCase(),
        amount_cents: intent.amount_received ?? intent.amount,
        expires_at: null,
    });
};

const handleSubscriptionUpdated = async (subscription: Stripe.Subscription, client: EntitlementClient) => {
    const userId = metadataString(subscription.metadata, 'user_id');
    const productId = metadataString(subscription.metadata, 'product_id');

    const expiresAt = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
    const subscriptionStatus: 'active' | 'expired' | 'revoked' =
        subscription.status === 'active' || subscription.status === 'trialing'
            ? 'active'
            : subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'incomplete_expired'
              ? 'revoked'
              : 'expired';

    const refreshed = await client.refreshSubscription(subscription.id, expiresAt, subscriptionStatus);
    const refreshedCount = typeof refreshed === 'object' && refreshed && 'updated' in refreshed ? Number((refreshed as { updated?: number }).updated ?? 0) : 0;

    if (refreshedCount === 0 && userId && productId) {
        await client.grant({
            user_id: userId,
            product_id: productId,
            seller_id: metadataString(subscription.metadata, 'seller_id'),
            source: 'subscription',
            stripe_subscription_id: subscription.id,
            amount_cents: metadataNumber(subscription.metadata, 'amount_cents'),
            currency_code: metadataString(subscription.metadata, 'currency_code'),
            expires_at: expiresAt,
        });
    }
};

export const createStripeWebhookRouter = () => {
    const router = new Hono();

    const medusaBackendUrl = process.env.MEDUSA_BACKEND_URL;
    if (!medusaBackendUrl) {
        throw new Error('MEDUSA_BACKEND_URL is required for Stripe webhook processing');
    }

    const entitlements = new EntitlementClient(medusaBackendUrl, process.env.MEDUSA_PUBLISHABLE_KEY, process.env.MEDUSA_ADMIN_TOKEN);

    router.post('/api/v1/bazaar/stripe-webhook', async (c) => {
        const signature = c.req.header('stripe-signature');
        if (!signature) {
            return c.json({ error: 'Missing stripe-signature header' }, 400);
        }

        const rawBody = await c.req.text();
        const stripe = createStripeClient();
        const { webhookSecret } = loadStripeConfig();

        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid signature';
            return c.json({ error: `Webhook signature verification failed: ${message}` }, 400);
        }

        try {
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, entitlements);
                    break;
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                case 'customer.subscription.deleted':
                    await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, entitlements);
                    break;
                default:
                    break;
            }
            return c.json({ received: true, type: event.type }, 200);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Webhook handler failed';
            console.error('[bazaar][webhook] handler error', { type: event.type, message });
            return c.json({ error: message }, 500);
        }
    });

    return router;
};
