import Stripe from 'stripe';

export interface StripeConfig {
    secretKey: string;
    webhookSecret: string;
    apiVersion?: Stripe.LatestApiVersion;
}

export const loadStripeConfig = (): StripeConfig => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secretKey || !webhookSecret) {
        throw new Error('STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are required for Bazaar checkout');
    }
    return { secretKey, webhookSecret };
};

export const createStripeClient = (config: StripeConfig = loadStripeConfig()): Stripe => {
    return new Stripe(config.secretKey, config.apiVersion ? { apiVersion: config.apiVersion } : undefined);
};

export type { Stripe };
