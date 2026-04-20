import { MedusaError, MedusaService } from '@medusajs/framework/utils';
import Entitlement, { type EntitlementSource, type EntitlementStatus } from '../models/entitlement';

type GrantInput = {
    user_id: string;
    product_id: string;
    seller_id?: string | null;
    source: EntitlementSource;
    source_payment_id?: string | null;
    stripe_subscription_id?: string | null;
    expires_at?: Date | null;
    currency_code?: string | null;
    amount_cents?: number | null;
};

type ListForUserFilter = {
    user_id: string;
    status?: EntitlementStatus;
};

class EntitlementModuleService extends MedusaService({ Entitlement }) {
    async grant(input: GrantInput) {
        const [existing] = await this.listEntitlements(
            { user_id: input.user_id, product_id: input.product_id, source: input.source },
            { take: 1 }
        );

        const grantedAt = new Date();

        if (existing) {
            const updated = await this.updateEntitlements({
                id: existing.id,
                status: 'active' as EntitlementStatus,
                source_payment_id: input.source_payment_id ?? existing.source_payment_id,
                stripe_subscription_id: input.stripe_subscription_id ?? existing.stripe_subscription_id,
                expires_at: input.expires_at ?? null,
                granted_at: grantedAt,
                revoked_at: null,
                currency_code: input.currency_code ?? existing.currency_code,
                amount_cents: input.amount_cents ?? existing.amount_cents,
            });
            return updated;
        }

        const created = await this.createEntitlements({
            user_id: input.user_id,
            product_id: input.product_id,
            seller_id: input.seller_id ?? null,
            source: input.source,
            source_payment_id: input.source_payment_id ?? null,
            stripe_subscription_id: input.stripe_subscription_id ?? null,
            status: 'active' as EntitlementStatus,
            granted_at: grantedAt,
            expires_at: input.expires_at ?? null,
            revoked_at: null,
            currency_code: input.currency_code ?? null,
            amount_cents: input.amount_cents ?? null,
        });
        return created;
    }

    async refreshExpiration(stripeSubscriptionId: string, expiresAt: Date | null, status: EntitlementStatus = 'active') {
        const matches = await this.listEntitlements({ stripe_subscription_id: stripeSubscriptionId });
        if (!matches.length) {
            return { updated: 0 };
        }

        await Promise.all(
            matches.map((row) =>
                this.updateEntitlements({
                    id: row.id,
                    expires_at: expiresAt,
                    status,
                    revoked_at: status === 'revoked' ? new Date() : null,
                })
            )
        );

        return { updated: matches.length };
    }

    async revoke(id: string) {
        const [existing] = await this.listEntitlements({ id }, { take: 1 });
        if (!existing) {
            throw new MedusaError(MedusaError.Types.NOT_FOUND, `Entitlement ${id} not found`);
        }

        return this.updateEntitlements({ id, status: 'revoked' as EntitlementStatus, revoked_at: new Date() });
    }

    async listForUser(filter: ListForUserFilter) {
        const query: Record<string, unknown> = { user_id: filter.user_id };
        if (filter.status) {
            query.status = filter.status;
        }
        return this.listEntitlements(query);
    }

    async isActiveFor(userId: string, productId: string): Promise<boolean> {
        const [row] = await this.listEntitlements({ user_id: userId, product_id: productId, status: 'active' }, { take: 1 });
        if (!row) return false;
        if (!row.expires_at) return true;
        return new Date(row.expires_at).getTime() > Date.now();
    }
}

export default EntitlementModuleService;
export type { GrantInput };
