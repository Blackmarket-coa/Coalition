import Medusa from '@medusajs/js-sdk';

export type EntitlementSource = 'one_off' | 'subscription' | 'tip' | 'free';

export interface GrantEntitlementInput {
    user_id: string;
    product_id: string;
    seller_id?: string;
    source: EntitlementSource;
    source_payment_id?: string;
    stripe_subscription_id?: string;
    expires_at?: Date | null;
    currency_code?: string;
    amount_cents?: number;
}

interface MedusaClientLike {
    client: {
        fetch<T = unknown>(path: string, init?: RequestInit): Promise<T>;
    };
}

const toIso = (value: Date | null | undefined): string | undefined => {
    if (!value) return undefined;
    return value.toISOString();
};

export class EntitlementClient {
    private readonly medusa: MedusaClientLike;
    private readonly adminToken?: string;

    constructor(baseUrl: string, publishableKey?: string, adminToken?: string) {
        this.medusa = new Medusa({
            baseUrl,
            publishableKey,
            debug: false,
        }) as unknown as MedusaClientLike;
        this.adminToken = adminToken;
    }

    private authHeaders(): Record<string, string> {
        return this.adminToken ? { Authorization: `Bearer ${this.adminToken}` } : {};
    }

    async grant(input: GrantEntitlementInput) {
        const body = {
            user_id: input.user_id,
            product_id: input.product_id,
            seller_id: input.seller_id,
            source: input.source,
            source_payment_id: input.source_payment_id,
            stripe_subscription_id: input.stripe_subscription_id,
            expires_at: toIso(input.expires_at),
            currency_code: input.currency_code,
            amount_cents: input.amount_cents,
        };

        return this.medusa.client.fetch('/admin/entitlements', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json',
                ...this.authHeaders(),
            },
        });
    }

    async refreshSubscription(stripeSubscriptionId: string, expiresAt: Date | null, status: 'active' | 'expired' | 'revoked' = 'active') {
        return this.medusa.client.fetch('/admin/entitlements/refresh', {
            method: 'POST',
            body: JSON.stringify({
                stripe_subscription_id: stripeSubscriptionId,
                expires_at: toIso(expiresAt),
                status,
            }),
            headers: {
                'Content-Type': 'application/json',
                ...this.authHeaders(),
            },
        });
    }

    async getByIdForUser(id: string, userId: string) {
        const query = new URLSearchParams({ user_id: userId });
        const res = await this.medusa.client.fetch<{ entitlements?: Array<Record<string, unknown>> }>(
            `/store/entitlements?${query.toString()}`
        );
        const rows = res?.entitlements ?? [];
        const row = rows.find((entry) => (entry as { id?: string }).id === id);
        return row ?? null;
    }
}
